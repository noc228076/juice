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
  '.ico': 'image/x-icon',
  '.webp': 'image/webp',
  // 音频缺失类型会退化成 application/octet-stream，
  // 实测部分浏览器（ORB 策略）会把它吞成 204 空响应，媒体完全无法播放
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.ogg': 'audio/ogg',
  '.opus': 'audio/ogg',
  '.webm': 'video/webm',
  '.txt': 'text/plain; charset=utf-8'
};

// 本地跑 Serverless 函数：把 Vercel 的 req.query / req.body / res.status().json()
// 补齐成同一套接口，线上和本地就是同一份 api/leaderboard.js
function runApi(req, res, pathname) {
  const apiRoot = path.join(__dirname, 'api') + path.sep;
  // 客户端按 Vercel 约定请求 /api/leaderboard（不带 .js），
  // 本地文件系统需要把后缀补回来，否则所有榜单接口都是 404。
  let file = path.join(__dirname, pathname);
  if (!fs.existsSync(file) && fs.existsSync(file + '.js')) file += '.js';
  // 不带 path.sep 的话 /api/../apifoo.js 也会通过 startsWith('…/api')
  if (!file.startsWith(apiRoot)) {
    res.writeHead(404);
    res.end('404 Not Found');
    return;
  }
  // 不存在的 api 直接 404：此前落到 require 的 MODULE_NOT_FOUND，
  // 500 响应里带着服务器绝对路径
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404);
    res.end('404 Not Found');
    return;
  }
  let handler;
  try {
    handler = require(file);
  } catch (e) {
    // 路径细节只进日志，不回显给客户端
    console.error('[runApi] api load failed:', pathname, e.message);
    res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify({ ok: false, error: 'API 加载失败' }));
    return;
  }

  const url = new URL(req.url, 'http://localhost');
  req.query = Object.fromEntries(url.searchParams.entries());

  // 用 setEncoding 而不是 chunk.toString()：后者按 chunk 边界各自解码，
  // 一个中文字/emoji 正好被切在边界上时会变成乱码。
  req.setEncoding('utf8');
  let raw = '';
  req.on('data', (chunk) => {
    raw += chunk;
    // 请求体上限 1MB：本站 API 最大的是榜单提交/弹幕文本，远用不到这么大
    if (raw.length > 1e6) {
      req.destroy();
    }
  });
  req.on('end', () => {
    if (raw) {
      try { req.body = JSON.parse(raw); } catch (e) { req.body = raw; }
    }
    res.status = (code) => { res.statusCode = code; return res; };
    res.send = (body) => {
      if (typeof body === 'object' && body !== null) return res.json(body);
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      }
      res.end(body == null ? '' : String(body));
      return res;
    };
    res.json = (obj) => {
      if (!res.getHeader('Content-Type')) {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
      }
      res.end(JSON.stringify(obj));
      return res;
    };
    Promise.resolve(handler(req, res)).catch((err) => {
      console.error('[api] handler error:', err);
      if (!res.writableEnded) res.status(500).json({ ok: false, error: '服务器内部错误' });
    });
  });
}

const server = http.createServer((req, res) => {
  let reqPath;
  try {
    reqPath = decodeURI(req.url.split('?')[0]);
  } catch (e) {
    // 畸形 URL（如 /%E0%A4%A）会抛 URIError，回调里没接住会直接打挂进程
    res.writeHead(400); res.end('400 Bad Request'); return;
  }
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  if (reqPath.startsWith('/api/')) {
    runApi(req, res, reqPath);
    return;
  }
  // 防路径穿越：decodeURI 会把 %2E 解码成 "."，拼出 ../ 逃出项目根。
  // 解析成绝对路径后必须仍落在 __dirname 之内，否则一律 404。
  const filePath = path.resolve(__dirname, '.' + reqPath.replace(/\\/g, '/'));
  if (!filePath.startsWith(__dirname + path.sep) && filePath !== __dirname) {
    res.writeHead(403);
    res.end('403 Forbidden');
    return;
  }
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
// 只绑回环：这是本地预览服务器，绑 0.0.0.0 会把整个项目目录（含 .git、
// scratch、node_modules）暴露到局域网
server.listen(PORT, '127.0.0.1', () => {
  console.log(`Local preview server running at http://localhost:${PORT}/#/daily`);
});
