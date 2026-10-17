const fs = require('fs');
const path = require('path');

const cssFiles = [
  'css/base.css',
  'css/modules/nav.css',
  'css/modules/milktea.css',
  'css/modules/fengshui.css',
  'css/modules/tarot.css',
  'css/modules/manual.css',
  'css/modules/history.css',
  'css/modules/decision.css',
  'css/modules/lingqian.css',
  'css/modules/clock.css',
  'css/modules/merit.css',
  'css/modules/lifeguide.css',
  'css/modules/bazi.css',
  'css/modules/daily.css',
  'css/modules/scratch.css'
];

const jsFiles = [
  'js/core-drink.js',
  'js/sfx.js',
  'js/libs/lunar.js',
  'js/modules/milktea.js',
  'js/modules/fengshui.js',
  'js/modules/tarot.js',
  'js/modules/manual-data.js',
  'js/modules/manual-games.js',
  'js/modules/manual-report.js',
  'js/modules/manual.js',
  'js/modules/decision.js',
  'js/modules/lingqian.js',
  'js/modules/clock.js',
  'js/modules/merit.js',
  'js/modules/lifeguide.js',
  'js/modules/bazi-cities.js',
  'js/modules/bazi.js',
  'js/modules/daily.js',
  'js/modules/scratch.js',
  'js/modules/profile.js',
  'js/modules/leaderboard.js',
  'js/modules/lb-panel.js',
  'js/modules/history.js',
  'js/modules/router.js'
];

const cssOut = cssFiles
  .map(f => `/* === ${f} === */\n` + fs.readFileSync(path.join(__dirname, f), 'utf8'))
  .join('\n\n');
fs.writeFileSync(path.join(__dirname, 'css/app.bundle.css'), cssOut, 'utf8');

const jsOut = jsFiles
  .map(f => `/* === ${f} === */\n` + fs.readFileSync(path.join(__dirname, f), 'utf8'))
  .join('\n;\n');
fs.writeFileSync(path.join(__dirname, 'js/app.bundle.js'), jsOut, 'utf8');

// 自动同步版本号：避免 index.html 的 ?v= 与 sw.js 的 CACHE_NAME 靠人工同时递增而漏改。
// 从 sw.js 读取当前版本号并原样写回两个文件，保持三者一致。
const swPath = path.join(__dirname, 'sw.js');
const swSrc = fs.readFileSync(swPath, 'utf8');
const verMatch = swSrc.match(/CACHE_NAME\s*=\s*'juice-persona-v(\d+)'/);
if (!verMatch) {
  console.warn("WARN: 未能在 sw.js 中匹配到 CACHE_NAME = 'juice-persona-v<数字>'，跳过版本号同步。");
} else {
  const version = verMatch[1];

  const htmlPath = path.join(__dirname, 'index.html');
  const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
  const nextHtml = htmlSrc
    .replace(/app\.bundle\.css\?v=\d+/, `app.bundle.css?v=${version}`)
    .replace(/app\.bundle\.js\?v=\d+/, `app.bundle.js?v=${version}`);
  if (nextHtml !== htmlSrc) fs.writeFileSync(htmlPath, nextHtml, 'utf8');

  console.log(`版本号已同步 -> v${version} (index.html ?v=, sw.js CACHE_NAME)`);
}

console.log(
  `Built css/app.bundle.css (${(Buffer.byteLength(cssOut) / 1024).toFixed(1)} KB) and js/app.bundle.js (${(Buffer.byteLength(jsOut) / 1024).toFixed(1)} KB)`
);
