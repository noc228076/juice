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

  /* 四选一：同词性优先、长度接近、排除同义项
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
        /* 长度差超过 12 字大概率是「一眼假」的选项，七成概率跳过 */
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
    posOf: posOf,
    shuffle: shuffle
  };
})();
