/* =========================================================
   洛雪音源内核 · 工具层
   ---------------------------------------------------------
   移植自 lx-music-desktop：
     src/renderer/utils/index.ts       （decodeName / formatPlayTime 等）
     src/renderer/utils/musicSdk/utils.js（toMD5 / formatSingerName）
     src/common/utils/common.ts        （sizeFormate / numFix）
   ========================================================= */
(function (root) {
  'use strict';

  function numFix(n) {
    return n < 10 ? ('0' + n) : String(n);
  }

  function formatPlayTime(time) {
    var m = Math.trunc(time / 60);
    var s = Math.trunc(time % 60);
    return (m === 0 && s === 0) ? '--/--' : numFix(m) + ':' + numFix(s);
  }

  function sizeFormate(size) {
    if (!size) return '0 B';
    var units = ['B', 'KiB', 'MiB', 'GiB', 'TiB'];
    var number = Math.floor(Math.log(size) / Math.log(1024));
    return (size / Math.pow(1024, Math.floor(number))).toFixed(2) + ' ' + units[number];
  }

  /** 解 HTML 实体（&amp; 等），各源返回的歌名常带转义 */
  function decodeName(str) {
    if (!str) return '';
    return new window.DOMParser().parseFromString(String(str), 'text/html').body.textContent;
  }

  /** 格式化歌手：接受数组或字符串 */
  function formatSingerName(singers, nameKey, join) {
    nameKey = nameKey || 'name';
    join = join || '、';
    if (Array.isArray(singers)) {
      var names = [];
      singers.forEach(function (item) {
        var n = item && item[nameKey];
        if (n) names.push(n);
      });
      return decodeName(names.join(join));
    }
    return decodeName(String(singers == null ? '' : singers));
  }

  /* ---- MD5（纯 JS，用于酷我/咪咕等源的签名） ---- */
  var _md5S = [7,12,17,22,7,12,17,22,7,12,17,22,7,12,17,22,
               5,9,14,20,5,9,14,20,5,9,14,20,5,9,14,20,
               4,11,16,23,4,11,16,23,4,11,16,23,4,11,16,23,
               6,10,15,21,6,10,15,21,6,10,15,21,6,10,15,21];
  var _md5K = null;
  function md5K() {
    if (_md5K) return _md5K;
    _md5K = [];
    for (var i = 0; i < 64; i++) _md5K[i] = Math.floor(Math.abs(Math.sin(i + 1)) * 4294967296) | 0;
    return _md5K;
  }

  function toMD5(str) {
    var bytes = new TextEncoder().encode(str);
    var s = _md5S, K = md5K();
    var bitLen = bytes.length * 8;
    var padded = new Uint8Array((((bytes.length + 8) >> 6) + 1) << 6);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    var view = new DataView(padded.buffer);
    view.setUint32(padded.length - 8, bitLen >>> 0, true);
    view.setUint32(padded.length - 4, Math.floor(bitLen / 4294967296), true);

    var a0 = 0x67452301, b0 = 0xefcdab89, c0 = 0x98badcfe, d0 = 0x10325476;
    var M = new Array(16);
    for (var off = 0; off < padded.length; off += 64) {
      for (var n = 0; n < 16; n++) M[n] = view.getUint32(off + n * 4, true);
      var A = a0, B = b0, C = c0, D = d0;
      for (var t = 0; t < 64; t++) {
        var F, g;
        if (t < 16) { F = (B & C) | (~B & D); g = t; }
        else if (t < 32) { F = (D & B) | (~D & C); g = (5 * t + 1) % 16; }
        else if (t < 48) { F = B ^ C ^ D; g = (3 * t + 5) % 16; }
        else { F = C ^ (B | ~D); g = (7 * t) % 16; }
        F = (F + A + K[t] + M[g]) | 0;
        A = D; D = C; C = B;
        B = (B + ((F << s[t]) | (F >>> (32 - s[t])))) | 0;
      }
      a0 = (a0 + A) | 0; b0 = (b0 + B) | 0; c0 = (c0 + C) | 0; d0 = (d0 + D) | 0;
    }
    var hex = function (x) {
      var out = '';
      for (var q = 0; q < 4; q++) out += ((x >>> (q * 8)) & 0xff).toString(16).padStart(2, '0');
      return out;
    };
    return hex(a0) + hex(b0) + hex(c0) + hex(d0);
  }

  root.LxUtils = {
    numFix: numFix,
    formatPlayTime: formatPlayTime,
    sizeFormate: sizeFormate,
    decodeName: decodeName,
    formatSingerName: formatSingerName,
    toMD5: toMD5
  };
})(window);
