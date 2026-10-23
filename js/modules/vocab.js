/* =========================================================
   模块 13：背单词 (Vocabulary · CET-4 / CET-6)
   ---------------------------------------------------------
   四屏：今日 / 生词本 / 统计 / 设置，外加答题屏。
   词库来自 KyleBing/english-vocabulary（BSD-3-Clause），
   由 scripts/build-vocab*.js 清洗成 assets/vocab/*.json。

   三种题型按记忆档位轮转：
     box 0-1 → 认词（词 → 四选一释义）
     box 2-3 → 拼写（释义 + 音标 + 首字母 → 键盘输入）
     box 4-5 → 填空（例句挖空 → 四选一词形，真题优先）
   调度：box 0..5，间隔 [0,1,2,4,7,15,30] 天。
     答对 → box+1；答错 → 归 0，当局限一次重排。
   ========================================================= */

(function () {
  'use strict';

  var SAVE_KEY = 'juice_vocab_v1';
  var INTERVALS = [0, 1, 2, 4, 7, 15, 30];
  var MAX_BOX = 5;
  var REVIEW_CAP = 60;
  var DAILY_CHOICES = [10, 15, 25, 50];
  var IDLE_CAP_MS = 30 * 60 * 1000;
  var HEAT_DAYS = 90;

  /* ---------- 状态 ---------- */
  function emptyState() {
    return {
      book: 'cet4',
      day: '',
      newDoneToday: 0,
      doneToday: 0,
      streak: 0,
      lastDone: '',
      words: {},         // 词 → { box, due, seen, wrong }
      seq: 0,
      dailyNew: 15,
      order: 'seq',
      totalMs: 0,
      totalAnswered: 0,
      totalRight: 0,
      days: {}
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
      if (typeof s.newLeft === 'number' && typeof s.newDoneToday !== 'number') {
        state.newDoneToday = Math.max(0, (state.dailyNew || 15) - s.newLeft);
      }
    } catch (e) {
      state = emptyState();
    }
    /* 不能在这里把 day 改成今天：跨天判定要读存档里的旧日期 */
  }

  function saveState() {
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) {}
  }

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
    if (d > 0 && d < IDLE_CAP_MS) state.totalMs = (state.totalMs || 0) + d;
  }
  function fmtDuration(ms) {
    var min = Math.floor((ms || 0) / 60000);
    if (min < 60) return min + ' 分钟';
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
  }

  /* ---------- 数据 ---------- */
  var book = null;
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

  /* 详情数据按需加载：只有需要卡片背面 / 填空题才拉 */
  function ensureExtra() {
    if (extra.roots && extra.exam && extra.ex) return Promise.resolve(extra);
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

  /* ---------- 渲染状态 ---------- */
  var el = null;
  var tab = 'today';      // today | words | stats | settings
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

  function owl(name) {
    return '<img class="vc-owl" src="assets/vocab/owl_' + name + '.webp" alt="" draggable="false">';
  }

  var TABS = [
    { k: 'today', label: '今日' },
    { k: 'words', label: '生词本' },
    { k: 'stats', label: '统计' },
    { k: 'settings', label: '设置' }
  ];

  function subnav() {
    return '<div class="vc-subnav">' + TABS.map(function (t) {
      return '<button type="button" class="vc-tab' + (tab === t.k ? ' active' : '') +
        '" data-tab="' + t.k + '">' + t.label + '</button>';
    }).join('') + '</div>';
  }

  function bindSubnav() {
    el.querySelectorAll('[data-tab]').forEach(function (b) {
      b.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        tickFlush();
        saveState();
        tab = b.getAttribute('data-tab');
        renderHome();
      };
    });
  }

  function knownCount() { return Object.keys(state.words).length; }

  function masteredCount() {
    var n = 0;
    for (var k in state.words) if (state.words[k].box >= 4) n++;
    return n;
  }

  function accuracy() {
    var a = state.totalAnswered || 0;
    return a ? Math.round((state.totalRight || 0) / a * 100) : 0;
  }

  /* 生词本：答错过 2 次以上的词 */
  function toughWords() {
    var out = [];
    for (var k in state.words) {
      var r = state.words[k];
      if ((r.wrong || 0) >= 2) out.push({ word: k, rec: r });
    }
    out.sort(function (a, b) {
      if (b.rec.wrong !== a.rec.wrong) return b.rec.wrong - a.rec.wrong;
      return (a.rec.box || 0) - (b.rec.box || 0);
    });
    return out;
  }

  function idxOfWord(w) {
    if (!book) return -1;
    for (var i = 0; i < book.words.length; i++) {
      if (book.words[i][0] === w) return i;
    }
    return -1;
  }

  /* ---------- 首页分发 ---------- */
  function renderHome() {
    if (!el) return;
    if (loadErr) { renderLoadError(); return; }
    var head = '<div class="vc-wrap">' + subnav();
    var body = '';
    if (tab === 'today') body = todayHtml();
    else if (tab === 'words') body = wordsHtml();
    else if (tab === 'stats') body = statsHtml();
    else body = settingsHtml();

    el.innerHTML = head + body +
      '<div class="vc-note">词库 KyleBing/english-vocabulary（BSD-3-Clause）· 进度只存本机</div>' +
      '</div>';

    bindSubnav();
    if (tab === 'today') bindToday();
    if (tab === 'words') bindWords();
    if (tab === 'stats') bindStats();
    if (tab === 'settings') bindSettings();
  }

  /* ---------- 今日屏 ---------- */
  function todayHtml() {
    var total = queue.length;
    var dueN = 0, newN = 0;
    queue.forEach(function (q) { if (q.isNew) newN++; else dueN++; });

    if (!total) {
      return '<div class="vc-panel vc-done">' + owl('sleep') +
        '<h2>今天的任务清空了</h2>' +
        '<p>已答 <b>' + state.doneToday + '</b> 题 · 连续打卡 <b>' + state.streak + '</b> 天</p>' +
        '<p class="vc-dim">明天到期复习会自动排好；也可以现在多背一组。</p>' +
        '<div class="vc-actions">' +
          '<button class="vc-btn primary" id="vcExtra" type="button">再来一组新词</button>' +
          '<button class="vc-btn ghost" id="vcGoStats" type="button">看统计</button>' +
        '</div></div>';
    }

    return '<div class="vc-hero">' +
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
      statStrip() + weekStrip();
  }

  function bindToday() {
    var sb = el.querySelector('#vcStart');
    if (sb) sb.onclick = function () { startSession(); };
    var tb = el.querySelector('#vcToSettings');
    if (tb) tb.onclick = function () { tab = 'settings'; renderHome(); };
    var eb = el.querySelector('#vcExtra');
    if (eb) eb.onclick = function () { state.newDoneToday = 0; saveState(); buildAndStart(); };
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

  /* ---------- 生词本 ---------- */
  function wordsHtml() {
    var list = toughWords();
    if (!list.length) {
      return '<div class="vc-panel vc-done">' + owl('happy') +
        '<h2>生词本还是空的</h2>' +
        '<p class="vc-dim">同一个词答错 2 次就会自动进来，方便集中攻克。</p>' +
        '</div>';
    }
    return '<div class="vc-panel">' +
      '<h2 class="vc-h2">生词本</h2>' +
      '<p class="vc-field-d">答错 2 次以上的词自动收录，按错误次数排序。</p>' +
      '<div class="vc-actions" style="margin-bottom:14px">' +
        '<button class="vc-btn primary" id="vcDrill" type="button">专攻这 ' + list.length + ' 个词</button>' +
      '</div>' +
      '<div class="vc-wordlist">' + list.map(function (it, i) {
        var idx = idxOfWord(it.word);
        var m = idx >= 0 ? book.words[idx][2] : '';
        var ph = idx >= 0 ? book.words[idx][1] : '';
        return '<div class="vc-wordrow">' +
          '<div class="vc-wordrow-main">' +
            '<b>' + esc(it.word) + '</b>' +
            (ph ? '<i>' + esc(ph) + '</i>' : '') +
            '<span>' + esc(m) + '</span>' +
          '</div>' +
          '<div class="vc-wordrow-meta">' +
            '<em>错 ' + it.rec.wrong + ' 次</em>' +
            '<button class="vc-mini" type="button" data-remove="' + esc(it.word) + '">移除</button>' +
          '</div>' +
        '</div>';
      }).join('') + '</div></div>';
  }

  function bindWords() {
    var list = toughWords();
    var db = el.querySelector('#vcDrill');
    if (db) db.onclick = function () {
      var items = list.map(function (it) {
        var idx = idxOfWord(it.word);
        return idx >= 0 ? { idx: idx, rec: state.words[it.word], isNew: false } : null;
      }).filter(Boolean);
      if (!items.length) return;
      queue = items;
      startSession();
    };
    el.querySelectorAll('[data-remove]').forEach(function (b) {
      b.onclick = function () {
        var w = b.getAttribute('data-remove');
        if (state.words[w]) {
          state.words[w].wrong = 0;
          saveState();
        }
        renderHome();
      };
    });
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
      '<div class="vc-kv small"><span>' + (state.book === 'cet6' ? 'CET-6' : 'CET-4') +
        ' 词库完成度</span><b>' + pct + '%</b></div>' +
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
      '<div class="vc-h3">最近 ' + HEAT_DAYS + ' 天</div>' + heatmap(HEAT_DAYS) +
      '<div class="vc-heat-legend"><span>少</span><i class="lv0"></i><i class="lv1"></i><i class="lv2"></i><i class="lv3"></i><span>多</span></div>' +
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

  function bindStats() { /* 纯展示 */ }

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
    queue = [];
    qi = 0;
    answered = false;
    current = null;
    book = null; extra = { ex: null, roots: null, exam: null }; loading = null; loadErr = '';
    tab = 'today';
    boot();
  }

  /* ---------- 题型 ---------- */
  /* 按记忆档位选题型：新学用认词，中档用拼写，高档用填空 */
  function kindOf(rec) {
    if (!rec) return 'recall';
    var box = rec.box || 0;
    if (box >= 4) return 'cloze';
    if (box >= 2) return 'spell';
    return 'recall';
  }

  function kindLabel(k) {
    return k === 'cloze' ? '填空' : k === 'spell' ? '拼写' : '认词';
  }

  /* ---------- 答题屏 ---------- */
  function startSession() {
    if (!queue.length) { buildAndStart(); return; }
    qi = 0;
    answered = false;
    sessionStats = { right: 0, wrong: 0 };
    tickStart();
    /* 填空题需要例句数据，先预取；失败也不影响认词/拼写 */
    ensureExtra().then(function () {
      current = makeQuestion(queue[0]);
      renderQuestion();
    });
  }

  function makeQuestion(item) {
    var idx = item.idx;
    var w = book.words[idx];
    var rec = state.words[w[0]] || (item.rec || null);
    var kind = item.forceKind || kindOf(rec);

    var q = {
      idx: idx,
      retry: !!item.retry,
      kind: kind,
      word: w[0],
      phonetic: w[1],
      meaning: w[2],
      options: null,
      sentence: '',
      sentenceCn: '',
      source: ''
    };

    if (kind === 'recall') {
      q.options = window.AppVocabData.makeOptions(book.words, book.byPos, idx);
    } else if (kind === 'spell') {
      q.hint = w[0].charAt(0);
      q.answer = w[0];
    } else {
      /* 填空：真题优先，其次造句例句 */
      var examRow = extra.exam && extra.exam[idx];
      var exRow = extra.ex && extra.ex[idx];
      var raw = '', cn = '', src = '';
      if (examRow && examRow[0]) {
        raw = examRow[0]; src = examRow[1] || '真题';
      } else if (exRow && exRow[0]) {
        raw = exRow[0]; cn = exRow[1] || ''; src = '例句';
      }
      var blanked = window.AppVocabData.blankOut(raw, w[0]);
      if (!blanked) {
        /* 没有可用例句：退回认词，不让玩家卡住 */
        q.kind = 'recall';
        q.options = window.AppVocabData.makeOptions(book.words, book.byPos, idx);
      } else {
        q.sentence = blanked;
        q.sentenceCn = cn;
        q.source = src;
        q.options = window.AppVocabData.makeClozeOptions(book.words, book.byPos, idx);
      }
    }
    return q;
  }

  function renderQuestion() {
    if (!el || !current) return;
    var w = current;
    var n = qi + 1;
    var pct = queue.length ? Math.round(qi / queue.length * 100) : 0;
    var leftN = Math.max(0, queue.length - qi - 1);
    var canSpeak = window.AppVocabData.canSpeak();

    var inner = '';

    if (w.kind === 'recall') {
      inner =
        '<div class="vc-word">' + esc(w.word) + '</div>' +
        '<div class="vc-phon">' + esc(w.phonetic || '') +
          (canSpeak ? '<button class="vc-speak" type="button" id="vcSpeak" aria-label="朗读">🔊</button>' : '') +
        '</div>' +
        '<div class="vc-opts" id="vcOpts">' +
          w.options.map(function (o, i) {
            return '<button class="vc-opt" type="button" data-i="' + i + '">' + esc(o.text) + '</button>';
          }).join('') +
        '</div>';
    } else if (w.kind === 'spell') {
      inner =
        '<div class="vc-word small">' + esc(w.meaning) + '</div>' +
        '<div class="vc-phon">' + esc(w.phonetic || '') +
          (canSpeak ? '<button class="vc-speak" type="button" id="vcSpeak" aria-label="朗读">🔊</button>' : '') +
        '</div>' +
        '<div class="vc-spell">' +
          '<div class="vc-spell-hint">首字母 <b>' + esc(w.hint) + '</b> · 共 <b>' + w.answer.length + '</b> 个字母</div>' +
          '<input class="vc-input" id="vcInput" type="text" autocomplete="off" autocapitalize="off" spellcheck="false" placeholder="拼写这个单词">' +
          '<div class="vc-spell-actions"><button class="vc-btn primary" id="vcSubmit" type="button">提交</button></div>' +
        '</div>';
    } else {
      inner =
        '<div class="vc-cloze">' + esc(w.sentence) + '</div>' +
        (w.sentenceCn ? '<div class="vc-cloze-cn">' + esc(w.sentenceCn) + '</div>' : '') +
        '<div class="vc-source">' + esc(w.source) + '</div>' +
        '<div class="vc-opts" id="vcOpts">' +
          w.options.map(function (o, i) {
            return '<button class="vc-opt" type="button" data-i="' + i + '">' + esc(o.text) + '</button>';
          }).join('') +
        '</div>';
    }

    el.innerHTML =
      '<div class="vc-wrap vc-play">' +
        '<div class="vc-top">' +
          '<button class="vc-back" id="vcBack" type="button" aria-label="返回今日">← 返回</button>' +
          '<span class="vc-kind">' + (w.retry ? '再来一次 · ' : '') + kindLabel(w.kind) + '</span>' +
          '<span class="vc-count">' + n + ' / ' + queue.length + '</span>' +
        '</div>' +
        '<div class="vc-bar thin"><i style="width:' + pct + '%"></i></div>' +
        '<div class="vc-card">' + inner +
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

    bindQuestion();
  }

  function bindQuestion() {
    var back = el.querySelector('#vcBack');
    if (back) back.onclick = leaveSession;

    var sp = el.querySelector('#vcSpeak');
    if (sp) sp.onclick = function (e) {
      e.stopPropagation();
      window.AppVocabData.speak(current.word);
    };

    var opts = el.querySelectorAll('.vc-opt');
    for (var i = 0; i < opts.length; i++) opts[i].onclick = onPick;

    if (current.kind === 'spell') {
      var input = el.querySelector('#vcInput');
      var sub = el.querySelector('#vcSubmit');
      if (sub) sub.onclick = onSubmitSpell;
      if (input) {
        input.focus();
        input.onkeydown = function (e) {
          if (e.key === 'Enter') { e.preventDefault(); onSubmitSpell(); }
        };
      }
    }
  }

  function onSubmitSpell() {
    if (answered) return;
    var input = el.querySelector('#vcInput');
    if (!input) return;
    var val = String(input.value || '').trim().toLowerCase();
    if (!val) return;
    var ok = val === current.answer.toLowerCase();
    answered = true;
    input.disabled = true;
    var sub = el.querySelector('#vcSubmit');
    if (sub) sub.disabled = true;
    finishAnswer(ok, current.answer);
  }

  function onPick(e) {
    if (answered) return;
    answered = true;
    var btn = e.currentTarget;
    var i = +btn.getAttribute('data-i');
    var opt = current.options[i];
    var ok = !!opt.ok;

    var all = el.querySelectorAll('.vc-opt');
    for (var k = 0; k < all.length; k++) {
      all[k].disabled = true;
      if (current.options[+all[k].getAttribute('data-i')].ok) all[k].classList.add('right');
    }
    if (!ok) btn.classList.add('wrong');
    finishAnswer(ok, current.word);
  }

  /* 三种题型共用的结算：统计 → 调度 → 反馈面板（含卡片背面） */
  function finishAnswer(ok, shown) {
    if (window.SFX && window.SFX.tap) window.SFX.tap();

    tickFlush();

    state.totalAnswered = (state.totalAnswered || 0) + 1;
    if (ok) state.totalRight = (state.totalRight || 0) + 1;
    state.doneToday = (state.doneToday || 0) + 1;
    var dk = todayKey();
    state.days[dk] = (state.days[dk] || 0) + 1;

    if (ok) sessionStats.right++;
    else sessionStats.wrong++;

    applySchedule(current.idx, ok);

    if (window.SFX) {
      if (ok && window.SFX.select) window.SFX.select();
      else if (!ok && window.SFX.wrong) window.SFX.wrong();
    }

    var fb = el.querySelector('#vcFb');
    if (!fb) return;
    fb.className = 'vc-feedback show ' + (ok ? 'ok' : 'bad');
    fb.innerHTML =
      '<div class="vc-fb-head"><b>' + (ok ? '答对了' : '答错了') + '</b>' +
      '<span class="vc-fb-ans">' + esc(current.word) + ' · ' + esc(current.meaning) + '</span></div>' +
      '<div class="vc-back-panel" id="vcBackPanel"></div>' +
      '<button class="vc-btn small" id="vcNext" type="button">' +
        (qi + 1 >= queue.length ? '看结果' : '下一题') + '</button>';

    var nb = fb.querySelector('#vcNext');
    if (nb) nb.onclick = nextQuestion;

    renderBackPanel();
  }

  /* 卡片背面：拆词 / 词族 / 真题，有数据才渲染 */
  function renderBackPanel() {
    var box = el.querySelector('#vcBackPanel');
    if (!box) return;
    var idx = current.idx;
    var roots = extra.roots && extra.roots[idx];
    var exam = extra.exam && extra.exam[idx];
    var parts = [];

    if (roots && roots[0]) {
      parts.push('<div class="vc-bp-block"><div class="vc-bp-h">🧩 拆词</div>' +
        '<div class="vc-bp-txt">' + esc(roots[0]) + '</div></div>');
    }
    if (roots && roots[1] && roots[1].length) {
      var byPos = {};
      roots[1].forEach(function (it) {
        var p = it[1] || '其他';
        (byPos[p] || (byPos[p] = [])).push(it[0]);
      });
      var fam = Object.keys(byPos).map(function (p) {
        return '<div class="vc-fam-row"><span>' + esc(p) + '.</span>' +
          byPos[p].map(function (w) {
            var j = idxOfWord(w);
            return j >= 0
              ? '<button type="button" class="vc-fam-word" data-jump="' + j + '">' + esc(w) + '</button>'
              : '<em>' + esc(w) + '</em>';
          }).join('') + '</div>';
      }).join('');
      parts.push('<div class="vc-bp-block"><div class="vc-bp-h">🌳 词族</div>' + fam + '</div>');
    }
    if (exam && exam[0]) {
      parts.push('<div class="vc-bp-block"><div class="vc-bp-h">📝 真题</div>' +
        '<div class="vc-bp-exam">' + esc(exam[0]) + '</div>' +
        '<div class="vc-bp-src">' + esc(exam[1] || '') + '</div></div>');
    }
    if (!parts.length) { box.innerHTML = ''; return; }

    box.innerHTML = parts.join('');
    box.querySelectorAll('[data-jump]').forEach(function (b) {
      b.onclick = function () {
        var j = +b.getAttribute('data-jump');
        queue.splice(qi + 1, 0, { idx: j, rec: state.words[book.words[j][0]] || null, isNew: false, forceKind: 'recall' });
        nextQuestion();
      };
    });
  }

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

  function leaveSession() {
    if (window.SFX && window.SFX.back) window.SFX.back();
    tickFlush();
    saveState();
    queue = [];
    qi = 0;
    answered = false;
    current = null;
    tab = 'today';
    queue = buildQueue();
    renderHome();
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
    var usedNew = 0, maxNewIdx = -1;
    queue.forEach(function (q) {
      if (!q.isNew) return;
      usedNew++;
      if (q.idx > maxNewIdx) maxNewIdx = q.idx;
    });
    state.newDoneToday = (state.newDoneToday || 0) + usedNew;
    if (state.order !== 'random' && maxNewIdx >= 0) {
      state.seq = Math.max(state.seq, maxNewIdx + 1);
    }
    saveState();

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
      renderHome();
    };
  }

  function buildAndStart() {
    queue = buildQueue();
    if (!queue.length) { tab = 'today'; renderHome(); return; }
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
      renderHome();
      /* 背面数据后台预热，答题时不用等 */
      ensureExtra();
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
    restoreView: function () {
      loadState();
      rollDay();
      if (!el) el = document.getElementById('mod-vocab');
      if (el) boot();
    },
    destroy: function () {
      tickFlush();
      saveState();
    }
  };
})();
