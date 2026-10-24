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
      /* 选择题方向：en2cn = 英选中（给单词挑释义）；cn2en = 中选英（给释义挑单词） */
      dir: 'en2cn',
      /* 题型开关：关掉的题型不参与轮转，自动落到剩下的 */
      kinds: { recall: true, spell: true, cloze: false },
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
      if (!state.kinds || typeof state.kinds !== 'object') {
        state.kinds = { recall: true, spell: true, cloze: false };
      }
      if (state.dir !== 'cn2en') state.dir = 'en2cn';
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
        var r0 = state.words[words[i][0]];
        if (!r0 || !r0.known) pool.push(i);
      }
      window.AppVocabData.shuffle(pool);
      for (var k = 0; k < pool.length && out.length < count; k++) {
        out.push({ idx: pool[k], rec: null, isNew: true });
      }
      return out;
    }

    for (var j = state.seq; j < words.length && out.length < count; j++) {
      if (state.words[words[j][0]]) continue;   // 学过的（含已标熟）不再当新词
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
  /* 单一连续队列：每个词连着做三种题型（英选中 → 中选英 → 自评），
     全部做完再下一个词。进度按「词」算，不按题算。
       词 i 的第 1 题 = 英选中
       词 i 的第 2 题 = 中选英
       词 i 的第 3 题 = 自评
     自评改判「不认识」→ 这个词从英选中重新走一遍三种题型。 */
  var STEPS = ['en2cn', 'cn2en', 'selfrate'];
  var stepOf = 0;         // 当前词做到第几步（0..2）
  var redoWord = null;    // 正在重走的词（改判后）
  var redoStep = 0;

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
    for (var k in state.words) {
      if (state.words[k].known) continue;   // 已标熟单独统计
      if (state.words[k].box >= 4) n++;
    }
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
      { k: '已标熟', v: knownWords().length, u: '词' },
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
    var sum = 0;
    for (var i = 6; i >= 0; i--) {
      var d = new Date(now.getTime() - i * 86400000);
      var key = d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
      var n = state.days[key] || 0;
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
    for (var k in state.words) {
      if (state.words[k].known) out.push({ word: k, rec: state.words[k] });
    }
    out.sort(function (a, b) { return (b.rec.knownAt || 0) - (a.rec.knownAt || 0); });
    return out;
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
    return '<div class="vc-panel">' +
      '<h2 class="vc-h2">生词本</h2>' + tabs +
      '<p class="vc-field-d">答错 2 次以上的词自动收录，按错误次数排序。</p>' +
      '<div class="vc-actions" style="margin-bottom:14px">' +
        '<button class="vc-btn primary" id="vcDrill" type="button">专攻这 ' + list.length + ' 个词</button>' +
      '</div>' +
      '<div class="vc-wordlist">' + list.map(function (it) {
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
      }).join('') + '</div></div>';
  }

  function bindWords() {
    el.querySelectorAll('[data-wtab]').forEach(function (b) {
      b.onclick = function () {
        wordsTab = b.getAttribute('data-wtab');
        renderHome();
      };
    });

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
        if (state.words[w]) { state.words[w].wrong = 0; saveState(); }
        renderHome();
      };
    });

    el.querySelectorAll('[data-know]').forEach(function (b) {
      b.onclick = function () {
        var w = b.getAttribute('data-know');
        if (state.words[w]) {
          state.words[w].known = true;
          state.words[w].knownAt = Date.now();
          state.words[w].box = MAX_BOX;
          state.words[w].due = dayNum(todayKey()) + 3650;
          saveState();
        }
        renderHome();
      };
    });

    el.querySelectorAll('[data-unknow]').forEach(function (b) {
      b.onclick = function () {
        var w = b.getAttribute('data-unknow');
        if (state.words[w]) {
          state.words[w].known = false;
          state.words[w].knownAt = 0;
          state.words[w].box = 0;
          state.words[w].due = dayNum(todayKey());
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
        '<div class="vc-cell"><b>' + knownWords().length + '</b><span>已标熟</span></div>' +
        '<div class="vc-cell"><b>' + masteredCount() + '</b><span>已掌握（4 档以上）</span></div>' +
        '<div class="vc-cell"><b>' + fmtDuration(state.totalMs) + '</b><span>累计学习时长</span></div>' +
        '<div class="vc-cell"><b>' + (state.totalAnswered || 0) + '</b><span>累计答题</span></div>' +
        '<div class="vc-cell"><b>' + accuracy() + '%</b><span>总正确率</span></div>' +
        '<div class="vc-cell"><b>' + toughWords().length + '</b><span>生词本</span></div>' +
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
        '<div class="vc-field-h">答题流程</div>' +
        '<div class="vc-field-d">' +
          '第一轮 英选中：看单词挑中文释义。' +
          '第二轮 中选英：看中文挑英文单词，只过第一轮做错的。' +
          '第三轮 自评：给单词，自己判断「认识 / 模糊 / 不认识」，点完揭示释义；' +
          '点「认识」后若发现其实不会，可以改判成「不认识」，这个词会从英选中重新完整走一遍三种题型。' +
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
  /* 按记忆档位选题型，再按开关回落：
     关掉的题型不出现，退到该词最合适的那个还开着的题型。
     —— 三个都关掉时兜底成认词，否则玩家会卡在空屏。 */
  function kindOf() {
    return STEPS[Math.min(stepOf, STEPS.length - 1)];
  }

  function kindLabel(k) {
    if (k === 'en2cn') return '英选中';
    if (k === 'cn2en') return '中选英';
    if (k === 'selfrate') return '自评';
    return '英选中';
  }

  function stepLabel() {
    return kindLabel(kindOf()) + ' · 第 ' + (Math.min(stepOf, 2) + 1) + '/3';
  }

  /* ---------- 答题屏 ---------- */
  function startSession() {
    if (!queue.length) { buildAndStart(); return; }
    qi = 0;
    stepOf = 0;
    answered = false;
    redoWord = null;
    redoStep = 0;
    sessionStats = { right: 0, wrong: 0 };
    tickStart();
    ensureExtra().then(function () {
      current = makeQuestion(queue[0]);
      renderQuestion();
    });
  }

  function makeQuestion(item) {
    var idx = item.idx;
    var w = book.words[idx];
    var kind = item.forceKind || kindOf();

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

  function renderQuestion() {
    if (!el || !current) return;
    var w = current;
    var canSpeak = window.AppVocabData.canSpeak();
    /* 进度按「词」算：当前第几个词 / 共几个词 */
    var wordNo = qi + 1;
    var pct = queue.length ? Math.round(qi / queue.length * 100) : 0;

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
          '<button type="button" class="vc-rate-btn know" data-rate="know">认识</button>' +
          '<button type="button" class="vc-rate-btn vague" data-rate="vague">模糊</button>' +
          '<button type="button" class="vc-rate-btn unknown" data-rate="unknown">不认识</button>' +
        '</div>' +
        '<div class="vc-reveal" id="vcReveal"></div>';
    }

    el.innerHTML =
      '<div class="vc-wrap vc-play">' +
        '<div class="vc-top">' +
          '<button class="vc-back" id="vcBack" type="button" aria-label="返回今日">← 返回</button>' +
          '<span class="vc-count">' + wordNo + ' / ' + queue.length + '</span>' +
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

  /* 标熟：这个词以后不再出现在任何队列里 */
  function markKnown() {
    if (window.SFX && window.SFX.select) window.SFX.select();
    var key = book.words[current.idx][0];
    var rec = state.words[key] || { box: 0, due: 0, seen: 0, wrong: 0 };
    rec.known = true;
    rec.knownAt = Date.now();
    rec.box = MAX_BOX;
    rec.due = dayNum(todayKey()) + 3650;
    state.words[key] = rec;
    saveState();
    nextWord();
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

    el.querySelectorAll('[data-rate]').forEach(function (b) {
      b.disabled = true;
      if (b.getAttribute('data-rate') === w.rated) b.classList.add('picked');
    });

    var box = el.querySelector('#vcReveal');
    if (!box) return;

    var label = w.rated === 'know' ? '认识' : w.rated === 'vague' ? '模糊' : '不认识';
    box.innerHTML =
      '<div class="vc-reveal-inner">' +
        '<div class="vc-reveal-meaning">' + esc(w.meaning) + '</div>' +
        '<div class="vc-reveal-row">' +
          '<span class="vc-reveal-tag">你选了「' + label + '」</span>' +
          (w.rated !== 'unknown'
            ? '<button class="vc-btn small ghost" id="vcMarkWrong" type="button">其实不认识，改判</button>'
            : '') +
          '<button class="vc-btn primary" id="vcNext" type="button">下一个</button>' +
        '</div>' +
      '</div>';

    var mk = box.querySelector('#vcMarkWrong');
    if (mk) mk.onclick = markWrong;
    var nx = box.querySelector('#vcNext');
    if (nx) nx.onclick = function () { commitRate(w.rated); };
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
    if (answered) return;
    answered = true;

    var ok = rate === 'know';
    var idx = current.idx;

    if (ok) sessionStats.right++; else sessionStats.wrong++;
    countAnswer();

    if (rate === 'unknown' || current.amended) {
      applySchedule(idx, false);
      /* 改判 / 不认识 → 这个词从英选中重走一遍三种题型 */
      startRedo(idx);
      return;
    }
    applySchedule(idx, ok);
    nextWord();
  }

  /* 统计落盘（三种题型共用） */
  function countAnswer() {
    tickFlush();
    state.totalAnswered = (state.totalAnswered || 0) + 1;
    state.doneToday = (state.doneToday || 0) + 1;
    var dk = todayKey();
    state.days[dk] = (state.days[dk] || 0) + 1;
    saveState();
  }

  /* 四选一题型的结算：揭示全部选项意思 + 背面 */
  function finishAnswer(ok, shown) {
    if (window.SFX && window.SFX.tap) window.SFX.tap();

    if (ok) {
      sessionStats.right++;
      state.totalRight = (state.totalRight || 0) + 1;
    } else {
      sessionStats.wrong++;
    }
    countAnswer();

    applySchedule(current.idx, ok);

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

  /* 按钮文案保持最简：还有下一步就「下一题」，本局走完才「看结果」 */
  function nextBtnLabel() {
    var moreSteps = stepOf + 1 < STEPS.length;
    if (moreSteps) return '下一题';
    return qi + 1 >= queue.length ? '看结果' : '下一题';
  }

  /* 同一个词的下一题型，或下一个词 */
  function advanceStep() {
    answered = false;
    if (stepOf + 1 < STEPS.length) {
      stepOf++;
      current = makeQuestion(queue[qi]);
      renderQuestion();
      return;
    }
    nextWord();
  }

  function nextWord() {
    answered = false;
    stepOf = 0;
    qi++;
    if (redoWord) { redoWord = null; }
    if (qi >= queue.length) { finishSession(); return; }
    current = makeQuestion(queue[qi]);
    renderQuestion();
  }

  /* 改判：这个词插到当前位置后面，从英选中重新走一遍三种题型 */
  function startRedo(idx) {
    answered = false;
    stepOf = 0;
    queue.splice(qi + 1, 0, { idx: idx, rec: state.words[book.words[idx][0]] || null, isNew: false, isRedo: true });
    current = makeQuestion(queue[qi + 1]);
    qi++;
    redoWord = idx;
    renderQuestion();
  }

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
        queue.splice(qi + 1, 0, { idx: j, rec: state.words[book.words[j][0]] || null, isNew: false });
        nextWord();
      };
    });
  }

  /* 落调度。ok=false 时记一次错，box 归 0、今天再排。 */
  /* 落调度。连续队列没有轮次概念，每次作答独立记档。 */
  function applySchedule(idx, ok) {
    var words = book.words;
    var key = words[idx][0];
    var rec = state.words[key] || { box: 0, due: 0, seen: 0, wrong: 0 };
    if (rec.known) return;      // 已标熟的词不再改动
    rec.seen++;
    var today = dayNum(todayKey());

    if (ok) {
      rec.box = Math.min(MAX_BOX, rec.box + 1);
      rec.due = today + INTERVALS[rec.box];
    } else {
      rec.box = 0;
      rec.wrong++;
      rec.due = today;
    }
    state.words[key] = rec;
    saveState();
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
      '<p>三轮走完 · 答对 <b>' + right + '</b> · 答错 <b>' + wrong +
        '</b> · 正确率 <b>' + acc + '%</b></p>' +
      '<p class="vc-dim">连续打卡 ' + state.streak + ' 天 · 累计 ' + fmtDuration(state.totalMs) + '</p>' +
      '<div class="vc-actions">' +
        '<button class="vc-btn primary" id="vcAgain" type="button">再来一组</button>' +
        '<button class="vc-btn ghost" id="vcHome" type="button">回到今日</button>' +
      '</div></div></div>';

    bindSubnav();
    stepOf = 0;
    redoWord = null;
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
