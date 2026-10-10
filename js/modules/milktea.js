/* =========================================================
   模块 2：奶茶人格 (Milktea Personality Module)
   26 大主流茶饮品牌 × 7 维向量性格匹配
   ========================================================= */

(function () {
  'use strict';

  const TRAITS = [
    { k: 'sw', n: '甜度', e: '🍬' },
    { k: 'cr', n: '清爽', e: '🧊' },
    { k: 'fr', n: '果香', e: '🍓' },
    { k: 'te', n: '醇茶', e: '🍵' },
    { k: 'mi', n: '浓奶', e: '🥛' },
    { k: 'tr', n: '潮玩', e: '✨' },
    { k: 'bd', n: '平价', e: '💰' }
  ];

  const BRANDS = [
    { name: "喜茶", en: "HEYTEA", emoji: "🍑", color: "#26241f", drink: "多肉葡萄", desc: "你是灵感与潮流本潮。对新鲜事物永远好奇，敢试先锋口味，也愿意为品质买单——朋友圈里的种草机非你莫属。", t: { te: 2, fr: 2, tr: 3, cr: 1, sw: 1, mi: 0, bd: 0 } },
    { name: "奈雪的茶", en: "NAYUKI", emoji: "🍓", color: "#e0594e", drink: "霸气芝士草莓", desc: "你温柔又精致，生活要有仪式感。喜欢水果的鲜甜与软欧包的柔软，和你做朋友，像喝一口霸气橙子一样元气满满。", t: { fr: 3, sw: 2, mi: 2, tr: 2, cr: 1, bd: 0, te: 0 } },
    { name: "蜜雪冰城", en: "MIXUE", emoji: "🍦", color: "#e03e2f", drink: "冰鲜柠檬水", desc: "你是快乐源泉本泉！性价比拉满、甜度满分，永远用最简单的快乐感染身边的人。雪王看了都想和你击掌。", t: { bd: 3, sw: 3, cr: 2, fr: 1, tr: 1, mi: 0, te: 0 } },
    { name: "一点点", en: "YiDianDian", emoji: "🧋", color: "#8a6d3b", drink: "波霸奶茶", desc: "你是经典派掌门人。不跟风、不折腾，波霸奶茶三分糖就是你的舒适区——稳，且永远值得信赖。", t: { mi: 2, te: 2, bd: 2, sw: 1, tr: 1, cr: 0, fr: 0 } },
    { name: "茶百道", en: "ChaBaiDao", emoji: "🥭", color: "#d97b29", drink: "杨枝甘露", desc: "你随和又有自己的小讲究。芒果西米露还是杨枝甘露，你总能选到最对的那一杯，是朋友眼中靠谱的点单担当。", t: { fr: 2, mi: 2, sw: 2, bd: 2, cr: 1, te: 0, tr: 0 } },
    { name: "古茗", en: "GUMING", emoji: "🍇", color: "#4e7a3a", drink: "超A芝士葡萄", desc: "你踏实又有惊喜感。平时低调，关键时刻总能拿出超A表现，像芝士葡萄里那层厚厚的芝士，越品越有。", t: { fr: 2, te: 2, bd: 2, sw: 1, mi: 1, cr: 1, tr: 0 } },
    { name: "沪上阿姨", en: "AUNTEA", emoji: "🍡", color: "#e4577e", drink: "血糯米奶茶", desc: "你是暖胃又暖心的人。血糯米的软糯是你的底色——实在、温暖、管饱，和你相处像冬日里的一杯热奶茶。", t: { mi: 2, te: 2, bd: 2, sw: 1, fr: 1, cr: 0, tr: 0 } },
    { name: "书亦烧仙草", en: "SHUYI", emoji: "🍮", color: "#8c5a35", drink: "书亦烧仙草", desc: "你是“半杯都是料”的实在人。给朋友的爱永远溢出来，耐心又包容，谁和你在一起都不怕饿着。", t: { mi: 2, sw: 2, bd: 2, te: 1, fr: 1, cr: 0, tr: 0 } },
    { name: "霸王茶姬", en: "BawangChaji", emoji: "🏮", color: "#b3342c", drink: "伯牙绝弦", desc: "你是东方美学代言人。骨子里有国风的浪漫与大气，伯牙绝弦般的知音情谊，是你对朋友最长情的告白。", t: { te: 3, tr: 2, mi: 1, cr: 1, sw: 0, fr: 0, bd: 0 } },
    { name: "茶颜悦色", en: "Sexy Tea", emoji: "🎐", color: "#2f6b5a", drink: "幽兰拿铁", desc: "你是文艺青年本青。墨色山水、幽兰拿铁，你爱的是那一口细腻的中式浪漫，安静，却惊艳。", t: { te: 3, mi: 2, tr: 2, sw: 1, cr: 1, fr: 0, bd: 0 } },
    { name: "CoCo都可", en: "CoCo", emoji: "🥤", color: "#f0a030", drink: "奶茶三兄弟", desc: "你是国民好队友。奶茶三兄弟都认识你——随和、百搭、永远在线，任何局都能轻松融入。", t: { mi: 2, sw: 2, te: 1, bd: 1, cr: 1, fr: 0, tr: 0 } },
    { name: "益禾堂", en: "Yihetang", emoji: "🍵", color: "#c98a3d", drink: "益禾烤奶", desc: "你是温暖的老朋友。烤奶的焦香是你的安心感，不张扬但一喝就懂，越处越香。", t: { te: 2, bd: 2, mi: 1, sw: 1, cr: 1, fr: 0, tr: 0 } },
    { name: "甜啦啦", en: "Tianlala", emoji: "🍉", color: "#ef7c4f", drink: "一桶水果茶", desc: "你是元气水果担当。一桶水果茶装得下你的快乐，实在又大方，和你在一起永远不缺笑声。", t: { fr: 2, bd: 2, sw: 2, cr: 1, mi: 0, te: 0, tr: 0 } },
    { name: "快乐柠檬", en: "Happy Lemon", emoji: "🍋", color: "#e8c93a", drink: "柠檬霸", desc: "你是清爽系代表。酸酸甜甜、干脆利落，心情不好时你就是那杯解腻的柠檬茶，一喝就醒。", t: { cr: 2, fr: 2, sw: 1, bd: 1, te: 1, mi: 0, tr: 0 } },
    { name: "贡茶", en: "Gong Cha", emoji: "🐼", color: "#8a6b45", drink: "熊猫奶盖茶", desc: "你是奶盖爱好者协会会长。层次分明是你的处世哲学——表面奶盖甜软，内里茶汤清醒。", t: { mi: 2, te: 2, tr: 1, sw: 1, cr: 0, fr: 0, bd: 0 } },
    { name: "鹿角巷", en: "The Alley", emoji: "🦌", color: "#5c3f28", drink: "黑糖鹿丸鲜奶", desc: "你是颜值与内涵并存的黑糖系。看似高冷，实则甜到心里，慢热却深情，像黑糖鹿丸一样越嚼越香。", t: { mi: 2, sw: 2, tr: 2, te: 1, cr: 0, fr: 0, bd: 0 } },
    { name: "老虎堂", en: "Tiger Sugar", emoji: "🐯", color: "#b06a33", drink: "波霸厚鲜奶", desc: "你是霸气外露的甜心。虎纹黑糖是你的态度——一眼难忘，入口惊艳，甜得堂堂正正。", t: { mi: 2, sw: 2, tr: 1, bd: 1, te: 0, cr: 0, fr: 0 } },
    { name: "一芳水果茶", en: "YiFang", emoji: "🍊", color: "#d9794a", drink: "一芳水果茶", desc: "你是自然系文艺派。爱果香爱茶香，拒绝过度加工，做真实的自己，清清爽爽就很迷人。", t: { fr: 3, te: 2, cr: 2, sw: 1, mi: 0, bd: 0, tr: 0 } },
    { name: "春阳茶事", en: "Chun Yang", emoji: "🌸", color: "#6f9e4f", drink: "黑糖珍珠鲜奶", desc: "你是温润如玉的古早派。春阳般的柔和是你的气场，老派却讲究，淡而有味。", t: { te: 2, cr: 2, fr: 1, mi: 1, sw: 1, bd: 1, tr: 0 } },
    { name: "厝内小眷村", en: "Cuo Nei", emoji: "🏡", color: "#7d5f45", drink: "眷村奶茶", desc: "你是烟火气里的治愈者。眷村的温度、奶茶的甜糯，和你相处像回到最舒服的老家。", t: { mi: 2, sw: 2, bd: 2, te: 1, cr: 0, fr: 0, tr: 0 } },
    { name: "柠季", en: "LINLEE", emoji: "🍹", color: "#86bf2e", drink: "手打柠檬茶", desc: "你是清爽利落的行动派。手打柠檬茶是你的解压神器，直接、痛快、不拖泥带水。", t: { cr: 3, fr: 2, bd: 2, te: 1, sw: 0, mi: 0, tr: 0 } },
    { name: "乐乐茶", en: "LeLe Cha", emoji: "🍫", color: "#e79aa8", drink: "脏脏茶", desc: "你是快乐制造机。脏脏茶的放纵与草莓酪酪的甜蜜你都拿捏，和你在一起，快乐浓度超标。", t: { tr: 2, mi: 2, fr: 2, sw: 2, cr: 0, te: 0, bd: 0 } },
    { name: "7分甜", en: "7FenTian", emoji: "🥥", color: "#f2a33c", drink: "杨枝甘露", desc: "你是甜蜜刚刚好的小太阳。不齁不淡，分寸感极佳，像杨枝甘露一样层次丰富又讨喜。", t: { fr: 2, sw: 2, cr: 1, bd: 1, mi: 1, te: 0, tr: 0 } },
    { name: "茉沏", en: "Mo Qi", emoji: "🌼", color: "#7fb8b0", drink: "茉莉奶绿", desc: "你是清雅的白月光。茉莉奶绿般的淡香是你的签名，不争不抢，却让人念念不忘。", t: { te: 2, cr: 1, mi: 1, sw: 1, bd: 1, fr: 1, tr: 0 } },
    { name: "茶理宜世", en: "ChaLiYiShi", emoji: "🍁", color: "#b5654a", drink: "郁郁幽兰", desc: "你是岭南风的浪漫主义者。烟火与茶香并蓄，懂传统也懂新意，像一盅暖茶，润物无声。", t: { te: 2, tr: 1, sw: 1, mi: 1, fr: 1, cr: 1, bd: 0 } },
    { name: "茶话弄", en: "ChaHuaNong", emoji: "🎋", color: "#9c7a4a", drink: "桂花引", desc: "你是长安城里的闲雅客。一杯桂花引、一盏长安旧梦，你爱的是那份从容与古意。", t: { te: 2, tr: 2, cr: 1, sw: 1, mi: 1, fr: 0, bd: 0 } }
  ];

  const QS = [
    { q: "心情低落时，你最想来一杯？", opts: [{ t: "甜到飞起的快乐水", pts: { sw: 2 } }, { t: "清爽解腻的果茶", pts: { cr: 2, fr: 1 } }, { t: "浓郁奶香的热奶茶", pts: { mi: 2 } }, { t: "醇厚回甘的好茶", pts: { te: 2 } }] },
    { q: "点单时，你的甜度选择？", opts: [{ t: "全糖！快乐至上", pts: { sw: 2 } }, { t: "七分甜刚刚好", pts: { sw: 1, mi: 1 } }, { t: "三分微甜更清爽", pts: { cr: 1, te: 1 } }, { t: "无糖，喝茶本身", pts: { te: 2, cr: 1 } }] },
    { q: "最爱加什么小料？", opts: [{ t: "波霸珍珠", pts: { mi: 1, sw: 1 } }, { t: "椰果 / 蒟蒻 / 水晶", pts: { cr: 1, fr: 1 } }, { t: "芝士奶盖", pts: { mi: 2, tr: 1 } }, { t: "烧仙草 / 芋圆 / 布丁", pts: { mi: 1, sw: 1, bd: 1 } }] },
    { q: "夏天你最想喝什么？", opts: [{ t: "冰沙果饮", pts: { cr: 2, fr: 1 } }, { t: "手打柠檬茶", pts: { cr: 2, fr: 1 } }, { t: "冰鲜奶 / 奶昔", pts: { mi: 2 } }, { t: "冷萃纯茶", pts: { te: 2, cr: 1 } }] },
    { q: "你的点单预算观？", opts: [{ t: "为喜欢的新品，贵点也行", pts: { tr: 2 } }, { t: "精打细算，性价比王道", pts: { bd: 2 } }, { t: "日常口粮要便宜大碗", pts: { bd: 2, sw: 1 } }, { t: "品质优先，值得就好", pts: { tr: 1, te: 1, fr: 1 } }] },
    { q: "朋友聚会让你点单，你会？", opts: [{ t: "抢鲜网红新品", pts: { tr: 2 } }, { t: "经典招牌稳稳的", pts: { mi: 1, te: 1 } }, { t: "量大管饱一起喝", pts: { bd: 2 } }, { t: "清爽解腻水果茶", pts: { fr: 2, cr: 1 } }] },
    { q: "选奶茶，你最看重什么？", opts: [{ t: "颜值高能出片", pts: { tr: 2 } }, { t: "口感层次丰富", pts: { mi: 1, te: 1, sw: 1 } }, { t: "解渴解腻一杯爽", pts: { cr: 2, fr: 1 } }, { t: "茶香回甘有底蕴", pts: { te: 2 } }] },
    { q: "你偏爱哪种奶茶店氛围？", opts: [{ t: "极简设计感", pts: { tr: 2, te: 1 } }, { t: "热闹接地气", pts: { bd: 2 } }, { t: "治愈可爱风", pts: { sw: 2 } }, { t: "新中式国风", pts: { te: 2, tr: 1 } }] },
    { q: "对“新中式”茶饮怎么看？", opts: [{ t: "国风永远的神", pts: { te: 2, tr: 1 } }, { t: "偶尔来一杯尝鲜", pts: { te: 1 } }, { t: "还是老味道亲切", pts: { mi: 1, bd: 1 } }, { t: "水果茶更合我意", pts: { fr: 2 } }] },
    { q: "哪种生活状态更像你？", opts: [{ t: "精致探店，仪式感拉满", pts: { tr: 2 } }, { t: "甜甜蜜蜜的小确幸", pts: { sw: 2 } }, { t: "佛系养生，恬淡自洽", pts: { te: 2, cr: 1 } }, { t: "快乐干饭，热气腾腾", pts: { bd: 2 } }] },
    { q: "选择困难时，你靠什么决定？", opts: [{ t: "看颜值，好看就冲", pts: { tr: 1, sw: 1 } }, { t: "看销量和口碑", pts: { mi: 1, te: 1 } }, { t: "看价格，实惠优先", pts: { bd: 2 } }, { t: "看心情，随缘点单", pts: { cr: 1, fr: 1 } }] },
    { q: "你的本命饮品画像是？", opts: [{ t: "黑糖珍珠鲜奶系", pts: { mi: 2, sw: 1 } }, { t: "鲜果茶系", pts: { fr: 2, cr: 1 } }, { t: "纯茶 / 奶绿系", pts: { te: 2 } }, { t: "芝士 / 奶盖系", pts: { mi: 2, tr: 1 } }] }
  ];

  const LETTERS = ["A", "B", "C", "D"];
  let curQi = 0;
  let curAnswers = [];
  let autoTimer = null;
  let lastResult = null;

  function showScreen(id) {
    const root = document.getElementById('mod-milktea');
    if (!root) return;
    root.querySelectorAll('.mt-screen').forEach(s => s.classList.remove('active'));
    const target = root.querySelector('#' + id);
    if (target) {
      target.classList.add('active');
      root.scrollTop = 0;
    }
  }

  function renderChips() {
    const chipsEl = document.getElementById('mtBrandChips');
    if (!chipsEl || chipsEl.children.length > 0) return;
    BRANDS.forEach(b => {
      const c = document.createElement('span');
      c.className = 'mt-bchip';
      c.style.background = b.color;
      c.style.color = ["#e8c93a", "#86bf2e"].includes(b.color) ? "#3a2f1e" : "#fff";
      c.innerHTML = `<em>${b.emoji}</em>${b.name}`;
      chipsEl.appendChild(c);
    });
  }

  function startTest() {
    curAnswers = new Array(QS.length).fill(-1);
    curQi = 0;
    showScreen('sc-mt-quiz');
    renderQuestion();
  }

  function renderQuestion() {
    const q = QS[curQi];
    const sub = document.getElementById('mtQuizSub');
    const fill = document.getElementById('mtQbarFill');
    const card = document.getElementById('mtQcard');
    const foot = document.getElementById('mtQuizFoot');
    const nextBtn = document.getElementById('mtBtnNext');

    if (sub) sub.textContent = `第 ${curQi + 1} / ${QS.length} 题`;
    if (fill) fill.style.width = (((curQi + 1) / QS.length) * 100) + "%";

    let h = `<div class="mt-qmeta"><span>🧋 奶茶人格画像</span><span>${curQi + 1}/${QS.length}</span></div><h3>${q.q}</h3>`;
    q.opts.forEach((o, i) => {
      h += `<button class="mt-opt${curAnswers[curQi] === i ? " sel" : ""}" data-i="${i}"><span class="tag">${LETTERS[i]}</span><span>${o.t}</span></button>`;
    });
    card.innerHTML = h;

    const isLast = curQi === QS.length - 1;
    if (nextBtn) {
      nextBtn.textContent = isLast ? "查 看 结 果" : "下 一 题";
      nextBtn.disabled = true;
    }
    if (foot) {
      foot.style.display = (isLast && curAnswers[curQi] >= 0) ? "flex" : "none";
      if (isLast && curAnswers[curQi] >= 0) nextBtn.disabled = false;
    }

    card.querySelectorAll('.mt-opt').forEach(b => {
      b.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        curAnswers[curQi] = +b.dataset.i;
        card.querySelectorAll('.mt-opt').forEach(x => x.classList.remove('sel'));
        b.classList.add('sel');
        card.querySelectorAll('.mt-opt').forEach(x => x.disabled = true);

        if (isLast) {
          if (foot) foot.style.display = "flex";
          if (nextBtn) nextBtn.disabled = false;
        } else {
          autoTimer = setTimeout(() => {
            curQi++;
            renderQuestion();
          }, 320);
        }
      };
    });
  }

  function finish() {
    if (window.SFX && window.SFX.cheers) window.SFX.cheers();
    showScreen('sc-mt-result');

    const scores = {};
    for (const t of TRAITS) scores[t.k] = 0;
    QS.forEach((q, i) => {
      const a = curAnswers[i];
      if (a >= 0) {
        const o = q.opts[a];
        for (const k in o.pts) scores[k] += o.pts[k];
      }
    });

    const dots = BRANDS.map(b => {
      let d = 0;
      for (const t of TRAITS) d += b.t[t.k] * scores[t.k];
      return { b, d };
    }).sort((x, y) => y.d - x.d);

    const top = dots[0];
    const second = dots[1];
    const maxD = dots[0].d;
    const minD = dots[dots.length - 1].d;
    const pct = maxD === minD ? 88 : Math.max(55, Math.min(99, Math.round(55 + 44 * (top.d - minD) / (maxD - minD))));

    const maxP = {};
    TRAITS.forEach(t => maxP[t.k] = 0);
    QS.forEach(q => q.opts.forEach(o => {
      for (const k in o.pts) maxP[k] += o.pts[k];
    }));

    const b = top.b;
    let bars = "";
    TRAITS.forEach(t => {
      const v = scores[t.k];
      const p = maxP[t.k] || 1;
      bars += `<div class="mt-trow"><span class="lbl">${t.e} ${t.n}</span><div class="bar"><i style="width:${Math.min(100, Math.round(v / p * 100))}%"></i></div><span class="val">${v}</span></div>`;
    });

    const wrap = document.getElementById('mtResWrap');
    wrap.innerHTML = `
      <div class="mt-res-badge">✨ 你的奶茶人格是 ✨</div>
      <div class="mt-res-card" id="mtResCard">
        <div class="mt-res-disc" style="background:linear-gradient(150deg,${b.color},${b.color}cc)">${b.emoji}</div>
        <h2>${b.name}</h2>
        <div class="en">${b.en}</div>
        <div class="mt-drink-tag">招牌 · ${b.drink}</div>
        <p class="desc">${b.desc}</p>
        <div class="mt-traits">
          <div class="tt">🧬 人格七维画像 · 契合度 ${pct}%</div>
          ${bars}
        </div>
      </div>
      <div class="mt-runner">
        <div class="rd" style="background:linear-gradient(150deg,${second.b.color},${second.b.color}bb)">${second.b.emoji}</div>
        <div><b>第二人格 · ${second.b.name}</b><span>隐藏属性：${second.b.drink} 也是你的绝配灵魂饮品</span></div>
      </div>
      <div class="mt-res-foot">
        <button class="mt-btn ghost" id="mtBtnHome">返回主页</button>
        <button class="mt-btn ghost" id="mtBtnSave">保存分享海报</button>
        <button class="mt-btn" id="mtBtnAgain">再测一次</button>
      </div>
      <div class="mt-quote">快去点一杯 ${b.name} 的「${b.drink}」犒劳自己吧 🧋<br>测试结果仅供娱乐，快乐喝茶最重要～</div>
    `;

    lastResult = { b, second: second.b, pct, scores, traits: TRAITS };

    // 保存至全所综合档案库
    if (window.UniversalHistory) {
      window.UniversalHistory.add({
        module: 'milktea',
        title: `${b.name} · ${b.drink}`,
        subtitle: `契合度 ${pct}% · 第二人格: ${second.b.name}`,
        color: b.color || '#e8c96a',
        badge: '🧋 奶茶',
        avatar: b.emoji,
        data: lastResult
      });
    }

    document.getElementById('mtBtnHome').onclick = () => {
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      showScreen('sc-mt-home');
    };

    document.getElementById('mtBtnAgain').onclick = () => {
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      startTest();
    };

    document.getElementById('mtBtnSave').onclick = () => {
      drawMilkteaShareCard(lastResult);
    };
  }

  /* 绘制 Canvas 分享海报 */
  function drawMilkteaShareCard(res) {
    if (!res) return;
    const cv = document.createElement('canvas');
    cv.width = 1080;
    cv.height = 1520;
    const ctx = cv.getContext('2d');
    const isDark = document.documentElement.dataset.theme !== 'light';

    // 背景底色
    ctx.fillStyle = isDark ? '#1a120b' : '#faf3e4';
    ctx.fillRect(0, 0, 1080, 1520);

    // 装饰光晕
    const grad = ctx.createRadialGradient(540, 200, 50, 540, 400, 600);
    grad.addColorStop(0, 'rgba(232,201,106,0.22)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1080, 1520);

    // 卡片背景
    ctx.fillStyle = isDark ? '#241809' : '#fffdf6';
    ctx.strokeStyle = isDark ? 'rgba(232,201,106,0.3)' : 'rgba(154,116,32,0.35)';
    ctx.lineWidth = 4;
    roundRect(ctx, 80, 80, 920, 1360, 40);
    ctx.fill();
    ctx.stroke();

    // 顶部标头
    ctx.fillStyle = isDark ? '#b9a17e' : '#8a7352';
    ctx.font = 'bold 30px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('奶茶人格研究所 · 独家风味档案', 540, 180);

    // Emoji 图标圆形
    ctx.fillStyle = res.b.color || '#e8c96a';
    ctx.beginPath();
    ctx.arc(540, 320, 90, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = '84px sans-serif';
    ctx.fillText(res.b.emoji, 540, 350);

    // 品牌大名
    ctx.fillStyle = isDark ? '#f7ead6' : '#4a3620';
    ctx.font = 'bold 64px sans-serif';
    ctx.fillText(res.b.name, 540, 480);

    // 英文名
    ctx.fillStyle = isDark ? '#b9a17e' : '#8a7352';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(res.b.en, 540, 530);

    // 招牌饮品胶囊
    ctx.fillStyle = '#e8c96a';
    roundRect(ctx, 360, 565, 360, 54, 27);
    ctx.fill();
    ctx.fillStyle = '#241809';
    ctx.font = 'bold 30px sans-serif';
    ctx.fillText(`招牌 · ${res.b.drink}`, 540, 603);

    // 描述框
    ctx.fillStyle = isDark ? '#33230f' : '#f6ead2';
    roundRect(ctx, 140, 660, 800, 180, 24);
    ctx.fill();
    ctx.fillStyle = isDark ? '#e8c96a' : '#7a5c18';
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'left';
    wrapText(ctx, res.b.desc, 180, 725, 720, 48);

    // 7 维属性条
    ctx.fillStyle = isDark ? '#b9a17e' : '#8a7352';
    ctx.font = 'bold 28px sans-serif';
    ctx.fillText(`🧬 人格七维画像 (契合度 ${res.pct}%)`, 140, 895);

    let barY = 940;
    res.traits.forEach(t => {
      const v = res.scores[t.k];
      ctx.fillStyle = isDark ? '#b9a17e' : '#8a7352';
      ctx.font = 'bold 26px sans-serif';
      ctx.fillText(`${t.e} ${t.n}`, 140, barY + 22);

      ctx.fillStyle = isDark ? '#33230f' : '#ead9b4';
      roundRect(ctx, 280, barY, 600, 24, 12);
      ctx.fill();

      const fillW = Math.min(600, (v / 12) * 600);
      ctx.fillStyle = '#e8c96a';
      roundRect(ctx, 280, barY, fillW, 24, 12);
      ctx.fill();

      ctx.fillStyle = isDark ? '#f7ead6' : '#4a3620';
      ctx.font = 'bold 22px sans-serif';
      ctx.fillText(String(v), 900, barY + 22);
      barY += 52;
    });

    // 底部第二人格
    ctx.fillStyle = isDark ? '#8a7352' : '#b3a076';
    ctx.font = '24px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`第二人格：${res.second.emoji} ${res.second.name} · 隐藏本命：${res.second.drink}`, 540, 1360);

    // 下载图片
    const a = document.createElement('a');
    a.download = `奶茶人格_${res.b.name}.png`;
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

  // 模块初始化
  function init() {
    renderChips();
    const btnStart = document.getElementById('mtBtnStart');
    if (btnStart) {
      btnStart.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startTest();
      };
    }
    const btnBack = document.getElementById('mtBtnBackQuiz');
    if (btnBack) {
      btnBack.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (curQi > 0) {
          curQi--;
          renderQuestion();
        } else {
          showScreen('sc-mt-home');
        }
      };
    }
    const btnNext = document.getElementById('mtBtnNext');
    if (btnNext) {
      btnNext.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (curAnswers[curQi] >= 0) finish();
      };
    }
    const btnBackResult = document.getElementById('mtBtnBackHomeResult');
    if (btnBackResult) {
      btnBackResult.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        showScreen('sc-mt-home');
      };
    }
  }

  function restore(res) {
    if (!res || !res.b) return;
    lastResult = res;
    const b = res.b;
    const second = res.second || {};
    const pct = res.pct || 88;
    const scores = res.scores || {};
    let bars = "";
    TRAITS.forEach(t => {
      const v = scores[t.k] || 0;
      bars += `<div class="mt-trow"><span class="lbl">${t.e} ${t.n}</span><div class="bar"><i style="width:${Math.min(100, v * 12)}%"></i></div><span class="val">${v}</span></div>`;
    });

    const wrap = document.getElementById('mtResWrap');
    if (!wrap) return;
    wrap.innerHTML = `
      <div class="mt-res-badge">✨ 你的奶茶人格是 ✨</div>
      <div class="mt-res-card" id="mtResCard">
        <div class="mt-res-disc" style="background:linear-gradient(150deg,${b.color},${b.color}cc)">${b.emoji}</div>
        <h2>${b.name}</h2>
        <div class="en">${b.en || ''}</div>
        <div class="mt-drink-tag">招牌 · ${b.drink}</div>
        <p class="desc">${b.desc || ''}</p>
        <div class="mt-traits">
          <div class="tt">🧬 人格七维画像 · 契合度 ${pct}%</div>
          ${bars}
        </div>
      </div>
      <div class="mt-runner">
        <div class="rd" style="background:linear-gradient(150deg,${second.color || '#fff'},${second.color || '#fff'}bb)">${second.emoji || '✨'}</div>
        <div><b>第二人格 · ${second.name || '探索中'}</b><span>隐藏属性：${second.drink || ''} 也是你的绝配灵魂饮品</span></div>
      </div>
      <div class="mt-res-foot">
        <button class="mt-btn ghost" id="mtBtnHome">返回主页</button>
        <button class="mt-btn ghost" id="mtBtnSave">保存分享海报</button>
        <button class="mt-btn" id="mtBtnAgain">再测一次</button>
      </div>
      <div class="mt-quote">快去点一杯 ${b.name} 的「${b.drink}」犒劳自己吧 🧋<br>测试结果仅供娱乐，快乐喝茶最重要～</div>
    `;

    document.getElementById('mtBtnHome').onclick = () => {
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      showScreen('sc-mt-home');
    };
    document.getElementById('mtBtnAgain').onclick = () => {
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      startTest();
    };
    document.getElementById('mtBtnSave').onclick = () => {
      drawMilkteaShareCard(lastResult);
    };

    showScreen('sc-mt-result');
  }

  window.AppMilktea = {
    init,
    startTest,
    showScreen,
    finish,
    restore,
    drawMilkteaShareCard
  };
})();
