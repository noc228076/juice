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
  function resolveUrl(track, quality) {
    if (!root.LxSandbox.hasAny()) {
      return Promise.reject(new Error('尚未导入音源脚本，无法获取播放地址'));
    }
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
    return root.LxSandbox.getMusicUrl(track.source, musicInfo, quality || '128k');
  }

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
