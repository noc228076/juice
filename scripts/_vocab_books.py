# -*- coding: utf-8 -*-
import io, re

p = 'js/modules/vocab.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new, count)

# ---------- 1) 状态结构：全局(设置+榜) + 每词库独立进度 ----------
rep("""  function emptyState() {
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
      days: {},
      /* 全服榜计数：背完的单词数与学习时长，按日/周/总三个周期分开 */
      bw: null
    };
  }""","""  function emptyBook() {
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
      /* 自动朗读：英选中出题时自动读一遍单词（s 键随时手动读） */
      autoSpeak: false,
      /* 全服榜计数（跨词库累计）：背完的单词数与学习时长，按日/周/总分开 */
      bw: null,
      /* 每个词库一份独立进度，切换词库不再清空 */
      books: { cet4: emptyBook(), cet6: emptyBook() }
    };
  }

  /* 当前词库的进度记录（state.book 指向的那份） */
  function bs() {
    if (!state.books) state.books = {};
    if (!state.books[state.book]) state.books[state.book] = emptyBook();
    return state.books[state.book];
  }""")

# ---------- 2) 存档兼容：v1（单份进度）迁移到 v2 分库 ----------
rep("""  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        state = Object.assign(defaultState(), d);""","""  function loadState() {
    try {
      var raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      var d = JSON.parse(raw);
      if (d && typeof d === 'object') {
        if (!d.books) {
          /* v1 → v2：老存档只有一份进度，归入当时所选词库 */
          var bk = d.book === 'cet6' ? 'cet6' : 'cet4';
          var old = emptyBook();
          old.day = d.day || '';
          old.newDoneToday = d.newDoneToday || 0;
          old.doneToday = d.doneToday || 0;
          old.streak = d.streak || 0;
          old.lastDone = d.lastDone || '';
          old.words = (d.words && typeof d.words === 'object') ? d.words : {};
          old.seq = d.seq || 0;
          old.totalMs = d.totalMs || 0;
          old.totalAnswered = d.totalAnswered || 0;
          old.totalRight = d.totalRight || 0;
          old.days = (d.days && typeof d.days === 'object') ? d.days : {};
          var next = defaultState();
          next.book = bk;
          next.dailyNew = typeof d.dailyNew === 'number' ? d.dailyNew : 15;
          next.order = d.order === 'random' ? 'random' : 'seq';
          next.bw = d.bw || null;
          next.books[bk] = old;
          state = next;
          saveState();
          return;
        }
        state = Object.assign(defaultState(), d);""")

# ---------- 3) 全量替换：进度字段一律走 bs() ----------
for f in ['words', 'seq', 'days', 'newDoneToday', 'doneToday', 'streak', 'lastDone',
          'totalMs', 'totalAnswered', 'totalRight', 'day']:
    s = re.sub(r'state\.' + f + r'\b', 'bs().' + f, s)

# state.words 的初始化判断行（loadState v1 迁移里已用局部变量，不受影响）
# normalize 处如果有 bs().words 赋值前未定义 books 的，bs() 已兜底

# ---------- 4) switchBook 不再清空进度 ----------
rep("""  function switchBook(bk) {
    state.book = bk;
    bs().seq = 0;
    bs().words = {};
    bs().days = {};
    bs().newDoneToday = 0;
    bs().doneToday = 0;
    bs().totalMs = 0;
    bs().totalAnswered = 0;
    bs().totalRight = 0;
    saveState();""","""  function switchBook(bk) {
    /* v2 起两库进度各自独立保存，切换只换指针，不再清空 */
    state.book = bk;
    bs();   // 确保该词库的进度对象存在
    saveState();""")

# ---------- 5) 设置文案 + 自动发音开关 ----------
rep("'切换词库会清空当前词库的学习记录，两个词库各自独立。'",
    "'两个词库的进度各自独立保存，随时切换、互不清空。'")

rep("""      '<div class="vc-field">' +
        '<div class="vc-field-h">词库</div>' +""","""      '<div class="vc-field">' +
        '<div class="vc-field-h">自动朗读</div>' +
        '<div class="vc-field-d">开启后，英选中出题时自动读一遍单词（按 s 随时手动读）。</div>' +
        '<div class="vc-chips">' +
          '<button type="button" class="vc-chip' + (state.autoSpeak ? ' active' : '') + '" data-speak="on">开启</button>' +
          '<button type="button" class="vc-chip' + (!state.autoSpeak ? ' active' : '') + '" data-speak="off">关闭</button>' +
        '</div>' +
      '</div>' +

      '<div class="vc-field">' +
        '<div class="vc-field-h">词库</div>' +""")

rep("""    el.querySelectorAll('[data-book]').forEach(function (b) {""","""    el.querySelectorAll('[data-speak]').forEach(function (b) {
      b.onclick = function () {
        state.autoSpeak = b.getAttribute('data-speak') === 'on';
        saveState();
        renderHome();
      };
    });
    el.querySelectorAll('[data-book]').forEach(function (b) {""")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('per-book storage ok')
