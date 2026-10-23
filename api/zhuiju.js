/* =========================================================
   追剧资源代理 (Zhuiju Proxy)
   代理 laoma528/awesome-zhuiju-free 的 resources.json（CC BY 4.0）。
   浏览器直连 GitHub raw 受跨域/网络限制，这里服务端代取并裁剪字段。
     GET /api/zhuiju            → { ok, updatedAt, resources: [...] }
     GET /api/zhuiju?cat=online_video → 仅返回某分类
   缓存 6 小时（数据源每天才更新一次）。
   ========================================================= */

/* 数据源：GitHub contents API 比 raw 域名在国内更稳（raw 常被 DNS 污染/超时）。
   Accept: application/vnd.github.raw 直接返回文件原文。 */
const SOURCES = [
  'https://api.github.com/repos/laoma528/awesome-zhuiju-free/contents/resources/resources.json',
  'https://raw.githubusercontent.com/laoma528/awesome-zhuiju-free/main/resources/resources.json'
];
const ACCEPT = 'application/vnd.github.raw';
const UA = 'Mozilla/5.0 (compatible; JuiceZhuijuProxy/1.0)';

// 分类中文名（与数据源 category 对应）
const CATEGORY_LABELS = {
  online_video: '在线影视',
  video_app: '影视 App',
  cloud_search: '网盘搜索',
  magnet_search: '磁力 BT',
  subtitles: '字幕',
  tvbox_config: 'TVBox 接口',
  player: '播放器',
  subscription: '会员拼团',
  open_source: '开源项目'
};

let cache = null;          // { at, resources, updatedAt, etag, lastModified }
/* 30 分钟软过期：过期后先发条件请求（If-None-Match / If-Modified-Since），
   上游没变就拿到 304（几乎零成本），变了立刻更新。
   这样既不会每次请求都打 GitHub，又能在上游更新后半小时内跟上。 */
const CACHE_MS = 30 * 60 * 1000;

function normalize(r) {
  const v = r.verification || {};
  const s = r.scores || {};
  const risks = r.risks || {};
  return {
    id: r.id || '',
    name: r.name || '',
    url: r.url || '',
    category: r.category || '',
    categoryLabel: CATEGORY_LABELS[r.category] || r.category || '',
    summary: r.summary_short || r.summary || '',
    tags: Array.isArray(r.tags) ? r.tags.slice(0, 4) : [],
    // 摸鱼指数：速度 + 干净 + 易用 三项最影响摸鱼体验
    score: (function () {
      const a = Number(s.speed) || 0, b = Number(s.clean) || 0, c = Number(s.ease) || 0;
      const n = [a, b, c].filter(function (x) { return x > 0; });
      if (!n.length) return 0;
      return Math.round(n.reduce(function (x, y) { return x + y; }, 0) / n.length * 10) / 10;
    })(),
    more: Number(s.more) || 0,
    // 检测状态：ok / caution / broken / unknown
    status: v.status || 'unknown',
    checkedAt: v.last_checked || '',
    // 风险提示（只取对用户有意义的）
    riskCopyright: risks.copyright || 'unknown',
    riskSafety: risks.safety || 'unknown',
    featured: !!r.featured
  };
}

async function loadResources() {
  const now = Date.now();
  // 软过期内直接用内存缓存
  if (cache && now - cache.at < CACHE_MS) return cache.resources;

  let data = null, lastErr = '', notModified = false;
  for (const src of SOURCES) {
    try {
      const headers = { 'User-Agent': UA, Accept: ACCEPT };
      // 有缓存时带条件头，让 GitHub 直接回 304
      if (cache && cache.etag) headers['If-None-Match'] = cache.etag;
      if (cache && cache.lastModified) headers['If-Modified-Since'] = cache.lastModified;

      const resp = await fetch(src, {
        headers: headers,
        signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
      });

      if (resp.status === 304) { notModified = true; break; }
      if (!resp.ok) { lastErr = '上游 ' + resp.status; continue; }

      const text = await resp.text();
      data = JSON.parse(text);
      cache = {
        at: now,
        resources: (data.resources || []).map(normalize).filter(function (r) { return r.name && r.url; }),
        updatedAt: data.updated_at || '',
        etag: resp.headers.get('etag') || '',
        lastModified: resp.headers.get('last-modified') || ''
      };
      return cache.resources;
    } catch (e) {
      lastErr = e && e.message ? e.message : 'unknown';
    }
  }

  // 上游没变（304）：刷新时间戳，继续用旧数据
  if (notModified && cache) {
    cache.at = now;
    return cache.resources;
  }
  // 全部失败但有旧缓存：继续用旧的，别让页面空白
  if (cache) return cache.resources;
  throw new Error(lastErr || '所有数据源均不可用');
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const q = req.query || {};
  const cat = q.cat || '';

  try {
    const all = await loadResources();
    const list = cat ? all.filter(function (r) { return r.category === cat; }) : all;

    /* 排序：验证状态优先（可用 > 谨慎 > 失效）→ 精选 → 摸鱼指数 → 名称。
       之前只按精选+指数排，工具类站点和在线影视站指数都是 5，
       导致首屏被「谨慎」的影视站占满，16 个「可用」的反而沉底。 */
    const STATUS_RANK = { recommended: 0, caution: 1, unknown: 2, removed: 3 };
    list.sort(function (a, b) {
      const ra = STATUS_RANK[a.status] != null ? STATUS_RANK[a.status] : 2;
      const rb = STATUS_RANK[b.status] != null ? STATUS_RANK[b.status] : 2;
      if (ra !== rb) return ra - rb;
      if (a.featured !== b.featured) return a.featured ? -1 : 1;
      if (b.score !== a.score) return b.score - a.score;
      return a.name.localeCompare(b.name, 'zh');
    });

    res.setHeader('Cache-Control', 'public, max-age=1800, stale-while-revalidate=3600');
    res.status(200).json({
      ok: true,
      updatedAt: cache ? cache.updatedAt : '',
      categories: CATEGORY_LABELS,
      total: list.length,
      resources: list
    });
  } catch (err) {
    res.status(502).json({ ok: false, error: '资源数据获取失败：' + (err && err.message ? err.message : 'unknown') });
  }
};
