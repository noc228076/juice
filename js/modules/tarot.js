/* =========================================================
   模块 5：命运塔罗 (Cyber Tarot Module)
   22 张大阿卡那纯 SVG 拟真 3D 翻牌占卜
   ========================================================= */

(function () {
  'use strict';

  const G = { stroke: "#b08a2e", w: 3.4 };
  const svg = (inner) => `<svg viewBox="0 0 120 120" fill="none" stroke="${G.stroke}" stroke-width="${G.w}" stroke-linecap="round" stroke-linejoin="round">${inner}</svg>`;
  const S = {
    0: `<circle cx="60" cy="50" r="20"/><g><path d="M60 14 V26 M60 74 V86 M26 50 H38 M82 50 H94 M36 26 L44.5 34.5 M75.5 65.5 L84 74 M84 26 L75.5 34.5 M44.5 65.5 L36 74"/></g><path d="M78 86 q6 -2 5 -8 q4 5 0 8 q-2 2 -5 0"/>`,
    1: `<path d="M48 60 m -15 0 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0"/><path d="M60 16 V40"/><path d="M30 96 H90"/>`,
    2: `<path d="M82 34 A 26 26 0 1 0 82 86 A 19 19 0 1 1 82 34 Z"/><path d="M28 22 V98 M92 22 V98 M24 22 H96 M24 98 H96"/>`,
    3: `<circle cx="60" cy="48" r="18"/><path d="M60 66 V94 M48 86 H72"/>`,
    4: `<path d="M40 84 L33 48 L48 58 L60 36 L72 58 L87 48 L80 84 Z"/><path d="M32 94 H88"/>`,
    5: `<path d="M38 90 C 38 56 50 40 60 36"/><circle cx="66" cy="30" r="7"/><path d="M82 90 C 82 56 70 40 60 36"/><circle cx="54" cy="30" r="7"/>`,
    6: `<circle cx="42" cy="52" r="16"/><circle cx="78" cy="52" r="16"/><path d="M60 96 C 50 84 40 80 40 68 A 10 10 0 0 1 60 62 A 10 10 0 0 1 80 68 C 80 80 70 84 60 96 Z"/>`,
    7: `<circle cx="60" cy="72" r="15"/><path d="M60 57 V87 M45 72 H75 M49.4 61.4 L70.6 82.6 M70.6 61.4 L49.4 82.6"/><path d="M30 36 Q 60 14 90 36"/><path d="M38 36 V50 M82 36 V50"/>`,
    8: `<circle cx="60" cy="66" r="19"/><circle cx="60" cy="66" r="27" stroke-dasharray="5 6"/><circle cx="52" cy="62" r="3"/><circle cx="68" cy="62" r="3"/><path d="M54 72 Q 60 76 66 72"/><path d="M44 30 m -9 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0"/>`,
    9: `<path d="M60 30 L 76 44 L 76 62 L 60 76 L 44 62 L 44 44 Z"/><circle cx="60" cy="53" r="8"/><path d="M84 80 L 95 96"/><path d="M60 76 V 86"/>`,
    10: `<circle cx="60" cy="60" r="26"/><path d="M60 34 V86 M34 60 H86 M41.6 41.6 L78.4 78.4 M78.4 41.6 L41.6 78.4"/><circle cx="60" cy="28" r="4" fill="#b08a2e" stroke="none"/><circle cx="60" cy="92" r="4" fill="#b08a2e" stroke="none"/><circle cx="28" cy="60" r="4" fill="#b08a2e" stroke="none"/><circle cx="92" cy="60" r="4" fill="#b08a2e" stroke="none"/>`,
    11: `<path d="M60 34 V 88"/><path d="M60 30 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0"/><path d="M38 58 H 82"/><path d="M46 58 L46 64 M74 58 L74 64"/><path d="M28 64 Q 38 74 48 64 M72 64 Q 82 74 92 64"/>`,
    12: `<path d="M60 86 L 36 40 L 84 40 Z"/><path d="M30 52 H 90"/><path d="M54 40 V 24 M66 40 V 24"/>`,
    13: `<circle cx="60" cy="54" r="18"/><circle cx="52" cy="52" r="4"/><circle cx="68" cy="52" r="4"/><path d="M56 60 L 60 66 L 64 60"/><path d="M50 70 Q 60 76 70 70"/>`,
    14: `<path d="M46 36 H 74 L 70 58 H 50 Z"/><path d="M60 58 V 78 M50 78 H 70"/><path d="M60 42 L 67 52 H 53 Z"/>`,
    15: `<path d="M60 30 L 85 66 L 35 66 Z"/><path d="M46 38 L 74 56 L 60 92 L 46 38"/><path d="M46 38 L 60 92 L 74 56"/>`,
    16: `<path d="M52 24 H 68 V 58 H 52 Z"/><path d="M48 24 V 15 H 56 V 24 M64 24 V 15 H 72 V 24"/><path d="M56 58 V 70 Q 60 76 64 70 V 58"/><path d="M72 34 L 58 50 L 66 50 L 54 66"/>`,
    17: `<path d="M60 32 L 88 58 L 60 84 L 32 58 Z"/><path d="M44 44 L 76 44 L 76 76 L 44 76 Z"/>`,
    18: `<path d="M86 34 A 27 27 0 1 0 86 86 A 21 21 0 1 1 86 34 Z"/><circle cx="38" cy="46" r="3.5"/><circle cx="30" cy="66" r="3.5"/><circle cx="40" cy="84" r="3.5"/><path d="M24 100 Q 44 92 62 100"/>`,
    19: `<circle cx="60" cy="58" r="18"/><circle cx="53" cy="54" r="2.5" fill="#b08a2e" stroke="none"/><circle cx="67" cy="54" r="2.5" fill="#b08a2e" stroke="none"/><path d="M53 66 Q 60 72 67 66"/><path d="M60 24 V 34 M60 82 V 92 M26 58 H 36 M84 58 H 94 M36 34 L 43 41 M77 75 L 84 82 M84 34 L 77 41 M43 75 L 36 82"/>`,
    20: `<path d="M88 30 L 70 60 H 90 Z"/><path d="M70 60 V 72"/><circle cx="42" cy="38" r="9"/><path d="M42 29 V 20 M36 33 L 28 30 M48 33 L 56 30"/>`,
    21: `<ellipse cx="60" cy="62" rx="34" ry="28"/><path d="M52 62 m -9 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0"/><circle cx="60" cy="28" r="3" fill="#b08a2e" stroke="none"/><circle cx="60" cy="96" r="3" fill="#b08a2e" stroke="none"/>`
  };
  const CARD_BACK = `<svg viewBox="0 0 160 240" fill="none" xmlns="http://www.w3.org/2000/svg" class="tr-cardback-svg">
  <defs>
    <radialGradient id="trBgGrad" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#352870"/>
      <stop offset="60%" stop-color="#1b143c"/>
      <stop offset="100%" stop-color="#0e0a24"/>
    </radialGradient>
    <linearGradient id="trGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff2c2"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#9a7420"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="156" height="236" rx="14" fill="url(#trBgGrad)" stroke="url(#trGoldGrad)" stroke-width="2.5"/>
  <rect x="8" y="8" width="144" height="224" rx="10" fill="none" stroke="url(#trGoldGrad)" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>
  <path d="M14 14 L24 14 M14 14 L14 24 M146 14 L136 14 M146 14 L146 24 M14 226 L24 226 M14 226 L14 216 M146 226 L136 226 M146 226 L146 216" stroke="url(#trGoldGrad)" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="80" cy="120" r="44" stroke="url(#trGoldGrad)" stroke-width="1.2" opacity="0.35"/>
  <circle cx="80" cy="120" r="32" stroke="url(#trGoldGrad)" stroke-width="1.8"/>
  <circle cx="80" cy="120" r="20" stroke="url(#trGoldGrad)" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>
  <path d="M80 94 L83 113 L102 110 L87 122 L98 138 L81 127 L70 142 L72 124 L56 117 L74 112 Z" fill="url(#trGoldGrad)"/>
  <circle cx="80" cy="120" r="5" fill="#fff9db"/>
  <path d="M80 54 L82 62 L90 64 L82 66 L80 74 L78 66 L70 64 L78 62 Z" fill="url(#trGoldGrad)"/>
  <path d="M80 166 L82 174 L90 176 L82 178 L80 186 L78 178 L70 176 L78 174 Z" fill="url(#trGoldGrad)"/>
  <circle cx="44" cy="120" r="3" fill="url(#trGoldGrad)"/>
  <circle cx="116" cy="120" r="3" fill="url(#trGoldGrad)"/>
  <text x="80" y="44" font-size="7.5" font-family="-apple-system,sans-serif" font-weight="900" letter-spacing="3" fill="url(#trGoldGrad)" text-anchor="middle" opacity="0.9">✦ ARCANUM ✦</text>
  <text x="80" y="206" font-size="7" font-family="-apple-system,sans-serif" font-weight="800" letter-spacing="2" fill="url(#trGoldGrad)" text-anchor="middle" opacity="0.8">ARCANA DESTINY</text>
</svg>`;
  const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
  const CARDS = [
    { no: 0, name: "愚者", en: "The Fool", image: "assets/tarot/card_0.jpg", astro: "🌌 天王星 · 风元素", pillar: "纯真与无限潜能", upKw: "新的开始 · 自由 · 冒险", up: "象征一段崭新的旅程与无限可能。放下顾虑，跟随内心，勇敢踏出第一步——但也要留意脚下的悬崖，给热情加上一点谨慎。", upAction: "宜尝试新事物、跳出固有思维框架，用归零心态开启新计划；保持好奇心的同时做好基础兜底。", revKw: "鲁莽 · 逃避 · 缺乏规划", rev: "提醒你三思而后行，避免冲动行事。或许你在逃避责任，或对风险视而不见，请先看清脚下的路。", revAction: "忌盲目跟风或一时兴起做重大决定；先补齐计划中的漏洞，核查细节后再行动。" },
    { no: 1, name: "魔术师", en: "The Magician", image: "assets/tarot/card_1.jpg", astro: "☿ 水星 · 风元素", pillar: "意志与显化法则", upKw: "创造力 · 行动力 · 资源整合", up: "你拥有实现目标所需的一切资源与才能。专注与信念将助你把想法变为现实，此刻正是施展的时刻。", upAction: "宜主动出击、整合手头人脉与工具，将停留在脑海的灵感立即落地为第一个可执行动作。", revKw: "欺骗 · 计划不周 · 才能被浪费", rev: "小心华而不实与自我怀疑。你可能未善用自身才能，或有人在误导你，回归本质，去伪存真。", revAction: "忌眼高手低或轻信花言巧语；先盘点自身真实筹码，集中精力攻克一个核心目标。" },
    { no: 2, name: "女祭司", en: "The High Priestess", image: "assets/tarot/card_2.jpg", astro: "🌙 月亮 · 水元素", pillar: "直觉与潜意识奥秘", upKw: "直觉 · 智慧 · 潜意识", up: "静心聆听内心的声音。答案藏在表象之下，信任你的直觉与内在智慧，不必急于向外寻求。", upAction: "宜静观其变、记录梦境与第一直觉，深入研读或独立思考，暂时不急于公开表态。", revKw: "忽视直觉 · 秘密 · 肤浅", rev: "你可能忽略了重要的内在信号，或被表象蒙蔽。给自己留出独处与反思的时间，答案自会浮现。", revAction: "忌被外界杂音带偏节奏或压抑真实感受；远离八卦漩涡，找回内心的平静锚点。" },
    { no: 3, name: "女皇", en: "The Empress", image: "assets/tarot/card_3.jpg", astro: "♀ 金星 · 土元素", pillar: "丰饶与感官滋养", upKw: "丰饶 · 滋养 · 创造力", up: "象征丰盛与爱的能量。关注自我关怀，让创造力自然生长，也用心滋养身边的人。", upAction: "宜享受美食与自然之美、推进艺术创作或改善生活品质，用温和包容的态度促成合作。", revKw: "依赖 · 停滞 · 自我忽视", rev: "你可能过度付出而忽略了自己，或创造力受阻。重新建立内在的平衡与安全感，先照顾好自己。", revAction: "忌讨好型透支或懒散拖延；把注意力收回自己身上，先满足自身情绪与休息需求。" },
    { no: 4, name: "皇帝", en: "The Emperor", image: "assets/tarot/card_4.jpg", astro: "♈ 白羊座 · 火元素", pillar: "秩序与世俗疆域", upKw: "权威 · 秩序 · 稳定", up: "建立结构与规则，以坚定而负责任的姿态掌控局面。纪律带来力量，稳扎稳打方能致远。", upAction: "宜制定明确时间表与边界规则，果断拍板决策，用结构化流程稳步推进手头事务。", revKw: "固执 · 控制欲 · 僵化", rev: "过度的控制或教条会让你失去弹性。学会放下执念，倾听他人的声音，刚柔并济。", revAction: "忌一言堂或死磕旧规矩；遇到阻力时适度下放权限，用灵活协商代替硬碰硬。" },
    { no: 5, name: "教皇", en: "The Hierophant", image: "assets/tarot/card_5.jpg", astro: "♉ 金牛座 · 土元素", pillar: "传承与精神契约", upKw: "传统 · 信仰 · 导师", up: "寻求可靠的知识与指引。遵循既定规范，或向值得信赖的长者请教，智慧在传承中发光。", upAction: "宜向行业前辈请教、考取专业认证或融入成熟团队，按经过验证的标准路径稳妥推进。", revKw: "教条 · 质疑 · 反叛", rev: "你开始质疑旧有的规则与权威。打破束缚、找到属于自己的信念，正是成长的开始。", revAction: "忌盲从权威或被陈旧观念捆绑；大胆尝试个性化解法，建立真正契合自己的价值标准。" },
    { no: 6, name: "恋人", en: "The Lovers", image: "assets/tarot/card_6.jpg", astro: "♊ 双子座 · 风元素", pillar: "共鸣与价值抉择", upKw: "爱 · 联结 · 选择", up: "象征深刻的联结与重要的抉择。听从内心，让爱与真诚指引方向，值得的选择不怕等待。", upAction: "宜坦诚沟通心意、寻找志同道合的伙伴，在面临分岔口时选择真正让你内心发热的方向。", revKw: "失衡 · 分离 · 犹豫", rev: "关系或选择中出现了裂痕。检视自己的价值观，别因恐惧而逃避沟通，坦诚是最好的桥梁。", revAction: "忌骑驴找马、三心二意或回避核心矛盾；理清自己最看重的底线，当断则断。" },
    { no: 7, name: "战车", en: "The Chariot", image: "assets/tarot/card_7.jpg", astro: "♋ 巨蟹座 · 水元素", pillar: "意志统御与远征", upKw: "意志 · 胜利 · 前进", up: "凭借坚定的意志与自律，你能够克服障碍、驶向胜利。方向已明，握紧缰绳向前。", upAction: "宜集中火力速战速决、主动迎战难关，驾驭好感性情绪与理性目标之间的平衡。", revKw: "失控 · 方向迷失 · 鲁莽", rev: "或许你被外物牵着走，或方向模糊。先稳住自己，再决定往哪里去，慢即是快。", revAction: "忌情绪化飙车或同时追逐相反的目标；先踩刹车校准方向盘，稳住心态再出发。" },
    { no: 8, name: "力量", en: "Strength", image: "assets/tarot/card_8.jpg", astro: "♌ 狮子座 · 火元素", pillar: "柔韧之心与内省驯服", upKw: "勇气 · 耐心 · 内在力量", up: "真正的力量来自温柔与坚韧。以耐心驯服内心的猛兽，而非强硬对抗——柔能克刚。", upAction: "宜以柔克刚、用同理心和持久耐力化解棘手矛盾，坚定而温和地守住自己的节奏。", revKw: "自我怀疑 · 软弱 · 压抑", rev: "你可能低估了自己，或情绪在暗中消耗你。温柔地接纳脆弱，力量会重新聚集。", revAction: "忌因一时受挫而否定自我价值，或靠发脾气掩饰不安；接纳当下的疲惫，给内心充能。" },
    { no: 9, name: "隐士", en: "The Hermit", image: "assets/tarot/card_9.jpg", astro: "♍ 处女座 · 土元素", pillar: "孤灯内省与澄明之境", upKw: "内省 · 独处 · 寻求智慧", up: "退一步，进入安静。独处不是孤独，而是为自己点亮一盏灯，看清真正重要的东西。", upAction: "宜暂时关闭无效社交、深度复盘过往得失，在安静独处中提炼出下一阶段的核心洞察。", revKw: "孤立 · 逃避 · 过度封闭", rev: "独处变成了隔绝。适时走出自己的洞穴，向值得信任的人伸出手。", revAction: "忌钻牛角尖或用冷漠推开关心你的人；出门透透气，与信任的朋友聊一聊真实想法。" },
    { no: 10, name: "命运之轮", en: "Wheel of Fortune", image: "assets/tarot/card_10.jpg", astro: "♃ 木星 · 火元素", pillar: "周期流转与天命契机", upKw: "转机 · 循环 · 好运", up: "命运的车轮正在转动，机遇随之而来。顺应变化，把握时机的节拍，顺势而为。", upAction: "宜敏锐捕捉突发的新机会、顺势调整计划，保持开放心态迎接意料之外的贵人与转折。", revKw: "停滞 · 厄运 · 抗拒变化", rev: "某些循环似乎卡住了。放下抗拒，变化的契机往往藏在转折之中。", revAction: "忌逆势强求或抱怨时运不济；低谷期宜收缩防守、积累筹码，静待下一轮周期上行。" },
    { no: 11, name: "正义", en: "Justice", image: "assets/tarot/card_11.jpg", astro: "♎ 天秤座 · 风元素", pillar: "因果天平与澄澈裁决", upKw: "公正 · 真相 · 因果", up: "一切自有其平衡。诚实面对事实，以公平之心做出决定，问心无愧便是最好的结果。", upAction: "宜客观权衡利弊、签署规范契约或理清账目权责，用数据与事实说话，不偏不倚。", revKw: "偏见 · 失衡 · 逃避责任", rev: "可能有失公允，或你在回避某个真相。检视自己的立场，重新校准天平。", revAction: "忌双标推诿、感情用事或逃避应尽的义务；正视失衡之处，主动做出补偿与修正。" },
    { no: 12, name: "倒吊人", en: "The Hanged Man", image: "assets/tarot/card_12.jpg", astro: "♆ 海王星 · 水元素", pillar: "逆向觉知与静默沉淀", upKw: "换位思考 · 牺牲 · 沉淀", up: "换个角度看世界，暂时的停顿是必要的修行。放下执念，收获意想不到的洞见。", upAction: "宜跳出惯性视角换位思考、甘于阶段性蛰伏充电，以退为进往往能看清全局盲点。", revKw: "无谓牺牲 · 拖延 · 僵持", rev: "停滞让你疲惫。审视自己是否在无谓地消耗，该放手时就放手。", revAction: "忌自我感动式的无底线妥协或消极拖延；停止内耗，把精力从无意义的僵局中抽离。" },
    { no: 13, name: "死神", en: "Death", image: "assets/tarot/card_13.jpg", astro: "♏ 天蝎座 · 水元素", pillar: "终结旧章与破茧重生", upKw: "结束 · 蜕变 · 新生", up: "一个阶段正在终结，为新生腾出空间。结束并非坏事，而是重生的开始，坦然告别。", upAction: "宜彻底清理过期的人事物与旧习惯，果断结束消耗你的旧阶段，为新机缘腾出空间。", revKw: "抗拒改变 · 停滞 · 恐惧", rev: "你紧抓着旧物不放，恐惧改变，却也让生命失去流动。允许告别，才能拥抱新的可能。", revAction: "忌对已经枯竭的关系或项目恋恋不舍；直面改变的阵痛，松开紧握的双手才能迎来转机。" },
    { no: 14, name: "节制", en: "Temperance", image: "assets/tarot/card_14.jpg", astro: "♐ 射手座 · 火元素", pillar: "炼金调和与中道流转", upKw: "平衡 · 调和 · 中庸", up: "以耐心与温和调和极端，细水长流。现在不宜急躁，宜稳步前行，静待花开。", upAction: "宜调和不同意见、平衡工作与生活节奏，通过循序渐进的微调实现身心与事务的融合。", revKw: "失衡 · 过度 · 急躁", rev: "生活失去平衡，或情绪过载。慢下来，找回自己的节奏与尺度，张弛有度。", revAction: "忌用力过猛、报复性熬夜或情绪走极端；给生活做减法，恢复规律作息与平和心态。" },
    { no: 15, name: "恶魔", en: "The Devil", image: "assets/tarot/card_15.jpg", astro: "♑ 摩羯座 · 土元素", pillar: "欲望凝视与枷锁觉察", upKw: "束缚 · 欲望 · 诱惑", up: "觉察那些无形的束缚——欲望、执念或依赖。看见它，便是挣脱的开始。", upAction: "宜直面内心真实的野心与执念，警惕短期诱惑与成瘾习惯，莫让物质或执念反客为主。", revKw: "挣脱 · 觉醒 · 重获自由", rev: "你正在挣脱枷锁，重拾主动权。阴影散去，力量回到你的手中。", revAction: "宜趁势戒除不良习惯、脱离有毒关系或不良契约，夺回生活的自主权与清爽感。" },
    { no: 16, name: "高塔", en: "The Tower", image: "assets/tarot/card_16.jpg", astro: "♂ 火星 · 火元素", pillar: "惊雷破妄与真相重塑", upKw: "剧变 · 真相 · 崩塌", up: "旧有的结构骤然瓦解，震撼却也真实。崩塌之处，正是重建的起点，直面真相。", upAction: "宜坦然接受突发变动、借机打破虚假泡沫，在废墟之上轻装上阵重建更稳固的根基。", revKw: "危机解除 · 延迟的变革", rev: "最坏的时刻或许已经过去。改变虽迟但到，别回避必要的调整。", revAction: "忌掩耳盗铃或勉强修补摇摇欲坠的隐患；主动进行温和改革，防患于未然。" },
    { no: 17, name: "星星", en: "The Star", image: "assets/tarot/card_17.jpg", astro: "♒ 水瓶座 · 风元素", pillar: "星河疗愈与澄澈希望", upKw: "希望 · 疗愈 · 灵感", up: "风暴过后，星光重现。怀抱希望，相信未来，你许下的愿望正在路上。", upAction: "宜敞开心扉表达真我、开启身心疗愈或投入长远理想，灵感与贵人正随星光向你靠近。", revKw: "失望 · 失去信心 · 迷茫", rev: "暂时的低谷让你怀疑方向。别忘了，星光一直都在，只是被云遮住了一时。", revAction: "忌自我设限或因短期落差而放弃理想；重温最初打动你的初心，从小确幸中找回信心。" },
    { no: 18, name: "月亮", en: "The Moon", image: "assets/tarot/card_18.jpg", astro: "♓ 双鱼座 · 水元素", pillar: "幽微潜影与迷雾穿行", upKw: "幻觉 · 不安 · 潜意识", up: "前路朦胧，情绪翻涌。此时不宜轻信表象，静待云雾散去，再做判断。", upAction: "宜多核实信息真伪、允许自己暂时慢下来观察，区分“真实的危机”与“脑补的焦虑”。", revKw: "真相浮现 · 疑虑消解", rev: "迷雾正在散去，看清真相的时刻临近。内心的不安将逐渐平复，请再耐心一点。", revAction: "宜顺着浮现的线索理清事实真相，卸下不必要的防备与猜忌，让理性重回主导。" },
    { no: 19, name: "太阳", en: "The Sun", image: "assets/tarot/card_19.jpg", astro: "☀️ 太阳 · 火元素", pillar: "光明盛放与纯粹喜悦", upKw: "成功 · 喜悦 · 生命力", up: "阳光普照，一切明朗而丰盛。这是充满活力与成就的时刻，尽情绽放你的光彩。", upAction: "宜大胆展示才华、公开推进核心项目或主动分享温暖，你的坦荡与自信将吸引一切好运。", revKw: "短暂阴云 · 乐观过度", rev: "热情稍减或计划延迟，但太阳从未消失。调整心态，光明就在云层之后。", revAction: "忌盲目乐观或因死要面子而硬撑；放平预期、耐心打磨细节，温暖的成果只会迟到不会缺席。" },
    { no: 20, name: "审判", en: "Judgement", image: "assets/tarot/card_20.jpg", astro: "♇ 冥王星 · 火元素", pillar: "灵魂号角与因果觉醒", upKw: "觉醒 · 复盘 · 新生", up: "往事被重新审视，你听见内心的召唤。宽恕与复盘之后，迎来崭新的篇章。", upAction: "宜做一次彻底的阶段总结与自我和解，回应内心真正渴望的使命，做出关键人生升级。", revKw: "自我怀疑 · 逃避回顾", rev: "你或许不愿面对过去。但唯有诚实回望，才能真正向前，和解从接纳开始。", revAction: "忌沉浸在过去的懊悔中苛责自己，或无视关键的改变信号；放下包袱，给自己一次翻篇的机会。" },
    { no: 21, name: "世界", en: "The World", image: "assets/tarot/card_21.jpg", astro: "♄ 土星 · 土元素", pillar: "宇宙圆满与高维跃迁", upKw: "圆满 · 完成 · 成就", up: "一个周期圆满落幕，你站在完整的此刻。庆祝所成，然后欣然开启新的篇章。", upAction: "宜做好项目收官与成果沉淀、犒劳一路走来的自己，并站在更高视野规划下一段版图。", revKw: "未竟之事 · 停滞收尾", rev: "还差最后一口气。别让细节与犹豫拖住圆满，完成它，才能抵达下一程。", revAction: "忌在临门一脚时松懈或敷衍了事；集中精力补齐最后一块拼图，有始有终方得圆满。" }
  ];

  let curSpread = "one"; // "one" | "three" | "triangle"
  let curDomain = "general";
  let curQuestion = "";
  let isQuickDraw = false;
  let dailyCardIdx = 19;
  let galleryIdx = 19;
  let deck = [];
  let picks = [];
  let revIdx = 0;
  let maxRevIdx = 0;
  let lastTarotResult = null;

  const DOMAIN_META = {
    general: {
      label: "🌟 综合指引",
      meditation: "闭目默念心中所求 3 秒，凭第一直觉开启牌阵"
    },
    career: {
      label: "💼 事业前程",
      meditation: "闭目默念你当下的事业或学业困惑 3 秒，凭第一直觉抽牌"
    },
    love: {
      label: "💕 情感姻缘",
      meditation: "闭目默念那段关系或心中的名字 3 秒，凭第一直觉抽牌"
    },
    wealth: {
      label: "💰 财富机缘",
      meditation: "闭目默念你关心的财运或消费抉择 3 秒，凭第一直觉抽牌"
    },
    choice: {
      label: "🧭 迷茫抉择",
      meditation: "闭目在脑海中浮现面前方向 3 秒，凭第一直觉开启牌阵"
    },
    shield: {
      label: "🛡️ 破局避坑",
      meditation: "闭目默念近期困扰你的卡点 3 秒，凭第一直觉寻找破局点"
    }
  };

  const SPREAD_CONFIG = {
    one: {
      count: 1,
      name: "单牌圣坛",
      shortName: "单牌日签",
      title: "单牌日签 · 灵性瞬像",
      lead: "一牌一问 · 直击当下核心症结与行动破局点",
      positions: ["今日指引"],
      meta: [
        { name: "今日指引", sub: "灵性共鸣焦点", label: "今日指引 · 灵性焦点", icon: "🌟", cls: "present" }
      ]
    },
    three: {
      count: 3,
      name: "三牌时间流",
      shortName: "时间之流",
      title: "过去 · 现在 · 未来 深度推演",
      lead: "过去奠定基石，现在直面抉择，未来指示走向",
      positions: ["过去", "现在", "未来"],
      meta: [
        { name: "过去", sub: "渊源与因果基石", label: "过去 · 渊源与因果", icon: "🕰️", cls: "past" },
        { name: "现在", sub: "当下能量与焦点", label: "现在 · 当下与焦点", icon: "⚡", cls: "present" },
        { name: "未来", sub: "趋势演化与启示", label: "未来 · 启示与走向", icon: "🔮", cls: "future" }
      ]
    },
    triangle: {
      count: 3,
      name: "圣三角破局阵",
      shortName: "圣三角阵",
      title: "核心现状 · 暗藏阻碍 · 破局建议",
      lead: "直面当下真实处境，洞察暗藏的盲区阻力，锁定最优破局良方",
      positions: ["现状", "阻碍", "建议"],
      meta: [
        { name: "现状", sub: "当下真实处境与核心状态", label: "现状 · 当下真实处境", icon: "👁️", cls: "past" },
        { name: "阻碍", sub: "核心盲区与潜在阻力", label: "阻碍 · 症结与盲区", icon: "⚡", cls: "present" },
        { name: "建议", sub: "破局良方与高维指引", label: "建议 · 破局关键良方", icon: "🗝️", cls: "future" }
      ]
    }
  };

  function getSpreadConfig(sp) {
    return SPREAD_CONFIG[sp || curSpread] || SPREAD_CONFIG.one;
  }

  function showScreen(id) {
    const root = document.getElementById('mod-tarot');
    if (!root) return;
    root.querySelectorAll('.tr-screen').forEach(s => s.classList.remove('active'));
    const target = root.querySelector('#' + id);
    if (target) {
      target.classList.add('active');
      root.scrollTop = 0;
    }
  }

  function shuffleDeck() {
    deck = [...CARDS].map(c => ({ ...c, isRev: Math.random() < 0.5 })).sort(() => Math.random() - 0.5);
  }

  function buildDeck() {
    const el = document.getElementById('trDeck');
    if (!el) return;
    el.innerHTML = "";
    deck.forEach((c, i) => {
      const d = document.createElement("div");
      d.className = "pcard";
      d.dataset.i = i;
      d.innerHTML = `<div class="back">${CARD_BACK}</div>`;
      el.appendChild(d);
    });
  }

  function startShuffle(done) {
    if (window.SFX && window.SFX.tarotShuffle) window.SFX.tarotShuffle();
    const note = document.getElementById('trShufNote');
    if (note) note.style.display = 'block';
    const cards = document.querySelectorAll('#trDeck .pcard');
    cards.forEach(c => c.classList.add('shuf'));
    setTimeout(() => {
      cards.forEach(c => c.classList.remove('shuf'));
      if (note) note.style.display = 'none';
      shuffleDeck();
      buildDeck();
      bindDeckEvents();
      if (done) done();
    }, 650);
  }

  function bindDeckEvents() {
    const max = getSpreadConfig().count;
    picks = [];
    updatePickState();
    document.querySelectorAll('#trDeck .pcard').forEach(c => {
      c.onclick = () => {
        const i = +c.dataset.i;
        if (max === 1) {
          // 单张模式：点击任意新牌直接即刻切换选中，无需先手动取消
          if (picks.includes(i)) {
            picks = [];
            c.classList.remove('picked');
          } else {
            document.querySelectorAll('#trDeck .pcard.picked').forEach(el => el.classList.remove('picked'));
            picks = [i];
            c.classList.add('picked');
            if (window.SFX && window.SFX.tap) window.SFX.tap();
          }
        } else {
          // 多张模式（三张）
          if (picks.includes(i)) {
            picks = picks.filter(x => x !== i);
            c.classList.remove('picked');
          } else {
            if (picks.length >= max) return;
            if (window.SFX && window.SFX.tap) window.SFX.tap();
            picks.push(i);
            c.classList.add('picked');
          }
        }
        updatePickState();
      };
    });
  }

  function updatePickState() {
    const cfg = getSpreadConfig();
    const max = cfg.count;
    const btn = document.getElementById('trBtnReveal');
    const hint = document.getElementById('trPickHint');
    if (btn) btn.disabled = picks.length !== max;
    if (hint) {
      hint.textContent = picks.length === max ?
        `已选好 ${picks.length} 张牌（${cfg.shortName}），请点击「解牌」` :
        `【${cfg.shortName}】请凭直觉选出 ${max} 张牌 (已选 ${picks.length}/${max})`;
    }
  }

  function startReveal() {
    const qInput = document.getElementById('trQuestionInput');
    curQuestion = qInput ? qInput.value.trim() : "";
    revIdx = 0;
    maxRevIdx = 0;
    showScreen('sc-tr-reveal');
    showCardInReveal();
  }

  let revealFlipTimer1 = null;
  let revealFlipTimer2 = null;

  function renderRevealStepper(cardData) {
    const stepperEl = document.getElementById('trRevealStepper');
    const subEl = document.getElementById('trRevealSub');
    if (!stepperEl) return;

    const cfg = getSpreadConfig();
    const dLabel = (DOMAIN_META[curDomain] && DOMAIN_META[curDomain].label) || '🌟 综合指引';
    const qSuffix = curQuestion ? ` · 求问：「${curQuestion}」` : '';

    if (cfg.count === 1) {
      if (subEl) subEl.textContent = `${dLabel} · ${cfg.shortName}${qSuffix}`;
      stepperEl.innerHTML = `
        <div class="tr-stepper-single">
          <span>✦ <b>${dLabel}</b></span>
          <span>|</span>
          <span>守护星象：<b>${cardData.astro || '群星共鸣'}</b></span>
          <span>|</span>
          <span>精神原型：<b>${cardData.pillar || '命运启示'}</b></span>
        </div>
      `;
    } else {
      if (subEl) subEl.textContent = `${dLabel} · ${cfg.name} · 正在揭示第 ${revIdx + 1} / ${cfg.count} 张启示之牌${qSuffix}`;
      stepperEl.innerHTML = `
        <div class="tr-stepper-track">
          ${cfg.meta.map((m, idx) => {
            const c = deck[picks[idx]];
            const isCurr = idx === revIdx;
            const isRevealed = idx <= maxRevIdx;
            const cls = isCurr ? 'active' : (isRevealed ? 'done' : '');
            const statusText = isRevealed && c
              ? `${ROMAN[c.no]} · ${c.name} (${c.isRev ? '逆位' : '正位'})`
              : '✦ 待翻牌揭示';
            return `
              <div class="tr-step-item ${cls}" data-step-idx="${idx}" title="${isRevealed ? '点击切换查看该牌位' : '请按序翻开上一张牌'}">
                <div class="tr-step-num">${idx + 1}</div>
                <div class="tr-step-meta">
                  <div class="tr-step-title">${m.icon} ${m.name} <small style="font-weight:500;opacity:0.75">· ${m.sub}</small></div>
                  <div class="tr-step-sub">${statusText}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      `;
      stepperEl.querySelectorAll('.tr-step-item').forEach(el => {
        el.onclick = () => {
          const targetIdx = +el.dataset.stepIdx;
          if (targetIdx <= maxRevIdx && targetIdx !== revIdx) {
            if (window.SFX && window.SFX.tap) window.SFX.tap();
            revIdx = targetIdx;
            showCardInReveal();
          }
        };
      });
    }
  }

  function showCardInReveal() {
    if (revealFlipTimer1) clearTimeout(revealFlipTimer1);
    if (revealFlipTimer2) clearTimeout(revealFlipTimer2);
    if (revIdx > maxRevIdx) maxRevIdx = revIdx;
    const cardData = deck[picks[revIdx]];
    if (!cardData) return;
    const cfg = getSpreadConfig();
    const pos = cfg.positions[revIdx] || cfg.positions[0];
    const posMeta = cfg.meta[revIdx] || cfg.meta[0] || { name: pos, sub: "命运节点", icon: "✦" };

    renderRevealStepper(cardData);

    const bigCard = document.getElementById('trBigCard');
    const fback = document.getElementById('trFback');
    const face = document.getElementById('trFace');
    const reading = document.getElementById('trReading');

    bigCard.classList.remove('flipped');
    reading.style.opacity = '0';

    fback.innerHTML = CARD_BACK;
    const svgCode = S[cardData.no] || `<circle cx="60" cy="60" r="30"/>`;
    face.innerHTML = `
      <div class="tr-face-container">
        <div class="tr-face-base">
          <div class="num">${ROMAN[cardData.no]}</div>
          <div class="emblem" style="${cardData.isRev ? 'transform:rotate(180deg);' : ''}">${svg(svgCode)}</div>
          <div class="nm">
            <b>${cardData.name}</b>
            <span>${cardData.en}</span>
          </div>
        </div>
        ${cardData.image ? `
          <div class="tr-face-art-wrap ${cardData.isRev ? 'is-rev' : ''}">
            <img src="${cardData.image}" alt="${cardData.name}" class="tr-face-art-img"
                 loading="eager" decoding="async"
                 onerror="this.style.display='none'">
          </div>
        ` : ''}
      </div>
    `;

    document.getElementById('rvPos').textContent = `${posMeta.icon} ${posMeta.name} · ${posMeta.sub}`;
    const badge = document.getElementById('rvBadge');
    badge.className = `badge ${cardData.isRev ? 'rev' : 'up'}`;
    badge.textContent = cardData.isRev ? '逆位 · 内省与转化' : '正位 · 能量充盈显现';

    const astroEl = document.getElementById('rvAstro');
    if (astroEl) astroEl.textContent = cardData.astro || '✦ 大阿卡那星轨';

    const romanEl = document.getElementById('rvRoman');
    if (romanEl) romanEl.textContent = ROMAN[cardData.no];

    document.getElementById('rvName').textContent = cardData.name;

    const enEl = document.getElementById('rvEn');
    if (enEl) enEl.textContent = cardData.en;

    const pillarEl = document.getElementById('rvPillar');
    if (pillarEl) pillarEl.textContent = `✦ ${cardData.pillar || '命运启示'}`;

    const rawKw = cardData.isRev ? cardData.revKw : cardData.upKw;
    const kwContainer = document.getElementById('rvKw');
    if (kwContainer) {
      const kwParts = rawKw.split('·').map(s => s.trim()).filter(Boolean);
      kwContainer.innerHTML = kwParts.map(k => `<span class="tr-kw-pill">✦ ${k}</span>`).join('');
    }

    document.getElementById('rvTxt').textContent = cardData.isRev ? cardData.rev : cardData.up;

    const actionPanel = document.getElementById('rvActionPanel');
    const actionTitle = document.getElementById('rvActionTitle');
    const actionTxt = document.getElementById('rvAction');
    if (actionPanel) {
      actionPanel.className = `tr-rv-panel action ${cardData.isRev ? 'is-rev' : ''}`;
    }
    if (actionTitle) {
      actionTitle.innerHTML = `
        <span>${cardData.isRev ? '🧭 破局与调整箴言 · 忌盲目内耗' : '🧭 当下行动箴言 · 宜顺势而为'}</span>
        <span style="font-weight:600;opacity:0.75;font-size:11px">ACTION GUIDANCE</span>
      `;
    }
    if (actionTxt) {
      actionTxt.textContent = cardData.isRev
        ? (cardData.revAction || cardData.rev)
        : (cardData.upAction || cardData.up);
    }

    const metaFooter = document.getElementById('rvMetaFooter');
    if (metaFooter) {
      metaFooter.innerHTML = `
        <span>🔮 阿卡那序列：<b>No.${cardData.no} (${ROMAN[cardData.no]})</b></span>
        <span>✨ 守护对应：<b>${cardData.astro || '大阿卡那'}</b></span>
        <span>⚡ 牌面状态：<b>${cardData.isRev ? '逆位 (需向内觉察)' : '正位 (能量顺畅流动)'}</b></span>
      `;
    }

    const prevBtn = document.getElementById('trRvPrev');
    const nextBtn = document.getElementById('trRvNext');
    if (cfg.count === 1) {
      prevBtn.style.display = 'inline-flex';
      prevBtn.textContent = '🔄 再抽一张';
      nextBtn.textContent = '✦ 查看完整报告 / 保存签文 ✦';
    } else {
      prevBtn.style.display = revIdx > 0 ? 'inline-flex' : 'none';
      prevBtn.textContent = '← 上一张牌';
      if (revIdx === picks.length - 1) {
        nextBtn.textContent = `✦ 查看${cfg.shortName}全景报告 ✦`;
      } else {
        const nextPosName = cfg.positions[revIdx + 1] || '下一张';
        nextBtn.textContent = `下一张牌 · 揭示「${nextPosName}」 (${revIdx + 2}/${picks.length}) →`;
      }
    }

    // 翻转动效
    revealFlipTimer1 = setTimeout(() => {
      if (window.SFX && window.SFX.tarotFlip) window.SFX.tarotFlip();
      bigCard.classList.add('flipped');
      revealFlipTimer2 = setTimeout(() => {
        reading.style.opacity = '1';
        if (window.SFX && window.SFX.tarotReveal) window.SFX.tarotReveal();
      }, 400);
    }, 250);
  }

  function finish(restoredData) {
    const isRestored = !!(restoredData && Array.isArray(restoredData.items) && restoredData.items.length > 0);
    if (!isRestored && window.SFX && window.SFX.tarotDone) window.SFX.tarotDone();
    if (restoredData && restoredData.spread) {
      curSpread = restoredData.spread;
    }
    showScreen('sc-tr-result');

    const cfg = getSpreadConfig(curSpread);
    const posList = cfg.positions;
    const items = isRestored
      ? restoredData.items
      : picks.map((pIdx, i) => {
          const c = deck[pIdx];
          return {
            pos: posList[i] || posList[0],
            card: c,
            kw: c.isRev ? c.revKw : c.upKw,
            txt: c.isRev ? c.rev : c.up
          };
        });
    if (!items || !items.length) return;

    const dLabel = (restoredData && restoredData.domainLabel) || ((DOMAIN_META[curDomain] && DOMAIN_META[curDomain].label) || '🌟 综合指引');
    const qText = (restoredData && restoredData.question !== undefined) ? restoredData.question : curQuestion;

    const summaryBox = document.getElementById('trSummaryBox');
    const resultList = document.getElementById('trResultList');

    if (cfg.count === 1 || items.length === 1) {
      const item = items[0];
      const c = item.card;
      const svgCode = S[c.no] || `<circle cx="60" cy="60" r="30"/>`;

      if (summaryBox) {
        summaryBox.innerHTML = `
          <div class="tr-summary-header">
            <span class="tr-summary-pill">✦ ${dLabel} · ${cfg.name}</span>
            <h3>【${c.name}】· ${c.isRev ? '<span style="color:#f87171">逆位</span>' : '<span style="color:#34d399">正位</span>'}</h3>
            <p class="tr-summary-lead">${qText ? `求问：「${qText}」 ｜ ` : ''}${item.kw}</p>
          </div>
        `;
      }

      if (resultList) {
        resultList.className = 'result-list is-single';
        resultList.innerHTML = `
          <div class="tr-single-hero">
            <div class="tr-card-frame ${c.isRev ? 'is-rev' : ''} ${c.image ? 'has-art' : ''}">
              <div class="tr-card-inner">
                <div class="tr-card-corner tl">✦</div>
                <div class="tr-card-corner tr">✦</div>
                <div class="tr-card-corner bl">✦</div>
                <div class="tr-card-corner br">✦</div>
                <div class="tr-card-head">
                  <span class="tr-card-num">${ROMAN[c.no]}</span>
                  <span class="tr-card-state-tag ${c.isRev ? 'rev' : 'up'}">${c.isRev ? '逆 位' : '正 位'}</span>
                </div>
                <div class="tr-card-art">
                  ${svg(svgCode)}
                </div>
                <div class="tr-card-foot">
                  <div class="tr-card-name">${c.name}</div>
                  <div class="tr-card-en">${c.en}</div>
                </div>
              </div>
              ${c.image ? `
                <div class="tr-card-painting-wrap ${c.isRev ? 'is-rev' : ''}">
                  <img src="${c.image}" alt="${c.name}" class="tr-card-painting-img"
                       loading="eager" decoding="async"
                       onerror="this.style.display='none'">
                </div>
              ` : ''}
            </div>

            <div class="tr-single-info">
              <div class="tr-info-badge-row" style="flex-wrap:wrap">
                <span class="tr-tag-pos">${item.pos}</span>
                <span class="tr-tag-status ${c.isRev ? 'rev' : 'up'}">${c.isRev ? '逆位 · 阻滞与向内探索' : '正位 · 顺畅与能量显现'}</span>
                ${c.astro ? `<span class="tr-rv-astro-pill">${c.astro}</span>` : ''}
              </div>
              <h2 class="tr-info-title">${ROMAN[c.no]} · ${c.name} <small>(${c.en})</small></h2>
              <div class="tr-info-kw">
                <span class="tr-kw-label">🔑 核心指引：</span>
                <strong>${item.kw}</strong>
              </div>
              <div class="tr-info-desc">
                <div class="tr-desc-title">📜 牌意启示解读</div>
                <p>${item.txt}</p>
              </div>
              ${(c.upAction || c.revAction) ? `
              <div class="tr-info-desc" style="border-left:3.5px solid ${c.isRev ? '#d97706' : '#10b981'}">
                <div class="tr-desc-title" style="color:${c.isRev ? '#d97706' : '#10b981'}">${c.isRev ? '🧭 破局与调整箴言' : '🧭 当下行动箴言'}</div>
                <p>${c.isRev ? (c.revAction || item.txt) : (c.upAction || item.txt)}</p>
              </div>
              ` : ''}
              <div class="tr-info-quote">
                <span class="quote-mark">“</span>
                <span class="quote-text">顺应内心的真实感召，走好当下的每一步。答案一直在你心中。</span>
                <span class="quote-mark">”</span>
              </div>
            </div>
          </div>
        `;
      }
    } else {
      if (summaryBox) {
        summaryBox.innerHTML = `
          <div class="tr-summary-header">
            <span class="tr-summary-pill">✦ ${dLabel} · ${cfg.name}</span>
            <h3>${cfg.title}</h3>
            <p class="tr-summary-lead">${qText ? `求问：「${qText}」 ｜ ` : ''}${cfg.lead}</p>
          </div>
        `;
      }

      if (resultList) {
        resultList.className = 'result-list is-three';
        let h = '';

        items.forEach((it, idx) => {
          const c = it.card;
          const meta = cfg.meta[idx] || { label: it.pos, icon: '✦', cls: 'past' };
          const svgCode = S[c.no] || `<circle cx="60" cy="60" r="30"/>`;
          const actTxt = c.isRev ? c.revAction : c.upAction;
          h += `
            <div class="tr-trio-card ${meta.cls}">
              <div class="tr-trio-header">
                <span class="tr-time-tag">${meta.icon} ${meta.label}</span>
              </div>
              
              <div class="tr-card-frame sm ${c.isRev ? 'is-rev' : ''} ${c.image ? 'has-art' : ''}">
                <div class="tr-card-inner">
                  <div class="tr-card-head">
                    <span class="tr-card-num">${ROMAN[c.no]}</span>
                    <span class="tr-card-state-tag ${c.isRev ? 'rev' : 'up'}">${c.isRev ? '逆位' : '正位'}</span>
                  </div>
                  <div class="tr-card-art">
                    ${svg(svgCode)}
                  </div>
                  <div class="tr-card-foot">
                    <div class="tr-card-name">${c.name}</div>
                    <div class="tr-card-en">${c.en}</div>
                  </div>
                </div>
                ${c.image ? `
                  <div class="tr-card-painting-wrap ${c.isRev ? 'is-rev' : ''}">
                    <img src="${c.image}" alt="${c.name}" class="tr-card-painting-img"
                         loading="eager" decoding="async"
                         onerror="this.style.display='none'">
                  </div>
                ` : ''}
              </div>

              <div class="tr-trio-body">
                <div class="tr-trio-title-row">
                  <span class="tr-tag-status ${c.isRev ? 'rev' : 'up'}">${c.isRev ? '逆位' : '正位'}</span>
                  <h4>${ROMAN[c.no]} · ${c.name}</h4>
                </div>
                <div class="tr-trio-kw">${it.kw}</div>
                <div class="tr-trio-desc">${it.txt}</div>
                ${actTxt ? `<div class="tr-trio-desc" style="margin-top:4px;padding-top:8px;border-top:1px dashed var(--line);font-size:12.5px;"><strong style="color:var(--tr-gold)">🧭 箴言：</strong>${actTxt}</div>` : ''}
              </div>
            </div>
          `;
        });
        resultList.innerHTML = h;
      }
    }

    lastTarotResult = { spread: curSpread, domain: curDomain, domainLabel: dLabel, question: qText, items };

    // 保存至全所综合档案库（回看历史时不重复入库）
    if (!isRestored && window.UniversalHistory) {
      const mainCard = items[0].card;
      window.UniversalHistory.add({
        module: 'tarot',
        title: `命运塔罗 · ${mainCard.name} (${mainCard.isRev ? '逆位' : '正位'})`,
        subtitle: `${dLabel} · ${cfg.shortName} · ${items[0].kw}`,
        color: '#e8c96a',
        badge: '🔮 塔罗',
        avatar: '🔮',
        data: lastTarotResult
      });
    }

    const btnAgain = document.getElementById('trBtnAgain');
    if (btnAgain) {
      btnAgain.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (isQuickDraw) {
          quickDraw();
        } else {
          startTest();
        }
      };
    }

    const btnSave = document.getElementById('trBtnSave');
    if (btnSave) {
      btnSave.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        drawTarotShareCard(lastTarotResult);
      };
    }
  }

  function startTest() {
    isQuickDraw = false;
    const qInput = document.getElementById('trQuestionInput');
    curQuestion = qInput ? qInput.value.trim() : "";
    picks = [];
    shuffleDeck();
    buildDeck();
    updatePickState();
    showScreen('sc-tr-pick');
    startShuffle();
  }

  function quickDraw() {
    isQuickDraw = true;
    const qInput = document.getElementById('trQuestionInput');
    curQuestion = qInput ? qInput.value.trim() : "";
    shuffleDeck();
    buildDeck();
    bindDeckEvents();
    const max = getSpreadConfig().count;
    picks = [];
    for (let i = 0; i < max; i++) {
      picks.push(i);
    }
    startReveal();
  }

  function drawTarotShareCard(data) {
    if (!data || !data.items || !data.items.length) {
      alert('请先完成翻牌占卜后再保存结果');
      return;
    }

    const btnSave = document.getElementById('trBtnSave');
    const origText = btnSave ? btnSave.textContent : '📜 保存占卜签';
    if (btnSave) {
      btnSave.textContent = '⏳ 正在生成高清画报...';
      btnSave.disabled = true;
    }

    // 安全加载图片：使用 fetch 转换为本地 Blob URL，彻底杜绝 Canvas Tainted 跨域污染
    const loadImgSafe = (url) => {
      return new Promise((resolve) => {
        if (!url) return resolve(null);
        fetch(url)
          .then(res => {
            if (!res.ok) throw new Error('Fetch status ' + res.status);
            return res.blob();
          })
          .then(blob => {
            const blobUrl = URL.createObjectURL(blob);
            const img = new Image();
            img.onload = () => resolve({ img, blobUrl });
            img.onerror = () => {
              URL.revokeObjectURL(blobUrl);
              resolve(null);
            };
            img.src = blobUrl;
          })
          .catch(() => {
            // fetch 失败时回退到普通 Image 对象加载
            const img = new Image();
            img.onload = () => resolve({ img, blobUrl: null });
            img.onerror = () => resolve(null);
            img.src = url;
          });
      });
    };

    const imagePromises = data.items.map(it => loadImgSafe(it.card.image));

    Promise.all(imagePromises)
      .then(loadedList => {
        const images = loadedList.map(item => item ? item.img : null);
        const blobUrls = loadedList.map(item => item ? item.blobUrl : null).filter(Boolean);
        try {
          renderSharePoster(data, images);
        } catch (err) {
          console.warn('Poster export with images threw error, fallback to vector poster:', err);
          renderSharePoster(data, data.items.map(() => null));
        } finally {
          blobUrls.forEach(u => URL.revokeObjectURL(u));
        }
      })
      .catch(err => {
        console.error('Share card image loading error:', err);
        try {
          renderSharePoster(data, data.items.map(() => null));
        } catch (e) {
          console.error('Fallback render also failed:', e);
          alert('生成画报失败，请稍后重试');
        }
      })
      .finally(() => {
        if (btnSave) {
          btnSave.textContent = origText;
          btnSave.disabled = false;
        }
      });
  }

  function renderSharePoster(data, images) {
    const isSingle = data.spread === 'one' || data.items.length === 1;
    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = isSingle ? 1760 : 1920;
    const ctx = cv.getContext('2d');

    // 1. 底色渐变与星空微光
    const bgGrad = ctx.createLinearGradient(0, 0, 0, cv.height);
    bgGrad.addColorStop(0, '#0a0818');
    bgGrad.addColorStop(0.3, '#140f2e');
    bgGrad.addColorStop(0.65, '#1b143a');
    bgGrad.addColorStop(1, '#0c0919');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, cv.width, cv.height);

    // 星尘微粒
    ctx.fillStyle = 'rgba(232, 201, 106, 0.45)';
    const stars = [
      [120, 150, 2], [240, 90, 1.5], [890, 140, 2], [960, 220, 1.5],
      [100, 480, 1.5], [980, 520, 2], [140, 900, 2], [950, 950, 1.5],
      [110, 1300, 1.5], [960, 1400, 2], [180, cv.height - 80, 2], [880, cv.height - 110, 1.5]
    ];
    stars.forEach(([sx, sy, sr]) => {
      ctx.beginPath();
      ctx.arc(sx, sy, sr, 0, Math.PI * 2);
      ctx.fill();
    });

    // 2. 双重烫金外框与四角星芒
    ctx.strokeStyle = 'rgba(232, 201, 106, 0.25)';
    ctx.lineWidth = 1.5;
    roundRect(ctx, 40, 40, cv.width - 80, cv.height - 80, 32);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(232, 201, 106, 0.65)';
    ctx.lineWidth = 3;
    roundRect(ctx, 52, 52, cv.width - 104, cv.height - 104, 26);
    ctx.stroke();

    ctx.fillStyle = '#e8c96a';
    ctx.font = '20px serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✦', 76, 76);
    ctx.fillText('✦', cv.width - 76, 76);
    ctx.fillText('✦', 76, cv.height - 76);
    ctx.fillText('✦', cv.width - 76, cv.height - 76);

    // 3. 顶部 Header
    ctx.textAlign = 'center';
    ctx.fillStyle = 'rgba(232, 201, 106, 0.16)';
    roundRect(ctx, 360, 90, 360, 44, 22);
    ctx.fill();
    ctx.strokeStyle = 'rgba(232, 201, 106, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();

    ctx.fillStyle = '#e8c96a';
    ctx.font = 'bold 18px sans-serif';
    ctx.fillText('✦ 阿卡那秘境 · 塔罗命运档案馆 ✦', 540, 112);

    ctx.fillStyle = '#f8df8c';
    ctx.font = 'bold 44px Georgia, "PingFang SC", serif';
    ctx.fillText('命 运 启 示 录', 540, 192);

    ctx.fillStyle = '#c9c0ee';
    ctx.font = '20px sans-serif';
    ctx.fillText('大阿卡那 · 二十二张启示之牌', 540, 236);

    ctx.strokeStyle = 'rgba(232, 201, 106, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(280, 260);
    ctx.lineTo(800, 260);
    ctx.stroke();
    ctx.fillStyle = '#e8c96a';
    ctx.font = '14px serif';
    ctx.fillText('◆', 540, 260);

    const first = data.items[0];

    if (isSingle) {
      // 单张牌布局 (核心立绘突出呈现)
      const img = images[0];
      const cardX = 330;
      const cardY = 290;
      const cardW = 420;
      const cardH = 630;
      const cardR = 20;

      // 投影与光晕
      ctx.save();
      ctx.shadowColor = 'rgba(232, 201, 106, 0.4)';
      ctx.shadowBlur = 36;
      ctx.fillStyle = '#181238';
      roundRect(ctx, cardX - 8, cardY - 8, cardW + 16, cardH + 16, cardR + 4);
      ctx.fill();
      ctx.restore();

      // 卡牌金边框
      ctx.strokeStyle = '#d4af37';
      ctx.lineWidth = 4;
      roundRect(ctx, cardX - 4, cardY - 4, cardW + 8, cardH + 8, cardR + 2);
      ctx.stroke();

      if (img) {
        ctx.save();
        roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
        ctx.clip();
        if (first.card.isRev) {
          ctx.translate(cardX + cardW / 2, cardY + cardH / 2);
          ctx.rotate(Math.PI);
          ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);
        } else {
          ctx.drawImage(img, cardX, cardY, cardW, cardH);
        }
        ctx.restore();
      } else {
        // Fallback 绘制优雅潮玩卡面
        ctx.fillStyle = '#1e1445';
        roundRect(ctx, cardX, cardY, cardW, cardH, cardR);
        ctx.fill();
        ctx.fillStyle = 'rgba(232, 201, 106, 0.12)';
        roundRect(ctx, cardX + 24, cardY + 24, cardW - 48, cardH - 48, 16);
        ctx.fill();
        ctx.strokeStyle = 'rgba(232, 201, 106, 0.45)';
        ctx.stroke();
        ctx.fillStyle = '#fce494';
        ctx.font = 'bold 36px Georgia, serif';
        ctx.fillText(ROMAN[first.card.no], 540, cardY + 90);
        ctx.font = 'bold 36px sans-serif';
        ctx.fillText(first.card.name, 540, cardY + cardH / 2);
        ctx.font = '22px Georgia, serif';
        ctx.fillStyle = '#c4b5fd';
        ctx.fillText(first.card.en, 540, cardY + cardH / 2 + 50);
      }

      // 状态徽标 (正位/逆位)
      const badgeX = cardX + cardW - 124;
      const badgeY = cardY + 16;
      ctx.save();
      ctx.fillStyle = first.card.isRev ? 'rgba(239, 68, 68, 0.9)' : 'rgba(16, 185, 129, 0.9)';
      roundRect(ctx, badgeX, badgeY, 108, 38, 19);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(first.card.isRev ? '逆 位 · REV' : '正 位 · UP', badgeX + 54, badgeY + 20);
      ctx.restore();

      // 卡牌标题与关键词
      ctx.textAlign = 'center';
      ctx.fillStyle = '#fce494';
      ctx.font = 'bold 38px Georgia, "PingFang SC", serif';
      ctx.fillText(`${ROMAN[first.card.no]} · ${first.card.name} (${first.card.en})`, 540, 975);

      ctx.fillStyle = 'rgba(232, 201, 106, 0.12)';
      roundRect(ctx, 220, 1005, 640, 48, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 201, 106, 0.45)';
      ctx.lineWidth = 1;
      ctx.stroke();

      ctx.fillStyle = '#e8c96a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText(`🔑 核心指引：${first.kw}`, 540, 1030);

      // 解读内容框
      const descBoxY = 1085;
      const descBoxH = 430;
      ctx.fillStyle = 'rgba(26, 20, 54, 0.85)';
      roundRect(ctx, 110, descBoxY, 860, descBoxH, 24);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 201, 106, 0.35)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#e8c96a';
      ctx.font = 'bold 24px sans-serif';
      ctx.fillText('📜 牌意启示解读 (Divine Insight)', 150, descBoxY + 54);

      ctx.strokeStyle = 'rgba(232, 201, 106, 0.2)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(150, descBoxY + 74);
      ctx.lineTo(930, descBoxY + 74);
      ctx.stroke();

      ctx.fillStyle = '#ede7ff';
      ctx.font = '26px/1.8 "PingFang SC", "Microsoft YaHei", sans-serif';
      wrapText(ctx, first.txt, 150, descBoxY + 122, 780, 46);

      // 金句条
      const quoteY = descBoxY + 280;
      ctx.fillStyle = 'rgba(232, 201, 106, 0.08)';
      roundRect(ctx, 150, quoteY, 780, 110, 16);
      ctx.fill();
      ctx.strokeStyle = 'rgba(232, 201, 106, 0.25)';
      ctx.stroke();

      ctx.fillStyle = '#d4af37';
      ctx.font = 'bold 36px Georgia, serif';
      ctx.fillText('“', 170, quoteY + 45);

      ctx.fillStyle = '#d8cef6';
      ctx.font = 'italic 23px "PingFang SC", sans-serif';
      ctx.fillText('顺应内心的真实感召，走好当下的每一步。', 210, quoteY + 48);
      ctx.fillText('束缚你的从来不是深渊，而是不敢放下的执念。', 210, quoteY + 84);
    } else {
      // 三牌时间流布局
      const cardW = 260;
      const cardH = 390;
      const gap = 40;
      const startX = (cv.width - (cardW * 3 + gap * 2)) / 2;
      const cardY = 290;

      data.items.forEach((it, idx) => {
        const cx = startX + idx * (cardW + gap);
        const img = images[idx];

        // 卡牌阴影与边框
        ctx.save();
        ctx.shadowColor = 'rgba(232, 201, 106, 0.3)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#181238';
        roundRect(ctx, cx, cardY, cardW, cardH, 16);
        ctx.fill();
        ctx.restore();

        ctx.strokeStyle = '#d4af37';
        ctx.lineWidth = 3;
        roundRect(ctx, cx, cardY, cardW, cardH, 16);
        ctx.stroke();

        if (img) {
          ctx.save();
          roundRect(ctx, cx, cardY, cardW, cardH, 16);
          ctx.clip();
          if (it.card.isRev) {
            ctx.translate(cx + cardW / 2, cardY + cardH / 2);
            ctx.rotate(Math.PI);
            ctx.drawImage(img, -cardW / 2, -cardH / 2, cardW, cardH);
          } else {
            ctx.drawImage(img, cx, cardY, cardW, cardH);
          }
          ctx.restore();
        } else {
          ctx.fillStyle = '#1e1644';
          roundRect(ctx, cx, cardY, cardW, cardH, 16);
          ctx.fill();
          ctx.fillStyle = '#e8c96a';
          ctx.font = 'bold 28px Georgia, serif';
          ctx.textAlign = 'center';
          ctx.fillText(ROMAN[it.card.no], cx + cardW / 2, cardY + 60);
          ctx.font = '22px sans-serif';
          ctx.fillText(it.card.name, cx + cardW / 2, cardY + cardH / 2);
        }

        // 牌位与名称标签
        ctx.textAlign = 'center';
        ctx.fillStyle = '#fce494';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`【${it.pos}】${it.card.name} · ${it.card.isRev ? '逆位' : '正位'}`, cx + cardW / 2, cardY + cardH + 34);

        ctx.fillStyle = '#c9c0ee';
        ctx.font = '17px sans-serif';
        ctx.fillText(it.kw, cx + cardW / 2, cardY + cardH + 62);
      });

      // 三牌详细解读列表
      let descTop = 790;
      data.items.forEach(it => {
        ctx.fillStyle = 'rgba(26, 20, 54, 0.85)';
        roundRect(ctx, 110, descTop, 860, 250, 20);
        ctx.fill();
        ctx.strokeStyle = 'rgba(232, 201, 106, 0.35)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.textAlign = 'left';
        ctx.fillStyle = '#e8c96a';
        ctx.font = 'bold 25px sans-serif';
        ctx.fillText(`✦ ${it.pos} · ${it.card.name} (${it.card.isRev ? '逆位' : '正位'})`, 150, descTop + 48);

        ctx.fillStyle = '#ede7ff';
        ctx.font = '26px/1.7 "PingFang SC", sans-serif';
        wrapText(ctx, it.txt, 150, descTop + 96, 780, 46);

        descTop += 275;
      });
    }

    // 4. 底部 Footer
    ctx.textAlign = 'center';
    ctx.fillStyle = '#b3a9e0';
    ctx.font = '19px sans-serif';
    ctx.fillText('✦ 精神状态测试研究所 · 塔罗命运档案馆 ✦', 540, cv.height - 110);

    ctx.font = '16px sans-serif';
    ctx.fillStyle = '#9a91c6';
    ctx.fillText('探索潜意识的宇宙边界 · 长按保存图片', 540, cv.height - 76);

    let dataUrl = '';
    try {
      dataUrl = cv.toDataURL('image/png');
    } catch (exportErr) {
      console.warn('Canvas toDataURL failed:', exportErr);
      throw exportErr;
    }

    const filename = `命运塔罗_${first.card.name}.png`;

    // 1. 尝试触发自动下载（PC 端即时保存）
    try {
      const a = document.createElement('a');
      a.download = filename;
      a.href = dataUrl;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } catch (dlErr) {
      console.warn('Auto download triggered exception:', dlErr);
    }

    // 2. 弹出全屏高清画报预览弹窗（移动端长按保存，桌面端亦可二次下载）
    showPosterModal(dataUrl, filename);
  }

  function showPosterModal(dataUrl, filename) {
    let modal = document.getElementById('trPosterModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'trPosterModal';
      modal.className = 'tr-poster-modal';
      modal.innerHTML = `
        <div class="tr-poster-backdrop"></div>
        <div class="tr-poster-dialog">
          <button class="tr-poster-close" title="关闭">✕</button>
          <div class="tr-poster-scroll">
            <img class="tr-poster-img" src="" alt="塔罗命运画报">
          </div>
          <div class="tr-poster-actions">
            <p class="tr-poster-hint">📱 手机端长按上方图片可直接保存到相册</p>
            <button class="tr-poster-dl-btn">💾 保存 / 下载高清画报</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const closeBtn = modal.querySelector('.tr-poster-close');
      const backdrop = modal.querySelector('.tr-poster-backdrop');
      const close = () => {
        modal.style.display = 'none';
      };
      closeBtn.onclick = close;
      backdrop.onclick = close;
    }

    const img = modal.querySelector('.tr-poster-img');
    img.src = dataUrl;

    const dlBtn = modal.querySelector('.tr-poster-dl-btn');
    dlBtn.onclick = () => {
      try {
        const a = document.createElement('a');
        a.download = filename || '命运塔罗_命运画报.png';
        a.href = dataUrl;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      } catch (e) {
        console.error('Download click failed:', e);
      }
    };

    modal.style.display = 'flex';
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
  }

  function preloadTarotImages() {
    CARDS.forEach(c => {
      if (c.image) {
        const img = new Image();
        img.src = c.image;
      }
    });
  }

  function updateMeditationHint() {
    const medEl = document.getElementById('trMeditationText');
    const meta = DOMAIN_META[curDomain] || DOMAIN_META.general;
    if (medEl && meta.meditation) {
      medEl.textContent = meta.meditation;
    }
  }

  function initDailyAlmanacAndGallery() {
    const now = new Date();
    const y = now.getFullYear();
    const m = now.getMonth() + 1;
    const d = now.getDate();
    dailyCardIdx = (y * 372 + m * 31 + d * 7) % CARDS.length;
    const c = CARDS[dailyCardIdx] || CARDS[19];

    const dateTag = document.getElementById('trAlmanacDateTag');
    if (dateTag) {
      dateTag.textContent = `${y}.${String(m).padStart(2, '0')}.${String(d).padStart(2, '0')} · 星轨值日`;
    }

    const imgEl = document.getElementById('trShowcaseImg');
    const tagEl = document.getElementById('trShowcaseTag');
    const titleEl = document.getElementById('trShowcaseTitle');
    const astroEl = document.getElementById('trShowcaseAstro');
    const descEl = document.getElementById('trShowcaseDesc');
    const upHeadEl = document.getElementById('trDailyUpHead');
    const upTxtEl = document.getElementById('trDailyUpTxt');
    const revHeadEl = document.getElementById('trDailyRevHead');
    const revTxtEl = document.getElementById('trDailyRevTxt');

    if (imgEl && c.image) {
      imgEl.src = c.image;
      imgEl.alt = c.name;
    }
    if (tagEl) {
      tagEl.textContent = `🌟 今日值日阿卡那 · No.${c.no}`;
    }
    if (titleEl) {
      titleEl.innerHTML = `${ROMAN[c.no]} · ${c.name} <small>(${c.en})</small>`;
    }
    if (astroEl) {
      astroEl.textContent = `${c.astro || '✦ 大阿卡那'} ｜ ${c.pillar || '命运启示'}`;
    }
    if (descEl) {
      descEl.textContent = c.up;
    }
    if (upHeadEl) {
      upHeadEl.textContent = `🟢 今日顺势宜 · ${c.upKw}`;
    }
    if (upTxtEl) {
      upTxtEl.textContent = c.upAction || c.up;
    }
    if (revHeadEl) {
      revHeadEl.textContent = `🟠 今日觉察忌 · ${c.revKw}`;
    }
    if (revTxtEl) {
      revTxtEl.textContent = c.revAction || c.rev;
    }
  }

  function init() {
    preloadTarotImages();
    initDailyAlmanacAndGallery();
    updateMeditationHint();

    const domainGrid = document.getElementById('trDomainGrid');
    if (domainGrid) {
      domainGrid.querySelectorAll('.tr-domain-chip').forEach(chip => {
        chip.onclick = () => {
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          curDomain = chip.dataset.domain || 'general';
          domainGrid.querySelectorAll('.tr-domain-chip').forEach(c => c.classList.remove('active'));
          chip.classList.add('active');
          updateMeditationHint();
        };
      });
    }

    const spreadGrid = document.getElementById('trSpreadGrid');
    if (spreadGrid) {
      const spreadCards = spreadGrid.querySelectorAll('.spread');
      spreadCards.forEach(spEl => {
        spEl.onclick = () => {
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          curSpread = spEl.dataset.spread || 'one';
          spreadCards.forEach(el => el.classList.remove('sel'));
          spEl.classList.add('sel');
        };
      });
    }

    const btnStart = document.getElementById('trBtnStart');
    if (btnStart) {
      btnStart.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startTest();
      };
    }

    const btnQuickDraw = document.getElementById('trBtnQuickDraw');
    if (btnQuickDraw) {
      btnQuickDraw.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        quickDraw();
      };
    }

    const btnShuffle = document.getElementById('trBtnShuffle');
    if (btnShuffle) {
      btnShuffle.onclick = () => {
        startShuffle();
      };
    }

    const btnReveal = document.getElementById('trBtnReveal');
    if (btnReveal) {
      btnReveal.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startReveal();
      };
    }

    const bigCard = document.getElementById('trBigCard');
    if (bigCard) {
      bigCard.onclick = () => {
        if (window.SFX && window.SFX.tarotFlip) window.SFX.tarotFlip();
        bigCard.classList.remove('flipped');
        setTimeout(() => {
          bigCard.classList.add('flipped');
        }, 260);
      };
    }

    const btnNext = document.getElementById('trRvNext');
    if (btnNext) {
      btnNext.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (revIdx < picks.length - 1) {
          revIdx++;
          showCardInReveal();
        } else {
          finish();
        }
      };
    }

    const btnPrev = document.getElementById('trRvPrev');
    if (btnPrev) {
      btnPrev.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (curSpread === 'one') {
          if (isQuickDraw) {
            quickDraw();
          } else {
            startTest();
          }
        } else if (revIdx > 0) {
          revIdx--;
          showCardInReveal();
        }
      };
    }

    const btnHome = document.getElementById('trBtnHome');
    if (btnHome) {
      btnHome.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        showScreen('sc-tr-home');
      };
    }

    const btnBackPick = document.getElementById('trBtnBackPick');
    if (btnBackPick) {
      btnBackPick.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        showScreen('sc-tr-home');
      };
    }

    const btnBackReveal = document.getElementById('trBtnBackReveal');
    if (btnBackReveal) {
      btnBackReveal.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (revealFlipTimer1) clearTimeout(revealFlipTimer1);
        if (revealFlipTimer2) clearTimeout(revealFlipTimer2);
        showScreen('sc-tr-home');
      };
    }

    const btnBackResult = document.getElementById('trBtnBackResult');
    if (btnBackResult) {
      btnBackResult.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        showScreen('sc-tr-home');
      };
    }

    const btnSave = document.getElementById('trBtnSave');
    if (btnSave) {
      btnSave.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        drawTarotShareCard(lastTarotResult);
      };
    }

    const btnAgain = document.getElementById('trBtnAgain');
    if (btnAgain) {
      btnAgain.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (isQuickDraw) {
          quickDraw();
        } else {
          startTest();
        }
      };
    }
  }

  function restore(data) {
    if (!data || !data.items) return;
    lastTarotResult = data;
    curSpread = data.spread || (data.items.length > 1 ? 'three' : 'one');
    finish(data);
    showScreen('sc-tr-result');
  }

  window.AppTarot = {
    init,
    startTest,
    showScreen,
    finish,
    restore,
    drawTarotShareCard
  };
})();
