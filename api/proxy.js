/* =========================================================
   音乐代理 (Music Proxy)
   ---------------------------------------------------------
   移植自 lx-music-web 的 proxy-middleware，改成 Vercel Serverless。

   为什么需要它：各音乐平台接口基本不回 Access-Control-Allow-Origin，
   且多为 http 协议，浏览器直连会被 CORS 和混合内容策略拦掉。

   用法：
     GET /api/proxy?url=<encoded>&kind=api|media
     GET /api/proxy?b64=<base64url>&kind=media   （隐藏 URL 特征，防下载器嗅探）

   kind=api   → 音源脚本/搜索接口，域名不限（只拦内网）
   kind=media → 播放取流，只允许 GET/HEAD，Content-Type 改成 octet-stream
   ========================================================= */

const http = require('http');
const https = require('https');
const zlib = require('zlib');
const net = require('net');
const dns = require('dns');

// 搜索接口用到的平台域名；kind=api 时不套白名单，此表仅作参考
const PLATFORM_HOSTS = [
  'kuwo.cn', 'kugou.com', 'qq.com', 'music.163.com', '163.com',
  'migu.cn', '126.net', 'music.126.net', 'y.qq.com', 'kgimg.com',
  'kugou.net', 'migucloud.com', '12530.com', 'jadeite.migu.cn'
];

// 非媒体响应的大小上限。不做限制时，一个千万行 JSON 或 gzip bomb
// 就能把 Serverless 实例打到 OOM。
const MAX_BODY = 8 * 1024 * 1024;

/**
 * 内网地址判定。
 *
 * 不能只看主机名字符串：WHATWG URL 会把 [::ffff:127.0.0.1] 规范化成
 * [::ffff:7f00:1]，把域名（lvh.me、127.0.0.1.nip.io）留给 DNS 去解析。
 * 旧版正则对这两类全部放行，等于开放了一个内网探测跳板。
 * 所以先把地址解析成真实 IP，再按网段判断。
 */
const IPV4_PRIVATE_RANGES = [
  ['0.0.0.0', 8],        // 本网络
  ['10.0.0.0', 8],       // 私有
  ['100.64.0.0', 10],    // CGNAT
  ['127.0.0.0', 8],      // 环回
  ['169.254.0.0', 16],   // 链路本地（含云厂商 metadata）
  ['172.16.0.0', 12],    // 私有
  ['192.0.0.0', 24],     // IETF 协议分配
  ['192.168.0.0', 16],   // 私有
  ['198.18.0.0', 15],    // 基准测试
  ['224.0.0.0', 4],      // 组播
  ['240.0.0.0', 4]       // 保留
];

function ipv4ToInt(ip) {
  return ip.split('.').reduce(function (acc, oct) {
    return (acc << 8) + (parseInt(oct, 10) & 255);
  }, 0) >>> 0;
}

function isPrivateIPv4(ip) {
  var n = ipv4ToInt(ip);
  return IPV4_PRIVATE_RANGES.some(function (r) {
    var base = ipv4ToInt(r[0]);
    var mask = (~0 << (32 - r[1])) >>> 0;
    return ((n & mask) >>> 0) === ((base & mask) >>> 0);
  });
}

/**
 * IPv6 私有/特殊地址。
 * ::ffff:0:0/96 是 IPv4 映射段，必须先取出内嵌的 IPv4 再判断——
 * 攻击者正是用它绕过字符串匹配（[::ffff:127.0.0.1]）。
 */
function isPrivateIPv6(ip) {
  var s = ip.toLowerCase().replace(/^\[|\]$/g, '');
  if (s === '::' || s === '::1') return true;
  var v4 = s.match(/^(?:::ffff:|::)((?:\d{1,3}\.){3}\d{1,3})$/);
  if (v4) return isPrivateIPv4(v4[1]);
  // 十六进制形式的映射地址：::ffff:7f00:1
  if (/^::ffff:[0-9a-f]{1,4}:[0-9a-f]{1,4}$/.test(s)) {
    var parts = s.split(':').slice(-2);
    var hi = parseInt(parts[0], 16);
    var lo = parseInt(parts[1], 16);
    return isPrivateIPv4([hi >> 8, hi & 255, lo >> 8, lo & 255].join('.'));
  }
  if (/^(fc|fd)/.test(s)) return true;    // 唯一本地 fc00::/7
  if (/^fe[89ab]/.test(s)) return true;   // 链路本地 fe80::/10
  if (/^ff/.test(s)) return true;         // 组播
  if (/^64:ff9b:/.test(s)) return true;   // NAT64
  if (/^2002:/.test(s)) return true;      // 6to4
  return false;
}

