/* 饮料人格研究所 & 八合一趣味实验矩阵 — 离线瞬开 Service Worker v39 */
const CACHE_NAME = 'juice-persona-v39';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './css/base.css',
  './css/modules/nav.css',
  './css/modules/milktea.css',
  './css/modules/fengshui.css',
  './css/modules/tarot.css',
  './css/modules/manual.css',
  './css/modules/history.css',
  './css/modules/decision.css',
  './css/modules/lingqian.css',
  './css/modules/clock.css',
  './css/modules/merit.css',
  './css/modules/lifeguide.css',
  './css/modules/bazi.css',
  './js/core-drink.js',
  './js/sfx.js',
  './js/libs/lunar.js',
  './js/modules/milktea.js',
  './js/modules/fengshui.js',
  './js/modules/tarot.js',
  './js/modules/manual-data.js',
  './js/modules/manual-games.js',
  './js/modules/manual-report.js',
  './js/modules/manual.js',
  './js/modules/decision.js',
  './js/modules/lingqian.js',
  './js/modules/clock.js',
  './js/modules/merit.js',
  './js/modules/lifeguide.js',
  './js/modules/bazi-cities.js',
  './js/modules/bazi.js',
  './js/modules/history.js',
  './js/modules/router.js',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable.png',
  './assets/tarot/card_0.jpg',
  './assets/tarot/card_1.jpg',
  './assets/tarot/card_2.jpg',
  './assets/tarot/card_3.jpg',
  './assets/tarot/card_4.jpg',
  './assets/tarot/card_5.jpg',
  './assets/tarot/card_6.jpg',
  './assets/tarot/card_7.jpg',
  './assets/tarot/card_8.jpg',
  './assets/tarot/card_9.jpg',
  './assets/tarot/card_10.jpg',
  './assets/tarot/card_11.jpg',
  './assets/tarot/card_12.jpg',
  './assets/tarot/card_13.jpg',
  './assets/tarot/card_14.jpg',
  './assets/tarot/card_15.jpg',
  './assets/tarot/card_16.jpg',
  './assets/tarot/card_17.jpg',
  './assets/tarot/card_18.jpg',
  './assets/tarot/card_19.jpg',
  './assets/tarot/card_20.jpg',
  './assets/tarot/card_21.jpg'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      // 逐条预缓存：单个文件失败不再让整个 install 失败
      .then((cache) => Promise.all(
        ASSETS.map((url) => cache.add(url).catch(() => {}))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.map((k) => (k !== CACHE_NAME ? caches.delete(k) : null))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // HTML / CSS / JS 核心代码：网络优先，确保上线后手机端刷新第一时间获取最新样式与逻辑，离线时回退缓存
  const isCodeOrHtml =
    e.request.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js');
  if (isCodeOrHtml) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || (e.request.mode === 'navigate' ? caches.match('./index.html') : undefined)))
    );
    return;
  }

  // 其他静态资源（CSS/JS/图片）：缓存秒开 + 后台静默更新 (Stale-While-Revalidate)
  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone)).catch(() => {});
        }
        return res;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
