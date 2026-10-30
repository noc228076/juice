/* 拼写字母格交互 + 改判按钮可见性 */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }
(async () => {
  const browser = await chromium.launch({ executablePath: CHROME });
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:3456/index.html?t=' + Date.now() + '#/vocab', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1') || '{}');
    s.books = { cet4: { day: '', newDoneToday: 0, doneToday: 0, streak: 0, lastDone: '', words: {}, seq: 0, totalMs: 0, totalAnswered: 0, totalRight: 0, days: {}, newPerDay: {} }, cet6: { words: {}, days: {}, newPerDay: {} } };
    s.book = 'cet4'; s.dailyNew = 1; s.order = 'seq'; s.ver = 3; s.session = null; s.spell = true;
    localStorage.setItem('juice_vocab_v1', JSON.stringify(s));
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2600);
  await page.click('#vcStart');
  await page.waitForTimeout(700);

  // 走到拼写阶段
  let word = null;
  for (let i = 0; i < 30; i++) {
    const st = await page.evaluate(() => ({
      spell: !!document.getElementById('vcSpellSlots'),
      rates: document.querySelectorAll('[data-rate]').length,
      next: !!document.getElementById('vcNext'),
      opts: [...document.querySelectorAll('.vc-opt')].filter(x => !x.disabled).length
    }));
    if (st.spell) break;
    if (st.next) { await page.keyboard.press(' '); await page.waitForTimeout(280); continue; }
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
      await page.waitForTimeout(280);
      if (await page.$('#vcNext')) { await page.keyboard.press(' '); await page.waitForTimeout(280); }
      continue;
    }
    await page.waitForTimeout(280);
  }

  const meta = await page.evaluate(() => ({
    slots: document.querySelectorAll('.vc-slot').length,
    len: +((document.querySelector('.vc-spell-hint')?.textContent || '').match(/共 (\d+) 个字母/) || [0, 0])[1],
    cur: document.querySelectorAll('.vc-slot.cur').length
  }));
  check('横线数量=字母数', meta.slots === meta.len && meta.len > 0, meta);
  check('初始全部为空、有 1 个光标格', await page.evaluate(() => document.querySelectorAll('.vc-slot.empty').length === document.querySelectorAll('.vc-slot').length && document.querySelectorAll('.vc-slot.cur').length === 1), meta);

  // 真实键盘输入整个单词
  const target = (await page.evaluate(() => (document.querySelector('.vc-spell-hint')?.textContent || ''))) ? null : null;
  const dictWord = await page.evaluate(async () => {
    const meaning = document.querySelector('.vc-word')?.textContent?.trim();
    const dict = await (await fetch('assets/vocab/cet4.json')).json();
    const row = dict.find(r => r[2] === meaning);
    return row ? row[0] : null;
  });
  await page.keyboard.type(dictWord, { delay: 25 });
  const afterType = await page.evaluate(() => ({
    letters: [...document.querySelectorAll('.vc-slot')].map(s => s.textContent).join(''),
    empty: document.querySelectorAll('.vc-slot.empty').length,
    cur: document.querySelectorAll('.vc-slot.cur').length
  }));
  check('输入后横线替换为字母', afterType.letters.toLowerCase() === (dictWord || '').toLowerCase() && afterType.empty === 0, afterType);
  check('填满后无残留光标（光标已在末尾之外）', afterType.cur === 0, afterType);

  // 多了输不了
  await page.keyboard.type('zzz', { delay: 20 });
  const afterExtra = await page.evaluate(() => [...document.querySelectorAll('.vc-slot')].map(s => s.textContent).join(''));
  check('超长输入被丢弃', afterExtra.toLowerCase() === (dictWord || '').toLowerCase(), afterExtra);

  // 左移 + 回删
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  const curBefore = await page.evaluate(() => [...document.querySelectorAll('.vc-slot')].findIndex(s => s.classList.contains('cur')));
  await page.keyboard.press('Backspace');
  const afterBs = await page.evaluate(() => ({
    empties: [...document.querySelectorAll('.vc-slot')].map((s, i) => s.classList.contains('empty') ? i : -1).filter(i => i >= 0),
    cur: [...document.querySelectorAll('.vc-slot')].findIndex(s => s.classList.contains('cur'))
  }));
  check('方向键移动 + 回删清空该格', afterBs.empties.length === 1 && afterBs.cur === curBefore - 1, { curBefore, afterBs });

  // 点击第 1 格改字母
  await page.click('.vc-slot[data-slot="0"]');
  await page.keyboard.type('z');
  const s0 = await page.evaluate(() => document.querySelector('.vc-slot[data-slot="0"]').textContent);
  check('点击定位后输入替换该格', s0 === 'z', { s0 });
  await page.click('.vc-slot[data-slot="0"]');
  await page.keyboard.type((dictWord || 'a').charAt(0));

  // 补回被回删的字母
  const idx = afterBs.empties[0];
  await page.click('.vc-slot[data-slot="' + idx + '"]');
  await page.keyboard.type((dictWord || '').charAt(idx));

  // 回车确认 → 答对 → 再回车进下一题
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const fb = await page.evaluate(() => ({
    ok: !!document.querySelector('.vc-feedback.ok'),
    next: !!document.getElementById('vcNext')
  }));
  check('回车确认并判对', fb.ok && fb.next, fb);
  await page.keyboard.press('Enter');
  await page.waitForTimeout(500);
  const nextStage = await page.evaluate(() => ({ rates: document.querySelectorAll('[data-rate]').length }));
  check('答对后再回车进入下一题（自评）', nextStage.rates === 3, nextStage);

  // 改判按钮：整行可见、点击生效
  await page.evaluate(() => document.querySelector('[data-rate="know"]').click());
  await page.waitForTimeout(400);
  const amend = await page.evaluate(() => {
    const b = document.querySelector('.vc-amend-btn');
    if (!b) return null;
    const r = b.getBoundingClientRect();
    const panel = document.querySelector('.vc-reveal-inner').getBoundingClientRect();
    return { h: Math.round(r.height), w: Math.round(r.width), panelW: Math.round(panel.width), text: b.textContent.trim() };
  });
  check('改判按钮整行可见（≥44px 高、占满宽度）', amend && amend.h >= 44 && amend.w >= amend.panelW - 4, amend);
  await page.click('.vc-amend-btn');
  await page.waitForTimeout(400);
  const tag = await page.evaluate(() => (document.querySelector('.vc-reveal-tag')?.textContent || ''));
  check('点击改判生效', tag.includes('已改判'), tag);

  check('无 JS 报错', errs.length === 0, errs.slice(0, 2));
  await browser.close();
  const f = R.filter(x => !x.ok);
  console.log('\n=== ' + (R.length - f.length) + '/' + R.length + ' 通过 ===');
  process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
