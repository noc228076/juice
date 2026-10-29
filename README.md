# 饮料人格研究所 · 趣味实验矩阵 🍹

纯静态网页趣味测试矩阵，包含 9 大顶栏模块 / 16 个功能区块，支持 PWA 安装。

| 项 | 内容 |
|---|---|
| 定位 | 纯前端趣味测试 / 玄学 / 轻游戏合集 |
| 技术栈 | 原生 HTML + CSS + JavaScript，无框架、无运行时依赖 |
| 构建 | 自研打包脚本（`build-bundles.js`）+ esbuild minify，Node 仅用于本地静态服务 |
| 运行环境 | 任意现代浏览器（Chrome / Edge / Safari），Node ≥ 24 仅用于本地开发 |
| 部署 | Vercel 静态托管，连接 GitHub `main` 自动部署 |

---

## 📦 功能模块

顶栏 9 个胶囊标签，部分标签下挂有子导航条，视图状态同步到 URL hash（`#/<模块>`）。

### 1. 🍹 饮品测评
- **`drinks` 16 款灵魂特调** — MBTI × 饮料人格，四维度计分裁定 16 型人格配方
- **`milktea` 奶茶人格配方** — 26 个品牌 logo + 人格解析

### 2. 📖 自我说明书
`manual` — 16 章出厂说明书，分问答型（4 章）与小游戏型（12 章）：

| # | 测试 | 英文名 | 类型 |
|---|---|---|---|
| 01 | 社交电池电量测试 | SOCIAL BATTERY | 问答 |
| 02 | 拖延症类型鉴定 | PROCRASTINATION | 问答 |
| 03 | 摸鱼段位测试 | SLACKING RANK | 问答 |
| 04 | 熬夜类型鉴定 | NIGHT OWL | 问答 |
| 05 | 反应速度擂台 | REACTION ARENA | 交互小游戏 |
| 06 | 色彩敏锐度挑战 | COLOR ACUITY | 交互小游戏 |
| 07 | 数字合体 2048 | 2048 PUZZLE | 交互小游戏 |
| 08 | 雷区排险 | MINESWEEPER | 交互小游戏 |
| 09 | 舒尔特方格 | SCHULTE TABLE | 交互小游戏 |
| 10 | 定位射击靶场 | AIM TRAINER | 交互小游戏 |
| 11 | 数独 | SUDOKU | 交互小游戏 |
| 12 | 数字华容道 | SLIDING PUZZLE | 交互小游戏 |
| 13 | 俄罗斯方块 | TETRIS | 交互小游戏 |
| 14 | 贪吃蛇 | SNAKE | 交互小游戏 |
| 15 | 泡泡猫泡泡龙 | BUBBLE CAT | 交互小游戏 |
| 16 | 坦克防线 | TANK DEFENSE | 交互小游戏 |

> 第 16 章的引擎独立在 `js/modules/manual-tank.js`，按 1985 年 NES 原版规则实现：
> 数值逐条对照 ROM 反汇编（`feichao93/battle-city` 的 `resources/nes-values`），
> 35 关地图与每关敌军配置来自该 MIT 项目的 `src/stages`，版权与许可声明保留在文件头部。

### 3. ☯️ 东西玄学
四个子屏通过「西方塔罗 / 东方灵签 / 生辰八字 / 工位风水」切换条互跳：

- **`tarot`** 西方塔罗 — 22 张大阿卡纳，支持单牌 / 三牌流程、正逆位、Canvas 海报导出
- **`lingqian`** 东方灵签 — 学业事业姻缘健康综合测算
- **`bazi`** 生辰八字 — 四柱排盘
- **`fengshui`** 工位风水大师 — 每日老黄历 + 工位方位建议

### 4. ⏰ 摸鱼解压
- **`clock`** 摸鱼时钟 & 工资 — Fliqlo 机械大翻页全屏钟屏保，含农历日期显示
- **`merit`** 功德木鱼 & 碎纸解压 — 静心功德局，电子木鱼 + 怨气粉碎机
- **`scratch`** 幸运刮刮乐 — 刮刮卡抽奖，支持即时结算与中奖记录（并入摸鱼解压子标签）

