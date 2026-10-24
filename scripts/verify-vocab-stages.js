const { chromium } = require('playwright');
const CHROME=process.env.CHROME_PATH||'C:/Users/NOC/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const R=[]; function check(n,ok,d){R.push({n,ok:!!ok,d});console.log((ok?'PASS':'FAIL')+'  '+n+(d!==undefined?'  → '+JSON.stringify(d):''));}
(async()=>{
  const b=await chromium.launch({executablePath:CHROME});
  const page=await b.newContext({viewport:{width:900,height:900}}).then(c=>c.newPage());
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto('http://localhost:3456/index.html?t='+Date.now()+'#/vocab',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  await page.evaluate(()=>localStorage.setItem('juice_vocab_v1',JSON.stringify({
    book:'cet4',day:'',newDoneToday:0,doneToday:0,streak:0,lastDone:'',
    words:{},seq:0,dailyNew:3,order:'seq',totalMs:0,totalAnswered:0,totalRight:0,days:{}})));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  await page.click('#vcStart');
  await page.waitForTimeout(800);

  // 每题都答对，避免触发「答错补一轮」把阶段拉长
  async function answerCorrect(){
    const info=await page.evaluate(async()=>{
      const isCn=!!document.querySelector('.vc-word.cn');
      const front=document.querySelector('.vc-word')?.textContent?.trim()||'';
      const opts=[...document.querySelectorAll('.vc-opt')].map(b=>b.textContent.trim());
      const book=await (await fetch('assets/vocab/cet4.json')).json();
      const row=book.find(r=>r[0]===front)||book.find(r=>r[2]===front);
      const want=row?(isCn?row[0]:row[2]):'';
      return {idx:opts.findIndex(o=>o===want)};
    });
    await page.evaluate(k=>document.querySelectorAll('.vc-opt')[k].click(), info.idx>=0?info.idx:0);
    await page.waitForTimeout(240);
  }

  const log=[];
  for(let i=0;i<9;i++){
    const st=await page.evaluate(()=>({
      type:document.querySelectorAll('[data-rate]').length?'自评':document.querySelector('.vc-word.cn')?'中选英':'英选中',
      no:document.querySelector('.vc-count')?.textContent?.trim()
    }));
    log.push(st);
    const rate=await page.$('[data-rate="know"]');
    if(rate){await rate.click();await page.waitForTimeout(220);}
    else{ await answerCorrect(); }
    const nb=await page.$('#vcNext');
    if(nb){await nb.click();await page.waitForTimeout(320);}
  }
  const types=log.map(x=>x.type);
  check('阶段 1 全是英选中', types.slice(0,3).every(t=>t==='英选中'), types.slice(0,3));
  check('阶段 2 全是中选英', types.slice(3,6).every(t=>t==='中选英'), types.slice(3,6));
  check('阶段 3 全是自评', types.slice(6,9).every(t=>t==='自评'), types.slice(6,9));
  check('顺序严格是 英选中 → 中选英 → 自评', types.join(',')==='英选中,英选中,英选中,中选英,中选英,中选英,自评,自评,自评', types);
  check('每阶段题数 = 词数（3）', log[0].no==='1 / 3' && log[3].no==='1 / 3' && log[6].no==='1 / 3',
    {s1:log[0].no,s2:log[3].no,s3:log[6].no});
  check('无 JS 报错', errs.length===0, errs.slice(0,2));
  await b.close();
  const f=R.filter(x=>!x.ok);
  console.log('\n=== '+(R.length-f.length)+'/'+R.length+' 通过 ===');
  process.exit(f.length?1:0);
})();
