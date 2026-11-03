/* 弹幕墙切走再切回：rAF 必须重启，弹幕不能定格 */
const { chromium } = require('playwright');
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));

  const wall = Array.from({ length: 8 }, (_, i) => ({
    name: '玩家' + i, avatar: '🙂', text: '这是一条测试弹幕 ' + i,
    at: Date.now() - i * 60000, mine: false,
  }));
  await p.route('**/api/wall**', route => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ ok: true, wall, total: wall.length }),
  }));

  await p.goto('http://127.0.0.1:3456/index.html?t=' + Date.now() + '#/wall', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(2600);

  const positions = () => p.evaluate(() => [...document.querySelectorAll('.wl-dm')].map(x => Math.round(x.getBoundingClientRect().left)));
  const first = await positions();
  await p.waitForTimeout(600);
  const second = await positions();
  const movedActive = first.filter((x, i) => second[i] !== undefined && second[i] !== x).length;
  check('进入时弹幕在飞', first.length >= 3 && movedActive >= 3, { count: first.length, moved: movedActive });

  // 切走 1.2s 再切回
  await p.evaluate(() => { location.hash = '#/clock'; });
  await p.waitForTimeout(1200);
  const left = await p.evaluate(() => ({
    active: document.getElementById('mod-wall').classList.contains('active'),
    count: document.querySelectorAll('.wl-dm').length,
  }));
  check('切走后弹幕墙失活且元素保留', !left.active && left.count > 0, left);

  await p.evaluate(() => { location.hash = '#/wall'; });
  await p.waitForTimeout(1400);
  const r1 = await positions();
  await p.waitForTimeout(700);
  const r2 = await positions();
  const movedBack = r1.filter((x, i) => r2[i] !== undefined && r2[i] !== x).length;
  check('切回后弹幕继续移动', r1.length > 0 && movedBack === r1.length, { count: r1.length, moved: movedBack });

  // 再切一次，确认不会叠加出双倍速度或重复实例
  await p.evaluate(() => { location.hash = '#/films'; });
  await p.waitForTimeout(900);
  await p.evaluate(() => { location.hash = '#/wall'; });
  await p.waitForTimeout(1200);
  const q1 = await positions();
  await p.waitForTimeout(700);
  const q2 = await positions();
  const movedTwice = q1.filter((x, i) => q2[i] !== undefined && q2[i] !== x).length;
  check('二次切回仍正常续飞', q1.length > 0 && movedTwice === q1.length, { count: q1.length, moved: movedTwice });

  check('无 JS 报错', errs.length === 0, errs.slice(0, 3));

  await b.close();
  const pass = R.filter(x => x.ok).length;
  console.log(`\n== ${pass}/${R.length} PASS ==`);
  if (pass !== R.length) process.exit(1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
