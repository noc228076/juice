/* =========================================================
   模块 3：自我说明书 (Self Manual Module) 控制中枢
   6 大打工人说明书：社交电池 / 拖延症 / 摸鱼能力 / 熬夜形态 / 反应力 / 色彩敏感
   ========================================================= */

(function () {
  'use strict';

  var DATA = window.SM_DATA, ORDER = window.SM_ORDER;
  var root = null;
  function $(s) {
    if (root) {
      var el = root.querySelector(s);
      if (el) return el;
    }
    return document.querySelector(s);
  }
  function $$(s) {
    var list = root ? root.querySelectorAll(s) : document.querySelectorAll(s);
    return Array.prototype.slice.call(list);
  }

  var state = {
    mode: 'home',
    test: null,
    qIdx: 0,
    scores: {},
    answers: [],
    result: null,
    reportExtra: null,
    gameCtl: null
  };

  function store() {
    try { return JSON.parse(localStorage.getItem('sm_history_v1') || '{}'); }
    catch (e) { return {}; }
  }
  function saveStore(s) {
    try { localStorage.setItem('sm_history_v1', JSON.stringify(s)); } catch (e) {}
  }
  function pushHistory(testId, res) {
    var s = store();
    s[testId] = s[testId] || [];
    s[testId].push({ t: Date.now(), name: res.name, type: (res.detail && res.detail.type) || res.name });
    if (s[testId].length > 12) s[testId] = s[testId].slice(-12);
    saveStore(s);
  }

  function hexSoft(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }
  function reportNo() {
    var d = new Date();
    var ymd = d.getFullYear() + ('0' + (d.getMonth() + 1)).slice(-2) + ('0' + d.getDate()).slice(-2);
    return 'SM-' + ymd + '-' + ('000' + Math.floor(Math.random() * 1000)).slice(-3);
  }

  function showScreen(id) {
    if (!root) root = document.getElementById('mod-manual');
    var screens = root ? root.querySelectorAll('.sm-screen') : document.querySelectorAll('#mod-manual .sm-screen');
    screens.forEach(function (s) { s.classList.remove('active'); });
    var sc = document.getElementById(id);
    if (sc) {
      sc.classList.add('active');
      if (root) root.scrollTop = 0;
    }
  }

  function renderHome() {
    state.mode = 'home';
    if (state.gameCtl && state.gameCtl.destroy) {
      state.gameCtl.destroy();
      state.gameCtl = null;
    }
    var DATA = window.SM_DATA || {};
    var ORDER = window.SM_ORDER || ['social-battery', 'procrastination', 'slacking', 'night-owl', 'reaction', 'color'];
    var s = store();
    var done = ORDER.filter(function (id) { return s[id] && s[id].length; }).length;
    var total = ORDER.reduce(function (n, id) { return n + (s[id] ? s[id].length : 0); }, 0);

    var html = '';
    html += '<div class="home-head"><div class="brandmark">我</div><div>'
      + '<div class="home-title">自我说明书</div><div class="home-sub">SELF MANUAL · 六份关于你的出厂说明书</div></div></div>';
    html += '<div class="home-desc">你是哪种拖延病患者？社交电量还剩多少？反应能力几岁？挑一章，把自己拆开看看。</div>';

    html += '<div class="stat-strip"><div style="display:flex;gap:5px">'
      + ORDER.map(function (id) {
        var t = DATA[id];
        var c = t ? t.color : '#38BDF8';
        var on = s[id] && s[id].length;
        return '<span class="dot' + (on ? ' done' : '') + '" style="' + (on ? 'background:' + c : '') + '"></span>';
      }).join('')
      + '</div><div style="flex:1"></div><div>已测 <b>' + done + '</b>/6 章 · 存档 <b>' + total + '</b> 份</div></div>';

    html += '<div class="manual-grid">';
    ORDER.forEach(function (id, i) {
      var t = DATA[id];
      if (!t) return;
      var last = s[id] && s[id].length ? s[id][s[id].length - 1] : null;
      var chip = '';
      if (last) {
        var txt = last.type;
        chip = '<span style="font-size:11px;color:' + t.color + ';background:' + hexSoft(t.color, 0.12) + ';padding:2px 8px;border-radius:999px;font-weight:700;">' + txt + '</span>';
      }
      var iconSvg = (typeof window.icon === 'function') ? window.icon(t.icon) : '📖';
      html += '<div class="tile" data-test="' + id + '">'
        + '<span class="t-num">' + t.num + '</span>'
        + '<span class="t-ico" style="background:' + hexSoft(t.color, 0.1) + ';color:' + t.color + '">' + iconSvg + '</span>'
        + '<div class="t-info">'
        + '<div style="display:flex;align-items:center;gap:6px;"><span class="t-title">' + t.title + '</span>' + chip + '</div>'
        + '<div class="t-meta">' + t.tagline + '</div>'
        + '</div>'
        + '<span class="t-arrow">→</span>'
        + '</div>';
    });
    html += '</div>';

    var homeBodyEl = document.getElementById('sm-homebody');
    if (homeBodyEl) {
      homeBodyEl.innerHTML = html;
      homeBodyEl.querySelectorAll('.tile').forEach(function (c) {
        c.addEventListener('click', function () {
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          openTest(c.getAttribute('data-test'));
        });
      });
    }
  }

  function openTest(id) {
    var dataMap = window.SM_DATA || {};
    var t = dataMap[id];
    if (!t) return;
    state.test = t;
    if (t.mode === 'interactive') {
      openGame(t);
      return;
    }
    openCover(t);
  }

  function topbarHTML(t) {
    return '<div class="mt-topbar" style="margin-bottom:12px;"><button class="mt-iconbtn" id="sm-tback">←</button>'
      + '<div class="mt-pick-head" style="flex:1;margin-bottom:0"><b>第 ' + t.num + ' 章 · ' + t.title + '</b><p>' + t.en + '</p></div></div>';
  }

  function openCover(t) {
    state.mode = 'cover';
    var topEl = document.getElementById('sm-quiztop');
    if (topEl) {
      topEl.innerHTML = topbarHTML(t);
    }
    var icoHtml = (typeof window.icon === 'function') ? window.icon(t.icon) : '📖';
    var boltIco = (typeof window.icon === 'function') ? window.icon('bolt') : '⚡';
    var html = '<div class="fs-card" style="text-align:center;padding:28px 20px;">'
      + '<div style="width:72px;height:72px;border-radius:20px;margin:0 auto 14px;background:' + hexSoft(t.color, 0.12) + ';color:' + t.color + ';display:grid;place-items:center;font-size:36px;">' + icoHtml + '</div>'
      + '<h2 style="font-size:24px;margin-bottom:4px;">' + t.title + '</h2>'
      + '<div style="font-size:12px;color:var(--tx-dim);letter-spacing:2px;margin-bottom:16px;">' + t.en + '</div>'
      + '<div style="font-size:13.5px;color:var(--tx-dim);line-height:1.8;text-align:left;background:var(--card);padding:14px 16px;border-radius:var(--r-md);margin-bottom:20px;">'
      + (t.intro || []).map(function (p) { return '<p style="margin-bottom:6px;">' + p + '</p>'; }).join('')
      + '</div>'
      + '<button class="mt-btn" id="sm-startbtn" style="width:100%;">' + boltIco + ' 翻开这一章</button>'
      + '</div>';
    var bodyEl = document.getElementById('sm-quizbody');
    if (bodyEl) {
      bodyEl.innerHTML = html;
    }
    showScreen('scr-sm-quiz');
    var backBtn = topEl ? topEl.querySelector('.mt-iconbtn') : null;
    if (backBtn) {
      backBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        renderHome();
        showScreen('scr-sm-home');
      };
    }
    var startBtn = document.getElementById('sm-startbtn');
    if (startBtn) {
      startBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startQuiz(t);
      };
    }
  }

  function startQuiz(t) {
    state.mode = 'quiz';
    state.qIdx = 0;
    state.scores = {};
    state.answers = [];
    renderQuestion(t);
  }

  function renderQuestion(t) {
    var q = t.questions[state.qIdx];
    var pct = (state.qIdx + 1) / t.questions.length * 100;
    var keys = ['A', 'B', 'C', 'D', 'E'];
    var html = '<div class="q-wrap">'
      + '<div class="q-head"><span>第 ' + (state.qIdx + 1) + ' / ' + t.questions.length + ' 题</span><span>' + t.title + '</span></div>'
      + '<div class="q-bar"><i style="width:' + pct + '%"></i></div>'
      + '<div class="q-box">'
      + '<h3>' + q.q + '</h3>'
      + '<div class="opts">';
    q.o.forEach(function (op, i) {
      html += '<button class="q-opt" data-i="' + i + '">'
        + '<span class="tag">' + keys[i] + '</span><span>' + op.t + '</span></button>';
    });
    html += '</div></div></div>';
    var bodyEl = document.getElementById('sm-quizbody');
    if (bodyEl) {
      bodyEl.innerHTML = html;
      bodyEl.querySelectorAll('.q-opt').forEach(function (b) {
        b.addEventListener('click', function () {
          var i = parseInt(b.getAttribute('data-i'), 10);
          pickOption(t, i, b);
        });
      });
    }
  }

  function pickOption(t, i, btn) {
    btn.classList.add('sel');
    if (window.SFX && window.SFX.tap) window.SFX.tap();
    var op = t.questions[state.qIdx].o[i];
    (op.s || []).forEach(function (p) { state.scores[p[0]] = (state.scores[p[0]] || 0) + p[1]; });
    state.answers.push(i);
    setTimeout(function () {
      if (state.qIdx + 1 >= t.questions.length) {
        showComputing(t);
      } else {
        state.qIdx++;
        renderQuestion(t);
      }
    }, 280);
  }

  function showComputing(t) {
    var bodyEl = document.getElementById('sm-quizbody');
    if (bodyEl) {
      bodyEl.innerHTML = '<div style="text-align:center;padding:60px 20px;">'
        + window.sealHTML()
        + '<h3 style="margin-top:20px;font-size:20px;">正在质检盖章…</h3>'
        + '<p style="font-size:13px;color:var(--tx-dim);margin-top:8px;">盖上官方检验印章，马上出具说明书</p></div>';
    }
    setTimeout(function () {
      var res = t.compute.call(t, state.scores);
      showResult(t, res);
    }, 600);
  }

  function showResult(t, res) {
    state.mode = 'result';
    state.result = res;
    var extra = { no: reportNo(), t: Date.now() };
    pushHistory(t.id, res);

    if (window.UniversalHistory) {
      window.UniversalHistory.add({
        module: 'manual',
        title: `说明书 · ${t.title}：${res.name}`,
        subtitle: `${res.tag} · ${res.text ? res.text.slice(0, 40) + '…' : ''}`,
        color: t.color,
        badge: '📖 说明书',
        avatar: '📖',
        data: { test: t, res: res, extra: extra }
      });
    }

    var resultBody = document.getElementById('sm-resultbody');
    if (resultBody && window.renderReport) {
      window.renderReport(resultBody, t, res, extra);
    }
    showScreen('scr-sm-result');

    var rback = document.getElementById('rback');
    if (rback) rback.onclick = function () { renderHome(); showScreen('scr-sm-home'); };
    var rhome = document.getElementById('rhome');
    if (rhome) rhome.onclick = function () { renderHome(); showScreen('scr-sm-home'); };
    var rretry = document.getElementById('rretry');
    if (rretry) rretry.onclick = function () { openCover(t); };
    var rsave = document.getElementById('rsave');
    if (rsave) rsave.onclick = function () {
      if (window.buildShareCard) {
        var card = window.buildShareCard(t, res, extra);
        var href = (typeof card === 'string') ? card : card.toDataURL('image/png');
        var a = document.createElement('a');
        a.download = `自我说明书_${t.title}_${res.name}.png`;
        a.href = href;
        a.click();
      }
    };
  }

  function openGame(t) {
    state.mode = 'game';
    var isReaction = t.id === 'reaction';
    var scrId = isReaction ? 'scr-sm-reaction' : 'scr-sm-color';
    var topId = isReaction ? 'sm-reacttop' : 'sm-colortop';
    var bodyId = isReaction ? 'sm-reactbody' : 'sm-colorbody';

    var topEl = document.getElementById(topId);
    if (topEl) {
      topEl.innerHTML = topbarHTML(t);
    }
    showScreen(scrId);

    var backBtn = topEl ? topEl.querySelector('.mt-iconbtn') : null;
    if (backBtn) {
      backBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (state.gameCtl && state.gameCtl.destroy) state.gameCtl.destroy();
        renderHome();
        showScreen('scr-sm-home');
      };
    }

    var startFn = isReaction ? window.startReaction : window.startColor;
    var bodyEl = document.getElementById(bodyId);
    if (startFn && bodyEl) {
      state.gameCtl = startFn(bodyEl, function (rawRes) {
        var res = (t.compute ? t.compute.call(t, rawRes) : rawRes) || rawRes;
        showResult(t, res);
      });
    }
  }

  function restore(data) {
    if (!data || !data.test || !data.res) return;
    state.mode = 'result';
    state.result = data.res;
    var resultBody = document.getElementById('sm-resultbody');
    if (resultBody && window.renderReport) {
      window.renderReport(resultBody, data.test, data.res, data.extra || { no: reportNo(), t: Date.now() });
    }
    showScreen('scr-sm-result');

    var rback = document.getElementById('rback');
    if (rback) rback.onclick = function () { renderHome(); showScreen('scr-sm-home'); };
    var rhome = document.getElementById('rhome');
    if (rhome) rhome.onclick = function () { renderHome(); showScreen('scr-sm-home'); };
    var rretry = document.getElementById('rretry');
    if (rretry) rretry.onclick = function () { openCover(data.test); };
    var rsave = document.getElementById('rsave');
    if (rsave) rsave.onclick = function () {
      if (window.buildShareCard) {
        var card = window.buildShareCard(data.test, data.res, data.extra);
        var href = (typeof card === 'string') ? card : card.toDataURL('image/png');
        var a = document.createElement('a');
        a.download = `自我说明书_${data.test.title}_${data.res.name}.png`;
        a.href = href;
        a.click();
      }
    };
  }

  function init() {
    root = document.getElementById('mod-manual');
    if (!root) return;
    renderHome();
    showScreen('scr-sm-home');
  }

  window.AppManual = {
    init,
    renderHome,
    openTest,
    showScreen,
    restore
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();