/** 单个 IP 是否可用作代理目标 */
function isPublicIp(ip) {
  var fam = net.isIP(ip);
  if (fam === 4) return !isPrivateIPv4(ip);
  if (fam === 6) return !isPrivateIPv6(ip);
  return false;
}

function isAllowed(hostname, kind) {
  var bare = String(hostname || '').replace(/^\[|\]$/g, '');
  if (net.isIP(bare)) return isPublicIp(bare);
  if (kind !== 'media' && kind !== 'api') return false;
  return true;
}

/**
 * 解析主机并要求所有解析结果都是公网地址，返回用于建连的 IP。
 * 建连时直接用这个 IP（配合 Host/SNI 保留域名），
 * 避免「校验完再解析一次」之间的 DNS 重绑定窗口。
 */
function resolveTarget(hostname) {
  var bare = String(hostname || '').replace(/^\[|\]$/g, '');
  if (net.isIP(bare)) {
    if (!isPublicIp(bare)) return Promise.resolve(null);
    return Promise.resolve([{ address: bare, family: net.isIP(bare) }]);
  }
  return new Promise(function (resolve) {
    dns.lookup(bare, { all: true }, function (err, addrs) {
      if (err || !addrs || !addrs.length) return resolve(null);
      // 任何一条解析到内网就整体拒绝，避免「轮询到公网那条就放行」
      for (var i = 0; i < addrs.length; i++) {
        if (!isPublicIp(addrs[i].address)) return resolve(null);
      }
      // IPv4 排前面：很多环境没有 IPv6 出口，用 AAAA 建连会直接超时。
      // 全部保留下来，连不上时逐个重试（见 doForward）。
      var v4 = addrs.filter(function (a) { return a.family === 4; });
      var v6 = addrs.filter(function (a) { return a.family !== 4; });
      resolve(v4.concat(v6).map(function (a) {
        return { address: a.address, family: a.family };
      }));
    });
  });
}

/**
 * 只允许「数据类」Content-Type 透传。
 * 上游返回 text/html 时如果原样回给浏览器，因为响应与本站同源，
 * 里面的 <script> 会在本站源上执行（反射型 XSS）。
 */
