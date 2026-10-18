/* 饮料人格研究所 & 七合一趣味实验矩阵 — 轻量无感 Service Worker v102 */
const CACHE_NAME = 'juice-persona-v102';

self.addEventListener('install', () => {
  // 零并发预拉取：严禁在 install 阶段并发请求数十个资源，避免触发 Vercel 边缘防火墙 705 拦截
  self.skipWaiting();
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

  // 严禁拦截 Vercel 安全验证端点或页面主文档导航，确保浏览器原生通过切面校验
  if (
    e.request.mode === 'navigate' ||
    url.pathname.startsWith('/.well-known/') ||
    url.pathname.startsWith('/_vercel/')
  ) {
    return;
  }

  // 静态图片与图标资源（按需懒缓存，不主动并发刷请求）
  if (url.pathname.startsWith('/assets/') || url.pathname.endsWith('.png') || url.pathname.endsWith('.jpg')) {
    e.respondWith(
      caches.match(e.request).then((cached) => {
        if (cached) return cached;
        return fetch(e.request).then((res) => {
          if (res && res.status === 200 && !res.headers.get('x-vercel-mitigated')) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(e.request, clone)).catch(() => {});
          }
          return res;
        });
      })
    );
  }
});
