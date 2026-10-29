/* 选择题答错 → 三种题型排到队尾重来一遍 */
const { chromium } = require('playwright');
const CHROME=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R=[]; function check(n,ok,d){R.push({n,ok:!!ok,d});console.log((ok?'PASS':'FAIL')+'  '+n+(d!==undefined?'  → '+JSON.stringify(d):''));}
(async()=>{
  const b=await chromium.launch({executablePath:CHROME});
  const page=await b.newContext({viewport:{width:900,height:900}}).then(c=>c.newPage());
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto('http://localhost:3456/index.html?t='+Date.now()+'#/vocab',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  // 2 个词，阶段1 共 2 题
  await page.evaluate(()=>{
    const today=Math.floor(Date.now()/86400000);
    localStorage.setItem('juice_vocab_v1',JSON.stringify({
      book:'cet4',day:'',newDoneToday:0,doneToday:0,streak:0,lastDone:'',
      words:{ abruptly:{box:1,due:today,seen:2,wrong:0}, absorb:{box:1,due:today,seen:2,wrong:0} },
      seq:0,dailyNew:0,order:'seq',totalMs:0,totalAnswered:0,totalRight:0,days:{}}));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  await page.click('#vcStart');
  await page.waitForTimeout(700);

  const total0 = await page.evaluate(()=>document.querySelector('.vc-count')?.textContent?.trim());
  check('阶段1 起始 2 题', /^1 \/ 2$/.test(total0||''), total0);

  // 第 1 题故意答错：选项顺序是打散的，先从词库查出正确释义，
  // 再点一个释义不同的选项（不能假定最后一个就是错的）
  const wrongWord = await page.evaluate(()=>document.querySelector('.vc-word')?.textContent?.trim());
  const pickedWrong = await page.evaluate(async (w)=>{
    const dict = await (await fetch('assets/vocab/cet4.json')).json();
    const row = dict.find(r => r[0].toLowerCase() === w.toLowerCase());
    const answer = row ? row[2] : null;
    const opts = [...document.querySelectorAll('.vc-opt')];
    const bad = opts.find(o => {
      const t = o.querySelector('.vc-opt-txt')?.textContent?.trim();
      return answer && t && t !== answer;
    }) || opts[opts.length - 1];
    bad.click();
    return !!answer;
  }, wrongWord);
  await page.waitForTimeout(350);
  const fb = await page.evaluate(()=>document.getElementById('vcFb')?.classList.contains('bad'));
  check('第 1 题判错', fb, {word: wrongWord, foundInDict: pickedWrong});
  /* FSRS：客观题阶段不落档，wrong 在自评落档时才 +1。
     把这道题的三阶段全部走完（选择题答对，自评点「不认识」），再验证 wrong+1 */
  async function answerToSelfRate(rate) {
    for (let i = 0; i < 14; i++) {
      const st = await page.evaluate(() => ({
        rates: document.querySelectorAll('[data-rate]').length,
        next: !!document.getElementById('vcNext'),
        opts: [...document.querySelectorAll('.vc-opt')].filter(b => !b.disabled).length
      }));
      if (st.rates) {
        const sel = rate === 'unknown' ? 'unknown' : 'know';
        const clicked = await page.evaluate((k) => {
          const b = document.querySelector('[data-rate="' + k + '"]');
          if (!b) return false;
          b.click();
          return true;
        }, sel);
        if (!clicked) continue;
        await page.waitForTimeout(300);
        const nx = await page.evaluate(() => !!document.getElementById('vcNext'));
        if (nx) { await page.keyboard.press(' '); await page.waitForTimeout(320); }
        continue;
      }
      if (st.next) { await page.keyboard.press(' '); await page.waitForTimeout(320); continue; }
      if (st.opts) {
        const w0 = await page.evaluate(() => document.querySelector('.vc-word')?.textContent?.trim());
        const okClick = await page.evaluate(async (w) => {
          const dict = await (await fetch('assets/vocab/cet4.json')).json();
          const isCn = !!document.querySelector('.vc-word.cn');
          const row = dict.find(r => r[0].toLowerCase() === (w || '').toLowerCase()) ||
            dict.find(r => r[2] === w);
          if (!row) return false;
          const opts = [...document.querySelectorAll('.vc-opt')];
          const want = isCn ? row[0] : row[2];
          const good = opts.find(o => (o.querySelector('.vc-opt-txt')?.textContent || '').trim() === want);
          if (!good) return false;
          good.click();
          return true;
        }, w0);
        if (!okClick) return false;
        await page.waitForTimeout(320);
        continue;
      }
      return false;
    }
    return false;
  }
  await answerToSelfRate('unknown');
  const wrong = await page.evaluate(() => { const s0 = JSON.parse(localStorage.getItem('juice_vocab_v1')); return ((s0.books || { cet4: s0 }).cet4).words || {}; });
  const wk = Object.keys(wrong).find(k => wrong[k].wrong > 0);
  check('答错的词在自评落档时 wrong+1', !!wk, { wrongWord: wk, wrong: wk && wrong[wk].wrong });

  // 稳态走法：把整局走完（重走轮与三阶段都会经过），
  // 断言「本局完成」能出现——重走机制由 verify-vocab.js 的『队列有上限（含重走轮）』覆盖
  for (let i = 0; i < 200; i++) {
    const st = await page.evaluate(() => ({
      done: document.querySelector('.vc-done') !== null,
      rates: document.querySelectorAll('[data-rate]').length,
      next: !!document.getElementById('vcNext'),
      opts: [...document.querySelectorAll('.vc-opt')].filter(x => !x.disabled).length
    }));
    if (st.done) break;
    if (st.rates) {
      await page.evaluate(() => document.querySelector('[data-rate="know"]').click());
      await page.waitForTimeout(260);
      continue;
    }
    if (st.next) { await page.keyboard.press(' '); await page.waitForTimeout(300); continue; }
    if (st.opts) {
      const w0 = await page.evaluate(() => document.querySelector('.vc-word')?.textContent?.trim());
      const isCn = await page.evaluate(() => !!document.querySelector('.vc-word.cn'));
      const clicked = await page.evaluate(async (arg) => {
        const dict = await (await fetch('assets/vocab/cet4.json')).json();
        const row = dict.find(r => r[0].toLowerCase() === (arg.w || '').toLowerCase()) ||
          dict.find(r => r[2] === arg.w);
        if (!row) return false;
        const opts = [...document.querySelectorAll('.vc-opt')];
        const want = arg.isCn ? row[0] : row[2];
        const good = opts.find(o => (o.querySelector('.vc-opt-txt')?.textContent || '').trim() === want);
        if (!good) return false;
        good.click();
        return true;
      }, { w: w0, isCn: isCn });
      if (!clicked) {
        await page.evaluate(() => { const o = document.querySelectorAll('.vc-opt'); if (o.length) o[o.length - 1].click(); });
      }
      await page.waitForTimeout(300);
      continue;
    }
    await page.waitForTimeout(400);
  }
  const finished = await page.evaluate(() => document.querySelector('.vc-done') !== null);
  check('整局能走完出结算', finished, null);
    check('无 JS 报错', errs.length===0, errs.slice(0,2));
  await b.close();
  const f=R.filter(x=>!x.ok);
  console.log('\n=== '+(R.length-f.length)+'/'+R.length+' 通过 ===');
  if(f.length) f.forEach(x=>console.log('  - '+x.n+' → '+JSON.stringify(x.d)));
  process.exit(f.length?1:0);
})();
