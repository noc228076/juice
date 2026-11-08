# juice 项目交接文档

> 更新：2026-10-18 · 覆盖至 v100（`1e1d5a4`）
> 适用对象：接手本项目后续开发 / 维护的 agent 或人
>
> 本版所有数字均为**实测核对**。v65 以来新增了完整的全服排行榜后端、
> 说明书从 8 章扩到 14 章（v131 移除人间清醒章节并重排编号）、首屏性能重做；v95 完成了文档对齐与 Daily 数据源迁移；
> v96 把非首屏模块拆成按需 chunk，并把农历库移出首屏；
> v97 把首屏 CSS 收窄为核心包，并把主脚本提前到 `<head>` 发现；
> v98 修复模块 CSS 未加载时 Clock 屏保层遮挡首页首屏的问题；
> v99 重写模块/视图/浮层的浏览器历史与返回逻辑；
> v100 修复共用 chunk 只初始化首个模块，导致「导航高亮变了、内容不变」的回归。
> 你接手后仍应自行复核 —— 过期文档比没有文档更危险。

---

## 一、项目速览

| 项 | 内容 |
|---|---|
| 项目名 | 饮料人格研究所（Drink Persona Lab）→ 多模块趣味实验矩阵 |
| 本地路径 | `D:\Documents\AI\2\juice` |
| Git 仓库 | `github.com/noc228076/juice`（公开，默认分支 `main`） |
| 线上地址 | `https://juice.noooc.dpdns.org/`（Vercel，连接 GitHub `main` 自动部署） |
| 形态 | 纯静态多页 SPA，**无构建框架**，原生 JS + 手写构建脚本 |
| 本地启动 | `node server.js` → **http://localhost:3456** |
| 运行时 | `package.json` 固定 `engines.node >=24`；API 也固定 Node 24 |

### 架构要点（实测，2026-10-18）

```
index.html            129,276 B  (126.2 KB)  手写，含全部模块 DOM 与内联 SVG
css/core.bundle.css    78,237 B  ( 76.4 KB)  ← base + nav + history
css/modules.bundle.css 358,215 B (349.8 KB)  ← 12 个按需模块 css
js/app.bundle.js      423,079 B  (413.2 KB)  ← 8 个首屏核心 js 源文件拼接
js/chunks/*.js        按需加载              ← 8 个 chunk
sw.js                   ~1,630 B             ← CACHE_NAME 是版本号唯一真值
api/leaderboard.js     20,503 B              ← 零依赖 Serverless 排行榜
```

- 唯一构建入口 `build-bundles.js`（`npm run build`），CSS 分 `coreCssFiles`
  首屏核心与 `moduleCssFiles` 按需包；JS 分 `coreJsFiles` 主包与 `chunks` 按需包。
  **顺序即层叠/依赖顺序**，见第四节。
- `build-bundles.js` 从 `sw.js` 读版本号，同步到 `index.html` 的 `?v=`；
  **v440 起版本号自动递增**：构建时对所有进 bundle 的源码做 sha256 指纹，
  指纹与上次构建（`.build-state.json`）不同就把 `sw.js` 的版本号 +1。
  改完代码直接 `npm run build` 即可，不再需要手改版本号；chunk URL 同理。
- 源文件数量：CSS 15 个、JS 24 个。`js/libs/lunar.js`（436,144 B）是 bazi 强依赖，
  v96 起从主包移出：bazi chunk 内含它；只有进入 Daily / Clock 后才按需加载
  `js/chunks/lunar.js`，供两处农历显示。
- 首屏主包只含：`core-drink.js`、`sfx.js`、`daily.js`、`profile.js`、
  `leaderboard.js`、`lb-panel.js`、`history.js`、`router.js`。

### v97 首屏体积（本地构建实测）

| 资源 | 原始 | Brotli q11 | 说明 |
|---|---:|---:|---|
| `index.html` | 129,276 B | 27,190 B | |
| `css/core.bundle.css` | 79,417 B | 15,360 B | base + nav + history |
| `js/app.bundle.js` | 434,897 B | 98,000 B | 仅首屏核心 |
| **首屏三件套合计** | **630,592 B** | **138,132 B** | |

对照线上旧基线（v94，实测）三件套 Brotli 约 592,237 B，首屏静态传输约减少 **76.7%**。
v97 相对 v96 三件套 Brotli 190,739 B 再减少约 **27.6%**，主要是 CSS 68,558 B → 15,360 B。
旧 JS 单包 Brotli 为 460,037 B，新主包 95,582 B，约减少 **79.2%**。
以上是本地 Brotli 计算值，不是部署后的线上实测；FCP / LCP 必须部署后再测。

### v97 按需 chunk（本地构建实测）

| chunk | 原始 | Brotli q11 | 触发入口 |
|---|---:|---:|---|
| `manual.js` | 248,317 B | 63,585 B | manual / lifeguide |
| `mystic.js` | 136,393 B | 38,479 B | tarot / lingqian / fengshui |
| `bazi.js` | 552,118 B | 119,918 B | bazi（内含 lunar） |
| `lunar.js` | 436,175 B | 89,398 B | 进入 Daily / Clock 后空闲加载 |
| `relax.js` | 83,764 B | 18,266 B | clock / merit |
| `decision.js` | 49,729 B | 12,811 B | decision |
| `scratch.js` | 55,209 B | 13,068 B | scratch |
| `milktea.js` | 30,497 B | 8,575 B | milktea |

### 路由与模块（三者数量不同，写测试别混）

| 概念 | 数量 | 真值来源 |
|---|---|---|
| 顶层导航 Tab | **8** | `index.html` 的 `button.nav-tab[data-mod]`：`drinks manual tarot clock decision daily vocab music` |
| 实际路由 | **17** | `js/modules/router.js` 的 `ALLOWED_MODS`：`drinks milktea manual fengshui tarot lingqian decision clock merit films lifeguide bazi daily scratch wall vocab music` |
| `#mod-*` section | **16** | 无 `mod-lifeguide`（已并入 manual）、无 `mod-history`（抽屉）；`mod-tv` 在 v605 下线 |

`MOD_PARENT_MAP` 只决定**顶栏哪个 Tab 高亮**，不决定激活哪个 section：
`milktea→drinks`、`tarot/lingqian/bazi/fengshui→tarot`、`clock/merit→clock`、
`lifeguide→manual`。激活 section 时先找自己的 `#mod-<key>`，找不到才回退父级。

`lifeguide` 是唯一没有独立 section 的路由：老链接 `#/lifeguide` 会先进说明书，
再 `AppManual.openTest('lifeguide')` 翻开第 05 章。保留它只为兼容旧链接。

### 说明书章节（16 章，`js/modules/manual-data.js`）

| # | id | 类型 |
|---|---|---|
| 01 | `social-battery` | 问答 |
| 02 | `procrastination` | 问答 |
| 03 | `slacking` | 问答 |
| 04 | `night-owl` | 问答 |
| 05 | `reaction` | 小游戏（反应速度） |
| 06 | `color` | 小游戏（色彩敏锐度） |
| 07 | `game-2048` | 小游戏（2048） |
| 08 | `minesweeper` | 小游戏（雷区排险，三档难度） |
| 09 | `schulte` | 小游戏（舒尔特方格，三档难度） |
| 10 | `aim` | 小游戏（定位射击靶场，30 秒总分） |
| 11 | `sudoku` | 小游戏（数独，自动存档，错误数排名） |
| 12 | `slide` | 小游戏（数字华容道，自动存档，步数排名） |
| 13 | `tetris` | 小游戏（俄罗斯方块，暂停/自动存档，分数排名） |
| 14 | `snake` | 小游戏（贪吃蛇，三档速度，暂停/自动存档，分数排名） |
| 15 | `bubble` | 小游戏（泡泡猫泡泡龙，双难度分榜） |
| 16 | `tank` | 小游戏（坦克防线，NES 原版 35 关，分数排名） |

> 第 16 章的引擎单独放在 `js/modules/manual-tank.js`（约 1670 行），
> 35 关地图与敌军配置在 `manual-tank-stages.js`（约 810 行只读数据），
> 由 `window.SMGameKit` 复用 `manual-games.js` 里的舞台/榜单工具。
> 规则与数值按 1985 年 NES 原版逐条对照 ROM 反汇编实现：
> 13×13 战场、每关 20 辆、35 关、三条命、点按开火、吃星升级、
> 第 4/11/18 辆带道具、出生间隔 190−4×关卡号 帧、前 1/8 时间随机游走。
> 数据来源：MIT 项目 `feichao93/battle-city`，版权头保留在文件顶部。
> `index.html` 的 `#sm-homebody` 现在只保留空容器，章节目录完全由
> `manual.js` 的 `renderHome()` 按 `SM_ORDER` 渲染，不再维护第二份 tile 骨架。
> `#sm-rail-sum` 的静态文案已同步为 16 章，运行时仍由 `renderHome()` 覆盖。
> 详见第五节教训 14。

### 图片资源（实测）

