/* 饮料人格研究所 — 主流程 */
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const screens = { cover: $('scr-cover'), quiz: $('scr-quiz'), shake: $('scr-shake'), result: $('scr-result') };
  let cur = 'cover';

  /* ---------- 状态 ---------- */
  let curTest = 'drink';          // 'drink' (饮料人格测试) 或 'mbti' (MBTI)
  let qList = QUESTIONS_DRINK;    // 当前测试题库
  let qIdx = 0;                   // 当前题号
  const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const answers = [];             // 每题已选字母
  let persona = null;

  /* ---------- 屏幕切换 ---------- */
  function show(name) {
    screens[cur].classList.remove('on');
    screens[name].classList.add('on');
    cur = name;
  }

  /* ---------- 主题 ---------- */
  function getTheme() {
    try { return localStorage.getItem('dp_theme') || 'dark'; } catch (e) { return 'dark'; }
  }
  function applyTheme(t) {
    document.documentElement.dataset.theme = t;
    $('themeIcon').textContent = t === 'dark' ? '☾' : '☀';
    $('btnTheme2').querySelector('span').textContent = t === 'dark' ? '☾' : '☀';
    try { localStorage.setItem('dp_theme', t); } catch (e) {}
    if (window.AndroidBridge && AndroidBridge.setLightTheme) {
      AndroidBridge.setLightTheme(t === 'light');
    }
  }
  function toggleTheme() {
    applyTheme(getTheme() === 'dark' ? 'light' : 'dark');
    SFX.toggle();
  }

  /* ---------- 测评项目切换 ---------- */
  function setMode(modeKey) {
    let key = modeKey;
    if (key === 'mbti' || key === 'classic' || key === 'mbti_quick') key = 'mbti_short';
    if (key === 'mbti_pro') key = 'mbti_form_m';
    if (key === 'mbti_scale') key = 'mbti_form_q';
    if (key === 'quick') key = 'drink';
    if (!TESTS[key]) key = 'drink';
    curTest = key;
    const cfg = TESTS[curTest];
    qList = cfg.questions;

    // 更新封面卡片激活状态
    const cards = document.querySelectorAll('.mode-card');
    cards.forEach(card => {
      const cMode = card.dataset.mode;
      const active = (cMode === curTest);
      card.classList.toggle('active', active);
      card.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    // 更新封面主按钮文字
    const btnText = $('btnStartText');
    const btnSub = $('btnStartSub');
    if (btnText) btnText.textContent = cfg.btnStartText;
    if (btnSub) btnSub.textContent = cfg.btnStartSub;

    // 更新答题页顶部模式药丸
    const pill = $('quizModePill');
    if (pill) {
      pill.textContent = `${cfg.icon} ${cfg.name}`;
    }
  }

  /* ---------- 封面气泡 ---------- */
  function makeBubbles() {
    const box = $('coverBubbles');
    const frag = document.createDocumentFragment();
    for (let i = 0; i < 16; i++) {
      const b = document.createElement('i');
      const s = 8 + Math.random() * 34;
      b.style.cssText = `left:${Math.random() * 100}%;width:${s}px;height:${s}px;` +
        `animation-duration:${7 + Math.random() * 9}s;animation-delay:${-Math.random() * 12}s;`;
      frag.appendChild(b);
    }
    box.appendChild(frag);
  }

  /* ---------- 计分与结果 ---------- */
  function pickAnswer(k, val) {
    if (typeof val === 'number') {
      const q = qList[qIdx];
      let addPole = null, addVal = 0;
      if (val > 0) {
        addPole = q.pole;
        addVal = val;
      } else if (val < 0) {
        const opp = { E: 'I', I: 'E', S: 'N', N: 'S', T: 'F', F: 'T', J: 'P', P: 'J' };
        addPole = opp[q.pole];
        addVal = -val;
      }
      if (addPole && addVal > 0) {
        counts[addPole] += addVal;
      }
      answers.push({ type: 'scale', pole: addPole, val: addVal });
    } else {
      counts[k] += 2;
      answers.push({ type: 'choice', k });
    }

    $('quizFill').style.width = (answers.length / qList.length * 100) + '%';
    if (answers.length >= qList.length) {
      setTimeout(() => startShake(), 340);
    } else {
      setTimeout(() => { qIdx++; renderQuestion(); SFX.page(); }, 280);
    }
  }

  function undoAnswer() {
    const item = answers.pop();
    if (item) {
      if (item.type === 'scale') {
        if (item.pole && item.val > 0) counts[item.pole] -= item.val;
      } else if (item.type === 'choice') {
        counts[item.k] -= 2;
      } else if (typeof item === 'string') {
        counts[item] -= 2;
      }
    }
    $('quizFill').style.width = (answers.length / qList.length * 100) + '%';
  }

  function resolveCode() {
    const tie = { EI: 'I', SN: 'S', TF: 'F', JP: 'P' };
    const pairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];
    let code = '';
    for (const [a, b] of pairs) {
      if (counts[a] > counts[b]) code += a;
      else if (counts[b] > counts[a]) code += b;
      else code += tie[a + b];
    }
    return code;
  }

  function computePersona() {
    const cfg = TESTS[curTest] || TESTS.drink;
    const code = resolveCode();
    return cfg.personas[code];
  }

  /* ---------- 答题 ---------- */
  const KEYS = ['A', 'B', 'C', 'D'];
  function renderQuestion() {
    const q = qList[qIdx];
    const total = qList.length;
    const cfg = TESTS[curTest] || TESTS.drink;
    const isMbti = (curTest !== 'drink');
    const isLikert = (cfg.type === 'likert');

    $('quizCount').textContent = `Q${qIdx + 1}/${total}`;
    $('quizEyebrow').textContent = isMbti
      ? `第 ${qIdx + 1} 题 · ${cfg.name}`
      : `第 ${qIdx + 1} 杯 · 正在注入`;

    const qEl = $('quizQ');
    qEl.style.animation = 'none';
    void qEl.offsetWidth;
    qEl.style.animation = '';
    qEl.textContent = q.q;

    const box = $('quizOpts');
    box.innerHTML = '';
    const hintEl = $('quizHint');

    if (isLikert) {
      box.className = 'quiz-opts is-likert';
      const wrap = document.createElement('div');
      wrap.className = 'likert-wrap';

      const lbls = document.createElement('div');
      lbls.className = 'likert-labels';
      lbls.innerHTML = `<span class="likert-lbl agree">同意</span><span class="likert-lbl neutral">中立</span><span class="likert-lbl disagree">反对</span>`;
      wrap.appendChild(lbls);

      const scale = document.createElement('div');
      scale.className = 'likert-scale';

      const dots = [
        { v: 3, cls: 'dot-val-p3', t: '非常同意', key: '1' },
        { v: 2, cls: 'dot-val-p2', t: '比较同意', key: '2' },
        { v: 1, cls: 'dot-val-p1', t: '稍微同意', key: '3' },
        { v: 0, cls: 'dot-val-0',  t: '中立',     key: '4' },
        { v: -1, cls: 'dot-val-m1', t: '稍微反对', key: '5' },
        { v: -2, cls: 'dot-val-m2', t: '比较反对', key: '6' },
        { v: -3, cls: 'dot-val-m3', t: '非常反对', key: '7' }
      ];

      dots.forEach(d => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = `likert-dot ${d.cls}`;
        btn.setAttribute('aria-label', `${d.t} (按键 ${d.key})`);
        btn.innerHTML = `<span class="dot-circle"></span><span class="dot-sub">${d.t}</span>`;
        btn.addEventListener('click', () => {
          btn.classList.add('picked');
          box.style.pointerEvents = 'none';
          setTimeout(() => { box.style.pointerEvents = ''; }, 320);
          SFX.select();
          pickAnswer(null, d.v);
        });
        scale.appendChild(btn);
      });

      wrap.appendChild(scale);
      box.appendChild(wrap);

      if (hintEl) {
        hintEl.innerHTML = `根据真实符合度打分<span class="pc-key-tip-inline"> · 可按键盘 <b>1(非常同意) ~ 7(非常反对)</b> 作答</span>`;
      }
    } else {
      box.className = 'quiz-opts';
      q.opts.forEach((o, i) => {
        const btn = document.createElement('button');
        btn.className = 'opt';
        btn.innerHTML = `<span class="opt-key">${KEYS[i]}</span><span class="opt-t"></span>`;
        btn.querySelector('.opt-t').textContent = o.t;
        btn.addEventListener('click', () => {
          SFX.select();
          btn.classList.add('picked');
          box.style.pointerEvents = 'none';
          setTimeout(() => { box.style.pointerEvents = ''; }, 320);
          pickAnswer(o.k);
        });
        box.appendChild(btn);
      });

      if (hintEl) {
        if (q.opts.length === 2) {
          hintEl.innerHTML = `凭第一直觉选择更符合你的一项<span class="pc-key-tip-inline"> · 可按键盘 <b>A/B</b> 或 <b>1/2</b> 作答</span>`;
        } else {
          hintEl.innerHTML = `凭第一直觉选，答案没有对错<span class="pc-key-tip-inline"> · 可按键盘 <b>A/B/C/D</b> 或 <b>1/2/3/4</b> 作答</span>`;
        }
      }
    }
  }

  function startQuiz() {
    const cfg = TESTS[curTest] || TESTS.drink;
    qList = cfg.questions;
    qIdx = 0;
    answers.length = 0;
    for (const k in counts) counts[k] = 0;
    $('quizFill').style.width = '0%';
    renderQuestion();
    show('quiz');
  }

  /* ---------- 摇杯过渡 ---------- */
  function startShake() {
    show('shake');
    SFX.shake();
    const cfg = TESTS[curTest] || TESTS.drink;
    const texts = cfg.shakeTexts || ['正在加入气泡…', '注入灵魂糖浆…', '均匀摇晃中…', '挂霜摆盘，盖章认证…'];
    const bar = $('shakeBar'), tx = $('shakeText');
    bar.style.width = '0%';
    let step = 0;
    const total = 2600, per = 650;
    const timer = setInterval(() => {
      step++;
      const p = Math.min(100, step * per / total * 100);
      bar.style.width = p + '%';
      tx.textContent = texts[Math.min(step, texts.length - 1)];
      if (Math.random() < 0.7) SFX.bubble();
      if (step * per >= total) {
        clearInterval(timer);
        persona = computePersona();
        renderResult();
        SFX.reveal();
        setTimeout(() => show('result'), 260);
      }
    }, per);
  }

  /* ---------- 结果渲染 ---------- */
  function isDarkColor(hex) {
    const m = hex.replace('#', '');
    const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 < 140;
  }

  function renderResult() {
    const p = persona;
    const cfg = TESTS[curTest] || TESTS.drink;
    const code = resolveCode();
    const card = $('resultCard');
    card.style.setProperty('--pc', p.color);
    const ink = isDarkColor(p.color) ? '#FFFFFF' : 'var(--ac-ink)';
    $('cardBand').style.color = ink;

    const nameEl = $('cardName');
    const subEl = $('cardSubName');
    const isMbti = (curTest !== 'drink');

    if (isMbti) {
      $('cardCode').textContent = 'MBTI';
      $('cardEn').textContent = p.en.toUpperCase();
      nameEl.textContent = code;
      nameEl.classList.add('is-mbti-code');
      if (subEl) {
        subEl.style.display = 'block';
        subEl.textContent = p.name;
      }
    } else {
      $('cardCode').textContent = code;
      $('cardEn').textContent = p.en.toUpperCase();
      nameEl.textContent = p.name;
      nameEl.classList.remove('is-mbti-code');
      if (subEl) {
        subEl.style.display = 'none';
      }
    }

    $('cardTags').innerHTML = p.tags.map(t => `<i>${t}</i>`).join('');
    $('cardIng').innerHTML =
      `<div class="ing-head"><b>${cfg.ingTitle}</b><span>${cfg.ingSub}</span></div>` +
      p.ingredients.map(x =>
        `<div class="ing-row"><b>${x.n}</b><span class="dots"></span><em>${x.p}%</em></div>`).join('');

    const eyebrow = $('resultEyebrow');
    if (eyebrow) eyebrow.textContent = cfg.eyebrow;
    const stamp = $('cardStamp');
    if (stamp) stamp.textContent = cfg.stamp;

    // 动态板块标题
    const secAxes = $('secTitleAxes');
    if (secAxes) secAxes.textContent = cfg.secTitleAxes || '四维成分轴';
    const secDesc = $('secTitleDesc');
    if (secDesc) secDesc.textContent = cfg.secTitleDesc || '配方解析';

    const tShine = $('titleShine');
    if (tShine) tShine.innerHTML = cfg.trioTitles.shine;
    const tWarn = $('titleWarn');
    if (tWarn) tWarn.innerHTML = cfg.trioTitles.warn;
    const tMatch = $('titleMatch');
    if (tMatch) tMatch.innerHTML = cfg.trioTitles.match;

    const rFoot = $('resultFoot');
    if (rFoot) {
      rFoot.textContent = isMbti ? 'MBTI PERSONALITY LAB · 认知功能深度测评' : 'DRINK PERSONA LAB · 仅供娱乐 · 甜度自选';
    }

    // 重试按钮文字
    document.querySelectorAll('.btn-retry-act').forEach(b => {
      b.textContent = cfg.btnRetryText || '再测一次';
    });

    renderAxes();
    $('paraDesc').innerHTML = p.desc;
    $('paraShine').textContent = p.shine;
    $('paraWarn').textContent = p.warn;
    const mm = p.match.match(/^(.+?)——(.+)$/);
    $('paraMatch').innerHTML = mm ? `<b>${mm[1]}</b> —— ${mm[2]}` : p.match;
    $('paraQuote').textContent = p.quote;

    // 重置滚动
    document.querySelector('.result-scroll').scrollTop = 0;
    // 四维条动画
    setTimeout(() => {
      document.querySelectorAll('.axis-fill').forEach(el => { el.style.width = el.dataset.w + '%'; });
    }, 500);
  }

  function codeLetters() {
    const pairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];
    let c = '';
    for (const [a, b] of pairs) c += counts[a] >= counts[b] ? a : b;
    return c;
  }

  function renderAxes() {
    const cfg = TESTS[curTest] || TESTS.drink;
    const axesList = cfg.axes || AXES_DRINK;
    const box = $('axesBox');
    box.innerHTML = '';
    axesList.forEach((ax, i) => {
      const l = counts[ax.lK], r = counts[ax.rK];
      const tot = l + r || 1;
      const lp = Math.round(l / tot * 100), rp = 100 - lp;
      const lWin = l >= r;
      const row = document.createElement('div');
      row.className = 'axis';
      row.innerHTML =
        `<span class="axis-side l ${lWin ? 'win' : ''}">${ax.l}</span>` +
        `<div class="axis-bar">` +
        `<div class="axis-half l"><div class="axis-fill" data-w="${lp}"></div></div>` +
        `<div class="axis-half r"><div class="axis-fill" data-w="${rp}"></div></div>` +
        `</div>` +
        `<span class="axis-side r ${!lWin ? 'win' : ''}">${ax.r}</span>` +
        `<span class="axis-pct">${lp}% : ${rp}%</span>`;
      box.appendChild(row);
    });
  }

  /* ---------- 分享长图 ---------- */
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  function drawShareCard() {
    const p = persona;
    const cfg = TESTS[curTest] || TESTS.drink;
    const cv = $('shareCanvas'), c = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const F = (s, w) => `${w || 400} ${s}px "MiSans","HarmonyOS Sans SC","PingFang SC","Microsoft YaHei",sans-serif`;

    // 底
    c.fillStyle = '#0B0C10'; c.fillRect(0, 0, W, H);
    // 气泡
    for (let i = 0; i < 26; i++) {
      const x = Math.random() * W, y = Math.random() * H, r = 4 + Math.random() * 22;
      c.beginPath(); c.arc(x, y, r, 0, 7);
      c.fillStyle = Math.random() < 0.5 ? 'rgba(214,255,75,0.05)' : 'rgba(255,255,255,0.035)';
      c.fill();
      c.strokeStyle = 'rgba(214,255,75,0.10)'; c.stroke();
    }

    // 顶部
    c.textAlign = 'center';
    c.fillStyle = '#D6FF4B';
    c.font = F(26, 700);
    c.fillText(cfg.shareTitle, W / 2, 120);
    c.fillStyle = '#5A6070';
    c.font = F(22);
    c.fillText(cfg.shareSub, W / 2, 170);

    // 色带(MBTI + EN)
    const bandY = 240, bandH = 72;
    const dark = isDarkColor(p.color);
    const isMbti = (curTest !== 'drink');
    c.fillStyle = p.color;
    rr(c, W / 2 - 260, bandY, 520, bandH, 36); c.fill();
    c.fillStyle = dark ? '#FFFFFF' : '#10120A';
    c.font = F(30, 900);
    if (isMbti) {
      c.fillText('MBTI · ' + p.en.toUpperCase(), W / 2, bandY + 47);
    } else {
      c.fillText(resolveCode() + '  ·  ' + p.en.toUpperCase(), W / 2, bandY + 47);
    }

    // 名字 / 主标题
    c.textAlign = 'center';
    if (isMbti) {
      c.fillStyle = '#F2F4F0';
      c.font = '950 116px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
      c.fillText(resolveCode(), W / 2, 420);

      c.fillStyle = '#D6FF4B';
      c.font = F(32, 800);
      c.fillText(p.name, W / 2, 475);
    } else {
      c.fillStyle = '#F2F4F0';
      const nameFontSize = p.name.length > 7 ? 80 : 108;
      c.font = F(nameFontSize, 900);
      c.fillText(p.name, W / 2, 460);
    }

    // 标签
    const tagY = isMbti ? 515 : 505;
    let tx = W / 2 - (p.tags.length * 150 - 20) / 2;
    c.textAlign = 'left';
    p.tags.forEach(t => {
      c.font = F(26, 700);
      const w = c.measureText(t).width + 52;
      c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 2;
      rr(c, tx, tagY, w, 56, 28); c.stroke();
      c.fillStyle = '#949AA8';
      c.fillText(t, tx + 26, tagY + 38);
      tx += w + 18;
    });

    // 成分表/心理画像卡片
    const cx = 120, cy = 640, cw = W - 240;
    c.fillStyle = '#14161E';
    rr(c, cx, cy, cw, 330, 30); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.10)'; c.stroke();
    c.fillStyle = '#F2F4F0'; c.font = F(30, 900);
    c.fillText(cfg.ingTitle, cx + 44, cy + 62);
    c.fillStyle = '#5A6070'; c.font = F(20);
    c.textAlign = 'right'; c.fillText(cfg.ingSub, cx + cw - 44, cy + 60);
    c.textAlign = 'left';
    c.strokeStyle = '#F2F4F0'; c.lineWidth = 3;
    c.beginPath(); c.moveTo(cx + 40, cy + 84); c.lineTo(cx + cw - 40, cy + 84); c.stroke();
    p.ingredients.forEach((x, i) => {
      const yy = cy + 134 + i * 52;
      c.fillStyle = '#F2F4F0'; c.font = F(26, 700);
      c.fillText(x.n, cx + 44, yy);
      c.fillStyle = '#D6FF4B'; c.font = F(28, 900);
      c.textAlign = 'right'; c.fillText(x.p + '%', cx + cw - 44, yy);
      c.textAlign = 'left';
      c.fillStyle = 'rgba(255,255,255,0.10)';
      rr(c, cx + 220, yy - 14, cw - 264, 12, 6); c.fill();
      c.fillStyle = '#D6FF4B';
      rr(c, cx + 220, yy - 14, (cw - 264) * x.p / 100, 12, 6); c.fill();
    });

    // 语录
    c.textAlign = 'center';
    c.fillStyle = '#949AA8'; c.font = F(30, 700);
    c.fillText(p.quote, W / 2, 1105);

    // 底部框
    c.strokeStyle = 'rgba(214,255,75,0.35)'; c.lineWidth = 2.5;
    rr(c, 100, 1190, W - 200, 320, 34); c.stroke();
    c.fillStyle = '#D6FF4B'; c.font = F(26, 900);
    c.fillText(cfg.secTitleAxes || '四 维 成 分 轴', W / 2, 1250);
    const axesList = cfg.axes || AXES_DRINK;
    axesList.forEach((ax, i) => {
      const l = counts[ax.lK], r = counts[ax.rK], tot = l + r || 1;
      const lp = Math.round(l / tot * 100), rp = 100 - lp;
      const yy = 1305 + i * 48;
      c.textAlign = 'left'; c.fillStyle = '#949AA8'; c.font = F(24, 700);
      c.fillText(ax.l, 150, yy);
      c.textAlign = 'right';
      c.fillText(ax.r, W - 150, yy);
      c.textAlign = 'left';
      c.fillStyle = 'rgba(255,255,255,0.08)';
      rr(c, 330, yy - 20, W - 660, 10, 5); c.fill();
      c.fillStyle = '#D6FF4B';
      rr(c, 330, yy - 20, (W - 660) * lp / 100, 10, 5); c.fill();
    });

    c.textAlign = 'center';
    c.fillStyle = '#5A6070'; c.font = F(22);
    c.fillText(cfg.shareFoot, W / 2, 1560);

    return cv;
  }

  function saveShare() {
    SFX.save();
    const cv = drawShareCard();
    const data = cv.toDataURL('image/png');
    if (window.AndroidBridge && AndroidBridge.saveImage) {
      AndroidBridge.saveImage(data);
    } else {
      const a = document.createElement('a');
      a.href = data;
      const code = resolveCode();
      const pre = (curTest !== 'drink') ? `MBTI-${code}-` : '饮料人格-';
      a.download = pre + persona.name + '.png';
      a.click();
    }
  }

  /* ---------- 返回协议(支持原生返回与浏览器后退) ---------- */
  window.__dpCanGoBack = function () {
    if (cur === 'quiz') return true;
    if (cur === 'result') return true;
    return false;
  };
  window.__dpGoBack = function () {
    if (cur === 'quiz') {
      if (answers.length > 0) {
        undoAnswer();
        qIdx = answers.length;
        renderQuestion();
        SFX.back();
      } else {
        show('cover');
        SFX.back();
      }
    } else if (cur === 'result') {
      show('cover');
      SFX.back();
    }
  };

  /* ---------- 开关 ---------- */
  function refreshToggles() {
    $('tglSound').classList.toggle('off', !SFX.sound);
    $('tglVib').classList.toggle('off', !SFX.vibrate);
  }

  /* ---------- 启动 ---------- */
  function init() {
    applyTheme(getTheme());
    makeBubbles();
    refreshToggles();

    // 默认初始化饮料人格测试
    setMode('drink');

    $('btnStart').addEventListener('click', () => { SFX.pour(); startQuiz(); });
    $('btnTheme').addEventListener('click', toggleTheme);
    $('btnTheme2').addEventListener('click', toggleTheme);

    // 测验项目卡片点击/回车切换
    document.querySelectorAll('.mode-card').forEach(card => {
      card.addEventListener('click', () => {
        setMode(card.dataset.mode);
        SFX.select();
      });
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setMode(card.dataset.mode);
          SFX.select();
        }
      });
    });

    // 切换测验项目按钮 (结果页返回封面重新选项目)
    document.querySelectorAll('.btn-mode-act').forEach(b => {
      b.addEventListener('click', () => {
        SFX.page();
        show('cover');
      });
    });

    document.querySelectorAll('.btn-save-act').forEach(b => {
      b.addEventListener('click', saveShare);
    });
    document.querySelectorAll('.btn-retry-act').forEach(b => {
      b.addEventListener('click', () => { SFX.pour(); startQuiz(); });
    });

    $('tglSound').addEventListener('click', () => { SFX.setSound(!SFX.sound); refreshToggles(); SFX.tap(); });
    $('tglVib').addEventListener('click', () => { SFX.setVibrate(!SFX.vibrate); refreshToggles(); });

    const btnBack = $('btnBack');
    if (btnBack) {
      btnBack.addEventListener('click', () => { window.__dpGoBack(); });
    }

    // 浏览器键盘快捷键支持 (桌面端体验增强)
    document.addEventListener('keydown', (e) => {
      if (cur === 'quiz') {
        const cfg = TESTS[curTest] || TESTS.drink;
        if (cfg.type === 'likert') {
          const keyMap = { '1': 0, '2': 1, '3': 2, '4': 3, '5': 4, '6': 5, '7': 6 };
          if (e.key in keyMap) {
            const dots = $('quizOpts').querySelectorAll('.likert-dot');
            const idx = keyMap[e.key];
            if (dots[idx]) dots[idx].click();
          } else if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'ArrowLeft') {
            window.__dpGoBack();
          }
        } else {
          const keyMap = { '1': 0, 'a': 0, 'A': 0, '2': 1, 'b': 1, 'B': 1, '3': 2, 'c': 2, 'C': 2, '4': 3, 'd': 3, 'D': 3 };
          if (e.key in keyMap) {
            const opts = $('quizOpts').querySelectorAll('.opt');
            const idx = keyMap[e.key];
            if (opts[idx]) opts[idx].click();
          } else if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'ArrowLeft') {
            window.__dpGoBack();
          }
        }
      } else if (cur === 'cover') {
        if (e.key === '1') {
          setMode('drink');
          SFX.tap();
        } else if (e.key === '2') {
          setMode('mbti_short');
          SFX.tap();
        } else if (e.key === '3') {
          setMode('mbti_form_m');
          SFX.tap();
        } else if (e.key === '4') {
          setMode('mbti_form_q');
          SFX.tap();
        } else if (e.key === 'Enter' || e.key === ' ') {
          $('btnStart').click();
        }
      } else if (cur === 'result' && (e.key === 'Escape' || e.key === 'Backspace')) {
        window.__dpGoBack();
      }
    });

    // 浏览器历史记录前进后退兼容
    window.addEventListener('popstate', () => {
      if (window.__dpCanGoBack()) {
        window.__dpGoBack();
      }
    });

    document.addEventListener('pointerdown', () => SFX.unlock(), { once: true });
    show('cover');
  }

  init();
})();
