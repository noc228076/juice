# 饮料人格研究所 · 八合一趣味实验矩阵 🍹

纯静态、零运行时依赖的网页趣味测试矩阵，包含 8 大模块 / 13 个功能屏，支持 PWA 安装与离线图片缓存。

| 项 | 内容 |
|---|---|
| 定位 | 纯前端趣味测试 / 玄学 / 轻游戏合集 |
| 技术栈 | 原生 HTML + CSS + JavaScript，无框架、无运行时依赖 |
| 构建 | 自研轻量打包脚本（`build-bundles.js`），Node 仅用于本地静态服务 |
| 运行环境 | 任意现代浏览器（Chrome / Edge / Safari），Node ≥ 16 仅用于本地开发 |
| 部署 | Vercel 静态托管，连接 GitHub `main` 自动部署 |

---

## 📦 功能模块

顶栏 8 个胶囊标签，部分标签下挂有子导航条，视图状态同步到 URL hash（`#/<模块>`）。

### 1. 🍹 饮品测评
- **`drinks` 16 款灵魂特调** — MBTI × 饮料人格，四维度计分裁定 16 型人格配方
- **`milktea` 奶茶人格配方** — 26 个品牌 logo + 人格解析

### 2. 📖 自我说明书
`manual` — 7 份出厂说明书，区分问答型与小游戏型：

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
- **`bazi`** 生辰八字 — 四柱排盘
- **`fengshui`** 工位风水大师 — 每日老黄历 + 工位方位建议

### 4. ⏰ 摸鱼解压
- **`clock`** 摸鱼时钟 & 工资 — Fliqlo 机械大翻页全屏钟屏保，含农历日期显示
- **`merit`** 功德木鱼 & 碎纸解压 — 静心功德局，电子木鱼 + 怨气粉碎机

### 5. 🪙 纠结拯救
`decision` — 转盘决策 + 终局裁定单（可写批注，生成裁定小票）

### 6. 🛡️ 人间清醒
`lifeguide` — 循证生存与防坑智库，每条结论附医学顶刊 RCT 证据或现行法律条文

### 7. 🗞️ 今日风向
`daily` — 今日风向标，每日灵感补给站（时间看板 + 运势播报）

### 8. 🎟️ 幸运刮刮乐
`scratch` — 刮刮卡抽奖，支持即时结算与中奖记录

另有 `history` 全局档案中心，通过顶栏「📜 档案」入口访问，聚合各模块历史测评记录。

---

## 🚀 快速开始

```bash
git clone https://github.com/noc228076/juice.git
cd juice
npm start
```

浏览器打开 http://localhost:3456/ 即可。端口由 `server.js` 的 `PORT` 常量控制（当前 3456）。

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
js/libs/lunar.js ──┼─► node build-bundles.js ─► js/app.bundle.js
                   │                    └─►  css/app.bundle.css
css/modules/*.css ─┘
css/base.css ──────┘
```

**修改 `js/` 或 `css/` 下的源文件后需重新构建**：

```bash
npm run build
```

**先手改 `sw.js` 的 `CACHE_NAME` 版本号**，再运行 `npm run build`。构建脚本会读出
`sw.js` 的版本号并自动同步到 `index.html` 的两处 `?v=`，不需要手动改两遍：

| 文件 | 字段 | 当前值 | 谁改 |
|---|---|---|---|
| `sw.js` | `CACHE_NAME` | `juice-persona-v65` | **手动**（唯一真值来源） |
| `index.html` | `?v=` 查询参数（CSS / JS 各一处） | `65` | `npm run build` 自动同步 |

---

## 📁 目录结构

```text
juice/
├── index.html              # 页面骨架：顶栏 + 12 个 <section class="app-module">
├── sw.js                   # Service Worker：图片懒缓存
├── manifest.json           # PWA 清单
├── vercel.json             # 构建声明 + 缓存策略
├── server.js               # 零依赖本地服务器（含 api/ 模拟）
├── build-bundles.js        # 打包脚本
├── api/
│   └── leaderboard.js      # 2048 全服排行榜 Serverless 函数
├── favicon.png
│
├── js/
│   ├── app.bundle.js       # 【构建产物】勿手改
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
│       │   ├── manual-games.js     #   └ 反应擂台 / 色彩 / 2048
│       │   └── manual-report.js    #   └ 报告渲染
│       ├── decision.js / clock.js / merit.js
│       ├── profile.js              # 玩家头像 / 昵称
│       ├── leaderboard.js          # 全服排行榜客户端
│       └── lifeguide.js / daily.js / scratch.js
│
├── css/
│   ├── app.bundle.css      # 【构建产物】勿手改
│   ├── base.css            # 全局基础样式、主题变量、双主题
│   └── modules/            # 与 js/modules 对应的模块样式
│
├── assets/
│   ├── icons/              # PWA 图标（192 / 512 / maskable）
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

### PWA

`manifest.json` 声明 standalone + 竖屏 + 深色主题色，配 `assets/icons/` 三档图标（含 maskable）。

---

## 🛠️ 新增功能屏

1. 新建 `js/modules/foo.js`，遵循现有约定 —— IIFE 包裹、暴露 `window.AppFoo = { init }`；
2. 新建 `css/modules/foo.css`；
3. 在 `build-bundles.js` 的 `cssFiles` / `jsFiles` 中登记（`jsFiles` 顺序即执行顺序）；
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

- **`builds` 段**：`api/**/*.js` 走 `@vercel/node`（2048 全服排行榜），其余路径全部 `@vercel/static`；
- **缓存策略分档**：`sw.js` 为 `no-cache, no-store, must-revalidate`；`index.html` 为 `max-age=0, must-revalidate`；`css`/`js` 为 `max-age=31536000, immutable`（文件自带 `?v=` 版本号，可以放心长缓存）；`assets` 为 1 周强缓存 + 1 月陈旧重验证。

`.vercelignore` 排除 `node_modules`、`scratch`、`.git` 等非部署产物。

### 全服排行榜（需要一次性配置）

`api/leaderboard.js` 使用 Upstash Redis 存储，**不配置也能部署**——此时接口返回 503，前端自动退回本机战绩，游戏不受影响。

开启全服榜：

1. Vercel 项目 → **Storage** → Marketplace 里选 **Upstash Redis** → 创建免费实例并连接到本项目；
2. 集成会自动注入 `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN`（也兼容旧的 `KV_REST_API_*`）；
3. 重新部署一次即可。

数据结构：`j2048:z` 是 ZSET（成员 = 玩家随机 ID，分值 = 个人最高分，只保留前 1000 名），`j2048:p` 是 HASH（存昵称、头像、最高方块）。服务端会校验分数与最大方块的合法性、按玩家限流（60 秒 20 次），并按码点截断昵称，避免破坏 emoji。

本地开发 `node server.js` 时没有 Redis 会自动用进程内存储，接口行为完全一致，方便联调。

#### 删除某条战绩

给项目加一个环境变量 `ADMIN_TOKEN`（自己随便设一串足够长的随机字符），然后：

```bash
curl -X DELETE https://你的域名/api/leaderboard \
  -H "x-admin-token: 你的 ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"id":"要删除的玩家ID"}'
```

玩家 ID 就是榜单返回里的 `id` 字段。**没配 `ADMIN_TOKEN` 时该接口始终返回 403**，不会留下一个谁都能调的删除入口。

---

## 📄 License

MIT