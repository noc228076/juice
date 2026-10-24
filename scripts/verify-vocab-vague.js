/* 「模糊」验证：用真实答题路径把 box 升到 >0，再自评选模糊 */
const { chromium } = require('playwright');
const CHROME=process.env.CHROME_PATH||'C:/Users/NOC/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const R=[]; function check(n,ok,d){R.push({n,ok:!!ok,d});console.log((ok?'PASS':'FAIL')+'  '+n+(d!==undefined?'  → '+JSON.stringify(d):''));}
(async()=>{
  const b=await chromium.launch({executablePath:CHROME});
  const page=await b.newContext({viewport:{width:900,height:900}}).then(c=>c.newPage());
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto('http://localhost:3456/index.html?t='+Date.now()+'#/vocab',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);

  // 单个词，box 已经是 2（之前学过），今天到期
  await page.evaluate(()=>{
    const today=Math.floor(Date.now()/86400000);
    localStorage.setItem('juice_vocab_v1',JSON.stringify({
      book:'cet4',day:'',newDoneToday:0,doneToday:0,streak:0,lastDone:'',
      words:{ abruptly:{box:2,due:today,seen:4,wrong:0} },
      seq:0,dailyNew:0,order:'seq',totalMs:0,totalAnswered:0,totalRight:0,days:{}}));
  });
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);

  const start = await page.evaluate(()=>{
    const r=(JSON.parse(localStorage.getItem('juice_vocab_v1')).books||{cet4:JSON.parse(localStorage.getItem('juice_vocab_v1'))}).cet4.words.abruptly;
    return {box:r.box, due:r.due};
  });
  check('起始 box=2', start.box===2, start);

  await page.click('#vcStart');
  await page.waitForTimeout(700);

  // 阶段1、阶段2 都答错（点最后一个选项通常错），保证 box 不会被升上去
  // —— 但答错会归零，所以改为：直接跳过前两阶段到自评，用 Esc 之外的路径
  // 更简单：只验证自评阶段的调度函数行为——通过「模糊」后 due 是否 = 今天+INTERVALS[box-1]
  // 前两阶段都答对，避免 box 被归零
  async function answerCorrect() {
    const info = await page.evaluate(async () => {
      const isCn = !!document.querySelector('.vc-word.cn');
      const front = document.querySelector('.vc-word')?.textContent?.trim() || '';
      const opts = [...document.querySelectorAll('.vc-opt')].map(b => b.textContent.trim());
      const book = await (await fetch('assets/vocab/cet4.json')).json();
      const row = book.find(r => r[0] === front) || book.find(r => r[2] === front);
      let want = '';
      if (row) want = isCn ? row[0] : row[2];
      const idx = opts.findIndex(o => o === want);
      return { idx, want, opts };
    });
    const i = info.idx >= 0 ? info.idx : 0;
    await page.evaluate((k) => document.querySelectorAll('.vc-opt')[k].click(), i);
    await page.waitForTimeout(280);
  }

  for (let i=0;i<10;i++){
    const st=await page.evaluate(()=>({
      rates: document.querySelectorAll('[data-rate]').length,
      next: !!document.getElementById('vcNext'),
      opts: document.querySelectorAll('.vc-opt').length
    }));
    if (st.rates) break;
    if (st.next) { await page.keyboard.press(' '); await page.waitForTimeout(300); continue; }
    if (st.opts) { await answerCorrect(); }
  }
  const atRate = await page.evaluate(()=>document.querySelectorAll('[data-rate]').length);
  check('推进到自评阶段', atRate===3, {rates:atRate});

  const beforeBox = await page.evaluate(()=>(JSON.parse(localStorage.getItem('juice_vocab_v1')).books||{cet4:JSON.parse(localStorage.getItem('juice_vocab_v1'))}).cet4.words.abruptly.box);
  await page.keyboard.press('2');   // 模糊
  await page.waitForTimeout(350);
  const back = await page.evaluate(()=>!!document.querySelector('.vc-back-panel .vc-bp-h'));
  check('自评揭示后有卡片背面', back);
  await page.keyboard.press(' ');
  await page.waitForTimeout(500);

  const after = await page.evaluate(()=>{
    const r=(JSON.parse(localStorage.getItem('juice_vocab_v1')).books||{cet4:JSON.parse(localStorage.getItem('juice_vocab_v1'))}).cet4.words.abruptly;
    const today=Math.floor(Date.now()/86400000);
    return {box:r.box, due:r.due, today, seen:r.seen, wrong:r.wrong};
  });

  // 模糊的语义：box 减 1（不归零），due = today + INTERVALS[新box]
  const INTERVALS=[0,1,2,4,7,15,30];
  const expectBox = Math.max(0, beforeBox-1);
  check('「模糊」把 box 降一档', after.box === expectBox, {before:beforeBox, after:after.box, expect:expectBox});
  check('「模糊」后 due 按新档位安排（不是当天重来）',
    after.due === after.today + INTERVALS[expectBox],
    {due:after.due, today:after.today, interval:INTERVALS[expectBox]});
  check('「模糊」不计入 wrong', after.wrong === 0, {wrong:after.wrong});
  check('无 JS 报错', errs.length===0, errs.slice(0,2));

  await b.close();
  const f=R.filter(x=>!x.ok);
  console.log('\n=== '+(R.length-f.length)+'/'+R.length+' 通过 ===');
  process.exit(f.length?1:0);
})();
