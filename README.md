# 饮料人格研究所 · 八合一趣味实验矩阵 🍹

> 纯静态、零运行时依赖的网页趣味测试矩阵。包含饮品人格测评、奶茶配方、自我说明书、东西方玄学、摸鱼解压、纠结拯救、人间清醒、今日风向与幸运刮刮乐共 8 大模块 / 13 个功能屏，支持 PWA 安装与离线图片缓存。

从 Android Hybrid 原生 APK 中提取的纯前端项目，保留原有题库与算法的同时剥离全部原生依赖，可直接在 PC / 手机 / 平板浏览器中运行。

| 项 | 内容 |
|---|---|
| 线上地址 | https://juice.noooc.dpdns.org/ |
| 代码仓库 | https://github.com/noc228076/juice （默认分支 `main`） |
| 部署方式 | Vercel 静态托管，连接 GitHub `main` 分支自动部署 |
| 技术形态 | 原生 HTML + CSS + JavaScript，无框架、无构建依赖链 |
| 运行环境 | 任意现代浏览器（Chrome / Edge / Safari），Node ≥ 16 仅用于本地静态服务器 |

---

## 🚀 本地运行

```bash
npm start
```

打开 http://localhost:3456/ 即可。启动日志里会直接打印带模块 hash 的地址（如 `http://localhost:3456/#/daily`）。

> `server.js` 是一个零依赖的静态文件服务器，端口硬编码为 **3456**（定义在 `server.js` 末尾的 `PORT` 常量）。
> 也可以用任意其他静态服务器，例如 `python -m http.server 3456`。
> 直接双击 `index.html` 也能打开，但部分浏览器会因 `file://` 协议限制 Service Worker 与部分模块行为，**建议始终走 HTTP**。

---

## 🔨 构建流程（重要）

本项目采用「源码分散 + 产物合并」的轻量方案：

```
js/modules/*.js  ──┐
js/libs/lunar.js ──┤
                   ├─► node build-bundles.js ──► js/app.bundle.js  ──┐
css/modules/*.css ─┤                        └─► css/app.bundle.css ──┤
css/base.css ──────┘                                                  │
                                                                      ▼
                                             index.html (骨架 + ?v=<VERSION> 外链)
```

### ⚠️ 头号坑：改完源码必须重新打包

`index.html` **不直接引用** `js/modules/*.js`，它只引用打包产物：

```html
<link rel="stylesheet" href="css/app.bundle.css?v=58">
<script defer src="js/app.bundle.js?v=58"></script>
```

所以修改任何 `js/` 或 `css/` 下的文件后：

```bash
npm run build          # 等价于 node build-bundles.js
```

然后还要做两件事，否则线上用户看到的仍是旧版本：

1. **手动把 `index.html` 里的两个 `?v=58` 改成新版本号**（当前为 `58`），用于绕过浏览器/CDN 缓存；
2. **手动把 `sw.js` 里的 `CACHE_NAME = 'juice-persona-v58'` 同步 +1**，用于让 Service Worker 激活并清理旧图片缓存。

这两处版本号目前靠人工同步，容易漏。发布前请逐一确认。

> 构建脚本日志里的 KB 数用 `Buffer.byteLength` 统计，是真实字节数，可信。

---

## 📁 目录结构

