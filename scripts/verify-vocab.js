/* 背单词模块的端到端验收：真实 Chromium，不用 IAB。
   用法：node scratch/verify-vocab.js */
const { chromium } = require('playwright');
const path = require('path');

const BASE = 'http://localhost:3456/index.html';
const OUT = path.join(__dirname, '..', 'scratch', 'shots');
require('fs').mkdirSync(OUT, { recursive: true });

const results = [];
function check(name, ok, detail) {
  results.push({ name, ok: !!ok, detail });
  console.log((ok ? 'PASS' : 'FAIL') + '  ' + name + (detail ? '  → ' + JSON.stringify(detail) : ''));
}

(async () => {
  const browser = await chromium.launch({ executablePath: 'C:/Users/NOC/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe' });
  const ctx = await browser.newContext({ viewport: { width: 900, height: 820 } });
  const page = await ctx.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('console', m => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  async function fresh(hash) {
    await page.goto(BASE + '?t=' + Date.now() + '#' + hash, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2200);
  }

  // ---------- 1. 首次进入 ----------
  await fresh('/vocab');
  await page.evaluate(() => localStorage.removeItem('juice_vocab_v1'));
  await fresh('/vocab');

  const home = await page.evaluate(() => ({
    txt: document.getElementById('mod-vocab').innerText,
    accent: getComputedStyle(document.documentElement).getPropertyValue('--mod-ac').trim(),
    owlOk: (() => { const i = document.querySelector('.vc-hero-art img'); return i && i.complete && i.naturalWidth > 0; })()
  }));
  check('今日屏渲染', home.txt.includes('今日摸鱼局') && home.txt.includes('新词 15'), home.txt.slice(0, 60));
  check('模块主色为靛蓝', home.accent.toUpperCase() === '#6366F1', home.accent);
  check('吉祥物图片加载', home.owlOk);
  await page.screenshot({ path: path.join(OUT, '1-home.png') });

  // ---------- 2. 答题：答对 ----------
  await page.click('#vcStart');
  await page.waitForTimeout(400);
  const q1 = await page.evaluate(() => ({
    count: document.querySelector('.vc-count').textContent,
    word: document.querySelector('.vc-word').textContent,
    opts: [...document.querySelectorAll('.vc-opt')].map(b => b.textContent)
  }));
  check('进入答题屏', /1 \/ \d+/.test(q1.count) && q1.opts.length === 4, q1);

  // 找到正确项（反馈出现后才知道），这里先点第一个，再读结果
  await page.click('.vc-opt:nth-child(1)');
  await page.waitForTimeout(300);
  const fb1 = await page.evaluate(() => {
    const f = document.getElementById('vcFb');
    const saved = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const k = Object.keys(saved.words || {})[0];
    return {
      shown: f && f.classList.contains('show'),
      rightHighlight: document.querySelectorAll('.vc-opt.right').length,
      rec: k ? saved.words[k] : null
    };
  });
  check('答题后显示反馈', fb1.shown && fb1.rightHighlight === 1, fb1);
  check('答对 box 升到 1 / 答错归 0', fb1.rec && (fb1.rec.box === 1 || fb1.rec.box === 0), fb1.rec);
  await page.screenshot({ path: path.join(OUT, '2-answer.png') });

  // ---------- 3. 跑完整局，检查队列不膨胀 ----------
  await page.evaluate(async () => {
    const sleep = ms => new Promise(r => setTimeout(r, ms));
    for (let i = 0; i < 90; i++) {
      const nb = document.getElementById('vcNext');
      if (!nb) break;
      nb.click();
      await sleep(30);
      const opts = document.querySelectorAll('.vc-opt');
      if (!opts.length) break;
      opts[0].click();
      await sleep(30);
    }
  });
  await page.waitForTimeout(400);
  const fin = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    return {
      txt: document.getElementById('mod-vocab').innerText,
      streak: saved.streak, doneToday: saved.doneToday,
      newLeft: saved.newLeft, seq: saved.seq,
      tracked: Object.keys(saved.words || {}).length
    };
  });
  check('能走到结算', fin.txt.includes('本局完成'), fin.txt.replace(/\n/g, ' | ').slice(0, 80));
  check('队列有上限（不无限膨胀）', fin.doneToday < 40, { doneToday: fin.doneToday });
  check('新词额度扣完归零', fin.newLeft === 0, { newLeft: fin.newLeft });
  check('新词游标推进到 15', fin.seq === 15, { seq: fin.seq });
  check('15 个词全部入库', fin.tracked === 15, { tracked: fin.tracked });
  check('打卡 +1', fin.streak === 1, { streak: fin.streak });
  await page.screenshot({ path: path.join(OUT, '3-finish.png') });

  // ---------- 4. 次日复习 ----------
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const y = new Date(Date.now() - 86400000);
    const key = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
    const today = Math.floor(Date.now() / 86400000);
    const ks = Object.keys(s.words);
    ks.slice(0, 5).forEach(k => { s.words[k].due = today; });
    ks.slice(5).forEach(k => { s.words[k].due = today + 5; });
    s.day = key(y); s.newLeft = 0; s.doneToday = 15;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await fresh('/vocab');
  const day2 = await page.evaluate(() => ({
    txt: document.getElementById('mod-vocab').innerText,
    saved: JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}')
  }));
  check('跨天后额度重置', day2.saved.newLeft === 15, { newLeft: day2.saved.newLeft });
  check('跨天后今日计数归零', day2.saved.doneToday === 0, { doneToday: day2.saved.doneToday });
  check('次日生成复习队列', day2.txt.includes('待复习 5'), day2.txt.replace(/\n/g, ' | ').slice(0, 70));
  check('连续打卡保留', day2.saved.streak === 1, { streak: day2.saved.streak });

  // ---------- 5. 切换词书 ----------
  await page.click('#vcSwitch');
  await page.waitForTimeout(2600);
  const sw = await page.evaluate(() => ({
    book: JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}').book,
    txt: document.getElementById('mod-vocab').innerText
  }));
  check('切到 CET-6', sw.book === 'cet6' && sw.txt.includes('CET-6'), { book: sw.book });

  await page.click('#vcStart');
  await page.waitForTimeout(500);
  const q6 = await page.evaluate(() => document.querySelector('.vc-word').textContent);
  const cet6Words = await page.evaluate(async () => {
    const j = await (await fetch('assets/vocab/cet6.json')).json();
    return j.slice(0, 20).map(x => x[0]);
  });
  check('CET-6 出的词来自 CET-6 词库', cet6Words.includes(q6), { word: q6, pool: cet6Words.slice(0, 5) });
  await page.screenshot({ path: path.join(OUT, '4-cet6.png') });

  // ---------- 6. 移动端 & 深色 ----------
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(400);
  const mob = await page.evaluate(() => {
    const r = document.querySelector('.vc-card').getBoundingClientRect();
    return { w: Math.round(r.width), overflow: document.documentElement.scrollWidth > window.innerWidth + 1 };
  });
  check('移动端不横向溢出', !mob.overflow && mob.w < 390, mob);
  await page.screenshot({ path: path.join(OUT, '5-mobile.png') });

  await page.setViewportSize({ width: 900, height: 820 });
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'dark'));
  await page.waitForTimeout(1200);
  const dark = await page.evaluate(() => ({
    word: getComputedStyle(document.querySelector('.vc-word')).color,
    optBg: getComputedStyle(document.querySelector('.vc-opt')).backgroundColor
  }));
  check('深色下词头可见', dark.word === 'rgb(248, 250, 252)', dark);
  await page.screenshot({ path: path.join(OUT, '6-dark.png') });

  // ---------- 7. 离开再回来 ----------
  await page.evaluate(() => document.documentElement.setAttribute('data-theme', 'light'));
  await page.evaluate(() => document.querySelector('.nav-tab[data-mod="wall"]').click());
  await page.waitForTimeout(1200);
  await page.evaluate(() => document.querySelector('.nav-tab[data-mod="vocab"]').click());
  await page.waitForTimeout(2400);
  const back = await page.evaluate(() => ({
    active: document.documentElement.dataset.activeModule,
    txt: document.getElementById('mod-vocab').innerText.replace(/\n+/g, ' | ').slice(0, 60)
  }));
  check('切走再回来正常', back.active === 'vocab' && back.txt.length > 5, back);

  // ---------- 8. 关于弹窗 ----------
  await page.evaluate(() => {
    const b = document.getElementById('globalBtnMore') || document.querySelector('[aria-label*="更多"]');
    if (b) b.click();
  });
  await page.waitForTimeout(500);
  const aboutBtn = await page.$('[data-act="about"], #gpAboutBtn, button:has-text("关于")');
  if (aboutBtn) { await aboutBtn.click(); await page.waitForTimeout(600); }
  const about = await page.evaluate(() => document.body.innerText.includes('背单词') && document.body.innerText.includes('KyleBing'));
  check('关于页含背单词与署名', about);

  check('无 JS 报错', errors.length === 0, errors.slice(0, 3));

  await browser.close();
  const failed = results.filter(r => !r.ok);
  console.log('\n=== ' + (results.length - failed.length) + '/' + results.length + ' 通过 ===');
  process.exit(failed.length ? 1 : 0);
})();
