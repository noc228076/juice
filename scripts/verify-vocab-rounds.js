/* 三轮流程验收：英选中 → 中选英 → 自评（可改判 → 重走） */
const { chromium } = require('playwright');
const CHROME = process.env.CHROME_PATH || 'C:/Users/NOC/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const results = [];
function check(n, ok, d) { results.push({n, ok:!!ok, d}); console.log((ok?'PASS':'FAIL')+'  '+n+(d!==undefined?'  → '+JSON.stringify(d):'')); }

(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const page = await b.newContext({ viewport: { width: 900, height: 1000 } }).then(c => c.newPage());
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  await page.goto('http://localhost:3456/index.html?t='+Date.now()+'#/vocab', { waitUntil:'domcontentloaded' });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    localStorage.setItem('juice_vocab_v1', JSON.stringify({
      book:'cet4', day:'', newDoneToday:0, doneToday:0, streak:0, lastDone:'',
      words:{}, seq:0, dailyNew:4, order:'seq', totalMs:0, totalAnswered:0, totalRight:0, days:{}
    }));
  });
  await page.reload({ waitUntil:'domcontentloaded' });
  await page.waitForTimeout(2500);

  const kindNow = () => page.evaluate(() => document.querySelector('.vc-kind')?.textContent);
  const countNow = () => page.evaluate(() => document.querySelector('.vc-count')?.textContent);
  async function next() {
    const nb = await page.$('#vcNext');
    if (nb) { await nb.click(); await page.waitForTimeout(320); }
  }

  await page.click('#vcStart');
  await page.waitForTimeout(700);

  // ===== 第一轮 =====
  check('第一轮是英选中', (await kindNow()).includes('英选中'), await kindNow());
  const r1front = await page.evaluate(() => ({
    word: document.querySelector('.vc-word')?.textContent,
    isCn: !!document.querySelector('.vc-word.cn'),
    opts: [...document.querySelectorAll('.vc-opt')].map(x=>x.textContent),
    rate: document.querySelectorAll('[data-rate]').length
  }));
  check('第一轮给英文单词 + 四个中文选项', !r1front.isCn && r1front.opts.length===4 && r1front.rate===0, r1front);

  // 4 题：第 1 题故意错，其余点第一个（可能对可能错，记录下来）
  const r1log = [];
  for (let i=0;i<4;i++){
    const wrongTarget = (i===0);
    await page.evaluate((w) => {
      const o = document.querySelectorAll('.vc-opt');
      o[w ? o.length-1 : 0].click();
    }, wrongTarget);
    await page.waitForTimeout(280);
    const ok = await page.evaluate(() => document.getElementById('vcFb')?.classList.contains('ok'));
    r1log.push({i, ok});
    await next();
  }
  const afterR1 = await kindNow();
  check('第一轮结束进入第二轮', afterR1.includes('第二轮') && afterR1.includes('中选英'), afterR1);

  // ===== 第二轮 =====
  const r2 = await page.evaluate(() => ({
    front: document.querySelector('.vc-word')?.textContent,
    isCn: !!document.querySelector('.vc-word.cn'),
    opts: [...document.querySelectorAll('.vc-opt')].map(x=>x.textContent),
    rate: document.querySelectorAll('[data-rate]').length
  }));
  check('第二轮给中文 + 四个英文选项', r2.isCn && r2.opts.length===4 && r2.rate===0, r2);
  check('第二轮选项是英文', r2.opts.every(o => /^[a-zA-Z'\- ]+$/.test(o)), r2.opts);

  const r2count = await countNow();
  const wrong1 = r1log.filter(x=>!x.ok).length;
  check('第二轮题数 = 第一轮错词数', r2count.startsWith('1 / ' + wrong1), { count: r2count, wrong1 });

  // 第二轮全部答错（点最后一个）
  for (let i=0;i<wrong1;i++){
    await page.evaluate(() => {
      const o = document.querySelectorAll('.vc-opt');
      o[o.length-1].click();
    });
    await page.waitForTimeout(280);
    await next();
  }
  const afterR2 = await kindNow();
  check('第二轮结束进入第三轮自评', afterR2.includes('第三轮') && afterR2.includes('自评'), afterR2);

  // ===== 第三轮 =====
  const r3 = await page.evaluate(() => ({
    word: document.querySelector('.vc-word')?.textContent,
    rateBtns: [...document.querySelectorAll('[data-rate]')].map(x=>x.textContent),
    hasOpts: document.querySelectorAll('.vc-opt').length,
    revealEmpty: !document.getElementById('vcReveal')?.innerText.trim()
  }));
  check('第三轮给单词 + 三个自评按钮', r3.rateBtns.length===3 && r3.hasOpts===0, r3);
  check('自评按钮是 认识/模糊/不认识', r3.rateBtns.join(',')==='认识,模糊,不认识', r3.rateBtns);
  check('自评前不显示释义', r3.revealEmpty);

  // 点「认识」→ 揭示释义 + 出现改判按钮
  await page.click('[data-rate="know"]');
  await page.waitForTimeout(400);
  const revealed = await page.evaluate(() => ({
    meaning: document.querySelector('.vc-reveal-meaning')?.textContent,
    tag: document.querySelector('.vc-reveal-tag')?.textContent,
    hasAmend: !!document.getElementById('vcMarkWrong'),
    hasNext: !!document.getElementById('vcNext')
  }));
  check('点自评后揭示释义', !!revealed.meaning, revealed.meaning);
  check('揭示后显示所选评级', /认识/.test(revealed.tag||''), revealed.tag);
  check('揭示后有「改判」按钮', revealed.hasAmend);
  check('揭示后有「下一个」按钮', revealed.hasNext);

  // 改判 → 变成不认识
  await page.click('#vcMarkWrong');
  await page.waitForTimeout(400);
  const amended = await page.evaluate(() => ({
    tag: document.querySelector('.vc-reveal-tag')?.textContent,
    hasAmend: !!document.getElementById('vcMarkWrong'),
    picked: document.querySelector('.vc-rate-btn.unknown')?.classList.contains('picked'),
    meaningStill: !!document.querySelector('.vc-reveal-meaning')?.textContent
  }));
  check('改判后标记为「不认识」', /不认识/.test(amended.tag||''), amended.tag);
  check('改判后按钮消失', !amended.hasAmend);
  check('改判后释义仍显示', amended.meaningStill);
  check('改判后「不认识」按钮高亮', amended.picked);

  // 点下一个 → 应触发重走（回到英选中）
  await page.click('#vcNext');
  await page.waitForTimeout(500);
  const redo = await page.evaluate(() => ({
    kind: document.querySelector('.vc-kind')?.textContent,
    count: document.querySelector('.vc-count')?.textContent,
    isCn: !!document.querySelector('.vc-word.cn')
  }));
  check('改判后从英选中重新走一遍', redo.kind.includes('第一轮') && redo.kind.includes('英选中') && !redo.isCn, redo);

  check('无 JS 报错', errs.length===0, errs.slice(0,3));
  await b.close();
  const failed = results.filter(r=>!r.ok);
  console.log('\n=== ' + (results.length-failed.length) + '/' + results.length + ' 通过 ===');
  if (failed.length) failed.forEach(f=>console.log('  - '+f.n+' → '+JSON.stringify(f.d)));
  process.exit(failed.length?1:0);
})();
