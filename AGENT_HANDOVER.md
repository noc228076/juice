# juice 项目交接文档

> 生成时间：2026-10-12 19:30 · 覆盖范围：本次 AI agent 接手后的全部改动
> 适用对象：接手本项目后续开发/维护的 agent

---

## 一、项目速览

| 项 | 内容 |
|---|---|
| 项目名 | 饮料人格研究所（Drink Persona Lab），已扩展为「八合一赛博实验矩阵」 |
| 本地路径 | `D:\Documents\AI\2\juice` |
| Git 仓库 | `github.com/noc228076/juice`（公开，默认分支 `main`） |
| 线上地址 | https://juice.noooc.dpdns.org/ （Vercel，已连接 GitHub main 自动部署） |
| 形态 | 纯静态 PWA：`template.html` + `build-bundle.js` → 单文件 `index.html` |
| 本地启动 | `node server.js` → http://localhost:3000 |

**架构要点**：`index.html` 是**构建产物**（约 2.2MB，内联全部 CSS/JS），`template.html` 是唯一 HTML 源，模块在 `js/modules/`（19 个 JS）和 `css/modules/`（13 个 CSS）。塔罗牌等图片资源在 `assets/tarot/`（22 张大阿卡纳立绘，jpg）。

---

## 二、本次会话修复清单（按时间顺序）

### 问题 1：线上塔罗立绘全部 404，只剩符号卡片 ✅ 已上线

