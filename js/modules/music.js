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

  /* ---------------- 播放现场（刷新后接着放） ----------------
     队列、当前曲目索引、播放进度单独存一份，和歌单数据分开：
     歌单是用户的长期资产，播放现场只是「上次听到哪」，
     彼此污染会让一次坏数据同时毁掉两边。 */
  var LIVE_KEY = 'juice_music_live_v1';  // 上次真正有效的播放进度。还原后如果用户没点播放，audio.currentTime
  // 恒为 0，任何一次 saveLive 都会把这个 0 写进存档，把进度冲掉。
  // 所以单独记一份，只有「确实在播放」时才更新它。
  var knownPos = 0;

  var POS_KEY = 'juice_music_pos_v1';   // 播放位置单独落盘（几十字节），大队列快照只在变化时重写
  var liveSig = '';                      // 队列+曲目签名：没变就不重写全量快照

  function saveLive() {
    // 还原现场期间一律不写：此时 audio 还没 src，写进去的 pos 会是 0
    if (restoringLive) return;
    if (!queue.length || qi < 0) {
      try { localStorage.removeItem(LIVE_KEY); } catch (e) {}
      try { localStorage.removeItem(POS_KEY); } catch (e) {}
      liveSig = '';
      return;
    }
    // 只有 pendingSeek 指向当前这首时才用它，否则一律用 knownPos：
    // 残留的 pendingSeek 会把存档那首的旧进度写进当前这首的记录
    var livePos = (pendingSeek && cur && pendingSeek.id === cur.id)
      ? pendingSeek.pos : knownPos;
    // 位置每 2 秒单独写（几十字节）；快照只在队列/曲目变化时才值得重写，
    // 否则 118 首的队列会以 ~77KB/2秒 的频率全量 stringify + 落盘
    try {
      localStorage.setItem(POS_KEY, JSON.stringify({ id: cur ? cur.id : '', pos: livePos }));
    } catch (e) {}
    var sig = queue.map(function (x) { return x.id; }).join(',') + '|' + qName + '|' + qi;
    if (sig === liveSig) return;
    try {
      localStorage.setItem(LIVE_KEY, JSON.stringify({
        v: 1,
        qi: qi,
        name: qName,
        at: Date.now(),
        pos: livePos,
        // 完整队列：track 里含取址所需的 songmid/hash/types
        queue: queue.map(function (x) {
          return {
            kind: x.kind, id: x.id, title: x.title, artist: x.artist,
            cover: x.cover || '',
            // blob: 地址刷新后必然失效，留着还会撑爆配额
            url: /^blob:/i.test(x.url || '') ? '' : (x.url || ''),
            source: x.source || '',
            interval: x.interval || '', track: x.track || null
          };
        })
      }));
      liveSig = sig;
    } catch (e) {
      // 队列太大超配额：保留旧快照不覆盖（降级写空队列会让还原现场全丢）
      try {
        if (liveSig !== 'MINI') {
          localStorage.setItem(LIVE_KEY, JSON.stringify({ v: 1, qi: qi, name: qName, at: Date.now(), pos: knownPos, queue: [] }));
          liveSig = 'MINI';
        }
      } catch (e2) {}
    }
  }

  function readLive() {
    try {
      var raw = localStorage.getItem(LIVE_KEY);
      if (!raw) return null;
      var d = JSON.parse(raw);
      if (!d || !Array.isArray(d.queue) || !d.queue.length) return null;
      // 播放位置以 POS_KEY 为准：快照里的 pos 是队列/曲目变化那一刻的旧值
      try {
        var pk = JSON.parse(localStorage.getItem(POS_KEY) || 'null');
        var ct = d.queue[d.qi];
        if (pk && ct && pk.id === ct.id && typeof pk.pos === 'number') d.pos = pk.pos;
      } catch (e) {}
      return d;
    } catch (e) { return null; }
  }

  function esc(v) { return window.escHtml(v); }
  function uid() { return 'm' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }

  /* ---------------- 图标 ----------------
     统一走 lucide 图标集：SVG 描边图标比 emoji 更贴合本站的线性语汇，
     且能配合 morphicons 做形变（播放/暂停、音量/静音、收藏/取消）。 */
  function icon(name, cls) {
    return '<svg class="mu-ico' + (cls ? ' ' + cls : '') + '" viewBox="0 0 24 24" ' +
      'aria-hidden="true" data-lucide="' + name + '"></svg>';
  }
  /** 渲染容器内所有 data-lucide 占位（renderHome / 弹层 / 播放条重建后都要调） */
  function paintIcons(root) {
    if (window.paintLucideIcons) window.paintLucideIcons(root || document);
  }

  function fmtTime(s) {
    s = Math.max(0, Math.floor(s || 0));
    var m = Math.floor(s / 60);
    return m + ':' + (s % 60 < 10 ? '0' : '') + (s % 60);
  }
  /** "04:19" → 259；解析不出来返回 0 */
  function parseIntervalSec(v) {
    var parts = String(v || '').split(':').map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return 0;
    return parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1];
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
  var failStreak = 0;          // 搜索结果连续播放失败计数（下架曲自动跳过用）

  function ensureAudio() {
    if (audio) return audio;
    audio = document.createElement('audio');
    audio.preload = 'metadata';
    audio.volume = state.volume;
    audio.style.display = 'none';
    document.body.appendChild(audio);
    audio.addEventListener('timeupdate', onProgress);
    // 元数据就绪/时长变化时立刻刷一次：renderHome 重建播放条后
    // duration 可能还是 NaN，等下一次 timeupdate 之前总时长会显示 0:00
    audio.addEventListener('loadedmetadata', onProgress);
    audio.addEventListener('durationchange', onProgress);
    audio.addEventListener('ended', onEnded);
    audio.addEventListener('play', function () { syncPlayUI(true); });
    audio.addEventListener('playing', function () {
      failStreak = 0;
      if (cur) {
        cur.retried = false;   // 这次成功了，下次失效还能再重取一次
        cur.failed = false;    // 从失败名单里移出来，切歌不再跳过它
      }
    });
    audio.addEventListener('pause', function () { syncPlayUI(false); });
    // 拖动进度条后立刻落盘：直接赋值 currentTime 不一定马上触发
    // timeupdate，用户拖完就关页面会把进度丢在拖动前的位置
    audio.addEventListener('seeked', function () {
      // 还原窗口内用户已经动手拖了进度条，说明现场已经"活"了，
      // 不能再拦着落盘——拦住会让这次拖动在刷新后丢失
      restoringLive = false;
      lastSavedAt = 0;                        // 绕过两秒节流
      lastSavedSec = Math.floor(audio.currentTime || 0);
      knownPos = lastSavedSec;
      saveLive();
    });
    audio.addEventListener('error', function () {
      // 地址失效（带 token 的直链几小时就过期，或跨平台链接被拦）时
      // 先作废地址重取一次。不这么做的话 cur.url 一直被复用，
      // 同一首每次点都是同一个死链，永远不会自愈。
      if (cur && cur.track && !cur.retried) {
        cur.retried = true;
        cur.url = '';
        try { audio.removeAttribute('src'); audio.load(); } catch (e) {}
        toast('重新获取播放地址…');
        playCurrent(true);
        return;
      }
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
  /**
   * 插队播放：把单曲插到当前曲目后面，不打断正在播的歌。
   * 用户正在听自己的歌单时点搜索结果，期望是「加一首进来」，
   * 而不是把整个歌单换掉。
   */
  function enqueueNext(item) {
    if (!queue.length || qi < 0) {
      playQueue([item], item.kind === 'search' ? '搜索结果' : qName, 0);
      return;
    }
    // 已存在同一首就不重复插，直接跳过去
    var exist = -1;
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].id === item.id) { exist = i; break; }
    }
    if (exist === qi) {
      // 已是当前曲。但它可能上次取址失败（url 空、没在取址中）——
      // 这种情况点它应该重试，而不是弹「正在播放这首」把用户挡在外面：
      // 失败后这首歌就永远点不动了（线上实测踩过）。
      var curItem = queue[qi];
      if (!curItem.url && curItem.track && !curItem.loading) {
        playCurrent();
        toast('重新获取播放地址…');
        return;
      }
      toast('正在播放这首');
      return;
    }
    if (exist > -1) {
      qi = exist;
      playCurrent();
      toast('已跳到这首');
      return;
    }
    queue.splice(qi + 1, 0, item);
    toast('已插到下一首播放');
    if (queuePanelEl) renderQueuePanel(true);
    if (tab === 'lists') renderHome();
    saveLive();
  }

  function playCurrent(wantPlay) {
    if (!queue.length) return;
    var prev = cur;
    cur = queue[qi];
    var deferPlay = false;
    // 待恢复的进度只对存档里那一首有效。用户刷新后直接点了别的歌，
    // 这个单槽会永远留着：maybeSaveProgress 里的 `if (pendingSeek) return`
    // 会让此后所有曲目的进度都不再落盘，saveLive 还会把存档那首的旧进度
    // 写进当前这首的记录里。
    if (pendingSeek && pendingSeek.id !== (cur && cur.id)) pendingSeek = null;
    // 换歌了就把「上一首的播放进度」清掉，否则新歌会被写成上一首的位置
    if (cur !== prev) {
      knownPos = 0;
      lastSavedSec = -1;
      lastSavedAt = 0;
    }
    // 队列项可能还没有播放地址（榜单/搜索的条目要等音源脚本给）。
    // 关键：先把这首歌显示到播放条并提示「正在加载」，
    // 而不是等地址拿到才出现——用户点了歌，播放条应该立刻有反应。
    if (!cur.url && cur.track) {
      if (!window.LxMusic || !window.LxMusic.hasSource()) { toast('尚未导入音源脚本'); return; }
      // 同一首正在取址时再次触发 playCurrent 会发起第二个请求——
      // 两次都通过 cur===pending 的身份校验，后返回的那个会把刚播起来的
      // 歌重新 a.src 赋一遍（从头重播）。这里直接挡掉。
      if (cur.loading) {
        if (wantPlay) {
          var aa = ensureAudio();
          if (aa.paused && aa.getAttribute('src')) {
            try { aa.play().catch(function () {}); } catch (e) {}
          } else {
            toast('正在获取播放地址，稍候…');
          }
        }
        return;
      }
      var pending = cur;
      // 立刻停掉上一首。取地址快的时候感觉不到差别，但只要它慢
      // （或者最终失败），继续放旧歌就会变成「新歌一直加载、旧歌一直响」，
      // 播放条上写着 B，耳朵里是 A。
      var prevAudio = ensureAudio();
      if (!prevAudio.paused) { try { prevAudio.pause(); } catch (e) {} }
      cur.loading = true;
      syncPlayUI(false);        // 旧歌已停，按钮要立刻回到「播放」态
      updateMediaSession();
      syncBarMeta();
      syncBarVisibility();
      renderIfActive();
      renderMini();
      if (queuePanelEl) renderQueuePanel(true);
      setBarLoading(true);
      // 歌词和封面与取地址并行，别让播放条空着
      lastLyricIndex = -1;
      loadLyricFor(cur);
      loadCoverFor(cur);

      var myResolve = ++resolveToken;   // 只有最后一次取址允许落地
      var p;
      try {
        p = window.LxMusic.resolveUrl(pending.track, state.quality || '128k');
      } catch (eSync) {
        // resolveUrl 同步抛错（比如 chunk 版本不一致缺了方法）：
        // 不接住的话 loading 态和 .loading class 永远不会复位，
        // 播放条就永久卡在「正在加载…」
        pending.loading = false;
        setBarLoading(false);
        handleResolveFail(pending, eSync && eSync.message ? String(eSync.message).slice(0, 60) : 'unknown');
        return;
      }
      Promise.resolve(p).then(function (url) {
        // 无论哪条出口都必须先复位 loading：
        // 被更新的取址请求取代（用户又点了别的歌）时这里会提前 return，
        // loading 残留 true 的话，之后点回同一首会被重入保护静默拦掉，
        // 表现为「点了永远没反应」（线上实测踩过）。
        pending.loading = false;
        if (myResolve !== resolveToken || cur !== pending) return;   // 期间已切歌/重新取址
        if (!url) {
          setBarLoading(false);
          handleResolveFail(pending, '音源未返回地址');
          return;
        }
        pending.url = url;
        setBarLoading(false);
        playCurrent(wantPlay);
      }).catch(function (e) {
        pending.loading = false;
        if (myResolve !== resolveToken || cur !== pending) return;
        setBarLoading(false);
        handleResolveFail(pending, e && e.message ? String(e.message).slice(0, 60) : 'unknown', e && e.code);
      });
      return;
    }
    var a = ensureAudio();
    try { a.pause(); } catch (e) {}
    a.src = cur.url;
    // 刷新后恢复播放：把进度跳回去。必须等 metadata 就绪，
    // 设得太早会被加载流程重置成 0。
    if (pendingSeek && pendingSeek.id === cur.id) {
      var seekTo = pendingSeek.pos;
      pendingSeek = null;
      var mySeek = ++seekSeq;          // 让上一轮还没触发的 applySeek 作废
      deferPlay = !!wantPlay;          // 用户点了播放：等 seek 就位再起播
      var applied = false;
      // 四个事件都要摘掉。挂的是全局唯一的 audio 元素，闭包捕获了旧歌的
      // seekTo；不摘干净的话，切歌后新歌的 canplay 会把旧歌的进度 seek
      // 到新歌上（实测能把新歌直接跳到 3 分钟处）。
      var detachSeek = function () {
        a.removeEventListener('loadedmetadata', applySeek);
        a.removeEventListener('durationchange', applySeek);
        a.removeEventListener('canplay', applySeek);
        a.removeEventListener('canplaythrough', applySeek);
      };
      var applySeek = function () {
        if (applied) return;
        if (mySeek !== seekSeq) { detachSeek(); return; }   // 已经切到别的歌
        // 必须等到 readyState >= HAVE_FUTURE_DATA(3)：
        // 只有元数据（1）时设 currentTime 会被浏览器排队，
        // 期间任何一次 pause() 都会让这次 seek 被丢弃并回到 0
        // （实测 seeked 事件的 currentTime 就是 0，不是 100）。
        if (a.readyState < 3) return;
        if (!isFinite(a.duration) || a.duration <= 0) return;
        applied = true;
        detachSeek();
        if (seekTo > 0 && seekTo < a.duration - 2) {
          try { a.currentTime = seekTo; } catch (e) {}
        }
        onProgress();
        // 还原时是从暂停态点播放：seek 会被 pause/src 重置打断，
        // 所以要等这里真正就位后再起播
        if (deferPlay) {
          deferPlay = false;
          a.play().catch(function () {});
        }
      };
      // readyState 已够就直接应用；否则挂满四个进度事件等首帧数据
      if (a.readyState >= 3 && isFinite(a.duration) && a.duration > 0) {
        applySeek();
      } else {
        a.addEventListener('loadedmetadata', applySeek);
        a.addEventListener('durationchange', applySeek);
        a.addEventListener('canplay', applySeek);
        a.addEventListener('canplaythrough', applySeek);
      }
    }
    // 还原现场时由 applySeek 在 seek 完成后再起播，这里不能抢跑：
    // src 刚赋值就 play 会被随后的 seek 打断，表现为点了播放却停在 0。
    // deferPlay 是局部量，不再依赖模块级的 restoreAutoPlay——
    // 那个变量一旦在失败路径上没被复位就会永久为 true，
    // 之后每次切歌都只加载不出声。
    if (!deferPlay) {
      a.play().catch(function () { /* 自动播放策略被拦：等用户点播放 */ });
    }
    updateMediaSession();
    syncPlayUI(!a.paused);
    syncBarMeta();
    syncBarVisibility();
    renderIfActive();
    renderMini();
    // 队列面板开着时同步高亮
    if (queuePanelEl) renderQueuePanel(true);
    // 切歌后换歌词；沉浸页开着就立即刷新
    lastLyricIndex = -1;
    loadLyricFor(cur);
    loadCoverFor(cur);
    if (immEl) refreshImmersiveLyric();
    saveLive();
  }

  /**
   * 取地址失败时的收尾。
   *
   * 之前这里只弹一个 toast 就 return，有两个后果：
   *   1. 旧的那首歌没人 pause，会一直放——用户听到 A 的歌声、
   *      播放条却写着 B 的名字在「正在加载」，正是反馈的现象；
   *   2. 播放条永远停在加载态，没有结局。
   * 现在明确停掉音频、清掉加载态，并把这首歌标记出来，
   * 让用户知道是这首放不了，而不是界面卡死。
   */
  function handleResolveFail(item, why, code) {
    // 被更新的取址请求取代属于正常情况（用户连点了下一首），
    // 不算失败，也不要停音频——新请求马上就会接管。
    // 用错误码判断而不是匹配中文文案：bridge 那边改个字这里就失效了。
    if (code === 'SUPERSEDED') return;
    // 旧音频必须停：它属于上一首，继续放会和新歌的信息对不上
    var a = ensureAudio();
    try { a.pause(); } catch (e) {}
    try { a.removeAttribute('src'); a.load(); } catch (e) {}
    item.failed = true;
    syncPlayUI(false);
    syncBarMeta();
    syncBarVisibility();
    renderIfActive();
    renderMini();
    if (queuePanelEl) renderQueuePanel(true);
    toast('「' + (item.title || '这首') + '」取不到播放地址：' + why);
  }

  function loadCoverFor(track) {
    if (!track || track.cover) return;
    if (!window.LxCover) return;
    var key = track.id || (track.title + '|' + track.artist);
    window.LxCover.getCover(track).then(function (url) {
      // 期间可能已切歌
      if (!url || !cur || (cur.id || (cur.title + '|' + cur.artist)) !== key) return;
      cur.cover = url;
      // 队列里同一条也补上，回头上一首/下一首不用再请求
      if (queue[qi]) queue[qi].cover = url;
      // 封面是异步补的：mediaSession 的 metadata 在切歌时已经用空封面
      // 设置过了，不在这里刷新的话，锁屏/控制中心整首歌都没图
      updateMediaSession();
      syncBarMeta();
      var disc = document.getElementById('muDisc');
      if (disc) disc.classList.toggle('spin', !audio.paused && !!url);
      if (immEl) {
        var d = immEl.querySelector('.mu-imm-disc');
        if (d) d.innerHTML = '<img src="' + esc(url) + '" alt="">';
        var v = immEl.querySelector('.mu-imm-vinyl');
        if (v) v.classList.toggle('spin', !audio.paused);
      }
      renderIfActive();
    }).catch(function () {});
  }

  /**
   * 跳转到第 sec 秒。
   * 已加载的音频直接 seek；还原现场（地址还没取，audio 无 src）时
   * 把拖到的位置记为待恢复进度——否则拖动完全无效，
   * 点播放还是从存档的旧位置起播。
   */
  function seekTo(sec) {
    sec = Math.max(0, isFinite(sec) ? sec : 0);
    if (audio && audio.duration) {
      try { audio.currentTime = sec; } catch (e) {}
      return;
    }
    if (pendingSeek && cur && pendingSeek.id === cur.id) {
      pendingSeek.pos = sec;
      knownPos = Math.floor(sec);
      lastSavedSec = Math.floor(sec);
      lastSavedAt = 0;          // 绕过节流，立刻落盘
      saveLive();
      onProgress();             // 刷新进度条/时间显示
    }
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
    // 没有真正挂上 src 就必须重走完整流程：
    // 刷新还原后 audio 是空的（地址在播放时才取/赋），此时直接 play()
    // 只会拿到一个 rejected Promise，播放键看起来完全没反应。
    if (!a.getAttribute('src')) { playCurrent(true); return; }
    // 上次播放失败留下的死链：清掉重取，否则点一次失败一次
    if (a.error) { cur.url = ''; playCurrent(true); return; }
    if (a.paused) a.play().catch(function () {});
    else a.pause();
  }

  function nextTrack(auto) {
    if (!queue.length) return;
    // 单曲循环：自动续播时原地重放，手动点下一首仍然切歌
    if (state.repeat === 'one' && auto) { audio.currentTime = 0; audio.play().catch(function(){}); return; }
    // 已确认取不到地址的歌直接跳过（最多绕一整圈），
    // 不然每点一次下一首都要先撞上它等一轮超时
    var hops = 0;
    if (state.shuffle && queue.length > 1) {
      var n;
      do {
        n = Math.floor(Math.random() * queue.length);
        if (++hops > queue.length * 2) break;
      } while ((n === qi || queue[n].failed) && hops <= queue.length * 2);
      qi = n;
    } else {
      do {
        qi++;
        if (qi >= queue.length) qi = 0;
        if (++hops > queue.length) break;
      } while (queue[qi].failed && hops <= queue.length);
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
    // 还原现场（地址还没取）时 audio.duration 是 0：
    // 用搜索结果里的 interval 补出总时长，把存档位置当作当前时间——
    // 否则播放条显示「0:02 / 0:00」，用户会以为进度没存上。
    if (!d && pendingSeek && cur && pendingSeek.id === cur.id) {
      var known = parseIntervalSec(cur.interval);
      if (known) {
        d = known;
        t = pendingSeek.pos;
        p = Math.min(1, t / d);
      }
    }
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
    // 播放条那行歌词跟着进度走
    updateBarLyric(t);
    updateBarTime(t, d);
    // 播放位置定期落盘（约 2 秒一次），刷新后能接上
    maybeSaveProgress(t);
  }

  /**
   * 进度落盘节流。
   * timeupdate 每秒触发 4 次左右，每次都 JSON.stringify 整个队列
   * 在长列表上会造成明显卡顿，所以只在秒数变化且距上次写入超过
   * 2 秒时才写。
   */
  var lastSavedSec = -1;
  var lastSavedAt = 0;
  // 每次应用还原进度都递增，旧的回调（挂在 audio 上的事件监听）
  // 凭序号判断自己是否已经过期，避免把旧歌的 seek 位置套到新歌上
  var seekSeq = 0;
  // 取址请求的序号：重新发起取址（同一首或切歌）时旧的回调全部作废
  var resolveToken = 0;
  function maybeSaveProgress(t) {
    // 还原现场期间不能写：audio 还没 src、currentTime 恒为 0，
    // 一写就把刚读出来的存档进度冲成 0，下次刷新就真的丢了。
    if (restoringLive) return;
    if (pendingSeek) return;
    var sec = Math.floor(t || 0);
    // 只有真正拿到了时长和进度才更新 knownPos：
    // 地址还没加载、起点为 0 的瞬间不能当成「用户听到了 0 秒」
    if (sec > 0 || (audio && audio.duration > 0 && audio.currentTime === 0)) {
      knownPos = sec;
    }
    var now = Date.now();
    if (sec === lastSavedSec && now - lastSavedAt < 4000) return;
    if (now - lastSavedAt < 2000) return;
    lastSavedSec = sec;
    lastSavedAt = now;
    saveLive();
  }

  /** 播放条上的「当前 / 总时长」。
      不做「值没变就跳过写入」的缓存优化——播放条会被 renderHome 整体重建，
      缓存留着旧值就会让新元素永远写不进去（表现为总时长恒为 0:00、
      当前时间在 0 和真实进度之间跳）。写两次 textContent 的开销可以忽略。 */
  function updateBarTime(t, d) {
    var curEl = document.getElementById('muPtCur');
    var durEl = document.getElementById('muPtDur');
    if (!curEl || !durEl) return;
    // 还原现场时还没取到地址，duration 是 0、currentTime 恒为 0。
    // 这里直接显示存档进度，而不是等 playCurrent 应用 seek——
    // 否则刷新后播放条会显示 0:00，用户会以为进度丢了。
    if (!d && pendingSeek && cur && pendingSeek.id === cur.id) {
      curEl.textContent = fmtTime(pendingSeek.pos);
      durEl.textContent = '0:00';
      return;
    }
    curEl.textContent = fmtTime(t);
    durEl.textContent = d ? fmtTime(d) : '0:00';
  }

  /** 播放条左侧的歌词行：取当前时间对应的那一句 */
  var lastBarLyric = '';
  function updateBarLyric(t) {
    var line = document.getElementById('muBarLyric');
    if (!line) return;
    var parsed = currentLyric && currentLyric.parsed;
    if (!parsed || !parsed.length) {
      if (lastBarLyric) { line.textContent = ''; lastBarLyric = ''; }
      return;
    }
    var lo = 0, hi = parsed.length - 1, idx = -1;
    while (lo <= hi) {
      var mid = (lo + hi) >> 1;
      if (parsed[mid].time <= t) { idx = mid; lo = mid + 1; }
      else hi = mid - 1;
    }
    var text = idx >= 0 ? parsed[idx].text : '';
    if (text === lastBarLyric) return;
    lastBarLyric = text;
    line.textContent = text;
  }

  function onEnded() { nextTrack(true); }

  function setVolume(v) {
    state.volume = Math.min(1, Math.max(0, v));
    if (audio) audio.volume = state.volume;
    saveState();
    var vols = document.querySelectorAll('.mu-vol');
    for (var i = 0; i < vols.length; i++) vols[i].value = String(state.volume);
    // 音量数字（播放条与全屏各一个）
    var nums = document.querySelectorAll('#muBarVolNum, #muImmVolNum');
    for (var j = 0; j < nums.length; j++) nums[j].textContent = String(Math.round(state.volume * 100));
    // 静音图标要跟着换
    if (typeof updateMuteIcon === 'function') updateMuteIcon();
    if (typeof syncImmMuteIcon === 'function') syncImmMuteIcon();
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
      navigator.mediaSession.setActionHandler('play', function () { audio.play().catch(function () {}); });
      navigator.mediaSession.setActionHandler('pause', function () { audio.pause(); });
      navigator.mediaSession.setActionHandler('previoustrack', prevTrack);
      navigator.mediaSession.setActionHandler('nexttrack', function () { nextTrack(false); });
      // 锁屏 / 蓝牙耳机的拖进度条（支持的浏览器才生效）
      try {
        navigator.mediaSession.setActionHandler('seekto', function (e) {
          if (audio && typeof e.seekTime === 'number' && isFinite(e.seekTime)) {
            audio.currentTime = e.seekTime;
          }
        });
      } catch (e2) {}
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
    // 旧一批的 objectURL 必须回收：每首音频的 Blob 会一直占内存，
    // 反复关联文件夹/重新授权时内存会持续上涨。
    // 还在播放队列里被引用的先留着，否则正在放的那首会断。
    localFiles.forEach(function (f) {
      if (!f.url) return;
      var inQueue = queue.some(function (q) { return q.url === f.url; });
      if (!inQueue && !(cur && cur.url === f.url)) {
        try { URL.revokeObjectURL(f.url); } catch (e) {}
      }
    });
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
      track: track.track || null,
      // 加入时间：按时间排序要用。旧数据没有这个字段，排序时当作 0
      addedAt: Date.now()
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
  var searchSeq = 0;           // 搜索代次：聚合搜索可达 12s，连搜时旧响应后到必须丢弃
  var suppressSuggest = false; // 恢复焦点时临时禁止弹联想
  var searchProgress = '';     // 逐源进度文案
  var showLyric = true;        // 沉浸页是否显示歌词
  var currentLyric = null;     // { parsed: [{time,text}], source }
  var lyricTrackKey = '';      // 当前歌词对应的歌，避免重复请求
  var searchResults = [];      // [{title,artist,cover,url,track}]
  var lastVolume = 0.7;        // 静音前的音量，用于一键恢复
  function runSearch(kw) {
    if (!kw) return;
    var mode = state.src.builtin === 'custom' ? 'lx' : state.src.builtin;

    /* ---- 洛雪多平台聚合搜索 ---- */
    if (mode === 'lx') {
      if (!window.LxMusic) { toast('音源内核未加载'); return; }
      searching = true;
      searchProgress = '正在连接各平台…';
      var mySearch = ++searchSeq;   // 过期令牌：连搜两个词时旧响应后到不得覆盖
      renderHome();
      window.LxMusic.search(kw, 1, function (p) {
        // 实时进度：让用户看到具体哪个平台慢，而不是无限转圈
        if (p.phase === 'start') {
          // start 现在一条带全部源名（sources 数组），不再逐源各发一条
          searchProgress = '正在请求 ' + p.total + ' 个平台（' +
            (p.sources || []).map(function (s) { return PLATFORM_NAMES[s] || s; }).join('/') + '）…';
        } else {
          searchProgress = '已完成 ' + p.done + '/' + p.total + ' 个平台' +
            (p.last && p.last.id ? '（' + p.last.id + ' ' + p.ms + 'ms）' : '') + '…';
        }
        var tip = document.querySelector('.mu-loading-text');
        if (tip) tip.textContent = searchProgress;
      }).then(function (res) {
        if (mySearch !== searchSeq) return;   // 已有更新的搜索，丢弃旧结果
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
        // 上一轮搜索留下的平台筛选，在新结果里可能已经没有对应平台。
        // 不重置的话：chips 里没有 active 项、filteredResults 返回空，
        // 页面显示「搜点什么听听」，看起来像没搜到结果。
        if (srcFilter !== 'all') {
          var has = searchResults.some(function (t) { return t.source === srcFilter; });
          if (!has) srcFilter = 'all';
        }
        renderHome();
        if (!searchResults.length) {
          toast(res.errors.length ? ('没有搜到结果（' + res.errors[0].message + '）') : '没有搜到结果');
        } else if (res.errors.length) {
          toast('搜到 ' + searchResults.length + ' 首，' + res.errors.length + ' 个平台失败');
        } else {
          // 成功也要给个提示，盖掉上一次可能残留的失败 toast
          toast('搜到 ' + searchResults.length + ' 首');
        }
      }).catch(function (e) {
        if (mySearch !== searchSeq) return;
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
  /* [废弃] 无调用点；恢复使用前先核对数据结构（localHtml 依赖的 state.localMeta 只在选文件时写入） */
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
    // 不能用 cur.url === t.url 判断：搜索结果的 url 一开始全是空串，
    // 取到地址之前 cur.url 也是空串，于是每一行都会被判成「正在播放」，
    // 界面上表现为所有条目同时亮起绿框、封面变播放键。
    // 改按 source|songmid 判身份，跟歌单页保持一致。
    var myKey = trackKey(t);
    var active = !!cur && qName === listName && !!myKey && myKey === trackKey(cur);
    var loved = inList(LOVE_ID, t);
    // 时长：洛雪结果直接给 interval 字符串（如 04:35），本机文件给 durMs
    var dur = t.interval || (t.durMs ? fmtTime(t.durMs / 1000) : '');
    var sub = [t.artist, t.source ? String(t.source).toUpperCase() : ''].filter(Boolean).join(' · ');
    var playing = active && audio && !audio.paused;
    // 收藏/加歌单常驻在时长左边，不做 hover 显隐：
    // 藏起来既难发现，浮起来又会盖住时长
    return '<div class="mu-row' + (active ? ' active' : '') + '" data-play="' + listName + '" data-idx="' + i + '">' +
      '<span class="mu-row-ico">' +
        (t.cover
          ? '<img src="' + esc(t.cover) + '" alt="" loading="lazy">'
          : icon(playing ? 'Pause' : 'Play')) +
      '</span>' +
      '<span class="mu-row-main"><b>' + esc(t.title) + '</b>' +
        (sub ? '<i>' + esc(sub) + '</i>' : '') +
      '</span>' +
      '<span class="mu-row-ops">' +
        '<button class="mu-love' + (loved ? ' on' : '') + '" data-love="' + i + '" title="' + (loved ? '取消收藏' : '收藏') + '">' + icon('Heart') + '</button>' +
        '<button class="mu-addlist" data-addlist="' + i + '" title="加入歌单">' + icon('ListPlus') + '</button>' +
      '</span>' +
      (dur ? '<span class="mu-row-dur">' + dur + '</span>' : '') +
      '</div>';
  }

  /* [废弃] 无调用点；恢复使用前先核对数据结构（localHtml 依赖的 state.localMeta 只在选文件时写入） */
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

  /* [废弃] 无调用点；恢复使用前先核对数据结构（localHtml 依赖的 state.localMeta 只在选文件时写入） */
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

  /* ---------------- 平台筛选（对齐洛雪的分类 tab） ---------------- */
  var PLATFORM_NAMES = { kw: '酷我', kg: '酷狗', tx: 'QQ音乐', mg: '咪咕', wy: '网易云' };
  var srcFilter = 'all';   // 'all' = 聚合 | 平台 id

  /** 按当前筛选返回结果 */
  function filteredResults() {
    if (srcFilter === 'all') return searchResults;
    return searchResults.filter(function (t) { return t.source === srcFilter; });
  }

  /** 筛选栏：聚合 + 各平台原名，带该平台结果数 */
  function sourceFilterHtml() {
    if (!searchResults.length) return '';
    var counts = {};
    searchResults.forEach(function (t) { counts[t.source] = (counts[t.source] || 0) + 1; });

    // 聚合 + 有结果的平台（按固定顺序，避免每次顺序变）
    var order = ['kw', 'kg', 'tx', 'mg', 'wy'];
    var chips = [{
      id: 'all',
      label: '聚合',
      n: searchResults.length
    }];
    order.forEach(function (id) {
      if (!counts[id]) return;
      chips.push({ id: id, label: PLATFORM_NAMES[id] || id.toUpperCase(), n: counts[id] });
    });

    return '<div class="mu-src-filter">' + chips.map(function (c) {
      return '<button class="mu-src-chip' + (srcFilter === c.id ? ' active' : '') +
        '" data-src-filter="' + c.id + '">' + esc(c.label) +
        '<span class="mu-src-chip-n">' + c.n + '</span></button>';
    }).join('') + '</div>';
  }

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
      sourceFilterHtml() +
      (searching
        ? '<div class="mu-loading"><span class="mu-spinner"></span><span class="mu-loading-text">' + esc(searchProgress || '正在搜索…') + '</span></div>'
        : filteredResults().length
          ? '<div class="mu-list">' + filteredResults().map(function (t, i) { return listRowHtml(t, i, '搜索结果'); }).join('') + '</div>'
          : '<div class="mu-empty">搜点什么听听——支持歌名 / 歌手</div>') +
    '</div>';
  }

  /* ---------------- 加入歌单弹层 ---------------- */
  var addTargetIndex = -1; pickTarget = null;   // 当前要加入歌单的搜索结果索引
  var pickTarget = null;     // 非搜索结果（如榜单歌曲）要加入歌单时暂存于此
  var importState = null;    // { listId, done, total, added, failed } 导入进度
  // 歌单排序：'default' 原序 | 'title' 按字母 | 'added' 按加入时间 | 'artist' 按歌手
  var listSort = 'default';
  var listSortAsc = true;

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
  /**
   * 按当前排序方式返回 [{track, index}]。
   * index 是原数组下标——播放和删除都要用原始位置，
   * 不能用排序后的位置，否则会点错歌。
   */
  function sortedTracks(tracks) {
    var arr = tracks.map(function (t, i) { return { track: t, index: i }; });
    if (listSort === 'default') return arr;

    var cmp;
    if (listSort === 'title') {
      cmp = function (a, b) {
        return String(a.track.title || '').localeCompare(String(b.track.title || ''), 'zh-Hans-CN');
      };
    } else if (listSort === 'artist') {
      cmp = function (a, b) {
        return String(a.track.artist || '').localeCompare(String(b.track.artist || ''), 'zh-Hans-CN');
      };
    } else {
      // 按加入时间；旧数据没有 addedAt 的当作 0 排在最前
      cmp = function (a, b) {
        return (Number(a.track.addedAt) || 0) - (Number(b.track.addedAt) || 0);
      };
    }
    arr.sort(function (a, b) {
      var r = cmp(a, b);
      // 主键相同时保持原顺序，避免每次渲染顺序乱跳
      if (r === 0) return a.index - b.index;
      return listSortAsc ? r : -r;
    });
    return arr;
  }

  /** 排序按钮：显示当前排序方式，点一下循环切换（再点同项反向） */
  function sortBtnHtml() {
    var label = { default: '默认', title: '字母', artist: '歌手', added: '时间' }[listSort];
    var arrow = listSort === 'default' ? '' : (listSortAsc ? '↑' : '↓');
    return '<button class="mu-btn mini mu-sort-btn' + (listSort !== 'default' ? ' on' : '') +
      '" id="muListSort" title="排序：' + label + '">' +
      icon('ArrowUpDown') + label + arrow + '</button>';
  }

  function listsHtml() {
    ensureLoveList();    var current = state.lists.filter(function (l) { return l.id === activeListId; })[0] || state.lists[0];
    if (current) activeListId = current.id;

    var listTabs = state.lists.map(function (l) {
      var isActive = current && l.id === current.id;
      return '<button class="mu-list-tab' + (isActive ? ' active' : '') + '" data-list-tab="' + l.id + '">' +
        esc(l.name) +
        '<span class="mu-list-count">' + l.tracks.length + '</span></button>';
    }).join('');

    var rows = '';
    if (current && current.tracks.length) {
      // 排序视图：带上原始索引，播放时要用原数组定位
      var view = sortedTracks(current.tracks);
      rows = '<div class="mu-list">' + view.map(function (v) {
        var t = v.track;
        var i = v.index;
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
              : icon(active && audio && !audio.paused ? 'Pause' : 'Play')) +
          '</span>' +
          '<span class="mu-row-main"><b>' + esc(t.title) + '</b>' +
            (sub ? '<i>' + esc(sub) + '</i>' : '') + '</span>' +
          (dur ? '<span class="mu-row-dur">' + esc(dur) + '</span>' : '') +
          '<span class="mu-row-ops">' +
            '<button class="mu-addlist" data-list-remove="' + i + '" title="从歌单移除">' + icon('X') + '</button>' +
          '</span></div>';
      }).join('') + '</div>';
    } else {
      rows = '<div class="mu-empty">' +
        (current && current.id === LOVE_ID
          ? '在搜索结果里点 ♡ 收藏喜欢的歌'
          : '这个歌单还是空的') + '</div>';
    }

    return '<div class="mu-panel">' +
      // 歌单标签与新建/删除同一行：新建紧跟标签，删除靠右（对齐洛雪的列表头）
      '<div class="mu-list-head">' +
        '<div class="mu-list-tabs">' + listTabs + '</div>' +
        '<div class="mu-list-actions">' +
          sortBtnHtml() +
          '<button class="mu-btn mini" id="muListImport" title="从分享链接导入歌单">' + icon('Link') + '导入</button>' +
          '<button class="mu-btn mini" id="muListNew" title="新建歌单">' + icon('Plus') + '新建</button>' +
          (current && current.id !== LOVE_ID
            ? '<button class="mu-btn mini" id="muListRename" title="重命名歌单">' + icon('Pencil') + '改名</button>' +
              '<button class="mu-btn mini danger" id="muListDel" title="删除此歌单">' + icon('Trash2') + '删除</button>'
            : '') +
        '</div>' +
      '</div>' +
      importBannerHtml(current) +
      rows +
    '</div>';
  }

  /** 导入进度条：只有当前歌单正在导入时显示 */
  function importBannerHtml(current) {
    if (!importState || !current || current.id !== importState.listId) return '';
    var pct = importState.total ? Math.round(importState.done / importState.total * 100) : 0;
    return '<div class="mu-import-banner">' +
      '<div class="mu-import-row">' +
        '<span class="mu-spinner"></span>' +
        '<span class="mu-import-text">正在导入 ' + importState.done + '/' + importState.total + ' 首</span>' +
        '<span class="mu-import-pct">' + pct + '%</span>' +
      '</div>' +
      '<div class="mu-import-track"><i style="width:' + pct + '%"></i></div>' +
    '</div>';
  }

  // 音源页粘贴框是否展开（默认收起，见 scriptHtml）
  var lxPasteOpen = false;

  function scriptHtml() {
    var lxReady = !!window.LxMusic;
    var saved = lxReady ? window.LxMusic.listScripts() : [];
    var loaded = lxReady ? window.LxMusic.listLoaded() : [];

    // 用户导入的脚本按 id 索引，用来给内置/导入的条目挂「删除」按钮
    var savedByName = {};
    saved.forEach(function (s) { savedByName[s.name] = s; });

    // 以「已加载」为主来列：内置脚本也在这里，不再只显示用户导入的那几个。
    // 同名脚本可能被加载两次（内置 + 用户导入），列表里只显示一条
    var seen = {};
    var rows = loaded.filter(function (x) {
      if (seen[x.name]) return false;
      seen[x.name] = 1;
      return true;
    }).map(function (x) {
      var s = savedByName[x.name];
      return '<div class="mu-src on">' +
        '<b>' + esc(x.name) + (s && s.version ? ' <span class="mu-src-ver">' + esc(s.version) + '</span>' : '') + '</b>' +
        '<span class="mu-src-ops">' +
          '<span class="mu-src-tag">已加载</span>' +
          (s ? '<button class="mu-btn mini danger" data-lx-del="' + esc(s.id) + '">删除</button>' : '') +
        '</span></div>';
    }).join('');

    // 用户存了但没加载成功的（脚本报错 / 未启用）也列出来，否则用户看不到它
    var failedRows = saved.filter(function (s) { return !seen[s.name]; }).map(function (s) {
      return '<div class="mu-src">' +
        '<b>' + esc(s.name) + (s.version ? ' <span class="mu-src-ver">' + esc(s.version) + '</span>' : '') + '</b>' +
        '<span class="mu-src-ops">' +
          '<span class="mu-src-tag">未加载</span>' +
          '<button class="mu-btn mini danger" data-lx-del="' + esc(s.id) + '">删除</button>' +
        '</span></div>';
    }).join('');

    rows = rows + failedRows;

    var loadedCount = Object.keys(seen).length;
    var status = '';
    if (loadedCount) {
      status = '<p class="mu-note ok">已加载 ' + loadedCount + ' 个音源</p>';
    } else {
      status = '<p class="mu-note warn">还没有可用的音源，导入一个 .js 脚本才能播放</p>';
    }

    return '<div class="mu-panel">' +
      '<p class="mu-note">音源脚本只负责把歌名换成播放地址，搜索由内置的多平台接口完成。' +
        '脚本只存在你本机浏览器，本站服务器不经手任何脚本内容。</p>' +
      status +
      '<div class="mu-btns">' +
        '<button class="mu-btn primary" id="muLxPickFile">导入 .js 文件</button>' +
        '<button class="mu-btn" id="muLxPasteToggle">' + (lxPasteOpen ? '收起粘贴框' : '粘贴脚本导入') + '</button>' +
        '<input type="file" id="muLxFileInput" accept=".js,text/javascript" hidden>' +
      '</div>' +
      // 粘贴框默认收起（大部分人只用文件导入），点上面的按钮展开。
      // lxPasteOpen 常驻标记：renderHome 高频重建（音源加载轮询就会触发），
      // 不能让一次重建把用户展开的框收回去了。
      (lxPasteOpen
        ? '<textarea class="mu-textarea mono" id="muLxCode" rows="6" placeholder="或直接粘贴脚本内容…"></textarea>' +
          '<div class="mu-btns">' +
            '<button class="mu-btn primary" id="muLxAdd">保存并加载</button>' +
          '</div>'
        : '') +
      (rows ? '<div class="mu-src-list">' + rows + '</div>' : '<div class="mu-empty">还没有导入音源脚本</div>') +
    '</div>';
  }

  /* 播放器条（固定底部，64px 三列） */
  function playerBarHtml() {
    var playing = audio && cur && !audio.paused;
    var cover = cur && cur.cover;
    var muted = state.volume <= 0;
    var mode = playMode();          // 'one' | 'all' | 'shuffle'
    var modeIcon = { one: 'Repeat1', all: 'Repeat', shuffle: 'Shuffle' }[mode];
    var modeLabel = { one: '单曲循环', all: '顺序播放', shuffle: '随机播放' }[mode];
    return '<div class="mu-player">' +
      // 2px 进度条贴顶边缘
      '<div class="mu-bar"><span class="mu-time mu-time-cur">0:00</span>' +
        '<div class="mu-bar-progress"><i></i></div>' +
        '<input type="range" class="mu-seek" min="0" step="0.1" value="0">' +
        '<span class="mu-time mu-time-dur">0:00</span></div>' +
      // 左列：封面 + 标题（标题紧贴封面，不要居中漂走）
      '<div class="mu-disc' + (playing && cover ? ' spin' : '') + '" id="muDisc" title="全屏播放">' +
        (cover ? '<img src="' + esc(cover) + '" alt="">' : icon('Play')) +
        (cur && cur.loading ? '<span class="mu-disc-spinner">' + icon('Loader') + '</span>' : '') +
      '</div>' +
      '<div class="mu-player-title">' + (cur ? esc(cur.title) : '未在播放') +
        (cur && cur.artist ? ' <i>· ' + esc(cur.artist) + '</i>' : '') +
        (cur && cur.loading ? '<span class="mu-loading-tip">正在加载…</span>' : '') + '</div>' +
      // 中列：传输控件
      '<div class="mu-ops mu-ops-main">' +
        '<button class="mu-op" id="muPrev" title="上一首">' + icon('SkipBack') + '</button>' +
        '<button class="mu-op big" id="muToggle" title="播放/暂停" data-morph="' + (playing ? 'Pause' : 'Play') + '">' + icon(playing ? 'Pause' : 'Play') + '</button>' +
        '<button class="mu-op" id="muNext" title="下一首">' + icon('SkipForward') + '</button>' +
      '</div>' +
      // 中列右侧：歌词，占用播放键与右侧控件之间的大片空白
      '<div class="mu-player-lyric" id="muBarLyric"></div>' +
      // 时间：当前 / 总时长，贴在右侧控件左边
      '<div class="mu-player-time">' +
        '<span class="mu-pt-cur" id="muPtCur">0:00</span>' +
        '<span class="mu-pt-sep">/</span>' +
        '<span class="mu-pt-dur" id="muPtDur">0:00</span>' +
      '</div>' +
      // 右列：播放模式（三态） / 音量 / 收藏 / 歌词 / 列表 / 全屏
      '<div class="mu-ops mu-ops-side">' +
        '<button class="mu-op' + (mode !== 'all' ? ' on' : '') + '" id="muMode" title="' + modeLabel + '">' + icon(modeIcon) + '</button>' +
        // 音量：与全屏一致，hover 向上弹垂直滑条
        '<span class="mu-imm-vol">' +
          '<button class="mu-op" id="muMute" title="' + (muted ? '取消静音' : '静音') + '">' +
            icon(muted ? 'VolumeX' : 'Volume2') + '</button>' +
          '<span class="mu-imm-vol-pop">' +
            '<span class="mu-imm-vol-num" id="muBarVolNum">' + Math.round(state.volume * 100) + '</span>' +
            '<input type="range" class="mu-imm-vol-range mu-vol" min="0" max="1" step="0.01" value="' + state.volume +
              '" orient="vertical" aria-label="音量">' +
          '</span>' +
        '</span>' +
        '<button class="mu-op' + (cur && inList(LOVE_ID, { track: cur.track || cur }) ? ' on' : '') +
          '" id="muBarLove" title="收藏">' + icon('Heart') + '</button>' +
        '<button class="mu-op lyric-btn' + (showLyric ? ' on' : '') + '" id="muBarLyricBtn" title="' +
          (showLyric ? '隐藏歌词' : '显示歌词') + '"><span class="mu-lyric-glyph' +
          (showLyric ? '' : ' off') + '">词</span></button>' +
        '<button class="mu-op" id="muQueueBtn" title="当前播放列表">' + icon('ListMusic') + '</button>' +
        '<button class="mu-op imm" id="muImmersive" title="全屏播放">' + icon('Maximize2') + '</button>' +
      '</div>' +
    '</div>';
  }

  /** 播放模式：单曲 → 顺序 → 随机，一个按钮循环 */
  function playMode() {
    if (state.shuffle) return 'shuffle';
    if (state.repeat === 'one') return 'one';
    return 'all';
  }  function cyclePlayMode() {
    var next = { one: 'all', all: 'shuffle', shuffle: 'one' }[playMode()];
    state.shuffle = next === 'shuffle';
    state.repeat = next === 'one' ? 'one' : 'all';
    saveState();
    renderHome();
    toast({ one: '单曲循环', all: '顺序播放', shuffle: '随机播放' }[next]);
  }

  function homeHtml() {
    var tabs = [
      ['search', '搜索'],
      ['rank', '排行榜'],
      ['lists', '我的列表'],
      ['script', '音源']
    ];
    return '<div class="mu-wrap">' +
      '<div class="mu-header">' +
        '<div class="mu-mark">' + icon('Play') + '</div>' +
        '<div class="mu-headtext">' +
          '<h2 class="mu-title">我的音乐台</h2>' +
          '<p class="mu-sub">' + sourceStatusText() + '</p>' +
        '</div>' +
      '</div>' +
      '<div class="mu-tabs">' + tabs.map(function (t) {
        return '<button class="mu-tab' + (tab === t[0] ? ' active' : '') + '" data-mu-tab="' + t[0] + '">' + t[1] + '</button>';
      }).join('') + '</div>' +
      (tab === 'rank' ? rankHtml()
        : tab === 'search' ? searchHtml()
        : tab === 'lists' ? listsHtml()
        : scriptHtml()) +
      '</div>';
  }

  /* ---------------- UI：排行榜 ---------------- */
  var discoverState = {
    ranks: null,        // [{id,name,cover,intro}]
    openRank: null,     // 当前展开的榜单 {id,name}
    songs: null,        // 榜单歌曲
    loading: false,
  };

  /** 排行榜页：左栏榜单列表，右栏选中榜单的歌曲（对齐洛雪） */
  function rankHtml() {
    var ranks = discoverState.ranks;
    if (ranks === null) {
      return '<div class="mu-panel">' +
        '<div class="mu-loading"><span class="mu-spinner"></span><span>正在加载排行榜…</span></div>' +
        '</div>';
    }
    if (!ranks.length) {
      return '<div class="mu-panel"><div class="mu-empty">排行榜加载失败，稍后再试</div></div>';
    }

    var open = discoverState.openRank;
    var side = ranks.map(function (r) {
      var on = open && String(open.id) === String(r.id);
      return '<button class="mu-rank-side-item' + (on ? ' active' : '') +
        '" data-rank="' + r.id + '" data-rank-name="' + esc(r.name) + '">' +
        '<span class="mu-rank-side-art">' +
          (r.cover ? '<img src="' + esc(r.cover) + '" alt="" loading="lazy">' : icon('Trophy')) +
        '</span>' +
        '<span class="mu-rank-side-name">' + esc(r.name) + '</span>' +
        '</button>';
    }).join('');

    var main;
    if (!open) {
      // 手机端榜单横排在顶部，「从左边选」不成立，改成方向无关的说法
      main = '<div class="mu-empty">选一个榜单看看</div>';
    } else if (discoverState.loading) {
      main = '<div class="mu-loading"><span class="mu-spinner"></span><span>正在加载榜单…</span></div>';
    } else {
      var songs = discoverState.songs || [];
      main = songs.length
        ? '<div class="mu-rank-main-head"><h3>' + esc(open.name) + '</h3>' +
            '<span>' + songs.length + ' 首</span></div>' +
          '<div class="mu-list">' + songs.map(function (t, i) {
            var loved = inList(LOVE_ID, { track: t });
            return '<div class="mu-row" data-rank-play="' + i + '">' +
              '<span class="mu-row-ico">' +
                (t.img ? '<img src="' + esc(t.img) + '" alt="" loading="lazy">' : icon('Play')) +
              '</span>' +
              '<span class="mu-row-main"><b>' + esc(t.name) + '</b>' +
                '<i>' + esc(t.singer) + '</i></span>' +
              '<span class="mu-row-ops">' +
                '<button class="mu-love' + (loved ? ' on' : '') + '" data-rank-love="' + i + '" title="' +
                  (loved ? '取消收藏' : '收藏') + '">' + icon('Heart') + '</button>' +
                '<button class="mu-addlist" data-rank-addlist="' + i + '" title="加入列表">' + icon('ListPlus') + '</button>' +
              '</span>' +
              (t.interval ? '<span class="mu-row-dur">' + esc(t.interval) + '</span>' : '') +
              '</div>';
          }).join('') + '</div>'
        : '<div class="mu-empty">这个榜单暂时取不到歌曲</div>';
    }

    return '<div class="mu-panel">' +
      '<div class="mu-rank-split">' +
        '<div class="mu-rank-side">' + side + '</div>' +
        '<div class="mu-rank-main">' + main + '</div>' +
      '</div>' +
    '</div>';
  }

  /** 排行榜页拉数据（只拉一次，之后用缓存） */
  function loadDiscover() {
    if (!window.LxDiscover) return;
    if (!discoverState.ranks || !discoverState.ranks.length) {
      if (!discoverState.rankLoading) {
        // 失败后的自动重试要有退避：renderHome 在切歌等场景高频触发，
        // 不限频的话接口一挂，每次切歌都会重发一次请求
        var now = Date.now();
        if (discoverState.rankFailAt && now - discoverState.rankFailAt < 30000) return;
        discoverState.rankLoading = true;
        window.LxDiscover.listRanks().then(function (list) {
          discoverState.rankLoading = false;
          discoverState.rankFailAt = 0;
          // 失败必须落成 []：写 null 会让 rankHtml 永远走 spinner 分支
          // （「加载失败」分支只认 !ranks.length），而且这里每次 renderHome
          // 都会重新触发一次请求，切一首歌就重试一次，无退避。
          discoverState.ranks = (list && list.length) ? list : [];
          if (!discoverState.ranks.length) discoverState.rankFailAt = Date.now();
          if (tab === 'rank') renderHome();
        }).catch(function () {
          discoverState.rankLoading = false;
          discoverState.ranks = [];
          discoverState.rankFailAt = Date.now();
          if (tab === 'rank') renderHome();
        });
      }
    }
  }

  /** 打开某个榜单并取歌 */
  function openRank(id, name) {
    discoverState.openRank = { id: id, name: name };
    discoverState.songs = null;
    discoverState.loading = true;
    renderHome();
    if (!window.LxDiscover) return;
    window.LxDiscover.rankSongs(id, 1, 60).then(function (songs) {
      if (!discoverState.openRank || discoverState.openRank.id !== id) return;
      discoverState.songs = songs;
      discoverState.loading = false;
      renderHome();
    });
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

  /** 头部副标题：只说数量，不再罗列每个音源名字（名字一多就撑破一行） */
  var srcLoading = false;   // 音源正在首次加载
  function sourceStatusText() {
    if (!window.LxMusic) return '音源未就绪';
    var loaded = window.LxMusic.listLoaded ? window.LxMusic.listLoaded() : [];
    // 同名脚本可能被加载两次，按名字去重后再报数
    var names = {};
    loaded.forEach(function (x) { names[x.name] = 1; });
    var n = Object.keys(names).length;
    if (!n) return srcLoading ? '正在加载音源…' : '未加载音源';
    return '已加载 ' + n + ' 个音源';
  }

  /** 音源异步加载完成后只刷状态文案，不重建整块 DOM */
  /** 音源异步加载完成后只刷状态文案，不重建整块 DOM */
  function syncSourceStatus() {
    var sub = document.querySelector('.mu-sub');
    if (sub) sub.textContent = sourceStatusText();

    // 搜索页那条「还没有可用的音源脚本」警告要跟着消失
    if (tab === 'search') {
      var panel = document.querySelector('.mu-panel');
      if (panel) {
        var hint = panel.querySelector('.mu-note.warn');
        var ready = !!(window.LxMusic && window.LxMusic.hasSource());
        if (ready && hint) {
          hint.remove();
        } else if (!ready && !hint) {
          var p = document.createElement('p');
          p.className = 'mu-note warn';
          p.textContent = '还没有可用的音源脚本。曲库负责搜到歌，播放地址需要音源脚本提供——去「音源」页导入一个。';
          panel.insertBefore(p, panel.firstChild);
        }
      }
    }

    // 音源页的状态行
    if (tab === 'script') {
      var note = document.querySelector('.mu-panel .mu-note.ok, .mu-panel .mu-note.warn');
      if (note) note.outerHTML = '<p class="mu-note ' +
        (window.LxMusic && window.LxMusic.hasSource() ? 'ok' : 'warn') + '">' +
        sourceStatusText() + '</p>';
    }
  }

  function renderIfActive() {
    if (el && document.getElementById('mod-music').classList.contains('active')) renderHome();
    renderMini();
  }

  function renderHome() {
    if (!el) return;

    // 整块重建 DOM 会让输入框丢值（新元素没有旧值）。
    // 重建前记下所有 input/textarea 的值与焦点，重建后恢复。
    // 之前只快照了搜索框：用户停在「音源」页往粘贴框里贴脚本时，
    // 正在播的歌一自然切歌（renderIfActive → renderHome），
    // 贴的内容就无提示丢了。
    var snapshot = [];
    el.querySelectorAll('input[id], textarea[id]').forEach(function (x) {
      if (x.type === 'checkbox' || x.type === 'radio') return;
      snapshot.push({ id: x.id, value: x.value,
                      focused: document.activeElement === x,
                      selStart: x.selectionStart, selEnd: x.selectionEnd });
    });

    el.innerHTML = homeHtml();
    mountPlayerBar();
    mountAddListModal();
    bindHome();
    onProgress();
    paintIcons(el);
    paintIcons(document.getElementById('muPlayerBar'));
    paintIcons(document.getElementById('muAddListMask'));

    snapshot.forEach(function (s) {
      // 搜索框单独处理：它的 onfocus 会弹联想下拉，
      // 必须在 suppressSuggest 保护下聚焦，不能走通用恢复
      if (s.id === 'muSearchKw') return;
      var sel = '#' + (window.CSS && CSS.escape ? CSS.escape(s.id) : s.id);
      var next = el.querySelector(sel);
      if (!next || next.value === s.value) return;
      next.value = s.value;
      if (s.focused) {
        next.focus();
        try { next.setSelectionRange(s.selStart, s.selEnd); } catch (e) {}
      }
    });

    // 搜索框：值 + 焦点恢复（焦点要在 suppressSuggest 保护下设置）
    var prevSearch = snapshot.filter(function (s) { return s.id === 'muSearchKw'; })[0];
    if (prevSearch) {
      var skw = el.querySelector('#muSearchKw');
      if (skw) {
        skw.value = prevSearch.value;
        if (prevSearch.focused) {
          // 恢复焦点会触发 onfocus → renderSuggest，
          // 刚搜完结果就摆在那儿，不该再弹一个下拉框挡住它
          suppressSuggest = true;
          skw.focus();
          suppressSuggest = false;
        }
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
    // 重建后把当前曲目和加载态补回去，否则取地址期间重建会丢掉
    // 封面转圈和「正在加载…」提示
    if (cur) {
      syncBarMeta();
      if (cur.loading) setBarLoading(true);
    }
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
      // 正在取地址时补回加载提示（innerHTML 会把它冲掉）
      if (cur && cur.loading) {
        var tip = document.createElement('span');
        tip.className = 'mu-loading-tip';
        tip.textContent = '正在加载…';
        titleEl.appendChild(tip);
        bar.classList.add('loading');
      } else {
        bar.classList.remove('loading');
      }
    }
    var disc = bar.querySelector('#muDisc');
    if (disc) {
      disc.innerHTML = (cur && cur.cover)
        ? '<img src="' + esc(cur.cover) + '" alt="">'
        : icon('Play');
      paintIcons(disc);
      // 重写封面后要补回加载图标，否则加载态会丢
      if (cur && cur.loading) {
        var spinner = document.createElement('span');
        spinner.className = 'mu-disc-spinner';
        spinner.innerHTML = icon('Loader');
        disc.appendChild(spinner);
        paintIcons(spinner);
        bar.classList.add('loading');
      }
    }
  }

  /* ---------------- 图标形变 ----------------
     morphicons 能把一个 SVG 路径平滑插值到另一个图标。
     播放/暂停、音量/静音、收藏/取消这三组是「同一位置的状态切换」，
     形变比直接换图标更有连续性。形变失败时静默退回静态图标。 */
  var morphCache = new WeakMap();

  /** 让 el 内的 SVG 从 from 形变到 to。
      首次调用前先把 SVG 重绘成 from 的单 path 版本——
      静态图标可能是 rect 组合（Pause 就是两个 rect），
      morphicons 在非 path 元素上插值会写出非法属性。 */
  function morphIcon(el, from, to) {
    if (!el || !window.MorphDOM || !window.LUCIDE_ICONS) return false;
    var svg = el.querySelector('svg');
    if (!svg) return false;
    var fromIcon = window.LUCIDE_ICONS[from];
    var toIcon = window.LUCIDE_ICONS[to];
    if (!fromIcon || !toIcon) return false;
    // 只支持单 path 之间的形变，形状数不一致会错位
    if (fromIcon.length !== 1 || toIcon.length !== 1) return false;
    if (fromIcon[0][0] !== 'path' || toIcon[0][0] !== 'path') return false;
    try {
      var m = morphCache.get(svg);
      if (!m) {
        // 用 from 的 path 重建一个干净的起点
        while (svg.firstChild) svg.removeChild(svg.firstChild);
        var p = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        var attrs = fromIcon[0][1] || {};
        for (var k in attrs) p.setAttribute(k, attrs[k]);
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke', 'currentColor');
        p.setAttribute('stroke-width', '2');
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke-linejoin', 'round');
        svg.appendChild(p);
        m = window.MorphDOM.createMorph(p, fromIcon, {});
        morphCache.set(svg, m);
      }
      m.set(toIcon);
      return true;
    } catch (e) {
      return false;
    }
  }

  /** 兜底：直接把按钮内容换成目标图标 */
  function setIcon(btn, name) {
    if (!btn) return;
    btn.innerHTML = icon(name);
    paintIcons(btn);
  }

  /** 播放/暂停按钮：优先形变，失败则换图。
      形变必须用单 path 版本（PlayPath/PausePath）——morphicons 是在现有
      元素上插值路径，两端形状数/类型不一致时会写出非法属性。 */
  var MORPH_NAME = {
    Play: 'PlayPath', Pause: 'PausePath',
    Volume2: 'VolumePath', VolumeX: 'MutePath',
    Eye: 'EyePath', EyeOff: 'EyeOffPath',
    Heart: 'HeartPath'
  };
  function morphKey(name) { return MORPH_NAME[name] || name; }

  function updateToggleIcon(playing) {
    var bar = document.getElementById('muPlayerBar');
    var btn = bar && bar.querySelector('#muToggle');
    var to = playing ? 'Pause' : 'Play';
    if (btn) {
      var from = btn.getAttribute('data-morph') || 'Play';
      if (!morphIcon(btn, morphKey(from), morphKey(to))) setIcon(btn, to);
      btn.setAttribute('data-morph', to);
    }
    // 沉浸页那个大按钮也一起同步
    var immBtn = immEl && immEl.querySelector('[data-imm="toggle"]');
    if (immBtn) {
      var ifrom = immBtn.getAttribute('data-morph') || 'Play';
      if (!morphIcon(immBtn, morphKey(ifrom), morphKey(to))) setIcon(immBtn, to);
      immBtn.setAttribute('data-morph', to);
    }
  }

  /** 音量/静音按钮 */
  function updateMuteIcon() {
    var bar = document.getElementById('muPlayerBar');
    var btn = bar && bar.querySelector('#muMute');
    if (!btn) return;
    var muted = state.volume <= 0;
    var to = muted ? 'VolumeX' : 'Volume2';
    // 播放条的音量键现在是普通图标（不再走 morph），直接换图更稳
    setIcon(btn, to);
    btn.title = muted ? '取消静音' : '静音';
  }

  /**
   * 播放条的加载态：封面位置转圈、标题旁显示「正在加载…」。
   * 取地址期间让用户看到明确反馈，而不是播放条毫无变化。
   */
  function setBarLoading(on) {
    var bar = document.getElementById('muPlayerBar');
    if (!bar) return;
    bar.classList.toggle('loading', !!on);

    // 封面位置叠一个旋转的 Loader 图标
    var disc = bar.querySelector('#muDisc');
    if (disc) {
      var spinner = disc.querySelector('.mu-disc-spinner');
      if (on) {
        if (!spinner) {
          spinner = document.createElement('span');
          spinner.className = 'mu-disc-spinner';
          spinner.innerHTML = icon('Loader');
          disc.appendChild(spinner);
          paintIcons(spinner);
        }
      } else if (spinner) {
        spinner.remove();
      }
    }

    var titleEl = bar.querySelector('.mu-player-title');
    if (!titleEl) return;
    var tip = titleEl.querySelector('.mu-loading-tip');
    if (on) {
      if (!tip) {
        tip = document.createElement('span');
        tip.className = 'mu-loading-tip';
        tip.textContent = '正在加载…';
        titleEl.appendChild(tip);
      }
    } else if (tip) {
      tip.remove();
    }
  }

  /**
   * 给音量控件挂滚轮调节。
   * 鼠标停在音量图标或弹出的滑条上滚轮即可调音量；
   * 必须 preventDefault，否则滚轮会同时滚动页面。
   */
  function bindVolumeWheel(el) {
    if (!el || el._volWheelBound) return;
    el._volWheelBound = true;
    el.addEventListener('wheel', function (e) {
      e.preventDefault();
      e.stopPropagation();
      // 每格约 4%，向上加、向下减
      var step = (e.deltaY < 0 ? 1 : -1) * 0.04;
      setVolume(state.volume + step);
    }, { passive: false });
  }

  /** 沉浸页里的静音图标与滑块同步（它不在播放条上，单独处理） */
  function syncImmMuteIcon() {    if (!immEl) return;
    var muted = state.volume <= 0;
    var btn = immEl.querySelector('[data-imm="mute"]');
    if (btn) {
      btn.innerHTML = icon(muted ? 'VolumeX' : 'Volume2');
      paintIcons(btn);
      btn.title = muted ? '取消静音' : '静音';
    }
    var range = immEl.querySelector('.mu-imm-vol-range');
    if (range && document.activeElement !== range) range.value = String(state.volume);
    var num = immEl.querySelector('#muImmVolNum');
    if (num) num.textContent = String(Math.round(state.volume * 100));
  }

  /** 播放条在 body 上，单独绑定 */
  function bindPlayerBar(bar) {
    var toggle = bar.querySelector('#muToggle'); if (toggle) toggle.onclick = togglePlay;
    var prev = bar.querySelector('#muPrev'); if (prev) prev.onclick = prevTrack;
    var next = bar.querySelector('#muNext'); if (next) next.onclick = function () { nextTrack(false); };
    var modeBtn = bar.querySelector('#muMode');
    if (modeBtn) modeBtn.onclick = cyclePlayMode;
    var mute = bar.querySelector('#muMute');
    if (mute) mute.onclick = function () {
      // 静音前记住原音量，再点一次恢复
      if (state.volume > 0) {
        lastVolume = state.volume;
        setVolume(0);
      } else {
        setVolume(lastVolume > 0 ? lastVolume : 0.7);
      }
      updateMuteIcon();
    };
    var seek = bar.querySelector('.mu-seek');
    if (seek) seek.oninput = function () { seekTo(parseFloat(seek.value)); };
    var imm = bar.querySelector('#muImmersive'); if (imm) imm.onclick = openImmersive;
    var queueBtn = bar.querySelector('#muQueueBtn');
    if (queueBtn) queueBtn.onclick = toggleQueuePanel;

    // 收藏当前曲
    var loveBtn = bar.querySelector('#muBarLove');
    if (loveBtn) loveBtn.onclick = function () {
      if (!cur) { toast('还没有在播的歌'); return; }
      var on = toggleLove({
        id: cur.id, title: cur.title, artist: cur.artist, cover: cur.cover || '',
        source: cur.source || '', interval: cur.interval || '', track: cur.track || null
      });
      loveBtn.classList.toggle('on', on);
      var svg = loveBtn.querySelector('svg');
      if (svg) svg.classList.toggle('on', on);
      toast(on ? '已收藏' : '已取消收藏');
    };

    // 歌词开关（与全屏那个「词」一致）
    var lyrBtn = bar.querySelector('#muBarLyricBtn');
    if (lyrBtn) lyrBtn.onclick = function () {
      showLyric = !showLyric;
      try { localStorage.setItem('juice_music_show_lyric', showLyric ? '1' : '0'); } catch (e) {}
      lyrBtn.classList.toggle('on', showLyric);
      lyrBtn.title = showLyric ? '隐藏歌词' : '显示歌词';
      var glyph = lyrBtn.querySelector('.mu-lyric-glyph');
      if (glyph) glyph.classList.toggle('off', !showLyric);
      // 播放条那行歌词跟着开关走
      var line = document.getElementById('muBarLyric');
      if (line) line.style.display = showLyric ? '' : 'none';
      if (!showLyric) lastBarLyric = '';
      // 沉浸页开着时同步
      if (immEl) {
        var box = immEl.querySelector('#muImmLyric');
        var ibtn = immEl.querySelector('[data-imm="lyric"]');
        if (box) box.classList.toggle('hidden', !showLyric);
        if (ibtn) {
          ibtn.classList.toggle('on', showLyric);
          ibtn.title = showLyric ? '隐藏歌词' : '显示歌词';
          var ig = ibtn.querySelector('.mu-lyric-glyph');
          if (ig) ig.classList.toggle('off', !showLyric);
        }
        if (showLyric && box) {
          box.innerHTML = lyricLinesHtml();
          applyLyricPad(box);
          lastLyricIndex = -1;
          highlightLyric(audio ? audio.currentTime : 0);
        }
      }
    };

    // 音量滑块（hover 弹出的垂直条）
    var barVol = bar.querySelector('.mu-vol');
    if (barVol) barVol.oninput = function () { setVolume(parseFloat(barVol.value)); };
    // 滚轮也能调：挂在音量图标所在的容器上，hover 时滚一下就行
    bindVolumeWheel(bar.querySelector('.mu-imm-vol'));

    // 点封面也进全屏（跟网易云/QQ音乐的习惯一致）
    var discEl = bar.querySelector('#muDisc');
    if (discEl) {
      discEl.onclick = openImmersive;
      discEl.style.cursor = 'pointer';
    }
  }

  /* ---------------- 当前播放列表 ----------------
     从播放条上的列表按钮弹出，显示当前队列、高亮正在播的那首，
     点其他项直接跳过去。之前没有任何地方能看到「下一首是什么」。 */
  var queuePanelEl = null;

  function toggleQueuePanel(inImmersive) {
    if (queuePanelEl) { closeQueuePanel(); return; }
    if (!queue.length) { toast('播放列表是空的'); return; }
    openQueuePanel(inImmersive);
  }

  function openQueuePanel(inImmersive) {
    closeQueuePanel();
    queuePanelEl = document.createElement('div');
    // 沉浸页 z-index 400，面板必须更高才能浮在上面
    queuePanelEl.className = 'mu-queue-mask' + (inImmersive || immEl ? ' in-immersive' : '');
    queuePanelEl.innerHTML = queuePanelHtml();
    document.body.appendChild(queuePanelEl);
    paintIcons(queuePanelEl);
    bindQueueDrag(queuePanelEl);

    queuePanelEl.querySelectorAll('[data-q-jump]').forEach(function (row) {
      row.onclick = function () {
        var i = parseInt(row.getAttribute('data-q-jump'), 10);
        if (isNaN(i) || i === qi) { closeQueuePanel(); return; }
        qi = i;
        playCurrent();
        // 面板留着，让用户继续挑（跟网易云的队列抽屉一致）
        renderQueuePanel();
      };
    });
    var clr = queuePanelEl.querySelector('#muQueueClear');
    if (clr) clr.onclick = function () {
      try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (e) {}
      cur = null; queue = []; qi = -1; qName = '';
      saveLive();
      closeQueuePanel();
      syncPlayUI(false);
      syncBarMeta();
      syncBarVisibility();
      renderIfActive();
      toast('已清空播放列表');
    };
    queuePanelEl.querySelector('.mu-queue-close').onclick = closeQueuePanel;
    queuePanelEl.onclick = function (e) {
      if (e.target === queuePanelEl) closeQueuePanel();
    };
  }

  function closeQueuePanel() {
    if (queuePanelEl) { queuePanelEl.remove(); queuePanelEl = null; }
  }

  /** 面板只重建内部列表，不重建整个浮层（保住滚动位置） */
  /**
   * @param {boolean} light 只同步高亮和滚动，不重建行。
   * 队列 200+ 项时全量重建（字符串拼接 + innerHTML + 数百个 SVG 重绘
   * + 4×N 个拖拽/删除监听重挂）在每次切歌都跑一遍，肉眼可感卡顿。
   * 增删/排序仍走全量。
   */
  function renderQueuePanel(light) {
    if (!queuePanelEl) return;
    if (light) {
      var qrows = queuePanelEl.querySelectorAll('.mu-queue-row');
      var target = null;
      for (var ri = 0; ri < qrows.length; ri++) {
        var on = parseInt(qrows[ri].getAttribute('data-q-index'), 10) === qi;
        qrows[ri].classList.toggle('active', on);
        if (on) target = qrows[ri];
      }
      if (target) target.scrollIntoView({ block: 'center' });
      return;
    }
    var body = queuePanelEl.querySelector('.mu-queue-body');
    if (body) body.innerHTML = queueRowsHtml();
    paintIcons(queuePanelEl);
    if (body) bindQueueDrag(body);
    queuePanelEl.querySelectorAll('[data-q-jump]').forEach(function (row) {
      row.onclick = function (e) {
        // 拖动手柄和删除键都不触发跳转
        if (e.target.closest('.mu-queue-grip') || e.target.closest('[data-q-del]')) return;
        var i = parseInt(row.getAttribute('data-q-jump'), 10);
        if (isNaN(i) || i === qi) { closeQueuePanel(); return; }
        qi = i;
        playCurrent();
        renderQueuePanel();
      };
    });
    var active = queuePanelEl.querySelector('.mu-queue-row.active');
    if (active) active.scrollIntoView({ block: 'center' });
  }

  function queuePanelHtml() {
    return '<div class="mu-queue-panel">' +
      '<div class="mu-queue-head">' +
        '<div class="mu-queue-title">' +
          '<b>当前播放</b>' +
          '<span>' + (qName ? esc(qName) + ' · ' : '') + queue.length + ' 首</span>' +
        '</div>' +
        '<div class="mu-queue-ops">' +
          '<button class="mu-btn mini" id="muQueueClear" title="清空播放列表">' + icon('Trash2') + '清空</button>' +
          '<button class="mu-op mu-queue-close" title="关闭">' + icon('X') + '</button>' +
        '</div>' +
      '</div>' +
      '<div class="mu-queue-body">' + queueRowsHtml() + '</div>' +
    '</div>';
  }

  function queueRowsHtml() {
    return queue.map(function (t, i) {
      var on = i === qi;
      return '<div class="mu-queue-row' + (on ? ' active' : '') + '" data-q-jump="' + i +
        '" draggable="true" data-q-index="' + i + '">' +
        '<span class="mu-queue-grip" title="拖动排序">' + icon('GripVertical') + '</span>' +
        '<span class="mu-queue-idx">' + (on ? icon('Volume2') : (i + 1)) + '</span>' +
        '<span class="mu-queue-text"><b>' + esc(t.title || '未知曲目') + '</b>' +
          (t.artist ? '<i>' + esc(t.artist) + '</i>' : '') + '</span>' +
        (t.interval ? '<span class="mu-queue-dur">' + esc(t.interval) + '</span>' : '') +
        '<button class="mu-queue-del" data-q-del="' + i + '" title="从播放列表移除">' + icon('X') + '</button>' +
        '</div>';
    }).join('');
  }

  /* ---------------- 队列拖动排序 ---------------- */
  var dragFrom = -1;

  function bindQueueDrag(root) {
    // 每行的删除键（跟拖动一起绑，两处调用点都能覆盖）
    root.querySelectorAll('[data-q-del]').forEach(function (btn) {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();
        var i = parseInt(btn.getAttribute('data-q-del'), 10);
        removeQueueItem(i);
      });
    });

    var rows = root.querySelectorAll('[data-q-index]');
    rows.forEach(function (row) {
      row.addEventListener('dragstart', function (e) {
        dragFrom = parseInt(row.getAttribute('data-q-index'), 10);
        row.classList.add('dragging');
        try { e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', String(dragFrom)); } catch (err) {}
      });
      row.addEventListener('dragend', function () {
        row.classList.remove('dragging');
        root.querySelectorAll('.drag-over').forEach(function (x) { x.classList.remove('drag-over'); });
      });
      row.addEventListener('dragover', function (e) {
        if (dragFrom < 0) return;
        e.preventDefault();
        try { e.dataTransfer.dropEffect = 'move'; } catch (err) {}
        row.classList.add('drag-over');
      });
      row.addEventListener('dragleave', function () { row.classList.remove('drag-over'); });
      row.addEventListener('drop', function (e) {
        e.preventDefault();
        row.classList.remove('drag-over');
        var to = parseInt(row.getAttribute('data-q-index'), 10);
        if (dragFrom < 0 || isNaN(to) || dragFrom === to) return;
        moveQueueItem(dragFrom, to);
        dragFrom = -1;
      });
    });
  }

  /**
   * 从队列里删掉第 i 首。
   * 删的正好是正在播的那首时：切到下一首继续播；删完就没歌了则停掉。
   */
  function removeQueueItem(i) {
    if (i < 0 || i >= queue.length) return;
    var wasCurrent = i === qi;
    queue.splice(i, 1);

    if (!queue.length) {
      try { audio.pause(); audio.removeAttribute('src'); audio.load(); } catch (e) {}
      cur = null; qi = -1; qName = '';
      setBarLoading(false);
      syncPlayUI(false);
      syncBarMeta();
      syncBarVisibility();
      renderIfActive();
      closeQueuePanel();
      saveLive();
      toast('播放列表已清空');
      return;
    }

    if (wasCurrent) {
      // 删掉的是当前曲目：原位置现在指向下一首；到末尾则回到最后一首
      if (qi >= queue.length) qi = queue.length - 1;
      playCurrent();
    } else if (i < qi) {
      qi--;   // 删的是前面的，当前曲目索引左移
    }
    saveLive();
    renderQueuePanel();
    if (tab === 'lists') renderHome();
    toast('已从播放列表移除');
  }

  /** 把队列里第 from 项移到 to 位置，正在播的那首跟着走 */
  function moveQueueItem(from, to) {
    if (from === to || from < 0 || to < 0 || from >= queue.length || to >= queue.length) return;
    var playing = queue[qi];
    var moved = queue.splice(from, 1)[0];
    // 指示线画在目标行的上缘（语义：插到它前面）。
    // 向下拖时，先删后插会让目标行整体左移一位，
    // 直接用 to 会插到目标行的后面——所见非所得。
    // 向上拖不受影响（目标行下标没变）。
    var insertAt = from < to ? to - 1 : to;
    queue.splice(insertAt, 0, moved);
    // 重新定位当前曲目：位置可能因为插入/移除变了
    var newIdx = queue.indexOf(playing);
    if (newIdx > -1) qi = newIdx;
    saveLive();
    // renderQueuePanel 内部会重建全部行并重新 bindQueueDrag。
    // 不能在这里再手动绑一次：监听是 addEventListener 挂在同一批新节点上的，
    // 重复绑会让删除键一次点击触发两次 removeQueueItem，连删两首。
    renderQueuePanel();
  }

  function bindHome() {
    el.querySelectorAll('[data-mu-tab]').forEach(function (b) {
      b.onclick = function () {
        tab = b.getAttribute('data-mu-tab');
        // 切页时顺手关掉「加入歌单」弹层，否则它会跟着新页面一起重建
        addTargetIndex = -1; pickTarget = null;
        renderHome();
      };
    });

    // 列表播放
    el.querySelectorAll('[data-play]').forEach(function (r) {
      r.onclick = function (e) {
        // 收藏 / 加歌单按钮在行内，别触发播放
        if (e.target.closest('[data-love]') || e.target.closest('[data-addlist]')) return;
        var name = r.getAttribute('data-play');
        var i = parseInt(r.getAttribute('data-idx'), 10);
        var list = name === '本机文件' ? localTracks() : name === '直链歌单' ? directList() : filteredResults();
        var target = list[i];
        if (!target) return;
        var item = {
          kind: name === '搜索结果' ? 'search' : 'local',
          id: target.id || ((target.source || '') + '_' + (target.songmid || target.title)),
          title: target.title,
          artist: target.artist || '',
          cover: target.cover || '',
          url: target.url || '',
          track: target.track || null,
          source: target.source || '',
          interval: target.interval || ''
        };
        // 正在播别的列表里的歌时，点搜索结果只插队，不换掉整个队列
        var fromOtherList = queue.length > 0 && qName && qName !== name;
        if (fromOtherList && name === '搜索结果') {
          enqueueNext(item);
          return;
        }
        // 同列表内点击：整页入队，从点的那首开始
        var q = list.map(function (t) {
          return {
            kind: name === '搜索结果' ? 'search' : 'local',
            id: t.id || ((t.source || '') + '_' + (t.songmid || t.title)),
            title: t.title,
            artist: t.artist || '',
            cover: t.cover || '',
            url: t.url || '',
            track: t.track || null,
            source: t.source || '',
            interval: t.interval || ''
          };
        });
        playQueue(q, name, i);
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
    var lxToggle = el.querySelector('#muLxPasteToggle');
    if (lxToggle) lxToggle.onclick = function () {
      lxPasteOpen = !lxPasteOpen;
      renderHome();
    };

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
      // 搜索进行中不弹联想：结果列表马上就要出来，
      // 这时挂着下拉框会挡住内容，也容易误点。
      // suppressSuggest 用于「重建 DOM 后恢复焦点」那一下，避免刚出结果又弹下拉。
      if (searching || suppressSuggest) {
        sug.hidden = true;
        sug.innerHTML = '';
        return;
      }
      var kw = skw.value.trim();
      var hist = matchHistory(kw);
      var seq = ++suggestSeq;

      function paint(remote) {
        if (seq !== suggestSeq) return;   // 输入已变，丢弃旧结果
        var html = '';
        if (remote && remote.length) {
          html += '<div class="mu-suggest-head">搜索建议</div>' +
            remote.map(function (x) {
              return '<div class="mu-suggest-item" data-sug="' + esc(x) + '">' + icon('Search') + esc(x) + '</div>';
            }).join('');
        }
        // 只有输入框为空（还没开始打字）时才给搜索历史；
        // 一旦输入了内容，这个位置应该只放真正的搜索建议
        if (!kw && hist.length) {
          html += '<div class="mu-suggest-head mu-suggest-head-row">搜索历史' +
            '<button class="mu-suggest-clear" id="muHistoryClear" title="清空搜索历史">清空</button>' +
            '</div>' +
            hist.map(function (x) {
              return '<div class="mu-suggest-item" data-sug="' + esc(x) + '">' + icon('History') + esc(x) +
                '<button class="mu-suggest-del" data-sug-del="' + esc(x) + '" title="删除这条">' + icon('X') + '</button>' +
                '</div>';
            }).join('');
        }
        if (!html) { sug.hidden = true; sug.innerHTML = ''; return; }
        sug.innerHTML = html;
        paintIcons(sug);
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
      // 开始搜索就收起联想/历史，否则结果都出来了下面还挂着下拉框
      if (sug) { sug.hidden = true; sug.innerHTML = ''; }
      addHistory(kw);
      runSearch(kw);
    }

    if (sbtn && skw) {
      sbtn.onclick = function () { doSearch(skw.value.trim()); };
    }

    if (sug) {
      sug.onclick = function (e) {
        // 删除单条历史
        var del = e.target.closest('[data-sug-del]');
        if (del) {
          e.stopPropagation();
          var word = del.getAttribute('data-sug-del');
          state.history = state.history.filter(function (x) { return x !== word; });
          saveState();
          renderSuggest();
          return;
        }
        // 清空历史
        if (e.target.closest('#muHistoryClear')) {
          e.stopPropagation();
          state.history = [];
          saveState();
          renderSuggest();
          return;
        }
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
        var track = filteredResults()[i];
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
          addTargetIndex = -1; pickTarget = null;
          renderHome();
        }
      };
    }
    document.querySelectorAll('[data-pick-list]').forEach(function (b) {
      b.onclick = function () {
        var listId = b.getAttribute('data-pick-list');
        var track = pickTarget || filteredResults()[addTargetIndex];
        if (!track) { addTargetIndex = -1; pickTarget = null; pickTarget = null; renderHome(); return; }
        var l = getList(listId);
        if (!l) { addTargetIndex = -1; pickTarget = null; renderHome(); return; }
        if (inList(listId, track)) {
          toast('已在「' + l.name + '」里');
        } else {
          addToList(listId, track);
          toast('已加入「' + l.name + '」');
        }
        addTargetIndex = -1; pickTarget = null;
        renderHome();
      };
    });

    var pickNew = document.getElementById('muPickNew');
    if (pickNew) pickNew.onclick = function () {
      askName('新建歌单', '歌单名称', '', function (name) {
        if (!name) return;
        var item = createList(name);
        var track = pickTarget || filteredResults()[addTargetIndex];
        if (item && track) {
          addToList(item.id, track);
          toast('已加入「' + item.name + '」');
        }
        addTargetIndex = -1; pickTarget = null;
        renderHome();
      });
    };

    var pickCancel = document.getElementById('muPickCancel');
    if (pickCancel) pickCancel.onclick = function () {
      addTargetIndex = -1; pickTarget = null;
      renderHome();
    };

    /* ---- 排行榜页 ---- */
    if (tab === 'rank') loadDiscover();
    if (tab === 'rank') {
      el.querySelectorAll('[data-rank]').forEach(function (b) {
        b.onclick = function () {
          openRank(b.getAttribute('data-rank'), b.getAttribute('data-rank-name') || '');
        };
      });
      // 榜单歌曲：转成播放队列
      el.querySelectorAll('[data-rank-play]').forEach(function (r) {
        r.onclick = function (e) {
          // 收藏 / 加列表按钮在行内，别触发播放
          if (e.target.closest('[data-rank-love]') || e.target.closest('[data-rank-addlist]')) return;
          var i = parseInt(r.getAttribute('data-rank-play'), 10);
          var songs = discoverState.songs || [];
          if (!songs[i]) return;
          var name = discoverState.openRank ? discoverState.openRank.name : '排行榜';
          var list = songs.map(function (t) {
            return {
              kind: 'rank',
              id: 'kg_' + (t.hash || t.songmid),
              title: t.name,
              artist: t.singer,
              cover: t.img || '',
              url: '',            // 地址要等音源脚本给
              track: t,
              source: 'kg',
              interval: t.interval
            };
          });
          // 地址交给 playCurrent 统一取（它会给没有 url 的队列项补地址）
          playQueue(list, name, i);
        };
      });

      // 榜单歌曲的收藏
      el.querySelectorAll('[data-rank-love]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var i = parseInt(b.getAttribute('data-rank-love'), 10);
          var t = (discoverState.songs || [])[i];
          if (!t) return;
          var item = {
            id: 'kg_' + (t.hash || t.songmid),
            title: t.name,
            artist: t.singer,
            cover: t.img || '',
            source: 'kg',
            interval: t.interval,
            track: t
          };
          var on = toggleLove(item);
          toast(on ? '已收藏' : '已取消收藏');
          renderHome();
        };
      });

      // 榜单歌曲的「加入列表」
      el.querySelectorAll('[data-rank-addlist]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var i = parseInt(b.getAttribute('data-rank-addlist'), 10);
          var t = (discoverState.songs || [])[i];
          if (!t) return;
          // 复用「加入歌单」弹层：它读的是 searchResults，这里临时替换
          var item = {
            id: 'kg_' + (t.hash || t.songmid),
            title: t.name,
            artist: t.singer,
            cover: t.img || '',
            source: 'kg',
            interval: t.interval,
            track: t
          };
          pickTarget = item;
          addTargetIndex = 0;
          renderHome();
        };
      });
    }

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
        // 整页入队，从点击那首开始播。之前走 playTrack 只播单曲，
        // 队列里永远只有一首，上一首/下一首和播放列表都是空的
        var q = l.tracks.map(function (t) {
          var inner = t.track || t;
          return {
            kind: 'list',
            id: t.id || ((t.source || inner.source || '') + '_' + (inner.songmid || t.title)),
            title: t.title,
            artist: t.artist || inner.singer || '',
            cover: t.cover || inner.img || '',
            url: t.url || '',
            track: t.track || null,
            source: t.source || inner.source || '',
            interval: t.interval || inner.interval || ''
          };
        });
        playQueue(q, l.name, i);
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

    /* ---- 平台筛选 ---- */
    el.querySelectorAll('[data-src-filter]').forEach(function (b) {
      b.onclick = function () {
        srcFilter = b.getAttribute('data-src-filter');
        renderHome();
      };
    });

    var sortBtn = el.querySelector('#muListSort');
    if (sortBtn) sortBtn.onclick = function () {
      // 循环：默认 → 字母↑ → 字母↓ → 歌手↑ → 歌手↓ → 时间↑ → 时间↓ → 默认
      var order = ['default', 'title', 'artist', 'added'];
      if (listSort === 'default') {
        listSort = 'title'; listSortAsc = true;
      } else if (listSortAsc) {
        // 先在同一项内切正/倒序
        listSortAsc = false;
      } else {
        // 倒序再点才进下一项
        var i = order.indexOf(listSort);
        var next = order[(i + 1) % order.length];
        listSort = next;
        listSortAsc = true;
      }
      renderHome();
      toast('排序：' + ({ default: '默认', title: '按字母', artist: '按歌手', added: '按加入时间' })[listSort] +
        (listSort === 'default' ? '' : (listSortAsc ? ' 正序' : ' 倒序')));
    };

    var listImport = el.querySelector('#muListImport');
    if (listImport) listImport.onclick = importFromShare;

    var listNew = el.querySelector('#muListNew');
    if (listNew) listNew.onclick = function () {
      askName('新建歌单', '歌单名称', '', function (name) {
        if (!name) return;
        var item = createList(name);
        if (item) { activeListId = item.id; renderHome(); }
      });
    };

    var listRename = el.querySelector('#muListRename');
    if (listRename) listRename.onclick = function () {
      var l = getList(activeListId);
      if (!l) return;
      askName('重命名歌单', '歌单名称', l.name, function (name) {
        if (!name || name === l.name) return;
        l.name = name;
        saveState();
        renderHome();
        toast('已改名为「' + name + '」');
      });
    };

    var listDel = el.querySelector('#muListDel');
    if (listDel) listDel.onclick = function () {
      var l = getList(activeListId);
      if (!l) return;
      askConfirm('删除歌单', '确定删除「' + l.name + '」？此操作不可撤销。', function () {
        removeList(l.id);
        activeListId = LOVE_ID;
        renderHome();
        toast('已删除');
      });
    };
  }

  /* ---------------- 沉浸全屏 ---------------- */
  var immEl = null;
  /* ---------------- 沉浸页歌词 ---------------- */
  /** 渲染歌词行（带 data-time 供高亮） */
  function lyricLinesHtml() {
    if (!showLyric) return '';
    if (!cur) return '<div class="mu-imm-lyric-tip">当前没有在播放的歌</div>';
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
    // 本机文件 / 直链没有平台 songmid，按文件名跨平台搜歌词会
    // 给本地文件配上别人的歌词（文件名撞车很常见），直接跳过
    if (track.kind === 'local' || track.kind === 'link') {
      currentLyric = null; lyricTrackKey = ''; return;
    }
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
      // 清掉 key：失败后同一首还有机会重试（播放重试、重新点进沉浸页）。
      // 不清的话 key 已登记，loadLyricFor 会直接 return，这首歌永远没词。
      lyricTrackKey = '';
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
      var target = active.offsetTop - box.clientHeight / 2 + active.offsetHeight / 2;
      smoothScrollTo(box, Math.max(0, target));
    }
  }

  /**
   * 歌词区平滑滚动。
   * 不用原生 behavior:'smooth'——切行比动画快，浏览器的滚动队列会堆积，
   * 实测表现为 scrollTop 卡在 0。
   *
   * 用 rAF + setTimeout 双调度：后台标签页会把 rAF 节流到几乎不触发，
   * 只有 rAF 的话动画会永远停在起始位置（虚拟列表也踩过同一个坑）。
   */
  var lyricScrollTimer = 0;
  function smoothScrollTo(box, to) {
    if (lyricScrollTimer) { clearTimeout(lyricScrollTimer); lyricScrollTimer = 0; }
    var from = box.scrollTop;
    var dist = to - from;
    if (Math.abs(dist) < 1) return;

    // 距离越远动画稍长，但封顶，避免跨十几行时拖太久
    var dur = Math.min(520, 260 + Math.abs(dist) * 0.35);
    var start = performance.now();

    // 先快后慢的三次缓动，比线性自然
    var ease = function (x) {
      return x < 0.5
        ? 4 * x * x * x
        : 1 - Math.pow(-2 * x + 2, 3) / 2;
    };

    var done = false;
    var tick = function () {
      if (done) return;
      var now = performance.now();
      var p = Math.min(1, (now - start) / dur);
      box.scrollTop = from + dist * ease(p);
      if (p < 1) {
        lyricScrollTimer = setTimeout(tick, 16);
      } else {
        done = true;
        lyricScrollTimer = 0;
      }
    };
    // 用 setTimeout 起步，不依赖 rAF 是否被节流
    lyricScrollTimer = setTimeout(tick, 16);
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
    paintIcons(immEl);
    bindImmersive();
    syncPlayUI(audio && !audio.paused);
    onProgress();
    requestBrowserFullscreen();
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
          // 黑胶：有封面时封面贴在盘上一起转；没有封面就让整张唱片转
          '<div class="mu-imm-deck">' +
            '<div class="mu-imm-vinyl' + (playing && !(cur && cur.cover) ? ' spin' : '') + '">' +
              '<span class="mu-imm-grooves"></span>' +
              '<div class="mu-imm-disc' + (playing && cur && cur.cover ? ' spin' : '') + '">' +
                (cur && cur.cover ? '<img src="' + esc(cur.cover) + '" alt="">' : icon('Play')) +
              '</div>' +
              '<span class="mu-imm-hole"></span>' +
            '</div>' +
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
          // 三组：左组贴左、播放键绝对居中、右组贴右，
          // 这样播放键永远在正中，两侧按钮各自向外排
          '<div class="mu-ops imm">' +
            '<div class="mu-imm-ops-left">' +
              '<button class="mu-op lyric-btn' + (showLyric ? ' on' : '') + '" data-imm="lyric" title="' +
                (showLyric ? '隐藏歌词' : '显示歌词') + '"><span class="mu-lyric-glyph' +
                (showLyric ? '' : ' off') + '">词</span></button>' +
              '<button class="mu-op" data-imm="queue" title="播放列表">' + icon('ListMusic') + '</button>' +
              '<button class="mu-op' + (cur && inList(LOVE_ID, { track: cur.track || cur }) ? ' on' : '') +
                '" data-imm="love" title="收藏">' + icon('Heart') + '</button>' +
            '</div>' +
            '<div class="mu-imm-ops-center">' +
              '<button class="mu-op" data-imm="prev" title="上一首">' + icon('SkipBack') + '</button>' +
              '<button class="mu-op big" data-imm="toggle" title="播放/暂停" data-morph="' + (playing ? 'Pause' : 'Play') + '">' + icon(playing ? 'Pause' : 'Play') + '</button>' +
              '<button class="mu-op" data-imm="next" title="下一首">' + icon('SkipForward') + '</button>' +
            '</div>' +
            '<div class="mu-imm-ops-right">' +
              '<button class="mu-op' + (playMode() !== 'all' ? ' on' : '') + '" data-imm="mode" title="' +
                ({ one: '单曲循环', all: '顺序播放', shuffle: '随机播放' }[playMode()]) + '">' +
                icon({ one: 'Repeat1', all: 'Repeat', shuffle: 'Shuffle' }[playMode()]) + '</button>' +
              // 音量：一个图标，hover 时向上弹出垂直滑条
              '<span class="mu-imm-vol">' +
                '<button class="mu-op" data-imm="mute" title="' + (state.volume <= 0 ? '取消静音' : '静音') + '">' +
                  icon(state.volume <= 0 ? 'VolumeX' : 'Volume2') + '</button>' +
                '<span class="mu-imm-vol-pop">' +
                  '<span class="mu-imm-vol-num" id="muImmVolNum">' + Math.round(state.volume * 100) + '</span>' +
                  '<input type="range" class="mu-imm-vol-range" min="0" max="1" step="0.01" value="' + state.volume +
                    '" orient="vertical" aria-label="音量">' +
                '</span>' +
              '</span>' +
              '<button class="mu-op" data-imm="exit" title="退出全屏（Esc）">' + icon('Minimize2') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
      '</div>';
  }
  function bindImmersive() {
    immEl.querySelector('[data-imm="prev"]').onclick = prevTrack;
    immEl.querySelector('[data-imm="next"]').onclick = function () { nextTrack(false); };
    immEl.querySelector('[data-imm="toggle"]').onclick = togglePlay;
    immEl.querySelector('[data-imm="exit"]').onclick = closeImmersive;
    // 音量：滑块与静音
    var volRange = immEl.querySelector('.mu-imm-vol-range');
    if (volRange) volRange.oninput = function () {
      setVolume(parseFloat(volRange.value));
      syncImmMuteIcon();
    };
    bindVolumeWheel(immEl.querySelector('.mu-imm-vol'));
    var muteBtn = immEl.querySelector('[data-imm="mute"]');
    if (muteBtn) muteBtn.onclick = function () {
      if (state.volume > 0) { lastVolume = state.volume; setVolume(0); }
      else setVolume(lastVolume > 0 ? lastVolume : 0.7);
      syncImmMuteIcon();
    };

    // 收藏当前曲
    var loveBtn = immEl.querySelector('[data-imm="love"]');
    if (loveBtn) loveBtn.onclick = function () {
      if (!cur) return;
      var item = {
        id: cur.id,
        title: cur.title,
        artist: cur.artist,
        cover: cur.cover || '',
        source: cur.source || '',
        interval: cur.interval || '',
        track: cur.track || null
      };
      var on = toggleLove(item);
      loveBtn.classList.toggle('on', on);
      loveBtn.querySelector('svg')?.classList.toggle('on', on);
      toast(on ? '已收藏' : '已取消收藏');
    };

    var qBtn = immEl.querySelector('[data-imm="queue"]');
    if (qBtn) qBtn.onclick = function () { toggleQueuePanel(true); };
    var modeBtn = immEl.querySelector('[data-imm="mode"]');
    if (modeBtn) modeBtn.onclick = function () {
      cyclePlayMode();
      // 沉浸页不随 renderHome 重建，图标要手动同步
      var m = playMode();
      var b = immEl.querySelector('[data-imm="mode"]');
      if (b) {
        b.innerHTML = icon({ one: 'Repeat1', all: 'Repeat', shuffle: 'Shuffle' }[m]);
        paintIcons(b);
        b.classList.toggle('on', m !== 'all');
        b.title = { one: '单曲循环', all: '顺序播放', shuffle: '随机播放' }[m];
      }
    };
    immEl.querySelector('[data-imm="lyric"]').onclick = function () {
      showLyric = !showLyric;
      try { localStorage.setItem('juice_music_show_lyric', showLyric ? '1' : '0'); } catch (e) {}
      // 原地切换：重建整页会打断滚动位置和唱片动画
      var box = immEl.querySelector('#muImmLyric');
      if (box) box.classList.toggle('hidden', !showLyric);
      this.classList.toggle('on', showLyric);
      this.title = showLyric ? '隐藏歌词' : '显示歌词';
      // 「词」字开关：关闭时在字上画一道斜线
      var glyph = this.querySelector('.mu-lyric-glyph');
      if (glyph) glyph.classList.toggle('off', !showLyric);
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
    seek.oninput = function () { seekTo(parseFloat(seek.value)); };
    immEl.addEventListener('click', function (e) {
      if (e.target === immEl || e.target.classList.contains('mu-imm-bg')) closeImmersive();
    });
  }
  /* ---------------- 浏览器原生全屏 ----------------
     沉浸页之前只是 CSS 铺满视口，浏览器地址栏还在——用户说的
     「只是网页全屏没有真的全屏」就是这个。接上 Fullscreen API：
     进入沉浸页时对 documentElement 申请全屏，退出时释放。
     iPhone Safari 不支持 Element 级全屏，申请失败静默降级成
     原来的网页全屏，行为不变。 */
  function isFsActive() {
    return !!(document.fullscreenElement || document.webkitFullscreenElement);
  }

  function requestBrowserFullscreen() {
    var el = document.documentElement;
    var req = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!req) return;                     // 不支持：保持网页全屏
    try {
      var p = req.call(el);
      // 非用户手势调用（媒体键、代码触发）会被拒：静默降级
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function exitBrowserFullscreen() {
    if (!isFsActive()) return;
    var exit = document.exitFullscreen || document.webkitExitFullscreen;
    if (!exit) return;
    try {
      var p = exit.call(document);
      if (p && p.catch) p.catch(function () {});
    } catch (e) {}
  }

  function closeImmersive() {
    if (!immEl) return;
    // 先摘沉浸页再退全屏：fullscreenchange 回调看到 immEl 已空就不会
    // 再触发一次 closeImmersive（否则两个退出路径互相触发死循环）
    immEl.remove();
    immEl = null;
    exitBrowserFullscreen();
    // 队列面板在沉浸模式下会加 .in-immersive（z=500）改成深色主题。
    // 沉浸页关掉时若不一起关面板，残留的全屏遮罩会挡住整个页面，
    // 只能靠点击遮罩空白才能关。
    closeQueuePanel();
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
      '<button class="mu-mini-btn" data-mini="toggle" title="播放/暂停">' + icon(playing ? 'Pause' : 'Play') + '</button>' +
      '<button class="mu-mini-btn" data-mini="next" title="下一首">' + icon('SkipForward') + '</button>' +
      '<button class="mu-mini-btn" data-mini="goto" title="打开播放器">' + icon('Maximize2') + '</button>' +
      '<button class="mu-mini-btn" data-mini="stop" title="停止">' + icon('X') + '</button>';
    paintIcons(miniEl);
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
          saveLive();
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
    updateToggleIcon(!!playing);
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
      var hasCover = !!(cur && cur.cover);
      // 有封面：封面贴在盘上转；没封面：整张唱片转
      if (vinyl) vinyl.classList.toggle('spin', !!playing && !hasCover);
      if (disc) disc.classList.toggle('spin', !!playing && hasCover);
      if (bars) bars.classList.toggle('on', !!playing);
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

  /* ---------------- 页内输入弹层 ----------------
     替代 window.prompt：原生弹窗在移动端样式突兀，也会被部分浏览器拦。 */
  var askEl = null;
  /**
   * @param {Object} [opts] { multiline, hint }
   */
  function askName(title, placeholder, defaultValue, onOk, opts) {
    closeAsk();
    opts = opts || {};
    askEl = document.createElement('div');
    askEl.className = 'mu-modal-mask';
    askEl.innerHTML =
      '<div class="mu-modal-box mu-ask-box">' +
        '<h4 class="mu-modal-title">' + esc(title) + '</h4>' +
        (opts.hint ? '<p class="mu-ask-hint">' + esc(opts.hint) + '</p>' : '') +
        (opts.multiline
          ? '<textarea class="mu-textarea mu-ask-input" id="muAskInput" rows="6" placeholder="' +
            esc(placeholder) + '">' + esc(defaultValue || '') + '</textarea>'
          : '<input class="mu-input mu-ask-input" id="muAskInput" placeholder="' + esc(placeholder) +
            '" value="' + esc(defaultValue || '') + '" maxlength="30">') +
        '<div class="mu-modal-ops">' +
          '<button class="mu-btn" id="muAskCancel">取消</button>' +
          '<button class="mu-btn primary" id="muAskOk">确定</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(askEl);

    var input = askEl.querySelector('#muAskInput');
    var submit = function () {
      var v = input.value.trim();
      closeAsk();
      onOk(v);
    };
    askEl.querySelector('#muAskOk').onclick = submit;
    askEl.querySelector('#muAskCancel').onclick = closeAsk;
    askEl.onclick = function (e) { if (e.target === askEl) closeAsk(); };
    input.onkeydown = function (e) {
      if (e.key === 'Escape') { e.preventDefault(); closeAsk(); return; }
      // 多行模式下 Enter 是换行，Ctrl/Cmd+Enter 才提交
      if (e.key === 'Enter' && (!opts.multiline || e.ctrlKey || e.metaKey)) {
        e.preventDefault(); submit();
      }
    };
    setTimeout(function () { input.focus(); if (!opts.multiline) input.select(); }, 30);
  }
  function closeAsk() {
    if (askEl) { askEl.remove(); askEl = null; }
  }

  /** 页内确认弹层（替代 window.confirm） */
  function askConfirm(title, message, onOk) {
    closeAsk();
    askEl = document.createElement('div');
    askEl.className = 'mu-modal-mask';
    askEl.innerHTML =
      '<div class="mu-modal-box mu-ask-box">' +
        '<h4 class="mu-modal-title">' + esc(title) + '</h4>' +
        '<p class="mu-ask-hint">' + esc(message) + '</p>' +
        '<div class="mu-modal-ops">' +
          '<button class="mu-btn" id="muAskCancel">取消</button>' +
          '<button class="mu-btn danger" id="muAskOk">确定</button>' +
        '</div>' +
      '</div>';
    document.body.appendChild(askEl);
    askEl.querySelector('#muAskOk').onclick = function () { closeAsk(); onOk(); };
    askEl.querySelector('#muAskCancel').onclick = closeAsk;
    askEl.onclick = function (e) { if (e.target === askEl) closeAsk(); };
  }

  /* ---------------- 从分享链接导入歌单 ----------------
     各平台的分享内容通常是「歌名 - 歌手」的若干行，或夹着一堆文案的
     一段文字。这里把能识别的「歌名 - 歌手」逐条搜出来加入歌单，
     不依赖任何平台私有的歌单接口（那些接口大多要登录或被风控）。 */
  function importFromShare() {
    askName('导入歌单', '粘贴歌单分享链接，或一行一首「歌名 - 歌手」', '', function (text) {
      if (!text) return;

      // 先看是不是能直接识别的歌单链接（网易云 / QQ / 酷狗 / 酷我）
      var parsed = parsePlaylistLink(text);
      if (parsed) {
        toast('正在读取「' + parsed.platform + '」歌单…');
        fetchPlaylist(parsed).then(function (res) {
          if (!res || !res.tracks.length) {
            toast('歌单读取失败：' + ((res && res.error) || '没有取到歌曲'));
            return;
          }
          var defName = res.name || ('导入 ' + new Date().toLocaleDateString('zh-CN'));
          askName('命名歌单', '歌单名称', defName, function (name) {
            var list = createList(name || defName);
            if (!list) return;
            addTracksToList(res.tracks, list);
          });
        });
        return;
      }

      // 退回文本解析
      var items = parseShareText(text);
      if (!items.length) {
        toast('没识别到歌单链接或歌曲，试试粘贴分享链接');
        return;
      }
      var defName = '导入 ' + new Date().toLocaleDateString('zh-CN');
      askName('命名歌单', '歌单名称', defName, function (name) {
        var list = createList(name || defName);
        if (!list) return;
        doImport(items, list);
      });
    }, {
      multiline: true,
      hint: '支持网易云 / QQ音乐 / 酷狗 / 酷我 的歌单分享链接；也可以一行一首「歌名 - 歌手」'
    });
  }

  /* ---------------- 歌单链接解析 ---------------- */
  /**
   * 从分享文本里认出平台和歌单 id。
   * 各平台的分享文案形如：
   *   分享歌单: 客 BiscuitNOC https://music.163.com/m/playlist?id=10055264299&creatorId=...
   *   分享歌单: xxx https://y.qq.com/n/ryqq/playlist/7536573821
   *   https://www.kugou.com/yy/special/single/1234567.html
   */
  function parsePlaylistLink(text) {
    var s = String(text || '');

    // 网易云：music.163.com/{m/,}/playlist?id=xxx 或 #/playlist?id=xxx
    var wy = s.match(/music\.163\.com\/(?:[a-z]+\/)?(?:playlist|discover)?[^\s]*?[?&#]id=(\d+)/i) ||
             s.match(/music\.163\.com\/(?:m\/)?playlist\/(\d+)/i);
    if (wy) return { platform: '网易云音乐', kind: 'wy', id: wy[1] };

    // QQ 音乐：y.qq.com/n/ryqq/playlist/{id}、c6.y.qq.com/.../playlist?id=、
    // 以及手机端分享页 i2.y.qq.com/n3/other/pages/details/playlist.html?id=
    // （子域名有 i / i2 / c6 / y 等，统一用 [a-z0-9]*\.y\.qq\.com 兜住）
    var qq = s.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/n\/ryqq\/playlist\/(\d+)/i) ||
             s.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/[^\s]*?playlist[^\s]*?[?&]id=(\d+)/i) ||
             s.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/[^\s]*?[?&]disstid=(\d+)/i) ||
             // 手机端分享页没有 playlist 字样时，任何一个 id= 数字都按歌单 id 试
             s.match(/(?:[a-z0-9]+\.)?y\.qq\.com\/[^\s]*?[?&]id=(\d+)/i);
    if (qq) return { platform: 'QQ音乐', kind: 'tx', id: qq[1] };

    // 酷狗：kugou.com/yy/special/single/{id}.html 或 m.kugou.com/plist/list/{id}
    var kg = s.match(/kugou\.com\/yy\/special\/single\/(\d+)/i) ||
             s.match(/kugou\.com\/plist\/list\/(\d+)/i) ||
             s.match(/kugou\.com\/[^\s]*?specialid=(\d+)/i);
    if (kg) return { platform: '酷狗音乐', kind: 'kg', id: kg[1] };

    // 酷我：kuwo.cn/playlist_detail/{id}
    var kw = s.match(/kuwo\.cn\/playlist_detail\/(\d+)/i) ||
             s.match(/kuwo\.cn\/[^\s]*?playlistId=(\d+)/i);
    if (kw) return { platform: '酷我音乐', kind: 'kw', id: kw[1] };

    return null;
  }

  /** 按平台拉歌单，返回 { name, tracks: [{title, artist, cover}] } */
  function fetchPlaylist(p) {
    if (p.kind === 'wy') return fetchWyPlaylist(p.id);
    if (p.kind === 'tx') return fetchTxPlaylist(p.id);
    // 其它平台暂时走「歌单名 + 搜索」的近似方案
    return Promise.resolve({ name: '', tracks: [], error: p.platform + ' 歌单暂未支持，请改用文本导入' });
  }

  /**
   * QQ 音乐歌单。
   *
   * 老的 c.y.qq.com/fcg-bin/fcg_ucc_getcdinfo_byids_cp.fcg 已经校验
   * Referer，直接调返回 invalid referer；改用 u.y.qq.com 的 musicu.fcg
   * （srfDissInfo.aiDissInfo / uniform_get_Dissinfo），一次就能拿到
   * 歌单名、封面和全部歌曲（实测 141 首），且不需要登录。
   */
  function fetchTxPlaylist(id) {
    var payload = {
      req_1: {
        module: 'music.srfDissInfo.aiDissInfo',
        method: 'uniform_get_Dissinfo',
        param: { disstid: Number(id), enc_host_uin: '', tag: 1, userinfo: 1, is_pc: 1 }
      },
      comm: { ct: 24, cv: 0 }
    };
    var url = 'https://u.y.qq.com/cgi-bin/musicu.fcg?format=json&data=' +
      encodeURIComponent(JSON.stringify(payload));

    return window.LxRequest.httpFetch(url, { timeout: 15000 }).promise.then(function (resp) {
      var d = resp && resp.body && resp.body.req_1 && resp.body.req_1.data;
      if (!d) return { name: '', tracks: [], error: '歌单不存在或已设为私密' };
      var songs = (d.songlist || []).map(normTxTrack).filter(function (x) { return x.title; });
      var dir = d.dirinfo || {};
      return {
        name: dir.title || d.dissname || '',
        cover: dir.picurl || '',
        tracks: songs,
        error: songs.length ? '' : '歌单里没有歌曲'
      };
    }).catch(function (e) {
      return { name: '', tracks: [], error: (e && e.message) || '网络错误' };
    });
  }

  /** QQ 歌曲统一成 { title, artist, cover, interval } */
  function normTxTrack(t) {
    var singers = t.singer || [];
    var album = t.album || {};
    // 封面靠 albumMid 拼，接口里不一定直接给图
    var cover = album.picurl || album.picUrl ||
      (album.mid ? 'https://y.gtimg.cn/music/photo_new/T002R300x300M000' + album.mid + '.jpg' : '');
    return {
      title: String(t.name || t.title || '').trim(),
      artist: singers.map(function (s) { return s.name; }).filter(Boolean).join('、'),
      cover: cover,
      interval: t.interval ? fmtTime(t.interval) : ''
    };
  }

  /** 网易云歌单：v6 detail 给歌单信息 + trackIds，再批量取歌曲详情 */
  function fetchWyPlaylist(id) {
    var detailUrl = 'https://music.163.com/api/v6/playlist/detail?id=' + encodeURIComponent(id);
    return window.LxRequest.httpFetch(detailUrl, {
      timeout: 10000,
      headers: { Referer: 'https://music.163.com/' }
    }).promise.then(function (resp) {
      var pl = resp && resp.body && resp.body.playlist;
      if (!pl) return { name: '', tracks: [], error: '歌单不存在或已设为私密' };
      var ids = (pl.trackIds || []).map(function (x) { return x.id; });
      // detail 里只带前 10 首，其余靠 trackIds 批量查
      var fromTracks = (pl.tracks || []).map(function (t) { return normWyTrack(t); });
      if (!ids.length) return { name: pl.name, tracks: fromTracks };
      return fetchWySongs(ids).then(function (songs) {
        return { name: pl.name, cover: pl.coverImgUrl || '', tracks: songs.length ? songs : fromTracks };
      });
    }).catch(function (e) {
      return { name: '', tracks: [], error: (e && e.message) || '网络错误' };
    });
  }

  /** 网易云 song/detail 一次最多查一批，分批并发 */
  function fetchWySongs(ids) {
    var CHUNK = 200;
    var batches = [];
    for (var i = 0; i < ids.length; i += CHUNK) batches.push(ids.slice(i, i + CHUNK));

    return Promise.all(batches.map(function (batch) {
      var form = 'ids=' + encodeURIComponent(JSON.stringify(batch)) +
        '&c=' + encodeURIComponent(JSON.stringify(batch.map(function (x) { return { id: x }; })));
      return window.LxRequest.httpFetch('https://music.163.com/api/song/detail', {
        method: 'post',
        body: form,
        timeout: 15000,
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          Referer: 'https://music.163.com/'
        }
      }).promise.then(function (r) {
        var songs = (r && r.body && r.body.songs) || [];
        return songs.map(normWyTrack).filter(function (x) { return x.title; });
      }).catch(function () { return []; });
    })).then(function (arrs) {
      // 按原顺序拼回来
      var map = {};
      arrs.forEach(function (arr) {
        arr.forEach(function (t) { if (t.wyId) map[t.wyId] = t; });
      });
      return ids.map(function (id) { return map[id]; }).filter(Boolean);
    });
  }

  /** 统一成 { title, artist, cover, wyId } */
  function normWyTrack(t) {
    var artists = t.ar || t.artists || [];
    var album = t.al || t.album || {};
    return {
      title: String(t.name || '').trim(),
      artist: artists.map(function (a) { return a.name; }).filter(Boolean).join('、'),
      cover: album.picUrl || '',
      wyId: t.id,
      interval: t.dt ? fmtTime(t.dt / 1000) : (t.duration ? fmtTime(t.duration / 1000) : '')
    };
  }

  /** 把平台歌单的歌曲加进本地列表：优先按「歌名+歌手」搜到可播的版本 */
  /**
   * 把平台歌单的歌曲加进本地列表。
   * 关键体验：歌单先建好并立刻切过去，每匹配到一首就实时出现在列表里，
   * 顶部显示「正在导入 12/136」的进度条。之前只在 toast 里报数，
   * 用户根本看不出在导入。
   */
  function addTracksToList(tracks, list) {
    var total = tracks.length;
    if (!total) { toast('歌单里没有歌曲'); return Promise.resolve(); }

    // 重入保护：importState 是模块级单例，第一次导入没结束又点第二次导入时，
    // 新对象会覆盖旧对象；先结束的那次把它置 null 后，仍在跑的 worker
    // 一执行 importState.done++ 就 TypeError，递归链中断、剩余歌曲全丢。
    if (importState && importState.running) {
      toast('已有歌单正在导入，等它完成再试');
      return Promise.resolve();
    }

    // 立刻切到目标歌单并渲染，让用户看到列表已经建好
    activeListId = list.id;
    // 状态对象捕获进闭包：worker 全程读写自己的这份，不碰模块级引用
    var st = importState = { listId: list.id, done: 0, total: total, added: 0, failed: 0, running: true };
    renderHome();

    var CONCURRENCY = 4;
    var cursor = 0;

    function worker() {
      if (cursor >= total) return Promise.resolve();
      var t = tracks[cursor++];
      return window.LxMusic.search((t.title + ' ' + t.artist).trim(), 1)
        .then(function (res) {
          var hit = pickBestMatch(res.list || [], { title: t.title, artist: t.artist });
          if (hit) {
            if (!inList(list.id, { track: hit })) {
              addToList(list.id, {
                id: hit.source + '_' + hit.songmid,
                title: hit.name,
                artist: hit.singer,
                cover: hit.img || t.cover || '',
                source: hit.source,
                interval: hit.interval,
                track: hit
              });
              st.added++;
            }
          } else st.failed++;
        })
        .catch(function () { st.failed++; })
        .then(function () {
          st.done++;
          // 每匹配到一首就把列表画长一点。500 首的歌单如果每首都全量
          // renderHome 是 O(n²)——歌越长越卡。按 500ms 节流，
          // 全部完成时 Promise.all 的回调必定再刷一次，不会少显示。
          if (tab === 'lists' && activeListId === list.id) {
            var nowTick = Date.now();
            if (!st.lastRender || nowTick - st.lastRender > 500) {
              st.lastRender = nowTick;
              renderHome();
            }
          }
          return worker();
        });
    }

    var workers = [];
    for (var i = 0; i < CONCURRENCY; i++) workers.push(worker());

    return Promise.all(workers).then(function () {
      var ok = list.tracks.length;
      var fail = st.failed;
      if (importState === st) importState = null;
      renderHome();
      toast('导入完成：成功 ' + ok + ' 首' + (fail ? '，未匹配 ' + fail + ' 首' : ''));
    }).catch(function (e) {
      // worker 链的意外异常不能让进度条永久挂着
      if (importState === st) importState = null;
      renderHome();
      toast('导入中断：' + ((e && e.message) || 'unknown'));
    });
  }

  /** 从分享文本里抽出 [{title, artist}] */
  function parseShareText(text) {
    var out = [];
    var seen = {};
    String(text).split(/\r?\n/).forEach(function (raw) {
      var line = raw.trim();
      if (!line) return;
      // 去掉常见的分享前缀和装饰
      line = line.replace(/^[\s·•\-—*>#\d.、]+/, '')
                 .replace(/[《》「」“”"]/g, '')
                 .replace(/\s*(分享|来自|复制链接|打开\S*APP|https?:\/\/\S+)\s*/g, ' ')
                 .trim();
      if (!line || line.length > 80) return;
      var title = '', artist = '';
      // 「歌名 - 歌手」/「歌名 – 歌手」/「歌名 — 歌手」
      var m = line.match(/^(.+?)\s*[-–—]\s*(.+)$/);
      if (m) { title = m[1].trim(); artist = m[2].trim(); }
      else {
        // 「歌手 - 歌名」在酷狗分享里也常见，判断不了就整行当歌名搜
        var m2 = line.match(/^(.+?)\s*[·|]\s*(.+)$/);
        if (m2) { title = m2[2].trim(); artist = m2[1].trim(); }
        else title = line;
      }
      title = title.replace(/\s+/g, ' ').trim();
      artist = artist.replace(/\s+/g, ' ').trim();
      if (!title || title.length < 1) return;
      var key = (title + '|' + artist).toLowerCase();
      if (seen[key]) return;
      seen[key] = 1;
      out.push({ title: title, artist: artist });
    });
    return out.slice(0, 100);   // 一次最多导 100 首，避免把接口打爆
  }

  /** 逐条搜索并加入歌单，边导边报进度 */
  function doImport(items, list) {
    if (!window.LxMusic) { toast('音源未就绪'); return; }
    var done = 0, added = 0, failed = 0;
    toast('开始导入 ' + items.length + ' 首…');

    var chain = Promise.resolve();
    items.forEach(function (it, i) {
      chain = chain.then(function () {
        var kw = (it.title + ' ' + it.artist).trim();
        return window.LxMusic.search(kw, 1).then(function (res) {
          var hit = pickBestMatch(res.list || [], it);
          if (hit && !inList(list.id, { track: hit })) {
            addToList(list.id, {
              id: hit.source + '_' + hit.songmid,
              title: hit.name,
              artist: hit.singer,
              cover: hit.img || '',
              source: hit.source,
              interval: hit.interval,
              track: hit
            });
            added++;
          } else if (!hit) failed++;
        }).catch(function () { failed++; }).then(function () {
          done++;
          if (done % 5 === 0 || done === items.length) {
            toast('导入中 ' + done + '/' + items.length + '（成功 ' + added + '）');
          }
        });
      });
    });

    chain.then(function () {
      activeListId = list.id;
      renderHome();
      toast('导入完成：成功 ' + added + ' 首' + (failed ? '，失败 ' + failed + ' 首' : ''));
    });
  }

  /** 在搜索结果里挑最接近的一首 */
  function pickBestMatch(list, want) {
    if (!list.length) return null;
    var t = want.title.toLowerCase();
    var a = want.artist.toLowerCase();
    var exact = null, nameOnly = null;
    for (var i = 0; i < list.length; i++) {
      var it = list[i];
      var nm = String(it.name || '').toLowerCase();
      var ar = String(it.singer || '').toLowerCase();
      var nameHit = nm === t;
      var artistHit = !a || ar.indexOf(a) > -1;
      if (nameHit && artistHit) { exact = it; break; }
      if (!nameOnly && nameHit) nameOnly = it;
    }
    return exact || nameOnly || null;
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
      addTargetIndex = -1; pickTarget = null;
      document.getElementById('muAddListMask').remove();
      return;
    }
    if (!active && !imm) return;
    if (e.code === 'Space') { e.preventDefault(); togglePlay(); }
    else if (e.key === 'ArrowRight' && audio) {
      var baseR = audio.duration ? audio.currentTime : (pendingSeek ? pendingSeek.pos : 0);
      seekTo(baseR + 5);
    }
    else if (e.key === 'ArrowLeft' && audio) {
      var baseL = audio.duration ? audio.currentTime : (pendingSeek ? pendingSeek.pos : 0);
      seekTo(baseL - 5);
    }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setVolume(state.volume + 0.05); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); setVolume(state.volume - 0.05); }
    else if (e.key === 'Escape' && imm) closeImmersive();
  }

  /* ---------------- 还原播放现场 ----------------
     刷新后把队列和进度放回去，但不自动播放：
     浏览器的自动播放策略会拦掉没有用户手势的 play()，
     真去调只会得到一个被拒绝的 Promise 和一条误导性的报错。
     所以还原成「已加载、停在原进度、等用户点播放」。

     也不复用上次存的播放地址：酷我的地址带过期 token，
     放久了再刷新必然 403，只会给用户一条「播放失败」的假警报。
     地址等真正点播放时重新取。 */
  var liveRestored = false;
  // 还原期间禁止进度回写，否则会把存档冲成 0
  var restoringLive = false;
  // 待恢复的播放位置：{ id, pos }，取到新地址后由 playCurrent 应用
  var pendingSeek = null;

  function restoreLive() {
    if (liveRestored) return;
    liveRestored = true;
    var d = readLive();
    if (!d) return;
    restoringLive = true;
    try {
      applyLive(d);
    } finally {
      // 留一拍再解锁：renderHome 会在 init 末尾重建播放条，
      // 期间还会有异步的 durationchange/loadedmetadata 触发 onProgress
      setTimeout(function () { restoringLive = false; }, 1200);
    }
  }

  function applyLive(d) {

    // 过滤失效 objectURL 时必须记下旧下标到新下标的映射：
    // 直接把原 qi 用到过滤后的数组上，当前曲会错位成别人，
    // 存档的进度随后就会被 seek 到那首错误的歌上。
    var srcIdx = [];
    queue = d.queue.map(function (x, i) {
      // 失效的 objectURL 留着只会让点播放时报「格式不支持」
      if (x.kind === 'local' && /^blob:/.test(x.url || '')) return null;
      srcIdx.push(i);
      return x;
    }).filter(Boolean);

    if (!queue.length) { clearLive(); return; }
    qName = d.name || '';
    var mappedQi = srcIdx.indexOf(d.qi);
    qi = mappedQi >= 0 ? mappedQi
      : (typeof d.qi === 'number' && d.qi >= 0 && d.qi < queue.length) ? d.qi : 0;
    cur = queue[qi];
    if (!cur) { clearLive(); return; }

    // 队列里存下来的地址一律作废，播放时重新取
    queue.forEach(function (x) { if (x.kind !== 'link') x.url = ''; });

    var pos = Math.max(0, Number(d.pos) || 0);    knownPos = pos;         // 存档进度先记下，避免被 0 覆盖
    lastSavedSec = Math.floor(pos);
    if (pos > 0) pendingSeek = { id: cur.id, pos: pos };

    // 存档时间：超过 6 小时就不再提示「上次听到这里」，
    // 隔夜回来看到停在半首歌反而奇怪
    var stale = d.at && (Date.now() - d.at > 6 * 3600 * 1000);
    if (stale) pendingSeek = null;

    updateMediaSession();
    syncPlayUI(false);      // 暂停态：按钮显示播放三角
    syncBarMeta();
    syncBarVisibility();
    renderIfActive();
    renderMini();
    loadLyricFor(cur);
    loadCoverFor(cur);
  }

  function clearLive() {
    try { localStorage.removeItem(LIVE_KEY); } catch (e) {}
  }

  /** 模块接口 ---------------- */
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
        addTargetIndex = -1; pickTarget = null;
        var mask = document.getElementById('muAddListMask');
        if (mask) mask.remove();
        setTimeout(syncBarVisibility, 60);
        setTimeout(syncBarVisibility, 400);
      });
      /* 离开/隐藏页面时立刻落盘一次。
         timeupdate 的节流最多会丢 2 秒进度，直接关标签页时更是一点都存不下。
         注意：这里必须用 knownPos，不能在 pagehide 里重读 audio.currentTime——
         页面卸载时媒体元素可能已被浏览器拆掉，currentTime 会归零，
         写下去的成了 0，刷新后进度就全丢了（这个坑真的踩过）。
         visibilitychange 比 beforeunload 在移动端更可靠。 */
      var flushLive = function () {
        // 播放中才更新已知进度；暂停时 audio.currentTime 是可信的
        if (audio && !audio.paused && isFinite(audio.currentTime) && audio.currentTime > 0) {
          knownPos = Math.floor(audio.currentTime);
        }
        saveLive();
      };
      window.addEventListener('pagehide', flushLive);
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'hidden') flushLive();
      });
      /* 用户按 ESC 退出浏览器原生全屏时，沉浸页要跟着关——
         否则全屏没了，页面还罩着一层沉浸遮罩，看起来像坏了。
         closeImmersive 自己触发的 fullscreenchange 会因 immEl 已空而短路。 */
      var onFsChange = function () {
        if (!isFsActive() && immEl) closeImmersive();
      };
      document.addEventListener('fullscreenchange', onFsChange);
      document.addEventListener('webkitfullscreenchange', onFsChange);

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
      restoreLive();

      /* 首次进入时加载内置音源脚本 + 用户导入的脚本。
         内置脚本随包发布，开箱即可播放；用户导入的追加在后面。
         注意：9 个脚本是串行加载的，个别失效脚本要等满 12s 超时，
         全链可能拖到一分钟以上。所以用一个轮询把「已加载 N 个」
         边加载边刷出来，而不是等 Promise 链结束。 */
      if (window.LxMusic) {
        srcLoading = true;
        var hadSource = false;
        var pollTimer = setInterval(function () {
          syncSourceStatus();
          var n = window.LxMusic.listLoaded().length;
          if (n > 0) srcLoading = false;
          // 音源从「没有」变成「有」的那一刻，搜索页的警告条要撤掉；
          // renderHome 会保留输入框的值和焦点，不会打断打字
          if (n > 0 && !hadSource) {
            hadSource = true;
            if (tab === 'search') renderHome();
          }
        }, 800);
        window.LxMusic.loadBuiltinScripts()
          .then(function () { return window.LxMusic.loadSavedScripts(); })
          .then(function () {
            clearInterval(pollTimer);
            srcLoading = false;
            syncSourceStatus();
            if (tab === 'script' || tab === 'search') renderHome();
            renderMini();
          })
          .catch(function (e) {
            clearInterval(pollTimer);
            srcLoading = false;
            syncSourceStatus();
            console.warn('[LxMusic] 音源加载失败', e);
          });
      }
    }
    renderHome();
    // renderHome 会重建整个播放条，上面还原时写进去的时间节点会被换成
    // 新的 0:00；所以时间要在重建之后补一次
    showRestoredTime();
  }

  /** 地址还没取到时，先把存档进度显示在播放条上 */
  function showRestoredTime() {
    if (!pendingSeek) return;
    onProgress();
  }

  function restoreView() { renderHome(); showRestoredTime(); }

  function destroy() {
    /* 只卸模块级 UI；audio / 迷你条 / 键盘监听保留——跨模块继续播放 */
    closeImmersive();
    closeAsk();
    // 队列面板也挂在 body 上：不在沉浸模式时 closeImmersive 会提前返回，
    // 面板的全屏遮罩会跟着用户走到别的模块
    closeQueuePanel();
    // 弹层挂在 body 上、z=500，离开模块后没人会清它，会挡住整个页面
    addTargetIndex = -1; pickTarget = null;
    var mask = document.getElementById('muAddListMask');
    if (mask) mask.remove();
    renderMini();
  }

  window.AppMusic = { init: init, restoreView: restoreView, destroy: destroy };

})();
