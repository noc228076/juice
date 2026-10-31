const { chromium } = require('playwright');
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://localhost:3456/index.html?t=' + Date.now() + '&v=fk1#/films', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3200);

  // 1. 分类里有「★ 我的收藏」入口
  const cats = await p.evaluate(() => [...document.querySelectorAll('#filmsCats [data-cat]')].map(x => x.textContent.trim()).slice(0, 3));
  check('分类含「★ 我的收藏」', cats.some(t => t.includes('我的收藏')), cats);

  // 2. 收藏一个站点：toast + ★ + 计数 + 不跳顶
  const firstId = await p.evaluate(() => document.querySelector('#filmsGrid [data-fav]')?.getAttribute('data-fav'));
  await p.evaluate(() => document.getElementById('filmsGrid').scrollIntoView({ block: 'center' }));
  await p.waitForTimeout(300);
  const scrollBefore = await p.evaluate(() => Math.round(document.getElementById('modules-viewport').scrollTop));
  await p.click('#filmsGrid [data-fav]');
  await p.waitForTimeout(600);
  const s1 = await p.evaluate(() => ({
    fav: JSON.parse(localStorage.getItem('juice_films_fav_v1') || '[]'),
    toastShown: (document.getElementById('filmsToast')?.classList.contains('show')) || (document.getElementById('filmsToast')?.textContent || '').length > 0,
    star: document.querySelector('#filmsGrid [data-fav]')?.textContent,
    catLabel: [...document.querySelectorAll('#filmsCats [data-cat]')].find(x => x.textContent.includes('我的收藏'))?.textContent.trim()
  }));
  check('收藏入库', s1.fav.length === 1 && s1.fav[0] === firstId, s1.fav);
  check('收藏有 toast 反馈', s1.toastShown, s1.toastShown);
  check('星标原地更新', s1.star === '★', s1.star);
  check('「我的收藏」计数 +1', /1/.test(s1.catLabel || ''), s1.catLabel);
  const scrollAfter = await p.evaluate(() => Math.round(document.getElementById('modules-viewport').scrollTop));
  check('收藏不引起滚动跳动', Math.abs(scrollAfter - scrollBefore) < 4, { before: scrollBefore, after: scrollAfter });

  // 3. 「我的收藏」视图过滤
  await p.evaluate(() => [...document.querySelectorAll('#filmsCats [data-cat]')].find(x => x.textContent.includes('我的收藏')).click());
  await p.waitForTimeout(500);
  const s2 = await p.evaluate(() => ({
    cards: document.querySelectorAll('#filmsGrid .films-card').length,
    sub: document.getElementById('filmsSub')?.textContent || ''
  }));
  check('收藏视图只显示 1 张卡片', s2.cards === 1 && s2.sub.includes('我的收藏'), s2);

  // 4. 收藏视图里取消收藏 → 卡片移除
  await p.click('#filmsGrid [data-fav]');
  await p.waitForTimeout(500);
  const s3 = await p.evaluate(() => ({
    fav: JSON.parse(localStorage.getItem('juice_films_fav_v1') || '[]').length,
    cards: document.querySelectorAll('#filmsGrid .films-card').length,
    empty: (document.getElementById('filmsGrid')?.textContent || '').includes('还没有收藏')
  }));
  check('收藏视图取消后移除并显示引导', s3.fav === 0 && s3.cards === 0 && s3.empty, s3);

  // 5. 重新收藏 → 按 ` 键切到木鱼
  await p.evaluate(() => { [...document.querySelectorAll('#filmsCats [data-cat]')].find(x => x.getAttribute('data-cat') === '').click(); });
  await p.waitForTimeout(400);
  await p.click('#filmsGrid [data-fav]');
  await p.waitForTimeout(400);
  await p.keyboard.press('`');
  await p.waitForTimeout(1800);
  const s4 = await p.evaluate(() => ({ hash: location.hash, active: document.querySelector('.app-module.active')?.id }));
  check('按 ` 键触发老板键切到木鱼', s4.hash === '#/merit' && s4.active === 'mod-merit', s4);

  // 6. 木鱼模块里按 ` 不应误触发（切到别处）
  await p.keyboard.press('`');
  await p.waitForTimeout(1200);
  const s5 = await p.evaluate(() => ({ hash: location.hash, active: document.querySelector('.app-module.active')?.id }));
  check('其他模块按 ` 不误触发', s5.hash === '#/merit' && s5.active === 'mod-merit', s5);

  check('无 JS 报错', errs.length === 0, errs.slice(0, 2));
  await b.close();
  const f = R.filter(x => !x.ok);
  console.log('\n=== ' + (R.length - f.length) + '/' + R.length + ' 通过 ===');
  process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
