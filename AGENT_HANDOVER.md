# juice 项目交接文档

> 更新：2026-10-17 · 覆盖至 `f72c2ad`（线上 v65）
> 适用对象：接手本项目后续开发 / 维护的 agent 或人
>
> **本文档上一版严重过期**，其架构描述（`template.html`、单文件 `index.html`、
> `build-bundle.js`、端口 3000、SW v23）**均已不存在**。本版所有数字都经过实测核对，
> 但你接手后仍应自行复核 —— 过期文档比没有文档更危险。

---

## 一、项目速览

| 项 | 内容 |
|---|---|
| 项目名 | 饮料人格研究所（Drink Persona Lab）→ 多模块趣味实验矩阵 |
| 本地路径 | `D:\Documents\AI\2\juice` |
| Git 仓库 | `github.com/noc228076/juice`（公开，默认分支 `main`） |
| 线上地址 | `https://juice.noooc.dpdns.org/` （Vercel，连接 GitHub `main` 自动部署） |
| 形态 | 纯静态多页 SPA，**无构建框架**，原生 JS + 手写构建脚本 |
| 本地启动 | `node server.js` → **http://localhost:3456**（端口由 `server.js` 的 `PORT` 常量控制） |

### 架构要点（实测核对）

```
index.html            130.6 KB   手写，含全部模块 DOM 结构与内联 SVG
css/app.bundle.css    381.9 KB   ← 由 15 个 css 源文件拼接
js/app.bundle.js    1,448.6 KB   ← 由 21 个 js 源文件拼接
assets/                         静态图片，运行时按需加载
```

- **`template.html` 已删除，`build-bundle.js` 已删除**。唯一的构建入口是
  `build-bundles.js`（`npm run build`）。旧文档提到的「单文件 `index.html` 内联全部
  CSS/JS」形态已不存在，现在 index.html 只引两个 bundle。
- 构建脚本按 `build-bundles.js` 里的 `cssFiles` / `jsFiles` 数组顺序拼接。
  **顺序即层叠顺序**，见第四节。
- `build-bundles.js` 还会把 `sw.js` 里的版本号**同步**到 `index.html` 的 `?v=` 查询串，
  但它**只抄不递增** —— 版本号必须手改 `sw.js`。

### 模块结构

8 个顶层模块（`index.html` 里的 `button.nav-tab[data-mod]`）：
`drinks` `manual` `tarot` `clock` `decision` `scratch` `lifeguide` `daily`

其中部分模块有子视图，构成 13 条实际路由。**顶层导航只有 8 个，路由有 13 条**，
两者不是一一对应 —— 写测试脚本时别把两者混为一谈（见第四节教训 9）。

### 图片资源

| 目录 | 文件数 | 体积 | 说明 |
|---|---|---|---|
| `assets/tarot/` | 22 | 7.2 MB | 塔罗大阿卡纳立绘 |
| `assets/sbti/` | 54 | 374 KB | SBTI 人格图，27 型 × png/webp，两种格式均在用 |
| `assets/mbti/` | 32 | 571 KB | MBTI 人格图；16 个 `.webp` 在用，16 个同名 `.png` 无引用（历史遗留，见第五节） |
| `assets/milktea/` | 26 | 193 KB | 奶茶品牌 logo（jpg） |
| `assets/icons/` | 3 | 102 KB | PWA 图标，三个均被 `manifest.json` 引用 |

---

## 二、最近三个版本做了什么

| 版本 | Commit | 内容 |
|---|---|---|
| v63 | `4edfffb` | 修首次访问「整站下载两遍」；css/js 改 immutable 缓存头；2048 PC 双栏 |
| v64 | `307dac9` | 自我说明书模块桌面常驻章节侧栏（解 1920 下大黑块） |
| v65 | `bf90db6` | 抽出 618 KB 内联 base64 图片，JS bundle 传输量 −51.6% |

### 性能问题的排查路径（值得复用）

用户反馈「加载慢」。**不要一上来就怀疑代码体积或模块没拆** —— 实测发现真正的
大头是内联 base64 图片，占 JS 的 30%：

```
core-drink.js   44 张  361.5 KB  占该文件 54.9%
milktea.js      26 张  257.8 KB  占该文件 89.9%
合计 619.3 KB / JS 总体积 2065.5 KB = 30.0%
```