function safeContentType(type) {
  var t = String(type || '').toLowerCase();
  if (/^application\/(json|javascript|x-javascript)/.test(t)) return t.split(';')[0];
  if (/^text\/(plain|xml|x-nc)|\+xml/.test(t)) return t.split(';')[0];
  if (/^image\//.test(t)) return t.split(';')[0];
  return 'application/octet-stream';
}

function decompress(buffer, encoding) {  try {
    var opt = { maxOutputLength: MAX_BODY };
    switch (String(encoding || '').toLowerCase()) {
      case 'gzip': return zlib.gunzipSync(buffer, opt);
      case 'deflate': return zlib.inflateSync(buffer, opt);
      case 'br': return zlib.brotliDecompressSync(buffer, opt);
      default: return buffer;
    }
  } catch (e) {
    return buffer;
  }
}

/**
 * 读取请求体（Vercel 已解析时直接用 req.body，本地 server 用流读取）。
 *
 * 必须有超时：手机通过 VPN/内网访问时，POST 的 body 可能因为链路问题
 * 迟迟发不完，req 的 'end' 事件永不触发，这个 Promise 就会永久挂起——
 * 表现就是界面上「正在请求 tx」一直不动。
 */
function readBody(req) {
  return new Promise(function (resolve) {
    // Vercel Node runtime：body 可能已被解析成对象/字符串。
    // 注意不能一律 JSON.stringify：表单（urlencoded）被解析成对象后
    // 再序列化会变成 JSON，上游收到的是 "{"ids":"[...]"}" 这种非法表单，
    // 网易云 song/detail 就会回「参数错误」。
    if (req.body != null && typeof req.body !== 'function') {
      if (Buffer.isBuffer(req.body)) return resolve(req.body);
      if (typeof req.body === 'string') return resolve(Buffer.from(req.body));
      var ct = String((req.headers && req.headers['content-type']) || '');
      if (/application\/x-www-form-urlencoded/i.test(ct)) {
        var pairs = [];
        Object.keys(req.body).forEach(function (k) {
          var v = req.body[k];
          if (Array.isArray(v)) {
            v.forEach(function (x) { pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(x))); });
          } else {
            pairs.push(encodeURIComponent(k) + '=' + encodeURIComponent(String(v)));
          }
        });
        return resolve(Buffer.from(pairs.join('&')));
      }
      return resolve(Buffer.from(JSON.stringify(req.body)));
    }
    if (req.readableEnded) return resolve(null);

    var settled = false;
    var chunks = [];

    function finish(value) {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(value);
    }

    // 3 秒读不完就放弃：搜索请求体只有几百字节，正常毫秒级就结束了
    var timer = setTimeout(function () {
      console.warn('[proxy] 读取请求体超时，按空 body 处理');
      finish(chunks.length ? Buffer.concat(chunks) : null);
    }, 3000);

    req.on('data', function (c) {
      if (settled) return;
      chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c));
      // 超过 1MB 直接截断，防止异常大 body 拖死进程
      var total = chunks.reduce(function (n, b) { return n + b.length; }, 0);
      if (total > 1024 * 1024) finish(Buffer.concat(chunks));
    });
    req.on('end', function () { finish(chunks.length ? Buffer.concat(chunks) : null); });
    req.on('error', function () { finish(null); });
    req.on('aborted', function () { finish(null); });
  });
}

/** 清洗 header 值：Node 对 header 有严格校验，含换行/非 ASCII 会抛 ERR_INVALID_CHAR */
function sanitizeHeaderValue(value) {
  return String(value == null ? '' : value)
    .replace(/[\r\n]+/g, ' ')
    .replace(/[^\x20-\x7E]/g, function (ch) {
      const code = ch.charCodeAt(0);
      return code < 256 ? '%' + code.toString(16).padStart(2, '0') : encodeURIComponent(ch);
    })
    .trim();
}

module.exports = async function handler(req, res) {
  const q = req.query || {};

  let target = q.url || '';
  if (!target && q.b64) {
    try {
      target = Buffer.from(String(q.b64), 'base64url').toString('utf8');
    } catch (e) {
      target = '';
    }
  }
  const kind = q.kind || 'api';


  if (!target) {
    res.status(400).send('missing url');
    return;
  }

  let targetUrl;
  try {
    targetUrl = new URL(target);
  } catch (e) {
    res.status(400).send('invalid url');
    return;
  }

  if (kind === 'media' && !/^(GET|HEAD)$/i.test(req.method || 'GET')) {
    res.status(405).send('media proxy only supports GET/HEAD');
    return;
  }

  // 先做一次快速拒绝（字面量 IP 和已知内网名），真正的校验在 forward 里
  // 用 DNS 解析后的真实 IP 做，这里只是省掉明显非法的请求
  if (!isAllowed(targetUrl.hostname, kind)) {
    res.status(403).send('host not allowed: ' + targetUrl.hostname);
    return;
  }

  // 请求日志：排查「某个平台卡住」时看这条，确认请求是否到达服务端
  console.log('[proxy]', (req.method || 'GET'), kind, targetUrl.hostname + targetUrl.pathname);

  // 只转发白名单内的请求头。
  // 之前是 Object.assign({}, req.headers) 全量复制，会把本站的
  // Cookie / Authorization 一起送给任意目标域——配合「kind=api 不限域名」，
  // 等于谁都能借这个函数把用户凭证取走。
  const KEEP_HEADERS = [
    'user-agent', 'accept', 'accept-language', 'content-type', 'range',
    'if-none-match', 'if-modified-since', 'cache-control'
  ];
  const headers = {};
  KEEP_HEADERS.forEach(function (k) {
    if (req.headers[k] != null) headers[k] = req.headers[k];
  });

  // 读出请求体：POST 搜索接口（企鹅/网易）必须把 body 转发给上游，
  // 否则上游一直等数据，表现为请求挂到超时。
  const bodyBuffer = await readBody(req);
  // 显式给 content-length：不要的话 Node 会改用 chunked，
  // 部分 PHP/CGI 风格的上游不解析 chunked body，会一直等到超时
  if (bodyBuffer && bodyBuffer.length) {
    headers['content-length'] = bodyBuffer.length;
  }

  try {
    await forward(targetUrl, req.method || 'GET', headers, 0, res, kind, bodyBuffer);
  } catch (error) {
    if (!res.headersSent) res.status(502).send('proxy error: ' + error.message);
  }
};

