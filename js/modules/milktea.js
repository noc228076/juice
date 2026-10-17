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
    { name: "喜茶", en: "HEYTEA", logo: "assets/milktea/heytea.jpg", emoji: "🍑", color: "#26241f", drink: "多肉葡萄", desc: "你是灵感与潮流本潮。对新鲜事物永远好奇，敢试先锋口味，也愿意为品质买单——朋友圈里的种草机非你莫属。", t: { te: 2, fr: 2, tr: 3, cr: 1, sw: 1, mi: 0, bd: 0 } },
    { name: "奈雪的茶", en: "NAYUKI", logo: "assets/milktea/nayuki.jpg", emoji: "🍓", color: "#e0594e", drink: "霸气芝士草莓", desc: "你温柔又精致，生活要有仪式感。喜欢水果的鲜甜与软欧包的柔软，和你做朋友，像喝一口霸气橙子一样元气满满。", t: { fr: 3, sw: 2, mi: 2, tr: 2, cr: 1, bd: 0, te: 0 } },
    { name: "蜜雪冰城", en: "MIXUE", logo: "assets/milktea/mixue.jpg", emoji: "🍦", color: "#e03e2f", drink: "冰鲜柠檬水", desc: "你是快乐源泉本泉！性价比拉满、甜度满分，永远用最简单的快乐感染身边的人。雪王看了都想和你击掌。", t: { bd: 3, sw: 3, cr: 2, fr: 1, tr: 1, mi: 0, te: 0 } },
    { name: "一点点", en: "YiDianDian", logo: "assets/milktea/yidiandian.jpg", emoji: "🧋", color: "#247d43", drink: "波霸奶茶", desc: "你是经典派掌门人。不跟风、不折腾，波霸奶茶三分糖就是你的舒适区——稳，且永远值得信赖。", t: { mi: 2, te: 2, bd: 2, sw: 1, tr: 1, cr: 0, fr: 0 } },
    { name: "茶百道", en: "ChaBaiDao", logo: "assets/milktea/chabaidao.jpg", emoji: "🥭", color: "#1d3d8f", drink: "杨枝甘露", desc: "你随和又有自己的小讲究。芒果西米露还是杨枝甘露，你总能选到最对的那一杯，是朋友眼中靠谱的点单担当。", t: { fr: 2, mi: 2, sw: 2, bd: 2, cr: 1, te: 0, tr: 0 } },
    { name: "古茗", en: "GUMING", logo: "assets/milktea/guming.jpg", emoji: "🍇", color: "#2b2b2b", drink: "超A芝士葡萄", desc: "你踏实又有惊喜感。平时低调，关键时刻总能拿出超A表现，像芝士葡萄里那层厚厚的芝士，越品越有。", t: { fr: 2, te: 2, bd: 2, sw: 1, mi: 1, cr: 1, tr: 0 } },
    { name: "沪上阿姨", en: "AUNTEA", logo: "assets/milktea/auntea.jpg", emoji: "🍡", color: "#e4577e", drink: "血糯米奶茶", desc: "你是暖胃又暖心的人。血糯米的软糯是你的底色——实在、温暖、管饱，和你相处像冬日里的一杯热奶茶。", t: { mi: 2, te: 2, bd: 2, sw: 1, fr: 1, cr: 0, tr: 0 } },
    { name: "书亦烧仙草", en: "SHUYI", logo: "assets/milktea/shuyi.jpg", emoji: "🍮", color: "#c92a2a", drink: "书亦烧仙草", desc: "你是“半杯都是料”的实在人。给朋友的爱永远溢出来，耐心又包容，谁和你在一起都不怕饿着。", t: { mi: 2, sw: 2, bd: 2, te: 1, fr: 1, cr: 0, tr: 0 } },
    { name: "霸王茶姬", en: "CHAGEE", logo: "assets/milktea/chagee.jpg", emoji: "🏮", color: "#b3342c", drink: "伯牙绝弦", desc: "你是东方美学代言人。骨子里有国风的浪漫与大气，伯牙绝弦般的知音情谊，是你对朋友最长情的告白。", t: { te: 3, tr: 2, mi: 1, cr: 1, sw: 0, fr: 0, bd: 0 } },
    { name: "茶颜悦色", en: "Sexy Tea", logo: "assets/milktea/sexytea.jpg", emoji: "🎐", color: "#8c1d2b", drink: "幽兰拿铁", desc: "你是文艺青年本青。墨色山水、幽兰拿铁，你爱的是那一口细腻的中式浪漫，安静，却惊艳。", t: { te: 3, mi: 2, tr: 2, sw: 1, cr: 1, fr: 0, bd: 0 } },
    { name: "CoCo都可", en: "CoCo", logo: "assets/milktea/coco.jpg", emoji: "🥤", color: "#e6550d", drink: "奶茶三兄弟", desc: "你是国民好队友。奶茶三兄弟都认识你——随和、百搭、永远在线，任何局都能轻松融入。", t: { mi: 2, sw: 2, te: 1, bd: 1, cr: 1, fr: 0, tr: 0 } },
    { name: "益禾堂", en: "Yihetang", logo: "assets/milktea/yihetang.jpg", emoji: "🍵", color: "#1b7a43", drink: "益禾烤奶", desc: "你是温暖的老朋友。烤奶的焦香是你的安心感，不张扬但一喝就懂，越处越香。", t: { te: 2, bd: 2, mi: 1, sw: 1, cr: 1, fr: 0, tr: 0 } },
    { name: "甜啦啦", en: "Tianlala", logo: "assets/milktea/tianlala.jpg", emoji: "🍉", color: "#eab308", drink: "一桶水果茶", desc: "你是元气水果担当。一桶水果茶装得下你的快乐，实在又大方，和你在一起永远不缺笑声。", t: { fr: 2, bd: 2, sw: 2, cr: 1, mi: 0, te: 0, tr: 0 } },
    { name: "快乐柠檬", en: "Happy Lemon", logo: "assets/milktea/happylemon.jpg", emoji: "🍋", color: "#e8c93a", drink: "柠檬霸", desc: "你是清爽系代表。酸酸甜甜、干脆利落，心情不好时你就是那杯解腻的柠檬茶，一喝就醒。", t: { cr: 2, fr: 2, sw: 1, bd: 1, te: 1, mi: 0, tr: 0 } },
    { name: "贡茶", en: "Gong Cha", logo: "assets/milktea/gongcha.jpg", emoji: "🐼", color: "#8c2320", drink: "熊猫奶盖茶", desc: "你是奶盖爱好者协会会长。层次分明是你的处世哲学——表面奶盖甜软，内里茶汤清醒。", t: { mi: 2, te: 2, tr: 1, sw: 1, cr: 0, fr: 0, bd: 0 } },
    { name: "鹿角巷", en: "The Alley", logo: "assets/milktea/thealley.jpg", emoji: "🦌", color: "#5c3f28", drink: "黑糖鹿丸鲜奶", desc: "你是颜值与内涵并存的黑糖系。看似高冷，实则甜到心里，慢热却深情，像黑糖鹿丸一样越嚼越香。", t: { mi: 2, sw: 2, tr: 2, te: 1, cr: 0, fr: 0, bd: 0 } },
    { name: "老虎堂", en: "Tiger Sugar", logo: "assets/milktea/tigersugar.jpg", emoji: "🐯", color: "#2b2118", drink: "波霸厚鲜奶", desc: "你是霸气外露的甜心。虎纹黑糖是你的态度——一眼难忘，入口惊艳，甜得堂堂正正。", t: { mi: 2, sw: 2, tr: 1, bd: 1, te: 0, cr: 0, fr: 0 } },
    { name: "一芳水果茶", en: "YiFang", logo: "assets/milktea/yifang.jpg", emoji: "🍊", color: "#b85d38", drink: "一芳水果茶", desc: "你是自然系文艺派。爱果香爱茶香，拒绝过度加工，做真实的自己，清清爽爽就很迷人。", t: { fr: 3, te: 2, cr: 2, sw: 1, mi: 0, bd: 0, tr: 0 } },
    { name: "春阳茶事", en: "Chun Yang", logo: "assets/milktea/chunyang.jpg", emoji: "🌸", color: "#991b1b", drink: "黑糖珍珠鲜奶", desc: "你是温润如玉的古早派。春阳般的柔和是你的气场，老派却讲究，淡而有味。", t: { te: 2, cr: 2, fr: 1, mi: 1, sw: 1, bd: 1, tr: 0 } },
    { name: "厝内小眷村", en: "Cuo Nei", logo: "assets/milktea/cuonei.jpg", emoji: "🏡", color: "#8c4a27", drink: "眷村奶茶", desc: "你是烟火气里的治愈者。眷村的温度、奶茶的甜糯，和你相处像回到最舒服的老家。", t: { mi: 2, sw: 2, bd: 2, te: 1, cr: 0, fr: 0, tr: 0 } },
    { name: "柠季", en: "LINLEE", logo: "assets/milktea/linlee.jpg", emoji: "🍹", color: "#4dbb00", drink: "手打柠檬茶", desc: "你是清爽利落的行动派。手打柠檬茶是你的解压神器，直接、痛快、不拖泥带水。", t: { cr: 3, fr: 2, bd: 2, te: 1, sw: 0, mi: 0, tr: 0 } },
    { name: "乐乐茶", en: "LELECHA", logo: "assets/milktea/lelecha.jpg", emoji: "🍫", color: "#d67f52", drink: "脏脏茶", desc: "你是快乐制造机。脏脏茶的放纵与草莓酪酪的甜蜜你都拿捏，和你在一起，快乐浓度超标。", t: { tr: 2, mi: 2, fr: 2, sw: 2, cr: 0, te: 0, bd: 0 } },
    { name: "7分甜", en: "7FenTian", logo: "assets/milktea/7fentian.jpg", emoji: "🥥", color: "#f2c12e", drink: "杨枝甘露", desc: "你是甜蜜刚刚好的小太阳。不齁不淡，分寸感极佳，像杨枝甘露一样层次丰富又讨喜。", t: { fr: 2, sw: 2, cr: 1, bd: 1, mi: 1, te: 0, tr: 0 } },
    { name: "茉沏", en: "Mo Qi", logo: "assets/milktea/moqi.jpg", emoji: "🌼", color: "#1d5b96", drink: "茉莉奶绿", desc: "你是清雅的白月光。茉莉奶绿般的淡香是你的签名，不争不抢，却让人念念不忘。", t: { te: 2, cr: 1, mi: 1, sw: 1, bd: 1, fr: 1, tr: 0 } },
    { name: "茶理宜世", en: "ChaLiYiShi", logo: "assets/milktea/chaliyishi.jpg", emoji: "🍁", color: "#173b31", drink: "郁郁幽兰", desc: "你是岭南风的浪漫主义者。烟火与茶香并蓄，懂传统也懂新意，像一盅暖茶，润物无声。", t: { te: 2, tr: 1, sw: 1, mi: 1, fr: 1, cr: 1, bd: 0 } },
    { name: "茶话弄", en: "ChaHuaNong", logo: "assets/milktea/chahuanong.jpg", emoji: "🎋", color: "#eb5600", drink: "桂花引", desc: "你是长安城里的闲雅客。一杯桂花引、一盏长安旧梦，你爱的是那份从容与古意。", t: { te: 2, tr: 2, cr: 1, sw: 1, mi: 1, fr: 0, bd: 0 } }
  ];

  function resolveBrandLogo(b) {
    if (!b) return '';
    const found = BRANDS.find(item => item.name === b.name || (b.en && item.en === b.en));
    if (found && found.logo) return found.logo;
    return b.logo || '';
  }

  const QS = [
    { q: "心情低落时，你最想来一杯？", opts: [
      { t: "甜到飞起的快乐水", pts: { sw: 2 } },
      { t: "清爽解腻的鲜果茶", pts: { fr: 2, cr: 1 } },
      { t: "浓郁奶香的热奶茶", pts: { mi: 2, sw: 1 } },
      { t: "醇厚回甘的原叶纯茶", pts: { te: 2, cr: 1 } }
    ] },
    { q: "点单时，你的甜度偏好？", opts: [
      { t: "全糖！快乐第一位", pts: { sw: 2, bd: 1 } },
      { t: "七分甜，温润刚好", pts: { sw: 1, mi: 1 } },
      { t: "三分微甜，果香清爽", pts: { cr: 1, fr: 1 } },
      { t: "不加糖，品原叶茶香", pts: { te: 2, cr: 1 } }
    ] },
    { q: "最爱加什么快乐小料？", opts: [
      { t: "Q弹波霸珍珠", pts: { mi: 1, sw: 1, bd: 1 } },
      { t: "多汁果肉 / 椰果 / 脆波波", pts: { fr: 2, cr: 1 } },
      { t: "绵密厚芝士奶盖", pts: { mi: 2, tr: 1 } },
      { t: "烧仙草 / 芋泥 / 双皮奶", pts: { mi: 1, bd: 2 } }
    ] },
    { q: "盛夏天最想捧在手里的是？", opts: [
      { t: "满杯鲜果雪顶冰沙", pts: { fr: 2, cr: 1 } },
      { t: "暴打香水柠檬茶", pts: { cr: 2, fr: 1 } },
      { t: "冰镇厚乳鲜奶茶", pts: { mi: 2, sw: 1 } },
      { t: "冷萃乌龙 / 茉莉纯茶", pts: { te: 2, cr: 1 } }
    ] },
    { q: "你的点单消费观更接近？", opts: [
      { t: "联名首发网红新品，贵点也冲", pts: { tr: 2 } },
      { t: "精打细算领券，性价比才是王道", pts: { bd: 2 } },
      { t: "日常大杯口粮茶，便宜大碗最香", pts: { bd: 2, sw: 1 } },
      { t: "注重原叶真果，品质值得买单", pts: { tr: 1, fr: 1, te: 1 } }
    ] },
    { q: "朋友聚会让你统一点单，你会？", opts: [
      { t: "点最新联名周边款拍照", pts: { tr: 2 } },
      { t: "点经典招牌奶茶不出错", pts: { mi: 1, te: 1, bd: 1 } },
      { t: "拼团满减大桶装大家畅饮", pts: { bd: 2 } },
      { t: "多口味鲜果茶每人一杯", pts: { fr: 2, cr: 1 } }
    ] },
    { q: "选茶饮时，第一吸引你的是？", opts: [
      { t: "包装高颜值、杯贴超好看", pts: { tr: 2 } },
      { t: "饱满果肉与清甜果香", pts: { fr: 2, sw: 1 } },
      { t: "大口冰爽解渴解腻", pts: { cr: 2, bd: 1 } },
      { t: "原叶茶汤回甘有底蕴", pts: { te: 2, cr: 1 } }
    ] },
    { q: "偏爱的茶饮店空间与氛围？", opts: [
      { t: "潮流工业风，适合打卡出片", pts: { tr: 2, cr: 1 } },
      { t: "街角档口热闹接地气", pts: { bd: 2 } },
      { t: "温馨治愈甜品风", pts: { sw: 2, mi: 1 } },
      { t: "禅意素雅新中式茶室", pts: { te: 2, tr: 1 } }
    ] },
    { q: "对当下“新中式茶饮”的看法？", opts: [
      { t: "国风原叶茶底永远的神", pts: { te: 2, tr: 1 } },
      { t: "看重真鲜奶真原叶不科技", pts: { te: 1, mi: 1 } },
      { t: "还是加料大满贯性价比高", pts: { bd: 2, sw: 1 } },
      { t: "比起茶更偏爱时令鲜果茶", pts: { fr: 2, cr: 1 } }
    ] },
    { q: "哪种生活节奏更像现在的你？", opts: [
      { t: "打卡探店尝鲜，仪式感拉满", pts: { tr: 2 } },
      { t: "甜甜蜜蜜，知足常乐的小确幸", pts: { sw: 2 } },
      { t: "佛系自洽，素简清润", pts: { te: 2, cr: 1 } },
      { t: "热气腾腾大口干饭，实在过瘾", pts: { bd: 2, sw: 1 } }
    ] },
    { q: "选择困难时，决定性因素是？", opts: [
      { t: "一眼相中的海报新品", pts: { tr: 2 } },
      { t: "回购百次的经典浓奶招牌", pts: { mi: 2, sw: 1 } },
      { t: "满减折扣最划算的实惠款", pts: { bd: 2 } },
      { t: "当天最想吃的新鲜当季水果", pts: { fr: 2, cr: 1 } }
    ] },
    { q: "你的本命饮品标签是？", opts: [
      { t: "黑糖厚乳鲜奶系", pts: { mi: 2, sw: 1 } },
      { t: "爆汁多肉鲜果茶系", pts: { fr: 2, cr: 1 } },
      { t: "清幽原叶轻乳茶 / 纯茶系", pts: { te: 2, cr: 1 } },
      { t: "芝士海盐雪顶系", pts: { mi: 2, tr: 1 } }
    ] }
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
      c.style.color = ["#e8c93a", "#eab308", "#f2c12e"].includes(b.color) ? "#291d0a" : "#fff";
      c.innerHTML = `<img class="mt-chip-logo" src="${b.logo}" alt="${b.name}" loading="lazy"><span>${b.name}</span>`;
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
      let dot = 0, bMag = 0;
      for (const t of TRAITS) {
        dot += b.t[t.k] * scores[t.k];
        bMag += b.t[t.k] * b.t[t.k];
      }
      const d = bMag > 0 ? (dot / Math.sqrt(bMag)) : dot;
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
    const mainLogo = resolveBrandLogo(b);
    const secLogo = resolveBrandLogo(second.b);
    wrap.innerHTML = `
      <div class="mt-res-badge">✨ 你的奶茶人格是 ✨</div>
      <div class="mt-res-card" id="mtResCard">
        <div class="mt-res-disc">${mainLogo ? `<img class="mt-res-logo-img" src="${mainLogo}" alt="${b.name}">` : b.emoji}</div>
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
        <div class="rd">${secLogo ? `<img class="mt-runner-logo-img" src="${secLogo}" alt="${second.b.name}">` : second.b.emoji}</div>
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

    // 保存至全所综合档案库（剥离大体积 Base64 字段，避免占用 localStorage 配额）
    if (window.UniversalHistory) {
      const liteB = { ...b, logo: '' };
      const liteSec = { ...second.b, logo: '' };
      window.UniversalHistory.add({
        module: 'milktea',
        title: `${b.name} · ${b.drink}`,
        subtitle: `契合度 ${pct}% · 第二人格: ${second.b.name}`,
        color: b.color || '#e8c96a',
        badge: '🧋 奶茶',
        avatar: b.emoji,
        data: { b: liteB, second: liteSec, pct, scores, traits: TRAITS }
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

  /* 绘制 Canvas 分享海报（内嵌真实品牌 Logo） */
  function drawMilkteaShareCard(res) {
    if (!res || !res.b) return;

    const renderPosterWithLogo = (logoImg, secLogoImg) => {
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

      // 真实品牌 Logo 圆形徽章
      ctx.save();
      ctx.beginPath();
      ctx.arc(540, 320, 92, 0, Math.PI * 2);
      ctx.closePath();
      ctx.clip();
      if (logoImg) {
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(448, 228, 184, 184);
        ctx.drawImage(logoImg, 448, 228, 184, 184);
      } else {
        ctx.fillStyle = res.b.color || '#e8c96a';
        ctx.fillRect(448, 228, 184, 184);
        ctx.fillStyle = '#FFFFFF';
        ctx.font = 'bold 64px sans-serif';
        ctx.textBaseline = 'middle';
        ctx.fillText((res.b.name || '').slice(0, 2), 540, 320);
        ctx.textBaseline = 'alphabetic';
      }
      ctx.restore();

      // 圆形金边外环
      ctx.beginPath();
      ctx.arc(540, 320, 92, 0, Math.PI * 2);
      ctx.strokeStyle = '#e8c96a';
      ctx.lineWidth = 5;
      ctx.stroke();

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

      const traitsList = res.traits || TRAITS;
      let barY = 940;
      traitsList.forEach(t => {
        const v = (res.scores && res.scores[t.k]) || 0;
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

      // 底部第二人格（带真实小 Logo）
      const secText = `第二人格：${res.second.name} · 隐藏本命：${res.second.drink}`;
      ctx.font = 'bold 24px sans-serif';
      const secTextW = ctx.measureText(secText).width;
      const totalSecW = secLogoImg ? (44 + 14 + secTextW) : secTextW;
      const startSecX = (1080 - totalSecW) / 2;

      if (secLogoImg) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(startSecX + 22, 1352, 22, 0, Math.PI * 2);
        ctx.closePath();
        ctx.clip();
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(startSecX, 1330, 44, 44);
        ctx.drawImage(secLogoImg, startSecX, 1330, 44, 44);
        ctx.restore();

        ctx.beginPath();
        ctx.arc(startSecX + 22, 1352, 22, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(232,201,106,0.6)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = isDark ? '#b9a17e' : '#8a7352';
      ctx.textAlign = 'left';
      ctx.fillText(secText, secLogoImg ? (startSecX + 58) : startSecX, 1360);

      // 下载图片
      const a = document.createElement('a');
      a.download = `奶茶人格_${res.b.name}.png`;
      a.href = cv.toDataURL('image/png');
      a.click();
    };

    const loadImgPromise = (src) => new Promise((resolve) => {
      if (!src) return resolve(null);
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => resolve(null);
      img.src = src;
    });

    Promise.all([
      loadImgPromise(resolveBrandLogo(res.b)),
      loadImgPromise(resolveBrandLogo(res.second))
    ]).then(([mainImg, secImg]) => {
      renderPosterWithLogo(mainImg, secImg);
    });
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
    const mainLogo = resolveBrandLogo(b);
    const secLogo = resolveBrandLogo(second);
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
        <div class="mt-res-disc">${mainLogo ? `<img class="mt-res-logo-img" src="${mainLogo}" alt="${b.name}">` : b.emoji}</div>
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
        <div class="rd">${secLogo ? `<img class="mt-runner-logo-img" src="${secLogo}" alt="${second.name || ''}">` : (second.emoji || '✨')}</div>
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
