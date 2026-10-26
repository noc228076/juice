/* =========================================================
   洛雪音源内核 · 网易云搜索
   ---------------------------------------------------------
   主通道：music.163.com/api/search/get/web（老公开接口，带 Referer
   即可用，2026-10 实测 eapi/batch 开始对无 Cookie 请求回 200 空体）。
   备通道：eapi/batch（resources[].baseInfo.simpleSongData 新结构），
   AES-128-ECB 用 LxAes（已按 NIST 向量校验）。
   两条通道的结果统一成同一形状再进 handleResult。
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

  /** 老公开接口：GET + Referer，无需登录。
      /api/search/get 在海外出口也返回明文（/web 版会触发 abroad 加密体），
      所以主通道用 get，web 只做兜底。 */
  function legacySearch(keyword, limit, offset) {
    var paths = ['/api/search/get', '/api/search/get/web'];
    var idx = 0;
    var tryNext = function () {
      if (idx >= paths.length) {
        return Promise.reject(new Error('网易公开搜索接口不可用'));
      }
      var url = 'https://music.163.com' + paths[idx++] +
        '?s=' + encodeURIComponent(keyword) +
        '&type=1&limit=' + limit + '&offset=' + offset;
      return R.httpFetch(url, {
        timeout: 9000,
        headers: {
          Referer: 'https://music.163.com/',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/69.0.3497.100 Safari/537.36',
          Cookie: 'appver=2.9.7'
        }
      }).promise.then(function (resp) {
        var body = resp.body;
        // abroad 响应是加密体（result 为 hex 字符串），浏览器解不开，换下一个
        if (body && body.abroad) throw new Error('abroad');
        if (!body || body.code !== 200 || !body.result || !body.result.songs) {
          throw new Error('网易公开搜索返回异常（code ' + (body && body.code) + '）');
        }
        return body;
      }).catch(function (e) { return tryNext(); });
    };
    return tryNext();
  }

  function getSinger(singers) {
    return (singers || []).map(function (s) { return s.name; }).join('、');
  }

  /**
   * 统一归一化。兼容两种原始形状：
   *   legacy（search/get/web）：{ name, id, artists, album, duration }
   *   eapi 新结构解包后：      { name, id, ar, al, dt, h/m/l/sq/hr }
   * 返回 []，调用方自己过滤空值。
   */
  function handleResult(rawList) {
    if (!Array.isArray(rawList)) return [];
    var out = [];
    rawList.forEach(function (item) {
      if (!item || item.id == null) return;
      var types = [];
      var _types = {};
      var add = function (type) {
        types.push({ type: type, size: null });
        _types[type] = { size: null };
      };
      var hasQuality = false;
      if (item.hr) { add('flac24bit'); hasQuality = true; }
      if (item.sq) { add('flac'); hasQuality = true; }
      if (item.h) { add('320k'); hasQuality = true; }
      if (item.m || item.l) { add('128k'); hasQuality = true; }
      // 老接口不带音质字段：默认只有 128k 可标
      if (!hasQuality) add('128k');

      var artists = item.ar || item.artists || [];
      var album = item.al || item.album || {};
      var durMs = item.dt || item.duration || 0;

      out.push({
        singer: U.decodeName(getSinger(artists)),
        name: U.decodeName(item.name),
        albumName: U.decodeName(album.name || ''),
        albumId: album.id,
        songmid: item.id,
        source: 'wy',
        interval: U.formatPlayTime(Math.floor(durMs / 1000)),
        img: album.picUrl || null,
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
    var offset = limit * (page - 1);

    // 1) 老公开接口（无需签名，最稳）
    return legacySearch(str, limit, offset).then(function (resp) {
      var body = resp.body;
      if (body && body.code === 200 && body.result && body.result.songs) {
        var list = handleResult(body.result.songs);
        var total = body.result.songCount || list.length;
        return { list: list, allPage: Math.ceil(total / limit), limit: limit, total: total, source: 'wy' };
      }
      if (body && body.code === 400) return Promise.reject(new Error('网易接口拒绝（可能限流）'));
      // 其它情况落 eapi 备通道
      return eapiSearch(str, limit, offset, retryNum);
    }).catch(function (eLegacy) {
      // 网络层失败也走 eapi 试一把
      return eapiSearch(str, limit, offset, retryNum).catch(function () {
        throw (eLegacy && eLegacy.message) ? eLegacy : new Error('网易搜索失败');
      });
    });
  }

  /** 备通道：eapi/batch 新结构 */
  function eapiSearch(str, limit, offset, retryNum) {
    return eapiRequest('/api/search/song/list/page', {
      keyword: str,
      needCorrect: '1',
      channel: 'typing',
      offset: offset,
      scene: 'normal',
      total: offset === 0,
      limit: limit
    }).then(function (resp) {
      var body = resp.body;
      if (!body || body.code !== 200) {
        if (body && (body.code === 460 || body.code === 405)) {
          return Promise.reject(new Error('网易接口限流（code ' + body.code + '）'));
        }
        if (retryNum < 3) return search(str, Math.floor(offset / limit) + 1, limit, retryNum + 1);
        return Promise.reject(new Error('网易搜索失败（code ' + (body && body.code) + '）'));
      }
      var data = body.data || {};
      var raw = (data.resources || []).map(function (res) {
        return res && res.baseInfo && res.baseInfo.simpleSongData;
      }).filter(Boolean);
      var list = handleResult(raw);
      var total = data.totalCount || list.length;
      return { list: list, allPage: Math.ceil(total / limit), limit: limit, total: total, source: 'wy' };
    });
  }

  root.LxSourceWy = { id: 'wy', name: '网易云', search: search };
})(window);
