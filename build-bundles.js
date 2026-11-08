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

/* 内置音源脚本：把 sources.json 转成 JS 全局变量，
   避免运行时额外发一次 300KB 的 JSON 请求。 */
(function generateBuiltinSources() {
  const fs = require('fs');
  const path = require('path');
  const jsonPath = path.join(__dirname, 'js/modules/lx-music/builtin/sources.json');
  const outPath = path.join(__dirname, 'js/modules/lx-music/builtin/sources.js');
  if (!fs.existsSync(jsonPath)) {
    fs.writeFileSync(outPath, 'window.LX_BUILTIN_SOURCES = [];' + String.fromCharCode(10), 'utf8');
    return;
  }
  const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));
  fs.writeFileSync(outPath, 'window.LX_BUILTIN_SOURCES = ' + JSON.stringify(data) + ';' + String.fromCharCode(10), 'utf8');
})();

const chunks = {
  manual: [
    'js/modules/manual-data.js',
    'js/modules/manual-report.js',
    'js/modules/manual-games.js',
    'js/modules/manual-tank-stages.js',
    'js/modules/manual-tank.js',
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
    'js/modules/lx-music/builtin/sources.js',
    'js/modules/lx-music/request.js',
    'js/modules/lx-music/utils.js',
    'js/modules/lx-music/aes.js',
    'js/modules/lx-music/source-kw.js',
    'js/modules/lx-music/source-kg.js',
    'js/modules/lx-music/source-tx.js',
    'js/modules/lx-music/source-mg.js',
    'js/modules/lx-music/source-wy.js',
    'js/modules/lx-music/sources.js',
    'js/modules/lx-music/tipSearch.js',
    'js/modules/lx-music/lyric.js',
    'js/modules/lx-music/cover.js',
    'js/modules/lx-music/discover.js',
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

/* ---- 版本号兜底：源码变了就自动递增 ----
   /js/**、/css/** 在 Vercel 上是 immutable 一年缓存，入口全靠 ?v= 区分。
   版本号过去纯手改：改了源码忘改 sw.js 的版本号时，构建照常成功，
   所有用户最长一年拿旧文件，且无任何告警。
   这里对所有进 bundle 的源码做指纹，指纹变了就把 sw.js 的版本号 +1，
   人工只需「改代码 → 构建」，不再需要记得改版本。 */
const crypto = require('crypto');

function sourceFingerprint() {
  const files = [];
  Object.keys(chunks).forEach(name => files.push(...chunks[name]));
  files.push(
    ...coreJsFiles,
    ...coreCssFiles,
    ...moduleCssFiles,
    'js/vendor/morphicons.js',
    'js/vendor/lucide-icons.js',
    'js/modules/lx-music/builtin/sources.json',
    // index.html 里的静态标记（子导航条、模块骨架）不经过 bundle，
    // 但同样受 ?v= 影响，必须计入指纹，否则改了 HTML 版本号不涨
    'index.html'
  );
  // 运行时按 URL 直接 fetch 的数据文件也必须计入指纹：sw.js 对 /assets/ 是
  // cache-first，词库这类不进 bundle 的文件改了而不涨版本号，用户永远拿旧数据。
  files.push(...listDataFiles());
  const h = crypto.createHash('sha256');
  files.filter(f => fs.existsSync(path.join(__dirname, f))).forEach(f => {
    h.update(f);
    // index.html 的 ?v= 是构建自己写进去的，直接参与哈希会自引用：
    // 每次构建都把版本号改掉 → 下次哈希又不同 → 版本号永远在涨。
    // 哈希前把版本号归一化掉，只反映真实内容变化。
    let buf = fs.readFileSync(path.join(__dirname, f));
    if (f === 'index.html') {
      buf = Buffer.from(String(buf).replace(/\?v=\d+/g, '?v='), 'utf8');
    }
    h.update(buf);
  });
  return h.digest('hex');
}

/* assets/ 下所有 json（词库、例句、词根、真题等），递归收集 */
function listDataFiles() {
  const out = [];
  const walk = (dir) => {
    if (!fs.existsSync(dir)) return;
    for (const name of fs.readdirSync(dir)) {
      const full = path.join(dir, name);
      if (fs.statSync(full).isDirectory()) walk(full);
      else if (name.endsWith('.json')) out.push(path.relative(__dirname, full).replace(/\\/g, '/'));
    }
  };
  walk(path.join(__dirname, 'assets'));
  return out;
}

function bumpVersion() {
  const swPath = path.join(__dirname, 'sw.js');
  const swSrc = fs.readFileSync(swPath, 'utf8');
  const m = swSrc.match(/CACHE_NAME\s*=\s*'juice-persona-v(\d+)'/);
  if (!m) return null;
  const next = String(Number(m[1]) + 1);
  fs.writeFileSync(swPath,
    swSrc.replace(/(CACHE_NAME\s*=\s*'juice-persona-v)(\d+)(')/, `$1${next}$3`), 'utf8');
  return next;
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

// 版本兜底：指纹与上次构建不同 → 自动递增 sw.js 的版本号
const buildStatePath = path.join(__dirname, '.build-state.json');
let buildState = {};
try { buildState = JSON.parse(fs.readFileSync(buildStatePath, 'utf8')); } catch (e) {}
const fp = sourceFingerprint();
if (buildState.fp && buildState.fp !== fp) {
  const nv = bumpVersion();
  if (nv) console.log(`检测到源码变更，版本号自动递增 -> v${nv}`);
}

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
    .replace(/core\.bundle\.css\?v=[\w.]+/g, `core.bundle.css?v=${version}`)
    .replace(/modules\.bundle\.css\?v=[\w.]+/g, `modules.bundle.css?v=${version}`)
    .replace(/app\.bundle\.js\?v=[\w.]+/g, `app.bundle.js?v=${version}`)
    // vendor 脚本也要带版本：/js/** 是 immutable 一年缓存，
    // 不带版本号的话 lucide-icons.js 改了也永远加载旧缓存
    .replace(/js\/vendor\/(morphicons|lucide-icons)\.js\?v=[\w.]+/g, `js/vendor/$1.js?v=${version}`)
    .replace(/js\/vendor\/(morphicons|lucide-icons)\.js(?!\?)/g, `js/vendor/$1.js?v=${version}`);
  if (nextHtml !== htmlSrc) fs.writeFileSync(htmlPath, nextHtml, 'utf8');

  console.log(`版本号已同步 -> v${version} (index.html ?v=, sw.js CACHE_NAME)`);
}

console.log(
  `Built css/core.bundle.css (${(Buffer.byteLength(coreCssOut) / 1024).toFixed(1)} KB), css/modules.bundle.css (${(Buffer.byteLength(moduleCssOut) / 1024).toFixed(1)} KB) and js/app.bundle.js (${(Buffer.byteLength(jsOut) / 1024).toFixed(1)} KB)`
);
console.log(`Built js/chunks: ${chunkSizes.join(' | ')}`);

// 构建成功才落指纹：半途失败的话下次还会重试递增
fs.writeFileSync(buildStatePath, JSON.stringify({ fp, version, at: new Date().toISOString() }, null, 2), 'utf8');