- **症状**：部署到 Vercel 后塔罗模块看不到立绘。渲染层 `onerror` 会隐藏加载失败的图，露出底层符号卡。
- **根因**：Vercel 把项目识别为 Node/Serverless 项目（package.json 有 `main: server.js` + `lunar-javascript` 依赖），函数沙盒里只有 server.js，除 `/`（index.html 静态命中）外全部 404，且 404 响应体是 server.js 的 `404 Not Found`（13B text/plain）。
- **关键证据**：curl 逐个路径探测；GitHub deployments API 为空（项目未连 Git）；加随机 query 绕 CDN 缓存仍 404（排除缓存因素）。
- **过程**（三个 commit 递进）：
  - `38cb297`：package.json 移除未使用的依赖和 main（代码实际用 vendored 的 `js/libs/lunar.js`）+ vercel.json 加 `outputDirectory: "."` + `.vercelignore` + SW 升 v23（`cache.addAll` 改逐条 `cache.add` + catch，修复单文件失败导致新 SW 永远激活不了的隐患）
  - 发现连 Git 后部署仍是 serverless 模式 → 项目级保存设置覆盖了仓库配置
  - `f623e07`：**vercel.json 显式写死 `builds`**——index.html / sw.js / manifest.json / favicon.png / assets/** 全部 `@vercel/static`，从配置层面禁掉函数部署；同时删掉 `/assets/*` 的 `immutable` 缓存头（它会把 404 在 CDN 边缘缓存一年，是"修好了还不显示"的帮凶）
- **附带修复**：`.vercelignore`（排除 node_modules、scratch）
- **状态**：✅ 已部署生效（用户确认立绘可见，curl 验证全部 200）

### 问题 2：保存画报弹窗底部「保存 / 下载高清画报」按钮完全不可见 ✅ 已上线

- **症状**：用户说"颜色太黑和背景融为一体，看不到字"——指的是弹窗底部按钮。
- **根因（CSS 自定义属性作用域）**：海报弹窗由 `showPosterModal()` 用 `document.body.appendChild` 挂到 `body` 下，而 `--tr-gold` 变量**只定义在 `#mod-tarot` 作用域内**，body 下的元素继承不到 → `background: var(--tr-gold)` 解析失败变透明（露出深色对话框 `#140f2e`），`color: #1a1202` 近黑字配深底 → 整行不可见。弹窗描边同样因变量缺失而透明。
- **诊断方法**：对用户截图裁剪按钮区域做像素直方图——区域内主色是对话框底色 + 近黑文字像素，**没有任何金色**，从而定位。
- **修复**（`d1d7d62`）：
  - `.tr-poster-modal` 作用域内重新声明 `--tr-gold: #e8c96a; --tr-gold2: #f5e3a1;`
  - 按钮背景与弹窗描边增加 `var(--tr-gold, #e8c96a)` 兜底
- **验证**：Playwright 端到端走完占卜流程，按钮计算背景色 `rgb(232, 201, 106)` 生效。
- **状态**：✅ 已部署生效

### 问题 3（附带优化）：海报内部文字可读性 ✅ 已上线

前两轮曾误判为字号问题，最终保留为合理优化（`96920d1`）：
- 海报底部两行署名 `#7a70a8`/`#5c5484`（几乎不可见）提亮为 `#b3a9e0`/`#9a91c6`
- 副标题与卡牌关键词行 `#a99fd4` → `#c9c0ee`
- 解读正文 20px/23px 统一为 26px、行高 46，解读框 230→250、间距 255→275
- 海报预览加宽：dialog 440→560px，图片 360→500px
- 像素实测对比度：footer 6.24/4.58、正文 9.63、标题 8.26、关键词 7.21

---

## 三、Git 提交记录（本次会话）

| Commit | 内容 | 状态 |
|---|---|---|
| `38cb297` | 部署根因第一轮：package.json 瘦身 + outputDirectory + .vercelignore + SW v23 | 已推送 |
| `f623e07` | vercel.json builds 写死 @vercel/static，根治部署形态 | 已推送 |
| `96920d1` | 海报文字配色提亮 + 字号 + 预览加宽 | 已推送 |
| `d1d7d62` | 弹窗按钮不可见修复（CSS 变量作用域） | 已推送 |

**截至交本文档时：本地 = origin/main = d1d7d62，线上已部署并验证全部改动生效。**

---

## 四、接手必读（踩坑记录）

1. **改完 `js/` 或 `css/` 必须重新打包**：`node build-bundle.js`（或 `npm run build`）会重新生成 index.html。不打包线上不生效。
2. **build-bundle.js 日志的 "Total size KB" 不准**：它用字符串 UTF-16 length 统计，中文字符少算 2/3，别被"变小了"误导，真实字节用 `wc -c`。
3. **CSS 自定义属性作用域坑**：body 级动态元素（JS appendChild 的弹窗）用 `#mod-xxx` 作用域内定义的变量会**静默失败**（background 透明 + 黑字 = 文字消失，且不报错）。写弹窗样式时要么在弹窗作用域声明变量，要么写死颜色/加 `var(--x, 兜底值)`。已排查：bazi.js / lifeguide.js 的 body 级 appendChild 只是下载用 `<a>`，无同类问题。
4. **本 agent 环境推不上 GitHub**：沙箱强制走本地代理（127.0.0.1:3781），该代理到 github.com 不通（502/重置），直连出站也被封。`git push` 需要用户在自己终端执行（用户终端秒推）。WebFetch 工具不受影响（服务端抓取）。
5. **部署相关**：Vercel 项目有历史遗留的 Node 配置（早期 CLI 部署产生），目前靠 vercel.json 的 `builds` 兜住；若改动 vercel.json 注意别破坏 builds 段。assets 缓存头已改为无 immutable。
6. **SW 版本管理**：`sw.js` 里 `CACHE_NAME` 手动 +1（当前 v23），activate 时会清理旧缓存。
7. **debug 方法论教训**：用户圈出截图元素时，先对该区域做像素/元素分析再动手。本次前两轮因未分析截图绕了弯路。
8. **tarot.js 海报布局坐标**：`renderSharePoster()` 画布 1080×1920（单牌 1760）；三牌布局：卡牌 y290-680、解读块 y790 起每块 250 高间距 275；单牌：卡 290-920、解读框 y1085。改字号/文案时注意文本行数别溢出框。

---

## 五、遗留问题（未处理，按优先级）

1. **README.md 严重过期**：仍是最初 MBTI 单模块的说明，完全没提塔罗/八字/奶茶等 8 个模块、PWA、构建流程、Vercel 部署。建议重写。
2. **`scratch/` 目录**：大量开发过程残留（验证脚本、截图、chrome profile），已被 gitignore，不影响部署，但占本地空间。
3. **单牌海报逆位时无角标**？三牌/单牌布局的正逆位徽标逻辑见 `renderSharePoster`（单牌有 badge，三牌无）——未确认是否有意为之。
4. **SW 预缓存清单**：只含 tarot 22 张图 + 基础文件；mbti/sbti/milktea 资源未预缓存（milktea logo 已 Base64 内联，mbti/sbti 头像走网络）。如需完整离线体验可补充。

---

## 六、验证工具（留存在 `D:\Documents\AI\workbuddy\`）

- `verify-poster.cjs` / `verify-single.cjs`：Playwright 端到端脚本——起服务、走「选牌→洗牌→解牌→翻牌→保存」全流程、检查按钮计算样式、读海报 canvas 像素算对比度、截图。
- 运行方式（需先 `node server.js`）：
  ```bash
  NODE_PATH="C:/Users/NOC/.workbuddy-ai/binaries/node/workspace/node_modules" \
  "C:/Users/NOC/.workbuddy-ai/binaries/node/versions/22.22.2-6/node.exe" verify-poster.cjs
  ```
- 环境注意：Node 用 Playwright 必须 `.cjs` + `NODE_PATH`（ESM 下 NODE_PATH 无效）；Chromium 在 `~/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe`。

---

*本文档未提交 git（untracked），如需要可 `git add` 进仓库。*
