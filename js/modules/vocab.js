/* =========================================================
   模块 13：背单词 (Vocabulary · CET-4 / CET-6)
   ---------------------------------------------------------
   五屏：今日 / 生词本 / 统计 / 排行 / 设置，外加答题屏。
   词库来自 KyleBing/english-vocabulary（BSD-3-Clause），
   由 scripts/build-vocab*.js 清洗成 assets/vocab/*.json。

   题型按阶段固定轮转（同一阶段内同题型）：
     阶段 1 英选中（词 → 四选一释义）
     阶段 2 中选英（释义 → 四选一单词）
     阶段 3 自评（认识 / 模糊 / 不认识，可改判）
   调度：FSRS-4.5 简化版（每词 S 稳定性 / D 难度，按目标保留率反解间隔），
     每个词每局只在自评阶段落档一次；答错/改判在阶段末补一轮。
   会话可续局：state.session 快照，今日页出「继续上局」。
   ========================================================= */

(function () {
  'use strict';

  var SAVE_KEY = 'juice_vocab_v1';
  var INTERVALS = [0, 1, 2, 4, 7, 15, 30];   // 仅供 v2→v3 迁移时反推稳定性
  var REVIEW_CAP = 60;
  var DAILY_CHOICES = [10, 15, 25, 50];
  var IDLE_CAP_MS = 30 * 60 * 1000;
  var HEAT_DAYS = 90;

  /* ---------- FSRS-4.5 简化版调度（权重为官方默认，勿改） ----------
     R(t,S) = (1 + 19/81 · t/S)^(−1/2)：S 天后保留率恰为 90%。
     复习间隔由目标保留率 requestRetention 反解；每次落档更新 D/S。 */
  var DECAY = -0.5;
  var FACTOR = 19 / 81;
  var W = [0.4872, 1.4003, 3.7145, 13.8206,   // 首评稳定性：Again/Hard/Good/Easy
           5.1618, 1.2298, 0.8975, 0.031,     // D₀ 与难度更新
           1.6474, 0.1367, 1.0461,            // 记住后的稳定性增长
           2.1072, 0.0793, 0.3246, 1.587,     // 遗忘后的稳定性
           0.2272, 2.8755];                   // Hard / Easy 乘数
  function clampNum(x, lo, hi) { return Math.min(hi, Math.max(lo, x)); }
  function retrievability(elapsedDays, S) {
    if (!(S > 0)) return 0;
    return Math.pow(1 + FACTOR * elapsedDays / S, DECAY);
  }
  function intervalFor(S, r, maxIvl) {
    var ivl = S / FACTOR * (Math.pow(r, 1 / DECAY) - 1);
    return clampNum(Math.round(ivl), 1, maxIvl || 365);
  }
  /* 唯一的落档入口：G = 1 不认识 / 2 模糊 / 3 认识。就地更新 rec 并返回间隔 */
  function commitReview(rec, G, todayNum) {
    var rT = typeof state.requestRetention === 'number' ? clampNum(state.requestRetention, 0.8, 0.98) : 0.9;
    var maxIvl = state.maxInterval || 365;
    if (!(rec.S > 0)) {
      rec.S = W[G - 1];
      rec.D = clampNum(W[4] - (G - 3) * W[5], 1, 10);
      rec.reps = 1;
      rec.lapses = (G === 1) ? 1 : 0;
    } else {
      var elapsed = Math.max(0, todayNum - (rec.last || todayNum));
      var R = retrievability(elapsed, rec.S);
      var d = rec.D - W[6] * (G - 3) * (10 - rec.D) / 9;
      rec.D = clampNum(W[7] * W[4] + (1 - W[7]) * d, 1, 10);
      if (G === 1) {
        rec.S = W[11] * Math.pow(rec.D, -W[12]) *
                (Math.pow(rec.S + 1, W[13]) - 1) * Math.exp(W[14] * (1 - R));
        rec.lapses = (rec.lapses || 0) + 1;
      } else {
        var inc = Math.exp(W[8]) * (11 - rec.D) * Math.pow(rec.S, -W[9]) *
                  (Math.exp(W[10] * (1 - R)) - 1);
        if (G === 2) inc *= W[15];
        rec.S = Math.max(0.1, rec.S * (inc + 1));
      }
      rec.reps = (rec.reps || 0) + 1;
    }
    rec.last = todayNum;
    rec.st = rec.st || 1;
    var ivl = intervalFor(rec.S, rT, maxIvl);
    rec.due = todayNum + ivl;
    return ivl;
  }

  /* ---------- 状态 ---------- */
  function emptyBook() {
    return {
      day: '',
      newDoneToday: 0,
      doneToday: 0,
      streak: 0,
      lastDone: '',
      words: {},         // 词 → { S, D, due, last, reps, lapses, st, seen, wrong, known?, ... }
      seq: 0,
      totalMs: 0,
      totalAnswered: 0,
      totalRight: 0,
      days: {},
      newPerDay: {}      // 每日完成新词数（预计完成日期用）
    };
  }

  function emptyState() {
    return {
      ver: 3,
      book: 'cet4',
      dailyNew: 15,
      order: 'seq',
      /* 自动朗读：英选中出题时自动读一遍单词（s 键随时手动读） */
      autoSpeak: false,
      /* FSRS 目标保留率与最大间隔（仅有的两个算法参数） */
      requestRetention: 0.9,
      maxInterval: 365,
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
    /* 水位线在成功后才落盘：先写后报的话，弱网下这批计数
       会因水位已推过而永远不再补报（这局白背）。失败回滚到请求前的值。 */
    var prev = {};
    jobs.forEach(function (j) {
      prev[j.pk] = b.posted[j.pk] || 0;
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
      }).then(function (r) {
        return r.json();
      }).then(function (d) {
        if (!d || !d.ok) throw new Error('bad');
      }).catch(function () {
        b.posted[j.pk] = prev[j.pk];   // 失败回滚，下次进排行页会补报
      });
    })).then(function () { saveState(); if (after) after(true); }, function () { if (after) after(true); });
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
        state.ver = 2;   // v1 存档还没做过 box→S 迁移，强制走 migrateV3
        migrateV3(state);
        saveState();
        return;
      }
      state = Object.assign(emptyState(), s);
      if (!state.books || typeof state.books !== 'object') state.books = {};
      if (state.book !== 'cet6') state.book = 'cet4';
      /* v1 存档归一化时可能残留已废弃的 kinds/dir 字段，交给 migrateV3 之后的
         emptyState 缺省即可；这里只做调度算法迁移（box → S/D，幂等） */
      migrateV3(state);
      bs();
    } catch (e) {
      state = emptyState();
    }
    /* 不能在这里把 day 改成今天：跨天判定要读存档里的旧日期 */
  }

  /* v2 → v3：Leitner box → FSRS 的 S/D。逐词合并、幂等（有 S 就跳过）。
     旧「档位间隔」≈ 上次落档时的稳定性；错误率线性映射难度。 */
  function migrateV3(s) {
    if ((s.ver || 0) >= 3) {
      if (typeof s.requestRetention !== 'number') s.requestRetention = 0.9;
      if (typeof s.maxInterval !== 'number') s.maxInterval = 365;
      return;
    }
    var books = s.books || {};
    Object.keys(books).forEach(function (bk) {
      var b = books[bk];
      b.newPerDay = b.newPerDay || {};
      var words = b.words || {};
      for (var w in words) {
        var r = words[w];
        if (!r || typeof r !== 'object' || typeof r.S === 'number') continue;
        var box = clampNum(r.box | 0, 0, 5);
        var ivl = INTERVALS[box] || 0;
        if (r.known) {
          r.S = 365;
          r.D = 5;
          r.st = 2;
          r.last = dayNum(todayKey());
        } else {
          r.S = clampNum(Math.max(ivl, 0.5), 0.5, 365);
          r.D = clampNum(4 + 4 * (r.wrong || 0) / Math.max(r.seen || 0, 1), 1, 10);
          r.st = 1;
          r.last = Math.max(0, (r.due || 0) - ivl);
        }
        r.reps = r.seen || 0;
        r.lapses = r.wrong || 0;
      }
    });
    s.ver = 3;
    if (typeof s.requestRetention !== 'number') s.requestRetention = 0.9;
    if (typeof s.maxInterval !== 'number') s.maxInterval = 365;
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
  var extraTried = false;
  var loading = null;
  var loadErr = '';

  function ensureBook() {
    if (book) return Promise.resolve(book);
    if (loading) return loading;
    var wantLevel = state.book;   // 发起时锁定词库：切库后旧请求迟到不得落任何状态
    loading = window.AppVocabData.loadBook(wantLevel)
      .then(function (b) {
        /* 竞态防线：加载中用户切到别的词库时，state.book 已变。
           若不校验，旧请求会用 CET-4 的词表去 pruneOrphans('cet6')，
           把另一个词库的进度记录整体删光并落盘——不可恢复。 */
        if (state.book !== wantLevel) return b;
        book = b;
        pruneOrphans(wantLevel, b.words);
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

  /* 详情数据按需加载：卡片背面（拆词/词族/真题/例句）用 */
  var extraLoading = null;
  function ensureExtra() {
    if (extra.roots && extra.exam && extra.ex) return Promise.resolve(extra);
    if (extraLoading) return extraLoading;
    extraLoading = Promise.all([
      window.AppVocabData.loadRoots(state.book),
      window.AppVocabData.loadExam(state.book),
      window.AppVocabData.loadExamples(state.book)
    ]).then(function (r) {
      extra.roots = r[0];
      extra.exam = r[1];
      extra.ex = r[2];
      return extra;
    }).catch(function () { return extra; }).then(function (r) {
      extraLoading = null;
      return r;
    });
    return extraLoading;
  }

  /* ---------- 队列 ---------- */
  function buildQueue() {
    if (!book) return [];
    var today = dayNum(todayKey());
    var words = book.words;
    var recs = bs().words;
    var due = [];

    for (var i = 0; i < words.length; i++) {
      var rec = recs[words[i][0]];
      if (!rec || rec.known || rec.st === 2) continue;   // 已标熟不再轮回
      if (!(rec.S > 0)) continue;                        // 未学过的新词
      if (rec.due <= today) due.push({ idx: i, rec: rec, isNew: false });
    }
    due.sort(function (a, b) {
      /* 超期越久越先（≈ 可提取性最低）；同天到期时稳定性低者先 */
      return (a.rec.due - b.rec.due) || ((a.rec.S || 0) - (b.rec.S || 0));
    });
    if (due.length > REVIEW_CAP) due = due.slice(0, REVIEW_CAP);

    /* 墨墨式规则：复习积压时先清欠账，不加新词 */
    var newWords = due.length >= REVIEW_CAP ? [] : pickNew(newLeftToday());
    return due.concat(newWords);
  }

  function pickNew(count) {
    if (!book || count <= 0) return [];
    var words = book.words;
    var out = [];

    if (state.order === 'random') {
      var pool = [];
      for (var i = 0; i < words.length; i++) {
        var r0 = bs().words[words[i][0]];
        /* 与顺序分支同口径：学过/标熟的不是「新词」。
           只有 wrong 计数的记录仍可作新词 */
        if (isLearnedRec(r0)) continue;
        pool.push(i);
      }
      window.AppVocabData.shuffle(pool);
      for (var k = 0; k < pool.length && out.length < count; k++) {
        out.push({ idx: pool[k], rec: null, isNew: true });
      }
      return out;
    }

    for (var j = bs().seq; j < words.length && out.length < count; j++) {
      if (isLearnedRec(bs().words[words[j][0]])) continue;   // 学过/标熟的不再当新词
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
  var committed = false;   // 本題已落档（客观题点选即落，自评点下一题才落）
  var current = null;
  var sessionStats = { right: 0, wrong: 0 };
  /* 混合队列：每个词都出三种题型（英选中 / 中选英 / 自评），
     全部展开后打散，同一个词不会连着出现。进度按「题」算。
     自评改判「不认识」→ 该词在阶段末按当前题型补走一轮。 */
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
      var r = bs().words[k];
      if (r.known || r.st === 2) continue;   // 已标熟单独统计
      /* FSRS 不再写 box：按稳定性 >= 30 天视为「熟词(自动)」 */
      if ((r.S || 0) >= 30) n++;
    }
    return n;
  }

  function accuracy() {
    var a = bs().totalAnswered || 0;
    return a ? Math.round((bs().totalRight || 0) / a * 100) : 0;
  }

  /* 连续打卡：按 days 表回溯（当天没学不打断昨天的连续）。
     旧口径只在「完整走完一局」时 +1，中途退出当天不打卡，与打卡日历矛盾 */
  function streakFromDays() {
    var days = bs().days || {};
    var d = new Date();
    var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    if (!(days[key] > 0)) d = new Date(d.getTime() - 86400000);
    var s = 0;
    for (;;) {
      var k2 = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      if (!(days[k2] > 0)) break;
      s++;
      d = new Date(d.getTime() - 86400000);
    }
    return s;
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

  /* 已进入调度的词（学过/标熟）不再当新词；只有 wrong 计数的记录仍算新词，
     否则客观题答错一次就会把新词从词表里永久排除 */
  function isLearnedRec(r) {
    return !!(r && (r.S > 0 || r.known || r.st === 2));
  }
  function isWordKnown(idx) {
    if (!book || !book.words[idx]) return true;
    var r = bs().words[book.words[idx][0]];
    return !!(r && (r.known || r.st === 2));
  }

  /* 词 → 词库下标：生词本每行都会调用，线性扫描在 4500 词下是 O(n²)。
     按 book.words 数组引用缓存一次 Map，切词库/重新加载自然失效。 */
  var wordIdxFor = null, wordIdxMap = null;
  function idxOfWord(w) {
    if (!book) return -1;
    if (wordIdxFor !== book.words) {
      wordIdxFor = book.words;
      wordIdxMap = Object.create(null);
      for (var i = 0; i < book.words.length; i++) wordIdxMap[book.words[i][0]] = i;
    }
    var v = wordIdxMap[w];
    return v === undefined ? -1 : v;
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
      '<div class="vc-note">词库 KyleBing/english-vocabulary（BSD-3-Clause）· 进度存本机 · 背词数上报全服榜</div>' +
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

    var dueAll = 0;
    if (book) {
      var td = dayNum(todayKey());
      for (var wi = 0; wi < book.words.length; wi++) {
        var wr = bs().words[book.words[wi][0]];
        if (wr && !wr.known && wr.due <= td) dueAll++;
      }
    }
    /* 进度环按「词」算：doneToday 是题数，一阶段答完就会误显 100% */
    var donePct = total
      ? Math.min(100, Math.round((bw().day.n || 0) / total * 100))
      : (bs().doneToday > 0 ? 100 : 0);
    /* 中间「今日重点」面板：把红框空白区变成有内容的行动区。
       有到期词 → 重点=复习（主按钮变「开始复习」）；无 → 重点=新词任务。
       队列清空时不再另开一屏「结算页」，仍用这套 hero 布局，只换行动区。 */
    var focusTitle, focusDesc, actionsHtml;
    if (resumeAvailable()) {
      var sn = state.session;
      var left = sn.stageQueue.length - (sn.qi || 0);
      focusTitle = '上局还没答完';
      focusDesc = '还剩 <b>' + left + '</b> 题（已完成 ' + (sn.qi || 0) + ' 题），接着答完这一组';
      actionsHtml =
        '<button class="vc-btn primary" id="vcResume" type="button">继续上局 →</button>' +
        '<button class="vc-btn ghost" id="vcDiscard" type="button">放弃重排</button>';
    } else if (total === 0) {
      var didSome = (bs().doneToday || 0) > 0;
      focusTitle = didSome ? '今天的任务已完成' : '今天没有待办';
      focusDesc = didSome
        ? '明天到期复习会自动排好，也可以现在加练一组'
        : '新词额度设为 0 且没有到期复习，去设置里调一下每天的词量';
      actionsHtml =
        '<button class="vc-btn primary" id="vcExtra" type="button">再加一组 →</button>' +
        '<button class="vc-btn ghost" id="vcGoStats" type="button">看统计</button>';
    } else if (dueAll > 0) {
      focusTitle = '今日重点 · 到期复习';
      focusDesc = '有 <b>' + dueAll + '</b> 个词等着巩固——今天做掉最划算';
      actionsHtml =
        '<button class="vc-btn primary" id="vcStartReview" type="button">开始复习 →</button>' +
        '<button class="vc-btn ghost" id="vcStart" type="button">开始背新词</button>';
    } else {
      focusTitle = '今日重点 · 背新词';
      focusDesc = '准备好 <b>' + newN + '</b> 个新词，开背大约 ' + Math.max(1, Math.round(total * 0.7 / 60)) + ' 分钟';
      actionsHtml =
        '<button class="vc-btn primary" id="vcStart" type="button">开始背 →</button>';
    }
    return '<div class="vc-hero">' +
        '<div class="vc-hero-art">' + owl(total === 0 ? 'sleep' : 'think') + '</div>' +
        '<div class="vc-hero-main">' +
          '<div class="vc-hero-tag">' + (state.book === 'cet6' ? 'CET-6' : 'CET-4') +
            ' · 已连续 ' + streakFromDays() + ' 天 · ' + (state.order === 'random' ? '乱序' : '顺序') + '</div>' +
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
          '<div class="vc-ring vc-ring-mini"><svg viewBox="0 0 128 128">' +
            '<circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" stroke-width="11"/>' +
            '<circle cx="64" cy="64" r="54" fill="none" stroke="var(--mod-ac)" stroke-width="11" stroke-linecap="round" ' +
              'stroke-dasharray="339.3" stroke-dashoffset="' + Math.round(339.3 * (1 - donePct / 100)) + '" transform="rotate(-90 64 64)"/>' +
          '</svg>' +
          '<div class="vc-ring-num"><b>' + (bw().day.n || 0) + '</b><span>今日已背</span></div></div>' +
          '<div class="vc-hero-kpis">' +
            '<span>本周 <b>' + (bw().week.n || 0) + '</b></span>' +
            '<span>累计 <b>' + (bw().all.n || 0) + '</b></span>' +
          '</div>' +
          '<span class="vc-hero-done">' + (total
            ? '本轮 ' + total + ' 词 · 已答 ' + bs().doneToday + ' 题'
            : '今日 ' + bs().doneToday + ' 题已全部答完') + '</span>' +
        '</div>' +
      '</div>' +
      statStrip() + weekStrip();
  }

  function bindToday() {
    var rb2 = el.querySelector('#vcResume');
    if (rb2) rb2.onclick = function () {
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      resumeSession();
    };
    var db2 = el.querySelector('#vcDiscard');
    if (db2) db2.onclick = function () {
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      clearSession();
      queue = buildQueue();
      renderHome();
    };
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
  }

  function statStrip() {
    var items = [
      { k: '累计学过', v: knownCount(), u: '词' },
      { k: '已标熟', v: knownWords().length, u: '词' },
      { k: '连续打卡', v: streakFromDays(), u: '天' },
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
          var rw = bs().words[w];
          rw.known = true;
          rw.knownAt = Date.now();
          rw.st = 2;
          rw.S = Math.max(rw.S || 0.5, 365);
          rw.D = Math.min(rw.D || 5, 5);
          rw.due = dayNum(todayKey()) + 3650;
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

    var db = el.querySelector('#vcDrill');
    if (db) db.onclick = function () {
      /* 搜索框内容随时变：点击时重新按当前筛选取词，
         不能用在渲染时捕获的 list（否则「专攻 N 个」与实际开局不一致） */
      var items = filteredTough().map(function (it) {
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
          var rw = bs().words[w];
          rw.known = true;
          rw.knownAt = Date.now();
          rw.st = 2;
          rw.S = Math.max(rw.S || 0.5, 365);
          rw.D = Math.min(rw.D || 5, 5);
          rw.due = dayNum(todayKey()) + 3650;
          saveState();
        }
        renderHome();
      };
    });

    el.querySelectorAll('[data-unknow]').forEach(function (b) {
      b.onclick = function () {
        var w = b.getAttribute('data-unknow');
        if (bs().words[w]) {
          var rw2 = bs().words[w];
          rw2.known = false;
          rw2.knownAt = 0;
          rw2.st = 1;
          rw2.S = Math.min(rw2.S || 1, 1);
          rw2.last = dayNum(todayKey());
          rw2.due = dayNum(todayKey());
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
    var pctLabel = (known > 0 && pct === 0) ? '<1%' : (pct + '%');

    /* FSRS 记忆状态：按下次复习日分桶 + 未来 7 天复习预报 */
    var td = dayNum(todayKey());
    var buckets = [
      { k: '今日到期', n: 0 }, { k: '明天', n: 0 }, { k: '2-7 天', n: 0 },
      { k: '8-30 天', n: 0 }, { k: '30 天以上', n: 0 }
    ];
    var forecast = [0, 0, 0, 0, 0, 0, 0];
    var learning = 0;
    var wrecs = bs().words;
    for (var k in wrecs) {
      var r0 = wrecs[k];
      if (r0.known || r0.st === 2 || !(r0.S > 0)) continue;
      learning++;
      var dd = (r0.due || 0) - td;
      if (dd <= 0) {
        buckets[0].n++;
        forecast[0]++;   // 逾期词并入今天（今天要做完），与今日到期口径一致
      } else {
        if (dd === 1) buckets[1].n++;
        else if (dd <= 7) buckets[2].n++;
        else if (dd <= 30) buckets[3].n++;
        else buckets[4].n++;
        if (dd <= 6) forecast[dd]++;
      }
    }

    /* 预计完成日期：最近 14 个自然日的日均新词速度（不足 3 天有记录则回退设置值） */
    var etaText = '';
    if (pct < 100) {
      var npd = bs().newPerDay || {};
      var sum14 = 0, activeDays = 0;
      for (var di = 1; di <= 14; di++) {
        var dd2 = new Date(Date.now() - di * 86400000);
        var kk = dd2.getFullYear() + '-' + (dd2.getMonth() + 1) + '-' + dd2.getDate();
        if (npd[kk] != null && npd[kk] > 0) { sum14 += npd[kk]; activeDays++; }
      }
      var daily = activeDays >= 3 ? Math.max(1, Math.round(sum14 / 14))
        : Math.max(1, typeof state.dailyNew === 'number' ? state.dailyNew : 15);
      var etaDays = Math.ceil((total - known) / daily);
      var eta = new Date(Date.now() + etaDays * 86400000);
      var yearPart = eta.getFullYear() === new Date().getFullYear() ? '' : (eta.getFullYear() + ' 年 ');
      etaText = '按最近日均 <b>' + daily + '</b> 词，预计 <b>' + yearPart + (eta.getMonth() + 1) + ' 月 ' +
        eta.getDate() + ' 日</b> 前后拿下整本（未计复习增长）。';
    }

    var b = bw();
    /* 九格：背完单词数（今日/本周/累计）居首——这是与排行榜同口径的核心指标 */
    var stats = [
      { v: b.day.n || 0, k: '今日已背(词)' },
      { v: b.week.n || 0, k: '本周已背(词)' },
      { v: b.all.n || 0, k: '累计已背(词)' },
      { v: knownWords().length, k: '已标熟(手动)' },
      { v: masteredCount(), k: '熟词(自动)' },
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
        '<div class="vc-ring-num"><b>' + pctLabel + '</b><span>' + known + ' / ' + total + ' 词</span></div>' +
      '</div>' +
      '<div class="vc-ring-side">' +
        '<p class="vc-ring-goal">' + (pct >= 100
          ? '🎉 整本词书已被你拿下'
          : '还剩 <b>' + (total - known) + '</b> 个词。' + etaText) + '</p>' +
      '</div>' +
    '</div>';

    return '<div class="vc-panel">' +
      '<h2 class="vc-h2">学习统计</h2>' +

      ring +

      '<div class="vc-statgrid">' + stats.map(function (it) {
        return '<div class="vc-statcell"><b>' + esc(it.v) + '</b><span>' + it.k + '</span></div>';
      }).join('') + '</div>' +

      '<div class="vc-h3">记忆状态（按下次复习日）</div>' +
      '<div class="vc-boxes">' + buckets.map(function (it) {
        return '<div class="vc-boxrow"><span>' + it.k + '</span>' +
          '<div class="vc-bar thin"><i style="width:' + (learning ? Math.round(it.n / learning * 100) : 0) + '%"></i></div>' +
          '<b>' + it.n + '</b></div>';
      }).join('') + '</div>' +

      '<div class="vc-h3">未来 7 天复习预报</div>' +
      '<div class="vc-fc">' + forecast.map(function (n, i) {
        return '<div class="vc-fc-d' + (i === 0 ? ' today' : '') + '"><b>' + n + '</b><span>' +
          (i === 0 ? '今天' : i === 1 ? '明天' : '+' + i + ' 天') + '</span></div>';
      }).join('') + '</div>' +

      '<div class="vc-h3">最近 ' + HEAT_DAYS + ' 天' +
        '<span class="vc-heat-legend"><i class="lv0"></i><i class="lv1"></i><i class="lv2"></i><i class="lv3"></i></span>' +
      '</div>' +
      heatmap(HEAT_DAYS) +

      '<div class="vc-h3">本月打卡' +
        (streakFromDays() > 0 ? '<span class="vc-cal-streak">🔥 连续 ' + streakFromDays() + ' 天</span>' : '') +
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
        '<div class="vc-field-d">决定每天从词库里取多少个新词，到期复习另算（上限 50）。</div>' +
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
          '自评点「认识」后若发现其实不会，可以改判成「不认识」，这个词会在本轮结束前再出现一次。' +
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
        '<div class="vc-field-h">记忆保留率</div>' +
        '<div class="vc-field-d">调度算法（FSRS）的目标保留率：调高记得更牢但复习量明显增加，调低更省时间。90% 适合大多数人。</div>' +
        '<div class="vc-chips">' +
          [[0.85, '85% 省时间'], [0.9, '90% 均衡'], [0.92, '92% 牢固'], [0.95, '95% 极牢']].map(function (p) {
            return '<button type="button" class="vc-chip' + (Math.abs((state.requestRetention || 0.9) - p[0]) < 0.001 ? ' active' : '') +
              '" data-ret="' + p[0] + '">' + p[1] + '</button>';
          }).join('') + '</div>' +
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
    el.querySelectorAll('[data-ret]').forEach(function (b) {
      b.onclick = function () {
        var v = parseFloat(b.getAttribute('data-ret'));
        if (Math.abs((state.requestRetention || 0.9) - v) < 0.001) return;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        state.requestRetention = v;
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
            /* 白名单合并：只接受已知字段与合法取值，防恶意 JSON 注入任意顶层键 */
            var clean = emptyState();
            clean.bw = {
              day: { k: dayKey8(), n: 0, ms: 0, a: 0, r: 0 },
              week: { k: weekKey6(), n: 0, ms: 0, a: 0, r: 0 },
              all: { n: 0, ms: 0, a: 0, r: 0 },
              posted: {}, mig: 1, mig2: 1
            };
            if (d.book === 'cet4' || d.book === 'cet6') clean.book = d.book;
            if (DAILY_CHOICES.indexOf(d.dailyNew) >= 0) clean.dailyNew = d.dailyNew;
            if (d.order === 'random' || d.order === 'seq') clean.order = d.order;
            if (d.autoSpeak != null) clean.autoSpeak = !!d.autoSpeak;
            if (typeof d.requestRetention === 'number') clean.requestRetention = clampNum(d.requestRetention, 0.8, 0.98);
            if (typeof d.maxInterval === 'number') clean.maxInterval = clampNum(d.maxInterval, 30, 3650);
            ['cet4', 'cet6'].forEach(function (lv) {
              var src = d.books[lv];
              var dst = clean.books[lv];
              if (!src || typeof src !== 'object') return;
              ['day', 'streak', 'lastDone', 'seq', 'totalMs', 'totalAnswered', 'totalRight'].forEach(function (k) {
                if (src[k] != null) dst[k] = src[k];
              });
              if (typeof src.newDoneToday === 'number') dst.newDoneToday = src.newDoneToday;
              if (typeof src.doneToday === 'number') dst.doneToday = src.doneToday;
              if (src.days && typeof src.days === 'object') dst.days = src.days;
              if (src.newPerDay && typeof src.newPerDay === 'object') dst.newPerDay = src.newPerDay;
              if (src.words && typeof src.words === 'object') {
                Object.keys(src.words).forEach(function (w) {
                  var wr = src.words[w];
                  /* FSRS 记录只有 S/D 没有 box；v2 老档才有 box。
                     两者都要接受，否则导出→导入会把整本进度丢光 */
                  if (!wr || typeof wr !== 'object') return;
                  var hasS = typeof wr.S === 'number' && isFinite(wr.S);
                  if (!hasS && typeof wr.box !== 'number') return;
                  var rw = {
                    due: typeof wr.due === 'number' ? wr.due : 0,
                    seen: typeof wr.seen === 'number' ? wr.seen : 0,
                    wrong: typeof wr.wrong === 'number' ? wr.wrong : 0,
                    known: !!wr.known
                  };
                  if (typeof wr.box === 'number') rw.box = Math.max(0, Math.min(5, wr.box | 0));
                  if (hasS) {
                    rw.S = wr.S;
                    rw.D = typeof wr.D === 'number' ? wr.D : 5;
                    rw.last = typeof wr.last === 'number' ? wr.last : 0;
                    rw.reps = typeof wr.reps === 'number' ? wr.reps : 0;
                    rw.lapses = typeof wr.lapses === 'number' ? wr.lapses : 0;
                    rw.st = typeof wr.st === 'number' ? wr.st : 1;
                  }
                  if (wr.wrongAt) rw.wrongAt = wr.wrongAt;
                  if (wr.known && wr.knownAt) rw.knownAt = wr.knownAt;
                  dst.words[w] = rw;
                });
              }
            });
            if (d.bw && typeof d.bw === 'object' && clean.bw) {
              ['day', 'week', 'all'].forEach(function (p) {
                var s0 = d.bw[p], t0 = clean.bw[p];
                if (!s0 || typeof s0 !== 'object' || !t0) return;
                ['k', 'n', 'ms', 'a', 'r', 'posted'].forEach(function (k) {
                  if (s0[k] != null) t0[k] = s0[k];
                });
              });
            }
            /* v2 老档（只有 box）走一次迁移；FSRS 记录已有 S，migrateV3 幂等跳过 */
            clean.ver = 2;
            migrateV3(clean);
            localStorage.setItem(SAVE_KEY, JSON.stringify(clean));
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
    sessionSeq++;   // 作废在途的出题回调
    clearSession(); // 跨词库的会话无法续答
    state.book = bk;
    bs();   // 确保该词库的进度对象存在
    saveState();
    queue = [];
    qi = 0;
    answered = false;
    current = null;
    book = null; extra = { ex: null, roots: null, exam: null }; extraTried = false; extraLoading = null; loading = null; loadErr = '';
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
    return sessionWords.filter(function (it) {
      return !isWordKnown(it.idx);
    }).map(function (it) {
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

  /* 预览：若现在评 G，下次间隔是多少天（在副本上模拟，不改状态） */
  function rateHint(G) {
    if (!book || !current) return '';
    try {
      var key = book.words[current.idx][0];
      var clone = JSON.parse(JSON.stringify(bs().words[key] || {}));
      var ivl = commitReview(clone, G, dayNum(todayKey()));
      return ivl <= 1 ? '明天' : ivl + ' 天';
    } catch (e) { return ''; }
  }


  /* ---------- 答题屏 ---------- */
  var sessionSeq = 0;   // 会话代号：离开/切换词库后自增，迟到的 ensureExtra 回调作废
  /* ---------- 会话续局：进度随存档走，中途退出可接着答 ---------- */
  function persistSession() {
    if (!book || !stageQueue.length || qi >= stageQueue.length) return;
    state.session = {
      words: sessionWords.map(function (it) {
        /* 冗余存词名：词库换版 idx 可能错位，恢复时双重校验 */
        return { idx: it.idx, w: book.words[it.idx] ? book.words[it.idx][0] : '', isNew: it.isNew };
      }),
      stage: stage,
      qi: qi,
      stageQueue: stageQueue.map(function (it) {
        return { idx: it.idx, w: book.words[it.idx] ? book.words[it.idx][0] : '', kind: it.kind, isRedo: !!it.isRedo };
      }),
      redoSet: redoSet.slice(),
      redoRound: redoRound,
      stats: { right: sessionStats.right, wrong: sessionStats.wrong },
      counted: Object.keys(countedWords).map(Number),
      committed: committed,
      day: todayKey(),
      savedAt: Date.now()
    };
    saveState();
  }
  function clearSession() {
    if (state.session) { state.session = null; saveState(); }
  }
  function resumeAvailable() {
    var sn = state.session;
    /* 跨天的会话不续：昨日中断的题今日重新组卷（词级进度已随答随存，不丢） */
    return !!(sn && sn.day === todayKey() && sn.stageQueue && sn.stageQueue.length &&
      (sn.qi || 0) < sn.stageQueue.length && sn.words && sn.words.length);
  }
  function resumeSession() {
    var sn = state.session;
    if (!sn || !book || sn.day !== todayKey()) { clearSession(); return; }
    sessionWords = (sn.words || []).filter(function (it) {
      return book.words[it.idx] && book.words[it.idx][0] === it.w && !isWordKnown(it.idx);
    }).map(function (it) {
      return { idx: it.idx, rec: bs().words[book.words[it.idx][0]] || null, isNew: it.isNew };
    });
    stage = Math.min(sn.stage || 0, STEPS.length - 1);
    stageQueue = (sn.stageQueue || []).filter(function (it) {
      return book.words[it.idx] && book.words[it.idx][0] === it.w && !isWordKnown(it.idx);
    }).map(function (it) {
      return { idx: it.idx, rec: bs().words[book.words[it.idx][0]] || null, kind: it.kind, isRedo: !!it.isRedo };
    });
    qi = Math.min(sn.qi || 0, stageQueue.length);
    redoSet = (sn.redoSet || []).filter(function (idx) { return book.words[idx]; });
    redoRound = sn.redoRound || 0;
    sessionStats = { right: (sn.stats && sn.stats.right) || 0, wrong: (sn.stats && sn.stats.wrong) || 0 };
    countedWords = {};
    (sn.counted || []).forEach(function (idx) { countedWords[idx] = 1; });
    committed = !!sn.committed;
    if (!stageQueue.length || qi >= stageQueue.length) { clearSession(); queue = buildQueue(); renderHome(); return; }
    var my = ++sessionSeq;
    tickStart();
    if (!stageQueue.length || !book) return;
    if (sn.committed) { advanceStep(); return; }   // 已答未点下一题：续局直接推进
    current = makeQuestion(stageQueue[qi]);
    renderQuestion();
    ensureExtra();
  }

  function startSession() {
    if (!queue.length) { buildAndStart(); return; }
    sessionWords = queue.map(function (q) { return { idx: q.idx, rec: q.rec || null, isNew: q.isNew }; });
    stage = 0;
    redoSet = [];
    redoRound = 0;
    stageQueue = buildStage(0);
    qi = 0;
    answered = false;
    committed = false;
    sessionStats = { right: 0, wrong: 0 };
    countedWords = {};
    persistSession();
    tickStart();
    var my = ++sessionSeq;
    tickStart();
    /* 首题不等详情数据：拆词/例句 1.4MB 后台加载，背面打开时可能已就绪 */
    if (!stageQueue.length || !book) return;
    current = makeQuestion(stageQueue[0]);
    renderQuestion();
    ensureExtra();
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
      revealed: false,
      isRedo: !!item.isRedo
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
              '<i class="vc-opt-key" aria-hidden="true">' + (i + 1) + '</i>' +
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
              '<i class="vc-opt-key" aria-hidden="true">' + (i + 1) + '</i>' +
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
            '<svg class="vc-rate-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>认识' +
            '<em class="vc-rate-ivl">' + rateHint(3) + '</em></button>' +
          '<button type="button" class="vc-rate-btn vague" data-rate="vague">' +
            '<svg class="vc-rate-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>模糊' +
            '<em class="vc-rate-ivl">' + rateHint(2) + '</em></button>' +
          '<button type="button" class="vc-rate-btn unknown" data-rate="unknown">' +
            '<svg class="vc-rate-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>不认识' +
            '<em class="vc-rate-ivl">' + rateHint(1) + '</em></button>' +
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
    var rec = bs().words[key] || {};
    rec.known = true;
    rec.knownAt = Date.now();
    rec.st = 2;
    rec.S = Math.max(rec.S || 0.5, 365);
    rec.D = Math.min(rec.D || 5, 5);
    rec.due = dayNum(todayKey()) + 3650;
    bs().words[key] = rec;
    saveState();
    /* 标熟后从本局所有队列移除：否则后两个阶段还会再出这个词，
       而且自评会把 due=+3650 覆盖成 +365 */
    sessionWords = sessionWords.filter(function (it) { return book.words[it.idx][0] !== key; });
    stageQueue = stageQueue.filter(function (it) { return book.words[it.idx][0] !== key; });
    redoSet = redoSet.filter(function (idx) { return book.words[idx][0] !== key; });
    answered = false;
    if (qi < stageQueue.length) {
      current = makeQuestion(stageQueue[qi]);
      persistSession();
      renderQuestion();
    } else {
      advanceStep();
    }
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
    /* 答错抖动：卡片 300ms 轻震（仅 transform） */
    if (!ok) {
      var card = el.querySelector('.vc-card');
      if (card) {
        card.classList.remove('shake');
        void card.offsetWidth;
        card.classList.add('shake');
      }
    }
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

    if (ok) sessionStats.right++; else sessionStats.wrong++;
    /* 口径统一：自评「认识」也计为答对（此前只有选择题计入 totalRight，
       统计页的正确率因此系统性偏低） */
    if (ok) bs().totalRight = (bs().totalRight || 0) + 1;
    {
      var bAcc = bw();
      bAcc.day.a++; bAcc.week.a++; bAcc.all.a++;
      if (ok) { bAcc.day.r++; bAcc.week.r++; bAcc.all.r++; }
    }
    countAnswer();

    /* 重走轮只重练、不二次落档：FSRS 同日二次更新会把 S 压坏。
       正常轮：选择题答错但自评认识按「模糊」处理，防止盲目自信刷档 */
    if (!current.isRedo) {
      if (current.objectiveMiss && rate === 'know') {
        commitWord(current.idx, 2);
      } else {
        commitWord(current.idx, rate === 'unknown' || current.amended ? 1 : rate === 'vague' ? 2 : 3);
      }
    }
    if (rate === 'unknown' || current.amended || current.objectiveMiss) {
      /* 不认识 / 改判 / 选择题答错过 → 本阶段结束前按当前题型补一轮 */
      queueRedo(current.idx);
    }
    committed = true;
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

    /* FSRS 下客观题阶段不落档（自评才是唯一落档点）；
       答错只做标记，自评阶段会参考它 */
    if (!ok) {
      current.objectiveMiss = true;
      /* 客观题答错也计进生词本：这是最硬的「不会」证据。
         只有 wrong 计数的记录仍算新词（isLearnedRec 不把它当已学） */
      var wrongKey = book.words[current.idx][0];
      var wrongRec = bs().words[wrongKey] || { seen: 0, wrong: 0 };
      wrongRec.wrong = (wrongRec.wrong || 0) + 1;
      wrongRec.wrongAt = Date.now();
      bs().words[wrongKey] = wrongRec;
      saveState();
    }
    committed = true;   // 客观题点选即落；续局时直接推进，不重问

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
  /* 自评落档：每个词每局只落一次（客观题阶段不再落档，避免同词一局升 3 档）。
     G: 1=不认识(含改判) 2=模糊 3=认识。返回下次间隔（天）。 */
  function commitWord(idx, G) {
    var words = book.words;
    var key = words[idx][0];
    var rec = bs().words[key] || {};
    if (rec.known || rec.st === 2) return 0;   // 标熟词不再参与调度
    var isNewWord = !(rec.S > 0);
    var today = dayNum(todayKey());
    rec.seen = (rec.seen || 0) + 1;
    if (G === 1) {
      rec.wrong = (rec.wrong || 0) + 1;
      rec.wrongAt = Date.now();
    }
    var ivl = commitReview(rec, G, today);
    /* P0：新词的 rec 是游离对象，不写回 bs().words 会整条丢掉——
       新用户背完一轮后单词表仍为空，次日也没有复习 */
    bs().words[key] = rec;
    if (isNewWord) {
      var b0 = bs();
      var tk = todayKey();
      b0.newPerDay[tk] = (b0.newPerDay[tk] || 0) + 1;
      b0.newDoneToday = (b0.newDoneToday || 0) + 1;   // 学完即扣额度，不等结算
    }
    saveState();
    return ivl;
  }

  /* 卡片背面：拆词 / 词族 / 真题，有数据才渲染 */
  function renderBackPanel() {
    var box = el.querySelector('#vcBackPanel');
    if (!box) return;
    /* 详情数据按需加载：首次打开背面才拉 1.4MB 例句/词根/真题，
       不再阻塞首题。加载完若还停在同一张卡，自动补渲染一次 */
    if (!extra.roots || !extra.exam || !extra.ex) {
      if (!extraTried) {
        extraTried = true;
        var wantIdx = current.idx;
        ensureExtra().then(function () {
          if (current && current.idx === wantIdx && el.querySelector('#vcBackPanel')) renderBackPanel();
        });
      }
    }
    var idx = current.idx;
    var roots = extra.roots && extra.roots[idx];
    var exam = extra.exam && extra.exam[idx];
    var ex = extra.ex && extra.ex[idx];
    var parts = [];

    /* 例句放最前：语境优先于词源拆解 */
    if (ex && ex[0]) {
      parts.push('<div class="vc-bp-block"><div class="vc-bp-h">💬 例句</div>' +
        '<div class="vc-bp-txt vc-bp-ex-sen">' + esc(ex[0]) + '</div>' +
        '<div class="vc-bp-src">' + esc(ex[1] || '') + '</div></div>');
    }
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
    /* 本阶段还有重走词：按钮不说「看结果」，否则点下去又出一题很突兀 */
    if (lastOfStage && redoSet.length) return '再练一次';
    return lastOfStage && lastStage ? '看结果' : '下一题';
  }

  /* 下一题：当前阶段走完就进下一阶段，三个阶段都走完才结算 */
  function advanceStep() {
    answered = false;
    committed = false;
    qi++;
    if (qi < stageQueue.length) {
      current = makeQuestion(stageQueue[qi]);
      persistSession();
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
      persistSession();
      renderQuestion();
      return;
    }

    if (stage + 1 < STEPS.length) {
      stage++;
      redoRound = 0;
      stageQueue = buildStage(stage);
      qi = 0;
      current = makeQuestion(stageQueue[0]);
      persistSession();
      renderQuestion();
      return;
    }
    finishSession();
  }

  /* 答错 / 改判：记下这个词，本阶段末按当前阶段题型再补一轮。
     不能直接塞进 stageQueue——advanceStep 换阶段时会整表重建，
     塞进去的题会被丢掉。 */
  function queueRedo(idx) {
    if (isWordKnown(idx)) return;
    if (redoRound > 0) return;              // 本阶段已补过一轮，不再追加
    if (redoSet.indexOf(idx) < 0) redoSet.push(idx);
  }

  function leaveSession() {
    if (window.SFX && window.SFX.back) window.SFX.back();
    tickFlush();
    persistSession();   // 保留进度：今日页会出现「继续上局」
    sessionSeq++;   // 作废在途的出题回调
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
    state.session = null;
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
    /* 新词额度在 commitWord 首次落档时已逐个扣减，这里只统计展示用的 usedNew，
       不能再次累加（否则额度双扣、额外练习也失真） */
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
          ' · 连续打卡 ' + streakFromDays() + ' 天 · 累计 ' + (bs().totalAnswered || 0) + ' 题',
        color: '#6366F1',
        badge: '背单词',
        avatar: '📚',
        data: { test: 'vocab', date: bs().day, right: right, wrong: wrong, acc: hisAcc, newWords: usedNew }
      });
    }

    el.innerHTML =
      '<div class="vc-wrap">' + subnav() +
      '<div class="vc-panel vc-done">' +
      '<div class="vc-ring"><svg viewBox="0 0 128 128" width="128" height="128">' +
        '<circle cx="64" cy="64" r="54" fill="none" stroke="var(--line)" stroke-width="10"/>' +
        '<circle cx="64" cy="64" r="54" fill="none" stroke="' + (acc >= 60 ? 'var(--ok)' : 'var(--warn-c)') + '" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + Math.round(2 * Math.PI * 54) + '" stroke-dashoffset="' + Math.round(2 * Math.PI * 54 * (1 - acc / 100)) + '" transform="rotate(-90 64 64)"/>' +
      '</svg>' +
      '<div class="vc-ring-num"><b>' + acc + '%</b><span>正确率</span></div></div>' +
      '<h2>本局完成</h2>' +
      '<p>答对 <b>' + right + '</b> · 答错 <b>' + wrong + '</b>' +
        ' · 本局新词 <b>' + usedNew + '</b></p>' +
      '<p class="vc-dim">连续打卡 ' + streakFromDays() + ' 天 · 累计 ' + fmtDuration(bs().totalMs) + '</p>' +
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
      /* 必须重建队列：这一局把新词额度用完了，直接渲染会立刻又落回同一屏 */
      queue = buildQueue();
      qi = 0;
      answered = false;
      current = null;
      sessionStats = { right: 0, wrong: 0 };
      stage = 0;
      redoSet = [];
      redoRound = 0;
      stageQueue = [];
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
      /* 详情数据（例句/词根/真题 1.4MB）不再在进模块时预载：
         首次打开卡片背面时按需加载，见 renderBackPanel */
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
      /* router 对已初始化模块重进时只走 restoreView 不走 init——
         destroy 已摘掉键盘监听，这里必须重挂，否则 1-4/空格/s/k 全部失灵 */
      if (!keyBound) {
        window.addEventListener('keydown', onKeyDown);
        keyBound = true;
      }
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
