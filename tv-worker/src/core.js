/* Cloudflare Worker / Node 共用的电视直播代理
 *
 * 路由：
 *   GET /ping                              健康检查
 *   GET /playlist?local=extra|verified     内置频道表（只返回不透明 /media 地址）
 *   GET /playlist?url=<m3u>                自定义 M3U（返回 /proxy 地址）
 *   GET /media?cid=…&i=…                   按频道地址序号取流（真实地址不出服务端）
 *   GET /proxy?url=…                       HLS 播放列表重写 / 分片流式透传
 *
 * 不依赖 Workers 专有 API，Node 24 的 dev-server.mjs 可以直接复用。
 */
import { ENTRY, URLS, HOSTS, META } from './data.js';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';
const MAX_PLAYLIST = 8 * 1024 * 1024;   // 播放列表上限
const MAX_TEXT = 2 * 1024 * 1024;       // text/* 嗅探上限
const UPSTREAM_TIMEOUT = 20000;
const DEFAULT_ORIGINS = [
  'https://juice.noooc.dpdns.org',
  'http://localhost:3456',
  'http://127.0.0.1:3456',
  'http://127.0.0.1:8787',
];

const BLACKLIST = [
  /event\.pull\.hebtv\.com\/jishi/i,
  /\/tvu\//i,
];

/* ---------- 基础工具 ---------- */
function timeoutSignal(ms) {
  if (typeof AbortSignal !== 'undefined' && AbortSignal.timeout) return AbortSignal.timeout(ms);
  const c = new AbortController();
  setTimeout(() => c.abort(), ms);
  return c.signal;
}

function allowedOrigins(env) {
  const raw = (env && env.ALLOWED_ORIGINS) || DEFAULT_ORIGINS.join(',');
  return raw.split(',').map((s) => s.trim()).filter(Boolean);
}

function originAllowed(request, env) {
  if (env && env.ALLOW_ANY_ORIGIN === '1') return true;
  const allow = allowedOrigins(env);
  if (allow.includes('*')) return true;
  const origin = request.headers.get('Origin');
  const referer = request.headers.get('Referer');
  if (origin) return allow.includes(origin);
  if (referer) {
    try { return allow.includes(new URL(referer).origin); } catch (e) { return false; }
  }
  // 浏览器发起的媒体请求有时不带 Origin/Referer；生产环境可用 REQUIRE_ORIGIN=1 收紧
  return !(env && env.REQUIRE_ORIGIN === '1');
}

function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Range, Accept, Content-Type',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range, Accept-Ranges, Date',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function withCors(headers, request) {
  return Object.assign({}, headers, corsHeaders(request));
}

/* 生成客户端可访问的 URL。
   - 直连 Worker：用 Worker 自己的 origin
   - 经 Vercel /api/tv 转发：函数会带 X-TV-Public-Base=/api/tv?path=
     让 Worker 返回相对的同源代理地址，浏览器不再需要访问 workers.dev */
function publicBase(request, env) {
  return (env && env.PUBLIC_BASE) ||
    request.headers.get('X-TV-Public-Base') ||
    new URL(request.url).origin;
}
function publicUrl(request, env, path) {
  const base = publicBase(request, env);
  if (base.slice(-5) === 'path=') return base + encodeURIComponent(path);
  return base.replace(/\/$/, '') + path;
}

function json(obj, status, request, env) {
  return new Response(JSON.stringify(obj), {
    status: status || 200,
    headers: withCors({
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    }, request),
  });
}

function text(msg, status, request, env) {
  return new Response(msg, {
    status: status || 200,
    headers: withCors({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    }, request),
  });
}

