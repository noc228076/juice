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

console.log(
  `Built css/app.bundle.css (${(Buffer.byteLength(cssOut) / 1024).toFixed(1)} KB) and js/app.bundle.js (${(Buffer.byteLength(jsOut) / 1024).toFixed(1)} KB)`
);
