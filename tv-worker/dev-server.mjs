/* 本地开发适配器：把 Node http 请求转成 Web Request，复用 tv-worker/src/core.js
 * 用法：node tv-worker/dev-server.mjs  （默认 127.0.0.1:8787）
 */
import http from 'node:http';
import { Readable } from 'node:stream';
import { handle } from './src/core.js';

const PORT = Number(process.env.PORT || 8787);
const HOST = process.env.HOST || '127.0.0.1';

const server = http.createServer(async (req, res) => {
  let request;
  try {
    const url = new URL(req.url || '/', 'http://' + (req.headers.host || `${HOST}:${PORT}`));
    const headers = new Headers();
    for (let i = 0; i < req.rawHeaders.length; i += 2) {
      try { headers.append(req.rawHeaders[i], req.rawHeaders[i + 1]); } catch (e) { /* 忽略非法头 */ }
    }
    request = new Request(url, { method: req.method || 'GET', headers });
  } catch (e) {
    res.writeHead(400, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('bad request');
    return;
  }

  try {
    const response = await handle(request, {
      // 本地开发不校验来源，方便直接打开 /playlist 调试
      ALLOW_ANY_ORIGIN: '1',
      ALLOWED_ORIGINS: '*',
    });
    const out = {};
    response.headers.forEach((v, k) => { out[k] = v; });
    res.writeHead(response.status, out);
    if (!response.body || req.method === 'HEAD') {
      res.end();
      return;
    }
    const stream = Readable.fromWeb(response.body);
    stream.on('error', () => { try { res.destroy(); } catch (e) { /* 忽略 */ } });
    res.on('close', () => { try { stream.destroy(); } catch (e) { /* 忽略 */ } });
    stream.pipe(res);
  } catch (e) {
    console.error('[tv-worker]', e);
    if (!res.headersSent) {
      res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
    }
    res.end(JSON.stringify({ error: 'dev server error: ' + (e && e.message ? e.message : e) }));
  }
});

server.listen(PORT, HOST, () => {
  console.log(`TV worker dev server: http://${HOST}:${PORT}/ping`);
  console.log('提示：本地先运行 node scripts/build-tv-data.js 生成频道数据');
});
