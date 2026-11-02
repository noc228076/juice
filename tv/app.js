/* IPTV Web 前端逻辑
   核心思路：多个上游源合并成一份完整频道表；同名频道在各源中的地址归并在一起，
   测活过的源排前面，播放失败时自动逐个托底切换。 */
"use strict";

/* juice 接入：代理地址由 config.js 提供（本地 tv-worker，线上 Cloudflare Worker） */
const TV_API = String((window.TV_CONFIG && window.TV_CONFIG.apiBase) || "").replace(/\/+$/, "");
function tvApi(path) { return TV_API + path; }

/* ---------- 频道源 ----------
   juice 版只保留两份解码级实测源（extra / verified），由 tv-worker 在服务端解析；
   远程聚合源不再参与首屏合并，避免慢源拖住整个频道表。
   自定义 M3U 仍可通过右上角「添加源」并入。 */
const BUILTIN_FEEDS = [
  { name: "人工精测源", local: "extra", strict: true },
  { name: "已测可用", local: "verified", strict: true },
];

const LS = {
  customFeeds: "iptvweb.customFeeds",   // 用户添加的自定义 M3U 源（并入合并池）
  favs: "iptvweb.favs",
  recent: "iptvweb.recent",
};

const store = {
  get(k, d) {
    try {
      const v = JSON.parse(localStorage.getItem(k));
      return (v === null || v === undefined) ? d : v;
    } catch (e) { return d; }
  },
  set(k, v) { localStorage.setItem(k, JSON.stringify(v)); },
};

/* ---------- 状态 ---------- */
const state = {
  feeds: [],
  channels: [],          // 合并后的频道表：{name, group, logo, urls:[...], url}
  groups: new Map(),     // 主分组(央视/卫视/动画) -> [channel]
  currentGroup: null,
  view: "channels",      // channels | favs | recent
  current: null,
  playList: [],          // 当前视图的频道列表（上下台用）
};

let hls = null;

/* hls.js 诊断日志（排查播放问题用，保留最近 60 条） */
const hlsLog = [];
window.__hlsLog = hlsLog;
function logHls(data) {
  try {
    hlsLog.push({
      type: data.type, details: data.details, fatal: !!data.fatal,
      url: (data.url || (data.fragment && data.fragment.url) || "").slice(0, 160),
      code: data.response && data.response.code,
      msg: ((data.response && data.response.text) || data.reason || "").slice(0, 120),
    });
    if (hlsLog.length > 60) hlsLog.shift();
  } catch (e) { /* 忽略 */ }
}

/* ---------- DOM ---------- */
const $ = (id) => document.getElementById(id);
const video = $("video");
const els = {
  feedInfo: $("feedInfo"), reloadFeedsBtn: $("reloadFeedsBtn"),
  addSourceBtn: $("addSourceBtn"),
  groupList: $("groupList"), channelList: $("channelList"),
  searchInput: $("searchInput"), channelCount: $("channelCount"),
  videoBox: $("videoBox"), playerPanel: $("playerPanel"),
  nowBar: document.querySelector(".now-bar"),
  videoMask: $("videoMask"), maskText: $("maskText"), maskPlayBtn: $("maskPlayBtn"),
  maskSpinner: $("maskSpinner"),
  osd: $("osd"), osdNum: $("osdNum"), osdLogo: $("osdLogo"),
  osdName: $("osdName"), osdGroup: $("osdGroup"),
  toast: $("toast"), bufSpinner: $("bufSpinner"),
  ctrlBar: $("ctrlBar"), btnPlay: $("btnPlay"), liveBadge: $("liveBadge"),
  seekBar: $("seekBar"), seekBuf: $("seekBuf"), seekPlayed: $("seekPlayed"),
  btnLive: $("btnLive"), clockText: $("clockText"), netStats: $("netStats"),
  btnQuality: $("btnQuality"), qualityMenu: $("qualityMenu"),
  btnVol: $("btnVol"), volSlider: $("volSlider"),
  btnPip: $("btnPip"), btnFs: $("btnFs"),
  nowName: $("nowName"), nowStatus: $("nowStatus"),
  prevBtn: $("prevBtn"), nextBtn: $("nextBtn"), favBtn: $("favBtn"),
  sourceDialog: $("sourceDialog"), sourceForm: $("sourceForm"),
  srcName: $("srcName"), srcUrl: $("srcUrl"),
};


/* ---------- SVG 图标（Feather/Tabler 风格线性图标，替代 emoji） ---------- */
const ICONS = {
  play: '<polygon points="6 3 20 12 6 21 6 3" fill="currentColor" stroke="none"/>',
  pause: '<rect x="5" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none"/><rect x="14" y="4" width="5" height="16" rx="1" fill="currentColor" stroke="none"/>',
  prev: '<polygon points="19 20 9 12 19 4 19 20" fill="currentColor" stroke="none"/><line x1="5" y1="19" x2="5" y2="5"/>',
  next: '<polygon points="5 4 15 12 5 20 5 4" fill="currentColor" stroke="none"/><line x1="19" y1="5" x2="19" y2="19"/>',
  "vol-x": '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><line x1="23" y1="9" x2="17" y2="15"/><line x1="17" y1="9" x2="23" y2="15"/>',
  "vol-1": '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>',
  "vol-2": '<polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" fill="currentColor" stroke="none"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>',
  maximize: '<path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>',
  minimize: '<path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 0 2 2v3"/>',
  pip: '<rect x="2" y="4" width="20" height="15" rx="2"/><rect x="12" y="11" width="7" height="5" rx="1" fill="currentColor" stroke="none"/>',
  sliders: '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
  star: '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
  "star-fill": '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor" stroke="none"/>',
  clock: '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
  refresh: '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  plus: '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
  tv: '<rect x="2" y="7" width="20" height="15" rx="2"/><polyline points="17 2 12 7 7 2"/>',
  search: '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
};
function icon(name, size) {
  return '<svg class="ic" width="' + (size || 18) + '" height="' + (size || 18) +
    '" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" ' +
    'stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' + (ICONS[name] || "") + '</svg>';
}