| 目录 | 文件数 | 体积 | 说明 |
|---|---|---|---|
| `assets/tarot/` | 22 | 1,116 KB | 塔罗大阿卡纳立绘（v265 起 WebP 480px，原 JPG 7.2MB） |
| `assets/sbti/` | 54 | 488 KB | SBTI 人格图，27 型 × png/webp，两种格式均在用 |
| `assets/mbti/` | 32 | 628 KB | 16 个 `.webp` 在用，16 个同名 `.png` 无引用（历史遗留） |
| `assets/milktea/` | 26 | 256 KB | 奶茶品牌 logo |
| `assets/icons/` | 3 | 104 KB | PWA 图标，均被 `manifest.json` 引用 |

---

## 二、v65 之后发生了什么（33 个提交）

### A. 全服排行榜（本轮最大新增）

从 `f3787b4`（2048 首接榜单）开始，逐步长成一个完整子系统：

- **后端** `api/leaderboard.js`：零依赖，Upstash Redis REST，GET/POST/DELETE。
- **客户端三件套**：`profile.js`（本机身份）、`leaderboard.js`（网络层，60 s 缓存 +
  超时降级）、`lb-panel.js`（双 Tab 面板：全服榜 / 我的战绩）。
- **接入游戏**：2048 → 反应速度 / 色彩挑战 → 扫雷三档 → 舒尔特三档。
- **配套修复**：`a1c352c` 管理 DELETE；`091a4f9` 兼容 Vercel 集成 Custom Prefix
  环境变量；`c6c72c9` 固定 Node 24；`52a4564` 修线上 404 与最高方块归零；
  `5a36814` 改头像昵称后立即同步榜单；`7978691` 历史战绩自动补交全服榜。

### B. 说明书扩到 11 章

顺序最终定为「4 个问答 → 人间清醒 → 5 个游戏」：

- `1c919c8` 人间清醒并入说明书（当时第 08 章）→ `af07f52` 提到 **05**，游戏整体后移。
- `0f51bad` 新增扫雷（08）→ 后移为 **09**；`b9daf4b` 新增舒尔特（09）→ **10**。
- `4e2598e` 扫雷三档难度各用独立榜单；`a9a2951` 棋盘按可用宽度自适应；
  `e792d8b` 高级格子 23px → 34px；`e6d8809` 第 08 章不再横跨整行。

### C. 首屏性能与主题闪烁（`418f3b1`，7 文件 +283/−7）

用户反馈「首屏加载慢」，真正的元凶不是 bundle 体积：

1. **`display:none` 里的图片照样下载。** 塔罗 `card_19.jpg`（446 KB）藏在隐藏容器里，
   仍以高优先级抢带宽，把 1.5 MB 主包压到 4.8 s。加 `loading="lazy"` 后
   **DCL 5.4 s → 约 0.9 s**。
2. **浅色主题深色闪屏。** `<html data-theme="dark">` 是硬编码的，`applyTheme()` 跑之前
   浅色用户会看到一帧深色。改为 `<head>` 内联脚本，首帧前读 `localStorage.dp_theme`。
3. **首屏空白。** 主包执行前页面全空。加纯 CSS 骨架（与真实封面同构），
   `show('cover')` / 切模块时给 `<html>` 加 `cover-ready` 淡出。

### C2. v96 / v97 / v98 首屏拆包

- `js/app.bundle.js` 只保留首屏核心，其余模块拆为 `js/chunks/*.js`，
  由 `router.js` 首次进入时动态注入 `<script>`。
- chunk URL 统一带 `?v=<sw 版本>`；主包顶部由构建脚本注入
  `window.__APP_VERSION__`，避免 immutable 缓存拿旧 chunk。
- `router.switchModule()` 返回 Promise；历史档案恢复会等模块 chunk 就绪后再
  `restore()`，避免塔罗 / 八字 / 说明书恢复时 API 尚未定义。
- 共用 chunk 的入口（`manual` / `lifeguide`）统一走 `runModuleInit()`，
  避免 chunk 加载中快速切换后目录为空或老链接没翻开第 05 章。
- `lunar.js` 不再阻塞首屏：只有进入 Daily / Clock 后才调度；
  内容先渲染，农历到达后只刷新日期文本，不重复 init。
- 塔罗不再进入即预载 22 张（约 7.3 MB）：先加载今日值日牌，其余每 160 ms
  逐张预热，把带宽让给当前可见牌面。
- v97 把 `base + nav + history` 作为首屏核心 CSS，其余 12 个模块样式打进
  `css/modules.bundle.css`；首页不请求模块 CSS。
- `router.switchModule()` 对非饮品路由并行加载模块 CSS 与 JS chunk，CSS 就绪后
  再激活 section；模块 CSS 全站只加载一次，避免深链首帧 FOUC。
- Daily 的全站 4K 沉浸壁纸规则已迁到核心 `nav.css`，因此首页在模块 CSS
  未加载时也能恢复已保存的壁纸状态。
- 主脚本从 `</body>` 前移到 `<head>`，保留 `defer` 并加
  `fetchpriority="high"`，让 129 KB 的 HTML 解析早期就发现主包。
- favicon 从 192px / 15,415 B 换成 32px / 1,608 B；
  `apple-touch-icon` 与 PWA 192/512 图标未动。
- v98 发现并修复首屏回归：`.ck-zen-overlay` 原本只定义在懒加载的
  `clock.css` 中，首页未加载模块 CSS 时 `#ckZenOverlay` 仍是
  `display:block; visibility:visible; opacity:1`，且 z-index 最高，
  实际覆盖首页上半屏并成为 LCP 元素。现在 `nav.css`（核心包）里
  默认 `display:none`，仅 `.is-active` 时 `display:flex`。

### C3. v99 / v100 路由与共用 chunk 修复（本轮）

**v99 的目标**：让浏览器后退、深链、浮层关闭都走同一套历史状态，
不再出现「点返回直接退出站点」或「后退后页面空白」。

- `router.js` 统一 `history.state` 结构：`{ juice, mod, view, layer, payload, depth }`；
  `depth` 表示站内历史层数，用于判断 `back()` 是否还能安全 `history.back()`。
- 首页/模块/子视图分别用 `replaceState`、`pushState`、`replaceView` 管理；
  结果页用 `replaceView`，避免「结果页自己再压一条历史」。
- 浮层（档案抽屉、裁决小票、时钟屏保、个人资料、塔罗海报）进入 `layer`，
  后退先关浮层，不切模块。
- 首次带 hash 深链：先写首页，再压目标模块，保证后退能回站内首页；
  无效 hash 自动纠正回首页。
- 快速连续后退/前进用 `navSeq` 防竞态；`popstate` 后短暂抑制
  `hashchange`，避免同一次后退执行两遍。

**v100 的回归与根因**：用户实测「点顶栏只变高亮，内容不换」。
不是网络慢，而是 `initModuleOnce()` 把「chunk 加载」和「模块初始化」
绑在了第一个请求者身上：

```js
// 旧逻辑（错误）
loadChunk('mystic').then(() => {
  if (currentModule !== modKey) return;  // 切走后直接丢弃
  runModuleInit(modKey);
});
```

`tarot / lingqian / fengshui` 共用 `mystic` chunk，`clock / merit` 共用
`relax` chunk。第一次进入 tarot 后，再进 lingqian/fengshui 时
`chunkLoads['mystic']` 已经是 resolved Promise，回调立刻执行，
但 `currentModule` 已经是新模块，`runModuleInit()` 被跳过；
`initializedModules` 又只记录了 tarot，于是新模块永远不初始化。

修复分两步：

1. **每个模块独立初始化一次**：`loadChunk()` 的 Promise 只负责「文件到了」，
   `runModuleInit(modKey)` 由每个模块自己的入口调用；共用 chunk 不再互相顶掉。
2. **切走后不再初始化旧模块**：回调里加
   `if (currentModule !== modKey || initializedModules.has(modKey)) return;`
   避免用户已经切走，旧模块还在后台起计时器、预载图片或绑定事件。

同时新增 `#navLoadOverlay`：首次进入模块时盖住旧页面，显示
「正在打开… / 首次进入需要加载该模块」，加载完成或失败后统一移除。
这样即使弱网，也不会出现「导航已高亮、内容还是上一页」的假死观感。

**验证结果（线上 v100，真实点击 7 个顶栏 tab）**：

- `manual / tarot / clock / decision / daily / scratch / drinks`
  全部切到对应 `#mod-*`，`AppRouter.getState().mod` 与 `.app-module.active` 一致；
- 加载完成后 `#navLoadOverlay` 均不存在；
- 0 个请求失败、0 个 console/page error；
- 深链 `#/tarot`、模块子页后退、历史抽屉后退、时钟屏保后退、个人资料后退、
  裁决小票 Esc/后退、无效 hash 纠正均通过。

### C4. 返回逻辑风险清单（2026-10-18 审查原单，逐条状态）

这份清单是 v99/v100 期间对「返回、深链、历史恢复」做的静态审查结果。
**状态只代表当时代码，不代表已经全部修完。** 标「未修」的项仍按原样存在，
接手者应按优先级继续处理。

