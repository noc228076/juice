/* === js/modules/tv.js === */
/* =========================================================
   模块 13：电视直播 (Live TV)
   央视频道站内播放（hls.js + 原生 HLS 双引擎），卫视频道跳转官网。
   频道数据：js/data/tv-channels.json（源：xiao.bu.tv 1.8.1 内置表）
   ========================================================= */

(function () {
  'use strict';

  const HLS_SRC = 'js/vendor/hls-1.7.3.min.js';
  const DATA_SRC = 'js/data/tv-channels.json';

  let inited = false;
  let data = null;
  let curGroup = '央视频道';
  let curChannel = null;

  /* 播放器状态 */
  let hls = null;
  let video = null;
  let wrap = null;
  let engine = '';            // 'hlsjs' | 'native' | ''
  let attempt = 0;            // 重连次数
  let mediaFixes = 0;
  let retryTimer = 0;
  let healthyTimer = 0;
  let watchdogTimer = 0;
  let lastTime = 0;
  let stalledSince = 0;
  let generation = 0;         // 丢弃过期的异步回调（切台竞态）
  let volumeInited = false;   // 音量只在首次进入时初始化
  let active = false;         // 模块是否仍处于激活状态

  const MAX_ATTEMPT = 6;

  /* ---------- hls.js 懒加载 ---------- */
  let hlsLoader = null;
  function loadHls() {
    if (window.Hls) return Promise.resolve(window.Hls);
    if (hlsLoader) return hlsLoader;
    hlsLoader = new Promise(function (resolve, reject) {
      const s = document.createElement('script');
      s.src = HLS_SRC;
      s.async = true;
      s.onload = function () {
        window.Hls ? resolve(window.Hls) : reject(new Error('hls.js 加载后未挂载 Hls'));
      };
      s.onerror = function () { s.remove(); reject(new Error('hls.js 加载失败')); };
      document.head.appendChild(s);
    }).catch(function (e) {
      hlsLoader = null;      // 允许重试
      throw e;
    });
    return hlsLoader;
  }

  /* ---------- 引擎选择 ---------- */
  /* 引擎选择：hls.js 优先，原生兜底。
     实测（真实浏览器日志）：
     - 原生 HLS 能解析、时间也在走，但画面是绿色乱码（平台解码路径异常）；
     - hls.js 本来因 codec 字符串 avc1.64011e 被 MSE 拒收而黑屏，
       打上 constraint 字节归零的补丁后可以正常出画面（readyState=4）。
     所以只要 MSE 可用就走 hls.js；只有它不可用（iOS 16 及以下）才退回原生。 */
  function pickEngine(v) {
    if (window.Hls && window.Hls.isSupported()) return 'hlsjs';
    if (v.canPlayType('application/vnd.apple.mpegurl') !== '') return 'native';
    return 'unsupported';
  }

  function canNativeHls(v) {
    return v.canPlayType('application/vnd.apple.mpegurl') !== '';
  }

  /* hls.js 从 SPS 推导 codec 时会把 constraint flags 写进字符串
     （这些源给的是 avc1.64011e），但多数浏览器的 MSE 只认 constraint=00
     的写法（avc1.64001e），于是 addSourceBuffer 直接抛
     「The type provided is unsupported」，整条流黑屏。
     在 MSE 层把 constraint 字节归零，是唯一可靠的修正点：
     改 hls.levels[i].videoCodec 已经太晚（attachMedia 时 SourceBuffer 就建好了）。 */
  const AVC_CONSTRAINT_RE = /avc1\.([0-9a-fA-F]{2})[0-9a-fA-F]{2}([0-9a-fA-F]{2})/g;
  function normalizeAvcCodec(type) {
    return String(type).replace(AVC_CONSTRAINT_RE, function (m, profile, level) {
      return 'avc1.' + profile + '00' + level;
    });
  }

  let msePatched = false;
  function patchMseCodec() {
    if (msePatched || !window.MediaSource || !MediaSource.prototype.addSourceBuffer) return;
    const orig = MediaSource.prototype.addSourceBuffer;
    MediaSource.prototype.addSourceBuffer = function (type) {
      const fixed = normalizeAvcCodec(type);
      return orig.call(this, fixed);
    };
    msePatched = true;
  }

  function liveConfig() {
    return {
      lowLatencyMode: true,
      liveSyncDurationCount: 3,
      liveMaxLatencyDurationCount: 8,
      maxLiveSyncPlaybackRate: 1.1,
      maxBufferLength: 30,
      maxMaxBufferLength: 60,
      backBufferLength: 30,
      liveDurationInfinity: true,
      enableWorker: true,
      capLevelToPlayerSize: true,
      startOnSegmentBoundary: true
    };
  }

  /* ---------- 状态提示 ---------- */
  function setStatus(text, kind) {
    const el = document.getElementById('tvStatus');
    if (!el) return;
    el.textContent = text || '';
    el.className = 'tv-status' + (kind ? ' ' + kind : '');
    el.hidden = !text;
  }

  /* ---------- 清理 ---------- */
  /* resetCounters=false 用于 rebuild：保留 attempt 计数，
     否则 MAX_ATTEMPT 永远触发不了，会变成无限重建死循环。 */
  function teardown(resetCounters) {
    generation++;
    clearTimeout(retryTimer); retryTimer = 0;
    clearTimeout(healthyTimer); healthyTimer = 0;
    clearInterval(watchdogTimer); watchdogTimer = 0;
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }
    engine = '';
    if (resetCounters !== false) { attempt = 0; mediaFixes = 0; }
    stalledSince = 0; lastTime = 0;
    if (video) {
      video.onerror = null;                // 防止原生错误处理器残留
      try { video.pause(); } catch (e) {}
      video.removeAttribute('src');
      try { video.load(); } catch (e) {}   // 真正释放解码器
    }
  }

  /* ---------- 断流重连 ---------- */
  function scheduleReconnect() {
    clearTimeout(retryTimer); retryTimer = 0;   // 防止多个重连定时器叠加
    attempt++;
    if (attempt > MAX_ATTEMPT) {
      setStatus('这个频道暂时连不上，换一个试试', 'err');
      return;
    }
    const base = Math.min(30000, 1000 * Math.pow(2, attempt - 1));
    const delay = base + Math.floor(Math.random() * 500);
    setStatus('信号中断，' + Math.round(delay / 1000) + ' 秒后重连（第 ' + attempt + ' 次）', 'warn');
    const gen = generation;
    retryTimer = setTimeout(function () {
      if (gen !== generation) return;
      if (attempt <= 2 && hls) {
        try { hls.startLoad(-1); } catch (e) { rebuild(); }
      } else {
        rebuild();
      }
    }, delay);
  }

  function markHealthy() {
    clearTimeout(healthyTimer);
    healthyTimer = setTimeout(function () { attempt = 0; mediaFixes = 0; }, 60000);
  }

  /* ---------- 播放 ---------- */
  function play(url, name) {
    teardown();
    const gen = generation;
    setStatus('正在连接 ' + name + '…', '');

    video = document.getElementById('tvVideo');
    wrap = document.getElementById('tvStage');
    if (!video) return;

    // 每次播放前重置
    /* 首次进入以静音起播：浏览器允许静音自动播放，
       未静音会被策略拦截并可能表现为「时间在走但没画面」。
       用户手动调音量/取消静音后不再重置。 */
    if (!volumeInited) {
      volumeInited = true;
      video.muted = true;
      video.volume = 1;
      const volume = document.getElementById('tvVolume');
      if (volume) volume.value = '1';
      const muteBtn = document.getElementById('tvMute');
      if (muteBtn) {
        muteBtn.textContent = '🔇';
        muteBtn.setAttribute('aria-label', '取消静音');
        muteBtn.setAttribute('aria-pressed', 'true');
      }
    }
    const qEl = document.getElementById('tvQuality');
    if (qEl) qEl.textContent = '自动';

    const start = function () {
      if (gen !== generation) return;   // 已切台
      const eng = pickEngine(video);
      if (eng === 'unsupported') {
        setStatus('当前浏览器不支持播放这个频道，可点「在央视频打开」', 'err');
        return;
      }
      engine = eng;
      if (eng === 'native') {
        /* 只设 src，不要紧跟 load()：
           load() 会中止刚刚发起的 play()，抛 AbortError 并让 currentTime 永远停在 0
           （表现就是黑屏/花屏但 readyState 已经是 3）。 */
        video.src = url;
        video.play().catch(function (err) {
          if (err && err.name === 'AbortError') return;   // 被后续操作打断，忽略
          setStatus('点一下播放按钮开始', 'warn');
        });
        // 原生播放失败（404/解码错误）→ 尝试 hls.js 兜底
        video.onerror = function () {
          if (gen !== generation) return;
          // 原生失败 → 真正去加载 hls.js 兜底（之前只判断 window.Hls，那时它还没加载）
          if (window.Hls && window.Hls.isSupported()) {
            setStatus('切换播放引擎重试…', 'warn');
            startHls(url, gen);
            return;
          }
          setStatus('切换播放引擎重试…', 'warn');
          loadHls().then(function () {
            if (gen !== generation) return;
            if (window.Hls && window.Hls.isSupported()) startHls(url, gen);
            else setStatus('这个频道暂时没信号，换一个试试', 'err');
          }).catch(function () {
            if (gen !== generation) return;
            setStatus('这个频道暂时没信号，换一个试试', 'err');
          });
        };
        afterStart();
      } else {
        startHls(url, gen);
      }
    };

    /* hls.js 优先（能修正 codec 字符串，原生路径会出绿色花屏）。
       仅当 MSE 完全不可用（iOS 16 及以下）时才退回原生。 */
    const mseOk = !!(window.MediaSource && window.MediaSource.isTypeSupported &&
      window.MediaSource.isTypeSupported('video/mp4; codecs="avc1.42E01E"'));
    if (!mseOk && canNativeHls(video)) {
      start();          // iOS 老版本：只能原生
      return;
    }
    loadHls().then(start).catch(function () {
      if (gen !== generation) return;
      // hls.js 拉不到时，原生能播就退回原生（可能花屏，但至少不是黑屏）
      if (canNativeHls(video)) {
        video.src = url;
        video.play().catch(function () {});
        afterStart();
      } else {
        setStatus('播放组件加载失败，检查网络后重试', 'err');
      }
    });
  }

  function startHls(url, gen) {
    const Hls = window.Hls;
    if (!Hls || gen !== generation) return;
    patchMseCodec();   // 修正 avc1.xxxxxx 的 constraint 字节，否则 MSE 拒收
    if (hls) { try { hls.destroy(); } catch (e) {} hls = null; }  // 避免双实例
    if (video) video.onerror = null;                              // 切断原生错误链
    hls = new Hls(liveConfig());
    hls.loadSource(url);
    hls.attachMedia(video);

    hls.on(Hls.Events.MANIFEST_PARSED, function () {
      if (gen !== generation) return;
      video.play().catch(function () {
        setStatus('点一下播放按钮开始', 'warn');
      });
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, function () {
      if (gen !== generation) return;
      const lv = hls.levels && hls.levels[hls.currentLevel];
      const q = document.getElementById('tvQuality');
      if (q && lv) q.textContent = lv.height ? (lv.height + 'p') : '自动';
    });

    hls.on(Hls.Events.ERROR, function (evt, d) {
      if (gen !== generation) return;
      if (!d.fatal) return;

      if (d.type === Hls.ErrorTypes.MEDIA_ERROR) {
        const now = Date.now();
        mediaFixes++;
        if (mediaFixes > 2) { rebuild(); return; }
        if (now - (startHls.lastFix || 0) > 5000) {
          startHls.lastFix = now;
          hls.recoverMediaError();
        } else {
          hls.swapAudioCodec();
          hls.recoverMediaError();
        }
        return;
      }

      if (d.type === Hls.ErrorTypes.NETWORK_ERROR) {
        // 清单本身挂了：重试无意义
        if (d.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
            d.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
            d.details === Hls.ErrorDetails.LEVEL_EMPTY_ERROR) {
          setStatus('这个频道暂时没信号，换一个试试', 'err');
          return;
        }
        scheduleReconnect();
        return;
      }

      rebuild();
    });

    afterStart();
  }

  function rebuild() {
    if (!curChannel || curChannel.play !== 'hls') return;
    if (attempt >= MAX_ATTEMPT) {
      teardown();                            // 彻底停下，watchdog 不再拉起
      setStatus('这个频道暂时连不上，换一个试试', 'err');
      return;
    }
    teardown(false);                         // 保留计数
    attempt++;
    setStatus('正在恢复信号…（第 ' + attempt + ' 次）', 'warn');
    play(curChannel.url, curChannel.name);
  }

  function afterStart() {
    setStatus('', '');
    /* 3 秒后仍无可用帧 → 多半是自动播放被策略拦，给用户明确指引 */
    setTimeout(function () {
      if (!video || video.readyState >= 2) return;
      if (video.paused) return;   // 已经是暂停态，由 play() 的 catch 处理
      setStatus('点一下播放按钮开始', 'warn');
    }, 3000);
    // 看门狗：15 秒 currentTime 不前进就重建
    clearInterval(watchdogTimer);
    lastTime = 0; stalledSince = 0;
    watchdogTimer = setInterval(function () {
      if (!video || video.paused) { stalledSince = 0; return; }
      const t = video.currentTime;
      if (t !== lastTime) { lastTime = t; stalledSince = 0; return; }
      if (!stalledSince) stalledSince = Date.now();
      else if (Date.now() - stalledSince > 15000) { stalledSince = 0; rebuild(); }
    }, 1000);
  }

  function renderGroups() {
    if (!data) return;
    const groups = [];
    data.channels.forEach(function (c) { if (groups.indexOf(c.group) < 0) groups.push(c.group); });
    const gbox = document.getElementById('tvGroups');
    if (!gbox) return;
    gbox.innerHTML = groups.map(function (g) {
      const n = data.channels.filter(function (c) { return c.group === g; }).length;
      return '<button type="button" class="tv-group' + (g === curGroup ? ' active' : '') +
        '" data-g="' + esc(g) + '">' + esc(g) + ' <b>' + n + '</b></button>';
    }).join('');
    gbox.querySelectorAll('[data-g]').forEach(function (b) {
      b.onclick = function () {
        curGroup = b.getAttribute('data-g');
        gbox.querySelectorAll('.tv-group').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        renderList();
      };
    });
  }

  /* ---------- 频道列表 ---------- */
  function renderList() {
    const box = document.getElementById('tvList');
    if (!box || !data) return;
    const list = data.channels.filter(function (c) { return c.group === curGroup; });
    box.innerHTML = list.map(function (c) {
      const on = curChannel && curChannel.id === c.id;
      const badge = c.play === 'hls'
        ? '<span class="tv-badge live">可直播</span>'
        : '<span class="tv-badge ext">官网</span>';
      return '<button type="button" class="tv-ch' + (on ? ' active' : '') +
        '" data-id="' + esc(c.id) + '">' +
        '<span class="tv-ch-name">' + esc(c.name) + '</span>' + badge +
        '</button>';
    }).join('');
    box.querySelectorAll('[data-id]').forEach(function (b) {
      b.onclick = function () { pick(b.getAttribute('data-id')); };
    });
  }

  function pick(id) {
    if (!data) return;
    const c = data.channels.filter(function (x) { return x.id === id; })[0];
    if (!c) return;
    curChannel = c;
    if (window.SFX && window.SFX.tap) window.SFX.tap();

    document.querySelectorAll('.tv-ch').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-id') === id);
    });

    const title = document.getElementById('tvNow');
    if (title) title.textContent = c.name;

    const ext = document.getElementById('tvExtLink');
    const safeWeb = /^https:\/\//i.test(c.webview || '') ? c.webview : '';
    if (ext) {
      if (safeWeb) { ext.href = safeWeb; ext.hidden = false; }
      else ext.hidden = true;
    }

    if (c.play === 'hls' && c.url) {
      play(c.url, c.name);
    } else {
      // 只有官网链接：提示并自动打开
      teardown();
      setStatus('该频道仅提供央视频官网入口，已为你打开新标签', 'warn');
      if (safeWeb) window.open(safeWeb, '_blank', 'noopener');
    }
  }

  function esc(s) {
    return String(s || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ---------- 控制条 ---------- */
  function bindControls() {
    const playBtn = document.getElementById('tvPlay');
    if (playBtn) playBtn.onclick = function () {
      if (!video) return;
      if (video.paused) video.play().catch(function () {});
      else video.pause();
    };

    if (video) {
      video.addEventListener('play', function () { syncPlayIcon(true); });
      video.addEventListener('pause', function () { syncPlayIcon(false); });
      video.addEventListener('playing', markHealthy);
      video.addEventListener('click', function () {
        if (video.paused) video.play().catch(function () {}); else video.pause();
      });
    }

    const vol = document.getElementById('tvVolume');
    if (vol) vol.oninput = function () {
      if (!video) return;
      video.volume = Number(vol.value);
      video.muted = Number(vol.value) === 0;
    };

    const muteBtn = document.getElementById('tvMute');
    if (muteBtn) muteBtn.onclick = function () {
      if (!video) return;
      video.muted = !video.muted;
      muteBtn.textContent = video.muted ? '🔇' : '🔊';
      muteBtn.setAttribute('aria-label', video.muted ? '取消静音' : '静音');
      muteBtn.setAttribute('aria-pressed', video.muted ? 'true' : 'false');
      if (vol) vol.value = video.muted ? '0' : String(video.volume || 1);
    };

    const fs = document.getElementById('tvFullscreen');
    if (fs) fs.onclick = function () {
      if (!wrap) return;
      if (wrap.classList.contains('is-pseudo-fullscreen')) {
        wrap.classList.remove('is-pseudo-fullscreen');
        return;
      }
      if (document.fullscreenElement || document.webkitFullscreenElement) {
        if (document.exitFullscreen) document.exitFullscreen();
        else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
        return;
      }
      if (wrap.requestFullscreen) wrap.requestFullscreen().catch(function () {});
      else if (wrap.webkitRequestFullscreen) wrap.webkitRequestFullscreen();
      else if (video && video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      else wrap.classList.add('is-pseudo-fullscreen');
    };
  }

  document.addEventListener('fullscreenchange', function () {
    if (!document.fullscreenElement && wrap) wrap.classList.remove('is-pseudo-fullscreen');
  });

  function syncPlayIcon(playing) {
    const b = document.getElementById('tvPlay');
    if (b) b.textContent = playing ? '⏸' : '▶';
  }

  /* ---------- 初始化 ---------- */
  function init() {
    if (inited) return;
    inited = true;
    active = true;

    const body = document.getElementById('tvBody');
    if (!body) return;

    video = document.getElementById('tvVideo');
    wrap = document.getElementById('tvStage');
    bindControls();

    /* 已有数据（二次进入）：直接重绘，不再重复 fetch */
    if (data) {
      renderGroups();
      renderList();
      if (curChannel) pick(curChannel.id);
      else {
        const first = data.channels.filter(function (c) { return c.play === 'hls'; })[0];
        if (first) pick(first.id);
      }
      return;
    }

    fetch(DATA_SRC + '?v=' + Date.now(), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!active) return;              // 离开页面后不再开播
        data = d;
        renderGroups();
        renderList();
        // 自动选第一个可播频道
        const first = d.channels.filter(function (c) { return c.play === 'hls'; })[0];
        if (first) pick(first.id);
        else setStatus('没有可站内播放的频道', 'err');
      })
      .catch(function () {
        setStatus('频道列表加载失败，刷新重试', 'err');
      });

    document.addEventListener('visibilitychange', function () {
      if (document.hidden && video && !video.paused) video.pause();
    });
  }

  function destroy() {
    teardown();
    active = false;
    volumeInited = false;
    curChannel = null;
    inited = false;                      // 允许再次 init
    setStatus('', '');
    syncPlayIcon(false);
    const q = document.getElementById('tvQuality');
    if (q) q.textContent = '自动';
    const now = document.getElementById('tvNow');
    if (now) now.textContent = '未选择频道';
    const ext = document.getElementById('tvExtLink');
    if (ext) { ext.hidden = true; ext.removeAttribute('href'); }
    document.querySelectorAll('#tvList .tv-ch.active').forEach(function (b) {
      b.classList.remove('active');
    });
  }

  window.AppTv = { init: init, destroy: destroy };
})();
