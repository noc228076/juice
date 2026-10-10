/* =========================================================
   模块 6：纠结拯救机 (Cyber Decision Oracle)
   赛博决策局 · 命运大转盘 · 量子抛硬币 · 赛博掷圣杯
   ========================================================= */

(function () {
  'use strict';

  // ================= 预设选项库 =================
  const WHEEL_PRESETS = {
    lunch: {
      name: '🍜 工作日午餐',
      items: ['黄焖鸡米饭', '兰州牛肉面', '减脂轻食沙拉', '麦当劳/肯德基', '麻辣烫/冒菜', '自选中式快餐', '日式烧肉饭', '西北风(省钱)']
    },
    tea: {
      name: '🧋 摸鱼下午茶',
      items: ['生椰拿铁', '暴打柠檬茶', '黑糖波霸奶茶', '白桃乌龙鲜奶', '美式冰咖啡', '多喝温开水']
    },
    evening: {
      name: '🎮 今晚去哪浪',
      items: ['窝被窝刷剧', '健身房洗澡', '和死党烤串', '散步听播客', '看院线新电影', '早睡养生']
    },
    adventure: {
      name: '💥 发疯大冒险',
      items: ['喝一大杯水', '深呼吸三次', '原地大伸懒腰', '给同事夸一句', '闭眼放空两分钟', '摸鱼五分钟']
    },
    custom: {
      name: '⚙️ 自定义轮盘',
      items: ['选项一', '选项二', '选项三', '选项四']
    }
  };

  const SLICE_COLORS = [
    '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
    '#F59E0B', '#06B6D4', '#84CC16', '#F97316',
    '#6366F1', '#14B8A6', '#E11D48', '#0284C7'
  ];

  // 妙语批注库 (依类型随机)
  const WITTY_COMMENTS = {
    lunch: [
      '吃饱了才有力气拯救世界，别看了，赶紧下单吧！',
      '当你犹豫不决时，胃其实早就做好了选择。',
      '工作日对打工人最好的慰藉，就是这一口热气腾腾。',
      '热量即正义，碳水即快乐，今天允许自己放肆一下！'
    ],
    tea: [
      '今日精神电量告急，此杯为宇宙指定续命神水。',
      '三分甜去冰，摸鱼不留痕，生活需要一点点甜。',
      '咖啡因与茶多酚是当代社畜的精神支柱，干杯！',
      '没有什么烦恼是一杯快乐水解决不了的，有就再加一份珍珠。'
    ],
    evening: [
      '夜晚是属于灵魂的私密缓冲带，遵从内心的召唤！',
      '人生苦短，今晚就把所有 KPI 丢到银河系外。',
      '尽情享受属于你自己的时间，明天的烦恼明天再说。'
    ],
    coin_front: [
      '量子波函数已坍缩为坚定肯定。犹豫就会败北，果断就会白给——但这次，冲就对了！',
      '当你把硬币抛向空中的那一瞬，你心里其实已经有了答案。去执行吧！',
      '天意如刀，直指彼岸。既然命运亮了绿灯，那就勇敢向前迈出第一步！'
    ],
    coin_back: [
      '宇宙常数建议你暂时按兵不动。退后一步不是懦弱，而是给灵魂喘息的智慧。',
      '有时候，“不去做”比“盲目做”需要更大的勇气。给自己放个小假吧！',
      '命里有时终须有，今天宜静不宜动，喝杯温水，等待更好的契机。'
    ],
    coin_edge: [
      '【神级奇迹·立币！】硬币竟然直立在地面！0.5%的绝密概率！宇宙在明确告诉你：不要局限于非此即彼，去打破常规，创造属于你的第三种选择！'
    ],
    bwei_sheng: [
      '一平一凸，阴阳相济！赛博神明赞许你的意图，时机已经成熟，不必再反复内耗，放手去做便能柳暗花明！',
      '所求顺遂，大吉大利！天地同力支持你的方向，保持真诚与坚定，好运自会降临。'
    ],
    bwei_xiao: [
      '双平朝天，神明忍俊不禁！神仙在笑：你心里早有成算，何必多此一问？或者愿望尚有模糊之处，理清思绪再来请示吧。',
      '心意未决，神明失笑。别太紧绷，换个角度看问题，答案就在日常生活里。'
    ],
    bwei_yin: [
      '双凸覆地，神意提示暂不可行。当前局势暗礁涌动，切莫逞一时之快，宜稳字当头，静候风来。',
      '神明不允，暂缓行动。这不是终点，而是提醒你完善准备，避开不必要的风险。'
    ],
    bwei_li: [
      '【天地震动·立茭！】罕见圣迹降临！连地心引力都为你让步！你所请示之事将迎来颠覆性转机，破局只在瞬息之间！'
    ]
  };

  // 状态变量
  let curSubMode = 'wheel'; // 'wheel' | 'coin' | 'bwei'
  let curWheelPreset = 'lunch';
  let wheelItems = [];
  let isSpinningWheel = false;
  let wheelRotationAngle = 0;
  let isFlippingCoin = false;
  let isTossingBwei = false;
  let lastVerdictRecord = null;

  // ================= 辅助函数 =================
  function getRandomItem(arr) {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  function getCaseNumber() {
    const d = new Date();
    const ds = `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const rand = Math.floor(1000 + Math.random() * 9000);
    return `DEC-${ds}-${rand}`;
  }

  function formatTime(d) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }

  // ================= 轮盘 Canvas 绘制与动画 =================
  function initWheelItems() {
    try {
      const savedCustom = localStorage.getItem('juice_decision_wheel_custom');
      if (savedCustom) {
        WHEEL_PRESETS.custom.items = JSON.parse(savedCustom);
      }
    } catch (e) {}

    wheelItems = [...WHEEL_PRESETS[curWheelPreset].items];
    renderWheelChips();
    drawWheel();
  }

  function renderWheelChips() {
    const wrap = document.getElementById('wheelChipsWrap');
    const countEl = document.getElementById('wheelOptCount');
    if (!wrap) return;

    if (countEl) countEl.textContent = wheelItems.length;

    wrap.innerHTML = wheelItems.map((item, idx) => {
      const color = SLICE_COLORS[idx % SLICE_COLORS.length];
      return `
        <div class="dec-chip">
          <span class="chip-dot" style="background:${color}"></span>
          <span>${item}</span>
          <span class="chip-del" data-idx="${idx}" title="删除此项">×</span>
        </div>
      `;
    }).join('');

    wrap.querySelectorAll('.chip-del').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (wheelItems.length <= 2) {
          alert('轮盘至少需要保留 2 个选项哦！');
          return;
        }
        const idx = parseInt(btn.dataset.idx, 10);
        wheelItems.splice(idx, 1);
        if (curWheelPreset === 'custom') {
          saveCustomWheel();
        }
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        renderWheelChips();
        drawWheel();
      };
    });
  }

  function saveCustomWheel() {
    try {
      localStorage.setItem('juice_decision_wheel_custom', JSON.stringify(wheelItems));
    } catch (e) {}
  }

  function drawWheel() {
    const cv = document.getElementById('wheelCanvas');
    if (!cv) return;
    const ctx = cv.getContext('2d');
    const size = cv.width;
    const center = size / 2;
    const radius = center - 14;
    const num = wheelItems.length;
    const arc = (2 * Math.PI) / num;

    ctx.clearRect(0, 0, size, size);

    // 外轮廓与霓虹圆环
    ctx.save();
    ctx.translate(center, center);
    ctx.rotate(wheelRotationAngle);

    // 绘制扇形区块
    for (let i = 0; i < num; i++) {
      const angle = i * arc;
      const color = SLICE_COLORS[i % SLICE_COLORS.length];

      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, radius, angle, angle + arc);
      ctx.closePath();

      // 渐变填充，增加拟真立体感
      const grad = ctx.createRadialGradient(0, 0, radius * 0.1, 0, 0, radius);
      grad.addColorStop(0, color);
      grad.addColorStop(1, adjustColor(color, -25));
      ctx.fillStyle = grad;
      ctx.fill();

      // 扇区分割线
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.stroke();

      // 文字绘制 (放射状排列)
      ctx.save();
      ctx.rotate(angle + arc / 2);
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#FFFFFF';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 1;

      // 动态根据字数与扇区数量调整字号
      let fontSize = num > 10 ? 18 : 22;
      ctx.font = `bold ${fontSize}px system-ui, -apple-system, sans-serif`;

      let txt = wheelItems[i];
      if (txt.length > 7) txt = txt.substring(0, 6) + '…';
      ctx.fillText(txt, radius - 26, 0);
      ctx.restore();
    }

    // 外圈 LED 装饰圆点
    const dotCount = Math.max(num * 2, 24);
    for (let d = 0; d < dotCount; d++) {
      const dotAngle = (d / dotCount) * (2 * Math.PI);
      const dotX = Math.cos(dotAngle) * (radius + 6);
      const dotY = Math.sin(dotAngle) * (radius + 6);
      ctx.beginPath();
      ctx.arc(dotX, dotY, 3, 0, 2 * Math.PI);
      ctx.fillStyle = d % 2 === 0 ? '#FFE082' : '#FFFFFF';
      ctx.shadowColor = d % 2 === 0 ? '#F59E0B' : '#10B981';
      ctx.shadowBlur = 6;
      ctx.fill();
    }

    ctx.restore();
  }

  function adjustColor(hex, amount) {
    let col = hex.replace('#', '');
    if (col.length === 3) col = col.split('').map(x => x + x).join('');
    let num = parseInt(col, 16);
    let r = Math.min(255, Math.max(0, (num >> 16) + amount));
    let g = Math.min(255, Math.max(0, ((num >> 8) & 0x00FF) + amount));
    let b = Math.min(255, Math.max(0, (num & 0x0000FF) + amount));
    return `rgb(${r},${g},${b})`;
  }

  // 阻尼旋转启动
  function spinWheel() {
    if (isSpinningWheel || wheelItems.length < 2) return;
    isSpinningWheel = true;

    const btn = document.getElementById('btnSpinWheel');
    if (btn) btn.disabled = true;

    if (window.SFX && window.SFX.advance) window.SFX.advance();

    // 随机选择中奖目标
    const num = wheelItems.length;
    const arc = (2 * Math.PI) / num;
    const targetIdx = Math.floor(Math.random() * num);

    // 计算旋转终止角：轮盘指针位于正上方 (angle = -PI / 2)
    // 旋转停止时，需满足: (-PI / 2 - finalAngle) % (2*PI) 正好落在 targetIdx 的 [angle, angle + arc] 中间
    const targetCenterAngle = targetIdx * arc + arc / 2;
    const fullSpins = 5 + Math.floor(Math.random() * 3); // 5~7 圈
    const currentNorm = wheelRotationAngle % (2 * Math.PI);
    const stopAngle = (2 * Math.PI * fullSpins) - targetCenterAngle - (Math.PI / 2);
    const deltaAngle = stopAngle - currentNorm + (stopAngle < currentNorm ? 2 * Math.PI : 0);

    const startAngle = wheelRotationAngle;
    const finalAngle = startAngle + deltaAngle;
    const duration = 3800; // 3.8s 物理仿真阻尼时间
    const startTime = performance.now();

    const pointer = document.getElementById('wheelPointer');
    let lastSectorPassed = -1;

    function cubicEaseOut(t) {
      return 1 - Math.pow(1 - t, 3.2);
    }

    function frame(now) {
      const elapsed = now - startTime;
      const progress = Math.min(1, elapsed / duration);
      const easeVal = cubicEaseOut(progress);

      wheelRotationAngle = startAngle + deltaAngle * easeVal;
      drawWheel();

      // 实时计算当前指针指向的分区并播放嘀嗒声
      const currentRelative = ((-Math.PI / 2 - wheelRotationAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);
      const currentSector = Math.floor(currentRelative / arc);
      if (currentSector !== lastSectorPassed) {
        lastSectorPassed = currentSector;
        if (window.SFX && window.SFX.tick) window.SFX.tick();
        if (pointer) {
          pointer.classList.add('tilt');
          setTimeout(() => pointer.classList.remove('tilt'), 50);
        }
      }

      if (progress < 1) {
        requestAnimationFrame(frame);
      } else {
        isSpinningWheel = false;
        if (btn) btn.disabled = false;
        wheelRotationAngle = finalAngle;
        drawWheel();

        // 最终定局
        const winningItem = wheelItems[targetIdx];
        if (window.SFX && window.SFX.reveal) window.SFX.reveal();

        const commentPool = WITTY_COMMENTS[curWheelPreset] || WITTY_COMMENTS.lunch;
        const comment = getRandomItem(commentPool);

        showReceipt({
          modeKey: 'wheel',
          modeName: `命运大轮盘 · ${WHEEL_PRESETS[curWheelPreset].name}`,
          proposition: `轮盘裁决：${WHEEL_PRESETS[curWheelPreset].name}`,
          verdict: winningItem,
          comment: comment,
          tag: '大转盘指定裁决'
        });
      }
    }

    requestAnimationFrame(frame);
  }

  // ================= 3D 量子抛硬币 =================
  function flipCoin() {
    if (isFlippingCoin) return;
    isFlippingCoin = true;

    const btn = document.getElementById('btnFlipCoin');
    if (btn) btn.disabled = true;

    const propInput = document.getElementById('coinPropositionInput');
    const frontInput = document.getElementById('coinLabelFront');
    const backInput = document.getElementById('coinLabelBack');

    const proposition = (propInput && propInput.value.trim()) || '今天要不要行动？';
    const frontLabel = (frontInput && frontInput.value.trim()) || '冲 / 去';
    const backLabel = (backInput && backInput.value.trim()) || '鸽 / 缓';

    // 随机决策：99.5% 正常正反，0.5% 奇迹立币
    const rand = Math.random();
    let outcome = 'front';
    if (rand < 0.005) {
      outcome = 'edge';
    } else if (rand < 0.505) {
      outcome = 'front';
    } else {
      outcome = 'back';
    }

    if (window.SFX && window.SFX.advance) window.SFX.advance();

    const disc = document.getElementById('coinDisc');
    const shadow = document.getElementById('coinShadow');

    // 翻转圈数与最终角度
    const spins = 6 + Math.floor(Math.random() * 2);
    let targetY = spins * 360 + (outcome === 'back' ? 180 : 0);
    let targetX = outcome === 'edge' ? 90 : 0;

    const duration = 2200;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // 高度轨迹抛物线
      const heightVal = Math.sin(t * Math.PI) * 130;
      const rotY = (1 - Math.pow(1 - t, 2.5)) * targetY;
      const rotX = (1 - Math.pow(1 - t, 2.5)) * targetX;

      if (disc) {
        disc.style.transform = `translateY(-${heightVal}px) rotateX(${rotX}deg) rotateY(${rotY}deg)`;
      }
      if (shadow) {
        const shadowScale = 1 - (heightVal / 130) * 0.45;
        const shadowOpacity = 1 - (heightVal / 130) * 0.6;
        shadow.style.transform = `scale(${shadowScale})`;
        shadow.style.opacity = shadowOpacity;
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        isFlippingCoin = false;
        if (btn) btn.disabled = false;

        if (window.SFX && window.SFX.bell) window.SFX.bell(true);
        if (window.SFX && window.SFX.reveal) window.SFX.reveal();

        let verdictText = '';
        let comment = '';
        if (outcome === 'front') {
          verdictText = frontLabel;
          comment = getRandomItem(WITTY_COMMENTS.coin_front);
        } else if (outcome === 'back') {
          verdictText = backLabel;
          comment = getRandomItem(WITTY_COMMENTS.coin_back);
        } else {
          verdictText = '奇迹立币 (天地自选)';
          comment = WITTY_COMMENTS.coin_edge[0];
        }

        showReceipt({
          modeKey: 'coin',
          modeName: '量子抛硬币',
          proposition: proposition,
          verdict: verdictText,
          comment: comment,
          tag: outcome === 'edge' ? '0.5% 奇迹立币' : '量子硬币终局裁决'
        });
      }
    }

    requestAnimationFrame(frame);
  }

  // ================= 赛博掷圣杯 (Cyber Bwa Bwei) =================
  function initBweiSvg() {
    // 渲染精致真实的月牙红木茭杯 SVG
    const leftEl = document.getElementById('bweiLeft');
    const rightEl = document.getElementById('bweiRight');

    const bweiSvgConvex = `
      <svg viewBox="0 0 90 130" width="100%" height="100%" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.35));">
        <defs>
          <linearGradient id="g_bwei_convex" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#DC2626"/>
            <stop offset="40%" stop-color="#991B1B"/>
            <stop offset="100%" stop-color="#450A0A"/>
          </linearGradient>
          <radialGradient id="g_bwei_shine" cx="30%" cy="30%" r="50%">
            <stop offset="0%" stop-color="#FEF2F2" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="#991B1B" stop-opacity="0"/>
          </radialGradient>
        </defs>
        <!-- 红色月牙弯刀轮廓 (凸面·阴) -->
        <path d="M18,10 C50,15 76,45 76,75 C76,105 48,122 18,122 C32,100 38,75 34,50 C30,32 24,18 18,10 Z" fill="url(#g_bwei_convex)" stroke="#7F1D1D" stroke-width="2"/>
        <path d="M22,14 C48,19 70,45 70,72 C70,98 46,114 22,116 C34,96 38,74 34,50 C31,34 26,22 22,14 Z" fill="url(#g_bwei_shine)"/>
        <!-- 木质微纹 -->
        <path d="M38,36 C54,54 56,76 46,98" stroke="rgba(255,255,255,0.18)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      </svg>
    `;

    const bweiSvgFlat = `
      <svg viewBox="0 0 90 130" width="100%" height="100%" style="filter: drop-shadow(0 6px 12px rgba(0,0,0,0.35));">
        <defs>
          <linearGradient id="g_bwei_flat" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stop-color="#FEF3C7"/>
            <stop offset="60%" stop-color="#FDE68A"/>
            <stop offset="100%" stop-color="#D97706"/>
          </linearGradient>
        </defs>
        <!-- 原木月牙平面轮廓 (平面·阳) -->
        <path d="M18,10 C50,15 76,45 76,75 C76,105 48,122 18,122 C32,100 38,75 34,50 C30,32 24,18 18,10 Z" fill="url(#g_bwei_flat)" stroke="#B45309" stroke-width="2"/>
        <path d="M22,14 C46,19 68,45 68,72 C68,96 46,112 22,116" stroke="rgba(180, 83, 9, 0.4)" stroke-width="1.2" stroke-dasharray="3,3" fill="none"/>
        <!-- 铭刻传统神圣铭文 -->
        <text x="46" y="70" font-size="14" font-weight="900" fill="#92400E" text-anchor="middle" font-family="serif">✦ 阳 ✦</text>
        <circle cx="46" cy="46" r="3" fill="#B45309" opacity="0.6"/>
        <circle cx="46" cy="90" r="3" fill="#B45309" opacity="0.6"/>
      </svg>
    `;

    function buildBlockHtml(mirror) {
      return `
        <div class="bwei-crescent" style="${mirror ? 'transform: scaleX(-1);' : ''}">
          <div class="bwei-face convex">${bweiSvgConvex}</div>
          <div class="bwei-face flat">${bweiSvgFlat}</div>
        </div>
      `;
    }

    if (leftEl) leftEl.innerHTML = buildBlockHtml(false);
    if (rightEl) rightEl.innerHTML = buildBlockHtml(true);
  }

  function tossBwei() {
    if (isTossingBwei) return;
    isTossingBwei = true;

    const btn = document.getElementById('btnTossBwei');
    if (btn) btn.disabled = true;

    const propInput = document.getElementById('bweiPropositionInput');
    const proposition = (propInput && propInput.value.trim()) || '向赛博神明禀告心愿';

    if (window.SFX && window.SFX.tarotFlip) window.SFX.tarotFlip();

    // 随机结果概率：
    // 圣杯 (一阳一阴): 50%
    // 笑杯 (两阳): 25%
    // 阴杯 (两阴): 24.5%
    // 立茭 (神迹立地): 0.5%
    const rand = Math.random();
    let bweiResult = 'sheng'; // 'sheng' | 'xiao' | 'yin' | 'li'
    let leftFace = 'flat'; // 'flat' (阳) or 'convex' (阴)
    let rightFace = 'convex';

    if (rand < 0.005) {
      bweiResult = 'li';
    } else if (rand < 0.505) {
      bweiResult = 'sheng';
      if (Math.random() > 0.5) {
        leftFace = 'convex';
        rightFace = 'flat';
      } else {
        leftFace = 'flat';
        rightFace = 'convex';
      }
    } else if (rand < 0.755) {
      bweiResult = 'xiao';
      leftFace = 'flat';
      rightFace = 'flat';
    } else {
      bweiResult = 'yin';
      leftFace = 'convex';
      rightFace = 'convex';
    }

    const leftEl = document.getElementById('bweiLeft');
    const rightEl = document.getElementById('bweiRight');

    const duration = 1800;
    const startTime = performance.now();

    function frame(now) {
      const elapsed = now - startTime;
      const t = Math.min(1, elapsed / duration);

      // 飞行抛掷曲线
      const height = Math.sin(t * Math.PI) * 90;
      const easeT = 1 - Math.pow(1 - t, 2.5);

      const lRotY = easeT * (720 + (leftFace === 'flat' ? 180 : 0));
      const lRotZ = Math.sin(t * Math.PI) * 45;
      const rRotY = easeT * (720 + (rightFace === 'flat' ? 180 : 0));
      const rRotZ = -Math.sin(t * Math.PI) * 45;

      if (leftEl) {
        leftEl.style.transform = `translateY(-${height}px) rotateY(${lRotY}deg) rotateZ(${lRotZ}deg)`;
      }
      if (rightEl) {
        rightEl.style.transform = `translateY(-${height}px) rotateY(${rRotY}deg) rotateZ(${rRotZ}deg)`;
      }

      if (t < 1) {
        requestAnimationFrame(frame);
      } else {
        isTossingBwei = false;
        if (btn) btn.disabled = false;

        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (window.SFX && window.SFX.reveal) window.SFX.reveal();

        let verdictText = '';
        let comment = '';
        let tag = '';

        if (bweiResult === 'sheng') {
          verdictText = '🌟 圣杯 · 大吉大利';
          comment = getRandomItem(WITTY_COMMENTS.bwei_sheng);
          tag = '一阳一阴 · 神明首肯';
        } else if (bweiResult === 'xiao') {
          verdictText = '😂 笑杯 · 心意未决';
          comment = getRandomItem(WITTY_COMMENTS.bwei_xiao);
          tag = '双阳朝天 · 神明失笑';
        } else if (bweiResult === 'yin') {
          verdictText = '🛑 阴杯 · 暂缓行动';
          comment = getRandomItem(WITTY_COMMENTS.bwei_yin);
          tag = '双阴覆地 · 暂不可行';
        } else {
          verdictText = '⚡ 立茭 · 惊天神迹';
          comment = WITTY_COMMENTS.bwei_li[0];
          tag = '万中无一 · 奇迹显圣';
        }

        showReceipt({
          modeKey: 'bwei',
          modeName: '赛博掷圣杯',
          proposition: proposition,
          verdict: verdictText,
          comment: comment,
          tag: tag
        });
      }
    }

    requestAnimationFrame(frame);
  }

  // ================= 终局裁决单小票弹窗与历史存入 =================
  function showReceipt(data) {
    const modal = document.getElementById('decReceiptModal');
    if (!modal) return;

    lastVerdictRecord = {
      ...data,
      caseNo: getCaseNumber(),
      timeStr: formatTime(new Date()),
      timestamp: Date.now()
    };

    const caseNoEl = document.getElementById('rcptCaseNo');
    const timeEl = document.getElementById('rcptTime');
    const propEl = document.getElementById('rcptPropText');
    const badgeEl = document.getElementById('rcptModeBadge');
    const verdictEl = document.getElementById('rcptVerdictVal');
    const commentEl = document.getElementById('rcptCommentTxt');

    if (caseNoEl) caseNoEl.textContent = `NO: ${lastVerdictRecord.caseNo}`;
    if (timeEl) timeEl.textContent = lastVerdictRecord.timeStr;
    if (propEl) propEl.textContent = lastVerdictRecord.proposition || '自由抉择';
    if (badgeEl) badgeEl.textContent = lastVerdictRecord.tag || lastVerdictRecord.modeName;
    if (verdictEl) verdictEl.textContent = lastVerdictRecord.verdict;
    if (commentEl) commentEl.textContent = lastVerdictRecord.comment;

    modal.classList.add('open');
    modal.setAttribute('aria-hidden', 'false');

    // 自动沉淀至全所历史档案
    if (window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
      window.UniversalHistory.add({
        module: 'decision',
        title: `裁决: ${lastVerdictRecord.verdict}`,
        subtitle: `${lastVerdictRecord.modeName} · ${lastVerdictRecord.proposition || '自由抉择'}`,
        color: '#10B981',
        badge: '🪙 决策',
        avatar: '🪙',
        data: lastVerdictRecord
      });
    }
  }

  function closeReceipt() {
    const modal = document.getElementById('decReceiptModal');
    if (modal) {
      modal.classList.remove('open');
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  // ================= 裁决小票高清分享图生成 =================
  function drawReceiptCanvas(record) {
    if (!record) return;
    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = 1620;
    const ctx = cv.getContext('2d');
    const isDark = document.documentElement.dataset.theme !== 'light';

    // 背景底色
    ctx.fillStyle = isDark ? '#0F1218' : '#ECEEF2';
    ctx.fillRect(0, 0, 1080, 1620);

    // 小票纸张主体
    const paperX = 100;
    const paperY = 90;
    const paperW = 880;
    const paperH = 1440;

    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 20;
    ctx.fillStyle = isDark ? '#1C212D' : '#FFFFFF';
    ctx.fillRect(paperX, paperY, paperW, paperH);
    ctx.restore();

    // 纸张边缘虚线
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.1)';
    ctx.lineWidth = 3;
    ctx.strokeRect(paperX, paperY, paperW, paperH);

    // 顶部锯齿纹理
    ctx.fillStyle = isDark ? '#0F1218' : '#ECEEF2';
    const toothCount = 28;
    const toothW = paperW / toothCount;
    for (let i = 0; i < toothCount; i++) {
      ctx.beginPath();
      ctx.moveTo(paperX + i * toothW, paperY);
      ctx.lineTo(paperX + (i + 0.5) * toothW, paperY + 12);
      ctx.lineTo(paperX + (i + 1) * toothW, paperY);
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(paperX + i * toothW, paperY + paperH);
      ctx.lineTo(paperX + (i + 0.5) * toothW, paperY + paperH - 12);
      ctx.lineTo(paperX + (i + 1) * toothW, paperY + paperH);
      ctx.fill();
    }

    // 抬头与标题
    let curY = paperY + 90;
    ctx.textAlign = 'center';
    ctx.fillStyle = '#10B981';
    ctx.font = '900 24px monospace';
    ctx.fillText('CYBER DECISION BUREAU · 终局拯救单', 540, curY);

    curY += 60;
    ctx.fillStyle = isDark ? '#F3F4F6' : '#111827';
    ctx.font = '900 48px system-ui, sans-serif';
    ctx.fillText('赛博决策局 · 终局裁定单', 540, curY);

    curY += 45;
    ctx.fillStyle = isDark ? '#9CA3AF' : '#6B7280';
    ctx.font = '600 22px monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`NO: ${record.caseNo || 'DEC-20261010-8848'}`, paperX + 60, curY);
    ctx.textAlign = 'right';
    ctx.fillText(record.timeStr || formatTime(new Date()), paperX + paperW - 60, curY);

    curY += 25;
    drawDashLine(ctx, paperX + 50, curY, paperX + paperW - 50, curY, isDark);

    // 纠结议题卡片
    curY += 60;
    ctx.textAlign = 'left';
    ctx.fillStyle = isDark ? '#9CA3AF' : '#6B7280';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('【纠结议题】', paperX + 60, curY);

    curY += 40;
    ctx.fillStyle = isDark ? '#F3F4F6' : '#111827';
    ctx.font = 'bold 30px system-ui, sans-serif';
    wrapText(ctx, record.proposition || '自由抉择', paperX + 60, curY, paperW - 120, 42);

    // 终局裁决突出横幅
    curY += 110;
    ctx.fillStyle = isDark ? 'rgba(16, 185, 129, 0.12)' : 'rgba(16, 185, 129, 0.08)';
    roundRect(ctx, paperX + 50, curY, paperW - 100, 200, 24);
    ctx.fill();
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 4;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#10B981';
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.fillText(record.tag || record.modeName || '终局裁决', 540, curY + 50);

    ctx.fillStyle = isDark ? '#FFFFFF' : '#065F46';
    ctx.font = '900 62px system-ui, sans-serif';
    ctx.fillText(record.verdict || '顺遂执行', 540, curY + 135);

    // 决策局批注
    curY += 260;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#10B981';
    ctx.font = '800 22px system-ui, sans-serif';
    ctx.fillText('【决策局特许批注】', paperX + 60, curY);

    curY += 44;
    ctx.fillStyle = isDark ? '#D1D5DB' : '#374151';
    ctx.font = '500 26px system-ui, sans-serif';
    wrapText(ctx, record.comment || '决定已经做出，当你抛出硬币的那一瞬间，心里其实已经知道了答案。', paperX + 60, curY, paperW - 120, 40);

    // 强制执行令
    curY += 150;
    ctx.fillStyle = isDark ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.08)';
    roundRect(ctx, paperX + 50, curY, paperW - 100, 70, 12);
    ctx.fill();
    ctx.strokeStyle = 'rgba(239, 68, 68, 0.3)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#EF4444';
    ctx.font = '700 20px system-ui, sans-serif';
    ctx.fillText('⚠️ 强制执行令：本结果受赛博因果律保护，24小时内不可反悔！', 540, curY + 44);

    // 签章与条形码
    curY += 120;
    drawDashLine(ctx, paperX + 50, curY, paperX + paperW - 50, curY, isDark);

    // 印章 (红色倾斜圆印)
    ctx.save();
    ctx.translate(340, curY + 110);
    ctx.rotate(-12 * Math.PI / 180);
    ctx.strokeStyle = '#EF4444';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(0, 0, 75, 0, 2 * Math.PI);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(0, 0, 68, 0, 2 * Math.PI);
    ctx.stroke();

    ctx.textAlign = 'center';
    ctx.fillStyle = '#EF4444';
    ctx.font = '800 18px system-ui, sans-serif';
    ctx.fillText('赛博决策局', 0, -28);
    ctx.font = '900 26px system-ui, sans-serif';
    ctx.fillText('终局裁定', 0, 8);
    ctx.font = '700 16px monospace';
    ctx.fillText('VERIFIED', 0, 38);
    ctx.restore();

    // 条形码
    ctx.save();
    ctx.translate(620, curY + 70);
    const barW = 280;
    const barH = 55;
    ctx.fillStyle = isDark ? '#F3F4F6' : '#111827';
    for (let bx = 0; bx < barW; bx += 7) {
      const bw = (bx % 3 === 0) ? 4 : 2;
      ctx.fillRect(bx, 0, bw, barH);
    }
    ctx.textAlign = 'center';
    ctx.font = '16px monospace';
    ctx.fillStyle = isDark ? '#9CA3AF' : '#6B7280';
    ctx.fillText('* CYBER-DECISION-VERDICT *', barW / 2, barH + 25);
    ctx.restore();

    // 导出并下载
    const a = document.createElement('a');
    a.download = `赛博决策局_终局裁定_${record.caseNo || Date.now()}.png`;
    a.href = cv.toDataURL('image/png');
    a.click();
  }

  function drawDashLine(ctx, x1, y1, x2, y2, isDark) {
    ctx.save();
    ctx.setLineDash([8, 6]);
    ctx.strokeStyle = isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.14)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
    ctx.restore();
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

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = String(text).split('');
    let line = '';
    let curY = y;
    for (let n = 0; n < chars.length; n++) {
      const testLine = line + chars[n];
      const metrics = ctx.measureText(testLine);
      if (metrics.width > maxWidth && n > 0) {
        ctx.fillText(line, x, curY);
        line = chars[n];
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
  }

  // ================= 子模式切换系统 =================
  function switchSubMode(modeKey) {
    if (!['wheel', 'coin', 'bwei'].includes(modeKey)) return;
    curSubMode = modeKey;

    document.querySelectorAll('.dec-tab').forEach(tab => {
      tab.classList.toggle('active', tab.dataset.submod === modeKey);
    });

    document.querySelectorAll('.dec-substage').forEach(stage => {
      stage.classList.toggle('active', stage.id === `substage-${modeKey}`);
    });

    if (modeKey === 'wheel') {
      setTimeout(drawWheel, 20);
    }
  }

  // ================= 模块初始化 =================
  let isInitialized = false;

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    // 1. 初始化预设与轮盘
    const presetsBar = document.getElementById('decWheelPresets');
    if (presetsBar) {
      presetsBar.innerHTML = Object.entries(WHEEL_PRESETS).map(([k, v]) => `
        <button class="dec-preset-pill ${k === curWheelPreset ? 'active' : ''}" data-preset="${k}">${v.name}</button>
      `).join('');

      presetsBar.querySelectorAll('.dec-preset-pill').forEach(btn => {
        btn.onclick = () => {
          if (isSpinningWheel) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          curWheelPreset = btn.dataset.preset;
          presetsBar.querySelectorAll('.dec-preset-pill').forEach(b => b.classList.toggle('active', b === btn));
          initWheelItems();
        };
      });
    }

    initWheelItems();
    initBweiSvg();

    // 2. 绑定轮盘事件
    const btnSpin = document.getElementById('btnSpinWheel');
    if (btnSpin) btnSpin.onclick = spinWheel;

    const btnAddOpt = document.getElementById('btnAddWheelOpt');
    const inputNewOpt = document.getElementById('wheelNewOptInput');
    if (btnAddOpt && inputNewOpt) {
      const doAdd = () => {
        const val = inputNewOpt.value.trim();
        if (!val) return;
        if (wheelItems.length >= 20) {
          alert('轮盘选项最多不能超过 20 项哦！');
          return;
        }
        wheelItems.push(val);
        inputNewOpt.value = '';
        if (curWheelPreset === 'custom') {
          saveCustomWheel();
        }
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        renderWheelChips();
        drawWheel();
      };
      btnAddOpt.onclick = doAdd;
      inputNewOpt.onkeydown = (e) => {
        if (e.key === 'Enter') doAdd();
      };
    }

    const btnResetPreset = document.getElementById('btnResetWheelPreset');
    if (btnResetPreset) {
      btnResetPreset.onclick = () => {
        if (isSpinningWheel) return;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        wheelItems = [...WHEEL_PRESETS[curWheelPreset].items];
        if (curWheelPreset === 'custom') {
          saveCustomWheel();
        }
        renderWheelChips();
        drawWheel();
      };
    }

    // 3. 绑定量子抛硬币事件
    const btnFlip = document.getElementById('btnFlipCoin');
    if (btnFlip) btnFlip.onclick = flipCoin;

    const coinDisc = document.getElementById('coinDisc');
    if (coinDisc) coinDisc.onclick = flipCoin;

    const frontInp = document.getElementById('coinLabelFront');
    const backInp = document.getElementById('coinLabelBack');
    const frontDisp = document.getElementById('coinFrontDisplay');
    const backDisp = document.getElementById('coinBackDisplay');

    if (frontInp && frontDisp) {
      frontInp.oninput = () => { frontDisp.textContent = frontInp.value.trim() || '冲 / 去'; };
    }
    if (backInp && backDisp) {
      backInp.oninput = () => { backDisp.textContent = backInp.value.trim() || '鸽 / 缓'; };
    }

    // 4. 绑定赛博掷圣杯事件
    const btnToss = document.getElementById('btnTossBwei');
    if (btnToss) btnToss.onclick = tossBwei;

    const bweiPlate = document.querySelector('.bwei-mat-plate');
    if (bweiPlate) bweiPlate.onclick = tossBwei;

    // 5. 绑定子模式切换
    document.querySelectorAll('.dec-tab').forEach(tab => {
      tab.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        switchSubMode(tab.dataset.submod);
      };
    });

    // 6. 模态框与保存图片
    const btnClose = document.getElementById('btnCloseReceipt');
    if (btnClose) btnClose.onclick = closeReceipt;

    const btnAgain = document.getElementById('btnReceiptAgain');
    if (btnAgain) {
      btnAgain.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        closeReceipt();
      };
    }

    const btnSaveImg = document.getElementById('btnReceiptSaveImage');
    if (btnSaveImg) {
      btnSaveImg.onclick = () => {
        if (window.SFX && window.SFX.save) window.SFX.save();
        drawReceiptCanvas(lastVerdictRecord);
      };
    }

    // 监听窗口大小变化以重新渲染轮盘
    window.addEventListener('resize', () => {
      if (curSubMode === 'wheel') drawWheel();
    });
  }

  // 供历史档案调用一键回溯记录
  function restore(recordData) {
    init();
    if (!recordData) return;
    if (recordData.modeKey) {
      switchSubMode(recordData.modeKey);
    }
    showReceipt(recordData);
  }

  // 全局暴露 API
  window.AppDecision = {
    init,
    restore,
    spinWheel,
    flipCoin,
    tossBwei,
    switchSubMode,
    drawReceiptCanvas
  };
})();
