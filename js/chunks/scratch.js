/* === js/modules/scratch.js === */
/* =========================================================
   模块 11：幸运刮刮乐 (Lucky Scratch Lab)
   仿真彩票店实体刮刮乐 · 真实物理刮擦涂层 · 经典双区玩法 · 沉浸式解压刮奖
   ========================================================= */

(function () {
  'use strict';

  // 1. 经典五大真实彩票票种知识库
  const THEMES = {
    haoyun10: {
      name: '好运十倍 · 招财金卡',
      badge: 'LUCKY 10X · 经典福彩',
      price: '面值 ¥10 元',
      priceVal: 10,
      topPrize: '最高奖金 ¥250,000',
      rule: '✦ 玩法规则：刮开覆盖膜，若【我的号码】中任意一个号码与【中奖号码】之一相同，即中该号码下方所示金额；若刮出【💰金元宝】，直接赢取该号码下方金额的两倍！兼中兼得。',
      coverType: 'gold',
      coverTitle: '★ 好运十倍 · 招财金卡覆盖膜 ★',
      coverSub: '中奖号码与我的号码相同即中对应金额 · 💰享两倍',
      winNumCount: 2,
      myNumCount: 8,
      specialIco: '💰',
      specialText: '金元宝2倍',
      prizePool: [10, 20, 50, 100, 200, 500, 1000, 10000, 250000]
    },
    dianshi20: {
      name: '点石成金 · 翡翠至尊',
      badge: 'GOLDEN TOUCH · 经典体彩',
      price: '面值 ¥20 元',
      priceVal: 20,
      topPrize: '最高奖金 ¥500,000',
      rule: '✦ 玩法规则：刮开覆盖膜，若【我的号码】中任意号码与【中奖号码】相同，即中下方所示金额；若刮出【💎钻石】，直接赢得该号码下方金额的两倍！',
      coverType: 'emerald',
      coverTitle: '★ 点石成金 · 翡翠至尊覆盖膜 ★',
      coverSub: '3大中奖号码 · 10次中奖机会 · 💎翻倍大奖',
      winNumCount: 3,
      myNumCount: 10,
      specialIco: '💎',
      specialText: '钻石双倍',
      prizePool: [20, 50, 100, 200, 500, 1000, 5000, 50000, 500000]
    },
    xixiangfeng20: {
      name: '喜相逢 · 东方中国红',
      badge: 'HAPPY ENCOUNTER · 喜庆红彩',
      price: '面值 ¥20 元',
      priceVal: 20,
      topPrize: '最高奖金 ¥600,000',
      rule: '✦ 玩法规则：刮开覆盖膜，如果【我的号码】与【中奖号码】相同，即可赢得该号码下方金额；若刮出【🧧双喜红包】，赢得该金额两倍！',
      coverType: 'red',
      coverTitle: '★ 喜相逢 · 中国红覆盖膜 ★',
      coverSub: '喜事临门 · 双号核验 · 🧧双喜红包翻倍',
      winNumCount: 2,
      myNumCount: 8,
      specialIco: '🧧',
      specialText: '双喜翻倍',
      prizePool: [20, 50, 100, 200, 500, 1000, 10000, 600000]
    },
    caifu30: {
      name: '财富大满贯 · 锦鲤尊享版',
      badge: 'GRAND SLAM · 百万巨奖',
      price: '面值 ¥30 元',
      priceVal: 30,
      topPrize: '最高奖金 ¥1,000,000',
      rule: '✦ 玩法规则：刮开覆盖膜，若【我的号码】中任意号码与【中奖号码】相同，即中下方所示金额；若刮出【👑金冠】，直接赢得该号码下方金额的两倍！',
      coverType: 'purple',
      coverTitle: '★ 财富大满贯 · 豪华覆盖膜 ★',
      coverSub: '3大中奖号码 · 12次中奖机会 · 👑大奖翻倍',
      winNumCount: 3,
      myNumCount: 12,
      specialIco: '👑',
      specialText: '金冠双倍',
      prizePool: [30, 50, 100, 300, 500, 1000, 10000, 100000, 1000000]
    },
    shouzhi10: {
      name: '金手指 · 经典怀旧版',
      badge: 'GOLDEN FINGER · 怀旧银卡',
      price: '面值 ¥10 元',
      priceVal: 10,
      topPrize: '最高奖金 ¥100,000',
      rule: '✦ 玩法规则：刮开覆盖膜，若【我的号码】中任意号码与【中奖号码】相同，即中下方所示金额；若刮出【👆金手指】，该奖金直接翻倍！',
      coverType: 'silver',
      coverTitle: '★ 金手指 · 怀旧银卡覆盖膜 ★',
      coverSub: '经典刮刮乐手感 · 👆金手指一点即翻倍',
      winNumCount: 2,
      myNumCount: 8,
      specialIco: '👆',
      specialText: '金手指翻倍',
      prizePool: [10, 20, 50, 100, 200, 500, 1000, 10000, 100000]
    }
  };

  let curThemeKey = 'haoyun10';
  let curTicketData = null;
  let isScratching = false;
  let isSettled = false;
  let isQuickRevealing = false;
  let lastPos = null;
  let scratchedPct = 0;
  let lastSampleTime = 0;
  let soundCooldown = 0;
  let ticketBlocks = { winningBalls: [], myCells: [] };

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
    switchTheme('haoyun10');
  }

  function bindDomEvents() {
    // 票种切换按钮
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

    // 操作按键
    const btnQuick = document.getElementById('scBtnQuickReveal');
    if (btnQuick) btnQuick.onclick = quickReveal;

    const btnNext = document.getElementById('scBtnNextTicket');
    if (btnNext) btnNext.onclick = () => {
      // 没刮全就换票 = 弃票，不入账（结果只在全部号码露出后敲定）
      generateTicket(curThemeKey);
      if (window.SFX && window.SFX.advance) window.SFX.advance();
    };

    const btnPoster = document.getElementById('scBtnGenPoster');
    if (btnPoster) btnPoster.onclick = generatePoster;

    const btnHistToggle = document.getElementById('scBtnToggleHistory');
    if (btnHistToggle) {
      btnHistToggle.onclick = () => {
        // 只看账本不结算：没刮全的票不该出现在战绩里
        loadStats();
        renderHistory();
        const modScratch = document.getElementById('mod-scratch');
        const p = document.getElementById('scHistoryPanel');
        if (modScratch && p) {
          const targetTop = p.offsetTop - 20;
          modScratch.scrollTo({ top: targetTop, behavior: 'smooth' });
          p.classList.remove('sc-panel-highlight');
          void p.offsetWidth;
          p.classList.add('sc-panel-highlight');
        }
      };
    }

    const btnClearHist = document.getElementById('scBtnClearHistory');
    if (btnClearHist) {
      btnClearHist.onclick = () => {
        if (confirm('确定要清空所有刮彩账本记录吗？')) {
          localStorage.removeItem('sc_history');
          localStorage.removeItem('sc_stats');
          loadStats();
          renderHistory();
        }
      };
    }

    // 窗口尺寸变化自适应重绘涂层
    window.addEventListener('resize', debounce(() => {
      if (scratchedPct < 90 && curTicketData) {
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

  // 3. 切换票种并生成票券
  function switchTheme(themeKey) {
    if (!THEMES[themeKey]) return;
    // 没刮全就切票种 = 弃票，不入账
    curThemeKey = themeKey;

    document.querySelectorAll('.sc-theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === themeKey);
    });

    generateTicket(themeKey);
  }

  // 4. 生成一张符合彩票店真实规则与概率的刮刮乐
  function generateTicket(themeKey) {
    const config = THEMES[themeKey];
    isSettled = false;
    isQuickRevealing = false;
    isScratching = false;
    scratchedPct = 0;

    // 更新票面头信息
    const titleEl = document.getElementById('scTicketTitle');
    const badgeEl = document.getElementById('scLogoBadge');
    const priceEl = document.getElementById('scTicketPrice');
    const topPrizeEl = document.getElementById('scTicketTopPrize');
    const ruleEl = document.getElementById('scRuleBanner');
    const snEl = document.getElementById('scTicketSn');
    const barcodeEl = document.getElementById('scBarcodeText');
    const verifyEl = document.getElementById('scVerifyCode');
    const stampEl = document.getElementById('scStampBadge');
    const settleBox = document.getElementById('scSettleBox');

    const randYear = 2026;
    const randomSN = `NO. ${randYear}-${Math.floor(1000 + Math.random() * 9000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomBar = `BARCODE ${Math.floor(10000 + Math.random() * 90000)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const randomVerify = `VERIFY: ${randYear}-X${Math.floor(100 + Math.random() * 900)}-A0${Math.floor(1 + Math.random() * 9)}`;

    if (titleEl) titleEl.textContent = config.name;
    if (badgeEl) badgeEl.textContent = config.badge;
    if (priceEl) priceEl.textContent = config.price;
    if (topPrizeEl) topPrizeEl.textContent = config.topPrize;
    if (ruleEl) ruleEl.innerHTML = `<span>${config.rule}</span>`;
    if (snEl) snEl.textContent = randomSN;
    if (barcodeEl) barcodeEl.textContent = randomBar;
    if (verifyEl) verifyEl.textContent = randomVerify;

    // 重置印章与结算框
    if (stampEl) {
      stampEl.className = 'sc-stamp-stamp';
      stampEl.innerHTML = '';
    }
    if (settleBox) {
      settleBox.style.display = 'none';
      settleBox.innerHTML = '';
    }

    // 重置进度条
    updateProgressUI(0);

    // ==========================================
    // 仿真彩票店自然概率算法（杜绝虚假100%必中）
    // ==========================================
    const isWin = Math.random() < 0.36; // 仿真自然胜率
    const winNumCount = config.winNumCount || 2;
    const myNumCount = config.myNumCount || 8;

    // 1. 生成 2~3 个不重复的中奖号码 (01 ~ 80)
    const luckyNums = [];
    while (luckyNums.length < winNumCount) {
      const n = Math.floor(1 + Math.random() * 79);
      const str = n < 10 ? `0${n}` : `${n}`;
      if (!luckyNums.includes(str)) {
        luckyNums.push(str);
      }
    }

    let myItems = [];
    let matchedItems = [];
    let totalPrize = 0;
    let nearMissInfo = null;

    if (isWin) {
      // 中奖情况：1 或 2 个中奖号码匹配，或刮出特殊翻倍图符
      const hitCount = Math.random() < 0.8 ? 1 : 2;
      const hitIndices = new Set();
      while (hitIndices.size < Math.min(hitCount, myNumCount)) {
        hitIndices.add(Math.floor(Math.random() * myNumCount));
      }

      // 决定特殊图符翻倍 (10% 几率)
      const hasSpecial = Math.random() < 0.1;
      let specialIndex = -1;
      if (hasSpecial && hitIndices.size > 0) {
        specialIndex = Array.from(hitIndices)[0];
      }

      for (let i = 0; i < myNumCount; i++) {
        const isHit = hitIndices.has(i);
        let numStr = '';
        let isSpecial = (i === specialIndex);
        let cellPrize = 0;

        if (isHit) {
          // 选中一个中奖号码
          numStr = luckyNums[Math.floor(Math.random() * luckyNums.length)];
          // 真实中奖梯度分布
          const r = Math.random();
          if (r < 0.65) {
            // 小奖：面额、2倍或5倍面额
            cellPrize = config.priceVal * (Math.random() < 0.5 ? 1 : 2);
          } else if (r < 0.88) {
            // 中奖：50 ~ 100 元
            cellPrize = Math.random() < 0.6 ? 50 : 100;
          } else if (r < 0.97) {
            // 大奖：200 ~ 500 元
            cellPrize = Math.random() < 0.5 ? 200 : 500;
          } else {
            // 顶呱呱暴击：1,000 ~ 10,000 元
            cellPrize = Math.random() < 0.7 ? 1000 : 10000;
          }

          if (isSpecial) {
            cellPrize *= 2;
          }

          totalPrize += cellPrize;
        } else {
          // 未中奖号码：确保不等于任何 luckyNums
          let candidate = 0;
          let candStr = '';
          do {
            candidate = Math.floor(1 + Math.random() * 79);
            candStr = candidate < 10 ? `0${candidate}` : `${candidate}`;
          } while (luckyNums.includes(candStr));
          numStr = candStr;

          // 未中奖格子底下的金额：真实彩票也会印诱人奖金
          cellPrize = config.prizePool[Math.floor(Math.random() * config.prizePool.length)];
        }

        const itemObj = {
          id: i,
          num: numStr,
          prize: cellPrize,
          prizeStr: `¥${cellPrize.toLocaleString()}`,
          isHit: isHit,
          isSpecial: isSpecial,
          specialIco: config.specialIco,
          specialText: config.specialText,
          isNearMiss: false
        };

        myItems.push(itemObj);
        if (isHit) matchedItems.push(itemObj);
      }
    } else {
      // ==========================================
      // 未中奖情况 (64% 概率)：体验彩票店经典悬念与"仅差1号"擦肩而过
      // ==========================================
      const nearMissLucky = luckyNums[0];
      const luckyInt = parseInt(nearMissLucky, 10);
      // 差 1 的邻近数字 (如 28 -> 27 或 29)
      const nearOffset = Math.random() < 0.5 ? -1 : 1;
      let nearNumInt = luckyInt + nearOffset;
      if (nearNumInt < 1) nearNumInt = luckyInt + 1;
      if (nearNumInt > 79) nearNumInt = luckyInt - 1;
      const nearNumStr = nearNumInt < 10 ? `0${nearNumInt}` : `${nearNumInt}`;

      const nearMissIndex = Math.floor(Math.random() * myNumCount);
      // 差一点中奖的巨大诱惑奖金 (如 250,000 或 50,000)
      const temptingPrize = config.prizePool[config.prizePool.length - (Math.random() < 0.5 ? 1 : 2)];

      for (let i = 0; i < myNumCount; i++) {
        let numStr = '';
        let cellPrize = 0;
        let isNear = false;

        if (i === nearMissIndex && !luckyNums.includes(nearNumStr)) {
          numStr = nearNumStr;
          cellPrize = temptingPrize;
          isNear = true;
          nearMissInfo = {
            winNum: nearMissLucky,
            myNum: nearNumStr,
            prize: `¥${temptingPrize.toLocaleString()}`
          };
        } else {
          let candidate = 0;
          let candStr = '';
          do {
            candidate = Math.floor(1 + Math.random() * 79);
            candStr = candidate < 10 ? `0${candidate}` : `${candidate}`;
          } while (luckyNums.includes(candStr));
          numStr = candStr;
          cellPrize = config.prizePool[Math.floor(Math.random() * config.prizePool.length)];
        }

        myItems.push({
          id: i,
          num: numStr,
          prize: cellPrize,
          prizeStr: `¥${cellPrize.toLocaleString()}`,
          isHit: false,
          isSpecial: false,
          isNearMiss: isNear
        });
      }

      if (!nearMissInfo) {
        nearMissInfo = {
          winNum: luckyNums[0],
          myNum: myItems[0].num,
          prize: myItems[0].prizeStr
        };
      }
    }

    // 渲染底层内容区 (双区中奖号码与我的号码网格)
    const surfaceEl = document.getElementById('scPrizeSurface');
    if (!surfaceEl) return;

    surfaceEl.innerHTML = `
      <div class="sc-lottery-board">
        <!-- Game 1: 中奖号码区 -->
        <div class="sc-winning-zone">
          <div class="sc-zone-header">
            <span class="sc-zone-tag">GAME 1</span>
            <span class="sc-zone-title">🌟 中 奖 号 码 🌟</span>
          </div>
          <div class="sc-winning-balls">
            ${luckyNums.map(n => `<div class="sc-winning-ball" data-num="${n}"><span>${n}</span></div>`).join('')}
          </div>
        </div>

        <!-- Game 2: 我的号码区 -->
        <div class="sc-my-zone">
          <div class="sc-my-header">
            <span class="sc-zone-title" style="font-size:12px;color:var(--tx-dim);">🎯 我的号码 (任意号码相同即中下方金额)</span>
            <span class="sc-zone-hint">${config.specialIco} 翻倍</span>
          </div>
          <div class="sc-my-grid count-${config.myNumCount}">
            ${myItems.map(it => `
              <div class="sc-lottery-cell ${it.isHit ? 'is-hit' : ''} ${it.isNearMiss ? 'is-near' : ''}" data-cell-id="${it.id}">
                ${it.isHit ? '<span class="sc-hit-badge">中奖</span>' : ''}
                <div class="sc-cell-top">
                  <span class="sc-cell-num ${it.isSpecial ? 'special' : ''}">${it.isSpecial ? it.specialIco : it.num}</span>
                  ${it.isSpecial ? `<span class="sc-cell-special-lbl">${it.specialText}</span>` : ''}
                </div>
                <div class="sc-cell-prize">
                  <span class="sc-prize-amount">${it.prizeStr}</span>
                </div>
              </div>
            `).join('')}
          </div>
        </div>
      </div>
    `;

    curTicketData = {
      theme: config.name,
      themeKey: themeKey,
      priceVal: config.priceVal,
      sn: randomSN,
      luckyNums: luckyNums,
      myItems: myItems,
      matchedItems: matchedItems,
      matchedCount: matchedItems.length,
      isWin: isWin,
      prizeSum: totalPrize,
      prizeStr: isWin ? `¥${totalPrize.toLocaleString()} 元` : '未中奖',
      nearMiss: nearMissInfo,
      date: new Date().toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
    };

    // 初始化号码区块实时识别列表
    const ballEls = surfaceEl.querySelectorAll('.sc-winning-ball');
    const cellEls = surfaceEl.querySelectorAll('.sc-lottery-cell');
    ticketBlocks = {
      winningBalls: luckyNums.map((n, i) => ({
        num: n,
        el: ballEls[i],
        isRevealed: false
      })),
      myCells: myItems.map((it, i) => ({
        id: it.id,
        num: it.num,
        isHit: it.isHit,
        isSpecial: it.isSpecial,
        el: cellEls[i],
        isRevealed: false
      }))
    };

    // 延迟 40ms 等待 DOM 渲染后重绘涂层
    setTimeout(setupCanvasCoating, 40);
  }

  // 5. 绘制真实质感覆盖膜涂层
  function setupCanvasCoating() {
    const canvas = document.getElementById('scCanvasOverlay');
    const bodyEl = document.getElementById('scTicketBody');
    if (!canvas || !bodyEl) return;

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
      grad.addColorStop(0, '#D97706');
      grad.addColorStop(0.25, '#FDE68A');
      grad.addColorStop(0.5, '#F59E0B');
      grad.addColorStop(0.75, '#FCD34D');
      grad.addColorStop(1, '#92400E');
    } else if (config.coverType === 'emerald') {
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#047857');
      grad.addColorStop(0.3, '#6EE7B7');
      grad.addColorStop(0.6, '#10B981');
      grad.addColorStop(1, '#064E3B');
    } else if (config.coverType === 'purple') {
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#6D28D9');
      grad.addColorStop(0.3, '#C084FC');
      grad.addColorStop(0.6, '#8B5CF6');
      grad.addColorStop(1, '#4C1D95');
    } else if (config.coverType === 'red') {
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#DC2626');
      grad.addColorStop(0.3, '#FCA5A5');
      grad.addColorStop(0.6, '#EF4444');
      grad.addColorStop(1, '#991B1B');
    } else {
      // 银灰
      grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0, '#64748B');
      grad.addColorStop(0.3, '#E2E8F0');
      grad.addColorStop(0.6, '#94A3B8');
      grad.addColorStop(1, '#475569');
    }

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    // 2. 模拟真实彩票微噪点金属粉末
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
    for (let i = 0; i < 500; i++) {
      const rx = Math.random() * w;
      const ry = Math.random() * h;
      const rr = Math.random() * 1.6;
      ctx.beginPath();
      ctx.arc(rx, ry, rr, 0, Math.PI * 2);
      ctx.fill();
    }

    // 3. 涂层双层边框与官方水印花纹
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(8, 8, w - 16, h - 16);

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(12, 12, w - 24, h - 24);

    // 4. 居中印记文字
    ctx.fillStyle = '#FFFFFF';
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 8;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 16px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(config.coverTitle, w / 2, h / 2 - 12);

    ctx.font = '700 12px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
    ctx.fillText(config.coverSub, w / 2, h / 2 + 16);
    ctx.shadowBlur = 0;

    // 5. 绑定交互事件 (不锁卡，永远允许自由刮动)
    setupScratchEvents(canvas, ctx, w, h);

    // 初始化碎屑粒子画布
    setupParticlesCanvas(w, h);
  }

  // 6. 触控与鼠标刮擦交互事件监听 (关键修复：绝不中途锁定，允许 100% 自由刮干净)
  function setupScratchEvents(canvas, ctx, w, h) {
    canvas.onpointerdown = null;
    canvas.onpointermove = null;
    canvas.onpointerup = null;
    canvas.onpointercancel = null;

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
      ctx.lineWidth = 36; // 宽幅顺畅笔触
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.lineTo(x1, y1);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(x1, y1, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    };

    canvas.onpointerdown = (e) => {
      if (isQuickRevealing) return;
      isScratching = true;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      const pos = getPos(e);
      lastPos = pos;
      eraseLine(pos.x, pos.y, pos.x, pos.y);
      spawnShavings(pos.x, pos.y, 0, 0);
      playScratchSound();
    };

    canvas.onpointermove = (e) => {
      if (!isScratching || isQuickRevealing) return;
      const pos = getPos(e);
      if (lastPos) {
        eraseLine(lastPos.x, lastPos.y, pos.x, pos.y);
        spawnShavings(pos.x, pos.y, pos.x - lastPos.x, pos.y - lastPos.y);
      }
      lastPos = pos;

      // 刮动音效
      playScratchSound();

      // 节流采样刮开进度与号码区块识别
      const now = performance.now();
      if (now - lastSampleTime > 60) {
        lastSampleTime = now;
        const imgData = checkProgress(canvas, ctx, w, h);
        checkBlockReveals(canvas, ctx, imgData);
      }
    };

    const stopScratch = (e) => {
      isScratching = false;
      lastPos = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      const imgData = checkProgress(canvas, ctx, w, h);
      // 结算条件只看号码区块是否全部露出（见 checkBlockReveals），
      // 抬手本身不再兜底触发。
      checkBlockReveals(canvas, ctx, imgData);
    };

    canvas.onpointerup = stopScratch;
    canvas.onpointercancel = stopScratch;
  }

  // 6.5 彩票号码区块识别：检测某个号码球/格子在 Canvas 覆盖膜下是否已被刮开露出
  function checkBlockRevealed(el, canvas, imgData) {
    if (!el || !canvas || !imgData) return false;
    const cRect = canvas.getBoundingClientRect();
    const eRect = el.getBoundingClientRect();
    if (cRect.width <= 0 || cRect.height <= 0 || eRect.width <= 0 || eRect.height <= 0) return false;

    // 相对 Canvas 的中心坐标
    const cx = (eRect.left + eRect.width / 2) - cRect.left;
    const cy = (eRect.top + eRect.height / 2) - cRect.top;

    // 转换至 Canvas 像素缓冲区实际像素坐标 (考虑 DPR 缩放)
    const scaleX = canvas.width / cRect.width;
    const scaleY = canvas.height / cRect.height;
    const bx = Math.floor(cx * scaleX);
    const by = Math.floor(cy * scaleY);

    if (bx < 0 || bx >= canvas.width || by < 0 || by >= canvas.height) return false;

    // 围绕中心进行十字 5 点采样 (避免仅采样单像素的偶然误判)
    const rx = Math.floor(Math.min(eRect.width * scaleX * 0.25, 20));
    const ry = Math.floor(Math.min(eRect.height * scaleY * 0.25, 20));
    const samplePoints = [
      [bx, by],
      [bx - rx, by],
      [bx + rx, by],
      [bx, by - ry],
      [bx, by + ry]
    ];

    const data = imgData.data;
    const cw = canvas.width;
    const ch = canvas.height;
    let cleared = 0;
    for (let i = 0; i < samplePoints.length; i++) {
      const px = samplePoints[i][0];
      const py = samplePoints[i][1];
      if (px >= 0 && px < cw && py >= 0 && py < ch) {
        const idx = (py * cw + px) * 4 + 3;
        if (data[idx] < 128) cleared++;
      }
    }
    // 5 点中有 2 点及以上透明，即判定该号码区块已被刮开露出
    return cleared >= 2;
  }

  // 核心：基于彩票号码区块真实判定（中奖号码区块被刮出来才能结算，总面积不是主要指标）
  function checkBlockReveals(canvas, ctx, imgData) {
    if (!curTicketData || isSettled) return;
    if (!canvas) canvas = document.getElementById('scCanvasOverlay');
    if (!canvas) return;
    if (!ctx) ctx = canvas.getContext('2d');

    if (!imgData) {
      try {
        imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      } catch (_) {
        return;
      }
    }
    if (!imgData) return;

    // 1. 扫描中奖号码区 (Game 1)
    let winBallsRevealed = 0;
    if (ticketBlocks.winningBalls) {
      ticketBlocks.winningBalls.forEach(b => {
        if (!b.isRevealed && checkBlockRevealed(b.el, canvas, imgData)) {
          b.isRevealed = true;
          if (b.el) b.el.classList.add('is-scratched-open');
        }
        if (b.isRevealed) winBallsRevealed++;
      });
    }

    // 2. 扫描我的号码区 (Game 2)
    let myCellsRevealed = 0;
    let hitCellObj = null;

    if (ticketBlocks.myCells) {
      ticketBlocks.myCells.forEach(c => {
        if (!c.isRevealed && checkBlockRevealed(c.el, canvas, imgData)) {
          c.isRevealed = true;
          if (c.el) {
            c.el.classList.add('is-scratched-open');
            if (c.isHit || c.isSpecial) {
              c.el.classList.add('is-hit-highlight');
            }
          }
        }
        if (c.isRevealed) {
          myCellsRevealed++;
          if (c.isHit || c.isSpecial) hitCellObj = c;
        }
      });
    }

    const totalMyCells = (ticketBlocks.myCells && ticketBlocks.myCells.length) || 8;
    const totalWinBalls = (ticketBlocks.winningBalls && ticketBlocks.winningBalls.length) || 2;

    // ==========================================
    // 结算规则：全部号码区块露出才开奖
    // ------------------------------------------
    // 之前是按刮开面积比例（50%/70%/80%）和「命中格一露出就结算」
    // 来猜，问题有二：
    //   1. 玩家还没看全号码就被强行开奖，尤其未中奖票会显得莫名其妙；
    //   2. 命中格刚露一角就结算，中奖号码本身可能还盖着，对不上账。
    // 现在只认一件事：中奖号码球 + 我的号码格，每一个都被刮开了。
    // 进度条仍按面积走，但它只做视觉反馈，不参与开奖判定。
    // ==========================================
    if (myCellsRevealed === totalMyCells && winBallsRevealed === totalWinBalls) {
      // 中奖票在开奖瞬间把命中格高亮，让玩家看清是哪一注中的
      if (curTicketData.isWin && hitCellObj && hitCellObj.el) {
        hitCellObj.el.classList.add('is-hit-highlight');
      }
      settleTicket(false);
    }
  }

  // 7. 稀疏采样计算刮开率 (驱动进度条指示器)
  function checkProgress(canvas, ctx, w, h) {
    try {
      const step = 16;
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imgData.data;
      let clearCount = 0;
      let sampleCount = 0;

      for (let y = 0; y < canvas.height; y += step * 2) {
        for (let x = 0; x < canvas.width; x += step * 2) {
          const idx = (y * canvas.width + x) * 4 + 3;
          sampleCount++;
          if (data[idx] < 128) {
            clearCount++;
          }
        }
      }

      const pct = sampleCount > 0 ? Math.min(100, Math.floor((clearCount / sampleCount) * 100)) : 0;
      scratchedPct = pct;
      updateProgressUI(pct);

      // 刮开率达到 90% 时，彻底清除最后一丝残余细屑。
      // 画布一旦清空就等于所有号码都露出来了，同步把区块标记置位，
      // 否则个别边角区块可能因为采样点落空而永远判不出来，
      // 导致「已经刮干净却不开奖」。
      if (pct >= 90) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        updateProgressUI(100);
        markAllBlocksRevealed();
      }
      return imgData;
    } catch (_) {
      return null;
    }
  }

  // 画布被整体清空后，把全部号码区块标记为已露出（与视觉状态保持一致）
  function markAllBlocksRevealed() {
    if (!ticketBlocks) return;
    (ticketBlocks.winningBalls || []).forEach(b => {
      b.isRevealed = true;
      if (b.el) b.el.classList.add('is-scratched-open');
    });
    (ticketBlocks.myCells || []).forEach(c => {
      c.isRevealed = true;
      if (c.el) {
        c.el.classList.add('is-scratched-open');
        if (c.isHit || c.isSpecial) c.el.classList.add('is-hit-highlight');
      }
    });
  }

  function updateProgressUI(pct) {
    const fillEl = document.getElementById('scProgressFill');
    const pctEl = document.getElementById('scProgressPct');
    const textEl = document.getElementById('scProgressText');

    if (fillEl) fillEl.style.width = pct + '%';
    if (pctEl) pctEl.textContent = pct + '%';

    if (textEl) {
      if (pct === 0) {
        textEl.textContent = '💡 拖动鼠标或手指刮开涂层，把所有号码都露出来即开奖';
      } else if (isSettled) {
        textEl.textContent = '✨ 结果已揭晓并入账！可点击「换一张再刮」';
      } else {
        // 提示还差几个区块，比单纯报百分比更能说明「为什么还没开奖」
        const left = countUnrevealedBlocks();
        textEl.textContent = left > 0
          ? `⚡ 还剩 ${left} 个号码没刮出来，全部刮开即开奖`
          : '⚡ 号码已全部露出，正在开奖…';
      }
    }
  }

  // 还有多少个号码区块没被刮出来
  function countUnrevealedBlocks() {
    if (!ticketBlocks) return 0;
    let n = 0;
    (ticketBlocks.winningBalls || []).forEach(b => { if (!b.isRevealed) n++; });
    (ticketBlocks.myCells || []).forEach(c => { if (!c.isRevealed) n++; });
    return n;
  }

  // 8. 票面结算：区分中奖与未中奖，敲下真实官方印章并展示战报
  function settleTicket(isFromQuick) {
    if (isSettled || !curTicketData) return;
    isSettled = true;

    // 中奖卡片点亮所有命中号码区块的高光动效
    if (curTicketData.isWin && ticketBlocks && ticketBlocks.myCells) {
      ticketBlocks.myCells.forEach(c => {
        if (c.isHit || c.isSpecial) {
          if (c.el) c.el.classList.add('is-hit-highlight');
        }
      });
    }

    // 优先保证战报持久化入账本，防止后续任何渲染错误打断保存
    try {
      saveRecord(curTicketData);
    } catch (saveErr) {
      console.warn('saveRecord in settleTicket error:', saveErr);
    }

    const stampEl = document.getElementById('scStampBadge');
    const settleBox = document.getElementById('scSettleBox');

    try {
      if (curTicketData.isWin) {
        // 中奖！
        if (stampEl) {
          stampEl.className = 'sc-stamp-stamp stamped-win';
          stampEl.innerHTML = `✦ 恭喜中奖 ✦<br><span style="font-size:18px;">¥${curTicketData.prizeSum.toLocaleString()} 元</span>`;
        }

        if (settleBox) {
          settleBox.style.display = 'block';
          settleBox.innerHTML = `
            <div class="sc-settle-alert win">
              🎉 <b>恭喜中奖！</b> 本张彩票共命中 <b>${curTicketData.matchedCount || 1}</b> 个中奖号码，斩获现金奖金 <b>¥${curTicketData.prizeSum.toLocaleString()} 元</b>！战绩已入账本。
            </div>
          `;
        }

        // 播放胜利与铃铛音效
        playVictorySound();
        // 喷射礼花
        triggerConfetti();
      } else {
        // 未中奖！体验真实的彩票店悬念
        if (stampEl) {
          stampEl.className = 'sc-stamp-stamp stamped-lose';
          stampEl.innerHTML = '✦ 未中奖 ✦<br><span style="font-size:13px;">谢谢惠顾</span>';
        }

        if (settleBox) {
          settleBox.style.display = 'block';
          const nm = curTicketData.nearMiss || {
            winNum: (curTicketData.luckyNums && curTicketData.luckyNums[0]) || '88',
            myNum: '87',
            prize: '¥10,000'
          };
          const luckyList = (curTicketData.luckyNums || ['88', '66']).join(', ');
          settleBox.innerHTML = `
            <div class="sc-settle-alert lose">
              😢 <b>未中奖 · 与大奖擦肩而过！</b> 中奖号码为【${luckyList}】，你的号码【${nm.myNum}】仅差 1 位数字！与 <b>${nm.prize}</b> 头奖擦肩而过！下一张必中！
            </div>
          `;
        }

        // 播放清脆盖章音效
        playStampSound();
      }
    } catch (uiErr) {
      console.warn('settleTicket ui render error:', uiErr);
    }
  }

  // 9. 一键刮开真实动画抹除涂层 (解决"根本没刮"的致命Bug)
  function quickReveal() {
    if (isQuickRevealing) return;
    const canvas = document.getElementById('scCanvasOverlay');
    if (!canvas) return;

    isQuickRevealing = true;
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    const ctx = canvas.getContext('2d');

    const startTime = performance.now();
    const duration = 380; // 380ms 畅快扫掠动画

    function animSweep(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      // 缓动曲线
      const ease = progress * (2 - progress);
      const sweepY = h * ease;

      // 物理擦除涂层
      ctx.save();
      ctx.globalCompositeOperation = 'destination-out';
      ctx.fillRect(0, 0, canvas.width, sweepY * (canvas.height / h));
      ctx.restore();

      // 沿刮扫线飞溅金属纸屑
      for (let i = 0; i < 4; i++) {
        spawnShavings(Math.random() * w, sweepY, (Math.random() - 0.5) * 6, -3);
      }
      playScratchSound();

      const curPct = Math.min(100, Math.floor(progress * 100));
      scratchedPct = curPct;
      updateProgressUI(curPct);

      if (progress < 1) {
        requestAnimationFrame(animSweep);
      } else {
        // 扫掠完成，彻底清空画布
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        canvas.style.opacity = '0';
        scratchedPct = 100;
        updateProgressUI(100);

        // 揭晓所有号码区块并点亮中奖区块（一键刮开 = 全部露出）
        markAllBlocksRevealed();

        settleTicket(true);
        isQuickRevealing = false;
      }
    }

    requestAnimationFrame(animSweep);
  }

  // 10. 碎屑粒子系统
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
        x: x + (Math.random() * 10 - 5),
        y: y + (Math.random() * 10 - 5),
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
      p.vy += 0.2; // 重力
      p.alpha -= 0.04;

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

  // 11. 真实刮擦与音效系统
  function playScratchSound() {
    const now = performance.now();
    if (now - soundCooldown < 65) return;
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
        filter.frequency.value = 1900 + Math.random() * 400;
        filter.Q.value = 1.3;
        src.connect(filter);
        filter.connect(c.destination);
        src.start();
      } catch (_) {}
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(6); } catch (_) {}
    }
  }

  function playVictorySound() {
    if (window.SFX && typeof window.SFX.win === 'function') {
      window.SFX.win();
    }
    if (window.SFX && typeof window.SFX.bell === 'function') {
      setTimeout(() => window.SFX.bell(true), 150);
    }
    if (navigator.vibrate) {
      try { navigator.vibrate([40, 50, 40, 70]); } catch (_) {}
    }
  }

  function playStampSound() {
    if (window.SFX && typeof window.SFX.tap === 'function') {
      window.SFX.tap();
    }
    if (navigator.vibrate) {
      try { navigator.vibrate(20); } catch (_) {}
    }
  }

  // 12. 全屏彩色礼花动画
  function triggerConfetti() {
    for (let i = 0; i < 50; i++) {
      const bit = document.createElement('div');
      bit.style.position = 'fixed';
      bit.style.zIndex = '9999';
      bit.style.pointerEvents = 'none';
      bit.style.width = Math.random() * 10 + 6 + 'px';
      bit.style.height = Math.random() * 12 + 8 + 'px';
      const colors = ['#F59E0B', '#EF4444', '#10B981', '#3B82F6', '#A855F7', '#EC4899', '#FDE047'];
      bit.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
      bit.style.borderRadius = '3px';

      const startX = window.innerWidth / 2 + (Math.random() * 160 - 80);
      const startY = window.innerHeight * 0.45;
      bit.style.left = startX + 'px';
      bit.style.top = startY + 'px';

      document.body.appendChild(bit);

      const vx = (Math.random() - 0.5) * 16;
      const vy = -(Math.random() * 15 + 10);
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

  // 13. 战绩持久化保存与统计账本
  function saveRecord(item) {
    if (!item) return;
    try {
      let list = JSON.parse(localStorage.getItem('sc_history') || '[]');
      // 避免同一张票重复落盘
      if (list.length > 0 && list[0].sn === item.sn) {
        loadStats();
        renderHistory();
        return;
      }
      list.unshift(item);
      if (list.length > 30) list = list.slice(0, 30);
      localStorage.setItem('sc_history', JSON.stringify(list));

      // 更新账本统计数据
      let stats = JSON.parse(localStorage.getItem('sc_stats') || '{"count":0,"wins":0,"prizeTotal":0}');
      stats.count = (stats.count || 0) + 1;
      if (item.isWin) {
        stats.wins = (stats.wins || 0) + 1;
        stats.prizeTotal = (stats.prizeTotal || 0) + item.prizeSum;
      }
      localStorage.setItem('sc_stats', JSON.stringify(stats));

      loadStats();
      renderHistory();

      // 全所统一档案库联动
      if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
        window.UniversalHistory.add({
          module: 'scratch',
          title: item.isWin ? `刮刮乐 · 中奖 ¥${item.prizeSum.toLocaleString()}元` : '刮刮乐 · 未中奖 (差1号)',
          subtitle: `${item.theme} · 票号 ${item.sn}`,
          color: item.isWin ? '#F59E0B' : '#94A3B8',
          badge: item.isWin ? '中奖' : '刮彩',
          avatar: item.isWin ? '💰' : '🎟️',
          data: item
        });
      }
    } catch (e) {
      console.warn('saveRecord error:', e);
    }
  }

  function loadStats() {
    try {
      const stats = JSON.parse(localStorage.getItem('sc_stats') || '{"count":0,"wins":0,"prizeTotal":0}');
      const countEl = document.getElementById('scStatCount');
      const winsEl = document.getElementById('scStatWins');
      const ptsEl = document.getElementById('scStatPoints');
      const rateEl = document.getElementById('scStatRate');

      const count = stats.count || 0;
      const wins = stats.wins || 0;
      const prizeTotal = stats.prizeTotal || 0;
      const rate = count > 0 ? Math.round((wins / count) * 100) : 0;

      if (countEl) countEl.textContent = `${count} 张`;
      if (winsEl) winsEl.textContent = `${wins} 次`;
      if (ptsEl) ptsEl.textContent = `¥${prizeTotal.toLocaleString()}`;
      if (rateEl) rateEl.textContent = `${rate}%`;
    } catch (_) {}
  }

  function renderHistory() {
    const grid = document.getElementById('scHistoryGrid');
    const subEl = document.getElementById('scHistSub');
    if (!grid) return;

    try {
      const list = JSON.parse(localStorage.getItem('sc_history') || '[]');
      if (subEl) subEl.textContent = `记录最近 ${list.length} 次刮奖战绩`;

      if (!list.length) {
        grid.innerHTML = '<div style="grid-column:1/-1;text-align:center;padding:24px;color:var(--tx-faint);font-size:13px;">暂无刮彩记录，挑一张碰碰手气吧！</div>';
        return;
      }

      grid.innerHTML = list.map(it => `
        <div class="sc-hist-card" data-sn="${it.sn}" title="点击回顾该张彩票票面" style="cursor:pointer;">
          <div class="sc-hist-top">
            <span class="sc-hist-theme">${it.theme}</span>
            <span class="sc-hist-time">${it.date}</span>
          </div>
          <div class="sc-hist-prize">${it.isWin ? `中奖号码命中 · ${it.matchedCount || 1}个奖项` : '未中奖 · 差1号'}</div>
          <div class="sc-hist-val ${it.isWin ? 'win' : 'lose'}">${it.isWin ? `+ ¥${(it.prizeSum || 0).toLocaleString()} 元` : '未中奖 (0元)'}</div>
        </div>
      `).join('');

      grid.querySelectorAll('.sc-hist-card').forEach(card => {
        card.onclick = () => {
          const sn = card.dataset.sn;
          const found = list.find(it => it.sn === sn);
          if (found && typeof restoreTicket === 'function') {
            restoreTicket(found);
            if (window.SFX && window.SFX.tap) window.SFX.tap();
          }
        };
      });
    } catch (_) {}
  }

  // 14. 生成高清拍立得风中奖/刮彩海报 (1080 x 1920)
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
    glow.addColorStop(0, curTicketData.isWin ? 'rgba(245, 158, 11, 0.28)' : 'rgba(100, 116, 139, 0.2)');
    glow.addColorStop(1, 'transparent');
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, 1080, 800);

    // 3. 装饰卡头
    ctx.fillStyle = '#F59E0B';
    ctx.font = '900 32px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LUCKY SCRATCH · 官方经典彩票 仿真体验', 540, 160);

    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 68px "PingFang SC", "Microsoft YaHei", sans-serif';
    ctx.fillText(curTicketData.isWin ? '刮刮乐中奖凭证' : '刮刮乐刮彩纪念', 540, 260);

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
    ctx.font = '900 52px "PingFang SC", sans-serif';
    ctx.fillText(`中奖号码：【${curTicketData.luckyNums.join(' , ')}】`, 540, py + 200);

    ctx.fillStyle = curTicketData.isWin ? '#EF4444' : '#64748B';
    ctx.font = '900 84px "PingFang SC", sans-serif';
    ctx.fillText(curTicketData.isWin ? `¥${curTicketData.prizeSum.toLocaleString()} 元` : '未中奖 · 差1号', 540, py + 360);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.font = '600 26px "PingFang SC", sans-serif';
    if (curTicketData.isWin) {
      ctx.fillText(`✦ 命中 ${curTicketData.matchedCount} 个奖项 · 愿此等鸿运常伴左右 ✦`, 540, py + 480);
    } else {
      ctx.fillText(`✦ 仅差 1 位数字与头奖擦肩 · 下一张必中 ✦`, 540, py + 480);
    }

    // 盖印章
    ctx.save();
    ctx.translate(px + pw - 140, py + ph - 130);
    ctx.rotate(-0.2);
    ctx.strokeStyle = curTicketData.isWin ? '#EF4444' : '#64748B';
    ctx.lineWidth = 6;
    ctx.strokeRect(-90, -45, 180, 90);
    ctx.fillStyle = curTicketData.isWin ? '#EF4444' : '#64748B';
    ctx.font = '900 32px sans-serif';
    ctx.fillText(curTicketData.isWin ? '官方验奖' : '谢谢惠顾', 0, 8);
    ctx.restore();

    // 拍立得下方留言区
    ctx.fillStyle = '#262626';
    ctx.font = '900 36px "PingFang SC", sans-serif';
    ctx.fillText(`票券防伪序列：${curTicketData.sn}`, 540, cy + 960);

    ctx.font = '600 28px monospace';
    ctx.fillStyle = '#666666';
    ctx.fillText(`揭晓时间：${curTicketData.date}`, 540, cy + 1030);

    // 底部条形码
    ctx.fillStyle = '#999999';
    ctx.font = '600 24px monospace';
    ctx.fillText('BARCODE 98204-7712-4019-8866', 540, cy + 1110);

    // 6. 海报最底部注脚
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.font = '600 26px sans-serif';
    ctx.fillText('饮料人格研究所 · 幸运刮刮乐 · 愿好运与惊喜常伴', 540, 1820);

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

  // 15. 档案回顾与战报现场还原 (联动 UniversalHistory)
  function restoreTicket(data) {
    if (!data) return;
    const themeKey = data.themeKey || 'haoyun10';
    if (THEMES[themeKey]) curThemeKey = themeKey;

    document.querySelectorAll('.sc-theme-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.theme === curThemeKey);
    });

    const config = THEMES[curThemeKey] || THEMES.haoyun10;
    isSettled = true;
    isQuickRevealing = false;
    isScratching = false;
    scratchedPct = 100;
    curTicketData = data;

    // 更新票面头信息
    const titleEl = document.getElementById('scTicketTitle');
    const badgeEl = document.getElementById('scLogoBadge');
    const priceEl = document.getElementById('scTicketPrice');
    const topPrizeEl = document.getElementById('scTicketTopPrize');
    const ruleEl = document.getElementById('scRuleBanner');
    const snEl = document.getElementById('scTicketSn');
    const barcodeEl = document.getElementById('scBarcodeText');
    const verifyEl = document.getElementById('scVerifyCode');

    if (titleEl) titleEl.textContent = config.name;
    if (badgeEl) badgeEl.textContent = config.badge;
    if (priceEl) priceEl.textContent = config.price;
    if (topPrizeEl) topPrizeEl.textContent = config.topPrize;
    if (ruleEl) ruleEl.innerHTML = `<span>${config.rule}</span>`;
    if (snEl) snEl.textContent = data.sn || 'NO. 2026-8888-0000';
    if (barcodeEl) barcodeEl.textContent = 'BARCODE ' + (data.sn || '8866-9921');
    if (verifyEl) verifyEl.textContent = 'VERIFY: ARCHIVED-OK';

    // 渲染双区号码
    const surfaceEl = document.getElementById('scPrizeSurface');
    if (surfaceEl && data.luckyNums && data.myItems) {
      surfaceEl.innerHTML = `
        <div class="sc-lottery-board">
          <div class="sc-winning-zone">
            <div class="sc-zone-header">
              <span class="sc-zone-tag">GAME 1</span>
              <span class="sc-zone-title">🌟 中 奖 号 码 🌟</span>
            </div>
            <div class="sc-winning-balls">
              ${data.luckyNums.map(n => `<div class="sc-winning-ball" data-num="${n}"><span>${n}</span></div>`).join('')}
            </div>
          </div>
          <div class="sc-my-zone">
            <div class="sc-my-header">
              <span class="sc-zone-title" style="font-size:12px;color:var(--tx-dim);">🎯 我的号码 (历史档案回顾)</span>
              <span class="sc-zone-hint">${config.specialIco} 翻倍</span>
            </div>
            <div class="sc-my-grid count-${data.myItems.length}">
              ${data.myItems.map(it => `
                <div class="sc-lottery-cell ${it.isHit ? 'is-hit' : ''} ${it.isNearMiss ? 'is-near' : ''}" data-cell-id="${it.id}">
                  ${it.isHit ? '<span class="sc-hit-badge">中奖</span>' : ''}
                  <div class="sc-cell-top">
                    <span class="sc-cell-num ${it.isSpecial ? 'special' : ''}">${it.isSpecial ? (it.specialIco || config.specialIco) : it.num}</span>
                    ${it.isSpecial ? `<span class="sc-cell-special-lbl">${it.specialText || config.specialText}</span>` : ''}
                  </div>
                  <div class="sc-cell-prize">
                    <span class="sc-prize-amount">${it.prizeStr}</span>
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
      `;
    }

    // 清除覆盖涂层，完全露出
    const canvas = document.getElementById('scCanvasOverlay');
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
      canvas.style.opacity = '0';
    }
    updateProgressUI(100);

    // 盖上对应印章与结算框
    const stampEl = document.getElementById('scStampBadge');
    const settleBox = document.getElementById('scSettleBox');
    if (data.isWin) {
      if (stampEl) {
        stampEl.className = 'sc-stamp-stamp stamped-win';
        stampEl.innerHTML = `✦ 历史中奖 ✦<br><span style="font-size:18px;">¥${(data.prizeSum || 0).toLocaleString()} 元</span>`;
      }
      if (settleBox) {
        settleBox.style.display = 'block';
        settleBox.innerHTML = `
          <div class="sc-settle-alert win">
            🎉 <b>历史中奖战报：</b> 本张彩票共命中 <b>${data.matchedCount || 1}</b> 个中奖号码，斩获现金奖金 <b>¥${(data.prizeSum || 0).toLocaleString()} 元</b>！
          </div>
        `;
      }
    } else {
      if (stampEl) {
        stampEl.className = 'sc-stamp-stamp stamped-lose';
        stampEl.innerHTML = '✦ 未中奖 ✦<br><span style="font-size:13px;">历史记录</span>';
      }
      if (settleBox) {
        settleBox.style.display = 'block';
        settleBox.innerHTML = `
          <div class="sc-settle-alert lose">
            😢 <b>未中奖战报：</b> 中奖号码为【${(data.luckyNums || []).join(', ')}】，历史存档已备查。
          </div>
        `;
      }
    }

    // 滚动至顶部卡片
    const modScratch = document.getElementById('mod-scratch');
    if (modScratch) {
      modScratch.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }

  window.AppScratch = {
    init,
    switchTheme,
    generateTicket,
    quickReveal,
    generatePoster,
    restore: restoreTicket
  };
})();
