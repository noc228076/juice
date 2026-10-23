/* === js/modules/vocab-data.js === */
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

;
/* === js/modules/vocab.js === */
/* =========================================================
   模块 13：背单词 (Vocabulary · CET-4 / CET-6)
   ---------------------------------------------------------
   P1 版本：今日队列 + 认词四选一 + Leitner 调度 + 本机存档。
   词库来自 KyleBing/english-vocabulary（BSD-3-Clause），
   由 scripts/build-vocab*.js 清洗成 assets/vocab/*.json。

   调度：box 0..5，间隔 [0,1,2,4,7,15,30] 天。
     答对 → box+1；答错 → 归 0，当天队列末尾重排。
   每日：到期复习（上限 60）+ 新词（默认 15）。
   ========================================================= */

(function () {
  'use strict';

  var SAVE_KEY = 'juice_vocab_v1';
  var INTERVALS = [0, 1, 2, 4, 7, 15, 30];
  var MAX_BOX = 5;
  var DAILY_NEW = 15;
  var REVIEW_CAP = 60;

  /* ---------- 存档 ---------- */
  function emptyState() {
    return {
      book: 'cet4',
      day: '',              // 今天（YYYY-MM-DD）
      newLeft: DAILY_NEW,   // 今日剩余新词额度
      doneToday: 0,         // 今日已答题数
      streak: 0,            // 连续打卡天数
      lastDone: '',         // 上次完成打卡的日期
      words: {},            // 词 → { box, due, seen, wrong }
      seq: 0                // 词库内游标：下一个新词从哪取
    };
  }

  var state = emptyState();

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

  /* 用「天序号」比较到期，避免时区与字符串比较的坑 */
  function dayNum(key) {
    if (!key) return 0;
    var p = key.split('-');
    return Math.floor(Date.UTC(+p[0], +p[1] - 1, +p[2]) / 86400000);
  }

  function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (!raw) { state = emptyState(); state.day = todayKey(); return; }
    try {
      var s = JSON.parse(raw);
      state = Object.assign(emptyState(), s || {});
      if (!state.words || typeof state.words !== 'object') state.words = {};
    } catch (e) {
      state = emptyState();
    }
    /* 这里不能把 state.day 强行改成今天——跨天判定要读存档里的旧日期，
       由 rollDay() 决定是否重置额度。之前在这里覆盖，导致 rollDay 永远
       认为没跨天，额度一旦用完就再也回不来。 */
  }

  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* ---------- 数据 ---------- */
  var book = null;        // { words, byPos }
  var extra = { ex: null, roots: null, exam: null };
  var loading = null;
  var loadErr = '';

  function ensureBook() {
    if (book) return Promise.resolve(book);
    if (loading) return loading;
    loading = window.AppVocabData.loadBook(state.book)
      .then(function (b) { book = b; return b; })
      .catch(function (err) { loadErr = err.message || '词库加载失败'; loading = null; throw err; });
    return loading;
  }

  /* 详情数据按需加载：只有展开卡片背面才拉 */
  function ensureExtra() {
    if (extra.roots && extra.exam) return Promise.resolve(extra);
    return Promise.all([
      window.AppVocabData.loadRoots(state.book),
      window.AppVocabData.loadExam(state.book),
      window.AppVocabData.loadExamples(state.book)
    ]).then(function (r) {
      extra.roots = r[0];
      extra.exam = r[1];
      extra.ex = r[2];
      return extra;
    }).catch(function () { return extra; });
  }

  /* ---------- 队列 ---------- */
  /* 今日队列 = 到期复习（按到期先后）+ 新词（按词库顺序） */
  function buildQueue() {
    if (!book) return [];
    var today = dayNum(todayKey());
    var due = [];
    var words = book.words;

    for (var i = 0; i < words.length; i++) {
      var rec = state.words[words[i][0]];
      if (!rec) continue;
      if (rec.due <= today) due.push({ idx: i, rec: rec, isNew: false });
    }
    due.sort(function (a, b) { return a.rec.due - b.rec.due; });
    if (due.length > REVIEW_CAP) due = due.slice(0, REVIEW_CAP);

    var fresh = [];
    var want = Math.min(state.newLeft, DAILY_NEW);
    for (var k = state.seq; k < words.length && fresh.length < want; k++) {
      if (state.words[words[k][0]]) continue;
      fresh.push({ idx: k, rec: null, isNew: true });
    }

    return due.concat(fresh);
  }

  /* ---------- 渲染 ---------- */
  var el = null;          // 模块根容器
  var queue = [];
  var qi = 0;
  var answered = false;
  var current = null;     // { idx, word, phonetic, meaning, options }
  var sessionStats = { right: 0, wrong: 0 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function owl(name) {
    return '<img class="vc-owl" src="assets/vocab/owl_' + name + '.webp" alt="" draggable="false">';
  }

  function progressPct() {
    if (!queue.length) return 0;
    return Math.round((qi / queue.length) * 100);
  }

  function renderHome() {
    if (!el) return;
    var total = queue.length;
    var left = Math.max(0, total - qi);
    var dueN = 0, newN = 0;
    queue.forEach(function (q) { if (q.isNew) newN++; else dueN++; });

    if (loadErr) {
      el.innerHTML =
        '<div class="vc-wrap"><div class="vc-empty">' + owl('sad') +
        '<h2>词库加载失败</h2><p>' + esc(loadErr) + '</p>' +
        '<button class="vc-btn primary" id="vcRetry" type="button">重试</button></div></div>';
      var rb = el.querySelector('#vcRetry');
      if (rb) rb.onclick = function () { loadErr = ''; boot(); };
      return;
    }

    if (!total || left === 0) {
      el.innerHTML =
        '<div class="vc-wrap"><div class="vc-empty">' + owl('sleep') +
        '<h2>今天背完了</h2>' +
        '<p>今日已答 ' + state.doneToday + ' 题 · 连续打卡 ' + state.streak + ' 天</p>' +
        '<p class="vc-dim">明天再来，到期复习会自动排好。</p>' +
        '<div class="vc-empty-actions">' +
        '<button class="vc-btn" id="vcExtra" type="button">再来一组新词</button>' +
        '</div></div></div>';
      var eb = el.querySelector('#vcExtra');
      if (eb) eb.onclick = function () {
        state.newLeft = DAILY_NEW;
        saveState();
        buildAndStart();
      };
      return;
    }

    el.innerHTML =
      '<div class="vc-wrap">' +
        '<div class="vc-hero">' +
          '<div class="vc-hero-art">' + owl('think') + '</div>' +
          '<div class="vc-hero-main">' +
            '<div class="vc-hero-tag">' + (state.book === 'cet6' ? 'CET-6' : 'CET-4') + ' · 第 ' + (state.streak + 1) + ' 天</div>' +
            '<h1 class="vc-hero-title">今日摸鱼局</h1>' +
            '<p class="vc-hero-sub">待复习 <b>' + dueN + '</b> · 新词 <b>' + newN + '</b> · 剩 <b>' + left + '</b> 题</p>' +
            '<div class="vc-bar"><i style="width:' + progressPct() + '%"></i></div>' +
            '<div class="vc-hero-row">' +
              '<button class="vc-btn primary" id="vcStart" type="button">继续背 →</button>' +
              '<button class="vc-btn ghost" id="vcSwitch" type="button">换 ' + (state.book === 'cet6' ? 'CET-4' : 'CET-6') + '</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        '<div class="vc-note">词库 KyleBing/english-vocabulary（BSD-3-Clause）· 进度只存本机</div>' +
      '</div>';

    var sb = el.querySelector('#vcStart');
    if (sb) sb.onclick = function () { startSession(); };
    var wb = el.querySelector('#vcSwitch');
    if (wb) wb.onclick = function () {
      state.book = state.book === 'cet6' ? 'cet4' : 'cet6';
      state.seq = 0;
      state.words = {};
      state.newLeft = DAILY_NEW;
      state.doneToday = 0;
      saveState();
      /* 队列和当前题都是旧词书的索引，必须一起清掉——
         只清 book 的话，接着答题会用 CET-4 的下标去读 CET-6 的词表 */
      queue = [];
      qi = 0;
      answered = false;
      current = null;
      book = null; extra = { ex: null, roots: null, exam: null }; loading = null; loadErr = '';
      boot();
    };
  }

  function renderQuestion() {
    if (!el || !current) return;
    var w = current;
    var n = qi + 1;
    el.innerHTML =
      '<div class="vc-wrap vc-play">' +
        '<div class="vc-top">' +
          '<span class="vc-kind">' + (w.retry ? '再来一次' : '认词') + '</span>' +
          '<span class="vc-count">' + n + ' / ' + queue.length + '</span>' +
        '</div>' +
        '<div class="vc-bar thin"><i style="width:' + Math.round((qi / queue.length) * 100) + '%"></i></div>' +
        '<div class="vc-card">' +
          '<div class="vc-word">' + esc(w.word) + '</div>' +
          (w.phonetic ? '<div class="vc-phon">' + esc(w.phonetic) + '</div>' : '') +
          '<div class="vc-opts" id="vcOpts">' +
            w.options.map(function (o, i) {
              return '<button class="vc-opt" type="button" data-i="' + i + '">' + esc(o.text) + '</button>';
            }).join('') +
          '</div>' +
          '<div class="vc-feedback" id="vcFb"></div>' +
        '</div>' +
        '<div class="vc-playfoot">' + owl('think') + '</div>' +
      '</div>';

    var opts = el.querySelectorAll('.vc-opt');
    for (var i = 0; i < opts.length; i++) {
      opts[i].onclick = onPick;
    }
  }

  function onPick(e) {
    if (answered) return;
    answered = true;
    var btn = e.currentTarget;
    var i = +btn.getAttribute('data-i');
    var opt = current.options[i];
    var ok = !!opt.ok;

    if (window.SFX && window.SFX.tap) window.SFX.tap();

    var all = el.querySelectorAll('.vc-opt');
    for (var k = 0; k < all.length; k++) {
      all[k].disabled = true;
      if (current.options[+all[k].getAttribute('data-i')].ok) all[k].classList.add('right');
    }
    if (!ok) btn.classList.add('wrong');

    if (ok) { sessionStats.right++; state.doneToday++; }
    else { sessionStats.wrong++; state.doneToday++; }

    applySchedule(current.idx, ok);

    var fb = el.querySelector('#vcFb');
    if (fb) {
      fb.className = 'vc-feedback show ' + (ok ? 'ok' : 'bad');
      fb.innerHTML = '<b>' + (ok ? '答对了' : '答错了') + '</b>' +
        '<span>' + esc(current.meaning) + '</span>' +
        '<button class="vc-btn small" id="vcNext" type="button">' + (qi + 1 >= queue.length ? '看结果' : '下一题') + '</button>';
      var nb = fb.querySelector('#vcNext');
      if (nb) nb.onclick = function () { nextQuestion(); };
    }
    if (window.SFX) {
      if (ok && window.SFX.select) window.SFX.select();
      else if (!ok && window.SFX.wrong) window.SFX.wrong();
    }
  }

  /* 答题结果落到调度表 */
  /* 答题结果落到调度表。答错的词当场插到队尾重来一次——
     这是「今天再来一次」最直观的落地方式。
     但同一局里只重排一次：否则一直答错会让队列无限增长，
     15 题能滚成 66 题，用户永远看不到结算。 */
  function applySchedule(idx, ok) {
    var words = book.words;
    var key = words[idx][0];
    var rec = state.words[key] || { box: 0, due: 0, seen: 0, wrong: 0 };
    rec.seen++;
    var today = dayNum(todayKey());

    if (ok) {
      rec.box = Math.min(MAX_BOX, rec.box + 1);
      rec.due = today + INTERVALS[rec.box];
    } else {
      rec.box = 0;
      rec.wrong++;
      rec.due = today;   // 今天再来一次（下次进本模块仍会排到）
      /* 队尾重排一次；已在队列后段、或本局已经重排过的不再重复 */
      var inQueue = queue.slice(qi + 1).some(function (q) { return q.idx === idx; });
      if (!inQueue && !current.retry) {
        queue.push({ idx: idx, rec: rec, isNew: false, retry: true });
      }
    }
    state.words[key] = rec;
    saveState();
  }

  function nextQuestion() {
    qi++;
    answered = false;
    if (qi >= queue.length) { finishSession(); return; }
    current = makeQuestion(queue[qi]);
    renderQuestion();
  }

  function makeQuestion(item) {
    var idx = item.idx;
    var w = book.words[idx];
    return {
      idx: idx,
      retry: !!item.retry,
      word: w[0],
      phonetic: w[1],
      meaning: w[2],
      options: window.AppVocabData.makeOptions(book.words, book.byPos, idx)
    };
  }

  function startSession() {
    if (!queue.length) { buildAndStart(); return; }
    qi = 0;
    answered = false;
    sessionStats = { right: 0, wrong: 0 };
    current = makeQuestion(queue[0]);
    renderQuestion();
  }

  function finishSession() {
    var right = sessionStats.right, wrong = sessionStats.wrong;
    var acc = right + wrong ? Math.round(right / (right + wrong) * 100) : 0;
    var pose = acc >= 80 ? 'cheer' : acc >= 60 ? 'happy' : 'sad';

    /* 打卡：今天答满且队列走完 */
    if (state.lastDone !== todayKey()) {
      state.lastDone = todayKey();
      state.streak = (state.streak || 0) + 1;
    }
    /* 新词额度按本局实际消耗扣减 */
    var usedNew = 0, maxNewIdx = -1;
    queue.forEach(function (q) {
      if (!q.isNew) return;
      usedNew++;
      if (q.idx > maxNewIdx) maxNewIdx = q.idx;
    });
    state.newLeft = Math.max(0, state.newLeft - usedNew);
    /* 游标只推进到本局真正出现过的新词之后。
       不能用队列末尾：答错的旧词会重排到队尾，末尾索引可能倒退。 */
    if (maxNewIdx >= 0) state.seq = Math.max(state.seq, maxNewIdx + 1);
    saveState();

    el.innerHTML =
      '<div class="vc-wrap"><div class="vc-empty">' + owl(pose) +
      '<h2>本局完成</h2>' +
      '<p>答对 <b>' + right + '</b> · 答错 <b>' + wrong + '</b> · 正确率 <b>' + acc + '%</b></p>' +
      '<p class="vc-dim">连续打卡 ' + state.streak + ' 天</p>' +
      '<div class="vc-empty-actions">' +
        '<button class="vc-btn primary" id="vcAgain" type="button">再来一组</button>' +
        '<button class="vc-btn ghost" id="vcHome" type="button">回到今日</button>' +
      '</div></div></div>';

    var ab = el.querySelector('#vcAgain');
    if (ab) ab.onclick = function () { state.newLeft = DAILY_NEW; saveState(); buildAndStart(); };
    var hb = el.querySelector('#vcHome');
    if (hb) hb.onclick = function () { queue = []; qi = 0; renderHome(); };
  }

  function buildAndStart() {
    queue = buildQueue();
    if (!queue.length) { renderHome(); return; }
    startSession();
  }

  /* ---------- 启动 ---------- */
  function boot() {
    if (!el) return;
    el.innerHTML = '<div class="vc-wrap"><div class="vc-empty"><div class="vc-spinner"></div><h2>正在加载词库…</h2></div></div>';
    ensureBook().then(function () {
      queue = buildQueue();
      qi = 0;
      answered = false;
      current = null;
      renderHome();
    }).catch(function () { renderHome(); });
  }

  /* 跨天检查。每次进入模块都跑一遍——页面开着过夜、或从别的标签
     切回来，都不能让「昨天的额度」继续生效。 */
  function rollDay() {
    var today = todayKey();
    if (state.day === today) return false;
    state.day = today;
    state.newLeft = DAILY_NEW;
    state.doneToday = 0;
    saveState();
    return true;
  }

  function initVocab() {
    el = document.getElementById('mod-vocab');
    if (!el) return;
    rollDay();
    boot();
  }

  window.AppVocab = {
    init: function () {
      loadState();
      initVocab();
    },
    /* router 每次进入/切回本模块都会调用：重新读盘、做跨天检查、重建队列。
       不能因为 DOM 里已有内容就跳过——页面开着过夜后额度要能重置，
       别的标签改了存档后切回来也要能看到新数据。 */
    restoreView: function () {
      loadState();
      rollDay();
      if (!el) el = document.getElementById('mod-vocab');
      if (el) boot();
    }
  };
})();
