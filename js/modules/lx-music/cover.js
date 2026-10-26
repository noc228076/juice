/* =========================================================
   洛雪音源内核 · 封面
   ---------------------------------------------------------
   搜索接口（酷我 / 酷狗 / 企鹅）都不返回封面，只有咪咕有。

   酷我的搜索响应里其实带着 `web_albumpic_short`
   （形如 "120/s4s66/70/1259603879.jpg"），拼上图片域名就是完整封面。
   这个字段比 songinfo 接口可靠得多——后者经常返回「音乐查询失败」。

   结果按「歌名|歌手」缓存到 localStorage，避免每次播放都请求。
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;
  var CACHE_KEY = 'juice_cover_cache_v1';
  // 酷我封面图床。kwcdn 域名的 https 证书有问题（curl 报 SSL 错误），
  // 用 img1.kuwo.cn 这个别名，https 正常且返回同一张图
  var IMG_HOSTS = [
    'https://img1.kuwo.cn/star/albumcover/',
    'https://img2.kuwo.cn/star/albumcover/',
    'https://img3.kuwo.cn/star/albumcover/'
  ];
  var memCache = null;

  function loadCache() {
    if (memCache) return memCache;
    try {
      memCache = JSON.parse(localStorage.getItem(CACHE_KEY) || '{}') || {};
    } catch (e) { memCache = {}; }
    return memCache;
  }

  function saveCache() {
    if (!memCache) return;
    try {
      // 只留最近 300 条，避免 localStorage 无限增长
      var keys = Object.keys(memCache);
      if (keys.length > 300) {
        keys.slice(0, keys.length - 300).forEach(function (k) { delete memCache[k]; });
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(memCache));
    } catch (e) {}
  }

  function cacheKey(track) {
    // 只用「歌名|歌手」会把同名不同版本（Live / 翻唱 / 不同专辑）串成一张图，
    // 而且错图一旦写入就被永久缓存。带上平台和 id 才能区分开。
    var id = track.songmid || track.hash || track.albumAudioId || track.id || '';
    var base = String(track.title || track.name || '') + '|' + String(track.artist || track.singer || '');
    return (track.source ? track.source + '|' : '') + (id || base);
  }

  /** 把 web_albumpic_short 拼成完整 URL；把 120 换成 500 拿大图 */
  function picUrl(short) {
    if (!short) return '';
    var path = String(short).trim();
    // 去掉可能的 120/ 前缀尺寸，换成 500 更清晰
    path = path.replace(/^\d+\//, '500/');
    if (/^https?:/.test(path)) return path;
    return IMG_HOSTS[0] + path;
  }

  /** 用「歌名 歌手」在酷我搜一首，取它的封面 */
  function searchKwPic(track) {
    var title = String(track.title || track.name || '').trim();
    var artist = String(track.artist || track.singer || '').trim();
    if (!title) return Promise.resolve(null);
    if (/群星|various\s*artists?/i.test(artist)) artist = '';
    var kw = (title + ' ' + artist).trim();
    var url = 'http://search.kuwo.cn/r.s?client=kt&all=' + encodeURIComponent(kw) +
      '&pn=0&rn=5&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1' +
      '&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1';
    return R.httpFetch(url, { timeout: 7000 }).promise.then(function (resp) {
      var list = (resp && resp.body && (resp.body.abslist || resp.body.absList)) || [];
      if (!list.length) return null;
      var wantName = title.toLowerCase();
      var wantArtist = artist.toLowerCase();
      var pick = null;
      for (var i = 0; i < list.length; i++) {
        var it = list[i];
        var nm = String(it.SONGNAME || '').toLowerCase().trim();
        var ar = String(it.ARTIST || '').toLowerCase();
        var nameHit = nm === wantName || nm.indexOf(wantName) === 0;
        var artistHit = !wantArtist || ar.indexOf(wantArtist) > -1;
        if (nameHit && artistHit && it.web_albumpic_short) { pick = it; break; }
        if (!pick && nameHit && it.web_albumpic_short) pick = it;
      }
      if (!pick) return null;
      return picUrl(pick.web_albumpic_short);
    }).catch(function () { return null; });
  }

  /**
   * 取封面。
   * @param {Object} track 搜索结果项（含 source/songmid/track）
   * @returns {Promise<string>} 封面 URL，取不到返回空串
   */
  function getCover(track) {
    if (!track) return Promise.resolve('');
    var inner = track.track || track;
    // 已经有封面就直接用（咪咕来源自带）
    if (track.cover) return Promise.resolve(track.cover);
    if (inner.img) return Promise.resolve(inner.img);

    var key = cacheKey(track);
    var cache = loadCache();
    if (cache[key]) return Promise.resolve(cache[key]);

    return searchKwPic(track).then(function (pic) {
      if (pic) {
        cache[key] = { url: pic, at: Date.now() };
        saveCache();
      }
      return pic || '';
    });
  }

  root.LxCover = { getCover: getCover, picUrl: picUrl };
})(window);
