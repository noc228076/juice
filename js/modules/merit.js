/* =========================================================
   模块 9：静心功德局 · 电子木鱼 & 怨气粉碎机 (Cyber Merit & Stress Relief)
   三大解压法器：电子木鱼 / 无尽减压泡泡纸 / 怨气碎纸机与火盆
   ========================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'juice_merit_state_v1';

  let state = {
    todayMerit: 0,
    totalMerit: 0,
    poppedCount: 0,
    shreddedCount: 0,
    lastDate: ''
  };

  let curSubmod = 'muyu';
  let curChant = '功德 +1';
  let curChantVal = 1;
  let curSoundMode = 'wood'; // 'wood' | 'bowl' | 'duck'
  let autoTimer = null;
  let isPointerDownOnBubbles = false;
  let isDestroying = false;

  // Web Audio 合成器上下文
  let audioCtx = null;
  function getAudioCtx() {
    if (!audioCtx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (AC) audioCtx = new AC();
    }
    if (audioCtx && audioCtx.state === 'suspended') {
      audioCtx.resume().catch(() => {});
    }
    return audioCtx;
  }

  function isSfxMuted() {
    return window.SFX && typeof window.SFX.isMuted === 'function' && window.SFX.isMuted();
  }

  // 合成逼真木鱼 / 颂钵 / 功德鸭 / 捏泡泡 / 碎纸音效
  function playMeritSound(type) {
    if (isSfxMuted()) return;
    const ctx = getAudioCtx();
    if (!ctx) return;
    const now = ctx.currentTime;

    if (type === 'wood') {
      // 檀木鱼：低频空腔共鸣 + 瞬态木槌敲击
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();

      osc1.type = 'sine';
      osc1.frequency.setValueAtTime(195, now);
      osc1.frequency.exponentialRampToValueAtTime(142, now + 0.14);

      osc2.type = 'triangle';
      osc2.frequency.setValueAtTime(585, now);
      osc2.frequency.exponentialRampToValueAtTime(290, now + 0.06);

      gain.gain.setValueAtTime(0.45, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(ctx.destination);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 0.19);
      osc2.stop(now + 0.19);
    } else if (type === 'bowl') {
      // 藏式静心颂钵：悠长空灵泛音
      [432, 648, 864].forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq, now);
        const startVol = [0.28, 0.14, 0.07][idx];
        gain.gain.setValueAtTime(startVol, now);
        gain.gain.exponentialRampToValueAtTime(0.0008, now + 1.15);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
      });
    } else if (type === 'duck') {
      // 功德小黄鸭：滑音谐振
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(520, now);
      osc.frequency.linearRampToValueAtTime(780, now + 0.06);
      osc.frequency.exponentialRampToValueAtTime(340, now + 0.18);
      gain.gain.setValueAtTime(0.18, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.19);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.2);
    } else if (type === 'pop') {
      // 塑料泡泡清脆爆破音（随机微调音高）
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const baseFreq = 320 + Math.random() * 180;
      osc.type = 'sine';
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(baseFreq * 2.6, now + 0.045);
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.055);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now);
      osc.stop(now + 0.06);
    } else if (type === 'goldpop') {
      // 黄金泡泡暴击音效
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(f, now + i * 0.04);
        gain.gain.setValueAtTime(0.22, now + i * 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.04 + 0.22);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now + i * 0.04);
        osc.stop(now + i * 0.04 + 0.24);
      });
    } else if (type === 'shred') {
      // 拟真碎纸机音效：低频电机嗡鸣 + 连续带节奏的纸张刀片咬合切割声 (1.5秒)
      const dur = 1.5;
      const motor = ctx.createOscillator();
      const motorGain = ctx.createGain();
      motor.type = 'sawtooth';
      motor.frequency.setValueAtTime(118, now);
      motor.frequency.linearRampToValueAtTime(104, now + dur);
      motorGain.gain.setValueAtTime(0.06, now);
      motorGain.gain.exponentialRampToValueAtTime(0.005, now + dur);
      motor.connect(motorGain);
      motorGain.connect(ctx.destination);
      motor.start(now);
      motor.stop(now + dur);

      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const pulse = 0.55 + 0.45 * Math.sin(t * 68);
        data[i] = (Math.random() * 2 - 1) * pulse;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1350, now);
      filter.Q.setValueAtTime(1.8, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.24, now);
      gain.gain.setValueAtTime(0.24, now + dur * 0.8);
      gain.gain.exponentialRampToValueAtTime(0.008, now + dur);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    } else if (type === 'burn') {
      // 拟真火焰焚烧噼啪声：低沉火浪呼啸 + 高频火星爆裂噼啪声 (1.55秒)
      const dur = 1.55;
      const bufferSize = Math.floor(ctx.sampleRate * dur);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const crackle = Math.random() > 0.985 ? (Math.random() * 2 - 1) * 2.8 : (Math.random() * 2 - 1) * 0.45;
        data[i] = crackle * Math.exp(-i / (ctx.sampleRate * 1.1));
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(680, now);
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.32, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + dur);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);
      noise.start(now);
    }
  }

  // 本地时区的 YYYY-MM-DD：toISOString 是 UTC 日，东八区 0-8 点会把「今日功德」记到昨天
  function localDayStr(d) {
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }

  function loadState() {
    const todayStr = localDayStr(new Date());
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        // 形状校验：字符串/数组 spread 进来会污染 state 的数字键
        if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
          state = { ...state, ...parsed };
        }
      }
    } catch (e) {}
    if (state.lastDate !== todayStr) {
      state.todayMerit = 0;
      state.lastDate = todayStr;
      saveState();
    }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {}
  }

  function getMeritRank(total) {
    if (total >= 10000) return '👑 大威天龙功德神';
    if (total >= 3000) return '🪷 功德圆满活佛';
    if (total >= 1000) return '🧘 人间清醒禅师';
    if (total >= 300) return '📿 工位静心大师';
    if (total >= 88) return '🕯️ 情绪稳定居士';
    return '🌱 初级牛马行者';
  }

  function updateStatsBanner() {
    const elToday = document.getElementById('mrStatToday');
    const elTotal = document.getElementById('mrStatTotal');
    const elPopped = document.getElementById('mrStatPopped');
    const elRank = document.getElementById('mrStatRank');

    if (elToday) elToday.textContent = state.todayMerit.toLocaleString();
    if (elTotal) elTotal.textContent = state.totalMerit.toLocaleString();
    if (elPopped) elPopped.textContent = state.poppedCount.toLocaleString();
    if (elRank) elRank.textContent = getMeritRank(state.totalMerit);
  }

  function addMerit(amount) {
    state.todayMerit += amount;
    state.totalMerit += amount;
    saveState();
    updateStatsBanner();
  }

  // 渲染高光檀木鎏金电子木鱼与木槌 SVG
  function renderMuyuSvg() {
    const box = document.getElementById('mrMuyuSvgBox');
    if (!box) return;
    box.innerHTML = `
      <div class="muyu-ripple"></div>
      <svg viewBox="0 0 220 180" width="200" height="164" style="filter: drop-shadow(0 14px 24px rgba(0,0,0,0.45));">
        <defs>
          <radialGradient id="g_muyu_body" cx="38%" cy="30%" r="70%">
            <stop offset="0%" stop-color="#FDE68A"/>
            <stop offset="28%" stop-color="#D97706"/>
            <stop offset="72%" stop-color="#92400E"/>
            <stop offset="100%" stop-color="#451A03"/>
          </radialGradient>
          <linearGradient id="g_muyu_pad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#991B1B"/>
            <stop offset="50%" stop-color="#DC2626"/>
            <stop offset="100%" stop-color="#7F1D1D"/>
          </linearGradient>
        </defs>
        <!-- 锦缎莲花坐垫 -->
        <ellipse cx="110" cy="152" rx="76" ry="18" fill="url(#g_muyu_pad)" stroke="#F59E0B" stroke-width="2.5"/>
        <ellipse cx="110" cy="148" rx="64" ry="12" fill="none" stroke="rgba(253,230,138,0.45)" stroke-width="1.5" stroke-dasharray="6 4"/>
        <!-- 木鱼饱满圆润主体 -->
        <path d="M38,108 C34,58 68,28 112,28 C158,28 186,60 182,108 C180,138 152,150 110,150 C68,150 40,138 38,108 Z" fill="url(#g_muyu_body)" stroke="#78350F" stroke-width="2"/>
        <!-- 顶部温润高光 -->
        <ellipse cx="92" cy="54" rx="34" ry="13" transform="rotate(-10 92 54)" fill="rgba(255,255,255,0.28)"/>
        <!-- 木鱼共鸣音槽与鱼目雕刻 -->
        <path d="M40,106 Q110,122 178,104" fill="none" stroke="#290F02" stroke-width="9" stroke-linecap="round"/>
        <path d="M42,106 Q110,122 176,104" fill="none" stroke="#451A03" stroke-width="4" stroke-linecap="round"/>
        <circle cx="62" cy="105" r="9" fill="#290F02" stroke="#F59E0B" stroke-width="2"/>
        <circle cx="62" cy="105" r="3.5" fill="#FDE68A"/>
        <!-- 梵文金印纹饰 -->
        <text x="114" y="86" font-size="16" font-weight="900" fill="rgba(254,243,199,0.55)" text-anchor="middle" letter-spacing="3">MINDFUL ZEN</text>
      </svg>
      <div class="muyu-mallet">
        <svg viewBox="0 0 100 100" width="92" height="92">
          <line x1="25" y1="25" x2="82" y2="82" stroke="#B45309" stroke-width="8" stroke-linecap="round"/>
          <circle cx="22" cy="22" r="15" fill="#F59E0B" stroke="#FEF3C7" stroke-width="2"/>
        </svg>
      </div>
    `;
  }

  function knockMuyu(clientX, clientY) {
    playMeritSound(curSoundMode);
    if (navigator.vibrate) {
      try { navigator.vibrate(10); } catch (e) {}
    }

    addMerit(curChantVal);

    const actor = document.getElementById('mrMuyuSvgBox');
    if (actor) {
      actor.classList.remove('hit');
      void actor.offsetWidth;
      actor.classList.add('hit');
      setTimeout(() => actor.classList.remove('hit'), 110);
    }

    // 生成飘字
    const layer = document.getElementById('mrMuyuFloatLayer');
    const stage = document.getElementById('mrMuyuStage');
    if (layer && stage) {
      const rect = stage.getBoundingClientRect();
      let x = rect.width / 2 + (Math.random() * 60 - 30);
      let y = rect.height * 0.36;
      if (typeof clientX === 'number' && clientX > 0) {
        x = Math.min(rect.width - 50, Math.max(50, clientX - rect.left));
        y = Math.min(rect.height - 60, Math.max(40, clientY - rect.top - 20));
      }

      const item = document.createElement('div');
      item.className = 'muyu-float-item';
      item.style.left = `${x}px`;
      item.style.top = `${y}px`;
      item.textContent = curChant;
      layer.appendChild(item);
      setTimeout(() => item.remove(), 960);
    }
  }

  function toggleAutoKnock() {
    const btn = document.getElementById('mrBtnAutoMuyu');
    if (autoTimer) {
      clearInterval(autoTimer);
      autoTimer = null;
      if (btn) {
        btn.classList.remove('running');
        btn.textContent = '⚡ 开启自动连续敲击';
      }
    } else {
      knockMuyu();
      autoTimer = setInterval(() => {
        const mod = document.getElementById('mod-merit');
        if (!mod || !mod.classList.contains('active') || curSubmod !== 'muyu') {
          // 已离开模块/子页：自动敲击自停，避免常驻空转
          clearInterval(autoTimer);
          autoTimer = null;
          const runBtn = document.querySelector('[data-auto]');
          if (runBtn) { runBtn.classList.remove('running'); runBtn.textContent = '▶️ 自动连续敲击'; }
          return;
        }
        knockMuyu();
      }, 650);
      if (btn) {
        btn.classList.add('running');
        btn.textContent = '⏸️ 自动连续敲击攒功德中...';
      }
    }
  }

  /* =========================================================
     子模式 2：无尽减压泡泡纸 (Bubble Wrap)
     ========================================================= */
  const POP_WORDS = ['爽！', '噗！', '解压+1', '内耗-1', '舒坦', '波~', '焦虑-1'];
  let sheetPopped = 0;
  const SHEET_TOTAL = 36;

  function renderBubbleSheet() {
    const grid = document.getElementById('mrBubbleGrid');
    const toast = document.getElementById('mrBubbleToast');
    if (!grid) return;

    sheetPopped = 0;
    if (toast) toast.classList.remove('show');
    updateBubbleProgress();

    // 随机选 2 颗作为黄金暴击泡泡
    const goldIdx1 = Math.floor(Math.random() * SHEET_TOTAL);
    let goldIdx2 = Math.floor(Math.random() * SHEET_TOTAL);
    if (goldIdx2 === goldIdx1) goldIdx2 = (goldIdx1 + 7) % SHEET_TOTAL;

    grid.innerHTML = '';
    for (let i = 0; i < SHEET_TOTAL; i++) {
      const btn = document.createElement('button');
      const isGold = i === goldIdx1 || i === goldIdx2;
      btn.className = 'bubble-cell' + (isGold ? ' golden' : '');
      btn.dataset.gold = isGold ? '1' : '0';
      btn.setAttribute('aria-label', isGold ? '黄金减压泡泡' : '减压泡泡');

      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        /* 触屏 pointerdown 后隐式捕获，兄弟节点收不到 pointerenter——
           主动释放，让「滑动连捏」在手机上也能用 */
        try { btn.releasePointerCapture(e.pointerId); } catch (err) {}
        isPointerDownOnBubbles = true;
        popBubbleCell(btn);
      });

      btn.addEventListener('pointerenter', () => {
        if (isPointerDownOnBubbles) {
          popBubbleCell(btn);
        }
      });

      grid.appendChild(btn);
    }
  }

  function popBubbleCell(cell) {
    if (!cell || cell.classList.contains('popped')) return;
    cell.classList.add('popped');
    const isGold = cell.dataset.gold === '1';

    if (isGold) {
      playMeritSound('goldpop');
      cell.textContent = '暴富！';
      addMerit(10);
    } else {
      playMeritSound('pop');
      cell.textContent = POP_WORDS[Math.floor(Math.random() * POP_WORDS.length)];
      addMerit(1);
    }

    if (navigator.vibrate) {
      try { navigator.vibrate(isGold ? [15, 30, 20] : 8); } catch (e) {}
    }

    sheetPopped++;
    state.poppedCount++;
    saveState();
    updateStatsBanner();
    updateBubbleProgress();

    if (sheetPopped >= SHEET_TOTAL) {
      const toast = document.getElementById('mrBubbleToast');
      if (toast) toast.classList.add('show');
      if (window.SFX && window.SFX.reveal) window.SFX.reveal();
    }
  }

  function updateBubbleProgress() {
    const el = document.getElementById('mrBubbleSheetProgress');
    if (el) {
      el.innerHTML = `当前整张进度：<b>${sheetPopped} / ${SHEET_TOTAL}</b> 颗（支持按住滑动连环捏爆）`;
    }
  }

  /* =========================================================
     子模式 3：怨气碎纸机 & 除秽火盆 (Shredder)
     ========================================================= */
  const SHRED_QUOTES = [
    '✨ 粉碎完成！该破防事项已从宇宙时间线彻底抹除，功德 +10！',
    '🔥 焚化完毕！所有水逆与甩锅晦气已反弹回始作俑者，功德 +10！',
    '⚡ 烦恼清除成功！今日份精神内耗已转化为纯正摸鱼能量，功德 +10！',
    '🛡️ 物理级销毁达成！没人能再拿这件事消耗你的乳腺与发际线！'
  ];

  function triggerDestroy(mode) {
    if (isDestroying) return;
    const stage = document.getElementById('mrShredStage');
    const note = document.getElementById('mrShredPaper');
    const textarea = document.getElementById('mrShredInput');
    const stripsBox = document.getElementById('mrShredStrips');
    const fireLayer = document.getElementById('mrShredFireLayer');
    const fxBox = document.getElementById('mrShredFxBox');
    const slotTitle = document.getElementById('mrShredSlotTitle');
    const msgEl = document.getElementById('mrShredResultMsg');

    if (!note || !textarea) return;
    const textVal = textarea.value.trim() || '不可名状的上班怨气与精神内耗';
    // 如果用户没写字，把默认字填进纸条，让用户亲眼看着字被切碎/烧掉！
    if (!textarea.value.trim()) {
      textarea.value = textVal;
    }

    isDestroying = true;
    playMeritSound(mode === 'burn' ? 'burn' : 'shred');
    if (navigator.vibrate) {
      try { navigator.vibrate([30, 50, 30, 50, 40]); } catch (e) {}
    }

    if (stage) stage.classList.add('vibrating');

    if (mode === 'burn') {
      if (slotTitle) slotTitle.textContent = '🔥 三昧真火高温焚化炉运转中 🔥';
      if (msgEl) msgEl.textContent = '🔥 正在启动三昧真火将怨气烧成灰烬……';
      note.classList.add('burning');

      // 在进纸视窗生成多束升腾烈焰与飞舞火星
      if (fireLayer) {
        fireLayer.innerHTML = '';
        for (let i = 0; i < 12; i++) {
          const tongue = document.createElement('div');
          tongue.className = 'burn-flame-tongue';
          tongue.style.left = `${4 + i * 8 + (Math.random() * 4 - 2)}%`;
          tongue.style.animationDelay = `${(Math.random() * 0.22).toFixed(2)}s`;
          fireLayer.appendChild(tongue);
        }
        for (let j = 0; j < 26; j++) {
          const ember = document.createElement('div');
          ember.className = 'burn-ember';
          ember.style.left = `${8 + Math.random() * 84}%`;
          ember.style.setProperty('--ex', `${(Math.random() * 60 - 30).toFixed(1)}px`);
          ember.style.animationDelay = `${(Math.random() * 0.65).toFixed(2)}s`;
          fireLayer.appendChild(ember);
        }
      }
    } else {
      if (slotTitle) slotTitle.textContent = '⚙️ 高压钛合金刀辊高速咬合切碎中 ⚙️';
      if (msgEl) msgEl.textContent = '⚙️ 正在将破防便签卷入刀辊切成 16 缕碎纸条……';
      note.classList.add('shredding');

      // 根据用户输入的真实文本生成 16 根带残字的竖向碎纸条，从刀口下方同步吐出
      if (stripsBox) {
        stripsBox.classList.remove('active');
        const cleanChars = textVal.replace(/\s+/g, '');
        const stripCount = 16;
        let html = '';
        for (let i = 0; i < stripCount; i++) {
          // 每一根纸条截取对应的残字
          let stripChars = '';
          for (let r = 0; r < 5; r++) {
            const chIdx = (i + r * 3) % cleanChars.length;
            stripChars += cleanChars[chIdx] || '碎';
          }
          const delay = ((i % 4) * 0.03 + Math.random() * 0.04).toFixed(2);
          const dx = ((i - stripCount / 2) * 1.8 + (Math.random() * 6 - 3)).toFixed(1);
          const rotMid = ((Math.random() * 8 - 4)).toFixed(1);
          const rotEnd = ((i % 2 === 0 ? 1 : -1) * (5 + Math.random() * 14)).toFixed(1);
          html += `<div class="shred-strip" style="--delay:${delay}s;--dx:${dx}px;--rotMid:${rotMid}deg;--rotEnd:${rotEnd}deg;">${window.escHtml(stripChars)}</div>`;
        }
        stripsBox.innerHTML = html;
        void stripsBox.offsetWidth;
        stripsBox.classList.add('active');
      }

      // 同时在集屑仓喷溅细碎纸屑颗粒
      if (fxBox) {
        fxBox.querySelectorAll('.shred-crumb').forEach(el => el.remove());
        for (let k = 0; k < 18; k++) {
          const crumb = document.createElement('div');
          crumb.className = 'shred-crumb';
          crumb.style.left = `${12 + Math.random() * 76}%`;
          crumb.style.setProperty('--cx', `${(Math.random() * 70 - 35).toFixed(1)}px`);
          crumb.style.setProperty('--cr', `${Math.floor(Math.random() * 360 - 180)}deg`);
          crumb.style.animationDelay = `${(0.15 + Math.random() * 0.75).toFixed(2)}s`;
          fxBox.appendChild(crumb);
        }
      }
    }

    setTimeout(() => {
      if (stage) stage.classList.remove('vibrating');
      if (slotTitle) slotTitle.textContent = '▼ 高压钛合金碎纸刀辊 · 除秽焚化炉 ▼';

      state.shreddedCount++;
      addMerit(10);
      if (window.SFX && window.SFX.reveal) window.SFX.reveal();

      const quote = SHRED_QUOTES[Math.floor(Math.random() * SHRED_QUOTES.length)];
      if (msgEl) msgEl.textContent = `【已清运 ${state.shreddedCount} 件】${quote}`;

      // 恢复空白新便签纸
      note.classList.remove('shredding', 'burning');
      if (stripsBox) {
        stripsBox.classList.remove('active');
        stripsBox.innerHTML = '';
      }
      if (fireLayer) fireLayer.innerHTML = '';
      if (fxBox) fxBox.querySelectorAll('.shred-crumb').forEach(el => el.remove());

      textarea.value = '';
      textarea.placeholder = `上一条「${textVal.slice(0, 12)}…」已彻底粉碎清零！还有什么不爽继续写下来销毁…`;
      isDestroying = false;
    }, 1680);
  }

  /* =========================================================
     生成《静心功德与怨气清运凭证》高清分享海报
     ========================================================= */
  function drawMeritPoster() {
    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = 1620;
    const ctx = cv.getContext('2d');
    const isDark = document.documentElement.dataset.theme !== 'light';

    // 背景
    ctx.fillStyle = isDark ? '#111018' : '#FAF7F2';
    ctx.fillRect(0, 0, 1080, 1620);

    // 外框卡片
    ctx.fillStyle = isDark ? '#1B1926' : '#FFFFFF';
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 5;
    roundRect(ctx, 80, 80, 920, 1460, 36);
    ctx.fill();
    ctx.stroke();

    // 标题
    ctx.textAlign = 'center';
    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 26px monospace';
    ctx.fillText('MINDFUL MERIT & STRESS RELIEF CERTIFICATE', 540, 175);

    ctx.fillStyle = isDark ? '#FFFFFF' : '#1E1B18';
    ctx.font = '900 54px system-ui, sans-serif';
    ctx.fillText('静心功德与怨气清运凭证', 540, 260);

    // 禅修境界勋章
    const rankTitle = getMeritRank(state.totalMerit);
    ctx.fillStyle = 'rgba(245, 158, 11, 0.15)';
    roundRect(ctx, 310, 305, 460, 68, 34);
    ctx.fill();
    ctx.strokeStyle = '#F59E0B';
    ctx.lineWidth = 2.5;
    ctx.stroke();

    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 32px system-ui, sans-serif';
    ctx.fillText(`当前果位：${rankTitle}`, 540, 351);

    // 三大功德数据格
    const cards = [
      { label: '🪵 累计敲击静心功德', val: `${state.totalMerit}`, unit: '点功德圆满', color: '#F59E0B' },
      { label: '🫧 累计捏爆减压泡泡', val: `${state.poppedCount}`, unit: '颗焦虑清零', color: '#22D3EE' },
      { label: '🔥 累计粉碎破防怨气', val: `${state.shreddedCount}`, unit: '件水逆退散', color: '#FB7185' }
    ];

    cards.forEach((c, idx) => {
      const y = 430 + idx * 210;
      ctx.fillStyle = isDark ? '#242134' : '#F3EFE6';
      roundRect(ctx, 140, y, 800, 180, 24);
      ctx.fill();
      ctx.strokeStyle = c.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = c.color;
      ctx.font = '800 28px system-ui, sans-serif';
      ctx.fillText(c.label, 185, y + 62);

      ctx.fillStyle = isDark ? '#FFFFFF' : '#111827';
      ctx.font = '900 64px monospace';
      ctx.fillText(c.val, 185, y + 142);

      ctx.textAlign = 'right';
      ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
      ctx.font = 'bold 26px system-ui, sans-serif';
      ctx.fillText(c.unit, 895, y + 135);
    });

    // 静心箴言
    ctx.textAlign = 'center';
    ctx.fillStyle = isDark ? '#E2E8F0' : '#334155';
    ctx.font = 'bold 28px system-ui, sans-serif';
    ctx.fillText('「敲最响的电子木鱼，捏最爽的减压泡泡，烧最烦的破防瞬间」', 540, 1135);
    ctx.font = '25px system-ui, sans-serif';
    ctx.fillStyle = isDark ? '#94A3B8' : '#64748B';
    ctx.fillText('经静心功德局核验：持证人今日体内怨气已 100% 物理超度，', 540, 1190);
    ctx.fillText('诸邪退散、Bug 清零、乳腺畅通、财源滚滚！', 540, 1235);

    // 朱砂印章
    ctx.save();
    ctx.translate(540, 1355);
    ctx.rotate(-7 * Math.PI / 180);
    ctx.strokeStyle = '#E11D48';
    ctx.lineWidth = 5;
    roundRect(ctx, -175, -52, 350, 104, 16);
    ctx.stroke();
    ctx.fillStyle = '#E11D48';
    ctx.font = '900 38px system-ui, sans-serif';
    ctx.fillText('诸邪退散 · 功德无量', 0, 14);
    ctx.restore();

    ctx.fillStyle = '#94A3B8';
    ctx.font = '22px monospace';
    ctx.fillText('饮料人格研究所 · 静心功德局', 540, 1485);

    const a = document.createElement('a');
    a.download = `静心功德凭证_${Date.now()}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.arcTo(x + w, y, x + w, y + r, r);
    ctx.lineTo(x + w, y + h - r);
    ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
    ctx.lineTo(x + r, y + h);
    ctx.arcTo(x, y + h, x, y + h - r, r);
    ctx.lineTo(x, y + r);
    ctx.arcTo(x, y, x + r, y, r);
    ctx.closePath();
  }

  function switchSubmod(sub) {
    curSubmod = sub;
    if (window.SFX && window.SFX.tap) window.SFX.tap();
    document.querySelectorAll('#mod-merit .mr-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.submod === sub);
    });
    document.querySelectorAll('#mod-merit .mr-substage').forEach(s => {
      s.classList.toggle('active', s.id === `mr-sub-${sub}`);
    });
  }

  let isInitialized = false;

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    loadState();
    renderMuyuSvg();
    renderBubbleSheet();
    updateStatsBanner();

    // 全局松开指针结束滑动捏泡泡
    window.addEventListener('pointerup', () => {
      isPointerDownOnBubbles = false;
    });

    // 绑定三大子法器切换
    document.querySelectorAll('#mod-merit .mr-tab').forEach(tab => {
      tab.onclick = () => switchSubmod(tab.dataset.submod);
    });

    // 绑定木鱼祈福词条切换
    document.querySelectorAll('#mod-merit .muyu-pill').forEach(pill => {
      pill.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        curChant = pill.dataset.chant || '功德 +1';
        curChantVal = parseInt(pill.dataset.val || '1', 10);
        document.querySelectorAll('#mod-merit .muyu-pill').forEach(p => p.classList.toggle('active', p === pill));
      };
    });

    // 绑定木鱼舞台点击
    const muyuStage = document.getElementById('mrMuyuStage');
    if (muyuStage) {
      muyuStage.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        knockMuyu(e.clientX, e.clientY);
      });
    }

    // 绑定空格键敲木鱼
    window.addEventListener('keydown', (e) => {
      const mod = document.getElementById('mod-merit');
      if (!mod || !mod.classList.contains('active')) return;
      if (curSubmod === 'muyu' && e.code === 'Space' && document.activeElement.tagName !== 'TEXTAREA' && document.activeElement.tagName !== 'INPUT') {
        e.preventDefault();
        knockMuyu();
      }
    });

    // 绑定木鱼音色切换
    document.querySelectorAll('#mod-merit [data-muyu-sound]').forEach(btn => {
      btn.onclick = () => {
        curSoundMode = btn.dataset.muyuSound;
        playMeritSound(curSoundMode);
        document.querySelectorAll('#mod-merit [data-muyu-sound]').forEach(b => b.classList.toggle('active', b === btn));
      };
    });

    // 绑定自动敲木鱼
    const btnAuto = document.getElementById('mrBtnAutoMuyu');
    if (btnAuto) btnAuto.onclick = toggleAutoKnock;

    // 绑定换一张泡泡纸
    const btnNewSheet = document.getElementById('mrBtnNewBubbleSheet');
    if (btnNewSheet) {
      btnNewSheet.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        renderBubbleSheet();
      };
    }

    // 绑定怨气预设词条点击填入
    document.querySelectorAll('#mod-merit .shred-preset-tag').forEach(tag => {
      tag.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const inp = document.getElementById('mrShredInput');
        if (inp) inp.value = tag.textContent.trim();
      };
    });

    // 绑定粉碎与火盆按钮
    const btnShred = document.getElementById('mrBtnDoShred');
    if (btnShred) btnShred.onclick = () => triggerDestroy('shred');

    const btnBurn = document.getElementById('mrBtnDoBurn');
    if (btnBurn) btnBurn.onclick = () => triggerDestroy('burn');

    // 绑定底部开具凭证与归档按钮
    const btnPoster = document.getElementById('mrBtnPoster');
    if (btnPoster) {
      btnPoster.onclick = () => {
        if (window.SFX && window.SFX.save) window.SFX.save();
        const rank = getMeritRank(state.totalMerit);
        if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
          window.UniversalHistory.add({
            module: 'merit',
            title: `${rank} · 功德 ${state.totalMerit}`,
            subtitle: `捏爆泡泡 ${state.poppedCount} 颗 · 粉碎怨气 ${state.shreddedCount} 件`,
            color: '#F59E0B',
            badge: '📿 功德',
            avatar: '🪵',
            data: { ...state }
          });
        }
        drawMeritPoster();
      };
    }
  }

  function restore(recordData) {
    init();
    if (recordData && typeof recordData.totalMerit === 'number') {
      state.totalMerit = Math.max(state.totalMerit, recordData.totalMerit);
      updateStatsBanner();
    }
  }

  window.AppMerit = {
    init,
    restore,
    knockMuyu,
    drawMeritPoster
  };
})();