#### 高风险

| # | 位置 | 问题 | 状态 |
|---|---|---|---|
| H1 | `router.js:616` `back()` | 旧实现非首页视图直接 `replaceView('home')`，绕过真实历史栈，后退可能出站或重复回已关闭页 | **已修**：增加 `depth`，优先 `history.back()`，无站内历史才回首页 |
| H2 | `history.js:86` `restoreRecord()` | 先 `navigate()` 再 `replaceView()`，各模块 `restoreView()` 又渲染一次；说明书小游戏可能双计时器/双棋盘 | **部分修**：非 `decision` 模块改为 `skipRestore`，但 `manual/milktea/tarot` 自身仍是「先 push 再渲染」，重复渲染未完全消除 |
| H3 | `history.js:137` `decision` 分支 | 先 `openReceiptLayer()` 再 `openLayer('decision')`，同一层打开两次，后退关闭可能失效 | **未修**：仍是双重打开 |
| H4 | `lingqian.js:314` | 抽签结果用 `pushView('result')`，结果页多一条历史，后退要按两次 | **已修**：改为 `replaceView` |
| H5 | `fengshui.js:174` / `bazi.js:1677` | 用「当前 view 是否 result」决定 push/replace，历史恢复和深链场景下可能覆盖旧结果而不是新增步骤 | **未修**：仍依赖 `getState().view === 'result'` |

#### 中风险

| # | 位置 | 问题 | 状态 |
|---|---|---|---|
| M1 | `manual.js:148` / `milktea.js:160` / `tarot.js:984` | 先 `pushView()` 再立即渲染，router 随后 `restoreView()` 再渲染一次；普通页只是重复开销，说明书交互游戏会重复 `openGame()` | **未修**：仍是先 push 后渲染 |
| M2 | `manual.js:155` | `lifeguide` 先 `pushView('lifeguide')` 后直接 return，真正的 `open()` 交给 router；`restoreView('lifeguide')` 又调 `openTest(..., { silent: true })`，可能二次进入和重复绑定 | **未修**：仍可能二次 `open()` |
| M3 | `tarot.js` 海报层 | `tarot-poster` 没有 Esc 监听，键盘用户只能鼠标关或浏览器后退 | **已修**：`init()` 里补了 document keydown，检测 `trPosterModal` 显示中时 `closePoster()` |
| M4 | `clock.js:1155` | 用户按 Esc 退出全屏时，旧回调只关 DOM 不关路由层，历史状态可能残留 `layer:'clock'` | **已修**：改为调用 `AppRouter.dismissLayer('clock')`，无 router 才回退 DOM |
| M5 | `decision.js:642` | `showReceipt()` 在 router 分支里延迟写历史，`openLayer()` 与 `UniversalHistory.add()` 有时序差；快速连点或恢复历史可能重复入库 | **未修**：延迟写入仍在 |
| M6 | `history.js:137` | `decision` 恢复先 `openReceiptLayer()` 再 `openLayer('decision')`，第二次 `replaceHistory` 容易让「后退关闭小票」失效 | **未修**：与 H3 同源 |

#### 低风险 / 一致性问题

| # | 位置 | 问题 | 状态 |
|---|---|---|---|
| L1 | `lingqian.js:529` | 调用 `AppRouter.switchModule(targetMod, true)`，新 router 只接受一个参数，第二参数被忽略 | **已修**：改为 `switchModule(targetMod)` |
| L2 | `router.js:758` `initializeHistory()` | 如果已有 `history.state`，直接 `replaceHistory(existing)` 并恢复，刷新在结果页时不会补「首页」这一层，后退可能直接出站 | **未修**：`existing.depth = 0` 仍会丢掉站内层级 |
| L3 | `router.js` `parseHashState()` | hash 只编码模块，不编码视图；`#/tarot` 刷新只能回模块首页，不能恢复抽牌/结果子页 | **未修**：设计取舍，但与历史恢复混用时会显得不一致 |
| L4 | `history.js:86` | 先关抽屉再异步切模块，chunk 加载慢时用户会短暂看到上一个模块 | **未修**：仍是先关后加载 |
| L5 | `router.js:640` | `back()` 在无 depth 且非首页时仍 `replaceView('home')`，是兜底而非严格 `history.back()` | **保留**：有意兜底，避免直接出站 |

#### 结论

- 高风险 5 项：已修 2 项（H1、H4），部分修 1 项（H2），未修 2 项（H3、H5）。
- 中风险 6 项：已修 2 项（M3、M4），未修 4 项（M1、M2、M5、M6）。
- 低风险 5 项：已修 1 项（L1），保留 1 项（L5），未修 3 项（L2、L3、L4）。
- **不能把 v100 上线理解为这份清单已清零。** v100 主要解决的是共用 chunk 初始化导致「导航变了内容不变」的线上事故。

### D. 其它模块

- `clock`：摸鱼时钟改双栏，宽屏免滚动（`5e5a0b4`）。
- `daily`：热榜多源降级（`edd6ae8`）、切影视/壁纸时热点不消失（`8fe3d25`）、
  桌面左右分栏（`faeab6c`）。
- `daily` 数据源迁移（v95）：`60s.viki.moe` 全路径已变成 Cloudflare 403 且无
  ACAO，浏览器会直接报 CORS。现改为：
  - 新闻：`60s-static.viki.moe/60s/YYYY-MM-DD.json`，按当天 / 昨天 / 前天尝试，
    星期与农历由本地日期和 `lunar.js` 推导；
  - 热榜：codelife（微博/知乎/抖音/AI）+ xxapi（微博/B站/抖音），
    小红书/头条暂无跨域源，直接走离线精选；
  - 壁纸：`bing.biturl.top`（今日 + 近 6 日），统一归一化字段；
  - 影视：豆瓣接口无 ACAO、60s 代理已下线，改用本地片单与本地海报兜底；
  - `fetchWithCacheDetail` 的 timeout 改为 `try/finally`，abort/异常不再泄漏定时器；
  - `navigator.onLine === false` 时直接读缓存 / 种子，不发注定失败的请求。
- `scratch`：PC 一屏装下（`dfd07cf`）、开奖全部号码露出（`76edded`）、
  账本桌面右栏常驻（`9910922`）。
- `2048`：榜单移出游戏区独立右栏（`70c32ed`）、榜单行 grid 对齐（`36f9fde`）、
  移除职场头衔（`431882a`）。
- `51849d5` 全站壁纸下三个游戏容器透出背景。
- **反应速度第二关左右半区**三次返工：`c2df5e5` 去掉大黑块 → `c57803f` 恢复可见边框
  → `8a3e34d` 定稿为半透明填充 + 黑线边框。定稿样式：
  背景 `rgba(255,255,255,0.085)`、边框 `2px solid rgba(0,0,0,0.78)`、两半区间距 20px；
  `.ok` 绿 `rgb(47,191,107)`、`.ng` 红 `rgb(226,59,46)`。

---

## 三、全服排行榜契约（改榜单前必读）

### 游戏与 Redis key（`api/leaderboard.js` 的 `GAMES`）

| `game` | ZSET / HASH | 排序 | 备注 |
|---|---|---|---|
| `2048` | `j2048:z` / `j2048:p` | 分数高者前 | 分数 = 最高方块 |
| `reaction` | `jreaction:z` / `jreaction:p` | 毫秒低者前 | |
| `color` | `jcolor:z` / `jcolor:p` | 分数高者前 | |
| `mine_easy` | `jmine_e:z` / `jmine_e:p` | 秒数低者前 | |
| `mine_medium` | `jmine_m:z` / `jmine_m:p` | 秒数低者前 | |
| `mine_hard` | `jmine_h:z` / `jmine_h:p` | 秒数低者前 | |
| `schulte_easy` | `jsch_e:z` / `jsch_e:p` | 秒数低者前 | |
| `schulte_medium` | `jsch_m:z` / `jsch_m:p` | 秒数低者前 | |
| `schulte_hard` | `jsch_h:z` / `jsch_h:p` | 秒数低者前 | |
| `minesweeper` | `jmine:z` / `jmine:p` | 秒数低者前 | **legacy**，仅服务端保留给旧客户端 |

数据结构：每个游戏一个 ZSET（member = 玩家随机 ID，score = 个人最好成绩，
封顶 1000 条）+ 一个 HASH（昵称 / 头像 / 日期 / extra 字段）。
`higher:false` 的榜单用 `ZRANGE` / `ZRANK` 升序。

### 校验与限流（服务端）

- 2048：分数 ≥ 最高方块，且为 2 的幂。
- 反应：80–3000 ms；色彩：0–500；扫雷：1–7200 s；舒尔特：1–600 s。
- 扫雷的 `lv` 必须与 `board` 匹配（防止跨难度刷榜）。
- 昵称按 **code point** 截断；限流窗口 60 s / 最多 20 次提交。
- `DELETE` 需 `ADMIN_TOKEN`；未配置时返回 403。

### 环境变量

`UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN`，同时兼容 Vercel Upstash
集成的 `KV_REST_API_URL` / `KV_REST_API_TOKEN`，以及任意前缀的同名后缀
（如 `STORAGE_KV_REST_API_URL`，按后缀反查，避免一个前缀就整站 503）。

**行为分环境**（`api/leaderboard.js` 第 80–81 行）：

- 生产（`NODE_ENV=production`）缺变量 → 明确返回 **503**，绝不假装成功。
- 本地开发 → 自动降级为**进程内存储**（`useMemory`），`node server.js` 即可全流程调试。

503 / 超时时全服 Tab 显示错误行与空态（`localRows` 回退已随刮刮乐重构移除；本机战绩在「我的战绩」Tab，失败提交由 `syncLocal` 的签名去重 + 10 分钟退避兜底）。

---

## 四、接手必读：CSS 层叠陷阱（本项目已踩 7 次）

这是本项目最高频的 bug 来源，**全部表现为「我改了但线上没变」**。

### 1. `base.css` 在 bundle 里排第一

加在 `base.css` 末尾的覆盖块会被后面 14 个模块文件按同特异性盖掉。
**要覆盖模块样式，就去那个模块文件里改它自己的规则。**

### 2. 媒体查询不提升特异性

`.foo{max-width:100%}` 写在文件头，`.foo{max-width:560px}` 写在文件尾的
`@media` 里 → **基础规则赢**。PC 覆盖必须放文件末尾或提高特异性。

> 实例：`scratch.css` 的票面限宽规则被后面的基础规则按同特异性盖掉。
> 查这段历史请用 `git log -- css/modules/scratch.css`，别信行号。

### 3. 选择器列表里每个选择器各自算特异性

```css
#mod-drinks.active, #mod-milktea.active, #mod-manual.active, ..., .app-module.active
  { display: block !important }
```

你看到 `.app-module.active` 就以为只是 (0,2,0)，**但列表里还有
`#mod-manual.active`，那个是 (1,1,0)**。裸写 `#mod-manual` 只有 (1,0,0)，
压不过它。必须写到 `#mod-manual.app-module.active` 拿 (1,2,0)。

**且绝不能省掉 `.active`** —— 否则模块未激活时会被强制显示出来。

### 4. `min-height` 永远压制 `height`

给 `.global-btn-pill` 加 `min-height:36px` 对齐桌面，移动端媒体查询只重置了
`height:30px` → 手机上变成 **30 宽 × 36 高的椭圆**。
移动端必须同时重置 `min-height`。

### 5. `flex-shrink` 会静默吃掉固定高度

子导航条设了 `height:40px`，但它是 flex item，宿主内容溢出时默认 `flex-shrink:1`
会把它压回自动最小尺寸 —— **实测从 40px 掉到 26px**。
凡是「固定高度 + flex item」的组合，都要显式 `flex-shrink:0`。

### 6. CSS 自定义属性作用域

`#mod-xxx` 作用域内定义的变量，`document.body.appendChild` 挂到 body 下的
弹窗继承不到 → `background: var(--tr-gold)` 解析失败变透明，
**近黑字配深底 = 文字消失，且不报错**。写 body 级弹窗样式要么在弹窗作用域
重新声明变量，要么 `var(--x, 兜底值)`。

### 7. 深色舞台上的「分区」不要用不透明深色填充

反应速度第二关左右半区第一版用了实色深底，在深色舞台上直接变成两块大黑块，
玩家以为渲染坏了。定稿方案是**半透明填充 + 细边框**：
`rgba(255,255,255,0.085)` + `2px solid rgba(0,0,0,0.78)`。
深色底上想表达「两个区域」，用边框和透明度，不要用填充色差。

---

## 五、测试与验证（这份文档里最值钱的部分）

### 通用运行方式

```powershell
# 启动本地服务（注意：node -m 不是合法参数，必须用 server.js）
node server.js

# 跑 Playwright 脚本：Node 用 Playwright 必须 .cjs + NODE_PATH
$env:NODE_PATH="C:\Users\NOC\.workbuddy-ai\binaries\node\workspace\node_modules"
node "C:\Users\NOC\AppData\Local\Temp\opencode\juice-final2.cjs"

# chromium 显式路径（Playwright 自带版本与安装的不匹配）
C:\Users\NOC\AppData\Local\ms-playwright\chromium-1234\chrome-win64\chrome.exe
```

### 主回归脚本 `juice-final2.cjs`

13 条路由 × 3 档视口（1440 / 390 / 320），覆盖：
顶栏激活项可见性、左右区遮挡、横向溢出、子导航条溢出、条高一致性、
标签高度极差、顶栏控件等高、命盘四宫格行高、console 错误。

**v96 另加真实点击脚本 `%TEMP%\juice-tab-click.cjs`**：不调用
`AppRouter.switchModule()`，而是逐个真实点击 7 个顶栏 tab，并先断言
`elementFromPoint` 命中的就是该 tab。覆盖三档视口，v96 实测 0 失败。

**这个脚本本身踩过的坑，比它测出来的问题更值得记住：**

### 教训 7：`if (!vp.mob)` 等于主动屏蔽移动端

我把所有高度断言包在 `if (!vp.mob)` 里，理由是「移动端有各自更紧凑的设计」。
结果子 agent 挖出的 **3 个 P0 全在移动端**，全被这个门放过了：

- `.dec-subnav` 固定 40px 撞上移动端 2×2 网格，第二行溢出 45px **直接压在正文上**
- `min-height` 压制 `height`（见第四节陷阱 4）
- `flex-shrink` 静默吃掉 40px（见第四节陷阱 5）

移动端要断言的是**不同的东西**（不溢出、不裁切），不是不测。

### 教训 8：路由列表漏项

回归列表里有 `milktea`/`fengshui`/`lingqian`/`merit`/`bazi` 这些**子视图**，
却**漏了 `decision` 这个真实顶层模块**。而上面第 1 个 P0 正好住在 decision 里，
自己的测试永远看不见。

写覆盖列表时要拿 `index.html` 的 `data-mod` 作为顶层真值来源交叉核对。

### 教训 9：断言可能空转

新加的断言在移动端全绿，我无法判断是「真的没问题」还是「什么都没采集到」。
加了计数后发现三档都只采到 11/13 条 —— 才确认非空转。

**任何新断言都要先确认它真的采到了数据。**

### 教训 10：`git diff` 为空也要做反向对照

抽 base64 时脚本覆盖了 80 个已跟踪文件，`git diff --stat` 显示为空。
但我第一版校验脚本是错的（`git hash-object <file>` 算的是磁盘文件自己的哈希，
跟 git 里的版本无关，永远相等）。

做了**反向对照**才敢下结论：故意改坏 1 字节 → git 立刻报出
`Bin 6775 -> 6775 bytes` → 还原 → 重新为空。
确认「空 diff」是真的干净，而不是检查本身失效。

### 教训 11：PowerShell 常用命令的坑

- `[IO.File]::ReadAllText($p,[Text.Encoding]::UTF8)` 正确读中文；
  `Get-Content` 不带编码会按 ANSI 读，导致中文乱码后误判文件损坏。
- `Get-Content package.json -Raw | ConvertFrom-Json` 报「无效的 JsonEnd」，
  其实只是中文按 ANSI 读坏了，文件本身正常。**看到解析失败先怀疑编码。**
- `Select-String -Path a,b -Pattern "x"` 里路径不存在会中断整条命令，
  后面文件的结果全丢。
- `$_.Matches[0].Groups[1]` 取正则捕获组：`$x -match` 只返回 bool，
  必须用 `[regex]::Match()`，不要在 `-match` 后接管道。
- `IndexOf()` 只返回**第一个**匹配 —— 判断「某字符串是否还存在」时
  会漏掉后续匹配，必须用 `Matches()` 或 `Split().Count`。

### 教训 12：`?v=` 不是内容协商

`?v=64` 和 `?v=65` 会返回**同一个文件** —— 服务端只有一份 `app.bundle.js`，
查询串只是 cache-buster。所以**没法用 A/B 对比新旧版本**，
旧 bundle 一旦部署就不可得。性能改动只能靠压缩后传输字节数（确定性）
来证明，不要编时间数字 —— 环境波动极大，同一份代码不同轮次能差 30 倍。

### 教训 13：`display:none` 不阻止图片下载

首屏慢的排查不要一上来就怀疑 bundle 体积。塔罗 `card_19.jpg`（446 KB）在
`display:none` 的容器里，浏览器仍以高优先级下载，把主包带宽挤到 4.8 s。
**DevTools 的 Network 面板按 Priority 排序**，一眼就能看到谁在抢。
修法是 `loading="lazy"`，不是删图。

### 教训 14：`index.html` 里的静态 DOM 可能只是骨架

说明书的章节目录曾经把 8 个 tile 和「已测 0/8 章」硬编码在 `index.html` 里，
但 `manual.js` 的 `renderHome()` 会用 `innerHTML` 整体重写。改章节数时如果只改
`index.html`，本地看着「改了」，一进模块就被 JS 覆盖回旧值。
现在 `#sm-homebody` 只留空容器，目录由 `SM_ORDER` 单一真值渲染；
`sm-rail-sum` 的计数仍由 `updateSummary()` 维护。
**先 grep 谁在写这个容器（`getElementById('sm-homebody')`），再决定改哪。**

