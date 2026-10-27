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
  function emptyBook() {
    return {
      day: '',
      newDoneToday: 0,
      doneToday: 0,
      streak: 0,
      lastDone: '',
      words: {},         // 词 → { box, due, seen, wrong }
      seq: 0,
      totalMs: 0,
      totalAnswered: 0,
      totalRight: 0,
      days: {}
    };
  }

  function emptyState() {
    return {
      ver: 2,
      book: 'cet4',
      dailyNew: 15,
      order: 'seq',
      /* 选择题方向：en2cn = 英选中；cn2en = 中选英 */
      dir: 'en2cn',
      /* 题型开关：关掉的题型不参与轮转 */
      kinds: { recall: true, spell: true, cloze: false },
      /* 自动朗读：英选中出题时自动读一遍单词（s 键随时手动读） */
      autoSpeak: false,
      /* 全服榜计数（跨词库累计） */
      bw: null,
      /* 每个词库一份独立进度，切换词库不再清空 */
      books: { cet4: emptyBook(), cet6: emptyBook() }
    };
  }

  /* 当前词库的进度记录（state.book 指向的那份） */
  function bs() {
    if (!state.books || typeof state.books !== 'object') state.books = {};
    if (!state.books[state.book]) state.books[state.book] = emptyBook();
    return state.books[state.book];
  }


  /* ---------- 全服榜周期计数 ---------- */
  function pad2(n) { return (n < 10 ? '0' : '') + n; }
  function dayKey8() {
    var d = new Date();
    return d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate());
  }
  function weekKey6() {
    /* ISO 周（周一为一周之始）：以本周四所在的年份为周所属年 */
    var d = new Date();
    var mon = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
    var thu = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + 3);
    var jan1 = new Date(thu.getFullYear(), 0, 1);
    var week = Math.floor((thu - jan1) / 604800000) + 1;
    return thu.getFullYear() + pad2(week);
  }
  /* 历史学习量统计（排行榜上线前就在学的进度不能丢）：
     学过词数 = 词汇表里有进度记录的词；时长/答题对错直接取累计字段 */
  function learnedWordCount() {
    var n = 0;
    for (var k in bs().words) {
      var r = bs().words[k];
      if (r && (r.seen != null || r.box != null || r.wrong != null)) n++;
    }
    return n;
  }

  /* 日/周榜回填：历史上只记了每天的答题数（days），没记词数。
     每个词至少过 英选中+中选英+自评 三题，按 ⌊题数/3⌋ 保守折算词数；
     时长按「终身平均每题耗时」折算，正确率按终身正确率折算。
     只在迁移时执行一次，估算值取 max 防止低于已精确计数的部分。 */
  function backfillDayWeek() {
    var qOf = function (d) { return bs().days[d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate()] || 0; };
    var now = new Date();
    var qDay = qOf(now);
    var qWeek = 0;
    var mon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - ((now.getDay() + 6) % 7));
    for (var i = 0; i < 7; i++) {
      var d = new Date(mon.getFullYear(), mon.getMonth(), mon.getDate() + i);
      if (d > now) break;
      qWeek += qOf(d);
    }
    var qAll = bs().totalAnswered || 0;
    var accAll = qAll ? (bs().totalRight || 0) / qAll : 0;
    var msPerQ = qAll ? (bs().totalMs || 0) / qAll : 0;
    var seed = function (q) {
      return {
        n: Math.floor(q / 3),
        ms: Math.round(q * msPerQ),
        a: q,
        r: Math.round(q * accAll)
      };
    };
    return { day: seed(qDay), week: seed(qWeek) };
  }

  function applyBackfill(target, est) {
    target.n = Math.max(target.n || 0, est.n);
    target.ms = Math.max(target.ms || 0, est.ms);
    target.a = Math.max(target.a || 0, est.a);
    target.r = Math.max(target.r || 0, est.r);
  }

  /* 读取并归一化周期计数：跨日/跨周自动清零，上报水位同步复位 */
  function bw() {
    if (!state.bw || typeof state.bw !== 'object') {
      /* 首次迁移：排行榜上线前的历史进度一次性并入总榜 + 日/周榜 */
      var bf = backfillDayWeek();
      state.bw = {
        day: { k: dayKey8(), n: bf.day.n, ms: bf.day.ms, a: bf.day.a, r: bf.day.r },
        week: { k: weekKey6(), n: bf.week.n, ms: bf.week.ms, a: bf.week.a, r: bf.week.r },
        all: {
          n: learnedWordCount(),
          ms: bs().totalMs || 0,
          a: bs().totalAnswered || 0,
          r: bs().totalRight || 0
        },
        posted: {}, mig: 1, mig2: 1
      };
      saveState();
    } else if (!state.bw.mig) {
      /* v268 上线后已经产生过 bw 的老进度：用权威累计值覆盖总榜口径，
         日/周榜补上历史折算值，并清空已上报水位强制重报（避免历史词数永久丢失） */
      var bf2 = backfillDayWeek();
      state.bw.all = {
        n: learnedWordCount(),
        ms: bs().totalMs || 0,
        a: bs().totalAnswered || 0,
        r: bs().totalRight || 0
      };
      state.bw.day = state.bw.day || { k: dayKey8() };
      state.bw.day.k = dayKey8();
      applyBackfill(state.bw.day, bf2.day);
      state.bw.week = state.bw.week || { k: weekKey6() };
      state.bw.week.k = weekKey6();
      applyBackfill(state.bw.week, bf2.week);
      if (!state.bw.posted) state.bw.posted = {};
      state.bw.posted.all = 0;
      state.bw.posted.day = 0;
      state.bw.posted.week = 0;
      state.bw.mig = 1;
      state.bw.mig2 = 1;
      saveState();
    } else if (!state.bw.mig2) {
      /* v271 补充迁移：首轮迁移只回填了总榜，日/周榜在此补齐 */
      var bf3 = backfillDayWeek();
      state.bw.day = state.bw.day || { k: dayKey8() };
      state.bw.day.k = dayKey8();
      applyBackfill(state.bw.day, bf3.day);
      state.bw.week = state.bw.week || { k: weekKey6() };
      state.bw.week.k = weekKey6();
      applyBackfill(state.bw.week, bf3.week);
      if (!state.bw.posted) state.bw.posted = {};
      state.bw.posted.day = 0;
      state.bw.posted.week = 0;
      state.bw.mig2 = 1;
      saveState();
    }
    var b = state.bw;
    var dk = dayKey8(), wk = weekKey6();
    if (b.day.k !== dk) { b.day = { k: dk, n: 0, ms: 0, a: 0, r: 0 }; b.posted.day = 0; }
    if (b.week.k !== wk) { b.week = { k: wk, n: 0, ms: 0, a: 0, r: 0 }; b.posted.week = 0; }
    if (!b.all) b.all = { n: 0, ms: 0, a: 0, r: 0 };
    if (b.day.a == null) { b.day.a = 0; b.day.r = 0; }
    if (b.week.a == null) { b.week.a = 0; b.week.r = 0; }
    if (b.all.a == null) { b.all.a = 0; b.all.r = 0; }
    if (!b.posted) b.posted = {};
    if (b.posted.all == null) b.posted.all = 0;
    return b;
  }
  var countedWords = {};   // 本局已计数（背完自评）的词，防重复
  /* 上报三榜：绝对计数取历史最大，重复上报幂等，无增量就跳过 */
  function submitBoards(after) {
    var prof = window.AppProfile ? window.AppProfile.get() : null;
    if (!prof || !prof.id) { if (after) after(false); return; }
    var b = bw();
    var accOf = function (o) { return o && o.a ? Math.round(o.r / o.a * 100) : null; };
    var jobs = [
      { game: 'vocab_day', period: b.day.k, count: b.day.n, ms: b.day.ms, acc: accOf(b.day), pk: 'day' },
      { game: 'vocab_week', period: b.week.k, count: b.week.n, ms: b.week.ms, acc: accOf(b.week), pk: 'week' },
      { game: 'vocab_all', period: '', count: b.all.n, ms: b.all.ms, acc: accOf(b.all), pk: 'all' }
    ].filter(function (j) {
      return j.count && j.count > (b.posted[j.pk] || 0);
    });
    jobs.forEach(function (j) {
      b.posted[j.pk] = j.count;
    });
    saveState();
    if (!jobs.length) { if (after) after(false); return; }
    Promise.all(jobs.map(function (j) {
      return fetch('/api/leaderboard', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          game: j.game, period: j.period, id: prof.id,
          name: prof.name, avatar: prof.avatar,
          count: j.count, ms: Math.round(j.ms || 0),
          acc: j.acc == null ? undefined : j.acc
        })
      }).catch(function () {});
    })).then(function () { if (after) after(true); }, function () { if (after) after(true); });
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
    if (!raw) { state = emptyState(); bs().day = todayKey(); saveState(); return; }
    try {
      var s = JSON.parse(raw) || {};
      if (!s.books) {
        /* v1 → v2：老存档只有一份进度，归入当时所选词库，另一个词库从零开始 */
        var bk1 = s.book === 'cet6' ? 'cet6' : 'cet4';
        var old1 = emptyBook();
        old1.day = s.day || '';
        old1.newDoneToday = s.newDoneToday || 0;
        if (typeof s.newLeft === 'number' && typeof s.newDoneToday !== 'number') {
          var q1 = typeof s.dailyNew === 'number' ? s.dailyNew : 15;
          old1.newDoneToday = Math.max(0, q1 - s.newLeft);
        }
        old1.doneToday = s.doneToday || 0;
        old1.streak = s.streak || 0;
        old1.lastDone = s.lastDone || '';
        old1.words = (s.words && typeof s.words === 'object') ? s.words : {};
        old1.seq = s.seq || 0;
        old1.totalMs = s.totalMs || 0;
        old1.totalAnswered = s.totalAnswered || 0;
        old1.totalRight = s.totalRight || 0;
        old1.days = (s.days && typeof s.days === 'object') ? s.days : {};
        state = emptyState();
        state.book = bk1;
        state.dailyNew = typeof s.dailyNew === 'number' ? s.dailyNew : 15;
        state.order = s.order === 'random' ? 'random' : 'seq';
        state.bw = s.bw || null;
        state.books[bk1] = old1;
        saveState();
        return;
      }
      state = Object.assign(emptyState(), s);
      if (!state.books || typeof state.books !== 'object') state.books = {};
      if (state.book !== 'cet6') state.book = 'cet4';
      if (!state.kinds || typeof state.kinds !== 'object') {
        state.kinds = { recall: true, spell: true, cloze: false };
      }
      if (state.dir !== 'cn2en') state.dir = 'en2cn';
      bs();
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
    if (bs().day === today) return false;
    bs().day = today;
    bs().newDoneToday = 0;
    bs().doneToday = 0;
    saveState();
    return true;
  }

  function newLeftToday() {
    /* 不能写 (state.dailyNew || 15)：0 会被 || 当成假值变成 15，
       导致「今天不背新词」这个合法设置失效 */
    var quota = typeof state.dailyNew === 'number' ? state.dailyNew : 15;
    return Math.max(0, quota - (bs().newDoneToday || 0));
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
      bs().totalMs = (bs().totalMs || 0) + d;
      var b = bw();
      b.day.ms = (b.day.ms || 0) + d;
      b.week.ms = (b.week.ms || 0) + d;
      b.all.ms = (b.all.ms || 0) + d;
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
  var book = null;
  var extra = { ex: null, roots: null, exam: null };
  var loading = null;
  var loadErr = '';

  function ensureBook() {
    if (book) return Promise.resolve(book);
    if (loading) return loading;
    loading = window.AppVocabData.loadBook(state.book)
      .then(function (b) {
        book = b;
        pruneOrphans(state.book, b.words);
        return b;
      })
      .catch(function (err) { loadErr = err.message || '词库加载失败'; loading = null; throw err; });
    return loading;
  }

  /* 词库换版后，旧存档里可能有已经不在词库中的词。
     留着会在生词本 / 已标熟列表里显示成没有释义的空行，这里清掉。
     进度按词名存，所以只删不存在的词，其余记录不受影响。 */
  function pruneOrphans(level, words) {
    var bk = state.books && state.books[level];
    if (!bk || !bk.words) return;
    var alive = Object.create(null);
    for (var i = 0; i < words.length; i++) alive[words[i][0]] = 1;
    var dropped = 0;
    for (var k in bk.words) {
      if (!alive[k]) { delete bk.words[k]; dropped++; }
    }
    if (dropped) saveState();
  }

  /* 词库词数：优先用已加载的那本，其余按需读（用于设置页标签，不阻塞渲染） */
  var bookCounts = Object.create(null);
  function bookCount(level) {
    if (book && level === state.book) return book.words.length;
    if (bookCounts[level] != null) return bookCounts[level];
    window.AppVocabData.loadBook(level).then(function (b) {
      bookCounts[level] = b.words.length;
      var chip = el && el.querySelector('.vc-chip[data-book="' + level + '"]');
      if (chip) chip.textContent = (level === 'cet6' ? 'CET-6' : 'CET-4') + ' · ' + b.words.length + ' 词';
    }).catch(function () {});
    return '…';
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
      var rec = bs().words[words[i][0]];
      if (!rec || rec.known) continue;   // 已标熟的不再轮回
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
        var r0 = bs().words[words[i][0]];
        if (!r0 || !r0.known) pool.push(i);
      }
      window.AppVocabData.shuffle(pool);
      for (var k = 0; k < pool.length && out.length < count; k++) {
        out.push({ idx: pool[k], rec: null, isNew: true });
      }
      return out;
    }

    for (var j = bs().seq; j < words.length && out.length < count; j++) {
      if (bs().words[words[j][0]]) continue;   // 学过的（含已标熟）不再当新词
      out.push({ idx: j, rec: null, isNew: true });
    }
    return out;
  }

  /* ---------- 渲染状态 ---------- */
  var el = null;
  var tab = 'today';      // today | words | stats | settings
  var wordsTab = 'tough'; // tough | known
  var queue = [];
  var qi = 0;
  var answered = false;
  var current = null;
  var sessionStats = { right: 0, wrong: 0 };
  /* 混合队列：每个词都出三种题型（英选中 / 中选英 / 自评），
     全部展开后打散，同一个词不会连着出现。进度按「题」算。
     自评改判「不认识」→ 这个词的三种题型再排到队尾重来一遍。 */
  var STEPS = ['en2cn', 'cn2en', 'selfrate'];
  /* 三阶段，严格按顺序：
       阶段 1 英选中：本局全部词
       阶段 2 中选英：本局全部词
       阶段 3 自评：本局全部词
     item = { idx, kind } */
  var keyBound = false;
  var redoSet = [];       // 本阶段内答错的词，阶段末补一轮
  var redoRound = 0;      // 本阶段已补过几轮（0/1）
  var stage = 0;          // 0..2
  var stageQueue = [];    // 当前阶段的题
  var sessionWords = [];  // 本局全部词（阶段 2/3 要重排一遍）

  function esc(s) {
    return window.escHtml(s);
  }

  function owl(name) {
    return '<img class="vc-owl" src="assets/vocab/owl_' + name + '.webp" alt="" draggable="false">';
  }

  var TABS = [
    { k: 'today', label: '今日' },
    { k: 'words', label: '生词本' },
    { k: 'stats', label: '统计' },
    { k: 'rank', label: '🏆 排行' },
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

  function knownCount() { return Object.keys(bs().words).length; }

  function masteredCount() {
    var n = 0;
    for (var k in bs().words) {
      if (bs().words[k].known) continue;   // 已标熟单独统计
      if (bs().words[k].box >= 4) n++;
    }
    return n;
  }

  function accuracy() {
    var a = bs().totalAnswered || 0;
    return a ? Math.round((bs().totalRight || 0) / a * 100) : 0;
  }

  /* 生词本：答错过 2 次以上的词 */
  function toughWords() {
    var out = [];
    for (var k in bs().words) {
      var r = bs().words[k];
      if (r.known) continue;
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
    else if (tab === 'rank') body = rankHtml();
    else body = settingsHtml();

    el.innerHTML = head + body +
      '<div class="vc-note">词库 KyleBing/english-vocabulary（BSD-3-Clause）· 进度只存本机</div>' +
      '</div>';

    paintLucide(el);
    bindSubnav();
    if (tab === 'today') bindToday();
    if (tab === 'words') bindWords();
    if (tab === 'stats') bindStats();
    if (tab === 'rank') bindRank();
    if (tab === 'settings') bindSettings();
  }

  /* ---------- 今日屏 ---------- */
  function todayHtml() {
    var total = queue.length;
    var dueN = 0, newN = 0;
    queue.forEach(function (q) { if (q.isNew) newN++; else dueN++; });

    if (!total) {
      return '<div class="vc-panel vc-done">' + owl('sleep') +
        '<h2>今天的单词都背完了</h2>' +
        '<p>今天已背 <b>' + (bw().day.n || 0) + '</b> 个单词 · 已答 <b>' + bs().doneToday + '</b> 题 · 连续打卡 <b>' + bs().streak + '</b> 天</p>' +
        '<p class="vc-dim">明天到期复习会自动排好；也可以现在多背一组。</p>' +
        '<div class="vc-actions">' +
          '<button class="vc-btn primary" id="vcExtra" type="button">再来一组新词</button>' +
          '<button class="vc-btn ghost" id="vcHome" type="button">回到今日</button>' +
          '<button class="vc-btn ghost" id="vcGoStats" type="button">看统计</button>' +
        '</div></div>';
    }

    var dueAll = 0;
    if (book) {
      var td = dayNum(todayKey());
      for (var wi = 0; wi < book.words.length; wi++) {
        var wr = bs().words[book.words[wi][0]];
        if (wr && !wr.known && wr.due <= td) dueAll++;
      }
    }
    var donePct = Math.min(100, Math.round(bs().doneToday / Math.max(total, 1) * 100));
    /* 中间「今日重点」面板：把红框空白区变成有内容的行动区。
       有到期词 → 重点=复习（主按钮变「开始复习」）；无 → 重点=新词任务 */
    var focusTitle, focusDesc, actionsHtml;
    if (dueAll > 0) {
      focusTitle = '今日重点 · 到期复习';
      focusDesc = '有 <b>' + dueAll + '</b> 个词等着巩固——今天做掉最划算';
      actionsHtml =
        '<button class="vc-btn primary" id="vcStartReview" type="button">开始复习 →</button>' +
        '<button class="vc-btn ghost" id="vcStart" type="button">开始背新词</button>';
    } else if (total > 0) {
      focusTitle = '今日重点 · 背新词';
      focusDesc = '准备好 <b>' + newN + '</b> 个新词，开背大约 ' + Math.max(1, Math.round(total * 0.7 / 60)) + ' 分钟';
      actionsHtml =
        '<button class="vc-btn primary" id="vcStart" type="button">开始背 →</button>';
    } else {
      focusTitle = '今日额度已用完';
      focusDesc = '想继续随时加练一组';
      actionsHtml =
        '<button class="vc-btn primary" id="vcExtra" type="button">再加一组 →</button>';
    }
    return '<div class="vc-hero">' +
        '<div class="vc-hero-art">' + owl('think') + '</div>' +
        '<div class="vc-hero-main">' +
          '<div class="vc-hero-tag">' + (state.book === 'cet6' ? 'CET-6' : 'CET-4') +
            ' · 已连续 ' + bs().streak + ' 天 · ' + (state.order === 'random' ? '乱序' : '顺序') + '</div>' +
          '<h1 class="vc-hero-title">今天的单词任务</h1>' +
          '<p class="vc-hero-wordcount">今天已背 <b>' + (bw().day.n || 0) + '</b> 个单词' +
            '（本周 ' + (bw().week.n || 0) + ' · 累计 ' + (bw().all.n || 0) + '）</p>' +
        '</div>' +
        '<div class="vc-hero-focus">' +
          '<b class="vc-focus-title">' + focusTitle + '</b>' +
          '<p class="vc-focus-desc">' + focusDesc + '</p>' +
          '<div class="vc-actions">' + actionsHtml +
          '</div>' +
        '</div>' +
        '<div class="vc-hero-side">' +
          '<div class="vc-hero-kpi main"><b>' + (bw().day.n || 0) + '</b><span>今日已背(词)</span></div>' +
          '<div class="vc-hero-kpi"><b>' + (bw().week.n || 0) + '</b><span>本周(词)</span></div>' +
          '<div class="vc-hero-kpi"><b>' + (bw().all.n || 0) + '</b><span>累计(词)</span></div>' +
          '<div class="vc-bar"><i style="width:' + donePct + '%"></i></div>' +
          '<span class="vc-hero-done">已答 ' + bs().doneToday + ' / ' + total + ' 题</span>' +
        '</div>' +
      '</div>' +
      statStrip() + weekStrip();
  }

  function bindToday() {
    var sb = el.querySelector('#vcStart');
    if (sb) sb.onclick = function () { startSession(); };
    /* 开始复习：只排 due 词（到期复习不含新词） */
    var rb = el.querySelector('#vcStartReview');
    if (rb) rb.onclick = function () {
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      queue = buildQueue().filter(function (q) { return !q.isNew; });
      qi = 0;
      answered = false;
      current = null;
      sessionStats = { right: 0, wrong: 0 };
      countedWords = {};
      startSession();
    };

    var eb = el.querySelector('#vcExtra');
    if (eb) eb.onclick = function () { bs().newDoneToday = 0; saveState(); buildAndStart(); };
    var gs = el.querySelector('#vcGoStats');
    if (gs) gs.onclick = function () { tab = 'stats'; renderHome(); };
    var vcHome = el.querySelector('#vcHome');
    if (vcHome) vcHome.onclick = function () { buildQueue(); qi = 0; answered = false; current = null; tab = 'today'; renderHome(); };
    var ex2 = el.querySelector('#vcExtra');
    if (ex2) ex2.onclick = function () { bs().newDoneToday = 0; saveState(); buildAndStart(); };
  }

  function statStrip() {
    var items = [
      { k: '累计学过', v: knownCount(), u: '词' },
      { k: '已标熟', v: knownWords().length, u: '词' },
      { k: '连续打卡', v: bs().streak, u: '天' },
      { k: '学习时长', v: fmtDuration(bs().totalMs), u: '' }
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
    var sum = 0;
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      var n = bs().days[key] || 0;
      sum += n;
      var lvl = n === 0 ? 0 : n < 10 ? 1 : n < 25 ? 2 : 3;
      var today = i === 0;
      out.push(
        '<div class="vc-day lv' + lvl + (today ? ' today' : '') + '" title="' + key + '：' + n + ' 题">' +
          '<span class="vc-day-d">' + (today ? '今天' : (d.getMonth() + 1) + '/' + d.getDate()) + '</span>' +
          '<b class="vc-day-n">' + n + '</b>' +
        '</div>');
    }
    return '<div class="vc-week">' +
      '<div class="vc-week-h">最近 7 天答题数<span>合计 ' + sum + ' 题</span></div>' +
      '<div class="vc-week-grid">' + out.join('') + '</div></div>';
  }

  /* ---------- 生词本 ---------- */
  /* 已标熟的词（按标熟先后，最近的在前） */
  function knownWords() {
    var out = [];
    for (var k in bs().words) {
      if (bs().words[k].known) out.push({ word: k, rec: bs().words[k] });
    }
    out.sort(function (a, b) { return (b.rec.knownAt || 0) - (a.rec.knownAt || 0); });
    return out;
  }

  var wordsFilter = 'all';    // all | recent | hard
  var wordsKw = '';
  var WEEK_MS = 7 * 86400000;

  function filteredTough() {
    var list = toughWords();
    var kw = wordsKw.trim().toLowerCase();
    if (wordsFilter === 'recent') {
      list = list.filter(function (it) { return it.rec.wrongAt && Date.now() - it.rec.wrongAt < WEEK_MS; });
    } else if (wordsFilter === 'hard') {
      list = list.filter(function (it) { return (it.rec.wrong || 0) >= 3; });
    }
    if (kw) {
      list = list.filter(function (it) {
        var idx = idxOfWord(it.word);
        var m = idx >= 0 ? book.words[idx][2] : '';
        return it.word.toLowerCase().indexOf(kw) >= 0 || String(m).toLowerCase().indexOf(kw) >= 0;
      });
    }
    return list;
  }

  function toughRowHtml(it) {
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
        '<button class="vc-mini" type="button" data-know="' + esc(it.word) + '">标熟</button>' +
        '<button class="vc-mini" type="button" data-remove="' + esc(it.word) + '">移除</button>' +
      '</div>' +
    '</div>';
  }

  function wordsHtml() {
    var list = toughWords();
    var known = knownWords();
    var sub = wordsTab === 'known' ? 'known' : 'tough';

    var tabs =
      '<div class="vc-chips" style="margin-bottom:16px">' +
        '<button type="button" class="vc-chip' + (sub === 'tough' ? ' active' : '') + '" data-wtab="tough">生词本 ' + list.length + '</button>' +
        '<button type="button" class="vc-chip' + (sub === 'known' ? ' active' : '') + '" data-wtab="known">已标熟 ' + known.length + '</button>' +
      '</div>';

    if (sub === 'known') {
      if (!known.length) {
        return '<div class="vc-panel">' +
          '<h2 class="vc-h2">已标熟</h2>' + tabs +
          '<p class="vc-field-d">还没有标熟的词。答题时点「标熟 · 不再出现」，这个词就不会再进任何队列。</p>' +
          '</div>';
      }
      return '<div class="vc-panel">' +
        '<h2 class="vc-h2">已标熟</h2>' + tabs +
        '<p class="vc-field-d">这些词不会再出现在复习队列里。想重新背，点「取消标熟」。</p>' +
        '<div class="vc-wordlist">' + known.map(function (it) {
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
              '<em class="ok">已标熟</em>' +
              '<button class="vc-mini" type="button" data-unknow="' + esc(it.word) + '">取消标熟</button>' +
            '</div>' +
          '</div>';
        }).join('') + '</div></div>';
    }

    if (!list.length) {
      return '<div class="vc-panel">' +
        '<h2 class="vc-h2">生词本</h2>' + tabs +
        '<p class="vc-field-d">同一个词答错 2 次就会自动进来，方便集中攻克。</p>' +
        '</div>';
    }
    var nRecent = list.filter(function (it) { return it.rec.wrongAt && Date.now() - it.rec.wrongAt < WEEK_MS; }).length;
    var nHard = list.filter(function (it) { return (it.rec.wrong || 0) >= 3; }).length;
    var shown = filteredTough();
    var chips =
      '<div class="vc-chips" style="margin-bottom:12px">' +
        '<button type="button" class="vc-chip' + (wordsFilter === 'all' ? ' active' : '') + '" data-wfilter="all">全部 ' + list.length + '</button>' +
        '<button type="button" class="vc-chip' + (wordsFilter === 'recent' ? ' active' : '') + '" data-wfilter="recent">近 7 天 ' + nRecent + '</button>' +
        '<button type="button" class="vc-chip' + (wordsFilter === 'hard' ? ' active' : '') + '" data-wfilter="hard">错 3 次+ ' + nHard + '</button>' +
      '</div>' +
      '<input class="vc-input" id="vcWordSearch" placeholder="在生词本里搜词 / 释义…" value="' + esc(wordsKw) + '" style="margin-bottom:12px">';
    return '<div class="vc-panel">' +
      '<h2 class="vc-h2">生词本</h2>' + tabs +
      '<p class="vc-field-d">答错 2 次以上的词自动收录，按错误次数排序。</p>' + chips +
      '<div class="vc-actions" style="margin-bottom:14px">' +
        '<button class="vc-btn primary" id="vcDrill" type="button">专攻这 ' + shown.length + ' 个词</button>' +
      '</div>' +
      (shown.length
        ? '<div class="vc-wordlist" id="vcWordList">' + shown.map(toughRowHtml).join('') + '</div>'
        : '<p class="vc-field-d">当前筛选下没有词。</p>') +
    '</div>';
  }

  function bindWordRows(scope) {
    /* 局部重绘（搜索过滤）时重绑行按钮；整页路径由下方原有绑定覆盖，这里只兜重复无害 */
    (scope || el).querySelectorAll('[data-remove]').forEach(function (b) {
      b.onclick = function () {
        var w = b.getAttribute('data-remove');
        if (bs().words[w]) { bs().words[w].wrong = 0; saveState(); }
        renderHome();
      };
    });
    (scope || el).querySelectorAll('[data-know]').forEach(function (b) {
      b.onclick = function () {
        var w = b.getAttribute('data-know');
        if (bs().words[w]) {
          bs().words[w].known = true;
          bs().words[w].knownAt = Date.now();
          bs().words[w].box = MAX_BOX;
          bs().words[w].due = dayNum(todayKey()) + 3650;
          saveState();
        }
        renderHome();
      };
    });
  }

  function bindWords() {
    el.querySelectorAll('[data-wtab]').forEach(function (b) {
      b.onclick = function () {
        wordsTab = b.getAttribute('data-wtab');
        renderHome();
      };
    });
    el.querySelectorAll('[data-wfilter]').forEach(function (b) {
      b.onclick = function () {
        wordsFilter = b.getAttribute('data-wfilter');
        renderHome();
      };
    });
    var search = el.querySelector('#vcWordSearch');
    if (search) {
      search.oninput = function () {
        wordsKw = search.value;
        var host = el.querySelector('#vcWordList');
        var shown = filteredTough();
        var drill = el.querySelector('#vcDrill');
        if (drill) drill.textContent = '专攻这 ' + shown.length + ' 个词';
        if (!shown.length) {
          if (host) host.innerHTML = '';
          return;
        }
        if (host) {
          host.innerHTML = shown.map(toughRowHtml).join('');
          bindWordRows(host);
        }
      };
    }

    var list = filteredTough();
    var db = el.querySelector('#vcDrill');
    if (db) db.onclick = function () {
      var items = list.map(function (it) {
        var idx = idxOfWord(it.word);
        return idx >= 0 ? { idx: idx, rec: bs().words[it.word], isNew: false } : null;
      }).filter(Boolean);
      if (!items.length) return;
      queue = items;
      startSession();
    };

    el.querySelectorAll('[data-remove]').forEach(function (b) {
      b.onclick = function () {
        var w = b.getAttribute('data-remove');
        if (bs().words[w]) { bs().words[w].wrong = 0; saveState(); }
        renderHome();
      };
    });

    el.querySelectorAll('[data-know]').forEach(function (b) {
      b.onclick = function () {
        var w = b.getAttribute('data-know');
        if (bs().words[w]) {
          bs().words[w].known = true;
          bs().words[w].knownAt = Date.now();
          bs().words[w].box = MAX_BOX;
          bs().words[w].due = dayNum(todayKey()) + 3650;
          saveState();
        }
        renderHome();
      };
    });

    el.querySelectorAll('[data-unknow]').forEach(function (b) {
      b.onclick = function () {
        var w = b.getAttribute('data-unknow');
        if (bs().words[w]) {
          bs().words[w].known = false;
          bs().words[w].knownAt = 0;
          bs().words[w].box = 0;
          bs().words[w].due = dayNum(todayKey());
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
    for (var k in bs().words) {
      var b = bs().words[k].box || 0;
      boxes[Math.min(MAX_BOX, b)]++;
    }
    var boxLabels = ['新学', '1 档', '2 档', '3 档', '4 档', '熟练'];

    var b = bw();
    /* 九格：背完单词数（今日/本周/累计）居首——这是与排行榜同口径的核心指标 */
    var stats = [
      { v: b.day.n || 0, k: '今日已背(词)' },
      { v: b.week.n || 0, k: '本周已背(词)' },
      { v: b.all.n || 0, k: '累计已背(词)' },
      { v: knownWords().length, k: '已标熟' },
      { v: masteredCount(), k: '已掌握' },
      { v: toughWords().length, k: '生词本' },
      { v: bs().totalAnswered || 0, k: '累计答题' },
      { v: accuracy() + '%', k: '正确率' },
      { v: fmtDuration(bs().totalMs), k: '学习时长' }
    ];

    /* 词书进度环：SVG 圆环，中心大数字 + 目标感副行 */
    var R = 54, CIRC = Math.round(2 * Math.PI * R);
    var ringColor = pct >= 100 ? '#10b981' : 'var(--mod-ac)';
    var ring = '<div class="vc-ring-wrap">' +
      '<div class="vc-ring">' +
        '<svg viewBox="0 0 128 128" width="128" height="128">' +
          '<circle cx="64" cy="64" r="' + R + '" fill="none" stroke="var(--line)" stroke-width="10"/>' +
          '<circle cx="64" cy="64" r="' + R + '" fill="none" stroke="' + ringColor + '" stroke-width="10" ' +
            'stroke-linecap="round" stroke-dasharray="' + CIRC + '" ' +
            'stroke-dashoffset="' + Math.round(CIRC * (1 - pct / 100)) + '" transform="rotate(-90 64 64)"/>' +
        '</svg>' +
        '<div class="vc-ring-num"><b>' + pct + '%</b><span>' + known + ' / ' + total + ' 词</span></div>' +
      '</div>' +
      '<div class="vc-ring-side">' +
        '<p class="vc-ring-goal">' + (pct >= 100
          ? '🎉 整本词书已被你拿下'
          : '还剩 <b>' + (total - known) + '</b> 个词。每天 ' + (typeof state.dailyNew === 'number' ? state.dailyNew : 15) +
            ' 个，约 <b>' + Math.max(1, Math.ceil((total - known) / Math.max(1, typeof state.dailyNew === 'number' ? state.dailyNew : 15))) + '</b> 天拿下整本。') + '</p>' +
      '</div>' +
    '</div>';

    return '<div class="vc-panel">' +
      '<h2 class="vc-h2">学习统计</h2>' +

      ring +

      '<div class="vc-statgrid">' + stats.map(function (it) {
        return '<div class="vc-statcell"><b>' + esc(it.v) + '</b><span>' + it.k + '</span></div>';
      }).join('') + '</div>' +

      '<div class="vc-h3">记忆档位</div>' +
      '<div class="vc-boxes">' + boxes.map(function (n, i) {
        return '<div class="vc-boxrow"><span>' + boxLabels[i] + '</span>' +
          '<div class="vc-bar thin"><i style="width:' + (known ? Math.round(n / known * 100) : 0) + '%"></i></div>' +
          '<b>' + n + '</b></div>';
      }).join('') + '</div>' +

      '<div class="vc-h3">最近 ' + HEAT_DAYS + ' 天' +
        '<span class="vc-heat-legend"><i class="lv0"></i><i class="lv1"></i><i class="lv2"></i><i class="lv3"></i></span>' +
      '</div>' +
      heatmap(HEAT_DAYS) +

      '<div class="vc-h3">本月打卡' +
        (bs().streak > 0 ? '<span class="vc-cal-streak">🔥 连续 ' + bs().streak + ' 天</span>' : '') +
      '</div>' +
      monthCalendar() +
      '</div>';
  }

  /* 当月打卡日历：打了卡的日期点亮（按题数分档），未到的日期置灰 */
  function monthCalendar() {
    var now = new Date();
    var y = now.getFullYear(), m = now.getMonth();
    var first = new Date(y, m, 1);
    var daysInMonth = new Date(y, m + 1, 0).getDate();
    var pad = (first.getDay() + 6) % 7;   // 周一为一周之始
    var todayD = now.getDate();
    var cells = ['一', '二', '三', '四', '五', '六', '日'].map(function (w) {
      return '<i class="vc-cal-h">' + w + '</i>';
    });
    for (var i = 0; i < pad; i++) cells.push('<i></i>');
    for (var d = 1; d <= daysInMonth; d++) {
      var key = y + '-' + (m + 1) + '-' + d;
      var n = bs().days[key] || 0;
      var cls = 'vc-cal-d' + (n > 0 ? ' hit' + (n >= 25 ? '3' : n >= 10 ? '2' : '1') : '') + (d === todayD ? ' today' : '') + (d > todayD ? ' future' : '');
      cells.push('<div class="' + cls + '" title="' + key + (n ? '：' + n + ' 题' : '') + '"><b>' + d + '</b>' +
        (n > 0 ? '<em>' + n + '</em>' : '') + '</div>');
    }
    return '<div class="vc-cal">' + cells.join('') + '</div>';
  }

  function heatmap(days) {
    var cells = [];
    var now = new Date();
    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      var n = bs().days[key] || 0;
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
        '<div class="vc-field-h">答题流程</div>' +
        '<div class="vc-field-d">' +
          '每一轮都是全部单词过一遍：' +
          '第一轮 英选中：看单词挑中文释义。' +
          '第二轮 中选英：看中文挑英文单词。' +
          '第三轮 自评：给单词，自己判断「认识 / 模糊 / 不认识」，点完揭示释义。' +
          '选择题答错的词，会在当轮结束前多走一轮；' +
          '自评点「认识」后若发现其实不会，可以改判成「不认识」，这个词会从英选中重新完整走一遍三种题型。' +
        '</div>' +
        '<div class="vc-flow">' +
          '<span class="vc-flow-step">① 英选中</span>' +
          '<i>→</i>' +
          '<span class="vc-flow-step">② 中选英</span>' +
          '<i>→</i>' +
          '<span class="vc-flow-step">③ 自评</span>' +
        '</div>' +
      '</div>' +

      '<div class="vc-field">' +
        '<div class="vc-field-h">自动朗读</div>' +
        '<div class="vc-field-d">开启后，英选中出题时自动读一遍单词（按 s 随时手动读）。</div>' +
        '<div class="vc-chips">' +
          '<button type="button" class="vc-chip' + (state.autoSpeak ? ' active' : '') + '" data-speak="on">开启</button>' +
          '<button type="button" class="vc-chip' + (!state.autoSpeak ? ' active' : '') + '" data-speak="off">关闭</button>' +
        '</div>' +
      '</div>' +

      '<div class="vc-field">' +
        '<div class="vc-field-h">词库</div>' +
        '<div class="vc-field-d">两个词库的进度各自独立保存，随时切换、互不清空。</div>' +
        '<div class="vc-chips">' +
          '<button type="button" class="vc-chip' + (state.book === 'cet4' ? ' active' : '') + '" data-book="cet4">CET-4 · ' + bookCount('cet4') + ' 词</button>' +
          '<button type="button" class="vc-chip' + (state.book === 'cet6' ? ' active' : '') + '" data-book="cet6">CET-6 · ' + bookCount('cet6') + ' 词</button>' +
        '</div>' +
      '</div>' +

      '<div class="vc-field">' +
        '<div class="vc-field-h">数据</div>' +
        '<div class="vc-field-d">所有进度只存在这台设备的浏览器里，不上传。</div>' +
        '<button type="button" class="vc-btn ghost" id="vcExport">📤 导出备份</button>' +
        '<button type="button" class="vc-btn ghost" id="vcImport">📥 导入备份</button>' +
        '<input type="file" id="vcImportFile" accept="application/json,.json" style="display:none">' +
        '<button type="button" class="vc-btn ghost danger" id="vcReset">清空学习记录</button>' +
      '</div>' +
      '<div class="vc-field-d">备份是完整学习记录（两个词库 + 打卡 + 排行计数）的 JSON 文件，换浏览器 / 重装前导出一份，之后可导入恢复。</div>' +
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
    el.querySelectorAll('[data-speak]').forEach(function (b) {
      b.onclick = function () {
        state.autoSpeak = b.getAttribute('data-speak') === 'on';
        saveState();
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
    var ex = el.querySelector('#vcExport');
    if (ex) ex.onclick = function () {
      try {
        var d = new Date();
        var name = 'vocab-backup-' + d.getFullYear() + (d.getMonth() + 1 < 10 ? '0' : '') + (d.getMonth() + 1) + (d.getDate() < 10 ? '0' : '') + d.getDate() + '.json';
        var blob = new Blob([JSON.stringify(state)], { type: 'application/json' });
        var url = URL.createObjectURL(blob);
        var a = document.createElement('a');
        a.href = url;
        a.download = name;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(function () { URL.revokeObjectURL(url); }, 4000);
      } catch (e) { alert('导出失败：' + e.message); }
    };
    var im = el.querySelector('#vcImport');
    var imf = el.querySelector('#vcImportFile');
    if (im && imf) {
      im.onclick = function () { imf.click(); };
      imf.onchange = function () {
        var f = imf.files && imf.files[0];
        if (!f) return;
        var reader = new FileReader();
        reader.onload = function () {
          try {
            var d = JSON.parse(reader.result);
            if (!d || typeof d !== 'object' || !d.books || typeof d.books !== 'object') {
              alert('这不是有效的背单词备份文件');
              return;
            }
            if (!window.confirm('导入会覆盖当前全部学习记录（词库进度 / 打卡 / 排行计数），确定？')) return;
            localStorage.setItem(SAVE_KEY, JSON.stringify(d));
            location.reload();
          } catch (e) {
            alert('导入失败：' + e.message);
          }
        };
        reader.readAsText(f, 'utf-8');
        imf.value = '';
      };
    }
    var rb = el.querySelector('#vcReset');
    if (rb) rb.onclick = function () {
      if (!window.confirm('清空本机所有背单词记录？此操作不可恢复。')) return;
      state = emptyState();
      bs().day = todayKey();
      saveState();
      book = null; loading = null; loadErr = '';
      queue = [];
      tab = 'today';
      boot();
    };
  }

  function switchBook(bk) {
    /* v2 起两库进度各自独立保存，切换只换指针，不再清空 */
    state.book = bk;
    bs();   // 确保该词库的进度对象存在
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
  /* 按记忆档位选题型，再按开关回落：
     关掉的题型不出现，退到该词最合适的那个还开着的题型。
     —— 三个都关掉时兜底成认词，否则玩家会卡在空屏。 */
  function kindOf(item) {
    return (item && item.kind) || STEPS[Math.min(stage, STEPS.length - 1)];
  }

  /* 某一阶段的题：本局全部词，统一一种题型 */
  function buildStage(n) {
    var kind = STEPS[Math.min(n, STEPS.length - 1)];
    return sessionWords.map(function (it) {
      return {
        idx: it.idx,
        rec: bs().words[book.words[it.idx][0]] || it.rec || null,
        isNew: it.isNew,
        kind: kind
      };
    });
  }

  function kindLabel(k) {
    if (k === 'en2cn') return '英选中';
    if (k === 'cn2en') return '中选英';
    if (k === 'selfrate') return '自评';
    return '英选中';
  }


  /* ---------- 答题屏 ---------- */
  function startSession() {
    if (!queue.length) { buildAndStart(); return; }
    sessionWords = queue.map(function (q) { return { idx: q.idx, rec: q.rec || null, isNew: q.isNew }; });
    stage = 0;
    redoSet = [];
    redoRound = 0;
    stageQueue = buildStage(0);
    qi = 0;
    answered = false;
    sessionStats = { right: 0, wrong: 0 };
    countedWords = {};
    tickStart();
    ensureExtra().then(function () {
      current = makeQuestion(stageQueue[0]);
      renderQuestion();
    });
  }

  function makeQuestion(item) {
    var idx = item.idx;
    var w = book.words[idx];
    var kind = kindOf(item);

    var q = {
      idx: idx,
      kind: kind,
      word: w[0],
      phonetic: w[1],
      meaning: w[2],
      options: null,
      rated: null,
      revealed: false
    };

    if (kind === 'en2cn') {
      q.options = window.AppVocabData.makeOptions(book.words, book.byPos, idx);
    } else if (kind === 'cn2en') {
      q.options = window.AppVocabData.makeWordOptions(book.words, book.byPos, idx);
    }
    return q;
  }

  /* 把容器里带 data-lucide 的静态 path 填上图标数据（轻量，无依赖） */
  function paintLucide(root) {
    window.paintLucideIcons(root);
  }

  function renderQuestion() {
    if (!el || !current) return;
    var w = current;
    var canSpeak = window.AppVocabData.canSpeak();
    /* 进度按「题」算：混合队列里每道题独立推进 */
    var qNo = qi + 1;
    var pct = stageQueue.length ? Math.round(qi / stageQueue.length * 100) : 0;

    /* 自动朗读：仅英选中（看词听音），中选英要靠拼写记忆不出声 */
    if (state.autoSpeak && w.kind === 'en2cn' && canSpeak) {
      window.AppVocabData.speak(w.word);
    }

    var inner = '';

    if (w.kind === 'en2cn') {
      inner =
        '<div class="vc-word">' + esc(w.word) + '</div>' +
        '<div class="vc-phon">' + esc(w.phonetic || '') +
          (canSpeak ? '<button class="vc-speak" type="button" id="vcSpeak" aria-label="朗读">🔊</button>' : '') +
        '</div>' +
        '<div class="vc-opts" id="vcOpts">' +
          w.options.map(function (o, i) {
            return '<button class="vc-opt" type="button" data-i="' + i + '">' +
              '<span class="vc-opt-txt">' + esc(o.text) + '</span>' +
              '<span class="vc-opt-more"></span>' +
            '</button>';
          }).join('') +
        '</div>';
    } else if (w.kind === 'cn2en') {
      inner =
        '<div class="vc-word cn">' + esc(w.meaning) + '</div>' +
        '<div class="vc-opts word-opts" id="vcOpts">' +
          w.options.map(function (o, i) {
            return '<button class="vc-opt word-opt" type="button" data-i="' + i + '">' +
              '<span class="vc-opt-txt">' + esc(o.text) + '</span>' +
              '<span class="vc-opt-more"></span>' +
            '</button>';
          }).join('') +
        '</div>';
    } else {
      inner =
        '<div class="vc-word">' + esc(w.word) + '</div>' +
        '<div class="vc-phon">' + esc(w.phonetic || '') +
          (canSpeak ? '<button class="vc-speak" type="button" id="vcSpeak" aria-label="朗读">🔊</button>' : '') +
        '</div>' +
        '<div class="vc-rate" id="vcRate">' +
          '<button type="button" class="vc-rate-btn know" data-rate="know">' +
            '<svg class="vc-rate-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>认识</button>' +
          '<button type="button" class="vc-rate-btn vague" data-rate="vague">' +
            '<svg class="vc-rate-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>模糊</button>' +
          '<button type="button" class="vc-rate-btn unknown" data-rate="unknown">' +
            '<svg class="vc-rate-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>不认识</button>' +
        '</div>' +
        '<div class="vc-reveal" id="vcReveal"></div>';
    }

    el.innerHTML =
      '<div class="vc-wrap vc-play">' +
        '<div class="vc-top">' +
          '<button class="vc-back" id="vcBack" type="button" aria-label="返回今日">← 返回</button>' +
          '<span class="vc-count">' + qNo + ' / ' + stageQueue.length + '</span>' +
        '</div>' +
        '<div class="vc-bar thin"><i style="width:' + pct + '%"></i></div>' +
        '<div class="vc-card">' +
          '<button class="vc-mark-known" id="vcMarkKnown" type="button" title="标熟后不再出现">标熟</button>' +
          inner +
          '<div class="vc-feedback" id="vcFb"></div>' +
        '</div>' +
        '<div class="vc-playfoot">' +
          '<div class="vc-playfoot-stats">' +
            '<span>本轮 <b>' + sessionStats.right + '</b> 对 / <b>' + sessionStats.wrong + '</b> 错</span>' +
            '<span>今日累计 <b>' + bs().doneToday + '</b> 题</span>' +
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

    var mk = el.querySelector('#vcMarkKnown');
    if (mk) mk.onclick = markKnown;

    var opts = el.querySelectorAll('.vc-opt');
    for (var i = 0; i < opts.length; i++) opts[i].onclick = onPick;

    el.querySelectorAll('[data-rate]').forEach(function (b) {
      b.onclick = function () {
        if (current.revealed) return;
        onRate(b.getAttribute('data-rate'));
      };
    });
  }

  /* ---------- 键盘快捷键 ----------
     1-4  选选项
     1/2/3 自评（认识/模糊/不认识）
     空格 / Enter  下一题
     s  朗读    k  标熟    Esc  返回
     只在答题屏生效，且不抢输入框的键。 */
  function onKeyDown(e) {
    if (!el || !current) return;
    if (!document.getElementById('mod-vocab') ||
        !document.getElementById('mod-vocab').classList.contains('active')) return;
    var tag = (e.target && e.target.tagName) || '';
    if (tag === 'INPUT' || tag === 'TEXTAREA') return;

    var k = e.key;

    if (k === 'Escape') { e.preventDefault(); leaveSession(); return; }
    if (k === 's' || k === 'S') {
      e.preventDefault();
      window.AppVocabData.speak(current.word);
      return;
    }
    if (k === 'k' || k === 'K') { e.preventDefault(); markKnown(); return; }

    /* 已作答：空格/回车进入下一题 */
    if (answered) {
      if (k === ' ' || k === 'Enter') {
        e.preventDefault();
        var nb = document.getElementById('vcNext');
        if (nb) nb.click();
      }
      return;
    }

    /* 未作答：数字键选择 */
    var n = parseInt(k, 10);
    if (!n || n < 1) return;

    if (current.kind === 'selfrate') {
      var rates = ['know', 'vague', 'unknown'];
      if (n <= 3) {
        e.preventDefault();
        onRate(rates[n - 1]);
      }
      return;
    }

    var opts = el.querySelectorAll('.vc-opt');
    if (n <= opts.length) {
      e.preventDefault();
      opts[n - 1].click();
    }
  }

  /* 标熟：这个词以后不再出现在任何队列里 */
  function markKnown() {
    if (window.SFX && window.SFX.select) window.SFX.select();
    var key = book.words[current.idx][0];
    var rec = bs().words[key] || { box: 0, due: 0, seen: 0, wrong: 0 };
    rec.known = true;
    rec.knownAt = Date.now();
    rec.box = MAX_BOX;
    rec.due = dayNum(todayKey()) + 3650;
    bs().words[key] = rec;
    saveState();
    advanceStep();
  }

  /* 四选一：点选之后判对错，同时把每个选项的意思都揭开（就地显示） */
  function onPick(e) {
    if (answered) return;
    answered = true;
    var btn = e.currentTarget;
    var i = +btn.getAttribute('data-i');
    var opt = current.options[i];
    var ok = !!opt.ok;

    var all = el.querySelectorAll('.vc-opt');
    for (var k = 0; k < all.length; k++) {
      var o = current.options[+all[k].getAttribute('data-i')];
      all[k].disabled = true;
      if (o.ok) all[k].classList.add('right');
      /* 每个选项都在自己框里补上「词 + 释义」，答对答错都展开 */
      var more = all[k].querySelector('.vc-opt-more');
      if (more) {
        if (current.kind === 'cn2en') {
          more.textContent = o.meaning || '';
        } else {
          more.textContent = o.word && o.word !== o.meaning ? o.word : '';
        }
        more.classList.add('show');
      }
    }
    if (!ok) btn.classList.add('wrong');
    finishAnswer(ok, opt.text);
  }

  /* ---------- 自评题型 ---------- */
  function onRate(rate) {
    if (window.SFX && window.SFX.tap) window.SFX.tap();
    current.rated = rate;
    revealSelfRate();
  }

  function revealSelfRate() {
    var w = current;
    w.revealed = true;
    /* 背完一个词 = 走到自评并揭示。每局每词只计一次（改判不重复计） */
    if (w && w.idx != null && !countedWords[w.idx]) {
      countedWords[w.idx] = 1;
      var b = bw();
      b.day.n = (b.day.n || 0) + 1;
      b.week.n = (b.week.n || 0) + 1;
      b.all.n = (b.all.n || 0) + 1;
      saveState();
    }
    /* 自评点完就算「已作答」，否则键盘的空格会被当成选选项而失效 */
    answered = true;

    el.querySelectorAll('[data-rate]').forEach(function (b) {
      b.disabled = true;
      if (b.getAttribute('data-rate') === w.rated) b.classList.add('picked');
    });
    /* morphicons 试点：被选中的自评按钮图标形变为结果图标（Check=记住了 / Zap=有点印象 / RotateCcw=重学） */
    if (window.MorphDOM && window.LUCIDE_ICONS) {
      var RATED_ICON = { know: 'Check', vague: 'Zap', unknown: 'RotateCcw' };
      var rateBtn = el.querySelector('.vc-rate-btn.' + w.rated);
      var ratePath = rateBtn && rateBtn.querySelector('.vc-rate-ico path');
      var target = window.LUCIDE_ICONS[RATED_ICON[w.rated]];
      if (ratePath && target) {
        try {
          if (!ratePath._morph) ratePath._morph = window.MorphDOM.createMorph(ratePath, window.LUCIDE_ICONS.Smile, {});
          ratePath._morph.set(target);
        } catch (e) { /* 形变失败不影响功能 */ }
      }
    }

    var box = el.querySelector('#vcReveal');
    if (!box) return;

    var label = w.rated === 'know' ? '认识' : w.rated === 'vague' ? '模糊' : '不认识';
    box.innerHTML =
      '<div class="vc-reveal-inner">' +
        '<div class="vc-reveal-meaning">' + esc(w.meaning) + '</div>' +
        '<div class="vc-back-panel" id="vcBackPanel"></div>' +
        '<div class="vc-reveal-row">' +
          '<span class="vc-reveal-tag">你选了「' + label + '」</span>' +
          (w.rated !== 'unknown'
            ? '<button class="vc-btn small ghost" id="vcMarkWrong" type="button">其实不认识，改判</button>'
            : '') +
          '<button class="vc-btn primary vc-next-btn" id="vcNext" type="button">' + nextBtnLabel() + '</button>' +
        '</div>' +
      '</div>';

    var mk = box.querySelector('#vcMarkWrong');
    if (mk) mk.onclick = markWrong;
    var nx = box.querySelector('#vcNext');
    if (nx) nx.onclick = function () { commitRate(w.rated); };

    /* 自评也要能看到拆词 / 词族 / 真题 */
    renderBackPanel();
  }

  function markWrong() {
    if (!current || !current.revealed) return;
    if (current.rated === 'unknown') return;
    if (window.SFX && window.SFX.wrong) window.SFX.wrong();

    current.rated = 'unknown';
    current.amended = true;

    el.querySelectorAll('[data-rate]').forEach(function (b) {
      b.classList.remove('picked');
      if (b.getAttribute('data-rate') === 'unknown') b.classList.add('picked');
    });

    var box = el.querySelector('#vcReveal');
    if (box) {
      var tag = box.querySelector('.vc-reveal-tag');
      if (tag) tag.textContent = '已改判为「不认识」';
      var mk = box.querySelector('#vcMarkWrong');
      if (mk) mk.remove();
    }
  }

  function commitRate(rate) {
    /* answered 在 revealSelfRate 里已经置 true，这里不能再拦 */

    var ok = rate === 'know';
    var idx = current.idx;

    if (ok) sessionStats.right++; else sessionStats.wrong++;
    countAnswer();

    if (rate === 'unknown' || current.amended) {
      applySchedule(idx, false);
      /* 改判 / 不认识 → 三种题型排到队尾，从头再来一遍 */
      queueRedo(idx);
      advanceStep();
      return;
    }
    if (rate === 'vague') {
      /* 模糊：有印象但没记牢，降一档（不归零），明天再见。
         归零会让用户不敢诚实选「模糊」，反而害了他自己。 */
      applyVague(idx);
      advanceStep();
      return;
    }
    applySchedule(idx, ok);
    advanceStep();
  }

  /* 统计落盘（三种题型共用） */
  function countAnswer() {
    tickFlush();
    bs().totalAnswered = (bs().totalAnswered || 0) + 1;
    bs().doneToday = (bs().doneToday || 0) + 1;
    var dk = todayKey();
    bs().days[dk] = (bs().days[dk] || 0) + 1;
    saveState();
  }

  /* 四选一题型的结算：揭示全部选项意思 + 背面 */
  function finishAnswer(ok, shown) {
    if (window.SFX && window.SFX.tap) window.SFX.tap();

    if (ok) {
      sessionStats.right++;
      bs().totalRight = (bs().totalRight || 0) + 1;
    } else {
      sessionStats.wrong++;
    }
    {
      var bAcc = bw();
      bAcc.day.a++; bAcc.week.a++; bAcc.all.a++;
      if (ok) { bAcc.day.r++; bAcc.week.r++; bAcc.all.r++; }
    }
    countAnswer();

    applySchedule(current.idx, ok);

    /* 选择题答错：和自评「不认识」一样，把三种题型排到队尾重来一遍。
       选错是客观证据，比自评更该立刻再见一次。 */
    if (!ok) queueRedo(current.idx);

    var fb = el.querySelector('#vcFb');
    if (!fb) return;
    fb.className = 'vc-feedback show ' + (ok ? 'ok' : 'bad');
    fb.innerHTML =
      '<div class="vc-fb-head"><b>' + (ok ? '答对了' : '答错了') + '</b>' +
      '<span class="vc-fb-ans">' + esc(current.word) + ' · ' + esc(current.meaning) + '</span></div>' +
      '<div class="vc-back-panel" id="vcBackPanel"></div>' +
      '<button class="vc-btn primary vc-next-btn" id="vcNext" type="button">' +
        nextBtnLabel() + '</button>';

    var nb = fb.querySelector('#vcNext');
    if (nb) nb.onclick = advanceStep;

    if (window.SFX) {
      if (ok && window.SFX.select) window.SFX.select();
      else if (!ok && window.SFX.wrong) window.SFX.wrong();
    }

    renderBackPanel();
  }

  /* 落调度：答对升档、答错归零；已标熟的词不再改动 */
  function applySchedule(idx, ok) {
    var words = book.words;
    var key = words[idx][0];
    var rec = bs().words[key] || { box: 0, due: 0, seen: 0, wrong: 0 };
    if (rec.known) return;
    rec.seen++;
    var today = dayNum(todayKey());

    if (ok) {
      rec.box = Math.min(MAX_BOX, rec.box + 1);
      rec.due = today + INTERVALS[rec.box];
    } else {
      rec.box = 0;
      rec.wrong++;
      rec.wrongAt = Date.now();   // 最近一次答错时间（生词本「近 7 天」筛选用）
      rec.due = today;
    }
    bs().words[key] = rec;
    saveState();
  }

  /* 模糊：box 降一档（不归零），按新档位的间隔安排复习 */
  function applyVague(idx) {
    var words = book.words;
    var key = words[idx][0];
    var rec = bs().words[key] || { box: 0, due: 0, seen: 0, wrong: 0 };
    if (rec.known) return;
    rec.seen++;
    var today = dayNum(todayKey());
    rec.box = Math.max(0, (rec.box || 0) - 1);
    rec.due = today + INTERVALS[rec.box];
    bs().words[key] = rec;
    saveState();
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
        stageQueue.splice(qi + 1, 0, { idx: j, rec: bs().words[book.words[j][0]] || null, kind: 'en2cn' });
        advanceStep();
      };
    });
  }

  function nextBtnLabel() {
    var lastOfStage = qi + 1 >= stageQueue.length;
    var lastStage = stage + 1 >= STEPS.length;
    return lastOfStage && lastStage ? '看结果' : '下一题';
  }

  /* 下一题：当前阶段走完就进下一阶段，三个阶段都走完才结算 */
  function advanceStep() {
    answered = false;
    qi++;
    if (qi < stageQueue.length) {
      current = makeQuestion(stageQueue[qi]);
      renderQuestion();
      return;
    }

    /* 本阶段走完：先把阶段内答错的词按同一题型补一轮 */
    if (redoSet.length) {
      var kind = STEPS[Math.min(stage, STEPS.length - 1)];
      stageQueue = redoSet.map(function (idx) {
        return { idx: idx, rec: bs().words[book.words[idx][0]] || null, kind: kind, isRedo: true };
      });
      redoSet = [];
      redoRound++;      // 每阶段最多补一轮，防止一直答错导致无限循环
      qi = 0;
      current = makeQuestion(stageQueue[0]);
      renderQuestion();
      return;
    }

    if (stage + 1 < STEPS.length) {
      stage++;
      redoRound = 0;
      stageQueue = buildStage(stage);
      qi = 0;
      current = makeQuestion(stageQueue[0]);
      renderQuestion();
      return;
    }
    finishSession();
  }

  /* 改判：这个词的三种题型依次插到队尾，从英选中重新完整走一遍 */
  /* 答错 / 改判：记下这个词，本阶段末按同一题型再补一轮。
     不能直接塞进 stageQueue——advanceStep 换阶段时会整表重建，
     塞进去的题会被丢掉。 */
  function queueRedo(idx) {
    if (redoRound > 0) return;              // 本阶段已补过一轮，不再追加
    if (redoSet.indexOf(idx) < 0) redoSet.push(idx);
  }

  function leaveSession() {
    if (window.SFX && window.SFX.back) window.SFX.back();
    tickFlush();
    saveState();
    stageQueue = [];
    qi = 0;
    answered = false;
    current = null;
    tab = 'today';
    queue = buildQueue();
    renderHome();
  }

  /* ---------- 全服排行（日/周/总，按背完单词数排名，附学习时长） ---------- */
  var RANK_BOARDS = [
    { k: 'vocab_day', label: '日榜' },
    { k: 'vocab_week', label: '周榜' },
    { k: 'vocab_all', label: '总榜' }
  ];
  var rankBoard = 'vocab_day';
  var rankCache = {};   // game → { at, html }
  var rankLoading = false;
  var RANK_TTL = 60 * 1000;

  function rankPeriod(game) {
    if (game === 'vocab_day') return dayKey8();
    if (game === 'vocab_week') return weekKey6();
    return '';
  }

  function fmtMs(ms) {
    var min = Math.round((ms || 0) / 60000);
    if (min < 1) return '1 分钟内';
    if (min < 60) return min + ' 分钟';
    var h = Math.floor(min / 60);
    var m = min % 60;
    return h + ' 小时' + (m ? ' ' + m + ' 分' : '');
  }

  function rankRowsHTML(board, me) {
    if (!board || !board.length) {
      return '<div class="vc-lb-empty">这个榜还没有人上榜，背完一局你就是第一名</div>';
    }
    var b = bw();
    var mine = { vocab_day: b.day, vocab_week: b.week, vocab_all: b.all }[rankBoard];
    return board.map(function (r, i) {
      var isMe = !!(me && r.id === me.id);
      var rank = i + 1;
      var medal = rank === 1 ? '🥇' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : rank;
      var acc = r.extra && r.extra.acc;
      return '<div class="vc-lb-row' + (isMe ? ' me' : '') + '">' +
        '<span class="vc-lb-rank">' + medal + '</span>' +
        '<span class="vc-lb-ava">' + esc(r.avatar || '🙂') + '</span>' +
        '<span class="vc-lb-name">' + esc(r.name || '匿名玩家') + (isMe ? '（我）' : '') + '</span>' +
        '<span class="vc-lb-score"><b>' + r.score + '</b> 词</span>' +
        '<span class="vc-lb-acc">' + (acc == null ? '—' : '✔ ' + acc + '%') + '</span>' +
        '<span class="vc-lb-ms">⏱ ' + fmtMs(r.extra && r.extra.ms) + '</span>' +
      '</div>';
    }).join('') +
    (me && !board.some(function (r) { return r.id === me.id; }) && mine && mine.n
      ? '<div class="vc-lb-row me tail"><span class="vc-lb-rank">…</span>' +
        '<span class="vc-lb-ava">' + esc(me.avatar) + '</span>' +
        '<span class="vc-lb-name">' + esc(me.name) + '（我）</span>' +
        '<span class="vc-lb-score"><b>' + mine.n + '</b> 词</span>' +
        '<span class="vc-lb-acc">' + (mine.a ? '✔ ' + Math.round(mine.r / mine.a * 100) + '%' : '—') + '</span>' +
        '<span class="vc-lb-ms">⏱ ' + fmtMs(mine.ms) + '</span></div>'
      : '');
  }

  function rankHtml() {
    var me = window.AppProfile ? window.AppProfile.get() : null;
    var cached = rankCache[rankBoard];
    var body = cached ? cached.html : '<div class="vc-lb-empty">正在加载榜单…</div>';
    var tabs = '<div class="vc-lb-tabs">' + RANK_BOARDS.map(function (b) {
      return '<button type="button" class="vc-lb-tab' + (rankBoard === b.k ? ' active' : '') +
        '" data-rank="' + b.k + '">' + b.label + '</button>';
    }).join('') +
      '<button type="button" class="vc-lb-refresh' + (rankLoading ? ' spin' : '') + '"' +
      (rankLoading ? ' disabled' : '') + ' data-rank-refresh title="刷新榜单" aria-label="刷新榜单">↻</button>' +
      '</div>';
    return '<div class="vc-panel"><h2 class="vc-h2">🏆 全服排行 · 按背完的单词数</h2>' +
      '<p class="vc-field-d">日榜每天零点重新开始，周榜按自然周（周一），总榜累计历史。排名后附学习时长。</p>' +
      tabs + '<div class="vc-lb" id="vcLb">' + body + '</div></div>';
  }

  function fetchRank(force) {
    var game = rankBoard;
    var cached = rankCache[game];
    if (!force && cached && Date.now() - cached.at < RANK_TTL) return;
    var period = rankPeriod(game);
    var url = '/api/leaderboard?game=' + game + '&limit=50' + (period ? '&period=' + period : '');
    rankLoading = true;
    var spinBtn = el.querySelector('[data-rank-refresh]');
    if (spinBtn) { spinBtn.classList.add('spin'); spinBtn.disabled = true; }
    fetch(url).then(function (r) { return r.json(); }).then(function (data) {
      if (!data || !data.ok) throw new Error('bad');
      var me = window.AppProfile ? window.AppProfile.get() : null;
      rankCache[game] = { at: Date.now(), html: rankRowsHTML(data.board, me) };
      if (tab === 'rank' && rankBoard === game) {
        var host = el.querySelector('#vcLb');
        if (host) host.innerHTML = rankCache[game].html;
      }
    }).catch(function () {
      if (tab === 'rank' && rankBoard === game) {
        var host = el.querySelector('#vcLb');
        if (host) host.innerHTML = '<div class="vc-lb-empty">榜单加载失败，稍后再试</div>';
      }
    }).then(function () {
      rankLoading = false;
      var b2 = el.querySelector('[data-rank-refresh]');
      if (b2) { b2.classList.remove('spin'); b2.disabled = false; }
    });
  }

  function bindRank() {
    el.querySelectorAll('[data-rank]').forEach(function (b) {
      b.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        rankBoard = b.getAttribute('data-rank');
        renderHome();
        fetchRank(false);
      };
    });
    var refresh = el.querySelector('[data-rank-refresh]');
    if (refresh) refresh.onclick = function () {
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      if (rankLoading) return;
      fetchRank(true);
    };
    /* 打开排行页先补报（含排行榜上线前的历史迁移），落定后再拉榜，
       保证「看的时候自己的记录已经上榜」 */
    submitBoards(function (posted) {
      if (posted && tab === 'rank') fetchRank(true);
    });
    fetchRank(false);
  }

  function finishSession() {
    tickFlush();
    var right = sessionStats.right, wrong = sessionStats.wrong;
    var acc = right + wrong ? Math.round(right / (right + wrong) * 100) : 0;
    var pose = acc >= 80 ? 'cheer' : acc >= 60 ? 'happy' : 'sad';

    if (bs().lastDone !== todayKey()) {
      bs().lastDone = todayKey();
      bs().streak = (bs().streak || 0) + 1;
    }
    /* 新词额度按「本局出现过的新词」去重统计（混合队列里同一词有多条） */
    var usedNew = 0, maxNewIdx = -1, seenNew = {};
    queue.forEach(function (q) {
      if (!q.isNew || seenNew[q.idx]) return;
      seenNew[q.idx] = 1;
      usedNew++;
      if (q.idx > maxNewIdx) maxNewIdx = q.idx;
    });
    bs().newDoneToday = (bs().newDoneToday || 0) + usedNew;
    if (state.order !== 'random' && maxNewIdx >= 0) {
      bs().seq = Math.max(bs().seq, maxNewIdx + 1);
    }
    saveState();
    submitBoards();

    /* 全所统一档案库：每完成一局记一条（含当局统计，供档案中心回看） */
    if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
      var hisAcc = (right + wrong) ? Math.round(right / (right + wrong) * 100) : null;
      window.UniversalHistory.add({
        module: 'vocab',
        title: '背单词 · 本局 ' + (right + wrong) + ' 题 · ' + usedNew + ' 个新词' +
          (hisAcc != null ? ' · 正确率 ' + hisAcc + '%' : ''),
        subtitle: 'CET-' + (state.book === 'cet6' ? '6' : '4') +
          ' · 连续打卡 ' + (bs().streak || 0) + ' 天 · 累计 ' + (bs().totalAnswered || 0) + ' 题',
        color: '#6366F1',
        badge: '背单词',
        avatar: '📚',
        data: { test: 'vocab', date: bs().day, right: right, wrong: wrong, acc: hisAcc, newWords: usedNew }
      });
    }

    el.innerHTML =
      '<div class="vc-wrap">' + subnav() +
      '<div class="vc-panel vc-done">' + owl(pose) +
      '<h2>本局完成</h2>' +
      '<p>本局答对 <b>' + right + '</b> · 答错 <b>' + wrong +
        '</b> · 正确率 <b>' + acc + '%</b></p>' +
      '<p class="vc-dim">连续打卡 ' + bs().streak + ' 天 · 累计 ' + fmtDuration(bs().totalMs) + '</p>' +
      '<div class="vc-actions">' +
        '<button class="vc-btn primary" id="vcAgain" type="button">再来一组</button>' +
        '<button class="vc-btn ghost" id="vcHome" type="button">回到今日</button>' +
      '</div></div></div>';

    bindSubnav();
    stage = 0;
    redoSet = [];
    redoRound = 0;
    stageQueue = [];
    var ab = el.querySelector('#vcAgain');
    if (ab) ab.onclick = function () { bs().newDoneToday = 0; saveState(); buildAndStart(); };
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
      paintLucide(el);
      /* 背面数据后台预热，答题时不用等 */
      ensureExtra();
    }).catch(function () { renderLoadError(); });
  }

  function initVocab() {
    el = document.getElementById('mod-vocab');
    if (!el) return;
    rollDay();
    /* 防止重复挂载：init 可能被 router 多次调用 */
    if (!keyBound) {
      window.addEventListener('keydown', onKeyDown);
      keyBound = true;
    }
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
      submitBoards();
      window.removeEventListener('keydown', onKeyDown);
      keyBound = false;
    }
  };
})();
