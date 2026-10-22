/* =========================================================
   豆瓣代理 (Douban Proxy)
   豆瓣的图床和 API 都按 Referer 放行，浏览器直连会被 418 / CORS 拦。
   这里在服务端代为请求并补上 Referer：
     GET /api/douban?img=<海报URL>      → 透传图片字节
     GET /api/douban?list=movie_weekly_best → 榜单 JSON（已裁剪字段）
   只允许豆瓣域名，避免变成任意 URL 代理（SSRF）。
   ========================================================= */

const IMG_HOSTS = ['img1.doubanio.com', 'img2.doubanio.com', 'img3.doubanio.com',
  'img9.doubanio.com', 'img.doubanio.com', 'img1.douban.com', 'img2.douban.com'];

// 支持的榜单（豆瓣 rexxar 集合 id）
const COLLECTIONS = {
  movie_weekly_best: 'movie_weekly_best',      // 一周口碑电影榜
  tv_chinese_best_weekly: 'tv_chinese_best_weekly', // 华语剧集榜
  tv_global_best_weekly: 'tv_global_best_weekly'    // 全球剧集榜
};

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

module.exports = async function handler(req, res) {
  const q = req.query || {};
  const img = q.img || q.u || '';
  const list = q.list || '';

  if (img) return proxyImage(img, res);
  if (list) return proxyList(list, res);

  res.status(400).json({ ok: false, error: '缺少 img 或 list 参数' });
};

async function proxyImage(raw, res) {
  let target;
  try {
    target = new URL(decodeURIComponent(raw));
  } catch (e) {
    res.status(400).json({ ok: false, error: '图片地址不合法' });
    return;
  }
  if (target.protocol !== 'https:' || IMG_HOSTS.indexOf(target.hostname) < 0) {
    res.status(403).json({ ok: false, error: '只代理豆瓣图床' });
    return;
  }

  try {
    const upstream = await fetch(target.href, {
      headers: { Referer: 'https://movie.douban.com/', 'User-Agent': UA, Accept: 'image/*' }
    });
    if (!upstream.ok) {
      res.status(upstream.status === 404 ? 404 : 502).json({ ok: false, error: '上游 ' + upstream.status });
      return;
    }
    const type = upstream.headers.get('content-type') || 'image/jpeg';
    if (type.indexOf('image/') !== 0) {
      res.status(502).json({ ok: false, error: '上游不是图片' });
      return;
    }
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', type);
    // 海报内容按 ID 寻址、基本不变，长缓存
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
    res.status(200).end(buf);
  } catch (err) {
    res.status(502).json({ ok: false, error: '海报代理失败：' + (err && err.message ? err.message : 'unknown') });
  }
}

async function proxyList(key, res) {
  const id = COLLECTIONS[key];
  if (!id) {
    res.status(400).json({ ok: false, error: '未知榜单' });
    return;
  }

  try {
    const url = 'https://m.douban.com/rexxar/api/v2/subject_collection/' + id +
      '/items?start=0&count=12';
    const upstream = await fetch(url, {
      headers: { Referer: 'https://movie.douban.com/', 'User-Agent': UA, Accept: 'application/json' }
    });
    if (!upstream.ok) {
      res.status(502).json({ ok: false, error: '上游 ' + upstream.status });
      return;
    }
    const data = await upstream.json();
    const items = (data.subject_collection_items || []).map(function (it) {
      const pic = it.pic && (it.pic.large || it.pic.normal) || '';
      return {
        title: it.title || '',
        rating: (it.rating && it.rating.value) || null,
        card_subtitle: it.card_subtitle || '',
        url: it.url || '',
        // 海报地址仍指向豆瓣图床，前端再经本代理加载（避免 CORS/Referer）
        pic: pic,
        tags: (it.tags || []).map(function (t) { return t.name; }).slice(0, 3)
      };
    }).filter(function (m) { return m.title; });

    // 榜单 10 分钟缓存，避免每次进页面都打豆瓣
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800');
    res.status(200).json({ ok: true, items: items, updatedAt: Date.now() });
  } catch (err) {
    res.status(502).json({ ok: false, error: '榜单代理失败：' + (err && err.message ? err.message : 'unknown') });
  }
}
