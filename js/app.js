/* 饮料人格研究所 — 主流程 */
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const screens = { cover: $('scr-cover'), quiz: $('scr-quiz'), shake: $('scr-shake'), result: $('scr-result') };
  let cur = 'cover';

  /* ---------- 状态 ---------- */
  let qIdx = 0;                  // 当前题号
  const counts = { E: 0, I: 0, S: 0, N: 0, T: 0, F: 0, J: 0, P: 0 };
  const answers = [];            // 每题已选字母
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
  function pickAnswer(k) {
    counts[k] += 2;
    answers.push(k);
    $('quizFill').style.width = (answers.length / QUESTIONS.length * 100) + '%';
    if (answers.length >= QUESTIONS.length) {
      setTimeout(() => startShake(), 340);
    } else {
      setTimeout(() => { qIdx++; renderQuestion(); SFX.page(); }, 300);
    }
  }

  function undoAnswer() {
    const k = answers.pop();
    if (k) counts[k] -= 2;
    $('quizFill').style.width = (answers.length / QUESTIONS.length * 100) + '%';
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
    return PERSONAS[resolveCode()];
  }

  /* ---------- 答题 ---------- */
  const KEYS = ['A', 'B', 'C', 'D'];
  function renderQuestion() {
    const q = QUESTIONS[qIdx];
    $('quizCount').textContent = `Q${qIdx + 1}/12`;
    $('quizEyebrow').textContent = `第 ${qIdx + 1} 杯 · 正在注入`;
    const qEl = $('quizQ');
    qEl.style.animation = 'none';
    void qEl.offsetWidth;
    qEl.style.animation = '';
    qEl.textContent = q.q;

    const box = $('quizOpts');
    box.innerHTML = '';
    q.opts.forEach((o, i) => {
      const btn = document.createElement('button');
      btn.className = 'opt';
      btn.innerHTML = `<span class="opt-key">${KEYS[i]}</span><span class="opt-t"></span>`;
      btn.querySelector('.opt-t').textContent = o.t;
      btn.addEventListener('click', () => {
        SFX.select();
        btn.classList.add('picked');
        box.style.pointerEvents = 'none';
        setTimeout(() => { box.style.pointerEvents = ''; }, 340);
        pickAnswer(o.k);
      });
      box.appendChild(btn);
    });
  }

  function startQuiz() {
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
    const texts = ['正在加入气泡…', '注入灵魂糖浆…', '均匀摇晃中…', '挂霜摆盘,盖章认证…'];
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
    const card = $('resultCard');
    card.style.setProperty('--pc', p.color);
    const ink = isDarkColor(p.color) ? '#FFFFFF' : 'var(--ac-ink)';
    $('cardBand').style.color = ink;
    $('cardCode').textContent = resolveCode();
    $('cardEn').textContent = p.en.toUpperCase();
    $('cardName').textContent = p.name;
    $('cardTags').innerHTML = p.tags.map(t => `<i>${t}</i>`).join('');
    $('cardIng').innerHTML =
      `<div class="ing-head"><b>性格成分表</b><span>NUTRITION FACTS / 每杯含量</span></div>` +
      p.ingredients.map(x =>
        `<div class="ing-row"><b>${x.n}</b><span class="dots"></span><em>${x.p}%</em></div>`).join('');

    renderAxes();
    renderPersonasMatrix();
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

  function renderPersonasMatrix() {
    const box = $('personasMatrix');
    if (!box) return;
    box.innerHTML = '';
    const curCode = resolveCode();
    Object.entries(PERSONAS).forEach(([code, item]) => {
      const chip = document.createElement('div');
      const isCur = code === curCode;
      chip.className = 'matrix-chip' + (isCur ? ' current' : '');
      chip.style.setProperty('--c-chip', item.color);
      chip.innerHTML = `
        <span class="m-code">${code}</span>
        <span class="m-name">${item.name}</span>
        ${isCur ? '<span class="m-cur-tag">你的特调</span>' : ''}
      `;
      box.appendChild(chip);
    });
  }

  function codeLetters() {
    const pairs = [['E', 'I'], ['S', 'N'], ['T', 'F'], ['J', 'P']];
    let c = '';
    for (const [a, b] of pairs) c += counts[a] >= counts[b] ? a : b;
    return c;
  }

  function renderAxes() {
    const box = $('axesBox');
    box.innerHTML = '';
    AXES.forEach((ax, i) => {
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
    c.fillText('D R I N K   P E R S O N A   L A B', W / 2, 120);
    c.fillStyle = '#5A6070';
    c.font = F(22);
    c.fillText('—— 检 测 完 毕 ——', W / 2, 170);

    // 色带(MBTI + EN)
    const bandY = 240, bandH = 72;
    const dark = isDarkColor(p.color);
    c.fillStyle = p.color;
    rr(c, W / 2 - 260, bandY, 520, bandH, 36); c.fill();
    c.fillStyle = dark ? '#FFFFFF' : '#10120A';
    c.font = F(30, 900);
    c.fillText(resolveCode() + '  ·  ' + p.en.toUpperCase(), W / 2, bandY + 47);

    // 饮料名
    c.fillStyle = '#F2F4F0';
    c.font = F(120, 900);
    c.fillText(p.name, W / 2, 460);
    // 标签
    let tx = W / 2 - (p.tags.length * 150 - 20) / 2;
    c.textAlign = 'left';
    p.tags.forEach(t => {
      c.font = F(26, 700);
      const w = c.measureText(t).width + 52;
      c.strokeStyle = 'rgba(255,255,255,0.16)'; c.lineWidth = 2;
      rr(c, tx, 505, w, 56, 28); c.stroke();
      c.fillStyle = '#949AA8';
      c.fillText(t, tx + 26, 543);
      tx += w + 18;
    });

    // 成分表卡片
    const cx = 120, cy = 640, cw = W - 240;
    c.fillStyle = '#14161E';
    rr(c, cx, cy, cw, 330, 30); c.fill();
    c.strokeStyle = 'rgba(255,255,255,0.10)'; c.stroke();
    c.fillStyle = '#F2F4F0'; c.font = F(30, 900);
    c.fillText('性格成分表', cx + 44, cy + 62);
    c.fillStyle = '#5A6070'; c.font = F(20);
    c.textAlign = 'right'; c.fillText('NUTRITION FACTS / 每杯含量', cx + cw - 44, cy + 60);
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
    c.fillText('四 维 成 分 轴', W / 2, 1250);
    AXES.forEach((ax, i) => {
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
    c.fillText('饮料人格研究所 · 12 道题摇出真实的你', W / 2, 1560);

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
      a.href = data; a.download = '饮料人格-' + persona.name + '.png';
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

    $('btnStart').addEventListener('click', () => { SFX.pour(); startQuiz(); });
    $('btnTheme').addEventListener('click', toggleTheme);
    $('btnTheme2').addEventListener('click', toggleTheme);

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
        const keyMap = { '1': 0, 'a': 0, 'A': 0, '2': 1, 'b': 1, 'B': 1, '3': 2, 'c': 2, 'C': 2, '4': 3, 'd': 3, 'D': 3 };
        if (e.key in keyMap) {
          const opts = $('quizOpts').querySelectorAll('.opt');
          const idx = keyMap[e.key];
          if (opts[idx]) opts[idx].click();
        } else if (e.key === 'Backspace' || e.key === 'Escape' || e.key === 'ArrowLeft') {
          window.__dpGoBack();
        }
      } else if (cur === 'cover' && (e.key === 'Enter' || e.key === ' ')) {
        $('btnStart').click();
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
