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
  var tab = 'local';
  var inited = false;

  /* ---------------- 持久化状态 ---------------- */
  function defaultState() {
    return {
      volume: 0.8,
      repeat: 'all',           // off | all | one
      shuffle: false,
      direct: [],              // 直链歌单 [{id,title,artist,cover,url}]
      sources: [],             // [{id,name,code}]
      localMeta: [],           // 本机文件元数据 [{title,size}]（刷新后需重新关联）
      folderName: '',
      /* 内置开源音源：audius（免 key）/ jamendo（免费 key）/ custom（自定义脚本） */
      src: { builtin: 'audius', jamendoKey: '' }
    };
  }
  var state = defaultState();

  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        state = Object.assign(defaultState(), d);
        if (!state.src || !state.src.builtin) {
          state.src = { builtin: 'audius', jamendoKey: (state.src && state.src.jamendoKey) || '' };
        }
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
    audio.addEventListener('pause', function () { syncPlayUI(false); });
    audio.addEventListener('error', function () {
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
    renderIfActive();
    renderMini();
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
      if (document.activeElement !== sliders[m] && d) sliders[m].value = String(t);
    }
    if ('mediaSession' in navigator && audio && audio.duration) {
      try { navigator.mediaSession.setPositionState({ duration: audio.duration, playbackRate: 1, position: t }); } catch (e) {}
    }
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
            .filter(function (t) { return t.streamable !== false && t.duration > 0; })
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

  var searchResults = [];      // [{title,artist,cover,url}]
  function runSearch(kw) {
    if (!kw) return;
    if (state.src.builtin !== 'custom') {
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

  /* ---------------- UI：主屏 ---------------- */
  function listRowHtml(t, i, listName) {
    var active = cur && cur.url === t.url && qName === listName;
    var dur = t.durMs ? fmtTime(t.durMs / 1000) : '';
    return '<div class="mu-row' + (active ? ' active' : '') + '" data-play="' + listName + '" data-idx="' + i + '">' +
      '<span class="mu-row-ico">' + (active && audio && !audio.paused ? '▶' : '♪') + '</span>' +
      '<span class="mu-row-main"><b>' + esc(t.title) + '</b>' +
      (t.artist ? '<i>' + esc(t.artist) + '</i>' : '') + '</span>' +
      (dur ? '<span class="mu-row-dur">' + dur + '</span>' : '') +
      '<span class="mu-row-go">播放</span>' +
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

  function sourceHtml() {
    var srcRows = (state.sources || []).map(function (s, i) {
      var on = activeSource && activeSource.name === s.name;
      return '<div class="mu-src' + (on ? ' on' : '') + '" data-src="' + i + '">' +
        '<b>' + esc(s.name || '未命名音源') + '</b>' +
        '<span class="mu-src-ops">' +
          '<button class="mu-btn mini" data-src-use="' + i + '">' + (on ? '已加载' : '加载') + '</button>' +
          '<button class="mu-btn mini danger" data-src-del="' + i + '">删除</button>' +
        '</span></div>';
    }).join('');
    var BUILTIN_CHIPS = [
      { k: 'audius', label: ' Audius', tip: '去中心化音乐平台 · 免 Key · 全曲播放' },
      { k: 'jamendo', label: ' Jamendo', tip: '55 万+ CC 协议曲库 · 需免费 Client ID' },
      { k: 'custom', label: ' 自定义脚本', tip: '粘贴你自己写的 MusicSource 脚本' }
    ];
    var cur = state.src.builtin;
    var chipsHtml = '<div class="mu-src-chips">' + BUILTIN_CHIPS.map(function (c) {
      return '<button type="button" class="mu-src-chip' + (cur === c.k ? ' active' : '') +
        '" data-builtin="' + c.k + '" title="' + esc(c.tip) + '">' + c.label + '</button>';
    }).join('') + '</div>';
    var builtinHtml = '<div class="mu-builtin">' +
      '<h3 class="mu-h3">📡 开源音源</h3>' +
      '<p class="mu-note">内置两个合法开源曲库（浏览器直连，无第三方服务器中转）。' +
        '其他开源库（Internet Archive / Openverse 等）国内直连不通，需要时走下方自定义脚本。</p>' +
      chipsHtml +
      (cur === 'jamendo'
        ? '<div class="mu-keyrow"><input class="mu-input" id="muJmKey" placeholder="Jamendo Client ID" value="' + esc(state.src.jamendoKey || '') + '">' +
          '<button class="mu-btn" id="muJmKeySave">保存</button></div>' +
          '<p class="mu-note">到 devportal.jamendo.com 免费注册一个应用即可拿到 Client ID（一分钟）。</p>'
        : '') +
      '</div>';
    return '<div class="mu-panel">' + builtinHtml +
      '<h3 class="mu-h3" style="margin-top:14px">🧩 自定义音源脚本</h3>' +
      (cur === 'custom'
        ? '<p class="mu-note">粘贴你自己写的音源脚本（定义 MusicSource 对象，实现 search(keyword)）。脚本只保存在本机浏览器，本站仓库与服务器不经手任何脚本内容。</p>' +
          '<textarea class="mu-textarea mono" id="muSrcCode" rows="8" placeholder="// 粘贴音源脚本…"></textarea>' +
          '<div class="mu-btns">' +
            '<button class="mu-btn primary" id="muSrcAdd">保存并加载</button>' +
            '<button class="mu-btn" id="muSrcExample">填入模板</button>' +
          '</div>' +
          (srcRows ? '<div class="mu-src-list">' + srcRows + '</div>' : '')
        : '<p class="mu-note">切到「自定义脚本」标签后在此粘贴脚本。</p>') +
      '<textarea class="mu-textarea mono" id="muSrcCode" rows="8" placeholder="// 粘贴音源脚本…"></textarea>' +
      '<div class="mu-btns">' +
        '<button class="mu-btn primary" id="muSrcAdd">保存并加载</button>' +
        '<button class="mu-btn" id="muSrcExample">填入模板</button>' +
      '</div>' +
      (srcRows ? '<div class="mu-src-list">' + srcRows + '</div>' : '') +
      '<div class="mu-searchbar">' +
        '<input class="mu-input" id="muSearchKw" placeholder="加载音源后，搜歌名 / 歌手…">' +
        '<button class="mu-btn primary" id="muSearchBtn">🔍 搜索</button>' +
      '</div>' +
      (searchResults.length
        ? '<div class="mu-list">' + searchResults.map(function (t, i) { return listRowHtml(t, i, '搜索结果'); }).join('') + '</div>'
        : '<div class="mu-empty">搜索结果会出现在这里</div>') +
    '</div>';
  }

  /* 播放器条（常驻主屏顶部） */
  function playerBarHtml() {
    var playing = audio && cur && !audio.paused;
    var cover = cur && cur.cover;
    return '<div class="mu-player">' +
      '<div class="mu-disc' + (playing ? ' spin' : '') + '" id="muDisc">' +
        (cover ? '<img src="' + esc(cover) + '" alt="">' : '<span>🎧</span>') +
      '</div>' +
      '<div class="mu-player-main">' +
        '<div class="mu-player-title">' + (cur ? esc(cur.title) : '未在播放') +
          (cur && cur.artist ? ' <i>· ' + esc(cur.artist) + '</i>' : '') + '</div>' +
        '<div class="mu-bar"><span class="mu-time mu-time-cur">0:00</span>' +
          '<div class="mu-bar-progress"><i></i></div>' +
          '<input type="range" class="mu-seek" min="0" step="0.1" value="0">' +
          '<span class="mu-time mu-time-dur">0:00</span></div>' +
        '<div class="mu-ops">' +
          '<button class="mu-op" id="muPrev" title="上一首">⏮</button>' +
          '<button class="mu-op big" id="muToggle" title="播放/暂停">' + (playing ? '⏸' : '▶') + '</button>' +
          '<button class="mu-op" id="muNext" title="下一首">⏭</button>' +
          '<button class="mu-op' + (state.shuffle ? ' on' : '') + '" id="muShuffle" title="随机">🔀</button>' +
          '<button class="mu-op' + (state.repeat !== 'off' ? ' on' : '') + '" id="muRepeat" title="循环：' + state.repeat + '">🔁</button>' +
          '<span class="mu-volwrap">🔊<input type="range" class="mu-vol" min="0" max="1" step="0.01" value="' + state.volume + '"></span>' +
          '<button class="mu-op imm" id="muImmersive" title="沉浸模式">⛶</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }

  function homeHtml() {
    var tabs = [['local', '📁 本机音乐'], ['links', '🔗 直链歌单'], ['source', '🧩 音源脚本']];
    return playerBarHtml() +
      '<div class="mu-tabs">' + tabs.map(function (t) {
        return '<button class="mu-tab' + (tab === t[0] ? ' active' : '') + '" data-mu-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      (tab === 'local' ? localHtml() : tab === 'links' ? linksHtml() : sourceHtml());
  }

  function renderIfActive() {
    if (el && document.getElementById('mod-music').classList.contains('active')) renderHome();
    renderMini();
  }

  function renderHome() {
    if (!el) return;
    el.innerHTML = homeHtml();
    bindHome();
    onProgress();
  }

  function bindHome() {
    el.querySelectorAll('[data-mu-tab]').forEach(function (b) {
      b.onclick = function () { tab = b.getAttribute('data-mu-tab'); renderHome(); };
    });
    var toggle = el.querySelector('#muToggle'); if (toggle) toggle.onclick = togglePlay;
    var prev = el.querySelector('#muPrev'); if (prev) prev.onclick = prevTrack;
    var next = el.querySelector('#muNext'); if (next) next.onclick = function () { nextTrack(false); };
    var shuf = el.querySelector('#muShuffle');
    if (shuf) shuf.onclick = function () { state.shuffle = !state.shuffle; saveState(); renderHome(); };
    var rep = el.querySelector('#muRepeat');
    if (rep) rep.onclick = function () {
      state.repeat = state.repeat === 'off' ? 'all' : state.repeat === 'all' ? 'one' : 'off';
      saveState(); renderHome();
      toast('循环：' + ({ off: '关闭', all: '列表循环', one: '单曲循环' })[state.repeat]);
    };
    var vol = el.querySelector('.mu-vol');
    if (vol) vol.oninput = function () { setVolume(parseFloat(vol.value)); };
    var seek = el.querySelector('.mu-seek');
    if (seek) seek.oninput = function () {
      if (audio && audio.duration) audio.currentTime = parseFloat(seek.value);
    };
    var imm = el.querySelector('#muImmersive'); if (imm) imm.onclick = openImmersive;

    // 列表播放
    el.querySelectorAll('[data-play]').forEach(function (r) {
      r.onclick = function () {
        var name = r.getAttribute('data-play');
        var i = parseInt(r.getAttribute('data-idx'), 10);
        var list = name === '本机文件' ? localTracks() : name === '直链歌单' ? directList() : searchResults;
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
    var sadd = el.querySelector('#muSrcAdd');
    var scode = el.querySelector('#muSrcCode');
    if (sadd && scode) sadd.onclick = function () {
      var code = scode.value;
      if (!code.trim()) { toast('先粘贴脚本代码'); return; }
      var nameMatch = code.match(/name\s*:\s*["']([^"']+)["']/);
      var item = { id: uid(), name: nameMatch ? nameMatch[1] : '未命名音源', code: code };
      if (loadSource(item)) {
        state.sources.unshift(item);
        saveState(); renderHome();
      }
    };
    var sex = el.querySelector('#muSrcExample'); if (sex && scode) sex.onclick = function () { scode.value = SRC_SKELETON; };
    el.querySelectorAll('[data-src-use]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        var i = parseInt(b.getAttribute('data-src-use'), 10);
        if (state.sources[i]) loadSource(state.sources[i]) && renderHome();
      };
    });
    el.querySelectorAll('[data-src-del]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        state.sources.splice(parseInt(b.getAttribute('data-src-del'), 10), 1);
        saveState(); renderHome();
      };
    });
    var sbtn = el.querySelector('#muSearchBtn');
    var skw = el.querySelector('#muSearchKw');
    if (sbtn && skw) {
      sbtn.onclick = function () { runSearch(skw.value.trim()); };
      skw.onkeydown = function (e) { if (e.key === 'Enter') runSearch(skw.value.trim()); };
    }
  }

  /* ---------------- 沉浸全屏 ---------------- */
  var immEl = null;
  function openImmersive() {
    closeImmersive();
    immEl = document.createElement('div');
    immEl.className = 'mu-immersive';
    immEl.innerHTML = immHtml();
    document.body.appendChild(immEl);
    bindImmersive();
    syncPlayUI(audio && !audio.paused);
    onProgress();
  }
  function immHtml() {
    var playing = audio && cur && !audio.paused;
    var bars = '';
    for (var i = 0; i < 28; i++) bars += '<i style="--d:' + (i * 0.07).toFixed(2) + 's"></i>';
    return '<div class="mu-imm-bg"></div>' +
      '<div class="mu-imm-inner">' +
        '<div class="mu-imm-vinyl' + (playing ? ' spin' : '') + '">' +
          '<div class="mu-imm-disc' + (playing ? ' spin' : '') + '">' +
            (cur && cur.cover ? '<img src="' + esc(cur.cover) + '" alt="">' : '<span>🎧</span>') +
          '</div><div class="mu-imm-hole"></div>' +
        '</div>' +
        '<div class="mu-imm-bars' + (playing ? ' on' : '') + '">' + bars + '</div>' +
        '<div class="mu-imm-title">' + (cur ? esc(cur.title) : '未在播放') + '</div>' +
        '<div class="mu-imm-artist">' + (cur && cur.artist ? esc(cur.artist) : '我的音乐台 · 自导入音源') + '</div>' +
        '<div class="mu-bar imm"><span class="mu-time mu-time-cur">0:00</span>' +
          '<div class="mu-bar-progress"><i></i></div>' +
          '<input type="range" class="mu-seek" min="0" step="0.1" value="0">' +
          '<span class="mu-time mu-time-dur">0:00</span></div>' +
        '<div class="mu-ops imm">' +
          '<button class="mu-op" data-imm="prev">⏮</button>' +
          '<button class="mu-op big" data-imm="toggle">' + (playing ? '⏸' : '▶') + '</button>' +
          '<button class="mu-op" data-imm="next">⏭</button>' +
          '<button class="mu-op" data-imm="exit" title="退出（Esc）">✕</button>' +
        '</div>' +
      '</div>';
  }
  function bindImmersive() {
    immEl.querySelector('[data-imm="prev"]').onclick = prevTrack;
    immEl.querySelector('[data-imm="next"]').onclick = function () { nextTrack(false); };
    immEl.querySelector('[data-imm="toggle"]').onclick = togglePlay;
    immEl.querySelector('[data-imm="exit"]').onclick = closeImmersive;
    var seek = immEl.querySelector('.mu-seek');
    seek.oninput = function () { if (audio && audio.duration) audio.currentTime = parseFloat(seek.value); };
    immEl.addEventListener('click', function (e) {
      if (e.target === immEl || e.target.classList.contains('mu-imm-bg')) closeImmersive();
    });
  }
  function closeImmersive() {
    if (immEl) { immEl.remove(); immEl = null; }
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
    var t = el && el.querySelector('#muToggle');
    if (t) t.textContent = playing ? '⏸' : '▶';
    var d = el && el.querySelector('#muDisc');
    if (d) d.classList.toggle('spin', !!playing);
    var tt = document.querySelectorAll('.mu-imm-title');
    tt.forEach(function (x) { if (cur) x.textContent = cur.title; });
    var ta = document.querySelectorAll('.mu-imm-artist');
    ta.forEach(function (x) { if (cur) x.textContent = cur.artist || '我的音乐台 · 自导入音源'; });
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
    if (!active && !imm) return;
    // 其他输入框里不抢键
    if (/INPUT|TEXTAREA/.test((e.target && e.target.tagName) || '')) return;
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
        setTimeout(renderMini, 60);
        setTimeout(renderMini, 400);
      });
      /* 路由切模块是异步的（等 chunk 加载完才摘 active 类），
         直接盯 #mod-music 的 class 变化最准 */
      var moTarget = document.getElementById('mod-music');
      if (moTarget && window.MutationObserver) {
        new MutationObserver(renderMini).observe(moTarget, { attributes: true, attributeFilter: ['class'] });
      }
      ensureAudio();
      ensureMini();
      bindFolder();
    }
    renderHome();
  }

  function restoreView() { renderHome(); }

  function destroy() {
    /* 只卸模块级 UI；audio / 迷你条 / 键盘监听保留——跨模块继续播放 */
    closeImmersive();
    renderMini();
  }

  window.AppMusic = { init: init, restoreView: restoreView, destroy: destroy };
})();
