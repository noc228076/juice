# -*- coding: utf-8 -*-
import io

p = 'js/modules/vocab.js'
s = io.open(p, encoding='utf-8').read()

def rep(old, new):
    global s
    assert old in s, 'NOT FOUND: ' + old[:70]
    s = s.replace(old, new, 1)

# ---------- 1) 统计页：文字进度条 → SVG 进度环 ----------
rep("""    return '<div class="vc-panel">' +
      '<h2 class="vc-h2">学习统计</h2>' +

      '<div class="vc-kv"><span>累计学过</span><b>' + known + ' / ' + total + ' 词 · ' + pct + '%</b></div>' +
      '<div class="vc-bar"><i style="width:' + pct + '%"></i></div>' +

      '<div class="vc-statgrid">' + stats.map(function (it) {""","""    /* 词书进度环：SVG 圆环，中心大数字 + 目标感副行 */
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

      '<div class="vc-statgrid">' + stats.map(function (it) {""")

# ---------- 2) 统计页：打卡日历（当月，打卡点亮，连续 streak 火苗） ----------
rep("""      '<div class="vc-h3">最近 ' + HEAT_DAYS + ' 天' +
        '<span class="vc-heat-legend"><i class="lv0"></i><i class="lv1"></i><i class="lv2"></i><i class="lv3"></i></span>' +
      '</div>' +
      heatmap(HEAT_DAYS) +
      '</div>';
  }""","""      '<div class="vc-h3">最近 ' + HEAT_DAYS + ' 天' +
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
  }""")

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('stats ring+calendar ok')

# ---------- 3) 排行榜：hover/我的行强调/空态最小高度 ----------
p = 'css/modules/vocab.css'
s = io.open(p, encoding='utf-8').read()

old = """.vc-lb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
}"""
new = """.vc-lb-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 14px;
  border-bottom: 1px solid var(--line);
  font-size: 13px;
  transition: background 0.12s ease;
}
.vc-lb-row:not(.me):hover { background: var(--mod-ambient); }
/* 少于 8 行时撑住面板高度，避免榜单下方大片空白 */
.vc-lb { min-height: 320px; }"""
assert old in s
s = s.replace(old, new, 1)

old = """.vc-lb-row.me {
  background: var(--mod-ambient);
}"""
new = """.vc-lb-row.me {
  background: var(--mod-ambient);
  box-shadow: inset 3px 0 0 var(--mod-ac);
}"""
assert old in s
s = s.replace(old, new, 1)

s = s.rstrip() + """

/* ---------- 词书进度环 ---------- */
.vc-ring-wrap {
  display: flex;
  align-items: center;
  gap: 22px;
  margin: 6px 0 18px;
}
.vc-ring { position: relative; width: 128px; height: 128px; flex: none; }
.vc-ring svg { display: block; }
.vc-ring-num {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.vc-ring-num b { font-size: 24px; font-weight: 900; color: var(--tx); }
.vc-ring-num span { font-size: 11px; color: var(--tx-dim); margin-top: 2px; }
.vc-ring-side { flex: 1; min-width: 0; }
.vc-ring-goal {
  font-size: 13.5px;
  line-height: 1.7;
  color: var(--tx-dim);
  margin: 0;
}
.vc-ring-goal b { color: var(--mod-ac); }

/* ---------- 打卡日历 ---------- */
.vc-cal {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}
.vc-cal-h {
  font-style: normal;
  font-size: 11px;
  color: var(--tx-faint);
  text-align: center;
  padding: 2px 0;
}
.vc-cal-d {
  border-radius: 9px;
  padding: 5px 0 4px;
  text-align: center;
  background: var(--btn-ghost-bg);
  min-height: 44px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}
.vc-cal-d b { font-size: 12.5px; color: var(--tx); font-weight: 700; }
.vc-cal-d em {
  font-style: normal;
  font-size: 10.5px;
  color: var(--tx-faint);
  margin-top: 1px;
}
.vc-cal-d.future { opacity: 0.35; }
.vc-cal-d.hit1 { background: var(--mod-ac-soft); }
.vc-cal-d.hit2 { background: var(--mod-ac-fade); }
.vc-cal-d.hit3 { background: var(--mod-ac); }
.vc-cal-d.hit3 b, .vc-cal-d.hit3 em { color: var(--mod-ac-ink); }
.vc-cal-d.today { outline: 2px solid var(--mod-ac); outline-offset: -2px; }
.vc-cal-streak {
  font-size: 12px;
  font-weight: 700;
  color: var(--mod-ac);
  margin-left: 8px;
}
@media (max-width: 480px) {
  .vc-ring-wrap { gap: 14px; }
  .vc-ring { width: 104px; height: 104px; }
  .vc-ring svg { width: 104px; height: 104px; }
  .vc-cal-d { min-height: 38px; }
}
"""
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('css ok')