> 口径说明：以上均为**字节数 ÷ 1024**。base64 负载是纯 ASCII，字符数 = 字节数；
> 但 JS 文件本身含大量中文（UTF-8 每字 3 字节），按字符数算会把分母算小约 12%
> （曾误得 63% / 91% / 33.7%）。比较体积时统一用字节。

内联 base64 的真正代价不是「和代码打包在一起」，而是**随 JS 无条件下载**，
哪怕那张图这辈子不会被显示。落成独立文件后，浏览器只在 `<img src>` 真正指向时才取。

更意外的发现：这些 base64 **本来就是仓库里已有图片的冗余副本** ——
`assets/sbti` 原有 54 个已跟踪文件、`assets/milktea` 原有 26 个，
抽出的字节与磁盘文件逐字节相同。所以仓库只净增 16 个文件。

### 首次访问下载两遍（已修）

`core-drink.js` 监听 `controllerchange` 就 `location.reload()`，而 `sw.js` 的
`activate` 里调了 `clients.claim()`。**新访客首次访问时页面本来不受控，
claim 必然触发一次 controllerchange**，于是被强制刷新一次，
实测 goto 48.9s = 24s 下载 × 2。

修法是记录 `hadController`，首次接管不算更新：

```js
const hadController = !!navigator.serviceWorker.controller;
navigator.serviceWorker.addEventListener('controllerchange', () => {
  if (!hadController) return;   // 首次接管，不是版本更新
  window.location.reload();
});
```

### 缓存头（已修）

`vercel.json` 里 css/js 曾是 `max-age=0, must-revalidate`，而文件本来就带
`?v=NNN` 版本号 —— 每次访问都要重新确认（304 也要一个 RTT）。
改成 `public, max-age=31536000, immutable` 后，实测回访：

```
app.bundle.css   2 ms   实际传输 0.0 KB
app.bundle.js   11 ms   实际传输 0.0 KB
```

`index.html` 保持 `must-revalidate` 不变（它才是决定版本号的那一层）。

---

## 三、接手必读：CSS 层叠陷阱（本项目已踩 4 次）

这是本项目最高频的 bug 来源，**全部表现为「我改了但线上没变」**。

### 1. `base.css` 在 bundle 里排第一

加在 `base.css` 末尾的覆盖块会被后面 15 个模块文件按同特异性盖掉。
**要覆盖模块样式，就去那个模块文件里改它自己的规则。**

### 2. 媒体查询不提升特异性

`.foo{max-width:100%}` 写在文件头，`.foo{max-width:560px}` 写在文件尾的
`@media` 里 → **基础规则赢**。PC 覆盖必须放文件末尾或提高特异性。

> 实例：`scratch.css` 的票面限宽规则被后面的基础规则按同特异性盖掉，
> 修正完全没生效，而我自己的测试没发现。原复盘写死了行号（L55/L284），
> 现已漂移失效——查这段历史请用 `git log -- css/modules/scratch.css`。

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

子导航条设了 `height:40px`，但它是 flex item，宿主（`#scr-cover`）内容溢出时
默认 `flex-shrink:1` 会把它压回自动最小尺寸 —— **实测从 40px 掉到 26px**。
凡是「固定高度 + flex item」的组合，都要显式 `flex-shrink:0`。

### 6. CSS 自定义属性作用域

`#mod-xxx` 作用域内定义的变量，`document.body.appendChild` 挂到 body 下的
弹窗继承不到 → `background: var(--tr-gold)` 解析失败变透明，
**近黑字配深底 = 文字消失，且不报错**。写 body 级弹窗样式要么在弹窗作用域
重新声明变量，要么 `var(--x, 兜底值)`。

---

## 四、测试与验证（这份文档里最值钱的部分）

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

12/13 条路由 × 3 档视口（1440 / 390 / 320），覆盖：
顶栏激活项可见性、左右区遮挡、横向溢出、子导航条溢出、条高一致性、
标签高度极差、顶栏控件等高、命盘四宫格行高、console 错误。

**这个脚本本身踩过的坑，比它测出来的问题更值得记住：**

### 教训 7：`if (!vp.mob)` 等于主动屏蔽移动端

我把所有高度断言包在 `if (!vp.mob)` 里，理由是「移动端有各自更紧凑的设计」。
结果子 agent 挖出的 **3 个 P0 全在移动端**，全被这个门放过了：

- `.dec-subnav` 固定 40px 撞上移动端 2×2 网格，第二行溢出 45px **直接压在正文上**
- `min-height` 压制 `height`（见第三节教训 4）
- `flex-shrink` 静默吃掉 40px（见第三节教训 5）

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

