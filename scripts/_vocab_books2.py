# -*- coding: utf-8 -*-
import io, re

p = 'js/modules/vocab.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new, count=1):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new, count)

# ---------- 1) emptyState：全局设置 + 分词库进度 ----------
old = """  function emptyState() {
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
  }"""
new = """  function emptyBook() {
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
      /* 选择题方向：en2cn = 英选中（给单词挑释义）；cn2en = 中选英（给释义挑单词） */
      dir: 'en2cn',
      /* 题型开关：关掉的题型不参与轮转，自动落到剩下的 */
      kinds: { recall: true, spell: true, cloze: false },
      /* 自动朗读：英选中出题时自动读一遍单词（s 键随时手动读） */
      autoSpeak: false,
      /* 全服榜计数（跨词库累计）：背完的单词数与学习时长，按日/周/总三个周期分开 */
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
  }"""
rep(old, new)

# ---------- 2) loadState：v1 单份进度迁移到 v2 分库 ----------
old = """  function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (!raw) { state = emptyState(); state.day = todayKey(); return; }
    try {
      var s = JSON.parse(raw) || {};
      state = Object.assign(emptyState(), s);
      if (!state.words || typeof state.words !== 'object') state.words = {};
      if (!state.days || typeof state.days !== 'object') state.days = {};
      if (typeof s.newLeft === 'number' && typeof s.newDoneToday !== 'number') {
        var q0 = typeof state.dailyNew === 'number' ? state.dailyNew : 15;
        state.newDoneToday = Math.max(0, q0 - s.newLeft);
      }
      if (!state.kinds || typeof state.kinds !== 'object') {
        state.kinds = { recall: true, spell: true, cloze: false };
      }
      if (state.dir !== 'cn2en') state.dir = 'en2en';
    } catch (e) {
      state = emptyState();
    }
    /* 不能在这里把 day 改成今天：跨天判定要读存档里的旧日期 */
  }"""
# 注意上面 old 串中的 'en2en' 是笔误占位——实际文件是 'en2cn'，改用从文件精确截取
# 放弃硬编码 old，改用锚点切片重写整个 loadState
start = s.index('  function loadState() {')
end_anchor = '  function saveState() {'
end = s.index(end_anchor)
new_load = """  function loadState() {
    var raw = null;
    try { raw = localStorage.getItem(SAVE_KEY); } catch (e) {}
    if (!raw) { state = emptyState(); bs().day = todayKey(); return; }
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

"""
s = s[:start] + new_load + s[end:]

# ---------- 3) 全量替换：进度字段一律走 bs() ----------
for f in ['words', 'seq', 'days', 'newDoneToday', 'doneToday', 'streak', 'lastDone',
          'totalMs', 'totalAnswered', 'totalRight', 'day']:
    s = re.sub(r'state\.' + f + r'\b', 'bs().' + f, s)

# loadState 内新写的局部引用已是 s.*/old1.*，未被误改（state.day 只在注释/新代码外）

# ---------- 4) switchBook 不再清空 ----------
old = """  function switchBook(bk) {
    state.book = bk;
    bs().seq = 0;
    bs().words = {};
    bs().days = {};
    bs().newDoneToday = 0;
    bs().doneToday = 0;
    bs().totalMs = 0;
    bs().totalAnswered = 0;
    bs().totalRight = 0;
    saveState();"""
new = """  function switchBook(bk) {
    /* v2 起两库进度各自独立保存，切换只换指针，不再清空 */
    state.book = bk;
    bs();   // 确保该词库的进度对象存在
    saveState();"""
rep(old, new)

# ---------- 5) 设置文案 + 自动发音开关 ----------
rep("'切换词库会清空当前词库的学习记录，两个词库各自独立。'",
    "'两个词库的进度各自独立保存，随时切换、互不清空。'")

old = """      '<div class="vc-field">' +
        '<div class="vc-field-h">词库</div>' +"""
new = """      '<div class="vc-field">' +
        '<div class="vc-field-h">自动朗读</div>' +
        '<div class="vc-field-d">开启后，英选中出题时自动读一遍单词（按 s 随时手动读）。</div>' +
        '<div class="vc-chips">' +
          '<button type="button" class="vc-chip' + (state.autoSpeak ? ' active' : '') + '" data-speak="on">开启</button>' +
          '<button type="button" class="vc-chip' + (!state.autoSpeak ? ' active' : '') + '" data-speak="off">关闭</button>' +
        '</div>' +
      '</div>' +

      '<div class="vc-field">' +
        '<div class="vc-field-h">词库</div>' +"""
rep(old, new)

old = """    el.querySelectorAll('[data-book]').forEach(function (b) {"""
new = """    el.querySelectorAll('[data-speak]').forEach(function (b) {
      b.onclick = function () {
        state.autoSpeak = b.getAttribute('data-speak') === 'on';
        saveState();
        renderHome();
      };
    });
    el.querySelectorAll('[data-book]').forEach(function (b) {"""
rep(old, new)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('per-book v2 ok')
