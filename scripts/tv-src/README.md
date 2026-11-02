# scripts/tv-src · 频道源

- `extra.m3u`：人工精测源（子 agent 逐条 ffprobe 解码 + 分片测速 + 抽帧核对台标后产出），优先级最高。
- `verified.m3u`：解码级实测产物。

来源：`iptv-web-20261102` 归档，快照日期 2026-11-02。

## 更新

```bash
# 替换 extra.m3u / verified.m3u 后
npm run tv:data
npm run tv:deploy   # 需要已 wrangler login
```

构建脚本会：

- 只保留 http(s) 地址；
- 剔除已知错误源（`event.pull.hebtv.com/jishi` 的 TVU 测试卡、`/tvu/`）；
- 只保留「央视 / 卫视 / 动画」三类；
- 按频道基础名生成稳定 `cid`，同 cid 内按顺序编号 `i`；
- 给已实测的「冻结播放列表」打 `static` 标记（`STATIC_BLACKLIST`，目前是浙江广电
  `ali-m-l` / `ali-vl` 的 channel21 / channel001 / channel10 / channel01 / channel008）；
  客户端不会把 static 源当实时源播放；
- 输出 `tv-worker/src/data.js`（gitignore，不进浏览器）。

> 静态回放检测：`js/modules/tv.js` 还会在播放后检查 m3u8 的
> `#EXT-X-PROGRAM-DATE-TIME`（早于 24h 判静态）和 12 秒内 `MEDIA-SEQUENCE` 是否前进；
> 未知静态源会被自动跳过并切下一条。

## 注意

- 这些 m3u 里含源站的 `key` / `auth` 参数，默认已加入 `.gitignore`（`scripts/tv-src/*.m3u`）。
  需要随仓库分发时手动 `git add -f`，并确认可以公开；不能接受就只在本机/私有仓库保留。
- 客户端拿不到真实地址（`/playlist` 只给 `/media?cid=…&i=…`），但播放列表重写后的分片 URL
  会带上游地址；这是 HLS 代理的固有形态。
- 源天然短命：失效后重新跑 `tv:data` + `tv:deploy`。
