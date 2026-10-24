/* 六条反馈的验收 */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME_PATH || 'C:/Users/NOC/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const R = [];
function check(n, ok, d){ R.push({n,ok:!!ok,d}); console.log((ok?'PASS':'FAIL')+'  '+n+(d!==undefined?'  → '+JSON.stringify(d):'')); }

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const page = await b.newContext({ viewport: { width: 900, height: 1000 } }).then(c => c.newPage());
  const errs = []; page.on('pageerror', e => errs.push(String(e)));
  await page.goto('http://localhost:3456/index.html?t='+Date.now()+'#/vocab', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => localStorage.setItem('juice_vocab_v1', JSON.stringify({
    book:'cet4', day:'', newDoneToday:0, doneToday:0, streak:0, lastDone:'',
    words:{}, seq:0, dailyNew:5, order:'seq', totalMs:0, totalAnswered:0, totalRight:0, days:{} })));
  await page.reload({ waitUntil:'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.click('#vcStart');
  await page.waitForTimeout(700);

  // 3/4/5: 单一队列、进度按词、题型连着走
  const t1 = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    count: document.querySelector('.vc-count')?.textContent
  }));
  check('进度显示为「1 / 5」而不是 1/1', /^1 \/ 5$/.test((t1.count||'').trim()), t1.count);
  check('顶部不再显示题型与步骤', !t1.kind, { kind: t1.kind });

  // 1/2: 答完选项内联揭示 + 下一题按钮醒目
  await page.click('.vc-opt:nth-child(1)');
  await page.waitForTimeout(400);
  const t2 = await page.evaluate(() => {
    const opts = [...document.querySelectorAll('.vc-opt')];
    const btn = document.getElementById('vcNext');
    return {
      moreShown: opts.filter(o => o.querySelector('.vc-opt-more')?.classList.contains('show')).length,
      moreTexts: opts.map(o => o.querySelector('.vc-opt-more')?.textContent).filter(Boolean),
      nextLabel: btn?.textContent,
      nextWidth: btn ? Math.round(btn.getBoundingClientRect().width) : 0,
      cardWidth: Math.round(document.querySelector('.vc-card').getBoundingClientRect().width)
    };
  });
  check('答完后四个选项都揭示释义', t2.moreShown === 4, t2);
  check('下一题按钮就是「下一题」', (t2.nextLabel||'').trim() === '下一题', t2.nextLabel);
  check('下一题按钮占满整行（够醒目）', t2.nextWidth > t2.cardWidth * 0.8, t2);

  // 点下一题 → 同词进中选英（不是下一个词）
  await page.click('#vcNext');
  await page.waitForTimeout(500);
  const t3 = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    count: document.querySelector('.vc-count')?.textContent,
    isCn: !!document.querySelector('.vc-word.cn')
  }));
  check('下一题先进同一词的中选英（给中文）', t3.isCn, t3);
  check('进度仍是 1 / 5（同一词内推进）', /^1 \/ 5$/.test((t3.count||'').trim()), t3.count);

  // 做完中选英 → 自评（第 3 步）
  await page.click('.vc-opt:nth-child(1)');
  await page.waitForTimeout(400);
  const midLabel = await page.evaluate(() => document.getElementById('vcNext')?.textContent);
  await page.click('#vcNext');
  await page.waitForTimeout(500);
  const t4 = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    rates: document.querySelectorAll('[data-rate]').length,
    count: document.querySelector('.vc-count')?.textContent
  }));
  check('第三步是自评（三个按钮）', t4.rates === 3, t4);
  check('中选英之后按钮仍是「下一题」', (midLabel||'').trim() === '下一题', midLabel);

  // 自评完 → 进度 +1（下一个词）
  await page.click('[data-rate="know"]');
  await page.waitForTimeout(400);
  await page.click('#vcNext');
  await page.waitForTimeout(500);
  const t5 = await page.evaluate(() => ({
    count: document.querySelector('.vc-count')?.textContent,
    isEn: !!document.querySelector('.vc-word:not(.cn)') && document.querySelectorAll('.vc-opt').length === 4
  }));
  check('自评完成后进度 +1（2 / 5）', /^2 \/ 5$/.test((t5.count||'').trim()), t5.count);
  check('新词回到英选中（给单词 + 选项）', t5.isEn === true, { isEn: t5.isEn });

  // 6: 标熟
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('juice_vocab_v1')).words);
  await page.click('#vcMarkKnown');
  await page.waitForTimeout(500);
  const after = await page.evaluate(() => ({
    words: JSON.parse(localStorage.getItem('juice_vocab_v1')).words,
    count: document.querySelector('.vc-count')?.textContent
  }));
  const knownKey = Object.keys(after.words).find(k => after.words[k].known);
  check('标熟后该词标记 known', !!knownKey, { knownKey });
  check('标熟后跳到下一个词', /^[23] \/ 5$/.test((after.count||'').trim()), after.count);

  // 标熟的词不再进队列
  const queueInfo = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1'));
    return Object.keys(s.words).filter(k => s.words[k].known);
  });
  check('标熟词被记录', queueInfo.length === 1, queueInfo);

  // 生词本里有「已标熟」页签
  await page.evaluate(() => { const b=document.getElementById('vcBack'); if (b) b.click(); });
  await page.waitForTimeout(500);
  await page.click('.vc-tab[data-tab="words"]');
  await page.waitForTimeout(500);
  const tabs = await page.evaluate(() => [...document.querySelectorAll('[data-wtab]')].map(b=>b.textContent));
  check('生词本有「已标熟」页签', tabs.length === 2 && tabs.join('').includes('已标熟'), tabs);
  await page.click('[data-wtab="known"]');
  await page.waitForTimeout(400);
  const knownPage = await page.evaluate(() => ({
    rows: document.querySelectorAll('.vc-wordrow').length,
    hasUnknow: !!document.querySelector('[data-unknow]')
  }));
  check('已标熟页显示标熟的词', knownPage.rows === 1, knownPage);
  check('已标熟页能取消标熟', knownPage.hasUnknow);

  // 取消标熟后回到队列
  await page.click('[data-unknow]');
  await page.waitForTimeout(500);
  const afterUn = await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('juice_vocab_v1'));
    return Object.keys(s.words).filter(k => s.words[k].known).length;
  });
  check('取消标熟生效', afterUn === 0, { known: afterUn });

  check('无 JS 报错', errs.length === 0, errs.slice(0,3));
  await b.close();
  const f = R.filter(r=>!r.ok);
  console.log('\n=== ' + (R.length-f.length) + '/' + R.length + ' 通过 ===');
  if (f.length) f.forEach(x=>console.log('  - '+x.n+' → '+JSON.stringify(x.d)));
  process.exit(f.length?1:0);
})();
