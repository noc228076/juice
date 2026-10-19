/* =========================================================
   模块 3：自我说明书 (Self Manual Module) 控制中枢
   10 章打工人说明书：4 个问答 + 人间清醒 + 5 个交互小游戏
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
    gameCtl: null,
    gameId: null
  };

  function store() {
    try { return JSON.parse(localStorage.getItem('sm_history_v1') || '{}'); }
    catch (e) { return {}; }
  }
  function saveStore(s) {
    try { localStorage.setItem('sm_history_v1', JSON.stringify(s)); } catch (e) {}
  }
  // 人间清醒（第 05 章）不出分数报告，存档在它自己的 key 里，
  // 所以「是否已测」要单独判定，否则目录永远少点亮一个点。
  function chapterDone(id, s) {
    if (id === 'lifeguide') {
      try {
        var audit = JSON.parse(localStorage.getItem('juice_lifeguide_audit_v1') || '[]');
        return !!(audit && audit.length);
      } catch (e) { return false; }
    }
    return !!(s[id] && s[id].length);
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
      if (root) root.scrollTop = 0;   // .app-module 带 overflow-y:auto，滚动容器就是它
    }
    syncRail();   // 所有跳转都经由这里，侧栏高亮不会漏
  }

  function renderHome() {
    state.mode = 'home';
    state.test = null;   // 回到目录时侧栏不该还高亮某一章
    // 扫雷 / 2048 的实例是暂停态，回目录不销毁——否则切回来进度就没了。
    // 只跳过销毁，侧栏渲染照常往下走。
    if (!(state.gameCtl && typeof state.gameCtl.pause === 'function')) {
      if (state.gameCtl && state.gameCtl.destroy) {
        state.gameCtl.destroy();
        state.gameCtl = null;
        state.gameId = null;
      }
    }
    var DATA = window.SM_DATA || {};
    var ORDER = window.SM_ORDER || ['social-battery', 'procrastination', 'slacking', 'night-owl', 'lifeguide', 'reaction', 'color', 'game-2048', 'minesweeper', 'schulte'];
    var s = store();
    var done = ORDER.filter(function (id) { return chapterDone(id, s); }).length;
    // 存档份数只统计答题/游戏章：人间清醒没有分数报告，计入会虚高
    var total = ORDER.reduce(function (n, id) {
      return n + (DATA[id] && DATA[id].mode === 'external' ? 0 : (s[id] ? s[id].length : 0));
    }, 0);

    var html = '';
    html += '<div class="home-head"><div class="brandmark">我</div><div>'
      + '<div class="home-title">自我说明书</div><div class="home-sub">SELF MANUAL · 十份关于你的出厂说明书</div></div></div>';
    html += '<div class="home-desc">你是哪种拖延病患者？社交电量还剩多少？反应能力几岁？2048能合出多大？还有一份人间清醒防坑指南。挑一章，把自己拆开看看。</div>';

    html += '<div class="stat-strip"><div style="display:flex;gap:5px">'
      + ORDER.map(function (id) {
        var t = DATA[id];
        var c = t ? t.color : '#38BDF8';
        var on = chapterDone(id, s);
        return '<span class="dot' + (on ? ' done' : '') + '" style="' + (on ? 'background:' + c : '') + '"></span>';
      }).join('')
      + '</div><div style="flex:1"></div><div>已测 <b>' + done + '</b>/' + ORDER.length + ' 章 · 存档 <b>' + total + '</b> 份</div></div>';

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

  function openTest(id, options) {
    options = options || {};
    var dataMap = window.SM_DATA || {};
    var t = dataMap[id];
    if (!t) return;
    if (!options.silent && window.AppRouter && typeof window.AppRouter.pushView === 'function') {
      if (t.mode === 'external') {
        window.AppRouter.pushView('lifeguide');
        return;
      }
      // 说明书内部章节互斥：从一章切到另一章用 replaceView 而不是 push，
      // 否则历史栈会堆成「home → 扫雷 → 2048 → …」，
      // 返回键永远回不到目录，只会逐个倒回旧游戏。
      // 只有从目录（home）进入时才 push，保证后退能回目录。
      var viewName = t.mode === 'interactive' ? 'game' : 'chapter';
      var rstate = window.AppRouter.getState ? window.AppRouter.getState() : null;
      var isSibling = rstate && rstate.mod === 'manual'
        && (rstate.view === 'game' || rstate.view === 'chapter' || rstate.view === 'result');
      if (isSibling && typeof window.AppRouter.replaceView === 'function') {
        window.AppRouter.replaceView(viewName, { testId: id });
      } else {
        window.AppRouter.pushView(viewName, { testId: id });
      }
    }
    state.test = t;
    if (t.mode === 'interactive') {
      openGame(t, options);
      return;
    }
    // 外部章节：正文由自己的模块渲染（目前只有第 05 章人间清醒）
    if (t.mode === 'external') {
      if (window.AppLifeguide && typeof window.AppLifeguide.open === 'function') {
        window.AppLifeguide.open({ fromRouter: !!options.silent });
      }
      return;
    }
    openCover(t, options);
  }

  function topbarHTML(t) {
    return '<div class="mt-topbar" style="margin-bottom:12px;"><button class="mt-iconbtn" id="sm-tback">←</button>'
      + '<div class="mt-pick-head" style="flex:1;margin-bottom:0"><b>第 ' + t.num + ' 章 · ' + t.title + '</b><p>' + t.en + '</p></div></div>';
  }

  function openCover(t, options) {
    options = options || {};
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
        if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () {
          renderHome();
          showScreen('scr-sm-home');
        });
        else {
          renderHome();
          showScreen('scr-sm-home');
        }
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
    if (state.gameCtl && state.gameCtl.destroy) {
      state.gameCtl.destroy();
      state.gameCtl = null;
      state.gameId = null;
    }
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

    if (window.AppRouter && typeof window.AppRouter.replaceView === 'function') {
      window.AppRouter.replaceView('result', { testId: t.id, test: t, result: res, extra: extra });
    }

    var rback = document.getElementById('rback');
    if (rback) rback.onclick = function () {
      if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
      else { renderHome(); showScreen('scr-sm-home'); }
    };
    var rhome = document.getElementById('rhome');
    if (rhome) rhome.onclick = function () {
      if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
      else { renderHome(); showScreen('scr-sm-home'); }
    };
    var rretry = document.getElementById('rretry');
    if (rretry) rretry.onclick = function () { openTest(t.id); };
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

  // 每个交互章节一个独立屏幕，按章节 id 映射过去。
  // 提到模块作用域：openGame 的「恢复进度」分支在函数前部就要用它。
  var GAME_SCREENS = {
    'reaction': { scr: 'scr-sm-reaction', top: 'sm-reacttop', body: 'sm-reactbody', start: 'startReaction' },
    'color': { scr: 'scr-sm-color', top: 'sm-colortop', body: 'sm-colorbody', start: 'startColor' },
    'game-2048': { scr: 'scr-sm-2048', top: 'sm-2048top', body: 'sm-2048body', start: 'startGame2048' },
    'minesweeper': { scr: 'scr-sm-mine', top: 'sm-minetop', body: 'sm-minebody', start: 'startMinesweeper' },
    'schulte': { scr: 'scr-sm-schulte', top: 'sm-schultetop', body: 'sm-schultebody', start: 'startSchulte' }
  };

  function openGame(t, options) {
    options = options || {};
    // 扫雷 / 2048：同一章节已有被暂停的实例时，直接恢复进度而不是重开一局。
    // 必须同时确认「实例就是这一章的」——state.gameCtl 可能是另一个
    // 支持进度的游戏留下的（比如 2048 的实例还没销毁就去点扫雷），
    // 只看 state.test 会拿 2048 的 el 渲染扫雷的屏幕，整块变空。
    if (!options.forceNew && state.gameCtl && state.gameId === t.id
        && typeof state.gameCtl.repaint === 'function') {
      state.mode = 'game';
      state.test = t;
      var gsSame = GAME_SCREENS[t.id] || GAME_SCREENS['game-2048'];
      var topElSame = document.getElementById(gsSame.top);
      if (topElSame) topElSame.innerHTML = topbarHTML(t);
      showScreen(gsSame.scr);
      state.gameCtl.repaint();
      return;
    }
    if (state.gameCtl && state.gameCtl.destroy) {
      state.gameCtl.destroy();
      state.gameCtl = null;
      state.gameId = null;
    }
    state.mode = 'game';
    var gs = GAME_SCREENS[t.id] || GAME_SCREENS['game-2048'];
    var scrId = gs.scr;
    var topId = gs.top;
    var bodyId = gs.body;

    var topEl = document.getElementById(topId);
    if (topEl) {
      topEl.innerHTML = topbarHTML(t);
    }
    showScreen(scrId);

    var backBtn = topEl ? topEl.querySelector('.mt-iconbtn') : null;
    if (backBtn) {
      backBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        // 走统一的暂停/销毁通道：2048/扫雷只暂停（切回来进度还在），
        // 其余游戏销毁。不要在这里直接 destroy——那会把保留进度打穿。
        if (window.AppManual && typeof window.AppManual.stopActiveGame === 'function') {
          window.AppManual.stopActiveGame();
        } else if (state.gameCtl && state.gameCtl.destroy) {
          state.gameCtl.destroy();
          state.gameCtl = null;
          state.gameId = null;
        }
        if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
        else {
          renderHome();
          showScreen('scr-sm-home');
        }
      };
    }

    var startFn = window[gs.start];
    var bodyEl = document.getElementById(bodyId);
    if (startFn && bodyEl) {
      state.gameCtl = startFn(bodyEl, function (rawRes) {
        var res = (t.compute ? t.compute.call(t, rawRes) : rawRes) || rawRes;
        showResult(t, res);
      });
      // 记住这个实例是哪一章的，恢复进度时用来比对，
      // 避免拿 2048 的实例去渲染扫雷的屏幕
      state.gameId = t.id;
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
    if (rback) rback.onclick = function () {
      if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
      else { renderHome(); showScreen('scr-sm-home'); }
    };
    var rhome = document.getElementById('rhome');
    if (rhome) rhome.onclick = function () {
      if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
      else { renderHome(); showScreen('scr-sm-home'); }
    };
    var rretry = document.getElementById('rretry');
    if (rretry) rretry.onclick = function () {
      // openTest 会按章节类型路由：互动游戏直接重开一局，
      // 问答章节走封面 —— 不能对游戏也弹封面模板
      openTest(data.test.id);
    };
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

  /* ============ PC 常驻章节导航（侧栏） ============
     与首页 tile 共用 openTest()，避免两套入口行为漂移。
     仅桌面显示；窄屏由 CSS 隐藏，仍走原来的「← 返回」按钮。
     ------------------------------------------------ */
  var railBuilt = false;

  function buildRail() {
    if (railBuilt) return;
    var nav = document.getElementById('sm-rail-nav');
    if (!nav) return;
    var DATA = window.SM_DATA || {};
    var ORDER = window.SM_ORDER || [];
    var html = '';
    ORDER.forEach(function (id) {
      var t = DATA[id];
      if (!t) return;
      var iconSvg = (typeof window.icon === 'function') ? window.icon(t.icon) : '📖';
      html += '<button class="sm-rail-item" data-test="' + id + '">'
        + '<span class="sm-rail-num" style="color:' + t.color + '">' + t.num + '</span>'
        + '<span class="sm-rail-ico" style="background:' + hexSoft(t.color, 0.12) + ';color:' + t.color + '">' + iconSvg + '</span>'
        + '<span class="sm-rail-info"><b>' + t.title + '</b><i>' + t.tagline + '</i></span>'
        + '<span class="sm-rail-dot" data-dot="' + id + '"></span>'
        + '</button>';
    });
    nav.innerHTML = html;
    nav.querySelectorAll('.sm-rail-item').forEach(function (c) {
      c.addEventListener('click', function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        openTest(c.getAttribute('data-test'));
      });
    });
    var homeBtn = document.getElementById('sm-rail-home');
    if (homeBtn) {
      homeBtn.addEventListener('click', function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (window.AppRouter && typeof window.AppRouter.back === 'function') window.AppRouter.back(function () { renderHome(); showScreen('scr-sm-home'); });
        else {
          renderHome();
          showScreen('scr-sm-home');
        }
      });
    }
    railBuilt = true;
  }

  // 高亮当前章 + 同步「已测/存档」计数
  function syncRail() {
    var nav = document.getElementById('sm-rail-nav');
    if (!nav) return;
    var DATA = window.SM_DATA || {};
    var ORDER = window.SM_ORDER || [];
    var s = store();
    var cur = state.test ? state.test.id : null;

    nav.querySelectorAll('.sm-rail-item').forEach(function (c) {
      var id = c.getAttribute('data-test');
      c.classList.toggle('active', !!cur && id === cur);
      var dot = c.querySelector('.sm-rail-dot');
      if (dot) dot.classList.toggle('done', chapterDone(id, s));
    });

    var sum = document.getElementById('sm-rail-sum');
    if (sum) {
      var done = ORDER.filter(function (id) { return chapterDone(id, s); }).length;
      var total = ORDER.reduce(function (n, id) {
        return n + (DATA[id] && DATA[id].mode === 'external' ? 0 : (s[id] ? s[id].length : 0));
      }, 0);
      sum.innerHTML = '已测 <b>' + done + '</b>/' + ORDER.length + ' 章 · 存档 <b>' + total + '</b> 份';
    }
  }

  function init() {
    root = document.getElementById('mod-manual');
    if (!root) return;
    buildRail();
    renderHome();
    showScreen('scr-sm-home');
    syncRail();
  }

  function stopActiveGame() {
    document.querySelectorAll('.floatmsg').forEach(function (n) {
      if (n && n.parentNode) n.remove();
    });
    // 扫雷 / 2048 支持保留进度：只暂停不销毁，实例留在 state.gameCtl 里，
    // 下次进入同一章节时走 resumeGame() 重绘恢复。其余游戏仍按原逻辑销毁。
    if (state.gameCtl && typeof state.gameCtl.pause === 'function') {
      state.gameCtl.pause();
      return;
    }
    if (state.gameCtl && state.gameCtl.destroy) {
      state.gameCtl.destroy();
      state.gameCtl = null;
      if (state.mode === 'game') {
        renderHome();
        showScreen('scr-sm-home');
      }
    }
  }

  // 切回说明书时，如果有一个被暂停的游戏实例，重绘恢复它
  function resumeGame() {
    if (state.gameCtl && typeof state.gameCtl.repaint === 'function') {
      state.gameCtl.repaint();
      return true;
    }
    return false;
  }

  window.AppManual = {
    init,
    renderHome,
    openTest,
    showScreen,
    restore,
    restoreView: function (view, payload) {
      payload = payload || {};
      if (view === 'lifeguide') {
        openTest('lifeguide', { silent: true });
        return;
      }
      if (view === 'chapter' || view === 'game') {
        var id = payload.testId || (payload.test && payload.test.id);
        // 有被暂停的实例（扫雷 / 2048）且正是同一章节时，直接恢复进度
        if (id && state.gameCtl && state.test && state.test.id === id && resumeGame()) {
          return;
        }
        if (id) openTest(id, { silent: true });
        else { renderHome(); showScreen('scr-sm-home'); }
        return;
      }
      if (view === 'result' && payload.test && payload.result) {
        restore({ test: payload.test, res: payload.result, extra: payload.extra });
        return;
      }
      renderHome();
      showScreen('scr-sm-home');
    },
    stopActiveGame,
    resumeGame
  };
})();
