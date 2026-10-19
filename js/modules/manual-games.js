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

  function makeRoot(root) {
    root.innerHTML = '';
    var el = document.createElement('div');
    el.className = 'stage';
    root.appendChild(el);
    return el;
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
    var el = makeRoot(root);
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
      describe: function (run) {
        return { score: run.ms, extra: { acc: run.acc, age: run.age } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '<small> ms</small></span>',
          '<span class="lb-tile">' + (r.acc || 0) + '/20</span>',
          '<span class="lb-meta">' + (r.age || '-') + ' 岁</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '<small> ms</small></span>',
          '<span class="lb-tile">' + ((r.extra && r.extra.acc) || 0) + '/20</span>'
        ];
      }
    }) : null;

    function mountLbHost() {
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

    /* ---------- 关卡说明 ---------- */
    function stageIntro(n) {
      clearTimers();
      var info = {
        1: { t: '第一关 · 简单反应', d: '屏幕变红的一瞬间，立即点击！<br>共 5 次，取中位数。抢跑会重新测试。', b: '开始第一关' },
        2: { t: '第二关 · 选择反应', d: '红点出现 → 按左半区；绿点出现 → 按右半区。<br>共 20 次，途中可能有规则交换。', b: '开始第二关' },
        3: { t: '第三关 · 冲动控制', d: '绿点出现 → 越快点越好；<br>红点出现 → 忍住，什么都别碰。共 20 次。', b: '开始第三关' }
      }[n];
      el.innerHTML = hud('<b>反应速度擂台</b>', '第 ' + n + '/3 关') +
        '<div class="rz-stage"><div class="rz-big" style="font-size:30px">' + info.t + '</div>' +
        '<div class="rz-sub">' + info.d + '</div>' +
        '<button class="btn accent" id="rzgo" style="margin-top:26px;width:auto;padding:12px 38px">' + info.b + '</button></div>';
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
        body = '<div class="rz-big" style="font-size:52px">' + m + ' <span style="font-size:22px">ms</span></div>' +
          '<div class="rz-sub">简单反应中位数 · 5 次平均发挥</div>';
      } else if (n === 2) {
        var mean = S2.rts.length ? Math.round(S2.rts.reduce(function (s, v) { return s + v; }, 0) / S2.rts.length) : 1500;
        body = '<div class="rz-big" style="font-size:52px">' + S2.correct + '<span style="font-size:22px">/20</span></div>' +
          '<div class="rz-sub">正确次数 · 平均 ' + mean + ' ms' + (S2.traps ? '<br>规则交换识别 ' + S2.traps + '/4' : '') + '</div>';
      } else {
        var gm = median(S3.goRts);
        body = '<div class="rz-big" style="font-size:52px">' + S3.falseHit + '<span style="font-size:22px">/4</span></div>' +
          '<div class="rz-sub">红点误按次数(冲动指数)· Go 中位数 ' + gm + ' ms</div>';
      }
      el.innerHTML = hud('<b>反应速度擂台</b>', '第 ' + n + '/3 关') +
        '<div class="rz-stage">' + body +
        '<button class="btn accent" id="rznext" style="margin-top:26px;width:auto;padding:12px 38px">' +
        (n < 3 ? '进入下一关' : '查看判词') + '</button></div>';
      var btnNext = el.querySelector('#rznext');
      if (btnNext) {
        btnNext.addEventListener('click', function () {
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          if (n < 3) stageIntro(n + 1); else finish();
        });
      }
    }

    /* ---------- 总判定 ---------- */
    function finish() {
      var m1 = median(S1);
      var acc = S2.correct / 20;
      var mean2 = S2.rts.length ? S2.rts.reduce(function (s, v) { return s + v; }, 0) / S2.rts.length : 1500;
      var cv = S2.rts.length > 1 ? stdev(S2.rts) / mean2 : 0.5;
      var impulse = S3.falseHit / 4;

      var age = m1 < 220 ? 16 : m1 < 280 ? 22 : m1 < 350 ? 30 : m1 < 450 ? 45 : 60;
      var speed = m1 < 220 ? 100 : m1 < 280 ? 88 : m1 < 350 ? 72 : m1 < 450 ? 52 : 35;
      var accPct = Math.round(acc * 100);
      var stab = cv < 0.15 ? 95 : cv < 0.25 ? 80 : cv < 0.35 ? 62 : 45;

      var rank, ricon;
      if (m1 < 260 && acc >= 0.85) { rank = '闪电侠'; ricon = 'bolt'; }
      else if (m1 < 330 && acc >= 0.70) { rank = '电竞手'; ricon = 'gamepad'; }
      else if (m1 < 430) { rank = '正常人'; ricon = 'smile'; }
      else { rank = '树懒本懒'; ricon = 'sleepy'; }

      var quip = impulse < 0.10
        ? '泰山崩于前而面不改色,期货市场失去了一位天才。'
        : impulse > 0.40
          ? '红色对你来说只是个建议。'
          : '刹车片状态良好,日常够用。';

      if (lbPanel) lbPanel.submit({ ms: m1, acc: S2.correct, age: age });

      onFinish({
        icon: ricon, name: rank, tag: '反应年龄 ' + age + ' 岁 · 三关综合判定',
        text: '简单反应中位数 ' + m1 + ' ms' + (age === 45 ? ',带着一点疲劳的痕迹——该睡个好觉了。' : age === 60 ? ',急事先预约,从容不是罪。' : ',手速在线。') +
          '选择反应正确率 ' + accPct + '%,成绩波动' + (stab >= 80 ? '很小,发挥稳如老狗。' : stab >= 62 ? '中等,状态有起伏。' : '偏大,可能手滑也可能心滑。'),
        big: { label: '简单反应中位数', value: m1 + ' <small>ms</small>' },
        bars: [
          { label: '速度', pct: speed }, { label: '准度', pct: accPct }, { label: '稳定性', pct: stab }
        ],
        blocks: [{ h: '冲动指数', text: '红点误按 ' + S3.falseHit + '/4(' + Math.round(impulse * 100) + '%)。' + quip }],
        quip: window.SM_DATA.reaction.disclaimer,
        cert: rank + ' · 认证',
        detail: { type: rank, age: age, ms: m1 }
      });
    }

    stageIntro(1);
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
    var el = makeRoot(root);
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
          '<span class="lb-meta">' + (r.left || 0) + ' 命</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '<small> 关</small></span>',
          '<span class="lb-tile">' + (r.at ? window.AppLbPanel.fmtDay(r.at) : '--') + '</span>'
        ];
      }
    }) : null;

    function mountLbHost() {
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
          '<span class="lb-meta">' + (r.moves || 0) + ' 步</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
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
          '<span class="lb-meta">' + mines + ' 雷</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
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

    function levelName(key) {
      for (var k in LEVELS) {
        if (LEVELS.hasOwnProperty(k) && LEVELS[k].key === key) return LEVELS[k].name;
      }
      return '初级';
    }

    function mountLbHost() {
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
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.sec || 0) + '<small> 秒</small></span>',
          '<span class="lb-tile">' + levelName(r.lv) + '</span>',
          '<span class="lb-meta">' + (r.err || 0) + ' 次错</span>',
          '<span class="lb-date">' + window.AppLbPanel.fmtDay(r.at) + '</span>'
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

    function levelName(key) {
      for (var k in LEVELS) {
        if (LEVELS.hasOwnProperty(k) && LEVELS[k].key === key) return LEVELS[k].name;
      }
      return '初级';
    }

    function syncLbLevel() {
      if (!lbPanel) return;
      lbPanel.setGame('schulte_' + level.key, storeKeyFor(level.key));
    }

    function mountLbHost() {
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
})();