/* ---------- URL / SSRF 防护 ---------- */
function isPrivateHost(hostname) {
  const h = hostname.toLowerCase();
  if (!h) return true;
  if (h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') ||
      h.endsWith('.internal') || h === 'metadata' || h === 'metadata.google.internal') {
    return true;
  }
  // IPv6 字面量（URL.hostname 不带方括号）
  if (h.includes(':')) {
    if (h === '::1' || h === '::' || h.startsWith('fc') || h.startsWith('fd') ||
        h.startsWith('fe8') || h.startsWith('fe9') || h.startsWith('fea') || h.startsWith('feb')) {
      return true;
    }
    if (h.startsWith('::ffff:')) return isPrivateHost(h.slice(7));
    return false;
  }
  if (/^\d+\.\d+\.\d+\.\d+$/.test(h)) {
    const parts = h.split('.').map(Number);
    if (parts.some((n) => n < 0 || n > 255)) return true;
    const n = ((parts[0] << 24) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
    const ranges = [
      [0x00000000, 8], [0x0A000000, 8], [0x7F000000, 8], [0xA9FE0000, 16],
      [0xAC100000, 12], [0xC0A80000, 16], [0x64400000, 10],
      [0xC6120000, 15], [0xE0000000, 4], [0xF0000000, 4],
    ];
    for (const [base, bits] of ranges) {
      const mask = bits === 0 ? 0 : (0xFFFFFFFF << (32 - bits)) >>> 0;
      if ((n & mask) === (base & mask)) return true;
    }
    return false;
  }
  return false;
}

function parseTarget(raw) {
  let u;
  try { u = new URL(raw); } catch (e) { return null; }
  if (u.protocol !== 'http:' && u.protocol !== 'https:') return null;
  if (isPrivateHost(u.hostname)) return null;
  return u;
}

function isBlacklisted(url) {
  return BLACKLIST.some((re) => re.test(url));
}

/* ---------- M3U 解析 ---------- */
function parseM3U(body, baseUrl) {
  const out = [];
  let cur = null;
  for (const raw of String(body).split(/\r?\n/)) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith('#EXTINF')) {
      const info = line.split(',').slice(1).join(',').trim();
      const attrs = {};
      line.replace(/([\w-]+)="([^"]*)"/g, (_, k, v) => { attrs[k] = v; });
      cur = {
        name: (attrs['tvg-name'] || info || '').trim(),
        group: (attrs['group-title'] || '其他').trim(),
        logo: (attrs['tvg-logo'] || '').trim(),
        url: '',
      };
    } else if (line.startsWith('#')) {
      continue;
    } else if (cur) {
      try {
        cur.url = new URL(line, baseUrl).href;
      } catch (e) {
        cur.url = line;
      }
      if (/^https?:\/\//i.test(cur.url) && !isBlacklisted(cur.url)) out.push(cur);
      cur = null;
    }
  }
  return out;
}

/** 读取文本并限制大小，避免 gzip bomb / 超大列表 */
async function readTextLimited(resp, max) {
  if (!resp.body) return '';
  const reader = resp.body.getReader();
  const decoder = new TextDecoder();
  const chunks = [];
  let total = 0;
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > max) {
        try { await reader.cancel(); } catch (e) { /* 忽略 */ }
        throw new Error('body too large');
      }
      chunks.push(decoder.decode(value, { stream: true }));
    }
    chunks.push(decoder.decode());
  } finally {
    try { reader.releaseLock(); } catch (e) { /* 忽略 */ }
  }
  return chunks.join('');
}

/* ---------- 播放列表重写 ---------- */
function rewritePlaylist(body, baseUrl, request, env) {
  const toProxy = (u) => {
    let abs;
    try { abs = new URL(u, baseUrl).href; } catch (e) { abs = u; }
    return publicUrl(request, env, '/proxy?url=' + encodeURIComponent(abs));
  };
  return String(body).split(/\r?\n/).map((raw) => {
    const line = raw.trim();
    if (!line) return '';
    if (line.startsWith('#')) {
      if (!line.includes('URI="')) return line;
      return line.replace(/URI="([^"]*)"/g, (_, u) => 'URI="' + toProxy(u) + '"');
    }
    return toProxy(line);
  }).join('\n') + '\n';
}

