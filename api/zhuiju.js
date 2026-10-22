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

let cache = null;          // { at, resources }
const CACHE_MS = 6 * 3600 * 1000;

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
  if (cache && now - cache.at < CACHE_MS) return cache.resources;

  let data = null, lastErr = '';
  for (const src of SOURCES) {
    try {
      const resp = await fetch(src, {
        headers: { 'User-Agent': UA, Accept: ACCEPT },
        signal: AbortSignal.timeout ? AbortSignal.timeout(12000) : undefined
      });
      if (!resp.ok) { lastErr = '上游 ' + resp.status; continue; }
      const text = await resp.text();
      data = JSON.parse(text);
      break;
    } catch (e) {
      lastErr = e && e.message ? e.message : 'unknown';
    }
  }
  if (!data) throw new Error(lastErr || '所有数据源均不可用');
  const list = (data.resources || []).map(normalize).filter(function (r) { return r.name && r.url; });

  cache = { at: now, resources: list, updatedAt: data.updated_at || '' };
  return list;
}

module.exports = async function handler(req, res) {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const q = req.query || {};
  const cat = q.cat || '';

  try {
    const all = await loadResources();
    const list = cat ? all.filter(function (r) { return r.category === cat; }) : all;

    // 排序：精选优先 → 摸鱼指数降序 → 名称
    list.sort(function (a, b) {
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
