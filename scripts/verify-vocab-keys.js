const { chromium } = require('playwright');
const CHROME=process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const R=[]; function check(n,ok,d){R.push({n,ok:!!ok,d});console.log((ok?'PASS':'FAIL')+'  '+n+(d!==undefined?'  → '+JSON.stringify(d):''));}
(async()=>{
  const b=await chromium.launch({executablePath:CHROME});
  const page=await b.newContext({viewport:{width:900,height:900}}).then(c=>c.newPage());
  const errs=[]; page.on('pageerror',e=>errs.push(String(e)));
  await page.goto('http://localhost:3456/index.html?t='+Date.now()+'#/vocab',{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  await page.evaluate(()=>localStorage.setItem('juice_vocab_v1',JSON.stringify({
    book:'cet4',day:'',newDoneToday:0,doneToday:0,streak:0,lastDone:'',
    words:{},seq:0,dailyNew:2,order:'seq',totalMs:0,totalAnswered:0,totalRight:0,days:{}})));
  await page.reload({waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2500);
  await page.click('#vcStart');
  await page.waitForTimeout(700);

  // 键盘选选项
  await page.keyboard.press('1');
  await page.waitForTimeout(350);
  const k1 = await page.evaluate(()=>({
    hasFb: document.getElementById('vcFb')?.classList.contains('show'),
    more: document.querySelectorAll('.vc-opt-more.show').length
  }));
  check('数字键 1 能选第一个选项', k1.hasFb && k1.more===4, k1);

  // 空格进下一题
  const before = await page.evaluate(()=>document.querySelector('.vc-count')?.textContent?.trim());
  await page.keyboard.press(' ');
  await page.waitForTimeout(400);
  const after = await page.evaluate(()=>document.querySelector('.vc-count')?.textContent?.trim());
  check('空格进入下一题', before!==after, {before,after});

  // 走完阶段1剩余题，进阶段2
  for(let i=0;i<4;i++){
    const hasFb = await page.evaluate(()=>!!document.getElementById('vcNext'));
    if(hasFb){ await page.keyboard.press(' '); await page.waitForTimeout(300); continue; }
    const hasOpts = await page.evaluate(()=>document.querySelectorAll('.vc-opt').length);
    if(hasOpts){ await page.keyboard.press('1'); await page.waitForTimeout(250); }
    else break;
  }

  // 找到自评题验背面 + 模糊降档
  let found=false;
  for(let i=0;i<12;i++){
    const st=await page.evaluate(()=>({
      hasRate: document.querySelectorAll('[data-rate]').length>0,
      hasFb: !!document.getElementById('vcNext')
    }));
    if(st.hasRate){ found=true; break; }
    if(st.hasFb){ await page.keyboard.press(' '); await page.waitForTimeout(280); continue; }
    const hasOpts=await page.evaluate(()=>document.querySelectorAll('.vc-opt').length);
    if(hasOpts){ await page.keyboard.press('1'); await page.waitForTimeout(250); }
    else break;
  }
  check('能走到自评阶段', found);

  if(found){
    // 键盘 2 = 模糊
    await page.keyboard.press('2');
    await page.waitForTimeout(400);
    const r = await page.evaluate(()=>({
      revealed: !!document.querySelector('.vc-reveal-meaning')?.textContent,
      backPanel: !!document.getElementById('vcBackPanel'),
      backBlocks: [...document.querySelectorAll('.vc-back-panel .vc-bp-h')].map(d=>d.textContent.trim()),
      tag: document.querySelector('.vc-reveal-tag')?.textContent
    }));
    check('自评点完揭示释义', r.revealed, r.revealed);
    check('自评揭示后有卡片背面', r.backPanel && r.backBlocks.length>0, r.backBlocks);
    check('键盘 2 选中「模糊」', /模糊/.test(r.tag||''), r.tag);

    await page.keyboard.press(' ');
    await page.waitForTimeout(400);
  }

  // Esc 返回
  await page.keyboard.press('Escape');
  await page.waitForTimeout(500);
  const backHome = await page.evaluate(()=>!!document.querySelector('.vc-subnav'));
  check('Esc 能返回今日屏', backHome);

  check('无 JS 报错', errs.length===0, errs.slice(0,2));
  await b.close();
  const f=R.filter(x=>!x.ok);
  console.log('\n=== '+(R.length-f.length)+'/'+R.length+' 通过 ===');
  if(f.length) f.forEach(x=>console.log('  - '+x.n+' → '+JSON.stringify(x.d)));
  process.exit(f.length?1:0);
})();