/* ---------- 工具 ---------- */
const esc = (s) => s.replace(/[&<>"']/g, (c) =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

function setStatus(text, isErr = false) {
  els.nowStatus.textContent = text;
  els.nowStatus.className = "muted small";
  els.nowStatus.style.color = isErr ? "var(--danger)" : "";
}

function mask(text, isErr = false, showPlay = false, loading = false) {
  els.videoMask.classList.remove("hide");
  els.videoMask.classList.toggle("clickable", !!showPlay);
  // 只有需要用户点击时才拦截鼠标；否则让控制条可以正常操作
  els.videoMask.classList.toggle("passthrough", !showPlay);
  els.maskText.innerHTML = text;
  els.maskText.className = (isErr ? "err" : "") + (loading ? " loading" : "");
  els.maskPlayBtn.hidden = !showPlay;
  els.maskSpinner.hidden = !loading;
  els.bufSpinner.hidden = true;
  els.videoMask.querySelector(".mask-inner").classList.toggle("loading", !!loading);
}

const hideMask = () => els.videoMask.classList.add("hide");

/* 频道基础名：剥掉清晰度/备注后缀
   "CCTV-1 (720p)" / "CCTV-1 HD" / "湖南卫视 (1080p) [Geo-blocked]" -> "CCTV-1" / "湖南卫视" */
function baseName(n) {
  let s = n.replace(/\s*\((?:\d{3,4}[pi]|HD|SD|FHD|UHD)\)\s*$/i, "")
           .replace(/\s*\[[^\]]*\]\s*$/, "")
           .replace(/\s+(?:8K|UHD|FHD|HD|SD)$/i, "")
           .trim();
  return s || n;
}

/* 归并 key：基础名再压掉空格/连字符等，让 "CCTV-1" 与 "CCTV1" 归到一起 */
function keyOf(n) {
  return baseName(n).toLowerCase().replace(/[\s\-_.·]/g, "");
}

/* 从频道名解析清晰度："(1080p)"/"(HD)"/"(8K)"、裸后缀 "CCTV-1 HD" -> {val, label}，无标注 = 0 */
function resInfo(name) {
  const map = { "8k": 4320, "4k": 2160, "uhd": 2160, "2k": 1440,
                "fhd": 1080, "hd": 720, "sd": 480 };
  const m = name.match(/\(\s*(\d{3,4})\s*([pi])?\s*\)/i)
        || name.match(/\(\s*(8K|4K|2K|UHD|FHD|HD|SD)\s*\)/i);
  if (m) {
    const tok = (m[1] + (m[2] || "")).toLowerCase();
    const val = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : (map[tok] || 0);
    return { val, label: tok };
  }
  const b = name.match(/\b(8K|4K|UHD|FHD|HD|SD)$/i);   // 裸后缀 "CCTV-1 HD"
  if (b) {
    const tok = b[1].toLowerCase();
    return { val: map[tok] || 0, label: tok };
  }
  return { val: 0, label: "" };
}

/* 主分组只有三个：央视 / 卫视 / 动画；不属于这三类的频道不收录 */
const ANIM_RE = /卡通|动画|动漫|少儿|儿童|哈哈炫动|卡酷|金鹰卡通|优漫|嘉佳|炫动|优优宝贝|宝贝家|亲子|动漫秀场|新动漫/;

function mainGroupOf(ch) {
  const n = ch.name;
  if (/cctv|cgtn|央视/i.test(n)) return "央视";
  if (n.includes("卫视")) return "卫视";
  if (ANIM_RE.test(n)) return "动画";
  return "";
}

/* ---------- 源拉取与合并 ---------- */
async function fetchFeed(f) {
  const ep = f.local
    ? tvApi("/playlist?local=" + encodeURIComponent(f.local))
    : tvApi("/playlist?url=" + encodeURIComponent(f.url));
  const r = await fetch(ep, { cache: "no-store" });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || d.error) throw new Error(d.error || r.status);
  return { feed: f, channels: d.channels || [] };
}

/* 已知错误源黑名单（内容不符/测试卡/位图伪装成流），任何上游源命中都丢弃 */
const URL_BLACKLIST = [
  /event\.pull\.hebtv\.com\/jishi/i,   // TVU 测试卡，曾被标成 CCTV-13/14
  /\/tvu\//i,
];

function isBlacklisted(u) {
  return URL_BLACKLIST.some((re) => re.test(u));
}

function mergeFeeds(results) {
  const map = new Map();
  const strictLoaded = results.some((r) => r.feed.strict);
  for (const { feed, channels } of results) {
    for (const ch of channels) {
      if (!ch.url) continue;
      if (isBlacklisted(ch.url)) continue;
      const k = keyOf(ch.name);
      if (!k) continue;
      const g = mainGroupOf(ch);
      if (!g) continue;                     // 只保留 央视/卫视/动画
      let m = map.get(k);
      if (!m) {
        m = { raw: ch.name, name: baseName(ch.name),
              group: g, logo: ch.logo, variants: [],
              priOrder: [], secOrder: [] };
        map.set(k, m);
      }
      if (ch.name.length > m.raw.length) {          // 保留最完整的原始名
        m.raw = ch.name;
        m.name = baseName(ch.name) || ch.name;
      }
      if (!m.logo && ch.logo) m.logo = ch.logo;
      // 同一清晰度归到一个变体；实测可用的地址进 pri，其余进 sec
      const ri = resInfo(ch.name);
      let v = m.variants.find((x) => x.label === ri.label);
      if (!v) {
        v = { label: ri.label, val: ri.val, pri: [], sec: [] };
        m.variants.push(v);
      }
      const bucket = feed.strict ? v.pri : v.sec;
      if (!bucket.includes(ch.url)) bucket.push(ch.url);
      // 播放顺序：严格按源内顺序（人工精测源内部就是按实测速度降序排列的）
      if (feed.strict) {
        if (!m.priOrder.includes(ch.url)) m.priOrder.push(ch.url);
      } else if (!m.secOrder.includes(ch.url)) {
        m.secOrder.push(ch.url);
      }
    }
  }
  const list = [...map.values()];
  for (const m of list) {
    m.variants.sort((a, b) => b.val - a.val);        // 展示顺序：清晰度从高到低
    for (const v of m.variants) v.urls = [...v.pri, ...v.sec];
    // 播放顺序：实测可用的地址按源内顺序（速度降序）优先，其余按清晰度兜底
    m.urls = [...m.priOrder, ...m.secOrder];
    m.url = m.urls[0];                               // 兼容收藏/最近播放
    // 实测源加载成功时，没有任何实测可用地址 = 当前无源
    m.dead = strictLoaded && !m.priOrder.length;
  }
  return list;
}

async function checkProxy() {
  if (!TV_API) return false;
  if (window.TV_CONFIG && window.TV_CONFIG.configured === false) return false;
  try {
    const r = await fetch(tvApi("/ping"), { cache: "no-store" });
    if (!r.ok) return false;
    const d = await r.json();
    return !!d.ok;
  } catch (e) {
    return false;
  }
}

