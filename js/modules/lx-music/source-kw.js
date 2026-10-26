/* =========================================================
   洛雪音源内核 · 酷我搜索
   ---------------------------------------------------------
   移植自 lx-music-desktop src/renderer/utils/musicSdk/kw/musicSearch.js
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;
  var U = root.LxUtils;

  var M_INFO_RXP = /level:(\w+),bitrate:(\d+),format:(\w+),size:([\w.]+)/;

  /** 酷我歌手串用 & 分隔，转成顿号 */
  function formatSinger(str) {
    return String(str || '').replace(/&/g, '、');
  }

  function handleResult(rawData) {
    var result = [];
    if (!rawData) return result;

    for (var i = 0; i < rawData.length; i++) {
      var info = rawData[i];
      var songId = String(info.MUSICRID || '').replace('MUSIC_', '');

      // 单条缺 N_MINFO 就跳过它，不能整批返回 null：
      // 酷我搜索里混入广告/专辑/无版权条目很常见，
      // 之前这里 return null，导致整个酷我源间歇性不可用。
      if (!info.N_MINFO) continue;

      var types = [];
      var _types = {};
      var infoArr = info.N_MINFO.split(';');
      for (var j = 0; j < infoArr.length; j++) {
        var m = infoArr[j].match(M_INFO_RXP);
        if (!m) continue;
        var size = m[4];
        switch (m[2]) {
          case '4000':
            types.push({ type: 'flac24bit', size: size });
            _types.flac24bit = { size: size.toLocaleUpperCase() };
            break;
          case '2000':
            types.push({ type: 'flac', size: size });
            _types.flac = { size: size.toLocaleUpperCase() };
            break;
          case '320':
            types.push({ type: '320k', size: size });
            _types['320k'] = { size: size.toLocaleUpperCase() };
            break;
          case '128':
            types.push({ type: '128k', size: size });
            _types['128k'] = { size: size.toLocaleUpperCase() };
            break;
        }
      }
      types.reverse();

      var interval = parseInt(info.DURATION, 10);

      result.push({
        name: U.decodeName(info.SONGNAME),
        singer: formatSinger(U.decodeName(info.ARTIST)),
        source: 'kw',
        songmid: songId,
        albumId: U.decodeName(info.ALBUMID || ''),
        interval: isNaN(interval) ? 0 : U.formatPlayTime(interval),
        albumName: info.ALBUM ? U.decodeName(info.ALBUM) : '',
        lrc: null,
        img: null,
        types: types,
        _types: _types
      });
    }
    return result;
  }

  function search(str, page, limit, retryNum) {
    page = page || 1;
    limit = limit || 30;
    retryNum = retryNum || 0;
    if (retryNum > 0) return Promise.reject(new Error('酷我搜索失败'));

    var url = 'http://search.kuwo.cn/r.s?client=kt&all=' + encodeURIComponent(str)
      + '&pn=' + (page - 1) + '&rn=' + limit
      + '&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1'
      + '&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1&issubtitle=1';

    return R.httpFetch(url).promise.then(function (resp) {
      var result = resp.body;
      if (!result || (result.TOTAL !== '0' && result.SHOW === '0')) {
        return search(str, page, limit, retryNum + 1);
      }
      var list = handleResult(result.abslist);
      if (list == null) return search(str, page, limit, retryNum + 1);

      var total = parseInt(result.TOTAL, 10) || 0;
      return {
        list: list,
        allPage: Math.ceil(total / limit),
        total: total,
        limit: limit,
        source: 'kw'
      };
    });
  }

  root.LxSourceKw = { id: 'kw', name: '酷我', search: search };
})(window);
