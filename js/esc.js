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

  /* 静态 lucide 图标渲染：把容器里 data-lucide 的占位 SVG 填成完整图标。
     lucide 图标可能含 path/circle/rect/line/polygon 多种形状（如 Dices 首形状是 rect），
     逐一创建对应元素并带上公共 stroke 属性。 */
  var SVG_NS = 'http://www.w3.org/2000/svg';
  function paintLucideIcons(root) {
    if (!window.LUCIDE_ICONS || !root) return;
    root.querySelectorAll('svg[data-lucide]').forEach(function (svg) {
      var icon = window.LUCIDE_ICONS[svg.getAttribute('data-lucide')];
      if (!icon || !icon.length) return;
      while (svg.firstChild) svg.removeChild(svg.firstChild);
      icon.forEach(function (shape) {
        var el = document.createElementNS(SVG_NS, shape[0]);
        var attrs = shape[1] || {};
        for (var k in attrs) el.setAttribute(k, attrs[k]);
        el.setAttribute('fill', 'none');
        el.setAttribute('stroke', 'currentColor');
        el.setAttribute('stroke-width', svg.getAttribute('data-stroke-width') || '2');
        el.setAttribute('stroke-linecap', 'round');
        el.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(el);
      });
      svg.removeAttribute('data-lucide');
    });
  }

  window.escHtml = escHtml;
  window.escUrl = escUrl;
  window.paintLucideIcons = paintLucideIcons;
})();