async function loadAll() {
  state.channels = [];
  state.groups = new Map();
  state.currentGroup = null;
  state.view = "channels";
  els.searchInput.value = "";
  renderGroups();
  renderChannels([]);
  els.channelCount.textContent = "";
  mask("正在合并所有频道源…");
  setStatus("检查直播代理…");
  els.feedInfo.textContent = "连接代理中…";

  if (!(await checkProxy())) {
    const notConfigured = window.TV_CONFIG && window.TV_CONFIG.configured === false;
    els.feedInfo.textContent = notConfigured ? "直播代理未配置" : "直播代理未连接";
    mask(notConfigured
      ? "尚未配置直播代理：请先部署 tv-worker，并在 tv/config.js 填入 Worker 地址"
      : "直播代理未连接：本地请先运行 npm run tv:dev，线上请检查 Worker 地址", true);
    setStatus(notConfigured ? "直播代理未配置" : "直播代理未连接", true);
    return;
  }

  const results = await Promise.allSettled(state.feeds.map(fetchFeed));
  const ok = [], failed = [];
  results.forEach((r, i) => {
    if (r.status === "fulfilled") ok.push(r.value);
    else failed.push(state.feeds[i].name);
  });

  state.channels = mergeFeeds(ok);
  buildGroups();
  renderGroups();
  renderGroupChannels();
  const totalUrls = state.channels.reduce((s, c) => s + c.urls.length, 0);
  els.feedInfo.textContent = (state.feeds.length - failed.length) + "/" +
    state.feeds.length + " 个源已合并";
  if (!state.channels.length) {
    mask("所有源拉取失败，请检查网络后点\"重新合并\"", true);
    setStatus("源拉取失败", true);
    return;
  }
  mask("选择频道开始播放");
  setStatus(`共 ${state.channels.length} 个频道 · ${totalUrls} 条地址` +
    (failed.length ? `（${failed.join("、")} 拉取失败）` : ""));
}

/* ---------- 排序 ---------- */
/* 央视：CCTV-1..17 按数字升序 -> CCTV-8K/CGTN -> CCTV+ -> 其他（风云系列等）按名 */
function cctvTier(name) {
  const c = name.replace(/[\s\-·]/g, "").toUpperCase();
  let m = c.match(/^CCTV(\d{1,2})(K)/);
  if (m) return { t: 1, n: parseInt(m[1], 10) };          // CCTV-8K 等特种
  m = c.match(/^CCTV(\d{1,2})/);
  if (m) return { t: 0, n: parseInt(m[1], 10) };          // CCTV-1..17
  if (c.startsWith("CGTN")) return { t: 1, n: 100 };
  m = c.match(/^CCTV\+(\d)/);
  if (m) return { t: 2, n: parseInt(m[1], 10) };
  return { t: 3, n: 999 };                                // 小众/付费频道靠后
}

const zhCmp = (a, b) => a.name.localeCompare(b.name, "zh-Hans-CN");

function channelCmp(a, b) {
  if (a.group === "央视") {
    const ta = cctvTier(a.name), tb = cctvTier(b.name);
    if (ta.t !== tb.t) return ta.t - tb.t;
    if (ta.n !== tb.n) return ta.n - tb.n;
    return zhCmp(a, b);
  }
  return zhCmp(a, b);
}

/* 分组次序：央视 > 卫视 > 动画 */
function groupPrio(g) {
  if (g === "央视") return 0;
  if (g === "卫视") return 1;
  return 2;
}

function sortChannels() {
  state.channels.sort((a, b) =>
    groupPrio(a.group) - groupPrio(b.group) ||
    (a.dead ? 1 : 0) - (b.dead ? 1 : 0) ||          // 无源频道沉到分组末尾
    channelCmp(a, b));
}

function buildGroups() {
  sortChannels();
  const map = new Map();
  for (const ch of state.channels) {
    const g = ch.group || "其他";
    if (!map.has(g)) map.set(g, []);
    map.get(g).push(ch);
  }
  state.groups = new Map([...map.entries()].sort((a, b) =>
    groupPrio(a[0]) - groupPrio(b[0])));
}

/* ---------- 分组渲染 ---------- */
function renderGroups() {
  const favs = getFavs();
  let html = `
    <div class="group-item ${state.view === "favs" ? "active" : ""}" data-view="favs">${icon("star", 15)} 收藏 <span class="cnt">${favs.length}</span></div>
    <div class="group-item ${state.view === "recent" ? "active" : ""}" data-view="recent">${icon("clock", 15)} 最近播放</div>
    <div class="group-item ${state.view === "channels" && state.currentGroup === null ? "active" : ""}" data-group="">全部频道 <span class="cnt">${state.channels.length}</span></div>
    <div style="height:6px"></div>`;
  for (const [g, list] of state.groups) {
    const active = state.view === "channels" && state.currentGroup === g;
    html += `<div class="group-item ${active ? "active" : ""}" data-group="${esc(g)}">${esc(g)} <span class="cnt">${list.length}</span></div>`;
  }
  els.groupList.innerHTML = html;
  els.groupList.querySelectorAll(".group-item").forEach((el) => {
    el.onclick = () => {
      if (el.dataset.view) {
        state.view = el.dataset.view;
        state.currentGroup = null;
      } else {
        state.view = "channels";
        state.currentGroup = el.dataset.group || null;
      }
      els.searchInput.value = "";
      renderGroups();
      renderGroupChannels();
    };
  });
}

/* ---------- 频道渲染 ---------- */
function renderGroupChannels() {
  if (state.view === "favs") return renderChannels(getFavs(), "收藏的频道");
  if (state.view === "recent") return renderChannels(getRecent(), "最近播放");
  const list = state.currentGroup === null
    ? state.channels
    : (state.groups.get(state.currentGroup) || []);
  renderChannels(list, state.currentGroup === null ? "全部频道" : state.currentGroup);
}

/* logo 候选链：数据自带 logo 失效时，按台名从公共 logo 库补齐 */
const logoCands = new Map();          // channel.url -> [候选地址]

