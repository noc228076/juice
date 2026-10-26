/* =========================================================
   洛雪音源内核 · 发现（排行榜 / 推荐歌单）
   ---------------------------------------------------------
   用酷狗的公开榜单接口：
     · 榜单列表  /api/v3/rank/list
     · 榜单歌曲  /api/v3/rank/song
   两个接口都免登录、带封面（cover 里的 {size} 换成 480）。
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;
  var KG = 'http://mobilecdn.kugou.com/api/v3';

  var coverCache = {};

  /** 酷狗封面：{size} 替换成 480 */
  function kgCover(url) {
    if (!url) return '';
    return String(url).replace('{size}', '480').replace(/^http:/, 'https:');
  }

  /** 毫秒时长 → mm:ss */
  function fmtDur(ms) {
    var s = Math.round((Number(ms) || 0) / 1000);
    if (!s) return '';
    var m = Math.floor(s / 60);
    var r = s % 60;
    return m + ':' + (r < 10 ? '0' : '') + r;
  }

  /** 字节数 → "4.2 MB"，洛雪脚本按这个格式读 _types.size */
  function sizeFormate(bytes) {
    var n = Number(bytes) || 0;
    if (!n) return '';
    var units = ['B', 'KB', 'MB', 'GB'];
    var i = 0;
    while (n >= 1024 && i < units.length - 1) { n /= 1024; i++; }
    return n.toFixed(i === 0 ? 0 : 2) + ' ' + units[i];
  }

  /** 榜单列表（带封面） */
  function listRanks() {
    var url = KG + '/rank/list?parentid=0&apiver=2&plat=0&withsong=0';
    return R.httpFetch(url, { timeout: 8000 }).promise.then(function (resp) {
      var info = resp && resp.body && resp.body.data && resp.body.data.info;
      if (!Array.isArray(info)) return [];
      return info.map(function (it) {
        return {
          id: it.rankid,
          name: it.rankname,
          cover: kgCover(it.imgurl || it.banner_9 || it.banner_3 || ''),
          intro: String(it.intro || '').split('\n')[0].slice(0, 40)
        };
      }).filter(function (x) { return x.id && x.name; });
    }).catch(function () { return []; });
  }

  /** 某个榜单的歌曲 */
  function rankSongs(rankid, page, size) {
    page = page || 1;
    size = size || 30;
    // version=8000 + with_res_tag=0 必须带：缺了只返回 2 首（接口的默认行为很怪）
    var url = KG + '/rank/song?rankid=' + encodeURIComponent(rankid) +
      '&page=' + page + '&pagesize=' + size +
      '&version=8000&plat=0&apiver=2&with_res_tag=0';
    return R.httpFetch(url, { timeout: 10000 }).promise.then(function (resp) {
      var info = resp && resp.body && resp.body.data && resp.body.data.info;
      if (!Array.isArray(info)) return [];
      return info.map(function (it) {
        var singers = (it.authors || []).map(function (a) { return a.author_name; }).filter(Boolean).join('、');
        // filename 形如「许嵩 - 天龙八部之宿敌」，歌手为空时从这儿兜底
        if (!singers && it.filename) {
          var parts = String(it.filename).split(' - ');
          if (parts.length > 1) singers = parts[0];
        }
        var mid = String(it.audio_id || it.album_audio_id || it.hash || '');
        // 洛雪音源脚本取 kg 播放地址时要读 _types[quality].hash，
        // 只给顶层 hash 不够——脚本会按品质去 _types 里找
        var types = [];
        var _types = {};
        if (it.hash && it.filesize) {
          types.push({ type: '128k', size: sizeFormate(it.filesize), hash: it.hash });
          _types['128k'] = { size: sizeFormate(it.filesize), hash: it.hash };
        }
        if (it.hash_high && it.filesize_high) {
          types.push({ type: '320k', size: sizeFormate(it.filesize_high), hash: it.hash_high });
          _types['320k'] = { size: sizeFormate(it.filesize_high), hash: it.hash_high };
        }
        if (it.sqhash && it.sqfilesize) {
          types.push({ type: 'flac', size: sizeFormate(it.sqfilesize), hash: it.sqhash });
          _types.flac = { size: sizeFormate(it.sqfilesize), hash: it.sqhash };
        }
        return {
          // 与洛雪搜索结果同构，方便直接复用列表行和播放逻辑
          name: it.songname || it.remark || '',
          singer: singers,
          source: 'kg',
          songmid: mid,
          albumAudioId: it.album_audio_id,
          hash: it.hash,
          albumId: it.album_id,
          interval: fmtDur((Number(it.duration) || 0) * 1000),
          img: kgCover(it.album_sizable_cover || it.cover || ''),
          types: types,
          _types: _types,
          typeUrl: {}
        };
      }).filter(function (x) { return x.name; });
    }).catch(function () { return []; });
  }

  root.LxDiscover = {
    listRanks: listRanks,
    rankSongs: rankSongs
  };
})(window);
