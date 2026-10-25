/* =========================================================
   洛雪音源内核 · AES-128-ECB（纯 JS）
   ---------------------------------------------------------
   为什么不用 WebCrypto：
     crypto.subtle 没有裸 ECB 模式，用 CBC+零 IV 模拟时
     WebCrypto 会自作主张加 PKCS7 填充，导致密文错位、服务端拒收。
     这里直接实现 AES 分组加密，行为完全可控。
   ========================================================= */
(function (root) {
  'use strict';

  var SBOX = new Uint8Array(256);
  var INV_SBOX = new Uint8Array(256);
  var RCON = [0x01, 0x02, 0x04, 0x08, 0x10, 0x20, 0x40, 0x80, 0x1b, 0x36];

  (function initSbox() {
    var p = 1, q = 1;
    do {
      p = (p ^ (p << 1) ^ (p & 0x80 ? 0x1b : 0)) & 0xff;
      q ^= q << 1; q ^= q << 2; q ^= q << 4; q &= 0xff;
      if (q & 0x80) q ^= 0x09;
      var x = q ^ ((q << 1) | (q >> 7)) ^ ((q << 2) | (q >> 6)) ^
        ((q << 3) | (q >> 5)) ^ ((q << 4) | (q >> 4));
      SBOX[p] = (x ^ 0x63) & 0xff;
    } while (p !== 1);
    SBOX[0] = 0x63;
    for (var i = 0; i < 256; i++) INV_SBOX[SBOX[i]] = i;
  })();

  function xtime(a) { return ((a << 1) ^ (a & 0x80 ? 0x1b : 0)) & 0xff; }
  function mul(a, b) {
    var p = 0;
    while (b) {
      if (b & 1) p ^= a;
      a = xtime(a);
      b >>= 1;
    }
    return p & 0xff;
  }

  /**
   * 密钥扩展。
   * w 是 4*(Nr+1) 个 4 字节 word，word[i] = [b0,b1,b2,b3]，
   * 对应状态矩阵第 (i%4) 列的第 0..3 行。
   */
  function expandKey(key) {
    var Nk = key.length / 4;
    var Nr = Nk + 6;
    var w = [];
    for (var i = 0; i < Nk; i++) {
      w[i] = [key[4 * i], key[4 * i + 1], key[4 * i + 2], key[4 * i + 3]];
    }
    for (var j = Nk; j < 4 * (Nr + 1); j++) {
      var temp = w[j - 1].slice();
      if (j % Nk === 0) {
        temp.push(temp.shift());
        temp = temp.map(function (b) { return SBOX[b]; });
        temp[0] ^= RCON[j / Nk - 1];
      } else if (Nk > 6 && j % Nk === 4) {
        temp = temp.map(function (b) { return SBOX[b]; });
      }
      w[j] = w[j - Nk].map(function (b, idx) { return b ^ temp[idx]; });
    }
    return { w: w, Nr: Nr };
  }

  function encryptBlock(block, ks) {
    // AES 输入 16 字节是「列主序」：第 c 列的 4 字节是 block[c*4 .. c*4+3]
    // 即 state[r][c] = block[c*4 + r]
    var st = [[], [], [], []];
    for (var c = 0; c < 4; c++) {
      for (var r = 0; r < 4; r++) st[r][c] = block[c * 4 + r];
    }

    function addRoundKey(round) {
      for (var c2 = 0; c2 < 4; c2++) {
        var word = ks.w[round * 4 + c2];
        for (var r2 = 0; r2 < 4; r2++) st[r2][c2] ^= word[r2];
      }
    }
    function subBytes() {
      for (var r3 = 0; r3 < 4; r3++) {
        for (var c3 = 0; c3 < 4; c3++) st[r3][c3] = SBOX[st[r3][c3]];
      }
    }
    function shiftRows() {
      for (var r4 = 1; r4 < 4; r4++) {
        st[r4] = st[r4].slice(r4).concat(st[r4].slice(0, r4));
      }
    }
    function mixColumns() {
      for (var c4 = 0; c4 < 4; c4++) {
        var a0 = st[0][c4], a1 = st[1][c4], a2 = st[2][c4], a3 = st[3][c4];
        st[0][c4] = mul(a0, 2) ^ mul(a1, 3) ^ a2 ^ a3;
        st[1][c4] = a0 ^ mul(a1, 2) ^ mul(a2, 3) ^ a3;
        st[2][c4] = a0 ^ a1 ^ mul(a2, 2) ^ mul(a3, 3);
        st[3][c4] = mul(a0, 3) ^ a1 ^ a2 ^ mul(a3, 2);
      }
    }

    addRoundKey(0);
    for (var round = 1; round <= ks.Nr; round++) {
      subBytes(); shiftRows(); mixColumns(); addRoundKey(round);
    }
    subBytes(); shiftRows(); addRoundKey(ks.Nr);

    var out = new Uint8Array(16);
    for (var c5 = 0; c5 < 4; c5++) {
      for (var r5 = 0; r5 < 4; r5++) out[c5 * 4 + r5] = st[r5][c5];
    }
    return out;
  }

  function toBytes(input) {
    if (input instanceof Uint8Array) return input;
    if (input instanceof ArrayBuffer) return new Uint8Array(input);
    return new TextEncoder().encode(String(input));
  }

  /** AES-128-ECB 加密，PKCS7 填充，返回 Uint8Array */
  function encryptEcb(data, keyBytes) {
    var bytes = toBytes(data);
    var key = toBytes(keyBytes);
    var ks = expandKey(key);

    var padLen = 16 - (bytes.length % 16);
    var padded = new Uint8Array(bytes.length + padLen);
    padded.set(bytes);
    for (var p = 0; p < padLen; p++) padded[bytes.length + p] = padLen;

    var out = new Uint8Array(padded.length);
    for (var i = 0; i < padded.length; i += 16) {
      out.set(encryptBlock(padded.slice(i, i + 16), ks), i);
    }
    return out;
  }

  function toHexUpper(bytes) {
    var s = '';
    for (var i = 0; i < bytes.length; i++) s += bytes[i].toString(16).padStart(2, '0');
    return s.toUpperCase();
  }

  root.LxAes = {
    encryptEcb: encryptEcb,
    toHexUpper: toHexUpper
  };
})(window);
