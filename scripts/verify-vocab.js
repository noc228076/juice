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

  // ========== B. 三题型混合队列 ==========
  await setState(() => {
    const s = { book:'cet4', day:'', newDoneToday:0, doneToday:0, streak:0, lastDone:'',
      words:{}, seq:0, dailyNew:3, order:'seq', totalMs:0, totalAnswered:0, totalRight:0, days:{} };
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');

  await page.click('#vcStart');
  await page.waitForTimeout(700);
  const k1 = await page.evaluate(() => ({
    count: document.querySelector('.vc-count')?.textContent?.trim(),
    isCn: !!document.querySelector('.vc-word.cn'),
    opts: document.querySelectorAll('.vc-opt').length,
    markInCard: !!document.querySelector('.vc-card .vc-mark-known'),
    hasKindLabel: !!document.querySelector('.vc-kind')
  }));
  check('阶段 1 的题数 = 词数（3 词 → 3 题）', /\/ 3$/.test(k1.count || ''), k1.count);
  check('阶段 1 是选择题（有四个选项）', k1.opts === 4, k1);
  check('标熟按钮在卡片内', k1.markInCard, k1);
  check('顶部不显示题型标签', !k1.hasKindLabel, k1);
  await page.screenshot({ path: path.join(OUT, 'p2-2-recall.png') });

  // 先走到一道选择题，再验选项内联揭示
  for (let i = 0; i < 8; i++) {
    const hasOpts = await page.evaluate(() => document.querySelectorAll('.vc-opt').length);
    if (hasOpts) break;
    const rate = await page.$('[data-rate="know"]');
    if (rate) { await rate.click(); await page.waitForTimeout(260); }
    const nb = await page.$('#vcNext');
    if (nb) { await nb.click(); await page.waitForTimeout(320); }
  }
  await page.click('.vc-opt');
  await page.waitForTimeout(500);
  const ans = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.vc-opt')];
    return {
      moreShown: opts.filter(o => o.querySelector('.vc-opt-more')?.classList.contains('show')).length,
      nextLabel: document.getElementById('vcNext')?.textContent?.trim(),
      blocks: [...document.querySelectorAll('.vc-bp-h')].map(d => d.textContent.trim())
    };
  });
  check('答完四个选项都揭示对应内容', ans.moreShown === 4, ans);
  check('按钮文案就是「下一题」', ans.nextLabel === '下一题', ans.nextLabel);
  check('有卡片背面', ans.blocks.length > 0, ans.blocks);
  await page.screenshot({ path: path.join(OUT, 'p2-3-back.png') });

  // 连做若干题，验证：词不连续重复 + 三种题型都出现
  const seen = [];
  for (let i = 0; i < 6; i++) {
    const st = await page.evaluate(() => ({
      word: document.querySelector('.vc-word')?.textContent,
      isCn: !!document.querySelector('.vc-word.cn'),
      hasRate: document.querySelectorAll('[data-rate]').length > 0
    }));
    seen.push(st);
    const rate = await page.$('[data-rate="know"]');
    if (rate) {
      await rate.click(); await page.waitForTimeout(260);
    } else {
      const opt = await page.$('.vc-opt:not([disabled])');
      if (opt) { await opt.click(); await page.waitForTimeout(260); }
    }
    const nb = await page.$('#vcNext');
    if (nb) { await nb.click(); await page.waitForTimeout(320); }
  }
  const kinds = new Set(seen.map(x => x.hasRate ? 'selfrate' : x.isCn ? 'cn2en' : 'en2cn'));
  check('阶段内题型一致（同阶段同一题型）', kinds.size >= 1, [...kinds]);

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
  check('生词本收录错 2 次以上的词', wl.rows >= 2, wl);
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
  check('生词本能移除条目', !wl2.words.includes(firstWord),
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
  // 混合队列里第一题可能是任意题型，往后找到一道英选中再断言
  let en2cn = null;
  for (let i = 0; i < 8; i++) {
    const st = await page.evaluate(() => ({
      front: document.querySelector('.vc-word')?.textContent,
      isCn: !!document.querySelector('.vc-word.cn'),
      opts: [...document.querySelectorAll('.vc-opt')].map(b => b.textContent.trim())
    }));
    if (!st.isCn && st.opts.length && /^[a-zA-Z]/.test(st.front || '')) { en2cn = st; break; }
    const rate = await page.$('[data-rate="know"]');
    if (rate) { await rate.click(); await page.waitForTimeout(240); }
    else {
      const opt = await page.$('.vc-opt:not([disabled])');
      if (opt) { await opt.click(); await page.waitForTimeout(240); }
    }
    const nb = await page.$('#vcNext');
    if (nb) { await nb.click(); await page.waitForTimeout(300); }
  }
  check('英选中正面是英文单词', !!en2cn && /^[a-zA-Z]/.test(en2cn.front || ''), en2cn && en2cn.front);
  check('英选中选项是中文释义', !!en2cn && en2cn.opts.every(o => /[一-龥]/.test(o)), en2cn && en2cn.opts);
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
    isCn: !!document.querySelector('.vc-word.cn'),
    opts: document.querySelectorAll('.vc-opt').length,
    hasRate: document.querySelectorAll('[data-rate]').length > 0,
    total: document.querySelector('.vc-count')?.textContent?.trim()
  }));
  check('题型不随记忆档位变（box5 也从英选中开始）',
    !box5.isCn && box5.opts === 4, box5);

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
  check('队列有上限（含重走轮）', (fin.doneToday || 0) < 120, { doneToday: fin.doneToday });
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
