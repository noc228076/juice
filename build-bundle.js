const fs = require('fs');
const path = require('path');

const root = __dirname;
let html = fs.readFileSync(path.join(root, 'index.html'), 'utf8');

// 1. 读取所有 CSS 文件
const cssFiles = [
  'css/modules/nav.css',
  'css/modules/milktea.css',
  'css/modules/fengshui.css',
  'css/modules/tarot.css',
  'css/modules/manual.css',
  'css/modules/history.css'
];

let mergedCss = '\n/* ====== 核心模块隔离与防串屏兜底 ====== */\n.app-module { display: none !important; width: 100%; height: 100%; }\n.app-module.active { display: block !important; }\n';
for (const file of cssFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  mergedCss += `\n/* ====== ${file} ====== */\n${content}\n`;
}

// 移除头部 link 标签
for (const file of cssFiles) {
  const linkRegex = new RegExp(`<link\\s+rel=["']stylesheet["']\\s+href=["']${file}["'][^>]*>\\s*`, 'g');
  html = html.replace(linkRegex, '');
}

// 将合并的 CSS 插入到已有的 <style> 标签最前部
html = html.replace('<style>', '<style>' + mergedCss);

// 2. 读取所有 JS 文件
const jsFiles = [
  'js/sfx.js',
  'js/modules/manual-data.js',
  'js/modules/manual-games.js',
  'js/modules/manual-report.js',
  'js/modules/manual.js',
  'js/modules/milktea.js',
  'js/modules/fengshui.js',
  'js/modules/tarot.js',
  'js/modules/history.js',
  'js/modules/router.js'
];

let mergedJs = '';
for (const file of jsFiles) {
  const content = fs.readFileSync(path.join(root, file), 'utf8');
  mergedJs += `\n/* ====== ${file} ====== */\n${content}\n`;
}

// 移除底部的 script src 标签
for (const file of jsFiles) {
  const scriptRegex = new RegExp(`<script\\s+src=["']${file}["'][^>]*><\\/script>\\s*`, 'g');
  html = html.replace(scriptRegex, '');
}

// 将合并的 JS 作为 <script> 插入到 </body> 前
html = html.replace('</body>', `<script>\n${mergedJs}\n</script>\n</body>`);

fs.writeFileSync(path.join(root, 'index.html'), html, 'utf8');
console.log('Successfully bundled modules into index.html, size:', (html.length / 1024).toFixed(1), 'KB');
