const http = require('http');
const fs = require('fs');
const path = require('path');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

// 本地跑 Serverless 函数：把 Vercel 的 req.query / req.body / res.status().json()
// 补齐成同一套接口，线上和本地就是同一份 api/leaderboard.js
function runApi(req, res, pathname) {
  const file = path.join(__dirname, pathname);
  if (!file.startsWith(path.join(__dirname, 'api'))) {
    res.writeHead(404);
    res.end('404 Not Found');
    return;
  }
  let handler;
  try {
    handler = require(file);
  } catch (e) {
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'API 加载失败: ' + e.message }));
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  req.query = Object.fromEntries(url.searchParams.entries());

  let raw = '';
  req.on('data', (chunk) => { raw += chunk; });
  req.on('end', () => {
    if (raw) {
      try { req.body = JSON.parse(raw); } catch (e) { req.body = raw; }
    }
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (obj) => {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(obj));
      return res;
    };
    Promise.resolve(handler(req, res)).catch((err) => {
      if (!res.writableEnded) res.status(500).json({ ok: false, error: String(err) });
    });
  });
}

const server = http.createServer((req, res) => {
  let reqPath = decodeURI(req.url.split('?')[0]);
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath.startsWith('/api/')) {
    runApi(req, res, reqPath);
    return;
  }
  const filePath = path.join(__dirname, reqPath);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('404 Not Found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*'
    });
    res.end(data);
  });
});

const PORT = 3456;
server.listen(PORT, () => {
  console.log(`Local preview server running at http://localhost:${PORT}/#/daily`);
});
