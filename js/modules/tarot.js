/* =========================================================
   模块 5：赛博塔罗 (Cyber Tarot Module)
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
  const CARD_BACK = svg(`<circle cx="60" cy="60" r="42"/><circle cx="60" cy="60" r="30"/><circle cx="60" cy="60" r="16"/><path d="M60 18 V 34 M60 86 V 102 M18 60 H 34 M86 60 H 102 M30 30 L 41 41 M79 79 L 90 90 M90 30 L 79 41 M41 79 L 30 90"/><circle cx="60" cy="60" r="4" fill="#e8c96a" stroke="none"/>`);
  const ROMAN = ["0", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX", "XXI"];
  const CARDS = [
    { no: 0, name: "愚者", en: "The Fool", upKw: "新的开始 · 自由 · 冒险", up: "象征一段崭新的旅程与无限可能。放下顾虑，跟随内心，勇敢踏出第一步——但也要留意脚下的悬崖，给热情加上一点谨慎。", revKw: "鲁莽 · 逃避 · 缺乏规划", rev: "提醒你三思而后行，避免冲动行事。或许你在逃避责任，或对风险视而不见，请先看清脚下的路。" },
    { no: 1, name: "魔术师", en: "The Magician", upKw: "创造力 · 行动力 · 资源整合", up: "你拥有实现目标所需的一切资源与才能。专注与信念将助你把想法变为现实，此刻正是施展的时刻。", revKw: "欺骗 · 计划不周 · 才能被浪费", rev: "小心华而不实与自我怀疑。你可能未善用自身才能，或有人在误导你，回归本质，去伪存真。" },
    { no: 2, name: "女祭司", en: "The High Priestess", upKw: "直觉 · 智慧 · 潜意识", up: "静心聆听内心的声音。答案藏在表象之下，信任你的直觉与内在智慧，不必急于向外寻求。", revKw: "忽视直觉 · 秘密 · 肤浅", rev: "你可能忽略了重要的内在信号，或被表象蒙蔽。给自己留出独处与反思的时间，答案自会浮现。" },
    { no: 3, name: "女皇", en: "The Empress", upKw: "丰饶 · 滋养 · 创造力", up: "象征丰盛与爱的能量。关注自我关怀，让创造力自然生长，也用心滋养身边的人。", revKw: "依赖 · 停滞 · 自我忽视", rev: "你可能过度付出而忽略了自己，或创造力受阻。重新建立内在的平衡与安全感，先照顾好自己。" },
    { no: 4, name: "皇帝", en: "The Emperor", upKw: "权威 · 秩序 · 稳定", up: "建立结构与规则，以坚定而负责任的姿态掌控局面。纪律带来力量，稳扎稳打方能致远。", revKw: "固执 · 控制欲 · 僵化", rev: "过度的控制或教条会让你失去弹性。学会放下执念，倾听他人的声音，刚柔并济。" },
    { no: 5, name: "教皇", en: "The Hierophant", upKw: "传统 · 信仰 · 导师", up: "寻求可靠的知识与指引。遵循既定规范，或向值得信赖的长者请教，智慧在传承中发光。", revKw: "教条 · 质疑 · 反叛", rev: "你开始质疑旧有的规则与权威。打破束缚、找到属于自己的信念，正是成长的开始。" },
    { no: 6, name: "恋人", en: "The Lovers", upKw: "爱 · 联结 · 选择", up: "象征深刻的联结与重要的抉择。听从内心，让爱与真诚指引方向，值得的选择不怕等待。", revKw: "失衡 · 分离 · 犹豫", rev: "关系或选择中出现了裂痕。检视自己的价值观，别因恐惧而逃避沟通，坦诚是最好的桥梁。" },
    { no: 7, name: "战车", en: "The Chariot", upKw: "意志 · 胜利 · 前进", up: "凭借坚定的意志与自律，你能够克服障碍、驶向胜利。方向已明，握紧缰绳向前。", revKw: "失控 · 方向迷失 · 鲁莽", rev: "或许你被外物牵着走，或方向模糊。先稳住自己，再决定往哪里去，慢即是快。" },
    { no: 8, name: "力量", en: "Strength", upKw: "勇气 · 耐心 · 内在力量", up: "真正的力量来自温柔与坚韧。以耐心驯服内心的猛兽，而非强硬对抗——柔能克刚。", revKw: "自我怀疑 · 软弱 · 压抑", rev: "你可能低估了自己，或情绪在暗中消耗你。温柔地接纳脆弱，力量会重新聚集。" },
    { no: 9, name: "隐士", en: "The Hermit", upKw: "内省 · 独处 · 寻求智慧", up: "退一步，进入安静。独处不是孤独，而是为自己点亮一盏灯，看清真正重要的东西。", revKw: "孤立 · 逃避 · 过度封闭", rev: "独处变成了隔绝。适时走出自己的洞穴，向值得信任的人伸出手。" },
    { no: 10, name: "命运之轮", en: "Wheel of Fortune", upKw: "转机 · 循环 · 好运", up: "命运的车轮正在转动，机遇随之而来。顺应变化，把握时机的节拍，顺势而为。", revKw: "停滞 · 厄运 · 抗拒变化", rev: "某些循环似乎卡住了。放下抗拒，变化的契机往往藏在转折之中。" },
    { no: 11, name: "正义", en: "Justice", upKw: "公正 · 真相 · 因果", up: "一切自有其平衡。诚实面对事实，以公平之心做出决定，问心无愧便是最好的结果。", revKw: "偏见 · 失衡 · 逃避责任", rev: "可能有失公允，或你在回避某个真相。检视自己的立场，重新校准天平。" },
    { no: 12, name: "倒吊人", en: "The Hanged Man", upKw: "换位思考 · 牺牲 · 沉淀", up: "换个角度看世界，暂时的停顿是必要的修行。放下执念，收获意想不到的洞见。", revKw: "无谓牺牲 · 拖延 · 僵持", rev: "停滞让你疲惫。审视自己是否在无谓地消耗，该放手时就放手。" },
    { no: 13, name: "死神", en: "Death", upKw: "结束 · 蜕变 · 新生", up: "一个阶段正在终结，为新生腾出空间。结束并非坏事，而是重生的开始，坦然告别。", revKw: "抗拒改变 · 停滞 · 恐惧", rev: "你紧抓着旧物不放，恐惧改变，却也让生命失去流动。允许告别，才能拥抱新的可能。" },
    { no: 14, name: "节制", en: "Temperance", upKw: "平衡 · 调和 · 中庸", up: "以耐心与温和调和极端，细水长流。现在不宜急躁，宜稳步前行，静待花开。", revKw: "失衡 · 过度 · 急躁", rev: "生活失去平衡，或情绪过载。慢下来，找回自己的节奏与尺度，张弛有度。" },
    { no: 15, name: "恶魔", en: "The Devil", upKw: "束缚 · 欲望 · 诱惑", up: "觉察那些无形的束缚——欲望、执念或依赖。看见它，便是挣脱的开始。", revKw: "挣脱 · 觉醒 · 重获自由", rev: "你正在挣脱枷锁，重拾主动权。阴影散去，力量回到你的手中。" },
    { no: 16, name: "高塔", en: "The Tower", upKw: "剧变 · 真相 · 崩塌", up: "旧有的结构骤然瓦解，震撼却也真实。崩塌之处，正是重建的起点，直面真相。", revKw: "危机解除 · 延迟的变革", rev: "最坏的时刻或许已经过去。改变虽迟但到，别回避必要的调整。" },
    { no: 17, name: "星星", en: "The Star", upKw: "希望 · 疗愈 · 灵感", up: "风暴过后，星光重现。怀抱希望，相信未来，你许下的愿望正在路上。", revKw: "失望 · 失去信心 · 迷茫", rev: "暂时的低谷让你怀疑方向。别忘了，星光一直都在，只是被云遮住了一时。" },
    { no: 18, name: "月亮", en: "The Moon", upKw: "幻觉 · 不安 · 潜意识", up: "前路朦胧，情绪翻涌。此时不宜轻信表象，静待云雾散去，再做判断。", revKw: "真相浮现 · 疑虑消解", rev: "迷雾正在散去，看清真相的时刻临近。内心的不安将逐渐平复，请再耐心一点。" },
    { no: 19, name: "太阳", en: "The Sun", upKw: "成功 · 喜悦 · 生命力", up: "阳光普照，一切明朗而丰盛。这是充满活力与成就的时刻，尽情绽放你的光彩。", revKw: "短暂阴云 · 乐观过度", rev: "热情稍减或计划延迟，但太阳从未消失。调整心态，光明就在云层之后。"},
    { no: 20, name: "审判", en: "Judgement", upKw: "觉醒 · 复盘 · 新生", up: "往事被重新审视，你听见内心的召唤。宽恕与复盘之后，迎来崭新的篇章。", revKw: "自我怀疑 · 逃避回顾", rev: "你或许不愿面对过去。但唯有诚实回望，才能真正向前，和解从接纳开始。" },
    { no: 21, name: "世界", en: "The World", upKw: "圆满 · 完成 · 成就", up: "一个周期圆满落幕，你站在完整的此刻。庆祝所成，然后欣然开启新的篇章。", revKw: "未竟之事 · 停滞收尾", rev: "还差最后一口气。别让细节与犹豫拖住圆满，完成它，才能抵达下一程。" }
  ];

  let curSpread = "one"; // "one" | "three"
  let deck = [];
  let picks = [];
  let revIdx = 0;
  let lastTarotResult = null;

  const POS3 = ["过去", "现在", "未来"];
  const POS1 = ["今日指引"];

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
    }, 700);
  }

  function bindDeckEvents() {
    const max = curSpread === "one" ? 1 : 3;
    picks = [];
    updatePickState();
    document.querySelectorAll('#trDeck .pcard').forEach(c => {
      c.onclick = () => {
        const i = +c.dataset.i;
        if (picks.includes(i)) {
          picks = picks.filter(x => x !== i);
          c.classList.remove('picked');
        } else {
          if (picks.length >= max) return;
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          picks.push(i);
          c.classList.add('picked');
        }
        updatePickState();
      };
    });
  }

  function updatePickState() {
    const max = curSpread === "one" ? 1 : 3;
    const btn = document.getElementById('trBtnReveal');
    const hint = document.getElementById('trPickHint');
    if (btn) btn.disabled = picks.length !== max;
    if (hint) {
      hint.textContent = picks.length === max ?
        `已选好 ${picks.length} 张牌，请点击「解牌」` :
        `请选择 ${max} 张牌 (已选 ${picks.length}/${max})`;
    }
  }

  function startReveal() {
    revIdx = 0;
    showScreen('sc-tr-reveal');
    showCardInReveal();
  }

  function showCardInReveal() {
    const cardData = deck[picks[revIdx]];
    const posList = curSpread === "one" ? POS1 : POS3;
    const pos = posList[revIdx];

    const bigCard = document.getElementById('trBigCard');
    const fback = document.getElementById('trFback');
    const face = document.getElementById('trFace');
    const reading = document.getElementById('trReading');

    bigCard.classList.remove('flipped');
    reading.style.opacity = '0';

    fback.innerHTML = CARD_BACK;
    const svgCode = S[cardData.no] || `<circle cx="60" cy="60" r="30"/>`;
    face.innerHTML = `
      <div class="num">${ROMAN[cardData.no]}</div>
      <div class="emblem" style="${cardData.isRev ? 'transform:rotate(180deg);' : ''}">${svg(svgCode)}</div>
      <div class="nm">
        <b>${cardData.name}</b>
        <span>${cardData.en}</span>
      </div>
    `;

    document.getElementById('rvPos').textContent = pos;
    const badge = document.getElementById('rvBadge');
    badge.className = `badge ${cardData.isRev ? 'rev' : 'up'}`;
    badge.textContent = cardData.isRev ? '逆 位' : '正 位';
    document.getElementById('rvName').textContent = cardData.name;
    document.getElementById('rvKw').textContent = cardData.isRev ? cardData.revKw : cardData.upKw;
    document.getElementById('rvTxt').textContent = cardData.isRev ? cardData.rev : cardData.up;

    const prevBtn = document.getElementById('trRvPrev');
    const nextBtn = document.getElementById('trRvNext');
    prevBtn.style.display = revIdx > 0 ? 'inline-flex' : 'none';
    nextBtn.textContent = revIdx === picks.length - 1 ? '查看完整解读' : '下一张牌';

    // 翻转动效
    setTimeout(() => {
      if (window.SFX && window.SFX.tarotFlip) window.SFX.tarotFlip();
      bigCard.classList.add('flipped');
      setTimeout(() => {
        reading.style.opacity = '1';
        if (window.SFX && window.SFX.tarotReveal) window.SFX.tarotReveal();
      }, 400);
    }, 250);
  }

  function finish() {
    if (window.SFX && window.SFX.tarotDone) window.SFX.tarotDone();
    showScreen('sc-tr-result');

    const posList = curSpread === "one" ? POS1 : POS3;
    const items = picks.map((pIdx, i) => {
      const c = deck[pIdx];
      return {
        pos: posList[i],
        card: c,
        kw: c.isRev ? c.revKw : c.upKw,
        txt: c.isRev ? c.rev : c.up
      };
    });

    const summaryBox = document.getElementById('trSummaryBox');
    const resultList = document.getElementById('trResultList');

    if (curSpread === 'one') {
      const item = items[0];
      const c = item.card;
      const svgCode = S[c.no] || `<circle cx="60" cy="60" r="30"/>`;

      if (summaryBox) {
        summaryBox.innerHTML = `
          <div class="tr-summary-header">
            <span class="tr-summary-pill">✦ 今日指引</span>
            <h3>【${c.name}】· ${c.isRev ? '<span style="color:#f87171">逆位</span>' : '<span style="color:#34d399">正位</span>'}</h3>
            <p class="tr-summary-lead">${item.kw}</p>
          </div>
        `;
      }

      if (resultList) {
        resultList.className = 'result-list is-single';
        resultList.innerHTML = `
          <div class="tr-single-hero">
            <div class="tr-card-frame ${c.isRev ? 'is-rev' : ''}">
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
            </div>

            <div class="tr-single-info">
              <div class="tr-info-badge-row">
                <span class="tr-tag-pos">${item.pos}</span>
                <span class="tr-tag-status ${c.isRev ? 'rev' : 'up'}">${c.isRev ? '逆位 · 阻滞与向内探索' : '正位 · 顺畅与能量显现'}</span>
              </div>
              <h2 class="tr-info-title">${c.name} <small>(${c.en})</small></h2>
              <div class="tr-info-kw">
                <span class="tr-kw-label">🔑 核心指引：</span>
                <strong>${item.kw}</strong>
              </div>
              <div class="tr-info-desc">
                <div class="tr-desc-title">📜 牌意启示解读</div>
                <p>${item.txt}</p>
              </div>
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
            <span class="tr-summary-pill">✦ 三牌圣坛时间流</span>
            <h3>过去 · 现在 · 未来 深度推演</h3>
            <p class="tr-summary-lead">过去奠定基石，现在直面抉择，未来指示走向</p>
          </div>
        `;
      }

      if (resultList) {
        resultList.className = 'result-list is-three';
        let h = '';
        const timeMetaList = [
          { label: '过去 · 渊源与因果', icon: '🕰️', cls: 'past' },
          { label: '现在 · 当下与焦点', icon: '⚡', cls: 'present' },
          { label: '未来 · 启示与走向', icon: '🔮', cls: 'future' }
        ];

        items.forEach((it, idx) => {
          const c = it.card;
          const meta = timeMetaList[idx] || { label: it.pos, icon: '✦', cls: 'past' };
          const svgCode = S[c.no] || `<circle cx="60" cy="60" r="30"/>`;
          h += `
            <div class="tr-trio-card ${meta.cls}">
              <div class="tr-trio-header">
                <span class="tr-time-tag">${meta.icon} ${meta.label}</span>
              </div>
              
              <div class="tr-card-frame sm ${c.isRev ? 'is-rev' : ''}">
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
              </div>

              <div class="tr-trio-body">
                <div class="tr-trio-title-row">
                  <span class="tr-tag-status ${c.isRev ? 'rev' : 'up'}">${c.isRev ? '逆位' : '正位'}</span>
                  <h4>${c.name}</h4>
                </div>
                <div class="tr-trio-kw">${it.kw}</div>
                <div class="tr-trio-desc">${it.txt}</div>
              </div>
            </div>
          `;
        });
        resultList.innerHTML = h;
      }
    }

    lastTarotResult = { spread: curSpread, items };

    // 保存至全所综合档案库
    if (window.UniversalHistory) {
      const mainCard = items[0].card;
      window.UniversalHistory.add({
        module: 'tarot',
        title: `赛博塔罗 · ${mainCard.name} (${mainCard.isRev ? '逆位' : '正位'})`,
        subtitle: `${curSpread === 'one' ? '单张指引' : '三牌时间流'} · ${items[0].kw}`,
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
        startTest();
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
    shuffleDeck();
    buildDeck();
    showScreen('sc-tr-pick');
    startShuffle();
  }

  function drawTarotShareCard(data) {
    if (!data) return;
    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = 1520;
    const ctx = cv.getContext('2d');
    const isDark = document.documentElement.dataset.theme !== 'light';

    ctx.fillStyle = isDark ? '#12102a' : '#f4efe4';
    ctx.fillRect(0, 0, 1080, 1520);

    ctx.fillStyle = isDark ? '#1e1845' : '#fffdf6';
    ctx.strokeStyle = isDark ? 'rgba(232,201,106,0.35)' : 'rgba(154,116,32,0.35)';
    ctx.lineWidth = 4;
    roundRect(ctx, 80, 80, 920, 1360, 40);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#e8c96a';
    ctx.font = 'bold 34px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('赛博塔罗 · 命运启示', 540, 180);

    const first = data.items[0];
    ctx.font = 'bold 64px Georgia, serif';
    ctx.fillText(`${first.card.name} · ${first.card.isRev ? '逆位' : '正位'}`, 540, 280);

    ctx.font = '28px sans-serif';
    ctx.fillStyle = isDark ? '#a99fd4' : '#8a7a58';
    ctx.fillText(first.kw, 540, 340);

    let topY = 410;
    data.items.forEach(it => {
      ctx.fillStyle = isDark ? '#2a2160' : '#f6edd8';
      roundRect(ctx, 140, topY, 800, 240, 20);
      ctx.fill();

      ctx.textAlign = 'left';
      ctx.fillStyle = '#e8c96a';
      ctx.font = 'bold 30px sans-serif';
      ctx.fillText(`${it.pos} · ${it.card.name} (${it.card.isRev ? '逆位' : '正位'})`, 180, topY + 54);

      ctx.fillStyle = isDark ? '#f2ecff' : '#3a2f1e';
      ctx.font = '24px sans-serif';
      wrapText(ctx, it.txt, 180, topY + 104, 720, 36);

      topY += 270;
    });

    const a = document.createElement('a');
    a.download = `赛博塔罗_${first.card.name}.png`;
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
  }

  function init() {
    const spOne = document.getElementById('trSpOne');
    const spThree = document.getElementById('trSpThree');
    if (spOne && spThree) {
      spOne.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        curSpread = 'one';
        spOne.classList.add('sel');
        spThree.classList.remove('sel');
      };
      spThree.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        curSpread = 'three';
        spThree.classList.add('sel');
        spOne.classList.remove('sel');
      };
    }

    const btnStart = document.getElementById('trBtnStart');
    if (btnStart) {
      btnStart.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startTest();
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
        if (revIdx > 0) {
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
        showScreen('sc-tr-pick');
      };
    }

    const btnBackResult = document.getElementById('trBtnBackResult');
    if (btnBackResult) {
      btnBackResult.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        showScreen('sc-tr-home');
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
