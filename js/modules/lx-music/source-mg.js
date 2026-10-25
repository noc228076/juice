/* =========================================================
   洛雪音源内核 · 咪咕搜索
   ---------------------------------------------------------
   移植自 lx-music-desktop src/renderer/utils/musicSdk/mg/musicSearch.js
   需要 sign 头（由 md5 拼出），已在本模块内实现
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;
  var U = root.LxUtils;

  function createSignature(time, str) {
    var deviceId = '963B7AA0D21511ED807EE5846EC87D20';
    var signatureMd5 = '6cdc72a439cef99a3418d2a78aa28c73';
    var sign = U.toMD5(str + signatureMd5 + 'yyapp2d16148780a1dcc7408e06336b98cfd50' + deviceId + time);
    return { sign: sign, deviceId: deviceId };
  }

  function filterData(rawData) {
    var list = [];
    var ids = {};

    (rawData || []).forEach(function (group) {
      (group || []).forEach(function (data) {
        if (!data.songId || !data.copyrightId || ids[data.copyrightId]) return;
        ids[data.copyrightId] = true;

        var types = [];
        var _types = {};
        (data.audioFormats || []).forEach(function (fmt) {
          var size = U.sizeFormate(fmt.asize != null ? fmt.asize : fmt.isize);
          switch (fmt.formatType) {
            case 'PQ':
              types.push({ type: '128k', size: size });
              _types['128k'] = { size: size };
              break;
            case 'HQ':
              types.push({ type: '320k', size: size });
              _types['320k'] = { size: size };
              break;
            case 'SQ':
              types.push({ type: 'flac', size: size });
              _types.flac = { size: size };
              break;
            case 'ZQ24':
              types.push({ type: 'flac24bit', size: size });
              _types.flac24bit = { size: size };
              break;
          }
        });

        var img = data.img3 || data.img2 || data.img1 || null;
        if (img && !/https?:/.test(img)) img = 'http://d.musicapp.migu.cn' + img;

        list.push({
          singer: U.formatSingerName(data.singerList),
          name: data.name,
          albumName: data.album,
          albumId: data.albumId,
          songmid: data.songId,
          copyrightId: data.copyrightId,
          source: 'mg',
          interval: U.formatPlayTime(data.duration),
          img: img,
          lrc: null,
          lrcUrl: data.lrcUrl,
          types: types,
          _types: _types
        });
      });
    });
    return list;
  }

  function search(str, page, limit, retryNum) {
    page = page || 1;
    limit = limit || 20;
    retryNum = retryNum || 0;
    if (++retryNum > 1) return Promise.reject(new Error('咪咕搜索失败'));

    var time = Date.now().toString();
    var signData = createSignature(time, str);
    var switchStr = encodeURIComponent('{"song":1,"album":0,"singer":0,"tagSong":1,"mvSong":0,"bestShow":1,"songlist":0,"lyricSong":0}');
    var url = 'https://jadeite.migu.cn/music_search/v3/search/searchAll?isCorrect=0&isCopyright=1'
      + '&searchSwitch=' + switchStr
      + '&pageSize=' + limit + '&text=' + encodeURIComponent(str) + '&pageNo=' + page + '&sort=0&sid=USS';

    return R.httpFetch(url, {
      headers: {
        uiVersion: 'A_music_3.6.1',
        deviceId: signData.deviceId,
        timestamp: time,
        sign: signData.sign,
        channel: '0146921',
        'User-Agent': 'Mozilla/5.0 (Linux; U; Android 11.0.0; zh-cn; MI 11 Build/OPR1.170623.032) AppleWebKit/534.30 (KHTML, like Gecko) Version/4.0 Mobile Safari/534.30'
      }
    }).promise.then(function (resp) {
      var result = resp.body;
      if (!result || result.code !== '000000') {
        return Promise.reject(new Error((result && result.info) || '咪咕搜索失败'));
      }
      var data = result.songResultData || { resultList: [], totalCount: 0 };
      var list = filterData(data.resultList);
      var total = parseInt(data.totalCount, 10) || 0;
      return {
        list: list,
        allPage: Math.ceil(total / limit),
        limit: limit,
        total: total,
        source: 'mg'
      };
    });
  }

  root.LxSourceMg = { id: 'mg', name: '咪咕', search: search };
})(window);