```text
juice/
├── index.html              # 页面骨架：顶栏 + 13 个 <section class="app-module">，不含业务逻辑
├── sw.js                   # 轻量 Service Worker，仅对图片做懒缓存
├── manifest.json           # PWA 清单（standalone、竖屏、深色主题色 #0B0C10）
├── vercel.json             # 静态构建声明 + 缓存策略
├── server.js               # 零依赖本地静态服务器（PORT = 3456）
├── build-bundles.js        # 打包脚本：合并 CSS/JS → app.bundle.*
├── favicon.png             # 站点图标
│
├── js/
│   ├── app.bundle.js       # 【构建产物】2.0 MB，勿手改
│   ├── core-drink.js       # 饮品人格核心（MBTI / SBTI 计分、Canvas 分享长图）
│   ├── sfx.js              # WebAudio 合成音效引擎（零音频文件依赖）
│   ├── libs/
│   │   └── lunar.js        # 内置农历/干支库（替代原 npm 依赖，保证零构建）
│   ├── modules/            # 各功能模块，一个模块一个文件
│       ├── router.js               # ★ 全局路由 + 顶栏调度（最后加载）
│       ├── history.js              # 全局测评档案中心
│       ├── milktea.js              # 奶茶人格配方
│       ├── fengshui.js             # 工位风水大师
│       ├── tarot.js                # 西方塔罗（含海报导出）
│       ├── lingqian.js             # 东方灵签
│       ├── bazi.js / bazi-cities.js # 生辰八字
│       ├── manual.js               # 自我说明书主控
│       ├── manual-data.js          #   └ 7 份测试的题库与结果
│       ├── manual-games.js         #   └ 反应擂台 / 色彩敏锐度 / 2048
│       ├── manual-report.js        #   └ 报告渲染
│       ├── decision.js             # 纠结终结所
│       ├── clock.js                # Fliqlo 翻页时钟 & 工资摸鱼
│       ├── merit.js                # 功德木鱼 & 碎纸解压
│       ├── lifeguide.js            # 人间清醒
│       ├── daily.js                # 今日风向
│       └── scratch.js              # 幸运刮刮乐
│
│   ⚠️ 以下三个文件为早期遗留死代码，index.html 与 build-bundles.js 均未引用，
│      不参与打包、不影响线上，可安全删除（确认无回滚需求后）：
│      js/app.js · js/data.js · js/drinks-art.js · css/style.css
│
├── css/
│   ├── app.bundle.css      # 【构建产物】355 KB，勿手改
│   ├── base.css            # 全局基础样式、主题变量、双主题（dark/light）
│   └── modules/            # 与 js/modules 一一对应的模块样式
│       ├── nav.css / milktea.css / fengshui.css / tarot.css /
│       ├── manual.css / history.css / decision.css / lingqian.css /
│       └── clock.css / merit.css / lifeguide.css / bazi.css /
│           daily.css / scratch.css
│
├── assets/
│   ├── icons/              # PWA 图标（192 / 512 / maskable）
│   ├── mbti/               # 16 型人格立绘，每张含 .png + .webp 双份
│   ├── sbti/               # 16 型 SBTI 立绘，同上
│   ├── milktea/            # 26 个奶茶品牌 logo
│   └── tarot/              # 22 张大阿卡纳立绘（card_0 ~ card_21，jpg）
│
└── scratch/                # 开发过程残留（Playwright 脚本、截图、chrome profile）
                           # 已 gitignore，不参与部署，约 148 MB，可随时删除
```

---

## 🧩 功能模块

顶栏 8 个胶囊标签（`nav-tab`），点击切换视图并同步 URL hash；部分标签下还挂有子导航条。

### 1. 🍹 饮品测评
- **`drinks` 16 款灵魂特调** — MBTI × 饮料人格，四维度计分裁定 16 型人格配方
- **`milktea` 奶茶人格配方** — 26 个品牌 logo + 人格解析

### 2. 📖 自我说明书
`manual` — 7 份出厂说明书，已测进度与存档统计：

| # | 测试 | 英文名 | 类型 |
|---|---|---|---|
| 01 | 社交电池电量测试 | SOCIAL BATTERY | 问答 |
| 02 | 拖延症类型鉴定 | PROCRASTINATION | 问答 |
| 03 | 摸鱼段位测试 | SLACKING RANK | 问答 |
| 04 | 熬夜类型鉴定 | NIGHT OWL | 问答 |
| 05 | 反应速度擂台 | REACTION ARENA | 交互小游戏 |
| 06 | 色彩敏锐度挑战 | COLOR ACUITY | 交互小游戏 |
| 07 | 数字合体 2048 | 2048 PUZZLE | 交互小游戏 |

### 3. ☯️ 东西玄学
四个子屏通过「西方塔罗 / 东方灵签 / 生辰八字 / 工位风水」切换条互跳：

- **`tarot`** 西方塔罗 — 22 张大阿卡纳，支持单牌 / 三牌流程、正逆位、Canvas 海报导出
- **`lingqian`** 东方灵签 — 学业事业姻缘健康综合测算
- **`bazi`** 生辰八字 — 四柱排盘（内置农历库）
- **`fengshui`** 工位风水大师 — 每日老黄历 + 工位方位建议

