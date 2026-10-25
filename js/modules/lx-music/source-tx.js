/* =========================================================
   洛雪音源内核 · 企鹅（QQ音乐）搜索
   ---------------------------------------------------------
   移植自 lx-music-desktop：
     src/renderer/utils/musicSdk/tx/musicSearch.js
     src/renderer/utils/musicSdk/tx/utils/crypto.js（zzcSign）
   原实现用 node:crypto 的 sha1，这里改用 WebCrypto（同样是异步）
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;
  var U = root.LxUtils;

  var PART_1_INDEXES = [23, 14, 6, 36, 16, 40, 7, 19];
  var PART_2_INDEXES = [16, 1, 32, 12, 19, 27, 8, 5];
  var SCRAMBLE_VALUES = [89, 39, 179, 150, 218, 82, 58, 252, 177, 52, 186, 123, 120, 64, 242, 133, 143, 161, 121, 179];

  function sha1Hex(text) {
    var data = new TextEncoder().encode(text);
    return crypto.subtle.digest('SHA-1', data).then(function (buf) {
      return Array.prototype.map.call(new Uint8Array(buf), function (b) {
        return b.toString(16).padStart(2, '0');
      }).join('');
    });
  }

  function pickHashByIdx(hash, indexes) {
    return indexes.map(function (i) { return hash[i]; }).join('');
  }

  function base64Encode(bytes) {
    var bin = '';
    for (var i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
    return btoa(bin).replace(/[\\/+=]/g, '');
  }

  function zzcSign(text) {
    return sha1Hex(text).then(function (hash) {
      var part1 = pickHashByIdx(hash, PART_1_INDEXES);
      var part2 = pickHashByIdx(hash, PART_2_INDEXES);
      var part3 = SCRAMBLE_VALUES.map(function (value, i) {
        return value ^ parseInt(hash.slice(i * 2, i * 2 + 2), 16);
      });
      var b64Part = base64Encode(part3).replace(/[\\/+=]/g, '');
      return ('zzc' + part1 + b64Part + part2).toLowerCase();
    });
  }

  function getSearchId() {
    var guid = '';
    for (var i = 0; i < 32; i++) guid += Math.floor(Math.random() * 16).toString(16);
    return guid.toUpperCase() + String(Math.floor(Math.random() * 100000)).padStart(5, '0');
  }

  function signRequest(data) {
    return zzcSign(JSON.stringify(data)).then(function (sign) {
      return R.httpFetch('https://u.y.qq.com/cgi-bin/musics.fcg?sign=' + sign, {
        method: 'post',
        headers: { 'User-Agent': 'QQMusic 14090508(android 12)' },
        body: data
      }).promise;
    });
  }

  function filterData(rawData) {
    var types = [];
    var _types = {};
    (rawData.file?.media_mid ? [{ type: '128k', size: rawData.file.size_128mp3, mid: rawData.file.media_mid }] : []).forEach(function (t) {
      var size = U.sizeFormate(t.size);
      types.push({ type: t.type, size: size });
      _types[t.type] = { size: size };
    });
    if (rawData.file?.size_320mp3) {
      var s320 = U.sizeFormate(rawData.file.size_320mp3);
      types.push({ type: '320k', size: s320 });
      _types['320k'] = { size: s320 };
    }
    if (rawData.file?.size_flac) {
      var sflac = U.sizeFormate(rawData.file.size_flac);
      types.push({ type: 'flac', size: sflac });
      _types.flac = { size: sflac };
    }
    if (rawData.file?.size_hires) {
      var shires = U.sizeFormate(rawData.file.size_hires);
      types.push({ type: 'flac24bit', size: shires });
      _types.flac24bit = { size: shires };
    }

    var singers = (rawData.singer || []).map(function (s) { return { name: s.name }; });

    return {
      singer: U.decodeName(U.formatSingerName(singers)),
      name: U.decodeName(rawData.title),
      albumName: U.decodeName(rawData.album?.name || ''),
      albumId: rawData.album?.id,
      songmid: rawData.mid,
      strMediaMid: rawData.file?.media_mid,
      source: 'tx',
      interval: U.formatPlayTime(rawData.interval),
      img: null,
      lrc: null,
      types: types,
      _types: _types
    };
  }

  function search(str, page, limit, retryNum) {
    page = page || 1;
    limit = limit || 50;
    retryNum = retryNum || 0;
    if (retryNum > 5) return Promise.reject(new Error('企鹅搜索失败'));

    var payload = {
      comm: {
        _channelid: '0',
        _os_version: '6.2.9200-2',
        ct: '19',
        cv: '2151',
        guid: '1F70E520B2EAA7D25E11760783C53CA9',
        patch: '118',
        psrf_access_token_expiresAt: 0,
        psrf_qqaccess_token: '',
        psrf_qqopenid: '',
        psrf_qqunionid: '',
        tmeAppID: 'qqmusic',
        tmeLoginType: 0,
        uin: '0',
        wid: '7223299733393904640'
      },
      'music.search.SearchCgiService': {
        module: 'music.search.SearchCgiService',
        method: 'DoSearchForQQMusicDesktop',
        param: {
          grp: 1,
          num_per_page: limit,
          page_num: page,
          query: str,
          remoteplace: 'txt.newclient.top',
          search_type: 0,
          searchid: getSearchId()
        }
      }
    };

    return signRequest(payload).then(function (resp) {
      var body = resp.body;
      var req = (body && body['music.search.SearchCgiService']) || (body && body.req);
      if (!req || body.code !== 0 || req.code !== 0) {
        return search(str, page, limit, retryNum + 1);
      }
      var data = req.data;
      var list = (data.body?.song?.list || []).map(filterData);
      var total = data.meta?.sum || list.length;
      return {
        list: list,
        allPage: Math.ceil(total / limit),
        limit: limit,
        total: total,
        source: 'tx'
      };
    });
  }

  root.LxSourceTx = { id: 'tx', name: '企鹅', search: search };
})(window);