function logoCandsFor(ch) {
  const out = [];
  const push = (u) => { if (u && !out.includes(u)) out.push(u); };
  if (ch.logo) push(ch.logo);
  const raw = ch.raw || ch.name || "";
  const m = raw.match(/CCTV[\s\-]?(\d{1,2})(K)?/i);
  if (m) push(`https://tb.zbds.top/logo/CCTV${m[1]}${m[2] || ""}.png`);
  if (/^CGTN/i.test(raw)) push("https://tb.zbds.top/logo/CGTN.png");
  const cn = raw.split(/[（(]/)[0].trim();
  if (/[\u4e00-\u9fff]/.test(cn))
    push(`https://tb.zbds.top/logo/${encodeURIComponent(cn)}.png`);
  return out;
}

/* 无 logo 时的占位文字：CCTV-5 -> 5，其余取首字 */
function shortLabel(name) {
  const n = (name || "").trim();
  const m = n.match(/^CCTV[\s-]?(\d{1,2})/i);
  if (m) return m[1];
  if (/^CGTN/i.test(n)) return "C";
  return (n[0] || "·").toUpperCase();
}

function renderChannels(list, title) {
  state.playList = list;
  const LIMIT = 500;
  const shown = list.slice(0, LIMIT);
  els.channelCount.textContent = `${list.length} 个频道` + (title ? ` · ${title}` : "");
  const favSet = new Set(getFavs().map((c) => c.url));
  let html = shown.map((ch, i) => {
    const cands = logoCandsFor(ch);
    logoCands.set(ch.url, cands);
    const first = cands[0] || "";
    return `
    <div class="ch-item ${ch.dead ? "dead" : ""} ${state.current && state.current.name === ch.name ? "active" : ""}" data-i="${i}">
      <span class="ch-logo"><span class="ph">${esc(shortLabel(ch.name))}</span>${
        first ? `<img src="${esc(first)}" data-k="${esc(ch.url)}" data-ci="0" loading="lazy" alt="" onload="this.style.opacity=1">` : ""}</span>
      <span class="nm" title="${esc(ch.name)}">${esc(ch.name)}</span>
      ${ch.dead ? `<span class="dead-badge" title="当前没有实测可用的地址">无源</span>` : ""}
      ${ch.urls && ch.urls.length > 1 ? `<span class="src-cnt" title="该频道有 ${ch.urls.length} 个源互备">×${ch.urls.length}</span>` : ""}
      <button class="star ${favSet.has(ch.url) ? "on" : ""}" data-url="${esc(ch.url)}" title="收藏">${favSet.has(ch.url) ? icon("star-fill", 14) : icon("star", 14)}</button>
    </div>`;}).join("");
  if (list.length > LIMIT) {
    html += `<div class="list-tip">仅显示前 ${LIMIT} 个，请用分组或搜索缩小范围</div>`;
  }
  if (!list.length) html = `<div class="list-tip">暂无频道</div>`;
  els.channelList.innerHTML = html;

  els.channelList.querySelectorAll(".ch-item").forEach((el) => {
    el.onclick = (ev) => {
      if (ev.target.classList.contains("star")) return;
      play(state.playList[+el.dataset.i]);
    };
  });
  els.channelList.querySelectorAll(".star").forEach((el) => {
    el.onclick = () => toggleFav(el.dataset.url);
  });
}

/* logo 加载失败 → 依次尝试候选库，全部失败回落字母占位 */
els.channelList.addEventListener("error", (ev) => {
  const img = ev.target;
  if (img.tagName !== "IMG" || !img.dataset.k) return;
  const cands = logoCands.get(img.dataset.k) || [];
  const i = (+img.dataset.ci || 0) + 1;
  if (i < cands.length) { img.dataset.ci = i; img.src = cands[i]; }
  else img.remove();
}, true);

/* ---------- 收藏 / 最近 ---------- */
function getFavs() { return store.get(LS.favs, []); }
function getRecent() { return store.get(LS.recent, []); }

function snapshot(ch) {
  return { name: ch.name, group: ch.group, logo: ch.logo,
           url: ch.url, urls: ch.urls || [ch.url],
           variants: ch.variants || [{ label: "", val: 0, urls: [ch.url] }] };
}

function toggleFav(url) {
  let favs = getFavs();
  if (favs.some((c) => c.url === url)) {
    favs = favs.filter((c) => c.url !== url);
  } else {
    const ch = state.channels.find((c) => c.url === url) || state.current;
    if (ch) favs.unshift(snapshot(ch));
  }
  store.set(LS.favs, favs);
  if (state.current && state.current.url === url) updateFavBtn();
  renderGroups();
  renderGroupChannels();
}

function updateFavBtn() {
  const on = state.current && getFavs().some((c) => c.url === state.current.url);
  els.favBtn.innerHTML = icon(on ? "star-fill" : "star", 16) +
    '<span class="lbl"> ' + (on ? "已收藏" : "收藏") + '</span>';
}

function saveRecent(ch) {
  let r = getRecent().filter((c) => c.name !== ch.name);
  r.unshift(snapshot(ch));
  store.set(LS.recent, r.slice(0, 20));
}

/* ---------- 播放（多地址自动托底） ---------- */
function proxied(url) {
  // tv-worker 已经把频道地址包成 <api>/media?cid=…&i=…，分片地址包成
  // <api>/proxy?url=…；这类地址原样用，避免二次包装。
  if (TV_API && url.indexOf(TV_API + "/") === 0) return url;
  return tvApi("/proxy?url=") + encodeURIComponent(url);
}

let failover = { tried: new Set(), total: 1, curLabel: "", round: 0 };

/* 播放器清晰度菜单：列出当前频道的各清晰度变体（≥2 种才显示），无标注的归为"默认" */
function renderQualityMenu() {
  const opts = ((state.current && state.current.variants) || [])
    .filter((v) => v.urls.length)
    .map((v) => ({ label: v.label || "默认", urls: v.urls }));
  if (opts.length < 2) {
    els.btnQuality.hidden = true;
    els.qualityMenu.hidden = true;
    if (els.btnQuality.parentElement) els.btnQuality.parentElement.hidden = true;
    return;
  }
  els.btnQuality.hidden = false;
  if (els.btnQuality.parentElement) els.btnQuality.parentElement.hidden = false;
  const cur = failover.curLabel || "默认";
  els.qualityMenu.innerHTML = opts.map((v) =>
    `<div class="qitem ${v.label === cur ? "cur" : ""}" data-label="${esc(v.label)}">${v.label === cur ? "✓ " : ""}${esc(v.label)}</div>`).join("");
  els.qualityMenu.querySelectorAll(".qitem").forEach((el) => {
    el.onclick = () => {
      els.qualityMenu.hidden = true;
      const v = (state.current.variants || []).find((x) => (x.label || "默认") === el.dataset.label);
      if (!v || !v.urls.length) return;
      failover = { tried: new Set([v.urls[0]]), total: state.current.urls.length,
                   curLabel: v.label, round: 0 };
      setStatus("切换清晰度 → " + (v.label || "默认"));
      showToast("清晰度 " + (v.label || "默认"));
      startPlayback(v.urls[0]);
    };
  });
}

els.btnQuality.onclick = (ev) => {
  ev.stopPropagation();
  els.qualityMenu.hidden = !els.qualityMenu.hidden;
  pokeControls(true);
};
document.addEventListener("click", (ev) => {
  if (!els.qualityMenu.hidden && !ev.target.closest(".menu-wrap"))
    els.qualityMenu.hidden = true;
});

/* 该频道所有候选地址（自身各清晰度 + 同名频道地址），去重 */
function candidatePool(cur) {
  const pool = [];
  for (const u of (cur.urls || [])) if (!pool.includes(u)) pool.push(u);
  const base = keyOf(cur.name);
  for (const c of state.channels) {
    if (keyOf(c.name) !== base) continue;
    for (const u of (c.urls || [c.url])) if (!pool.includes(u)) pool.push(u);
  }
  return pool;
}

/* 取下一个待试地址；全部试过后再整体重试一轮（免费源常是瞬时卡死） */
function nextSource() {
  const cur = state.current;
  if (!cur) return null;
  const pool = candidatePool(cur);
  let idx = pool.findIndex((u) => !failover.tried.has(u));
  if (idx < 0) {
    if ((failover.round || 0) < 1) {
      failover.round = (failover.round || 0) + 1;
      failover.tried.clear();
      idx = 0;
    } else {
      return null;
    }
  }
  return { url: pool[idx], idx: idx + 1, total: pool.length,
           round: failover.round || 0 };
}

/* 并行挑源（/pick）在 juice 版停用：频道地址已经是 Worker 的不透明地址，
   直接播第一条，失败由 nextSource + 看门狗逐条托底，少一次探测往返。 */

/* 自动播放：先尝试正常播放；被拦截就静音重试（静音一般放行）
   若仍失败（媒体未就绪/浏览器策略），保持 wantPlay，等 canplay/首片/用户交互再试 */
let wantPlay = false;
let retryAt = 0;

async function tryPlay() {
  try {
    await video.play();
    wantPlay = false;
    return true;
  } catch (e) {
    if (!video.muted) {
      video.muted = true;
      updateVolumeUI();
      try {
        await video.play();
        wantPlay = false;
        return true;
      } catch (e2) { /* 继续重试 */ }
    }
    return false;
  }
}

/* 满足条件就再试一次（节流 1.2s），成功后自动收掉遮罩 */
function retryPlay(reason) {
  if (!wantPlay || !state.current || !video.paused) return;
  const now = Date.now();
  if (now - retryAt < 1200) return;
  retryAt = now;
  tryPlay().then((ok) => {
    if (ok) { hideMask(); setStatus("播放中"); }
    else if (reason === "gesture") {
      mask("浏览器限制了自动播放，点任意位置开始", false, true, false);
    }
  });
}

/* 任意位置点击/按键都尝试起播（用户手势一定能过策略） */
["pointerdown", "keydown", "touchstart"].forEach((ev) =>
  document.addEventListener(ev, () => {
    if (wantPlay && video.paused) retryPlay("gesture");
  }, { passive: true, capture: true }));

async function play(ch, isFailover) {
  if (!ch) return;
  if (!isFailover) failover = { tried: new Set(), total: 1, curLabel: "", round: 0 };
  const urls = ch.urls && ch.urls.length ? ch.urls : [ch.url].filter(Boolean);
  if (!urls.length) return;

  state.current = Object.assign({}, ch, { urls });
  saveRecent(state.current);
  updateFavBtn();
  document.title = ch.name + " · 电视直播";
  els.nowName.textContent = ch.name;
  mask("正在连接 " + esc(ch.name) + " ", false, false, true);
  setStatus("正在挑选可用源…");
  showOsd(ch);
  pokeControls(true);

  wantPlay = true;
  const pool = candidatePool(state.current);
  failover.total = pool.length;
  const url = pool[0];
  if (!url) {
    mask("该频道没有任何可用地址", true);
    setStatus("无可用地址", true);
    return;
  }
  failover.tried.add(url);
  startPlayback(url);
  // 刷新列表高亮（按频道名）
  els.channelList.querySelectorAll(".ch-item").forEach((el) => {
    const ch2 = state.playList[+el.dataset.i];
    el.classList.toggle("active", !!ch2 && ch2.name === ch.name);
  });
}

/* ---------- 实时码率 / 下载速度 ---------- */
const net = {
  kbps: 0,        // 实测码率（kbit/s）
  speed: 0,       // 实测下载速度（KB/s）
  declared: 0,    // 清晰度档位声明码率（kbit/s）
  lastAt: 0,
};

function fmtBitrate(kbps) {
  if (!kbps) return "--";
  return kbps >= 1000 ? (kbps / 1000).toFixed(1) + "M" : Math.round(kbps) + "K";
}
function fmtSpeed(kbs) {
  if (!kbs) return "--";
  return kbs >= 1024 ? (kbs / 1024).toFixed(2) + "MB/s" : Math.round(kbs) + "KB/s";
}

function renderNetStats() {
  const el = els.netStats;
  if (!el) return;
  if (!state.current || video.paused || !net.kbps) {
    el.textContent = "--";
    el.className = "net-stats";
    return;
  }
  el.textContent = fmtBitrate(net.kbps) + "bps · ↓" + fmtSpeed(net.speed);
  const need = net.kbps / 8 / 1024;                 // 播放所需 KB/s
  el.className = "net-stats" +
    (net.speed < need * 0.8 ? " bad" : net.speed < need * 1.3 ? " slow" : "");
}

/* 持续采样：分片事件只在加载时触发，直播低码率分片间隔长，
   所以再用 video 缓冲增长 + hls 内部统计做兜底，保证一直有数 */
let lastSample = { t: 0, buffered: 0, bytes: 0, frag: 0 };

function sampleNet() {
  if (!state.current || video.paused) { renderNetStats(); return; }

  // 1) 缓冲增长速率（KB/s）：直播分片写入 MediaSource 后 buffered 会增加
  const now = Date.now();
  let bufEnd = 0;
  try {
    const b = video.buffered;
    for (let i = 0; i < b.length; i++) bufEnd += Math.max(0, b.end(i) - b.start(i));
  } catch (e) { /* ignore */ }
  lastSample = { t: now, buffered: bufEnd };

  // 2) hls.js 带宽估算（单位是 bit/s，换算成 KB/s）
  if (hls && hls.bandwidthEstimate > 0) {
    const est = hls.bandwidthEstimate / 8 / 1024;            // KB/s
    if (est > 0 && est < 200000)                             // 过滤异常值
      net.speed = net.speed ? net.speed * 0.6 + est * 0.4 : est;
  }

  // 3) 码率兜底：分片没更新时用当前清晰度档位的声明码率
  if (!net.kbps && net.declared) net.kbps = net.declared;

  renderNetStats();
}
setInterval(sampleNet, 1000);

/* 分片加载完成 → 用真实字节数/耗时算速度与码率 */
function onFragLoaded(data) {
  const frag = data && data.frag;
  const st = frag && frag.stats;
  if (!st) return;
  const ld = st.loading || {};
  const bytes = ld.loaded || st.total || 0;
  const ms = (ld.end && ld.start) ? (ld.end - ld.start) : 0;
  if (bytes > 0 && ms > 60) {
    const speedKB = bytes / 1024 / (ms / 1000);
    if (speedKB > 0 && speedKB < 200000)
      net.speed = net.speed ? net.speed * 0.55 + speedKB * 0.45 : speedKB;
  }
  const dur = frag.duration || 0;
  if (st.total > 0 && dur > 0) {
    const kbps = (st.total * 8) / dur / 1000;
    net.kbps = net.kbps ? net.kbps * 0.5 + kbps * 0.5 : kbps;
  }
  if (!net.kbps && net.declared) net.kbps = net.declared;
  net.lastAt = Date.now();
}

function startPlayback(url) {
  const v = ((state.current && state.current.variants) || [])
    .find((x) => x.urls.includes(url));
  failover.curLabel = v ? v.label : "";
  renderQualityMenu();
  armStallWatchdog();
  const src = proxied(url);
  if (window.Hls && Hls.isSupported()) {
    if (hls) { hls.destroy(); hls = null; }
    net.kbps = net.speed = net.declared = 0;
    net.lastAt = 0;
    hls = new Hls({
      // 免费源经常"连上不吐数据"，超时设短一点，尽快切下一条
      manifestLoadingTimeOut: 8000,
      manifestLoadingMaxRetry: 1,
      levelLoadingTimeOut: 8000,
      levelLoadingMaxRetry: 1,
      fragLoadingTimeOut: 20000,
      fragLoadingMaxRetry: 1,
    });
    hls.on(Hls.Events.ERROR, (_, data) => {
      logHls(data);
      if (!data.fatal) return;
      if (data.type === Hls.ErrorTypes.NETWORK_ERROR &&
          (data.details === "manifestLoadError" || data.details === "manifestParsingError")) {
        if (switchNext("源失效")) return;
        setStatus("连接失败：该频道所有备用源均失效", true);
        mask("播放失败，这个频道的所有源都不可用。<br>试试换一个频道。", true);
      } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
        // 解码失败（常见于 HEVC/H.265 源，Chrome 不支持）→ 直接换下一条，别原地重试
        if (data.details === "bufferAddCodecError" || data.details === "fragParsingError" ||
            data.reason === "noExplicitAlignment") {
          if (switchNext("编码不支持")) return;
        }
        failover.mediaRetry = (failover.mediaRetry || 0) + 1;
        if (failover.mediaRetry <= 2) { hls.recoverMediaError(); return; }
        if (switchNext("解码失败")) return;
        setStatus("播放出错：" + data.details, true);
      } else {
        setStatus("播放出错：" + data.details, true);
      }
    });
    hls.on(Hls.Events.FRAG_LOADED, (_, data) => { onFragLoaded(data); retryPlay("frag"); });
    hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
      const lv = hls.levels && hls.levels[data.level];
      if (lv && lv.bitrate) {
        net.declared = lv.bitrate / 1000;
        if (!net.kbps) net.kbps = net.declared;
      }
    });
    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      setStatus("播放中" + (failover.curLabel ? ` · ${failover.curLabel}` : "") +
        (failover.total > 1 ? `（共 ${failover.total} 条地址）` : ""));
      tryPlay().then((ok) => { if (ok) hideMask(); else retryPlay("manifest"); });
    });
    hls.loadSource(src);
    hls.attachMedia(video);
  } else {
    video.src = src;
    tryPlay().then((ok) => { if (ok) hideMask(); else retryPlay("direct"); });
  }
}