/* ---------- 流代理 ---------- */
async function proxyUpstream(request, target, env) {
  const u = parseTarget(target);
  if (!u) return json({ error: 'url not allowed' }, 403, request, env);
  if (env && env.ENFORCE_HOSTS === '1' && !HOSTS.includes(u.host)) {
    return json({ error: 'host not allowed' }, 403, request, env);
  }

  const headers = { 'User-Agent': UA, 'Accept': '*/*' };
  const range = request.headers.get('Range');
  if (range) headers.Range = range;
  const ifRange = request.headers.get('If-Range');
  if (ifRange) headers['If-Range'] = ifRange;

  const method = request.method === 'HEAD' ? 'HEAD' : 'GET';
  let resp;
  try {
    resp = await fetch(u.href, {
      method,
      headers,
      redirect: 'follow',
      signal: timeoutSignal(UPSTREAM_TIMEOUT),
    });
  } catch (e) {
    return json({ error: 'upstream fetch failed: ' + (e && e.message ? e.message : e) }, 502, request, env);
  }

  if (!resp.ok && resp.status >= 400) {
    // hls.js 需要正确状态码做切换决策；错误体只给一小段文本
    return text('upstream ' + resp.status, resp.status, request, env);
  }

  const finalUrl = resp.url || u.href;
  const ctype = String(resp.headers.get('Content-Type') || '').toLowerCase();
  const pathname = (() => { try { return new URL(finalUrl).pathname.toLowerCase(); } catch (e) { return ''; } })();
  const looksPlaylist = ctype.includes('mpegurl') || /\.m3u8?$/.test(pathname);
  const looksText = ctype.startsWith('text/') || ctype.includes('json') || ctype.includes('xml');

  if (looksPlaylist || looksText) {
    let body;
    try {
      body = await readTextLimited(resp, looksPlaylist ? MAX_PLAYLIST : MAX_TEXT);
    } catch (e) {
      return json({ error: 'playlist read failed' }, 502, request, env);
    }
    if (body.trimStart().startsWith('#EXTM3U')) {
      const out = rewritePlaylist(body, finalUrl, request, env);
      return new Response(out, {
        status: 200,
        headers: withCors({
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        }, request),
      });
    }
    if (ctype.includes('html')) {
      return text('html upstream blocked', 415, request, env);
    }
    // 非 m3u 的文本（错误页等）只回一小段，避免把上游页面原样透传
    return text(body.slice(0, 2000), 502, request, env);
  }

  // 有些源把 m3u8 标成 application/octet-stream 且 URL 没有扩展名：
  // 克隆一个流嗅探前 512 字节，命中 #EXTM3U 就按播放列表处理，否则继续透传。
  if (!ctype.includes('video/') && !ctype.includes('audio/') && resp.body) {
    const probe = resp.clone();
    let head = '';
    try {
      const reader = probe.body.getReader();
      const { value } = await reader.read();
      if (value) head = new TextDecoder().decode(value.slice(0, 512));
      try { await reader.cancel(); } catch (e) { /* 忽略 */ }
    } catch (e) { /* 嗅探失败按二进制处理 */ }
    if (head.trimStart().startsWith('#EXTM3U')) {
      let body;
      try {
        body = await readTextLimited(resp, MAX_PLAYLIST);
      } catch (e) {
        return json({ error: 'playlist read failed' }, 502, request, env);
      }
      const out = rewritePlaylist(body, finalUrl, request, env);
      return new Response(out, {
        status: 200,
        headers: withCors({
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-store',
          'X-Content-Type-Options': 'nosniff',
        }, request),
      });
    }
  }

  if (ctype.includes('text/html')) {
    return text('html upstream blocked', 415, request, env);
  }

  const h = withCors({
    'Content-Type': resp.headers.get('Content-Type') || 'application/octet-stream',
    'Cache-Control': 'no-store',
    'X-Content-Type-Options': 'nosniff',
  }, request);
  for (const name of ['accept-ranges', 'content-range', 'last-modified', 'etag']) {
    const v = resp.headers.get(name);
    if (v) h[name.replace(/(^|-)([a-z])/g, (m) => m.toUpperCase())] = v;
  }
  // fetch 可能自动解压，Content-Length 会和实际 body 不一致；只对 206 透传
  if (resp.status === 206) {
    const len = resp.headers.get('Content-Length');
    if (len) h['Content-Length'] = len;
  }

  return new Response(method === 'HEAD' ? null : resp.body, {
    status: resp.status,
    headers: h,
  });
}

