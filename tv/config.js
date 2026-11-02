/* 电视直播代理地址
   本地开发自动指向 tv-worker/dev-server.mjs（127.0.0.1:8787）；
   线上需要先部署 tv-worker，把下面的 REPLACE_WITH_WORKER_URL 换成实际地址。
   也可以在浏览器控制台执行：
     localStorage.setItem('tvApiBase', 'https://xxx.workers.dev')
   临时覆盖，不改代码。 */
window.TV_CONFIG = (function () {
  var host = location.hostname;
  var isLocal = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
  var override = '';
  try { override = localStorage.getItem('tvApiBase') || ''; } catch (e) { /* 隐私模式 */ }
  var prod = 'https://juice-tv-proxy.2280762725.workers.dev';
  var base = override || (isLocal ? 'http://127.0.0.1:8787' : prod);
  return {
    apiBase: String(base).replace(/\/+$/, ''),
    isLocal: isLocal,
    configured: !/^https:\/\/REPLACE_WITH_WORKER_URL$/.test(String(base))
  };
})();
