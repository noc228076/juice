/* =========================================================
   洛雪音源内核 · 网易云搜索
   ---------------------------------------------------------
   移植自 lx-music-desktop：
     src/renderer/utils/musicSdk/wy/musicSearch.js
     src/renderer/utils/musicSdk/wy/utils/crypto.js（eapi）
   原实现用 node:crypto 的 AES-128-ECB，这里改用 WebCrypto
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;
  var U = root.LxUtils;

  var EAPI_KEY = 'e82ckenh8dichen8';

  /** AES-128-ECB 加密，返回大写 hex（用纯 JS 实现，避开 WebCrypto 的自动填充） */
  function aesEncryptEcb(text) {
    var bytes = root.LxAes.encryptEcb(text, new TextEncoder().encode(EAPI_KEY));
    return Promise.resolve(root.LxAes.toHexUpper(bytes));
  }

  function eapi(url, object) {
    var text = typeof object === 'object' ? JSON.stringify(object) : object;
    var message = 'nobody' + url + 'use' + text + 'md5forencrypt';
    var digest = U.toMD5(message);
    var data = url + '-36cd479b6b5-' + text + '-36cd479b6b5-' + digest;
    return aesEncryptEcb(data).then(function (hex) {
      return { params: hex };
    });
  }

  function eapiRequest(url, data) {
    return eapi(url, data).then(function (form) {
      return R.httpFetch('http://interface.music.163.com/eapi/batch', {
        method: 'post',
        headers: {
          'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/60.0.3112.90 Safari/537.36',
          origin: 'https://music.163.com'
        },
        form: form
      }).promise;
    });
  }

  function getSinger(singers) {
    return (singers || []).map(function (s) { return s.name; }).join('、');
  }

  function handleResult(rawList) {
    if (!rawList) return [];
    var out = [];
    rawList.forEach(function (item) {
      if (!item) return;
      var types = [];
      var _types = {};
      // 网易的搜索结果里 quality 信息在 privilege / hr 等字段，这里按可得字段尽量标注
      if (item.hr) {
        types.push({ type: 'flac24bit', size: null });
        _types.flac24bit = { size: null };
      } else if (item.sq) {
        types.push({ type: 'flac', size: null });
        _types.flac = { size: null };
      } else if (item.h) {
        types.push({ type: '320k', size: null });
        _types['320k'] = { size: null };
      } else {
        types.push({ type: '128k', size: null });
        _types['128k'] = { size: null };
      }

      out.push({
        singer: U.decodeName(getSinger(item.ar || item.artists)),
        name: U.decodeName(item.name),
        albumName: U.decodeName((item.al || item.album || {}).name || ''),
        albumId: (item.al || item.album || {}).id,
        songmid: item.id,
        source: 'wy',
        interval: U.formatPlayTime(Math.floor((item.dt || item.duration || 0) / 1000)),
        img: (item.al || {}).picUrl || null,
        lrc: null,
        types: types,
        _types: _types
      });
    });
    return out;
  }

  function search(str, page, limit, retryNum) {
    page = page || 1;
    limit = limit || 30;
    retryNum = retryNum || 0;
    if (retryNum > 3) return Promise.reject(new Error('网易搜索重试次数用尽'));

    return eapiRequest('/api/search/song/list/page', {
      keyword: str,
      needCorrect: '1',
      channel: 'typing',
      offset: limit * (page - 1),
      scene: 'normal',
      total: page === 1,
      limit: limit
    }).then(function (resp) {
      var body = resp.body;
      if (!body || body.code !== 200) {
        return search(str, page, limit, retryNum + 1);
      }
      // 新接口返回结构：body.data.list 或 body.result.songs
      var rawList = (body.data && (body.data.list || body.data.songs)) ||
        (body.result && body.result.songs) || [];
      var list = handleResult(rawList);
      var total = (body.data && body.data.totalCount) || (body.result && body.result.songCount) || list.length;
      return {
        list: list,
        allPage: Math.ceil(total / limit),
        limit: limit,
        total: total,
        source: 'wy'
      };
    });
  }

  root.LxSourceWy = { id: 'wy', name: '网易', search: search };
})(window);
