/* =========================================================
   洛雪音源内核 · 网易云搜索
   ---------------------------------------------------------
   移植自 lx-music-desktop：
     src/renderer/utils/musicSdk/wy/musicSearch.js
     src/renderer/utils/musicSdk/wy/utils/crypto.js（eapi）
   原实现用 node:crypto 的 AES-128-ECB；浏览器里没有这个 API，
   用 LxAes（纯 JS，已用 NIST 标准向量校验）替代。
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;
  var U = root.LxUtils;

  var EAPI_KEY = 'e82ckenh8dichen8';

  /** AES-128-ECB 加密，返回大写 hex */
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

  /**
   * /eapi/batch 的搜索结果包在 resources[].baseInfo.simpleSongData 里
   * （2024 起的新结构；老的 result.songs / data.list 已经不回来了）。
   */
  function handleResult(resources) {
    if (!Array.isArray(resources)) return [];
    var out = [];
    resources.forEach(function (res) {
      if (!res || res.resourceType !== 'song') return;
      var item = (res.baseInfo || {}).simpleSongData;
      if (!item || item.id == null) return;

      // 音质字段：hr=hires、sq=flac、h=320k、m=128k、l=96k。
      // 标全部可用的等级，取址脚本会按 quality 去挑。
      var types = [];
      var _types = {};
      var add = function (type) {
        types.push({ type: type, size: null });
        _types[type] = { size: null };
      };
      if (item.hr) add('flac24bit');
      if (item.sq) add('flac');
      if (item.h) add('320k');
      if (item.m || item.l || (!item.hr && !item.sq && !item.h)) add('128k');

      out.push({
        singer: U.decodeName(getSinger(item.ar)),
        name: U.decodeName(item.name),
        albumName: U.decodeName((item.al || {}).name || ''),
        albumId: (item.al || {}).id,
        songmid: item.id,
        source: 'wy',
        interval: U.formatPlayTime(Math.floor((item.dt || 0) / 1000)),
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
        // 460 频控重试一次没意义，直接报出来
        if (body && (body.code === 460 || body.code === 405)) {
          return Promise.reject(new Error('网易接口限流（code ' + body.code + '）'));
        }
        return search(str, page, limit, retryNum + 1);
      }
      var data = body.data || {};
      var list = handleResult(data.resources);
      // 旧结构兜底（如果哪天接口回退）
      if (!list.length && body.result && body.result.songs) {
        list = handleResult(body.result.songs.map(function (s) {
          return { resourceType: 'song', baseInfo: { simpleSongData: s } };
        }));
      }
      var total = data.totalCount || (body.result && body.result.songCount) || list.length;
      return {
        list: list,
        allPage: Math.ceil(total / limit),
        limit: limit,
        total: total,
        source: 'wy'
      };
    });
  }

  root.LxSourceWy = { id: 'wy', name: '网易云', search: search };
})(window);