### 教训 15：CSS transition 会骗过 computed style 探测

反应速度第二关的边框有 `0.12s` 过渡。第一次探测脚本在过渡起始帧读到的是
**旧值**，差点误判修复失败。读 `getComputedStyle` 前要么等 `transitionend`，
要么延迟 200 ms 再读，或者读两次取第二次。

### 教训 16：章节号是散落的字面量，改动要全局扫

章节号至少出现在 6 处：`manual-data.js` 的 `num`、`SM_ORDER` 顺序、
lifeguide 顶栏、history 记录、router 注释、CSS/README。
`af07f52` 一次改了 12 个文件才对齐。**加章 / 调序时先 grep 旧编号。**

### 教训 17：注释会过期，以常量为准

v94 时 `sw.js` 头注释还写着「v65」、`api/leaderboard.js` 头注释还写着「三个榜单」，
但实际是 v94 / 十个榜单。v95 已同步这些注释。判断版本看 `CACHE_NAME`，
判断榜单看 `GAMES` 表，不要只信文件头注释。

### 教训 18：HTTP 200 不等于数据可用

`api.codelife.cc` 对未知榜单 id 会返回 **HTTP 200 + `data: []`**；
部分聚合接口也会用 200 包着 `code: 980102` 的空结果。
只判断 `res.ok` 会把死源当成成功，缓存空数组，然后界面空白。
**必须同时校验业务 `code` 和列表非空。**

### 教训 19：CORS 失败不能只靠 catch 兜底

`fetch` 被 CORS 拦截时，`catch` 能让业务代码继续走 fallback，
但浏览器仍会在控制台打印错误；如果每次进页面都请求一个已死的域名，
回归测试会一直失败，用户也会看到满屏红字。
**已确认 403 / 无 ACAO 的源必须从请求列表删除，而不是留着等 catch。**

### 教训 20：图片直链的 Referer 限制不能靠 `onerror` 掩盖

豆瓣图片 CDN 对无 Referer 的请求返回 403/418，部分旧海报 ID 已 404；
图片代理对这批 ID 也返回 404。`onerror` 换成占位图虽然能显示，
但每次加载仍会产生失败请求和 console 噪音。
**本地片单就配本地海报，不要保留已知死链。**

### 教训 21：一个多余的 `</div>` 会把后续模块踢出 `<main>`

v96 拆包后顶栏在 tarot / daily / clock 等模块里点不动，`elementFromPoint`
返回的是模块内容而不是 `#global-header`。原因不在 z-index：`#mod-manual`
末尾多了一个 `</div>`，浏览器提前闭合了 `<main id="modules-viewport">`，
后续所有 `.app-module` 都变成 `<body>` 的直接子节点，`position:absolute; inset:0`
让它们从视口顶部开始，盖住了顶栏。

排查方法：先看模块 section 的 `parentElement.id`，不要只盯 computed z-index。
HTML 标签栈检查、`document.body.children` 和 `#modules-viewport.children`
三种视图对照，能在一分钟内定位。

### 教训 22：路由测试必须包含真实点击，不能只调 `switchModule()`

旧回归用 `page.goto('#/tarot')` 和 `AppRouter.switchModule()` 验证，
绕过了真实 pointer 命中；上述 HTML 结构 bug 因此一直绿灯。
**至少补一条真实点击顶栏的用例，并在点击前断言 `elementFromPoint`。**
移动端 tab 在横向滚动区外时，真实用户会先滑动，测试也应
`scrollIntoView({inline:'center'})` 后再点，不能把「不可见」误判成「被遮挡」。

### 教训 23：共用 chunk 不等于共用初始化

v100 的线上事故：`tarot / lingqian / fengshui` 共用 `mystic` chunk，
`clock / merit` 共用 `relax` chunk。第一版把「加载 chunk」和「初始化模块」
写在同一个 Promise 里，并用 `currentModule !== modKey` 提前返回。
结果第二个共用模块进入时，chunk Promise 已 resolved，回调立刻执行，
但因为用户已经切到新模块，初始化被跳过；导航高亮变了，内容仍是旧模块。

**规则**：chunk 缓存只负责「文件已到」；每个模块的 `init()` 必须由
该模块自己的入口驱动，且只执行一次。不要用「当前模块是否还是它」
去决定要不要初始化——那会把快速切换变成永久空页。

### 教训 24：加载状态必须覆盖旧内容

只改导航高亮、不盖住旧页面，用户会以为点击失效。模块首次加载时
用 `#navLoadOverlay` 盖住视口，加载完成/失败后移除；它必须放在
`#modules-viewport` 内，且 z-index 高于所有模块，低于全局顶栏。

### 教训 25：`?v=` 不换，线上永远看不到修复

v99 修好后线上仍是旧 JS，因为 `?v=99` 被 Vercel 设为 immutable。
只改代码、不升版本，浏览器会继续用缓存里的旧 bundle。
**每次 css/js 变更都要先改 `sw.js` 的 `CACHE_NAME`，再 `node build-bundles.js`。**

---

## 六、已知遗留问题

1. **`assets/mbti/` 16 个 `.png` 无任何引用**（与同名 `.webp` 内容不同）。
   历史遗留，删不删你定。
2. **`lunar.js` 还有 426 KB**（436,144 字节），是真实农历库不是图片。
   被 bazi 强依赖，动态加载风险高于收益，暂未动。若要继续瘦身，这是最大目标。
3. **`css/modules.bundle.css` 350 KB**：v97 已把首屏 CSS 降到 79 KB，
   但首次进入任一非饮品模块仍要一次拉取全部模块样式。后续可按入口继续细分，
   代价是更多请求与更复杂的加载状态。
4. **塔罗 768→900px 断点**：768–899px 平板会退化成单栏。
   这是有意改动（双栏需要空间），但牺牲了平板区间，用户尚未拍板。
5. **移动端底部留白 36/40px → 24px**：为统一垂直节奏而收窄。
   原值可能就是为了拇指区呼吸空间，**建议真刘海机复核**（模拟器无安全区）。
6. **`#scr-quiz` / `.result-scroll` / 封面移动端分支（8px）未纳入
   `--screen-pad-block`**，有意保持紧凑。已在 `css/base.css` 注释里写明范围。
7. **4 个孤儿源文件仍在版本库中**：`js/app.js`（24,114 B）、
   `js/data.js`（121,749 B）、`js/drinks-art.js`（39,434 B）、
   `css/style.css`（38,225 B）。被 git 跟踪，但既不在 `build-bundles.js` 里，
   也不被 `index.html` 引用 —— 早期单文件架构残留。**别误以为它们在生效。**
8. **文档与注释过期（v95 已修）**：`README.md` 的模块数、说明书章数、
   排行榜数量、Node 版本与 SW 版本已对齐；`sw.js` 头注释、`api/leaderboard.js`
   头注释、`index.html` 顶栏 / 模块数注释也已同步。后续改结构时仍需顺手更新。
9. **`index.html` 的静态说明书骨架（v95 已修）**：已改为空容器，
   目录由 `manual.js` 的 `renderHome()` 按 `SM_ORDER` 渲染（见教训 14）。
10. **`assets/tarot/`**（v265 已压缩为 WebP，共 1.1 MB）。首屏只懒加载，
    但塔罗模块首次进入仍需拉取立绘，弱网下体验一般。
11. **`switchModule(modKey)` 的第二参数已废弃**：v99 起只接受一个参数，
    旧调用 `switchModule(targetMod, true)` 不会报错，但第二个参数被忽略。
    新增入口请直接用 `navigate(mod, view, payload)`。
12. **`?v=` 仍是 cache-buster，不是内容协商**：即使代码已更新，
    旧 `?v=99` URL 在 immutable 缓存下仍可能返回旧 bundle。
    任何 css/js 变更都必须同步升 `sw.js` 的 `CACHE_NAME` 并重新构建，
    否则线上会出现「HTML 已更新、JS 还是旧版」的假修复。

---

## 七、部署

- **推 `main` 即自动部署**（Vercel 已连 GitHub），无需手动触发。
- `vercel.json` 的 `builds` 段必须保留：它从配置层面禁掉函数部署（只留 `api/**`）。
  项目有历史遗留的 Node 配置（早期 CLI 部署产生），靠这段兜住。
- `/api/leaderboard` 通过 rewrite 指向 `/api/leaderboard.js`。
- 缓存头：`sw.js` no-store；`index.html` must-revalidate；
  css/js `public, max-age=31536000, immutable`；assets 7 天 + 30 天 SWR。
- 改了 `css/` 或 `js/` **必须 `npm run build`**，否则线上拿到的还是旧 bundle。
- ~~手改版本号~~ v440 起 `build-bundles.js` 按源码指纹自动递增 `CACHE_NAME`，
  忘改版本导致旧缓存的问题已从流程上根除。仍要 `npm run build`。