### 4. ⏰ 摸鱼解压
- **`clock`** 摸鱼时钟 & 工资 — Fliqlo 机械大翻页全屏钟屏保，含农历日期显示
- **`merit`** 功德木鱼 & 碎纸解压 — 静心功德局，电子木鱼 + 怨气粉碎机

### 5. 🪙 纠结拯救
`decision` — 转盘决策 + 终局裁定单（可写批注，生成裁定小票）

### 6. 🛡️ 人间清醒
`lifeguide` — 循证生存与防坑智库，只收录「低投入、高回报」的事，每条结论附医学顶刊 RCT 证据或现行法律条文，覆盖寿命、精力、钱包与人身自由

### 7. 🗞️ 今日风向
`daily` — 今日风向标，每日灵感补给站（时间看板 + 运势播报）

### 8. 🎟️ 幸运刮刮乐
`scratch` — 刮刮卡抽奖，支持即时结算与中奖记录

> 另有 `history` 全局档案中心，通过右上角「📜 档案」入口访问，聚合各模块历史测评记录。

---

## 🏗️ 架构说明

### 路由与模块调度（`js/modules/router.js`）

纯前端 hash 单页路由，无框架：

- `ALLOWED_MODS` 白名单列出全部 13 个屏的 key；
- `switchModule(key)` 负责：切换顶栏 Tab 与滑块（glider）、同步子导航激活态、切换 `.app-module.active`、**首次切入时懒初始化**对应模块的 `window.AppXxx.init()`、写入 `location.hash`；
- `MOD_PARENT_MAP` 定义子屏归属哪个顶栏 Tab，例如 `milktea → drinks`、`bazi → tarot`、`merit → clock`；
- 离开模块时会主动清理状态（`AppManual.stopActiveGame()`、`AppDecision.closeReceipt()`）；
- `router.js` 在打包时**排在最后**，保证其他模块已注册。

**URL 约定**：`https://juice.noooc.dpdns.org/#/tarot` 直接深链到对应屏。

### 主题与音效

- 主题切换写入 `localStorage` 键 `dp_theme`，取值为 `dark` / `light`，CSS 变量定义在 `css/base.css` 的 `html[data-theme=...]` 中；
- 音效引擎 `js/sfx.js` 使用 WebAudio 振荡器与噪声实时合成，**不加载任何音频文件**，`SFX.toggle()` 可全局静音，状态同步到顶栏 🔊/🔇 按钮。

### Service Worker（`sw.js`）

刻意做得很轻，只做一件事：**图片懒缓存**。

- `install` 阶段 `skipWaiting()`，**不做任何预拉取** —— 并发拉几十个资源会触发 Vercel 边缘防火墙拦截；
- `fetch` 阶段**跳过所有导航请求**，以及 `/.well-known/`、`/_vercel/` 路径，保证浏览器原生通过安全验证；
- 仅对 `/assets/` 和 `.png` / `.jpg` 做 cache-first，未命中时静默写入缓存；
- 写入前检查 `x-vercel-mitigated` 头，避免把防火墙错误页缓存下来。

### PWA

`manifest.json` 声明 standalone + 竖屏 + 深色主题色，配 `assets/icons/` 三个尺寸图标（含 maskable），支持「添加到主屏幕」。

---

## 🛠️ 二次开发指南

### 新增一个功能屏

以新增 `foo` 模块为例：

1. 新建 `js/modules/foo.js`，遵循现有约定 —— IIFE 包裹、暴露 `window.AppFoo = { init, ... }`、`init()` 做一次性初始化；
2. 新建 `css/modules/foo.css`；
3. 在 `build-bundles.js` 的 `cssFiles` / `jsFiles` 数组中登记（注意 `jsFiles` 里的顺序即执行顺序）；
4. 在 `index.html` 中新增 `<section id="mod-foo" class="app-module">`，内容写在内部；
5. 在 `router.js` 的 `ALLOWED_MODS` 加入 `'foo'`，并在 `switchModule` 的懒初始化分支加 `if (modKey === 'foo' && window.AppFoo) window.AppFoo.init();`；
6. 若挂在已有顶栏 Tab 下，把 `'foo'` 加进 `MOD_PARENT_MAP` 指向父 Tab，并在页面对应的 `subnav-pill-bar` 里加 `data-sub-jump="foo"` 按钮；若要成为新的一级 Tab，则在 `#navTabs` 里加 `nav-tab`，并补一条 `MOD_PARENT_MAP['foo'] = 'foo'`；
7. `npm run build` + 更新两处版本号。

