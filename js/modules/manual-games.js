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
          half.classList.add('hit');
          half.classList.add(ok ? 'ok' : 'ng');
          half.style.borderColor = ok ? '#2FBF6B' : '#E23B2E';
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
    return { destroy: function () { destroyed = true; clearTimers(); } };
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
    startLevel();
    return {
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
        clearFloatMsgs();
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

    var ROLE_MAP = {
      2: '起步', 4: '转正', 8: '主力', 16: '核心',
      32: '组长', 64: '经理', 128: '总监', 256: '副总',
      512: '合伙人', 1024: '传奇', 2048: '终极架构师', 4096: '封神'
    };

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
      var certs = window.SM_DATA['game-2048'].certs;
      var cert = certs[certs.length - 1];
      for (var i = 0; i < certs.length; i++) {
        if (maxTile >= certs[i].min) { cert = certs[i]; break; }
      }

      var role = ROLE_MAP[maxTile] || '传奇';
      var planningPct = maxTile >= 2048 ? 100 : maxTile >= 1024 ? 92 : maxTile >= 512 ? 82 : maxTile >= 256 ? 70 : maxTile >= 128 ? 58 : 42;
      var decisionPct = Math.min(98, Math.max(45, Math.round((score / Math.max(1, moves * 12)) * 80)));
      var resiliencePct = isOver ? 72 : 90;

      onFinish({
        icon: cert.icon,
        name: cert.name,
        tag: '最高合成 ' + maxTile + '（' + role + '）· 终局得分 ' + score + ' 分',
        text: cert.text + ' 本局历经 ' + moves + ' 步推演与 ' + merges + ' 次合体，无论顺境还是逆风，你在方寸之间的运筹帷幄都令人叹服。',
        big: { label: '最高合成数字', value: maxTile + ' <small>分 ' + score + '</small>' },
        bars: [
          { label: '空间掌控力', pct: planningPct, hi: true },
          { label: '决策果断度', pct: decisionPct },
          { label: '逆境容错率', pct: resiliencePct }
        ],
        blocks: [
          { h: '职场段位认证', cert: '【' + role + '】' },
          { h: '对局复盘', text: '本局总步数 ' + moves + ' 步，合成总分 ' + score + ' 分，历史最佳分 ' + bestScore + ' 分。' },
          { h: '战略建议', text: '2048 的底层法则永远是“守住一个角落，大小有序排列”。现实亦如此，守好自己的基本盘，步步为营方能化险为夷。' }
        ],
        quip: window.SM_DATA['game-2048'].disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, maxTile: maxTile, score: score, moves: moves }
      });
    }

    function renderUI() {
      var role = ROLE_MAP[maxTile] || '高阶';
      var boardCellsHTML = '';
      for (var i = 0; i < 16; i++) {
        var v = board[i];
        if (v === 0) {
          boardCellsHTML += '<div class="g2048-cell empty"></div>';
        } else {
          var cls = 'g2048-tile t' + (v <= 2048 ? v : 'super');
          var rName = ROLE_MAP[v] || '进阶';
          boardCellsHTML += '<div class="g2048-cell"><div class="' + cls + '"><span class="g2048-num">' + v + '</span><span class="g2048-tag">' + rName + '</span></div></div>';
        }
      }

      var overOverlayHTML = isOver ? (
        '<div class="g2048-overlay">' +
        '<div class="g2048-ov-title">无路可走 · 棋逢对手</div>' +
        '<div class="g2048-ov-sub">最高合成 <b>' + maxTile + ' (' + role + ')</b> · 本局得分 ' + score + '</div>' +
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
        '<div class="g2048-sc-val">' + maxTile + ' <small>' + role + '</small></div>' +
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
      destroy: function () {
        destroyed = true;
        clearTimers();
        window.removeEventListener('keydown', onKeyDown);
      }
    };
  };
})();
