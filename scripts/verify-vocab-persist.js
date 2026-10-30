/* 新词落盘 + 导出导入往返（P0 回归） */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 900, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  page.on('dialog', d => d.accept());
  await page.goto('http://localhost:3456/index.html?t=' + Date.now() + '#/vocab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    s.books = { cet4: { day: '', newDoneToday: 0, doneToday: 0, streak: 0, lastDone: '', words: {}, seq: 0, totalMs: 0, totalAnswered: 0, totalRight: 0, days: {}, newPerDay: {} }, cet6: { words: {}, days: {}, newPerDay: {} } };
    s.book = 'cet4'; s.dailyNew = 1; s.order = 'seq'; s.ver = 3; s.session = null;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  await page.click('#vcStart');
  await page.waitForTimeout(700);

  // 三阶段全对
  for (let i = 0; i < 40; i++) {
    const st = await page.evaluate(() => ({
      done: !!document.querySelector('.vc-done'),
      rates: document.querySelectorAll('[data-rate]').length,
      next: !!document.getElementById('vcNext'),
      opts: [...document.querySelectorAll('.vc-opt')].filter(x => !x.disabled).length
    }));
    if (st.done) break;
    if (st.rates) {
      await page.evaluate(() => document.querySelector('[data-rate="know"]').click());
      await page.waitForTimeout(260);
      await page.keyboard.press(' ');
      await page.waitForTimeout(320);
      continue;
    }
    if (st.next) { await page.keyboard.press(' '); await page.waitForTimeout(300); continue; }
    if (st.opts) {
      await page.evaluate(async () => {
        const w = document.querySelector('.vc-word')?.textContent?.trim();
        const isCn = !!document.querySelector('.vc-word.cn');
        const dict = await (await fetch('assets/vocab/cet4.json')).json();
        const row = dict.find(r => r[0].toLowerCase() === (w || '').toLowerCase()) || dict.find(r => r[2] === w);
        if (!row) return;
        const want = isCn ? row[0] : row[2];
        const opts = [...document.querySelectorAll('.vc-opt')];
        const good = opts.find(o => (o.querySelector('.vc-opt-txt')?.textContent || '').trim() === want);
        (good || opts[0]).click();
      });
      await page.waitForTimeout(320);
      continue;
    }
    await page.waitForTimeout(300);
  }
  const learned = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1'));
    const w = s.books.cet4.words;
    const keys = Object.keys(w);
    return { count: keys.length, rec: keys.length ? w[keys[0]] : null, newDone: s.books.cet4.newDoneToday, newPerDay: s.books.cet4.newPerDay };
  });
  check('新词已写回 words', learned.count === 1 && learned.rec && learned.rec.S > 0, learned);
  check('新词 due 在未来', learned.rec && learned.rec.due > Math.floor(Date.now() / 86400000), learned.rec && learned.rec.due);
  check('新词额度已扣', learned.newDone === 1, { newDone: learned.newDone });
  check('newPerDay 已记', Object.values(learned.newPerDay || {}).some(v => v === 1), learned.newPerDay);

  // 导出 → 导入往返
  const backup = await page.evaluate(() => localStorage.getItem('juice_vocab_v1'));
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1'));
    s.books.cet4.words = {};
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2400);
  await page.evaluate(() => { document.querySelector('[data-tab="settings"]')?.click(); });
  await page.waitForTimeout(400);
  await page.setInputFiles('#vcImportFile', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(backup, 'utf8') });
  await page.waitForTimeout(2500);
  const restored = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1'));
    return { count: Object.keys(s.books.cet4.words).length, rec: Object.values(s.books.cet4.words)[0] };
  });
  check('导出→导入恢复 FSRS 记录', restored.count === 1 && restored.rec && restored.rec.S > 0, restored);
  check('无 JS 报错', errs.length === 0, errs.slice(0, 2));
  await browser.close();
  const f = R.filter(x => !x.ok);
  console.log('\n=== ' + (R.length - f.length) + '/' + R.length + ' 通过 ===');
  process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
