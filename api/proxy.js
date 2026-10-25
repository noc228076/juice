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

// 搜索接口用到的平台域名；kind=api 时不套白名单，此表仅作参考
const PLATFORM_HOSTS = [
  'kuwo.cn', 'kugou.com', 'qq.com', 'music.163.com', '163.com',
  'migu.cn', '126.net', 'music.126.net', 'y.qq.com', 'kgimg.com',
  'kugou.net', 'migucloud.com', '12530.com', 'jadeite.migu.cn'
];

const PRIVATE_HOST_RXP = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.0\.0\.0|169\.254\.|\[::1\]|::1)/i;
const IPV4_RXP = /^\d{1,3}(\.\d{1,3}){3}$/;

function isAllowed(hostname, kind) {
  // 任何用途都不允许访问内网地址，避免被当作内网探测跳板
  if (PRIVATE_HOST_RXP.test(hostname)) return false;
  if (kind === 'media' || kind === 'api') return true;
  if (IPV4_RXP.test(hostname)) return true;
  return PLATFORM_HOSTS.some(function (h) {
    return hostname === h || hostname.endsWith('.' + h);
  });
}

function decompress(buffer, encoding) {
  try {
    switch (String(encoding || '').toLowerCase()) {
      case 'gzip': return zlib.gunzipSync(buffer);
      case 'deflate': return zlib.inflateSync(buffer);
      case 'br': return zlib.brotliDecompressSync(buffer);
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
    // Vercel Node runtime：body 可能已被解析成对象/字符串
    if (req.body != null && typeof req.body !== 'function') {
      if (Buffer.isBuffer(req.body)) return resolve(req.body);
      if (typeof req.body === 'string') return resolve(Buffer.from(req.body));
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

  if (!isAllowed(targetUrl.hostname, kind)) {
    res.status(403).send('host not allowed: ' + targetUrl.hostname);
    return;
  }

  // 请求日志：排查「某个平台卡住」时看这条，确认请求是否到达服务端
  console.log('[proxy]', (req.method || 'GET'), kind, targetUrl.hostname + targetUrl.pathname);

  // 转发时去掉 Origin/Referer，避免被目标站按 CORS 预检拒绝
  const headers = Object.assign({}, req.headers);
  delete headers.host;
  delete headers.origin;
  delete headers.referer;
  delete headers['accept-encoding'];
  delete headers['x-forwarded-for'];
  delete headers['x-real-ip'];
  // content-length 会在写入 body 时由 Node 重新计算；残留旧值会让上游等不到完整数据
  delete headers['content-length'];
  delete headers['transfer-encoding'];

  // 读出请求体：POST 搜索接口（企鹅/网易）必须把 body 转发给上游，
  // 否则上游一直等数据，表现为请求挂到超时。
  const bodyBuffer = await readBody(req);

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
      res.status(508).send('too many redirects');
      return resolve();
    }

    const client = targetUrl.protocol === 'https:' ? https : http;
    const proxyReq = client.request({
      protocol: targetUrl.protocol,
      hostname: targetUrl.hostname,
      port: targetUrl.port,
      path: targetUrl.pathname + targetUrl.search,
      method: method,
      headers: headers
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
        return;
      }

      const chunks = [];
      proxyRes.on('data', function (c) { chunks.push(c); });
      proxyRes.on('end', function () {
        const raw = decompress(Buffer.concat(chunks), proxyRes.headers['content-encoding']);
        const outHeaders = {
          'Content-Type': upstreamType || 'application/octet-stream',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Expose-Headers': 'x-set-cookie, set-cookie',
          'Cache-Control': 'no-store, no-cache, must-revalidate',
          'Pragma': 'no-cache'
        };
        if (proxyRes.headers['set-cookie']) {
          outHeaders['set-cookie'] = proxyRes.headers['set-cookie'].map(sanitizeHeaderValue);
          const joined = proxyRes.headers['set-cookie'].map(sanitizeHeaderValue).filter(Boolean).join('\n');
          if (joined) outHeaders['x-set-cookie'] = joined;
        }
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

    proxyReq.on('error', reject);

    // 上游超时：某些平台在特定网络下 TCP 能连上但永不响应，
    // 不设超时会让整个搜索挂住
    proxyReq.setTimeout(10000, function () {
      proxyReq.destroy(new Error('上游响应超时'));
    });

    // 有请求体时写入，否则上游会一直等
    if (body && body.length) proxyReq.write(body);
    proxyReq.end();
  });
}

module.exports.isAllowed = isAllowed;