### 5. 🪙 纠结拯救
`decision` — 转盘决策 + 终局裁定单（可写批注，生成裁定小票）

### 6. 🗞️ 今日风向
`daily` — 今日风向标，每日灵感补给站（时间看板 + 运势播报）

### 7. 💬 弹幕墙
`wall` — 一人一句留言上墙，弹幕循环展示，数据存服务端（Upstash，未配置时本地内存模式）

### 8. 📚 背单词
`vocab` — 四六级词库（KyleBing BSD-3 数据源），三阶段流程（英选中 → 中选英 → 自评）+ Leitner 间隔重复 + 生词本 / 标熟，进度存本机

### 9. 🎵 我的音乐台
`music` — 多平台聚合音乐播放器，音源内核移植自 [lx-music-desktop](https://github.com/lyswhut/lx-music-desktop)

**搜索**：酷我 / 酷狗 / 企鹅 / 网易云 / 咪咕 五平台并行搜索，结果按相关度合并去重；输入时给出各平台热词建议，空输入才显示搜索历史（可单条删除或清空）。网易云走公开接口 + eapi 签名（AES-128-ECB 已按 NIST 向量校验），海外出口自动回落 `api/search/get` 明文通道。

**播放**：播放地址由导入的音源脚本提供（脚本跑在 iframe 沙箱里，只负责把歌名换成直链）。音频经 `blob:` URL 播放，避免 IDM 等下载器按 `audio/*` 嗅探劫持。

**播放条**（固定底部 64px）：封面可点进全屏、标题、实时歌词、`当前/总时长`、传输控件（绝对居中）、播放模式（单曲/顺序/随机 三态）、音量、播放列表、全屏。点搜索结果时若正在听别的列表，会**插队**到下一首而不打断当前播放。

**我的列表**：收藏 + 自建歌单。支持按 字母 / 歌手 / 加入时间 排序（正倒序），可改名、删除、从歌单移除单曲。

**播放列表**：右下角弹出当前队列，显示来源与总数、高亮正在播的那首，点任意项跳转，**支持拖动排序**（正在播的那首按引用重新定位，不会错位）。

**排行榜**：酷狗公开榜单接口，25 个榜单左右两栏布局——左栏选榜、右栏听歌，每首都有收藏与加入列表按钮。

**歌单导入**：粘贴平台分享链接（如 `https://music.163.com/m/playlist?id=xxx`）直接拉取整张歌单，也支持一行一首「歌名 - 歌手」的文本批量导入。导入时先建歌单占位、顶部显示进度条、每匹配到一首实时出现在列表里。

**全屏播放**：黑胶唱片（有封面时封面转、无封面时唱片转），**暂停时停在当前角度不回正**；右侧可滚动歌词，首末句都能居中；控件分三组左右均衡分布（左：词 / 播放列表 / 收藏，中：上一首 / 播放 / 下一首，右：模式 / 音量 / 退出）；音量是图标 hover 向上弹出垂直滑条并显示数值。背景跟随全站壁纸（`--daily-bg-url`），没设置壁纸时用纯深色。

**歌词**：优先用音源脚本的 `lyric` action（含逐字时间轴），失败则走酷我加密歌词接口——响应体是 `TP=content` 头 + raw deflate + base64 + 与 `yeelion` 循环异或，用 `DecompressionStream` 解密。非酷我来源按「歌名+歌手」搜一个 rid 再取。

**封面**：搜索接口不返回封面，用酷我搜索响应里的 `web_albumpic_short` 拼图床地址，按「歌名|歌手」缓存最近 300 条。

另有 `history` 全局档案中心，通过顶栏「📜 档案」入口访问，聚合各模块历史测评记录。
`lifeguide` 不再是独立顶层模块，而是说明书第 05 章；旧链接 `#/lifeguide` 仍会打开该章。

---

## 🚀 快速开始

```bash
git clone https://github.com/noc228076/juice.git
cd juice
npm start
```

浏览器打开 http://localhost:3456/ 即可。端口由 `server.js` 的 `PORT` 常量控制（当前 3456）。

> 本地改 `api/*.js` 后需要重启 `node server.js`——`require` 有缓存，热改不生效。

也可用任意其他静态服务器：

```bash
python -m http.server 3456
```

> 请通过 HTTP 访问。部分浏览器会限制 `file://` 协议下的 Service Worker 与模块行为。

---

## 🔨 构建

`index.html` 不直接引用 `js/modules/*.js`，只引用打包产物：

```
js/modules/*.js  ──┐
js/libs/lunar.js ──┼─► node build-bundles.js ─► js/app.bundle.js + js/chunks/*.js
                   │
css/modules/*.css ─┴─────────────────────────► css/core.bundle.css + css/modules.bundle.css
css/base.css ──────┘
```

**修改 `js/` 或 `css/` 下的源文件后需重新构建**：

```bash
npm run build
```

**先手改 `sw.js` 的 `CACHE_NAME` 版本号**，再运行 `npm run build`。构建脚本会读出
`sw.js` 的版本号并自动同步到 `index.html` 的 `?v=`，不需要手动改两遍：

| 文件 | 字段 | 当前值 | 谁改 |
|---|---|---|---|
| `sw.js` | `CACHE_NAME` | `juice-persona-v100` | **手动**（唯一真值来源） |
| `index.html` | `?v=` 查询参数（核心 CSS / 主 JS） | `98` | `npm run build` 自动同步 |
| `router.js` | 按需 CSS / JS chunk URL | `98` | 从主包注入的版本号读取 |

首屏只引用 `css/core.bundle.css`（`base + nav + history`）；
其余 14 个模块样式打包为 `css/modules.bundle.css`，首次进入非饮品模块时加载。

---

## 📁 目录结构

```text
juice/
├── index.html              # 页面骨架：顶栏 + 15 个 <section class="app-module">
├── sw.js                   # Service Worker：图片懒缓存
├── manifest.json           # PWA 清单
├── vercel.json             # 构建声明 + 缓存策略
├── server.js               # 零依赖本地服务器（含 api/ 模拟）
├── build-bundles.js        # 打包脚本
├── api/
│   └── leaderboard.js      # 全服排行榜 Serverless 函数（25 个 game key，见下文）
├── favicon.png             # 旧版 192px 图标（已不再被 index.html 引用）
│
├── js/
│   ├── app.bundle.js       # 【构建产物】勿手改
│   ├── esc.js              # 全站统一 HTML 转义（escHtml/escUrl）
│   ├── vendor/             # 【构建产物】morphicons + lucide 图标子集
│   ├── chunks/             # 【构建产物】按需模块包
│   ├── core-drink.js       # 饮品人格核心（计分、Canvas 分享长图）
│   ├── sfx.js              # WebAudio 合成音效引擎（零音频文件）
│   ├── libs/
│   │   └── lunar.js        # 内置农历/干支库
│   └── modules/            # 功能模块，一个模块一个文件
│       ├── router.js               # 全局路由 + 顶栏调度（最后加载）
│       ├── history.js              # 全局测评档案中心
│       ├── milktea.js / fengshui.js
│       ├── tarot.js / lingqian.js
│       ├── bazi.js / bazi-cities.js
│       ├── manual.js               # 自我说明书主控
│       │   ├── manual-data.js      #   └ 题库与结果
│       │   ├── manual-games.js     #   └ 反应擂台 / 色彩 / 2048 / 扫雷 / 舒尔特 / 靶场 / 数独 / 华容道 / 方块 / 贪吃蛇 / 泡泡猫
│       │   ├── manual-tank.js        #   └ 坦克防线（NES 原版规则）
│       │   ├── manual-tank-stages.js #   └ 原版 35 关地图与敌军配置（只读数据）
│       │   └── manual-report.js    #   └ 报告渲染
│       ├── decision.js / clock.js / merit.js
│       ├── profile.js              # 玩家头像 / 昵称
│       ├── leaderboard.js          # 全服排行榜客户端（按 game 分榜）
│       ├── lb-panel.js             # 排行榜面板（各游戏分榜共用）
│       ├── vocab.js / vocab-data.js  # 背单词（三阶段 + 全服榜）
│       ├── music.js                # 我的音乐台主控（播放器 / 列表 / 排行榜 UI）
│       │   └── lx-music/           # 洛雪音源内核（移植自 lx-music-desktop）
│       │       ├── request.js      #   └ fetch + 代理底座
│       │       ├── source-*.js     #   └ 酷我 / 酷狗 / 企鹅 / 咪咕 搜索
│       │       ├── sources.js      #   └ 多平台聚合与相关度排序
│       │       ├── tipSearch.js    #   └ 平台搜索热词
│       │       ├── lyric.js        #   └ 歌词（脚本 action + 酷我加密接口）
│       │       ├── cover.js        #   └ 封面补全与缓存
│       │       ├── discover.js     #   └ 排行榜（酷狗公开榜单）
│       │       ├── sandbox.js      #   └ 音源脚本 iframe 沙箱
│       │       └── bridge.js       #   └ 对外 API（search / resolveUrl / 脚本管理）
│       ├── daily.js / scratch.js
│
├── lx-user-api-sandbox.html  # 音源脚本沙箱页（iframe 加载，必须在 vercel.json 声明）
│
├── css/
│   ├── core.bundle.css     # 【构建产物】首屏核心：base + nav + history
│   ├── modules.bundle.css  # 【构建产物】按需模块样式
│   ├── base.css            # 全局基础样式、主题变量、双主题
│   └── modules/            # 与 js/modules 对应的模块样式
│
├── assets/
│   ├── icons/              # PWA 图标（192 / 512 / maskable）+ 32px favicon
│   ├── mbti/               # 16 型 MBTI 立绘（16 个 .webp 在用，同名 .png 为孤儿）
│   ├── sbti/               # 27 型 SBTI 立绘（.png + .webp，两种格式均在用）
│   ├── milktea/            # 26 个奶茶品牌 logo
│   └── tarot/              # 22 张大阿卡纳立绘
│
└── scratch/                # 开发残留，已 gitignore，不参与部署
```

---

## 🏗️ 架构说明

### 路由与模块调度

纯前端 hash 单页路由，无框架，实现在 `js/modules/router.js`：

- `ALLOWED_MODS` 白名单列出全部 13 个屏的 key；
- `switchModule(key)` 负责切换顶栏 Tab 与滑块、同步子导航激活态、切换 `.app-module.active`、**首次切入时懒初始化**对应模块的 `window.AppXxx.init()`、写入 `location.hash`；
- `MOD_PARENT_MAP` 定义子屏归属哪个顶栏 Tab；
- 离开模块时主动清理状态（`stopActiveGame()` / `closeReceipt()`）；
- 打包顺序上 `router.js` 排在最后，保证其他模块已注册。

### 主题与音效

- 主题切换写入 `localStorage` 键 `dp_theme`（`dark` / `light`），CSS 变量定义在 `css/base.css`；
- 音效使用 WebAudio 振荡器与噪声实时合成，**不加载任何音频文件**，可全局静音。

### Service Worker

仅对图片做 cache-first 懒缓存：

- `install` 阶段不做预拉取，直接 `skipWaiting()`；
- `fetch` 阶段跳过导航请求与 `/_vercel/` 等路径，仅处理 `/assets/` 与 `.png` / `.jpg`；
- 写缓存前校验响应头，避免缓存到错误页。

### Daily 数据源

`daily` 全部使用浏览器可直接跨域访问的公开接口；失败时回落本地缓存或离线种子。

| 内容 | 数据源 | 降级 |
|---|---|---|
| 60 秒新闻 | `60s-static.viki.moe/60s/YYYY-MM-DD.json`（当天 → 昨天 → 前天） | 本地缓存 → 内置早报 |
| 微博 / 知乎 / 抖音 | `api.codelife.cc` 热榜 API | 备用聚合源 → 缓存 → 离线示例 |
| B站 / 微博 / 抖音备用 | `v2.xxapi.cn` | 缓存 → 离线示例 |
| AI 快讯 | `api.codelife.cc` 科技/AI 频道（36kr 内容） | 缓存 → 离线示例 |
| 今日头条 | 官方 `toutiao.com/hot-event/hot-board`，经自家 `/api/toutiao` 代理（上游无 CORS 头） | 缓存 → 离线示例 |
| 必应壁纸 | `bing.biturl.top`（今日 + 近 6 日） | 内置壁纸种子 |
| 影视榜 | 本地片单（电影 / 华语剧 / 全球剧） | — |

豆瓣影视接口不返回 `Access-Control-Allow-Origin`，浏览器直连必然 CORS 失败；
60s 的豆瓣代理也已下线。因此影视与心情配片使用本地片单与本地海报兜底，
不会产生死链或控制台报错。热榜接口会校验 `code` 与列表非空，
避免把「HTTP 200 + 空数据」误判为可用。

### PWA

`manifest.json` 声明 standalone + 竖屏 + 深色主题色，配 `assets/icons/` 三档图标（含 maskable）。

---

## 🛠️ 新增功能屏

1. 新建 `js/modules/foo.js`，遵循现有约定 —— IIFE 包裹、暴露 `window.AppFoo = { init }`；
2. 新建 `css/modules/foo.css`；
3. 在 `build-bundles.js` 的 `moduleCssFiles` 中登记样式，并在 `chunks` 的对应入口
   登记 JS（顺序即依赖顺序）；首屏核心才放进 `coreCssFiles` / `coreJsFiles`；
4. 在 `index.html` 中新增 `<section id="mod-foo" class="app-module">`；
5. 在 `router.js` 的 `ALLOWED_MODS` 加入 `'foo'`，并在懒初始化分支加 `if (modKey === 'foo' && window.AppFoo) window.AppFoo.init();`；
6. 若挂在已有顶栏下，将 `'foo'` 加入 `MOD_PARENT_MAP` 指向父 Tab，并补 `data-sub-jump="foo"` 按钮；
7. 手改 `sw.js` 的 `CACHE_NAME`，再 `npm run build`（脚本会自动同步 `index.html` 的 `?v=`）。

其他可定制点：

| 位置 | 内容 |
|---|---|
| `js/core-drink.js` | 饮品人格题库与计分 |
| `js/modules/milktea.js` | 奶茶品牌数据 |
| `js/modules/manual-data.js` | 自我说明书题库与结果 |
| `css/base.css` | 主题色与全局变量 |

---

## 🚀 部署

Vercel 托管，连接 GitHub `main` 分支自动部署，无需手动构建命令。

`vercel.json` 中：

- **`builds` 段是白名单**：`api/**/*.js` 走 `@vercel/node`（排行榜 / 弹幕墙 / 豆瓣代理 / 必应壁纸代理 / 追剧索引 / **CORS 代理**），其余路径全部 `@vercel/static`。
  ⚠️ **新增根目录 HTML 必须在这里声明**，否则线上 404——`lx-user-api-sandbox.html`（音源脚本沙箱）就踩过这个坑：本地 `server.js` 走 `fs.readFile` 读磁盘不受影响，线上却加载不到，导致所有音源加载超时、界面显示「未加载音源」。
- **缓存策略分档**：`sw.js` 为 `no-cache, no-store, must-revalidate`；`index.html` 为 `max-age=0, must-revalidate`；`css`/`js` 为 `max-age=31536000, immutable`（文件自带 `?v=` 版本号，可以放心长缓存）；`assets` 为 1 周强缓存 + 1 月陈旧重验证。
  ⚠️ **`/js/**` 下的所有脚本都要带版本号**，包括 `js/vendor/*`。`lucide-icons.js` 曾经漏加版本号，浏览器一直用一年前的缓存，新加的图标全部缺失、按钮渲染成空圆圈。现在 `build-bundles.js` 会自动给 `morphicons.js` / `lucide-icons.js` 注入 `?v=<版本>`。

`.vercelignore` 排除 `node_modules`、`scratch`、`.git` 等非部署产物。

### 全服排行榜（需要一次性配置）

`api/leaderboard.js` 提供全服榜（29 个 game key：各小游戏分档榜 + 背单词日/周/总榜，另有 legacy `minesweeper`），使用 Upstash Redis 存储，**不配置也能部署**——此时接口返回 503，前端自动退回本机战绩，游戏不受影响。

开启全服榜：

1. Vercel 项目 → **Storage** → Marketplace 里选 **Upstash Redis** → 创建免费实例并连接到本项目；
2. 集成会自动注入 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`（也兼容旧的 `KV_REST_API_*`）；
3. 重新部署一次即可。

小游戏各有独立榜单，通过 `game` 参数区分。扫雷的三档难度**各排各的**——跨难度比时间没有意义：

| `game` | 榜单 | 排名指标 | 方向 | Redis 键 |
|---|---|---|---|---|
| `2048` | 数字合体 | 单局最高分 | 越高越好 | `j2048:z` / `j2048:p` |
| `reaction` | 反应速度擂台 | 简单反应中位数（ms） | **越低越好** | `jreaction:z` / `jreaction:p` |
| `color` | 色彩敏锐度 | 通过关卡数 | 越高越好 | `jcolor:z` / `jcolor:p` |
| `mine_easy` | 扫雷 · 初级 | 通关用时（秒） | **越低越好** | `jmine_e:z` / `jmine_e:p` |
| `mine_medium` | 扫雷 · 中级 | 通关用时（秒） | **越低越好** | `jmine_m:z` / `jmine_m:p` |
| `mine_hard` | 扫雷 · 高级 | 通关用时（秒） | **越低越好** | `jmine_h:z` / `jmine_h:p` |
| `schulte_easy` | 舒尔特 · 初级 | 总用时（秒） | **越低越好** | `jsch_e:z` / `jsch_e:p` |
| `schulte_medium` | 舒尔特 · 中级 | 总用时（秒） | **越低越好** | `jsch_m:z` / `jsch_m:p` |
| `schulte_hard` | 舒尔特 · 高级 | 总用时（秒） | **越低越好** | `jsch_h:z` / `jsch_h:p` |
| `tank` | 坦克防线 | 单局总分 | 越高越好 | `jtank:z` / `jtank:p` |

每个榜单的 `:z` 是 ZSET（成员 = 玩家随机 ID，分值 = 个人最好成绩，只保留前 1000 名），`:p` 是 HASH（存昵称、头像、日期与各游戏自己的附加字段）。反应榜、三档扫雷榜、三档舒尔特榜用 `ZRANGE`/`ZRANK` 升序取榜（共 7 个），`2048` 与 `color` 用 `ZREVRANGE`/`ZREVRANK` 降序取榜。

坦克防线上报 `score/kills/waves`（kills = 击毁辆数，waves = 抵达关卡），服务端按 `score ≤ kills×400 + waves×2000` 粗校验（道具 500 分/个，每关最多 3 个），并拒绝 `score>0 且 kills=0` 的提交。

舒尔特方格同样按难度分榜（5×5 / 6×6 / 7×7），排名就是总用时，点错次数只做记录不影响排名，用时限制 1–600 秒。

扫雷只提交通关成绩，踩雷不产生记录；用时限制 1–7200 秒。服务端会校验 `lv` 与榜单是否对应——往初级榜塞高级成绩直接拒绝，防止串榜刷分。前端切换难度时榜单和本机战绩一起切，本机战绩按难度分文件存在 `sm_minesweeper_runs_{easy,medium,hard}`（旧版的合并文件会在首次进入时自动拆分并删除）。

旧版三档共用的 `minesweeper` 榜仍然保留在服务端（键 `jmine:z` / `jmine:p`），只为兼容尚未刷新的客户端，前端已不再写入。

服务端按游戏分别校验：2048 校验分数 ≥ 最大方块且方块为 2 的幂；反应时间限制在 80–3000 ms（低于 80 ms 基本是脚本或误触）；通关数 0–500。所有榜都按玩家限流（60 秒 20 次），并按码点截断昵称，避免破坏 emoji。

本地开发 `node server.js` 时没有 Redis 会自动用进程内存储，接口行为完全一致，方便联调。

#### 删除某条战绩

给项目加一个环境变量 `ADMIN_TOKEN`（自己随便设一串足够长的随机字符），然后：

```bash
curl -X DELETE https://你的域名/api/leaderboard \
  -H "x-admin-token: 你的 ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"game":"reaction","id":"要删除的玩家ID"}'
```

`game` 省略时默认 `2048`。

玩家 ID 就是榜单返回里的 `id` 字段。**没配 `ADMIN_TOKEN` 时该接口始终返回 403**，不会留下一个谁都能调的删除入口。

---

## 📄 License

MIT
