/* 电视直播模块外壳
   播放器本体在独立的 tv/ 子应用里（同源 iframe），这里只负责：
   - 首次进入时才加载 iframe（避免首屏拉 624KB hls.js）
   - 离开 #/tv 时通知子应用暂停，避免后台继续耗流量
   - 子应用 ready 后收起加载遮罩 */
(function () {
  'use strict';

  var inited = false;
  var frame = null;
  var loading = null;
  var ready = false;

  function hideLoading() {
    if (loading) loading.classList.add('tv-hidden');
  }

  function send(type) {
    if (!frame || !frame.contentWindow) return;
    try { frame.contentWindow.postMessage(type, '*'); } catch (e) { /* 忽略 */ }
  }

  function onMessage(ev) {
    if (ev.source !== frame.contentWindow) return;
    if (ev.data === 'tv:ready') {
      ready = true;
      hideLoading();
    }
  }

  function init() {
    if (inited) return;
    inited = true;
    var root = document.getElementById('mod-tv');
    if (!root) return;
    frame = root.querySelector('#tvFrame');
    loading = root.querySelector('#tvLoading');
    if (!frame) return;
    window.addEventListener('message', onMessage);
    frame.addEventListener('load', function () {
      // 子应用自己会发 tv:ready；这里兜底，避免消息丢失时遮罩一直在
      setTimeout(function () { if (!ready) hideLoading(); }, 1500);
    });
    frame.src = 'tv/index.html?embed=1';
  }

  function pause() {
    send('tv:pause');
  }

  function resume() {
    // 回到电视页不自动恢复播放，由用户点播放键决定
    send('tv:resume');
  }

  window.AppTv = {
    init: init,
    pause: pause,
    resume: resume
  };
})();