/* ---------- 路由 ---------- */
async function handlePlaylist(request, url, env) {
  const local = (url.searchParams.get('local') || '').trim();
  if (local) {
    if (!/^[a-z0-9_-]+$/i.test(local)) return json({ error: 'bad local' }, 400, request, env);
    const list = ENTRY.filter((e) => e.s === local);
    if (!list.length) return json({ error: 'local list not found: ' + local }, 404, request, env);
    const channels = list.map((e) => ({
      name: e.n,
      group: e.g,
      logo: e.l,
      url: publicUrl(request, env, '/media?cid=' + encodeURIComponent(e.c) + '&i=' + e.i),
    }));
    return json({ url: 'local:' + local, count: channels.length, channels }, 200, request, env);
  }

  const target = (url.searchParams.get('url') || '').trim();
  const u = parseTarget(target);
  if (!u) return json({ error: 'need http(s) url' }, 400, request, env);

  let resp;
  try {
    resp = await fetch(u.href, {
      headers: { 'User-Agent': UA, 'Accept': '*/*' },
      redirect: 'follow',
      signal: timeoutSignal(UPSTREAM_TIMEOUT),
    });
  } catch (e) {
    return json({ error: 'fetch failed: ' + (e && e.message ? e.message : e) }, 502, request, env);
  }
  if (!resp.ok) return json({ error: 'upstream ' + resp.status }, 502, request, env);

  let body;
  try {
    body = await readTextLimited(resp, MAX_PLAYLIST);
  } catch (e) {
    return json({ error: 'playlist too large' }, 413, request, env);
  }
  const parsed = parseM3U(body, resp.url || u.href);
  const channels = parsed.map((ch) => ({
    name: ch.name,
    group: ch.group,
    logo: ch.logo,
    url: publicUrl(request, env, '/proxy?url=' + encodeURIComponent(ch.url)),
  }));
  return json({ url: resp.url || u.href, count: channels.length, channels }, 200, request, env);
}

function handleMedia(request, url, env) {
  const cid = (url.searchParams.get('cid') || '').trim();
  const i = Number(url.searchParams.get('i'));
  if (!cid || !URLS[cid] || !Number.isInteger(i) || i < 0 || i >= URLS[cid].length) {
    return json({ error: 'media not found' }, 404, request, env);
  }
  return proxyUpstream(request, URLS[cid][i], env);
}

function handleProxy(request, url, env) {
  const target = (url.searchParams.get('url') || '').trim();
  if (!target) return json({ error: 'need url' }, 400, request, env);
  return proxyUpstream(request, target, env);
}

export async function handle(request, env) {
  env = env || {};
  const url = new URL(request.url);

  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders(request) });
  }
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return json({ error: 'method not allowed' }, 405, request, env);
  }
  if (!originAllowed(request, env)) {
    return json({ error: 'origin not allowed' }, 403, request, env);
  }

  switch (url.pathname) {
    case '/ping':
      return json({ ok: true, meta: META, now: new Date().toISOString() }, 200, request, env);
    case '/playlist':
      return handlePlaylist(request, url, env);
    case '/media':
      return handleMedia(request, url, env);
    case '/proxy':
      return handleProxy(request, url, env);
    default:
      return json({ error: 'not found' }, 404, request, env);
  }
}