- SW 的 `install` 阶段**严禁并发预拉取**资源，会触发 Vercel 边缘防火墙 705。
  当前实现零预取，只在 `fetch` 时懒缓存 `/assets/` 与 `.png`/`.jpg`。
- SW 的 `activate` 调了 `clients.claim()` —— 这是 v63「双刷」问题的成因，
  修在调用侧（`core-drink.js` 的 `hadController` 判断），不要动 SW 这行。

---

## 八、常用验证命令

```powershell
# 构建（同时同步 ?v=）
node build-bundles.js

# 全量回归（需先 node server.js）
$env:NODE_PATH="C:\Users\NOC\.workbuddy-ai\binaries\node\workspace\node_modules"
node "C:\Users\NOC\AppData\Local\Temp\opencode\juice-final2.cjs"

# 排行榜全流程（含离线验证）
node "C:\Users\NOC\AppData\Local\Temp\opencode\lb-test.cjs"

# 资源引用完整性（缺失 / 孤儿）
node "C:\Users\NOC\AppData\Local\Temp\opencode\ref-check.cjs"

# 线上巡检
node "C:\Users\NOC\AppData\Local\Temp\opencode\online-smoke.cjs"
```

线上版本核对（部署后必做；当前代码为 v100）：

```bash
# 1. 等 SW 版本号变成新版本
curl -s https://juice.noooc.dpdns.org/sw.js | grep CACHE_NAME
# 2. 带 cache-buster 拉线上 bundle，确认新规则真的在里面
curl -s "https://juice.noooc.dpdns.org/js/app.bundle.js?v=100" | grep -c "你的新代码特征"
```

> 注意：这些脚本在 `C:\Users\NOC\AppData\Local\Temp\opencode\`，
> **Temp 目录可能被系统清理**。如果找不到了，脚本里的断言逻辑值得重新写，
> 但第五节记录的**踩坑点请务必保留**。


---

## 附：2026-10-30 凌晨多 agent 审查轮的存量变更（v493→v509）

本节记录一轮 8 个 subagent 交叉审查后的结构性变更，供后续会话快速对齐：

### 背单词（vocab.js / vocab-data.js，v502+）
- 拼写阶段（2026-10-30，v524+）：设置「拼写阶段」开关，开启后 steps() = 英选中→中选英→拼写→自评；
  会话快照按 item.kind 存题型，中途切设置不影响进行中的局。拼写屏 #vcSpellInput/#vcSpellSubmit，
  出题即 TTS 朗读，大小写/首尾空白不敏感。
- e2e 现共 9 套 101 项：verify-vocab{,-keys,-stages,-redo,-ui,-vague,-resume,-persist,-spell}。
  控制台断言需过滤 429（榜单限流是正常响应）。
- 调度已从 Leitner 盒子升级为 **FSRS-4.5 简化版**：每词 {S 稳定性, D 难度, due, last, reps, lapses, st}；
  官方 17 权重硬编码在 vocab.js 顶部；落档唯一入口是自评阶段 commitWord → commitReview
  （客观题阶段不落档——同词一局升 3 档的旧口径已废弃）。
- 存档 ver=3：loadState 走 migrateV3（v1 分支要先把 state.ver 置 2 再迁移，踩过：emptyState 已是 3 导致跳过）。
- 会话可续局：state.session 快照（words/stage/qi/stageQueue/redoSet/stats/counted），
  今日页 resumeAvailable() 出「继续上局/放弃重排」；切词库/清空/整局完成时清理。
- 老坑已修：restoreView 必须重挂键盘监听（destroy 摘掉后 keyBound=false）；导入备份白名单化；
  accuracy 口径统一（自评认识=答对）；streak 显示改 streakFromDays() 按 days 表回溯。
- e2e：scripts/verify-vocab*.js 共 8 套 110+ 断言，CHROME_PATH 环境变量可覆盖浏览器路径。

### 坦克防线（manual-tank.js / manual-tank-stages.js）
- 引擎独立文件，SMGameKit 复用；规则按 NES 原版（见文件头版权注）。
- 帧率无关概率 perFrame(p,dt)；碰撞 20px 子格；敌人尸体 0.8s 占槽；出生不查占用。

### 全站竞态修复
- core-drink 摇杯 / lingqian 摇签的定时完成回调必须检查 .app-module.active 再 replaceView，
  否则跨模块劫持路由（12 题结果丢失的根因）。新模块的异步完成回调一律照此加闸。
- music saveLive 拆双键：LIVE_KEY 只在队列/曲目变化时写，位置进 POS_KEY 每 2s 写。
- lx 内置音源并行加载（串行时单个失效 12s 连坐）。

### 循环收口（2026-11-02 04:16，第五轮）
- 终验 round4-final.md：通过 9/不通过 3（均陈旧截图，已重摄归档）/新问题 0；
  歌词亮度终值实测精确命中 0.52/0.62、credits 过滤全过、键盘提示胶囊 5.05:1
- renderHome rAF 合帧、tx 来源名对齐 chips、数字歌名导入修复（d5c23af/090c9f1）
- 测试腐化清理：verify-vocab-ui/redo/stages 计数断言跟随「本局」前缀（9500590），
  全量 13 套 e2e 绿
- 仍开放（P2/P4，下轮候选）：LRC 首句标题元数据行可选过滤、0 进度手柄隐藏、
  榜单 chip 右缘渐隐、切歌 renderHome 行级增量化、队列面板深检（已补拍一次）

### 音乐+单词深度审计（2026-11-02 凌晨，6 报告 71 项 → 3 轮修复）
- 报告：shots/audit/round2-{music-pc,music-mob-bg,music-code,vocab-pc,vocab-mob-bg,vocab-code}.md
  + round3-regression.md（回归验收 10 生效/2 未生效→已补修/1 新 P3→已修）
- 单词 P1×9 全修：拼写硬死局（非 a-z 词降级英选中）、空阶段冻屏（while 跳过）、
  destroy 不落快照双计、objectiveMiss 跨阶段丢失（missSet）、损坏 JSON 备份 .corrupt 等
- 音乐 P1×5 全修：弹层跨模块残留、收藏键 undefined、音量落盘降频、
  播放条进度可发现性、浅色 --ok；LRC credits 过滤（new RegExp 构造规避转义地狱）、
  歌词亮度单维度化（opacity 与 color alpha 双重叠加曾致实际 0.3）
- saveState 300ms 合帧 + stateDirty 标记（pagehide 无改动不落盘——
  否则会把测试/导入刚写的 localStorage 用内存旧态覆盖）
- 手机两行式顶栏 + --gnav-h 变量（modules-viewport/--subnav-top 跟随）
- 已知未修 P2：来源 chips 无右缘渐隐、音量滑杆不外露、沉浸退出无手势提示、
  排行榜末行切半（滚动容器）、切歌 renderHome×3 增量重构

### 全站 UI 视觉审计（2026-11-01，4 子 agent × 120 张截图）
- 矩阵：{暗,亮}×{PC 1920,手机 390}+浅色壁纸组合；脚本 scratch/ui-audit-shoot.js 可复跑
- P0[object Object] 为审计 seed 误构（days[date] 应存数字），非产品 bug
- 已修 P1：手机导航横滚两端渐隐、坦克 HUD 按钮 44px、奶茶 CTA 对比度、
  壁纸模式裸排文字兜底（text-shadow）+ 弹幕墙空态衬底
- 已修 P2：答题圆按钮/奶茶圆钮 44px、排行空态收敛、片单打开/复制 44px
- 未修记录：壁纸模式页眉/页脚 meta 仅 text-shadow 兜底（P2）、decision 转盘
  扇区文字对比度（P2，类名待定位）、 merit 祝福语 chips 触控（P2）、
  「推荐祷词」来自远程影视数据非本地文案
- 复核翻案：坦克 tk-mini min-height:44px 实测已生效（mob-light 报告的 38px 为旧图误测）；
  「党日常第一直觉」源码本为「凭日常」，agent 低字号粗体下误读
- 批次 B：弹幕墙画布引导文字固定浅色 #B9C4D6（画布恒深底，浅色主题下不再深底压暗字）、
  壁纸版权行 .daily-wp-meta 加深色投影

### 全站审计轮（2026-11-02 深夜，v606-v611，R1-R4）
4 个并行 agent 逐行审计（音乐 4229 行全读、vocab 全读、全站 UI/文案、TV 打磨）+ 双端视觉扫查。要点：

**已修（均已上线验证）**
- 音乐 P0：saveState 写未定义 STATE_KEY，歌单/收藏/音量自 08dc2ba 起静默失效 → e2e 验证恢复。
- 音乐 P1/P2：取址等待期 resume 旧歌；歌词开关重建后失效；`/s+/g` 正则笔误；导入文案 4 平台实为 2；
  沉浸页 0 进度手柄；触屏音量只能静音二值（静音键唤出滑条）；排行榜移动端纵向 mask 削 chips。
- 全站：弹幕墙首屏失败与空墙不可区分（失败态+重试）；关于弹窗 15 关/11 款→16 章/12 款；
  films-status 浅色底；nav 断点 768/767 统一；iOS 底部安全区；触屏热区外扩（顶栏 tab/
  音乐控件/时钟/片单/弹幕墙/决策）；弹幕墙 mod-ac 主题块；Space 劫持按钮焦点；队列自动续播
  不打断浏览；单条删除加确认；og/meta/关于弹窗/profile 文案。
- TV（离线打磨，安全级）：Worker SSRF——safeFetch 逐跳复核重定向 + isPrivateHost 补整数 IP/
  尾点/hex 变体/IPv6 方括号（7 变体全 403）；UPSTREAM_TIMEOUT 只管到响应头；HEAD 播放列表；
  dead/staticOnly 按可用播放池判定（自定义源不再被拒播）；hlsLoading 失败复位；checkSource
  跳过 master 播放列表 + 分片时长自适应窗口；token 单一所有权；URL 清洗（$LR•IPV4 junk 截断，
  中文路径保留）；STATIC_BLACKLIST 合并单条正则 + lantian 漏标告警；verify-tv TV_SKIP_UI=1。
- 背单词：导入放行 wrong-only 记录；saveStateNow(force)（switchBook/persistSession 不被
  dirty 守卫吞掉）；标熟词不复活进补练轮；续局恢复 missSet；导入恢复 spell 开关；
  拼写输入框补 Esc/空格；词书学完空态文案；TTS 缺失题面降级；vc-tab/speak/mini 触控 44px；
  壁纸+触屏不露键盘提示。9 套 e2e 101 项全绿。

**R5-R11 追加（同夜后半段）**
- 说明书：数独 clearState 写未定义 saveKey()（通关存档清不掉→重复上榜）；router Space 改
  stopImmediatePropagation（蛇开局自暂停/方块幻影硬降）；质检 600ms 加模块守卫；2048 死局撤销
  重新可记分；resumeGame 补 showScreen + 2048/坦克 keydown 活动屏守卫；报告卡 3 处全角逗号 rgba；
  蛇 dir 存档校验 + 2 深度方向队列 + 画布移动端等比。
- 时钟：正班时段付费加班只补 (otMult-1) 差（原 1x+1.5x=2.5x 双倍计薪）；假日表按存储年份计算；
  跨零点班次窗口；发薪日 29-31 不再钳 28。木鱼：后台标签不刷功德、跨零点清今日。
- 风向：UTC 日期改本地时区；锁屏 alert 改 juiceNotice。奶茶：契合度公式自证恒真 99% →
  按满分答案向量归一；三处条宽口径统一 maxP。灵签：印章 measureText 自适应。
- Canvas 导出统一：esc.js 新增 juiceExportCanvas（安卓壳→Web Share L2→a.download，接受
  canvas/dataURL）+ juiceNotice（单例 toast）；12 处裸 a.download 全部迁移（WebView 跳页风险）。
- 排行/档案/资料卡：lb-panel 换榜竞态（迟到响应丢弃）；leaderboard 超时改 AbortController；
  vocab 三榜上报加 8s 超时；profile.set 补清洗；档案删除确认显示 badge；sfx 覆盖 interrupted 态。
- R9 复查（对我自己修复的 meta-review）抓出 1 个 P0：扫雷 settle 被我误改名 finish 与证书版
  遮蔽、丢 stopTimer → 每局 ReferenceError 不提交。已恢复 + 新增
  scripts/verify-minesweeper-settle.cjs 真实对局回归。教训：**大改动后必须跑真实对局级回归，
  node --check 只能抓语法**。

### 小说书架模块（已下线：2026-11-07 上线 v627，次日用户验收 UI 后要求整体摘除；引擎代码见 git 历史 eedee8f）

**下线原因**：用户验收时发现（1）JS 自渲染模块漏渲染解压子导航条，切进来后其余 5 个子模块入口全部消失（动态按钮也接不上 router 的一次性绑定）；（2）PC 空态排版不达标。修复后用户仍决定整体下线。

以下为上线时的实现记录（供日后若重启该功能参考）：
- **定位**：legado/eso 书源聚合搜索 + 阅读器。站内**不内置任何书源与正文**（同音乐「不内置音源」原则；
  legado 作者 2026-03 因书源分发被判刑，分发书源是红线），书源由用户在「书源管理」粘贴 JSON 或直链导入。
- **引擎**（自研微引擎，规避 GPL：any-reader 内核 GPL-3 会传染整个仓库，故不引内核只兼容其规则格式）：
  `js/modules/novel.js`。支持 CSS 规则（`.a b@text`）、legado 经典链（`class.x / id.x / tag.x.0 / text.文案`、
  `@` 分段）、JSONPath（`$.a.b[0]` / `$.a[*].b`，API 型源，裸 key 兼容）、`##re##替换` 后置过滤、
  `@text/@textNodes/@href/@src`；`searchUrl` 支持 `{{key}}/{{page}}` 与尾部 `,{"charset":"gbk","method":"POST","body":...}`。
  **不支持** `<js>/@js:/{{js}}`（明确报「该源使用了 JS 规则」）。GBK 解码走 TextDecoder（探测顺序：
  URL 选项 → 响应头 → meta charset → utf-8）；GBK **编码**（搜索词）未实现，此类站中文搜索可能不准（已知限制）。
