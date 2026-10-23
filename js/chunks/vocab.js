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
   今日屏 / 答题屏 / 统计屏 / 设置屏 四屏。
   词库来自 KyleBing/english-vocabulary（BSD-3-Clause），
   由 scripts/build-vocab*.js 清洗成 assets/vocab/*.json。

   调度：box 0..5，间隔 [0,1,2,4,7,15,30] 天。
     答对 → box+1；答错 → 归 0，当局限一次重排。
   每日：到期复习（上限 60）+ 新词（数量可调，默认 15）。
   出词顺序：顺序（按词表游标） / 乱序（随机抽未学过的词）。
   ========================================================= */

(function () {
  'use strict';

  var SAVE_KEY = 'juice_vocab_v1';
  var INTERVALS = [0, 1, 2, 4, 7, 15, 30];
  var MAX_BOX = 5;
  var REVIEW_CAP = 60;
  var DAILY_CHOICES = [10, 15, 25, 50];
  /* 单次挂机超过 30 分钟不计入学习时长：切走忘了关很常见，
     不设上限的话「学习时长」会变成「页面开着多久」 */
  var IDLE_CAP_MS = 30 * 60 * 1000;

  /* ---------- 状态 ---------- */
  function emptyState() {
    return {
      book: 'cet4',
      day: '',
      newDoneToday: 0,   // 今日已学新词数（额度 = dailyNew - 这个）
      doneToday: 0,      // 今日已答题数
      streak: 0,
      lastDone: '',
      words: {},         // 词 → { box, due, seen, wrong }
      seq: 0,            // 顺序模式下的词表游标
      dailyNew: 15,
      order: 'seq',      // seq | random
      totalMs: 0,        // 累计学习时长
      totalAnswered: 0,
      totalRight: 0,
      days: {}           // { 'YYYY-M-D': 当日答题数 }
    };
  }

  var state = emptyState();

  function todayKey() {
    var d = new Date();
    return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  }

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
      var s = JSON.parse(raw) || {};
      state = Object.assign(emptyState(), s);
      if (!state.words || typeof state.words !== 'object') state.words = {};
      if (!state.days || typeof state.days !== 'object') state.days = {};
      /* 旧存档只有 newLeft，没有 newDoneToday —— 折算回来，避免额度重置 */
      if (typeof s.newLeft === 'number' && typeof s.newDoneToday !== 'number') {
        state.newDoneToday = Math.max(0, (state.dailyNew || 15) - s.newLeft);
      }
    } catch (e) {
      state = emptyState();
    }
    /* 这里不能把 state.day 改成今天：跨天判定要读存档里的旧日期 */
  }

  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

  /* 跨天检查。每次进入模块都跑——页面开着过夜、或从别的标签切回来，
     都不能让昨天的额度继续生效。 */
  function rollDay() {
    var today = todayKey();
    if (state.day === today) return false;
    state.day = today;
    state.newDoneToday = 0;
    state.doneToday = 0;
    saveState();
    return true;
  }

  function newLeftToday() {
    return Math.max(0, (state.dailyNew || 15) - (state.newDoneToday || 0));
  }

  /* ---------- 学习时长 ---------- */
  var tickAt = 0;

  function tickStart() { tickAt = Date.now(); }

  function tickFlush() {
    if (!tickAt) return;
    var now = Date.now();
    var d = now - tickAt;
    tickAt = now;
    if (d > 0 && d < IDLE_CAP_MS) {
      state.totalMs = (state.totalMs || 0) + d;
    }
  }

  function fmtDuration(ms) {
    var min = Math.floor((ms || 0) / 60000);
    if (min < 60) return min + ' 分钟';
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
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
  function buildQueue() {
    if (!book) return [];
    var today = dayNum(todayKey());
    var words = book.words;
    var due = [];

    for (var i = 0; i < words.length; i++) {
      var rec = state.words[words[i][0]];
      if (!rec) continue;
      if (rec.due <= today) due.push({ idx: i, rec: rec, isNew: false });
    }
    due.sort(function (a, b) { return a.rec.due - b.rec.due; });
    if (due.length > REVIEW_CAP) due = due.slice(0, REVIEW_CAP);

    return due.concat(pickNew(newLeftToday()));
  }

  /* 取 N 个未学过的词。顺序模式按词表游标往后走；
     乱序模式把剩余未学词打散后抽前 N 个。 */
  function pickNew(count) {
    if (!book || count <= 0) return [];
    var words = book.words;
    var out = [];

    if (state.order === 'random') {
      var pool = [];
      for (var i = 0; i < words.length; i++) {
        if (!state.words[words[i][0]]) pool.push(i);
      }
      window.AppVocabData.shuffle(pool);
      for (var k = 0; k < pool.length && out.length < count; k++) {
        out.push({ idx: pool[k], rec: null, isNew: true });
      }
      return out;
    }

    for (var j = state.seq; j < words.length && out.length < count; j++) {
      if (state.words[words[j][0]]) continue;
      out.push({ idx: j, rec: null, isNew: true });
    }
    return out;
  }

  /* ---------- 渲染工具 ---------- */
  var el = null;
  var view = 'home';      // home | play | result | stats | settings
  var tab = 'today';      // today | stats | settings
  var queue = [];
  var qi = 0;
  var answered = false;
  var current = null;
  var sessionStats = { right: 0, wrong: 0 };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function owl(name, cls) {
    return '<img class="vc-owl' + (cls ? ' ' + cls : '') + '" src="assets/vocab/owl_' + name + '.webp" alt="" draggable="false">';
  }

  function subnav() {
    return '<div class="vc-subnav">' +
      ['today', 'stats', 'settings'].map(function (k) {
        var label = k === 'today' ? '今日' : k === 'stats' ? '统计' : '设置';
        return '<button type="button" class="vc-tab' + (tab === k ? ' active' : '') +
          '" data-tab="' + k + '">' + label + '</button>';
      }).join('') +
      '</div>';
  }

  function bindSubnav() {
    el.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        tab = b.getAttribute('data-tab');
        view = 'home';
        renderHome();
      };
    });
  }

  function knownCount() {
    return Object.keys(state.words).length;
  }

  function masteredCount() {
    var n = 0;
    for (var k in state.words) if (state.words[k].box >= 4) n++;
    return n;
  }

  function accuracy() {
    var a = state.totalAnswered || 0;
    if (!a) return 0;
    return Math.round((state.totalRight || 0) / a * 100);
  }

  /* ---------- 今日屏 ---------- */
  function renderHome() {
    if (!el) return;
    if (loadErr) { renderLoadError(); return; }

    var total = queue.length;
    var dueN = 0, newN = 0;
    queue.forEach(function (q) { if (q.isNew) newN++; else dueN++; });

    var head = '<div class="vc-wrap">' + subnav();

    if (tab === 'stats') { el.innerHTML = head + statsHtml() + '</div>'; bindSubnav(); bindStats(); return; }
    if (tab === 'settings') { el.innerHTML = head + settingsHtml() + '</div>'; bindSubnav(); bindSettings(); return; }

    var body;
    if (!total) {
      body =
        '<div class="vc-panel vc-done">' + owl('sleep') +
          '<h2>今天的任务清空了</h2>' +
          '<p>已答 <b>' + state.doneToday + '</b> 题 · 连续打卡 <b>' + state.streak + '</b> 天</p>' +
          '<p class="vc-dim">明天到期复习会自动排好；也可以现在多背一组。</p>' +
          '<div class="vc-actions">' +
            '<button class="vc-btn primary" id="vcExtra" type="button">再来一组新词</button>' +
            '<button class="vc-btn ghost" id="vcGoStats" type="button">看统计</button>' +
          '</div>' +
        '</div>';
    } else {
      var pct = total ? Math.round((1 - (dueN + newN) / total) * 0) : 0;
      body =
        '<div class="vc-hero">' +
          '<div class="vc-hero-art">' + owl('think') + '</div>' +
          '<div class="vc-hero-main">' +
            '<div class="vc-hero-tag">' + (state.book === 'cet6' ? 'CET-6' : 'CET-4') +
              ' · 第 ' + (state.streak + 1) + ' 天 · ' + (state.order === 'random' ? '乱序' : '顺序') + '</div>' +
            '<h1 class="vc-hero-title">今日摸鱼局</h1>' +
            '<p class="vc-hero-sub">待复习 <b>' + dueN + '</b> · 新词 <b>' + newN + '</b> · 共 <b>' + total + '</b> 题</p>' +
            '<div class="vc-bar"><i style="width:' + Math.min(100, Math.round(state.doneToday / Math.max(total, 1) * 100)) + '%"></i></div>' +
            '<div class="vc-actions">' +
              '<button class="vc-btn primary" id="vcStart" type="button">开始背 →</button>' +
              '<button class="vc-btn ghost" id="vcToSettings" type="button">调设置</button>' +
            '</div>' +
          '</div>' +
        '</div>' +
        statStrip() +
        weekStrip();
    }

    el.innerHTML = head + body +
      '<div class="vc-note">词库 KyleBing/english-vocabulary（BSD-3-Clause）· 进度只存本机</div>' +
      '</div>';

    bindSubnav();
    var sb = el.querySelector('#vcStart');
    if (sb) sb.onclick = function () { startSession(); };
    var tb = el.querySelector('#vcToSettings');
    if (tb) tb.onclick = function () { tab = 'settings'; renderHome(); };
    var eb = el.querySelector('#vcExtra');
    if (eb) eb.onclick = function () {
      state.newDoneToday = 0;
      saveState();
      buildAndStart();
    };
    var gs = el.querySelector('#vcGoStats');
    if (gs) gs.onclick = function () { tab = 'stats'; renderHome(); };
  }

  function statStrip() {
    var items = [
      { k: '累计学过', v: knownCount(), u: '词' },
      { k: '已掌握', v: masteredCount(), u: '词' },
      { k: '连续打卡', v: state.streak, u: '天' },
      { k: '学习时长', v: fmtDuration(state.totalMs), u: '' }
    ];
    return '<div class="vc-strip">' + items.map(function (it) {
      return '<div class="vc-stat"><b>' + esc(it.v) + '</b>' +
        (it.u ? '<i>' + it.u + '</i>' : '') +
        '<span>' + it.k + '</span></div>';
    }).join('') + '</div>';
  }

  /* 最近 7 天打卡条 */
  function weekStrip() {
    var out = [];
    var now = new Date();
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      var n = state.days[key] || 0;
      var lvl = n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : 3;
      out.push('<div class="vc-day lv' + lvl + '" title="' + key + '：' + n + ' 题">' +
        '<span>' + (d.getMonth() + 1) + '/' + d.getDate() + '</span></div>');
    }
    return '<div class="vc-week"><div class="vc-week-h">最近 7 天</div>' +
      '<div class="vc-week-grid">' + out.join('') + '</div></div>';
  }

  /* ---------- 统计屏 ---------- */
  function statsHtml() {
    var known = knownCount();
    var total = book ? book.words.length : 0;
    var pct = total ? Math.round(known / total * 100) : 0;
    var boxes = [0, 0, 0, 0, 0, 0];
    for (var k in state.words) {
      var b = state.words[k].box || 0;
      boxes[Math.min(MAX_BOX, b)]++;
    }
    var boxLabels = ['新学', '1 档', '2 档', '3 档', '4 档', '熟练'];

    return '<div class="vc-panel">' +
      '<h2 class="vc-h2">学习统计</h2>' +
      '<div class="vc-kv"><span>累计学过</span><b>' + known + ' / ' + total + ' 词</b></div>' +
      '<div class="vc-bar"><i style="width:' + pct + '%"></i></div>' +
      '<div class="vc-kv small"><span>' + (state.book === 'cet6' ? 'CET-6' : 'CET-4') + ' 词库完成度</span><b>' + pct + '%</b></div>' +
      '<div class="vc-grid2">' +
        '<div class="vc-cell"><b>' + masteredCount() + '</b><span>已掌握（4 档以上）</span></div>' +
        '<div class="vc-cell"><b>' + fmtDuration(state.totalMs) + '</b><span>累计学习时长</span></div>' +
        '<div class="vc-cell"><b>' + (state.totalAnswered || 0) + '</b><span>累计答题</span></div>' +
        '<div class="vc-cell"><b>' + accuracy() + '%</b><span>总正确率</span></div>' +
      '</div>' +
      '<div class="vc-h3">记忆档位分布</div>' +
      '<div class="vc-boxes">' + boxes.map(function (n, i) {
        return '<div class="vc-boxrow"><span>' + boxLabels[i] + '</span>' +
          '<div class="vc-bar thin"><i style="width:' + (known ? Math.round(n / known * 100) : 0) + '%"></i></div>' +
          '<b>' + n + '</b></div>';
      }).join('') + '</div>' +
      '<div class="vc-h3">最近 30 天</div>' + heatmap(30) +
      '</div>';
  }

  function heatmap(days) {
    var cells = [];
    var now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      var n = state.days[key] || 0;
      var lvl = n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : 3;
      cells.push('<i class="lv' + lvl + '" title="' + key + '：' + n + ' 题"></i>');
    }
    return '<div class="vc-heat">' + cells.join('') + '</div>';
  }

  function bindStats() { /* 纯展示，无交互 */ }

  /* ---------- 设置屏 ---------- */
  function settingsHtml() {
    return '<div class="vc-panel">' +
      '<h2 class="vc-h2">设置</h2>' +

      '<div class="vc-field">' +
        '<div class="vc-field-h">每天新词数量</div>' +
        '<div class="vc-field-d">决定每天从词库里取多少个新词，到期复习另算（上限 60）。</div>' +
        '<div class="vc-chips">' + DAILY_CHOICES.map(function (n) {
          return '<button type="button" class="vc-chip' + (state.dailyNew === n ? ' active' : '') +
            '" data-daily="' + n + '">' + n + ' 个</button>';
        }).join('') + '</div>' +
      '</div>' +

      '<div class="vc-field">' +
        '<div class="vc-field-h">出词顺序</div>' +
        '<div class="vc-field-d">顺序按词表从头往后走；乱序每次从没学过的词里随机抽。</div>' +
        '<div class="vc-chips">' +
          '<button type="button" class="vc-chip' + (state.order !== 'random' ? ' active' : '') + '" data-order="seq">顺序</button>' +
          '<button type="button" class="vc-chip' + (state.order === 'random' ? ' active' : '') + '" data-order="random">乱序</button>' +
        '</div>' +
      '</div>' +

      '<div class="vc-field">' +
        '<div class="vc-field-h">词库</div>' +
        '<div class="vc-field-d">切换词库会清空当前词库的学习记录，两个词库各自独立。</div>' +
        '<div class="vc-chips">' +
          '<button type="button" class="vc-chip' + (state.book === 'cet4' ? ' active' : '') + '" data-book="cet4">CET-4 · 4544 词</button>' +
          '<button type="button" class="vc-chip' + (state.book === 'cet6' ? ' active' : '') + '" data-book="cet6">CET-6 · 3991 词</button>' +
        '</div>' +
      '</div>' +

      '<div class="vc-field">' +
        '<div class="vc-field-h">数据</div>' +
        '<div class="vc-field-d">所有进度只存在这台设备的浏览器里，不上传。</div>' +
        '<button type="button" class="vc-btn ghost danger" id="vcReset">清空学习记录</button>' +
      '</div>' +
      '</div>';
  }

  function bindSettings() {
    el.querySelectorAll('[data-daily]').forEach(function (b) {
      b.onclick = function () {
        var n = +b.getAttribute('data-daily');
        if (n === state.dailyNew) return;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        state.dailyNew = n;
        saveState();
        queue = buildQueue();
        renderHome();
      };
    });
    el.querySelectorAll('[data-order]').forEach(function (b) {
      b.onclick = function () {
        var o = b.getAttribute('data-order');
        if (o === state.order) return;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        state.order = o;
        saveState();
        queue = buildQueue();
        renderHome();
      };
    });
    el.querySelectorAll('[data-book]').forEach(function (b) {
      b.onclick = function () {
        var bk = b.getAttribute('data-book');
        if (bk === state.book) return;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        switchBook(bk);
      };
    });
    var rb = el.querySelector('#vcReset');
    if (rb) rb.onclick = function () {
      if (!window.confirm('清空本机所有背单词记录？此操作不可恢复。')) return;
      state = emptyState();
      state.day = todayKey();
      saveState();
      book = null; loading = null; loadErr = '';
      queue = [];
      tab = 'today';
      boot();
    };
  }

  function switchBook(bk) {
    state.book = bk;
    state.seq = 0;
    state.words = {};
    state.days = {};
    state.newDoneToday = 0;
    state.doneToday = 0;
    state.totalMs = 0;
    state.totalAnswered = 0;
    state.totalRight = 0;
    saveState();
    /* 队列和当前题都是旧词书的索引，必须一起清掉——
       只清 book 的话，接着答题会用旧词表的下标去读新词表 */
    queue = [];
    qi = 0;
    answered = false;
    current = null;
    book = null; extra = { ex: null, roots: null, exam: null }; loading = null; loadErr = '';
    tab = 'today';
    boot();
  }

  /* ---------- 答题屏 ---------- */
  function renderQuestion() {
    if (!el || !current) return;
    var w = current;
    var n = qi + 1;
    var pct = queue.length ? Math.round(qi / queue.length * 100) : 0;
    var leftN = Math.max(0, queue.length - qi - 1);

    el.innerHTML =
      '<div class="vc-wrap vc-play">' +
        '<div class="vc-top">' +
          '<button class="vc-back" id="vcBack" type="button" aria-label="返回今日">← 返回</button>' +
          '<span class="vc-kind">' + (w.retry ? '再来一次' : '认词') + '</span>' +
          '<span class="vc-count">' + n + ' / ' + queue.length + '</span>' +
        '</div>' +
        '<div class="vc-bar thin"><i style="width:' + pct + '%"></i></div>' +
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
        '<div class="vc-playfoot">' +
          '<div class="vc-playfoot-stats">' +
            '<span>本局 <b>' + sessionStats.right + '</b> 对 / <b>' + sessionStats.wrong + '</b> 错</span>' +
            '<span>还剩 <b>' + leftN + '</b> 题</span>' +
            '<span>今日累计 <b>' + state.doneToday + '</b> 题</span>' +
          '</div>' +
          owl('think') +
        '</div>' +
      '</div>';

    var opts = el.querySelectorAll('.vc-opt');
    for (var i = 0; i < opts.length; i++) opts[i].onclick = onPick;

    var back = el.querySelector('#vcBack');
    if (back) back.onclick = function () {
      if (window.SFX && window.SFX.back) window.SFX.back();
      tickFlush();
      saveState();
      queue = [];
      qi = 0;
      answered = false;
      current = null;
      tab = 'today';
      view = 'home';
      queue = buildQueue();
      renderHome();
    };
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

    tickFlush();

    /* 累计统计：答题数、正确数、当日热力 */
    state.totalAnswered = (state.totalAnswered || 0) + 1;
    if (ok) state.totalRight = (state.totalRight || 0) + 1;
    state.doneToday = (state.doneToday || 0) + 1;
    var dk = todayKey();
    state.days[dk] = (state.days[dk] || 0) + 1;

    if (ok) sessionStats.right++;
    else sessionStats.wrong++;

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

  /* 答题结果落到调度表。答错的词当场插到队尾重来一次，
     但同一局只重排一次——否则一直答错会让队列无限增长。 */
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
      rec.due = today;
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
    tickStart();
    view = 'play';
    renderQuestion();
  }

  function finishSession() {
    tickFlush();
    var right = sessionStats.right, wrong = sessionStats.wrong;
    var acc = right + wrong ? Math.round(right / (right + wrong) * 100) : 0;
    var pose = acc >= 80 ? 'cheer' : acc >= 60 ? 'happy' : 'sad';

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
    state.newDoneToday = (state.newDoneToday || 0) + usedNew;
    /* 游标只推进到本局真正出现过的新词之后；乱序模式不动游标 */
    if (state.order !== 'random' && maxNewIdx >= 0) {
      state.seq = Math.max(state.seq, maxNewIdx + 1);
    }
    saveState();

    view = 'result';
    el.innerHTML =
      '<div class="vc-wrap">' + subnav() +
      '<div class="vc-panel vc-done">' + owl(pose) +
      '<h2>本局完成</h2>' +
      '<p>答对 <b>' + right + '</b> · 答错 <b>' + wrong + '</b> · 正确率 <b>' + acc + '%</b></p>' +
      '<p class="vc-dim">连续打卡 ' + state.streak + ' 天 · 累计 ' + fmtDuration(state.totalMs) + '</p>' +
      '<div class="vc-actions">' +
        '<button class="vc-btn primary" id="vcAgain" type="button">再来一组</button>' +
        '<button class="vc-btn ghost" id="vcHome" type="button">回到今日</button>' +
      '</div></div></div>';

    bindSubnav();
    var ab = el.querySelector('#vcAgain');
    if (ab) ab.onclick = function () { state.newDoneToday = 0; saveState(); buildAndStart(); };
    var hb = el.querySelector('#vcHome');
    if (hb) hb.onclick = function () {
      queue = buildQueue();
      qi = 0;
      tab = 'today';
      view = 'home';
      renderHome();
    };
  }

  function buildAndStart() {
    queue = buildQueue();
    if (!queue.length) { tab = 'today'; view = 'home'; renderHome(); return; }
    startSession();
  }

  function renderLoadError() {
    el.innerHTML =
      '<div class="vc-wrap"><div class="vc-panel vc-done">' + owl('sad') +
      '<h2>词库加载失败</h2><p>' + esc(loadErr) + '</p>' +
      '<div class="vc-actions"><button class="vc-btn primary" id="vcRetry" type="button">重试</button></div>' +
      '</div></div>';
    var rb = el.querySelector('#vcRetry');
    if (rb) rb.onclick = function () { loadErr = ''; boot(); };
  }

  /* ---------- 启动 ---------- */
  function boot() {
    if (!el) return;
    el.innerHTML = '<div class="vc-wrap"><div class="vc-panel vc-done"><div class="vc-spinner"></div><h2>正在加载词库…</h2></div></div>';
    ensureBook().then(function () {
      queue = buildQueue();
      qi = 0;
      answered = false;
      current = null;
      view = 'home';
      renderHome();
    }).catch(function () { renderLoadError(); });
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
       不能因为 DOM 里已有内容就跳过——页面开着过夜后额度要能重置。 */
    restoreView: function () {
      loadState();
      rollDay();
      if (!el) el = document.getElementById('mod-vocab');
      if (el) boot();
    },
    /* 离开模块时把未结算的学习时长落盘 */
    destroy: function () {
      tickFlush();
      saveState();
    }
  };
})();
