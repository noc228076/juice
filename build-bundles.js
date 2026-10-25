const fs = require('fs');
const path = require('path');
const esbuild = require('esbuild');

/* 压缩：源码保持可读可注释，产物统一 minify。
   JS 用 transform（保留语义）；CSS 走 esbuild 自带 css minifier。
   压缩失败直接抛错终止构建——绝不产出半截文件。 */
function minifyJs(code, label) {
  const out = esbuild.transformSync(code, { minify: true, charset: 'utf8' });
  if (!out.code) throw new Error('esbuild minify 失败: ' + label);
  return out.code;
}
function minifyCss(code, label) {
  const out = esbuild.transformSync(code, { loader: 'css', minify: true, charset: 'utf8' });
  if (!out.code) throw new Error('esbuild css minify 失败: ' + label);
  return out.code;
}

// 首屏核心 CSS：饮品封面、答题、结果页、全局顶栏与档案抽屉。
// 其余模块样式按需加载，避免首页为 12 个未进入的模块付出传输成本。
const coreCssFiles = [
  'css/base.css',
  'css/modules/nav.css',
  'css/modules/history.css'
];

// 顺序保持原 app.bundle.css 中的模块顺序。
const moduleCssFiles = [
  'css/modules/milktea.css',
  'css/modules/fengshui.css',
  'css/modules/tarot.css',
  'css/modules/manual.css',
  'css/modules/decision.css',
  'css/modules/lingqian.css',
  'css/modules/clock.css',
  'css/modules/merit.css',
  'css/modules/bazi.css',
  'css/modules/daily.css',
  'css/modules/scratch.css',
  'css/modules/wall.css',
  'css/modules/films.css',
  'css/modules/vocab.css',
  'css/modules/music.css'
];

// 首屏核心：饮品封面、身份、榜单、历史、Daily 全局壁纸入口与路由本身。
// 其余模块拆成按需 chunk，由 router 在首次进入时加载。
const coreJsFiles = [
  'js/esc.js',
  'js/core-drink.js',
  'js/sfx.js',
  'js/modules/daily.js',
  'js/modules/profile.js',
  'js/modules/leaderboard.js',
  'js/modules/lb-panel.js',
  'js/modules/history.js',
  'js/modules/router.js'
];

// 顺序即依赖顺序：manual-data -> icon/report -> games -> controller
const chunks = {
  manual: [
    'js/modules/manual-data.js',
    'js/modules/manual-report.js',
    'js/modules/manual-games.js',
    'js/modules/manual.js'
  ],
  mystic: [
    'js/modules/tarot.js',
    'js/modules/lingqian.js',
    'js/modules/fengshui.js'
  ],
  bazi: [
    'js/libs/lunar.js',
    'js/modules/bazi-cities.js',
    'js/modules/bazi.js'
  ],
  lunar: ['js/libs/lunar.js'],
  relax: [
    'js/modules/clock.js',
    'js/modules/merit.js'
  ],
  decision: ['js/modules/decision.js'],
  scratch: ['js/modules/scratch.js'],
  films: ['js/modules/films.js'],
  wall: ['js/modules/wall.js'],
  milktea: ['js/modules/milktea.js'],
  vocab: ['js/modules/vocab-data.js', 'js/modules/vocab.js'],
  // 洛雪音源内核 + 音乐台：搜索走多平台接口，播放地址由自定义音源脚本提供
  music: [
    'js/modules/lx-music/request.js',
    'js/modules/lx-music/utils.js',
    'js/modules/lx-music/aes.js',
    'js/modules/lx-music/source-kw.js',
    'js/modules/lx-music/source-kg.js',
    'js/modules/lx-music/source-tx.js',
    'js/modules/lx-music/source-mg.js',
    'js/modules/lx-music/sources.js',
    'js/modules/lx-music/sandbox.js',
    'js/modules/lx-music/bridge.js',
    'js/modules/music.js'
  ]
};