/* 换下一条源；没有更多可试的返回 false */
function switchNext(reason) {
  const nx = nextSource();
  if (!nx) return false;
  failover.tried.add(nx.url);
  setStatus(`${reason}，自动切换${nx.round ? "（重试轮）" : ""} (${nx.idx}/${nx.total})…`);
  startPlayback(nx.url);
  return true;
}

/* 看门狗（分两阶段）：
   8 秒还没拿到播放列表 → 这条源基本是死的，立刻换；
   拿到了列表但迟迟不出画面 → 再等 20 秒（慢源首个分片可能要十几秒） */
let stallTimer = null;
let playToken = 0;

function armStallWatchdog() {
  const tk = ++playToken;
  clearTimeout(stallTimer);
  stallTimer = setTimeout(() => {
    if (tk !== playToken || video.videoWidth > 0) return;
    const noManifest = !hls || !hls.levels || hls.levels.length === 0;
    if (noManifest) {
      if (!switchNext("源无响应")) {
        setStatus("该频道所有备用源均无响应", true);
        mask("这个频道的源都连不上。<br>试试换一个频道。", true);
      }
      return;
    }
    stallTimer = setTimeout(() => {
      if (tk !== playToken || video.videoWidth > 0) return;
      if (!switchNext("源无画面")) {
        setStatus("该频道所有备用源均无画面", true);
        mask("这个频道的源都连不上或没有画面。<br>试试换一个频道。", true);
      }
    }, 20000);
  }, 8000);
}

