# tv/ · 电视直播子应用

从 `iptv-web-20261102` 的 `static/` 移植，作为 juice `#/tv` 的同源 iframe 子应用。
播放器、频道合并、看门狗等逻辑保持原样；相对原版只改了这些：

- 资源路径由 `/static/...` 改为 `./...`，并加 `config.js`。
- 频道源只保留两份解码级实测源（`extra` / `verified`），由 `tv-worker` 在服务端解析；
  远程聚合源不再参与首屏合并，避免慢源拖住频道表。
- 播放地址由 Worker 下发：
  - 频道入口：`<worker>/media?cid=…&i=…`（不透明，真实地址不出服务端）
  - 播放列表分片：`<worker>/proxy?url=…`
- 停用 `/pick` 预探测，直接播第一条，失败由现有 `nextSource` / 看门狗托底。
- `?embed=1`：隐藏品牌头，只留源状态与「添加源」，适配 juice 子模块高度。
- 父页通过 `postMessage('tv:pause')` 在离开 `#/tv` 时暂停视频。

## 文件

| 文件 | 说明 |
|---|---|
| `index.html` | 页面骨架；`?v=` 由 `npm run build` 同步 |
| `app.js` | 频道合并 / HLS 播放 / 失败切换 / UI |
| `style.css` | 深色 Liquid Glass 主题 + `body.embed` 规则 |
| `hls.min.js` | hls.js v1.7.4（Apache-2.0），不重新 minify |
| `config.js` | Worker 地址；本地自动指向 `127.0.0.1:8787` |

## 本地开发

```bash
npm run tv:data       # 生成 tv-worker/src/data.js
npm run tv:dev        # 启动 Worker 本地适配器（127.0.0.1:8787）
node server.js        # 另开一个终端，启动 juice（127.0.0.1:3456）
```

打开 `http://127.0.0.1:3456/index.html#/tv`。

## 线上

1. 部署 `tv-worker`（见根目录 README / `tv-worker/wrangler.toml`）。
2. 把 Worker 地址填进 `tv/config.js` 的 `prod` 常量。
3. `npm run build` 后推 Vercel。

临时覆盖地址（不改代码）：

```js
localStorage.setItem('tvApiBase', 'https://xxx.workers.dev');
```

## 许可

- hls.js：Apache-2.0，见 `hls.min.js` 头部与上游仓库。
- 频道数据：来自公开 IPTV 列表，仅个人学习使用；维护脚本与源文件在 `scripts/tv-src/`。
