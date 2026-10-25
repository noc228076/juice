# -*- coding: utf-8 -*-
import io

p = 'js/modules/vocab.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new, 1)

# ---------- 1) finishSession 写档案：每局一条 ----------
rep("""    saveState();
    submitBoards();""","""    saveState();
    submitBoards();

    /* 全所统一档案库：每完成一局记一条（含当局统计，供档案中心回看） */
    if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
      var doneWords = usedNew;
      var hisAcc = (right + wrong) ? Math.round(right / (right + wrong) * 100) : null;
      window.UniversalHistory.add({
        module: 'vocab',
        title: '背单词 · 本局 ' + (right + wrong) + ' 题 · ' + doneWords + ' 个新词' +
          (hisAcc != null ? ' · 正确率 ' + hisAcc + '%' : ''),
        subtitle: 'CET-' + (state.book === 'cet6' ? '6' : '4') +
          ' · 连续打卡 ' + (bs().streak || 0) + ' 天 · 累计 ' + (bs().totalAnswered || 0) + ' 题',
        color: '#6366F1',
        badge: '背单词',
        avatar: '📚',
        data: { test: 'vocab', date: bs().day, right: right, wrong: wrong, acc: hisAcc, newWords: doneWords }
      });
    }""")

# ---------- 2) 今日页到期复习醒目条 ----------
rep("""    return '<div class="vc-hero">' +
        '<div class="vc-hero-art">' + owl('think') + '</div>' +
        '<div class="vc-hero-main">' +
          '<div class="vc-hero-tag">' + (state.book === 'cet6' ? 'CET-6' : 'CET-4') +
            ' · 第 ' + (state.streak + 1) + ' 天 · ' + (state.order === 'random' ? '乱序' : '顺序') + '</div>' +
          '<h1 class="vc-hero-title">今日摸鱼局</h1>' +
          '<p class="vc-hero-sub">待复习 <b>' + dueN + '</b> · 新词 <b>' + newN + '</b> · 共 <b>' + total + '</b> 题</p>' +""","""    var dueAll = 0;
    if (book) {
      var td = dayNum(todayKey());
      for (var wi = 0; wi < book.words.length; wi++) {
        var wr = bs().words[book.words[wi][0]];
        if (wr && !wr.known && wr.due <= td) dueAll++;
      }
    }
    var dueBanner = (dueAll > 0 && dueN === 0 && total === 0)
      ? '<div class="vc-due-banner">📖 有 <b>' + dueAll + '</b> 个词今天到期复习——它们明天也会在，但今天最划算' +
        '<button class="vc-btn small primary" id="vcDueStart" type="button">开始复习</button></div>'
      : '';
    return dueBanner + '<div class="vc-hero">' +
        '<div class="vc-hero-art">' + owl('think') + '</div>' +
        '<div class="vc-hero-main">' +
          '<div class="vc-hero-tag">' + (state.book === 'cet6' ? 'CET-6' : 'CET-4') +
            ' · 第 ' + (state.streak + 1) + ' 天 · ' + (state.order === 'random' ? '乱序' : '顺序') + '</div>' +
          '<h1 class="vc-hero-title">今日摸鱼局</h1>' +
          '<p class="vc-hero-sub">待复习 <b>' + dueN + '</b> · 新词 <b>' + newN + '</b> · 共 <b>' + total + '</b> 题</p>' +""")

# ---------- 3) bindToday 绑定横幅按钮 ----------
rep("""  function bindToday() {""","""  function bindToday() {
    var dueBtn = el.querySelector('#vcDueStart');
    if (dueBtn) dueBtn.onclick = function () {
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      queue = buildQueue();
      qi = 0;
      answered = false;
      current = null;
      sessionStats = { right: 0, wrong: 0 };
      countedWords = {};
      startSession();
    };""")

# ---------- 4) 档案中心：vocab 筛选 chip + 计数 ----------
p2 = 'js/modules/history.js'
s2 = io.open(p2, encoding='utf-8').read()

a2 = """      scratch: list.filter(r => r.module === 'scratch').length
    };"""
b2 = """      scratch: list.filter(r => r.module === 'scratch').length,
      vocab: list.filter(r => r.module === 'vocab').length
    };"""
assert a2 in s2
s2 = s2.replace(a2, b2, 1)

a2 = """        <button class="uni-filter-chip ${filterMod === 'scratch' ? 'active' : ''}" data-mod="scratch">🎟️ 刮刮乐 <span class="chip-count">${counts.scratch}</span></button>"""
b2 = """        <button class="uni-filter-chip ${filterMod === 'scratch' ? 'active' : ''}" data-mod="scratch">🎟️ 刮刮乐 <span class="chip-count">${counts.scratch}</span></button>
        <button class="uni-filter-chip ${filterMod === 'vocab' ? 'active' : ''}" data-mod="vocab">📚 背单词 <span class="chip-count">${counts.vocab}</span></button>"""
assert a2 in s2
s2 = s2.replace(a2, b2, 1)

# 点档案条目 → 跳背单词统计页（vocab 记录不可回放对局，落到统计最合理）
a2 = """      } else if (mod === 'scratch') {"""
b2 = """      } else if (mod === 'vocab') {
        if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
          window.AppRouter.navigate('vocab', 'home');
        }
      } else if (mod === 'scratch') {"""
assert a2 in s2
s2 = s2.replace(a2, b2, 1)

io.open(p2, 'w', encoding='utf-8', newline='\n').write(s2)
print('history integration ok')
