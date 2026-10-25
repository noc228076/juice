/* =========================================================
   洛雪音源内核 · 酷狗搜索
   ---------------------------------------------------------
   移植自 lx-music-desktop src/renderer/utils/musicSdk/kg/musicSearch.js
   只保留搜索部分（播放地址由自定义音源脚本提供）
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;
  var U = root.LxUtils;

  function filterData(rawData) {
    var types = [];
    var _types = {};
    function addType(type, sizeField, hashField) {
      if (rawData[sizeField] === 0) return;
      var size = U.sizeFormate(rawData[sizeField]);
      types.push({ type: type, size: size, hash: rawData[hashField] });
      _types[type] = { size: size, hash: rawData[hashField] };
    }
    addType('128k', 'FileSize', 'FileHash');
    addType('320k', 'HQFileSize', 'HQFileHash');
    addType('flac', 'SQFileSize', 'SQFileHash');
    addType('flac24bit', 'ResFileSize', 'ResFileHash');

    return {
      singer: U.decodeName(U.formatSingerName(rawData.Singers, 'name')),
      name: U.decodeName(rawData.OriSongName + (rawData.Suffix ? ' ' + rawData.Suffix : '')),
      albumName: U.decodeName(rawData.AlbumName),
      albumId: rawData.AlbumID,
      songmid: rawData.Audioid,
      albumAudioId: rawData.MixSongID,
      source: 'kg',
      interval: U.formatPlayTime(rawData.Duration),
      _interval: rawData.Duration,
      img: null,
      lrc: null,
      hash: rawData.FileHash,
      types: types,
      _types: _types
    };
  }

  function handleResult(rawData) {
    var ids = {};
    var list = [];
    rawData.forEach(function (item) {
      var key = item.Audioid + item.FileHash;
      if (ids[key]) return;
      ids[key] = true;
      list.push(filterData(item));
      (item.Grp || []).forEach(function (child) {
        var k = child.Audioid + child.FileHash;
        if (ids[k]) return;
        ids[k] = true;
        list.push(filterData(child));
      });
    });
    return list;
  }

  function search(str, page, limit, retryNum) {
    retryNum = retryNum || 0;
    page = page || 1;
    limit = limit || 30;
    if (++retryNum > 1) return Promise.reject(new Error('酷狗搜索失败'));

    var url = 'http://songsearch.kugou.com/song_search_v2?platform=AndroidFilter&iscorrection=1'
      + '&keyword=' + encodeURIComponent(str)
      + '&hifiquality=0&pagesize=' + limit + '&PrivilegeFilter=0&page=' + page;

    return R.httpFetch(url).promise.then(function (resp) {
      var result = resp.body;
      if (!result || result.error_code !== 0) return search(str, page, limit, retryNum);
      var list = handleResult(result.data.lists || []);
      if (!list) return search(str, page, limit, retryNum);
      var total = result.data.total;
      return {
        list: list,
        allPage: Math.ceil(total / limit),
        limit: limit,
        total: total,
        source: 'kg'
      };
    });
  }

  root.LxSourceKg = { id: 'kg', name: '酷狗', search: search };
})(window);
