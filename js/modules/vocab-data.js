/* =========================================================
   模块 13：背单词 · 词库加载与题目生成
   ---------------------------------------------------------
   数据全部来自 assets/vocab/*.json，由 scripts/build-vocab*.js
   从 KyleBing/english-vocabulary（BSD-3-Clause）清洗而来。
   四个文件逐条对齐，索引可直接复用：
     cet4.json         [词, 音标, 释义]
     cet4_ex.json      [英文例句, 中文翻译] | 0
     cet4_roots.json   [拆词, [[派生词, 词性], ...]] | 0
     cet4_exam.json    [真题句, "CET4 · 2017.6 · 阅读理解"] | 0
   ========================================================= */

(function () {
  'use strict';

  var BASE = 'assets/vocab/';
  var cache = Object.create(null);

  function loadJson(name) {
    if (cache[name]) return cache[name];
    var p = fetch(BASE + name + '.json', { credentials: 'same-origin' })
      .then(function (res) {
        if (!res.ok) throw new Error('词库加载失败 HTTP ' + res.status);
        return res.json();
      })
      .then(function (data) {
        cache[name] = Promise.resolve(data);
        return data;
      })
      .catch(function (err) {
        delete cache[name];
        throw err;
      });
    cache[name] = p;
    return p;
  }

  /* 释义开头的词性：'adj. 大量的' → 'adj'；无标注返回 '' */
  function posOf(meaning) {
    var m = String(meaning || '').match(/^([a-z]+)\.\s/);
    return m ? m[1] : '';
  }

  /* 按词性建索引，供干扰项取词（adj. 池约 900 词，够用） */
  function indexByPos(words) {
    var map = Object.create(null);
    for (var i = 0; i < words.length; i++) {
      var p = posOf(words[i][2]);
      if (!p) continue;
      (map[p] || (map[p] = [])).push(i);
    }
    return map;
  }

  function shuffle(arr) {
    for (var i = arr.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = arr[i]; arr[i] = arr[j]; arr[j] = t;
    }
    return arr;
  }

  /* 四选一释义：同词性优先、长度接近、排除同义项
     —— 避免「最长的是答案」被当规律用，也避免两个选项意思一样 */
  function makeOptions(words, byPos, idx) {
    var row = words[idx];
    var answer = row[2];
    var p = posOf(answer);
    var pool = (p && byPos[p] && byPos[p].length > 4) ? byPos[p] : null;
    var picked = [];
    var seen = Object.create(null);
    seen[answer] = 1;

    function tryPick(from, want) {
      var guard = 0;
      while (picked.length < want && guard++ < 600) {
        var j = from[Math.floor(Math.random() * from.length)];
        if (j === idx) continue;
        var t = words[j][2];
        if (seen[t]) continue;
        if (Math.abs(t.length - answer.length) > 12 && Math.random() < 0.75) continue;
        seen[t] = 1;
        picked.push(t);
      }
    }

    if (pool) tryPick(pool, 3);
    if (picked.length < 3) {
      var all = [];
      for (var k = 0; k < words.length; k++) all.push(k);
      tryPick(all, 3);
    }

    var opts = [{ text: answer, ok: true }];
    for (var i = 0; i < picked.length; i++) opts.push({ text: picked[i], ok: false });
    return shuffle(opts);
  }

  /* 填空：从例句里挖掉目标词，四选一词形
     —— 同词性、长度接近，且不选原词本身 */
  function makeClozeOptions(words, byPos, idx) {
    var row = words[idx];
    var answer = row[0];
    var p = posOf(row[2]);
    var pool = (p && byPos[p] && byPos[p].length > 4) ? byPos[p] : null;
    var picked = [];
    var seen = Object.create(null);
    seen[answer.toLowerCase()] = 1;

    function tryPick(from, want) {
      var guard = 0;
      while (picked.length < want && guard++ < 600) {
        var j = from[Math.floor(Math.random() * from.length)];
        if (j === idx) continue;
        var w = words[j][0];
        if (seen[w.toLowerCase()]) continue;
        if (Math.abs(w.length - answer.length) > 5 && Math.random() < 0.8) continue;
        seen[w.toLowerCase()] = 1;
        picked.push(w);
      }
    }

    if (pool) tryPick(pool, 3);
    if (picked.length < 3) {
      var all = [];
      for (var k = 0; k < words.length; k++) all.push(k);
      tryPick(all, 3);
    }

    var opts = [{ text: answer, ok: true }];
    for (var i = 0; i < picked.length; i++) opts.push({ text: picked[i], ok: false });
    return shuffle(opts);
  }

  /* 中选英：给中文释义，从四个英文单词里挑。
     —— 干扰项同样按词性取，长度接近，避免一眼看出 */
  function makeWordOptions(words, byPos, idx) {
    var row = words[idx];
    var answer = row[0];
    var p = posOf(row[2]);
    var pool = (p && byPos[p] && byPos[p].length > 4) ? byPos[p] : null;
    var picked = [];
    var seen = Object.create(null);
    seen[answer.toLowerCase()] = 1;
    /* 释义完全相同的词也不能进选项，否则两个选项都对 */
    seen[row[2]] = 1;

    function tryPick(from, want) {
      var guard = 0;
      while (picked.length < want && guard++ < 600) {
        var j = from[Math.floor(Math.random() * from.length)];
        if (j === idx) continue;
        var w = words[j][0];
        var m = words[j][2];
        if (seen[w.toLowerCase()] || seen[m]) continue;
        if (Math.abs(w.length - answer.length) > 5 && Math.random() < 0.8) continue;
        seen[w.toLowerCase()] = 1;
        picked.push(w);
      }
    }

    if (pool) tryPick(pool, 3);
    if (picked.length < 3) {
      var all = [];
      for (var k = 0; k < words.length; k++) all.push(k);
      tryPick(all, 3);
    }

    var opts = [{ text: answer, ok: true }];
    for (var i = 0; i < picked.length; i++) opts.push({ text: picked[i], ok: false });
    return shuffle(opts);
  }

  /* 把例句里的目标词替换成空格。大小写与词形变化都尽量兜住：
     先试原词，再试首字母大写，最后试词干前缀（-s/-ed/-ing 等）。 */
  function blankOut(sentence, word) {
    if (!sentence) return '';
    var w = String(word);
    var forms = [w, w.charAt(0).toUpperCase() + w.slice(1), w.toUpperCase()];
    /* 词干兜底：去掉常见后缀后的主体，长度至少 4 才用 */
    var stem = w.replace(/(ing|ed|es|s|ly|er|est)$/i, '');
    if (stem.length >= 4 && stem !== w) {
      forms.push(stem, stem.charAt(0).toUpperCase() + stem.slice(1));
    }
    for (var i = 0; i < forms.length; i++) {
      var f = forms[i];
      var re = new RegExp('\\b' + f.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '[a-z]{0,3}\\b');
      if (re.test(sentence)) return sentence.replace(re, '______');
    }
    return '';
  }

  /* ---------- 发音 ---------- */
  var voiceCache = null;
  var speakOK = (typeof window !== 'undefined') && 'speechSynthesis' in window;

  function pickVoice() {
    if (!speakOK) return null;
    if (voiceCache !== null) return voiceCache;
    var vs = window.speechSynthesis.getVoices() || [];
    /* 优先美音，其次英音，再次任意 en-* */
    voiceCache = vs.find(function (v) { return /en[-_]US/i.test(v.lang); })
      || vs.find(function (v) { return /en[-_]GB/i.test(v.lang); })
      || vs.find(function (v) { return /^en/i.test(v.lang); })
      || null;
    return voiceCache;
  }

  function speak(text) {
    if (!speakOK || !text) return false;
    try {
      window.speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(String(text));
      u.lang = 'en-US';
      u.rate = 0.9;
      var v = pickVoice();
      if (v) u.voice = v;
      window.speechSynthesis.speak(u);
      return true;
    } catch (e) {
      return false;
    }
  }

  /* 有些浏览器 voices 是异步填充的，首次取到空要再试一次 */
  if (speakOK && typeof window.speechSynthesis.onvoiceschanged !== 'undefined') {
    window.speechSynthesis.onvoiceschanged = function () { voiceCache = null; pickVoice(); };
  }

  window.AppVocabData = {
    loadBook: function (level) {
      return loadJson(level).then(function (words) {
        return { words: words, byPos: indexByPos(words) };
      });
    },
    loadExamples: function (level) { return loadJson(level + '_ex'); },
    loadRoots: function (level) { return loadJson(level + '_roots'); },
    loadExam: function (level) { return loadJson(level + '_exam'); },
    makeOptions: makeOptions,
    makeClozeOptions: makeClozeOptions,
    makeWordOptions: makeWordOptions,
    blankOut: blankOut,
    posOf: posOf,
    shuffle: shuffle,
    speak: speak,
    canSpeak: function () { return speakOK && !!pickVoice(); }
  };
})();
