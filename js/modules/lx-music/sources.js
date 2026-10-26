/* =========================================================
   洛雪音源内核 · 聚合器
   ---------------------------------------------------------
   并行请求多个平台的搜索接口，合并去重后按相关度排序。
   与原 musicSdk 的 search('all') 行为一致。
   ========================================================= */
(function (root) {
  'use strict';

  var SOURCES = {};
  var ORDER = ['kw', 'kg', 'tx', 'wy', 'mg'];

  function register(src) {
    if (!src || !src.id) return;
    SOURCES[src.id] = src;
  }

  function list() {
    return ORDER.filter(function (id) { return SOURCES[id]; }).map(function (id) {
      return { id: id, name: SOURCES[id].name };
    });
  }

  /** 按歌名+歌手做去重键（同平台的重复只留一条） */
  function dedupe(items) {
    var seen = {};
    return items.filter(function (it) {
      // songmid 缺失时不能只靠它：同平台所有缺 id 的条目会塌缩成
      // "kw|undefined" 只留第一条，导致搜索结果莫名少一大半
      var id = it.songmid || it.hash || it.albumAudioId || (it.name + '|' + it.singer);
      var key = it.source + '|' + id;
      if (seen[key]) return false;
      seen[key] = true;
      return true;
    });
  }

  /**
   * 排序：先按相关度，同分时让各平台交替出现。
   * 只按「相关度 + 原顺序」排，第一个平台（酷我）会把同名的高相关
   * 结果全占满第一屏，看起来像「搜到的全是 KW」。
   *
   * 做法：给每条记一个「该平台到目前为止出现过几次」，
   * 同分时出现次数少的优先 —— KW/KG/TX/MG 会轮流排。
   */
  function rankAndSort(items, keyword) {
    var scored = items.map(function (it, i) {
      return { it: it, i: i, s: relevanceScore(it, keyword) };
    });
    var srcSeen = {};
    scored.forEach(function (x) {
      var src = x.it.source || '';
      x.n = srcSeen[src] || 0;
      srcSeen[src] = x.n + 1;
    });
    scored.sort(function (a, b) {
      return (b.s - a.s) || (a.n - b.n) || (a.i - b.i);
    });
    return scored.map(function (x) { return x.it; });
  }

  /** 按关键词相似度排序：歌名完全匹配 > 开头匹配 > 包含 > 其他 */
  function relevanceScore(item, keyword) {
    var name = String(item.name || '').toLowerCase();
    var kw = String(keyword || '').toLowerCase();
    if (!kw) return 0;
    if (name === kw) return 100;
    if (name.indexOf(kw) === 0) return 80;
    if (name.indexOf(kw) > -1) return 60;
    var singer = String(item.singer || '').toLowerCase();
    if (singer.indexOf(kw) > -1) return 40;
    return 10;
  }

  /**
   * 搜索单个平台
   * @returns {Promise<{list,total,source}>}
   */
  function searchOne(sourceId, keyword, page, limit) {
    var src = SOURCES[sourceId];
    if (!src) return Promise.reject(new Error('未知音源: ' + sourceId));
    return src.search(keyword, page, limit);
  }

  /**
   * 搜索全部平台（并行，单源失败不影响整体）
   * @returns {Promise<{list, bySource, errors}>}
   */
  function searchAll(keyword, page, limit, onProgress) {
    page = page || 1;
    limit = limit || 30;
    // 兜底注册：正常走 LxMusic.search 会先 registerAll，
    // 但直接调 LxSources.searchAll 时 SOURCES 可能是空的，
    // 结果会静默返回空数组（排查时很容易误判成接口挂了）
    if (!Object.keys(SOURCES).length && root.LxSourceKw) {
      register(root.LxSourceKw);
      register(root.LxSourceKg);
      register(root.LxSourceTx);
      register(root.LxSourceMg);
    }
    var ids = ORDER.filter(function (id) { return SOURCES[id]; });

    var timings = {};
    var tasks = ids.map(function (id) {
      var t0 = Date.now();
      if (typeof onProgress === 'function') onProgress({ phase: 'start', source: id, done: 0, total: ids.length });
      return searchOne(id, keyword, page, limit)
        .then(function (res) {
          timings[id] = Date.now() - t0;
          return { id: id, res: res };
        })
        .catch(function (err) {
          timings[id] = Date.now() - t0;
          return { id: id, error: err };
        });
    });

    /**
     * 整体硬上限：单个源内部有重试+超时，最坏情况会拖到几十秒，
     * 用户只会看到 spinner 一直转。这里设 9 秒上限，超时就用已有结果
     * 先返回，慢的源标记为超时。
     */
    // 线上网络比本地慢不少，9 秒会偶发「全部超时、一条都没有」。
    // 放宽到 12 秒，超时仍然用已完成的部分返回，不会白等。
    var HARD_LIMIT = 12000;
    var done = [];          // 已完成的源结果
    var pending = ids.length;

    var allTask = Promise.all(tasks.map(function (t, i) {
      return t.then(function (r) {
        done.push(r);
        pending--;
        if (typeof onProgress === 'function') {
          onProgress({ done: done.length, total: ids.length, last: r, ms: timings[r.id] });
        }
        return r;
      });
    })).then(function (results) {
      var merged = [];
      var bySource = {};
      var errors = [];

      results.forEach(function (r) {
        if (r.error) {
          var msg = (r.error && r.error.message) || String(r.error);
          // 超时/取消对用户没有意义，换成可读的说明
          if (/cancel request|ECANCELED/i.test(msg)) msg = '请求超时';
          else if (/ETIMEDOUT|请求超时/.test(msg)) msg = '请求超时';
          errors.push({ source: r.id, message: msg });
          bySource[r.id] = { list: [], total: 0 };
          return;
        }
        var list = (r.res && r.res.list) || [];
        bySource[r.id] = { list: list, total: (r.res && r.res.total) || list.length };
        merged = merged.concat(list);
      });

      merged = dedupe(merged);
      merged = rankAndSort(merged, keyword);

      return { list: merged, bySource: bySource, errors: errors, timings: timings };
    });

    var timeoutTask = new Promise(function (resolve) {
      setTimeout(function () { resolve('__TIMEOUT__'); }, HARD_LIMIT);
    });

    return Promise.race([allTask, timeoutTask]).then(function (r) {
      if (r !== '__TIMEOUT__') return r;

      // 超时：用已经返回的源立即组装结果，慢的源放弃
      console.warn('[搜索] 超过 ' + HARD_LIMIT + 'ms，用已完成的部分返回');
      var merged2 = [];
      var bySource2 = {};
      var errors2 = [];
      done.forEach(function (item) {
        if (item.error) {
          errors2.push({ source: item.id, message: (item.error && item.error.message) || String(item.error) });
          bySource2[item.id] = { list: [], total: 0 };
          return;
        }
        var list = (item.res && item.res.list) || [];
        bySource2[item.id] = { list: list, total: (item.res && item.res.total) || list.length };
        merged2 = merged2.concat(list);
      });
      merged2 = dedupe(merged2);
      merged2 = rankAndSort(merged2, keyword);
      if (pending > 0) errors2.push({ source: 'slow', message: pending + ' 个平台响应慢，已跳过' });
      return { list: merged2, bySource: bySource2, errors: errors2, timings: timings };
    });
  }

  /** 按歌名做跨平台合并：同一首歌的多平台版本归到一组 */
  function groupBySong(items) {
    var groups = {};
    items.forEach(function (it) {
      var key = String(it.name || '').toLowerCase().replace(/\s+/g, '') + '|' +
        String(it.singer || '').toLowerCase().replace(/\s+/g, '');
      if (!groups[key]) groups[key] = { name: it.name, singer: it.singer, items: [] };
      groups[key].items.push(it);
    });
    return Object.keys(groups).map(function (k) { return groups[k]; });
  }

  root.LxSources = {
    register: register,
    list: list,
    searchOne: searchOne,
    searchAll: searchAll,
    groupBySong: groupBySong
  };
})(window);
