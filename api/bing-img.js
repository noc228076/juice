/* =========================================================
   必应壁纸图代理 (Bing Image Proxy)
   部分用户网络无法直连 www.bing.com/cn.bing.com 图床（壁纸裂图、
   「设为全站壁纸」看似无效果）。这里在服务端代为拉取图片字节回传，
   用户浏览器只请求自家域名，不再依赖 bing 可达性。
     GET /api/bing-img?u=<bing th URL>
   只允许 bing.com/th 的图床地址（防 SSRF），结果缓存 7 天。
   ========================================================= */

const ALLOWED = /^https:\/\/(www|cn)\.bing\.com\/th\?id=OHR\.[A-Za-z0-9_-]+\.(jpg|jpeg)$/;

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

module.exports = async function handler(req, res) {
  const raw = (req.query && (req.query.u || req.query.url)) || '';
  let target;
  try {
    target = new URL(decodeURIComponent(raw));
  } catch (e) {
    res.status(400).json({ ok: false, error: '参数不合法' });
    return;
  }
  if (target.protocol !== 'https:' || !ALLOWED.test(target.href)) {
    res.status(403).json({ ok: false, error: '只代理必应壁纸图床' });
    return;
  }

  try {
    // 依次尝试原域与另一域（服务端到 bing 的连通性与用户端无关）
    const alt = target.href.replace('www.bing.com', 'cn.bing.com');
    const candidates = target.hostname === 'www.bing.com' ? [target.href, alt] : [alt, target.href];
    let buf = null;
    let lastStatus = 0;
    for (const u of candidates) {
      try {
        const r = await fetch(u, {
          headers: { Referer: 'https://www.bing.com/', 'User-Agent': UA, Accept: 'image/*' },
          redirect: 'follow'
        });
        lastStatus = r.status;
        if (r.ok) {
          const type = r.headers.get('content-type') || '';
          if (type.startsWith('image/')) { buf = Buffer.from(await r.arrayBuffer()); break; }
        }
      } catch (e) { /* 下一个域 */ }
    }
    if (!buf) {
      res.status(502).json({ ok: false, error: '上游不可达 ' + lastStatus });
      return;
    }
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
    res.status(200).end(buf);
  } catch (err) {
    res.status(502).json({ ok: false, error: '代理失败：' + (err && err.message ? err.message : 'unknown') });
  }
};