---

## 五、已知遗留问题

1. **`assets/mbti/` 16 个 `.png` 无任何引用**（与同名 `.webp` 内容不同）。
   历史遗留，非本次改动引入。删不删你定。
2. **`lunar.js` 还有 426 KB**（436,144 字节），是真实代码（农历库）不是图片。
   它被 bazi 模块强依赖，动态加载的改动风险高于收益，暂未动。
   若要继续瘦身，这是唯一剩下的目标。
3. **`css/app.bundle.css` 382 KB** 里最大的是 `tarot.css` 58 KB、
   `base.css` 42 KB、`manual.css` 39 KB、`decision.css` 32 KB。没做单页级 CSS 拆分。
4. **塔罗 768→900px 断点**：768–899px 平板会退化成单栏。
   这是有意改动（双栏需要空间），但确实牺牲了平板区间，用户尚未拍板。
5. **移动端底部留白 36/40px → 24px**：为统一垂直节奏而收窄。
   原值可能就是为了拇指区呼吸空间，**建议真刘海机复核**（模拟器无安全区）。
6. **`#scr-quiz` / `.result-scroll` / 封面移动端分支（8px）未纳入
   `--screen-pad-block`**，有意保持紧凑。已在 `css/base.css` 注释里写明范围，
   防止下一个人误以为「已经统一过了」。
7. **4 个孤儿源文件仍在版本库中**：`js/app.js`（23.5 KB）、`js/data.js`（118.9 KB）、
   `js/drinks-art.js`（38.5 KB）、`css/style.css`（37.3 KB）。它们被 git 跟踪，
   但既不在 `build-bundles.js` 的 `cssFiles`/`jsFiles` 里，也不被 `index.html`
   引用——是早期单文件架构的残留。删或留需要一次决策，别误以为它们在生效。
8. **`f72c2ad` 已删掉 `bf90db6` 误加进 `assets/sbti/` 的 16 个 `.webp`**。
   `assets/sbti/` 现在是 54 个文件（27 型 × png/webp），与上表一致；
   若看到 `bf90db6` 的提交统计写「新增 16 个文件」，那是中间态，不是现状。

---

## 六、部署

- **推 `main` 即自动部署**（Vercel 已连 GitHub），无需手动触发。
- `vercel.json` 的 `builds` 段必须保留：它从配置层面禁掉函数部署。
  项目有历史遗留的 Node 配置（早期 CLI 部署产生），靠这段兜住。
- 改了 `css/` 或 `js/` **必须 `npm run build`**，否则线上拿到的还是旧 bundle。
- **改了任何 css/js 都要先手改 `sw.js` 的 `CACHE_NAME` 版本号**（当前 v65），
  否则回访用户命中旧缓存看不到改动。这个坑踩过两次。
- SW 的 `install` 阶段**严禁并发预拉取**资源，会触发 Vercel 边缘防火墙 705。
  当前实现只在 `fetch` 时懒缓存图片。
- SW 的 `activate` 调了 `clients.claim()` —— 这是 v63 那个「双刷」问题的成因，
  修在调用侧（`hadController` 判断），不要动 SW 这行。

---

## 七、常用验证命令

```powershell
# 构建
node build-bundles.js

# 全量回归（需先 node server.js）
$env:NODE_PATH="C:\Users\NOC\.workbuddy-ai\binaries\node\workspace\node_modules"
node "C:\Users\NOC\AppData\Local\Temp\opencode\juice-final2.cjs"

# 2048 排行榜全流程（含离线验证）
node "C:\Users\NOC\AppData\Local\Temp\opencode\lb-test.cjs"

# 资源引用完整性（缺失 / 孤儿）
node "C:\Users\NOC\AppData\Local\Temp\opencode\ref-check.cjs"

# 线上巡检
node "C:\Users\NOC\AppData\Local\Temp\opencode\online-smoke.cjs"
```

> 注意：这些脚本在 `C:\Users\NOC\AppData\Local\Temp\opencode\`，
> **Temp 目录可能被系统清理**。如果找不到了，脚本里的断言逻辑值得重新写，
> 但第四节记录的**踩坑点请务必保留**。

---

*本文档已提交 git。修改前请先核对第三节（层叠陷阱）与第四节（测试教训）是否仍适用 ——
这两节是本项目真正的知识资产，其余内容随代码演进容易过期。*