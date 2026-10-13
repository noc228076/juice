/* 饮料人格研究所 & 八合一赛博实验矩阵 — 离线瞬开 Service Worker v25 */
const CACHE_NAME = 'juice-persona-v35';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './favicon.png',
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
      // 逐条预缓存：单个文件失败不再让整个 install 失败（否则新 SW 永远激活不了）
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

  // HTML 页面或根路径：网络优先，确保上线后第一时间获取最新版本，离线时回退缓存
  const isHtml = e.request.mode === 'navigate' || url.pathname.endsWith('.html') || url.pathname.endsWith('/');
  if (isHtml) {
    e.respondWith(
      fetch(e.request)
        .then((res) => {
          if (res && res.status === 200) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone)).catch(() => {});
          }
          return res;
        })
        .catch(() => caches.match(e.request).then((cached) => cached || caches.match('./index.html')))
    );
    return;
  }

  // 其他静态静态资源：缓存优先
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