function readVersion() {
  const swPath = path.join(__dirname, 'sw.js');
  const swSrc = fs.readFileSync(swPath, 'utf8');
  const verMatch = swSrc.match(/CACHE_NAME\s*=\s*'juice-persona-v(\d+)'/);
  return verMatch ? verMatch[1] : null;
}

function concatJs(files) {
  return files
    .map(f => `/* === ${f} === */\n` + fs.readFileSync(path.join(__dirname, f), 'utf8'))
    .join('\n;\n');
}

function concatCss(files) {
  return files
    .map(f => `/* === ${f} === */\n` + fs.readFileSync(path.join(__dirname, f), 'utf8'))
    .join('\n\n');
}

const coreCssOut = minifyCss(concatCss(coreCssFiles), 'core css');
const moduleCssOut = minifyCss(concatCss(moduleCssFiles), 'modules css');
fs.writeFileSync(path.join(__dirname, 'css/core.bundle.css'), coreCssOut, 'utf8');
fs.writeFileSync(path.join(__dirname, 'css/modules.bundle.css'), moduleCssOut, 'utf8');
// legacy css/app.bundle.css（v96 时代兼容产物）已删除：距其退役已 160+ 个版本，
// 仍持有旧 index.html 的客户端早已被 must-revalidate 拉到新版。

const version = readVersion();
if (!version) {
  console.warn("WARN: 未能在 sw.js 中匹配到 CACHE_NAME = 'juice-persona-v<数字>'，跳过版本号同步。");
}

// 主包顶部注入版本号，供 router 给异步 chunk 拼 ?v=。
// Vercel 对 /js/** 设置了 immutable，chunk 不带版本会命中旧缓存。
const versionBanner = version
  ? `window.__APP_VERSION__ = '${version}';\n`
  : '';
const jsOut = minifyJs(versionBanner + concatJs(coreJsFiles), 'app.bundle.js');
fs.writeFileSync(path.join(__dirname, 'js/app.bundle.js'), jsOut, 'utf8');

const chunkDir = path.join(__dirname, 'js/chunks');
fs.mkdirSync(chunkDir, { recursive: true });
const chunkSizes = [];
Object.keys(chunks).forEach((name) => {
  const out = minifyJs(concatJs(chunks[name]), 'chunk ' + name);
  fs.writeFileSync(path.join(chunkDir, `${name}.js`), out, 'utf8');
  chunkSizes.push(`${name} ${(Buffer.byteLength(out) / 1024).toFixed(1)} KB`);
});

// 自动同步版本号：避免 index.html 的 ?v= 与 sw.js 的 CACHE_NAME 靠人工同时递增而漏改。
// 从 sw.js 读取当前版本号并原样写回，保持三者一致。
if (version) {
  const htmlPath = path.join(__dirname, 'index.html');
  const htmlSrc = fs.readFileSync(htmlPath, 'utf8');
  const nextHtml = htmlSrc
    .replace(/core\.bundle\.css\?v=\d+/g, `core.bundle.css?v=${version}`)
    .replace(/modules\.bundle\.css\?v=\d+/g, `modules.bundle.css?v=${version}`)
    .replace(/app\.bundle\.js\?v=\d+/g, `app.bundle.js?v=${version}`);
  if (nextHtml !== htmlSrc) fs.writeFileSync(htmlPath, nextHtml, 'utf8');

  console.log(`版本号已同步 -> v${version} (index.html ?v=, sw.js CACHE_NAME)`);
}

console.log(
  `Built css/core.bundle.css (${(Buffer.byteLength(coreCssOut) / 1024).toFixed(1)} KB), css/modules.bundle.css (${(Buffer.byteLength(moduleCssOut) / 1024).toFixed(1)} KB) and js/app.bundle.js (${(Buffer.byteLength(jsOut) / 1024).toFixed(1)} KB)`
);
console.log(`Built js/chunks: ${chunkSizes.join(' | ')}`);
