/* =========================================================
   模块 4：工位风水大师 (Desk Fengshui Module)
   掐指一算，全凭感觉 · 打工人专属玄学指南
   ========================================================= */

(function () {
  'use strict';

  const DIRS = {
    east: { wx: '木', name: '青龙位，主事业上升', score: 6 },
    south: { wx: '火', name: '朱雀位，主名声口舌', score: 4 },
    west: { wx: '金', name: '白虎位，主财运竞争', score: 6 },
    north: { wx: '水', name: '玄武位，主贵人暗助', score: 5 },
    southeast: { wx: '木', name: '文昌位，主文书考试', score: 7 },
    southwest: { wx: '土', name: '坤位，主稳中有升', score: 3 },
    northwest: { wx: '金', name: '乾位，主掌权者护佑', score: 7 },
    northeast: { wx: '土', name: '艮位，主贵人少而精', score: 4 }
  };
  const ENVS = {
    window: { name: '靠窗，得天地之气，采光通风', score: 12 },
    wall: { name: '靠墙，背有靠山，坐得稳当', score: 5 },
    corridor: { name: '靠走廊，人来人往，气杂而散', score: -5 },
    door: { name: '靠门，正冲门煞，心神易扰', score: -10 }
  };
  const BOSSES = {
    none: { name: '无领导相压，自成天地（先别声张）', score: 15, crush: 8 },
    diagonal: { name: '领导在斜方，既有关照又不相冲', score: 8, crush: 22 },
    front: { name: '正对领导视线，言行皆被观', score: -6, crush: 66 },
    left: { name: '左青龙受压，发挥受限', score: -4, crush: 48 },
    right: { name: '右白虎抬头，竞争激烈', score: -6, crush: 58 },
    back: { name: '白虎压身，如芒在背', score: -10, crush: 82 }
  };
  const FACES = {
    plant: { name: '正对绿植，木气生发，财也生发', score: 8 },
    water: { name: '正对饮水机，财来财去，全凭造化', score: 0 },
    camera: { name: '正对天眼，谨防漏财（以及漏摸鱼）', score: -8 },
    coworker: { name: '前有后脑勺，口舌是非多', score: -5 }
  };
  const ITEMS = {
    tree: { name: '发财树，木旺财旺', score: 6 },
    crystal: { name: '水晶镇场，尤其紫水晶', score: 5 },
    fish: { name: '鱼缸为水，财气流动', score: 4 },
    cactus: { name: '仙人掌，刺破财运', score: -6 },
    figure: { name: '手办耗神散气', score: -3 },
    mirror: { name: '镜子乃反光煞，工位慎放', score: -8 },
    snack: { name: '零食破财，且易被同事瓜分', score: -2 }
  };
  const GRADES = [
    { min: 88, label: '大吉', emoji: '🌟', verdict: '此局上佳，财运事业两开花，摸鱼都不带被发现' },
    { min: 70, label: '上吉', emoji: '☀️', verdict: '气运不错，小吉大利，宜低调发财' },
    { min: 55, label: '中平', emoji: '🌗', verdict: '不凶不吉，全凭心态，稳住能赢' },
    { min: 40, label: '小凶', emoji: '☁️', verdict: '此局略险，宜谨言慎行，多喝水少开会' },
    { min: 0, label: '大凶', emoji: '⛈️', verdict: '风水堪忧，建议立刻去茶水间喝口热水压压惊' }
  ];
  const SAYINGS = [
    '大师掐指一算：此位风水尚可，唯独心不静则气不顺，气不顺则 KPI 难成。',
    '本座观你工位，财气三分，贵气两分，摸鱼之气五分——属实是打工人气运。',
    '此局为「温水煮青蛙局」，不凶不吉，全靠自己扑腾。',
    '紫气东来？不，是雾。建议多开窗，多开窍。',
    '你的工位磁场稳定，适合种植绿萝与梦想。',
    '此方位宜静不宜动，宜少说话，多喝水，多微笑。',
    '大师夜观星象，见你桌上有光，原来是屏幕没关。',
    '风水轮流转，明天到你家——指节假日。',
    '此位五行缺觉，建议午休时补上，此为养生大法。',
    '你工位的气场有点飘，像极了你周五下班时的步伐。',
    '万物皆可盘，工位亦可盘。盘顺了，运气就顺了。',
    '大师掐指二算：你最近缺的不是风水，是准时下班。',
    '此局主"闷声发财"，切记：好消息先别发群里。',
    '你的工位与财神有缘，与加班更有缘，需自行取舍。',
    '玄学讲究一个"信则有"，你不信，那也得加班的。',
    '此位风水奇佳，前提是——别让领导看见你在看这条。'
  ];
  const YI = [
    '宜摸鱼，但不宜被发现', '宜养一盆绿萝，假装热爱生活', '宜每周五准时下班',
    '宜在工位放一杯奶茶（财气具象化）', '宜面带微笑走进会议室', '宜今日不加班',
    '宜偷偷学新技能，假装在看报表', '宜喝水八杯，润泽肺腑', '宜把最烦的活安排在领导不在时',
    '宜整理桌面，断舍离', '宜早上第一件事：打开周报', '宜给绿植浇水，顺便给领导点赞',
    '宜午休时关灯睡觉（养生大法）', '宜把键盘敲得很有节奏感', '宜在群里回复「好的」后真的去做',
    '宜带薪如厕，排毒养颜', '宜把工位布置成"我很忙"的样子', '宜主动问一句「需要帮忙吗」（就一句）',
    '宜把重要邮件放在早上发', '宜给同事带杯咖啡（人情世故）', '宜周五下午清空待办',
    '宜少开摄像头，多开小差'
  ];
  const JI = [
    '忌边看手机边笑出声', '忌把辞职信放在键盘上（哪怕只是草稿）', '忌和同事在走廊大声聊八卦',
    '忌用公司打印机打个人文件', '忌在群里发完「收到」之前先打完这句话', '忌正对领导时摸鱼',
    '忌把仙人掌对准领导', '忌周五下班前发起新需求讨论', '忌在工位吃螺蛳粉',
    '忌把聊天记录投屏', '忌开会时盯着天花板叹气', '忌把「不想干了」写在脸上',
    '忌回复「随便」——尤其是在被问方案时', '忌把周报写成小说', '忌在领导背后翻白眼（方位风水大忌）',
    '忌午休刷到前同事升职的朋友圈', '忌摸鱼摸到忘记喝水', '忌跟 AI 聊天聊到笑出声',
    '忌把外卖单子落打印区', '忌用「我听说」开头传话', '忌在工位公开摆烂（暗着摆）'
  ];
  const KOUJUE = [
    '左青龙，右白虎，中间坐个座山雕。',
    '一摸鱼，二喝水，三看窗外，四不加班。',
    '天灵灵地灵灵，老板不在这层灵。',
    '金木水火土，工资都不补；唯有心态稳，快乐能自足。',
    '南无喝啰怛那，摸鱼摸出花。',
    '风水轮流转，转走的是加班，转来的是下班。',
    '五行缺什么都可以，就是不能缺觉。',
    '日出东方，利在四方，心之所向，准时下班。',
    '人在工位坐，运从头顶过，稳住别浪，周末快活。',
    '此咒念三遍：不急、不气、不加班。',
    '财神到，财神到，老板看不见最妙。',
    '听我一句劝：气顺了，水逆就散了。'
  ];
  const LUCKY_COLORS = ['朱砂红', '玄黑', '琥珀金', '黛青', '月白', '鹅黄', '竹青', '绛紫', '松石绿', '驼色'];
  const LUCKY_NUMS = [3, 6, 8, 9, 12, 18, 24, 50];
  const LUCKY_FOOD = ['辣条', '奶茶', '薯片', '坚果', '凤梨酥', '小饼干', '鸭脖', '西瓜', '绿豆汤', '关东煮'];
  const HIDE_SPOTS = [
    '领导视线的正后方', '茶水间方向', '窗户边', '打印机转角',
    '工位隔板后', '离摄像头最远的角落', '走廊尽头', '隔壁空工位',
    '厕所方向（慎用）', '资料柜后面'
  ];
  const WUXING_FIX = {
    '木': ['发财树', '绿萝'],
    '火': ['红色摆件', '暖色台灯'],
    '土': ['陶器摆件', '陶瓷杯'],
    '金': ['铜钱摆件', '金属笔筒'],
    '水': ['小鱼缸', '大杯水']
  };

  function pick(a) { return a[Math.floor(Math.random() * a.length)]; }

  let lastFengshuiReport = null;

  function genReport() {
    const dir = document.getElementById('fs-dir').value;
    const env = document.getElementById('fs-env').value;
    const boss = document.getElementById('fs-boss').value;
    const face = document.getElementById('fs-face').value;
    const items = [];
    document.querySelectorAll('#fs-items .fs-chip.on').forEach(c => items.push(c.getAttribute('data-v')));

    const d = DIRS[dir], e = ENVS[env], b = BOSSES[boss], f = FACES[face];
    let score = 55 + d.score + e.score + b.score + f.score;
    items.forEach(v => { score += (ITEMS[v] ? ITEMS[v].score : 0); });
    score += Math.floor(Math.random() * 21) - 10;
    score = Math.max(3, Math.min(99, score));

    const grade = GRADES.find(g => score >= g.min) || GRADES[GRADES.length - 1];
    let crush = b.crush + Math.floor(Math.random() * 9) - 4;
    crush = Math.max(5, Math.min(96, crush));

    const yis = [], jis = [];
    while (yis.length < 3) { const y = pick(YI); if (!yis.includes(y)) yis.push(y); }
    while (jis.length < 3) { const j = pick(JI); if (!jis.includes(j)) jis.push(j); }

    const fix = WUXING_FIX[d.wx] || ['绿萝', '水杯'];
    let fix1 = pick(fix), fix2 = pick(fix);
    if (fix.length > 1) { while (fix2 === fix1) fix2 = pick(fix); }

    const luckyColor = pick(LUCKY_COLORS);
    const luckyNum = pick(LUCKY_NUMS);
    const luckyFood = pick(LUCKY_FOOD);
    const hideSpot = pick(HIDE_SPOTS);
    const saying = pick(SAYINGS);
    const koujue = pick(KOUJUE);

    const rep = {
      score, grade, crush,
      wx: d.wx, dirName: d.name, envName: e.name, bossName: b.name, faceName: f.name,
      itemNames: items.map(v => ITEMS[v].name),
      fix1, fix2,
      luckyColor, luckyNum, luckyFood,
      hideSpot, saying, koujue,
      yis, jis,
      ts: new Date().toLocaleString('zh-CN', { hour12: false })
    };

    lastFengshuiReport = rep;
    renderReport(rep);

    // 存入全所综合档案库
    if (window.UniversalHistory) {
      window.UniversalHistory.add({
        module: 'fengshui',
        title: `工位风水 · ${rep.grade.emoji} ${rep.grade.label} (${rep.score}分)`,
        subtitle: rep.grade.verdict,
        color: '#b03a2e',
        badge: '🧭 风水',
        avatar: '🧭',
        data: rep
      });
    }

    return rep;
  }

  function renderReport(r) {
    const el = document.getElementById('fs-report');
    if (!el) return;

    let h = `
      <div class="r-top">
        <div class="r-grade">${r.grade.emoji} ${r.grade.label}</div>
        <div class="r-verdict">${r.grade.verdict}</div>
        <div class="score-row">
          <div class="score-label"><span>工位运势指数</span><span>${r.score} / 100</span></div>
          <div class="score-bar"><div class="score-fill" style="width:${r.score}%;"></div></div>
        </div>
      </div>

      <div class="r-sec">
        <h4>🔎 五行方位与环境诊断</h4>
        <div class="r-line">
          座向属<b>${r.wx}</b>，${r.dirName}。<br>
          工位${r.envName}。<br>
          ${r.bossName}。<br>
          ${r.faceName}。
        </div>
      </div>

      <div class="r-sec">
        <h4>⚠️ 领导压迫感指数</h4>
        <div class="score-row">
          <div class="score-label"><span>压迫感强度</span><span>${r.crush}%</span></div>
          <div class="score-bar"><div class="score-fill" style="width:${r.crush}%;background:#e06a3c;"></div></div>
        </div>
      </div>

      <div class="r-sec">
        <h4>🌿 五行生旺法宝</h4>
        <div class="r-line">
          本命缺补：建议工位增添 <b>${r.fix1}</b> 或 <b>${r.fix2}</b>。<br>
          吉利方位避难所：<b>${r.hideSpot}</b>。
        </div>
      </div>

      <div class="r-sec">
        <h4>📜 今日宜忌黄历</h4>
        <div class="luck" style="margin-bottom:8px;">
          ${r.yis.map(y => `<span style="border-color:#10b981;color:#10b981;">宜 · ${y}</span>`).join('')}
        </div>
        <div class="luck">
          ${r.jis.map(j => `<span style="border-color:#ef4444;color:#ef4444;">忌 · ${j}</span>`).join('')}
        </div>
      </div>

      <div class="fs-quote">
        <b>💡 大师批注：</b>${r.saying}<br>
        <span style="font-size:12.5px;opacity:0.8;display:block;margin-top:6px;">口诀：${r.koujue}</span>
      </div>

      <div class="copy-row">
        <button class="copy-btn" id="fs-btn-copy">📋 复制签文</button>
        <button class="copy-btn" id="fs-btn-save">📜 保存风水签</button>
        <button class="copy-btn" id="fs-btn-again">🎲 重新推演</button>
      </div>
    `;

    el.innerHTML = h;
    showScreen('sc-fs-result');

    const copyBtn = document.getElementById('fs-btn-copy');
    if (copyBtn) {
      copyBtn.onclick = () => {
        const text = `🧭 工位风水报告\n评级：${r.grade.emoji} ${r.grade.label}（运势 ${r.score}/100）\n座向：${r.wx}行 · ${r.dirName}\n环境：${r.envName}\n领导气场：${r.bossName}\n对面景象：${r.faceName}\n开运法宝：${r.fix1}、${r.fix2}\n宜：${r.yis.join(' / ')}\n忌：${r.jis.join(' / ')}\n批注：${r.saying}\n口诀：${r.koujue}`;
        navigator.clipboard.writeText(text).then(() => {
          copyBtn.textContent = '✅ 已复制';
          copyBtn.classList.add('done');
          setTimeout(() => {
            copyBtn.textContent = '📋 复制签文';
            copyBtn.classList.remove('done');
          }, 1500);
        }).catch(() => {});
      };
    }

    document.getElementById('fs-btn-again').onclick = () => {
      if (window.SFX && window.SFX.bell) window.SFX.bell(false);
      genReport();
    };
    document.getElementById('fs-btn-save').onclick = () => {
      drawFengshuiShareCard(r);
    };
  }

  function showScreen(id) {
    const root = document.getElementById('mod-fengshui');
    if (!root) return;
    root.querySelectorAll('.fs-screen').forEach(s => s.classList.remove('active'));
    const target = root.querySelector('#' + id);
    if (target) {
      target.classList.add('active');
      root.scrollTop = 0;
    }
  }

  function randomize() {
    const dirs = Object.keys(DIRS);
    const envs = Object.keys(ENVS);
    const bosses = Object.keys(BOSSES);
    const faces = Object.keys(FACES);

    document.getElementById('fs-dir').value = pick(dirs);
    document.getElementById('fs-env').value = pick(envs);
    document.getElementById('fs-boss').value = pick(bosses);
    document.getElementById('fs-face').value = pick(faces);

    const chips = document.querySelectorAll('#fs-items .fs-chip');
    chips.forEach(c => {
      c.classList.toggle('on', Math.random() < 0.35);
    });
  }

  function drawFengshuiShareCard(r) {
    if (!r) return;
    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = 1520;
    const ctx = cv.getContext('2d');
    const isDark = document.documentElement.dataset.theme !== 'light';

    // 1. 画布大底
    ctx.fillStyle = isDark ? '#191822' : '#f5efe0';
    ctx.fillRect(0, 0, 1080, 1520);

    // 外框卡片
    ctx.fillStyle = isDark ? '#23212c' : '#fffdf7';
    ctx.strokeStyle = isDark ? 'rgba(212, 175, 55, 0.4)' : '#e0d5bc';
    ctx.lineWidth = 4;
    roundRect(ctx, 70, 70, 940, 1380, 36);
    ctx.fill();
    ctx.stroke();

    // 2. 顶部主标题
    ctx.fillStyle = isDark ? '#d4af37' : '#b3881a';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('工位风水大师 · 掐指一算', 540, 160);

    // 评级大字
    ctx.fillStyle = isDark ? '#e06a3c' : '#b03a2e';
    ctx.font = 'bold 74px sans-serif';
    ctx.fillText(`${r.grade.emoji} ${r.grade.label}`, 540, 260);

    // 批辞
    ctx.fillStyle = isDark ? '#ece7dc' : '#3a3128';
    ctx.font = '30px sans-serif';
    ctx.fillText(r.grade.verdict, 540, 325);

    // 运势指数
    ctx.font = 'bold 40px sans-serif';
    ctx.fillStyle = isDark ? '#d4af37' : '#c9a227';
    ctx.fillText(`运势指数: ${r.score} / 100`, 540, 395);

    // 3. 五行环境诊断看板 (x:120, y:430, w:840, h:320)
    ctx.fillStyle = isDark ? '#2b2837' : '#f9f3e3';
    roundRect(ctx, 120, 430, 840, 320, 22);
    ctx.fill();

    ctx.textAlign = 'left';
    ctx.fillStyle = isDark ? '#ece7dc' : '#3a3128';
    ctx.font = '27px sans-serif';
    ctx.fillText(`座向属性：${r.wx}行 · ${r.dirName}`, 160, 490);
    ctx.fillText(`工位格局：${r.envName}`, 160, 548);
    ctx.fillText(`领导气场：${r.bossName}`, 160, 606);
    ctx.fillText(`对面景象：${r.faceName}`, 160, 664);
    ctx.fillText(`化解法宝：工位增置【${r.fix1}】或【${r.fix2}】`, 160, 722);

    // 4. 今日宜忌黄历卡片 (x:120, y:775, w:840, h:230)
    ctx.fillStyle = isDark ? '#2b2837' : '#f9f3e3';
    roundRect(ctx, 120, 775, 840, 230, 22);
    ctx.fill();

    // 宜（绿色）自动换行
    ctx.fillStyle = '#10b981';
    ctx.font = 'bold 27px sans-serif';
    let curY = wrapText(ctx, `【宜】 ` + r.yis.join('  |  '), 160, 835, 760, 40);

    // 忌（红色）自动换行
    ctx.fillStyle = '#ef4444';
    ctx.font = 'bold 27px sans-serif';
    wrapText(ctx, `【忌】 ` + r.jis.join('  |  '), 160, curY > 840 ? curY + 12 : 935, 760, 40);

    // 5. 大师批注与避难吉位 (x:120, y:1030, w:840, h:185)
    ctx.fillStyle = isDark ? '#2b2837' : '#f9f3e3';
    roundRect(ctx, 120, 1030, 840, 185, 22);
    ctx.fill();

    ctx.fillStyle = isDark ? '#d4af37' : '#b3881a';
    ctx.font = 'bold 26px sans-serif';
    ctx.fillText('💡 大师批注：', 160, 1075);

    ctx.fillStyle = isDark ? '#c8c2d3' : '#574d3f';
    ctx.font = '25px sans-serif';
    curY = wrapText(ctx, r.saying, 160, 1118, 760, 36);

    ctx.fillStyle = isDark ? '#d4af37' : '#b3881a';
    ctx.font = '24px sans-serif';
    ctx.fillText(`吉位避难所：${r.hideSpot}`, 160, 1182);

    // 6. 底部口诀横幅 (x:120, y:1240, w:840, h:85)
    ctx.fillStyle = isDark ? 'rgba(212, 175, 55, 0.14)' : 'rgba(179, 136, 26, 0.12)';
    ctx.strokeStyle = isDark ? '#d4af37' : '#c9a227';
    ctx.lineWidth = 2;
    roundRect(ctx, 120, 1240, 840, 85, 18);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = isDark ? '#f1c40f' : '#b03a2e';
    ctx.font = 'bold 28px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`口诀：${r.koujue}`, 540, 1293);

    // 水印
    ctx.fillStyle = isDark ? '#6f697b' : '#a39886';
    ctx.font = '20px sans-serif';
    ctx.fillText('职场玄学纯属娱乐 · 祝诸君带薪摸鱼、步步高升', 540, 1385);

    const a = document.createElement('a');
    a.download = `工位风水_${r.grade.label}.png`;
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

  function wrapText(ctx, text, x, y, maxW, lineH) {
    let line = '';
    for (let i = 0; i < text.length; i++) {
      const testLine = line + text[i];
      if (ctx.measureText(testLine).width > maxW && i > 0) {
        ctx.fillText(line, x, y);
        line = text[i];
        y += lineH;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, y);
    return y + lineH;
  }

  function init() {
    // 选项切换
    document.querySelectorAll('#fs-items .fs-chip').forEach(c => {
      c.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        c.classList.toggle('on');
      };
    });

    const btnGo = document.getElementById('fs-go');
    if (btnGo) {
      btnGo.onclick = () => {
        if (window.SFX && window.SFX.bell) window.SFX.bell(true);
        genReport();
      };
    }

    const btnBack = document.getElementById('fs-btn-back');
    if (btnBack) {
      btnBack.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        showScreen('sc-fs-input');
      };
    }

    const btnRandom = document.getElementById('fs-random');
    if (btnRandom) {
      btnRandom.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        randomize();
      };
    }
  }

  function restore(data) {
    if (!data) return;
    const r = data.reportData || data;
    renderReport(r);
  }

  window.AppFengshui = {
    init,
    genReport,
    randomize,
    restore,
    drawFengshuiShareCard
  };
})();