function step(dir) {
  if (!state.playList.length) return;
  // 上下台时跳过"无源"频道，避免一路黑屏
  const live = state.playList.filter((c) => !c.dead);
  const pool = live.length ? live : state.playList;
  let idx = state.current
    ? pool.findIndex((c) => c.name === state.current.name) : -1;
  idx = idx < 0 ? 0 : (idx + dir + pool.length) % pool.length;
  play(pool[idx]);
}

/* ---------- 自定义源（并入合并池） ---------- */
els.addSourceBtn.onclick = () => { els.sourceDialog.showModal(); };
els.sourceForm.addEventListener("click", (ev) => {
  if (ev.target.value === "cancel") els.sourceDialog.close();
});
els.sourceForm.addEventListener("submit", (ev) => {
  ev.preventDefault();
  const name = els.srcName.value.trim();
  const url = els.srcUrl.value.trim();
  if (!/^https?:\/\//.test(url)) return alert("源地址需以 http(s):// 开头");
  const custom = store.get(LS.customFeeds, []);
  custom.push({ name: name || "自定义源", url });
  store.set(LS.customFeeds, custom);
  state.feeds = [...BUILTIN_FEEDS, ...custom];
  els.sourceDialog.close();
  els.srcName.value = els.srcUrl.value = "";
  loadAll();
});

/* ---------- 事件绑定 ---------- */
els.reloadFeedsBtn.onclick = loadAll;

let searchTimer = null;
els.searchInput.oninput = () => {
  clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    const kw = els.searchInput.value.trim().toLowerCase();
    if (!kw) return renderGroupChannels();
    const hits = state.channels.filter((c) => c.name.toLowerCase().includes(kw)).slice(0, 300);
    renderChannels(hits, `搜索"${els.searchInput.value.trim()}"`);
  }, 250);
};



/* ---------- 控制条归属 ----------
   桌面：放回 video-box 内部，绝对定位浮在画面底部（宽度对齐画面）
   手机：放到 playerPanel 里作为独立一栏，不遮画面 */
function placeCtrlBar() {
  const bar = els.ctrlBar;
  if (!bar || !els.playerPanel) return;
  // 控制条永远作为播放器面板里的一行，位于视频下方、频道信息栏上方
  if (bar.parentElement !== els.playerPanel) {
    els.playerPanel.insertBefore(bar, els.nowBar || null);
  }
  if (!bar.classList.contains("in-panel")) bar.classList.add("in-panel");
}

/* ---------- 控制条贴合视频画面 ----------
   video 用 object-fit: contain，实际画面四周可能有黑边。
   算出真实画面的矩形，把控制条宽度/位置对齐到画面，而不是整个容器。 */
function syncCtrlBarToVideo() {
  const bar = els.ctrlBar;
  if (!bar) return;
  // 控制条是独立一行（不覆盖画面），清掉任何内联定位
  bar.style.left = "";
  bar.style.right = "";
  bar.style.bottom = "";
  bar.style.width = "";
  // 按播放器面板宽度决定隐藏哪些次要控件
  const panelW = (els.playerPanel && els.playerPanel.clientWidth) || 0;
  if (panelW) {
    bar.classList.toggle("w-narrow", panelW < 760);
    bar.classList.toggle("w-tight", panelW < 600);
  }
}

/* 容器尺寸变化（窗口缩放 / 全屏 / 侧栏折叠）时重新对齐 */
if (window.ResizeObserver) {
  new ResizeObserver(() => syncCtrlBarToVideo()).observe(els.videoBox);
}

/* ---------- 播放器控制层 ---------- */
/* 控制条显隐只由「用户操作」驱动：媒体事件（缓冲等）只刷新图标，不重置计时器 */
const controls = { lastUser: 0 };

