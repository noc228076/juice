/* =========================================================
   洛雪音源内核 · 歌词
   ---------------------------------------------------------
   两条路径：
     1. 音源脚本的 lyric action（HYWmusic / 星海等支持，含逐字）
     2. 酷我 mlyric 加密接口（认搜索返回的 MUSICRID，任何平台都能兜底）
   返回统一结构 { lyric, tlyric, parsed: [{ time, text }] }
   ========================================================= */
(function (root) {
  'use strict';

  var R = root.LxRequest;

  /** 解析 LRC 文本为 [{ time: 秒, text }] */
  function parseLrc(lrc) {
    if (!lrc) return [];
    var lines = String(lrc).split(/\r?\n/);
    var out = [];
    var tagRxp = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g;

    for (var i = 0; i < lines.length; i++) {
      var line = lines[i];
      var times = [];
      var m;
      tagRxp.lastIndex = 0;
      while ((m = tagRxp.exec(line)) !== null) {
        var min = parseInt(m[1], 10);
        var sec = parseInt(m[2], 10);
        var frac = m[3] ? parseInt((m[3] + '00').slice(0, 3), 10) / 1000 : 0;
        times.push(min * 60 + sec + frac);
      }
      if (!times.length) continue;
      // 去掉逐字时间标签 <start,dur> 和所有 [tag]
      var text = line.replace(/<[^>]*>/g, '').replace(/\[[^\]]*\]/g, '').trim();
      if (!text) continue;
      for (var j = 0; j < times.length; j++) {
        out.push({ time: times[j], text: text });
      }
    }
    out.sort(function (a, b) { return a.time - b.time; });
    return out;
  }

  /**
   * 酷我歌词解密。
   * 响应体 = "TP=content\r\nlrcx=1\r\n\r\n" + zlib(raw deflate) 压缩的
   *          base64( 与 "yeelion" 循环异或后的 UTF-8 歌词 )
   */
  function inflateRaw(bytes) {
    // 先试带 zlib 头的 deflate，失败再试裸 deflate
    var tryOne = function (fmt) {
      try {
        var ds = new DecompressionStream(fmt);
        return new Response(new Blob([bytes]).stream().pipeThrough(ds)).arrayBuffer();
      } catch (e) {
        return Promise.reject(e);
      }
    };
    return tryOne('deflate').catch(function () { return tryOne('deflate-raw'); });
  }

  function decodeKwLyric(buf) {
    var latin = new TextDecoder('latin1').decode(buf);
    if (latin.slice(0, 10).toLowerCase() !== 'tp=content') return Promise.resolve('');
    var sep = latin.indexOf('\r\n\r\n');
    if (sep < 0) return Promise.resolve('');
    var payload = buf.slice(sep + 4);

    return inflateRaw(payload).then(function (ab) {
      var b64 = new TextDecoder().decode(new Uint8Array(ab)).trim();
      var bin;
      try { bin = atob(b64); } catch (e) { return ''; }
      var key = 'yeelion';
      var out = new Uint8Array(bin.length);
      for (var i = 0; i < bin.length; i++) {
        out[i] = bin.charCodeAt(i) ^ key.charCodeAt(i % key.length);
      }
      return new TextDecoder('utf-8').decode(out);
    }).catch(function () { return ''; });
  }

  /** 酷我 mlyric 接口（免登录，认搜索返回的 songmid/MUSICRID） */
  function fetchKwLyric(musicId, deadline) {
    if (!musicId) return Promise.resolve(null);
    var url = 'http://mlyric.kuwo.cn/mobi.s?f=web&type=lyric&lrcx=1&rid=' +
      encodeURIComponent(musicId) + '&encode=utf8';
    // 把总预算摊到单次请求上：原来每次 8 秒，逐个候选试下去最坏 14 秒+
    var left = deadline ? Math.max(2000, deadline - Date.now()) : 8000;
    return R.httpFetch(url, { timeout: Math.min(8000, left), responseType: 'arraybuffer' }).promise.then(function (resp) {
      var raw = resp.raw;
      if (!raw) return null;
      var buf = raw instanceof Uint8Array ? raw : new Uint8Array(raw);
      return decodeKwLyric(buf).then(function (lrc) {
        if (!lrc || !/\[\d{1,3}:\d{1,2}/.test(lrc)) return null;
        var parsed = parseLrc(lrc);
        if (!parsed.length) return null;
        return { lyric: lrc, parsed: parsed, source: 'kw' };
      });
    }).catch(function () { return null; });
  }

  /**
   * 在酷我按歌名/歌手搜候选 MUSICRID。
   * 返回按优先级排序的 id 列表——翻唱、合辑版本常常没有歌词，
   * 所以调用方需要逐个试，直到拿到非空结果。
   */
  function searchKwIds(track, deadline) {
    var title = String(track.title || track.name || '').trim();
    var artist = String(track.artist || track.singer || '').trim();
    if (!title) return Promise.resolve([]);
    // 「华语群星」「群星」「Various Artists」这类不是真歌手，
    // 带上去搜只会命中合辑版本，反而把原版挤掉
    if (/群星|various\s*artists?|va$/i.test(artist)) artist = '';

    var query = function (kw, withArtist) {
      var url = 'http://search.kuwo.cn/r.s?client=kt&all=' + encodeURIComponent(kw) +
        '&pn=0&rn=8&uid=794762570&ver=kwplayer_ar_9.2.2.1&vipver=1&show_copyright_off=1' +
        '&newver=1&ft=music&cluster=0&strategy=2012&encoding=utf8&rformat=json&vermerge=1&mobi=1';
      var leftQ = deadline ? Math.max(2000, deadline - Date.now()) : 8000;
      return R.httpFetch(url, { timeout: Math.min(8000, leftQ) }).promise.then(function (resp) {
        var body = resp && resp.body;
        if (!body) return [];
        var list = body.abslist || body.absList || [];
        if (!list.length) return [];

        var wantName = title.toLowerCase();
        var wantArtist = artist.toLowerCase();
        var both = [], sameName = [], rest = [];
        for (var i = 0; i < list.length; i++) {
          var it = list[i];
          var nm = String(it.SONGNAME || '').toLowerCase().trim();
          var ar = String(it.ARTIST || '').toLowerCase();
          var rid = String(it.MUSICRID || '').replace('MUSIC_', '');
          if (!rid) continue;
          // 酷我的歌名常带后缀（"富士山下-《爱情转移》粤语版"、"富士山下 (Live)"），
          // 严格相等会一个都匹配不上，所以「以目标歌名开头」也算命中
          var nameHit = nm === wantName || nm.indexOf(wantName) === 0;
          var artistHit = !wantArtist || ar.indexOf(wantArtist) > -1;
          if (nameHit && artistHit) both.push(rid);
          else if (nameHit) sameName.push(rid);
          else if (withArtist) rest.push(rid);
        }
        // 带歌手搜索时只要同名同歌手的，避免翻唱顶掉原版
        return withArtist ? both : both.concat(sameName);
      }).catch(function () { return []; });
    };

    // 先「歌名 + 歌手」精确找，不足再只按歌名补齐
    return query((title + ' ' + artist).trim(), true).then(function (ids) {
      if (ids.length) return ids;
      return query(title, false);
    });
  }

  /**
   * 获取歌词。
   * @param {Object} track 搜索结果项（含 source/songmid/track）
   * @returns {Promise<{lyric:string, parsed:Array, source:string}>}
   */
  function getLyric(track) {
    var empty = { lyric: '', parsed: [], source: '' };

    if (!track) return Promise.resolve(empty);

    var inner = track.track || track;
    var src = track.source || inner.source;

    // 1. 先试音源脚本（支持 lyric 的脚本质量最好，含逐字）
    var viaScript = (function () {
      if (!root.LxSandbox || !root.LxSandbox.hasAny() || !root.LxSandbox.getLyric) {
        return Promise.resolve(null);
      }
      // getLyric 里 postMessage 到已销毁的 iframe 等情况会同步抛错，
      // 不接住的话整个 getLyric 直接 throw，调用方的 .then 链挂不上，
      // 只能等 8 秒后的「加载中」提示
      try {
        return root.LxSandbox.getLyric(src, {
          songmid: inner.songmid,
          songId: inner.songmid,
          hash: inner.hash,
          albumId: inner.albumId,
          copyrightId: inner.copyrightId,
          name: inner.name,
          singer: inner.singer
        }).catch(function () { return null; });
      } catch (eSync) {
        return Promise.resolve(null);
      }
    })();

    return viaScript.then(function (res) {
      var lyric = res && (res.lyric || res.lxlyric || '');
      if (lyric && /\[\d+:\d+/.test(lyric)) {
        var parsed = parseLrc(lyric);
        if (parsed.length) {
          return { lyric: lyric, tlyric: res.tlyric || '', parsed: parsed, source: 'script' };
        }
      }

      // 2. 酷我来源：songmid 就是 MUSICRID，直接取
      var direct = src === 'kw' ? fetchKwLyric(inner.songmid) : Promise.resolve(null);

      return direct.then(function (hit) {
        if (hit) return hit;
        // 3. 直取失败或其它平台：按歌名+歌手搜候选，逐个试到有歌词为止。
        //    翻唱/合辑版本常常没歌词，只试第一个会白跑；但也不能无限试，
        //    最多 3 个、总耗时压在 6 秒内，否则用户会盯着「加载中」发呆。
        var deadline = Date.now() + 6000;   // 总预算从这里起算，而不是搜完才开始
        return searchKwIds(track, deadline).then(function (ids) {
          if (!ids.length) return empty;
          var tryAt = function (i) {
            if (i >= ids.length || i >= 3 || Date.now() > deadline) return Promise.resolve(empty);
            return fetchKwLyric(ids[i], deadline).then(function (res2) {
              return res2 || tryAt(i + 1);
            });
          };
          return tryAt(0);
        });
      });
    });
  }

  // 声明在使用之前（函数体里引用）
  var lyricCache = {};
  var LYRIC_CACHE_MAX = 120;
  function cachePut(key, val) {
    lyricCache[key] = val;
    var ks = Object.keys(lyricCache);
    if (ks.length > LYRIC_CACHE_MAX) delete lyricCache[ks[0]];
  }
  var _getLyric = getLyric;
  getLyric = function (track) {
    var inner0 = track && (track.track || track);
    var key0 = ((track && track.source) || (inner0 && inner0.source) || '') + '|' + ((inner0 && inner0.songmid) || '') + '|' + String((inner0 && inner0.name) || (track && track.title) || '');
    if (lyricCache[key0]) return Promise.resolve(lyricCache[key0]);
    return _getLyric(track).then(function (res) {
      if (res && res.parsed && res.parsed.length) {
        var inner = track && (track.track || track);
        var key = ((track && track.source) || (inner && inner.source) || '') + '|' + ((inner && inner.songmid) || '') + '|' + String((inner && inner.name) || (track && track.title) || '');
        cachePut(key, res);
      }
      return res;
    });
  };

  root.LxLyric = {
    parseLrc: parseLrc,
    getLyric: getLyric,
    decodeKwLyric: decodeKwLyric
  };
})(window);
