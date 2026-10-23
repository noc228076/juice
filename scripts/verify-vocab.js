/* 背单词模块的端到端验收：真实 Chromium。
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
  const ctx = await browser.newContext({ viewport: { width: 900, height: 900 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  async function fresh(hash) {
    await page.goto(BASE + '?t=' + Date.now() + '#' + hash, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
  }
  const txt = () => page.evaluate(() => document.getElementById('mod-vocab').innerText);
  const saved = () => page.evaluate(() => JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}'));

  await fresh('/vocab');
  await page.evaluate(() => localStorage.removeItem('juice_vocab_v1'));
  await fresh('/vocab');

  // ========== 1. 页面不再空旷 ==========
  const h = await page.evaluate(() => ({
    subnav: !!document.querySelector('.vc-subnav'),
    tabs: [...document.querySelectorAll('.vc-tab')].map(b => b.textContent),
    strip: [...document.querySelectorAll('.vc-stat')].map(d => d.innerText.replace(/\n/g, ' ')),
    week: !!document.querySelector('.vc-week'),
    weekDays: document.querySelectorAll('.vc-day').length
  }));
  check('有模块内子导航（今日/统计/设置）', h.subnav && h.tabs.length === 3, h.tabs);
  check('今日屏有数据条（4 项）', h.strip.length === 4, h.strip);
  check('今日屏有最近 7 天视图', h.week && h.weekDays === 7, { days: h.weekDays });
  await page.screenshot({ path: path.join(OUT, 'v2-1-home.png') });

  // ========== 2. 返回键 ==========
  await page.click('#vcStart');
  await page.waitForTimeout(400);
  const hasBack = await page.evaluate(() => {
    const b = document.getElementById('vcBack');
    return b ? b.textContent.trim() : null;
  });
  check('答题屏有返回键', hasBack && hasBack.includes('返回'), hasBack);
  await page.screenshot({ path: path.join(OUT, 'v2-2-play.png') });

  await page.click('#vcBack');
  await page.waitForTimeout(400);
  const backOk = await page.evaluate(() => ({ onHome: !!document.getElementById('vcStart') }));
  check('返回键能回到今日屏', backOk.onHome);

  // ========== 3. 每天词量可选 ==========
  await page.click('.vc-tab[data-tab="settings"]');
  await page.waitForTimeout(300);
  const dailyOpts = await page.evaluate(() =>
    [...document.querySelectorAll('[data-daily]')].map(b => b.textContent.trim()));
  check('设置里有每天词量选项', dailyOpts.length === 4, dailyOpts);

  await page.click('[data-daily="25"]');
  await page.waitForTimeout(400);
  const afterDaily = await saved();
  check('选 25 后存档生效', afterDaily.dailyNew === 25, { dailyNew: afterDaily.dailyNew });

  await page.click('.vc-tab[data-tab="today"]');
  await page.waitForTimeout(400);
  const home25 = await txt();
  check('今日屏显示新词 25', /新词 25/.test(home25), home25.replace(/\n/g, ' | ').slice(0, 70));

  await page.click('#vcStart');
  await page.waitForTimeout(400);
  const q25 = await page.evaluate(() => document.querySelector('.vc-count').textContent);
  check('队列总数为 25', /\/ 25$/.test(q25), q25);
  await page.click('#vcBack');
  await page.waitForTimeout(400);

  // ========== 4. 顺序 / 乱序 ==========
  await page.click('.vc-tab[data-tab="settings"]');
  await page.waitForTimeout(300);
  await page.click('[data-order="random"]');
  await page.waitForTimeout(400);
  const afterOrder = await saved();
  check('能切到乱序', afterOrder.order === 'random', { order: afterOrder.order });

  await page.click('.vc-tab[data-tab="today"]');
  await page.waitForTimeout(400);
  const homeRandom = await txt();
  check('今日屏标出「乱序」', homeRandom.includes('乱序'), homeRandom.replace(/\n/g, ' | ').slice(0, 60));

  const firstWords = new Set();
  for (let i = 0; i < 5; i++) {
    await page.click('#vcStart');
    await page.waitForTimeout(350);
    firstWords.add(await page.evaluate(() => document.querySelector('.vc-word').textContent));
    await page.click('#vcBack');
    await page.waitForTimeout(300);
  }
  check('乱序开局词不固定', firstWords.size >= 2, [...firstWords]);

  await page.click('.vc-tab[data-tab="settings"]');
  await page.waitForTimeout(300);
  await page.click('[data-order="seq"]');
  await page.waitForTimeout(400);
  await page.click('.vc-tab[data-tab="today"]');
  await page.waitForTimeout(400);
  const seqFirst = [];
  for (let i = 0; i < 2; i++) {
    await page.click('#vcStart');
    await page.waitForTimeout(350);
    seqFirst.push(await page.evaluate(() => document.querySelector('.vc-word').textContent));
    await page.click('#vcBack');
    await page.waitForTimeout(300);
  }
  check('顺序模式开局词固定', seqFirst[0] === seqFirst[1], seqFirst);

  // ========== 5. 累计单词数 / 学习时长 ==========
  await page.click('#vcStart');
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) {
    await page.waitForTimeout(1100);
    await page.click('.vc-opt:nth-child(1)');
    await page.waitForTimeout(300);
    const nb = await page.$('#vcNext');
    if (nb) { await nb.click(); await page.waitForTimeout(250); }
  }
  await page.evaluate(() => { const b = document.getElementById('vcBack'); if (b) b.click(); });
  await page.waitForTimeout(500);

  const afterStudy = await saved();
  check('累计答题数在涨', afterStudy.totalAnswered >= 3, { totalAnswered: afterStudy.totalAnswered });
  check('累计学过词数在涨', Object.keys(afterStudy.words || {}).length >= 3, { known: Object.keys(afterStudy.words || {}).length });
  check('学习时长在累计', afterStudy.totalMs > 2000, { totalMs: afterStudy.totalMs });

  const stripNow = await page.evaluate(() =>
    [...document.querySelectorAll('.vc-stat')].map(d => d.innerText.replace(/\n/g, ' ')));
  check('数据条显示累计学过 / 学习时长',
    stripNow.join(' ').includes('累计学过') && stripNow.join(' ').includes('学习时长'), stripNow);

  // ========== 6. 统计屏 ==========
  await page.click('.vc-tab[data-tab="stats"]');
  await page.waitForTimeout(400);
  const statsTxt = await txt();
  check('统计屏有完成度', /完成度/.test(statsTxt), statsTxt.replace(/\n/g, ' | ').slice(0, 80));
  check('统计屏有档位分布', /记忆档位分布/.test(statsTxt));
  check('统计屏有 30 天热力图', (await page.evaluate(() => document.querySelectorAll('.vc-heat i').length)) === 30);
  check('统计屏有学习时长', /累计学习时长/.test(statsTxt));
  await page.screenshot({ path: path.join(OUT, 'v2-3-stats.png') });

  // ========== 7. 跑完整局 ==========
  await page.click('.vc-tab[data-tab="today"]');
  await page.waitForTimeout(300);
  await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    document.getElementById('vcStart').click();
    await sleep(200);
    for (let i = 0; i < 90; i++) {
      const opts = document.querySelectorAll('.vc-opt');
      if (!opts.length) break;
      opts[0].click();
      await sleep(25);
      const nb = document.getElementById('vcNext');
      if (!nb) break;
      nb.click();
      await sleep(25);
    }
  });
  await page.waitForTimeout(500);
  const fin = await saved();
  const finTxt = await txt();
  check('能走到结算', finTxt.includes('本局完成'), finTxt.replace(/\n/g, ' | ').slice(0, 70));
  check('队列有上限', (fin.doneToday || 0) < 70, { doneToday: fin.doneToday });
  check('打卡 +1', fin.streak === 1, { streak: fin.streak });

  // ========== 8. 跨天 ==========
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const y = new Date(Date.now() - 86400000);
    const key = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    const today = Math.floor(Date.now() / 86400000);
    const ks = Object.keys(s.words);
    ks.slice(0, 5).forEach(k => { s.words[k].due = today; });
    ks.slice(5).forEach(k => { s.words[k].due = today + 5; });
    s.day = key(y); s.newDoneToday = s.dailyNew; s.doneToday = 30;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  const d2 = await saved();
  const d2txt = await txt();
  check('跨天额度重置', d2.newDoneToday === 0, { newDoneToday: d2.newDoneToday });
  check('跨天今日计数归零', d2.doneToday === 0, { doneToday: d2.doneToday });
  check('次日生成复习队列', /待复习 5/.test(d2txt), d2txt.replace(/\n/g, ' | ').slice(0, 60));
  check('跨天后累计数据保留', (d2.totalAnswered || 0) > 0 && (d2.totalMs || 0) > 0,
    { answered: d2.totalAnswered, ms: d2.totalMs });

  // ========== 9. 词库切换 ==========
  await page.click('.vc-tab[data-tab="settings"]');
  await page.waitForTimeout(300);
  await page.click('[data-book="cet6"]');
  await page.waitForTimeout(2800);
  const sw = await saved();
  check('设置里能切到 CET-6', sw.book === 'cet6', { book: sw.book });

  await page.click('.vc-tab[data-tab="today"]');
  await page.waitForTimeout(300);
  await page.click('#vcStart');
  await page.waitForTimeout(450);
  const q6 = await page.evaluate(() => document.querySelector('.vc-word').textContent);
  const cet6Pool = await page.evaluate(async () => {
    const j = await (await fetch('assets/vocab/cet6.json')).json();
    return j.slice(0, 20).map(x => x[0]);
  });
  check('CET-6 出的词来自 CET-6 词库', cet6Pool.includes(q6), { word: q6 });
  await page.screenshot({ path: path.join(OUT, 'v2-4-cet6.png') });

  // ========== 10. 清空记录 ==========
  await page.evaluate(() => { const b = document.getElementById('vcBack'); if (b) b.click(); });
  await page.waitForTimeout(400);
  await page.click('.vc-tab[data-tab="settings"]');
  await page.waitForTimeout(300);
  page.once('dialog', d => d.accept());
  await page.click('#vcReset');
  await page.waitForTimeout(2200);
  const afterReset = await saved();
  check('清空记录生效',
    Object.keys(afterReset.words || {}).length === 0 && (afterReset.totalMs || 0) === 0,
    { words: Object.keys(afterReset.words || {}).length, ms: afterReset.totalMs });

  // ========== 11. 移动端 & 深色 ==========
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const mob = await page.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
    tabs: document.querySelectorAll('.vc-tab').length
  }));
  check('移动端不横向溢出', !mob.overflow, mob);
  await page.screenshot({ path: path.join(OUT, 'v2-5-mobile.png') });

  await page.setViewportSize({ width: 900, height: 900 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1200);
  const dark = await page.evaluate(() => {
    /* 今日屏没有 .vc-h2，用标题兜底 */
    const node = document.querySelector('.vc-h2, .vc-hero-title');
    return { tag: node && node.className, color: node ? getComputedStyle(node).color : null };
  });
  check('深色下文字可见', dark.color === 'rgb(248, 250, 252)', dark);
  await page.screenshot({ path: path.join(OUT, 'v2-6-dark.png') });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));

  // ========== 12. 模块切换 ==========
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
