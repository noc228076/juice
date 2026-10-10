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
      var valid = [], fouls = 0, shown = 0, t0 = 0, armed = false, waitId = 0;
      var stageStartTime = performance.now();
      function paint(k) {
        stageStartTime = performance.now();
        el.innerHTML = hud('<b>第一关 · 简单反应</b>', '有效 ' + valid.length + '/5') +
          '<div class="rz-stage" id="rz"><div class="rz-count">' + (valid.length ? '上次 ' + valid[valid.length - 1] + ' ms' : '&nbsp;') + '</div>' +
          '<div class="rz-big" id="big">⏳ 屏息以待…</div>' +
          '<div class="rz-sub" id="sub">屏幕变红的一瞬间，立即点它！</div></div>';
        var st = el.querySelector('#rz');
        if (st) st.addEventListener('pointerdown', onTap);
        arm();
      }
      function arm() {
        armed = false;
        var big = el.querySelector('#big'), sub = el.querySelector('#sub'), st = el.querySelector('#rz');
        if (big) big.textContent = '⏳ 屏息以待…';
        if (sub) { sub.className = 'rz-sub'; sub.textContent = '屏幕变红的一瞬间，立即点它！'; }
        if (st) st.classList.remove('gorun');
        waitId = later(function () {
          if (destroyed) return;
          armed = true; t0 = performance.now();
          var s = el.querySelector('#rz'); if (s) s.classList.add('gorun');
          var b = el.querySelector('#big'); if (b) b.textContent = '点！';
          var u = el.querySelector('#sub'); if (u) u.textContent = '';
          if (window.SFX && window.SFX.go) window.SFX.go();
        }, 1200 + Math.random() * 2200);
      }
      function onTap(e) {
        if (performance.now() - stageStartTime < 280) return; // 280ms 手势防抖保护：避免点“开始”的手指残余手势被误判为抢跑
        if (!armed) {   // 抢跑
          clearTimeout(waitId);
          fouls++;
          if (window.SFX && window.SFX.foul) window.SFX.foul();
          var s = el.querySelector('#rz'), u = el.querySelector('#sub');
          if (u) { u.className = 'rz-sub'; u.innerHTML = '<span class="rz-warn" style="color:#f87171;font-weight:700">抢跑！等变红再点，重新测试中…</span>'; }
          if (fouls >= 2) {
            valid = []; shown = 0; fouls = 0;
            if (u) u.innerHTML = '<span class="rz-warn" style="color:#f87171;font-weight:700">连续抢跑，本关作废重测！</span>';
          }
          later(function () { if (valid.length < 5) { shown = valid.length; paint(); } }, 900);
          return;
        }
        armed = false;
        var dt = Math.round(performance.now() - t0);
        valid.push(dt); fouls = 0;
        if (window.SFX && window.SFX.select) window.SFX.select();
        var u = el.querySelector('#sub');
        if (u) u.textContent = dt + ' ms';
        later(function () {
          if (valid.length >= 5) { S1 = valid; stageSummary(1); }
          else paint();
        }, 750);
      }
      paint();
    }

    /* ---------- 第二关:选择反应 ---------- */
    function run2() {
      var N = 20;
      var traps = {};
      var tp = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]).slice(0, 4);
      tp.forEach(function (i) { traps[i] = true; });
      var i = 0, t0 = 0, answered = false, toId = 0;
      function paint() {
        el.innerHTML = hud('<b>第二关 · 选择反应</b>', (i + 1) + '/' + N) +
          '<div class="rz-stage" style="padding:20px 14px"><div class="rz-banner" id="ban">规则交换!红右 · 绿左</div>' +
          '<div class="rz-sub" style="margin:2px 0 12px;color:#7E786C" id="cue">盯住中间的点</div>' +
          '<div class="rz-halves">' +
          '<div class="rz-half" id="L"><div class="dot" id="dL"></div><span>左半区</span></div>' +
          '<div class="rz-half" id="R"><div class="dot" id="dR"></div><span>右半区</span></div>' +
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
        var dot = el.querySelector('#dL'); // 点显示在中央 cue 位置
        var cue = el.querySelector('#cue');
        if (cue) cue.innerHTML = '<span class="dot ' + (isRed ? 'red' : 'green') + '" style="width:64px;height:64px"></span>';
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
      var i = 0, t0 = 0, answered = false, toId = 0;
      function paint() {
        el.innerHTML = hud('<b>第三关 · 冲动控制</b>', (i + 1) + '/' + N) +
          '<div class="rz-stage" id="st"><div class="rz-count">Go ' + S3.goRts.length + '</div>' +
          '<div class="rz-big" id="big">准备</div><div class="rz-sub" id="sub">绿点快按 · 红点忍住</div></div>';
        el.querySelector('#st').addEventListener('pointerdown', onTap);
        later(show, 700 + Math.random() * 900);
      }
      function show() {
        if (destroyed) return;
        var g = seq[i] === 'go';
        var st = el.querySelector('#st'), big = el.querySelector('#big');
        if (st) st.classList.add(g ? 'gozone' : 'gorun');
        if (big) big.textContent = g ? '按!' : '忍';
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
          var u = el.querySelector('#sub'); if (u) u.textContent = dt + ' ms';
        } else {
          S3.falseHit++; if (window.SFX && window.SFX.foul) window.SFX.foul();
          var u2 = el.querySelector('#sub'); if (u2) u2.innerHTML = '<span class="rz-warn">没忍住…</span>';
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

    function startLevel() {
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
      var gw = Math.min(box.clientWidth || 320, 440);
      var cell = Math.floor((gw - 6 - (n - 1) * 4) / n);
      var grid = document.createElement('div');
      grid.className = 'cl-grid';
      grid.style.width = (cell * n + (n - 1) * 4 + 12) + 'px';
      for (var i = 0; i < n * n; i++) {
        (function (idx) {
          var cellEl = document.createElement('div');
          cellEl.className = 'cl-cell';
          cellEl.style.width = cell + 'px';
          cellEl.style.height = cell + 'px';
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
        if (destroyed) return;
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
      if (dying) return;
      if (ok) {
        if (window.SFX && window.SFX.stage) window.SFX.stage();
        lv++;
        startLevel();
      } else {
        if (window.SFX && window.SFX.wrong) window.SFX.wrong();
        lives--;
        if (cellEl) { cellEl.classList.add('cl-wrong'); cellEl.style.outline = '3px solid #E23B2E'; }
        var h = el.querySelector('.hearts');
        if (h) h.outerHTML = heartsHTML(lives, LIVES);
        floatMsg(lives > 0 ? '答错!还剩 ' + lives + ' 条命' : '命尽……');
        if (lives <= 0) { dying = true; later(end, 700); }
      }
    }
    function timeout() {
      if (dying) return;
      if (window.SFX && window.SFX.wrong) window.SFX.wrong();
      lives--;
      var h = el.querySelector('.hearts');
      if (h) h.outerHTML = heartsHTML(lives, LIVES);
      floatMsg('超时!还剩 ' + lives + ' 条命');
      if (lives <= 0) { dying = true; later(end, 700); }
      else startLevel();
    }

    function end() {
      clearTimers();
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
      var m = document.createElement('div');
      m.className = 'floatmsg';
      m.textContent = txt;
      document.body.appendChild(m);
      later(function () { m.remove(); }, 1100);
    }

    lives = LIVES; lv = 1;
    startLevel();
    return {
      destroy: function () {
        destroyed = true;
        clearTimers();
        if (rafId) cancelAnimationFrame(rafId);
      }
    };
  };
})();
