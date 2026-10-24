/* =========================================================
   全站统一 HTML 转义（window.escHtml）
   此前 esc()/escapeHtml() 在 lb-panel / films / daily / tarot /
   vocab / core-drink 各写了一份，行为略有出入，还出过漏转义的缝。
   打进 app.bundle.js（核心包），各模块的本地 esc 一律委托到这里。
   ========================================================= */
(function () {
  'use strict';

  function escHtml(v) {
    return String(v == null ? '' : v)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /* URL 属性专用：先做 HTML 转义防打断属性，再兜底只放行 http(s)/相对路径，
     拒绝 javascript: / data: 等协议（网络数据进 href/src 时的标准姿势） */
  function escUrl(v) {
    const s = escHtml(v);
    if (/^\s*(javascript|vbscript|data):/i.test(String(v == null ? '' : v))) return '#';
    return s;
  }

  window.escHtml = escHtml;
  window.escUrl = escUrl;
})();
