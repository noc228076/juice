/* 选择题答错 → 三种题型排到队尾重来一遍 */
const { chromium } = require('playwright');
const CHROME=process.env.CHROME_PATH||'C:/Users/NOC/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
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

  // 第 1 题故意答错（点最后一个）
  const wrongWord = await page.evaluate(()=>document.querySelector('.vc-word')?.textContent?.trim());
  await page.evaluate(()=>{ const o=document.querySelectorAll('.vc-opt'); o[o.length-1].click(); });
  await page.waitForTimeout(350);
  const fb = await page.evaluate(()=>document.getElementById('vcFb')?.classList.contains('bad'));
  check('第 1 题判错', fb, {word: wrongWord});
  const wrong = await page.evaluate(()=>{const s0=JSON.parse(localStorage.getItem('juice_vocab_v1'));return ((s0.books||{cet4:s0}).cet4).words||{};});
  const wk = Object.keys(wrong).find(k=>wrong[k].wrong>0);
  check('答错的词 wrong+1', !!wk, {wrongWord: wk, wrong: wk && wrong[wk].wrong});

  // 继续走完阶段1 原队列（第 2 题）
  await page.keyboard.press(' ');
  await page.waitForTimeout(350);
  await page.evaluate(()=>{ const o=document.querySelectorAll('.vc-opt'); o[o.length-1].click(); });
  await page.waitForTimeout(350);
  await page.keyboard.press(' ');
  await page.waitForTimeout(400);

  // 阶段1 末应补一轮重走：题数变成 2（原错词），且仍是英选中
  const afterStage1 = await page.evaluate(()=>({
    no: document.querySelector('.vc-count')?.textContent?.trim(),
    isCn: !!document.querySelector('.vc-word.cn'),
    word: document.querySelector('.vc-word')?.textContent?.trim(),
    hasRate: document.querySelectorAll('[data-rate]').length>0
  }));
  check('阶段1 结束后补一轮重走', /\/ 2$/.test(afterStage1.no||'') || /\/ 1$/.test(afterStage1.no||''), afterStage1.no);
  check('重走仍是英选中题型', !afterStage1.isCn && !afterStage1.hasRate, afterStage1);

  // 走完重走轮，进阶段2
  for(let i=0;i<4;i++){
    const st=await page.evaluate(()=>({
      isCn: !!document.querySelector('.vc-word.cn'),
      rates: document.querySelectorAll('[data-rate]').length,
      opts: document.querySelectorAll('.vc-opt').length
    }));
    if(st.isCn && !st.rates) break;   // 已进阶段2
    if(st.rates){ await page.click('[data-rate="know"]'); await page.waitForTimeout(250); }
    else if(st.opts){ await page.evaluate(()=>{const o=document.querySelectorAll('.vc-opt');o[o.length-1].click();}); await page.waitForTimeout(250); }
    await page.keyboard.press(' ');
    await page.waitForTimeout(350);
  }
  const stage2 = await page.evaluate(()=>({
    isCn: !!document.querySelector('.vc-word.cn'),
    no: document.querySelector('.vc-count')?.textContent?.trim()
  }));
  check('之后进入阶段2（中选英）', stage2.isCn, stage2);

  check('无 JS 报错', errs.length===0, errs.slice(0,2));
  await b.close();
  const f=R.filter(x=>!x.ok);
  console.log('\n=== '+(R.length-f.length)+'/'+R.length+' 通过 ===');
  if(f.length) f.forEach(x=>console.log('  - '+x.n+' → '+JSON.stringify(x.d)));
  process.exit(f.length?1:0);
})();