function maskVisible() { return !els.videoMask.classList.contains("hide"); }
function isMenuOpen() { return !els.qualityMenu.hidden; }

function pokeControls(fromUser) {
  if (fromUser) controls.lastUser = Date.now();
  document.body.classList.remove("ctrl-hidden");
}
/* 控制条是常驻独立行，不做自动隐藏（避免画面留空档/闪烁） */
document.body.classList.remove("ctrl-hidden");

function updatePlayIcon() {
  els.btnPlay.innerHTML = icon(video.paused ? "play" : "pause", 18);
  document.body.classList.toggle("paused", video.paused);
}

function togglePlay() {
  if (!state.current) return;
  if (video.paused) {
    backToLive(false);
    tryPlay().then((ok) => {
      if (!ok) mask("浏览器限制了自动播放，点任意位置开始", false, true, false);
    });
  } else {
    video.pause();
  }
  pokeControls(true);
}

function updateVolumeUI() {
  const name = (video.muted || video.volume === 0) ? "vol-x"
    : (video.volume < 0.5 ? "vol-1" : "vol-2");
  els.btnVol.innerHTML = icon(name, 17);
  els.volSlider.value = video.muted ? 0 : Math.round(video.volume * 100);
}

function toggleMute() {
  video.muted = !video.muted;
  if (!video.muted && video.paused) tryPlay();
  updateVolumeUI();
  showToast(video.muted ? "已静音" : "音量 " + Math.round(video.volume * 100) + "%");
}

function showToast(text) {
  els.toast.textContent = text;
  els.toast.hidden = false;
  clearTimeout(showToast._t);
  showToast._t = setTimeout(() => { els.toast.hidden = true; }, 1600);
}

/* 频道切换 OSD（TiviMate 风格）：台标 + 频道名 + 直播角标 */
let osdTimer = null;
function showOsd(ch, numText) {
  els.osdNum.textContent = numText || "";
  els.osdNum.hidden = !numText;
  els.osdLogo.textContent = shortLabel(ch.name);
  els.osdName.textContent = ch.name;
  els.osdGroup.textContent = ch.group || "";
  els.osd.hidden = false;
  clearTimeout(osdTimer);
  if (!numText) osdTimer = setTimeout(() => { els.osd.hidden = true; }, 2600);
}
function hideOsdSoon() {
  clearTimeout(osdTimer);
  osdTimer = setTimeout(() => { els.osd.hidden = true; }, 1200);
}

/* ---------- 直播进度 / 回看 ---------- */
function seekWindow() {
  const s = video.seekable;
  if (s && s.length) {
    const start = s.start(0), end = s.end(s.length - 1);
    if (end - start > 20) return { start, end };
  }
  return null;   // 纯直播没有可回看窗口
}

function liveEdge() {
  return hls && hls.liveSyncPosition ? hls.liveSyncPosition
    : (video.seekable.length ? video.seekable.end(video.seekable.length - 1) : 0);
}

function updateProgress() {
  const w = seekWindow();
  if (!w || video.readyState === 0) {
    els.seekBar.classList.add("na");
    els.seekPlayed.style.width = "0%";
    els.seekBuf.style.width = "0%";
    els.btnLive.hidden = true;
    els.clockText.textContent = "--:--";
    return;
  }
  els.seekBar.classList.remove("na");
  const frac = (x) => Math.max(0, Math.min(1, (x - w.start) / (w.end - w.start)));
  let bufEnd = video.currentTime;
  for (let i = 0; i < video.buffered.length; i++) {
    if (video.buffered.start(i) <= video.currentTime + 0.5 &&
        video.buffered.end(i) >= video.currentTime)
      bufEnd = Math.min(video.buffered.end(i), w.end);
  }
  els.seekBuf.style.width = (frac(bufEnd) * 100) + "%";
  els.seekPlayed.style.width = (frac(video.currentTime) * 100) + "%";
  els.btnLive.hidden = !((liveEdge() - video.currentTime) > 12);
  els.clockText.textContent = new Date().toTimeString().slice(0, 5);
}
setInterval(updateProgress, 500);
setInterval(syncCtrlBarToVideo, 800);   // 尺寸/画面变化兜底对齐

function backToLive(force) {
  const w = seekWindow();
  if (!w) return;
  const pos = liveEdge() || w.end;
  if (force || pos - video.currentTime > 12) {
    try { video.currentTime = Math.max(w.start, pos - 1); } catch (e) { /* ignore */ }
  }
}

function seekBy(sec) {
  const w = seekWindow();
  if (!w) { showToast("当前源不支持回看"); return; }
  video.currentTime = Math.max(w.start + 1, Math.min(w.end - 1, video.currentTime + sec));
  showToast((sec > 0 ? "快进 " : "回退 ") + Math.abs(sec) + " 秒");
}

els.seekBar.addEventListener("click", (ev) => {
  const w = seekWindow();
  if (!w) return;
  const rect = els.seekBar.getBoundingClientRect();
  const frac = Math.max(0, Math.min(1, (ev.clientX - rect.left) / rect.width));
  video.currentTime = w.start + frac * (w.end - w.start);
  pokeControls(true);
});
els.btnLive.onclick = () => { backToLive(true); video.play().catch(() => {}); showToast("已回到直播"); };

/* ---------- 全屏 / 画中画 ---------- */
function toggleFs() {
  if (document.fullscreenElement) {
    document.exitFullscreen().catch(() => {});
  } else if (els.playerPanel && els.playerPanel.requestFullscreen) {
    els.playerPanel.requestFullscreen().catch(() => {
      // 兜底：退回到只全屏视频容器
      els.videoBox.requestFullscreen().catch(() => showToast("全屏不可用"));
    });
  }
}
document.addEventListener("fullscreenchange", () => {
  const fs = !!document.fullscreenElement;
  els.btnFs.innerHTML = icon(fs ? "minimize" : "maximize", 16);
  document.body.classList.toggle("is-fullscreen", fs);
  document.body.classList.remove("ctrl-hidden");      // 进入/退出全屏都先显示控制条
  controls.lastUser = Date.now();
  [30, 120, 350, 800].forEach((d) =>
    setTimeout(() => { placeCtrlBar(); pokeControls(true); }, d));
});

function togglePip() {
  if (document.pictureInPictureElement) {
    document.exitPictureInPicture();
  } else if (document.pictureInPictureEnabled && video.requestPictureInPicture) {
    video.requestPictureInPicture().catch(() => showToast("画中画不可用"));
  } else {
    showToast("当前浏览器不支持画中画");
  }
}
if (!document.pictureInPictureEnabled) els.btnPip.hidden = true;

