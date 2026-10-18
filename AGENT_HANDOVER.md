# juice 项目交接文档

> 更新：2026-10-18 · 覆盖至 v98（`49ba66b` 之后）
> 适用对象：接手本项目后续开发 / 维护的 agent 或人
>
> 本版所有数字均为**实测核对**。v65 以来新增了完整的全服排行榜后端、
> 说明书从 8 章扩到 10 章、首屏性能重做；v95 完成了文档对齐与 Daily 数据源迁移；
> v96 把非首屏模块拆成按需 chunk，并把农历库移出首屏；
> v97 把首屏 CSS 收窄为核心包，并把主脚本提前到 `<head>` 发现；
> v98 修复模块 CSS 未加载时 Clock 屏保层遮挡首页首屏的问题。
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
- `build-bundles.js` 从 `sw.js` 读版本号，**原样抄**到 `index.html` 的 `?v=`，
  **它只抄不递增** —— 版本号必须手改 `sw.js`；chunk URL 也带同一版本号，
  避免 Vercel 的 immutable 缓存拿到旧 chunk。
- 源文件数量：CSS 15 个、JS 24 个。`js/libs/lunar.js`（436,144 B）是 bazi 强依赖，
  v96 起从主包移出：bazi chunk 内含它；只有进入 Daily / Clock 后才按需加载
  `js/chunks/lunar.js`，供两处农历显示。
- 首屏主包只含：`core-drink.js`、`sfx.js`、`daily.js`、`profile.js`、
  `leaderboard.js`、`lb-panel.js`、`history.js`、`router.js`。

### v97 首屏体积（本地构建实测）

| 资源 | 原始 | Brotli q11 | 说明 |
|---|---:|---:|---|
| `index.html` | 129,276 B | 27,190 B | |
| `css/core.bundle.css` | 78,237 B | 15,360 B | base + nav + history |
| `js/app.bundle.js` | 423,079 B | 95,582 B | 仅首屏核心 |
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
| 顶层导航 Tab | **7** | `index.html` 的 `button.nav-tab[data-mod]`：`drinks manual tarot clock decision daily scratch` |
| 实际路由 | **13** | `js/modules/router.js` 的 `ALLOWED_MODS`：`drinks milktea manual fengshui tarot lingqian decision clock merit lifeguide bazi daily scratch` |
| `#mod-*` section | **12** | 无 `mod-lifeguide`（已并入 manual）、无 `mod-history`（抽屉） |

`MOD_PARENT_MAP` 只决定**顶栏哪个 Tab 高亮**，不决定激活哪个 section：
`milktea→drinks`、`tarot/lingqian/bazi/fengshui→tarot`、`clock/merit→clock`、
`lifeguide→manual`。激活 section 时先找自己的 `#mod-<key>`，找不到才回退父级。

`lifeguide` 是唯一没有独立 section 的路由：老链接 `#/lifeguide` 会先进说明书，
再 `AppManual.openTest('lifeguide')` 翻开第 05 章。保留它只为兼容旧链接。

### 说明书章节（10 章，`js/modules/manual-data.js`）

| # | id | 类型 |
|---|---|---|
| 01 | `social-battery` | 问答 |
| 02 | `procrastination` | 问答 |
| 03 | `slacking` | 问答 |
| 04 | `night-owl` | 问答 |
| 05 | `lifeguide` | 外链章节（人间清醒指南） |
| 06 | `reaction` | 小游戏（反应速度） |
| 07 | `color` | 小游戏（色彩敏锐度） |
| 08 | `game-2048` | 小游戏（2048） |
| 09 | `minesweeper` | 小游戏（雷区排险，三档难度） |
| 10 | `schulte` | 小游戏（舒尔特方格，三档难度） |

> `index.html` 的 `#sm-homebody` 现在只保留空容器，章节目录完全由
> `manual.js` 的 `renderHome()` 按 `SM_ORDER` 渲染，不再维护第二份 8 tile 骨架。
> `#sm-rail-sum` 的静态文案已同步为 10 章，运行时仍由 `updateSummary()` 覆盖。
> 详见第五节教训 14。

### 图片资源（实测）

| 目录 | 文件数 | 体积 | 说明 |
|---|---|---|---|
| `assets/tarot/` | 22 | 7,292 KB | 塔罗大阿卡纳立绘 |
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

### B. 说明书扩到 10 章

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

前端在 503 / 超时时自动退回本机战绩（`lb-panel.js` 的 `localRows`）。

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

---

## 六、已知遗留问题

1. **`assets/mbti/` 16 个 `.png` 无任何引用**（与同名 `.webp` 内容不同）。
   历史遗留，删不删你定。
2. **`lunar.js` 还有 426 KB**（436,144 字节），是真实农历库不是图片。
   被 bazi 强依赖，动态加载风险高于收益，暂未动。若要继续瘦身，这是最大目标。
3. **`css/modules.bundle.css` 350 KB**：v97 已把首屏 CSS 降到 78 KB，
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
10. **`assets/tarot/` 7.3 MB** 仍是最大的静态资源块。首屏只懒加载，
    但塔罗模块首次进入仍需拉取立绘，弱网下体验一般。

---

## 七、部署

- **推 `main` 即自动部署**（Vercel 已连 GitHub），无需手动触发。
- `vercel.json` 的 `builds` 段必须保留：它从配置层面禁掉函数部署（只留 `api/**`）。
  项目有历史遗留的 Node 配置（早期 CLI 部署产生），靠这段兜住。
- `/api/leaderboard` 通过 rewrite 指向 `/api/leaderboard.js`。
- 缓存头：`sw.js` no-store；`index.html` must-revalidate；
  css/js `public, max-age=31536000, immutable`；assets 7 天 + 30 天 SWR。
- 改了 `css/` 或 `js/` **必须 `npm run build`**，否则线上拿到的还是旧 bundle。
- **改了任何 css/js 都要先手改 `sw.js` 的 `CACHE_NAME` 版本号**（当前 v98），
  否则回访用户命中旧缓存看不到改动。这个坑踩过两次。
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

线上版本核对（部署后必做；当前代码为 v98）：

```bash
# 1. 等 SW 版本号变成新版本
curl -s https://juice.noooc.dpdns.org/sw.js | grep CACHE_NAME
# 2. 带 cache-buster 拉线上 bundle，确认新规则真的在里面
curl -s "https://juice.noooc.dpdns.org/js/app.bundle.js?v=98" | grep -c "你的新代码特征"
```

> 注意：这些脚本在 `C:\Users\NOC\AppData\Local\Temp\opencode\`，
> **Temp 目录可能被系统清理**。如果找不到了，脚本里的断言逻辑值得重新写，
> 但第五节记录的**踩坑点请务必保留**。

---

*本文档随代码一起版本管理（仓库根目录，`.vercelignore` 已排除，不会部署上线）。
修改前请先核对第四节（层叠陷阱）与第五节（测试教训）是否仍适用 ——
这两节是本项目真正的知识资产，其余内容随代码演进容易过期。*
