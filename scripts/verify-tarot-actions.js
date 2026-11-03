/* 塔罗结果页操作按钮：移动端两行胶囊、桌面端保持单行 */
const { chromium } = require('playwright');
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }

async function inspect(browser, width, height) {
  const ctx = await browser.newContext({ viewport: { width, height }, isMobile: width < 700, hasTouch: width < 700, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:3456/index.html?t=' + Date.now() + '#/tarot', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1600);
  const r = await p.evaluate(() => {
    const mod = document.getElementById('mod-tarot');
    mod.querySelectorAll('.tr-screen').forEach(x => x.classList.remove('active'));
    const res = document.getElementById('sc-tr-result');
    res.classList.add('active');
    res.style.opacity = '1';
    const cont = res.querySelector('.tr-result-actions');
    const cs = getComputedStyle(cont);
    const btns = [...cont.querySelectorAll('.tr-btn')].map(x => {
      const b = x.getBoundingClientRect();
      return { id: x.id, w: Math.round(b.width), h: Math.round(b.height), br: getComputedStyle(x).borderRadius, overflow: x.scrollWidth > x.clientWidth + 1 };
    });
    return {
      display: cs.display,
      cols: cs.gridTemplateColumns,
      contW: Math.round(cont.getBoundingClientRect().width),
      btns,
      pageOverflow: document.documentElement.scrollWidth > innerWidth,
    };
  });
  await ctx.close();
  return { r, errs };
}

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });

  const m430 = await inspect(b, 430, 932);
  check('430 结果按钮为网格布局', m430.r.display === 'grid', m430.r.display);
  check('430 保存按钮独占整行', m430.r.btns[0].w === m430.r.contW, { save: m430.r.btns[0].w, row: m430.r.contW });
  check('430 三按钮均为 46px 胶囊', m430.r.btns.every(x => x.h === 46 && x.br === '999px'), m430.r.btns.map(x => [x.h, x.br]));
  check('430 文案不溢出', m430.r.btns.every(x => !x.overflow), m430.r.btns.map(x => x.overflow));
  check('430 无横向溢出', !m430.r.pageOverflow, m430.r.pageOverflow);

  const m360 = await inspect(b, 360, 780);
  check('360 保存按钮独占整行', m360.r.btns[0].w === m360.r.contW, { save: m360.r.btns[0].w, row: m360.r.contW });
  check('360 文案不溢出', m360.r.btns.every(x => !x.overflow), m360.r.btns.map(x => x.overflow));
  check('360 无横向溢出', !m360.r.pageOverflow, m360.r.pageOverflow);

  const d = await inspect(b, 1280, 900);
  check('桌面端保持单行 flex', d.r.display === 'flex', d.r.display);
  check('桌面端按钮 48px', d.r.btns.every(x => x.h === 48), d.r.btns.map(x => x.h));

  const errs = [...m430.errs, ...m360.errs, ...d.errs];
  check('无 JS 报错', errs.length === 0, errs.slice(0, 3));

  await b.close();
  const pass = R.filter(x => x.ok).length;
  console.log(`\n== ${pass}/${R.length} PASS ==`);
  if (pass !== R.length) process.exit(1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