### 修改题库 / 人格配方

- 饮品人格：`js/core-drink.js`
- 奶茶数据：`js/modules/milktea.js`
- 自我说明书 7 份测试：`js/modules/manual-data.js`（结构为 `title` / `en` / 题库 / 结果）

### 分享长图 / 海报导出

Canvas 手绘，不依赖任何图形库，导出为 PNG 下载：

- 饮品人格：`core-drink.js` 的 `drawShareCard()`（1080 × 1620）
- 塔罗：`js/modules/tarot.js` 的 `renderSharePoster()`（1080 × 1920；三牌布局卡牌 y290–680、解读块 y790 起每块高 250 间距 275；单牌卡 290–920、解读框 y1085）

改字号或文案时注意文本行数不要溢出既定画框。

### 添加图片资源

放入 `assets/<用途>/`，在对应模块 JS 中用相对路径引用即可。新增大尺寸图片时建议同时提供 `.webp` 版本以减小体积。

---

## 🚀 部署说明

### Vercel（当前线上方案）

项目在 Vercel 项目设置里已连接 GitHub `main` 分支，**推送即自动部署**，无需手动构建命令。

`vercel.json` 里做了两件关键的事：

1. **`builds` 段把每类路径写死为 `@vercel/static`** —— 早期项目被识别为 Node/Serverless 项目（`package.json` 有 `main` 字段），函数沙盒里除 `/` 之外全部 404（塔罗立绘集体消失的根因）。从配置层面禁用函数部署是根治办法；
2. **缓存策略分档**：

   | 路径 | Cache-Control |
   |---|---|
   | `/sw.js` | `no-cache, no-store, must-revalidate` |
   | `/index.html` | `public, max-age=0, must-revalidate` |
   | `/(css|js)/(.*)` | `public, max-age=0, must-revalidate` |
   | `/assets/(.*)` | `public, max-age=604800, stale-while-revalidate=2592000` |

   ⚠️ **不要给 `/assets/*` 加 `immutable`** —— 它会在 CDN 边缘把 404 缓存住一整年，造成「明明修好了却还是不显示」的假象。

`.vercelignore` 排除 `node_modules`、`scratch`、`.git` 等非部署产物。

### 发布检查清单

```
[ ] npm run build 已执行，app.bundle.js / app.bundle.css 时间戳已更新
[ ] index.html 的 ?v=N 与 sw.js 的 CACHE_NAME 已同步 +1
[ ] 本地 npm start 走一遍本次改动的模块
[ ] git add 包含 bundle 产物（app.bundle.js / app.bundle.css / index.html / sw.js）
[ ] 推到 main 后等 Vercel 部署完成，再刷新线上验证
```

---

## 🐛 踩坑记录

1. **改完不 build = 没改**。见上文构建流程，这是本项目最高频的问题。

2. **CSS 自定义属性作用域**。挂在 `body` 下的动态元素（JS `appendChild` 的弹窗）无法继承 `#mod-xxx` 作用域里定义的变量，变量缺失时 `background` 会**静默变透明**，配上深色文字就变成「按钮凭空消失」且控制台无报错。写 body 级弹窗样式时，要么在弹窗自身作用域内重新声明变量，要么一律写 `var(--x, 兜底值)`。可参考 `css/modules/tarot.css` 中 `.tr-poster-modal` 的处理。

3. **Service Worker 不要在 `install` 阶段并发预拉取**。几十个并发请求会被 Vercel 边缘拦截（错误码 705），且单个资源失败会导致新 SW 永远无法激活。当前实现是零预拉取 + 图片懒缓存。

4. **不要拦截导航请求**。SW 里若代理 `mode === 'navigate'` 的请求，会阻断 Vercel 的安全验证流程。

5. **`scratch/` 目录**：148 MB 开发残留，已 gitignore 且被 `.vercelignore` 排除，不影响部署，可随时删除回收空间。

6. **PowerShell 输出中文乱码**：终端编码问题，用 `Get-Content -Encoding UTF8` 或直接读文件查看，与源码本身无关。