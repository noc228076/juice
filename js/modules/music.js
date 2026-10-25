/* =========================================================
   模块 12：我的音乐台（Personal Music Lab）
   ---------------------------------------------------------
   站内不内置任何内容源，三种「自导入」方式：
     1. 本机音乐文件（文件选择 / 拖拽 / 关联文件夹）
     2. 直链歌单（JSON 导入，自有云盘/服务器上的音频直链）
     3. 自定义音源脚本（本机保存，实现 search 接口；仓库不含任何脚本）
   播放内核挂在 document 级 <audio>，切模块不断播；
   沉浸全屏 + 全局吸底迷你条 + MediaSession 系统控制。
   ========================================================= */
(function () {
  'use strict';

  var LS_KEY = 'juice_music_v1';
  var el = null;
  var tab = 'search';
  var inited = false;

  /* ---------------- 持久化状态 ---------------- */
  function defaultState() {
    return {
      volume: 0.8,
      repeat: 'all',           // off | all | one
      shuffle: false,
      /* 音源固定为在线聚合（洛雪内核），不再提供 Audius/Jamendo 等备选 */
      src: { builtin: 'lx' },
      /* 歌单：{ id, name, tracks: [] }，收藏是 id='love' 的固定歌单 */
      lists: [],
      /* 搜索历史，供联想使用 */
      history: []
    };
  }
  var state = defaultState();

  function loadState() {
    // 歌词开关独立存储：与歌单数据分开，避免旧版本数据覆盖
    try {
      var ly = localStorage.getItem('juice_music_show_lyric');
      if (ly !== null) showLyric = ly === '1';
    } catch (e) {}
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        state = Object.assign(defaultState(), d);
        // 只保留在线聚合（洛雪内核）——旧版本的 audius/jamendo 分支已删除，
        // 若沿用旧值会走进不存在的搜索路径且界面上没有切回入口
        state.src = state.src && typeof state.src === 'object' ? state.src : {};
        var wasStale = state.src.builtin !== 'lx';
        state.src.builtin = 'lx';
        // 迁移结果要落盘，否则内存是 lx、存储还是旧值，长期不一致
        if (wasStale) saveState();
      }
    } catch (e) { state = defaultState(); }
  }
  function saveState() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(state)); } catch (e) {}
  }

  function esc(v) { return window.escHtml(v); }
  function uid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
  function fmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    var m = Math.floor(s / 60);
    return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }
  function fileNameTitle(name) {
    return String(name || '').replace(/\.[a-zA-Z0-9]{2,5}$/, '');
  }

  /* ---------------- 全局播放内核（document 级，跨模块存活） ---------------- */
  var audio = null;
  var queue = [];              // 当前播放队列 [{kind,id,title,artist,cover,url}]
  var qName = '';              // 队列来源名
  var qi = -1;
  var cur = null;
  var historyStack = [];       // 随机模式下已播过的
  var objUrls = [];            // 本会话创建的 objectURL，destroy 时不必回收（切歌复用）
  var failStreak = 0;          // 搜索结果连续播放失败计数（下架曲自动跳过用）

  function ensureAudio() {
    if (audio) return audio;
    audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.volume = state.volume;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audio.addEventListener('timeupdate', onProgress);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', function () { syncPlayUI(true); });
    audio.addEventListener('playing', function () { failStreak = 0; });
    audio.addEventListener('pause', function () { syncPlayUI(false); });
    audio.addEventListener('error', function () {
      /* 搜索结果里相当比例是已下架曲（接口 403/404），点中时自动跳下一首 */
      if (qName === '搜索结果' && queue.length > 1 && failStreak < 8) {
        failStreak++;
        toast('「' + (cur ? cur.title : '') + '」已下架，自动跳下一首');
        nextTrack(true);
        return;
      }
      if (cur) toast('「' + cur.title + '」播放失败（链接失效或格式不支持）');
      syncPlayUI(false);
    });
    return audio;
  }

  function playQueue(list, name, idx) {
    queue = list.slice();
    qName = name || '';
    qi = (idx == null || idx < 0 || idx >= queue.length) ? 0 : idx;
    playCurrent();
  }

  function playCurrent() {
    if (!queue.length) return;
    cur = queue[qi];
    var a = ensureAudio();
    try { a.pause(); } catch (e) {}
    a.src = cur.url;
    a.play().catch(function () { /* 自动播放策略被拦：等用户点播放 */ });
    updateMediaSession();
    syncPlayUI(!a.paused);
    syncBarMeta();
    syncBarVisibility();
    renderIfActive();
    renderMini();
    // 切歌后换歌词；沉浸页开着就立即刷新
    lastLyricIndex = -1;
    loadLyricFor(cur);
    if (immEl) refreshImmersiveLyric();
  }

  function togglePlay() {
    if (!cur) {
      // 没有当前曲目时，从第一个可用列表开始
      if (directList().length) playQueue(directList(), '直链歌单', 0);
      else if (localTracks().length) playQueue(localTracks(), '本机文件', 0);
      else toast('先导入一些音乐吧');
      return;
    }
    var a = ensureAudio();
    if (a.paused) a.play().catch(function () {});
    else a.pause();
  }

  function nextTrack(auto) {
    if (!queue.length) return;
    if (state.repeat === 'one' && auto) { audio.currentTime = 0; audio.play().catch(function(){}); return; }
    if (state.shuffle && queue.length > 1) {
      var n;
      do { n = Math.floor(Math.random() * queue.length); } while (n === qi);
      qi = n;
    } else {
      qi++;
      if (qi >= queue.length) {
        if (state.repeat === 'all') qi = 0;
        else { qi = queue.length - 1; if (auto) { audio.pause(); return; } }
      }
    }
    playCurrent();
  }

  function prevTrack() {
    if (!queue.length) return;
    if (audio && audio.currentTime > 3) { audio.currentTime = 0; return; }
    qi = qi > 0 ? qi - 1 : queue.length - 1;
    playCurrent();
  }

  function onProgress() {
    var p = 0, t = 0, d = 0;
    if (audio) { t = audio.currentTime || 0; d = audio.duration || 0; p = d ? t / d : 0; }
    var bars = document.querySelectorAll('.mu-bar-progress i');
    for (var i = 0; i < bars.length; i++) bars[i].style.width = (p * 100).toFixed(2) + '%';
    var times = document.querySelectorAll('.mu-time-cur');
    for (var j = 0; j < times.length; j++) times[j].textContent = fmtTime(t);
    var durs = document.querySelectorAll('.mu-time-dur');
    for (var k = 0; k < durs.length; k++) durs[k].textContent = fmtTime(d);
    var sliders = document.querySelectorAll('.mu-seek');
    for (var m = 0; m < sliders.length; m++) {
      // range 默认 max=100，超过 100 秒的歌会把滑块钉死在 100s
      if (d) sliders[m].max = String(d);
      if (document.activeElement !== sliders[m] && d) sliders[m].value = String(t);
    }
    if ('mediaSession' in navigator && audio && audio.duration) {
      try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: 1, position: t }); } catch (e) {}
    }
    // 沉浸页开着时同步歌词高亮
    if (immEl) highlightLyric(t);
  }

  function onEnded() { nextTrack(true); }

  function setVolume(v) {
    state.volume = Math.min(1, Math.max(0, v));
    if (audio) audio.volume = state.volume;
    saveState();
    var vols = document.querySelectorAll('.mu-vol');
    for (var i = 0; i < vols.length; i++) vols[i].value = String(state.volume);
  }

  function updateMediaSession() {
    if (!('mediaSession' in navigator) || !cur) return;
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: cur.title || '未知曲目',
        artist: cur.artist || '',
        album: '我的音乐台',
        artwork: cur.cover ? [{ src: cur.cover, sizes: '512x512' }] : []
      });
      navigator.mediaSession.setActionHandler('play', function () { audio.play(); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', function () { nextTrack(false); });
    } catch (e) {}
  }

  /* ---------------- 三类曲源 ---------------- */

  /* 1. 本机文件：会话内 objectURL；文件夹句柄存 IndexedDB，下次一键恢复 */
  var localFiles = [];         // [{title,size,url}]
  var fsHandle = null;

  function localTracks() {
    return localFiles.map(function (f) {
      return { kind: 'local', id: f.title + ':' + f.size, title: f.title, artist: '本机文件', cover: '', url: f.url };
    });
  }

  function idb() {
    return new Promise(function (res) {
      var q = indexedDB.open('juice_music', 1);
      q.onupgradeneeded = function () { q.result.createObjectStore('kv'); };
      q.onsuccess = function () { res(q.result); };
      q.onerror = function () { res(null); };
    });
  }
  function idbSet(k, v) {
    return idb().then(function (db) {
      if (!db) return;
      try {
        db.transaction('kv', 'readwrite').objectStore('kv').put(v, k);
      } catch (e) {}
    });
  }
  function idbGet(k) {
    return new Promise(function (res) {
      idb().then(function (db) {
        if (!db) { res(null); return; }
        try {
          var r = db.transaction('kv').objectStore('kv').get(k);
          r.onsuccess = function () { res(r.result || null); };
          r.onerror = function () { res(null); };
        } catch (e) { res(null); }
      });
    });
  }

  function addFileList(files) {
    var added = 0;
    for (var i = 0; i < files.length; i++) {
      var f = files[i];
      if (!/^audio\//.test(f.type) && !/\.(mp3|flac|ogg|wav|m4a|aac|opus)$/i.test(f.name)) continue;
      localFiles.push({ title: fileNameTitle(f.name), size: f.size, url: URL.createObjectURL(f) });
      added++;
    }
    if (added) {
      // 元数据持久化（刷新后可一键重新关联）
      state.localMeta = localFiles.map(function (x) { return { title: x.title, size: x.size }; });
      state.folderName = '';
      saveState();
      toast('已加入 ' + added + ' 首本机音乐');
      renderIfActive();
    } else {
      toast('没有识别到音频文件');
    }
  }

  function bindFolder() {
    // 已存句柄 → 显示「恢复」按钮；未存 → 显示「关联文件夹」
    idbGet('folder').then(function (h) { fsHandle = h || null; renderIfActive(); });
  }

  function pickFolder() {
    if (!window.showDirectoryPicker) { toast('当前浏览器不支持文件夹关联，请用「选择文件」'); return; }
    window.showDirectoryPicker().then(function (dir) {
      fsHandle = dir;
      state.folderName = dir.name || '';
      idbSet('folder', dir);
      return rebuildFolder();
    }).catch(function () {});
  }

  function restoreFolder() {
    if (!fsHandle) { pickFolder(); return; }
    fsHandle.queryPermission({ mode: 'read' }).then(function (p) {
      if (p === 'granted') return rebuildFolder();
      return fsHandle.requestPermission({ mode: 'read' }).then(function (p2) {
        if (p2 === 'granted') return rebuildFolder();
        toast('没有获得文件夹读取权限');
      });
    }).catch(function () {});
  }

  function rebuildFolder() {
    if (!fsHandle) return Promise.resolve();
    var out = [];
    var skip = ['node_modules', '.git'];
    function walk(dir, depth) {
      if (depth > 3) return Promise.resolve();
      var iter;
      try { iter = dir.values(); } catch (e) { return Promise.resolve(); }
      function step() {
        return iter.next().then(function (r) {
          if (r.done) return;
          var ent = r.value;
          if (ent.kind === 'directory') {
            if (skip.indexOf(ent.name) >= 0) return step();
            return walk(ent, depth + 1).then(step);
          }
          if (/\.(mp3|flac|ogg|wav|m4a|aac|opus)$/i.test(ent.name)) {
            out.push(ent.getFile().then(function (f) {
              localFiles.push({ title: fileNameTitle(f.name), size: f.size, url: URL.createObjectURL(f) });
            }).catch(function () {}));
          }
          return step();
        });
      }
      return step();
    }
    localFiles = [];
    return walk(fsHandle, 0).then(function () {
      state.localMeta = localFiles.map(function (x) { return { title: x.title, size: x.size }; });
      saveState();
      toast('已从「' + (state.folderName || '文件夹') + '」载入 ' + localFiles.length + ' 首');
      renderIfActive();
    });
  }

  /* 2. 直链歌单 */
  function directList() {
    return (state.direct || []).map(function (t) {
      return { kind: 'link', id: t.id, title: t.title, artist: t.artist || '', cover: t.cover || '', url: t.url };
    });
  }

  var PLAYLIST_EXAMPLE = JSON.stringify([
    { "title": "示例歌曲", "artist": "歌手", "cover": "https://example.com/cover.jpg", "url": "https://example.com/song.mp3" }
  ], null, 2);

  function importDirect(jsonText) {
    var arr;
    try { arr = JSON.parse(jsonText); } catch (e) { toast('JSON 格式不对'); return; }
    if (!Array.isArray(arr)) { toast('歌单要是一个 JSON 数组'); return; }
    var ok = 0;
    arr.forEach(function (t) {
      if (!t || !t.url || !/^https?:\/\//i.test(t.url)) return;
      state.direct.push({
        id: uid(),
        title: String(t.title || fileNameTitle(String(t.url).split('/').pop()) || '未命名'),
        artist: String(t.artist || ''),
        cover: /^https?:\/\//i.test(t.cover || '') ? t.cover : '',
        url: t.url
      });
      ok++;
    });
    saveState();
    toast(ok ? '导入 ' + ok + ' 首直链歌曲' : '没有可用的条目（每条必须有 http(s) 的 url）');
    renderIfActive();
  }

  /* 3a. 内置开源音源（合法曲库，浏览器可直连）
     Audius：去中心化音乐平台，开放 API 免 key；
     Jamendo：55 万+ CC 协议独立音乐人作品，免注册听 30s 试听之外需免费 Client ID。
     被墙的源（Internet Archive / Openverse 等）不内置——需要时用下方自定义脚本接口接。 */
  var AUDIUS_NODES = [
    'https://discoveryprovider.audius.co',
    'https://discoveryprovider2.audius.co',
    'https://discoveryprovider3.audius.co'
  ];
  var audiusNode = null;

  function fetchJSON(url, ms) {
    return Promise.race([
      fetch(url).then(function (r) { return r.json(); }),
      new Promise(function (_, rej) { setTimeout(function () { rej(new Error('超时')); }, ms || 9000); })
    ]);
  }

  function searchAudius(kw) {
    var tryNode = function (i) {
      if (i >= AUDIUS_NODES.length) return Promise.reject(new Error('所有 Audius 节点不可达（可能被墙）'));
      var node = AUDIUS_NODES[i];
      return fetchJSON(node + '/v1/tracks/search?query=' + encodeURIComponent(kw) +
        '&app_name=juice-persona&limit=30').then(function (d) {
          var list = (d && d.data) || [];
          if (!list.length) { audiusNode = node; return []; }
          audiusNode = node;
          return list
            .filter(function (t) { return t.streamable !== false && t.duration > 0 && !t.is_delete; })
            .map(function (t) {
              return {
                kind: 'search', id: 'au_' + t.id,
                title: t.title || '未命名',
                artist: (t.user && t.user.name) || 'Audius',
                cover: (t.artwork && (t.artwork['480x480'] || t.artwork['150x150'])) || '',
                url: node + '/v1/tracks/' + t.id + '/stream?app_name=juice-persona',
                durMs: (t.duration || 0) * 1000
              };
            });
        }).catch(function () { return tryNode(i + 1); });
    };
    if (audiusNode) {
      // 已知好节点先试，失败再轮询
      var saved = audiusNode;
      AUDIUS_NODES = [saved].concat(AUDIUS_NODES.filter(function (n) { return n !== saved; }));
    }
    return tryNode(0);
  }

  function searchJamendo(kw) {
    var key = (state.src && state.src.jamendoKey) || '';
    if (!key) return Promise.reject(new Error('请先填写 Jamendo 免费 Client ID'));
    return fetchJSON('https://api.jamendo.com/v3.0/tracks/?client_id=' + encodeURIComponent(key) +
      '&format=json&limit=30&search=' + encodeURIComponent(kw)).then(function (d) {
        if (!d || d.headers && d.headers.status === 'failed') {
          throw new Error((d && d.headers && d.headers.error_message) || 'Jamendo 返回失败（检查 Client ID）');
        }
        return (d.results || []).map(function (t) {
          return {
            kind: 'search', id: 'jm_' + t.id,
            title: t.name || '未命名',
            artist: t.artist_name || 'Jamendo',
            cover: t.image || '',
            url: t.audio,
            durMs: (t.duration || 0) * 1000
          };
        });
      });
  }

  function searchBuiltin(kw) {
    var mode = state.src.builtin;
    if (mode === 'jamendo') return searchJamendo(kw);
    return searchAudius(kw);
  }

  /* 3. 自定义音源脚本：代码只存本机 localStorage，仓库不含任何脚本 */
  var activeSource = null;     // 运行中的音源对象

  function loadSource(src) {
    try {
      var fn = new Function('window', '"use strict";\n' + src.code + '\nreturn (typeof MusicSource!=="undefined"&&MusicSource)||(window.MusicSource&&window.MusicSource)||null;');
      var obj = fn(window);
      if (!obj || typeof obj.search !== 'function') {
        toast('音源脚本必须定义 MusicSource 对象且带 search(keyword) 函数');
        return false;
      }
      activeSource = obj;
      toast('音源「' + (obj.name || src.name) + '」已加载');
      return true;
    } catch (e) {
      toast('音源脚本加载出错：' + e.message);
      return false;
    }
  }

  /* ---------------- 歌单与收藏 ---------------- */
  var LOVE_ID = 'love';

  function ensureLoveList() {
    var love = state.lists.filter(function (l) { return l.id === LOVE_ID; })[0];
    if (!love) {
      love = { id: LOVE_ID, name: '我的收藏', tracks: [] };
      state.lists.unshift(love);
      saveState();
    }
    return love;
  }

  function getList(id) {
    ensureLoveList();
    return state.lists.filter(function (l) { return l.id === id; })[0] || null;
  }

  /** 判断某首歌是否已在指定歌单里（按 source+songmid 判重） */
  function inList(listId, track) {
    var l = getList(listId);
    if (!l || !track) return false;
    var key = trackKey(track);
    return l.tracks.some(function (t) { return trackKey(t) === key; });
  }

  function trackKey(t) {
    if (!t) return '';
    if (t.track) return t.track.source + '|' + t.track.songmid;
    return t.id || (t.title + '|' + t.artist);
  }

  /** 加入歌单；返回 true 表示新增，false 表示已存在 */
  function addToList(listId, track) {
    var l = getList(listId);
    if (!l || !track) return false;
    if (inList(listId, track)) return false;
    // 只存必要字段，播放地址不落盘（音源地址会过期）
    l.tracks.push({
      id: track.id,
      title: track.title,
      artist: track.artist,
      cover: track.cover || '',
      source: track.source || (track.track && track.track.source) || '',
      interval: track.interval || '',
      track: track.track || null
    });
    saveState();
    return true;
  }

  function removeFromList(listId, track) {
    var l = getList(listId);
    if (!l) return false;
    var key = trackKey(track);
    var before = l.tracks.length;
    l.tracks = l.tracks.filter(function (t) { return trackKey(t) !== key; });
    saveState();
    return l.tracks.length < before;
  }

  function createList(name) {
    name = String(name || '').trim();
    if (!name) return null;
    var item = { id: 'list_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5), name: name, tracks: [] };
    state.lists.push(item);
    saveState();
    return item;
  }

  function removeList(id) {
    if (id === LOVE_ID) return false;
    state.lists = state.lists.filter(function (l) { return l.id !== id; });
    saveState();
    return true;
  }

  function toggleLove(track) {
    if (inList(LOVE_ID, track)) {
      removeFromList(LOVE_ID, track);
      return false;
    }
    addToList(LOVE_ID, track);
    return true;
  }

  /* ---------------- 搜索历史（联想用） ---------------- */
  function addHistory(kw) {
    kw = String(kw || '').trim();
    if (!kw) return;
    state.history = [kw].concat(state.history.filter(function (x) { return x !== kw; })).slice(0, 20);
    saveState();
  }

  /** 按前缀/包含匹配历史，最多 8 条 */
  function matchHistory(kw) {
    kw = String(kw || '').trim().toLowerCase();
    if (!kw) return state.history.slice(0, 8);
    return state.history.filter(function (x) {
      return x.toLowerCase().indexOf(kw) > -1;
    }).slice(0, 8);
  }

  var activeListId = 'love';   // 当前查看的歌单
  var searching = false;       // 搜索进行中，用于按钮/骨架屏状态
  var searchProgress = '';     // 逐源进度文案
  var showLyric = true;        // 沉浸页是否显示歌词
  var currentLyric = null;     // { parsed: [{time,text}], source }
  var lyricTrackKey = '';      // 当前歌词对应的歌，避免重复请求
  var searchResults = [];      // [{title,artist,cover,url,track}]
  function runSearch(kw) {
    if (!kw) return;
    var mode = state.src.builtin === 'custom' ? 'lx' : state.src.builtin;

    /* ---- 洛雪多平台聚合搜索 ---- */
    if (mode === 'lx') {
      if (!window.LxMusic) { toast('音源内核未加载'); return; }
      searching = true;
      searchProgress = '正在连接各平台…';
      renderHome();
      window.LxMusic.search(kw, 1, function (p) {
        // 实时进度：让用户看到具体哪个平台慢，而不是无限转圈
        if (p.phase === 'start') {
          searchProgress = '正在请求 ' + p.source + '（0/' + p.total + '）…';
        } else {
          searchProgress = '已完成 ' + p.done + '/' + p.total + ' 个平台' +
            (p.last && p.last.id ? '（' + p.last.id + ' ' + p.ms + 'ms）' : '') + '…';
        }
        var tip = document.querySelector('.mu-loading-text');
        if (tip) tip.textContent = searchProgress;
      }).then(function (res) {
        searching = false;
        searchProgress = '';
        searchResults = res.list.map(function (t) {
          return {
            kind: 'search',
            id: t.source + '_' + t.songmid,
            title: t.name,
            artist: t.singer,
            cover: t.img || '',
            url: '',              // 播放时才向音源脚本要地址
            track: t,             // 保留完整信息供取址
            source: t.source,
            interval: t.interval
          };
        });
        renderHome();
        if (!searchResults.length) {
          toast(res.errors.length ? ('没有搜到结果（' + res.errors[0].message + '）') : '没有搜到结果');
        } else if (res.errors.length) {
          toast('搜到 ' + searchResults.length + ' 首，' + res.errors.length + ' 个平台失败');
        }
      }).catch(function (e) {
        // 失败也要复位，否则 spinner 会一直转
        searching = false;
        searchProgress = '';
        renderHome();
        toast('搜索失败：' + (e && e.message ? e.message : 'unknown'));
      });
      return;
    }

    /* ---- Audius / Jamendo ---- */
    if (mode !== 'custom') {
      toast('搜索中…');
      searchBuiltin(kw).then(function (items) {
        searchResults = items.slice(0, 100);
        renderIfActive();
        if (!searchResults.length) toast('没有搜到结果');
      }).catch(function (e) {
        toast('搜索失败：' + (e && e.message ? e.message : 'unknown'));
      });
      return;
    }

    /* ---- 旧版自定义脚本（自带 search）---- */
    if (!activeSource) { toast('先加载一个音源脚本'); return; }
    toast('搜索中…');
    Promise.resolve(activeSource.search(kw)).then(function (res) {
      var items = res && res.items ? res.items : (Array.isArray(res) ? res : []);
      searchResults = items.filter(function (t) { return t && t.url; }).slice(0, 100).map(function (t) {
        return {
          kind: 'search', id: uid(),
          title: String(t.title || '未命名'),
          artist: String(t.artist || t.album || ''),
          cover: /^https?:\/\//i.test(t.cover || '') ? t.cover : '',
          url: String(t.url)
        };
      });
      renderIfActive();
      if (!searchResults.length) toast('没有搜到结果');
    }).catch(function (e) {
      toast('搜索失败：' + (e && e.message ? e.message : 'unknown'));
    });
  }

  /**
   * 播放一首搜索结果。
   * 洛雪的曲目没有直接 url，需要向音源脚本要地址（异步）。
   */
  function playTrack(track, listName) {
    if (!track) return;
    if (track.url) {
      playQueue([track], listName, 0);
      return;
    }
    if (!track.track) { toast('这首没有播放地址'); return; }
    if (!window.LxMusic || !window.LxMusic.hasSource()) {
      toast('尚未导入音源脚本，无法获取播放地址');
      return;
    }

    toast('获取播放地址…');
    var quality = state.quality || '128k';
    window.LxMusic.resolveUrl(track.track, quality).then(function (url) {
      if (!url) { toast('音源未返回地址'); return; }
      track.url = url;
      playQueue([track], listName, 0);
    }).catch(function (e) {
      toast('取地址失败：' + (e && e.message ? String(e.message).slice(0, 60) : 'unknown'));
    });
  }

  /* ---------------- UI：主屏 ---------------- */
  function listRowHtml(t, i, listName) {
    var active = cur && cur.url === t.url && qName === listName;
    var loved = inList(LOVE_ID, t);
    // 时长：洛雪结果直接给 interval 字符串（如 04:35），本机文件给 durMs
    var dur = t.interval || (t.durMs ? fmtTime(t.durMs / 1000) : '');
    var sub = [t.artist, t.source ? String(t.source).toUpperCase() : ''].filter(Boolean).join(' · ');
    var playing = active && audio && !audio.paused;
    return '<div class="mu-row' + (active ? ' active' : '') + '" data-play="' + listName + '" data-idx="' + i + '">' +
      '<span class="mu-row-ico">' +
        (t.cover
          ? '<img src="' + esc(t.cover) + '" alt="" loading="lazy">'
          : (playing ? '▶' : '♪')) +
      '</span>' +
      '<span class="mu-row-main"><b>' + esc(t.title) + '</b>' +
        (sub ? '<i>' + esc(sub) + '</i>' : '') +
      '</span>' +
      (dur ? '<span class="mu-row-dur">' + dur + '</span>' : '') +
      '<span class="mu-row-ops">' +
        '<button class="mu-love' + (loved ? ' on' : '') + '" data-love="' + i + '" title="' + (loved ? '取消收藏' : '收藏') + '">' + (loved ? '♥' : '♡') + '</button>' +
        '<button class="mu-addlist" data-addlist="' + i + '" title="加入歌单">＋</button>' +
      '</span>' +
      '</div>';
  }

  function localHtml() {
    var needRelink = state.localMeta.length && !localFiles.length;
    var rows = localTracks().map(function (t, i) { return listRowHtml(t, i, '本机文件'); }).join('');
    return '<div class="mu-panel">' +
      '<h3 class="mu-h3">📁 本机音乐</h3>' +
      '<p class="mu-note">文件只在你自己的浏览器里读取，不会上传到任何服务器。</p>' +
      '<div class="mu-btns">' +
        '<button class="mu-btn" id="muPickFiles">🎵 选择音乐文件</button>' +
        '<button class="mu-btn" id="muPickFolder">📂 关联本机文件夹' + (state.folderName ? '（' + esc(state.folderName) + '）' : '') + '</button>' +
        (needRelink ? '<button class="mu-btn warn" id="muRelink">🔄 恢复上次 ' + state.localMeta.length + ' 首（需重新授权）</button>' : '') +
      '</div>' +
      '<div class="mu-drop" id="muDrop">也可以把音乐文件直接拖到这里</div>' +
      '<input type="file" id="muFileInput" accept="audio/*,.mp3,.flac,.ogg,.wav,.m4a,.aac,.opus" multiple style="display:none">' +
      (rows ? '<div class="mu-list">' + rows + '</div>' : '<div class="mu-empty">还没有本机音乐</div>') +
    '</div>';
  }

  function linksHtml() {
    var rows = directList().map(function (t, i) { return listRowHtml(t, i, '直链歌单'); }).join('');
    return '<div class="mu-panel">' +
      '<h3 class="mu-h3">🔗 直链歌单</h3>' +
      '<p class="mu-note">适合放在自己网盘 / 服务器上的音乐。粘贴 JSON 数组（每条含 title 与 http(s) 的 url，可选 artist / cover）。</p>' +
      '<textarea class="mu-textarea" id="muJsonIn" rows="5" placeholder=\'[{"title":"歌名","url":"https://…/song.mp3"}]\'></textarea>' +
      '<div class="mu-btns">' +
        '<button class="mu-btn primary" id="muJsonAdd">导入歌单</button>' +
        '<button class="mu-btn" id="muJsonExample">填入示例</button>' +
        (state.direct.length ? '<button class="mu-btn danger" id="muJsonClear">清空</button>' : '') +
      '</div>' +
      (rows ? '<div class="mu-list">' + rows + '</div>' : '<div class="mu-empty">还没有直链歌曲</div>') +
    '</div>';
  }

  var SRC_SKELETON = 'var MusicSource = {\n' +
    '  name: "我的音源",\n' +
    '  // 必须实现：search(keyword) 返回 [{ title, artist, cover, url }]\n' +
    '  // url 必须是浏览器可直接播放的音频直链（注意 CORS 与 https）\n' +
    '  search: function (keyword) {\n' +
    '    return fetch("https://你的接口?q=" + encodeURIComponent(keyword))\n' +
    '      .then(function (r) { return r.json(); })\n' +
    '      .then(function (d) { return { items: d.list || [] }; });\n' +
    '  }\n' +
    '};';

  function searchHtml() {
    // 音源固定为在线聚合（洛雪内核）
    var lxReady = !!(window.LxMusic);
    var hasSrc = lxReady && window.LxMusic.hasSource();
    var srcHint = '';
    if (!hasSrc) {
      srcHint = '<p class="mu-note warn">还没有可用的音源脚本。曲库负责搜到歌，' +
        '播放地址需要音源脚本提供——去「音源」页导入一个。</p>';
    }

    return '<div class="mu-panel">' +
      srcHint +
      '<div class="mu-searchbar">' +
        '<div class="mu-search-wrap">' +
          '<input class="mu-input" id="muSearchKw" autocomplete="off" placeholder="歌名或歌手">' +
          '<div class="mu-suggest" id="muSuggest" hidden></div>' +
        '</div>' +
        '<button class="mu-btn primary" id="muSearchBtn"' + (searching ? ' disabled' : '') + '>' + (searching ? '搜索中' : '搜索') + '</button>' +
      '</div>' +
      (searching
        ? '<div class="mu-loading"><span class="mu-spinner"></span><span class="mu-loading-text">' + esc(searchProgress || '正在搜索…') + '</span></div>'
        : searchResults.length
          ? '<div class="mu-list">' + searchResults.map(function (t, i) { return listRowHtml(t, i, '搜索结果'); }).join('') + '</div>'
          : '<div class="mu-empty">搜点什么听听——支持歌名 / 歌手</div>') +
    '</div>';
  }

  /* ---------------- 加入歌单弹层 ---------------- */
  var addTargetIndex = -1;   // 当前要加入歌单的搜索结果索引

  function addListModalHtml() {
    if (addTargetIndex < 0) return '';
    ensureLoveList();
    var items = state.lists.map(function (l) {
      return '<button class="mu-pick-list" data-pick-list="' + l.id + '">' +
        esc(l.name) +
        '<span class="mu-pick-count">' + l.tracks.length + '</span>' +
        '</button>';
    }).join('');
    return '<div class="mu-modal-mask" id="muAddListMask">' +
      '<div class="mu-modal-box">' +
        '<h4 class="mu-modal-title">加入歌单</h4>' +
        '<div class="mu-pick-lists">' + items + '</div>' +
        '<div class="mu-modal-ops">' +
          '<button class="mu-btn" id="muPickNew">新建歌单</button>' +
          '<button class="mu-btn" id="muPickCancel">取消</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  /* ---------------- UI：我的歌单 ---------------- */
  function listsHtml() {
    ensureLoveList();
    var current = state.lists.filter(function (l) { return l.id === activeListId; })[0] || state.lists[0];
    if (current) activeListId = current.id;

    var listTabs = state.lists.map(function (l) {
      var isActive = current && l.id === current.id;
      return '<button class="mu-list-tab' + (isActive ? ' active' : '') + '" data-list-tab="' + l.id + '">' +
        esc(l.name) +
        '<span class="mu-list-count">' + l.tracks.length + '</span></button>';
    }).join('');

    var rows = '';
    if (current && current.tracks.length) {
      rows = '<div class="mu-list">' + current.tracks.map(function (t, i) {
        // 歌单里的条目结构是 { title, artist, track }，跟搜索结果不同，
        // 这里按 trackKey 判正在播放，才能跟搜索页一样有竖条 + 变色
        var active = !!cur && trackKey(cur) === trackKey(t);
        var inner = t.track || t;
        var sub = [t.artist || inner.singer, String(inner.source || t.source || '').toUpperCase()].filter(Boolean).join(' · ');
        var dur = t.interval || inner.interval || '';
        return '<div class="mu-row' + (active ? ' active' : '') + '" data-list-play="' + i + '">' +
          '<span class="mu-row-ico">' +
            (t.cover || inner.img
              ? '<img src="' + esc(t.cover || inner.img) + '" alt="" loading="lazy">'
              : (active ? '▶' : '♪')) +
          '</span>' +
          '<span class="mu-row-main"><b>' + esc(t.title) + '</b>' +
            (sub ? '<i>' + esc(sub) + '</i>' : '') + '</span>' +
          (dur ? '<span class="mu-row-dur">' + esc(dur) + '</span>' : '') +
          '<span class="mu-row-ops">' +
            '<button class="mu-addlist" data-list-remove="' + i + '" title="从歌单移除">✕</button>' +
          '</span></div>';
      }).join('') + '</div>';
    } else {
      rows = '<div class="mu-empty">' +
        (current && current.id === LOVE_ID
          ? '在搜索结果里点 ♡ 收藏喜欢的歌'
          : '这个歌单还是空的') + '</div>';
    }

    return '<div class="mu-panel">' +
      '<div class="mu-list-tabs">' + listTabs + '</div>' +
      '<div class="mu-btns">' +
        '<button class="mu-btn" id="muListNew">新建歌单</button>' +
        (current && current.id !== LOVE_ID
          ? '<button class="mu-btn danger" id="muListDel">删除此歌单</button>'
          : '') +
      '</div>' +
      rows +
    '</div>';
  }

  function scriptHtml() {
    var lxReady = !!window.LxMusic;
    var saved = lxReady ? window.LxMusic.listScripts() : [];
    var loaded = lxReady ? window.LxMusic.listLoaded() : [];

    var rows = saved.map(function (s) {
      var on = loaded.some(function (x) { return x.name === s.name; });
      return '<div class="mu-src' + (on ? ' on' : '') + '">' +
        '<b>' + esc(s.name) + (s.version ? ' <span class="mu-src-ver">' + esc(s.version) + '</span>' : '') + '</b>' +
        '<span class="mu-src-ops">' +
          '<span class="mu-src-tag">' + (on ? '已加载' : '未加载') + '</span>' +
          '<button class="mu-btn mini danger" data-lx-del="' + esc(s.id) + '">删除</button>' +
        '</span></div>';
    }).join('');

    var status = '';
    if (loaded.length) {
      status = '<p class="mu-note ok">运行中：' + loaded.map(function (x) {
        return esc(x.name) + '（' + x.sources.join('/') + '）';
      }).join('、') + '</p>';
    }

    return '<div class="mu-panel">' +
      '<p class="mu-note">音源脚本只负责把歌名换成播放地址，搜索由内置的多平台接口完成。' +
        '脚本只存在你本机浏览器，本站服务器不经手任何脚本内容。</p>' +
      status +
      '<div class="mu-btns">' +
        '<button class="mu-btn primary" id="muLxPickFile">导入 .js 文件</button>' +
        '<input type="file" id="muLxFileInput" accept=".js,text/javascript" hidden>' +
      '</div>' +
      '<textarea class="mu-textarea mono" id="muLxCode" rows="6" placeholder="或直接粘贴脚本内容…"></textarea>' +
      '<div class="mu-btns">' +
        '<button class="mu-btn primary" id="muLxAdd">保存并加载</button>' +
      '</div>' +
      (rows ? '<div class="mu-src-list">' + rows + '</div>' : '<div class="mu-empty">还没有导入音源脚本</div>') +
    '</div>';
  }

  /* 播放器条（固定底部，64px 三列） */
  function playerBarHtml() {
    var playing = audio && cur && !audio.paused;
    var cover = cur && cur.cover;
    return '<div class="mu-player">' +
      // 2px 进度条贴顶边缘
      '<div class="mu-bar"><span class="mu-time mu-time-cur">0:00</span>' +
        '<div class="mu-bar-progress"><i></i></div>' +
        '<input type="range" class="mu-seek" min="0" step="0.1" value="0">' +
        '<span class="mu-time mu-time-dur">0:00</span></div>' +
      // 左列：封面 + 标题
      '<div class="mu-disc' + (playing ? ' spin' : '') + '" id="muDisc">' +
        (cover ? '<img src="' + esc(cover) + '" alt="">' : '<span>♪</span>') +
      '</div>' +
      '<div class="mu-player-title">' + (cur ? esc(cur.title) : '未在播放') +
        (cur && cur.artist ? ' <i>· ' + esc(cur.artist) + '</i>' : '') + '</div>' +
      // 中列：传输控件
      '<div class="mu-ops mu-ops-main">' +
        '<button class="mu-op" id="muPrev" title="上一首">⏮</button>' +
        '<button class="mu-op big" id="muToggle" title="播放/暂停">' + (playing ? '⏸' : '▶') + '</button>' +
        '<button class="mu-op" id="muNext" title="下一首">⏭</button>' +
      '</div>' +
      // 右列：模式 / 音量 / 沉浸
      '<div class="mu-ops mu-ops-side">' +
        '<button class="mu-op' + (state.shuffle ? ' on' : '') + '" id="muShuffle" title="随机">🔀</button>' +
        '<button class="mu-op' + (state.repeat !== 'off' ? ' on' : '') + '" id="muRepeat" title="循环：' + state.repeat + '">🔁</button>' +
        '<span class="mu-volwrap">🔊<input type="range" class="mu-vol" min="0" max="1" step="0.01" value="' + state.volume + '"></span>' +
        '<button class="mu-op imm" id="muImmersive" title="沉浸模式">⛶</button>' +
      '</div>' +
    '</div>';
  }

  function homeHtml() {
    var tabs = [
      ['search', '搜索'],
      ['lists', '歌单'],
      ['script', '音源']
    ];
    return '<div class="mu-wrap">' +
      '<div class="mu-header">' +
        '<div class="mu-mark">♪</div>' +
        '<div class="mu-headtext">' +
          '<h2 class="mu-title">我的音乐台</h2>' +
          '<p class="mu-sub">' + sourceStatusText() + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="mu-tabs">' + tabs.map(function (t) {
        return '<button class="mu-tab' + (tab === t[0] ? ' active' : '') + '" data-mu-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      (tab === 'search' ? searchHtml()
        : tab === 'lists' ? listsHtml()
        : scriptHtml()) +
      '</div>';
  }

  /**
   * 加入歌单弹层挂到 body。
   * 放在 #muRoot 里会被 #modules-viewport（z-index:1，自成层叠上下文）压住，
   * 而播放条在 body 上 z-index:340，会盖在遮罩之上，导致弹层开着还能点播放。
   */
  function mountAddListModal() {
    var old = document.getElementById('muAddListMask');
    if (old) old.remove();
    if (addTargetIndex < 0) return;
    var host = document.createElement('div');
    host.innerHTML = addListModalHtml();
    var mask = host.firstElementChild;
    if (mask) document.body.appendChild(mask);
  }

  /** 头部副标题：用真实状态代替空泛文案 */
  function sourceStatusText() {
    if (!window.LxMusic) return '音源未就绪';
    var loaded = window.LxMusic.listLoaded ? window.LxMusic.listLoaded() : [];
    if (!loaded.length) return '未加载音源脚本';
    return loaded.map(function (x) { return x.name; }).join(' · ');
  }

  function renderIfActive() {
    if (el && document.getElementById('mod-music').classList.contains('active')) renderHome();
    renderMini();
  }

  function renderHome() {
    if (!el) return;

    // 整块重建 DOM 会让输入框丢值（新元素没有旧值）。
    // 重建前记下当前输入与焦点，重建后恢复，避免用户打字被打断。
    var prevInput = el.querySelector('#muSearchKw');
    var prevValue = prevInput ? prevInput.value : '';
    var hadFocus = prevInput && document.activeElement === prevInput;

    el.innerHTML = homeHtml();
    mountPlayerBar();
    mountAddListModal();
    bindHome();
    onProgress();

    if (prevValue) {
      var next = el.querySelector('#muSearchKw');
      if (next) {
        next.value = prevValue;
        if (hadFocus) next.focus();
      }
    }
  }

  /**
   * 播放条挂到 body 上。
   * #modules-viewport 是 position:fixed 的滚动容器，fixed 子元素会以它为包含块，
   * 导致 bottom:0 对不齐真实视口底部；挂 body 才真正贴底。
   */
  function mountPlayerBar() {
    var old = document.getElementById('muPlayerBar');
    if (old) old.remove();
    var html = playerBarHtml();
    var host = document.createElement('div');
    host.innerHTML = html;
    var bar = host.firstElementChild;
    if (!bar) return;
    bar.id = 'muPlayerBar';
    document.body.appendChild(bar);
    bindPlayerBar(bar);
    syncBarVisibility();
  }

  /** 只在音乐模块内显示播放条；其它模块交给右下角迷你条，避免遮住别人的内容 */
  function syncBarVisibility() {
    var bar = document.getElementById('muPlayerBar');
    if (!bar) return;
    var host = document.getElementById('mod-music');
    var inMusic = !!(host && host.classList.contains('active'));
    bar.style.display = (inMusic || immEl) ? '' : 'none';
    renderMini();
  }

  /** 模块不活跃时切歌：播放条没被重建，标题/封面得手动同步 */
  function syncBarMeta() {
    var bar = document.getElementById('muPlayerBar');
    if (!bar) return;
    var titleEl = bar.querySelector('.mu-player-title');
    if (titleEl) {
      titleEl.innerHTML = (cur ? esc(cur.title) : '未在播放') +
        (cur && cur.artist ? ' <i>· ' + esc(cur.artist) + '</i>' : '');
    }
    var disc = bar.querySelector('#muDisc');
    if (disc) {
      disc.innerHTML = (cur && cur.cover)
        ? '<img src="' + esc(cur.cover) + '" alt="">'
        : '<span>♪</span>';
    }
  }

  /** 播放条在 body 上，单独绑定 */
  function bindPlayerBar(bar) {
    var toggle = bar.querySelector('#muToggle'); if (toggle) toggle.onclick = togglePlay;
    var prev = bar.querySelector('#muPrev'); if (prev) prev.onclick = prevTrack;
    var next = bar.querySelector('#muNext'); if (next) next.onclick = function () { nextTrack(false); };
    var shuf = bar.querySelector('#muShuffle');
    if (shuf) shuf.onclick = function () { state.shuffle = !state.shuffle; saveState(); renderHome(); };
    var rep = bar.querySelector('#muRepeat');
    if (rep) rep.onclick = function () {
      state.repeat = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
      saveState(); renderHome();
      toast('循环：' + ({ off: '关闭', all: '列表循环', one: '单曲循环' })[state.repeat]);
    };
    var vol = bar.querySelector('.mu-vol');
    if (vol) vol.oninput = function () { setVolume(parseFloat(vol.value)); };
    var seek = bar.querySelector('.mu-seek');
    if (seek) seek.oninput = function () {
      if (audio && audio.duration) audio.currentTime = parseFloat(seek.value);
    };
    var imm = bar.querySelector('#muImmersive'); if (imm) imm.onclick = openImmersive;
  }

  function bindHome() {
    el.querySelectorAll('[data-mu-tab]').forEach(function (b) {
      b.onclick = function () {
        tab = b.getAttribute('data-mu-tab');
        // 切页时顺手关掉「加入歌单」弹层，否则它会跟着新页面一起重建
        addTargetIndex = -1;
        renderHome();
      };
    });

    // 列表播放
    el.querySelectorAll('[data-play]').forEach(function (r) {
      r.onclick = function () {
        var name = r.getAttribute('data-play');
        var i = parseInt(r.getAttribute('data-idx'), 10);
        var list = name === '本机文件' ? localTracks() : name === '直链歌单' ? directList() : searchResults;
        var target = list[i];
        if (!target) return;
        // 洛雪曲目没有现成 url，要先向音源脚本要地址
        if (!target.url && target.track) {
          playTrack(target, name);
          return;
        }
        playQueue(list, name, i);
      };
    });

    // 本机
    var pick = el.querySelector('#muPickFiles');
    var input = el.querySelector('#muFileInput');
    if (pick && input) {
      pick.onclick = function () { input.click(); };
      input.onchange = function () { addFileList(input.files); };
    }
    var folder = el.querySelector('#muPickFolder'); if (folder) folder.onclick = pickFolder;
    var relink = el.querySelector('#muRelink'); if (relink) relink.onclick = restoreFolder;
    var drop = el.querySelector('#muDrop');
    if (drop) {
      drop.onclick = function () { if (input) input.click(); };
      ['dragover', 'dragenter'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.add('over'); });
      });
      ['dragleave', 'drop'].forEach(function (ev) {
        drop.addEventListener(ev, function (e) { e.preventDefault(); drop.classList.remove('over'); });
      });
      drop.addEventListener('drop', function (e) {
        if (e.dataTransfer && e.dataTransfer.files) addFileList(e.dataTransfer.files);
      });
    }

    // 直链歌单
    var jadd = el.querySelector('#muJsonAdd');
    var jin = el.querySelector('#muJsonIn');
    if (jadd && jin) jadd.onclick = function () { importDirect(jin.value); jin.value = ''; };
    var jex = el.querySelector('#muJsonExample'); if (jex && jin) jex.onclick = function () { jin.value = PLAYLIST_EXAMPLE; };
    var jcl = el.querySelector('#muJsonClear');
    if (jcl) jcl.onclick = function () {
      state.direct = []; saveState(); renderHome(); toast('直链歌单已清空');
    };

    // 音源
    el.querySelectorAll('[data-builtin]').forEach(function (c) {
      c.onclick = function () {
        state.src.builtin = c.getAttribute('data-builtin');
        saveState();
        renderHome();
      };
    });
    var jmSave = el.querySelector('#muJmKeySave');
    var jmKey = el.querySelector('#muJmKey');
    if (jmSave && jmKey) {
      jmSave.onclick = function () {
        state.src.jamendoKey = jmKey.value.trim();
        saveState();
        toast(state.src.jamendoKey ? 'Client ID 已保存' : 'Client ID 已清空');
      };
    }
    /* ---- 洛雪音源脚本：导入 / 删除 ---- */
    var lxAdd = el.querySelector('#muLxAdd');
    var lxCode = el.querySelector('#muLxCode');
    var lxPick = el.querySelector('#muLxPickFile');
    var lxInput = el.querySelector('#muLxFileInput');

    function importLxScript(text) {
      if (!window.LxMusic) { toast('音源内核未加载'); return; }
      toast('导入中…');
      window.LxMusic.importScript(text).then(function (r) {
        toast('已导入：' + r.name + '（' + r.sources.join('/') + '）');
        renderHome();
      }).catch(function (e) {
        toast('导入失败：' + (e && e.message ? e.message : 'unknown'));
      });
    }

    if (lxAdd && lxCode) {
      lxAdd.onclick = function () {
        var code = lxCode.value;
        if (!code.trim()) { toast('先粘贴脚本内容'); return; }
        importLxScript(code);
      };
    }
    if (lxPick && lxInput) {
      lxPick.onclick = function () { lxInput.click(); };
      lxInput.onchange = function () {
        var f = lxInput.files && lxInput.files[0];
        if (!f) return;
        // 用 FileReader 读成文本，而不是把 File 当字符串（会得到 [object File]）
        var reader = new FileReader();
        reader.onload = function () { importLxScript(String(reader.result || '')); };
        reader.onerror = function () { toast('读取文件失败'); };
        reader.readAsText(f);
      };
    }
    el.querySelectorAll('[data-lx-del]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        if (!window.LxMusic) return;
        window.LxMusic.removeScript(b.getAttribute('data-lx-del'));
        toast('已删除');
        renderHome();
      };
    });
    var sbtn = el.querySelector('#muSearchBtn');
    var skw = el.querySelector('#muSearchKw');
    var sug = el.querySelector('#muSuggest');

    /* ---- 搜索联想：按输入实时匹配历史 + 平台热词 ---- */
    var suggestTimer = null;
    var suggestSeq = 0;

    /* 联想：本地历史立即出，平台热词异步补上（防抖 250ms） */
    function renderSuggest() {
      if (!sug || !skw) return;
      var kw = skw.value.trim();
      var hist = matchHistory(kw);
      var seq = ++suggestSeq;

      function paint(remote) {
        if (seq !== suggestSeq) return;   // 输入已变，丢弃旧结果
        var html = '';
        if (remote && remote.length) {
          html += '<div class="mu-suggest-head">搜索建议</div>' +
            remote.map(function (x) {
              return '<div class="mu-suggest-item" data-sug="' + esc(x) + '">🔎 ' + esc(x) + '</div>';
            }).join('');
        }
        if (hist.length) {
          html += '<div class="mu-suggest-head">搜索历史</div>' +
            hist.map(function (x) {
              return '<div class="mu-suggest-item" data-sug="' + esc(x) + '">🕘 ' + esc(x) + '</div>';
            }).join('');
        }
        if (kw) {
          html += '<div class="mu-suggest-item" data-sug="' + esc(kw) + '">🔍 搜索「' + esc(kw) + '」</div>';
        }
        if (!html) { sug.hidden = true; sug.innerHTML = ''; return; }
        sug.innerHTML = html;
        sug.hidden = false;
      }

      // 先渲染本地部分，避免输入时下拉框空白
      paint([]);

      if (!kw) return;
      if (!window.LxMusic || !window.LxMusic.tipSearch) return;

      window.LxMusic.tipSearch(kw).then(function (list) {
        paint(list);
      }).catch(function () {});
    }

    if (skw) {
      skw.oninput = function () {
        if (suggestTimer) clearTimeout(suggestTimer);
        suggestTimer = setTimeout(renderSuggest, 250);
      };
      skw.onfocus = renderSuggest;
      skw.onkeydown = function (e) {
        if (e.key === 'Enter') {
          if (sug) sug.hidden = true;
          doSearch(skw.value.trim());
        } else if (e.key === 'Escape') {
          if (sug) sug.hidden = true;
        }
      };
    }

    function doSearch(kw) {
      if (!kw) return;
      addHistory(kw);
      runSearch(kw);
    }

    if (sbtn && skw) {
      sbtn.onclick = function () { doSearch(skw.value.trim()); };
    }

    if (sug) {
      sug.onclick = function (e) {
        var item = e.target.closest('[data-sug]');
        if (!item) return;
        var val = item.getAttribute('data-sug');
        if (skw) skw.value = val;
        sug.hidden = true;
        doSearch(val);
      };
    }

    /* 点空白处收起联想：交给 #muRoot 上的委托处理（只绑一次，见 init），
       不在这里每次渲染都往 document 上挂新监听 */

    /* ---- 收藏按钮 ---- */
    el.querySelectorAll('[data-love]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var i = parseInt(b.getAttribute('data-love'), 10);
        var track = searchResults[i];
        if (!track) return;
        var nowLoved = toggleLove(track);
        toast(nowLoved ? '已收藏' : '已取消收藏');
        renderHome();
      };
    });

    /* ---- 加入歌单按钮 ---- */
    el.querySelectorAll('[data-addlist]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        addTargetIndex = parseInt(b.getAttribute('data-addlist'), 10);
        renderHome();
      };
    });

    /* ---- 弹层：选歌单 / 新建 / 取消 ---- */
    var mask = document.getElementById('muAddListMask');
    if (mask) {
      mask.onclick = function (e) {
        // 点遮罩空白处关闭
        if (e.target === mask) {
          addTargetIndex = -1;
          renderHome();
        }
      };
    }
    document.querySelectorAll('[data-pick-list]').forEach(function (b) {
      b.onclick = function () {
        var listId = b.getAttribute('data-pick-list');
        var track = searchResults[addTargetIndex];
        if (!track) { addTargetIndex = -1; renderHome(); return; }
        var l = getList(listId);
        if (!l) { addTargetIndex = -1; renderHome(); return; }
        if (inList(listId, track)) {
          toast('已在「' + l.name + '」里');
        } else {
          addToList(listId, track);
          toast('已加入「' + l.name + '」');
        }
        addTargetIndex = -1;
        renderHome();
      };
    });

    var pickNew = document.getElementById('muPickNew');
    if (pickNew) pickNew.onclick = function () {
      var name = window.prompt('新歌单名称');
      if (!name) return;
      var item = createList(name);
      var track = searchResults[addTargetIndex];
      if (item && track) {
        addToList(item.id, track);
        toast('已加入「' + item.name + '」');
      }
      addTargetIndex = -1;
      renderHome();
    };

    var pickCancel = document.getElementById('muPickCancel');
    if (pickCancel) pickCancel.onclick = function () {
      addTargetIndex = -1;
      renderHome();
    };

    /* ---- 歌单操作 ---- */
    el.querySelectorAll('[data-list-tab]').forEach(function (b) {
      b.onclick = function () {
        activeListId = b.getAttribute('data-list-tab');
        renderHome();
      };
    });

    el.querySelectorAll('[data-list-play]').forEach(function (r) {
      r.onclick = function (e) {
        if (e.target.closest('[data-list-remove]')) return;
        var i = parseInt(r.getAttribute('data-list-play'), 10);
        var l = getList(activeListId);
        if (!l) return;
        var target = l.tracks[i];
        if (!target) return;
        if (!target.url && target.track) {
          playTrack(target, l.name);
          return;
        }
        playQueue(l.tracks, l.name, i);
      };
    });

    el.querySelectorAll('[data-list-remove]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var i = parseInt(b.getAttribute('data-list-remove'), 10);
        var l = getList(activeListId);
        if (!l) return;
        l.tracks.splice(i, 1);
        saveState();
        renderHome();
      };
    });

    var listNew = el.querySelector('#muListNew');
    if (listNew) listNew.onclick = function () {
      var name = window.prompt('新歌单名称');
      if (!name) return;
      var item = createList(name);
      if (item) { activeListId = item.id; renderHome(); }
    };

    var listDel = el.querySelector('#muListDel');
    if (listDel) listDel.onclick = function () {
      var l = getList(activeListId);
      if (!l) return;
      if (!window.confirm('删除歌单「' + l.name + '」？')) return;
      removeList(l.id);
      activeListId = LOVE_ID;
      renderHome();
    };
  }

  /* ---------------- 沉浸全屏 ---------------- */
  var immEl = null;
  /* ---------------- 沉浸页歌词 ---------------- */
  /** 渲染歌词行（带 data-time 供高亮） */
  function lyricLinesHtml() {
    if (!showLyric) return '';
    if (!currentLyric) return '<div class="mu-imm-lyric-tip">歌词加载中…</div>';
    var parsed = currentLyric.parsed || [];
    if (!parsed.length) {
      return '<div class="mu-imm-lyric-tip">' +
        (currentLyric.pending ? '歌词加载中…（这首歌要跨平台找）' : '暂无歌词') + '</div>';
    }
    return '<span class="mu-lyr-pad"></span>' +
      parsed.map(function (l, i) {
        return '<p class="mu-imm-lyric-line" data-line="' + i + '" data-time="' + l.time + '">' + esc(l.text) + '</p>';
      }).join('') +
      '<span class="mu-lyr-pad"></span>';
  }

  /** 为当前歌曲取歌词（同一首不重复请求） */
  function loadLyricFor(track) {
    if (!track) { currentLyric = null; lyricTrackKey = ''; return; }
    var key = (track.source || '') + '|' + (track.id || track.title || '');
    if (key === lyricTrackKey) return;
    lyricTrackKey = key;
    currentLyric = null;

    if (!window.LxLyric) return;
    // 非酷我来源要「搜一次再取」，链路偏长，超时就先给个可读提示而不是一直转
    var slowTimer = setTimeout(function () {
      if (key !== lyricTrackKey || currentLyric) return;
      currentLyric = { parsed: [], pending: true };
      refreshImmersiveLyric();
    }, 8000);

    window.LxLyric.getLyric(track).then(function (res) {
      clearTimeout(slowTimer);
      // 期间可能已切歌，丢弃过期结果
      if (key !== lyricTrackKey) return;
      currentLyric = res;
      refreshImmersiveLyric();
    }).catch(function () {
      clearTimeout(slowTimer);
      if (key !== lyricTrackKey) return;
      currentLyric = { parsed: [] };
      refreshImmersiveLyric();
    });
  }

  /** 重绘沉浸页歌词区（不重建整个 DOM，避免打断滚动） */
  function refreshImmersiveLyric() {
    if (!immEl) return;
    var box = immEl.querySelector('#muImmLyric');
    if (!box) return;
    box.innerHTML = lyricLinesHtml();
    applyLyricPad(box);
    lastLyricIndex = -1;   // innerHTML 已清掉所有 active，必须重算
    highlightLyric(audio ? audio.currentTime : 0);
  }

  /** 首尾留白高度 = 容器可视高度的一半，首末句才能滚到正中 */
  function applyLyricPad(box) {
    var pads = box.querySelectorAll('.mu-lyr-pad');
    if (!pads.length) return;
    var h = Math.max(0, box.clientHeight / 2 - 24);
    for (var i = 0; i < pads.length; i++) pads[i].style.height = h + 'px';
  }

  /** 按当前播放时间高亮歌词行，并平滑滚动到中间 */
  var lastLyricIndex = -1;
  function highlightLyric(t) {
    if (!immEl || !currentLyric) return;
    var parsed = currentLyric.parsed || [];
    if (!parsed.length) return;

    // 二分找当前行
    var lo = 0, hi = parsed.length - 1, cur2 = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (parsed[mid].time <= t) { cur2 = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    if (cur2 === lastLyricIndex) return;
    lastLyricIndex = cur2;

    var box = immEl.querySelector('#muImmLyric');
    if (!box) return;
    var lines = box.querySelectorAll('.mu-imm-lyric-line');
    for (var i = 0; i < lines.length; i++) {
      lines[i].classList.toggle('active', i === cur2);
      lines[i].classList.toggle('passed', i < cur2);
    }
    var active = lines[cur2];
    if (active) {
      // 滚到容器垂直中间。首尾各有一个 .mu-lyr-pad 撑出半屏留白，
      // 所以第一句和最后一句也能居中。
      // behavior 用 auto 而不是 smooth——切行比动画快，smooth 队列会堆积，
      // 实测表现为 scrollTop 一直停在 0。
      try {
        active.scrollIntoView({ block: 'center', behavior: 'auto' });
      } catch (e) {
        var target = active.offsetTop - box.clientHeight / 2 + active.offsetHeight / 2;
        box.scrollTo({ top: Math.max(0, target), behavior: 'auto' });
      }
    }
  }

  function openImmersive() {
    closeImmersive();
    // 每次打开都从存储重读开关，避免变量与 localStorage 长期不一致
    try {
      var ly = localStorage.getItem('juice_music_show_lyric');
      if (ly !== null) showLyric = ly === '1';
    } catch (e) {}
    immEl = document.createElement('div');
    immEl.className = 'mu-immersive';
    immEl.innerHTML = immHtml();
    document.body.appendChild(immEl);
    bindImmersive();
    syncPlayUI(audio && !audio.paused);
    onProgress();
    lastLyricIndex = -1;
    loadLyricFor(cur);
    // 首帧布局完成后才知道容器真实高度，此时才能算留白
    var padBox = immEl.querySelector('#muImmLyric');
    if (padBox) applyLyricPad(padBox);
    setTimeout(function () {
      if (immEl) {
        var b = immEl.querySelector('#muImmLyric');
        if (b) applyLyricPad(b);
        lastLyricIndex = -1;
        highlightLyric(audio ? audio.currentTime : 0);
      }
    }, 60);
  }
  function immHtml() {
    var playing = audio && cur && !audio.paused;
    var bars = '';
    for (var i = 0; i < 24; i++) bars += '<i style="--d:' + (i * 0.08).toFixed(2) + 's"></i>';
    return '<div class="mu-imm-bg"></div>' +
      '<div class="mu-imm-inner">' +
        '<div class="mu-imm-left">' +
          '<div class="mu-imm-vinyl' + (playing ? ' spin' : '') + '">' +
            '<div class="mu-imm-disc' + (playing ? ' spin' : '') + '">' +
              (cur && cur.cover ? '<img src="' + esc(cur.cover) + '" alt="">' : '<span>♪</span>') +
            '</div><div class="mu-imm-hole"></div>' +
          '</div>' +
          '<div class="mu-imm-bars' + (playing ? ' on' : '') + '">' + bars + '</div>' +
          '<div class="mu-imm-title">' + (cur ? esc(cur.title) : '未在播放') + '</div>' +
          '<div class="mu-imm-artist">' + (cur && cur.artist ? esc(cur.artist) : '我的音乐台') + '</div>' +
        '</div>' +
        '<div class="mu-imm-lyric' + (showLyric ? '' : ' hidden') + '" id="muImmLyric">' +
          lyricLinesHtml() +
        '</div>' +
        '<div class="mu-imm-foot">' +
          '<div class="mu-bar imm"><span class="mu-time mu-time-cur">0:00</span>' +
            '<div class="mu-bar-progress"><i></i></div>' +
            '<input type="range" class="mu-seek" min="0" step="0.1" value="0">' +
            '<span class="mu-time mu-time-dur">0:00</span></div>' +
          '<div class="mu-ops imm">' +
            '<button class="mu-op" data-imm="prev" title="上一首">⏮</button>' +
            '<button class="mu-op big" data-imm="toggle" title="播放/暂停">' + (playing ? '⏸' : '▶') + '</button>' +
            '<button class="mu-op" data-imm="next" title="下一首">⏭</button>' +
            '<button class="mu-op' + (showLyric ? ' on' : '') + '" data-imm="lyric" title="' + (showLyric ? '隐藏歌词' : '显示歌词') + '">词</button>' +
            '<button class="mu-op" data-imm="exit" title="退出（Esc）">✕</button>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function bindImmersive() {
    immEl.querySelector('[data-imm="prev"]').onclick = prevTrack;
    immEl.querySelector('[data-imm="next"]').onclick = function () { nextTrack(false); };
    immEl.querySelector('[data-imm="toggle"]').onclick = togglePlay;
    immEl.querySelector('[data-imm="exit"]').onclick = closeImmersive;
    immEl.querySelector('[data-imm="lyric"]').onclick = function () {
      showLyric = !showLyric;
      try { localStorage.setItem('juice_music_show_lyric', showLyric ? '1' : '0'); } catch (e) {}
      // 原地切换：重建整页会打断滚动位置和唱片动画
      var box = immEl.querySelector('#muImmLyric');
      if (box) box.classList.toggle('hidden', !showLyric);
      this.classList.toggle('on', showLyric);
      this.title = showLyric ? '隐藏歌词' : '显示歌词';
      // 从隐藏切回时强制重算：lastLyricIndex 可能是隐藏前留下的旧值，
      // 且隐藏期间容器高度为 0，留白也得重新量。
      // 必须重写 innerHTML——showLyric=false 时 lyricLinesHtml() 返回空串，
      // 若这次是「关着歌词进的沉浸页」，DOM 里根本没内容可显示。
      if (showLyric) {
        box.innerHTML = lyricLinesHtml();
        applyLyricPad(box);
        lastLyricIndex = -1;
        highlightLyric(audio ? audio.currentTime : 0);
      }
    };
    var seek = immEl.querySelector('.mu-seek');
    seek.oninput = function () { if (audio && audio.duration) audio.currentTime = parseFloat(seek.value); };
    immEl.addEventListener('click', function (e) {
      if (e.target === immEl || e.target.classList.contains('mu-imm-bg')) closeImmersive();
    });
  }
  function closeImmersive() {
    if (!immEl) return;
    immEl.remove();
    immEl = null;
    // 在别的模块里关沉浸页时，hashchange 和 class 变化都已经错过，
    // 不在这里重算，播放条会永久留在那个模块上盖住内容
    syncBarVisibility();
  }

  /* ---------------- 全局迷你条（模块外也可见） ---------------- */
  var miniEl = null;
  function ensureMini() {
    if (miniEl) return;
    miniEl = document.createElement('div');
    miniEl.className = 'mu-mini';
    miniEl.style.display = 'none';
    document.body.appendChild(miniEl);
  }
  function renderMini() {
    ensureMini();
    if (!cur) { miniEl.style.display = 'none'; return; }
    var inMusic = el && document.getElementById('mod-music').classList.contains('active');
    var show = !(inMusic || immEl);
    miniEl.style.display = show ? 'flex' : 'none';
    if (!show) return;
    var playing = audio && !audio.paused;
    miniEl.innerHTML =
      '<span class="mu-mini-dot' + (playing ? ' on' : '') + '"></span>' +
      '<span class="mu-mini-title">' + esc(cur.title) + '</span>' +
      '<button class="mu-mini-btn" data-mini="toggle" title="播放/暂停">' + (playing ? '⏸' : '▶') + '</button>' +
      '<button class="mu-mini-btn" data-mini="next" title="下一首">⏭</button>' +
      '<button class="mu-mini-btn" data-mini="goto" title="打开播放器">🎧</button>' +
      '<button class="mu-mini-btn" data-mini="stop" title="停止">✕</button>';
    miniEl.querySelectorAll('[data-mini]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var k = b.getAttribute('data-mini');
        if (k === 'toggle') togglePlay();
        else if (k === 'next') nextTrack(false);
        else if (k === 'goto') { if (window.AppRouter) window.AppRouter.navigate('music', 'home'); }
        else if (k === 'stop') {
          try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (err) {}
          cur = null; queue = []; qi = -1;
          miniEl.style.display = 'none';
          renderIfActive();
        }
      };
    });
    miniEl.onclick = function () {
      if (window.AppRouter) window.AppRouter.navigate('music', 'home');
    };
  }

  function syncPlayUI(playing) {
    var bar = document.getElementById('muPlayerBar');
    var t = bar && bar.querySelector('#muToggle');
    if (t) t.textContent = playing ? '⏸' : '▶';
    var d = bar && bar.querySelector('#muDisc');
    if (d) d.classList.toggle('spin', !!playing);
    var tt = document.querySelectorAll('.mu-imm-title');
    tt.forEach(function (x) { if (cur) x.textContent = cur.title; });
    var ta = document.querySelectorAll('.mu-imm-artist');
    ta.forEach(function (x) { if (cur) x.textContent = cur.artist || '我的音乐台'; });
    if (immEl) {
      var vinyl = immEl.querySelector('.mu-imm-vinyl');
      var disc = immEl.querySelector('.mu-imm-disc');
      var bars = immEl.querySelector('.mu-imm-bars');
      var btn = immEl.querySelector('[data-imm="toggle"]');
      if (vinyl) vinyl.classList.toggle('spin', !!playing);
      if (disc) disc.classList.toggle('spin', !!playing);
      if (bars) bars.classList.toggle('on', !!playing);
      if (btn) btn.textContent = playing ? '⏸' : '▶';
    }
    renderMini();
    if ('mediaSession' in navigator) {
      try { navigator.mediaSession.playbackState = playing ? 'playing' : 'paused'; } catch (e) {}
    }
  }

  /* ---------------- 轻提示 ---------------- */
  var toastTimer = null;
  function toast(msg) {
    var box = document.querySelector('.mu-toast');
    if (!box) {
      box = document.createElement('div');
      box.className = 'mu-toast';
      document.body.appendChild(box);
    }
    box.textContent = msg;
    box.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { box.classList.remove('show'); }, 2200);
  }

  /* ---------------- 模块键盘（仅本模块激活时；沉浸模式全局 Esc） ---------------- */
  function onKey(e) {
    var active = document.getElementById('mod-music').classList.contains('active');
    var imm = !!immEl;
    var maskOpen = !!document.getElementById('muAddListMask');
    if (!active && !imm && !maskOpen) return;
    // 其他输入框里不抢键
    if (/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
    if (e.key === 'Escape' && maskOpen) {
      addTargetIndex = -1;
      document.getElementById('muAddListMask').remove();
      return;
    }
    if (!active && !imm) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight' && audio) { audio.currentTime = Math.min((audio.duration || 0), audio.currentTime + 5); }
    else if (e.key === 'ArrowLeft' && audio) { audio.currentTime = Math.max(0, audio.currentTime - 5); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setVolume(state.volume + 0.05); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setVolume(state.volume - 0.05); }
    else if (e.key === 'Escape' && imm) closeImmersive();
  }

  /* ---------------- 模块接口 ---------------- */
  function init() {
    el = document.getElementById('muRoot');
    if (!el) return;
    loadState();
    if (!inited) {
      inited = true;
      document.addEventListener('keydown', onKey);
      /* 切模块（hash 变化）时重算吸底条显隐：音频常驻，但吸底条只在
         离开音乐模块且非沉浸模式时出现 */
      window.addEventListener('hashchange', function () {
        // 弹层挂在 body 上，离开模块后没人会清它，会挡住整个页面
        addTargetIndex = -1;
        var mask = document.getElementById('muAddListMask');
        if (mask) mask.remove();
        setTimeout(syncBarVisibility, 60);
        setTimeout(syncBarVisibility, 400);
      });
      /* 路由切模块是异步的（等 chunk 加载完才摘 active 类），
         直接盯 #mod-music 的 class 变化最准 */
      var moTarget = document.getElementById('mod-music');
      if (moTarget && window.MutationObserver) {
        new MutationObserver(syncBarVisibility).observe(moTarget, { attributes: true, attributeFilter: ['class'] });
      }
      /* 点空白收起搜索联想。只绑一次，用委托找当前 DOM——
         之前每次 renderHome 都往 document 上挂一个 once 监听，
         未点击前会一直累积，闭包还持有已被替换掉的旧元素 */
      document.addEventListener('click', function (e) {
        var sug = document.getElementById('muSuggest');
        if (!sug || sug.hidden) return;
        var skw = document.getElementById('muSearchKw');
        if (sug.contains(e.target)) return;
        if (skw && skw.contains(e.target)) return;
        sug.hidden = true;
      });
      ensureAudio();
      ensureMini();

      /* 首次进入时加载内置音源脚本 + 用户导入的脚本。
         内置脚本随包发布，开箱即可播放；用户导入的追加在后面。 */
      if (window.LxMusic) {
        window.LxMusic.loadBuiltinScripts()
          .then(function () { return window.LxMusic.loadSavedScripts(); })
          .then(function () { renderIfActive(); })
          .catch(function (e) { console.warn('[LxMusic] 音源加载失败', e); });
      }
    }
    renderHome();
  }

  function restoreView() { renderHome(); }

  function destroy() {
    /* 只卸模块级 UI；audio / 迷你条 / 键盘监听保留——跨模块继续播放 */
    closeImmersive();
    // 弹层挂在 body 上、z=500，离开模块后没人会清它，会挡住整个页面
    addTargetIndex = -1;
    var mask = document.getElementById('muAddListMask');
    if (mask) mask.remove();
    renderMini();
  }

  window.AppMusic = { init: init, restoreView: restoreView, destroy: destroy };
})();
