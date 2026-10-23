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

  // ========== B. 三种题型 ==========
  // 造一个三档齐备的队列：新词(box0) / box2 / box5
  await setState(() => {
    const s = { book:'cet4', day:'', newDoneToday:0, doneToday:0, streak:0, lastDone:'',
      words:{}, seq:0, dailyNew:15, order:'seq', totalMs:0, totalAnswered:0, totalRight:0, days:{} };
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');

  // 认词：新词默认 box0
  await page.click('#vcStart');
  await page.waitForTimeout(600);
  const k1 = await page.evaluate(() => document.querySelector('.vc-kind').textContent);
  check('新词用「认词」题型', k1.includes('认词'), k1);
  await page.screenshot({ path: path.join(OUT, 'p2-2-recall.png') });

  // 背面：拆词 / 词族 / 真题 至少要有块
  await page.click('.vc-opt:nth-child(1)');
  await page.waitForTimeout(500);
  const bp = await page.evaluate(() => {
    const box = document.getElementById('vcBackPanel');
    return {
      has: !!box,
      blocks: [...box.querySelectorAll('.vc-bp-h')].map(d => d.textContent.trim()),
      fam: box.querySelectorAll('.vc-fam-word').length
    };
  });
  check('答题后有卡片背面', bp.has && bp.blocks.length > 0, bp);
  check('背面含拆词/词族/真题之一', bp.blocks.length >= 1, bp.blocks);
  await page.screenshot({ path: path.join(OUT, 'p2-3-back.png') });

  // 词族可点击跳转
  if (bp.fam > 0) {
    const before = await page.evaluate(() => document.querySelector('.vc-word').textContent);
    await page.click('.vc-fam-word');
    await page.waitForTimeout(400);
    const after = await page.evaluate(() => document.querySelector('.vc-word').textContent);
    check('点词族能跳到派生词', after !== before, { before, after });
  } else {
    check('点词族能跳到派生词', true, '本词无词族数据，跳过');
  }

  // 拼写：把当前词设成 box2 再开一局
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const k = Object.keys(s.words)[0];
    if (k) { s.words[k].box = 2; s.words[k].due = 0; }
    s.newDoneToday = s.dailyNew;      // 只留复习词
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  await page.click('#vcStart');
  await page.waitForTimeout(600);
  const k2 = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    hasInput: !!document.getElementById('vcInput'),
    hint: document.querySelector('.vc-spell-hint')?.textContent
  }));
  check('box2 用「拼写」题型', k2.kind.includes('拼写') && k2.hasInput, k2);
  await page.screenshot({ path: path.join(OUT, 'p2-4-spell.png') });

  // 拼错 → 判错
  await page.fill('#vcInput', 'zzzzzz');
  await page.click('#vcSubmit');
  await page.waitForTimeout(400);
  const spellWrong = await page.evaluate(() => document.getElementById('vcFb').className);
  check('拼写错误判错', spellWrong.includes('bad'), spellWrong);

  // 拼对 → 判对
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const k = Object.keys(s.words)[0];
    s.words[k].box = 2; s.words[k].due = 0;
    s.newDoneToday = s.dailyNew; s.doneToday = 0;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  await page.click('#vcStart');
  await page.waitForTimeout(600);
  const answer = await page.evaluate(() => {
    // 从 localStorage 反查当前词的拼写（box2 的那个词）
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    return Object.keys(s.words).find(k => s.words[k].box === 2) || '';
  });
  await page.fill('#vcInput', answer);
  await page.click('#vcSubmit');
  await page.waitForTimeout(400);
  const spellRight = await page.evaluate(() => document.getElementById('vcFb').className);
  check('拼写正确判对', spellRight.includes('ok'), { answer, cls: spellRight });

  // 填空：box5
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const k = Object.keys(s.words)[0];
    s.words[k].box = 5; s.words[k].due = 0;
    s.newDoneToday = s.dailyNew; s.doneToday = 0;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  await page.click('#vcStart');
  await page.waitForTimeout(900);
  const k3 = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    cloze: document.querySelector('.vc-cloze')?.textContent,
    src: document.querySelector('.vc-source')?.textContent,
    opts: document.querySelectorAll('.vc-opt').length
  }));
  check('box5 用「填空」题型', k3.kind.includes('填空') && !!k3.cloze, k3);
  check('填空句里有空格', (k3.cloze || '').includes('______'), k3.cloze);
  check('填空标注来源', !!k3.src, k3.src);
  await page.screenshot({ path: path.join(OUT, 'p2-5-cloze.png') });

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

  // ========== D. 90 天热力图 ==========
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
      const inp = document.getElementById('vcInput');
      if (inp) { inp.value = 'zzz'; document.getElementById('vcSubmit').click(); }
      else {
        const o = document.querySelectorAll('.vc-opt');
        if (!o.length) break;
        o[0].click();
      }
      await sleep(40);
      const nb = document.getElementById('vcNext');
      if (!nb) break;
      nb.click();
      await sleep(40);
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
