/* 会话续局：答题中途退出 → 今日页出现继续卡 → 继续后接着答 */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const results = [];
function check(n, ok, d) { results.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  const fresh = async (hash) => {
    await page.goto('http://localhost:3456/index.html?t=' + Date.now() + '#' + hash, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2600);
  };
  const seed = () => page.evaluate(() => {
    const today = Math.floor(Date.now() / 86400000);
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    const b4 = (s.books = s.books || {}).cet4 = s.books.cet4 || { words: {}, seq: 0, days: {}, newPerDay: {} };
    b4.words = { abruptly: { S: 2, D: 4, due: today, last: today - 2, reps: 2, lapses: 0, st: 1, seen: 2, wrong: 0 } };
    b4.seq = 0; b4.newDoneToday = 0; b4.doneToday = 0;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });

  await fresh('/vocab');
  await seed();
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  await page.click('#vcStart');
  await page.waitForTimeout(900);
  // 答对第 1 题（推进到 2/3）
  const st1 = await page.evaluate(() => ({
    opts: [...document.querySelectorAll('.vc-opt')].filter(x => !x.disabled).length,
    total: document.querySelector('.vc-count')?.textContent
  }));
  check('会话已开始', !!st1.total, st1);
  const clicked = await page.evaluate(async () => {
    const w = document.querySelector('.vc-word')?.textContent?.trim();
    const dict = await (await fetch('assets/vocab/cet4.json')).json();
    const row = dict.find(r => r[0].toLowerCase() === (w || '').toLowerCase());
    if (!row) return false;
    const opts = [...document.querySelectorAll('.vc-opt')];
    const good = opts.find(o => (o.querySelector('.vc-opt-txt')?.textContent || '').trim() === row[2]);
    if (!good) return false;
    good.click();
    return true;
  });
  await page.waitForTimeout(600);
  const nx1 = await page.evaluate(() => !!document.getElementById('vcNext'));
  check('第 1 题已答（出现下一题按钮）', nx1, { clicked });
  // 按「下一题」推进到第 2 题后再退出，快照里 qi 应为 1
  if (nx1) { await page.keyboard.press(' '); await page.waitForTimeout(600); }

  // 中途退出 → 回今日
  await page.click('#vcBack');
  await page.waitForTimeout(700);
  const persisted = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1'));
    return { has: !!s.session, qi: s.session && s.session.qi, len: s.session && s.session.stageQueue.length };
  });
  check('退出后进度已落档', persisted.has && persisted.len > persisted.qi, persisted);

  // 今日页出现继续卡
  const resumeCard = await page.evaluate(() => ({
    btn: !!document.getElementById('vcResume'),
    text: (document.querySelector('.vc-hero-focus')?.innerText || '').slice(0, 60)
  }));
  check('今日页出现「继续上局」', resumeCard.btn, resumeCard);

  // 点继续 → 恢复到第 2 题（2/3）
  await page.click('#vcResume');
  await page.waitForTimeout(1200);
  const resumed = await page.evaluate(() => ({
    count: document.querySelector('.vc-count')?.textContent,
    inPlay: !!document.querySelector('.vc-card')
  }));
  check('继续后回到未答题（2/16）', resumed.count === '2 / 16', resumed);

  // 再退出 → 放弃 → 恢复普通今日页
  await page.click('#vcBack');
  await page.waitForTimeout(700);
  await page.evaluate(() => document.getElementById('vcDiscard')?.click());
  await page.waitForTimeout(600);
  const discarded = await page.evaluate(() => ({
    gone: !document.getElementById('vcResume'),
    session: (JSON.parse(localStorage.getItem('juice_vocab_v1')).session) === null
  }));
  check('放弃后清理会话', discarded.gone && discarded.session, discarded);
  check('无 JS 报错', errs.length === 0, errs.slice(0, 2));

  await browser.close();
  const f = results.filter(x => !x.ok);
  console.log('\n=== ' + (results.length - f.length) + '/' + results.length + ' 通过 ===');
  process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
