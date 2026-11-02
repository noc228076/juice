/* =========================================================
   电视直播（#/tv）
   原生模块：频道合并 / HLS 播放 / 多源自动托底。
   HLS 代理在 tv-worker（Cloudflare Worker），这里只负责 UI 与播放。
   ========================================================= */
(function () {
  'use strict';

  /* ---------- 配置 ---------- */
  function resolveApi() {
    var host = location.hostname;
    var local = host === 'localhost' || host === '127.0.0.1' || host === '::1' || host === '';
    var override = '';
    try { override = localStorage.getItem('tvApiBase') || ''; } catch (e) { /* 隐私模式 */ }
    var base = override || (local
      ? 'http://127.0.0.1:8787'
      : '/api/tv');
    return String(base).replace(/\/+$/, '');
  }

  var TV_API = resolveApi();
  /* 线上走 Vercel 同源 /api/tv?path=…（避免浏览器直连 workers.dev）；
     本地 dev 直接走 Worker 的 /playlist 等路径。 */
  function tvApi(path) {
    if (TV_API.indexOf('/api/tv') >= 0) return TV_API + '?path=' + encodeURIComponent(path);
    return TV_API + path;
  }
  var HLS_SRC = 'js/vendor/hls.min.js';
  var LS = {
    customFeeds: 'iptvweb.customFeeds',
    favs: 'iptvweb.favs',
    recent: 'iptvweb.recent'
  };
  var BUILTIN_FEEDS = [
    { name: '人工精测源', local: 'extra', strict: true },
    { name: '已测可用', local: 'verified', strict: true }
  ];
  var ANIM_RE = /卡通|动画|动漫|少儿|儿童|哈哈炫动|卡酷|金鹰卡通|优漫|嘉佳|炫动|优优宝贝|宝贝家|亲子|动漫秀场|新动漫/;

  /* ---------- 小工具 ---------- */
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function storeGet(k, d) {
    try {
      var v = JSON.parse(localStorage.getItem(k));
      return (v === null || v === undefined) ? d : v;
    } catch (e) { return d; }
  }
  function storeSet(k, v) {
    try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 忽略 */ }
  }
  function baseName(n) {
    var s = String(n || '')
      .replace(/\s*\((?:\d{3,4}[pi]|HD|SD|FHD|UHD)\)\s*$/i, '')
      .replace(/\s*\[[^\]]*\]\s*$/i, '')
      .replace(/\s+(?:8K|UHD|FHD|HD|SD)$/i, '')
      .trim();
    return s || String(n || '');
  }
  function keyOf(n) {
    return baseName(n).toLowerCase().replace(/[\s\-_.·]/g, '');
  }
  function resInfo(name) {
    var map = { '8k': 4320, '4k': 2160, 'uhd': 2160, '2k': 1440, 'fhd': 1080, 'hd': 720, 'sd': 480 };
    var m = String(name).match(/\(\s*(\d{3,4})\s*([pi])?\s*\)/i)
      || String(name).match(/\(\s*(8K|4K|2K|UHD|FHD|HD|SD)\s*\)/i);
    if (m) {
      var tok = (m[1] + (m[2] || '')).toLowerCase();
      var val = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : (map[tok] || 0);
      return { val: val, label: tok };
    }
    var b = String(name).match(/\b(8K|4K|UHD|FHD|HD|SD)$/i);
    if (b) {
      var t = b[1].toLowerCase();
      return { val: map[t] || 0, label: t };
    }
    return { val: 0, label: '' };
  }
  function mainGroupOf(ch) {
    var n = ch.name || '';
    if (/cctv|cgtn|央视/i.test(n)) return '央视';
    if (n.indexOf('卫视') >= 0) return '卫视';
    if (ANIM_RE.test(n)) return '动画';
    return '';
  }
  function shortLabel(name) {
    var n = String(name || '').trim();
    var m = n.match(/^CCTV[\s-]?(\d{1,2})/i);
    if (m) return m[1];
    if (/^CGTN/i.test(n)) return 'C';
    return (n[0] || '·').toUpperCase();
  }
  function fmtBitrate(kbps) {
    if (!kbps) return '--';
    return kbps >= 1000 ? (kbps / 1000).toFixed(1) + 'M' : Math.round(kbps) + 'K';
  }
  function fmtSpeed(kbs) {
    if (!kbs) return '--';
    return kbs >= 1024 ? (kbs / 1024).toFixed(2) + 'MB/s' : Math.round(kbs) + 'KB/s';
  }

  /* ---------- 状态 ---------- */
  var state = {
    feeds: [],
    channels: [],
    groups: new Map(),
    counts: { all: 0, '央视': 0, '卫视': 0, '动画': 0 },
    view: 'channels',
    group: 'all',
    query: '',
    current: null,
    playList: []
  };
  var els = {};
  var inited = false;
  var video = null;
  var hls = null;
  var hlsLoading = null;
  var failover = { tried: new Set(), total: 1, curLabel: '', round: 0, mediaRetry: 0 };
  var staticSources = new Set();
  var checkedSources = new Set();
  var wantPlay = false;
  var retryAt = 0;
  var playToken = 0;
  var stallTimer = null;
  var searchTimer = 0;
  var net = { kbps: 0, speed: 0, declared: 0, lastAt: 0 };

  /* ---------- 频道合并 ---------- */
  function mergeFeeds(results) {
    var map = new Map();
    var strictLoaded = results.some(function (r) { return r.feed.strict; });
    results.forEach(function (r) {
      (r.channels || []).forEach(function (ch) {
        if (!ch.url) return;
        var k = keyOf(ch.name);
        if (!k) return;
        var g = mainGroupOf(ch);
        if (!g) return;
        var m = map.get(k);
        if (!m) {
          m = {
            raw: ch.name, name: baseName(ch.name) || ch.name,
            group: g, logo: ch.logo || '', variants: [],
            priOrder: [], secOrder: [], hasStatic: false
          };
          map.set(k, m);
        }
        if (ch.name.length > m.raw.length) {
          m.raw = ch.name;
          m.name = baseName(ch.name) || ch.name;
        }
        if (!m.logo && ch.logo) m.logo = ch.logo;
        if (ch.static) { m.hasStatic = true; return; }
        var ri = resInfo(ch.name);
        var v = null;
        for (var i = 0; i < m.variants.length; i++) {
          if (m.variants[i].label === ri.label) { v = m.variants[i]; break; }
        }
        if (!v) {
          v = { label: ri.label, val: ri.val, pri: [], sec: [] };
          m.variants.push(v);
        }
        var bucket = r.feed.strict ? v.pri : v.sec;
        if (bucket.indexOf(ch.url) < 0) bucket.push(ch.url);
        if (r.feed.strict) {
          if (m.priOrder.indexOf(ch.url) < 0) m.priOrder.push(ch.url);
        } else if (m.secOrder.indexOf(ch.url) < 0) {
          m.secOrder.push(ch.url);
        }
      });
    });

    var list = [];
    map.forEach(function (m) {
      m.variants.sort(function (a, b) { return b.val - a.val; });
      m.variants.forEach(function (v) { v.urls = v.pri.concat(v.sec); });
      m.urls = m.priOrder.concat(m.secOrder);
      m.url = m.urls[0];
      m.staticOnly = !!m.hasStatic && !m.priOrder.length;
      m.dead = strictLoaded && !m.priOrder.length;
      list.push(m);
    });
    return list;
  }

  function fetchFeed(f) {
    var ep = f.local
      ? tvApi('/playlist?local=' + encodeURIComponent(f.local))
      : tvApi('/playlist?url=' + encodeURIComponent(f.url));
    return fetch(ep, { cache: 'no-store' }).then(function (r) {
      return r.json().catch(function () { return {}; }).then(function (d) {
        if (!r.ok || d.error) throw new Error(d.error || ('HTTP ' + r.status));
        return { feed: f, channels: d.channels || [] };
      });
    });
  }

  function checkProxy() {
    if (!TV_API) return Promise.resolve(false);
    return fetch(tvApi('/ping'), { cache: 'no-store' }).then(function (r) {
      if (!r.ok) return false;
      return r.json().then(function (d) { return !!d.ok; });
    }).catch(function () { return false; });
  }

  /* ---------- 排序 / 分组 ---------- */
  function cctvTier(name) {
    var c = String(name).replace(/[\s\-·]/g, '').toUpperCase();
    var m = c.match(/^CCTV(\d{1,2})(K)/);
    if (m) return { t: 1, n: parseInt(m[1], 10) };
    m = c.match(/^CCTV(\d{1,2})/);
    if (m) return { t: 0, n: parseInt(m[1], 10) };
    if (c.indexOf('CGTN') === 0) return { t: 1, n: 100 };
    m = c.match(/^CCTV\+(\d)/);
    if (m) return { t: 2, n: parseInt(m[1], 10) };
    return { t: 3, n: 999 };
  }
  function channelCmp(a, b) {
    if (a.group === '央视') {
      var ta = cctvTier(a.name), tb = cctvTier(b.name);
      if (ta.t !== tb.t) return ta.t - tb.t;
      if (ta.n !== tb.n) return ta.n - tb.n;
      return a.name.localeCompare(b.name, 'zh-Hans-CN');
    }
    return a.name.localeCompare(b.name, 'zh-Hans-CN');
  }
  function groupPrio(g) {
    if (g === '央视') return 0;
    if (g === '卫视') return 1;
    return 2;
  }
  function sortChannels() {
    state.channels.sort(function (a, b) {
      return groupPrio(a.group) - groupPrio(b.group) ||
        (a.dead ? 1 : 0) - (b.dead ? 1 : 0) ||
        channelCmp(a, b);
    });
  }
  function buildGroups() {
    sortChannels();
    var map = new Map();
    var counts = { all: state.channels.length, '央视': 0, '卫视': 0, '动画': 0 };
    state.channels.forEach(function (ch) {
      var g = ch.group || '其他';
      if (!map.has(g)) map.set(g, []);
      map.get(g).push(ch);
      if (counts[g] != null) counts[g]++;
    });
    state.groups = new Map(Array.from(map.entries()).sort(function (a, b) {
      return groupPrio(a[0]) - groupPrio(b[0]);
    }));
    state.counts = counts;
  }

  /* ---------- 收藏 / 最近 ---------- */
  function snapshot(ch) {
    return {
      name: ch.name,
      group: ch.group,
      logo: ch.logo || '',
      url: ch.url || (ch.urls && ch.urls[0]) || '',
      urls: (ch.urls || [ch.url]).filter(Boolean).slice(0, 30)
    };
  }
  function getFavs() {
    var a = storeGet(LS.favs, []);
    return Array.isArray(a) ? a : [];
  }
  function getRecent() {
    var a = storeGet(LS.recent, []);
    return Array.isArray(a) ? a : [];
  }
  function isFav(ch) {
    var k = keyOf(ch.name);
    return getFavs().some(function (x) { return keyOf(x.name) === k; });
  }
  function toggleFav(ch) {
    var list = getFavs();
    var k = keyOf(ch.name);
    var idx = -1;
    for (var i = 0; i < list.length; i++) {
      if (keyOf(list[i].name) === k) { idx = i; break; }
    }
    if (idx >= 0) list.splice(idx, 1);
    else list.unshift(snapshot(ch));
    storeSet(LS.favs, list.slice(0, 100));
  }
  function saveRecent(ch) {
    var list = getRecent().filter(function (x) { return keyOf(x.name) !== keyOf(ch.name); });
    list.unshift(snapshot(ch));
    storeSet(LS.recent, list.slice(0, 20));
  }
  function normalizeSnapshot(ch) {
    var k = keyOf(ch.name);
    var full = null;
    for (var i = 0; i < state.channels.length; i++) {
      if (keyOf(state.channels[i].name) === k) { full = state.channels[i]; break; }
    }
    if (!full) {
      return {
        name: ch.name, group: ch.group || '其他', logo: ch.logo || '',
        url: ch.url, urls: (ch.urls && ch.urls.length ? ch.urls : [ch.url]).filter(Boolean),
        dead: false, variants: []
      };
    }
    return full;
  }

  /* ---------- 渲染 ---------- */
  function visibleList() {
    var base;
    if (state.view === 'favs') base = getFavs().map(normalizeSnapshot);
    else if (state.view === 'recent') base = getRecent().map(normalizeSnapshot);
    else base = state.channels.slice();

    if (state.view === 'channels' && state.group !== 'all') {
      base = base.filter(function (c) { return c.group === state.group; });
    }
    if (state.query) {
      var q = state.query.toLowerCase();
      base = base.filter(function (c) { return String(c.name).toLowerCase().indexOf(q) >= 0; });
    }
    return base;
  }

  function renderGroups() {
    if (!els.groups) return;
    var favs = getFavs().length;
    var recent = getRecent().length;
    var items = [
      { key: 'all', label: '全部', count: state.counts.all, type: 'group' },
      { key: '央视', label: '央视', count: state.counts['央视'], type: 'group' },
      { key: '卫视', label: '卫视', count: state.counts['卫视'], type: 'group' },
      { key: '动画', label: '动画', count: state.counts['动画'], type: 'group' },
      { key: 'favs', label: '★ 收藏', count: favs, type: 'view' },
      { key: 'recent', label: '最近', count: recent, type: 'view' }
    ];
    els.groups.innerHTML = items.map(function (it) {
      var on = it.type === 'view'
        ? (state.view === it.key)
        : (state.view === 'channels' && state.group === it.key);
      return '<button type="button" class="tv-group' + (on ? ' on' : '') + '" ' +
        (it.type === 'view' ? 'data-view="' + it.key + '"' : 'data-group="' + esc(it.key) + '"') + '>' +
        esc(it.label) + ' <b>' + it.count + '</b></button>';
    }).join('');
  }

  function renderChannels() {
    if (!els.channels) return;
    var list = visibleList();
    state.playList = list;
    var title = '全部频道';
    if (state.view === 'favs') title = '我的收藏';
    else if (state.view === 'recent') title = '最近播放';
    else if (state.group !== 'all') title = state.group;
    if (els.listTitle) els.listTitle.textContent = title;
    if (els.listCount) els.listCount.textContent = list.length + ' 个';

    if (!list.length) {
      var empty = state.view === 'favs' ? '还没有收藏，点频道右侧的 ☆ 收藏'
        : state.view === 'recent' ? '还没有播放记录'
          : '没有匹配的频道';
      els.channels.innerHTML = '<div class="tv-empty">' + empty + '</div>';
      return;
    }

    var fav = {};
    getFavs().forEach(function (x) { fav[keyOf(x.name)] = true; });
    var curKey = state.current ? keyOf(state.current.name) : '';
    els.channels.innerHTML = list.map(function (ch, i) {
      var on = keyOf(ch.name) === curKey;
      var marked = !!fav[keyOf(ch.name)];
      var n = (ch.urls || []).length;
      var sub = ch.group;
      if (ch.staticOnly) sub += ' · 仅静态回放';
      else if (ch.dead) sub += ' · 无实时源';
      else if (n > 1) sub += ' · ' + n + ' 源';
      return '<div class="tv-ch' + (on ? ' active' : '') + (ch.dead ? ' dead' : '') + '" data-i="' + i + '">' +
        '<button type="button" class="tv-ch-main" data-play="' + i + '">' +
          '<span class="tv-ch-logo">' + esc(shortLabel(ch.name)) + '</span>' +
          '<span class="tv-ch-info"><b>' + esc(ch.name) + '</b><small>' + esc(sub) + '</small></span>' +
        '</button>' +
        '<button type="button" class="tv-ch-star' + (marked ? ' on' : '') + '" data-fav="' + i + '" title="收藏">' +
          (marked ? '★' : '☆') + '</button>' +
      '</div>';
    }).join('');
  }

  function renderAll() {
    renderGroups();
    renderChannels();
    if (els.count) els.count.textContent = state.channels.length;
  }

  /* ---------- 播放 UI ---------- */
  function setStatus(text, isErr) {
    if (!els.nowStatus) return;
    els.nowStatus.textContent = text || '';
    els.nowStatus.classList.toggle('err', !!isErr);
  }
  function updateNow(ch) {
    if (!ch) return;
    if (els.nowName) els.nowName.textContent = ch.name;
    if (els.nowTitle) els.nowTitle.textContent = ch.name;
    if (els.nowMeta) {
      var n = (ch.urls || []).length;
      els.nowMeta.textContent = ch.group + (n > 1 ? ' · ' + n + ' 个源' : '') +
        (failover.curLabel ? ' · ' + failover.curLabel : '');
    }
  }
  function mask(text, isErr, showPlay, loading) {
    if (!els.mask) return;
    els.mask.classList.remove('hide');
    els.mask.classList.toggle('err', !!isErr);
    if (els.maskText) els.maskText.textContent = text || '';
    if (els.maskPlay) els.maskPlay.hidden = !showPlay;
    if (els.spinner) els.spinner.hidden = !loading;
  }
  function hideMask() {
    if (els.mask) els.mask.classList.add('hide');
  }
  function updatePlayBtn() {
    if (!els.btnPlay) return;
    els.btnPlay.textContent = video && !video.paused ? '⏸' : '▶';
    if (els.liveBadge) els.liveBadge.hidden = !video || video.paused || !state.current;
  }
  function updateVol() {
    if (!video) return;
    if (els.btnMute) els.btnMute.textContent = video.muted || video.volume === 0 ? '🔇' : '🔊';
    if (els.vol) els.vol.value = String(Math.round((video.muted ? 0 : video.volume) * 100));
  }
  function renderNet() {
    if (!els.net) return;
    if (!state.current || !video || video.paused || !net.kbps) {
      els.net.textContent = '--';
      els.net.classList.remove('bad', 'slow');
      return;
    }
    els.net.textContent = fmtBitrate(net.kbps) + 'bps · ↓' + fmtSpeed(net.speed);
    var need = net.kbps / 8 / 1024;
    els.net.classList.toggle('bad', net.speed < need * 0.8);
    els.net.classList.toggle('slow', net.speed >= need * 0.8 && net.speed < need * 1.3);
  }
  function sampleNet() {
    if (!state.current || !video || video.paused) { renderNet(); return; }
    if (!net.kbps && net.declared) net.kbps = net.declared;
    if (hls && hls.bandwidthEstimate > 0) {
      var est = hls.bandwidthEstimate / 8 / 1024;
      if (est > 0 && est < 200000) {
        net.speed = net.speed ? net.speed * 0.6 + est * 0.4 : est;
      }
    }
    renderNet();
  }
  function onFragLoaded(data) {
    var frag = data && data.frag;
    var st = frag && frag.stats;
    if (!st) return;
    var ld = st.loading || {};
    var bytes = ld.loaded || st.total || 0;
    var ms = (ld.end && ld.start) ? (ld.end - ld.start) : 0;
    if (bytes > 0 && ms > 60) {
      var speedKB = bytes / 1024 / (ms / 1000);
      if (speedKB > 0 && speedKB < 200000) {
        net.speed = net.speed ? net.speed * 0.55 + speedKB * 0.45 : speedKB;
      }
    }
    var dur = frag.duration || 0;
    if (st.total > 0 && dur > 0) {
      var kbps = (st.total * 8) / dur / 1000;
      net.kbps = net.kbps ? net.kbps * 0.5 + kbps * 0.5 : kbps;
    }
    if (!net.kbps && net.declared) net.kbps = net.declared;
    net.lastAt = Date.now();
    renderNet();
  }

  /* ---------- 播放核心 ---------- */
  function proxied(url) {
    if (url.indexOf('/api/tv?path=') === 0) return url;
    if (TV_API && url.indexOf(TV_API + '/') === 0) return url;
    return tvApi('/proxy?url=' + encodeURIComponent(url));
  }
  function candidatePool(cur) {
    var pool = [];
    function add(u) {
      if (!u || staticSources.has(u)) return;
      if (pool.indexOf(u) < 0) pool.push(u);
    }
    (cur.urls || []).forEach(add);
    var k = keyOf(cur.name);
    state.channels.forEach(function (c) {
      if (keyOf(c.name) !== k) return;
      (c.urls || [c.url]).forEach(add);
    });
    return pool;
  }
  function nextSource() {
    var cur = state.current;
    if (!cur) return null;
    var pool = candidatePool(cur);
    var idx = -1;
    for (var i = 0; i < pool.length; i++) {
      if (!failover.tried.has(pool[i])) { idx = i; break; }
    }
    if (idx < 0) {
      if ((failover.round || 0) < 1) {
        failover.round = (failover.round || 0) + 1;
        failover.tried.clear();
        idx = pool.length ? 0 : -1;
      } else {
        return null;
      }
    }
    if (idx < 0) return null;
    return { url: pool[idx], idx: idx + 1, total: pool.length, round: failover.round || 0 };
  }
  function switchNext(reason) {
    var nx = nextSource();
    if (!nx) return false;
    failover.tried.add(nx.url);
    setStatus(reason + '，自动切换' + (nx.round ? '（重试轮）' : '') + ' (' + nx.idx + '/' + nx.total + ')…');
    startPlayback(nx.url);
    return true;
  }
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoading) return hlsLoading;
    hlsLoading = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = HLS_SRC + '?v=' + (window.__APP_VERSION__ || Date.now());
      s.async = true;
      s.onload = function () { resolve(window.Hls); };
      s.onerror = function () { reject(new Error('hls.js 加载失败')); };
      document.head.appendChild(s);
    });
    return hlsLoading;
  }
  function destroyHls() {
    if (hls) {
      try { hls.destroy(); } catch (e) { /* 忽略 */ }
      hls = null;
    }
  }
  function armStallWatchdog() {
    var tk = ++playToken;
    clearTimeout(stallTimer);
    stallTimer = setTimeout(function () {
      if (tk !== playToken || !video || video.videoWidth > 0) return;
      var noManifest = !hls || !hls.levels || hls.levels.length === 0;
      if (noManifest) {
        if (!switchNext('源无响应')) failAll('这个频道的源都连不上');
        return;
      }
      stallTimer = setTimeout(function () {
        if (tk !== playToken || !video || video.videoWidth > 0) return;
        if (!switchNext('源无画面')) failAll('这个频道的源都连不上或没有画面');
      }, 20000);
    }, 8000);
  }
  function failAll(text) {
    setStatus(text, true);
    var hint = '当前代理出口无法播放该频道（源站可能封锁云端 IP）。';
    mask(text + '。' + hint, true, false, false);
  }

  /* 静态回放检测：
     - 播放列表带 PROGRAM-DATE-TIME 且早于 24h → 冻结源，立刻换
     - 否则 12 秒后再拉一次，MEDIA-SEQUENCE/分片没变 → 静态循环，换 */
  function playlistSig(text) {
    var seq = (text.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/) || [])[1] || '';
    var segs = text.split(/\r?\n/).filter(function (l) { return l && l.charAt(0) !== '#'; });
    return seq + '|' + segs.slice(-2).join('|') + (/#EXT-X-ENDLIST/.test(text) ? '|END' : '');
  }
  function checkSource(url, token) {
    if (!url || staticSources.has(url) || checkedSources.has(url)) return;
    checkedSources.add(url);
    var src = proxied(url);
    // 等首片稳定后再探测，避免和 hls.js 同时抢同一个 manifest（部分源会因此 403/断流）
    setTimeout(function () {
      if (token !== playToken) return;
      fetch(src, { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t1) {
        if (token !== playToken || !t1 || t1.indexOf('#EXTM3U') !== 0) return;
        var dm = t1.match(/#EXT-X-PROGRAM-DATE-TIME:([^\r\n]+)/);
        if (dm) {
          var ts = Date.parse(dm[1].trim());
          if (ts && Date.now() - ts > 24 * 3600 * 1000) {
            staticSources.add(url);
            if (token === playToken) {
              setStatus('检测到静态回放，自动切换…', true);
              if (!switchNext('静态回放')) failAll('该频道所有源均为静态回放或不可用');
            }
            return;
          }
        }
        var sig1 = playlistSig(t1);
        setTimeout(function () {
          if (token !== playToken) return;
          fetch(src, { cache: 'no-store' }).then(function (r) { return r.text(); }).then(function (t2) {
            if (token !== playToken || !t2 || t2.indexOf('#EXTM3U') !== 0) return;
            if (playlistSig(t2) === sig1) {
              staticSources.add(url);
              setStatus('检测到静态回放，自动切换…', true);
              if (!switchNext('静态回放')) failAll('该频道所有源均为静态回放或不可用');
            }
          }).catch(function () { /* 忽略 */ });
        }, 12000);
      }).catch(function () { /* 忽略 */ });
    }, 6000);
  }
  function startPlayback(url) {
    var v = null;
    var variants = (state.current && state.current.variants) || [];
    for (var i = 0; i < variants.length; i++) {
      if (variants[i].urls && variants[i].urls.indexOf(url) >= 0) { v = variants[i]; break; }
    }
    failover.curLabel = v ? v.label : '';
    if (state.current) updateNow(state.current);
    renderQualityMenu();
    var token = ++playToken;
    var src = proxied(url);
    net.kbps = net.speed = net.declared = 0;
    net.lastAt = 0;
    renderNet();

    loadHls().then(function (Hls) {
      if (token !== playToken) return;
      // hls.js 加载完成后再启动看门狗：否则慢网下 8 秒还没开始拉流就被误判
      armStallWatchdog();
      var liveToken = playToken;
      if (Hls && Hls.isSupported()) {
        destroyHls();
        hls = new Hls({
          manifestLoadingTimeOut: 8000,
          manifestLoadingMaxRetry: 1,
          levelLoadingTimeOut: 8000,
          levelLoadingMaxRetry: 1,
          fragLoadingTimeOut: 20000,
          fragLoadingMaxRetry: 1
        });
        hls.on(Hls.Events.ERROR, function (_, data) {
          if (!data.fatal) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR &&
              (data.details === 'manifestLoadError' || data.details === 'manifestParsingError')) {
            if (!switchNext('源失效')) failAll('播放失败，这个频道的所有源都不可用');
            return;
          }
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            if (data.details === 'bufferAddCodecError' || data.details === 'fragParsingError' ||
                data.reason === 'noExplicitAlignment') {
              if (switchNext('编码不支持')) return;
            }
            failover.mediaRetry = (failover.mediaRetry || 0) + 1;
            if (failover.mediaRetry <= 2) { try { hls.recoverMediaError(); } catch (e) { /* 忽略 */ } return; }
            if (!switchNext('解码失败')) failAll('播放出错：' + data.details);
            return;
          }
          setStatus('播放出错：' + data.details, true);
        });
        hls.on(Hls.Events.FRAG_LOADED, function (_, data) {
          onFragLoaded(data);
          retryPlay('frag');
        });
        hls.on(Hls.Events.LEVEL_SWITCHED, function (_, data) {
          var lv = hls.levels && hls.levels[data.level];
          if (lv && lv.bitrate) {
            net.declared = lv.bitrate / 1000;
            if (!net.kbps) net.kbps = net.declared;
          }
        });
        hls.on(Hls.Events.MANIFEST_PARSED, function () {
          setStatus('播放中' + (failover.curLabel ? ' · ' + failover.curLabel : ''));
          tryPlay().then(function (ok) {
            if (ok) hideMask(); else retryPlay('manifest');
          });
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        checkSource(url, liveToken);
      } else {
        video.src = src;
        checkSource(url, liveToken);
        tryPlay().then(function (ok) {
          if (ok) hideMask(); else retryPlay('direct');
        });
      }
    }).catch(function () {
      if (token === playToken) failAll('hls.js 加载失败，请刷新页面');
    });
  }

  /* ---------- 自动播放 ---------- */
  function tryPlay() {
    if (!video) return Promise.resolve(false);
    return video.play().then(function () {
      wantPlay = false;
      updatePlayBtn();
      return true;
    }).catch(function () {
      if (!video.muted) {
        video.muted = true;
        updateVol();
        return video.play().then(function () {
          wantPlay = false;
          updatePlayBtn();
          return true;
        }).catch(function () { wantPlay = true; return false; });
      }
      wantPlay = true;
      return false;
    });
  }
  function retryPlay(reason) {
    if (!wantPlay || !video || !video.paused) return;
    var now = Date.now();
    if (now - retryAt < 1200) return;
    retryAt = now;
    tryPlay().then(function (ok) {
      if (ok) hideMask();
      else if (reason === 'manifest' || reason === 'frag') {
        mask('点击播放开始观看', false, true, false);
      }
    });
  }
  document.addEventListener('pointerdown', function () {
    if (wantPlay && video && video.paused && isActive()) retryPlay('gesture');
  }, { passive: true, capture: true });
  document.addEventListener('keydown', function () {
    if (wantPlay && video && video.paused && isActive()) retryPlay('gesture');
  }, true);

  /* ---------- 清晰度 ---------- */
  function renderQualityMenu() {
    if (!els.btnQuality || !els.qualityMenu) return;
    var variants = ((state.current && state.current.variants) || []).filter(function (v) {
      return v.urls && v.urls.length;
    });
    if (variants.length < 2) {
      els.btnQuality.hidden = true;
      els.qualityMenu.hidden = true;
      return;
    }
    els.btnQuality.hidden = false;
    var cur = failover.curLabel || '默认';
    els.qualityMenu.innerHTML = variants.map(function (v) {
      var label = v.label || '默认';
      return '<button type="button" class="tv-qitem' + (label === cur ? ' on' : '') +
        '" data-label="' + esc(label) + '">' + (label === cur ? '✓ ' : '') + esc(label) + '</button>';
    }).join('');
    els.qualityMenu.querySelectorAll('.tv-qitem').forEach(function (el) {
      el.onclick = function () {
        els.qualityMenu.hidden = true;
        var label = el.dataset.label;
        var v = variants.filter(function (x) { return (x.label || '默认') === label; })[0];
        if (!v || !v.urls.length) return;
        failover = { tried: new Set([v.urls[0]]), total: state.current.urls.length,
          curLabel: v.label, round: 0, mediaRetry: 0 };
        setStatus('切换清晰度 → ' + label);
        startPlayback(v.urls[0]);
      };
    });
  }

  /* ---------- 事件 ---------- */
  function isActive() {
    var root = document.getElementById('mod-tv');
    return !!root && root.classList.contains('active');
  }
  function play(ch) {
    if (!ch) return;
    if (ch.dead || ch.staticOnly) {
      setStatus(ch.staticOnly ? '该频道仅静态回放，未播放' : '该频道当前没有实时源', true);
      mask(ch.staticOnly
        ? '该频道当前只有静态回放源，已跳过。'
        : '该频道当前没有可用的实时源。', true);
      return;
    }
    var urls = ch.urls && ch.urls.length ? ch.urls : [ch.url].filter(Boolean);
    if (!urls.length) {
      setStatus('该频道当前没有实时源', true);
      mask('该频道当前没有可用的实时源。', true);
      return;
    }
    state.current = Object.assign({}, ch, { urls: urls });
    failover = { tried: new Set(), total: urls.length, curLabel: '', round: 0, mediaRetry: 0 };
    saveRecent(state.current);
    updateFavBtn();
    updateNow(state.current);
    renderChannels();
    setStatus('正在挑选可用源…');
    mask('正在连接 ' + ch.name + '…', false, false, true);
    wantPlay = true;
    var pool = candidatePool(state.current);
    failover.total = pool.length;
    if (!pool.length) {
      mask('该频道没有任何可用地址', true);
      setStatus('无可用地址', true);
      return;
    }
    failover.tried.add(pool[0]);
    startPlayback(pool[0]);
  }
  function step(dir) {
    if (!state.playList.length) return;
    var live = state.playList.filter(function (c) { return !c.dead; });
    var pool = live.length ? live : state.playList;
    var idx = -1;
    if (state.current) {
      for (var i = 0; i < pool.length; i++) {
        if (keyOf(pool[i].name) === keyOf(state.current.name)) { idx = i; break; }
      }
    }
    idx = idx < 0 ? 0 : (idx + dir + pool.length) % pool.length;
    play(pool[idx]);
  }
  function updateFavBtn() {
    if (!els.favBtn) return;
    var on = state.current ? isFav(state.current) : false;
    els.favBtn.textContent = on ? '★ 已收藏' : '☆ 收藏';
    els.favBtn.classList.toggle('on', on);
  }
  function togglePlay() {
    if (!video || !state.current) return;
    if (video.paused) { wantPlay = true; tryPlay(); }
    else video.pause();
  }
  function toggleMute() {
    if (!video) return;
    video.muted = !video.muted;
    if (!video.muted && video.volume === 0) video.volume = 0.8;
    updateVol();
  }
  function toggleFs() {
    if (!els.playerCard) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(function () {});
      return;
    }
    if (els.playerCard.requestFullscreen) {
      els.playerCard.requestFullscreen().catch(function () {});
    } else if (video && video.webkitEnterFullscreen) {
      video.webkitEnterFullscreen();
    }
  }
  function togglePip() {
    if (!video || !document.pictureInPictureEnabled) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(function () {});
    } else {
      video.requestPictureInPicture().catch(function () {});
    }
  }

  /* ---------- 自定义源 ---------- */
  function openSourceLayer() {
    if (els.sourceLayer) els.sourceLayer.hidden = false;
  }
  function closeSourceLayer() {
    if (els.sourceLayer) els.sourceLayer.hidden = true;
  }
  function addSource(name, url) {
    var list = storeGet(LS.customFeeds, []);
    if (!Array.isArray(list)) list = [];
    list.push({ name: name || '自定义源', url: url });
    storeSet(LS.customFeeds, list);
    state.feeds = BUILTIN_FEEDS.concat(list);
    closeSourceLayer();
    loadAll();
  }

  /* ---------- 加载 ---------- */
  function loadAll() {
    state.channels = [];
    state.groups = new Map();
    state.counts = { all: 0, '央视': 0, '卫视': 0, '动画': 0 };
    state.view = 'channels';
    state.group = 'all';
    state.query = '';
    state.current = null;
    staticSources.clear();
    checkedSources.clear();
    if (video) { try { video.pause(); } catch (e) { /* 忽略 */ } }
    destroyHls();
    if (els.search) els.search.value = '';
    renderGroups();
    renderChannels();
    if (els.count) els.count.textContent = '0';
    if (els.feedInfo) els.feedInfo.textContent = '连接代理中…';
    mask('正在连接频道代理…', false, false, true);
    setStatus('检查直播代理…');

    checkProxy().then(function (ok) {
      if (!ok) {
        if (els.feedInfo) els.feedInfo.textContent = '代理未连接';
        setStatus('直播代理未连接', true);
        mask('直播代理未连接：本地请先运行 npm run tv:dev；线上请检查 Worker 地址', true);
        if (els.channels) {
          els.channels.innerHTML = '<div class="tv-empty">直播代理未连接<br><small>本地：npm run tv:dev<br>线上：检查 tv-worker 部署</small></div>';
        }
        return;
      }
      var custom = storeGet(LS.customFeeds, []);
      if (!Array.isArray(custom)) custom = [];
      state.feeds = BUILTIN_FEEDS.concat(custom);
      var feeds = state.feeds;
      Promise.allSettled(feeds.map(fetchFeed)).then(function (results) {
        var okFeeds = [];
        var failed = [];
        results.forEach(function (r, i) {
          if (r.status === 'fulfilled') okFeeds.push(r.value);
          else failed.push(feeds[i].name);
        });
        state.channels = mergeFeeds(okFeeds);
        buildGroups();
        renderAll();
        var totalUrls = state.channels.reduce(function (s, c) { return s + (c.urls || []).length; }, 0);
        if (els.feedInfo) {
          els.feedInfo.textContent = (feeds.length - failed.length) + '/' + feeds.length + ' 个源' +
            (failed.length ? '（' + failed.join('、') + ' 失败）' : '');
        }
        if (!state.channels.length) {
          setStatus('频道源拉取失败', true);
          mask('所有频道源拉取失败，请检查网络后点右侧「↻」重试', true);
          if (els.channels) els.channels.innerHTML = '<div class="tv-empty">频道源拉取失败</div>';
          return;
        }
        setStatus('共 ' + state.channels.length + ' 个频道 · ' + totalUrls + ' 条地址');
        mask('选择频道开始播放');
      });
    });
  }

  /* ---------- 事件绑定 ---------- */
  function bind() {
    if (els.groups) {
      els.groups.addEventListener('click', function (ev) {
        var b = ev.target.closest('button');
        if (!b) return;
        if (b.dataset.view) {
          state.view = b.dataset.view;
          state.group = 'all';
          state.query = '';
          if (els.search) els.search.value = '';
        } else if (b.dataset.group) {
          state.view = 'channels';
          state.group = b.dataset.group;
        }
        renderGroups();
        renderChannels();
      });
    }
    if (els.channels) {
      els.channels.addEventListener('click', function (ev) {
        var star = ev.target.closest('[data-fav]');
        if (star) {
          ev.stopPropagation();
          var i = +star.dataset.fav;
          var ch = state.playList[i];
          if (ch) {
            toggleFav(ch);
            renderChannels();
            updateFavBtn();
          }
          return;
        }
        var main = ev.target.closest('[data-play]');
        if (main) {
          var idx = +main.dataset.play;
          if (state.playList[idx]) play(state.playList[idx]);
        }
      });
    }
    if (els.search) {
      els.search.addEventListener('input', function () {
        clearTimeout(searchTimer);
        searchTimer = setTimeout(function () {
          state.query = els.search.value.trim();
          if (state.query) { state.view = 'channels'; state.group = 'all'; }
          renderGroups();
          renderChannels();
        }, 120);
      });
    }
    if (els.refresh) els.refresh.onclick = loadAll;
    if (els.addSource) els.addSource.onclick = openSourceLayer;
    if (els.sourceClose) els.sourceClose.onclick = closeSourceLayer;
    if (els.sourceCancel) els.sourceCancel.onclick = closeSourceLayer;
    if (els.sourceLayer) {
      els.sourceLayer.addEventListener('click', function (ev) {
        if (ev.target === els.sourceLayer) closeSourceLayer();
      });
    }
    if (els.sourceForm) {
      els.sourceForm.addEventListener('submit', function (ev) {
        ev.preventDefault();
        var name = els.srcName ? els.srcName.value.trim() : '';
        var url = els.srcUrl ? els.srcUrl.value.trim() : '';
        if (!/^https?:\/\//.test(url)) {
          if (els.srcUrl) els.srcUrl.focus();
          return;
        }
        if (els.srcName) els.srcName.value = '';
        if (els.srcUrl) els.srcUrl.value = '';
        addSource(name, url);
      });
    }
    if (els.btnPlay) els.btnPlay.onclick = togglePlay;
    if (els.btnMute) els.btnMute.onclick = toggleMute;
    if (els.btnFs) els.btnFs.onclick = toggleFs;
    if (els.btnPip) els.btnPip.onclick = togglePip;
    if (els.vol) {
      els.vol.addEventListener('input', function () {
        if (!video) return;
        var v = Math.max(0, Math.min(100, +els.vol.value)) / 100;
        video.volume = v;
        video.muted = v === 0;
        updateVol();
      });
    }
    if (els.btnQuality) {
      els.btnQuality.onclick = function (ev) {
        ev.stopPropagation();
        els.qualityMenu.hidden = !els.qualityMenu.hidden;
      };
    }
    document.addEventListener('click', function (ev) {
      if (els.qualityMenu && !els.qualityMenu.hidden && !ev.target.closest('.tv-quality-wrap')) {
        els.qualityMenu.hidden = true;
      }
    });
    if (els.favBtn) {
      els.favBtn.onclick = function () {
        if (!state.current) return;
        toggleFav(state.current);
        updateFavBtn();
        renderChannels();
      };
    }
    if (els.prevBtn) els.prevBtn.onclick = function () { step(-1); };
    if (els.nextBtn) els.nextBtn.onclick = function () { step(1); };
    if (els.maskPlay) {
      els.maskPlay.onclick = function () {
        wantPlay = true;
        tryPlay().then(function (ok) { if (ok) hideMask(); });
      };
    }
    if (els.stage) {
      els.stage.addEventListener('click', function (ev) {
        if (ev.target === els.stage || ev.target === video) {
          if (els.mask && !els.mask.classList.contains('hide')) {
            wantPlay = true;
            tryPlay().then(function (ok) { if (ok) hideMask(); });
          } else {
            togglePlay();
          }
        }
      });
    }
    document.addEventListener('keydown', function (ev) {
      if (!isActive()) return;
      var tag = (ev.target && ev.target.tagName || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea' || (ev.target && ev.target.isContentEditable)) return;
      switch (ev.key) {
        case ' ': ev.preventDefault(); togglePlay(); break;
        case 'ArrowUp': ev.preventDefault(); step(-1); break;
        case 'ArrowDown': ev.preventDefault(); step(1); break;
        case 'm': case 'M': toggleMute(); break;
        case 'f': case 'F': toggleFs(); break;
        case 'p': case 'P': togglePip(); break;
        case '/': ev.preventDefault(); if (els.search) els.search.focus(); break;
        case 'Escape':
          if (els.qualityMenu) els.qualityMenu.hidden = true;
          closeSourceLayer();
          break;
      }
    });
    document.addEventListener('visibilitychange', function () {
      if (document.hidden && video) video.pause();
    });
    if (video) {
      video.addEventListener('play', function () { updatePlayBtn(); hideMask(); });
      video.addEventListener('pause', function () { updatePlayBtn(); });
      video.addEventListener('playing', function () {
        updatePlayBtn();
        hideMask();
        setStatus('播放中' + (failover.curLabel ? ' · ' + failover.curLabel : ''));
      });
      video.addEventListener('waiting', function () { setStatus('缓冲中…'); });
      video.addEventListener('canplay', function () { retryPlay('canplay'); });
      video.addEventListener('loadeddata', function () { retryPlay('loadeddata'); });
      video.addEventListener('volumechange', updateVol);
      video.addEventListener('error', function () {
        if (!hls && state.current) {
          if (!switchNext('源失效')) failAll('播放失败，这个频道的所有源都不可用');
        }
      });
      video.addEventListener('emptied', function () { net.lastAt = 0; renderNet(); });
    }
    if (els.btnPip) els.btnPip.hidden = !document.pictureInPictureEnabled;
  }

  /* ---------- 初始化 ---------- */
  function init() {
    if (inited) return;
    inited = true;
    els = {
      root: $('mod-tv'),
      feedInfo: $('tvFeedInfo'), count: $('tvCount'),
      playerCard: $('tvPlayerCard'), stage: $('tvStage'), video: $('tvVideo'),
      mask: $('tvMask'), maskText: $('tvMaskText'), maskPlay: $('tvMaskPlay'), spinner: $('tvSpinner'),
      liveBadge: $('tvLiveBadge'),
      btnPlay: $('tvBtnPlay'), nowName: $('tvNowName'), nowStatus: $('tvNowStatus'),
      net: $('tvNet'), btnQuality: $('tvBtnQuality'), qualityMenu: $('tvQualityMenu'),
      btnMute: $('tvBtnMute'), vol: $('tvVol'), btnPip: $('tvBtnPip'), btnFs: $('tvBtnFs'),
      nowTitle: $('tvNowTitle'), nowMeta: $('tvNowMeta'),
      favBtn: $('tvFavBtn'), prevBtn: $('tvPrevBtn'), nextBtn: $('tvNextBtn'),
      search: $('tvSearch'), refresh: $('tvRefresh'), addSource: $('tvAddSource'),
      groups: $('tvGroups'), listTitle: $('tvListTitle'), listCount: $('tvListCount'), channels: $('tvChannels'),
      sourceLayer: $('tvSourceLayer'), sourceForm: $('tvSourceForm'),
      srcName: $('tvSrcName'), srcUrl: $('tvSrcUrl'),
      sourceClose: $('tvSourceClose'), sourceCancel: $('tvSourceCancel')
    };
    video = els.video;
    if (!video) return;
    video.muted = true;
    updateVol();
    updatePlayBtn();
    bind();
    loadAll();
    setInterval(sampleNet, 1000);
  }

  function pause() {
    if (video) { try { video.pause(); } catch (e) { /* 忽略 */ } }
    if (els.qualityMenu) els.qualityMenu.hidden = true;
    if (els.sourceLayer) els.sourceLayer.hidden = true;
  }
  function resume() {
    // 回到电视页不自动续播，由用户点播放
  }

  window.AppTv = { init: init, pause: pause, resume: resume };
})();
