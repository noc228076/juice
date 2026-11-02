/* Vercel 同源转发到 Cloudflare Worker
 *
 * 浏览器只访问 https://juice.noooc.dpdns.org/api/tv?path=/playlist…
 * 由这个函数转发到 workers.dev，避免国内浏览器直连 workers.dev 被墙/DNS 污染。
 * Worker 通过 X-TV-Public-Base 返回 /api/tv?path=… 形式的分片地址。
 *
 * 暂时下线（v605）：本文件不在 api/ 下，Vercel 不会部署。
 * 重新上线时移回 api/tv.js，并在 vercel.json 加 /api/tv rewrite。
 */
const { Readable } = require('stream');

const WORKER = process.env.TV_WORKER_URL || 'https://juice-tv-proxy.2280762725.workers.dev';
const SITE_ORIGIN = 'https://juice.noooc.dpdns.org';
const ALLOWED = new Set(['/ping', '/playlist', '/media', '/proxy']);
const PASS_HEADERS = ['content-type', 'content-range', 'accept-ranges', 'content-length', 'last-modified', 'etag'];

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'OPTIONS') {
    res.status(204);
    res.setHeader('Allow', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.end();
    return;
  }
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.status(405).json({ error: 'method not allowed' });
    return;
  }

  // 同源转发只服务本站页面；浏览器跨站调用会带 Origin/Referer，直接拒绝。
  // 无 Origin/Referer 的 GET 仍允许（命令行探活/部分媒体请求）。
  const ref = req.headers.origin || req.headers.referer || '';
  if (ref) {
    let host = '';
    try { host = new URL(ref).hostname; } catch (e) { host = ''; }
    const okHost = host === 'juice.noooc.dpdns.org' ||
      host === 'localhost' || host === '127.0.0.1' ||
      /\.vercel\.app$/.test(host);
    if (!okHost) {
      res.status(403).json({ error: 'origin not allowed' });
      return;
    }
  }

  let path = '';
  try {
    path = (req.query && req.query.path) ||
      new URL(req.url, 'http://localhost').searchParams.get('path') || '';
  } catch (e) {
    path = '';
  }
  if (!path || path[0] !== '/') {
    res.status(400).json({ error: 'need path' });
    return;
  }

  let target;
  try {
    target = new URL(WORKER + path);
  } catch (e) {
    res.status(400).json({ error: 'bad path' });
    return;
  }
  if (target.origin !== new URL(WORKER).origin || !ALLOWED.has(target.pathname)) {
    res.status(400).json({ error: 'path not allowed' });
    return;
  }

  const headers = {
    'User-Agent': 'juice-tv-vercel',
    'Accept': '*/*',
    'Origin': SITE_ORIGIN,
    'Referer': SITE_ORIGIN + '/',
    // Worker 用它生成 /api/tv?path=… 的同源播放地址
    'X-TV-Public-Base': '/api/tv?path=',
  };
  if (req.headers.range) headers.Range = req.headers.range;
  if (req.headers['if-range']) headers['If-Range'] = req.headers['if-range'];

  let upstream;
  try {
    upstream = await fetch(target, {
      method: req.method,
      headers,
      redirect: 'follow',
      signal: AbortSignal.timeout(25000),
    });
  } catch (e) {
    res.status(502).json({ error: 'worker fetch failed: ' + (e && e.message ? e.message : e) });
    return;
  }

  const out = {};
  for (const name of PASS_HEADERS) {
    const v = upstream.headers.get(name);
    if (v !== null) out[name] = v;
  }
  out['Cache-Control'] = 'no-store';
  out['Access-Control-Allow-Origin'] = req.headers.origin || '*';
  out['X-Content-Type-Options'] = 'nosniff';
  res.writeHead(upstream.status, out);

  if (!upstream.body || req.method === 'HEAD') {
    res.end();
    return;
  }
  const stream = Readable.fromWeb(upstream.body);
  stream.on('error', () => { try { res.destroy(); } catch (e) { /* 忽略 */ } });
  res.on('close', () => { try { stream.destroy(); } catch (e) { /* 忽略 */ } });
  stream.pipe(res);
};
