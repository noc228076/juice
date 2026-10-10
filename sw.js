/* 饮料人格研究所 & 五合一心理矩阵 — 离线瞬开 Service Worker v8 */
const CACHE_NAME = 'juice-persona-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
  './assets/icons/icon-192.png',
  './assets/icons/icon-512.png',
  './assets/icons/icon-maskable.png',
  './js/sfx.js',
  './css/modules/nav.css',
  './css/modules/milktea.css',
  './css/modules/fengshui.css',
  './css/modules/tarot.css',
  './css/modules/manual.css',
  './css/modules/history.css',
  './js/modules/router.js',
  './js/modules/history.js',
  './js/modules/milktea.js',
  './js/modules/fengshui.js',
  './js/modules/tarot.js',
  './js/modules/manual-data.js',
  './js/modules/manual-games.js',
  './js/modules/manual-report.js',
  './js/modules/manual.js'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
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

  e.respondWith(
    caches.match(e.request).then((cached) => {
      const networkFetch = fetch(e.request).then((res) => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone));
        }
        return res;
      }).catch(() => cached);

      return cached || networkFetch;
    })
  );
});
