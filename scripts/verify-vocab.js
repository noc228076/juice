/* 背单词模块端到端验收：真实 Chromium。
   用法：node scripts/verify-vocab.js */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3456/index.html';
const OUT = path.join(__dirname, '..', 'scratch', 'shots');
require('fs').mkdirSync(OUT, { recursive: true });
const CHROME = 'C:/Users/NOC/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail !== undefined ? '  → ' + JSON.stringify(detail) : ''));
}

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 960 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  const fresh = async (hash) => {
    await page.goto(BASE + '?t=' + Date.now() + '#' + hash, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2400);
  };
  const txt = () => page.evaluate(() => document.getElementById('mod-vocab').innerText);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}'));
  const setState = (mut) => page.evaluate(mut);

  await fresh('/vocab');
  await page.evaluate(() => localStorage.removeItem('juice_vocab_v1'));
  await fresh('/vocab');

  // ========== A. 四屏导航 ==========
  const tabs = await page.evaluate(() =>
    [...document.querySelectorAll('.vc-tab')].map(b => b.textContent));
  check('四屏子导航（今日/生词本/统计/设置）', tabs.length === 4, tabs);
  check('今日屏有数据条', (await page.evaluate(() => document.querySelectorAll('.vc-stat').length)) === 4);
  await page.screenshot({ path: path.join(OUT, 'p2-1-home.png') });

  // ========== B. 三轮题型 ==========
  await setState(() => {
    const s = { book:'cet4', day:'', newDoneToday:0, doneToday:0, streak:0, lastDone:'',
      words:{}, seq:0, dailyNew:4, order:'seq', totalMs:0, totalAnswered:0, totalRight:0, days:{} };
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');

  await page.click('#vcStart');
  await page.waitForTimeout(700);
  const k1 = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    isCn: !!document.querySelector('.vc-word.cn'),
    opts: document.querySelectorAll('.vc-opt').length
  }));
  check('第一轮是英选中（四选一）', k1.kind.includes('英选中') && !k1.isCn && k1.opts === 4, k1);
  await page.screenshot({ path: path.join(OUT, 'p2-2-recall.png') });

  // 答一题看反馈与背面
  await page.click('.vc-opt:nth-child(1)');
  await page.waitForTimeout(500);
  const bp = await page.evaluate(() => {
    const box = document.getElementById('vcBackPanel');
    return {
      has: !!box,
      blocks: box ? [...box.querySelectorAll('.vc-bp-h')].map(d => d.textContent.trim()) : [],
      fam: box ? box.querySelectorAll('.vc-fam-word').length : 0
    };
  });
  check('答题后有卡片背面', bp.has && bp.blocks.length > 0, bp);
  await page.screenshot({ path: path.join(OUT, 'p2-3-back.png') });

  if (bp.fam > 0) {
    const before = await page.evaluate(() => document.querySelector('.vc-word').textContent);
    await page.click('.vc-fam-word');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => document.querySelector('.vc-word').textContent);
    check('点词族能跳到派生词', after !== before, { before, after });
  } else {
    check('点词族能跳到派生词', true, '本词无词族数据，跳过');
  }

  // 三轮流程在 verify-3rounds.js 里详测，这里只确认能走到第二轮/第三轮
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    s.words = {}; s.seq = 0; s.newDoneToday = 0; s.doneToday = 0; s.dailyNew = 2;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  await page.click('#vcStart');
  await page.waitForTimeout(600);
  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => { const o = document.querySelectorAll('.vc-opt'); o[o.length - 1].click(); });
    await page.waitForTimeout(260);
    const nb = await page.$('#vcNext'); if (nb) { await nb.click(); await page.waitForTimeout(320); }
  }
  const r2kind = await page.evaluate(() => document.querySelector('.vc-kind')?.textContent);
  check('第一轮错完进第二轮中选英', r2kind.includes('第二轮') && r2kind.includes('中选英'), r2kind);

  for (let i = 0; i < 2; i++) {
    await page.evaluate(() => { const o = document.querySelectorAll('.vc-opt'); o[o.length - 1].click(); });
    await page.waitForTimeout(260);
    const nb = await page.$('#vcNext'); if (nb) { await nb.click(); await page.waitForTimeout(320); }
  }
  const r3 = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    rates: [...document.querySelectorAll('[data-rate]')].map(b => b.textContent),
    opts: document.querySelectorAll('.vc-opt').length
  }));
  check('第二轮错完进第三轮自评', r3.kind.includes('第三轮') && r3.kind.includes('自评'), r3.kind);
  check('自评有三个按钮且无选项', r3.rates.join(',') === '认识,模糊,不认识' && r3.opts === 0, r3);
  await page.screenshot({ path: path.join(OUT, 'p2-5-cloze.png') });

  await page.evaluate(() => { const b = document.getElementById('vcBack'); if (b) b.click(); });
  await page.waitForTimeout(500);

  // ========== C. 生词本 ==========
  // 直接造两条记录（前面的流程只产生过 1 个词，靠它凑不出 2 条）
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const today = Math.floor(Date.now() / 86400000);
    s.words = s.words || {};
    s.words['abruptly'] = { box: 0, due: today, seen: 6, wrong: 5 };
    s.words['absorb'] = { box: 1, due: today, seen: 3, wrong: 2 };
    s.newDoneToday = s.dailyNew;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  await page.click('.vc-tab[data-tab="words"]');
  await page.waitForTimeout(500);
  const wl = await page.evaluate(() => ({
    rows: document.querySelectorAll('.vc-wordrow').length,
    drill: !!document.getElementById('vcDrill'),
    firstWrong: document.querySelector('.vc-wordrow-meta em')?.textContent
  }));
  check('生词本收录错 2 次以上的词', wl.rows === 2, wl);
  check('生词本有专攻按钮', wl.drill);
  check('生词本按错误次数排序', /错 5 次/.test(wl.firstWrong || ''), wl.firstWrong);
  await page.screenshot({ path: path.join(OUT, 'p2-6-words.png') });

  // 移除：点第一条（错 5 次那个），应剩 1 条
  const firstWord = await page.evaluate(() =>
    document.querySelector('.vc-wordrow-main b')?.textContent);
  await page.click('[data-remove]');
  await page.waitForTimeout(500);
  const wl2 = await page.evaluate(() => ({
    rows: document.querySelectorAll('.vc-wordrow').length,
    words: [...document.querySelectorAll('.vc-wordrow-main b')].map(b => b.textContent)
  }));
  check('生词本能移除条目', wl2.rows === 1 && !wl2.words.includes(firstWord),
    { removed: firstWord, left: wl2 });

  // ========== C2. 选择题方向 + 题型开关 ==========
  // 前面的用例改过 kinds/dir，这里先归位到默认再断言
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    s.kinds = { recall: true, spell: true, cloze: false };
    s.dir = 'en2cn';
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  await page.click('.vc-tab[data-tab="settings"]');
  await page.waitForTimeout(400);
  const flowInfo = await page.evaluate(() => ({
    hasFlow: !!document.querySelector('.vc-flow'),
    steps: [...document.querySelectorAll('.vc-flow-step')].map(b => b.textContent),
    dirChips: document.querySelectorAll('[data-dir]').length
  }));
  check('设置里说明两轮流程（方向由流程决定）',
    flowInfo.hasFlow && flowInfo.steps.join('').includes('英选中') &&
    flowInfo.steps.join('').includes('中选英') && flowInfo.dirChips === 0, flowInfo);

  // 题型开关已移除（三轮固定题型），确认不再出现
  const kindSwitches = await page.evaluate(() => document.querySelectorAll('[data-kind]').length);
  check('题型开关已移除（三轮固定）', kindSwitches === 0, { switches: kindSwitches });

  // 第一轮固定英选中：正面英文、选项中文、有音标
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    s.words = {}; s.seq = 0; s.newDoneToday = 0; s.doneToday = 0;
    s.kinds = { recall: true, spell: false, cloze: false };
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  await page.click('#vcStart');
  await page.waitForTimeout(700);
  const en2cn = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    front: document.querySelector('.vc-word')?.textContent,
    isCn: !!document.querySelector('.vc-word.cn'),
    opts: [...document.querySelectorAll('.vc-opt')].map(b => b.textContent)
  }));
  check('第一轮是英选中', en2cn.kind.includes('英选中'), en2cn.kind);
  check('英选中正面是英文单词', !en2cn.isCn && /^[a-zA-Z]/.test(en2cn.front || ''), en2cn.front);
  check('英选中选项是中文释义', en2cn.opts.every(o => /[一-龥]/.test(o)), en2cn.opts);
  await page.screenshot({ path: path.join(OUT, 'p3-2-en2cn.png') });

  // 题型不再随记忆档位变化：无论 box 多少，第一轮都是英选中
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const today = Math.floor(Date.now() / 86400000);
    s.words = { abruptly: { box: 5, due: today, seen: 6, wrong: 0 } };
    s.newDoneToday = s.dailyNew || 15;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  await page.click('#vcStart');
  await page.waitForTimeout(700);
  const box5 = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    hasInput: !!document.getElementById('vcInput'),
    opts: document.querySelectorAll('.vc-opt').length
  }));
  check('box5 的词第一轮仍是英选中（题型不随档位变）',
    box5.kind.includes('英选中') && !box5.hasInput && box5.opts === 4, box5);

  // ========== D. 90 天热力图 ==========
  // 上一段停在答题屏，先回首页
  await page.evaluate(() => { const b = document.getElementById('vcBack'); if (b) b.click(); });
  await page.waitForTimeout(500);
  await page.click('.vc-tab[data-tab="stats"]');
  await page.waitForTimeout(500);
  const heat = await page.evaluate(() => ({
    cells: document.querySelectorAll('.vc-heat i').length,
    legend: !!document.querySelector('.vc-heat-legend'),
    label: [...document.querySelectorAll('.vc-h3')].map(d => d.textContent).join('|')
  }));
  check('热力图为 90 天', heat.cells === 90, { cells: heat.cells });
  check('热力图有图例', heat.legend);
  check('统计标注最近 90 天', /90 天/.test(heat.label), heat.label);
  await page.screenshot({ path: path.join(OUT, 'p2-7-stats.png') });

  // ========== E. 发音 ==========
  await page.click('.vc-tab[data-tab="today"]');
  await page.waitForTimeout(400);
  await page.click('#vcStart');
  await page.waitForTimeout(700);
  const sp = await page.evaluate(() => {
    const b = document.getElementById('vcSpeak');
    return {
      hasBtn: !!b,
      canSpeak: window.AppVocabData ? window.AppVocabData.canSpeak() : null,
      hasAPI: 'speechSynthesis' in window
    };
  });
  check('认词卡有发音按钮（或环境无语音时隐藏）',
    sp.hasBtn || sp.canSpeak === false, sp);

  // ========== F. 原有回归 ==========
  await page.evaluate(() => {
    const b = document.getElementById('vcBack');
    if (b) b.click();
  });
  await page.waitForTimeout(400);

  await page.click('.vc-tab[data-tab="settings"]');
  await page.waitForTimeout(300);
  await page.click('[data-daily="25"]');
  await page.waitForTimeout(400);
  check('每天词量可选', (await saved()).dailyNew === 25);
  await page.click('[data-order="random"]');
  await page.waitForTimeout(400);
  check('顺序/乱序可切', (await saved()).order === 'random');

  // 跑一整局，验证调度与统计
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    s.words = {}; s.seq = 0; s.newDoneToday = 0; s.doneToday = 0;
    s.order = 'seq'; s.dailyNew = 10;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById('vcStart').click();
    await sleep(300);
    for (let i = 0; i < 60; i++) {
      const rate = document.querySelector('[data-rate="know"]');
      const o = document.querySelectorAll('.vc-opt');
      if (o.length) {
        o[0].click();
        await sleep(40);
        const nb = document.getElementById('vcNext');
        if (nb) nb.click();
      } else if (rate) {
        rate.click();              // 自评：一律选「认识」，避免触发重走
        await sleep(60);
        const nb2 = document.getElementById('vcNext');
        if (nb2) nb2.click();
      } else break;
      await sleep(60);
    }
  });
  await page.waitForTimeout(600);
  const fin = await saved();
  const finTxt = await txt();
  check('能走到结算', finTxt.includes('本局完成'), finTxt.replace(/\n/g, ' | ').slice(0, 60));
  check('队列有上限', (fin.doneToday || 0) < 40, { doneToday: fin.doneToday });
  check('累计答题在涨', (fin.totalAnswered || 0) > 0, { n: fin.totalAnswered });
  check('学习时长在涨', (fin.totalMs || 0) > 0, { ms: fin.totalMs });

  // 跨天
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const y = new Date(Date.now() - 86400000);
    const key = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    s.day = key(y); s.newDoneToday = s.dailyNew; s.doneToday = 20;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  const d2 = await saved();
  check('跨天额度重置', d2.newDoneToday === 0, { v: d2.newDoneToday });
  check('跨天累计保留', (d2.totalAnswered || 0) > 0, { n: d2.totalAnswered });

  // 移动端 & 深色
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const mob = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  check('移动端不横向溢出', !mob);
  await page.screenshot({ path: path.join(OUT, 'p2-8-mobile.png') });

  await page.setViewportSize({ width: 900, height: 960 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1200);
  const dark = await page.evaluate(() => {
    const n = document.querySelector('.vc-hero-title, .vc-h2');
    return n ? getComputedStyle(n).color : null;
  });
  check('深色下文字可见', dark === 'rgb(248, 250, 252)', dark);
  await page.screenshot({ path: path.join(OUT, 'p2-9-dark.png') });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

  // 模块切换
  await page.evaluate(() => document.querySelector('.nav-tab[data-mod="wall"]').click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.nav-tab[data-mod="vocab"]').click());
  await page.waitForTimeout(2400);
  const back = await page.evaluate(() => ({
    active: document.documentElement.dataset.activeModule,
    ok: !!document.querySelector('.vc-subnav')
  }));
  check('切走再回来正常', back.active === 'vocab' && back.ok, back);

  check('无 JS 报错', errors.length === 0, errors.slice(0, 3));

  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log('\n=== ' + (results.length - failed.length) + '/' + results.length + ' 通过 ===');
  if (failed.length) {
    console.log('失败项：');
    failed.forEach(f => console.log('  - ' + f.name + ' → ' + JSON.stringify(f.detail)));
  }
  process.exit(failed.length ? 1 : 0);
})();