/** 带重定向跟随的转发（浏览器 fetch 无法跨源跟随，必须在服务端做） */
function forward(targetUrl, method, headers, redirectCount, res, kind, body) {
  return new Promise(function (resolve, reject) {
    if (redirectCount > 5) {
      res.status(502).send('too many redirects');
      return resolve();
    }

    // 先解析并校验真实 IP，再用该 IP 建连（Host / SNI 仍用域名），
    // 这样不会出现「校验时是公网、真正连接时 DNS 换成内网」的重绑定。
    resolveTarget(targetUrl.hostname).then(function (ips) {
      if (!ips || !ips.length) {
        res.status(403).send('host not allowed: ' + targetUrl.hostname);
        return resolve();
      }
      // 逐个地址尝试：某个 IP 连不上（常见于只有 IPv6 的解析结果、
      // 或某台后端不可达）就换下一个，而不是直接报超时
      var idx = 0;
      var attempt = function () {
        if (idx >= ips.length) {
          res.status(502).send('all upstream addresses failed: ' + targetUrl.hostname);
          return resolve();
        }
        doForward(targetUrl, method, headers, redirectCount, res, kind, body,
                  ips[idx++], resolve, reject, attempt);
      };
      attempt();
    }).catch(reject);
  });
}

function doForward(targetUrl, method, headers, redirectCount, res, kind, body, ipInfo,
                    resolve, reject, onRetry) {
    const client = targetUrl.protocol === 'https:' ? https : http;
    const bareHost = targetUrl.hostname.replace(/^\[|\]$/g, '');
    // Host 头必须是原域名（虚拟主机路由靠它），但要放在 headers 里，
    // 不能写成 options.host——options.host 是「连接目标」的别名，
    // 会覆盖 hostname，等于放弃了 IP 固定、又退回按域名连接。
    if (!headers.host) {
      headers.host = bareHost + (targetUrl.port ? ':' + targetUrl.port : '');
    }
    const proxyReq = client.request({
      protocol: targetUrl.protocol,
      hostname: ipInfo.address,
      family: ipInfo.family,
      port: targetUrl.port,
      path: targetUrl.pathname + targetUrl.search,
      method: method,
      headers: headers,
      // HTTPS 的 SNI 与证书校验必须针对域名，而不是解析出来的 IP
      servername: net.isIP(bareHost) ? undefined : bareHost,
      rejectUnauthorized: true
    }, function (proxyRes) {
      const status = proxyRes.statusCode || 200;

      // 跟随重定向
      if (status >= 300 && status < 400 && proxyRes.headers.location) {
        const next = new URL(proxyRes.headers.location, targetUrl);
        proxyRes.resume();
        if (!isAllowed(next.hostname, kind)) {
          res.status(403).send('redirect host not allowed: ' + next.hostname);
          return resolve();
        }
        const nextMethod = (status === 303 || status === 301 || status === 302) ? 'GET' : method;
        resolve(forward(next, nextMethod, headers, redirectCount + 1, res, kind, nextMethod === 'GET' ? null : body));
        return;
      }

      const upstreamType = String(proxyRes.headers['content-type'] || '');
      const isMedia = kind === 'media' || /^(audio|video)\//i.test(upstreamType) ||
        /\.(mp3|flac|m4a|aac|ogg|wav|ape)(\?|$)/i.test(targetUrl.pathname + targetUrl.search);

      if (isMedia) {
        // 媒体走流式转发，并把 Content-Type 改成 octet-stream，
        // 避免 IDM 等下载器按 audio/* 嗅探并弹窗接管
        const mediaHeaders = {
          'Content-Type': 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'content-length, content-range, accept-ranges',
          'Cache-Control': 'no-store, no-cache, must-revalidate'
        };
        if (proxyRes.headers['content-length']) mediaHeaders['Content-Length'] = proxyRes.headers['content-length'];
        if (proxyRes.headers['accept-ranges']) mediaHeaders['Accept-Ranges'] = proxyRes.headers['accept-ranges'];
        if (proxyRes.headers['content-range']) mediaHeaders['Content-Range'] = proxyRes.headers['content-range'];
        res.writeHead(status, mediaHeaders);
        proxyRes.pipe(res);
        proxyRes.on('end', resolve);
        proxyRes.on('error', reject);
        // 客户端中途断开（拖动进度条 / 切歌）要掐掉上游下载，
        // 否则连接和带宽会一直被占着，handler 的 Promise 也永不 settle
        res.on('close', function () {
          if (!res.writableFinished) {
            try { proxyRes.destroy(); } catch (e) {}
            resolve();
          }
        });
        return;
      }

      const chunks = [];
      let total = 0;
      let tooLarge = false;
      proxyRes.on('data', function (c) {
        if (tooLarge) return;
        total += c.length;
        if (total > MAX_BODY) {
          tooLarge = true;
          chunks.length = 0;
          try { proxyRes.destroy(); } catch (e) {}
          if (!res.headersSent) res.status(413).send('upstream response too large');
          resolve();
          return;
        }
        chunks.push(c);
      });
      proxyRes.on('end', function () {
        if (tooLarge) return;
        const raw = decompress(Buffer.concat(chunks), proxyRes.headers['content-encoding']);
        if (raw.length > MAX_BODY) {
          if (!res.headersSent) res.status(413).send('upstream response too large');
          resolve();
          return;
        }
        const ctype = safeContentType(upstreamType);
        const outHeaders = {
          'Content-Type': ctype,
          'Access-Control-Allow-Origin': '*',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache',
          // 同源回吐上游内容时必须是 nosniff，否则浏览器可能按内容嗅探
          // 成 HTML 并在本站源里执行脚本（反射型 XSS）
          'X-Content-Type-Options': 'nosniff'
        };
        // 非 JSON 的一律当附件下载，彻底切断「当页面渲染」的可能性
        if (!/^application\/json/.test(ctype)) {
          outHeaders['Content-Disposition'] = 'attachment';
        }
        // 不再把上游的 Set-Cookie 写给浏览器：那会在本站源上种下
        // 攻击者可控的 Cookie（会话固定）。需要 Cookie 的平台由
        // 音源脚本在自己的请求里带，不经过浏览器存储。
        try {
          res.writeHead(status, outHeaders);
        } catch (e) {
          res.writeHead(status, {
            'Content-Type': outHeaders['Content-Type'],
            'Access-Control-Allow-Origin': '*'
          });
        }
        res.end(raw);
        resolve();
      });
      proxyRes.on('error', reject);
    });

    // 连接层失败（拒绝/不可达/IPv6 无出口）就换下一个解析结果重试。
    // 已经拿到响应之后再出错就不能重试了，那样会重复写入同一个 res。
    var gotResponse = false;
    var retried = false;
    var maybeRetry = function () {
      if (gotResponse || res.headersSent || !onRetry || retried) return false;
      retried = true;
      onRetry();
      return true;
    };
    proxyReq.on('response', function () { gotResponse = true; });
    proxyReq.on('error', function (err) {
      if (maybeRetry()) return;
      reject(err);
    });

    // 上游超时：某些平台在特定网络下 TCP 能连上但永不响应，
    // 不设超时会让整个搜索挂住。还没拿到响应的超时同样可以换个 IP 重试。
    proxyReq.setTimeout(10000, function () {
      if (maybeRetry()) {
        try { proxyReq.destroy(); } catch (e) {}
        return;
      }
      proxyReq.destroy(new Error('上游响应超时'));
    });

    // 有请求体时写入，否则上游会一直等
    if (body && body.length) proxyReq.write(body);
    proxyReq.end();
}

module.exports.isAllowed = isAllowed;
