(function(){"use strict";const ae={stroke:"#b08a2e",w:3.4},ie=t=>`<svg viewBox="0 0 120 120" fill="none" stroke="${ae.stroke}" stroke-width="${ae.w}" stroke-linecap="round" stroke-linejoin="round">${t}</svg>`,J={0:'<circle cx="60" cy="50" r="20"/><g><path d="M60 14 V26 M60 74 V86 M26 50 H38 M82 50 H94 M36 26 L44.5 34.5 M75.5 65.5 L84 74 M84 26 L75.5 34.5 M44.5 65.5 L36 74"/></g><path d="M78 86 q6 -2 5 -8 q4 5 0 8 q-2 2 -5 0"/>',1:'<path d="M48 60 m -15 0 a 15 15 0 1 0 30 0 a 15 15 0 1 0 -30 0"/><path d="M60 16 V40"/><path d="M30 96 H90"/>',2:'<path d="M82 34 A 26 26 0 1 0 82 86 A 19 19 0 1 1 82 34 Z"/><path d="M28 22 V98 M92 22 V98 M24 22 H96 M24 98 H96"/>',3:'<circle cx="60" cy="48" r="18"/><path d="M60 66 V94 M48 86 H72"/>',4:'<path d="M40 84 L33 48 L48 58 L60 36 L72 58 L87 48 L80 84 Z"/><path d="M32 94 H88"/>',5:'<path d="M38 90 C 38 56 50 40 60 36"/><circle cx="66" cy="30" r="7"/><path d="M82 90 C 82 56 70 40 60 36"/><circle cx="54" cy="30" r="7"/>',6:'<circle cx="42" cy="52" r="16"/><circle cx="78" cy="52" r="16"/><path d="M60 96 C 50 84 40 80 40 68 A 10 10 0 0 1 60 62 A 10 10 0 0 1 80 68 C 80 80 70 84 60 96 Z"/>',7:'<circle cx="60" cy="72" r="15"/><path d="M60 57 V87 M45 72 H75 M49.4 61.4 L70.6 82.6 M70.6 61.4 L49.4 82.6"/><path d="M30 36 Q 60 14 90 36"/><path d="M38 36 V50 M82 36 V50"/>',8:'<circle cx="60" cy="66" r="19"/><circle cx="60" cy="66" r="27" stroke-dasharray="5 6"/><circle cx="52" cy="62" r="3"/><circle cx="68" cy="62" r="3"/><path d="M54 72 Q 60 76 66 72"/><path d="M44 30 m -9 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0"/>',9:'<path d="M60 30 L 76 44 L 76 62 L 60 76 L 44 62 L 44 44 Z"/><circle cx="60" cy="53" r="8"/><path d="M84 80 L 95 96"/><path d="M60 76 V 86"/>',10:'<circle cx="60" cy="60" r="26"/><path d="M60 34 V86 M34 60 H86 M41.6 41.6 L78.4 78.4 M78.4 41.6 L41.6 78.4"/><circle cx="60" cy="28" r="4" fill="#b08a2e" stroke="none"/><circle cx="60" cy="92" r="4" fill="#b08a2e" stroke="none"/><circle cx="28" cy="60" r="4" fill="#b08a2e" stroke="none"/><circle cx="92" cy="60" r="4" fill="#b08a2e" stroke="none"/>',11:'<path d="M60 34 V 88"/><path d="M60 30 m -5 0 a 5 5 0 1 0 10 0 a 5 5 0 1 0 -10 0"/><path d="M38 58 H 82"/><path d="M46 58 L46 64 M74 58 L74 64"/><path d="M28 64 Q 38 74 48 64 M72 64 Q 82 74 92 64"/>',12:'<path d="M60 86 L 36 40 L 84 40 Z"/><path d="M30 52 H 90"/><path d="M54 40 V 24 M66 40 V 24"/>',13:'<circle cx="60" cy="54" r="18"/><circle cx="52" cy="52" r="4"/><circle cx="68" cy="52" r="4"/><path d="M56 60 L 60 66 L 64 60"/><path d="M50 70 Q 60 76 70 70"/>',14:'<path d="M46 36 H 74 L 70 58 H 50 Z"/><path d="M60 58 V 78 M50 78 H 70"/><path d="M60 42 L 67 52 H 53 Z"/>',15:'<path d="M60 30 L 85 66 L 35 66 Z"/><path d="M46 38 L 74 56 L 60 92 L 46 38"/><path d="M46 38 L 60 92 L 74 56"/>',16:'<path d="M52 24 H 68 V 58 H 52 Z"/><path d="M48 24 V 15 H 56 V 24 M64 24 V 15 H 72 V 24"/><path d="M56 58 V 70 Q 60 76 64 70 V 58"/><path d="M72 34 L 58 50 L 66 50 L 54 66"/>',17:'<path d="M60 32 L 88 58 L 60 84 L 32 58 Z"/><path d="M44 44 L 76 44 L 76 76 L 44 76 Z"/>',18:'<path d="M86 34 A 27 27 0 1 0 86 86 A 21 21 0 1 1 86 34 Z"/><circle cx="38" cy="46" r="3.5"/><circle cx="30" cy="66" r="3.5"/><circle cx="40" cy="84" r="3.5"/><path d="M24 100 Q 44 92 62 100"/>',19:'<circle cx="60" cy="58" r="18"/><circle cx="53" cy="54" r="2.5" fill="#b08a2e" stroke="none"/><circle cx="67" cy="54" r="2.5" fill="#b08a2e" stroke="none"/><path d="M53 66 Q 60 72 67 66"/><path d="M60 24 V 34 M60 82 V 92 M26 58 H 36 M84 58 H 94 M36 34 L 43 41 M77 75 L 84 82 M84 34 L 77 41 M43 75 L 36 82"/>',20:'<path d="M88 30 L 70 60 H 90 Z"/><path d="M70 60 V 72"/><circle cx="42" cy="38" r="9"/><path d="M42 29 V 20 M36 33 L 28 30 M48 33 L 56 30"/>',21:'<ellipse cx="60" cy="62" rx="34" ry="28"/><path d="M52 62 m -9 0 a 9 9 0 1 0 18 0 a 9 9 0 1 0 -18 0"/><circle cx="60" cy="28" r="3" fill="#b08a2e" stroke="none"/><circle cx="60" cy="96" r="3" fill="#b08a2e" stroke="none"/>'};let oe=0;function W(){const t=++oe;return`<svg viewBox="0 0 160 240" fill="none" xmlns="http://www.w3.org/2000/svg" class="tr-cardback-svg">
  <defs>
    <radialGradient id="trBgGrad${t}" cx="50%" cy="50%" r="65%">
      <stop offset="0%" stop-color="#352870"/>
      <stop offset="60%" stop-color="#1b143c"/>
      <stop offset="100%" stop-color="#0e0a24"/>
    </radialGradient>
    <linearGradient id="trGoldGrad${t}" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#fff2c2"/>
      <stop offset="50%" stop-color="#d4af37"/>
      <stop offset="100%" stop-color="#9a7420"/>
    </linearGradient>
  </defs>
  <rect x="2" y="2" width="156" height="236" rx="14" fill="url(#trBgGrad${t})" stroke="url(#trGoldGrad${t})" stroke-width="2.5"/>
  <rect x="8" y="8" width="144" height="224" rx="10" fill="none" stroke="url(#trGoldGrad${t})" stroke-width="1" stroke-dasharray="3 3" opacity="0.6"/>
  <path d="M14 14 L24 14 M14 14 L14 24 M146 14 L136 14 M146 14 L146 24 M14 226 L24 226 M14 226 L14 216 M146 226 L136 226 M146 226 L146 216" stroke="url(#trGoldGrad${t})" stroke-width="1.8" stroke-linecap="round"/>
  <circle cx="80" cy="120" r="44" stroke="url(#trGoldGrad${t})" stroke-width="1.2" opacity="0.35"/>
  <circle cx="80" cy="120" r="32" stroke="url(#trGoldGrad${t})" stroke-width="1.8"/>
  <circle cx="80" cy="120" r="20" stroke="url(#trGoldGrad${t})" stroke-width="1" stroke-dasharray="4 3" opacity="0.7"/>
  <path d="M80 94 L83 113 L102 110 L87 122 L98 138 L81 127 L70 142 L72 124 L56 117 L74 112 Z" fill="url(#trGoldGrad${t})"/>
  <circle cx="80" cy="120" r="5" fill="#fff9db"/>
  <path d="M80 54 L82 62 L90 64 L82 66 L80 74 L78 66 L70 64 L78 62 Z" fill="url(#trGoldGrad${t})"/>
  <path d="M80 166 L82 174 L90 176 L82 178 L80 186 L78 178 L70 176 L78 174 Z" fill="url(#trGoldGrad${t})"/>
  <circle cx="44" cy="120" r="3" fill="url(#trGoldGrad${t})"/>
  <circle cx="116" cy="120" r="3" fill="url(#trGoldGrad${t})"/>
  <text x="80" y="44" font-size="7.5" font-family="-apple-system,sans-serif" font-weight="900" letter-spacing="3" fill="url(#trGoldGrad${t})" text-anchor="middle" opacity="0.9">✦ ARCANUM ✦</text>
  <text x="80" y="206" font-size="7" font-family="-apple-system,sans-serif" font-weight="800" letter-spacing="2" fill="url(#trGoldGrad${t})" text-anchor="middle" opacity="0.8">ARCANA DESTINY</text>
</svg>`}const B=["0","I","II","III","IV","V","VI","VII","VIII","IX","X","XI","XII","XIII","XIV","XV","XVI","XVII","XVIII","XIX","XX","XXI"],U=[{no:0,name:"愚者",en:"The Fool",image:"assets/tarot/card_0.webp",astro:"🌌 天王星 · 风元素",pillar:"纯真与无限潜能",upKw:"新的开始 · 自由 · 冒险",up:"象征一段崭新的旅程与无限可能。放下顾虑，跟随内心，勇敢踏出第一步——但也要留意脚下的悬崖，给热情加上一点谨慎。",upAction:"宜尝试新事物、跳出固有思维框架，用归零心态开启新计划；保持好奇心的同时做好基础兜底。",revKw:"鲁莽 · 逃避 · 缺乏规划",rev:"提醒你三思而后行，避免冲动行事。或许你在逃避责任，或对风险视而不见，请先看清脚下的路。",revAction:"忌盲目跟风或一时兴起做重大决定；先补齐计划中的漏洞，核查细节后再行动。"},{no:1,name:"魔术师",en:"The Magician",image:"assets/tarot/card_1.webp",astro:"☿ 水星 · 风元素",pillar:"意志与显化法则",upKw:"创造力 · 行动力 · 资源整合",up:"你拥有实现目标所需的一切资源与才能。专注与信念将助你把想法变为现实，此刻正是施展的时刻。",upAction:"宜主动出击、整合手头人脉与工具，将停留在脑海的灵感立即落地为第一个可执行动作。",revKw:"欺骗 · 计划不周 · 才能被浪费",rev:"小心华而不实与自我怀疑。你可能未善用自身才能，或有人在误导你，回归本质，去伪存真。",revAction:"忌眼高手低或轻信花言巧语；先盘点自身真实筹码，集中精力攻克一个核心目标。"},{no:2,name:"女祭司",en:"The High Priestess",image:"assets/tarot/card_2.webp",astro:"🌙 月亮 · 水元素",pillar:"直觉与潜意识奥秘",upKw:"直觉 · 智慧 · 潜意识",up:"静心聆听内心的声音。答案藏在表象之下，信任你的直觉与内在智慧，不必急于向外寻求。",upAction:"宜静观其变、记录梦境与第一直觉，深入研读或独立思考，暂时不急于公开表态。",revKw:"忽视直觉 · 秘密 · 肤浅",rev:"你可能忽略了重要的内在信号，或被表象蒙蔽。给自己留出独处与反思的时间，答案自会浮现。",revAction:"忌被外界杂音带偏节奏或压抑真实感受；远离八卦漩涡，找回内心的平静锚点。"},{no:3,name:"女皇",en:"The Empress",image:"assets/tarot/card_3.webp",astro:"♀ 金星 · 土元素",pillar:"丰饶与感官滋养",upKw:"丰饶 · 滋养 · 创造力",up:"象征丰盛与爱的能量。关注自我关怀，让创造力自然生长，也用心滋养身边的人。",upAction:"宜享受美食与自然之美、推进艺术创作或改善生活品质，用温和包容的态度促成合作。",revKw:"依赖 · 停滞 · 自我忽视",rev:"你可能过度付出而忽略了自己，或创造力受阻。重新建立内在的平衡与安全感，先照顾好自己。",revAction:"忌讨好型透支或懒散拖延；把注意力收回自己身上，先满足自身情绪与休息需求。"},{no:4,name:"皇帝",en:"The Emperor",image:"assets/tarot/card_4.webp",astro:"♈ 白羊座 · 火元素",pillar:"秩序与世俗疆域",upKw:"权威 · 秩序 · 稳定",up:"建立结构与规则，以坚定而负责任的姿态掌控局面。纪律带来力量，稳扎稳打方能致远。",upAction:"宜制定明确时间表与边界规则，果断拍板决策，用结构化流程稳步推进手头事务。",revKw:"固执 · 控制欲 · 僵化",rev:"过度的控制或教条会让你失去弹性。学会放下执念，倾听他人的声音，刚柔并济。",revAction:"忌一言堂或死磕旧规矩；遇到阻力时适度下放权限，用灵活协商代替硬碰硬。"},{no:5,name:"教皇",en:"The Hierophant",image:"assets/tarot/card_5.webp",astro:"♉ 金牛座 · 土元素",pillar:"传承与精神契约",upKw:"传统 · 信仰 · 导师",up:"寻求可靠的知识与指引。遵循既定规范，或向值得信赖的长者请教，智慧在传承中发光。",upAction:"宜向行业前辈请教、考取专业认证或融入成熟团队，按经过验证的标准路径稳妥推进。",revKw:"教条 · 质疑 · 反叛",rev:"你开始质疑旧有的规则与权威。打破束缚、找到属于自己的信念，正是成长的开始。",revAction:"忌盲从权威或被陈旧观念捆绑；大胆尝试个性化解法，建立真正契合自己的价值标准。"},{no:6,name:"恋人",en:"The Lovers",image:"assets/tarot/card_6.webp",astro:"♊ 双子座 · 风元素",pillar:"共鸣与价值抉择",upKw:"爱 · 联结 · 选择",up:"象征深刻的联结与重要的抉择。听从内心，让爱与真诚指引方向，值得的选择不怕等待。",upAction:"宜坦诚沟通心意、寻找志同道合的伙伴，在面临分岔口时选择真正让你内心发热的方向。",revKw:"失衡 · 分离 · 犹豫",rev:"关系或选择中出现了裂痕。检视自己的价值观，别因恐惧而逃避沟通，坦诚是最好的桥梁。",revAction:"忌骑驴找马、三心二意或回避核心矛盾；理清自己最看重的底线，当断则断。"},{no:7,name:"战车",en:"The Chariot",image:"assets/tarot/card_7.webp",astro:"♋ 巨蟹座 · 水元素",pillar:"意志统御与远征",upKw:"意志 · 胜利 · 前进",up:"凭借坚定的意志与自律，你能够克服障碍、驶向胜利。方向已明，握紧缰绳向前。",upAction:"宜集中火力速战速决、主动迎战难关，驾驭好感性情绪与理性目标之间的平衡。",revKw:"失控 · 方向迷失 · 鲁莽",rev:"或许你被外物牵着走，或方向模糊。先稳住自己，再决定往哪里去，慢即是快。",revAction:"忌情绪化飙车或同时追逐相反的目标；先踩刹车校准方向盘，稳住心态再出发。"},{no:8,name:"力量",en:"Strength",image:"assets/tarot/card_8.webp",astro:"♌ 狮子座 · 火元素",pillar:"柔韧之心与内省驯服",upKw:"勇气 · 耐心 · 内在力量",up:"真正的力量来自温柔与坚韧。以耐心驯服内心的猛兽，而非强硬对抗——柔能克刚。",upAction:"宜以柔克刚、用同理心和持久耐力化解棘手矛盾，坚定而温和地守住自己的节奏。",revKw:"自我怀疑 · 软弱 · 压抑",rev:"你可能低估了自己，或情绪在暗中消耗你。温柔地接纳脆弱，力量会重新聚集。",revAction:"忌因一时受挫而否定自我价值，或靠发脾气掩饰不安；接纳当下的疲惫，给内心充能。"},{no:9,name:"隐士",en:"The Hermit",image:"assets/tarot/card_9.webp",astro:"♍ 处女座 · 土元素",pillar:"孤灯内省与澄明之境",upKw:"内省 · 独处 · 寻求智慧",up:"退一步，进入安静。独处不是孤独，而是为自己点亮一盏灯，看清真正重要的东西。",upAction:"宜暂时关闭无效社交、深度复盘过往得失，在安静独处中提炼出下一阶段的核心洞察。",revKw:"孤立 · 逃避 · 过度封闭",rev:"独处变成了隔绝。适时走出自己的洞穴，向值得信任的人伸出手。",revAction:"忌钻牛角尖或用冷漠推开关心你的人；出门透透气，与信任的朋友聊一聊真实想法。"},{no:10,name:"命运之轮",en:"Wheel of Fortune",image:"assets/tarot/card_10.webp",astro:"♃ 木星 · 火元素",pillar:"周期流转与天命契机",upKw:"转机 · 循环 · 好运",up:"命运的车轮正在转动，机遇随之而来。顺应变化，把握时机的节拍，顺势而为。",upAction:"宜敏锐捕捉突发的新机会、顺势调整计划，保持开放心态迎接意料之外的贵人与转折。",revKw:"停滞 · 厄运 · 抗拒变化",rev:"某些循环似乎卡住了。放下抗拒，变化的契机往往藏在转折之中。",revAction:"忌逆势强求或抱怨时运不济；低谷期宜收缩防守、积累筹码，静待下一轮周期上行。"},{no:11,name:"正义",en:"Justice",image:"assets/tarot/card_11.webp",astro:"♎ 天秤座 · 风元素",pillar:"因果天平与澄澈裁决",upKw:"公正 · 真相 · 因果",up:"一切自有其平衡。诚实面对事实，以公平之心做出决定，问心无愧便是最好的结果。",upAction:"宜客观权衡利弊、签署规范契约或理清账目权责，用数据与事实说话，不偏不倚。",revKw:"偏见 · 失衡 · 逃避责任",rev:"可能有失公允，或你在回避某个真相。检视自己的立场，重新校准天平。",revAction:"忌双标推诿、感情用事或逃避应尽的义务；正视失衡之处，主动做出补偿与修正。"},{no:12,name:"倒吊人",en:"The Hanged Man",image:"assets/tarot/card_12.webp",astro:"♆ 海王星 · 水元素",pillar:"逆向觉知与静默沉淀",upKw:"换位思考 · 牺牲 · 沉淀",up:"换个角度看世界，暂时的停顿是必要的修行。放下执念，收获意想不到的洞见。",upAction:"宜跳出惯性视角换位思考、甘于阶段性蛰伏充电，以退为进往往能看清全局盲点。",revKw:"无谓牺牲 · 拖延 · 僵持",rev:"停滞让你疲惫。审视自己是否在无谓地消耗，该放手时就放手。",revAction:"忌自我感动式的无底线妥协或消极拖延；停止内耗，把精力从无意义的僵局中抽离。"},{no:13,name:"死神",en:"Death",image:"assets/tarot/card_13.webp",astro:"♏ 天蝎座 · 水元素",pillar:"终结旧章与破茧重生",upKw:"结束 · 蜕变 · 新生",up:"一个阶段正在终结，为新生腾出空间。结束并非坏事，而是重生的开始，坦然告别。",upAction:"宜彻底清理过期的人事物与旧习惯，果断结束消耗你的旧阶段，为新机缘腾出空间。",revKw:"抗拒改变 · 停滞 · 恐惧",rev:"你紧抓着旧物不放，恐惧改变，却也让生命失去流动。允许告别，才能拥抱新的可能。",revAction:"忌对已经枯竭的关系或项目恋恋不舍；直面改变的阵痛，松开紧握的双手才能迎来转机。"},{no:14,name:"节制",en:"Temperance",image:"assets/tarot/card_14.webp",astro:"♐ 射手座 · 火元素",pillar:"炼金调和与中道流转",upKw:"平衡 · 调和 · 中庸",up:"以耐心与温和调和极端，细水长流。现在不宜急躁，宜稳步前行，静待花开。",upAction:"宜调和不同意见、平衡工作与生活节奏，通过循序渐进的微调实现身心与事务的融合。",revKw:"失衡 · 过度 · 急躁",rev:"生活失去平衡，或情绪过载。慢下来，找回自己的节奏与尺度，张弛有度。",revAction:"忌用力过猛、报复性熬夜或情绪走极端；给生活做减法，恢复规律作息与平和心态。"},{no:15,name:"恶魔",en:"The Devil",image:"assets/tarot/card_15.webp",astro:"♑ 摩羯座 · 土元素",pillar:"欲望凝视与枷锁觉察",upKw:"束缚 · 欲望 · 诱惑",up:"觉察那些无形的束缚——欲望、执念或依赖。看见它，便是挣脱的开始。",upAction:"宜直面内心真实的野心与执念，警惕短期诱惑与成瘾习惯，莫让物质或执念反客为主。",revKw:"挣脱 · 觉醒 · 重获自由",rev:"你正在挣脱枷锁，重拾主动权。阴影散去，力量回到你的手中。",revAction:"宜趁势戒除不良习惯、脱离有毒关系或不良契约，夺回生活的自主权与清爽感。"},{no:16,name:"高塔",en:"The Tower",image:"assets/tarot/card_16.webp",astro:"♂ 火星 · 火元素",pillar:"惊雷破妄与真相重塑",upKw:"剧变 · 真相 · 崩塌",up:"旧有的结构骤然瓦解，震撼却也真实。崩塌之处，正是重建的起点，直面真相。",upAction:"宜坦然接受突发变动、借机打破虚假泡沫，在废墟之上轻装上阵重建更稳固的根基。",revKw:"危机解除 · 延迟的变革",rev:"最坏的时刻或许已经过去。改变虽迟但到，别回避必要的调整。",revAction:"忌掩耳盗铃或勉强修补摇摇欲坠的隐患；主动进行温和改革，防患于未然。"},{no:17,name:"星星",en:"The Star",image:"assets/tarot/card_17.webp",astro:"♒ 水瓶座 · 风元素",pillar:"星河疗愈与澄澈希望",upKw:"希望 · 疗愈 · 灵感",up:"风暴过后，星光重现。怀抱希望，相信未来，你许下的愿望正在路上。",upAction:"宜敞开心扉表达真我、开启身心疗愈或投入长远理想，灵感与贵人正随星光向你靠近。",revKw:"失望 · 失去信心 · 迷茫",rev:"暂时的低谷让你怀疑方向。别忘了，星光一直都在，只是被云遮住了一时。",revAction:"忌自我设限或因短期落差而放弃理想；重温最初打动你的初心，从小确幸中找回信心。"},{no:18,name:"月亮",en:"The Moon",image:"assets/tarot/card_18.webp",astro:"♓ 双鱼座 · 水元素",pillar:"幽微潜影与迷雾穿行",upKw:"幻觉 · 不安 · 潜意识",up:"前路朦胧，情绪翻涌。此时不宜轻信表象，静待云雾散去，再做判断。",upAction:"宜多核实信息真伪、允许自己暂时慢下来观察，区分“真实的危机”与“脑补的焦虑”。",revKw:"真相浮现 · 疑虑消解",rev:"迷雾正在散去，看清真相的时刻临近。内心的不安将逐渐平复，请再耐心一点。",revAction:"宜顺着浮现的线索理清事实真相，卸下不必要的防备与猜忌，让理性重回主导。"},{no:19,name:"太阳",en:"The Sun",image:"assets/tarot/card_19.webp",astro:"☀️ 太阳 · 火元素",pillar:"光明盛放与纯粹喜悦",upKw:"成功 · 喜悦 · 生命力",up:"阳光普照，一切明朗而丰盛。这是充满活力与成就的时刻，尽情绽放你的光彩。",upAction:"宜大胆展示才华、公开推进核心项目或主动分享温暖，你的坦荡与自信将吸引一切好运。",revKw:"短暂阴云 · 乐观过度",rev:"热情稍减或计划延迟，但太阳从未消失。调整心态，光明就在云层之后。",revAction:"忌盲目乐观或因死要面子而硬撑；放平预期、耐心打磨细节，温暖的成果只会迟到不会缺席。"},{no:20,name:"审判",en:"Judgement",image:"assets/tarot/card_20.webp",astro:"♇ 冥王星 · 火元素",pillar:"灵魂号角与因果觉醒",upKw:"觉醒 · 复盘 · 新生",up:"往事被重新审视，你听见内心的召唤。宽恕与复盘之后，迎来崭新的篇章。",upAction:"宜做一次彻底的阶段总结与自我和解，回应内心真正渴望的使命，做出关键人生升级。",revKw:"自我怀疑 · 逃避回顾",rev:"你或许不愿面对过去。但唯有诚实回望，才能真正向前，和解从接纳开始。",revAction:"忌沉浸在过去的懊悔中苛责自己，或无视关键的改变信号；放下包袱，给自己一次翻篇的机会。"},{no:21,name:"世界",en:"The World",image:"assets/tarot/card_21.webp",astro:"♄ 土星 · 土元素",pillar:"宇宙圆满与高维跃迁",upKw:"圆满 · 完成 · 成就",up:"一个周期圆满落幕，你站在完整的此刻。庆祝所成，然后欣然开启新的篇章。",upAction:"宜做好项目收官与成果沉淀、犒劳一路走来的自己，并站在更高视野规划下一段版图。",revKw:"未竟之事 · 停滞收尾",rev:"还差最后一口气。别让细节与犹豫拖住圆满，完成它，才能抵达下一程。",revAction:"忌在临门一脚时松懈或敷衍了事；集中精力补齐最后一块拼图，有始有终方得圆满。"}];let K="one",G="general",Q="",P=!1,ce=19,fe=19,_=[],T=[],s=0,u=0,i=null,S=null;const w={general:{label:"🌟 综合指引",meditation:"闭目默念心中所求 3 秒，凭第一直觉开启牌阵"},career:{label:"💼 事业前程",meditation:"闭目默念你当下的事业或学业困惑 3 秒，凭第一直觉抽牌"},love:{label:"💕 情感姻缘",meditation:"闭目默念那段关系或心中的名字 3 秒，凭第一直觉抽牌"},wealth:{label:"💰 财富机缘",meditation:"闭目默念你关心的财运或消费抉择 3 秒，凭第一直觉抽牌"},choice:{label:"🧭 迷茫抉择",meditation:"闭目在脑海中浮现面前方向 3 秒，凭第一直觉开启牌阵"},shield:{label:"🛡️ 破局避坑",meditation:"闭目默念近期困扰你的卡点 3 秒，凭第一直觉寻找破局点"}},b={one:{count:1,name:"单牌圣坛",shortName:"单牌日签",title:"单牌日签 · 灵性瞬像",lead:"一牌一问 · 直击当下核心症结与行动破局点",positions:["今日指引"],meta:[{name:"今日指引",sub:"灵性共鸣焦点",label:"今日指引 · 灵性焦点",icon:"🌟",cls:"present"}]},three:{count:3,name:"三牌时间流",shortName:"时间之流",title:"过去 · 现在 · 未来 深度推演",lead:"过去奠定基石，现在直面抉择，未来指示走向",positions:["过去","现在","未来"],meta:[{name:"过去",sub:"渊源与因果基石",label:"过去 · 渊源与因果",icon:"🕰️",cls:"past"},{name:"现在",sub:"当下能量与焦点",label:"现在 · 当下与焦点",icon:"⚡",cls:"present"},{name:"未来",sub:"趋势演化与启示",label:"未来 · 启示与走向",icon:"🔮",cls:"future"}]},triangle:{count:3,name:"圣三角破局阵",shortName:"圣三角阵",title:"核心现状 · 暗藏阻碍 · 破局建议",lead:"直面当下真实处境，洞察暗藏的盲区阻力，锁定最优破局良方",positions:["现状","阻碍","建议"],meta:[{name:"现状",sub:"当下真实处境与核心状态",label:"现状 · 当下真实处境",icon:"👁️",cls:"past"},{name:"阻碍",sub:"核心盲区与潜在阻力",label:"阻碍 · 症结与盲区",icon:"⚡",cls:"present"},{name:"建议",sub:"破局良方与高维指引",label:"建议 · 破局关键良方",icon:"🗝️",cls:"future"}]}};function I(t){return b[t||K]||b.one}function M(t){return window.escHtml(t)}function D(t){const n=t||"";return n.includes("火")?{elem:"🔥 火元素 (烈焰显化 · 驱动力)",flow:"主行动力、意志觉醒与开创魄力。当下你内蕴强劲的破局驱动力，凡事宜抢占先机、主动求变，以热情带动全局。",balance:"顺应直觉与冲劲的同时，须防急躁冲动；调和少许水元素之沉静，以达从容持久。"}:n.includes("水")?{elem:"💧 水元素 (灵泉潜涌 · 感知力)",flow:"主潜意识感知、直觉灵感与情感共鸣。当前境遇深受心念与直觉牵引，宜静水深流，细致体会细微信号。",balance:"倾听内在梦境与灵性回响，忌陷入情绪反刍；借风元素之理性梳理思绪，化柔情为润物甘霖。"}:n.includes("风")?{elem:"🌪️ 风元素 (罡风明澈 · 决断力)",flow:"主理性推演、客观决断与信息流动。当前是理智拨开云雾的阶段，敏锐洞察与精准沟通将成为破局钥匙。",balance:"保持超然与逻辑推演，防过度思虑脑补；注入土元素之踏实落地，言出必行。"}:n.includes("土")?{elem:"🌿 土元素 (厚德沉潜 · 稳固力)",flow:"主现实根基、资源沉淀与长期回报。所谋之事讲求稳健推进与踏石留印，时间自会酝酿丰硕果实。",balance:"稳扎稳打、守住边界，忌固执守旧；适度引入火元素之灵动，激活生机与热情。"}:{elem:"✨ 灵性以太 (星轨谐振 · 归一力)",flow:"主高维指引与宏观命运契机。当下所处的时空节点具有强烈的因果回响与生命阶段转换意义。",balance:"守中致静，顺应自然节律流转，不偏不倚，万法归一。"}}function j(t,n,r){const a=n||"general",e=t.name,f=t.pillar||"命运启示",v={career:{up:`在事业与学业向度上，【${e}】正位象征着正向动能与突破契机。当前你所面临的工作或学业任务，正处于“${f}”的关键显化期。手头所执掌的业务或规划具有清晰的推进空间，宜主动争取关键项目、坦荡沟通需求并展现专业担当。若面临跨部门协作或汇报，以扎实的业务数据和清晰条理切入，能迅速赢得领导与同侪信任。`,rev:`在事业与学业向度上，【${e}】逆位提示当前可能存在沟通阻滞、执行方向偏轨或倦怠内耗。当前事务表面看似卡顿，实则是深层流程漏洞或权责不明的集中暴露。切莫因急于求成而强行硬顶，亦不可消极逃避。当下最明智的策略是收拢阵线，对近期方案与时间节点做一次系统复盘，理清轻重缓急，以静制动。`},love:{up:`在情感与人际亲密关系中，【${e}】正位预示着心意互通与真诚共鸣。无论是已有伴侣还是探寻新机缘，当前星轨均赋予你温暖和谐的情感磁场。彼此之间以真心相待、换位体谅，能消除过往微小的隔阂，催生更深层次的信任与归属感。单身者宜多参与志趣契合的线下交流，展现真实的自我风采。`,rev:`在情感与人际亲密关系中，【${e}】逆位映射出内心隐藏的疑虑、防备或沟通不同频。或许双方在某项具体诉求或观念上产生了温差，亦或你在潜意识中投射了过度的焦虑。此时切忌冷战较劲或翻旧账，请先安抚好自己的情绪内核，卸下防卫心理，在温和平和的氛围中坦诚表达真实感受。`},wealth:{up:`在财富与物质资源向度上，【${e}】正位呈现积极向上的增益势能。你的财务状况趋于稳健，过往在专业技能或资产配置上的耕耘开始展现回报潜力。若有关于提升主业收入、探索稳健副业或长线投资的构想，当前正是适时布局、精耕细作的窗口期，守正出奇，顺理成章。`,rev:`在财富与物质资源向度上，【${e}】逆位提示财务防御重于进攻。近期需警惕情绪化冲动开支、未经审慎尽调的跟风投资或隐藏账目漏洞。当前环境不宜承担过高杠杆或轻信高回报诱惑。建议收紧非必要支出，增加活期安全储备金，严守现金流安全底线。`},choice:{up:`在重大抉择与分岔路口前，【${e}】正位给予你明确的宇宙背书。你内心的真实愿景早已有了偏向，当前的犹豫不过是对未知的习惯性谨慎。牌面显示，那个更能激发你长期内在生命力、契合你核心价值观的选项，正是顺应天时的正确道路，勇敢倾听第一直觉，笃定启程。`,rev:`在重大抉择与分岔路口前，【${e}】逆位提示当前尚未到一锤定音的最佳时刻。你可能被外界过多的杂音、虚假繁荣或短期得失所裹挟，尚未看清不同选项背后的真实代价。此时盲目选边容易陷入被动，不妨先按下暂停键，再收集一轮核心事实，厘清自己的底线原则再做决断。`},shield:{up:`在防小人排雷与职场避坑向度上，【${e}】正位如明镜高悬，自带正气护体。你正直坦荡的作风与扎实的专业实力，是抵御一切非议与暗箱操作的最佳屏障。对于外界无关紧要的风言风语，只需淡然处之、公事公办，不授人以柄，宵小伎俩自会不攻自破。`,rev:`在防小人排雷与职场避坑向度上，【${e}】逆位提示周围环境中可能潜藏被动消耗、信息不对称或隐形推诿。凡事需格外留心交接痕迹、邮件存证与保密边界，切忌在公开场合参与站队或非议他人。遇事保持清醒距离，多用白纸黑字的证据说话，以保全自身身心能量。`},general:{up:`在当下的整体命运轨迹中，【${e}】正位象征着身心灵能量的通透与舒展。宇宙正在向你敞开顺流的大门，生活各个板块的节奏趋于协同。保持澄明豁达的心境，珍惜身边的每份善意与灵感，所行皆坦途，所愿皆所得。`,rev:`在当下的整体命运轨迹中，【${e}】逆位提醒你这是一段向内收摄、蓄积力量的潜修期。外部遇阻并不是命运的苛责，而是高维智慧在借由停顿提醒你修正偏差、关照内在。接纳当下的不完美，卸下紧绷的心弦，静待时机回暖。`}},c=v[a]||v.general;return r?c.rev:c.up}const V={0:{up:"一杖芒鞋信步行，白云深处见初心。莫道前途悬绝壑，踏破苍苔总是春。",rev:"步履虽轻莫踏空，临渊勒马识西东。沉潜三思方为智，收摄狂心返太冲。"},1:{up:"四象汇聚归掌心，乾坤运转自通灵。万般显化随心起，点石成金正此时。",rev:"巧计千般终有漏，弄巧反拙莫逞雄。返璞归真修实相，心平气和道自生。"},2:{up:"明镜止水照禅心，石室幽兰静夜深。莫向人间寻妙谛，灵台一点月沉沉。",rev:"浮云蔽月雾中游，妄念纷飞自作愁。屏息凝神观自在，拨开迷障见灵眸。"},3:{up:"春风化雨润无声，大地生辉物自成。心怀慈悲滋万物，福田自种自丰融。",rev:"甘霖过客反成伤，莫为虚花乱锦裳。爱己方能充实室，心源澄澈岁绵长。"},4:{up:"端居泰岳镇山川，号令分明定万全。刚毅严正明法度，立身端正如松磐。",rev:"金戈铁马莫强求，刚极易折水长流。虚怀若谷容天地，何必孤峰独枕愁。"},5:{up:"古刹钟声彻九垓，明师指路白云开。心宗有托明真理，智慧如泉汩汩来。",rev:"莫随陈俗锁灵台，敢向空门辟路开。破茧方知天地阔，莫将陈墨作金钗。"},6:{up:"琴瑟相逢自应弦，灵犀互照两相欢。两心相悦非偶合，同行大道意无边。",rev:"镜中花影费疑猜，莫向迷津乱去来。自守灵台明正道，不随浮浪枉徘徊。"},7:{up:"金戈铁马踏秋风，双骥并行势若虹。克定心猿归正觉，长驱破阵立奇功。",rev:"欲速难达缰自乱，强冲险隘折长轮。且收芒刺休盲动，校正归途再问津。"},8:{up:"慈心降伏百兽威，柔指轻抚狮子眉。无上神威非铁血，一团和气化春雷。",rev:"外强中干意彷徨，切莫狂躁损真阳。抱朴守拙培元气，静水深流蓄润芳。"},9:{up:"一灯长照雪山青，万籁无声独自行。不羡红尘千种色，心光自是贯长亭。",rev:"闭门却扫锁孤峰，过客休将冷眼同。试借清风推牖看，春山依旧百花红。"},10:{up:"天道循环自有期，顺应天机莫迟疑。乘风破浪当其势，水到渠成喜自知。",rev:"潮退江平莫怨时，收帆待发守初机。严冬过尽春将至，否极泰来自有时。"},11:{up:"权衡在手两无偏，明镜高悬照大千。心怀坦荡无私曲，因果森严自了然。",rev:"一念偏颇失中庸，利害纷纭障目浓。返观自省明因果，拨正天平复朗空。"},12:{up:"倒悬林下自悠然，换个乾坤别有天。舍却执迷参大觉，无为无相悟真诠。",rev:"徒劳挣扎困罗网，空耗韶华梦一场。莫作无端甘受难，抽身转念即朝阳。"},13:{up:"枯荣代谢自寻常，败叶飘零覆冷霜。断舍沉疴开胜境，凤凰涅槃自重生。",rev:"牵丝攀藤难自拔，抱残守缺痛难平。挥剑斩断痴缠锁，莫教旧梦误前程。"},14:{up:"双瓶水火两交融，玉液均调气象雄。淡泊从容达妙境，清风明月伴长空。",rev:"过激失均乱气机，急功近利事相违。中庸有道宜深悟，修得清虚意自归。"},15:{up:"明鉴悬丝见执求，贪嗔如铁锁心头。一朝看破虚花相，解缆孤舟万顷流。",rev:"打破樊笼出网罗，重整衣冠别旧魔。从此青天无阻碍，长风破浪泛沧波。"},16:{up:"惊雷震破假楼台，瓦解冰消扫劫灰。去尽繁华存铁骨，更从虚处筑新阶。",rev:"余震未消莫安眠，危墙之下慎周旋。早图革故明真理，休待风倾木自迁。"},17:{up:"夜尽天明宿雨收，甘泉自注润沧洲。心怀澄澈光明照，前路悠悠不必忧。",rev:"迷云蔽日暗星芒，休教悲观掩寸光。静守寒宵天将晓，晨曦一点正微茫。"},18:{up:"幽幽清影照寒溪，犬吠疏篱野径迷。莫逐空花随幻相，心安理得候晨曦。",rev:"残雾散尽月朦胧，渐觉清风出塞鸿。直下承当除幻障，朗然天地廓无踪。"},19:{up:"赫赫金乌耀太空，万家门巷尽和风。阳和布德无私照，得意扬鞭喜气浓。",rev:"烈日偶逢阴翳遮，暂韬光彩养芳华。莫嫌日暮云生处，明日重升满赤霞。"},20:{up:"金鸡报晓彻云天，宿业冰消悟本原。万法重光开胜纪，新生从此驻金莲。",rev:"号角催征耳未聪，畏前缩后意难同。放下沉疴当奋起，莫将良策付东风。"},21:{up:"功行圆满步瀛洲，四海升平任遨游。百尺竿头收一境，乾坤无界又重游。",rev:"十方将满欠一针，临门功退意沉吟。精勤莫懈收官处，始信功夫不负心。"}};function l(t,n){const r=V[t.no];return r?n?r.rev:r.up:n?"沉潜内观去执着，静待时移解万般。":"顺应内心的真实感召，走好当下的每一步。"}function d(t){const n=document.getElementById("mod-tarot");if(!n)return;n.querySelectorAll(".tr-screen").forEach(a=>a.classList.remove("active"));const r=n.querySelector("#"+t);r&&(r.classList.add("active"),n.scrollTop=0)}function o(){_=[...U].map(t=>({...t,isRev:Math.random()<.5}));for(let t=_.length-1;t>0;t--){const n=Math.floor(Math.random()*(t+1)),r=_[t];_[t]=_[n],_[n]=r}}function m(){const t=document.getElementById("trDeck");t&&(t.innerHTML="",_.forEach((n,r)=>{const a=document.createElement("div");a.className="pcard",a.dataset.i=r,a.innerHTML=`<div class="back">${W()}</div>`,t.appendChild(a)}))}function F(t){window.SFX&&window.SFX.tarotShuffle&&window.SFX.tarotShuffle();const n=document.getElementById("trShufNote");n&&(n.style.display="block");const r=document.querySelectorAll("#trDeck .pcard");r.forEach(a=>a.classList.add("shuf")),setTimeout(()=>{r.forEach(a=>a.classList.remove("shuf")),n&&(n.style.display="none"),o(),m(),A(),t&&t()},650)}function A(){const t=I().count;T=[],O(),document.querySelectorAll("#trDeck .pcard").forEach(n=>{n.onclick=()=>{const r=+n.dataset.i;if(t===1)T.includes(r)?(T=[],n.classList.remove("picked")):(document.querySelectorAll("#trDeck .pcard.picked").forEach(a=>a.classList.remove("picked")),T=[r],n.classList.add("picked"),window.SFX&&window.SFX.tap&&window.SFX.tap());else if(T.includes(r))T=T.filter(a=>a!==r),n.classList.remove("picked");else{if(T.length>=t)return;window.SFX&&window.SFX.tap&&window.SFX.tap(),T.push(r),n.classList.add("picked")}O()}})}function O(){const t=I(),n=t.count,r=document.getElementById("trBtnReveal"),a=document.getElementById("trPickHint");r&&(r.disabled=T.length!==n),a&&(a.textContent=T.length===n?`已选好 ${T.length} 张牌（${t.shortName}），请点击「解牌」`:`【${t.shortName}】请凭直觉选出 ${n} 张牌 (已选 ${T.length}/${n})`)}function Z(){const t=document.getElementById("trQuestionInput");Q=t?t.value.trim():"",s=0,u=0,d("sc-tr-reveal"),se()}let z=null,Y=null;function ye(t){const n=document.getElementById("trRevealStepper"),r=document.getElementById("trRevealSub");if(!n)return;const a=I(),e=w[G]&&w[G].label||"🌟 综合指引",f=Q?` · 求问：「${Q}」`:"";a.count===1?(r&&(r.textContent=`${e} · ${a.shortName}${f}`),n.style.display="none",n.innerHTML=""):(n.style.display="",r&&(r.textContent=`${e} · ${a.name} · 正在揭示第 ${s+1} / ${a.count} 张启示之牌${f}`),n.innerHTML=`
        <div class="tr-stepper-track">
          ${a.meta.map((v,c)=>{const h=_[T[c]],X=c===s,$=c<=u,L=X?"active":$?"done":"",x=$&&h?`${B[h.no]} · ${h.name} (${h.isRev?"逆位":"正位"})`:"✦ 待翻牌揭示";return`
              <div class="tr-step-item ${L}" data-step-idx="${c}" title="${$?"点击切换查看该牌位":"请按序翻开上一张牌"}">
                <div class="tr-step-num">${c+1}</div>
                <div class="tr-step-meta">
                  <div class="tr-step-title">${v.icon} ${v.name} <small style="font-weight:500;opacity:0.75">· ${v.sub}</small></div>
                  <div class="tr-step-sub">${x}</div>
                </div>
              </div>
            `}).join("")}
        </div>
      `,n.querySelectorAll(".tr-step-item").forEach(v=>{v.onclick=()=>{const c=+v.dataset.stepIdx;c<=u&&c!==s&&(window.SFX&&window.SFX.tap&&window.SFX.tap(),s=c,se())}}))}function se(){z&&clearTimeout(z),Y&&clearTimeout(Y),s>u&&(u=s);const t=_[T[s]];if(!t)return;const n=I(),r=n.positions[s]||n.positions[0],a=n.meta[s]||n.meta[0]||{name:r,sub:"命运节点",icon:"✦"},e=document.getElementById("mod-tarot");e&&(e.scrollTop=0),ye(t);const f=document.getElementById("trBigCard"),v=document.getElementById("trFback"),c=document.getElementById("trFace"),h=document.getElementById("trReading");f.classList.remove("flipped"),h.style.opacity="0",v.innerHTML=W();const X=J[t.no]||'<circle cx="60" cy="60" r="30"/>';c.innerHTML=`
      <div class="tr-face-container">
        <div class="tr-face-base">
          <div class="num">${B[t.no]}</div>
          <div class="emblem" style="${t.isRev?"transform:rotate(180deg);":""}">${ie(X)}</div>
          <div class="nm">
            <b>${t.name}</b>
            <span>${t.en}</span>
          </div>
        </div>
        ${t.image?`
          <div class="tr-face-art-wrap ${t.isRev?"is-rev":""}">
            <img src="${t.image}" alt="${t.name}" class="tr-face-art-img"
                 loading="eager" decoding="async"
                 onerror="this.style.display='none'">
          </div>
        `:""}
      </div>
    `,document.getElementById("rvPos").textContent=`${a.icon} ${a.name} · ${a.sub}`;const $=document.getElementById("rvBadge");$.className=`badge ${t.isRev?"rev":"up"}`,$.textContent=t.isRev?"逆位 · 内省与转化":"正位 · 能量充盈显现";const L=document.getElementById("rvAstro");L&&(L.textContent=t.astro||"✦ 大阿卡那星轨");const x=document.getElementById("rvRoman");x&&(x.textContent=B[t.no]),document.getElementById("rvName").textContent=t.name;const p=document.getElementById("rvEn");p&&(p.textContent=t.en);const g=document.getElementById("rvPillar");g&&(g.textContent=`✦ ${t.pillar||"命运启示"}`);const k=t.isRev?t.revKw:t.upKw,y=document.getElementById("rvKw");if(y){const Te=k.split("·").map(ke=>ke.trim()).filter(Boolean);y.innerHTML=Te.map(ke=>`<span class="tr-kw-pill">✦ ${ke}</span>`).join("")}const R=document.getElementById("rvTitleOracle");R&&(R.textContent=n.count===1?"📜 灵性瞬像 · 牌面核心启示":"📜 命运启示精解"),document.getElementById("rvTxt").textContent=t.isRev?t.rev:t.up;const E=document.getElementById("rvActionPanel"),ne=document.getElementById("rvActionTitle"),N=document.getElementById("rvAction"),ge=document.getElementById("rvGuideHint"),ue=document.getElementById("rvMetaFooter");n.count===1?(E&&(E.style.display="none"),ue&&(ue.style.display="none"),ge&&(ge.style.display="flex")):(E&&(E.style.display="",E.className=`tr-rv-panel action ${t.isRev?"is-rev":""}`),ne&&(ne.innerHTML=`
          <span>${t.isRev?"🧭 破局与调整箴言 · 忌盲目内耗":"🧭 当下行动箴言 · 宜顺势而为"}</span>
          <span style="font-weight:600;opacity:0.75;font-size:11px">ACTION GUIDANCE</span>
        `),N&&(N.textContent=t.isRev?t.revAction||t.rev:t.upAction||t.up),ue&&(ue.style.display="",ue.innerHTML=`
          <span>🔮 阿卡那序列：<b>No.${t.no} (${B[t.no]})</b></span>
          <span>✨ 守护对应：<b>${t.astro||"大阿卡那"}</b></span>
          <span>⚡ 牌面状态：<b>${t.isRev?"逆位 (需向内觉察)":"正位 (能量顺畅流动)"}</b></span>
        `),ge&&(ge.style.display="none"));const he=document.getElementById("trRvPrev"),xe=document.getElementById("trRvNext");n.count===1?(he.style.display="inline-flex",he.textContent="🔄 换一张重抽",xe.textContent="✦ 查看完整报告 / 导出签文 → ✦"):(he.style.display=s>0?"inline-flex":"none",he.textContent="← 上一张牌",s===T.length-1?xe.textContent=`✦ 查看${n.shortName}全景报告 ✦`:xe.textContent="下一张牌"),z=setTimeout(()=>{window.SFX&&window.SFX.tarotFlip&&window.SFX.tarotFlip(),f.classList.add("flipped"),Y=setTimeout(()=>{h.style.opacity="1",window.SFX&&window.SFX.tarotReveal&&window.SFX.tarotReveal()},400)},250)}let ee=!1;function le(t){if(ee)return;ee=!0;const n=!!(t&&Array.isArray(t.items)&&t.items.length>0);!n&&window.SFX&&window.SFX.tarotDone&&window.SFX.tarotDone(),t&&t.spread&&(K=t.spread);const r=I(K),a=r.positions,e=n?t.items:T.map((x,p)=>{const g=_[x];return{pos:a[p]||a[0],card:g,kw:g.isRev?g.revKw:g.upKw,txt:g.isRev?g.rev:g.up}});if(!e||!e.length)return;const f=t&&t.domainLabel||w[G]&&w[G].label||"🌟 综合指引",v=t&&t.question!==void 0?t.question:Q,c=document.getElementById("trSummaryBox"),h=document.getElementById("trResultList"),X=t&&t.archiveId||Date.now().toString().slice(-8);if(r.count===1||e.length===1){const x=e[0],p=x.card,g=J[p.no]||'<circle cx="60" cy="60" r="30"/>',y=(x.kw||"").split("·").map(N=>N.trim()).filter(Boolean).map(N=>`<span class="tr-kw-pill">✦ ${N}</span>`).join(""),R=j(p,G,p.isRev),E=D(p.astro),ne=l(p,p.isRev);if(c&&(c.style.display="none",c.innerHTML=""),h){h.className="result-list is-single",h.innerHTML=`
          <div class="tr-dossier-report">
            <!-- 档案文牒顶栏 -->
            <div class="tr-dossier-banner">
              <div class="tr-dossier-banner-top">
                <span class="tr-dossier-code">ARCHIVE NO. TR-${X}</span>
                <span class="tr-dossier-badge">${f} · 命运全景推演</span>
                <span class="tr-dossier-status ${p.isRev?"rev":"up"}">${p.isRev?"🔴 逆位 · 阻滞觉察与转化":"🟢 正位 · 顺流显化与充盈"}</span>
              </div>
              ${v?`
                <div class="tr-dossier-question">
                  <span class="tr-dq-icon">💭</span>
                  <span class="tr-dq-label">问卜心愿：</span>
                  <strong class="tr-dq-text">「${M(v)}」</strong>
                </div>
              `:""}
              <div class="tr-dossier-title-bar">
                <div class="tr-dossier-title-main">
                  <span class="tr-dossier-roman">[ ${B[p.no]} ]</span>
                  <h2 class="tr-dossier-name">${p.name}</h2>
                  <span class="tr-dossier-en">${p.en}</span>
                </div>
                <div class="tr-dossier-pillar">✦ ${p.pillar||"命运启示"} ✦</div>
              </div>
            </div>

            <!-- 双栏核心内容网格 -->
            <div class="tr-dossier-grid">
              <!-- 左栏：大牌神貌展台 + 核心意象 + 元素能量流向 -->
              <div class="tr-dossier-card-col">
                <div class="tr-dossier-card-stage">
                  <div class="tr-card-halo"></div>
                  <div class="bigcard flipped" id="trDossierCard" title="轻触牌面可翻转重读">
                    <div class="flip">
                      <div class="fback">${W()}</div>
                      <div class="face">
                        <div class="tr-face-container">
                          <div class="tr-face-base">
                            <div class="num">${B[p.no]}</div>
                            <div class="emblem" style="${p.isRev?"transform:rotate(180deg);":""}">${ie(g)}</div>
                            <div class="nm">
                              <b>${p.name}</b>
                              <span>${p.en}</span>
                            </div>
                          </div>
                          ${p.image?`
                            <div class="tr-face-art-wrap ${p.isRev?"is-rev":""}">
                              <img src="${p.image}" alt="${p.name}" class="tr-face-art-img"
                                   loading="eager" decoding="async"
                                   onerror="this.style.display='none'">
                            </div>
                          `:""}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div class="tr-card-flip-hint">✦ 轻触圣牌可翻转 · 凝视阿卡那真容 ✦</div>
                </div>

                <div class="tr-dossier-kw-matrix">
                  <div class="tr-dossier-kw-title">✦ 核心意象矩阵 ✦</div>
                  <div class="tr-rv-kw-row" style="justify-content:center;">
                    ${y}
                  </div>
                </div>

                <div class="tr-dossier-elem-box">
                  <div class="tr-dossier-sec-head">
                    <div class="tr-dsh-left">
                      <span class="tr-dsh-icon">🌌</span>
                      <span class="tr-dsh-title">四大元素能量流向</span>
                    </div>
                    <span class="tr-dsh-en">ELEMENTAL</span>
                  </div>
                  <div class="tr-elem-dyn-badge">${E.elem}</div>
                  <div class="tr-elem-dyn-flow">${E.flow}</div>
                  <div class="tr-elem-dyn-balance"><strong>⚖️ 能量调和：</strong>${E.balance}</div>
                </div>
              </div>

              <!-- 右栏：四大全景深度分析模块 -->
              <div class="tr-dossier-content-col">
                <!-- 模块 1：核心命运象义全景深析 -->
                <div class="tr-dossier-sec essence">
                  <div class="tr-dossier-sec-head">
                    <div class="tr-dsh-left">
                      <span class="tr-dsh-icon">📜</span>
                      <span class="tr-dsh-title">核心命运象义全景深析</span>
                    </div>
                    <span class="tr-dsh-en">ARCANA ESSENCE</span>
                  </div>
                  <div class="tr-dossier-sec-body">
                    <p class="tr-dossier-main-txt">${x.txt}</p>
                  </div>
                </div>

                <!-- 模块 2：专项推演剖析 -->
                <div class="tr-dossier-sec domain">
                  <div class="tr-dossier-sec-head">
                    <div class="tr-dsh-left">
                      <span class="tr-dsh-icon">🎯</span>
                      <span class="tr-dsh-title">${f} · 专项推演剖析</span>
                    </div>
                    <span class="tr-dsh-en">DOMAIN DYNAMICS</span>
                  </div>
                  <div class="tr-dossier-sec-body">
                    <p class="tr-dossier-domain-txt">${R}</p>
                  </div>
                </div>

                <!-- 模块 3：当下双元行动方略 (宜 & 忌 对比卡片) -->
                <div class="tr-dossier-sec actions">
                  <div class="tr-dossier-sec-head">
                    <div class="tr-dsh-left">
                      <span class="tr-dsh-icon">🧭</span>
                      <span class="tr-dsh-title">当下双元行动方略</span>
                    </div>
                    <span class="tr-dsh-en">ACTION PROTOCOL</span>
                  </div>
                  <div class="tr-dossier-action-dual">
                    <div class="tr-dual-action-box do">
                      <div class="tr-dab-head">
                        <span class="tr-dab-badge">🟢 宜 · 顺势而为</span>
                        <small>EMBRACE</small>
                      </div>
                      <div class="tr-dab-txt">${p.upAction||p.up}</div>
                    </div>
                    <div class="tr-dual-action-box dont">
                      <div class="tr-dab-head">
                        <span class="tr-dab-badge">🔴 忌 · 盲区防范</span>
                        <small>AVOID</small>
                      </div>
                      <div class="tr-dab-txt">${p.revAction||p.rev}</div>
                    </div>
                  </div>
                </div>

                <!-- 模块 4：专属阿卡那定盘高维禅语 -->
                <div class="tr-dossier-sec mantra">
                  <div class="tr-dossier-sec-head">
                    <div class="tr-dsh-left">
                      <span class="tr-dsh-icon">✨</span>
                      <span class="tr-dsh-title">专属阿卡那定盘高维禅语</span>
                    </div>
                    <span class="tr-dsh-en">ZEN MANTRA</span>
                  </div>
                  <div class="tr-dossier-mantra-box">
                    <div class="tr-mantra-quote-mark">“</div>
                    <div class="tr-mantra-verse">${ne}</div>
                    <div class="tr-mantra-sub">—— 韦特大阿卡那 · ${p.name} ${p.isRev?"逆位定盘":"正位定盘"}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        `;const N=document.getElementById("trDossierCard");N&&(N.onclick=()=>{window.SFX&&window.SFX.tarotFlip&&window.SFX.tarotFlip(),N.classList.toggle("flipped")})}}else if(c&&(c.style.display="",c.innerHTML=`
          <div class="tr-summary-header">
            <span class="tr-summary-pill">✦ ${f} · ${r.name}</span>
            <h3>${r.title}</h3>
            <p class="tr-summary-lead">${v?`求问：「${M(v)}」 ｜ `:""}${r.lead}</p>
          </div>
        `),h){h.className="result-list is-three";let x="";e.forEach((p,g)=>{const k=p.card,y=r.meta[g]||{label:p.pos,icon:"✦",cls:"past"},R=J[k.no]||'<circle cx="60" cy="60" r="30"/>',E=k.isRev?k.revAction:k.upAction;x+=`
            <div class="tr-trio-card ${y.cls}">
              <div class="tr-trio-header">
                <span class="tr-time-tag">${y.icon} ${y.label}</span>
              </div>
              
              <div class="tr-card-frame sm ${k.isRev?"is-rev":""} ${k.image?"has-art":""}">
                <div class="tr-card-inner">
                  <div class="tr-card-head">
                    <span class="tr-card-num">${B[k.no]}</span>
                    <span class="tr-card-state-tag ${k.isRev?"rev":"up"}">${k.isRev?"逆位":"正位"}</span>
                  </div>
                  <div class="tr-card-art">
                    ${ie(R)}
                  </div>
                  <div class="tr-card-foot">
                    <div class="tr-card-name">${k.name}</div>
                    <div class="tr-card-en">${k.en}</div>
                  </div>
                </div>
                ${k.image?`
                  <div class="tr-card-painting-wrap ${k.isRev?"is-rev":""}">
                    <img src="${k.image}" alt="${k.name}" class="tr-card-painting-img"
                         loading="eager" decoding="async"
                         onerror="this.style.display='none'">
                  </div>
                `:""}
              </div>

              <div class="tr-trio-body">
                <div class="tr-trio-title-row">
                  <span class="tr-tag-status ${k.isRev?"rev":"up"}">${k.isRev?"逆位":"正位"}</span>
                  <h4>${B[k.no]} · ${k.name}</h4>
                </div>
                <div class="tr-trio-kw">${p.kw}</div>
                <div class="tr-trio-desc">${p.txt}</div>
                ${E?`<div class="tr-trio-desc" style="margin-top:4px;padding-top:8px;border-top:1px dashed var(--line);font-size:12.5px;"><strong style="color:var(--tr-gold)">🧭 箴言：</strong>${E}</div>`:""}
              </div>
            </div>
          `}),h.innerHTML=x}if(i={spread:K,domain:G,domainLabel:f,question:v,archiveId:X,items:e},!n&&window.UniversalHistory){const x=e[0].card;window.UniversalHistory.add({module:"tarot",title:`命运塔罗 · ${x.name} (${x.isRev?"逆位":"正位"})`,subtitle:`${f} · ${r.shortName} · ${e[0].kw}`,color:"#e8c96a",badge:"🔮 塔罗",avatar:"🔮",data:i})}const $=document.getElementById("trBtnAgain");$&&($.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),P?re():te()});const L=document.getElementById("trBtnSave");L&&(L.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),de(i)}),d("sc-tr-result"),!n&&window.AppRouter&&typeof window.AppRouter.replaceView=="function"&&window.AppRouter.replaceView("result",{result:i})}function te(){P=!1,ee=!1;const t=document.getElementById("trQuestionInput");Q=t?t.value.trim():"",T=[],o(),m(),O(),d("sc-tr-pick"),F(),window.AppRouter&&typeof window.AppRouter.pushView=="function"&&window.AppRouter.pushView("pick")}function re(){P=!0,ee=!1;const t=document.getElementById("trQuestionInput");Q=t?t.value.trim():"",o(),m(),A();const n=I().count;T=[];for(let r=0;r<n;r++)T.push(r);Z(),window.AppRouter&&typeof window.AppRouter.pushView=="function"&&window.AppRouter.pushView("reading",{quick:!0})}function de(t){if(!t||!t.items||!t.items.length){alert("请先完成翻牌占卜后再保存结果");return}const n=document.getElementById("trBtnSave"),r=n?n.textContent:"📜 保存占卜签";n&&(n.textContent="⏳ 正在生成高清画报...",n.disabled=!0);const a=f=>new Promise(v=>{if(!f)return v(null);fetch(f).then(c=>{if(!c.ok)throw new Error("Fetch status "+c.status);return c.blob()}).then(c=>{const h=URL.createObjectURL(c),X=new Image;X.onload=()=>v({img:X,blobUrl:h}),X.onerror=()=>{URL.revokeObjectURL(h),v(null)},X.src=h}).catch(()=>{const c=new Image;c.onload=()=>v({img:c,blobUrl:null}),c.onerror=()=>v(null),c.src=f})}),e=t.items.map(f=>a(f.card.image));Promise.all(e).then(f=>{const v=f.map(h=>h?h.img:null),c=f.map(h=>h?h.blobUrl:null).filter(Boolean);try{pe(t,v)}catch(h){console.warn("Poster export with images threw error, fallback to vector poster:",h),pe(t,t.items.map(()=>null))}finally{c.forEach(h=>URL.revokeObjectURL(h))}}).catch(f=>{console.error("Share card image loading error:",f);try{pe(t,t.items.map(()=>null))}catch(v){console.error("Fallback render also failed:",v),alert("生成画报失败，请稍后重试")}}).finally(()=>{n&&(n.textContent=r,n.disabled=!1)})}function pe(t,n){const r=t.spread==="one"||t.items.length===1,a=document.createElement("canvas");a.width=1080,a.height=r?1760:1920;const e=a.getContext("2d"),f=e.createLinearGradient(0,0,0,a.height);f.addColorStop(0,"#0a0818"),f.addColorStop(.3,"#140f2e"),f.addColorStop(.65,"#1b143a"),f.addColorStop(1,"#0c0919"),e.fillStyle=f,e.fillRect(0,0,a.width,a.height),e.fillStyle="rgba(232, 201, 106, 0.45)",[[120,150,2],[240,90,1.5],[890,140,2],[960,220,1.5],[100,480,1.5],[980,520,2],[140,900,2],[950,950,1.5],[110,1300,1.5],[960,1400,2],[180,a.height-80,2],[880,a.height-110,1.5]].forEach(([$,L,x])=>{e.beginPath(),e.arc($,L,x,0,Math.PI*2),e.fill()}),e.strokeStyle="rgba(232, 201, 106, 0.25)",e.lineWidth=1.5,C(e,40,40,a.width-80,a.height-80,32),e.stroke(),e.strokeStyle="rgba(232, 201, 106, 0.65)",e.lineWidth=3,C(e,52,52,a.width-104,a.height-104,26),e.stroke(),e.fillStyle="#e8c96a",e.font="20px serif",e.textAlign="center",e.textBaseline="middle",e.fillText("✦",76,76),e.fillText("✦",a.width-76,76),e.fillText("✦",76,a.height-76),e.fillText("✦",a.width-76,a.height-76),e.textAlign="center",e.fillStyle="rgba(232, 201, 106, 0.16)",C(e,360,90,360,44,22),e.fill(),e.strokeStyle="rgba(232, 201, 106, 0.5)",e.lineWidth=1,e.stroke(),e.fillStyle="#e8c96a",e.font="bold 18px sans-serif",e.fillText("✦ 阿卡那秘境 · 塔罗命运档案馆 ✦",540,112),e.fillStyle="#f8df8c",e.font='bold 44px Georgia, "PingFang SC", serif',e.fillText("命 运 启 示 录",540,192),e.fillStyle="#c9c0ee",e.font="20px sans-serif",e.fillText("大阿卡那 · 二十二张启示之牌",540,236),e.strokeStyle="rgba(232, 201, 106, 0.3)",e.lineWidth=1,e.beginPath(),e.moveTo(280,260),e.lineTo(800,260),e.stroke(),e.fillStyle="#e8c96a",e.font="14px serif",e.fillText("◆",540,260);const c=t.items[0];if(r){const $=n[0],L=330,x=290,p=420,g=630,k=20;e.save(),e.shadowColor="rgba(232, 201, 106, 0.4)",e.shadowBlur=36,e.fillStyle="#181238",C(e,L-8,x-8,p+16,g+16,k+4),e.fill(),e.restore(),e.strokeStyle="#d4af37",e.lineWidth=4,C(e,L-4,x-4,p+8,g+8,k+2),e.stroke(),$?(e.save(),C(e,L,x,p,g,k),e.clip(),c.card.isRev?(e.translate(L+p/2,x+g/2),e.rotate(Math.PI),e.drawImage($,-p/2,-g/2,p,g)):e.drawImage($,L,x,p,g),e.restore()):(e.fillStyle="#1e1445",C(e,L,x,p,g,k),e.fill(),e.fillStyle="rgba(232, 201, 106, 0.12)",C(e,L+24,x+24,p-48,g-48,16),e.fill(),e.strokeStyle="rgba(232, 201, 106, 0.45)",e.stroke(),e.fillStyle="#fce494",e.font="bold 36px Georgia, serif",e.fillText(B[c.card.no],540,x+90),e.font="bold 36px sans-serif",e.fillText(c.card.name,540,x+g/2),e.font="22px Georgia, serif",e.fillStyle="#c4b5fd",e.fillText(c.card.en,540,x+g/2+50));const y=L+p-124,R=x+16;e.save(),e.fillStyle=c.card.isRev?"rgba(239, 68, 68, 0.9)":"rgba(16, 185, 129, 0.9)",C(e,y,R,108,38,19),e.fill(),e.strokeStyle="rgba(255, 255, 255, 0.85)",e.lineWidth=1.5,e.stroke(),e.fillStyle="#ffffff",e.font="bold 18px sans-serif",e.textAlign="center",e.fillText(c.card.isRev?"逆 位 · REV":"正 位 · UP",y+54,R+20),e.restore(),e.textAlign="center",e.fillStyle="#fce494",e.font='bold 38px Georgia, "PingFang SC", serif',e.fillText(`${B[c.card.no]} · ${c.card.name} (${c.card.en})`,540,975),e.fillStyle="rgba(232, 201, 106, 0.12)",C(e,220,1005,640,48,24),e.fill(),e.strokeStyle="rgba(232, 201, 106, 0.45)",e.lineWidth=1,e.stroke(),e.fillStyle="#e8c96a",e.font="bold 24px sans-serif",e.fillText(`🔑 核心指引：${c.kw}`,540,1030);const E=1085,ne=430;e.fillStyle="rgba(26, 20, 54, 0.85)",C(e,110,E,860,ne,24),e.fill(),e.strokeStyle="rgba(232, 201, 106, 0.35)",e.lineWidth=1.5,e.stroke(),e.textAlign="left",e.fillStyle="#e8c96a",e.font="bold 24px sans-serif",e.fillText("📜 牌意启示解读 (Divine Insight)",150,E+54),e.strokeStyle="rgba(232, 201, 106, 0.2)",e.lineWidth=1,e.beginPath(),e.moveTo(150,E+74),e.lineTo(930,E+74),e.stroke(),e.fillStyle="#ede7ff",e.font='26px/1.8 "PingFang SC", "Microsoft YaHei", sans-serif',ve(e,c.txt,150,E+122,780,46);const N=E+280;e.fillStyle="rgba(232, 201, 106, 0.08)",C(e,150,N,780,110,16),e.fill(),e.strokeStyle="rgba(232, 201, 106, 0.25)",e.stroke(),e.fillStyle="#d4af37",e.font="bold 36px Georgia, serif",e.fillText("“",170,N+45),e.fillStyle="#d8cef6",e.font='italic 23px "PingFang SC", sans-serif',e.fillText("顺应内心的真实感召，走好当下的每一步。",210,N+48),e.fillText("束缚你的从来不是深渊，而是不敢放下的执念。",210,N+84)}else{const p=(a.width-860)/2,g=290;t.items.forEach((y,R)=>{const E=p+R*300,ne=n[R];e.save(),e.shadowColor="rgba(232, 201, 106, 0.3)",e.shadowBlur=20,e.fillStyle="#181238",C(e,E,g,260,390,16),e.fill(),e.restore(),e.strokeStyle="#d4af37",e.lineWidth=3,C(e,E,g,260,390,16),e.stroke(),ne?(e.save(),C(e,E,g,260,390,16),e.clip(),y.card.isRev?(e.translate(E+260/2,g+390/2),e.rotate(Math.PI),e.drawImage(ne,-260/2,-390/2,260,390)):e.drawImage(ne,E,g,260,390),e.restore()):(e.fillStyle="#1e1644",C(e,E,g,260,390,16),e.fill(),e.fillStyle="#e8c96a",e.font="bold 28px Georgia, serif",e.textAlign="center",e.fillText(B[y.card.no],E+260/2,g+60),e.font="22px sans-serif",e.fillText(y.card.name,E+260/2,g+390/2)),e.textAlign="center",e.fillStyle="#fce494",e.font="bold 24px sans-serif",e.fillText(`【${y.pos}】${y.card.name} · ${y.card.isRev?"逆位":"正位"}`,E+260/2,g+390+34),e.fillStyle="#c9c0ee",e.font="17px sans-serif",e.fillText(y.kw,E+260/2,g+390+62)});let k=790;t.items.forEach(y=>{e.fillStyle="rgba(26, 20, 54, 0.85)",C(e,110,k,860,250,20),e.fill(),e.strokeStyle="rgba(232, 201, 106, 0.35)",e.lineWidth=1.5,e.stroke(),e.textAlign="left",e.fillStyle="#e8c96a",e.font="bold 25px sans-serif",e.fillText(`✦ ${y.pos} · ${y.card.name} (${y.card.isRev?"逆位":"正位"})`,150,k+48),e.fillStyle="#ede7ff",e.font='26px/1.7 "PingFang SC", sans-serif',ve(e,y.txt,150,k+96,780,46),k+=275})}e.textAlign="center",e.fillStyle="#b3a9e0",e.font="19px sans-serif",e.fillText("✦ 精神状态测试研究所 · 塔罗命运档案馆 ✦",540,a.height-110),e.font="16px sans-serif",e.fillStyle="#9a91c6",e.fillText("探索潜意识的宇宙边界 · 长按保存图片",540,a.height-76);let h="";try{h=a.toDataURL("image/png")}catch($){throw console.warn("Canvas toDataURL failed:",$),$}const X=`命运塔罗_${c.card.name}.png`;try{const $=document.createElement("a");$.download=X,$.href=h,document.body.appendChild($),$.click(),document.body.removeChild($)}catch($){console.warn("Auto download triggered exception:",$)}be(h,X)}function be(t,n){if(S={dataUrl:t,filename:n},window.AppRouter&&typeof window.AppRouter.openLayer=="function"){window.AppRouter.openLayer("tarot-poster",{filename:n});return}we(t,n)}function we(t,n){let r=document.getElementById("trPosterModal");if(!r){r=document.createElement("div"),r.id="trPosterModal",r.className="tr-poster-modal",r.innerHTML=`
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
      `,document.body.appendChild(r);const f=r.querySelector(".tr-poster-close"),v=r.querySelector(".tr-poster-backdrop"),c=()=>me();f.onclick=c,v.onclick=c}const a=r.querySelector(".tr-poster-img");a.src=t;const e=r.querySelector(".tr-poster-dl-btn");e.onclick=()=>{try{const f=document.createElement("a");f.download=n||"命运塔罗_命运画报.png",f.href=t,document.body.appendChild(f),f.click(),document.body.removeChild(f)}catch(f){console.error("Download click failed:",f)}},r.style.display="flex"}function me(t){if(t=t||{},!t.fromRouter&&window.AppRouter&&typeof window.AppRouter.dismissLayer=="function"){window.AppRouter.dismissLayer("tarot-poster");return}const n=document.getElementById("trPosterModal");n&&(n.style.display="none")}function C(t,n,r,a,e,f){t.beginPath(),t.moveTo(n+f,r),t.lineTo(n+a-f,r),t.arcTo(n+a,r,n+a,r+f,f),t.lineTo(n+a,r+e-f),t.arcTo(n+a,r+e,n+a-f,r+e,f),t.lineTo(n+f,r+e),t.arcTo(n,r+e,n,r+e-f,f),t.lineTo(n,r+f),t.arcTo(n,r,n+f,r,f),t.closePath()}function ve(t,n,r,a,e,f){let v="";for(let c=0;c<n.length;c++){const h=v+n[c];t.measureText(h).width>e&&c>0?(t.fillText(v,r,a),v=n[c],a+=f):v=h}t.fillText(v,r,a)}let H=null;function q(t){const n=U.filter(a=>a.image&&(!t||a.image!==t.image)),r=()=>{const a=n.shift();if(!a){H=null;return}const e=new Image;e.onload=e.onerror=()=>{H&&clearTimeout(H),H=setTimeout(r,160)},e.src=a.image};H&&clearTimeout(H),H=setTimeout(r,600)}function $e(){const t=document.getElementById("trMeditationText"),n=w[G]||w.general;t&&n.meditation&&(t.textContent=n.meditation)}function Ae(){const t=new Date,n=t.getFullYear(),r=t.getMonth()+1,a=t.getDate();ce=(n*372+r*31+a*7)%U.length;const e=U[ce]||U[19],f=document.getElementById("trAlmanacDateTag");f&&(f.textContent=`${n}.${String(r).padStart(2,"0")}.${String(a).padStart(2,"0")} · 星轨值日`);const v=document.getElementById("trShowcaseImg"),c=document.getElementById("trShowcaseTag"),h=document.getElementById("trShowcaseTitle"),X=document.getElementById("trShowcaseAstro"),$=document.getElementById("trShowcaseDesc"),L=document.getElementById("trDailyUpHead"),x=document.getElementById("trDailyUpTxt"),p=document.getElementById("trDailyRevHead"),g=document.getElementById("trDailyRevTxt");v&&e.image&&(v.src=e.image,v.alt=e.name),c&&(c.textContent=`🌟 今日值日阿卡那 · No.${e.no}`),h&&(h.innerHTML=`${B[e.no]} · ${e.name} <small>(${e.en})</small>`),X&&(X.textContent=`${e.astro||"✦ 大阿卡那"} ｜ ${e.pillar||"命运启示"}`),$&&($.textContent=e.up),L&&(L.textContent=`🟢 今日顺势宜 · ${e.upKw}`),x&&(x.textContent=e.upAction||e.up),p&&(p.textContent=`🟠 今日觉察忌 · ${e.revKw}`),g&&(g.textContent=e.revAction||e.rev)}function Se(){Ae(),Se._posterEscBound||(Se._posterEscBound=!0,document.addEventListener("keydown",function(y){if(y.key!=="Escape"&&y.key!=="Esc")return;const R=document.getElementById("trPosterModal");R&&R.style.display==="flex"&&me()}));const t=U[ce]||U[19];q(t),$e();const n=document.getElementById("trDomainGrid");n&&n.querySelectorAll(".tr-domain-chip").forEach(y=>{y.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),G=y.dataset.domain||"general",n.querySelectorAll(".tr-domain-chip").forEach(R=>R.classList.remove("active")),y.classList.add("active"),$e()}});const r=document.getElementById("trSpreadGrid");if(r){const y=r.querySelectorAll(".spread");y.forEach(R=>{R.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),K=R.dataset.spread||"one",y.forEach(E=>E.classList.remove("sel")),R.classList.add("sel")}})}const a=document.getElementById("trBtnStart");a&&(a.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),te()});const e=document.getElementById("trBtnQuickDraw");e&&(e.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),re()});const f=document.getElementById("trBtnShuffle");f&&(f.onclick=()=>{F()});const v=document.getElementById("trBtnReveal");v&&(v.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),Z()});const c=document.getElementById("trBigCard");if(c){let y=0;c.onclick=()=>{window.SFX&&window.SFX.tarotFlip&&window.SFX.tarotFlip(),y&&cancelAnimationFrame(y),c.classList.add("no-anim"),c.classList.remove("flipped"),c.offsetWidth,y=requestAnimationFrame(()=>{y=0,c.classList.remove("no-anim"),c.classList.add("flipped")})}}const h=document.getElementById("trRvNext");h&&(h.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),s<T.length-1?(s++,se()):le()});const X=document.getElementById("trRvPrev");X&&(X.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),K==="one"?P?re():te():s>0&&(s--,se())});const $=document.getElementById("trBtnHome");$&&($.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),window.AppRouter&&typeof window.AppRouter.back=="function"?window.AppRouter.back(()=>d("sc-tr-home")):d("sc-tr-home")});const L=document.getElementById("trBtnBackPick");L&&(L.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),window.AppRouter&&typeof window.AppRouter.back=="function"?window.AppRouter.back(()=>d("sc-tr-home")):d("sc-tr-home")});const x=document.getElementById("trBtnBackReveal");x&&(x.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),z&&clearTimeout(z),Y&&clearTimeout(Y),window.AppRouter&&typeof window.AppRouter.back=="function"?window.AppRouter.back(()=>d("sc-tr-home")):d("sc-tr-home")});const p=document.getElementById("trBtnBackResult");p&&(p.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),window.AppRouter&&typeof window.AppRouter.back=="function"?window.AppRouter.back(()=>d("sc-tr-home")):d("sc-tr-home")});const g=document.getElementById("trBtnSave");g&&(g.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),de(i)});const k=document.getElementById("trBtnAgain");k&&(k.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),P?re():te()})}function Ee(t){!t||!t.items||!Array.isArray(t.items)||!t.items.every(n=>n&&n.card&&typeof n.card.no=="number")||(ee=!1,i=t,K=t.spread||(t.items.length>1?"three":"one"),_=t.items.map(function(n){const r=U.find(function(a){return a.no===n.card.no});return r?{...r,isRev:!!n.card.isRev}:{...n.card}}),T=_.map(function(n,r){return r}),s=0,u=T.length-1,le(t),d("sc-tr-result"))}window.AppTarot={init:Se,startTest:te,showScreen:d,finish:le,restore:Ee,restoreView:function(t,n){if(t==="pick"){d("sc-tr-pick");return}if(t==="reading"){n&&n.quick?document.querySelectorAll("#trDeck .pcard").length&&T.length?(d("sc-tr-reveal"),se()):re():d("sc-tr-pick");return}if(t==="result"){n&&n.result?Ee(n.result):d(i?"sc-tr-result":"sc-tr-home");return}d("sc-tr-home")},openPosterLayer:function(t){S&&we(S.dataUrl,t&&t.filename||S.filename)},closePoster:me,drawTarotShareCard:de}})(),(function(){"use strict";const ae={career:{name:"💼 搞钱事业",desc:"升职加薪 · 避坑跳槽"},wealth:{name:"💰 暴富偏财",desc:"正财稳进 · 锦鲤附体"},love:{name:"🌸 正缘桃花",desc:"正缘显灵 · 寡王破局"},shield:{name:"🛡️ 退散小人",desc:"甩锅免疫 · 水逆清零"}},ie=[{no:"第一签",title:"紫气东来 · 扶摇直上",rank:"上上大吉",poem:["大鹏一日同风起，扶摇直上九万里。","久困樊笼今脱锁，金鳞岂是池中物。"],xianji:{功名:"破格拔擢",财运:"八方来财",良缘:"天作之合",防锅:"万邪不侵"},interp:"此乃百里挑一的「天选打工人」神签！你之前积攒的所有隐忍、熬过的夜、改过的烂需求，都将在近期转化为实质性的大爆发。原本卡壳的事情会突然绿灯全开，贵人主动递梯子。别再自我怀疑，大胆争取你应得的筹码！",yi:"大胆提条件、投递心仪 Offer、买杯最贵的特调犒劳自己",ji:"过度谦虚、替不懂感恩的人免费加班"},{no:"第三签",title:"姜公钓鱼 · 愿者上钩",rank:"上吉",poem:["渭水河畔持翠竿，风波不动心自宽。","莫道良辰来得晚，一朝得势跃龙门。"],xianji:{功名:"大器晚成",财运:"静待花开",良缘:"水到渠成",防锅:"稳坐钓鱼台"},interp:"焦虑是因为你把时间线拉得太短了！当前看似风平浪静甚至有点无聊的工位日常，其实是宇宙在帮你蓄力。不要看别人瞎卷就跟着乱阵脚，按你自己的节奏摸鱼充电、精进手艺，真正属于你的大鱼已经在咬钩的路上了。",yi:"按时下班、整理作品集、带薪学习新技能",ji:"跟风内卷、在深夜回复工作群消息"},{no:"第六签",title:"火炼真金 · 拨云见日",rank:"中上吉",poem:["千淘万漉虽辛苦，吹尽狂沙始到金。","守得云开见明月，自有清风拂衣襟。"],xianji:{功名:"先苦后甜",财运:"渐入佳境",良缘:"真心相见",防锅:"清者自清"},interp:"最近是不是觉得破事一堆、仿佛全公司的草台班子都在考验你的脾气？稳住！这支签告诉你：目前的折腾正是筛掉庸人、凸显你价值的时刻。那些甩不掉的烂摊子很快就会收尾，你的专业度会被真正有话语权的人看在眼里。",yi:"留存工作留痕记录、午休闭目养神 20 分钟",ji:"在背后跟半熟的同事吐槽老板"},{no:"第八签",title:"财神敲门 · 暗流涌金",rank:"上上大吉",poem:["忽如一夜春风来，千树万树金花开。","正道勤耕有厚报，偏财亦随喜鹊来。"],xianji:{功名:"名利双收",财运:"横财就手",良缘:"喜气盈门",防锅:"逢凶化吉"},interp:"恭喜抽中财神爷亲自加持的搞钱灵签！近期你的财运磁场极强，不仅主业有望迎来奖金、补贴或绩效好消息，还容易遇到报销秒批、闲置高价卖出、抽中免单等意外惊喜。记得把手机电量充满，随时接听好消息！",yi:"核对报销单、清理二手闲置、请朋友喝快乐水攒人品",ji:"冲动消费买华而不实的电子垃圾"},{no:"第十一签",title:"明哲保身 · 潜龙勿用",rank:"中平",poem:["深潭潜龙莫轻狂，雾里看花且敛光。","他山纵有千般险，我自高卧白云乡。"],xianji:{功名:"宜守不宜攻",财运:"落袋为安",良缘:"随缘莫强求",防锅:"三十六计闪为上"},interp:"这是一支极具东方生存智慧的「摸鱼护体签」！当前外部环境（或者你们部门的规划）正处于朝令夕改的混乱期，谁冲在最前面谁就最容易当炮灰。此时最高级的策略就是：降低存在感，精准卡点完成分内事，绝不主动揽活！",yi:"开启免打扰模式、准点打卡溜号、保持表情平淡",ji:"在会议上抢答、盲目立下高难度 Flag"},{no:"第十五签",title:"钟馗捉鬼 · 小人退散",rank:"上吉",poem:["青锋宝剑耀寒光，魑魅魍魉无处藏。","坦荡胸怀行大道，清风明月伴君旁。"],xianji:{功名:"排除万难",财运:"失而复得",良缘:"去伪存真",防锅:"反弹琵琶"},interp:"近期若有阴阳怪气的甩锅侠、爱打小报告的职场戏精围着你转，请尽管放心！此签自带「钟馗辟邪金盾」，对方耍的小聪明不仅伤不到你，反而会在大庭广众之下露出马脚自食其果。你只管堂堂正正看戏即可！",yi:"重要沟通一律群聊留底、桌面摆一盆绿植或冰水",ji:"因别人的愚蠢而内耗生闷气"},{no:"第十八签",title:"桃花映面 · 良缘天降",rank:"上上大吉",poem:["春水初生映彩霞，春林初盛满枝花。","莫愁前路无知己，转角相逢便是一家。"],xianji:{功名:"人脉亨通",财运:"和气生财",良缘:"红鸾星动",防锅:"众人相助"},interp:"不仅爱情桃花旺，人际贵人运更是直接拉满！单身者近期极易在兴趣社群、朋友聚会或偶然的搭话中遇到聊得来的高频灵魂；职场人则会遇到沟通极其顺畅的神仙搭档或爽快客户，让你感叹“人间居然还有正常人”！",yi:"换个清爽发型、周末出门晒太阳、主动给朋友点个赞",ji:"全天宅在被窝不见天日、拒绝所有社交邀请"},{no:"第二十二签",title:"柳暗花明 · 绝处逢生",rank:"中吉（逆袭签）",poem:["山重水复疑无路，柳暗花明又一村。","莫叹眼下微霜冷，转身便是艳阳春。"],xianji:{功名:"另辟蹊径",财运:"转弯见喜",良缘:"旧去新来",防锅:"化险为夷"},interp:"如果一件事怎么推进都觉得别扭、或者一段关系怎么维护都觉得心累，这支签在温柔地拍拍你：别死磕那扇锁死的门了！试着换一条路、换一个方案，甚至直接放下它，你会惊讶地发现旁边就有一扇洒满阳光的落地窗。",yi:"清理手机内存与桌面杂物、换条路散步回家",ji:"钻牛角尖、为沉没成本继续买单"},{no:"第二十六签",title:"偷得浮生 · 逍遥神仙",rank:"上吉",poem:["竹密不妨流水过，山高岂碍白云飞。","因过竹院逢僧话，偷得浮生半日闲。"],xianji:{功名:"松弛有度",财运:"知足常乐",良缘:"自在随心",防锅:"片叶不沾身"},interp:"宇宙检测到你的精神发条拧得太紧了！特赐「带薪逍遥签」一支。天塌下来有高个子顶着，公司的股价更不会因为你少回一条消息而跌停。今天你的首要KPI就是照顾好自己的情绪，去喝杯好喝的，让灵魂充个电！",yi:"正大光明摸鱼 15 分钟、听喜欢的歌、早点钻进被窝",ji:"把工作焦虑带上餐桌和床头"},{no:"第三十签",title:"否极泰来 · 破茧成蝶",rank:"下下转上吉（触底反弹）",poem:["冬去冰消春自回，寒梅历雪更芳菲。","今朝虽有微云蔽，明日金乌照九围。"],xianji:{功名:"触底反弹",财运:"守正待时",良缘:"破镜重圆",防锅:"涅槃重生"},interp:"抽到这支签反而要恭喜你！所谓「否极泰来」，意味着最倒霉、最心烦的谷底已经彻底翻篇了！从你看到这行字开始，所有的霉运都已经清零结算，接下来走的每一步都是在往高处走。去洗把脸，好戏才刚刚开始！",yi:"吃一顿热乎乎的美食、洗个热水澡洗去疲惫",ji:"灰心丧气、否定自己的价值"}];let J="career",oe=!1,W=null;function B(s){const u=document.getElementById("mod-lingqian");if(!u)return;u.querySelectorAll(".lq-screen").forEach(S=>S.classList.remove("active"));const i=u.querySelector("#"+s);i&&(i.classList.add("active"),u.scrollTop=0)}function U(){const s=document.getElementById("lqCylinderSvgBox");s&&(s.innerHTML=`
      <svg viewBox="0 -38 160 252" width="166" height="232" style="filter: drop-shadow(0 12px 24px rgba(0,0,0,0.45)); overflow: visible;">
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
          <linearGradient id="g_lq_stick_back" x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stop-color="#D97706"/>
            <stop offset="100%" stop-color="#92400E"/>
          </linearGradient>
        </defs>
        <!-- 1. 签筒后壁内口与深色桶腔（绘制在最底层，位于所有竹签后方） -->
        <ellipse cx="80" cy="72" rx="46" ry="13" fill="#220303" stroke="url(#g_lq_gold)" stroke-width="2.5"/>
        <ellipse cx="80" cy="74" rx="42" ry="10" fill="#120101"/>

        <!-- 2. 签筒内簇拥的竹签群（插在后壁之后、前壁之前，下半截伸入桶腔 y=110 被前壁自然遮挡） -->
        <g id="lqSticksBundle">
          <!-- 后排竹签 -->
          <rect x="53" y="22" width="9" height="86" rx="3.5" transform="rotate(-7 57 76)" fill="url(#g_lq_stick_back)" stroke="#78350F" stroke-width="1"/>
          <rect x="68" y="16" width="9" height="90" rx="3.5" transform="rotate(-2 72 76)" fill="url(#g_lq_stick_back)" stroke="#78350F" stroke-width="1"/>
          <rect x="84" y="17" width="9" height="89" rx="3.5" transform="rotate(3 88 76)" fill="url(#g_lq_stick_back)" stroke="#78350F" stroke-width="1"/>
          <rect x="97" y="23" width="9" height="85" rx="3.5" transform="rotate(8 101 76)" fill="url(#g_lq_stick_back)" stroke="#78350F" stroke-width="1"/>
          <!-- 前排主竹签 -->
          <rect x="46" y="24" width="10" height="88" rx="4" transform="rotate(-11 50 78)" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <rect x="60" y="14" width="10" height="94" rx="4" transform="rotate(-4 65 78)" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <rect x="75" y="11" width="11" height="96" rx="4" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <rect x="90" y="15" width="10" height="93" rx="4" transform="rotate(5 95 78)" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <rect x="104" y="25" width="10" height="86" rx="4" transform="rotate(11 108 78)" fill="url(#g_lq_stick)" stroke="#92400E" stroke-width="1"/>
          <!-- 朱砂红头点缀 -->
          <rect x="46" y="24" width="10" height="11" rx="3" transform="rotate(-11 50 78)" fill="#E11D48"/>
          <rect x="60" y="14" width="10" height="12" rx="3" transform="rotate(-4 65 78)" fill="#E11D48"/>
          <rect x="75" y="11" width="11" height="14" rx="3" fill="#E11D48"/>
          <rect x="90" y="15" width="10" height="12" rx="3" transform="rotate(5 95 78)" fill="#E11D48"/>
          <rect x="104" y="25" width="10" height="11" rx="3" transform="rotate(11 108 78)" fill="#E11D48"/>
        </g>

        <!-- 3. 摇出时从签筒内部升起的那支天命灵签（夹在桶口内，下端被前壁桶口自然遮挡） -->
        <g id="lqSvgFlyingStick" class="lq-svg-flying-stick">
          <rect x="70" y="8" width="20" height="118" rx="6" fill="url(#g_lq_stick)" stroke="#78350F" stroke-width="1.5"/>
          <rect x="72" y="10" width="16" height="18" rx="4" fill="#E11D48"/>
          <text id="lqSvgStickText" x="80" y="42" font-size="11" font-weight="900" fill="#78350F" text-anchor="middle" font-family="serif">
            <tspan x="80" dy="0">第</tspan>
            <tspan x="80" dy="13">一</tspan>
            <tspan x="80" dy="13">签</tspan>
          </text>
        </g>

        <!-- 4. 雕花朱漆签筒前壁桶身（覆盖在竹签下半截之上，形成真实「签在筒内」的物理遮挡关系） -->
        <path d="M34,72 L40,192 C40,202 58,208 80,208 C102,208 120,202 120,192 L126,72 C126,81 105,85 80,85 C55,85 34,81 34,72 Z" fill="url(#g_lq_bamboo)" stroke="#7F1D1D" stroke-width="1.5"/>
        <!-- 签筒前唇鎏金口沿弧线 -->
        <path d="M34,72 C34,81 55,85 80,85 C105,85 126,81 126,72" fill="none" stroke="url(#g_lq_gold)" stroke-width="2.6" stroke-linecap="round"/>
        <!-- 鎏金箍环 -->
        <path d="M35,94 Q80,104 125,94" fill="none" stroke="url(#g_lq_gold)" stroke-width="4"/>
        <path d="M39,176 Q80,186 121,176" fill="none" stroke="url(#g_lq_gold)" stroke-width="4"/>
        <!-- 筒身中央牌匾 -->
        <rect x="62" y="107" width="36" height="60" rx="6" fill="#450A0A" stroke="url(#g_lq_gold)" stroke-width="2"/>
        <text x="80" y="133" font-size="15" font-weight="900" fill="#FDE68A" text-anchor="middle" font-family="serif">有求</text>
        <text x="80" y="155" font-size="15" font-weight="900" fill="#FDE68A" text-anchor="middle" font-family="serif">必应</text>
      </svg>
    `)}function K(){if(oe)return;oe=!0;const s=document.getElementById("lqBtnShake"),u=document.getElementById("lqCylinderWrap"),i=document.getElementById("lqSvgFlyingStick"),S=document.getElementById("lqSvgStickText"),w=document.getElementById("lqStageHint");s&&(s.disabled=!0),i&&i.classList.remove("dropped"),u&&u.classList.add("shaking"),w&&(w.textContent="🎋 正在摇晃紫竹签筒，聆听神明指引……");let b=0;const I=setInterval(()=>{b++,window.SFX&&window.SFX.shake&&b===1?window.SFX.shake():window.SFX&&window.SFX.tap&&window.SFX.tap(),b>=7&&clearInterval(I)},180),M=ie[Math.floor(Math.random()*ie.length)];if(S){const D=String(M.no).split("");S.innerHTML=D.map((j,V)=>`<tspan x="80" dy="${V===0?0:12}">${j}</tspan>`).join("")}setTimeout(()=>{clearInterval(I),u&&u.classList.remove("shaking"),i&&i.classList.add("dropped"),window.SFX&&window.SFX.bell&&window.SFX.bell(!0),w&&(w.textContent=`✨ 灵签已出：${M.no} · 正在展开宣纸签文……`),setTimeout(()=>{oe=!1,s&&(s.disabled=!1),i&&i.classList.remove("dropped"),w&&(w.textContent="轻点签筒或下方按钮，诚心摇出今日灵签"),G(M)},950)},1450)}function G(s,u=!1){const i=document.getElementById("lqWishInput"),S=i?i.value.trim():"",w=u&&s.catName?s.catName:ae[J].name,b=u&&s.wish?s.wish:S||"";W={...s,catKey:J,catName:w,wish:b,timeStr:new Date().toLocaleString("zh-CN",{hour12:!1})};const I=document.getElementById("lqResCatSub"),M=document.getElementById("lqResTitle"),D=document.getElementById("lqResRank"),j=document.getElementById("lqResPoem"),V=document.getElementById("lqResXianji"),l=document.getElementById("lqResInterp"),d=document.getElementById("lqResTips");I&&(I.textContent=b&&b!==w?`${w} · 祈愿：${b}`:`${w} · 诚心祈愿`),M&&(M.textContent=`${s.no} · ${s.title}`),D&&(D.textContent=s.rank),j&&(j.innerHTML=s.poem.join("<br>")),V&&s.xianji&&(V.innerHTML=Object.entries(s.xianji).map(([o,m])=>`
        <div class="lq-xj-item"><span>${o}</span><b>${m}</b></div>
      `).join("")),l&&(l.textContent=s.interp),d&&(d.innerHTML=`
        <div><b>✅ 今日宜：</b>${s.yi}</div>
        <div><b>❌ 今日忌：</b>${s.ji}</div>
      `),B("sc-lq-result"),!u&&window.AppRouter&&typeof window.AppRouter.replaceView=="function"&&window.AppRouter.replaceView("result",{record:W}),window.SFX&&window.SFX.reveal&&window.SFX.reveal(),!u&&window.UniversalHistory&&typeof window.UniversalHistory.add=="function"&&window.UniversalHistory.add({module:"lingqian",title:`${s.no} · ${s.title} (${s.rank})`,subtitle:`${w} · ${s.poem[0]}`,color:"#E11D48",badge:"🎋 灵签",avatar:"🎋",data:W})}function Q(s){if(!s)return;const u=document.createElement("canvas");u.width=1080,u.height=1620;const i=u.getContext("2d"),S=document.documentElement.dataset.theme!=="light";i.fillStyle=S?"#140D11":"#F7F1E5",i.fillRect(0,0,1080,1620),i.fillStyle=S?"#21151B":"#FFFDF8",i.strokeStyle="#D97706",i.lineWidth=5,P(i,80,80,920,1460,32),i.fill(),i.stroke(),i.strokeStyle="rgba(217, 119, 6, 0.35)",i.lineWidth=2,P(i,104,104,872,1412,20),i.stroke(),i.textAlign="center",i.fillStyle="#D97706",i.font="bold 26px system-ui, sans-serif",i.fillText("东方祈福灵签 · 饮料人格研究所",540,175),i.fillStyle=S?"#FDF2F8":"#29151B",i.font="900 58px serif",i.fillText(`${s.no} · ${s.title}`,540,260),i.fillStyle="#E11D48",P(i,410,295,260,64,14),i.fill(),i.fillStyle="#FFFFFF",i.font="900 34px system-ui, sans-serif",i.fillText(s.rank,540,339),i.fillStyle=S?"rgba(245, 158, 11, 0.08)":"rgba(245, 158, 11, 0.1)",P(i,140,400,800,220,20),i.fill(),i.strokeStyle="rgba(217, 119, 6, 0.4)",i.stroke(),i.fillStyle=S?"#FDE68A":"#78350F",i.font='bold 38px "Songti SC", "SimSun", serif',i.fillText(s.poem[0],540,485),i.fillText(s.poem[1],540,560);let w=690;i.textAlign="left",i.fillStyle="#E11D48",i.font="900 28px system-ui, sans-serif",i.fillText("【仙机四维批注】",140,w),w+=52,i.fillStyle=S?"#FDF2F8":"#29151B",i.font="bold 28px system-ui, sans-serif",Object.entries(s.xianji||{}).forEach(([M,D],j)=>{const V=j%2===0?160:560,l=w+Math.floor(j/2)*52;i.fillText(`✦ ${M}：${D}`,V,l)}),w+=140,i.fillStyle="#E11D48",i.font="900 28px system-ui, sans-serif",i.fillText("【现代白话解签】",140,w),w+=50,i.fillStyle=S?"#E5D5DC":"#3F272E",i.font="26px system-ui, sans-serif",w=ce(i,s.interp,140,w,800,44),w+=45,i.fillStyle=S?"rgba(225, 29, 72, 0.12)":"rgba(225, 29, 72, 0.08)",P(i,140,w,800,150,16),i.fill(),i.fillStyle=S?"#FDF2F8":"#29151B",i.font="bold 24px system-ui, sans-serif",i.fillText(`✅ 今日宜：${s.yi}`,170,w+55),i.fillText(`❌ 今日忌：${s.ji}`,170,w+108),i.textAlign="center",i.fillStyle="#D97706",i.font="600 22px monospace",i.fillText(`祈愿方向：${s.catName}  |  心诚则灵 · 逢凶化吉`,540,1480);const I=document.createElement("a");I.download=`东方祈福灵签_${s.no}_${s.title}.png`,I.href=u.toDataURL("image/png"),I.click()}function P(s,u,i,S,w,b){s.beginPath(),s.moveTo(u+b,i),s.lineTo(u+S-b,i),s.arcTo(u+S,i,u+S,i+b,b),s.lineTo(u+S,i+w-b),s.arcTo(u+S,i+w,u+S-b,i+w,b),s.lineTo(u+b,i+w),s.arcTo(u,i+w,u,i+w-b,b),s.lineTo(u,i+b),s.arcTo(u,i,u+b,i,b),s.closePath()}function ce(s,u,i,S,w,b){const I=String(u).split("");let M="",D=S;for(let j=0;j<I.length;j++){const V=M+I[j];s.measureText(V).width>w&&j>0?(s.fillText(M,i,D),M=I[j],D+=b):M=V}return s.fillText(M,i,D),D+b}let fe=!1;function _(){if(fe)return;fe=!0,U(),document.querySelectorAll(".lq-cat-card").forEach(b=>{b.onclick=()=>{oe||(window.SFX&&window.SFX.tap&&window.SFX.tap(),J=b.dataset.cat,document.querySelectorAll(".lq-cat-card").forEach(I=>I.classList.toggle("active",I===b)))}});const s=document.getElementById("lqBtnShake");s&&(s.onclick=K);const u=document.getElementById("lqCylinderWrap");u&&(u.onclick=K);const i=document.getElementById("lqBtnBack");i&&(i.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),window.AppRouter&&typeof window.AppRouter.back=="function"?window.AppRouter.back(()=>B("sc-lq-home")):B("sc-lq-home")});const S=document.getElementById("lqBtnAgain");S&&(S.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),window.AppRouter&&typeof window.AppRouter.back=="function"?window.AppRouter.back(()=>B("sc-lq-home")):B("sc-lq-home")});const w=document.getElementById("lqBtnSave");w&&(w.onclick=()=>{window.SFX&&window.SFX.save&&window.SFX.save(),Q(W)}),document.querySelectorAll("[data-ew-jump]").forEach(b=>{b.onclick=null})}function T(s){_(),s&&G(s,!0)}window.AppLingqian={init:_,restore:T,startShake:K,restoreView:function(s,u){if(s==="result"&&u&&u.record){G(u.record,!0);return}B("sc-lq-home")},drawLingqianPoster:Q}})(),(function(){"use strict";const ae={east:{wx:"木",name:"青龙位，主事业上升",score:6},south:{wx:"火",name:"朱雀位，主名声口舌",score:4},west:{wx:"金",name:"白虎位，主财运竞争",score:6},north:{wx:"水",name:"玄武位，主贵人暗助",score:5},southeast:{wx:"木",name:"文昌位，主文书考试",score:7},southwest:{wx:"土",name:"坤位，主稳中有升",score:3},northwest:{wx:"金",name:"乾位，主掌权者护佑",score:7},northeast:{wx:"土",name:"艮位，主贵人少而精",score:4}},ie={window:{name:"靠窗，得天地之气，采光通风",score:12},wall:{name:"靠墙，背有靠山，坐得稳当",score:5},corridor:{name:"靠走廊，人来人往，气杂而散",score:-5},door:{name:"靠门，正冲门煞，心神易扰",score:-10}},J={none:{name:"无领导相压，自成天地（先别声张）",score:15,crush:8},diagonal:{name:"领导在斜方，既有关照又不相冲",score:8,crush:22},front:{name:"正对领导视线，言行皆被观",score:-6,crush:66},left:{name:"左青龙受压，发挥受限",score:-4,crush:48},right:{name:"右白虎抬头，竞争激烈",score:-6,crush:58},back:{name:"白虎压身，如芒在背",score:-10,crush:82}},oe={plant:{name:"正对绿植，木气生发，财也生发",score:8},water:{name:"正对饮水机，财来财去，全凭造化",score:0},camera:{name:"正对天眼，谨防漏财（以及漏摸鱼）",score:-8},coworker:{name:"前有后脑勺，口舌是非多",score:-5}},W={tree:{name:"发财树，木旺财旺",score:6},crystal:{name:"水晶镇场，尤其紫水晶",score:5},fish:{name:"鱼缸为水，财气流动",score:4},cactus:{name:"仙人掌，刺破财运",score:-6},figure:{name:"手办耗神散气",score:-3},mirror:{name:"镜子乃反光煞，工位慎放",score:-8},snack:{name:"零食破财，且易被同事瓜分",score:-2}},B=[{min:88,label:"大吉",emoji:"🌟",verdict:"此局上佳，财运事业两开花，摸鱼都不带被发现"},{min:70,label:"上吉",emoji:"☀️",verdict:"气运不错，小吉大利，宜低调发财"},{min:55,label:"中平",emoji:"🌗",verdict:"不凶不吉，全凭心态，稳住能赢"},{min:40,label:"小凶",emoji:"☁️",verdict:"此局略险，宜谨言慎行，多喝水少开会"},{min:0,label:"大凶",emoji:"⛈️",verdict:"风水堪忧，建议立刻去茶水间喝口热水压压惊"}],U=["大师掐指一算：此位风水尚可，唯独心不静则气不顺，气不顺则 KPI 难成。","本座观你工位，财气三分，贵气两分，摸鱼之气五分——属实是打工人气运。","此局为「温水煮青蛙局」，不凶不吉，全靠自己扑腾。","紫气东来？不，是雾。建议多开窗，多开窍。","你的工位磁场稳定，适合种植绿萝与梦想。","此方位宜静不宜动，宜少说话，多喝水，多微笑。","大师夜观星象，见你桌上有光，原来是屏幕没关。","风水轮流转，明天到你家——指节假日。","此位五行缺觉，建议午休时补上，此为养生大法。","你工位的气场有点飘，像极了你周五下班时的步伐。","万物皆可盘，工位亦可盘。盘顺了，运气就顺了。","大师掐指二算：你最近缺的不是风水，是准时下班。",'此局主"闷声发财"，切记：好消息先别发群里。',"你的工位与财神有缘，与加班更有缘，需自行取舍。",'玄学讲究一个"信则有"，你不信，那也得加班的。',"此位风水奇佳，前提是——别让领导看见你在看这条。"],K=["宜摸鱼，但不宜被发现","宜养一盆绿萝，假装热爱生活","宜每周五准时下班","宜在工位放一杯奶茶（财气具象化）","宜面带微笑走进会议室","宜今日不加班","宜偷偷学新技能，假装在看报表","宜喝水八杯，润泽肺腑","宜把最烦的活安排在领导不在时","宜整理桌面，断舍离","宜早上第一件事：打开周报","宜给绿植浇水，顺便给领导点赞","宜午休时关灯睡觉（养生大法）","宜把键盘敲得很有节奏感","宜在群里回复「好的」后真的去做","宜带薪如厕，排毒养颜",'宜把工位布置成"我很忙"的样子',"宜主动问一句「需要帮忙吗」（就一句）","宜把重要邮件放在早上发","宜给同事带杯咖啡（人情世故）","宜周五下午清空待办","宜少开摄像头，多开小差"],G=["忌边看手机边笑出声","忌把辞职信放在键盘上（哪怕只是草稿）","忌和同事在走廊大声聊八卦","忌用公司打印机打个人文件","忌在群里发完「收到」之前先打完这句话","忌正对领导时摸鱼","忌把仙人掌对准领导","忌周五下班前发起新需求讨论","忌在工位吃螺蛳粉","忌把聊天记录投屏","忌开会时盯着天花板叹气","忌把「不想干了」写在脸上","忌回复「随便」——尤其是在被问方案时","忌把周报写成小说","忌在领导背后翻白眼（方位风水大忌）","忌午休刷到前同事升职的朋友圈","忌摸鱼摸到忘记喝水","忌跟 AI 聊天聊到笑出声","忌把外卖单子落打印区","忌用「我听说」开头传话","忌在工位公开摆烂（暗着摆）"],Q=["左青龙，右白虎，中间坐个座山雕。","一摸鱼，二喝水，三看窗外，四不加班。","天灵灵地灵灵，老板不在这层灵。","金木水火土，工资都不补；唯有心态稳，快乐能自足。","南无喝啰怛那，摸鱼摸出花。","风水轮流转，转走的是加班，转来的是下班。","五行缺什么都可以，就是不能缺觉。","日出东方，利在四方，心之所向，准时下班。","人在工位坐，运从头顶过，稳住别浪，周末快活。","此咒念三遍：不急、不气、不加班。","财神到，财神到，老板看不见最妙。","听我一句劝：气顺了，水逆就散了。"],P=["朱砂红","玄黑","琥珀金","黛青","月白","鹅黄","竹青","绛紫","松石绿","驼色"],ce=[3,6,8,9,12,18,24,50],fe=["辣条","奶茶","薯片","坚果","凤梨酥","小饼干","鸭脖","西瓜","绿豆汤","关东煮"],_=["领导视线的正后方","茶水间方向","窗户边","打印机转角","工位隔板后","离摄像头最远的角落","走廊尽头","隔壁空工位","厕所方向（慎用）","资料柜后面"],T={木:["发财树","绿萝"],火:["红色摆件","暖色台灯"],土:["陶器摆件","陶瓷杯"],金:["铜钱摆件","金属笔筒"],水:["小鱼缸","大杯水"]};function s(l){return l[Math.floor(Math.random()*l.length)]}let u=null;function i(){const l=document.getElementById("fs-dir").value,d=document.getElementById("fs-env").value,o=document.getElementById("fs-boss").value,m=document.getElementById("fs-face").value,F=[];document.querySelectorAll("#fs-items .fs-chip.on").forEach(q=>F.push(q.getAttribute("data-v")));const A=ae[l],O=ie[d],Z=J[o],z=oe[m];let Y=55+A.score+O.score+Z.score+z.score;F.forEach(q=>{Y+=W[q]?W[q].score:0}),Y+=Math.floor(Math.random()*21)-10,Y=Math.max(3,Math.min(99,Y));const ye=B.find(q=>Y>=q.min)||B[B.length-1];let se=Z.crush+Math.floor(Math.random()*9)-4;se=Math.max(5,Math.min(96,se));const ee=[],le=[];for(;ee.length<3;){const q=s(K);ee.includes(q)||ee.push(q)}for(;le.length<3;){const q=s(G);le.includes(q)||le.push(q)}const te=T[A.wx]||["绿萝","水杯"];let re=s(te),de=s(te);if(te.length>1)for(;de===re;)de=s(te);const pe=s(P),be=s(ce),we=s(fe),me=s(_),C=s(U),ve=s(Q),H={score:Y,grade:ye,crush:se,wx:A.wx,dirName:A.name,envName:O.name,bossName:Z.name,faceName:z.name,itemNames:F.map(q=>W[q].name),fix1:re,fix2:de,luckyColor:pe,luckyNum:be,luckyFood:we,hideSpot:me,saying:C,koujue:ve,yis:ee,jis:le,ts:new Date().toLocaleString("zh-CN",{hour12:!1})};if(u=H,S(H),window.AppRouter&&typeof window.AppRouter.getState=="function"){const q=window.AppRouter.getState();q&&q.view==="result"?window.AppRouter.replaceView("result",{report:H}):window.AppRouter.pushView("result",{report:H})}return window.UniversalHistory&&window.UniversalHistory.add({module:"fengshui",title:`工位风水 · ${H.grade.emoji} ${H.grade.label} (${H.score}分)`,subtitle:H.grade.verdict,color:"#b03a2e",badge:"🧭 风水",avatar:"🧭",data:H}),H}function S(l){const d=document.getElementById("fs-report");if(!d)return;let o=`
      <div class="r-top">
        <div class="r-grade">${l.grade.emoji} ${l.grade.label}</div>
        <div class="r-verdict">${l.grade.verdict}</div>
        <div class="score-row">
          <div class="score-label"><span>工位运势指数</span><span>${l.score} / 100</span></div>
          <div class="score-bar"><div class="score-fill" style="width:${l.score}%;"></div></div>
        </div>
      </div>

      <div class="r-sec">
        <h4>🔎 五行方位与环境诊断</h4>
        <div class="r-line">
          座向属<b>${l.wx}</b>，${l.dirName}。<br>
          工位${l.envName}。<br>
          ${l.bossName}。<br>
          ${l.faceName}。
        </div>
      </div>

      <div class="r-sec">
        <h4>⚠️ 领导压迫感指数</h4>
        <div class="score-row">
          <div class="score-label"><span>压迫感强度</span><span>${l.crush}%</span></div>
          <div class="score-bar"><div class="score-fill" style="width:${l.crush}%;background:#e06a3c;"></div></div>
        </div>
      </div>

      <div class="r-sec">
        <h4>🌿 五行生旺法宝</h4>
        <div class="r-line">
          本命缺补：建议工位增添 <b>${l.fix1}</b> 或 <b>${l.fix2}</b>。<br>
          吉利方位避难所：<b>${l.hideSpot}</b>。
        </div>
      </div>

      <div class="r-sec">
        <h4>📜 今日宜忌黄历</h4>
        <div class="luck" style="margin-bottom:8px;">
          ${l.yis.map(F=>`<span style="border-color:#10b981;color:#10b981;">宜 · ${F}</span>`).join("")}
        </div>
        <div class="luck">
          ${l.jis.map(F=>`<span style="border-color:#ef4444;color:#ef4444;">忌 · ${F}</span>`).join("")}
        </div>
      </div>

      <div class="fs-quote">
        <b>💡 大师批注：</b>${l.saying}<br>
        <span style="font-size:12.5px;opacity:0.8;display:block;margin-top:6px;">口诀：${l.koujue}</span>
      </div>

      <div class="copy-row">
        <button class="copy-btn" id="fs-btn-copy">📋 复制签文</button>
        <button class="copy-btn" id="fs-btn-save">📜 保存风水签</button>
        <button class="copy-btn" id="fs-btn-again">🎲 重新推演</button>
      </div>
    `;d.innerHTML=o,w("sc-fs-result");const m=document.getElementById("fs-btn-copy");m&&(m.onclick=()=>{const F=`🧭 工位风水报告
评级：${l.grade.emoji} ${l.grade.label}（运势 ${l.score}/100）
座向：${l.wx}行 · ${l.dirName}
环境：${l.envName}
领导气场：${l.bossName}
对面景象：${l.faceName}
开运法宝：${l.fix1}、${l.fix2}
宜：${l.yis.join(" / ")}
忌：${l.jis.join(" / ")}
批注：${l.saying}
口诀：${l.koujue}`;navigator.clipboard.writeText(F).then(()=>{m.textContent="✅ 已复制",m.classList.add("done"),setTimeout(()=>{m.textContent="📋 复制签文",m.classList.remove("done")},1500)}).catch(()=>{})}),document.getElementById("fs-btn-again").onclick=()=>{window.SFX&&window.SFX.bell&&window.SFX.bell(!1),i()},document.getElementById("fs-btn-save").onclick=()=>{I(l)}}function w(l){const d=document.getElementById("mod-fengshui");if(!d)return;d.querySelectorAll(".fs-screen").forEach(m=>m.classList.remove("active"));const o=d.querySelector("#"+l);o&&(o.classList.add("active"),d.scrollTop=0)}function b(){const l=Object.keys(ae),d=Object.keys(ie),o=Object.keys(J),m=Object.keys(oe);document.getElementById("fs-dir").value=s(l),document.getElementById("fs-env").value=s(d),document.getElementById("fs-boss").value=s(o),document.getElementById("fs-face").value=s(m),document.querySelectorAll("#fs-items .fs-chip").forEach(A=>{A.classList.toggle("on",Math.random()<.35)})}function I(l){if(!l)return;const d=document.createElement("canvas");d.width=1080,d.height=1520;const o=d.getContext("2d"),m=document.documentElement.dataset.theme!=="light";o.fillStyle=m?"#191822":"#f5efe0",o.fillRect(0,0,1080,1520),o.fillStyle=m?"#23212c":"#fffdf7",o.strokeStyle=m?"rgba(212, 175, 55, 0.4)":"#e0d5bc",o.lineWidth=4,M(o,70,70,940,1380,36),o.fill(),o.stroke(),o.fillStyle=m?"#d4af37":"#b3881a",o.font="bold 30px sans-serif",o.textAlign="center",o.fillText("工位风水大师 · 掐指一算",540,160),o.fillStyle=m?"#e06a3c":"#b03a2e",o.font="bold 74px sans-serif",o.fillText(`${l.grade.emoji} ${l.grade.label}`,540,260),o.fillStyle=m?"#ece7dc":"#3a3128",o.font="30px sans-serif",o.fillText(l.grade.verdict,540,325),o.font="bold 40px sans-serif",o.fillStyle=m?"#d4af37":"#c9a227",o.fillText(`运势指数: ${l.score} / 100`,540,395),o.fillStyle=m?"#2b2837":"#f9f3e3",M(o,120,430,840,320,22),o.fill(),o.textAlign="left",o.fillStyle=m?"#ece7dc":"#3a3128",o.font="27px sans-serif",o.fillText(`座向属性：${l.wx}行 · ${l.dirName}`,160,490),o.fillText(`工位格局：${l.envName}`,160,548),o.fillText(`领导气场：${l.bossName}`,160,606),o.fillText(`对面景象：${l.faceName}`,160,664),o.fillText(`化解法宝：工位增置【${l.fix1}】或【${l.fix2}】`,160,722),o.fillStyle=m?"#2b2837":"#f9f3e3",M(o,120,775,840,230,22),o.fill(),o.fillStyle="#10b981",o.font="bold 27px sans-serif";let F=D(o,"【宜】 "+l.yis.join("  |  "),160,835,760,40);o.fillStyle="#ef4444",o.font="bold 27px sans-serif",D(o,"【忌】 "+l.jis.join("  |  "),160,F>840?F+12:935,760,40),o.fillStyle=m?"#2b2837":"#f9f3e3",M(o,120,1030,840,185,22),o.fill(),o.fillStyle=m?"#d4af37":"#b3881a",o.font="bold 26px sans-serif",o.fillText("💡 大师批注：",160,1075),o.fillStyle=m?"#c8c2d3":"#574d3f",o.font="25px sans-serif",F=D(o,l.saying,160,1118,760,36),o.fillStyle=m?"#d4af37":"#b3881a",o.font="24px sans-serif",o.fillText(`吉位避难所：${l.hideSpot}`,160,1182),o.fillStyle=m?"rgba(212, 175, 55, 0.14)":"rgba(179, 136, 26, 0.12)",o.strokeStyle=m?"#d4af37":"#c9a227",o.lineWidth=2,M(o,120,1240,840,85,18),o.fill(),o.stroke(),o.fillStyle=m?"#f1c40f":"#b03a2e",o.font="bold 28px sans-serif",o.textAlign="center",o.fillText(`口诀：${l.koujue}`,540,1293),o.fillStyle=m?"#6f697b":"#a39886",o.font="20px sans-serif",o.fillText("职场玄学纯属娱乐 · 祝诸君带薪摸鱼、步步高升",540,1385);const A=document.createElement("a");A.download=`工位风水_${l.grade.label}.png`,A.href=d.toDataURL("image/png"),A.click()}function M(l,d,o,m,F,A){l.beginPath(),l.moveTo(d+A,o),l.lineTo(d+m-A,o),l.arcTo(d+m,o,d+m,o+A,A),l.lineTo(d+m,o+F-A),l.arcTo(d+m,o+F,d+m-A,o+F,A),l.lineTo(d+A,o+F),l.arcTo(d,o+F,d,o+F-A,A),l.lineTo(d,o+A),l.arcTo(d,o,d+A,o,A),l.closePath()}function D(l,d,o,m,F,A){let O="";for(let Z=0;Z<d.length;Z++){const z=O+d[Z];l.measureText(z).width>F&&Z>0?(l.fillText(O,o,m),O=d[Z],m+=A):O=z}return l.fillText(O,o,m),m+A}function j(){document.querySelectorAll("#fs-items .fs-chip").forEach(m=>{m.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),m.classList.toggle("on")}});const l=document.getElementById("fs-go");l&&(l.onclick=()=>{window.SFX&&window.SFX.bell&&window.SFX.bell(!0),i()});const d=document.getElementById("fs-btn-back");d&&(d.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),window.AppRouter&&typeof window.AppRouter.back=="function"?window.AppRouter.back(()=>w("sc-fs-input")):w("sc-fs-input")});const o=document.getElementById("fs-random");o&&(o.onclick=()=>{window.SFX&&window.SFX.tap&&window.SFX.tap(),b()})}function V(l){if(!l)return;const d=l.reportData||l;S(d)}window.AppFengshui={init:j,genReport:i,randomize:b,restore:V,restoreView:function(l,d){if(l==="result"&&d&&d.report){S(d.report);return}w("sc-fs-input")},drawFengshuiShareCard:I}})();
