/* 自我说明书 — 互动测评引擎
 * startReaction(root, onFinish) / startColor(root, onFinish)
 * 返回 destroy():清理计时器,退出时必须调用。
 */
(function () {
  'use strict';

  function median(arr) {
    if (!arr.length) return 0;
    var a = arr.slice().sort(function (x, y) { return x - y; });
    var m = Math.floor(a.length / 2);
    return a.length % 2 ? a[m] : Math.round((a[m - 1] + a[m]) / 2);
  }
  function stdev(arr) {
    if (arr.length < 2) return 0;
    var mean = arr.reduce(function (s, v) { return s + v; }, 0) / arr.length;
    var v = arr.reduce(function (s, x) { return s + (x - mean) * (x - mean); }, 0) / (arr.length - 1);
    return Math.sqrt(v);
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var t = a[i]; a[i] = a[j]; a[j] = t;
    }
    return a;
  }

  /* 难度 key → 中文文案，扫雷/舒尔特/数独/华容道榜单共用 */
  function lvLabel(key) {
    return key === 'hard' ? '高级' : key === 'medium' ? '中级' : '初级';
  }

  function makeRoot(root, onRestart) {
    root.innerHTML = '';
    var el = document.createElement('div');
    el.className = 'stage';
    root.appendChild(el);
    /* 没有自带重开按钮的游戏：舞台右上角统一挂一枚重开（回调由各游戏提供）。
       按钮必须挂在舞台内而非容器上——容器右侧是排行榜面板，挂容器上会压到榜头。 */
    if (onRestart) {
      el.style.position = 'relative';
      var wrap = document.createElement('div');
      wrap.className = 'sm-restart-wrap';
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'sm-restart';
      b.innerHTML = '<svg class="sm-restart-ico" viewBox="0 0 24 24" aria-hidden="true"><path fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>重开';
      /* morphicons 试点推广：点击后图标转一圈回位（弹簧） */
      var pathEl = b.querySelector('path');
      var morphEl = null;
      try {
        if (window.MorphDOM && window.LUCIDE_ICONS) {
          morphEl = window.MorphDOM.createMorph(pathEl, window.LUCIDE_ICONS.RotateCcw, {});
        }
      } catch (e) { morphEl = null; }
      /* 此前这里有一段先 onclick 再被下一段覆盖的死代码：
         oldOnclick 在新建按钮上恒为 undefined，调换顺序会直接 TypeError */
      b.onclick = function (e) {
        e.stopPropagation();
        if (morphEl) {
          try {
            morphEl.set(window.LUCIDE_ICONS.RefreshCw);
            setTimeout(function () { morphEl.set(window.LUCIDE_ICONS.RotateCcw); }, 500);
          } catch (err) {}
        }
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        onRestart();
      };
      wrap.appendChild(b);
      el.appendChild(wrap);
      /* 游戏每次 innerHTML 重渲会把按钮冲掉，观察器负责把它补回舞台 */
      new MutationObserver(function () {
        if (wrap.parentNode !== el) el.appendChild(wrap);
      }).observe(el, { childList: true });
    }
    return el;
  }

  /* 各游戏共用的榜单挂载：在 root 里建/复用 .sm-game-layout，
     把游戏舞台 el 挪进去，并挂载 .lb-host 榜单容器。
     之前这份 15 行逻辑在每个游戏闭包里逐字节复制了 7 份。
     lbPanel 是 create() 返回的实例——mount 在实例上，不在静态导出上。 */
  function mountLbHostFor(lbPanel, root, el) {
    if (!lbPanel) return;
    var layout = root.querySelector('.sm-game-layout');
    if (!layout) {
      layout = document.createElement('div');
      layout.className = 'sm-game-layout';
      root.appendChild(layout);
    }
    if (el.parentNode !== layout) layout.appendChild(el);
    var host = layout.querySelector('.lb-host');
    if (!host) {
      host = document.createElement('div');
      host.className = 'lb-host';
      layout.appendChild(host);
    }
    lbPanel.mount(host);
  }

  function hud(extraLeft, extraRight) {
    return '<div class="hud"><div>' + (extraLeft || '') + '</div><div>' + (extraRight || '') + '</div></div>';
  }
  function heartsHTML(left, total) {
    var s = '';
    for (var i = 0; i < total; i++) {
      s += '<span class="' + (i < left ? '' : 'off') + '" style="color:#E05B4E;display:inline-flex">' + window.icon('heart') + '</span>';
    }
    return '<span class="hearts">' + s + '</span>';
  }

  /* ==================================================================
   * 05 反应速度擂台
   * ================================================================== */
  window.startReaction = function (root, onFinish) {
    var el = makeRoot(root, function () { stageIntro(1); });
    var timers = [];
    var destroyed = false;
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    var S1 = [], S2 = { correct: 0, rts: [], traps: 0 }, S3 = { goRts: [], falseHit: 0, trials: [] };

    /* ---------------- 排行榜 ----------------
       反应速度按「简单反应中位数」排名，毫秒越小越好（higher:false）。
       全服榜显示毫秒与准度，本机战绩显示三关的关键数字。
       ------------------------------------------ */
    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'reaction',
      storeKey: 'sm_reaction_runs',
      higher: false,
      idPrefix: 'lbreact',
      formatScore: function (v) { return v + ' ms'; },
      // 三关共用一个面板实例，列定义按当前关切换：
      // 第一关看准度+反应年龄，第二关看正确数与反转识别，第三关看误按数
      describe: function (run) {
        return {
          score: run.ms,
          extra: {
            acc: run.acc, age: run.age, traps: run.traps,
            falseHit: run.falseHit, goCount: run.goCount
          }
        };
      },
      // 榜单只展示头像 / 昵称 / 反应时间，不掺正确率、年龄或日期。
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '<small> ms</small></span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '<small> ms</small></span>'
        ];
      }
    }) : null;

    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    /* ---------------- 三关各自的榜单 ----------------
       三关考的东西不同，混在一张榜里没法比：
       第一关 = 简单反应中位数，第二关 = 选择反应平均时，
       第三关 = Go 反应中位数（都按毫秒排名，越低越好）。
       榜单面板用 setGame 切到当前关对应的榜。 */
    var LB_STAGES = {
      1: { game: 'reaction',  store: 'sm_reaction_runs',  name: '简单反应', metric: '中位数' },
      2: { game: 'reaction2', store: 'sm_reaction2_runs', name: '选择反应', metric: '平均' },
      3: { game: 'reaction3', store: 'sm_reaction3_runs', name: '冲动控制', metric: 'Go 中位数' }
    };
    var lbStage = 1;
    // 最近测过的一关：报告页「再测一次」会重建游戏实例，闭包变量会丢，
    // 所以存 localStorage
    var LAST_STAGE_KEY = 'sm_reaction_last_stage';

    function switchLbStage(n) {
      if (!lbPanel || lbStage === n) return;
      lbStage = n;
      var cfg = LB_STAGES[n];
      lbPanel.setGame(cfg.game, cfg.store);
      syncStageBar();
    }

    function syncStageBar() {
      var bar = el.querySelector('#rzStageBar');
      if (!bar) return;
      bar.querySelectorAll('[data-rzlb]').forEach(function (b) {
        b.classList.toggle('active', Number(b.getAttribute('data-rzlb')) === lbStage);
      });
    }

    function stageBarHTML() {
      return '<div class="rz-lb-stages" id="rzStageBar">' +
        [1, 2, 3].map(function (n) {
          return '<button type="button" class="rz-lb-stage' + (lbStage === n ? ' active' : '') +
            '" data-rzlb="' + n + '">' + n + ' · ' + LB_STAGES[n].name + '</button>';
        }).join('') + '</div>';
    }

    function bindStageBar() {
      var bar = el.querySelector('#rzStageBar');
      if (!bar) return;
      bar.querySelectorAll('[data-rzlb]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          switchLbStage(Number(b.getAttribute('data-rzlb')));
        };
      });
    }

    /* ---------- 关卡说明 ---------- */
    var STAGE_INFO = {
      1: { t: '第一关 · 简单反应', d: '屏幕变红的一瞬间，立即点击！<br>共 5 次，取中位数。抢跑会重新测试。', b: '开始第一关' },
      2: { t: '第二关 · 选择反应', d: '红点出现 → 按左半区；绿点出现 → 按右半区。<br>共 20 次，途中可能有规则交换。', b: '开始第二关' },
      3: { t: '第三关 · 冲动控制', d: '绿点出现 → 越快点越好；<br>红点出现 → 忍住，什么都别碰。共 20 次。', b: '开始第三关' }
    };

    /* 总开始页：先选关卡，再开始——和其他游戏（数独/华容道）的
       「选难度再开始」一致。也可以选「三关连测」跑完整流程。 */
    /* 关卡切换条：和扫雷/数独的难度条同款（.ms-levels + .ms-lv），
       玩家一眼就知道能点。三关各排各的榜，切换时同步换榜。 */
    function stagePickerHTML(n) {
      return '<div class="ms-levels" style="margin-bottom:14px">' +
        [1, 2, 3].map(function (k) {
          return '<button type="button" class="ms-lv' + (n === k ? ' active' : '') +
            '" data-stage="' + k + '">' + LB_STAGES[k].name + '</button>';
        }).join('') +
        '</div>';
    }

    function bindStagePicker(n) {
      el.querySelectorAll('[data-stage]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var k = Number(b.getAttribute('data-stage'));
          if (k === n) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          stageIntro(k);
        };
      });
    }

    function stageIntro(n) {
      clearTimers();
      try { localStorage.setItem(LAST_STAGE_KEY, String(n)); } catch (e) {}
      var info = STAGE_INFO[n];
      el.innerHTML = hud('<b>反应速度擂台</b>', '第 ' + n + '/3 关') +
        stagePickerHTML(n) +
        '<div class="rz-stage"><div class="rz-big" style="font-size:30px">' + info.t + '</div>' +
        '<div class="rz-sub">' + info.d + '</div>' +
        '<button class="btn accent" id="rzgo" style="margin-top:26px;width:auto;padding:12px 38px">' + info.b + '</button></div>';
      bindStagePicker(n);
      switchLbStage(n);
      var btnGo = el.querySelector('#rzgo');
      if (btnGo) {
        btnGo.onclick = function (e) {
          e.stopPropagation();
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          if (n === 1) run1(); else if (n === 2) run2(); else run3();
        };
      }
    }

    /* ---------- 第一关:简单反应 ---------- */
    function run1() {
      var valid = [], fouls = 0, shown = 0, t0 = 0, armed = false, locked = false, waitId = 0;
      var stageStartTime = performance.now();
      function paint(k) {
        stageStartTime = performance.now();
        locked = false;
        el.innerHTML = hud('<b>第一关 · 简单反应（变红即点）</b>', '有效 ' + valid.length + '/5') +
          '<div class="rz-stage rz-pure-wait" id="rz"><div class="rz-count">' + (valid.length ? '上次 ' + valid[valid.length - 1] + ' ms' : '&nbsp;') + '</div>' +
          '<div class="rz-big" id="big"></div>' +
          '<div class="rz-sub" id="sub"></div></div>';
        var st = el.querySelector('#rz');
        if (st) st.addEventListener('pointerdown', onTap);
        arm();
      }
      function arm() {
        armed = false;
        locked = false;
        var big = el.querySelector('#big'), sub = el.querySelector('#sub'), st = el.querySelector('#rz');
        if (big) big.textContent = '';
        if (sub) { sub.className = 'rz-sub'; sub.textContent = ''; }
        if (st) { st.classList.remove('gorun'); st.classList.add('rz-pure-wait'); }
        waitId = later(function () {
          if (destroyed) return;
          armed = true; t0 = performance.now();
          var s = el.querySelector('#rz');
          if (s) { s.classList.remove('rz-pure-wait'); s.classList.add('gorun'); }
          if (window.SFX && window.SFX.go) window.SFX.go();
        }, 1200 + Math.random() * 2200);
      }
      function onTap(e) {
        if (locked) return;
        if (performance.now() - stageStartTime < 280) return; // 280ms 手势防抖保护
        locked = true;
        if (!armed) {   // 抢跑
          clearTimeout(waitId);
          fouls++;
          if (window.SFX && window.SFX.foul) window.SFX.foul();
          var u = el.querySelector('#sub');
          if (u) { u.className = 'rz-sub'; u.innerHTML = '<span class="rz-warn" style="color:#f87171;font-weight:700">抢跑！等背景变红再点</span>'; }
          if (fouls >= 2) {
            valid = []; shown = 0; fouls = 0;
            if (u) u.innerHTML = '<span class="rz-warn" style="color:#f87171;font-weight:700">连续抢跑，本关重测！</span>';
          }
          later(function () { if (valid.length < 5) { shown = valid.length; paint(); } }, 900);
          return;
        }
        armed = false;
        var dt = Math.round(performance.now() - t0);
        valid.push(dt); fouls = 0;
        if (window.SFX && window.SFX.select) window.SFX.select();
        var b = el.querySelector('#big');
        if (b) b.textContent = dt + ' ms';
        later(function () {
          if (valid.length >= 5) { S1 = valid; stageSummary(1); }
          else paint();
        }, 700);
      }
      paint();
    }

    /* ---------- 第二关:选择反应 ---------- */
    function run2() {
      var N = 20;
      var traps = {};
      var tp = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]).slice(0, 4);
      tp.forEach(function (i) { traps[i] = true; });
      var i = 0, t0 = 0, answered = true, toId = 0;
      function paint() {
        answered = true;
        el.innerHTML = hud('<b>第二关 · 选择反应（红左·绿右）</b>', (i + 1) + '/' + N) +
          '<div class="rz-stage" style="padding:20px 14px"><div class="rz-banner" id="ban">⚠️ 规则反转：红右 · 绿左</div>' +
          '<div class="rz-cue-slot" id="cue"><span class="dot" style="width:64px;height:64px;display:inline-block;border-radius:50%;background:#2E2A3B;"></span></div>' +
          '<div class="rz-halves">' +
          '<div class="rz-half" id="L"><span>左半区</span></div>' +
          '<div class="rz-half" id="R"><span>右半区</span></div>' +
          '</div></div>';
        el.querySelector('#L').addEventListener('pointerdown', function () { answer('L'); });
        el.querySelector('#R').addEventListener('pointerdown', function () { answer('R'); });
        later(show, 600 + Math.random() * 900);
      }
      function show() {
        if (destroyed) return;
        var isRed = Math.random() < 0.5;
        var trap = !!traps[i];
        var need = isRed ? (trap ? 'R' : 'L') : (trap ? 'L' : 'R');
        var cue = el.querySelector('#cue');
        if (cue) cue.innerHTML = '<span class="dot ' + (isRed ? 'red' : 'green') + '" style="width:64px;height:64px;display:inline-block;border-radius:50%;background:' + (isRed ? '#E23B2E' : '#2FBF6B') + ';box-shadow:0 0 24px ' + (isRed ? 'rgba(226,59,46,0.55)' : 'rgba(47,191,107,0.5)') + ';"></span>';
        var ban = el.querySelector('#ban');
        if (trap && ban) ban.classList.add('show');
        t0 = performance.now(); answered = false;
        if (window.SFX && window.SFX.tick) window.SFX.tick();
        el._need = need;
        toId = later(function () { if (!answered) judge(null); }, 1500);
      }
      function answer(side) {
        if (answered) return;
        judge(side);
      }
      function judge(side) {
        answered = true; clearTimeout(toId);
        var need = el._need;
        var ok = side === need;
        if (ok) {
          S2.correct++;
          if (traps[i]) S2.traps++;
          var dt = Math.round(performance.now() - t0);
          if (dt >= 0 && dt < 1500) S2.rts.push(dt);
          if (window.SFX && window.SFX.select) window.SFX.select();
        } else {
          if (window.SFX && window.SFX.wrong) window.SFX.wrong();
        }
        var half = el.querySelector(side === 'L' ? '#L' : (side === 'R' ? '#R' : (need === 'L' ? '#L' : '#R')));
        if (half) {
          // 颜色交给 .hit.ok / .hit.ng 的 CSS，别在这里写内联样式——
          // 内联 borderColor 会盖掉样式表，改配色时两边要同时改。
          half.classList.add('hit');
          half.classList.add(ok ? 'ok' : 'ng');
        }
        i++;
        later(function () {
          if (i >= N) stageSummary(2); else paint();
        }, 420);
      }
      paint();
    }

    /* ---------- 第三关:Go / No-Go ---------- */
    function run3() {
      var N = 20;
      var seq = [];
      for (var k = 0; k < N; k++) seq.push(k < 16 ? 'go' : 'nogo');
      shuffle(seq);
      if (seq[0] === 'nogo') { var f = seq.indexOf('go'); seq[f] = 'nogo'; seq[0] = 'go'; }
      var i = 0, t0 = 0, answered = true, toId = 0;
      function paint() {
        answered = true;
        el.innerHTML = hud('<b>第三关 · 冲动控制（绿按·红忍）</b>', (i + 1) + '/' + N) +
          '<div class="rz-stage rz-pure-wait" id="st"><div class="rz-count">Go ' + S3.goRts.length + '</div>' +
          '<div class="rz-big" id="big"></div><div class="rz-sub" id="sub"></div></div>';
        el.querySelector('#st').addEventListener('pointerdown', onTap);
        later(show, 700 + Math.random() * 900);
      }
      function show() {
        if (destroyed) return;
        var g = seq[i] === 'go';
        var st = el.querySelector('#st');
        if (st) {
          st.classList.remove('rz-pure-wait');
          st.classList.add(g ? 'gozone' : 'gorun');
        }
        t0 = performance.now(); answered = false;
        if (window.SFX && window.SFX.tick) window.SFX.tick();
        toId = later(function () {
          if (answered) return;
          answered = true;
          if (!g) { S3.trials.push('ok'); if (window.SFX && window.SFX.stage) window.SFX.stage(); }   // 成功忍住
          later(next, 350);
        }, g ? 1200 : 1100);
      }
      function onTap() {
        if (answered) return;
        answered = true; clearTimeout(toId);
        var g = seq[i] === 'go';
        if (g) {
          var dt = Math.round(performance.now() - t0);
          S3.goRts.push(dt); if (window.SFX && window.SFX.select) window.SFX.select();
          var b = el.querySelector('#big'); if (b) b.textContent = dt + ' ms';
        } else {
          S3.falseHit++; if (window.SFX && window.SFX.foul) window.SFX.foul();
          var u2 = el.querySelector('#sub'); if (u2) u2.innerHTML = '<span class="rz-warn" style="color:#fff;font-weight:800;font-size:20px;">没忍住！红屏不能点</span>';
        }
        later(next, 550);
      }
      function next() { i++; if (i >= N) stageSummary(3); else paint(); }
      paint();
    }

    /* ---------- 关卡小结 ---------- */
    function stageSummary(n) {
      clearTimers();
      if (window.SFX && window.SFX.stage) window.SFX.stage();
      var body = '';
      if (n === 1) {
        var m = median(S1);
        if (lbPanel) {
          lbPanel.setGame(LB_STAGES[1].game, LB_STAGES[1].store);
          lbPanel.submit({ ms: m, acc: S2.correct, age: reactionAge(m) });
          lbStage = 1;
        }
        body = '<div class="rz-big" style="font-size:52px">' + m + ' <span style="font-size:22px">ms</span></div>' +
          '<div class="rz-sub">简单反应中位数 · 5 次取中位数，避开单次失误</div>';
      } else if (n === 2) {
        var mean = S2.rts.length ? Math.round(S2.rts.reduce(function (s, v) { return s + v; }, 0) / S2.rts.length) : 1500;
        if (lbPanel && S2.rts.length) {
          lbPanel.setGame(LB_STAGES[2].game, LB_STAGES[2].store);
          lbPanel.submit({ ms: mean, acc: S2.correct, traps: S2.traps });
          lbStage = 2;
        }
        body = '<div class="rz-big" style="font-size:52px">' + S2.correct + '<span style="font-size:22px">/20</span></div>' +
          '<div class="rz-sub">正确 ' + S2.correct + '/20 · 平均反应 ' + mean + ' ms' + (S2.traps ? '<br>规则交换识别 ' + S2.traps + '/4' : '') + '</div>';
      } else {
        var gm = median(S3.goRts);
        if (lbPanel && S3.goRts.length) {
          lbPanel.setGame(LB_STAGES[3].game, LB_STAGES[3].store);
          lbPanel.submit({ ms: gm, falseHit: S3.falseHit, goCount: S3.goRts.length });
          lbStage = 3;
        }
        body = '<div class="rz-big" style="font-size:52px">' + gm + ' <span style="font-size:22px">ms</span></div>' +
          '<div class="rz-sub">Go 反应中位数 · 红点误按 ' + S3.falseHit + '/4（冲动指数）</div>';
      }
      // 切到本关对应的榜单（三关各排各的）
      switchLbStage(n);
      el.innerHTML = hud('<b>反应速度擂台</b>', '第 ' + n + '/3 关') +
        stagePickerHTML(n) +
        '<div class="rz-stage">' + body +
        '<div class="rz-sub" style="margin-top:16px">第 ' + n + ' 关成绩已记入「' + LB_STAGES[n].name +
        '」榜（' + LB_STAGES[n].metric + ' ms）</div>' +
        '<div style="display:flex;gap:10px;justify-content:center;flex-wrap:wrap;margin-top:20px">' +
        '<button class="btn accent" id="rzview" style="width:auto;padding:12px 30px">查看判词</button>' +
        '<button class="btn" id="rzagain" style="width:auto;padding:12px 26px">↻ 再测一次</button>' +
        '<button class="btn" id="rzback2" style="width:auto;padding:12px 26px">← 返回</button></div></div>' +
        stageBarHTML();
      bindStagePicker(n);
      bindStageBar();
      var btnView = el.querySelector('#rzview');
      if (btnView) btnView.addEventListener('click', function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        finish(n);
      });
      var btnAgain = el.querySelector('#rzagain');
      if (btnAgain) btnAgain.addEventListener('click', function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        // 只重测这一关
        if (n === 1) S1 = [];
        else if (n === 2) S2 = { correct: 0, rts: [], traps: 0 };
        else S3 = { goRts: [], falseHit: 0, trials: [] };
        stageIntro(n);
      });
      var btnBack2 = el.querySelector('#rzback2');
      if (btnBack2) btnBack2.addEventListener('click', function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        stageIntro(n);       // 回本关开始页（带切换条，可换关）
      });
    }

    /* 反应中位数 → 反应年龄（第一关提交时也要用） */
    function reactionAge(ms) {
      return ms < 220 ? 16 : ms < 280 ? 22 : ms < 350 ? 30 : ms < 450 ? 45 : 60;
    }

    /* ---------- 总判定 ---------- */
    /* 按关出判词：三关完全独立，每关只报自己那一项 */
    function finish(n) {
      var certs = window.SM_DATA.reaction.certs;
      var res;

      if (n === 1) {
        var m1 = median(S1);
        var age = reactionAge(m1);
        var speed = m1 < 220 ? 100 : m1 < 280 ? 88 : m1 < 350 ? 72 : m1 < 450 ? 52 : 35;
        var ricon, rname;
        if (m1 < 260) { rname = '闪电侠'; ricon = 'bolt'; }
        else if (m1 < 330) { rname = '电竞手'; ricon = 'gamepad'; }
        else if (m1 < 430) { rname = '正常人'; ricon = 'smile'; }
        else { rname = '树懒本懒'; ricon = 'sleepy'; }
        res = {
          icon: ricon, name: rname,
          tag: '简单反应 ' + m1 + ' ms · 反应年龄 ' + age + ' 岁',
          text: '5 次简单反应取中位数 ' + m1 + ' ms' +
            (age === 45 ? '，带着一点疲劳的痕迹——该睡个好觉了。' : age === 60 ? '，急事先预约，从容不是罪。' : '，手速在线。'),
          big: { label: '简单反应中位数', value: m1 + ' <small>ms</small>' },
          bars: [{ label: '速度', pct: speed, hi: true }],
          blocks: [{ h: '怎么看', text: '中位数比平均值更抗单次走神——5 次里偶尔慢一下不会把成绩拽下去。' }],
          detail: { type: rname, ms: m1, age: age }
        };
      } else if (n === 2) {
        var mean = S2.rts.length ? Math.round(S2.rts.reduce(function (s, v) { return s + v; }, 0) / S2.rts.length) : 1500;
        var cv = S2.rts.length > 1 ? stdev(S2.rts) / mean : 0.5;
        var stab = cv < 0.15 ? 95 : cv < 0.25 ? 80 : cv < 0.35 ? 62 : 45;
        var accPct = Math.round(S2.correct / 20 * 100);
        var r2 = S2.correct >= 18 ? { name: '分心免疫', icon: 'crown' }
          : S2.correct >= 14 ? { name: '反应稳健', icon: 'gem' }
            : S2.correct >= 10 ? { name: '正常发挥', icon: 'smile' }
              : { name: '有点上头', icon: 'sleepy' };
        res = {
          icon: r2.icon, name: r2.name,
          tag: '正确 ' + S2.correct + '/20 · 平均 ' + mean + ' ms',
          text: '选择反应正确 ' + S2.correct + '/20（' + accPct + '%），平均 ' + mean + ' ms，成绩波动' +
            (stab >= 80 ? '很小，发挥稳如老狗。' : stab >= 62 ? '中等，状态有起伏。' : '偏大，可能手滑也可能心滑。'),
          big: { label: '平均反应时', value: mean + ' <small>ms</small>' },
          bars: [
            { label: '准度', pct: accPct, hi: true },
            { label: '稳定性', pct: stab }
          ],
          blocks: [{ h: '规则反转', text: '本局识破 ' + S2.traps + '/4 次规则交换——这一项最考验注意力的切换速度。' }],
          detail: { type: r2.name, ms: mean, acc: S2.correct, traps: S2.traps }
        };
      } else {
        var gm = median(S3.goRts);
        var impulse = S3.falseHit / 4;
        var r3 = S3.falseHit === 0 ? { name: '铁壁自控', icon: 'crown' }
          : S3.falseHit === 1 ? { name: '刹车良好', icon: 'gem' }
            : S3.falseHit === 2 ? { name: '偶尔手快', icon: 'bolt' }
              : { name: '手比脑快', icon: 'sleepy' };
        var quip = impulse < 0.10 ? '泰山崩于前而面不改色，期货市场失去了一位天才。'
          : impulse > 0.40 ? '红色对你来说只是个建议。'
            : '刹车片状态良好，日常够用。';
        res = {
          icon: r3.icon, name: r3.name,
          tag: 'Go 反应 ' + gm + ' ms · 误按 ' + S3.falseHit + '/4',
          text: '绿点反应中位数 ' + gm + ' ms，红点误按 ' + S3.falseHit + '/4（冲动指数 ' +
            Math.round(impulse * 100) + '%）。' + quip,
          big: { label: 'Go 反应中位数', value: gm + ' <small>ms</small>' },
          bars: [
            { label: '自控力', pct: Math.max(0, 100 - S3.falseHit * 25), hi: true },
            { label: '出手速度', pct: gm < 300 ? 95 : gm < 400 ? 75 : gm < 550 ? 55 : 35 }
          ],
          blocks: [{ h: '冲动指数', text: '红点误按 ' + S3.falseHit + '/4（' + Math.round(impulse * 100) + '%）。' + quip }],
          detail: { type: r3.name, ms: gm, falseHit: S3.falseHit }
        };
      }

      // 各关判词共用免责声明与认证文案
      res.quip = window.SM_DATA.reaction.disclaimer;
      res.cert = res.name + ' · 认证';
      onFinish(res);
    }

    var startStage = 1;
    try {
      var remembered = Number(localStorage.getItem(LAST_STAGE_KEY) || 0);
      if (remembered >= 1 && remembered <= 3) startStage = remembered;
    } catch (e) {}
    stageIntro(startStage);
    mountLbHost();
    return {
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 06 色彩敏锐度挑战
   * ================================================================== */
  window.startColor = function (root, onFinish) {
    var el = makeRoot(root, function () { intro(); });
    var timers = [];
    var destroyed = false;
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    var LIVES = 3, LIMIT = 8000;
    var lives, lv, rafId, tStart, dying = false;

    /* ---------------- 排行榜 ----------------
       色彩按「通过关卡数」排名，越多越好（higher:true）。
       ------------------------------------------ */
    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'color',
      storeKey: 'sm_color_runs',
      higher: true,
      idPrefix: 'lbcolor',
      formatScore: function (v) { return v + ' 关'; },
      describe: function (run) {
        return { score: run.level, extra: {} };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '<small> 关</small></span>',
          '<span class="lb-tile">' + (r.gridN || 2) + '×' + (r.gridN || 2) + '</span>',
          '<span class="lb-meta">' + (r.left || 0) + ' 命</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '<small> 关</small></span>'
        ];
      }
    }) : null;

    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    function gridN(l) { return Math.min(7, 2 + Math.floor((l - 1) / 4)); }
    /* 色差曲线:奇数关动色相,偶数关动明度 */
    function deltaFor(l) {
      function seg(v, a, b, c, d) { // v: 1..: (a@1 → b@4 → c@8 → d@12 → e@16 → f@20)
        if (v <= 4) return lerp(v, 1, 4, a, b);
        if (v <= 8) return lerp(v, 4, 8, b, c);
        if (v <= 12) return lerp(v, 8, 12, c, d);
        if (v <= 16) return lerp(v, 12, 16, d, d - 2);
        return Math.max(2.2, (d - 2) - (v - 16) * 0.16);
      }
      function lerp(x, x0, x1, y0, y1) { return y0 + (y1 - y0) * (x - x0) / (x1 - x0); }
      return seg(l, 30, 22, 15, 10);
    }

    function paintHUD() {
      el.innerHTML = hud('<b>第 <span id="lvn">' + lv + '</span> 关</b>', heartsHTML(lives, LIVES)) +
        '<div class="timerbar"><i id="tt"></i></div>' +
        '<div id="gridbox" style="display:flex;justify-content:center"></div>' +
        '<div class="rz-sub" style="margin-top:12px">找出颜色不同的那一块</div>';
    }

    function clearFloatMsgs() {
      document.querySelectorAll('.floatmsg').forEach(function (n) {
        if (n && n.parentNode) n.remove();
      });
    }

    /* 开始页：进来先停在说明页，玩家可以先看右边的榜单再开始。
       此前一进章节就立刻起计时，想看榜反而会白白掉命。 */
    function intro() {
      clearTimers();
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      el.innerHTML = hud('<b>色彩敏锐度挑战</b>', '共 3 条命') +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">找出颜色不同的那一块</div>' +
        '<div class="rz-sub">每关限时 8 秒，答错或超时扣 1 条命。<br>' +
        '关卡越深，格子越多、色差越小。3 条命用完即结算。</div>' +
        '<button class="btn accent" id="clgo" style="margin-top:26px;width:auto;padding:12px 38px">开始挑战</button>' +
        '</div>';
      var btn = el.querySelector('#clgo');
      if (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          lives = LIVES; lv = 1;
          startLevel();
        };
      }
    }

    function startLevel() {
      if (destroyed || dying) return;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      paintHUD();
      var n = gridN(lv);
      var d = deltaFor(lv);
      var odd = lv % 2 === 1;
      var hue = [8, 25, 45, 95, 150, 190, 230, 275, 320][Math.floor(Math.random() * 9)];
      var sat = 62;
      var li = 52;
      var base, odd1;
      if (odd) {
        var dir = Math.random() < 0.5 ? 1 : -1;
        base = 'hsl(' + hue + ',' + sat + '%,' + li + '%)';
        odd1 = 'hsl(' + ((hue + dir * d + 360) % 360) + ',' + sat + '%,' + li + '%)';
      } else {
        var dirL = Math.random() < 0.5 ? 1 : -1;
        base = 'hsl(' + hue + ',' + sat + '%,' + li + '%)';
        odd1 = 'hsl(' + hue + ',' + sat + '%,' + (li + dirL * d) + '%)';
      }
      var oddIdx = Math.floor(Math.random() * n * n);

      var box = el.querySelector('#gridbox');
      var grid = document.createElement('div');
      grid.className = 'cl-grid';
      grid.style.gridTemplateColumns = 'repeat(' + n + ', minmax(0, 1fr))';
      for (var i = 0; i < n * n; i++) {
        (function (idx) {
          var cellEl = document.createElement('div');
          cellEl.className = 'cl-cell';
          cellEl.style.background = idx === oddIdx ? odd1 : base;
          cellEl.addEventListener('pointerdown', function () { pick(idx === oddIdx, cellEl); });
          grid.appendChild(cellEl);
        })(i);
      }
      box.appendChild(grid);

      // 倒计时
      tStart = performance.now();
      var bar = el.querySelector('#tt');
      var lastTick = 9;
      (function tickFrame() {
        if (destroyed || dying) return;
        var left = LIMIT - (performance.now() - tStart);
        if (bar) bar.style.width = Math.max(0, left / LIMIT * 100) + '%';
        var sec = Math.ceil(left / 1000);
        if (sec <= 3 && sec < lastTick) { if (window.SFX && window.SFX.tick) window.SFX.tick(); }
        lastTick = sec;
        if (left <= 0) { timeout(); return; }
        rafId = requestAnimationFrame(tickFrame);
      })();
    }

    function pick(ok, cellEl) {
      if (dying || destroyed) return;
      if (ok) {
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        if (window.SFX && window.SFX.stage) window.SFX.stage();
        lv++;
        startLevel();
      } else {
        if (window.SFX && window.SFX.wrong) window.SFX.wrong();
        lives--;
        if (cellEl) { cellEl.classList.add('cl-wrong'); cellEl.style.outline = '3px solid #E23B2E'; }
        var h = el.querySelector('.hearts');
        if (h) h.outerHTML = heartsHTML(lives, LIVES);
        floatMsg(lives > 0 ? '答错！还剩 ' + lives + ' 条命' : '命尽……');
        if (lives <= 0) {
          dying = true;
          if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
          later(end, 700);
        }
      }
    }
    function timeout() {
      if (dying || destroyed) return;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      if (window.SFX && window.SFX.wrong) window.SFX.wrong();
      lives--;
      var h = el.querySelector('.hearts');
      if (h) h.outerHTML = heartsHTML(lives, LIVES);
      floatMsg(lives > 0 ? '超时！还剩 ' + lives + ' 条命' : '超时！命尽……');
      if (lives <= 0) {
        dying = true;
        later(end, 700);
      } else {
        startLevel();
      }
    }

    function end() {
      clearTimers();
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      clearFloatMsgs();
      var passed = lv - 1; // 完成关数
      var certs = window.SM_DATA.color.certs;
      var cert = certs[0];
      for (var i = 0; i < certs.length; i++) { if (passed >= certs[i].min) { cert = certs[i]; break; } }
      var best = 0;
      try { best = parseInt(localStorage.getItem('sm_color_best') || '0', 10) || 0; } catch (e) {}
      if (passed > best) { best = passed; try { localStorage.setItem('sm_color_best', String(best)); } catch (e) {} }

      // 一关没过就别上榜：挂机超时也会走到这里，0 关记录对谁都没意义
      if (lbPanel && passed > 0) {
        lbPanel.submit({ level: passed, gridN: gridN(Math.max(1, passed)), left: Math.max(0, lives) });
      }

      onFinish({
        icon: cert.icon, name: cert.name, tag: '通过 ' + passed + ' 关' + (passed >= best && passed > 0 ? ' · 新纪录' : ''),
        text: cert.text,
        big: { label: '通过关卡', value: passed + ' <small>关</small>' },
        bars: [],
        blocks: best > 0 ? [{ h: '本机纪录', text: '历史最佳:通过 ' + best + ' 关。' }] : [],
        quip: window.SM_DATA.color.disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, lv: passed, best: best }
      });
    }

    function floatMsg(txt) {
      clearFloatMsgs();
      var m = document.createElement('div');
      m.className = 'floatmsg';
      m.textContent = txt;
      el.appendChild(m);
      setTimeout(function () {
        if (m && m.parentNode) m.remove();
      }, 650);
    }

    lives = LIVES; lv = 1;
    intro();          // 先停在开始页，点「开始挑战」才起计时
    mountLbHost();
    return {
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        clearFloatMsgs();
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 07 数字合体 2048 (2048 PUZZLE)
   * ================================================================== */
  window.startGame2048 = function (root, onFinish) {
    var el = makeRoot(root);
    var destroyed = false;
    var timers = [];
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    var board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
    var score = 0;
    var moves = 0;
    var merges = 0;
    var maxTile = 2;
    var undosLeft = 3;
    var history = [];
    var hasWon = false;
    var isOver = false;

    var bestScore = 0;
    try { bestScore = parseInt(localStorage.getItem('sm_2048_best') || '0', 10) || 0; } catch (e) {}

    /* ---------------- 战绩记录 ----------------
       本机战绩存 localStorage（断网可用、最多 12 条），
       同时把「个人最高分」提交到全服排行榜（api/leaderboard.js）。
       后端不可用时榜单自动退回本机数据，不会报错打断游戏。
       榜单的 DOM 与拉取逻辑在 lb-panel.js 里，三个游戏共用。
       ------------------------------------------------ */
    var runRecorded = false;

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: '2048',
      storeKey: 'sm_2048_runs',
      higher: true,
      idPrefix: 'lb2048',
      formatScore: function (v) { return v + ' 分'; },
      describe: function (run) {
        return { score: run.score, extra: { maxTile: run.maxTile, moves: run.moves, merges: run.merges } };
      },
      // 本机战绩：分数 / 最高方块 / 步数 / 日期
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + (r.maxTile || 0) + '</span>',
          '<span class="lb-meta">' + (r.moves || 0) + ' 步</span>'
        ];
      },
      // 全服榜：头像 / 昵称 / 分数 / 最高方块
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.maxTile) || 0) + '</span>'
        ];
      }
    }) : null;

    // 每局只记一次：游戏结束和主动结算都调用，靠 runRecorded 去重
    // 返回本局在本机战绩中的名次（1 起）；被去重时返回 0
    function recordRun() {
      if (runRecorded) return 0;
      runRecorded = true;
      if (!lbPanel) return 0;
      return lbPanel.submit({ score: score, maxTile: maxTile, moves: moves, merges: merges });
    }

    // 方块只显示数字本身。此前给每级方块配了「起步/转正/经理/总监」这类
    // 职场头衔，既和 2048 无关，也让游戏显得廉价——已全部移除。

    function spawnTile() {
      var empty = [];
      for (var i = 0; i < 16; i++) {
        if (board[i] === 0) empty.push(i);
      }
      if (!empty.length) return false;
      var spot = empty[Math.floor(Math.random() * empty.length)];
      var val = Math.random() < 0.9 ? 2 : 4;
      board[spot] = val;
      return true;
    }

    function checkMax() {
      for (var i = 0; i < 16; i++) {
        if (board[i] > maxTile) maxTile = board[i];
      }
    }

    function canMove() {
      for (var i = 0; i < 16; i++) {
        if (board[i] === 0) return true;
      }
      // 检查横向与纵向相邻相等
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
          var idx = r * 4 + c;
          if (c < 3 && board[idx] === board[idx + 1]) return true;
          if (r < 3 && board[idx] === board[idx + 4]) return true;
        }
      }
      return false;
    }

    /* 滑动核心算法: 单行 4 元素向左靠拢并合并 */
    function slideRow(row) {
      var filtered = row.filter(function (x) { return x !== 0; });
      var newRow = [0, 0, 0, 0];
      var gained = 0;
      var merged = 0;
      var outIdx = 0;
      for (var i = 0; i < filtered.length; i++) {
        if (i < filtered.length - 1 && filtered[i] === filtered[i + 1]) {
          var val = filtered[i] * 2;
          newRow[outIdx++] = val;
          gained += val;
          merged++;
          i++; // 跳过下一个已合并的元素
        } else {
          newRow[outIdx++] = filtered[i];
        }
      }
      return { row: newRow, gained: gained, merged: merged };
    }

    function move(dir) {
      if (destroyed || isOver) return false;
      var oldBoard = board.slice();
      var totalGained = 0;
      var totalMerged = 0;

      if (dir === 'left') {
        for (var r = 0; r < 4; r++) {
          var row = [board[r * 4], board[r * 4 + 1], board[r * 4 + 2], board[r * 4 + 3]];
          var res = slideRow(row);
          board[r * 4] = res.row[0];
          board[r * 4 + 1] = res.row[1];
          board[r * 4 + 2] = res.row[2];
          board[r * 4 + 3] = res.row[3];
          totalGained += res.gained;
          totalMerged += res.merged;
        }
      } else if (dir === 'right') {
        for (var r = 0; r < 4; r++) {
          var row = [board[r * 4 + 3], board[r * 4 + 2], board[r * 4 + 1], board[r * 4]];
          var res = slideRow(row);
          board[r * 4 + 3] = res.row[0];
          board[r * 4 + 2] = res.row[1];
          board[r * 4 + 1] = res.row[2];
          board[r * 4] = res.row[3];
          totalGained += res.gained;
          totalMerged += res.merged;
        }
      } else if (dir === 'up') {
        for (var c = 0; c < 4; c++) {
          var col = [board[c], board[c + 4], board[c + 8], board[c + 12]];
          var res = slideRow(col);
          board[c] = res.row[0];
          board[c + 4] = res.row[1];
          board[c + 8] = res.row[2];
          board[c + 12] = res.row[3];
          totalGained += res.gained;
          totalMerged += res.merged;
        }
      } else if (dir === 'down') {
        for (var c = 0; c < 4; c++) {
          var col = [board[c + 12], board[c + 8], board[c + 4], board[c]];
          var res = slideRow(col);
          board[c + 12] = res.row[0];
          board[c + 8] = res.row[1];
          board[c + 4] = res.row[2];
          board[c] = res.row[3];
          totalGained += res.gained;
          totalMerged += res.merged;
        }
      }

      var changed = false;
      for (var i = 0; i < 16; i++) {
        if (board[i] !== oldBoard[i]) { changed = true; break; }
      }

      if (changed) {
        history.push({ board: oldBoard, score: score, maxTile: maxTile, moves: moves });
        if (history.length > 3) history.shift();

        score += totalGained;
        moves++;
        merges += totalMerged;
        if (score > bestScore) {
          bestScore = score;
          try { localStorage.setItem('sm_2048_best', String(bestScore)); } catch (e) {}
        }
        checkMax();
        spawnTile();

        if (window.SFX && window.SFX.tap) window.SFX.tap();

        if (maxTile >= 2048 && !hasWon) {
          hasWon = true;
          if (window.SFX && window.SFX.stage) window.SFX.stage();
          showFloatTip('🎉 达成 2048 登顶成就！');
        }

        if (!canMove()) {
          isOver = true;
          recordRun();
          if (window.SFX && window.SFX.wrong) window.SFX.wrong();
        }

        renderUI();
        return true;
      }
      return false;
    }

    function undo() {
      if (destroyed || !history.length || undosLeft <= 0) return;
      var last = history.pop();
      board = last.board;
      score = last.score;
      maxTile = last.maxTile;
      moves = last.moves;
      undosLeft--;
      isOver = false;
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      renderUI();
    }

    function resetGame() {
      board = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
      score = 0;
      moves = 0;
      merges = 0;
      maxTile = 2;
      history = [];
      undosLeft = 3;
      hasWon = false;
      isOver = false;
      runRecorded = false;   // 新一局，允许再次记录
      spawnTile();
      spawnTile();
      checkMax();
      renderUI();
    }

    function showFloatTip(txt) {
      var m = document.createElement('div');
      m.className = 'g2048-float-tip';
      m.textContent = txt;
      el.appendChild(m);
      setTimeout(function () { if (m && m.parentNode) m.remove(); }, 1200);
    }

    function finish() {
      clearTimers();
      var myRank = recordRun();   // 主动结算也算本局结束
      var certs = window.SM_DATA['game-2048'].certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        if (maxTile >= certs[i].min) { cert = certs[i]; break; }
      }

      var planningPct = maxTile >= 2048 ? 100 : maxTile >= 1024 ? 92 : maxTile >= 512 ? 82 : maxTile >= 256 ? 70 : maxTile >= 128 ? 58 : 42;
      var decisionPct = Math.min(98, Math.max(45, Math.round((score / Math.max(1, moves * 12)) * 80)));
      var resiliencePct = isOver ? 72 : 90;

      onFinish({
        icon: cert.icon,
        name: cert.name,
        tag: '最高合成 ' + maxTile + ' · 终局得分 ' + score + ' 分',
        text: cert.text + ' 本局历经 ' + moves + ' 步推演与 ' + merges + ' 次合体，无论顺境还是逆风，你在方寸之间的运筹帷幄都令人叹服。',
        big: { label: '最高合成数字', value: maxTile + ' <small>分 ' + score + '</small>' },
        bars: [
          { label: '空间掌控力', pct: planningPct, hi: true },
          { label: '决策果断度', pct: decisionPct },
          { label: '逆境容错率', pct: resiliencePct }
        ],
        blocks: [
          { h: '本局段位', cert: '【' + cert.name + '】' },
          { h: '对局复盘', text: '本局总步数 ' + moves + ' 步，合成总分 ' + score + ' 分，历史最佳分 ' + bestScore + ' 分。' + (myRank ? '本局在离线战绩榜上排名第 ' + myRank + '。' : '') },
          { h: '战略建议', text: '2048 的底层法则永远是“守住一个角落，大小有序排列”。现实亦如此，守好自己的基本盘，步步为营方能化险为夷。' }
        ],
        quip: window.SM_DATA['game-2048'].disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, maxTile: maxTile, score: score, moves: moves }
      });
    }

    function renderUI() {
      var boardCellsHTML = '';
      for (var i = 0; i < 16; i++) {
        var v = board[i];
        if (v === 0) {
          boardCellsHTML += '<div class="g2048-cell empty"></div>';
        } else {
          var cls = 'g2048-tile t' + (v <= 2048 ? v : 'super');
          boardCellsHTML += '<div class="g2048-cell"><div class="' + cls + '"><span class="g2048-num">' + v + '</span></div></div>';
        }
      }

      var overOverlayHTML = isOver ? (
        '<div class="g2048-overlay">' +
        '<div class="g2048-ov-title">无路可走 · 棋逢对手</div>' +
        '<div class="g2048-ov-sub">最高合成 <b>' + maxTile + '</b> · 本局得分 ' + score + '</div>' +
        '<div class="g2048-ov-btns">' +
        '<button class="g2048-btn accent" id="btn2048Cert">📜 查看说明书认证判词</button>' +
        '<button class="g2048-btn" id="btn2048Restart">🔄 再战一局</button>' +
        '</div></div>'
      ) : '';

      el.innerHTML =
        '<div class="g2048-container">' +
        '<div class="g2048-hud">' +
        '<div class="g2048-score-card">' +
        '<div class="g2048-sc-lbl">得分 SCORE</div>' +
        '<div class="g2048-sc-val">' + score + '</div>' +
        '</div>' +
        '<div class="g2048-score-card">' +
        '<div class="g2048-sc-lbl">最高分 BEST</div>' +
        '<div class="g2048-sc-val">' + bestScore + '</div>' +
        '</div>' +
        '<div class="g2048-score-card highlight">' +
        '<div class="g2048-sc-lbl">最高 MAX</div>' +
        '<div class="g2048-sc-val">' + maxTile + '</div>' +
        '</div>' +
        '</div>' +

        '<div class="g2048-tools">' +
        '<button class="g2048-tool-btn" id="btn2048Undo" ' + (undosLeft <= 0 || !history.length ? 'disabled' : '') + '>↩ 撤销 (' + undosLeft + ')</button>' +
        '<button class="g2048-tool-btn" id="btn2048Reset">🔄 重来</button>' +
        '<button class="g2048-tool-btn finish" id="btn2048Finish">📜 结算判词</button>' +
        '</div>' +

        '<div class="g2048-board-wrap" id="g2048Board">' +
        '<div class="g2048-grid">' + boardCellsHTML + '</div>' +
        overOverlayHTML +
        '</div>' +

        '<div class="g2048-controls">' +
        '<div class="g2048-dpad">' +
        '<button class="g2048-pad-btn up" data-dir="up" aria-label="向上">▲</button>' +
        '<div class="g2048-pad-mid">' +
        '<button class="g2048-pad-btn left" data-dir="left" aria-label="向左">◀</button>' +
        '<button class="g2048-pad-btn down" data-dir="down" aria-label="向下">▼</button>' +
        '<button class="g2048-pad-btn right" data-dir="right" aria-label="向右">▶</button>' +
        '</div>' +
        '</div>' +
        '<div class="g2048-hint">支持屏幕滑动、方向键 ↑ ↓ ← → 或轻点上方方向键</div>' +
        '</div>' +
        '</div>';

      // 排行榜移出 .stage（深色游戏壳），作为兄弟节点放进
      // .sm-game-layout 这个双栏 wrapper：桌面并排，窄屏堆叠。
      // 两套视觉体系——深色棋盘区 / 浅色战绩区。
      var layout = root.querySelector('.sm-game-layout');
      if (!layout) {
        layout = document.createElement('div');
        layout.className = 'sm-game-layout';
        root.appendChild(layout);
      }
      if (el.parentNode !== layout) layout.appendChild(el);
      var lbHost = layout.querySelector('.lb-host');
      if (!lbHost) {
        lbHost = document.createElement('div');
        lbHost.className = 'lb-host';
        layout.appendChild(lbHost);
      }
      if (lbPanel) lbPanel.mount(lbHost);

      // 绑定按钮事件
      var undoBtn = el.querySelector('#btn2048Undo');
      if (undoBtn) undoBtn.onclick = undo;
      var resetBtn = el.querySelector('#btn2048Reset');
      if (resetBtn) resetBtn.onclick = resetGame;
      var finishBtn = el.querySelector('#btn2048Finish');
      if (finishBtn) finishBtn.onclick = finish;

      var certBtn = el.querySelector('#btn2048Cert');
      if (certBtn) certBtn.onclick = finish;
      var restartBtn = el.querySelector('#btn2048Restart');
      if (restartBtn) restartBtn.onclick = resetGame;

      // D-Pad 按键
      el.querySelectorAll('.g2048-pad-btn').forEach(function (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          move(btn.dataset.dir);
        };
      });

      bindTouch();
    }

    // 触摸滑动
    var touchStartX = 0, touchStartY = 0;
    function bindTouch() {
      var boardEl = el.querySelector('#g2048Board');
      if (!boardEl) return;

      boardEl.addEventListener('touchstart', function (e) {
        if (!e.touches.length) return;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      }, { passive: true });

      boardEl.addEventListener('touchmove', function (e) {
        // 防止滑动棋盘时意外触发整个页面上下晃动
        if (e.cancelable) e.preventDefault();
      }, { passive: false });

      boardEl.addEventListener('touchend', function (e) {
        if (!e.changedTouches.length) return;
        var dx = e.changedTouches[0].clientX - touchStartX;
        var dy = e.changedTouches[0].clientY - touchStartY;
        var absX = Math.abs(dx);
        var absY = Math.abs(dy);

        if (Math.max(absX, absY) > 28) {
          if (absX > absY) {
            move(dx > 0 ? 'right' : 'left');
          } else {
            move(dy > 0 ? 'down' : 'up');
          }
        }
      }, { passive: true });
    }

    // 键盘监听
    function onKeyDown(e) {
      if (destroyed || isOver) return;
      var key = e.key;
      if (key === 'ArrowUp' || key === 'w' || key === 'W') {
        e.preventDefault(); move('up');
      } else if (key === 'ArrowDown' || key === 's' || key === 'S') {
        e.preventDefault(); move('down');
      } else if (key === 'ArrowLeft' || key === 'a' || key === 'A') {
        e.preventDefault(); move('left');
      } else if (key === 'ArrowRight' || key === 'd' || key === 'D') {
        e.preventDefault(); move('right');
      }
    }
    window.addEventListener('keydown', onKeyDown);

    // 启动初始棋盘
    spawnTile();
    spawnTile();
    checkMax();
    renderUI();

    return {
      // 2048 没有计时器，但方向键监听是全局的——
      // 切走必须摘掉，否则在目录页按方向键还会移动隐藏的棋盘
      pause: function () {
        window.removeEventListener('keydown', onKeyDown);
      },
      // 切走再回来只重绘，棋盘/得分/撤销次数全部保留
      repaint: function () {
        if (destroyed) return;
        window.addEventListener('keydown', onKeyDown);
        renderUI();
      },
      destroy: function () {
        destroyed = true;
        clearTimers();
        window.removeEventListener('keydown', onKeyDown);
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 08 雷区排险 (MINESWEEPER)
   * ================================================================== */
  window.startMinesweeper = function (root, onFinish) {
    var el = makeRoot(root);
    var timers = [];
    var destroyed = false;
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    /* 三档难度。三档各有一个独立榜单，排名就是通关用时（秒），
       所以这里不再需要跨难度折算的权重。 */
    var LEVELS = {
      easy:   { key: 'easy',   name: '初级', cols: 9,  rows: 9,  mines: 10 },
      medium: { key: 'medium', name: '中级', cols: 16, rows: 16, mines: 40 },
      hard:   { key: 'hard',   name: '高级', cols: 30, rows: 16, mines: 99 }
    };
    var level = LEVELS.easy;

    var cells = [];       // { mine, open, flag, near }
    var started = false;  // 第一次点击后才布雷，保证首击必空
    var over = false;
    var won = false;
    var flags = 0;
    var openedCount = 0;
    var t0 = 0;
    var elapsed = 0;
    var timerId = 0;
    var longPressId = 0;
    var sized = false;      // 首帧宽度确定后是否已重排过
    var onResize = null;

    /* ---------------- 排行榜 ----------------
       三档难度各排各的：跨难度比时间没有意义，初级 30 秒和
       高级 300 秒不是同一种成绩。榜单跟着当前难度切换（setGame）。
       本机战绩按难度分文件存，切档时不会看到别的档的成绩。 */
    function storeKeyFor(lv) { return 'sm_minesweeper_runs_' + lv; }

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'mine_easy',
      storeKey: storeKeyFor('easy'),
      higher: false,
      idPrefix: 'lbmine',
      formatScore: function (v) { return v + ' 秒'; },
      describe: function (run) {
        return { score: run.sec, extra: { sec: run.sec, lv: run.lv } };
      },
      localCols: function (r) {
        // 从旧版合并榜迁移过来的记录没有 mines 字段，按难度补上
        var mines = r.mines || (LEVELS[r.lv] ? LEVELS[r.lv].mines : 0);
        return [
          '<span class="lb-score">' + (r.sec || 0) + '<small> 秒</small></span>',
          '<span class="lb-meta">' + mines + ' 雷</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + ((r.extra && r.extra.sec) || 0) + '<small> 秒</small></span>'
        ];
      }
    }) : null;

    // 难度切换时同步榜单归属与本机战绩文件
    function syncLbLevel() {
      if (!lbPanel) return;
      lbPanel.setGame('mine_' + level.key, storeKeyFor(level.key));
    }

    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    /* ---------------- 棋盘 ---------------- */

    function idx(x, y) { return y * level.cols + x; }

    function neighbors(i) {
      var x = i % level.cols, y = Math.floor(i / level.cols);
      var out = [];
      for (var dy = -1; dy <= 1; dy++) {
        for (var dx = -1; dx <= 1; dx++) {
          if (!dx && !dy) continue;
          var nx = x + dx, ny = y + dy;
          if (nx < 0 || ny < 0 || nx >= level.cols || ny >= level.rows) continue;
          out.push(idx(nx, ny));
        }
      }
      return out;
    }

    function reset(newLevel) {
      if (newLevel) level = LEVELS[newLevel];
      cells = [];
      for (var i = 0; i < level.cols * level.rows; i++) {
        cells.push({ mine: false, open: false, flag: false, near: 0 });
      }
      started = false; over = false; won = false;
      flags = 0; openedCount = 0; elapsed = 0;
      if (timerId) { clearInterval(timerId); timerId = 0; }
      // 上一局结算时排了个延时 finish()，重开必须掐掉。
      // 否则它会在新一局中途弹结算，还会把新实例 destroy 掉。
      clearTimers();
    }

    // 首击之后才布雷：第一下点到的格子及其周围八格都不放雷，
    // 保证开局不会一上来就踩雷，也让第一次点击能翻开一片。
    function placeMines(safeIdx) {
      var safe = {};
      safe[safeIdx] = true;
      neighbors(safeIdx).forEach(function (n) { safe[n] = true; });

      var pool = [];
      for (var i = 0; i < cells.length; i++) if (!safe[i]) pool.push(i);
      shuffle(pool);
      for (var m = 0; m < level.mines && m < pool.length; m++) cells[pool[m]].mine = true;

      for (var j = 0; j < cells.length; j++) {
        if (cells[j].mine) continue;
        var cnt = 0;
        neighbors(j).forEach(function (n) { if (cells[n].mine) cnt++; });
        cells[j].near = cnt;
      }
    }

    function startTimer() {
      if (timerId) return;
      t0 = performance.now() - elapsed * 1000;
      timerId = setInterval(function () {
        if (destroyed || over) return;
        elapsed = Math.floor((performance.now() - t0) / 1000);
        var t = el.querySelector('#msTime');
        if (t) t.textContent = elapsed;
      }, 250);
    }

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = 0; }
      if (started) elapsed = Math.floor((performance.now() - t0) / 1000);
    }

    /* 翻开一格；遇到 0 自动扩散。用栈而不是递归，高级棋盘也不会爆栈。 */
    function reveal(start) {
      var stack = [start];
      while (stack.length) {
        var i = stack.pop();
        var c = cells[i];
        if (!c || c.open || c.flag) continue;
        c.open = true;
        openedCount++;
        if (c.mine) { over = true; won = false; return; }
        if (c.near === 0) neighbors(i).forEach(function (n) {
          if (!cells[n].open && !cells[n].flag) stack.push(n);
        });
      }
    }

    function checkWin() {
      if (openedCount === cells.length - level.mines) {
        over = true; won = true;
      }
    }

    /* ---------------- 交互 ---------------- */

    function onOpen(i) {
      if (over || destroyed) return;
      var c = cells[i];
      if (!c || c.flag || c.open) return;

      if (!started) {
        started = true;
        placeMines(i);
        startTimer();
      }
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      reveal(i);
      // reveal() 踩到雷时已经把 over 置位了，这时不能再判胜：
      // 最后一格恰好是雷的话，会被误判成通关。
      if (!over) checkWin();
      paint();
      if (over) settle();
    }

    function onFlag(i) {
      if (over || destroyed) return;
      var c = cells[i];
      if (!c || c.open) return;
      c.flag = !c.flag;
      flags += c.flag ? 1 : -1;
      if (window.SFX && window.SFX.tick) window.SFX.tick();
      paint();
    }

    function settle() {
      stopTimer();
      if (won && window.SFX && window.SFX.win) window.SFX.win();
      else if (window.SFX && window.SFX.wrong) window.SFX.wrong();

      if (won) {
        // 用时下限 1 秒：服务端也是这个下限，否则秒通关会被判成不合法成绩
        var sec = Math.max(1, elapsed);
        if (lbPanel) {
          lbPanel.submit({
            sec: sec, lv: level.key,
            mines: level.mines, rows: level.rows, cols: level.cols
          });
        }
      }
      paint();

      // 给玩家看一眼完整的雷区再结算
      later(function () {
        if (!destroyed) finish();
      }, won ? 900 : 1400);
    }

    /* ---------------- 结算 ---------------- */

    function finish() {
      var certs = window.SM_DATA.minesweeper.certs;
      var cert = certs[certs.length - 1];
      if (won) {
        // 只有通关才可能拿到「谨慎工兵」以上
        for (var i = 0; i < certs.length; i++) {
          // 精确匹配：certs 是 min 降序排列，用 >= 会在第一次迭代
          // 就命中最高档，初级通关也会拿到高级证书。
          if (level.key === 'hard' && certs[i].min === 3) { cert = certs[i]; break; }
          if (level.key === 'medium' && certs[i].min === 2) { cert = certs[i]; break; }
          if (level.key === 'easy' && certs[i].min === 1) { cert = certs[i]; break; }
        }
      }

      var cleared = 0;
      for (var j = 0; j < cells.length; j++) if (cells[j].open && !cells[j].mine) cleared++;
      var progress = Math.round(cleared / Math.max(1, cells.length - level.mines) * 100);

      onFinish({
        icon: cert.icon,
        name: cert.name,
        tag: won
          ? level.name + ' · ' + level.cols + '×' + level.rows + ' · ' + elapsed + ' 秒通关'
          : level.name + ' · 踩雷阵亡 · 翻开 ' + progress + '%',
        text: cert.text,
        big: {
          label: won ? '通关用时' : '排雷进度',
          value: won ? (elapsed + ' <small>秒</small>') : (progress + ' <small>%</small>')
        },
        bars: [
          { label: '排雷进度', pct: progress, hi: true },
          { label: '旗帜准确率', pct: flags ? Math.min(100, Math.round(level.mines / Math.max(flags, level.mines) * 100)) : 0 }
        ],
        blocks: [
          { h: '本局战报', text: '难度 ' + level.name + '（' + level.cols + '×' + level.rows + '，' + level.mines + ' 雷），翻开 ' + cleared + ' 格，插旗 ' + flags + ' 面，用时 ' + elapsed + ' 秒。' },
          { h: '风险提示', text: '扫雷的核心从来不是运气，而是把「确定」和「猜测」分开：能推导的先推完，剩下的才交给概率。' }
        ],
        quip: window.SM_DATA.minesweeper.disclaimer,
        cert: cert.name + ' · 认证',
        detail: {
          type: cert.name, won: won, level: level.key,
          sec: elapsed, cleared: cleared, mines: level.mines
        }
      });
    }

    /* ---------------- 渲染 ---------------- */

    function numClass(n) {
      return 'n' + Math.min(n, 8);
    }

    /* 格子尺寸跟着可用空间走：初级 9 列本来就该铺满，
       以前写死 24px，桌面上只剩巴掌大一块。

       宽和高都要算：只按宽度算，2560 屏上高级 30×16 会撑到 940px 高，
       直接溢出视口还得滚动。取两者较小值，棋盘才能整块落在可视区内。
       上下限保证高级不会挤成一团、初级也不会大到离谱。 */
    function cellSize() {
      // 用 el 的宽度而不是 .ms-board-wrap：paint() 每次重建 DOM，
      // 旧 wrap 可能已经不在文档里，clientWidth 会读到 0。
      // clientWidth 含 padding，.stage 左右各 16px 要扣掉
      var style = window.getComputedStyle(el);
      var padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      // 左列由棋盘内容决定（auto），读它会形成「越小→越小」的循环。
      // 改为从 .wrap 反推：可用宽 = wrap 宽 − 榜单列 − 列间距 − 外框内边距。
      var availW = 0;
      var wrapEl = el.closest('.wrap');
      var layoutEl = el.closest('.sm-game-layout');
      if (wrapEl && layoutEl) {
        var ws = window.getComputedStyle(wrapEl);
        var wpad = (parseFloat(ws.paddingLeft) || 0) + (parseFloat(ws.paddingRight) || 0);
        var vw = window.innerWidth || 1440;
        var lbW = Math.max(300, Math.min(340, Math.round(vw * 0.18)));
        availW = wrapEl.clientWidth - wpad - lbW - 12 - 2 * padX;
      }
      if (availW <= 0) availW = (el.parentNode && el.parentNode.clientWidth) || 0;
      if (availW <= 0) return 24;        // 还没进 DOM，用默认值，下一帧会重算

      var gap = 2, pad = 6 * 2;          // .ms-grid 自身内边距
      var byW = Math.floor((availW - pad - gap * (level.cols - 1)) / level.cols);
      var size = byW;

      // 只有「榜单在右侧」的双栏布局才需要限制棋盘高度：
      // 那种布局下棋盘必须和榜单挤在同一屏里，太高就得整页滚动。
      // 单栏（窄屏 / 手机）时榜单本来就在棋盘下方，页面注定要滚动，
      // 再按高度压格子只会把棋盘缩得更小，反而更糟。
      var layout = el.closest('.sm-game-layout');
      var twoCol = layout && window.getComputedStyle(layout).gridTemplateColumns.indexOf(' ') > 0;
      if (twoCol) {
        // 优先用棋盘区实际可用的高度：.ms-board-wrap 是 flex:1，
        // 它拿到的是 .stage 扣掉 HUD / 工具栏 / 提示行之后真正剩下的高度。
        // 拿它算格子，棋盘才能把纵向空间占满。
        var wrapEl2 = el.querySelector('.ms-board-wrap');
        var byH = 0;
        if (wrapEl2 && wrapEl2.clientHeight > 40) {
          byH = Math.floor((wrapEl2.clientHeight - pad - gap * (level.rows - 1)) / level.rows);
        }
        if (!(byH > 0)) {
          // 首帧还没布局出来时的兜底估算（视口高度减顶栏/标题/HUD）
          var viewH = window.innerHeight || 900;
          byH = Math.floor((viewH - 240 - pad - gap * (level.rows - 1)) / level.rows);
        }
        if (byH > 0) size = Math.min(size, byH);
      }

      // 上限 72px：再大棋盘会撑出视口，初级 9 行就会超过一屏高度。
      return Math.max(16, Math.min(72, size));
    }

    function boardHTML() {
      var cs = cellSize();
      var html = '<div class="ms-grid" id="msGrid" style="grid-template-columns:repeat(' + level.cols + ',' + cs + 'px);gap:2px;padding:6px">';
      for (var i = 0; i < cells.length; i++) {
        var c = cells[i];
        var cls = 'ms-cell';
        var inner = '';
        if (c.open) {
          cls += ' open';
          if (c.mine) { cls += ' boom'; inner = '💥'; }
          else if (c.near > 0) { cls += ' ' + numClass(c.near); inner = String(c.near); }
        } else if (c.flag) {
          cls += ' flag';
          inner = '🚩';
        }
        // 输了以后把没插旗的雷也亮出来，方便复盘
        if (over && !won && !c.open && c.mine && !c.flag) {
          cls += ' open mine';
          inner = '💣';
        }
        html += '<button type="button" class="' + cls + '" data-i="' + i + '"' +
          ' style="width:' + cs + 'px;height:' + cs + 'px;font-size:' + Math.round(cs * 0.55) + 'px">' +
          inner + '</button>';
      }
      return html + '</div>';
    }

    function paint() {
      var left = level.mines - flags;
      // 先只渲染外壳（HUD / 工具栏 / 空棋盘区 / 提示行）。
      // 棋盘要按 .ms-board-wrap 的「真实剩余高度」来定格子大小，
      // 所以必须等外壳布局完成、量到高度之后，再填棋盘。
      el.innerHTML = hud(
        '<b>雷区排险 · ' + level.name + '</b>',
        '<span class="ms-stat">💣 ' + left + '</span> <span class="ms-stat">⏱ <span id="msTime">' + elapsed + '</span>s</span>'
      ) +
        '<div class="ms-toolbar">' +
        '<div class="ms-levels">' +
        ['easy', 'medium', 'hard'].map(function (k) {
          return '<button type="button" class="ms-lv' + (level.key === k ? ' active' : '') +
            '" data-lv="' + k + '">' + LEVELS[k].name + '</button>';
        }).join('') +
        '</div>' +
        '<button type="button" class="ms-reset" id="msReset">↻ 重开</button>' +
        '</div>' +
        '<div class="ms-board-wrap" id="msBoardWrap"></div>' +
        '<div class="rz-sub" style="margin-top:10px">左键翻开 · 右键或长按插旗</div>';

      // 初级/中级棋盘窄，整组（棋盘+榜单）居中；高级 30 列铺得满，保持左对齐
      var layout = el.closest('.sm-game-layout');
      if (layout) {
        layout.classList.toggle('ms-centered', level.key !== 'hard');
      }

      // 下一帧再填棋盘：此时外壳已完成布局，
      // cellSize() 能读到 .ms-board-wrap 的真实宽高。
      requestAnimationFrame(function () {
        if (destroyed) return;
        fillBoard();
        bindBoard();
      });

      // 首帧宽度/高度可能还没定下来，下一帧再按真实尺寸重排一次
      if (!sized) {
        sized = true;
        requestAnimationFrame(function () {
          if (!destroyed && el.querySelector('.ms-board-wrap')) paint();
        });
      }
    }

    // 把棋盘填进已布局好的 .ms-board-wrap，格子尺寸按该区域实际尺寸算
    function fillBoard() {
      var host = el.querySelector('#msBoardWrap');
      if (!host) return;
      host.innerHTML = boardHTML();
    }

    function bindBoard() {
      var grid = el.querySelector('#msGrid');
      if (!grid) return;

      grid.addEventListener('contextmenu', function (e) { e.preventDefault(); });

      grid.querySelectorAll('.ms-cell').forEach(function (btn) {
        var i = parseInt(btn.getAttribute('data-i'), 10);

        btn.addEventListener('click', function () { onOpen(i); });

        btn.addEventListener('contextmenu', function (e) {
          e.preventDefault();
          onFlag(i);
        });

        // 移动端没有右键：按住 380ms 插旗
        btn.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'mouse') return;
          longPressId = setTimeout(function () {
            longPressId = 0;
            onFlag(i);
            btn.dataset.longPressed = '1';
          }, 380);
        });
        ['pointerup', 'pointercancel', 'pointerleave'].forEach(function (evt) {
          btn.addEventListener(evt, function () {
            if (longPressId) { clearTimeout(longPressId); longPressId = 0; }
          });
        });
        btn.addEventListener('click', function (e) {
          // 长按已经插过旗了，别再当成一次翻开
          if (btn.dataset.longPressed) {
            delete btn.dataset.longPressed;
            e.stopPropagation();
          }
        }, true);
      });

      var resetBtn = el.querySelector('#msReset');
      if (resetBtn) resetBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        reset(level.key);
        paint();
      };

      el.querySelectorAll('[data-lv]').forEach(function (b) {
        b.onclick = function () {
          var k = b.getAttribute('data-lv');
          if (k === level.key && !over && !started) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          reset(k);
          syncLbLevel();     // 换难度 = 换榜单，否则会看到另一档的成绩
          paint();
        };
      });
    }

    /* 老版本把三档混存在 sm_minesweeper_runs 里。
       分榜后按 lv 拆到各自的文件，拆完删掉旧键，避免重复迁移。 */
    function migrateLocal() {
      var OLD = 'sm_minesweeper_runs';
      var raw = null;
      try { raw = localStorage.getItem(OLD); } catch (e) { return; }
      if (!raw) return;
      var list = [];
      try { list = JSON.parse(raw) || []; } catch (e) { list = []; }
      if (Array.isArray(list)) {
        list.forEach(function (r) {
          if (!r || !r.lv || ['easy', 'medium', 'hard'].indexOf(r.lv) < 0) return;
          var key = storeKeyFor(r.lv);
          var bucket = [];
          try { bucket = JSON.parse(localStorage.getItem(key) || '[]') || []; } catch (e) { bucket = []; }
          bucket.push(r);
          try { localStorage.setItem(key, JSON.stringify(bucket.slice(0, 12))); } catch (e) {}
        });
      }
      try { localStorage.removeItem(OLD); } catch (e) {}
    }

    /* ---------------- 启动 ---------------- */

    migrateLocal();
    reset('easy');
    syncLbLevel();
    paint();
    mountLbHost();

    // 窗口变宽变窄时重排棋盘（侧栏折叠、旋转屏幕都会触发）
    onResize = function () {
      if (destroyed) return;
      if (!el.querySelector('.ms-board-wrap')) return;
      paint();
    };
    window.addEventListener('resize', onResize);

    return {
      // 离开视图：清掉挂起的结算延时并停表。
      // 踩雷后立刻切走时，挂起的 finish() 若在别的模块里触发，
      // showResult 的 replaceView 会篡改当前模块的历史条目。
      pause: function () {
        if (destroyed) return;
        clearTimers();
        if (!over) stopTimer();
      },
      // 回到模块：恢复计时并重绘
      repaint: function () {
        if (destroyed) return;
        if (started && !over) startTimer();
        paint();
      },
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
        if (timerId) { clearInterval(timerId); timerId = 0; }
        if (longPressId) { clearTimeout(longPressId); longPressId = 0; }
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 09 舒尔特方格 (Schulte Table)
   * 乱序网格里按 1..N 顺序点击，全部点完计时结束。
   * 网格样式复用扫雷那套 .ms-grid / .ms-cell。
   * ================================================================== */
  window.startSchulte = function (root, onFinish) {
    var el = makeRoot(root);
    var timers = [];
    var destroyed = false;
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    /* 三档难度。排名就是总用时（秒），越小越好。
       格子数越多越难，所以三档各排各的榜。 */
    var LEVELS = {
      easy:   { key: 'easy',   name: '初级', n: 5, weight: 0 },
      medium: { key: 'medium', name: '中级', n: 6, weight: 180 },
      hard:   { key: 'hard',   name: '高级', n: 7, weight: 420 }
    };
    var level = LEVELS.easy;

    var order = [];       // 每个格子里放哪个数字
    var next = 1;         // 下一个该点的数字
    var errors = 0;       // 点错次数
    var started = false;
    var over = false;
    var t0 = 0;
    var elapsed = 0;
    var timerId = 0;
    var sized = false;
    var onResize = null;
    var flashTimer = 0;

    function storeKeyFor(lv) { return 'sm_schulte_runs_' + lv; }

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'schulte_easy',
      storeKey: storeKeyFor('easy'),
      higher: false,
      idPrefix: 'lbsch',
      formatScore: function (v) { return v + ' 秒'; },
      describe: function (run) {
        return { score: run.sec, extra: { sec: run.sec, lv: run.lv, err: run.err } };
      },
      // 同分规则与服务端一致：秒数相同 → 错得少的在前 → 先达到的在前
      tieBreak: function (a, b) {
        var ae = a.err || 0, be = b.err || 0;
        if (ae !== be) return ae - be;
        return (a.at || 0) - (b.at || 0);
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.sec || 0) + '<small> 秒</small></span>',
          '<span class="lb-tile">' + lvLabel(r.lv) + '</span>',
          '<span class="lb-meta">' + (r.err || 0) + ' 次错</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + ((r.extra && r.extra.sec) || 0) + '<small> 秒</small></span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.err) || 0) + ' 错</span>'
        ];
      }
    }) : null;

    function syncLbLevel() {
      if (!lbPanel) return;
      lbPanel.setGame('schulte_' + level.key, storeKeyFor(level.key));
    }

    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    /* ---------------- 棋盘 ---------------- */

    function reset(newLevel) {
      if (newLevel) level = LEVELS[newLevel];
      var total = level.n * level.n;
      order = [];
      for (var i = 1; i <= total; i++) order.push(i);
      shuffle(order);
      next = 1;
      errors = 0;
      started = false;
      over = false;
      elapsed = 0;
      if (timerId) { clearInterval(timerId); timerId = 0; }
      if (flashTimer) { clearTimeout(flashTimer); flashTimer = 0; }
      clearTimers();
    }

    function startTimer() {
      if (timerId) return;
      t0 = performance.now() - elapsed * 1000;
      timerId = setInterval(function () {
        if (destroyed || over) return;
        elapsed = Math.floor((performance.now() - t0) / 1000);
        var t = el.querySelector('#schTime');
        if (t) t.textContent = elapsed;
      }, 250);
    }

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = 0; }
      if (started) elapsed = Math.floor((performance.now() - t0) / 1000);
    }

    /* 开始页：点「开始挑战」才生成数字并起计时。
       此前一进章节就直接铺好棋盘，玩家可以先盯着慢慢找，
       而计时又要等第一次点对才开始 —— 相当于开局白送思考时间。
       现在难度选择和开始按钮都在开始页，棋盘不出现在屏幕上。 */
    function intro() {
      clearTimers();
      if (timerId) { clearInterval(timerId); timerId = 0; }
      var n = level.n * level.n;
      el.innerHTML = hud('<b>舒尔特方格</b>', level.name + ' · ' + level.n + '×' + level.n) +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">按顺序找出 1 到 ' + n + '</div>' +
        '<div class="rz-sub">点「开始挑战」后棋盘才会出现，计时同时开始。<br>' +
        '点错只记录次数、不中断计时。三档难度各排各的榜。</div>' +
        '<div class="ms-levels" style="margin-top:22px;justify-content:center">' +
        ['easy', 'medium', 'hard'].map(function (k) {
          return '<button type="button" class="ms-lv' + (level.key === k ? ' active' : '') +
            '" data-lv="' + k + '">' + LEVELS[k].name + '</button>';
        }).join('') +
        '</div>' +
        '<button class="btn accent" id="schgo" style="margin-top:22px;width:auto;padding:12px 38px">开始挑战</button>' +
        '</div>';
      el.querySelectorAll('[data-lv]').forEach(function (b) {
        b.onclick = function () {
          var k = b.getAttribute('data-lv');
          if (k === level.key) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          level = LEVELS[k];
          syncLbLevel();     // 换难度 = 换榜单
          intro();
        };
      });
      var btn = el.querySelector('#schgo');
      if (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          reset(level.key);
          started = true;
          startTimer();      // 计时与棋盘同时开始
          paint();
        };
      }

    }

    function onPick(idx) {
      if (over || destroyed) return;
      if (order[idx] !== next) {
        // 点错不中断，只记一次并闪一下红
        errors++;
        var bad = el.querySelector('#schGrid .ms-cell[data-i="' + idx + '"]');
        if (bad) {
          bad.classList.add('sch-wrong');
          if (flashTimer) clearTimeout(flashTimer);
          flashTimer = later(function () {
            var b = el.querySelector('#schGrid .ms-cell[data-i="' + idx + '"]');
            if (b) b.classList.remove('sch-wrong');
            flashTimer = 0;
          }, 260);
        }
        if (window.SFX && window.SFX.wrong) window.SFX.wrong();
        return;
      }

      if (window.SFX && window.SFX.tap) window.SFX.tap();

      var btn = el.querySelector('#schGrid .ms-cell[data-i="' + idx + '"]');
      if (btn) btn.classList.add('open');

      next++;
      var total = level.n * level.n;
      if (next > total) {
        over = true;
        stopTimer();
        if (window.SFX && window.SFX.win) window.SFX.win();
        settle();
      }
    }

    function settle() {
      if (lbPanel) {
        // 用时下限 1 秒，和服务端一致
        lbPanel.submit({
          sec: Math.max(1, elapsed),
          lv: level.key,
          err: errors
        });
      }
      later(finish, 700);
    }

    /* ---------------- 结算 ---------------- */

    function finish() {
      var certs = window.SM_DATA.schulte.certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        // 精确匹配：certs 是 min 降序排列，用 >= 会在第一次迭代
        // 就命中最高档，初级通关也会拿到高级证书。
        if (level.key === 'hard' && certs[i].min === 3) { cert = certs[i]; break; }
        if (level.key === 'medium' && certs[i].min === 2) { cert = certs[i]; break; }
        if (level.key === 'easy' && certs[i].min === 1) { cert = certs[i]; break; }
      }

      var total = level.n * level.n;
      // 正确率：点错不扣分，但会影响这条
      var acc = Math.round(total / Math.max(total, total + errors) * 100);
      // 平均每格用时
      var per = elapsed > 0 ? (elapsed / total).toFixed(2) : '0.00';

      onFinish({
        icon: cert.icon,
        name: cert.name,
        tag: level.name + ' · ' + level.n + '×' + level.n + ' · ' + elapsed + ' 秒',
        text: cert.text,
        big: { label: '总用时', value: elapsed + ' <small>秒</small>' },
        bars: [
          { label: '正确率', pct: acc, hi: true },
          { label: '平均每格', pct: Math.min(100, Math.round(Number(per) / 3 * 100)) }
        ],
        blocks: [
          { h: '本局战报', text: '难度 ' + level.name + '（' + level.n + '×' + level.n + '，' + total + ' 格），用时 ' + elapsed + ' 秒，点错 ' + errors + ' 次，平均每格 ' + per + ' 秒。' },
          { h: '怎么练', text: '舒尔特方格的关键是「视线不动、余光搜索」：把视线固定在中心，用余光去找下一个数字，而不是让眼球满屏扫。每天一次，两周后速度会明显提升。' }
        ],
        quip: window.SM_DATA.schulte.disclaimer,
        cert: cert.name + ' · 认证',
        detail: {
          type: cert.name, level: level.key, sec: elapsed,
          errors: errors, cells: total
        }
      });
    }

    /* ---------------- 渲染 ---------------- */

    /* 和扫雷同一套算法：按可用宽度算格子大小 */
    function cellSize() {
      var style = window.getComputedStyle(el);
      var padX = (parseFloat(style.paddingLeft) || 0) + (parseFloat(style.paddingRight) || 0);
      var avail = (el.clientWidth || 0) - padX;
      if (avail <= 0) return 48;
      var gap = 2, pad = 6 * 2;
      var size = Math.floor((avail - pad - gap * (level.n - 1)) / level.n);
      // 舒尔特格子少，上限放宽到 96px，数字才看得清
      return Math.max(34, Math.min(96, size));
    }

    function boardHTML() {
      var cs = cellSize();
      var html = '<div class="ms-grid sch-grid" id="schGrid" style="grid-template-columns:repeat(' +
        level.n + ',' + cs + 'px);gap:2px;padding:6px">';
      for (var i = 0; i < order.length; i++) {
        html += '<button type="button" class="ms-cell sch-cell" data-i="' + i + '"' +
          ' style="width:' + cs + 'px;height:' + cs + 'px;font-size:' + Math.round(cs * 0.42) + 'px">' +
          order[i] + '</button>';
      }
      return html + '</div>';
    }

    function paint() {
      el.innerHTML = hud(
        '<b>舒尔特方格 · ' + level.name + '</b>',
        '<span class="ms-stat">✅ ' + (next - 1) + '/' + (level.n * level.n) + '</span> ' +
        '<span class="ms-stat">⏱ <span id="schTime">' + elapsed + '</span>s</span>'
      ) +
        '<div class="ms-toolbar">' +
        '<div class="ms-levels">' +
        ['easy', 'medium', 'hard'].map(function (k) {
          return '<button type="button" class="ms-lv' + (level.key === k ? ' active' : '') +
            '" data-lv="' + k + '">' + LEVELS[k].name + '</button>';
        }).join('') +
        '</div>' +
        '<button type="button" class="ms-reset" id="schReset">↻ 重开</button>' +
        '</div>' +
        '<div class="ms-board-wrap">' + boardHTML() + '</div>' +
        '<div class="rz-sub" style="margin-top:10px">按 1 到 ' + (level.n * level.n) + ' 的顺序依次点击</div>';

      bindBoard();

      if (!sized) {
        sized = true;
        requestAnimationFrame(function () {
          if (!destroyed && el.querySelector('.ms-board-wrap')) paint();
        });
      }

    }

    function bindBoard() {
      var grid = el.querySelector('#schGrid');
      if (!grid) return;

      grid.querySelectorAll('.ms-cell').forEach(function (btn) {
        var i = parseInt(btn.getAttribute('data-i'), 10);
        btn.addEventListener('click', function () { onPick(i); });
      });

      // 重开 = 回开始页：重新洗牌、重新计时，玩家点「开始挑战」才看到新棋盘
      var resetBtn = el.querySelector('#schReset');
      if (resetBtn) resetBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        reset(level.key);
        intro();
      };
    }

    /* ---------------- 启动 ---------------- */

    reset('easy');
    syncLbLevel();
    intro();          // 先停在开始页，点「开始挑战」才生成数字并计时
    mountLbHost();

    onResize = function () {
      if (destroyed) return;
      if (!el.querySelector('.ms-board-wrap')) return;
      paint();
    };
    window.addEventListener('resize', onResize);

    return {
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (onResize) { window.removeEventListener('resize', onResize); onResize = null; }
        if (timerId) { clearInterval(timerId); timerId = 0; }
        if (flashTimer) { clearTimeout(flashTimer); flashTimer = 0; }
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 10 定位射击靶场 (AIM TRAINER)
   * 30 秒限时：小球随机出现并持续收缩，出手越快、球越小分越高；
   * 连击有加成，点空或让球缩没都断连击。按总分进全服排行榜。
   * ================================================================== */
  window.startAimTrainer = function (root, onFinish) {
    var el = makeRoot(root, function () { intro(); });
    var timers = [];
    var destroyed = false;
    function later(fn, ms) { var id = setTimeout(function () { if (!destroyed) fn(); }, ms); timers.push(id); return id; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    var DURATION = 30000;        // 一局 30 秒
    var R = 34;                  // 小球固定半径（不收缩）
    var MISS_PENALTY = 50;       // 点空扣分
    var BALL_COUNT = 3;          // 场上恒定三颗球，打掉一颗补一颗

    var score = 0, hits = 0, clicks = 0;
    var streak = 0, bestStreak = 0;
    var balls = [];              // 场上所有球 [{ el, cx, cy }]
    var rafId = 0, endAt = 0, running = false;

    /* ---------------- 排行榜 ----------------
       30 秒总分排名，越高越好。全服榜展示命中率，
       本机战绩展示分数 / 命中数 / 命中率 / 日期。 */
    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'aim',
      storeKey: 'sm_aim_runs',
      higher: true,
      idPrefix: 'lbaim',
      formatScore: function (v) { return v + ' 分'; },
      describe: function (run) {
        // 键名必须与 submit({...}) 传进来的字段一致：
        // 之前写成 run.bestStreak 而提交用的是 streak，
        // 服务端收到 undefined 直接 400，全服榜永远收不到成绩。
        return { score: run.score, extra: { hits: run.hits, acc: run.acc, streak: run.streak } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + (r.hits || 0) + ' 中</span>',
          '<span class="lb-meta">' + (r.acc || 0) + '%</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.acc) || 0) + '%</span>'
        ];
      }
    }) : null;

    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    function hud() {
      var acc = clicks ? Math.round(hits / clicks * 100) : 100;
      var secs = endAt > 0 ? Math.max(0, Math.ceil((endAt - performance.now()) / 1000)) : DURATION / 1000;
      return '<div class="hud"><div><b>定位射击靶场</b></div><div>'
        + '<span class="ms-stat">⏱ <span id="aimTime">' + secs + '</span>s</span>'
        + '<span class="ms-stat">🎯 <span id="aimScore">' + score + '</span></span>'
        + '<span class="ms-stat">🔥 <span id="aimStreak">' + streak + '</span></span>'
        + '<span class="ms-stat" id="aimAcc">' + acc + '%</span>'
        + '</div></div>';
    }

    /* ---------- 开始页：不点不开计时（与舒尔特同一约定） ---------- */
    function intro() {
      clearTimers();
      /* 中途重开必须掐掉旧回合的 rAF 和 running 标志：
         不清的话旧回合 30 秒计时到期会照常 endRound——
         把残局分数上榜，并把用户从说明页拽到结算页 */
      running = false;
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
      while (balls.length) removeBall(balls[0]);
      el.innerHTML = hud() +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">30 秒 · 打小球</div>' +
        '<div class="rz-sub">场上同时有三颗球，点掉一颗立刻补上一颗。<br>' +
        '每颗 +100，连击每层 +10（封顶 +100）；点空 −50 并断连击。<br>' +
        '准星会变成十字——用鼠标或手指都可以。</div>' +
        '<button class="btn accent" id="Aimgo" style="margin-top:22px;width:auto;padding:12px 38px">开始挑战</button>' +
        '</div>';
      var btn = el.querySelector('#Aimgo');
      if (btn) {
        btn.onclick = function (e) {
          e.stopPropagation();
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          startRound();
        };
      }
    }

    function startRound() {
      score = 0; hits = 0; clicks = 0;
      streak = 0; bestStreak = 0;
      running = true;
      endAt = performance.now() + DURATION;
      paintFrame();
      for (var i = 0; i < BALL_COUNT; i++) spawnBall();
      tickLoop();
    }

    /* 一次性渲染 HUD + 靶场外框；局内数字只改文本节点 */
    function paintFrame() {
      el.innerHTML = hud() +
        '<div class="timerbar"><i id="aimTt"></i></div>' +
        '<div class="aim-arena" id="aimArena"></div>';
      var arena = el.querySelector('#aimArena');
      arena.addEventListener('pointerdown', onArenaTap);
    }

    function tickLoop() {
      cancelAnimationFrame(rafId);
      var bar = el.querySelector('#aimTt');
      var timeEl = el.querySelector('#aimTime');
      (function frame() {
        if (destroyed || !running) return;
        var left = endAt - performance.now();
        if (bar) bar.style.width = Math.max(0, left / DURATION * 100) + '%';
        if (timeEl) timeEl.textContent = Math.max(0, Math.ceil(left / 1000));
        if (left <= 0) { endRound(); return; }
        rafId = requestAnimationFrame(frame);
      })();
    }

    function spawnBall() {
      if (destroyed || !running) return;
      var arena = el.querySelector('#aimArena');
      if (!arena) return;
      var W = arena.clientWidth || 600, H = arena.clientHeight || 360;
      var m = R + 12;
      var cx = m, cy = m, ok = false;
      // 随机落点，尽量不和场上现有的球叠在一起（试 12 次）
      for (var t = 0; t < 12 && !ok; t++) {
        cx = m + Math.random() * Math.max(1, W - m * 2);
        cy = m + Math.random() * Math.max(1, H - m * 2);
        ok = true;
        for (var i = 0; i < balls.length; i++) {
          var dx = balls[i].cx - cx, dy = balls[i].cy - cy;
          if (dx * dx + dy * dy < (R * 2.4) * (R * 2.4)) { ok = false; break; }
        }
      }
      var b = document.createElement('div');
      b.className = 'aim-ball';
      arena.appendChild(b);
      var obj = { el: b, cx: cx, cy: cy };
      balls.push(obj);
      place(b, cx, cy, R);
    }

    function place(b, cx, cy, r) {
      b.style.left = (cx - r) + 'px';
      b.style.top = (cy - r) + 'px';
      b.style.width = b.style.height = (r * 2) + 'px';
    }

    function removeBall(b) {
      var i = balls.indexOf(b);
      if (i > -1) balls.splice(i, 1);
      if (b.el && b.el.parentNode) b.el.remove();
    }

    function onArenaTap(e) {
      if (!running || destroyed) return;
      clicks++;
      var arena = el.querySelector('#aimArena');
      var rect = arena.getBoundingClientRect();
      var x = e.clientX - rect.left, y = e.clientY - rect.top;
      for (var i = 0; i < balls.length; i++) {
        var b = balls[i];
        var dx = x - b.cx, dy = y - b.cy;
        if (dx * dx + dy * dy <= R * R) { hit(b, x, y); return; }
      }
      miss(x, y);
    }

    function hit(b, x, y) {
      hits++;
      streak++;
      bestStreak = Math.max(bestStreak, streak);
      var pts = 100 + Math.min(100, streak * 10);       // 连击加成封顶 +100
      score += pts;
      if (window.SFX && window.SFX.select) window.SFX.select();
      popText(x, y, '+' + pts, '#2FBF6B');
      updateScore();
      removeBall(b);
      spawnBall();                                       // 打掉一颗立刻补一颗
    }

    function miss(x, y) {
      score = Math.max(0, score - MISS_PENALTY);         // 点空扣分
      streak = 0;
      if (window.SFX && window.SFX.wrong) window.SFX.wrong();
      popText(x, y, '−' + MISS_PENALTY, '#E23B2E');
      updateScore();
    }

    function popText(x, y, txt, color) {
      var arena = el.querySelector('#aimArena');
      if (!arena) return;
      var t = document.createElement('div');
      t.className = 'aim-pop';
      t.textContent = txt;
      t.style.left = x + 'px';
      t.style.top = y + 'px';
      t.style.color = color;
      arena.appendChild(t);
      setTimeout(function () { if (t.parentNode) t.remove(); }, 650);
    }

    function updateScore() {
      var s = el.querySelector('#aimScore');
      if (s) s.textContent = score;
      updateStreak();
      var acc = clicks ? Math.round(hits / clicks * 100) : 100;
      var a = el.querySelector('#aimAcc');
      if (a) a.textContent = acc + '%';
    }

    function updateStreak() {
      var s = el.querySelector('#aimStreak');
      if (s) s.textContent = streak;
    }

    function endRound() {
      running = false;
      while (balls.length) removeBall(balls[0]);
      cancelAnimationFrame(rafId);
      var acc = clicks ? Math.round(hits / clicks * 100) : 0;
      if (lbPanel && hits > 0) {
        lbPanel.submit({ score: score, hits: hits, acc: acc, streak: bestStreak });
      }
      finish();
    }

    function finish() {
      var acc = clicks ? Math.round(hits / clicks * 100) : 0;
      var certs = window.SM_DATA.aim.certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        if (score >= certs[i].min) { cert = certs[i]; break; }
      }
      var avg = hits ? Math.round(DURATION / hits) : 0;

      onFinish({
        icon: cert.icon, name: cert.name,
        tag: '总分 ' + score + ' · 命中 ' + hits + ' 球',
        text: cert.text + ' 30 秒里命中 ' + hits + ' 球、命中率 ' + acc + '%、最高连击 ' + bestStreak +
          '，平均每球 ' + avg + 'ms 出现到被你点掉。',
        big: { label: '总分', value: score + ' <small>分</small>' },
        bars: [
          { label: '命中率', pct: acc, hi: true },
          { label: '手速', pct: Math.min(100, Math.round(hits / 30 * 100)) }
        ],
        blocks: [
          { h: '本局战报', text: '命中 ' + hits + ' 球，放空 ' + (clicks - hits) + ' 次（每次 −' + MISS_PENALTY + ' 分），最高连击 ' + bestStreak + '。' },
          { h: '怎么练', text: '别追着准星看，用余光同时盯住三颗球、挑最近的那颗先打——连击不断的局，分数是自己涨上去的。' }
        ],
        quip: window.SM_DATA.aim.disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, score: score, hits: hits, acc: acc, bestStreak: bestStreak }
      });
    }

    intro();
    mountLbHost();
    return {
      destroy: function () {
        destroyed = true;
        running = false;
        clearTimers();
        cancelAnimationFrame(rafId);
        while (balls.length) removeBall(balls[0]);
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 11 数独 (SUDOKU)
   * 无时限：自动存档，想玩就玩、想停就停。生成器保证唯一解，
   * 难度 = 提示数（初级 42 / 中级 34 / 高级 28）。
   * 排名值 = 错误数（越少越好），按难度分榜。
   * ================================================================== */
  window.startSudoku = function (root, onFinish) {
    var el = makeRoot(root, function () { startNew(); });
    var destroyed = false, finished = false;

    var LEVELS = {
      easy:   { key: 'easy',   name: '初级', givens: 42 },
      medium: { key: 'medium', name: '中级', givens: 34 },
      hard:   { key: 'hard',   name: '高级', givens: 28 }
    };
    var SAVE_KEY = 'sm_sudoku_state';

    var lv = LEVELS.easy;
    var puzzle = [], solution = [], given = [], user = [];
    var mistakes = 0, sel = -1;

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'sudoku_easy',
      storeKey: 'sm_sudoku_runs_easy',
      higher: false,
      idPrefix: 'lbsudo',
      formatScore: function (v) { return v + ' 错'; },
      // 键名与 submit({...}) 完全一致——aim 的 streak 教训
      describe: function (run) {
        return { score: run.score, extra: { mistakes: run.score, lv: run.lv } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '<small> 错</small></span>',
          '<span class="lb-meta">' + lvLabel(r.lv) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '<small> 错</small></span>',
          '<span class="lb-tile">' + lvLabel(r.extra && r.extra.lv) + '</span>'
        ];
      }
    }) : null;

    function syncLbLevel() {
      if (lbPanel) lbPanel.setGame('sudoku_' + lv.key, 'sm_sudoku_runs_' + lv.key);
    }

    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    /* ---------- 生成器：先造完整解，再逐格挖空并保持唯一解 ---------- */
    function idx(r, c) { return r * 9 + c; }

    function valid(g, r, c, n) {
      for (var i = 0; i < 9; i++) {
        if (g[idx(r, i)] === n) return false;
        if (g[idx(i, c)] === n) return false;
      }
      var br = Math.floor(r / 3) * 3, bc = Math.floor(c / 3) * 3;
      for (var rr = br; rr < br + 3; rr++)
        for (var cc = bc; cc < bc + 3; cc++)
          if (g[idx(rr, cc)] === n) return false;
      return true;
    }

    function shuffled9() {
      var a = [1, 2, 3, 4, 5, 6, 7, 8, 9];
      for (var i = 8; i > 0; i--) {
        var j = Math.floor(Math.random() * (i + 1));
        var t = a[i]; a[i] = a[j]; a[j] = t;
      }
      return a;
    }

    function generateSolved() {
      var g = new Array(81).fill(0);
      function fill(p) {
        if (p === 81) return true;
        var r = Math.floor(p / 9), c = p % 9;
        var nums = shuffled9();
        for (var i = 0; i < 9; i++) {
          if (valid(g, r, c, nums[i])) {
            g[p] = nums[i];
            if (fill(p + 1)) return true;
            g[p] = 0;
          }
        }
        return false;
      }
      fill(0);
      return g;
    }

    /* 解数计数（>1 即非唯一），选候选最少格优先，剪枝快 */
    function countSolutions(g) {
      var count = 0;
      function findBest() {
        var best = -1, bestMask = 0, bestCnt = 10;
        for (var p = 0; p < 81; p++) {
          if (g[p]) continue;
          var r = Math.floor(p / 9), c = p % 9, cnt = 0, mask = 0;
          for (var n = 1; n <= 9; n++) if (valid(g, r, c, n)) { cnt++; mask |= (1 << n); }
          if (cnt === 0) return { p: p, cnt: 0, mask: 0 };
          if (cnt < bestCnt) { bestCnt = cnt; best = p; bestMask = mask; if (cnt === 1) break; }
        }
        return { p: best, cnt: bestCnt, mask: bestMask };
      }
      (function solve() {
        if (count >= 2) return;
        var f = findBest();
        if (f.p === -1) { count++; return; }
        if (f.cnt === 0) return;
        for (var n = 1; n <= 9; n++) {
          if (f.mask & (1 << n)) {
            g[f.p] = n; solve(); g[f.p] = 0;
            if (count >= 2) return;
          }
        }
      })();
      return count;
    }

    function makePuzzle(targetGivens) {
      var g = generateSolved();
      var p = g.slice();
      var order = [];
      for (var i = 0; i < 81; i++) order.push(i);
      for (var j = 80; j > 0; j--) {
        var k = Math.floor(Math.random() * (j + 1));
        var t = order[j]; order[j] = order[k]; order[k] = t;
      }
      var removed = 0;
      for (var m = 0; m < 81; m++) {
        if (81 - removed <= targetGivens) break;
        var cell = order[m];
        var v = p[cell];
        p[cell] = 0;
        if (countSolutions(p.slice()) !== 1) p[cell] = v;
        else removed++;
      }
      return { puzzle: p, solution: g };
    }

    /* ---------- 存档 ---------- */
    function saveState() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          lv: lv.key, puzzle: puzzle, solution: solution, given: given,
          user: user, mistakes: mistakes
        }));
      } catch (e) {}
    }
    function loadState() {
      try {
        var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        var arraysOk = s && Array.isArray(s.puzzle) && Array.isArray(s.solution) &&
          Array.isArray(s.given) && Array.isArray(s.user) &&
          s.puzzle.length === 81 && s.solution.length === 81 &&
          s.given.length === 81 && s.user.length === 81;
        if (s && arraysOk && LEVELS[s.lv]) return s;
      } catch (e) {}
      return null;
    }
    function clearState() {
      try { localStorage.removeItem(saveKey()); } catch (e) {}
    }

    /* ---------- 界面 ---------- */
    function intro() {
      var saved = loadState();
      var savedLv = saved ? LEVELS[saved.lv] : null;
      el.innerHTML = hud() +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">数独</div>' +
        '<div class="rz-sub">每行、每列、每个 3×3 宫都要恰好有 1 到 9。<br>' +
        '进度自动存档，退出随时继续。按错误数进全服排行榜。</div>' +
        '<div class="ms-levels" style="margin-top:20px;justify-content:center">' +
        ['easy', 'medium', 'hard'].map(function (k) {
          return '<button type="button" class="ms-lv' + (lv.key === k ? ' active' : '') +
            '" data-lv="' + k + '">' + LEVELS[k].name + '（' + LEVELS[k].givens + ' 提示）</button>';
        }).join('') +
        '</div>' +
        (saved ? '<button class="btn accent" id="sdResume" style="margin-top:18px;width:auto;padding:12px 34px">继续上局（' +
          savedLv.name + '，已错 ' + saved.mistakes + ' 次）</button>' : '') +
        '<button class="btn' + (saved ? '' : ' accent') + '" id="sdNew" style="margin-top:12px;width:auto;padding:12px 34px">新开一局</button>' +
        '</div>';

      el.querySelectorAll('[data-lv]').forEach(function (b) {
        b.onclick = function () {
          var k = b.getAttribute('data-lv');
          if (k === lv.key) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          lv = LEVELS[k];
          syncLbLevel();
          intro();
        };
      });
      var resumeBtn = el.querySelector('#sdResume');
      if (resumeBtn) resumeBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        var s = loadState();
        if (!s) { intro(); return; }
        lv = LEVELS[s.lv];
        puzzle = s.puzzle; solution = s.solution; given = s.given;
        user = s.user; mistakes = s.mistakes || 0; sel = -1;
        syncLbLevel();
        renderBoard();
      };
      var newBtn = el.querySelector('#sdNew');
      if (newBtn) newBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startNew();
      };
    }

    function startNew() {
      var gen = makePuzzle(lv.givens);
      puzzle = gen.puzzle;
      solution = gen.solution;
      given = puzzle.map(function (x) { return x > 0 ? 1 : 0; });
      user = new Array(81).fill(0);
      mistakes = 0; sel = -1;
      syncLbLevel();
      saveState();
      renderBoard();
    }

    function boardHTML() {
      var html = '<div class="sd-grid" id="sdGrid">';
      for (var p = 0; p < 81; p++) {
        var cls = 'sd-cell' + (given[p] ? ' given' : '') +
          (user[p] && user[p] !== solution[p] ? ' err' : '') +
          (sel === p ? ' sel' : '') +
          (p % 9 === 2 || p % 9 === 5 ? ' bR' : '') +
          ((p >= 18 && p < 27) || (p >= 45 && p < 54) ? ' bB' : '');
        html += '<button type="button" class="' + cls + '" data-p="' + p + '">' +
          (given[p] ? solution[p] : (user[p] || '')) + '</button>';
      }
      html += '</div><div class="sd-pad">';
      for (var n = 1; n <= 9; n++) html += '<button type="button" class="sd-num" data-n="' + n + '">' + n + '</button>';
      html += '<button type="button" class="sd-num sd-del" data-n="0">清除</button></div>' +
        '<div class="rz-sub" style="margin-top:10px">先点空格，再点数字。✗ 右上角是错误数</div>';
      return html;
    }

    function renderBoard() {
      el.innerHTML = hud('<b>数独 · ' + lv.name + '</b>', '<span class="ms-stat">✗ <span id="sdErr">' + mistakes + '</span></span>') +
        boardHTML();
      var grid = el.querySelector('#sdGrid');
      grid.addEventListener('click', function (e) {
        var cell = e.target.closest('.sd-cell');
                if (!cell) return;
        var p = Number(cell.getAttribute('data-p'));
        if (given[p]) return;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        sel = (sel === p ? -1 : p);
        renderBoard();
      });
      var pad = el.querySelector('.sd-pad');
      pad.addEventListener('click', function (e) {
        var btn = e.target.closest('.sd-num');
        if (!btn || finished) return;
        placeNumber(Number(btn.getAttribute('data-n')));
      });
    }

    // 键盘输入：数字键 1–9 填入选中格，0 / Backspace / Delete 清除。
    // 只在数独屏幕激活时响应，避免劫持其他页面的按键。
    // 只在游戏初始化时绑定一次（不放 renderBoard——那里每次填数都会执行）。
    function bindKeyboard() {
      window.addEventListener('keydown', onKeyDown);
    }

    function onKeyDown(e) {
      if (destroyed || finished || e.metaKey || e.ctrlKey || e.altKey) return;
      var scr = document.querySelector('.sm-screen.active');
      if (!scr || scr.id !== 'scr-sm-sudoku') return;
      if (e.key >= '1' && e.key <= '9') {
        e.preventDefault();
        placeNumber(Number(e.key));
      } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
        e.preventDefault();
        placeNumber(0);
      }
    }

    function placeNumber(n) {
      if (sel < 0 || given[sel]) return;
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      if (n === user[sel]) return;
      user[sel] = n;
      if (n !== 0 && n !== solution[sel]) {
        mistakes++;
        if (window.SFX && window.SFX.wrong) window.SFX.wrong();
      }
      saveState();
      renderBoard();
      checkWin();
    }

    function checkWin() {
      var bad = 0;
      for (var p = 0; p < 81; p++) {
        if ((given[p] ? solution[p] : user[p]) !== solution[p]) bad++;
      }
      if (bad > 0 || finished) return;
      finished = true;
      clearState();
      if (window.SFX && window.SFX.win) window.SFX.win();
      if (lbPanel) lbPanel.submit({ score: mistakes, lv: lv.key });
      finish();
    }

    function finish() {
      var certs = window.SM_DATA.sudoku.certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        if (mistakes >= certs[i].min) { cert = certs[i]; break; }
      }
      onFinish({
        icon: cert.icon, name: cert.name,
        tag: lv.name + ' · 错误 ' + mistakes + ' 次',
        text: cert.text + ' 全部 81 格完成，错误 ' + mistakes + ' 次。',
        big: { label: '错误数', value: mistakes + ' <small>次</small>' },
        bars: [
          { label: '准确率', pct: Math.max(0, 100 - mistakes * 4), hi: true }
        ],
        blocks: [
          { h: '怎么练', text: '卡住时找「唯一候选」：某格只允许一个数字、某行只缺一个数字——数独的全部技巧都从这一条长出来。' }
        ],
        quip: window.SM_DATA.sudoku.disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, mistakes: mistakes, lv: lv.key }
      });
    }

    intro();
    syncLbLevel();
    mountLbHost();
    bindKeyboard();
    return {
      destroy: function () {
        destroyed = true;
        window.removeEventListener('keydown', onKeyDown);
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 13 数字华容道 (SLIDING PUZZLE)
   * 无时限：自动存档，随时退出随时继续。打乱方式 = 从还原态
   * 随机走合法步（必然可解）。排名值 = 步数（越少越好），按难度分榜。
   * ================================================================== */
  window.startSlidePuzzle = function (root, onFinish) {
    var el = makeRoot(root, function () { startNew(); });
    var destroyed = false, finished = false;

    var LEVELS = {
      easy:   { key: 'easy',   name: '初级', n: 3, par: 90,  good: 160 },
      medium: { key: 'medium', name: '中级', n: 4, par: 200, good: 320 },
      hard:   { key: 'hard',   name: '高级', n: 5, par: 380, good: 560 }
    };
    var SAVE_KEY = 'sm_slide_state';

    var lv = LEVELS.easy;
    var n = 3, tiles = [], moves = 0;

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'slide_easy',
      storeKey: 'sm_slide_runs_easy',
      higher: false,
      idPrefix: 'lbslide',
      formatScore: function (v) { return v + ' 步'; },
      // 键名与 submit({...}) 完全一致——aim 的 streak 教训
      describe: function (run) {
        return { score: run.score, extra: { moves: run.score, lv: run.lv } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '<small> 步</small></span>',
          '<span class="lb-meta">' + lvLabel(r.lv) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '<small> 步</small></span>',
          '<span class="lb-tile">' + lvLabel(r.extra && r.extra.lv) + '</span>'
        ];
      }
    }) : null;

    function syncLbLevel() {
      if (lbPanel) lbPanel.setGame('slide_' + lv.key, 'sm_slide_runs_' + lv.key);
    }

    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    function solvedState() {
      var a = [];
      for (var i = 1; i < n * n; i++) a.push(i);
      a.push(0);
      return a;
    }

    function isSolved() {
      var total = n * n;
      for (var i = 0; i < total - 1; i++) if (tiles[i] !== i + 1) return false;
      return tiles[total - 1] === 0;
    }

    /* 从还原态随机走合法步打乱——必然可解 */
    function shuffle() {
      tiles = solvedState();
      var last = -1, steps = n * n * 60;
      for (var i = 0; i < steps; i++) {
        var blank = tiles.indexOf(0);
        var bx = blank % n, by = Math.floor(blank / n);
        var opts = [];
        if (bx > 0) opts.push(blank - 1);
        if (bx < n - 1) opts.push(blank + 1);
        if (by > 0) opts.push(blank - n);
        if (by < n - 1) opts.push(blank + n);
        opts = opts.filter(function (p) { return p !== last; });
        var pick = opts[Math.floor(Math.random() * opts.length)];
        tiles[blank] = tiles[pick];
        tiles[pick] = 0;
        last = pick;
      }
      moves = 0;
    }

    /* ---------- 存档 ---------- */
    function saveState() {
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({ lv: lv.key, tiles: tiles, moves: moves }));
      } catch (e) {}
    }
    function loadState() {
      try {
        var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        // 从存档自带的 lv 推导棋盘尺寸，不用实例当前的 n——
        // 新实例 n 默认 3，会让 4×4/5×5 的存档校验失败、恢复按钮消失
        var expectN = s && LEVELS[s.lv] ? LEVELS[s.lv].n : 0;
        if (s && Array.isArray(s.tiles) && s.tiles.length === expectN * expectN && LEVELS[s.lv]) return s;
      } catch (e) {}
      return null;
    }
    function clearState() {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    }

    /* ---------- 界面 ---------- */
    function intro() {
      var saved = loadState();
      var savedLv = saved ? LEVELS[saved.lv] : null;
      el.innerHTML = hud() +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">数字华容道</div>' +
        '<div class="rz-sub">点击空位旁边的滑块即可滑动，复原成 1 到 N。<br>' +
        '进度自动存档，退出随时继续。按步数进全服排行榜。</div>' +
        '<div class="ms-levels" style="margin-top:20px;justify-content:center">' +
        ['easy', 'medium', 'hard'].map(function (k) {
          return '<button type="button" class="ms-lv' + (lv.key === k ? ' active' : '') +
            '" data-lv="' + k + '">' + LEVELS[k].name + '（' + LEVELS[k].n + '×' + LEVELS[k].n + '）</button>';
        }).join('') +
        '</div>' +
        (saved ? '<button class="btn accent" id="slResume" style="margin-top:18px;width:auto;padding:12px 34px">继续上局（' +
          savedLv.name + '，已走 ' + saved.moves + ' 步）</button>' : '') +
        '<button class="btn' + (saved ? '' : ' accent') + '" id="slNew" style="margin-top:12px;width:auto;padding:12px 34px">新开一局</button>' +
        '</div>';

      el.querySelectorAll('[data-lv]').forEach(function (b) {
        b.onclick = function () {
          var k = b.getAttribute('data-lv');
          if (k === lv.key) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          lv = LEVELS[k];
          syncLbLevel();
          intro();
        };
      });
      var resumeBtn = el.querySelector('#slResume');
      if (resumeBtn) resumeBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        var s = loadState();
        if (!s) { intro(); return; }
        lv = LEVELS[s.lv]; n = lv.n;
        tiles = s.tiles; moves = s.moves || 0;
        syncLbLevel();
        renderBoard();
      };
      var newBtn = el.querySelector('#slNew');
      if (newBtn) newBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startNew();
      };
    }

    function startNew() {
      n = lv.n;
      shuffle();
      syncLbLevel();
      saveState();
      renderBoard();
    }

    function renderBoard() {
      var total = n * n, k = 100 / n;
      var html = hud('<b>数字华容道 · ' + lv.name + '</b>', '<span class="ms-stat">⚡ <span id="slMoves">' + moves + '</span> 步</span>') +
        '<div class="sl-wrap"><div class="sl-board" id="slBoard">';
      for (var i = 0; i < total; i++) {
        if (!tiles[i]) continue;
        html += '<button type="button" class="sl-tile" data-p="' + i + '">' + tiles[i] + '</button>';
      }
      html += '</div></div>' +
        '<div class="rz-sub" style="margin-top:12px">点空位旁的滑块移动 · 自动存档</div>';
      el.innerHTML = html;
      var board = el.querySelector('#slBoard');
      board.style.setProperty('--n', n);
      placeAll(board, k);
      board.addEventListener('click', function (e) {
        var t = e.target.closest('.sl-tile');
        if (!t || finished) return;
        tryMove(Number(t.getAttribute('data-p')));
      });
    }

    function placeAll(board, k) {
      board.querySelectorAll('.sl-tile').forEach(function (t) {
        var pos = Number(t.getAttribute('data-p'));
        t.style.width = 'calc(' + k + '% - 8px)';
        t.style.height = 'calc(' + k + '% - 8px)';
        t.style.left = 'calc(' + (pos % n) * k + '% + 4px)';
        t.style.top = 'calc(' + Math.floor(pos / n) * k + '% + 4px)';
      });
    }

    function tryMove(p) {
      var blank = tiles.indexOf(0);
      var bx = blank % n, by = Math.floor(blank / n);
      var px = p % n, py = Math.floor(p / n);
      if (Math.abs(bx - px) + Math.abs(by - py) !== 1) return;
      tiles[blank] = tiles[p];
      tiles[p] = 0;
      moves++;
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      var board = el.querySelector('#slBoard');
      var t = board.querySelector('.sl-tile[data-p="' + p + '"]');
      if (t) t.setAttribute('data-p', blank);
      placeAll(board, 100 / n);
      var mv = el.querySelector('#slMoves');
      if (mv) mv.textContent = moves;
      saveState();
      if (isSolved()) {
        finished = true;
        clearState();
        if (window.SFX && window.SFX.win) window.SFX.win();
        if (lbPanel) lbPanel.submit({ score: moves, lv: lv.key });
        finish();
      }
    }

    function finish() {
      var cfg = lv;
      var cert;
      if (moves <= cfg.par) cert = { icon: 'crown', name: '行云流水', text: '几乎没有废步，滑块在你手里像有惯性一样听话。' };
      else if (moves <= cfg.good) cert = { icon: 'gem', name: '思路清晰', text: '步数控制得很好，复原顺序已经是标准解法了。' };
      else cert = { icon: 'bolt', name: '稳步复原', text: '慢是慢了点，但每一块都回到了它该在的地方。' };

      onFinish({
        icon: cert.icon, name: cert.name,
        tag: lv.name + ' ' + n + '×' + n + ' · ' + moves + ' 步复原',
        text: cert.text + ' ' + (n * n - 1) + ' 块滑块用了 ' + moves + ' 步复原。',
        big: { label: '总步数', value: moves + ' <small>步</small>' },
        bars: [
          { label: '步数效率', pct: Math.max(10, Math.min(100, Math.round(cfg.good / Math.max(1, moves) * 100))), hi: true }
        ],
        blocks: [
          { h: '怎么练', text: '先把第一行（左到右）和第一列（上到下）固定住，剩下的空间就小一圈——逐圈向内收是华容道的通用思路。' }
        ],
        quip: window.SM_DATA.slide.disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, moves: moves, lv: lv.key }
      });
    }

    intro();
    syncLbLevel();
    mountLbHost();
    return {
      destroy: function () {
        destroyed = true;
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 14 俄罗斯方块 (TETRIS)
   * 经典落块消行。P 键/按钮随时暂停（盖罩遮板，防偷看），
   * 进度自动存档，退出随时继续。等级 = 消行数 / 10，速度随级升。
   * 计分：1/2/3/4 行 = 100/300/500/800 × 等级，软降 +1/格，硬降 +2/格。
   * 排名值 = 总分（越高越好）。
   * ================================================================== */
  window.startTetris = function (root, onFinish) {
    var el = makeRoot(root);
    var destroyed = false, finished = false;

    var COLS = 10, ROWS = 20;
    var SAVE_KEY = 'sm_tetris_state';

    /* 7 种方块，各 4 个旋转态（0 = 空）。SRS 简化版：直接枚举矩阵。 */
    var SHAPES = {
      I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
      J: [[1,0,0],[1,1,1],[0,0,0]],
      L: [[0,0,1],[1,1,1],[0,0,0]],
      O: [[1,1],[1,1]],
      S: [[0,1,1],[1,1,0],[0,0,0]],
      T: [[0,1,0],[1,1,1],[0,0,0]],
      Z: [[1,1,0],[0,1,1],[0,0,0]]
    };
    var COLORS = { I: '#38BDF8', J: '#6366F1', L: '#F59E0B', O: '#EAB308', S: '#22C55E', T: '#A855F7', Z: '#EF4444' };

    var board = [];              // ROWS × COLS，0 或颜色字符串
    var cur = null;              // { type, mat, x, y }
    var nextType = null;
    var score = 0, lines = 0, level = 1;
    var paused = false, running = false, gameOver = false;
    var dropTimer = null, rafId = 0;
    var holdUntil = 0;           // 软降连发节流

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'tetris',
      storeKey: 'sm_tetris_runs',
      higher: true,
      idPrefix: 'lbtet',
      formatScore: function (v) { return v + ' 分'; },
      // 键名与 submit({...}) 完全一致——aim 的 streak 教训
      describe: function (run) {
        return { score: run.score, extra: { lines: run.lines, level: run.level } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + (r.lines || 0) + ' 行</span>',
          '<span class="lb-meta">Lv.' + (r.level || 1) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.lines) || 0) + ' 行</span>'
        ];
      }
    }) : null;

    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    /* ---------- 存档 ---------- */
    function saveState() {
      if (gameOver || finished) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          board: board, cur: cur, nextType: nextType,
          score: score, lines: lines, level: level
        }));
      } catch (e) {}
    }
    function loadState() {
      try {
        var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        var ok = s && Array.isArray(s.board) && s.board.length === ROWS &&
          s.board.every(function (r) { return Array.isArray(r) && r.length === COLS; }) &&
          s.cur && SHAPES[s.cur.type] && typeof s.score === 'number';
        if (s && ok) return s;
      } catch (e) {}
      return null;
    }
    function clearState() {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    }

    function emptyBoard() {
      var b = [];
      for (var r = 0; r < ROWS; r++) b.push(new Array(COLS).fill(0));
      return b;
    }

    function bagNext() {
      // 7-bag：保证每个方块周期性出现，手感公平
      if (!bag.length) {
        bag = ['I', 'J', 'L', 'O', 'S', 'T', 'Z'];
        for (var i = bag.length - 1; i > 0; i--) {
          var j = Math.floor(Math.random() * (i + 1));
          var t = bag[i]; bag[i] = bag[j]; bag[j] = t;
        }
      }
      return bag.pop();
    }
    var bag = [];

    function newPiece(type) {
      var mat = SHAPES[type].map(function (row) { return row.slice(); });
      return { type: type, mat: mat, x: Math.floor((COLS - mat[0].length) / 2), y: -1 };
    }

    function collides(mat, px, py) {
      for (var r = 0; r < mat.length; r++) {
        for (var c = 0; c < mat[r].length; c++) {
          if (!mat[r][c]) continue;
          var x = px + c, y = py + r;
          if (x < 0 || x >= COLS || y >= ROWS) return true;
          if (y >= 0 && board[y][x]) return true;
        }
      }
      return false;
    }

    function rotate(mat) {
      var nRows = mat.length, nCols = mat[0].length;
      var out = [];
      for (var c = 0; c < nCols; c++) {
        var row = [];
        for (var r = nRows - 1; r >= 0; r--) row.push(mat[r][c]);
        out.push(row);
      }
      return out;
    }

    function tryRotate() {
      if (!cur || paused) return;
      var m = rotate(cur.mat);
      // 简易踢墙：原位不行就左右各试一格
      var offsets = [0, -1, 1, -2, 2];
      for (var i = 0; i < offsets.length; i++) {
        if (!collides(m, cur.x + offsets[i], cur.y)) {
          cur.mat = m;
          cur.x += offsets[i];
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          draw();
          return;
        }
      }
    }

    function move(dx) {
      if (!cur || paused) return;
      if (!collides(cur.mat, cur.x + dx, cur.y)) {
        cur.x += dx;
        if (window.SFX && window.SFX.tick) window.SFX.tick();
        draw();
      }
    }

    function softDrop() {
      if (!cur || paused) return;
      if (!collides(cur.mat, cur.x, cur.y + 1)) {
        cur.y++;
        score += 1;
        updateHud();
        draw();
      } else {
        lockPiece();
      }
    }

    function hardDrop() {
      if (!cur || paused) return;
      var dist = 0;
      while (!collides(cur.mat, cur.x, cur.y + 1)) { cur.y++; dist++; }
      score += dist * 2;
      updateHud();       // 硬降得分即时上屏（lockPiece 的 clearLines 只在消行时刷 HUD）
      lockPiece();
    }

    function lockPiece() {
      for (var r = 0; r < cur.mat.length; r++) {
        for (var c = 0; c < cur.mat[r].length; c++) {
          if (!cur.mat[r][c]) continue;
          var y = cur.y + r, x = cur.x + c;
          if (y < 0) { endGame(); return; }
          board[y][x] = COLORS[cur.type];
        }
      }
      clearLines();
      spawn();
    }

    function clearLines() {
      var full = [];
      for (var r = 0; r < ROWS; r++) {
        var isFull = true;
        for (var c = 0; c < COLS; c++) if (!board[r][c]) { isFull = false; break; }
        if (isFull) full.push(r);
      }
      if (!full.length) { saveState(); draw(); return; }
      full.forEach(function (r) {
        board.splice(r, 1);
        board.unshift(new Array(COLS).fill(0));
      });
      var pts = [0, 100, 300, 500, 800][full.length] * level;
      score += pts;
      lines += full.length;
      level = Math.floor(lines / 10) + 1;
      if (window.SFX && window.SFX.stage) window.SFX.stage();
      saveState();
      updateHud();
      draw();
    }

    function spawn() {
      cur = newPiece(nextType || bagNext());
      nextType = bagNext();
      if (collides(cur.mat, cur.x, cur.y)) {
        // 出生点被占 → 顶死
        draw();
        endGame();
        return;
      }
      draw();
    }

    function dropInterval() {
      // 每级加快，1000ms 起步，下限 120ms
      return Math.max(120, 1000 - (level - 1) * 85);
    }

    function scheduleDrop() {
      if (dropTimer) clearTimeout(dropTimer);
      if (!running || paused || gameOver || destroyed) return;
      dropTimer = setTimeout(function () {
        if (destroyed || paused || gameOver) return;
        if (cur && !collides(cur.mat, cur.x, cur.y + 1)) {
          cur.y++;
          draw();
          scheduleDrop();
        } else {
          lockPiece();
          if (!gameOver) scheduleDrop();
        }
      }, dropInterval());
    }

    /* ---------- 渲染 ---------- */
    function draw() {
      var canvas = el.querySelector('#ttGrid');
      if (!canvas) return;
      var ctx = canvas.getContext('2d');
      var cell = canvas.width / COLS;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      // 网格底
      ctx.fillStyle = 'rgba(255,255,255,0.03)';
      for (var r = 0; r < ROWS; r++)
        for (var c = 0; c < COLS; c++)
          if ((r + c) % 2 === 0) ctx.fillRect(c * cell, r * cell, cell, cell);
      // 已固定的块
      for (var r2 = 0; r2 < ROWS; r2++) {
        for (var c2 = 0; c2 < COLS; c2++) {
          if (board[r2][c2]) drawCell(ctx, c2 * cell, r2 * cell, cell, board[r2][c2]);
        }
      }
      // 当前方块
      if (cur) {
        for (var r3 = 0; r3 < cur.mat.length; r3++) {
          for (var c3 = 0; c3 < cur.mat[r3].length; c3++) {
            if (!cur.mat[r3][c3]) continue;
            var y = cur.y + r3;
            if (y >= 0) drawCell(ctx, (cur.x + c3) * cell, y * cell, cell, COLORS[cur.type]);
          }
        }
      }
      // 下一块预览
      var nextCanvas = el.querySelector('#ttNext');
      if (nextCanvas && nextType) {
        var nctx = nextCanvas.getContext('2d');
        nctx.clearRect(0, 0, nextCanvas.width, nextCanvas.height);
        var m = SHAPES[nextType];
        var ncell = nextCanvas.width / 4.4;
        var ox = (nextCanvas.width - m[0].length * ncell) / 2;
        var oy = (nextCanvas.height - m.length * ncell) / 2;
        for (var r4 = 0; r4 < m.length; r4++)
          for (var c4 = 0; c4 < m[r4].length; c4++)
            if (m[r4][c4]) drawCell(nctx, ox + c4 * ncell, oy + r4 * ncell, ncell, COLORS[nextType]);
      }
    }

    function drawCell(ctx, x, y, size, color) {
      var pad = Math.max(1, size * 0.06);
      ctx.fillStyle = color;
      ctx.fillRect(x + pad, y + pad, size - pad * 2, size - pad * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillRect(x + pad, y + pad, size - pad * 2, (size - pad * 2) * 0.22);
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.strokeRect(x + pad + 0.5, y + pad + 0.5, size - pad * 2 - 1, size - pad * 2 - 1);
    }

    function updateHud() {
      var s = el.querySelector('#ttScore'); if (s) s.textContent = score;
      var l = el.querySelector('#ttLines'); if (l) l.textContent = lines;
      var lv = el.querySelector('#ttLevel'); if (lv) lv.textContent = level;
    }

    function setPaused(p) {
      paused = p;
      var btn = el.querySelector('#ttPause');
      if (btn) btn.textContent = p ? '▶ 继续' : '⏸ 暂停';
      var overlay = el.querySelector('#ttPauseOverlay');
      if (overlay) overlay.classList.toggle('is-active', p);
      if (p) { saveState(); if (dropTimer) { clearTimeout(dropTimer); dropTimer = null; } }
      else scheduleDrop();
    }

    function togglePause() {
      if (!running || gameOver || finished) return;
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      setPaused(!paused);
    }

    function onKeyDown(e) {
      if (destroyed || !running) return;
      var scr = document.querySelector('.sm-screen.active');
      if (!scr || scr.id !== 'scr-sm-tetris') return;
      if (e.key === 'p' || e.key === 'P') { e.preventDefault(); togglePause(); return; }
      if (paused || gameOver || finished) return;
      switch (e.key) {
        case 'ArrowLeft': e.preventDefault(); move(-1); break;
        case 'ArrowRight': e.preventDefault(); move(1); break;
        case 'ArrowUp': e.preventDefault(); tryRotate(); break;
        case 'ArrowDown': {
          e.preventDefault();
          var now = performance.now();
          if (now < holdUntil) return;
          holdUntil = now + 45;       // 软降连发节流
          softDrop();
          break;
        }
        case ' ': e.preventDefault(); hardDrop(); break;
      }
    }

    /* ---------- 开始页 ---------- */
    function intro() {
      var saved = loadState();
      el.innerHTML = hud() +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">俄罗斯方块</div>' +
        '<div class="rz-sub">← → 移动 · ↑ 旋转 · ↓ 软降 · 空格硬降 · P 暂停<br>' +
        '进度自动存档，退出随时继续。按总分进全服排行榜。</div>' +
        (saved ? '<button class="btn accent" id="ttResume" style="margin-top:18px;width:auto;padding:12px 34px">继续上局（' +
          saved.score + ' 分，' + saved.lines + ' 行）</button>' : '') +
        '<button class="btn' + (saved ? '' : ' accent') + '" id="ttNew" style="margin-top:12px;width:auto;padding:12px 34px">新开一局</button>' +
        '</div>';
      var resumeBtn = el.querySelector('#ttResume');
      if (resumeBtn) resumeBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        var s = loadState();
        if (!s) { intro(); return; }
        board = s.board; cur = s.cur; nextType = s.nextType;
        score = s.score; lines = s.lines; level = s.level || 1;
        bag = [];
        startPlay();
      };
      var newBtn = el.querySelector('#ttNew');
      if (newBtn) newBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startNew();
      };
    }

    function startNew() {
      board = emptyBoard();
      score = 0; lines = 0; level = 1;
      bag = []; nextType = null; cur = null;   /* 不清 cur 会跳过 spawn：旧块继续、预览消失 */
      paused = false; running = false;
      gameOver = false; finished = false;
      startPlay();
    }

    function startPlay() {
      paused = false; running = true;
      el.innerHTML = hud('<b>俄罗斯方块</b>',
        '<span class="ms-stat">⭐ <span id="ttScore">' + score + '</span></span>' +
        '<span class="ms-stat">⬜ <span id="ttLines">' + lines + '</span> 行</span>' +
        '<span class="ms-stat">Lv.<span id="ttLevel">' + level + '</span></span>') +
        '<div class="tt-layout">' +
        '<div class="tt-stage-wrap">' +
        '<canvas id="ttGrid" width="300" height="600" class="tt-grid"></canvas>' +
        '<div class="tt-pause-overlay" id="ttPauseOverlay"><div>⏸ 已暂停<br><small>按 P 或点「继续」</small></div></div>' +
        '</div>' +
        '<div class="tt-side">' +
        '<div class="tt-next-label">下一个</div>' +
        '<canvas id="ttNext" width="88" height="88" class="tt-next"></canvas>' +
        '<button type="button" class="tt-btn" id="ttPause">⏸ 暂停</button>' +
        '<button type="button" class="tt-btn" id="ttRestart">↻ 重开</button>' +
        '<div class="tt-keys">← → 移动<br>↑ 旋转<br>↓ 软降<br>空格 硬降<br>P 暂停</div>' +
        '</div></div>';
      updateHud();
      var pauseBtn = el.querySelector('#ttPause');
      if (pauseBtn) pauseBtn.onclick = function (e) { e.stopPropagation(); togglePause(); };
      var restartBtn = el.querySelector('#ttRestart');
      if (restartBtn) restartBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        stopLoop();
        startNew();
      };
      if (!cur) spawn();
      saveState();
      draw();
      scheduleDrop();
    }

    function stopLoop() {
      if (dropTimer) { clearTimeout(dropTimer); dropTimer = null; }
      cancelAnimationFrame(rafId);
    }

    function endGame() {
      gameOver = true;
      running = false;
      stopLoop();
      clearState();
      if (window.SFX && window.SFX.wrong) window.SFX.wrong();
      if (lbPanel) lbPanel.submit({ score: score, lines: lines, level: level });
      finish();
    }

    function finish() {
      var certs = window.SM_DATA.tetris.certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        if (score >= certs[i].min) { cert = certs[i]; break; }
      }
      onFinish({
        icon: cert.icon, name: cert.name,
        tag: '总分 ' + score + ' · 消除 ' + lines + ' 行 · Lv.' + level,
        text: cert.text + ' 单局消除 ' + lines + ' 行，最终等级 Lv.' + level + '。',
        big: { label: '总分', value: score + ' <small>分</small>' },
        bars: [
          { label: '消行效率', pct: Math.min(100, Math.round(lines / 40 * 100)), hi: true },
          { label: '等级', pct: Math.min(100, level * 8) }
        ],
        blocks: [
          { h: '怎么练', text: '别把棋盘两边堆满——留一条「井」给 I 形长条，一次四行（Tetris）的分数是单行的 8 倍。' }
        ],
        quip: window.SM_DATA.tetris.disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, score: score, lines: lines, level: level }
      });
    }

    function bindKeyboard() {
      window.addEventListener('keydown', onKeyDown);
    }

    intro();
    mountLbHost();
    bindKeyboard();
    return {
      destroy: function () {
        destroyed = true;
        running = false;
        stopLoop();
        window.removeEventListener('keydown', onKeyDown);
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 14 贪吃蛇 (SNAKE)
   * 20×20 网格，吃食物变长。撞墙 / 撞自己结束。
   * 空格或按钮暂停，进度自动存档。三档速度各排各的榜（分数越高越好）。
   * 计分：每个食物 +10；每吃 5 个提速一档（下限 90ms）。
   * ================================================================== */
  window.startSnake = function (root, onFinish) {
    var el = makeRoot(root);
    var destroyed = false, finished = false;

    var COLS = 20, ROWS = 20;
    var SAVE_KEY = 'sm_snake_state';
    var FOOD_SCORE = 10;

    /* 三档基础速度（毫秒/格）：越慢越容易上手 */
    var LEVELS = {
      slow:   { key: 'slow',   name: '慢速', tick: 260 },
      normal: { key: 'normal', name: '标准', tick: 200 },
      fast:   { key: 'fast',   name: '快速', tick: 150 }
    };
    var lv = LEVELS.normal;

    var snake = [];        // [{x,y}]，头在 [0]
    var dir = { x: 1, y: 0 };
    var nextDir = { x: 1, y: 0 };
    var food = { x: 0, y: 0 };
    var score = 0, eaten = 0;
    var tickMs = lv.tick;
    var paused = false, running = false, gameOver = false;
    var timerId = 0;
    var lastTick = 0;

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'snake_normal',
      storeKey: 'sm_snake_runs_normal',
      higher: true,
      idPrefix: 'lbsnake',
      formatScore: function (v) { return v + ' 分'; },
      describe: function (run) {
        return { score: run.score, extra: { length: run.length, lv: run.lv } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + (r.length || 3) + ' 节</span>',
          '<span class="lb-meta">' + lvLabelSnake(r.lv) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.length) || 3) + ' 节</span>'
        ];
      }
    }) : null;

    function lvLabelSnake(k) {
      return k === 'fast' ? '快速' : k === 'slow' ? '慢速' : '标准';
    }

    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    function syncLbLevel() {
      if (lbPanel) lbPanel.setGame('snake_' + lv.key, 'sm_snake_runs_' + lv.key);
    }

    /* ---------- 存档 ---------- */
    function saveState() {
      if (gameOver || finished) return;
      try {
        localStorage.setItem(SAVE_KEY, JSON.stringify({
          lv: lv.key, snake: snake, dir: dir, food: food,
          score: score, eaten: eaten, tickMs: tickMs
        }));
      } catch (e) {}
    }
    function loadState() {
      try {
        var s = JSON.parse(localStorage.getItem(SAVE_KEY) || 'null');
        var ok = s && Array.isArray(s.snake) && s.snake.length >= 3 &&
          s.snake.every(function (c) { return c && typeof c.x === 'number' && typeof c.y === 'number'; }) &&
          s.food && typeof s.food.x === 'number' && LEVELS[s.lv];
        if (s && ok) return s;
      } catch (e) {}
      return null;
    }
    function clearState() {
      try { localStorage.removeItem(SAVE_KEY); } catch (e) {}
    }

    /* ---------- 逻辑 ---------- */
    function occupied(x, y) {
      for (var i = 0; i < snake.length; i++) {
        if (snake[i].x === x && snake[i].y === y) return true;
      }
      return false;
    }

    function placeFood() {
      var free = [];
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          if (!occupied(x, y)) free.push({ x: x, y: y });
        }
      }
      if (!free.length) { food = null; return; }
      food = free[Math.floor(Math.random() * free.length)];
    }

    function resetGame() {
      var cx = Math.floor(COLS / 2), cy = Math.floor(ROWS / 2);
      snake = [{ x: cx, y: cy }, { x: cx - 1, y: cy }, { x: cx - 2, y: cy }];
      dir = { x: 1, y: 0 };
      nextDir = { x: 1, y: 0 };
      score = 0; eaten = 0; tickMs = lv.tick;
      gameOver = false; paused = false;
      placeFood();
      saveState();
    }

    function step() {
      if (!running || paused || gameOver || destroyed) return;

      // 应用方向（禁止 180 度掉头）
      if (nextDir.x !== -dir.x || nextDir.y !== -dir.y) dir = nextDir;

      var head = snake[0];
      var nx = head.x + dir.x, ny = head.y + dir.y;

      // 撞墙
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS) { endGame(); return; }
      // 撞自己（尾巴即将移开的那一格不算）
      var willGrow = food && nx === food.x && ny === food.y;
      var limit = willGrow ? snake.length : snake.length - 1;
      for (var i = 0; i < limit; i++) {
        if (snake[i].x === nx && snake[i].y === ny) { endGame(); return; }
      }

      snake.unshift({ x: nx, y: ny });
      if (willGrow) {
        score += FOOD_SCORE;
        eaten++;
        // 每吃 5 个提速一档，下限 90ms；立即重建定时器让新速度生效
        if (eaten % 5 === 0) {
          tickMs = Math.max(90, tickMs - 20);
          scheduleTick();
        }
        if (window.SFX && window.SFX.select) window.SFX.select();
        placeFood();
        if (!food) { endGame(); return; }   // 满屏也算通关
      } else {
        snake.pop();
      }
      saveStateThrottled();
      draw();
      updateHud();
    }

    /* 每走一步都同步写 localStorage 会卡（序列化 + 磁盘 I/O）。
       改为最多 500ms 存一次；暂停 / 结束 / 切走时再强制存一次。 */
    var lastSaveAt = 0;
    function saveStateThrottled() {
      var now = performance.now();
      if (now - lastSaveAt < 500) return;
      lastSaveAt = now;
      saveState();
    }

    function scheduleTick() {
      if (timerId) clearInterval(timerId);
      if (!running || paused || gameOver || destroyed) return;
      timerId = setInterval(step, tickMs);
    }

    function restartTimer() {
      // 提速后重建 interval，让新速度立即生效
      scheduleTick();
    }

    /* ---------- 渲染 ---------- */
    /* 棋盘格底纹只在进入游戏时画一次，存成离屏 canvas；
       每帧 draw 直接贴图，不再循环 400 次 fillRect。 */
    function buildBoardBg(cell) {
      var bg = document.createElement('canvas');
      bg.width = COLS * cell;
      bg.height = ROWS * cell;
      var bctx = bg.getContext('2d');
      var light = document.documentElement.getAttribute('data-theme') === 'light';
      bctx.fillStyle = light ? '#FFFDF7' : '#1A1722';
      bctx.fillRect(0, 0, bg.width, bg.height);
      bctx.fillStyle = light ? 'rgba(90,72,42,0.055)' : 'rgba(255,255,255,0.025)';
      for (var y = 0; y < ROWS; y++) {
        for (var x = 0; x < COLS; x++) {
          if ((x + y) % 2 === 0) bctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
      return bg;
    }

    var canvasEl = null, ctx = null, boardBg = null, cellPx = 0;

    function ensureCanvas() {
      var c = el.querySelector('#snakeCanvas');
      if (!c) return false;
      if (c !== canvasEl) {
        canvasEl = c;
        ctx = c.getContext('2d');
        cellPx = c.width / COLS;
        boardBg = buildBoardBg(cellPx);
      }
      return true;
    }

    function draw() {
      if (!ensureCanvas()) return;
      var cell = cellPx;
      // 贴棋盘底图（一次 drawImage 替代 400 次 fillRect）
      if (boardBg) ctx.drawImage(boardBg, 0, 0);
      else ctx.clearRect(0, 0, canvasEl.width, canvasEl.height);
      var light = document.documentElement.getAttribute('data-theme') === 'light';

      // 食物：圆形 + 外发光
      if (food) {
        var fx = food.x * cell + cell / 2;
        var fy = food.y * cell + cell / 2;
        var fr = cell * 0.34;
        ctx.save();
        ctx.shadowColor = 'rgba(245,158,11,0.8)';
        ctx.shadowBlur = cell * 0.8;
        ctx.fillStyle = '#F59E0B';
        ctx.beginPath();
        ctx.arc(fx, fy, fr, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      /* 蛇身：用连续路径画一条粗细渐变的「管子」，
         比逐格圆角方块更能看出走向；头部单独画成带眼睛的圆。
         这样玩家一眼能分清头在哪、身体朝哪边拐。 */
      if (snake.length) {
        // 1) 身体：从头到尾逐段画圆，半径递减，用同色叠加形成连续感
        var bodyRGB = light ? '124,58,237' : '139,92,246';   // 浅色主题用更深的紫
        for (var i = snake.length - 1; i >= 1; i--) {
          var seg = snake[i];
          var t = i / Math.max(1, snake.length - 1);
          var cx = seg.x * cell + cell / 2;
          var cy = seg.y * cell + cell / 2;
          var r = cell * (0.46 - t * 0.16);          // 头粗尾细
          ctx.beginPath();
          ctx.arc(cx, cy, r, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + bodyRGB + ',' + (0.95 - t * 0.42).toFixed(3) + ')';
          ctx.fill();
        }
        // 2) 连接段：在相邻两节之间补一个矩形，填掉圆之间的缝
        for (var j = 0; j < snake.length - 1; j++) {
          var a1 = snake[j], a2 = snake[j + 1];
          var x1 = a1.x * cell + cell / 2, y1 = a1.y * cell + cell / 2;
          var x2 = a2.x * cell + cell / 2, y2 = a2.y * cell + cell / 2;
          var t2 = j / Math.max(1, snake.length - 1);
          var w = cell * (0.92 - t2 * 0.32);
          ctx.strokeStyle = 'rgba(' + bodyRGB + ',' + (0.95 - t2 * 0.42).toFixed(3) + ')';
          ctx.lineWidth = w;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(x1, y1);
          ctx.lineTo(x2, y2);
          ctx.stroke();
        }

        // 3) 头：更大的圆 + 两只眼睛（朝行进方向），明显区别于身体
        var head = snake[0];
        var hx = head.x * cell + cell / 2;
        var hy = head.y * cell + cell / 2;
        var hr = cell * 0.5;

        ctx.save();
        ctx.shadowColor = 'rgba(167,139,250,0.7)';
        ctx.shadowBlur = cell * 0.6;
        ctx.beginPath();
        ctx.arc(hx, hy, hr, 0, Math.PI * 2);
        ctx.fillStyle = light ? '#8B5CF6' : '#A78BFA';
        ctx.fill();
        ctx.restore();

        // 眼睛：垂直于行进方向各一只，眼白 + 深色瞳孔
        var ex = -dir.y, ey = dir.x;               // 垂直方向
        var eyeOff = cell * 0.19;
        var forward = cell * 0.14;
        var eyeR = cell * 0.11;
        var pupR = cell * 0.055;
        for (var e = -1; e <= 1; e += 2) {
          var ox = hx + ex * eyeOff * e + dir.x * forward;
          var oy = hy + ey * eyeOff * e + dir.y * forward;
          ctx.beginPath();
          ctx.arc(ox, oy, eyeR, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
          ctx.beginPath();
          ctx.arc(ox + dir.x * eyeR * 0.35, oy + dir.y * eyeR * 0.35, pupR, 0, Math.PI * 2);
          ctx.fillStyle = '#1E1B26';
          ctx.fill();
        }

        // 4) 头部朝向的小触角（一条短粗线，强化方向感）
        ctx.strokeStyle = 'rgba(196,181,253,0.9)';
        ctx.lineWidth = cell * 0.10;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(hx + dir.x * hr * 0.55, hy + dir.y * hr * 0.55);
        ctx.lineTo(hx + dir.x * hr * 1.15, hy + dir.y * hr * 1.15);
        ctx.stroke();
      }
    }

    function updateHud() {
      var s = el.querySelector('#snakeScore'); if (s) s.textContent = score;
      var l = el.querySelector('#snakeLen'); if (l) l.textContent = snake.length;
      var sp = el.querySelector('#snakeSpeed'); if (sp) sp.textContent = tickMs + 'ms';
    }

    /* ---------- 暂停 ---------- */
    function setPaused(p) {
      paused = p;
      var btn = el.querySelector('#snakePause');
      if (btn) btn.textContent = p ? '▶ 继续' : '⏸ 暂停';
      var ov = el.querySelector('#snakePauseOverlay');
      if (ov) ov.classList.toggle('is-active', p);
      if (p) {
        if (timerId) { clearInterval(timerId); timerId = 0; }
        lastSaveAt = 0;
        saveState();
      }
      else scheduleTick();
    }
    function togglePause() {
      if (!running || gameOver || finished) return;
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      setPaused(!paused);
    }

    function onKeyDown(e) {
      if (destroyed || !running) return;
      var scr = document.querySelector('.sm-screen.active');
      if (!scr || scr.id !== 'scr-sm-snake') return;
      var k = e.key;
      if (k === ' ' || k === 'p' || k === 'P') { e.preventDefault(); togglePause(); return; }
      if (paused || gameOver || finished) return;
      if (k === 'ArrowUp' || k === 'w' || k === 'W') { e.preventDefault(); nextDir = { x: 0, y: -1 }; }
      else if (k === 'ArrowDown' || k === 's' || k === 'S') { e.preventDefault(); nextDir = { x: 0, y: 1 }; }
      else if (k === 'ArrowLeft' || k === 'a' || k === 'A') { e.preventDefault(); nextDir = { x: -1, y: 0 }; }
      else if (k === 'ArrowRight' || k === 'd' || k === 'D') { e.preventDefault(); nextDir = { x: 1, y: 0 }; }
    }

    /* ---------- 开始页 ---------- */
    function intro() {
      var saved = loadState();
      var savedLv = saved ? LEVELS[saved.lv] : null;
      el.innerHTML = hud('<b>贪吃蛇</b>', '三档速度各排各的榜') +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">贪吃蛇</div>' +
        '<div class="rz-sub">方向键 / WASD 控制 · 空格暂停<br>' +
        '吃食物变长加分，撞墙或撞自己结束。进度自动存档。</div>' +
        '<div class="ms-levels" style="margin-top:20px;justify-content:center">' +
        ['slow', 'normal', 'fast'].map(function (k) {
          return '<button type="button" class="ms-lv' + (lv.key === k ? ' active' : '') +
            '" data-lv="' + k + '">' + LEVELS[k].name + '</button>';
        }).join('') +
        '</div>' +
        (saved ? '<button class="btn accent" id="snakeResume" style="margin-top:18px;width:auto;padding:12px 34px">继续上局（' +
          saved.score + ' 分 · ' + saved.snake.length + ' 节）</button>' : '') +
        '<button class="btn' + (saved ? '' : ' accent') + '" id="snakeNew" style="margin-top:12px;width:auto;padding:12px 34px">新开一局</button>' +
        '</div>';

      el.querySelectorAll('[data-lv]').forEach(function (b) {
        b.onclick = function () {
          var k = b.getAttribute('data-lv');
          if (k === lv.key) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          lv = LEVELS[k];
          syncLbLevel();
          intro();
        };
      });
      var resumeBtn = el.querySelector('#snakeResume');
      if (resumeBtn) resumeBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        var s = loadState();
        if (!s) { intro(); return; }
        lv = LEVELS[s.lv];
        snake = s.snake; dir = s.dir; nextDir = s.dir; food = s.food;
        score = s.score; eaten = s.eaten || 0; tickMs = s.tickMs || lv.tick;
        gameOver = false; paused = false;
        syncLbLevel();
        startPlay();
      };
      var newBtn = el.querySelector('#snakeNew');
      if (newBtn) newBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        resetGame();
        syncLbLevel();
        startPlay();
      };
    }

    function startPlay() {
      paused = false; running = true; gameOver = false; finished = false;
      el.innerHTML = hud('<b>贪吃蛇 · ' + lv.name + '</b>',
        '<span class="ms-stat">⭐ <span id="snakeScore">' + score + '</span></span>' +
        '<span class="ms-stat">🐍 <span id="snakeLen">' + snake.length + '</span> 节</span>' +
        '<span class="ms-stat">⚡ <span id="snakeSpeed">' + tickMs + '</span>ms</span>') +
        '<div class="snake-layout">' +
        '<div class="snake-stage-wrap">' +
        '<canvas id="snakeCanvas" width="480" height="480" class="snake-canvas"></canvas>' +
        '<div class="snake-pause-overlay" id="snakePauseOverlay"><div>⏸ 已暂停<br><small>按空格或点「继续」</small></div></div>' +
        '</div>' +
        '<div class="snake-side">' +
        '<button type="button" class="tt-btn" id="snakePause">⏸ 暂停</button>' +
        '<button type="button" class="tt-btn" id="snakeRestart">↻ 重开</button>' +
        '<div class="tt-keys">方向键 / WASD 移动<br>空格 暂停</div>' +
        '</div></div>';
      updateHud();
      draw();
      var pauseBtn = el.querySelector('#snakePause');
      if (pauseBtn) pauseBtn.onclick = function (e) { e.stopPropagation(); togglePause(); };
      var restartBtn = el.querySelector('#snakeRestart');
      if (restartBtn) restartBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        stopTimer();
        resetGame();
        startPlay();
      };
      scheduleTick();
    }

    function stopTimer() {
      if (timerId) { clearInterval(timerId); timerId = 0; }
    }

    function endGame() {
      gameOver = true;
      running = false;
      stopTimer();
      clearState();
      if (window.SFX && window.SFX.wrong) window.SFX.wrong();
      if (lbPanel && score > 0) {
        lbPanel.submit({ score: score, length: snake.length, lv: lv.key });
      }
      finish();
    }

    function finish() {
      var certs = window.SM_DATA.snake.certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        if (score >= certs[i].min) { cert = certs[i]; break; }
      }
      onFinish({
        icon: cert.icon, name: cert.name,
        tag: score + ' 分 · ' + snake.length + ' 节 · ' + lv.name,
        text: cert.text + ' 本局吃了 ' + eaten + ' 个食物，蛇身长到 ' + snake.length + ' 节。',
        big: { label: '总分', value: score + ' <small>分</small>' },
        bars: [
          { label: '蛇身长度', pct: Math.min(100, Math.round((snake.length - 3) / 60 * 100)), hi: true },
          { label: '进食效率', pct: Math.min(100, Math.round(eaten / 30 * 100)) }
        ],
        blocks: [
          { h: '怎么练', text: '别贴墙走——留出回旋空间；长蛇之后尽量走「之」字，避免把自己围死。' }
        ],
        quip: window.SM_DATA.snake.disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, score: score, length: snake.length, lv: lv.key }
      });
    }

    function bindKeyboard() {
      window.addEventListener('keydown', onKeyDown);
    }

    intro();
    syncLbLevel();
    mountLbHost();
    bindKeyboard();
    return {
      destroy: function () {
        // 切走前把最新进度落盘（节流可能还没写）
        if (running && !gameOver && !finished) saveState();
        destroyed = true;
        running = false;
        stopTimer();
        window.removeEventListener('keydown', onKeyDown);
        if (lbPanel) lbPanel.destroy();
      }
    };
  };

  /* ==================================================================
   * 15 泡泡猫泡泡龙
   * 机制参考 rembound/Bubble-Shooter-HTML5（MIT），按项目模块风格重写：
   * 六边形网格 + 发射碰撞 + 同色三连消除 + 失去支撑坠落 + 定时下沉。
   * 猫咪素材为项目原创生成；UI 按钮取自 pzUH Bubble Button Pack（CC0）。
   * ================================================================== */
  window.startBubbleCat = function (root, onFinish) {
    var el = makeRoot(root);
    var destroyed = false, finished = false;

    var W = 480, H = 640;
    var CEIL_H = 20;                 // 天花板细边轨高度（球堆尽量贴顶）
    var COLS = 11;                   // 宽行泡泡数（窄行 10，整体右移半格）
    var TILE_D = W / COLS;           // 泡泡直径
    var R = TILE_D / 2;
    var ROW_H = TILE_D * 0.866;      // 六边形行距
    var DANGER_Y = 486;              // 警戒线：泡泡压过即结束
    var LAUNCH = { x: W / 2, y: 520 };   /* 猫头顶上方：别盖住脸 */
    var SPEED = 950;                 // 泡泡飞行速度 px/s
    var SINK_BASE = 6;               // 开局几发下沉一次（随波数加快，下限 3）
    /* 双难度：简单=警戒线固定（错球下堆仍可输）；挑战=警戒线上移 */
    var MODES = {
      easy: { key: 'easy', name: '简单', desc: '警戒线固定不动，适合休闲热手' },
      hard: { key: 'hard', name: '挑战', desc: '警戒线步步紧逼，全服榜主战场' }
    };
    var dif = MODES.hard;   /* 默认挑战模式：警戒线上移，更符合“泡泡龙”的难度预期 */
    var EMPTY = 0, RAINBOW = 7;

    /* 糖果 6 色（与素材总览一致）：[暗边, 亮部, 主色] */
    var PALETTE = [
      { dark: '#C4435B', light: '#FFD3DA', base: '#FF6B81' },
      { dark: '#E8770E', light: '#FFE3BF', base: '#FFA94D' },
      { dark: '#D9A404', light: '#FFF3BF', base: '#FFD43B' },
      { dark: '#2F9E44', light: '#C3FAD0', base: '#51CF66' },
      { dark: '#1971C2', light: '#C5E3FF', base: '#4DABF7' },
      { dark: '#6741D9', light: '#E5DBFF', base: '#9775FA' }
    ];

    /* ---------- 榜单 ---------- */
    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'bubble_easy',
      storeKey: 'sm_bubble_runs_easy',
      higher: true,
      idPrefix: 'lbbubble',
      formatScore: function (v) { return v + ' 分'; },
      describe: function (run) {
        return { score: run.score, extra: { wave: run.wave, popped: run.popped, lv: dif.key } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">第 ' + (r.wave || 1) + ' 波</span>',
          '<span class="lb-meta">消 ' + (r.popped || 0) + ' 颗</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.lv) === 'hard' ? '挑战' : '简单') + '</span>'
        ];
      }
    }) : null;
    function mountLbHost() {
      mountLbHostFor(lbPanel, root, el);
    }

    function syncLbMode() {
      if (lbPanel) lbPanel.setGame('bubble_' + dif.key, 'sm_bubble_runs_' + dif.key);
    }

    /* ---------- 状态 ---------- */
    var rows = [];          // rows[i][c] ∈ 0(空) | 1..6(色) | 7(彩虹)
    var evenTop = true;     // 第 0 行是否为宽行（每次下沉翻转）
    var cur = 1, next = 2;  // 待发 / 下一颗（1..6，7=彩虹）
    var score = 0, waves = 1, poppedTotal = 0;
    var shotsUntilSink = 6, sinkEvery = 6;
    var streak = 0;         // 连消次数（连续有消除的发射数）
    var sinkCount = 0;      // 警戒线已上抬的行数
    var mode = 'intro';     // intro | play | over
    var paused = false;
    var flying = null;      // {x,y,vx,vy,v}
    var aimA = Math.PI / 2;
    var catPose = 'idle', poseUntil = 0;
    var particles = [], texts = [];
    var sinkT = 1;          // 下沉动画进度 0→1（1=静止）
    var canvasEl = null, ctx = null, skyCv = null;
    var rafId = 0, lastTs = 0;
    var sprites = {};       // 泡泡预渲染图

    /* 猫咪立绘（进入章节即开始预载） */
    var catImgs = {};
    ['idle', 'shoot', 'cheer'].forEach(function (k) {
      var im = new Image();
      im.src = 'assets/bubble-cat/cat_' + k + '.webp';
      catImgs[k] = im;
    });

    /* ---------- 网格几何 ---------- */
    function isWide(i) { return (i % 2 === 0) === evenTop; }
    function rowWidth(i) { return isWide(i) ? COLS : COLS - 1; }
    function cellX(i, c) { return R + c * TILE_D + (isWide(i) ? 0 : R); }
    function cellY(i) { return CEIL_H + R + i * ROW_H; }
    function ensureRow(i) {
      while (rows.length <= i) rows.push(new Array(rowWidth(rows.length)).fill(EMPTY));
    }
    function getCell(i, c) {
      if (i < 0 || !rows[i] || c < 0 || c >= rows[i].length) return EMPTY;
      return rows[i][c];
    }
    /* 相邻六格：宽行的上下行是窄行 → (c-1, c)；窄行的上下行是宽行 → (c, c+1) */
    function neighborsOf(i, c) {
      var a = isWide(i) ? c - 1 : c;
      var b = isWide(i) ? c : c + 1;
      return [[i, c - 1], [i, c + 1], [i - 1, a], [i - 1, b], [i + 1, a], [i + 1, b]];
    }

    /* ---------- 关卡配色：波数越高颜色越多 ---------- */
    function paletteCount() { return Math.min(6, 3 + Math.ceil(waves / 3)); }
    function activeColors() {
      var limit = paletteCount(), present = {};
      rows.forEach(function (row) {
        row.forEach(function (v) { if (v >= 1 && v <= 6) present[v] = 1; });
      });
      var list = [];
      for (var v = 1; v <= limit; v++) if (present[v]) list.push(v);
      if (!list.length) for (var w = 1; w <= limit; w++) list.push(w);
      return list;
    }
    function rollBubble(other) {
      /* 彩虹概率 6%，且不与待发位上的另一颗连珠 */
      if (Math.random() < 0.06 && other !== RAINBOW) return RAINBOW;
      var list = activeColors();
      return list[Math.floor(Math.random() * list.length)];
    }

    /* ---------- 布局 ---------- */
    function resetGame() {
      rows = [];
      evenTop = true;
      for (var i = 0; i < 5; i++) {
        rows.push(new Array(rowWidth(i)).fill(EMPTY));
        for (var c = 0; c < rowWidth(i); c++) {
          rows[i][c] = 1 + Math.floor(Math.random() * 4);   // 开局 4 色，好上手
        }
      }
      score = 0; waves = 1; poppedTotal = 0; sinkCount = 0;
      shotsUntilSink = SINK_BASE; sinkEvery = SINK_BASE;
      streak = 0; cur = rollBubble(0); next = rollBubble(cur);
      flying = null; particles = []; texts = []; sinkT = 1;
      catPose = 'idle';
    }

    /* 警戒线当前 y：每 sink 一次上抬一行。球堆本身不再下插空行，
       「失去支撑」的锚点恒为紧贴天花板的第 0 行——
       之前在顶部插空行会导致锚点丢失、整堆被误判坠落、无限清屏。 */
    function dangerLineY() {
      return DANGER_Y - sinkCount * ROW_H;
    }

    /* 场上是否还有泡泡压到警戒线。判定只看「结算后的盘面」，
       不看落点：这一发如果把压线的球消掉了，就该继续打（极限消除） */
    function bubbleCrossesLine() {
      for (var i = 0; i < rows.length; i++) {
        for (var c = 0; c < rows[i].length; c++) {
          if (rows[i][c] && CEIL_H + R + i * ROW_H + R >= dangerLineY()) return true;
        }
      }
      return false;
    }

    function doSink() {
      waves++;
      sinkEvery = Math.max(3, SINK_BASE - Math.floor(waves / 4));
      shotsUntilSink = sinkEvery;
      if (dif.key !== 'hard') return;   // 简单模式：只升颜色档，警戒线固定
      sinkCount++;
      sinkT = 0;   // 上抬动画
      // 空间耗尽：警戒线顶到天花板附近
      if (dangerLineY() <= CEIL_H + 2 * R) { endGame(); return; }
      // 任何泡泡碰到警戒线即结束
      if (bubbleCrossesLine()) endGame();
    }

    /* ---------- 泡泡贴图预渲染 ---------- */
    function hexA(hex, a) {
      var n = parseInt(hex.slice(1), 16);
      return 'rgba(' + ((n >> 16) & 255) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
    }
    function makeSprite(v, r) {
      var S = Math.ceil(r * 2 + 4);
      var cv = document.createElement('canvas');
      cv.width = S; cv.height = S;
      var g = cv.getContext('2d');
      var cx = S / 2, cy = S / 2;
      if (v === RAINBOW) {
        var seg = (Math.PI * 2) / 6;
        for (var k = 0; k < 6; k++) {
          g.beginPath();
          g.moveTo(cx, cy);
          g.arc(cx, cy, r * 0.94, k * seg - Math.PI / 2, (k + 1) * seg - Math.PI / 2);
          g.closePath();
          g.fillStyle = PALETTE[k].base;
          g.fill();
        }
        g.fillStyle = 'rgba(255,255,255,0.30)';
        g.beginPath(); g.arc(cx, cy, r * 0.94, 0, Math.PI * 2); g.fill();
        g.strokeStyle = 'rgba(255,255,255,0.85)';
        g.lineWidth = Math.max(1.5, r * 0.10);
        g.beginPath(); g.arc(cx, cy, r * 0.94 - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
      } else {
        var pal = PALETTE[v - 1];
        var grad = g.createRadialGradient(cx - r * 0.38, cy - r * 0.42, r * 0.12, cx, cy, r * 1.02);
        grad.addColorStop(0, pal.light);
        grad.addColorStop(0.5, pal.base);
        grad.addColorStop(1, pal.dark);
        g.fillStyle = grad;
        g.beginPath(); g.arc(cx, cy, r, 0, Math.PI * 2); g.fill();
        g.strokeStyle = hexA(pal.dark, 0.45);
        g.lineWidth = Math.max(1.5, r * 0.09);
        g.beginPath(); g.arc(cx, cy, r - g.lineWidth / 2, 0, Math.PI * 2); g.stroke();
      }
      /* 高光：斜椭圆 + 小圆点 + 底部反光，玻璃球质感 */
      g.fillStyle = 'rgba(255,255,255,0.92)';
      g.beginPath();
      g.ellipse(cx - r * 0.34, cy - r * 0.42, r * 0.30, r * 0.17, -0.55, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = 'rgba(255,255,255,0.55)';
      g.beginPath(); g.arc(cx + r * 0.30, cy - r * 0.44, r * 0.09, 0, Math.PI * 2); g.fill();
      g.fillStyle = 'rgba(255,255,255,0.20)';
      g.beginPath();
      g.ellipse(cx + r * 0.06, cy + r * 0.54, r * 0.34, r * 0.13, 0.2, 0, Math.PI * 2);
      g.fill();
      return cv;
    }
    function buildSprites() {
      for (var v = 1; v <= 6; v++) {
        sprites[v] = makeSprite(v, R);
        sprites['s' + v] = makeSprite(v, 15);
      }
      sprites[RAINBOW] = makeSprite(RAINBOW, R);
      sprites['s' + RAINBOW] = makeSprite(RAINBOW, 15);
    }

    /* ---------- 静态背景（天空 / 天花板 / 草地 / 警戒线） ---------- */
    function buildSky() {
      var cv = document.createElement('canvas');
      cv.width = W; cv.height = H;
      var g = cv.getContext('2d');
      var grad = g.createLinearGradient(0, 0, 0, H);
      grad.addColorStop(0, '#A5D8FF');
      grad.addColorStop(0.55, '#D0BFFF');
      grad.addColorStop(1, '#FFDEEB');
      g.fillStyle = grad;
      g.fillRect(0, 0, W, H);
      /* 云 */
      g.fillStyle = 'rgba(255,255,255,0.75)';
      [[70, 300, 1], [410, 360, 1.2], [50, 420, 0.7]].forEach(function (cl) {
        var cx = cl[0], cy = cl[1], s = cl[2];
        g.beginPath();
        g.ellipse(cx, cy, 46 * s, 17 * s, 0, 0, Math.PI * 2);
        g.ellipse(cx + 22 * s, cy - 10 * s, 26 * s, 13 * s, 0, 0, Math.PI * 2);
        g.fill();
      });
      /* 草地 */
      g.fillStyle = '#8CE99A';
      g.beginPath(); g.ellipse(W / 2 - 150, H + 34, 250, 78, 0, 0, Math.PI * 2); g.fill();
      g.fillStyle = '#69DB7C';
      g.beginPath(); g.ellipse(W / 2 + 150, H + 40, 260, 84, 0, 0, Math.PI * 2); g.fill();
      /* 天花板：细边轨 */
      g.fillStyle = '#748FFC';
      g.fillRect(0, 0, W, CEIL_H);
      g.fillStyle = '#5F7BEA';
      g.fillRect(0, CEIL_H, W, 4);
      g.fillStyle = 'rgba(255,255,255,0.35)';
      for (var x = 15; x < W; x += 30) {
        g.beginPath(); g.arc(x, 10, 2.5, 0, Math.PI * 2); g.fill();
      }
      return cv;
    }

    /* ---------- 逻辑 ---------- */
    function snapCell(px, py) {
      var best = null, bestD = 1e9;
      var lim = TILE_D * 1.15, lim2 = lim * lim;
      /* 上限必须先取值：ensureRow 会让 rows.length 增长，
         写成 i <= rows.length 会导致循环条件永远成立、无限推行直到崩溃 */
      var maxRow = rows.length;
      for (var i = 0; i <= maxRow; i++) {
        ensureRow(i);
        for (var c = 0; c < rowWidth(i); c++) {
          if (rows[i][c]) continue;
          var dx = cellX(i, c) - px, dy = (CEIL_H + R + i * ROW_H) - py;
          var d2 = dx * dx + dy * dy;
          if (d2 < bestD && d2 < lim2) { bestD = d2; best = [i, c]; }
        }
      }
      return best;
    }

    /* 从落点出发，按 target 色搜连通块；彩虹(7)恒为万能牌参与 */
    function collectColor(si, sc, target) {
      var seen = {}, stack = [[si, sc]], out = [];
      seen[si + '_' + sc] = 1;
      while (stack.length) {
        var cur_ = stack.pop();
        out.push(cur_);
        neighborsOf(cur_[0], cur_[1]).forEach(function (n) {
          var key = n[0] + '_' + n[1];
          if (seen[key]) return;
          var g = getCell(n[0], n[1]);
          if (g === target || g === RAINBOW) { seen[key] = 1; stack.push(n); }
        });
      }
      return out.length >= 3 ? out : null;
    }

    function collectMatches(si, sc, v) {
      /* 彩球落子不锁色：对 6 种颜色各试一遍，取最大的连通块。
         只看「直接相邻最多的颜色」会漏掉一种情况——挨着的红球只有 1 颗，
         而蓝球虽然只挨着 1 颗、后面却连着一大片，锁红就白打了。
         6 种颜色都不足三连时返回 null，彩球原样留在场上继续当万能牌。 */
      if (v === RAINBOW) {
        var best = null;
        for (var c = 1; c <= 6; c++) {
          var got = collectColor(si, sc, c);
          if (got && (!best || got.length > best.length)) best = got;
        }
        return best;
      }
      return collectColor(si, sc, v);
    }

    function removeFloating() {
      var seen = {}, stack = [];
      if (rows[0]) {
        for (var c = 0; c < rows[0].length; c++) {
          if (rows[0][c]) { seen['0_' + c] = 1; stack.push([0, c]); }
        }
      }
      while (stack.length) {
        var cur_ = stack.pop();
        neighborsOf(cur_[0], cur_[1]).forEach(function (n) {
          var key = n[0] + '_' + n[1];
          if (seen[key] || !getCell(n[0], n[1])) return;
          seen[key] = 1;
          stack.push(n);
        });
      }
      var dropped = 0;
      for (var i = 0; i < rows.length; i++) {
        for (var cc = 0; cc < rows[i].length; cc++) {
          if (!rows[i][cc]) continue;
          if (seen[i + '_' + cc]) continue;
          particles.push({
            x: cellX(i, cc), y: CEIL_H + R + i * ROW_H,
            vx: (Math.random() - 0.5) * 120, vy: -60 - Math.random() * 60,
            v: rows[i][cc], life: 1.2
          });
          rows[i][cc] = EMPTY;
          dropped++;
        }
      }
      return dropped;
    }

    function spawnBurst(x, y, v) {
      var col = v === RAINBOW ? '#FFD43B' : PALETTE[v - 1].base;
      var lite = v === RAINBOW ? '#FFF3BF' : PALETTE[v - 1].light;
      for (var i = 0; i < 7; i++) {
        var a = (i / 7) * Math.PI * 2 + Math.random() * 0.8;
        var sp = 70 + Math.random() * 90;
        particles.push({
          x: x, y: y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 40,
          v: v, dot: true, col: i % 2 ? lite : col, life: 0.5
        });
      }
    }

    function addText(x, y, str, big) {
      texts.push({ x: x, y: y, str: str, life: 1, big: !!big });
    }

    function resolveShot(px, py, v) {
      var cell = snapCell(px, py);
      if (!cell) { endGame(); return; }
      rows[cell[0]][cell[1]] = v;
      var matches = collectMatches(cell[0], cell[1], v);
      var mx = cellX(cell[0], cell[1]), my = CEIL_H + R + cell[0] * ROW_H;
      var gained = 0, dropped = 0, poppedN = 0;
      if (matches) {
        streak++;
        var mult = Math.min(3, streak);
        poppedN = matches.length;
        matches.forEach(function (m) {
          spawnBurst(cellX(m[0], m[1]), CEIL_H + R + m[0] * ROW_H, v === RAINBOW ? RAINBOW : v);
          rows[m[0]][m[1]] = EMPTY;
        });
        dropped = removeFloating();
        gained = poppedN * 10 * mult + dropped * 20;
        score += gained;
        poppedTotal += poppedN + dropped;
        addText(mx, my, '+' + gained, mult > 1 || dropped > 0);
        if (mult > 1) addText(W / 2, my - 44, '连消 ×' + mult, true);
        if (dropped >= 4) { catPose = 'cheer'; poseUntil = performance.now() + 800; }
        if (window.SFX && window.SFX.select) window.SFX.select();
      } else {
        streak = 0;
      }
      /* 压线判定必须在消除 + 坠落之后看整片盘面：
         先判落点的话，一发把压线球清掉也照样算死，极限消除直接被吃掉 */
      if (bubbleCrossesLine()) { endGame(); return; }
      shotsUntilSink--;
      if (shotsUntilSink <= 0) {
        doSink();
        if (mode !== 'play') return;
      }
      /* 清屏奖励：整片清空补一批新泡泡，游戏继续 */
      var left = 0;
      rows.forEach(function (row) { row.forEach(function (v2) { if (v2) left++; }); });
      if (!left) {
        score += 200;
        addText(W / 2, 300, '清屏 +200', true);
        catPose = 'cheer'; poseUntil = performance.now() + 900;
        rows = [];
        evenTop = true;
        for (var i = 0; i < 4; i++) {
          rows.push(new Array(rowWidth(i)).fill(EMPTY));
          for (var c = 0; c < rowWidth(i); c++) {
            rows[i][c] = 1 + Math.floor(Math.random() * paletteCount());
          }
        }
        /* 清屏奖励：警戒线退回底部，补满活动空间（sinkT=1 跳过上移动画） */
        sinkCount = 0;
        sinkT = 1;
        shotsUntilSink = Math.max(shotsUntilSink, SINK_BASE);
      }
      /* 待发/预测球在发射时（onCanvasDown）已经推进过一次，
         这里不能再推进——否则预测球会在消除瞬间无故变颜色 */
      updateHud();
    }

    function endGame() {
      if (mode !== 'play') return;
      mode = 'over';
      flying = null;
      stopLoop();
      if (window.SFX && window.SFX.wrong) window.SFX.wrong();
      if (lbPanel && score > 0) {
        lbPanel.submit({ score: score, wave: waves, popped: poppedTotal });
      }
      finish(false);
    }

    /* 主动结算：玩家自行结束本局，成绩照常上榜 */
    function settleRun() {
      if (mode !== 'play' || finished) return;
      mode = 'over';
      flying = null;
      stopLoop();
      if (window.SFX && window.SFX.select) window.SFX.select();
      if (lbPanel && score > 0) {
        lbPanel.submit({ score: score, wave: waves, popped: poppedTotal });
      }
      finish(true);
    }

    function finish(voluntary) {
      var certs = window.SM_DATA.bubble.certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        if (score >= certs[i].min) { cert = certs[i]; break; }
      }
      onFinish({
        icon: cert.icon, name: cert.name,
        tag: (voluntary ? '主动结算 · ' : '') + score + ' 分 · ' + dif.name + ' · 第 ' + waves + ' 波 · 消除 ' + poppedTotal + ' 颗',
        text: cert.text + ' 本局共消除 ' + poppedTotal + ' 颗泡泡，坚持到第 ' + waves + ' 波。',
        big: { label: '总分', value: score + ' <small>分</small>' },
        bars: [
          { label: '消泡数', pct: Math.min(100, Math.round(poppedTotal / 120 * 100)), hi: true },
          { label: '坚持波数', pct: Math.min(100, Math.round(waves / 12 * 100)) }
        ],
        blocks: [
          { h: '怎么练', text: '优先打「断桥」：隔断某片泡泡与顶部的连接，让整串失去支撑一起坠落，比分颗消划算得多。' }
        ],
        quip: window.SM_DATA.bubble.disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, score: score, wave: waves, popped: poppedTotal, dif: dif.key }
      });
    }

    /* ---------- 帧循环 ---------- */
    function update(dt) {
      if (sinkT < 1) sinkT = Math.min(1, sinkT + dt / 0.5);
      if (catPose !== 'idle' && performance.now() > poseUntil) catPose = 'idle';
      if (flying) {
        flying.x += flying.vx * dt;
        flying.y += flying.vy * dt;
        if (flying.x < R + 2) { flying.x = R + 2; flying.vx = Math.abs(flying.vx); }
        if (flying.x > W - R - 2) { flying.x = W - R - 2; flying.vx = -Math.abs(flying.vx); }
        var hit = flying.y - R <= CEIL_H;
        if (!hit) {
          for (var i = 0; i < rows.length && !hit; i++) {
            for (var c = 0; c < rows[i].length; c++) {
              if (!rows[i][c]) continue;
              var dx = cellX(i, c) - flying.x, dy = (CEIL_H + R + i * ROW_H) - flying.y;
              if (dx * dx + dy * dy < TILE_D * 0.90 * (TILE_D * 0.90)) { hit = true; break; }
            }
          }
        }
        if (hit) {
          var fx = flying.x, fy = Math.max(flying.y, CEIL_H + R), fv = flying.v;
          flying = null;
          resolveShot(fx, fy, fv);
        }
      }
      particles = particles.filter(function (p) {
        p.life -= dt;
        if (p.life <= 0) return false;
        p.x += p.vx * dt; p.y += p.vy * dt;
        p.vy += (p.dot ? 260 : 900) * dt;
        return true;
      });
      texts = texts.filter(function (t) {
        t.life -= dt * 1.4;
        t.y -= 28 * dt;
        return t.life > 0;
      });
    }

    function draw() {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, H);
      if (skyCv) ctx.drawImage(skyCv, 0, 0);
      /* 球堆 */
      for (var i = 0; i < rows.length; i++) {
        for (var c = 0; c < rows[i].length; c++) {
          var v = rows[i][c];
          if (!v) continue;
          var sp = sprites[v];
          if (sp) ctx.drawImage(sp, cellX(i, c) - sp.width / 2, cellY(i) - sp.height / 2);
        }
      }
      /* 警戒线（随波数上移，带动画） */
      /* 匀速直线平移：缓出曲线起步太快，观感像「闪现在上面再往回蹭」 */
      var lineY = dangerLineY() + (sinkT < 1 ? (1 - sinkT) * ROW_H : 0);   /* 从旧位置(新位置+一行)向上滑入 */
      ctx.strokeStyle = 'rgba(224,70,70,0.75)';
      ctx.lineWidth = 2;
      ctx.setLineDash([10, 8]);
      ctx.beginPath(); ctx.moveTo(0, lineY); ctx.lineTo(W, lineY); ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = 'rgba(224,70,70,0.85)';
      ctx.font = 'bold 12px sans-serif';
      ctx.fillText('⚠ 警戒线', 8, lineY - 6);

      /* 瞄准虚线 */
      if (mode === 'play' && !paused && !flying && !finished) {
        var len = 118, step = 22, t0 = 30;
        ctx.fillStyle = 'rgba(255,255,255,0.85)';
        for (var d = t0; d <= len; d += step) {
          ctx.beginPath();
          ctx.arc(LAUNCH.x + Math.cos(aimA) * d, LAUNCH.y - Math.sin(aimA) * d, 4, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      /* 飞行泡泡 */
      if (flying) {
        var fsp = sprites[flying.v];
        if (fsp) ctx.drawImage(fsp, flying.x - fsp.width / 2, flying.y - fsp.height / 2);
      }
      /* 猫咪 */
      var img = catImgs[catPose] || catImgs.idle;
      if (img && img.complete && img.naturalWidth) {
        var ch = 100, cw = img.naturalWidth * ch / img.naturalHeight;
        ctx.drawImage(img, LAUNCH.x - cw / 2, H - ch - 4, cw, ch);
      }
      /* 待发泡泡 + 下一颗 */
      if (mode === 'play') {
        var csp = flying ? null : sprites[cur];
        if (csp) ctx.drawImage(csp, LAUNCH.x - csp.width / 2, LAUNCH.y - csp.height / 2);
        var nsp = sprites['s' + next];
        if (nsp) ctx.drawImage(nsp, W - 84 - nsp.width / 2, H - 46 - nsp.height / 2);
        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('下一颗', W - 84, H - 14);
        ctx.textAlign = 'left';
      }
      /* 粒子与飘字 */
      particles.forEach(function (p) {
        if (p.dot) {
          ctx.globalAlpha = Math.max(0, p.life / 0.5);
          ctx.fillStyle = p.col;
          ctx.beginPath(); ctx.arc(p.x, p.y, 4, 0, Math.PI * 2); ctx.fill();
        } else {
          var sp2 = sprites[p.v];
          if (sp2) {
            ctx.globalAlpha = Math.max(0, Math.min(1, p.life / 1.2));
            ctx.drawImage(sp2, p.x - sp2.width / 2, p.y - sp2.height / 2);
          }
        }
        ctx.globalAlpha = 1;
      });
      texts.forEach(function (t) {
        ctx.globalAlpha = Math.max(0, Math.min(1, t.life));
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = 'rgba(60,40,90,0.85)';
        ctx.lineWidth = 4;
        ctx.font = (t.big ? 'bold 26px' : 'bold 18px') + ' sans-serif';
        ctx.textAlign = 'center';
        ctx.strokeText(t.str, t.x, t.y);
        ctx.fillText(t.str, t.x, t.y);
        ctx.globalAlpha = 1;
        ctx.textAlign = 'left';
      });
    }

    function loop(ts) {
      rafId = 0;
      if (destroyed || mode !== 'play' || paused) return;
      var dt = Math.min((ts - lastTs) / 1000, 0.05);
      lastTs = ts;
      update(dt);
      draw();
      if (mode === 'play' && !paused) rafId = requestAnimationFrame(loop);
    }
    function stopLoop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }
    function ensureLoop() {
      if (!rafId && mode === 'play' && !paused && !destroyed) {
        lastTs = performance.now();
        rafId = requestAnimationFrame(loop);
      }
    }

    /* ---------- HUD / 暂停 ---------- */
    function updateHud() {
      var s = el.querySelector('#bcScore'); if (s) s.textContent = score;
      var w = el.querySelector('#bcWave'); if (w) w.textContent = waves;
      var n = el.querySelector('#bcSink'); if (n) n.textContent = shotsUntilSink;
      var b = el.querySelector('#bcPop'); if (b) b.textContent = poppedTotal;
    }

    function setPaused(p) {
      paused = p;
      var btn = el.querySelector('#bcPause');
      if (btn) btn.innerHTML = '<img src="assets/bubble-cat/btn_' + (p ? 'play' : 'pause') +
        '.webp" alt="' + (p ? '继续' : '暂停') + '">';
      var ov = el.querySelector('#bcPauseOverlay');
      if (ov) ov.classList.toggle('is-active', p);
      if (p) {
      } else {
        lastTs = performance.now();
        ensureLoop();
      }
    }
    function togglePause() {
      if (mode !== 'play' || finished) return;
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      setPaused(!paused);
    }

    function onKeyDown(e) {
      if (destroyed || mode !== 'play') return;
      var scr = document.querySelector('.sm-screen.active');
      if (!scr || scr.id !== 'scr-sm-bubble') return;
      var k = e.key;
      if (k === ' ' || k === 'p' || k === 'P') { e.preventDefault(); togglePause(); }
    }

    function aimFromEvent(e) {
      var rect = canvasEl.getBoundingClientRect();
      var sx = W / rect.width;
      var x = (e.clientX - rect.left) * sx;
      var y = (e.clientY - rect.top) * sx;
      var a = Math.atan2(LAUNCH.y - y, x - LAUNCH.x);
      if (!isFinite(a)) return;
      aimA = Math.max(0.30, Math.min(Math.PI - 0.30, a));
    }
    function onCanvasDown(e) {
      if (mode !== 'play' || paused || flying || sinkT < 1 || finished) return;
      aimFromEvent(e);
      flying = {
        x: LAUNCH.x, y: LAUNCH.y,
        vx: Math.cos(aimA) * SPEED, vy: -Math.sin(aimA) * SPEED,
        v: cur
      };
      cur = next;
      next = rollBubble(cur);
      catPose = 'shoot';
      poseUntil = performance.now() + 260;
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      updateHud();
      ensureLoop();
    }

    /* ---------- 开始页 ---------- */
    function intro() {
      mode = 'intro';
      el.innerHTML = hud('<b>泡泡猫泡泡龙</b>', '无尽计分') +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">泡泡猫泡泡龙</div>' +
        '<div class="rz-sub">移动指针瞄准，点击 / 轻触发射<br>' +
        '同色三连即消除，断桥坠落加分更多。简单模式警戒线固定，挑战模式步步紧逼。</div>' +
        '<div class="ms-levels" style="margin-top:18px;justify-content:center">' +
        ['easy', 'hard'].map(function (k) {
          return '<button type="button" class="ms-lv' + (dif.key === k ? ' active' : '') +
            '" data-dif="' + k + '">' + MODES[k].name + '</button>';
        }).join('') +
        '</div>' +
        '<div class="text-small text-muted" style="margin-top:6px" id="bcDifDesc">' + dif.desc + '</div>' +
        '<button class="btn accent" id="bcNew" style="margin-top:18px;width:auto;padding:12px 34px">新开一局</button>' +
        '</div>';
      el.querySelectorAll('[data-dif]').forEach(function (b) {
        b.onclick = function (e) {
          e.stopPropagation();
          var k = b.getAttribute('data-dif');
          if (k === dif.key) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          dif = MODES[k];
          var desc = el.querySelector('#bcDifDesc');
          if (desc) desc.textContent = dif.desc;
          syncLbMode();
          intro();
        };
      });
      var newBtn = el.querySelector('#bcNew');
      if (newBtn) newBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        resetGame();
        startPlay();
      };
    }

    function startPlay() {
      mode = 'play';
      paused = false; finished = false;
      flying = null; particles = []; texts = []; sinkT = 1;
      catPose = 'idle';
      el.innerHTML = hud('<b>泡泡猫 · ' + dif.name + ' · 第 <span id="bcWave">' + waves + '</span> 波</b>',
        '<span class="ms-stat">⭐ <span id="bcScore">' + score + '</span></span>' +
        (dif.key === 'hard'
          ? '<span class="ms-stat">🫧 <span id="bcSink">' + shotsUntilSink + '</span> 发后下沉</span>'
          : '<span class="ms-stat">🌊 警戒线固定</span>') +
        '<span class="ms-stat">💥 已消 <span id="bcPop">' + poppedTotal + '</span></span>') +
        '<div class="bc-layout">' +
        '<div class="bc-stage-wrap">' +
        '<canvas id="bcCanvas" width="' + W + '" height="' + H + '" class="bc-canvas"></canvas>' +
        '<div class="bc-float">' +
        '<button type="button" class="bc-imgbtn" id="bcPause"><img src="assets/bubble-cat/btn_pause.webp" alt="暂停"></button>' +
        '<button type="button" class="bc-imgbtn" id="bcRestart"><img src="assets/bubble-cat/btn_refresh.webp" alt="重开"></button>' +
        '<button type="button" class="bc-imgbtn" id="bcSettle"><img src="assets/bubble-cat/btn_trophy.webp" alt="结算"></button>' +
        '</div>' +
        '<div class="bc-pause-overlay" id="bcPauseOverlay"><div>⏸ 已暂停<br><small>按空格、点右上角按钮或任意处继续<br>移动指针瞄准，点击 / 轻触发射</small>' +
        '<br><button type="button" class="btn accent" id="bcSettleGo" style="margin-top:12px;width:auto;padding:10px 26px">🏁 结束并结算本局</button>' +
        '</div></div>' +
        '</div></div>';
      canvasEl = el.querySelector('#bcCanvas');
      ctx = canvasEl.getContext('2d');
      if (!skyCv) skyCv = buildSky();
      if (!Object.keys(sprites).length) buildSprites();
      canvasEl.addEventListener('pointermove', aimFromEvent);
      canvasEl.addEventListener('pointerdown', onCanvasDown);
      var pauseBtn = el.querySelector('#bcPause');
      if (pauseBtn) pauseBtn.onclick = function (e) { e.stopPropagation(); togglePause(); };
      var pauseOv = el.querySelector('#bcPauseOverlay');
      if (pauseOv) pauseOv.onclick = function () { if (paused) togglePause(); };
      var settleBtn = el.querySelector('#bcSettle');
      if (settleBtn) settleBtn.onclick = function (e) {
        e.stopPropagation();
        if (mode !== 'play' || finished) return;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        setPaused(true);   // 打开暂停菜单，内含「结束并结算」确认
      };
      var settleGo = el.querySelector('#bcSettleGo');
      if (settleGo) settleGo.onclick = function (e) {
        e.stopPropagation();
        settleRun();
      };
      var restartBtn = el.querySelector('#bcRestart');
      if (restartBtn) restartBtn.onclick = function (e) {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        resetGame();
        startPlay();
      };
      updateHud();
      draw();
      ensureLoop();
    }

    intro();
    syncLbMode();
    mountLbHost();
    window.addEventListener('keydown', onKeyDown);
    return {
      destroy: function () {
        destroyed = true;
        mode = 'over';
        stopLoop();
        window.removeEventListener('keydown', onKeyDown);
        if (lbPanel) lbPanel.destroy();
      }
    };
  };
})();

