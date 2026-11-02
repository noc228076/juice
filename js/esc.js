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
    // 浏览器解析 URL 前会剥除 scheme 里的制表符/换行（java\tscript: 仍按 javascript: 执行）
    const s = escHtml(v);
    if (/^\s*(javascript|vbscript|data):/i.test(String(v == null ? '' : v).replace(/[\t\r\n]/g, ''))) return '#';
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

/* ---------- 统一 Canvas 导出（审计 C-P0-1） ----------
   裸 a.download + a.click() 在微信/内嵌 WebView 会把当前页跳成裸图，
   应用状态直接丢。优先级：
     1. AndroidBridge.saveImage（安卓壳）
     2. Web Share Level 2（iOS Safari / 现代安卓，拉起系统保存面板）
     3. a.download（PC / 支持下载属性的环境）
   返回 Promise<boolean>；false = 当前环境无法自动保存，
   调用方应展示「长按图片保存」一类的兜底 UI。 */
window.juiceExportCanvas = function (cvOrUrl, filename, title) {
  title = title || filename;
  /* 允许传 canvas 或 dataURL 字符串（manual 的 buildShareCard 两种都可能返回） */
  var cv = cvOrUrl;
  var dataUrl = null;
  if (typeof cvOrUrl === 'string') { dataUrl = cvOrUrl; cv = null; }
  function downloadFallback() {
    try {
      var a = document.createElement('a');
      a.href = dataUrl || cv.toDataURL('image/png');
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      return true;
    } catch (e) { return false; }
  }
  function shareFile(blob) {
    try {
      var file = new File([blob], filename, { type: blob.type || 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        return navigator.share({ files: [file], title: title })
          .then(function () { return true; })
          .catch(function () { return downloadFallback(); });
      }
    } catch (e) { /* 不支持文件分享 */ }
    return null;
  }
  /* dataURL 入口也要先试安卓壳（复查 P2-1：此前 shareFile 未定义 + 漏 AndroidBridge） */
  if (dataUrl) {
    try {
      if (window.AndroidBridge && typeof window.AndroidBridge.saveImage === 'function') {
        window.AndroidBridge.saveImage(dataUrl);
        return Promise.resolve(true);
      }
    } catch (e) { /* 非 App 壳环境 */ }
    try {
      var bin = atob(dataUrl.split(',')[1] || '');
      var buf = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
      var type = (dataUrl.match(/^data:([^;]+)/) || [])[1] || 'image/png';
      var r0 = shareFile(new Blob([buf], { type: type }));
      if (r0) return r0;
    } catch (e) { /* 转换失败走下载 */ }
    return Promise.resolve(downloadFallback());
  }
  try {
    if (window.AndroidBridge && typeof window.AndroidBridge.saveImage === 'function') {
      window.AndroidBridge.saveImage(cv.toDataURL('image/png'));
      return Promise.resolve(true);
    }
  } catch (e) { /* 非 App 壳环境 */ }
  if (cv.toBlob && navigator.share) {
    return new Promise(function (resolve) {
      try {
        cv.toBlob(function (blob) {
          if (!blob) { resolve(downloadFallback()); return; }
          var r = shareFile(blob);
          if (r) { resolve(r); return; }
          resolve(downloadFallback());
        }, 'image/png');
      } catch (e) { resolve(downloadFallback()); }
    });
  }
  return Promise.resolve(downloadFallback());
};


/* ---------- 全局轻提示（无各自 toast 的模块共用） ---------- */
window.juiceNotice = function (msg) {
  try {
    var el = document.createElement('div');
    el.textContent = msg;
    el.style.cssText = 'position:fixed;left:50%;bottom:calc(76px + env(safe-area-inset-bottom,0px));' +
      'transform:translateX(-50%);z-index:12000;background:rgba(10,12,18,.88);color:#e7ecf5;' +
      'padding:10px 18px;border-radius:999px;font-size:13px;max-width:82vw;text-align:center;' +
      'box-shadow:0 10px 30px rgba(0,0,0,.4);transition:opacity .3s ease;pointer-events:none;';
    document.body.appendChild(el);
    setTimeout(function () { el.style.opacity = '0'; }, 2200);
    setTimeout(function () { el.remove(); }, 2600);
  } catch (e) { /* 忽略 */ }
};
