/* =========================================================
   洛雪音源内核 · juice 接入层
   ---------------------------------------------------------
   把洛雪的能力（多平台搜索 + 音源脚本取播放地址）暴露给
   juice 的 music 模块，同时保持 juice 自己的 UI 与存储。

   对外接口：
     LxMusic.ready()                    → 注册所有平台
     LxMusic.search(keyword, page)      → { list, bySource, errors }
     LxMusic.resolveUrl(track)          → 音频 URL（走音源脚本）
     LxMusic.importScript(text)         → 导入音源脚本（存 localStorage）
     LxMusic.listScripts() / removeScript(id)
     LxMusic.loadSavedScripts()         → 启动时恢复
   ========================================================= */
(function (root) {
  'use strict';

  var LS_KEY = 'juice_lx_sources_v1';
  var ready = false;

  function registerAll() {
    if (ready) return;
    root.LxSources.register(root.LxSourceKw);
    root.LxSources.register(root.LxSourceKg);
    root.LxSources.register(root.LxSourceTx);
    // 网易需要 AES-128-ECB 的 eapi 签名，当前实现未通过标准测试向量校验，
    // 先不启用，避免返回空结果干扰用户体验。其余四个平台覆盖足够。
    root.LxSources.register(root.LxSourceMg);
    ready = true;
  }

  /* ---------------- 音源脚本持久化 ---------------- */
  function loadStore() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      var list = raw ? JSON.parse(raw) : [];
      return Array.isArray(list) ? list : [];
    } catch (e) {
      return [];
    }
  }

  function saveStore(list) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(list)); } catch (e) {}
  }

  function listScripts() {
    return loadStore().map(function (s) {
      return { id: s.id, name: s.name, version: s.version, enabled: s.enabled !== false };
    });
  }

  /** 导入脚本，返回 { id, name, version } */
  function importScript(text) {
    if (!text || !String(text).trim()) return Promise.reject(new Error('脚本内容为空'));
    // 与洛雪一致的头部校验，拦住「文件读成字节串」这类问题
    if (!/^\s*\/\*[\s\S]+?\*\//.test(text)) {
      return Promise.reject(new Error('无效的音源文件：缺少 /*! ... */ 头部注释'));
    }

    var info = root.LxSandbox.parseScriptInfo(text);
    var list = loadStore();
    // 按脚本内容去重
    var existing = list.filter(function (s) { return s.script === text; })[0];
    var entry = {
      id: existing ? existing.id : ('src_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6)),
      name: info.name,
      version: info.version,
      script: text,
      enabled: true
    };
    if (existing) {
      list = list.map(function (s) { return s.id === existing.id ? entry : s; });
    } else {
      list.push(entry);
    }
    saveStore(list);

    return root.LxSandbox.load(text).then(function (loaded) {
      return { id: entry.id, name: loaded.name, version: loaded.version, sources: loaded.sources };
    });
  }

  function removeScript(id) {
    var list = loadStore();
    var target = list.filter(function (s) { return s.id === id; })[0];
    if (target) root.LxSandbox.removeByName(target.name, target.version);
    saveStore(list.filter(function (s) { return s.id !== id; }));
  }

  /** 启动时恢复所有已保存的音源脚本 */
  function loadSavedScripts() {
    var list = loadStore().filter(function (s) { return s.enabled !== false; });
    if (!list.length) return Promise.resolve([]);

    var results = [];
    var chain = Promise.resolve();
    list.forEach(function (item) {
      chain = chain.then(function () {
        return root.LxSandbox.load(item.script)
          .then(function (r) { results.push({ ok: true, name: r.name, sources: r.sources }); })
          .catch(function (e) { results.push({ ok: false, name: item.name, error: (e && e.message) || String(e) }); });
      });
    });
    return chain.then(function () { return results; });
  }

  /* ---------------- 内置音源脚本 ---------------- */
  /**
   * 内置脚本随包发布，用户无需手动导入即可播放。
   * 全部加载一遍，成功的进入沙箱，失败的静默跳过（不同脚本适配不同平台，
   * 有的可能已失效，但不影响其他脚本工作）。
   */
  function loadBuiltinScripts() {
    var data = root.LX_BUILTIN_SOURCES;
    if (!Array.isArray(data) || !data.length) return Promise.resolve({ ok: 0, fail: 0 });

    var ok = 0, fail = 0;
    var chain = Promise.resolve();
    data.forEach(function (item) {
      chain = chain.then(function () {
        return root.LxSandbox.load(item.script)
          .then(function () { ok++; })
          .catch(function () { fail++; });
      });
    });
    return chain.then(function () {
      console.log('[LxMusic] 内置音源: ' + ok + ' 个加载成功，' + fail + ' 个失败');
      return { ok: ok, fail: fail };
    });
  }

  /* ---------------- 搜索 ---------------- */
  /**
   * 多平台搜索
   * @param {string} keyword
   * @param {number} page
   * @returns {Promise<{list:Array, bySource:Object, errors:Array}>}
   */
  function search(keyword, page, onProgress) {
    registerAll();
    return root.LxSources.searchAll(keyword, page || 1, 30, onProgress);
  }

  /** 搜索联想（平台热词 + 本地历史合并） */
  function tipSearch(kw) {
    var remote = root.LxTipSearch ? root.LxTipSearch.tipSearch(kw) : Promise.resolve([]);
    return remote.catch(function () { return []; });
  }

  /* ---------------- 播放地址 ---------------- */
  /**
   * 解析播放地址。
   * 有音源脚本时走脚本（返回完整歌曲），否则返回 null 由调用方提示。
   * @param {Object} track 搜索结果项（含 source/songmid/hash/...）
   * @param {string} quality
   * @returns {Promise<string>}
   */
  /**
   * 取播放地址。
   *
   * 必须串行：音源脚本跑在同一个 iframe 里，内部会用模块级变量缓存
   * musicId/url。实测连续快速请求两首不同的歌，第二首会返回第一首的
   * 地址（「显示可惜没如果、放的却是唯一」就是这么来的）。
   *
   * 但光串行不够：有的脚本（实测「K×H测试」）无论请求哪首，都回同一个
   * 地址，而且不报错。getMusicUrl 原本是「第一个不报错就用」，于是坏脚本
   * 永远胜出。所以这里逐脚本询问，并用真实音频时长和搜索结果里的时长对
   * 一遍——对不上就换下一个脚本，并给该脚本记一次失败，下次排到最后。
   */
  var resolveChain = Promise.resolve();
  // 取址请求序号：只有最新的那次需要真的去问脚本
  var resolveSeq = 0;
  // 脚本名 → 校验失败次数；用来把不可靠脚本排到候选末尾
  var scriptPenalty = {};

  /** 搜索结果里的 interval（"04:19"）换算成秒 */
  function intervalSec(track) {
    var parts = String(track.interval || '').split(':').map(Number);
    if (parts.length < 2 || parts.some(isNaN)) return 0;
    return parts.length === 3
      ? parts[0] * 3600 + parts[1] * 60 + parts[2]
      : parts[0] * 60 + parts[1];
  }

  /**
   * 只读元数据探测时长（正常只拉几 KB）。
   * 返回秒数；-1 加载失败、-2 超时——这两种都当作「无法校验」，
   * 不能因此否掉一个可能正确的地址。
   *
   * 4 秒足够：这是个本地探测，不是流式下载。原来给 7 秒，
   * 碰上要逐个脚本重试的场景会明显拖长等待。
   */
  function probeDuration(url) {
    return new Promise(function (resolve) {
      var a = document.createElement('audio');
      var done = false;
      var timer = setTimeout(function () { finish(-2); }, 4000);
      function finish(v) {
        if (done) return;
        done = true;
        clearTimeout(timer);
        a.onloadedmetadata = null;
        a.onerror = null;
        try { a.src = ''; } catch (e) {}
        resolve(v);
      }
      a.preload = 'metadata';
      a.onloadedmetadata = function () { finish(isFinite(a.duration) ? a.duration : -1); };
      a.onerror = function () { finish(-1); };
      a.src = url;
    });
  }

  function resolveUrl(track, quality) {
    if (!root.LxSandbox.hasAny()) {
      return Promise.reject(new Error('尚未导入音源脚本，无法获取播放地址'));
    }
    // 连点下一首时会排起一长串请求，实际只有最后一次点击有意义。
    // 每次调用递增序号，排队到自己时发现已被更新的请求取代就直接放弃，
    // 避免「点了 5 下要等 5 轮取址」。
    var mySeq = ++resolveSeq;
    var musicInfo = {
      songmid: track.songmid,
      songId: track.songmid,
      hash: track.hash,
      albumId: track.albumId,
      albumAudioId: track.albumAudioId,
      copyrightId: track.copyrightId,
      strMediaMid: track.strMediaMid,
      name: track.name,
      singer: track.singer,
      // 洛雪的 kg / tx 脚本要靠 _types[quality] 里的 hash / strMediaMid 取地址，
      // 只给顶层字段它们会取不到
      types: track.types,
      _types: track._types
    };
    var expected = intervalSec(track);

    var task = resolveChain.then(function () {
      // 排队期间用户又点了别的歌，这次请求已经没意义，别再占着脚本
      if (mySeq !== resolveSeq) {
        throw new Error('已被更新的取址请求取代');
      }
      var list = root.LxSandbox.candidatesFor
        ? root.LxSandbox.candidatesFor(track.source)
        : [];
      if (!list.length) {
        return root.LxSandbox.getMusicUrl(track.source, musicInfo, quality || '128k');
      }
      // 失败过的脚本排后面，稳定脚本优先
      list = list.slice().sort(function (a, b) {
        return (scriptPenalty[a.scriptInfo.name] || 0) - (scriptPenalty[b.scriptInfo.name] || 0);
      });

      var errors = [];
      function attempt(i) {
        if (i >= list.length) {
          return Promise.reject(new Error(errors.join('；') || '没有音源返回可用地址'));
        }
        var sb = list[i];
        var next = function (why) {
          errors.push(sb.scriptInfo.name + ': ' + why);
          return attempt(i + 1);
        };
        return root.LxSandbox.getMusicUrlFrom(sb, track.source, musicInfo, quality || '128k').then(function (url) {
          if (!url) return next('空地址');
          // 没有可比对的时长就只能信它
          if (!expected) return url;
          return probeDuration(url).then(function (dur) {
            if (dur <= 0 || Math.abs(dur - expected) <= 5) return url;
            scriptPenalty[sb.scriptInfo.name] = (scriptPenalty[sb.scriptInfo.name] || 0) + 1;
            return next('时长不符（应为 ' + expected + 's，实际 ' + Math.round(dur) + 's）');
          });
        }, function (err) {
          return next((err && err.message) || String(err));
        });
      }
      return attempt(0);
    });

    // 总时限 18 秒：单个脚本 8 秒超时，7 个脚本串起来最坏要一分钟，
    // 那对用户就是「永远在加载」。超过这个时间直接报错，
    // 让界面能给出明确结局，而不是无限转圈。
    var timed = new Promise(function (resolve, reject) {
      var timer = setTimeout(function () {
        reject(new Error('音源全部无响应（超过 ' + Math.round(RESOLVE_LIMIT / 1000) + ' 秒）'));
      }, RESOLVE_LIMIT);
      task.then(function (v) { clearTimeout(timer); resolve(v); },
                function (e) { clearTimeout(timer); reject(e); });
    });

    // 队列本身要吞掉错误，否则一次失败会卡死后续所有请求
    resolveChain = timed.catch(function () {});
    return timed;
  }
  var RESOLVE_LIMIT = 18000;

  /**
   * 自检：逐平台测搜索耗时。
   * 用户反馈「转很久」时用来定位是哪个平台慢。
   */
  function diagnose() {
    registerAll();
    var ids = root.LxSources.list().map(function (x) { return x.id; });
    var out = [];
    var chain = Promise.resolve();
    ids.forEach(function (id) {
      chain = chain.then(function () {
        var t0 = Date.now();
        return root.LxSources.searchOne(id, '测试', 1, 5)
          .then(function (r) {
            out.push({ source: id, ms: Date.now() - t0, ok: true, count: r.list.length });
          })
          .catch(function (e) {
            out.push({ source: id, ms: Date.now() - t0, ok: false, err: (e && e.message) || String(e) });
          });
      });
    });
    return chain.then(function () { return out; });
  }

  /** 判断是否有可用音源（用于 UI 提示） */
  function hasSource() {
    return root.LxSandbox.hasAny();
  }

  function listLoaded() {
    return root.LxSandbox.listLoaded();
  }

  root.LxMusic = {
    ready: registerAll,
    search: search,
    tipSearch: tipSearch,
    resolveUrl: resolveUrl,
    importScript: importScript,
    listScripts: listScripts,
    removeScript: removeScript,
    loadSavedScripts: loadSavedScripts,
    loadBuiltinScripts: loadBuiltinScripts,
    hasSource: hasSource,
    diagnose: diagnose,
    listLoaded: listLoaded,
    sources: function () { registerAll(); return root.LxSources.list(); }
  };
})(window);
