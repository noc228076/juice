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

  /* ---------------- 搜索 ---------------- */
  /**
   * 多平台搜索
   * @param {string} keyword
   * @param {number} page
   * @returns {Promise<{list:Array, bySource:Object, errors:Array}>}
   */
  function search(keyword, page) {
    registerAll();
    return root.LxSources.searchAll(keyword, page || 1, 30);
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
      copyrightId: track.copyrightId,
      strMediaMid: track.strMediaMid,
      name: track.name,
      singer: track.singer
    };
    return root.LxSandbox.getMusicUrl(track.source, musicInfo, quality || '128k');
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
    resolveUrl: resolveUrl,
    importScript: importScript,
    listScripts: listScripts,
    removeScript: removeScript,
    loadSavedScripts: loadSavedScripts,
    hasSource: hasSource,
    listLoaded: listLoaded,
    sources: function () { registerAll(); return root.LxSources.list(); }
  };
})(window);