- **网络**：全部走 `api/proxy.js` 的 `kind=api` 通道（复用音乐代理：SSRF 内网拦截 + 80/443 + 8MB + nosniff）。
- **UI**：书架 / 搜书 / 详情(目录) / 阅读器 四屏（`.nv-screen`，AppRouter.replaceView 驱动，浏览器返回可用）。
  进度按章落档（lastCi/lastChName），刷新恢复；字号 14-30；正文广告行过滤（请记住/首发域名/天才一秒等）。
  存储 `juice_novel_v1`：sources ≤20、shelf ≤60；目录缓存会话内 Map。
- **挂载**：`#mod-novel`（空 section JS 自渲染）；解压 5 条子导航尾加「📖 小说」；
  router 四表 + lastRelaxMod；build chunks novel + moduleCssFiles novel.css；主题色翠绿 #10B981（nav.css）。
- **测试**：`scripts/verify-novel.js` 30 项（引擎单测 18 + e2e 12：导入→聚合搜索(mock)→书架→目录→
  正文跨页拼接→下一章→进度恢复→移动端）；verify-scratch-merge 子导航计数断言已同步 5→6。
- **已知限制**：不支持 JS 规则书源；GBK 搜索词编码；目录/正文规则极端写法（如 @js 混排）会明确报错而非静默。

**R12（2026-11-05 上午，v625，4 个只读代理并行 + 暗/亮双端视觉巡检）**
- 音乐：queueBtn.onclick 把 Event 当 inImmersive（面板误带 in-immersive 类）；
  刷新还原过滤本机曲目时按 kind 丢弃（blob 已在存档清空，原判断永远不命中，空 src 报「播放失败」）；
  搜索行时长 esc(dur)；打开队列补 scrollIntoView；Esc 逐层退出（加入歌单>确认>队列>沉浸）；
  网易云歌单正则限定 playlist/discover 路径（不再误吞 /song?id=）；
  联想迟到响应守卫（点空白关掉的下拉不再被热词弹回）；LRC credits 正则提为模块常量；
  播放条静音键补触屏 vol-open + 全局点外部收起；删 2 处浏览器禁改的 Referer 头；文件头注释同步现状。
- 背单词（重点）：**P1** makeQuestion 里 `w.word` 应为 `w[0]`（词库是数组），
  拼写降级守卫从未生效，23 个含连字符/空格词（ice cream / up-to-date…）出拼写题无解；
  已在 verify-vocab-data.js 加数据级 + 代码级双断言防复发。
  migrateV3 对无 box 的 wrong-only 记录不再伪造 S=0.5/last=0（否则首次答对间隔暴涨到 16 天）；
  排行榜 score/acc 补 esc；fetchRank 加 8s 超时（弱网不再永久 rankLoading）。
- 全局横切：scratch 海报、塔罗预览弹窗两处裸 a.download 迁移 juiceExportCanvas；
  about 弹窗补 Esc/点遮罩关闭；CET-6 词数 3991→4036（实测词库）；
  搜索历史删除钮触屏热区 20→40px；daily 删死读取 daily_site_active_fix。
- v619-624 复查：清空档案后保留「全部」chip（否则空分类里退不出去）；
  塔罗结果按钮断点 ≤640 → ≤767（补齐 641-767 空档，700px 实测）；
  pair 子导航补 flex-wrap 兜底（超大字号不溢出圆角壳）。
- 视觉验收：暗/亮 × PC/手机 × 16 模块 64 张截图 0 pageerror；
  另补 430 音乐/单词、700 塔罗、430 档案空态 4 张定点复查。
- 回归：vocab 11 套件 139 断言、history 14、tarot 11、wall 5、scratch 15、films 11、
  扫雷真实对局，全部通过。构建 v625。

