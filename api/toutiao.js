/* =========================================================
   今日头条热榜代理 (Toutiao Hot Board Proxy)
   官方接口 https://www.toutiao.com/hot-event/hot-board/ 返回 JSON，
   但不带 Access-Control-Allow-Origin，浏览器直连必被 CORS 拦。
   这里在服务端代为请求并把字段拉平：
     GET /api/toutiao → { ok: true, data: [{ title, hot_value, link }] }

   上游地址写死，不接受任何 URL 参数，避免变成任意 URL 代理（SSRF）。
   ========================================================= */

const UPSTREAM = 'https://www.toutiao.com/hot-event/hot-board/?origin=toutiao_pc';

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

module.exports = async function handler(req, res) {
  try {
    const upstream = await fetch(UPSTREAM, {
      headers: {
        'User-Agent': UA,
        Referer: 'https://www.toutiao.com/',
        Accept: 'application/json'
      },
      // 与其他 api 一致：8s 上游超时，避免拖到平台函数上限
      signal: AbortSignal.timeout ? AbortSignal.timeout(8000) : undefined
    });

    if (!upstream.ok) {
      res.status(502).json({ ok: false, error: '上游 ' + upstream.status });
      return;
    }

    const data = await upstream.json();
    const rows = Array.isArray(data && data.data) ? data.data : [];

    const list = rows.map(function (it) {
      if (!it) return null;
      return {
        title: String(it.Title || '').trim(),
        // HotValue 是数字热度，前端按数值排序
        hot_value: Number(it.HotValue) || 0,
        link: String(it.Url || '').trim()
      };
    }).filter(function (x) { return x && x.title; });

    if (!list.length) {
      res.status(502).json({ ok: false, error: '上游返回空榜单' });
      return;
    }

    // 热榜 10 分钟缓存，和前端本地缓存的节奏一致
    res.setHeader('Cache-Control', 'public, max-age=600, stale-while-revalidate=1800');
    // 字段名用 data：前端 fetchWithCacheDetail 会优先取 json.data，
    // 拿到数组后可直接按热榜列表消费
    res.status(200).json({ ok: true, data: list, updatedAt: Date.now() });
  } catch (err) {
    res.status(502).json({ ok: false, error: '头条热榜代理失败：' + (err && err.message ? err.message : 'unknown') });
  }
};
