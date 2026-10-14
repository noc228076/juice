/* =========================================================
   模块 11：幸运刮刮乐 (Lucky Scratch Lab)
   物理刮擦涂层 · 粒子飞溅 · 5大趣味票券 · 沉浸式解压刮奖
   ========================================================= */

(function () {
  'use strict';

  // 1. 票券主题与玩法知识库
  const THEMES = {
    wealth: {
      name: '暴富发财券 · 招财进宝版',
      badge: 'LUCKY SCRATCH · 暴富局',
      price: '面额 ¥8888 财富值',
      rule: '✦ 玩法规则：刮开覆盖膜，若【我的号码】撞中【幸运号码】，即中对应神秘财富！',
      coverText: '✦ 刮开涂层 · 揭晓暴富大奖 ✦',
      coverType: 'gold',
      pool: [
        { title: '【财富自由精神体验卡】', val: '¥88,888', rank: 'SSS' },
        { title: '【突如其来的巨额横财】', val: '¥66,666', rank: 'SSS' },
        { title: '【本周工资隐秘上涨 20%】', val: '¥20,000', rank: 'SS' },
        { title: '【报销秒通过免审光环】', val: '¥8,888', rank: 'S' },
        { title: '【喝奶茶永远被请客】', val: '¥5,200', rank: 'S' },
        { title: '【随手买水果买一送一】', val: '¥1,888', rank: 'A' },
        { title: '【抢红包永远是手气最佳】', val: '¥999', rank: 'A' },
        { title: '【股票基金全线飘红】', val: '¥12,800', rank: 'SS' }
      ]
    },
    office: {
      name: '工位护体券 · 摸鱼免死版',
      badge: 'OFFICE SHIELD · 护体局',
      price: '面额 999 摸鱼值',
      rule: '✦ 玩法规则：刮开 6 大工位勋章，若集齐 3 枚相同神符或黄金护体标，即中职场免死特权！',
      coverText: '✦ 刮开涂层 · 解锁工位护体 ✦',
      coverType: 'emerald',
      badges: [
        { ico: '👑', title: '老板视线屏蔽符', desc: '戴上耳机视若无睹' },
        { ico: '⌨️', title: '狂敲键盘假忙结界', desc: '手速如飞实际在放空' },
        { ico: '🏖️', title: '周五四点准点溜走', desc: '准点打卡群里隐身' },
        { ico: '🛡️', title: '甩锅太极八卦掌', desc: '万事皆因隔壁组' },
        { ico: '🍵', title: '带薪如厕静音舱', desc: '马桶上刷完短剧' },
        { ico: '💤', title: '开会点头神游术', desc: '眼神坚定脑中火锅' }
      ]
    },
    drink: {
      name: '特调密语券 · 隐藏配方版',
      badge: 'MOCKTAIL LAB · 特调局',
      price: '面额 1 杯灵魂特调',
      rule: '✦ 玩法规则：刮开三层配方涂层，揭晓你的今日专属隐藏款特调与精神解压处方！',
      coverText: '✦ 刮开涂层 · 萃取灵魂特调 ✦',
      coverType: 'purple',
      bases: ['75% 极光冷萃白桃乌龙', '80% 破防拯救生椰厚乳', '90% 浓缩微醺热红酒', '85% 暴打手打香水浓柠'],
      infusions: ['注入 30ml 情绪稳定糖浆', '深吸 5 滴社恐防腐剂', '加入 满杯快乐脆啵啵', '喷洒 2 泵暴富催化剂'],
      drinks: [
        { name: '🍹 【微醺暴击杨枝甘露】', desc: '嚼碎所有烦恼，灵魂瞬间轻盈回血' },
        { name: '☕ 【绝地求生超浓黑焦糖美式】', desc: '苦尽甘来，逻辑超神，专治精神内耗' },
        { name: '🥛 【佛系躺平厚乳波波茶】', desc: '三分微糖，暖胃暖心，生活自己做主' },
        { name: '🍋 【暴打焦虑香水柠柠苏打】', desc: '酸爽激爽，一口清空所有烦心杂事' }
      ]
    },
    retrograde: {
      name: '水逆退散券 · 诸邪避退版',
      badge: 'ARCANA SEAL · 避退局',
      price: '面额 9999 功德力',
      rule: '✦ 玩法规则：亲手用手指刮除所有水逆与焦虑，底层金光大盛，万事迎刃而解！',
      coverText: '✦ 刮除水逆 · 迎好运盛放 ✦',
      coverType: 'red',
      blessings: [
        { title: '🌟 上上签 · 万事胜意', text: '水逆尽数退散，贵人乘风而来！凡所期盼皆有回响，好运如期而至。' },
        { title: '☀️ 天德吉星 · 逢凶化吉', text: '小人是非自觉退避，磁场彻底净化，今晚安睡如婴，明日神清气爽！' },
        { title: '🚀 顺风顺水 · 步步高升', text: '卡住的项目迎来关键转机，柳暗花明，财富与福气一路绿灯开挂！' },
        { title: '💫 诸邪避退 · 平安顺遂', text: '精神内耗彻底清零，情绪稳定气场全开，所有绊脚石都化作垫脚石！' }
      ]
    },
    love: {
      name: '心动脱单券 · 浪漫直球版',
      badge: 'CUPID ROMANCE · 心动局',
      price: '面额 520 甜度值',
      rule: '✦ 玩法规则：刮开四叶心动涂层，测定今日心动指数与不可思议的浪漫机缘！',
      coverText: '✦ 刮开涂层 · 听心跳共鸣 ✦',
      coverType: 'coral',
      omens: [
        { score: '99% 心动爆表', title: '双向奔赴直球大告白', sub: '你暗自惦记的人，正巧也找借口想跟你多聊两句。' },
        { score: '95% 默契满分', title: '转角咖啡馆浪漫偶遇', sub: '今日出门稍加打扮，心软的神正悄悄安排一次眼神相撞。' },
        { score: '92% 桃花盛开', title: '烂桃花粉碎·正缘靠近', sub: '告别不对的人，真正懂得欣赏你奇奇怪怪可爱的人正在奔赴。' },
        { score: '88% 独美极乐', title: '单身贵族万岁万岁', sub: '吃好喝好快乐独处，不被任何情绪绑架，做自己世界里的国王！' }
      ]
    }
  };

  let curThemeKey = 'wealth';
  let curTicketData = null;
  let isScratching = false;
  let isRevealed = false;
  let lastPos = null;
  let scratchedPixels = 0;
  let totalPixels = 1;
  let lastSampleTime = 0;
  let soundCooldown = 0;

  // 粒子系统
  let particles = [];
  let animFrameId = null;

  // 2. 初始化与主流程
  function init() {
    const root = document.getElementById('mod-scratch');
    if (!root) return;

    bindDomEvents();
    loadStats();
    renderHistory();
    switchTheme('wealth');
  }

  function bindDomEvents() {
    // 主题切换按钮
    const themeBar = document.getElementById('scThemesBar');
    if (themeBar) {
      themeBar.querySelectorAll('.sc-theme-btn').forEach(btn => {
        btn.onclick = () => {
          const t = btn.dataset.theme;
          if (t && t !== curThemeKey) {
            switchTheme(t);
            if (window.SFX && window.SFX.tap) window.SFX.tap();
          }
        };
      });
    }

    // 操作按钮
    const btnQuick = document.getElementById('scBtnQuickReveal');
    if (btnQuick) btnQuick.onclick = quickReveal;

    const btnNext = document.getElementById('scBtnNextTicket');
    if (btnNext) btnNext.onclick = () => {
      generateTicket(curThemeKey);
      if (window.SFX && window.SFX.advance) window.SFX.advance();
    };

    const btnPoster = document.getElementById('scBtnGenPoster');
    if (btnPoster) btnPoster.onclick = generatePoster;

    const btnHistToggle = document.getElementById('scBtnToggleHistory');
    if (btnHistToggle) {
      btnHistToggle.onclick = () => {
        const p = document.getElementById('scHistoryPanel');
        if (p) p.scrollIntoView({ behavior: 'smooth' });
      };
    }

    const btnClearHist = document.getElementById('scBtnClearHistory');
    if (btnClearHist) {
      btnClearHist.onclick = () => {
        if (confirm('确定要清空所有刮奖战绩记录吗？')) {
          localStorage.removeItem('sc_history');
          renderHistory();
        }
      };
    }

    // 窗口尺寸变化自适应重绘涂层
    window.addEventListener('resize', debounce(() => {
      if (!isRevealed && curTicketData) {
        setupCanvasCoating();
      }
    }, 200));
  }

  function debounce(fn, ms) {
    let timer;
    return (...args) => {
      clearTimeout(timer);
      timer = setTimeout(() => fn(...args), ms);
    };
  }

  // 3. 切换主题并生成票券
  function switchTheme(themeKey) {
    if (!THEMES[themeKey]) return;
    curThemeKey = themeKey;

    // 更新主题导航胶囊高亮
    document.querySelectorAll('.sc-theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === themeKey);
    });

    generateTicket(themeKey);
  }

  function generateTicket(themeKey) {
    const config = THEMES[themeKey];
    isRevealed = false;
    isScratching = false;

    // 更新票面头信息
    const titleEl = document.getElementById('scTicketTitle');
    const badgeEl = document.getElementById('scLogoBadge');
    const priceEl = document.getElementById('scTicketPrice');
    const ruleEl = document.getElementById('scRuleBanner');
    const snEl = document.getElementById('scTicketSn');
    const barcodeEl = document.getElementById('scBarcodeText');
    const stampEl = document.getElementById('scStampBadge');

    const randomSN = `NO. ${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomBar = `BARCODE ${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(1000 + Math.random() * 9000)}`;

    if (titleEl) titleEl.textContent = config.name;
    if (badgeEl) badgeEl.textContent = config.badge;
    if (priceEl) priceEl.textContent = config.price;
    if (ruleEl) ruleEl.innerHTML = `<span>${config.rule}</span>`;
    if (snEl) snEl.textContent = randomSN;
    if (barcodeEl) barcodeEl.textContent = randomBar;
    if (stampEl) stampEl.classList.remove('stamped');

    // 重置进度条
    updateProgressUI(0);

    // 针对不同主题随机生成底层奖励内容
    const surfaceEl = document.getElementById('scPrizeSurface');
    if (!surfaceEl) return;

    let ticketPayload = {};

    if (themeKey === 'wealth') {
      const luckyNums = [Math.floor(10 + Math.random() * 89), Math.floor(10 + Math.random() * 89)];
      if (luckyNums[0] === luckyNums[1]) luckyNums[1] = luckyNums[0] + 3;

      // 6 个格子中至少 1~2 个中奖
      const shouldHit = Math.random() < 0.85;
      const hitIdx = Math.floor(Math.random() * 6);
      const items = Array(6).fill(0).map((_, i) => {
        const isHit = shouldHit && (i === hitIdx || (Math.random() < 0.25 && i !== hitIdx));
        const num = isHit ? luckyNums[Math.floor(Math.random() * 2)] : Math.floor(10 + Math.random() * 89);
        const prize = config.pool[Math.floor(Math.random() * config.pool.length)];
        return { num, prize, isHit };
      });

      surfaceEl.innerHTML = `
        <div class="sc-wealth-board">
          <div class="sc-lucky-num-zone">
            <span class="sc-lucky-num-title">🌟 幸运中奖数字：</span>
            <div class="sc-lucky-num-balls">
              <span class="sc-lucky-ball">${luckyNums[0]}</span>
              <span class="sc-lucky-ball">${luckyNums[1]}</span>
            </div>
          </div>
          <div class="sc-my-numbers-grid">
            ${items.map(it => `
              <div class="sc-num-card ${it.isHit ? 'is-hit' : ''}">
                <span class="sc-num-val">${it.num}</span>
                <span class="sc-num-prize">${it.prize.val}<br>${it.prize.title}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      ticketPayload = {
        theme: '暴富发财券',
        title: items.find(it => it.isHit)?.prize.title || '【小确幸能量红包】',
        val: items.find(it => it.isHit)?.prize.val || '¥888',
        isWin: shouldHit
      };
    } else if (themeKey === 'office') {
      // 随机选 6 个勋章，高概率三连中
      const winBadge = config.badges[Math.floor(Math.random() * config.badges.length)];
      const items = [winBadge, winBadge, winBadge];
      while (items.length < 6) {
        items.push(config.badges[Math.floor(Math.random() * config.badges.length)]);
      }
      items.sort(() => Math.random() - 0.5);

      surfaceEl.innerHTML = `
        <div class="sc-office-board">
          <div style="font-size:12px;font-weight:800;color:var(--sc-emerald);margin-bottom:4px;">
            🛡️ 今日工位护体神力 · 三连必兑
          </div>
          <div class="sc-office-badge-grid">
            ${items.map(b => `
              <div class="sc-badge-card ${b.title === winBadge.title ? 'is-winner' : ''}">
                <span class="sc-badge-ico">${b.ico}</span>
                <span class="sc-badge-title">${b.title}</span>
              </div>
            `).join('')}
          </div>
        </div>
      `;

      ticketPayload = {
        theme: '工位护体券',
        title: winBadge.title,
        val: '摸鱼免死特权',
        isWin: true
      };
    } else if (themeKey === 'drink') {
      const b = config.bases[Math.floor(Math.random() * config.bases.length)];
      const inf = config.infusions[Math.floor(Math.random() * config.infusions.length)];
      const d = config.drinks[Math.floor(Math.random() * config.drinks.length)];

      surfaceEl.innerHTML = `
        <div class="sc-drink-board">
          <div class="sc-recipe-step">
            <span class="sc-recipe-num">基底</span>
            <span class="sc-recipe-name">${b}</span>
          </div>
          <div class="sc-recipe-step">
            <span class="sc-recipe-num">注入</span>
            <span class="sc-recipe-name">${inf}</span>
          </div>
          <div class="sc-recipe-step" style="background:rgba(168,85,247,0.15);border-color:var(--sc-purple);">
            <span class="sc-recipe-num" style="background:var(--sc-purple);color:#FFF;">特调</span>
            <div style="display:flex;flex-direction:column;">
              <span class="sc-recipe-name" style="color:var(--sc-purple);font-size:14.5px;">${d.name}</span>
              <span class="sc-recipe-desc">${d.desc}</span>
            </div>
          </div>
        </div>
      `;

      ticketPayload = {
        theme: '特调密语券',
        title: d.name,
        val: '100% 灵魂饮品',
        isWin: true
      };
    } else if (themeKey === 'retrograde') {
      const bl = config.blessings[Math.floor(Math.random() * config.blessings.length)];
      surfaceEl.innerHTML = `
        <div class="sc-retrograde-board">
          <div class="sc-blessing-amulet">⛩️ 诸邪避退 · 运势金光护体</div>
          <div class="sc-blessing-title">${bl.title}</div>
          <div class="sc-blessing-text">${bl.text}</div>
        </div>
      `;

      ticketPayload = {
        theme: '水逆退散券',
        title: bl.title,
        val: '上上吉运',
        isWin: true
      };
    } else if (themeKey === 'love') {
      const o = config.omens[Math.floor(Math.random() * config.omens.length)];
      surfaceEl.innerHTML = `
        <div class="sc-love-board">
          <div class="sc-love-score">${o.score}</div>
          <div class="sc-love-text">💖 ${o.title}</div>
          <div class="sc-love-sub">${o.sub}</div>
        </div>
      `;

      ticketPayload = {
        theme: '心动脱单券',
        title: o.title,
        val: o.score,
        isWin: true
      };
    }

    curTicketData = {
      ...ticketPayload,
      sn: randomSN,
      date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    };

    // 延迟 40ms 等待 DOM 布局完成，初始化 Canvas 刮刮涂层
    setTimeout(setupCanvasCoating, 40);
  }

  // 4. 真实物理 Canvas 涂层初始化与绘制
  function setupCanvasCoating() {
    const canvas = document.getElementById('scCanvasOverlay');
    const bodyEl = document.getElementById('scTicketBody');
    if (!canvas || !bodyEl) return;

    canvas.classList.remove('revealed');
    canvas.style.opacity = '1';

    const rect = bodyEl.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = w * dpr;
    canvas.height = h * dpr;
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';

    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);

    const config = THEMES[curThemeKey];

    // 1. 绘制金属质感底色渐变
    let grad;
    if (config.coverType === 'gold') {
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#F59E0B');
      grad.addColorStop(0.3, '#FDE68A');
      grad.addColorStop(0.6, '#D97706');
      grad.addColorStop(1, '#B45309');
    } else if (config.coverType === 'emerald') {
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#10B981');
      grad.addColorStop(0.4, '#6EE7B7');
      grad.addColorStop(0.8, '#047857');
      grad.addColorStop(1, '#064E3B');
    } else if (config.coverType === 'purple') {
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#8B5CF6');
      grad.addColorStop(0.4, '#C084FC');
      grad.addColorStop(0.8, '#6D28D9');
      grad.addColorStop(1, '#4C1D95');
    } else if (config.coverType === 'red') {
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#EF4444');
      grad.addColorStop(0.4, '#FCA5A5');
      grad.addColorStop(0.7, '#B91C1C');
      grad.addColorStop(1, '#7F1D1D');
    } else {
      // 银色/玫瑰金
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#FF5376');
      grad.addColorStop(0.4, '#FECDD3');
      grad.addColorStop(0.8, '#E11D48');
      grad.addColorStop(1, '#9F1239');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. 模拟真实彩票微噪点粉末
    ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
    for (let i = 0; i < 450; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const rr = Math.random() * 1.5;
      ctx.beginPath();
      ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 涂层双层边框与水印花纹
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(10, 10, w - 20, h - 20);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(14, 14, w - 28, h - 28);

    // 4. 居中精美烫金印记文案
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(config.coverText, w / 2, h / 2 - 10);

    ctx.font = '600 12px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctx.fillText('✦ 真实涂层手感 · 摩擦解锁今日吉运 ✦', w / 2, h / 2 + 16);
    ctx.shadowBlur = 0;

    // 5. 绑定交互事件
    setupScratchEvents(canvas, ctx, w, h);

    // 初始化碎屑粒子 Canvas
    setupParticlesCanvas(w, h);
  }

  // 5. 触控与鼠标刮擦交互事件监听
  function setupScratchEvents(canvas, ctx, w, h) {
    // 移除旧事件
    canvas.onpointerdown = null;
    canvas.onpointermove = null;
    canvas.onpointerup = null;
    canvas.onpointercancel = null;

    scratchedPixels = 0;
    totalPixels = Math.floor((w * h) / (16 * 16));

    const getPos = (e) => {
      const rect = canvas.getBoundingClientRect();
      return {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top
      };
    };

    const eraseLine = (x0, y0, x1, y1) => {
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth = 32; // 舒适擦除笔触
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x1, y1, 16, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    canvas.onpointerdown = (e) => {
      if (isRevealed) return;
      isScratching = true;
      canvas.setPointerCapture(e.pointerId);
      const pos = getPos(e);
      lastPos = pos;
      eraseLine(pos.x, pos.y, pos.x, pos.y);
      spawnShavings(pos.x, pos.y, 0, 0);
      playScratchSound();
    };

    canvas.onpointermove = (e) => {
      if (!isScratching || isRevealed) return;
      const pos = getPos(e);
      if (lastPos) {
        eraseLine(lastPos.x, lastPos.y, pos.x, pos.y);
        spawnShavings(pos.x, pos.y, pos.x - lastPos.x, pos.y - lastPos.y);
      }
      lastPos = pos;

      // 刮动摩擦音效
      playScratchSound();

      // 节流采样刮开进度
      const now = performance.now();
      if (now - lastSampleTime > 60) {
        lastSampleTime = now;
        checkProgress(canvas, ctx, w, h);
      }
    };

    const stopScratch = (e) => {
      isScratching = false;
      lastPos = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      checkProgress(canvas, ctx, w, h);
    };

    canvas.onpointerup = stopScratch;
    canvas.onpointercancel = stopScratch;
  }

  // 6. 稀疏采样计算刮开率
  function checkProgress(canvas, ctx, w, h) {
    if (isRevealed) return;
    try {
      const step = 16;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let clearCount = 0;
      let sampleCount = 0;

      // 按 step 稀疏扫描 Alpha 通道
      for (let y = 0; y < canvas.height; y += step * 2) {
        for (let x = 0; x < canvas.width; x += step * 2) {
          const idx = (y * canvas.width + x) * 4 + 3;
          sampleCount++;
          if (data[idx] < 128) {
            clearCount++;
          }
        }
      }

      const pct = Math.min(100, Math.floor((clearCount / sampleCount) * 100));
      updateProgressUI(pct);

      // 达到 55% 时，视为刮卡成功，触发全开高潮
      if (pct >= 55) {
        finishReveal();
      }
    } catch (_) {}
  }

  function updateProgressUI(pct) {
    const fillEl = document.getElementById('scProgressFill');
    const pctEl = document.getElementById('scProgressPct');
    const textEl = document.getElementById('scProgressText');

    if (fillEl) fillEl.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';

    if (textEl) {
      if (pct === 0) {
        textEl.textContent = '💡 拖动鼠标或手指在涂层上滑动刮奖';
      } else if (pct < 55) {
        textEl.textContent = `⚡ 正在刮开... 已完成 ${pct}%`;
      } else {
        textEl.textContent = '🎉 刮奖完成！恭喜揭晓好运大奖！';
      }
    }
  }

  // 7. 刮奖揭晓收尾与庆祝
  function finishReveal() {
    if (isRevealed) return;
    isRevealed = true;
    updateProgressUI(100);

    const canvas = document.getElementById('scCanvasOverlay');
    if (canvas) canvas.classList.add('revealed');

    // 盖上大奖印章
    const stampEl = document.getElementById('scStampBadge');
    if (stampEl) {
      setTimeout(() => stampEl.classList.add('stamped'), 120);
    }

    // 播放胜利庆祝音效
    playVictorySound();

    // 喷射全屏礼花
    triggerConfetti();

    // 存入战绩历史与统计看板
    saveRecord(curTicketData);
  }

  // 一键刮开快捷功能
  function quickReveal() {
    if (isRevealed) return;
    const canvas = document.getElementById('scCanvasOverlay');
    if (!canvas) return;

    // 快速扫掠擦除动画
    let startPct = 0;
    const timer = setInterval(() => {
      startPct += 20;
      updateProgressUI(startPct);
      if (startPct >= 100) {
        clearInterval(timer);
        finishReveal();
      }
    }, 40);
  }

  // 8. 真实金属碎屑粒子系统
  function setupParticlesCanvas(w, h) {
    const pCanvas = document.getElementById('scParticlesCanvas');
    if (!pCanvas) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    pCanvas.width = w * dpr;
    pCanvas.height = h * dpr;
    pCanvas.style.width = w + 'px';
    pCanvas.style.height = h + 'px';

    particles = [];
    if (!animFrameId) {
      renderParticles();
    }
  }

  function spawnShavings(x, y, dx, dy) {
    for (let i = 0; i < 3; i++) {
      particles.push({
        x: x + (Math.random() * 12 - 6),
        y: y + (Math.random() * 12 - 6),
        vx: (Math.random() * 2 - 1) * 2 + dx * 0.15,
        vy: (Math.random() * 2 - 2) * 2 + dy * 0.15,
        r: Math.random() * 2.2 + 1.2,
        alpha: 1,
        color: Math.random() < 0.6 ? '#F59E0B' : '#FDE68A'
      });
    }
  }

  function renderParticles() {
    const pCanvas = document.getElementById('scParticlesCanvas');
    if (!pCanvas) return;
    const ctx = pCanvas.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);

    ctx.clearRect(0, 0, pCanvas.width, pCanvas.height);
    ctx.save();
    ctx.scale(dpr, dpr);

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.18; // 重力
      p.alpha -= 0.035;

      if (p.alpha <= 0) {
        particles.splice(i, 1);
        continue;
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    animFrameId = requestAnimationFrame(renderParticles);
  }

  // 9. 刮擦物理音效与胜利音效
  function playScratchSound() {
    const now = performance.now();
    if (now - soundCooldown < 75) return;
    soundCooldown = now;

    if (window.SFX && !window.SFX.isMuted()) {
      try {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return;
        const c = new AC();
        const dur = 0.04;
        const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
        const ch = buf.getChannelData(0);
        for (let i = 0; i < ch.length; i++) {
          ch[i] = (Math.random() * 2 - 1) * 0.15;
        }
        const src = c.createBufferSource();
        src.buffer = buf;
        const filter = c.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 1800 + Math.random() * 400;
        filter.Q.value = 1.2;
        src.connect(filter);
        filter.connect(c.destination);
        src.start();
      } catch (_) {}
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(8); } catch (_) {}
    }
  }

  function playVictorySound() {
    if (window.SFX && typeof window.SFX.win === 'function') {
      window.SFX.win();
    }
    if (window.SFX && typeof window.SFX.bell === 'function') {
      setTimeout(() => window.SFX.bell(true), 160);
    }
    if (navigator.vibrate) {
      try { navigator.vibrate([30, 40, 30, 60]); } catch (_) {}
    }
  }

  // 10. 胜利全屏彩色纸屑礼花动画
  function triggerConfetti() {
    const container = document.getElementById('mod-scratch');
    if (!container) return;

    for (let i = 0; i < 48; i++) {
      const bit = document.createElement('div');
      bit.style.position = 'fixed';
      bit.style.zIndex = '9999';
      bit.style.pointerEvents = 'none';
      bit.style.width = Math.random() * 10 + 6 + 'px';
      bit.style.height = Math.random() * 12 + 8 + 'px';
      const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#A855F7', '#EC4899', '#FDE047'];
      bit.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      bit.style.borderRadius = '3px';

      const startX = window.innerWidth / 2 + (Math.random() * 140 - 70);
      const startY = window.innerHeight * 0.45;
      bit.style.left = startX + 'px';
      bit.style.top = startY + 'px';

      document.body.appendChild(bit);

      const vx = (Math.random() - 0.5) * 16;
      const vy = -(Math.random() * 14 + 10);
      let posX = startX;
      let posY = startY;
      let gravity = 0.55;
      let opacity = 1;
      let rot = 0;
      let rotSpeed = (Math.random() - 0.5) * 20;

      const fly = () => {
        posX += vx;
        posY += vy + gravity;
        gravity += 0.4;
        rot += rotSpeed;
        opacity -= 0.016;

        bit.style.transform = `translate(${posX - startX}px, ${posY - startY}px) rotate(${rot}deg)`;
        bit.style.opacity = opacity;

        if (opacity > 0 && posY < window.innerHeight + 50) {
          requestAnimationFrame(fly);
        } else {
          bit.remove();
        }
      };
      requestAnimationFrame(fly);
    }
  }

  // 11. 战绩持久化保存与展示
  function saveRecord(item) {
    if (!item) return;
    try {
      let list = JSON.parse(localStorage.getItem('sc_history') || '[]');
      list.unshift(item);
      if (list.length > 20) list = list.slice(0, 20);
      localStorage.setItem('sc_history', JSON.stringify(list));

      // 更新统计数据
      let stats = JSON.parse(localStorage.getItem('sc_stats') || '{"count":0,"points":0}');
      stats.count += 1;
      const numVal = parseInt(item.val.replace(/[^\d]/g, ''), 10) || 888;
      stats.points += numVal;
      localStorage.setItem('sc_stats', JSON.stringify(stats));

      loadStats();
      renderHistory();
    } catch (_) {}
  }

  function loadStats() {
    try {
      const stats = JSON.parse(localStorage.getItem('sc_stats') || '{"count":0,"points":0}');
      const countEl = document.getElementById('scStatCount');
      const ptsEl = document.getElementById('scStatPoints');
      const rankEl = document.getElementById('scStatRank');

      if (countEl) countEl.textContent = `${stats.count} 张`;
      if (ptsEl) ptsEl.textContent = `${stats.points.toLocaleString()} 财富点`;

      if (rankEl) {
        if (stats.count >= 15) rankEl.textContent = '👑 黄金锦鲤王';
        else if (stats.count >= 8) rankEl.textContent = '🌟 极运招财猫';
        else if (stats.count >= 3) rankEl.textContent = '✨ 进阶好运官';
        else rankEl.textContent = '🐟 初级锦鲤';
      }
    } catch (_) {}
  }

  function renderHistory() {
    const grid = document.getElementById('scHistoryGrid');
    const subEl = document.getElementById('scHistSub');
    if (!grid) return;

    try {
      const list = JSON.parse(localStorage.getItem('sc_history') || '[]');
      if (subEl) subEl.textContent = `记录最近 ${list.length} 次好运揭晓`;

      if (!list.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--tx-faint);font-size:13px;">暂无刮奖记录，快去刮一张碰碰手气吧！</div>';
        return;
      }

      grid.innerHTML = list.map(it => `
        <div class="sc-hist-card">
          <div class="sc-hist-top">
            <span class="sc-hist-theme">${it.theme}</span>
            <span class="sc-hist-time">${it.date}</span>
          </div>
          <div class="sc-hist-prize">${it.title}</div>
          <div class="sc-hist-val">${it.val}</div>
        </div>
      `).join('');
    } catch (_) {}
  }

  // 12. 生成高清拍立得风好运海报 (1080 x 1920)
  function generatePoster() {
    if (!curTicketData) return;
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');

    // 1. 深邃暗夜渐变底色
    const bgGrad = ctx.createLinearGradient(0, 0, 0, 1920);
    bgGrad.addColorStop(0, '#0B0D14');
    bgGrad.addColorStop(0.5, '#151926');
    bgGrad.addColorStop(1, '#080A0F');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, 1080, 1920);

    // 2. 顶部微光光晕
    const glow = ctx.createRadialGradient(540, 320, 20, 540, 320, 480);
    glow.addColorStop(0, 'rgba(245, 158, 11, 0.22)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 800);

    // 3. 装饰卡头
    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 32px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUCKY SCRATCH · 饮料人格研究所 官方认证', 540, 160);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 68px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText('今日好运中奖凭证', 540, 260);

    // 4. 白色实体拍立得卡纸底座
    const cx = 90;
    const cy = 340;
    const cw = 900;
    const ch = 1200;
    const cr = 36;

    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = '#FAFAFA';
    roundRect(ctx, cx, cy, cw, ch, cr);
    ctx.fill();
    ctx.restore();

    // 5. 拍立得照片内芯
    const px = cx + 50;
    const py = cy + 50;
    const pw = cw - 100;
    const ph = 820;

    const innerGrad = ctx.createLinearGradient(px, py, px, py + ph);
    innerGrad.addColorStop(0, '#1E2333');
    innerGrad.addColorStop(1, '#0F121C');
    ctx.fillStyle = innerGrad;
    roundRect(ctx, px, py, pw, ph, 24);
    ctx.fill();

    // 照片内文字与奖项
    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 34px "PingFang SC", sans-serif';
    ctx.fillText(curTicketData.theme, 540, py + 90);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 56px "PingFang SC", sans-serif';
    ctx.fillText(curTicketData.title, 540, py + 220);

    ctx.fillStyle = '#EF4444';
    ctx.font = '900 84px "PingFang SC", sans-serif';
    ctx.fillText(curTicketData.val, 540, py + 360);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 28px "PingFang SC", sans-serif';
    ctx.fillText('✦ 见证今日高光好运时刻 · 愿此符常佑福暖四季 ✦', 540, py + 480);

    // 烫金印章
    ctx.save();
    ctx.translate(px + pw - 140, py + ph - 130);
    ctx.rotate(-0.2);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 6;
    ctx.strokeRect(-90, -45, 180, 90);
    ctx.fillStyle = '#EF4444';
    ctx.font = '900 32px sans-serif';
    ctx.fillText('官方特许', 0, 8);
    ctx.restore();

    // 拍立得下方留言区
    ctx.fillStyle = '#262626';
    ctx.font = '900 36px "PingFang SC", sans-serif';
    ctx.fillText(`凭证编号：${curTicketData.sn}`, 540, cy + 960);

    ctx.font = '600 28px monospace';
    ctx.fillStyle = '#666666';
    ctx.fillText(`揭晓时间：${curTicketData.date}`, 540, cy + 1030);

    // 底部条形码与版权
    ctx.fillStyle = '#999999';
    ctx.font = '600 24px monospace';
    ctx.fillText('BARCODE 98204-7712-4019-8866', 540, cy + 1110);

    // 6. 海报最底部专属注脚
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '600 26px sans-serif';
    ctx.fillText('饮料人格研究所 · 幸运刮刮乐 · 解压暴富大本营', 540, 1820);

    // 下载触发
    const link = document.createElement('a');
    link.download = `幸运刮刮乐_${curTicketData.theme}_${Date.now()}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();

    if (window.SFX && window.SFX.save) window.SFX.save();
  }

  function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

  window.AppScratch = {
    init,
    switchTheme,
    generateTicket,
    quickReveal,
    generatePoster
  };
})();