/* ---------- 数字选台（老电视遥控器式，输入 1-3 位自动跳转） ---------- */
let numBuf = "", numTimer = null;
function numInput(d) {
  if (!state.playList.length) return;
  numBuf += d;
  showOsd(state.current || state.playList[0], numBuf);
  const n = parseInt(numBuf, 10);
  const maxN = Math.min(state.playList.length, 999);
  const jump = () => {
    clearTimeout(numTimer);
    numTimer = null;
    const nn = parseInt(numBuf, 10);
    numBuf = "";
    if (nn >= 1 && nn <= state.playList.length) {
      play(state.playList[nn - 1]);
    } else {
      showToast("无此频道号 " + nn);
      hideOsdSoon();
    }
  };
  if (n * 10 > maxN || numBuf.length >= 3) { jump(); return; }
  clearTimeout(numTimer);
  numTimer = setTimeout(jump, 1100);
}

/* ---------- 控制层事件 ---------- */
["mousemove", "pointerdown", "touchstart"].forEach((e) => {
  els.videoBox.addEventListener(e, () => pokeControls(true), { passive: true });
  // 全屏时元素会变成 fullscreen 根，document 级兜底，保证一定能唤出控制条
  document.addEventListener(e, () => {
    if (document.fullscreenElement) pokeControls(true);
  }, { passive: true });
});
els.videoBox.addEventListener("mouseleave", () => {
  if (!video.paused && !maskVisible() && !isMenuOpen()) {
    document.body.classList.add("ctrl-hidden");
    controls.lastUser = 0;
  }
});
els.ctrlBar.addEventListener("mouseenter", () => pokeControls(true));
els.ctrlBar.addEventListener("mouseleave", pokeControls);

/* 单击切换控制条，双击全屏（260ms 区分） */
let clickTimer = null;
els.videoBox.addEventListener("click", (ev) => {
  if (ev.target.closest(".ctrl-bar") || ev.target.closest(".qmenu")) return;
  if (maskVisible()) return;
  if (clickTimer) { clearTimeout(clickTimer); clickTimer = null; toggleFs(); return; }
  clickTimer = setTimeout(() => {
    clickTimer = null;
    if (document.body.classList.contains("ctrl-hidden")) {
      pokeControls(true);                 // 隐藏中 → 唤出
    } else {
      document.body.classList.add("ctrl-hidden");   // 显示中 → 隐藏
      controls.lastUser = 0;
    }
  }, 260);
});

els.btnPlay.onclick = togglePlay;
els.btnVol.onclick = toggleMute;
els.volSlider.addEventListener("input", () => {
  video.muted = false;
  video.volume = els.volSlider.value / 100;
  updateVolumeUI();
});
els.btnPip.onclick = togglePip;
els.btnFs.onclick = toggleFs;

els.prevBtn.onclick = () => step(-1);
els.nextBtn.onclick = () => step(1);
els.favBtn.onclick = () => { if (state.current) toggleFav(state.current.url); };
els.maskPlayBtn.onclick = () => tryPlay().then((ok) => { if (ok) hideMask(); });
/* 整个遮罩都可点（手机上按钮太小/被误触时更容易点中） */
els.videoMask.onclick = () => {
  if (els.videoMask.classList.contains("clickable")) {
    tryPlay().then((ok) => { if (ok) hideMask(); });
  }
};

video.addEventListener("volumechange", updateVolumeUI);
video.addEventListener("play", () => { updatePlayIcon(); pokeControls(); });
video.addEventListener("pause", () => { updatePlayIcon(); pokeControls(); });
video.addEventListener("emptied", () => { net.lastAt = 0; renderNetStats(); });
video.addEventListener("playing", () => {
  wantPlay = false;
  clearTimeout(stallTimer);
  els.bufSpinner.hidden = true;
  hideMask();
  setStatus("播放中");
  pokeControls();
});
video.addEventListener("waiting", () => {
  if (!maskVisible()) els.bufSpinner.hidden = false;   // 只显示小转圈，不弹遮罩
  setStatus("缓冲中…");
  pokeControls(true);                                   // 缓冲时也保证控制条可见可点
});
video.addEventListener("stalled", () => setStatus("缓冲中…"));
video.addEventListener("canplay", () => { els.bufSpinner.hidden = true; retryPlay("canplay"); });
video.addEventListener("loadeddata", () => retryPlay("loadeddata"));
video.addEventListener("loadedmetadata", syncCtrlBarToVideo);
video.addEventListener("resize", syncCtrlBarToVideo);
window.addEventListener("resize", () => { placeCtrlBar(); syncCtrlBarToVideo(); });

/* ---------- 快捷键 ---------- */
document.addEventListener("keydown", (ev) => {
  if (/INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName)) return;
  const k = ev.key;
  if (/^[0-9]$/.test(k)) { numInput(k); return; }
  switch (k) {
    case " ": ev.preventDefault(); togglePlay(); break;
    case "ArrowUp": ev.preventDefault(); step(-1); break;
    case "ArrowDown": ev.preventDefault(); step(1); break;
    case "ArrowLeft": ev.preventDefault(); seekBy(-15); break;
    case "ArrowRight": ev.preventDefault(); seekBy(15); break;
    case "m": case "M": toggleMute(); break;
    case "f": case "F": toggleFs(); break;
    case "p": case "P": togglePip(); break;
    case "Escape": if (!els.qualityMenu.hidden) els.qualityMenu.hidden = true; break;
  }
  pokeControls(true);
});

/* ---------- juice 内嵌模式 ---------- */
const EMBED = new URLSearchParams(location.search).get("embed") === "1";
if (EMBED) document.body.classList.add("embed");
function postReady() {
  if (EMBED && window.parent !== window) {
    try { window.parent.postMessage("tv:ready", "*"); } catch (e) { /* 忽略 */ }
  }
}
window.addEventListener("message", (ev) => {
  const data = ev.data;
  const type = typeof data === "string" ? data : (data && data.type);
  if (type === "tv:pause") {
    try { video.pause(); } catch (e) { /* 忽略 */ }
  }
});

/* ---------- 启动 ---------- */
document.querySelectorAll("[data-icon]").forEach((el) => {
  el.insertAdjacentHTML("afterbegin",
    icon(el.dataset.icon, +el.dataset.iconSize || 18));
});

placeCtrlBar();       // 控制条放到正确容器（桌面视频内 / 手机面板内）
video.muted = true;   // 静音启动，自动播放不被拦截；控制条喇叭恢复
updateVolumeUI();
updatePlayIcon();
state.feeds = [...BUILTIN_FEEDS, ...store.get(LS.customFeeds, [])];
loadAll().then(postReady).catch(postReady);

/* URL ?autostart=频道名：合并完成后自动播放匹配频道（自动化验证 / 遥控跳转用），
   参数为空值（?autostart）则播放第一个频道 */
const autoName = new URLSearchParams(location.search).get("autostart");
if (autoName !== null) {
  const kw = autoName.trim().toLowerCase();
  const tryPlay = setInterval(() => {
    if (!state.channels.length) return;
    clearInterval(tryPlay);
    const hit = (kw && state.channels.find((c) => keyOf(c.name) === keyOf(autoName)))
      || (kw && state.channels.find((c) => c.name.toLowerCase().includes(kw)))
      || state.channels[0];
    play(hit);
  }, 500);
  setTimeout(() => clearInterval(tryPlay), 30000);
}
