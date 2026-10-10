/* =========================================================
   模块 7：东方赛博灵签 (Cyber Oriental Fortune Sticks)
   与西方赛博塔罗并列「东西玄学合辑」· 紫竹摇签 · 朱砂宣纸签文
   ========================================================= */

(function () {
  'use strict';

  const CATEGORIES = {
    career: { name: '💼 搞钱事业', desc: '升职加薪 · 避坑跳槽' },
    wealth: { name: '💰 暴富偏财', desc: '正财稳进 · 锦鲤附体' },
    love:   { name: '🌸 赛博桃花', desc: '正缘显灵 · 寡王破局' },
    shield: { name: '🛡️ 退散小人', desc: '甩锅免疫 · 水逆清零' }
  };

  // 精选 16 支东西方交融赛博灵签库
  const STICKS = [
    {
      no: '第一签',
      title: '紫气东来 · 扶摇直上',
      rank: '上上大吉',
      poem: ['大鹏一日同风起，扶摇直上九万里。', '久困樊笼今脱锁，金鳞岂是池中物。'],
      xianji: { '功名': '破格拔擢', '财运': '八方来财', '良缘': '天作之合', '防锅': '万邪不侵' },
      interp: '此乃百里挑一的「天选打工人」神签！你之前积攒的所有隐忍、熬过的夜、改过的烂需求，都将在近期转化为实质性的大爆发。原本卡壳的事情会突然绿灯全开，贵人主动递梯子。别再自我怀疑，大胆争取你应得的筹码！',
      yi: '大胆提条件、投递心仪 Offer、买杯最贵的特调犒劳自己',
      ji: '过度谦虚、替不懂感恩的人免费加班'
    },
    {
      no: '第三签',
      title: '姜公钓鱼 · 愿者上钩',
      rank: '上吉',
      poem: ['渭水河畔持翠竿，风波不动心自宽。', '莫道良辰来得晚，一朝得势跃龙门。'],
      xianji: { '功名': '大器晚成', '财运': '静待花开', '良缘': '水到渠成', '防锅': '稳坐钓鱼台' },
      interp: '焦虑是因为你把时间线拉得太短了！当前看似风平浪静甚至有点无聊的工位日常，其实是宇宙在帮你蓄力。不要看别人瞎卷就跟着乱阵脚，按你自己的节奏摸鱼充电、精进手艺，真正属于你的大鱼已经在咬钩的路上了。',
      yi: '按时下班、整理作品集、带薪学习新技能',
      ji: '跟风内卷、在深夜回复工作群消息'
    },
    {
      no: '第六签',
      title: '火炼真金 · 拨云见日',
      rank: '中上吉',
      poem: ['千淘万漉虽辛苦，吹尽狂沙始到金。', '守得云开见明月，自有清风拂衣襟。'],
      xianji: { '功名': '先苦后甜', '财运': '渐入佳境', '良缘': '真心相见', '防锅': '清者自清' },
      interp: '最近是不是觉得破事一堆、仿佛全公司的草台班子都在考验你的脾气？稳住！这支签告诉你：目前的折腾正是筛掉庸人、凸显你价值的时刻。那些甩不掉的烂摊子很快就会收尾，你的专业度会被真正有话语权的人看在眼里。',
      yi: '留存工作留痕记录、午休闭目养神 20 分钟',
      ji: '在背后跟半熟的同事吐槽老板'
    },
    {
      no: '第八签',
      title: '财神敲门 · 暗流涌金',
      rank: '上上大吉',
      poem: ['忽如一夜春风来，千树万树金花开。', '正道勤耕有厚报，偏财亦随喜鹊来。'],
      xianji: { '功名': '名利双收', '财运': '横财就手', '良缘': '喜气盈门', '防锅': '逢凶化吉' },
      interp: '恭喜抽中赛博财神爷亲自加持的搞钱灵签！近期你的财运磁场极强，不仅主业有望迎来奖金、补贴或绩效好消息，还容易遇到报销秒批、闲置高价卖出、抽中免单等意外惊喜。记得把手机电量充满，随时接听好消息！',
      yi: '核对报销单、清理二手闲置、请朋友喝快乐水攒人品',
      ji: '冲动消费买华而不实的电子垃圾'
    },
    {
      no: '第十一签',
      title: '明哲保身 · 潜龙勿用',
      rank: '中平',
      poem: ['深潭潜龙莫轻狂，雾里看花且敛光。', '他山纵有千般险，我自高卧白云乡。'],
      xianji: { '功名': '宜守不宜攻', '财运': '落袋为安', '良缘': '随缘莫强求', '防锅': '三十六计闪为上' },
      interp: '这是一支极具东方生存智慧的「摸鱼护体签」！当前外部环境（或者你们部门的规划）正处于朝令夕改的混乱期，谁冲在最前面谁就最容易当炮灰。此时最高级的策略就是：降低存在感，精准卡点完成分内事，绝不主动揽活！',
      yi: '开启免打扰模式、准点打卡溜号、保持表情平淡',
      ji: '在会议上抢答、盲目立下高难度 Flag'
    },
    {
      no: '第十五签',
      title: '钟馗捉鬼 · 小人退散',
      rank: '上吉',
      poem: ['青锋宝剑耀寒光，魑魅魍魉无处藏。', '坦荡胸怀行大道，清风明月伴君旁。'],
      xianji: { '功名': '排除万难', '财运': '失而复得', '良缘': '去伪存真', '防锅': '反弹琵琶' },
      interp: '近期若有阴阳怪气的甩锅侠、爱打小报告的职场戏精围着你转，请尽管放心！此签自带「赛博钟馗防弹盾」，对方耍的小聪明不仅伤不到你，反而会在大庭广众之下露出马脚自食其果。你只管堂堂正正看戏即可！',
      yi: '重要沟通一律群聊留底、桌面摆一盆绿植或冰水',
      ji: '因别人的愚蠢而内耗生闷气'
    },
    {
      no: '第十八签',
      title: '桃花映面 · 良缘天降',
      rank: '上上大吉',
      poem: ['春水初生映彩霞，春林初盛满枝花。', '莫愁前路无知己，转角相逢便是一家。'],
      xianji: { '功名': '人脉亨通', '财运': '和气生财', '良缘': '红鸾星动', '防锅': '众人相助' },
      interp: '不仅爱情桃花旺，人际贵人运更是直接拉满！单身者近期极易在兴趣社群、朋友聚会或偶然的搭话中遇到聊得来的高频灵魂；职场人则会遇到沟通极其顺畅的神仙搭档或爽快客户，让你感叹“人间居然还有正常人”！',
      yi: '换个清爽发型、周末出门晒太阳、主动给朋友点个赞',
      ji: '全天宅在被窝不见天日、拒绝所有社交邀请'
    },
    {
      no: '第二十二签',
      title: '柳暗花明 · 绝处逢生',
      rank: '中吉（逆袭签）',
      poem: ['山重水复疑无路，柳暗花明又一村。', '莫叹眼下微霜冷，转身便是艳阳春。'],
      xianji: { '功名': '另辟蹊径', '财运': '转弯见喜', '良缘': '旧去新来', '防锅': '化险为夷' },
      interp: '如果一件事怎么推进都觉得别扭、或者一段关系怎么维护都觉得心累，这支签在温柔地拍拍你：别死磕那扇锁死的门了！试着换一条路、换一个方案，甚至直接放下它，你会惊讶地发现旁边就有一扇洒满阳光的落地窗。',
      yi: '清理手机内存与桌面杂物、换条路散步回家',
      ji: '钻牛角尖、为沉没成本继续买单'
    },
    {
      no: '第二十六签',
      title: '偷得浮生 · 逍遥神仙',
      rank: '上吉',
      poem: ['竹密不妨流水过，山高岂碍白云飞。', '因过竹院逢僧话，偷得浮生半日闲。'],
      xianji: { '功名': '松弛有度', '财运': '知足常乐', '良缘': '自在随心', '防锅': '片叶不沾身' },
      interp: '宇宙检测到你的精神发条拧得太紧了！特赐「带薪逍遥签」一支。天塌下来有高个子顶着，公司的股价更不会因为你少回一条消息而跌停。今天你的首要KPI就是照顾好自己的情绪，去喝杯好喝的，让灵魂充个电！',
      yi: '正大光明摸鱼 15 分钟、听喜欢的歌、早点钻进被窝',
      ji: '把工作焦虑带上餐桌和床头'
    },
    {
      no: '第三十签',
      title: '否极泰来 · 破茧成蝶',
      rank: '下下转上吉（触底反弹）',
      poem: ['冬去冰消春自回，寒梅历雪更芳菲。', '今朝虽有微云蔽，明日金乌照九围。'],
      xianji: { '功名': '触底反弹', '财运': '守正待时', '良缘': '破镜重圆', '防锅': '涅槃重生' },
      interp: '抽到这支签反而要恭喜你！所谓「否极泰来」，意味着最倒霉、最心烦的谷底已经彻底翻篇了！从你看到这行字开始，所有的霉运都已经清零结算，接下来走的每一步都是在往高处走。去洗把脸，好戏才刚刚开始！',
      yi: '吃一顿热乎乎的美食、洗个热水澡洗去疲惫',
      ji: '灰心丧气、否定自己的价值'
    }
  ];

  let curCategory = 'career';
  let isShaking = false;
  let lastStickRecord = null;

  function showScreen(id) {
    const root = document.getElementById('mod-lingqian');
    if (!root) return;
    root.querySelectorAll('.lq-screen').forEach(s => s.classList.remove('active'));
    const target = root.querySelector('#' + id);
    if (target) {
      target.classList.add('active');
      root.scrollTop = 0;
    }
  }

  function renderCylinderSvg() {
    const box = document.getElementById('lqCylinderSvgBox');
    if (!box) return;
    box.innerHTML = `
      <svg viewBox="0 0 160 220" width="150" height="206" style="filter: drop-shadow(0 12px 24px rgba(0,0,0,0.45));">
        <defs>
          <linearGradient id="g_lq_bamboo" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#7F1D1D"/>
            <stop offset="25%" stop-color="#B91C1C"/>
            <stop offset="55%" stop-color="#991B1B"/>
            <stop offset="100%" stop-color="#450A0A"/>
          </linearGradient>
          <linearGradient id="g_lq_gold" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#D97706"/>
            <stop offset="50%" stop-color="#FDE68A"/>
            <stop offset="100%" stop-color="#B45309"/>
          </linearGradient>
          <linearGradient id="g_lq_stick" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#FDE68A"/>
            <stop offset="100%" stop-color="#D97706"/>
          </linearGradient>
        </defs>
        <!-- 签筒内簇拥的竹签群 -->
        <g id="lqSticksBundle">
          <rect x="46" y="18" width="10" height="80" rx="4" transform="rotate(-10 50 70)" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <rect x="60" y="10" width="10" height="85" rx="4" transform="rotate(-4 65 70)" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <rect x="75" y="8" width="11" height="88" rx="4" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <rect x="90" y="12" width="10" height="84" rx="4" transform="rotate(5 95 70)" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <rect x="104" y="20" width="10" height="78" rx="4" transform="rotate(11 108 70)" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <!-- 红头点缀 -->
          <rect x="75" y="8" width="11" height="14" rx="3" fill="#E11D48"/>
          <rect x="60" y="10" width="10" height="12" rx="3" transform="rotate(-4 65 70)" fill="#E11D48"/>
          <rect x="90" y="12" width="10" height="12" rx="3" transform="rotate(5 95 70)" fill="#E11D48"/>
        </g>
        <!-- 签筒后壁内口 -->
        <ellipse cx="80" cy="72" rx="46" ry="12" fill="#2A0505" stroke="url(#g_lq_gold)" stroke-width="2.5"/>
        <!-- 雕花朱漆签筒桶身 -->
        <path d="M34,72 L40,192 C40,202 58,208 80,208 C102,208 120,202 120,192 L126,72 C126,80 105,84 80,84 C55,84 34,80 34,72 Z" fill="url(#g_lq_bamboo)" stroke="#7F1D1D" stroke-width="1.5"/>
        <!-- 鎏金箍环 -->
        <path d="M35,92 Q80,102 125,92" fill="none" stroke="url(#g_lq_gold)" stroke-width="4"/>
        <path d="M39,176 Q80,186 121,176" fill="none" stroke="url(#g_lq_gold)" stroke-width="4"/>
        <!-- 筒身中央牌匾 -->
        <rect x="62" y="106" width="36" height="60" rx="6" fill="#450A0A" stroke="url(#g_lq_gold)" stroke-width="2"/>
        <text x="80" y="132" font-size="15" font-weight="900" fill="#FDE68A" text-anchor="middle" font-family="serif">有求</text>
        <text x="80" y="154" font-size="15" font-weight="900" fill="#FDE68A" text-anchor="middle" font-family="serif">必应</text>
      </svg>
    `;
  }

  function startShake() {
    if (isShaking) return;
    isShaking = true;

    const btn = document.getElementById('lqBtnShake');
    const cyl = document.getElementById('lqCylinderWrap');
    const flyStick = document.getElementById('lqFlyingStick');
    const stickTxt = document.getElementById('lqStickText');
    const hint = document.getElementById('lqStageHint');

    if (btn) btn.disabled = true;
    if (flyStick) flyStick.classList.remove('dropped');
    if (cyl) cyl.classList.add('shaking');
    if (hint) hint.textContent = '🎋 正在摇晃紫竹签筒，聆听神明指引……';

    // 连续播放竹签碰撞音效
    let tickCount = 0;
    const soundTimer = setInterval(() => {
      tickCount++;
      if (window.SFX && window.SFX.shake && tickCount === 1) {
        window.SFX.shake();
      } else if (window.SFX && window.SFX.tap) {
        window.SFX.tap();
      }
      if (tickCount >= 7) clearInterval(soundTimer);
    }, 180);

    // 随机抽取一支灵签
    const picked = STICKS[Math.floor(Math.random() * STICKS.length)];
    if (stickTxt) stickTxt.textContent = picked.no;

    setTimeout(() => {
      clearInterval(soundTimer);
      if (cyl) cyl.classList.remove('shaking');
      if (flyStick) flyStick.classList.add('dropped');
      if (window.SFX && window.SFX.bell) window.SFX.bell(true);
      if (hint) hint.textContent = `✨ 灵签已落：${picked.no} · 正在展开宣纸签文……`;

      setTimeout(() => {
        isShaking = false;
        if (btn) btn.disabled = false;
        if (flyStick) flyStick.classList.remove('dropped');
        if (hint) hint.textContent = '轻点签筒或下方按钮，诚心摇出今日灵签';
        renderResult(picked);
      }, 900);
    }, 1450);
  }

  function renderResult(stick, isRestored = false) {
    const wishInput = document.getElementById('lqWishInput');
    const wish = isRestored && stick.wish
      ? stick.wish
      : ((wishInput && wishInput.value.trim()) || CATEGORIES[curCategory].name);

    const catName = isRestored && stick.catName ? stick.catName : CATEGORIES[curCategory].name;

    lastStickRecord = {
      ...stick,
      catKey: curCategory,
      catName: catName,
      wish: wish,
      timeStr: new Date().toLocaleString('zh-CN', { hour12: false })
    };

    const subEl = document.getElementById('lqResCatSub');
    const titleEl = document.getElementById('lqResTitle');
    const rankEl = document.getElementById('lqResRank');
    const poemEl = document.getElementById('lqResPoem');
    const xjEl = document.getElementById('lqResXianji');
    const interpEl = document.getElementById('lqResInterp');
    const tipsEl = document.getElementById('lqResTips');

    if (subEl) subEl.textContent = `${catName} · 祈愿：${wish}`;
    if (titleEl) titleEl.textContent = `${stick.no} · ${stick.title}`;
    if (rankEl) rankEl.textContent = stick.rank;
    if (poemEl) poemEl.innerHTML = stick.poem.join('<br>');

    if (xjEl && stick.xianji) {
      xjEl.innerHTML = Object.entries(stick.xianji).map(([k, v]) => `
        <div class="lq-xj-item"><span>${k}</span><b>${v}</b></div>
      `).join('');
    }

    if (interpEl) interpEl.textContent = stick.interp;
    if (tipsEl) {
      tipsEl.innerHTML = `
        <div><b>✅ 今日宜：</b>${stick.yi}</div>
        <div><b>❌ 今日忌：</b>${stick.ji}</div>
      `;
    }

    showScreen('sc-lq-result');
    if (window.SFX && window.SFX.reveal) window.SFX.reveal();

    if (!isRestored && window.UniversalHistory && typeof window.UniversalHistory.add === 'function') {
      window.UniversalHistory.add({
        module: 'lingqian',
        title: `${stick.no} · ${stick.title} (${stick.rank})`,
        subtitle: `${catName} · ${ stick.poem[0] }`,
        color: '#E11D48',
        badge: '🎋 灵签',
        avatar: '🎋',
        data: lastStickRecord
      });
    }
  }

  // 生成复古宣纸朱砂签文高清分享海报
  function drawLingqianPoster(record) {
    if (!record) return;
    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = 1620;
    const ctx = cv.getContext('2d');
    const isDark = document.documentElement.dataset.theme !== 'light';

    // 背景
    ctx.fillStyle = isDark ? '#140D11' : '#F7F1E5';
    ctx.fillRect(0, 0, 1080, 1620);

    // 宣纸卷轴外框
    ctx.fillStyle = isDark ? '#21151B' : '#FFFDF8';
    ctx.strokeStyle = '#D97706';
    ctx.lineWidth = 5;
    roundRect(ctx, 80, 80, 920, 1460, 32);
    ctx.fill();
    ctx.stroke();

    // 内层金线框
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.35)';
    ctx.lineWidth = 2;
    roundRect(ctx, 104, 104, 872, 1412, 20);
    ctx.stroke();

    // 顶部抬头
    ctx.textAlign = 'center';
    ctx.fillStyle = '#D97706';
    ctx.font = 'bold 26px system-ui, sans-serif';
    ctx.fillText('东方赛博灵签 · 灵感研究所', 540, 175);

    ctx.fillStyle = isDark ? '#FDF2F8' : '#29151B';
    ctx.font = '900 58px serif';
    ctx.fillText(`${record.no} · ${record.title}`, 540, 260);

    // 吉凶朱砂大印
    ctx.fillStyle = '#E11D48';
    roundRect(ctx, 410, 295, 260, 64, 14);
    ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '900 34px system-ui, sans-serif';
    ctx.fillText(record.rank, 540, 339);

    // 签诗框
    ctx.fillStyle = isDark ? 'rgba(245, 158, 11, 0.08)' : 'rgba(245, 158, 11, 0.1)';
    roundRect(ctx, 140, 400, 800, 220, 20);
    ctx.fill();
    ctx.strokeStyle = 'rgba(217, 119, 6, 0.4)';
    ctx.stroke();

    ctx.fillStyle = isDark ? '#FDE68A' : '#78350F';
    ctx.font = 'bold 38px "Songti SC", "SimSun", serif';
    ctx.fillText(record.poem[0], 540, 485);
    ctx.fillText(record.poem[1], 540, 560);

    // 仙机断语
    let curY = 690;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#E11D48';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText('【仙机四维批注】', 140, curY);

    curY += 52;
    ctx.fillStyle = isDark ? '#FDF2F8' : '#29151B';
    ctx.font = 'bold 28px system-ui, sans-serif';
    const xjPairs = Object.entries(record.xianji || {});
    xjPairs.forEach(([k, v], idx) => {
      const colX = idx % 2 === 0 ? 160 : 560;
      const rowY = curY + Math.floor(idx / 2) * 52;
      ctx.fillText(`✦ ${k}：${v}`, colX, rowY);
    });

    // 白话解签
    curY += 140;
    ctx.fillStyle = '#E11D48';
    ctx.font = '900 28px system-ui, sans-serif';
    ctx.fillText('【赛博打工人白话解签】', 140, curY);

    curY += 50;
    ctx.fillStyle = isDark ? '#E5D5DC' : '#3F272E';
    ctx.font = '26px system-ui, sans-serif';
    curY = wrapText(ctx, record.interp, 140, curY, 800, 44);

    // 宜忌锦囊
    curY += 45;
    ctx.fillStyle = isDark ? 'rgba(225, 29, 72, 0.12)' : 'rgba(225, 29, 72, 0.08)';
    roundRect(ctx, 140, curY, 800, 150, 16);
    ctx.fill();

    ctx.fillStyle = isDark ? '#FDF2F8' : '#29151B';
    ctx.font = 'bold 24px system-ui, sans-serif';
    ctx.fillText(`✅ 今日宜：${record.yi}`, 170, curY + 55);
    ctx.fillText(`❌ 今日忌：${record.ji}`, 170, curY + 108);

    // 底部印记
    ctx.textAlign = 'center';
    ctx.fillStyle = '#D97706';
    ctx.font = '600 22px monospace';
    ctx.fillText(`祈愿方向：${record.catName}  |  心诚则灵 · 逢凶化吉`, 540, 1480);

    const a = document.createElement('a');
    a.download = `东方赛博灵签_${record.no}_${record.title}.png`;
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

  function wrapText(ctx, text, x, y, maxWidth, lineHeight) {
    const chars = String(text).split('');
    let line = '';
    let curY = y;
    for (let n = 0; n < chars.length; n++) {
      const testLine = line + chars[n];
      if (ctx.measureText(testLine).width > maxWidth && n > 0) {
        ctx.fillText(line, x, curY);
        line = chars[n];
        curY += lineHeight;
      } else {
        line = testLine;
      }
    }
    ctx.fillText(line, x, curY);
    return curY + lineHeight;
  }

  let isInitialized = false;

  function init() {
    if (isInitialized) return;
    isInitialized = true;

    renderCylinderSvg();

    // 绑定四大求签分类
    document.querySelectorAll('.lq-cat-card').forEach(card => {
      card.onclick = () => {
        if (isShaking) return;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        curCategory = card.dataset.cat;
        document.querySelectorAll('.lq-cat-card').forEach(c => c.classList.toggle('active', c === card));
      };
    });

    // 绑定摇签按钮与点击签筒
    const btnShake = document.getElementById('lqBtnShake');
    if (btnShake) btnShake.onclick = startShake;

    const cylWrap = document.getElementById('lqCylinderWrap');
    if (cylWrap) cylWrap.onclick = startShake;

    // 绑定结果页按钮
    const btnAgain = document.getElementById('lqBtnAgain');
    if (btnAgain) {
      btnAgain.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        showScreen('sc-lq-home');
      };
    }

    const btnSave = document.getElementById('lqBtnSave');
    if (btnSave) {
      btnSave.onclick = () => {
        if (window.SFX && window.SFX.save) window.SFX.save();
        drawLingqianPoster(lastStickRecord);
      };
    }

    // 绑定东西方玄学互跳开关
    document.querySelectorAll('[data-ew-jump]').forEach(btn => {
      btn.onclick = () => {
        const targetMod = btn.dataset.ewJump;
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (window.AppRouter && typeof window.AppRouter.switchModule === 'function') {
          window.AppRouter.switchModule(targetMod, true);
        }
      };
    });
  }

  function restore(recordData) {
    init();
    if (!recordData) return;
    renderResult(recordData, true);
  }

  window.AppLingqian = {
    init,
    restore,
    startShake,
    drawLingqianPoster
  };
})();
