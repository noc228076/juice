/* 拼写阶段：开启开关后第 3 阶段出拼写题，答对/答错都正确落档 */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const page = await b.newContext({ viewport: { width: 900, height: 900 } }).then(c => c.newPage());
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:3456/index.html?t=' + Date.now() + '#/vocab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    s.books = { cet4: { day: '', newDoneToday: 0, doneToday: 0, streak: 0, lastDone: '', words: {}, seq: 0, totalMs: 0, totalAnswered: 0, totalRight: 0, days: {}, newPerDay: {} }, cet6: { words: {}, days: {}, newPerDay: {} } };
    s.book = 'cet4'; s.dailyNew = 2; s.order = 'seq'; s.ver = 3; s.session = null; s.spell = true;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2500);

  // 设置页确认开关显示为开启
  await page.click('.vc-tab[data-tab="settings"]');
  await page.waitForTimeout(400);
  const sw = await page.evaluate(() => {
    const chips = [...document.querySelectorAll('[data-spell]')];
    return { n: chips.length, onActive: chips.some(c => c.getAttribute('data-spell') === 'on' && c.classList.contains('active')) };
  });
  check('设置里有拼写开关且显示开启', sw.n === 2 && sw.onActive, sw);
  const flow = await page.evaluate(() => document.body.innerText.includes('拼写'));
  check('答题流程说明含拼写阶段', flow);

  await page.click('.vc-tab[data-tab="today"]');
  await page.waitForTimeout(400);
  await page.click('#vcStart');
  await page.waitForTimeout(700);

  // 走阶段：1 英选中(2题) → 2 中选英(2题) → 3 拼写(2题) → 4 自评(2题)
  const kinds = [];
  let spellAnswered = { right: false, wrong: false };
  for (let i = 0; i < 60; i++) {
    const st = await page.evaluate(() => ({
      done: !!document.querySelector('.vc-done'),
      spell: !!document.getElementById('vcSpellInput'),
      rates: document.querySelectorAll('[data-rate]').length,
      next: !!document.getElementById('vcNext'),
      opts: [...document.querySelectorAll('.vc-opt')].filter(x => !x.disabled).length,
      word: document.querySelector('.vc-word')?.textContent?.trim() || '',
      isCn: !!document.querySelector('.vc-word.cn')
    }));
    if (st.done) break;
    if (st.spell) {
      kinds.push('spell');
      const target = st.word; // 拼写屏正面是释义（cn 类）
      const dict = await page.evaluate(async (meaning) => {
        const d = await (await fetch('assets/vocab/cet4.json')).json();
        const row = d.find(r => r[2] === meaning);
        return row ? row[0] : null;
      }, target);
      const correct = !spellAnswered.right;
      const input = correct ? dict : (dict ? dict + 'x' : 'zzz');
      await page.fill('#vcSpellInput', input || 'zzz');
      await page.click('#vcSpellSubmit');
      await page.waitForTimeout(350);
      if (correct) spellAnswered.right = true; else spellAnswered.wrong = true;
      const nx = await page.$('#vcNext');
      if (nx) { await page.keyboard.press(' '); await page.waitForTimeout(320); }
      continue;
    }
    if (st.rates) { kinds.push('selfrate'); await page.evaluate(() => document.querySelector('[data-rate="know"]').click()); await page.waitForTimeout(280); const nx = await page.$('#vcNext'); if (nx) { await page.keyboard.press(' '); await page.waitForTimeout(300); } continue; }
    if (st.next) { await page.keyboard.press(' '); await page.waitForTimeout(300); continue; }
    if (st.opts) {
      kinds.push(st.isCn ? 'cn2en' : 'en2cn');
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
      const nx = await page.$('#vcNext');
      if (nx) { await page.keyboard.press(' '); await page.waitForTimeout(300); }
      continue;
    }
    await page.waitForTimeout(300);
  }
  const uniq = [...new Set(kinds)];
  check('四阶段都出现过（含拼写）', uniq.includes('en2cn') && uniq.includes('cn2en') && uniq.includes('spell') && uniq.includes('selfrate'), uniq);
  check('拼写答对与答错都走到', spellAnswered.right && spellAnswered.wrong, spellAnswered);
  const rec = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1'));
    const w = Object.values(s.books.cet4.words);
    return { n: w.length, anyS: w.some(r => r.S > 0) };
  });
  check('落档正常（2 词有 S）', rec.n === 2 && rec.anyS, rec);
  check('无 JS 报错', errs.length === 0, errs.slice(0, 2));
  await b.close();
  const f = R.filter(x => !x.ok);
  console.log('\n=== ' + (R.length - f.length) + '/' + R.length + ' 通过 ===');
  process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