**明确不修/待拍板**（避免后续重复排查）
- 音乐 ~300 行死代码（本机文件/Audius 路径）与 music.css 前 716 行旧层：整块删除有回归风险，留专项。
- 音乐 #16 队列 scrollIntoView 已改为「打开/点行时武装」启发式；若仍嫌打断可再收紧。
- 弹幕墙/档案单条删除确认（已加）若嫌打断可改「撤销 toast」。
- 全站断点 30+ 档收敛、模块编号重排、省略号/冒号风格统一：低价值高扰动，搁置。
- 决策类：音乐死代码去留、TV 容量定稿（CF 出口 403 未解）、TV 重上线时机。

### CSS 生效链陷阱（2026-10-31）
- css/style.css 是死文件（页面不引用、build-bundles.js 的 coreCssFiles 不含它），
  首屏实际样式是 css/base.css（minified 全量）。改 style.css 完全无效。
  文件头已加废弃横幅。改 quiz/cover/result 等首屏样式要对 base.css 做
  精确字符串替换，改完跑 npm run build 看 core.bundle.css 里是否包含新值。

### 导航与弹幕墙（2026-10-31，v536+）
- 弹幕墙不再有顶栏独立入口（9 tab -> 8 tab），并入摸鱼解压子导航（时钟/木鱼/片单/刮刮乐/弹幕墙）。
- #/wall 直达仍有效；router 的 MOD_PARENT_MAP.wall='clock'（顶栏归组高亮），
  lastRelaxMod 记忆含 wall（点「摸鱼解压」回到上次子项）。
- 五处子导航按钮在 index.html 静态骨架里（clock/merit/films/scratch/wall 各一份），
  改子导航清单要五处同步；router 的 [data-sub-jump] 高亮按 modKey 自动匹配，无需注册表。

### 电视直播（#/tv，暂时下线，v605）
**v605 下线状态**：入口已从 `index.html`（5 处子导航 + `#mod-tv` section）、
`router.js`（ALLOWED_MODS / MODULE_CHUNKS / MODULE_API / MOD_PARENT_MAP / 离开暂停钩子）、
`build-bundles.js`（tv chunk / tv.css / hls 指纹）、`vercel.json`（/api/tv rewrite）摘除。
`api/tv.js` 移到 `tv-worker/vercel-proxy.js`（不在 api/ 下，Vercel 不部署）。
`js/modules/tv.js`、`css/modules/tv.css`、`js/vendor/hls.min.js`、`tv-worker/` 保留；
重新上线按 README 的 checklist 恢复接线，再跑 `scripts/verify-tv.js`。

旧 TV 模块（v208）因源站 H.264 SPS 不合规、原生与 MSE 都绿屏，已在 `e8e7557` 整体回滚。
v600 起不复用旧播放器：功能移植自 `iptv-web`，**UI 完全重写为 juice 原生风格**（不再用 iframe）。

```
juice 静态 (Vercel)
  #/tv → #mod-tv（原生 DOM：播放器卡 + 频道侧栏）
        js/modules/tv.js
          → /api/tv（Vercel 同源流式转发，解决 workers.dev 被墙）
            → Cloudflare Worker (tv-worker/)
               /playlist  内置频道表（只给 /media?cid&i 不透明地址）
               /media     按 cid/i 取真实地址，m3u8 重写为 /proxy
               /proxy     HLS 分片流式透传（http 上游 / Range / 206）
```

- 原生模块：`js/modules/tv.js` + `css/modules/tv.css`；`#mod-tv` 静态骨架在 `index.html`。
  不再有 `tv/` 目录、iframe、`tv/config.js`。
- hls.js 按需加载 `js/vendor/hls.min.js`（首次点播时才插入 script），首屏不拉 624KB；
  `build-bundles.js` 的指纹包含该文件。
- 所有 DOM ID 以 `tv` 前缀（`tvVideo` / `tvChannels` / `tvNowName`…），
  键盘快捷键只在 `#mod-tv.active` 时生效，且输入框聚焦时跳过，不污染其他模块。
- 离开 `#/tv` 时 `router.activateModule()` 调 `AppTv.pause()` 暂停视频并关闭清晰度/自定义源浮层；
  返回不自动续播。
- 子导航现有 **6 处**（clock/merit/films/tv/scratch/wall 各一份），改清单要六处同步。
- 频道合并、`baseName/keyOf/resInfo/mainGroupOf`、多源托底、8s/20s 看门狗、
  清晰度切换、收藏/最近、搜索、自定义 M3U 源都从旧播放器移植；
  收藏/最近沿用 `iptvweb.favs` / `iptvweb.recent`，老数据可直接读。
- **静态回放源（v603）**：浙江广电 `ali-m-l`/`ali-vl` 的 channel21（CCTV-13）、
  channel001/channel10/channel01（浙江卫视）、channel008（浙江少儿）是冻结的 m3u8，
  MEDIA-SEQUENCE 不前进、PROGRAM-DATE-TIME 停在 2023/2025。构建脚本用
  `STATIC_BLACKLIST` 打 `static` 标记，客户端不把它们放进候选池；
  浙江卫视保留 `ali-xwl` 实时源；没有实时源的频道显示「仅静态回放/无实时源」。
  运行时还会在播放后检查日期/12 秒内序列是否前进，未知静态源自动切走。
  点击 static/dead 频道会 `stopPlayback()`：暂停、销毁 hls、移除 src/load，清掉上一路画面，不会出现「错误遮罩盖着上一个频道还在播」。
  `scripts/verify-tv.js` 有「浙江卫视保留非静态源 / 浙江少儿全部静态」断言。
- 数据：`scripts/tv-src/{extra,verified}.m3u` → `node scripts/build-tv-data.js` →
  `tv-worker/src/data.js`（gitignore）。83 个频道 / extra 185 条 / verified 原始 194 条
  （其中 2 条 TVU 测试卡被黑名单剔除，实际 192）。
- 本地：`npm run tv:dev`（127.0.0.1:8787）+ `node server.js`（3456），打开 `#/tv`。
  `scripts/verify-tv.js` 覆盖 API、83 频道、CCTV-1 1080p 真播、非全绿、离开暂停、手机布局。
- 线上：`TV_API` 默认 `/api/tv`；`api/tv.js` 的 `WORKER` 常量指向
  `https://juice-tv-proxy.2280762725.workers.dev`。`localStorage.tvApiBase` 可临时直连 Worker。
  `npx wrangler login` → `npm run tv:deploy` → `npm run build` → 推 Vercel。
- **/api/tv 同源转发（v601）**：浏览器只访问 juice 域名，Vercel Node 函数 `api/tv.js`
  用 `Readable.fromWeb` 流式转发到 Worker，转发 `Range`/`If-Range`；只允许
  `/ping|/playlist|/media|/proxy` 四个 path。函数设置 `Origin: https://juice.noooc.dpdns.org`
  和 `X-TV-Public-Base: /api/tv?path=`，Worker 的 `publicUrl()` 据此把频道/分片地址生成为
  同源 `/api/tv?path=…`，因此国内浏览器不需要直连 `workers.dev`。
  代价：电视流量经过 Vercel（Hobby 100GB/月），长期大流量应把 `TV_API` 指向自定义域名/VPS。
- Worker 关键约束：免费版 10 万请求/天、10ms CPU、无大陆节点；源大量用 82/85/8181
  端口，`wrangler.toml` 必须带 `compatibility_flags = ["allow_custom_ports"]`；
  Cloudflare 对 IP 字面量/非标端口的 fetch 行为要部署后实测。
- 安全：Worker 只接受 `Origin/Referer` 白名单（`ALLOWED_ORIGINS`），阻断私网/回环/
  链路本地地址；`/media` 不下发真实频道地址。`scripts/tv-src/*.m3u` 含源站 key/auth，
  已 gitignore；需要分发时手动 `git add -f` 并确认可公开。
- `api/proxy.js` 是音乐模块的音频代理（8MB / 10s / 80-443），**不要**拿它当 HLS 代理。
- PWA `manifest.json` 仍是 `orientation: "portrait"`；电视全屏横屏在安装版 PWA 里可能受限，
  需要真机确认，未改。
- **Cloudflare 出口实测（2026-11-02，v604）**：Worker 已部署到
  `https://juice-tv-proxy.2280762725.workers.dev`。83 个频道各取首候选探活：
  **30 个 200 / 53 个非 200**；CCTV-1 的 13 条候选全部 `upstream 403`，
  CCTV-2~17 也基本全 403；CCTV-13、浙江卫视、部分卫视/少儿/CGTN 可播。
  原因是源站按出口 IP 封锁 Cloudflare 数据中心段（同一地址本地住宅 IP 可播）。
  `TV_API` 可切到家庭/VPS 上的 `tv-worker/dev-server.mjs`；
  要全量 CCTV，需要隧道/VPS，不能只靠 Worker。



---

*本文档随代码一起版本管理（仓库根目录，`.vercelignore` 已排除，不会部署上线）。
修改前请先核对第四节（层叠陷阱）与第五节（测试教训）是否仍适用 ——
这两节是本项目真正的知识资产，其余内容随代码演进容易过期。*
