/* =========================================================
   必应壁纸图代理 v2 —— 带内存缓存 + 并发去重 + 快速回退
   v1 教训：8 张图并发打 serverless 冷启动 + 每次全量拉 400KB 原图，
   网页半天加载不出来。v2 改进：
     1. 进程内 LRU 缓存（每图一份字节，命中零上游请求）
     2. 同 URL 并发请求合并为一次上游拉取
     3. 缩略图(1920x1080)与 UHD 分开；上游 8s 超时快速失败
     4. 失败时 302 回原 bing 直链，前端双域名兜底接手
   ========================================================= */

const ALLOWED = /^https:\/\/(www|cn)\.bing\.com\/th\?id=OHR\.[A-Za-z0-9_-]+\.(jpg|jpeg)$/;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36';

const CACHE_MAX = 12;          // 12 张 × ~300KB ≈ 3.6MB，单实例内存可承受
const cache = new Map();       // url -> {buf}
const inflight = new Map();    // url -> Promise<buf>

function cacheGet(url) {
  if (!cache.has(url)) return null;
  const buf = cache.get(url);
  cache.delete(url); cache.set(url, buf);   // LRU touch
  return buf;
}
function cachePut(url, buf) {
  if (cache.has(url)) cache.delete(url);
  cache.set(url, buf);
  if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value);
}

function fetchWithTimeout(url, ms) {
  return Promise.race([
    fetch(url, { headers: { Referer: 'https://www.bing.com/', 'User-Agent': UA, Accept: 'image/*' }, redirect: 'follow' }),
    new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))
  ]);
}

function pullOnce(target) {
  const key = target.href;
  if (inflight.has(key)) return inflight.get(key);
  const alt = key.replace('www.bing.com', 'cn.bing.com');
  const candidates = target.hostname === 'www.bing.com' ? [key, alt] : [alt, key];
  const p = (async () => {
    for (const u of candidates) {
      try {
        const r = await fetchWithTimeout(u, 8000);
        if (r.ok && (r.headers.get('content-type') || '').startsWith('image/')) {
          const buf = Buffer.from(await r.arrayBuffer());
          cachePut(key, buf);
          return buf;
        }
      } catch (e) { /* 下一个域 */ }
    }
    throw new Error('上游不可达');
  })();
  inflight.set(key, p);
  p.finally(() => inflight.delete(key));
  return p;
}

module.exports = async function handler(req, res) {
  const raw = (req.query && (req.query.u || req.query.url)) || '';
  let target;
  try { target = new URL(raw); } catch (e) {
    res.status(400).json({ ok: false, error: '参数不合法' });
    return;
  }
  if (target.protocol !== 'https:' || !ALLOWED.test(target.href)) {
    res.status(403).json({ ok: false, error: '只代理必应壁纸图床' });
    return;
  }

  const cached = cacheGet(target.href);
  if (cached) {
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
    res.setHeader('X-Cache', 'hit');
    res.status(200).end(cached);
    return;
  }

  try {
    const buf = await pullOnce(target);
    res.setHeader('Content-Type', 'image/jpeg');
    res.setHeader('Cache-Control', 'public, max-age=604800, stale-while-revalidate=2592000');
    res.setHeader('X-Cache', 'miss');
    res.status(200).end(buf);
  } catch (e) {
    /* 上游失败：302 回原直链，让浏览器走 bing 兜底（总比空白好） */
    res.setHeader('Cache-Control', 'no-store');
    res.redirect(302, target.href);
  }
};
