const { chromium } = require('playwright');
const CHROME = process.env.CHROME_PATH || 'C:/Users/NOC/AppData/Local/ms-playwright/chromium-1234/chrome-win64/chrome.exe';
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }
(async () => {
  const b = await chromium.launch({ executablePath: CHROME });
  const page = await b.newContext({ viewport: { width: 1000, height: 900 } }).then(c => c.newPage());
  const errs = [];
  page.on('pageerror', e => errs.push(String(e)));

  // 1) 顶栏不再有刮刮乐 tab
  await page.goto('http://localhost:3456/index.html?t=' + Date.now() + '#/clock', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1800);
  const navTabs = await page.$$eval('.nav-tab', els => els.map(e => e.dataset.mod));
  check('顶栏没有 scratch tab', !navTabs.includes('scratch'), navTabs);
  check('顶栏仍有 clock tab（摸鱼解压）', navTabs.includes('clock'));

  // 2) 时钟页子导航有 4 个子标签，刮刮乐在列且默认非 active
  const pills = await page.$$eval('#mod-clock .subnav-pill-btn', els => els.map(e => ({ j: e.dataset.subJump, a: e.classList.contains('active') })));
  check('时钟页子导航 5 个子标签（+音乐播放器）', pills.length === 5, pills);
  check('子导航含 scratch', pills.some(p => p.j === 'scratch' && !p.a));

  // 3) 点刮刮乐 → scratch 模块显示，顶栏高亮 clock，子标签 active
  await page.click('#mod-clock [data-sub-jump="scratch"]');
  await page.waitForTimeout(1600);
  const st1 = await page.evaluate(() => ({
    hash: location.hash,
    scratchVisible: !!document.querySelector('#mod-scratch.active'),
    clockVisible: !!document.querySelector('#mod-clock.active'),
    activeTab: document.querySelector('.nav-tab.active')?.dataset.mod,
    activePill: document.querySelector('#mod-scratch .subnav-pill-btn.active')?.dataset.subJump,
    scratchPillCount: document.querySelectorAll('#mod-scratch .subnav-pill-btn').length,
    heroVisible: !!document.querySelector('#mod-scratch .scratch-hero')
  }));
  check('点刮刮乐后 #/scratch 激活', st1.hash === '#/scratch' && st1.scratchVisible, st1);
  check('顶栏高亮落在 clock', st1.activeTab === 'clock', st1.activeTab);
  check('刮刮乐页自身子导航 5 个且 scratch active', st1.scratchPillCount === 5 && st1.activePill === 'scratch', { c: st1.scratchPillCount, a: st1.activePill });

  // 4) 再从刮刮乐切回功德木鱼（跨模块子跳转仍正常）
  await page.click('#mod-scratch [data-sub-jump="merit"]');
  await page.waitForTimeout(1200);
  const meritOk = await page.evaluate(() => !!document.querySelector('#mod-merit.active'));
  check('刮刮乐页可切回功德木鱼', meritOk);

  // 5) 再点顶栏 clock tab → 回到上次 relax 子模块（merit）
  await page.click('.nav-tab[data-mod="clock"]');
  await page.waitForTimeout(1200);
  const back = await page.evaluate(() => ({
    hash: location.hash,
    meritActive: !!document.querySelector('#mod-merit.active')
  }));
  check('顶栏 clock 记住上次子页（merit）', back.hash === '#/merit' && back.meritActive, back);

  // 6) 直链 #/scratch 可用
  await page.goto('http://localhost:3456/index.html?t=' + Date.now() + '#/scratch', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(2000);
  const direct = await page.evaluate(() => ({
    scratchVisible: !!document.querySelector('#mod-scratch.active'),
    activeTab: document.querySelector('.nav-tab.active')?.dataset.mod,
    pillActive: document.querySelector('#mod-scratch .subnav-pill-btn.active')?.dataset.subJump,
    subnavVisible: (() => { const el = document.querySelector('#mod-scratch .subnav-pill-bar'); return el ? el.getBoundingClientRect().height > 0 : false; })()
  }));
  check('直链 #/scratch 激活', direct.scratchVisible, direct);
  check('直链时顶栏高亮 clock', direct.activeTab === 'clock');
  check('直链时子导航可见且 scratch active', direct.subnavVisible && direct.pillActive === 'scratch');

  // 7) 关于弹窗：8 大功能（刮刮乐并入摸鱼解压后为 8 项），无独立行
  await page.evaluate(() => document.getElementById('globalBtnAbout').click());
  await page.waitForTimeout(900);
  const about = await page.evaluate(() => {
    const body = document.querySelector('.gp-body');
    const t = body ? body.textContent : '';
    return {
      eight: t.includes('8 大功能') && !t.includes('9 大功能') && !t.includes('10 大功能'),
      merged: /摸鱼解压[\s\S]*?幸运刮刮乐/.test(t),
      noStandaloneLine: ![...document.querySelectorAll('.gp-func-list > div')].some(d => d.textContent.trim().startsWith('🎟️'))
    };
  });
  check('关于弹窗显示 8 大功能', about.eight);
  check('刮刮乐并入摸鱼解压行', about.merged && about.noStandaloneLine);

  // 8) 无页面报错
  check('无 pageerror', errs.length === 0, errs);

  await page.screenshot({ path: 'shots/scratch-merge-subnav.png', fullPage: false });
  await b.close();
  const fail = R.filter(r => !r.ok).length;
  console.log('\n== ' + (R.length - fail) + '/' + R.length + ' PASS ==');
  process.exit(fail ? 1 : 0);
})().catch(e => { console.error(e); process.exit(2); });
