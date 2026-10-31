const { chromium } = require('playwright');
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }
(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://localhost:3456/index.html?t=' + Date.now() + '#/daily', { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(3500);
  // 进入壁纸板块
  await p.click('[data-sec="wallpaper"]');
  await p.waitForTimeout(1200);

  // 1. 源切换条存在，默认必应
  const s0 = await p.evaluate(() => ({
    chips: [...document.querySelectorAll('#dlWpSourceBar [data-wp-source]')].map(x => x.dataset.wpSource),
    active: document.querySelector('#dlWpSourceBar .active')?.dataset.wpSource,
    bingThumbs: document.querySelectorAll('#dlWpGalleryGrid .daily-wp-thumb-card').length,
    refreshHidden: document.getElementById('dlWpRefreshRandom')?.hidden,
    customHidden: document.getElementById('dlWpCustomBox')?.hidden
  }));
  check('源切换条三 chips，默认必应', s0.chips.join(',') === 'bing,random,custom' && s0.active === 'bing', s0);
  check('必应画廊已加载（≥1 张）', s0.bingThumbs >= 1, s0.bingThumbs);

  // 2. 切随机灵感：9 张 picsum + 换一批显示
  await p.click('#dlWpSourceBar [data-wp-source="random"]');
  await p.waitForTimeout(1500);
  const s1 = await p.evaluate(() => ({
    active: document.querySelector('#dlWpSourceBar .active')?.dataset.wpSource,
    thumbs: [...document.querySelectorAll('#dlWpGalleryGrid .daily-wp-thumb-card')].length,
    picsum: [...document.querySelectorAll('#dlWpGalleryGrid img')].filter(i => /picsum\.photos/.test(i.src)).length,
    refreshShown: document.getElementById('dlWpRefreshRandom')?.hidden === false,
    mainImg: document.getElementById('dlWpMainImg')?.src || '',
    title: document.getElementById('dlWpGalleryTitle')?.textContent || ''
  }));
  check('随机源：9 张 picsum 画廊', s1.thumbs === 9 && s1.picsum === 9, s1.thumbs + '/' + s1.picsum);
  check('随机源：换一批显示 + 大图是 picsum', s1.refreshShown && /picsum\.photos/.test(s1.mainImg), s1);
  check('随机源：画廊标题更新', s1.title.includes('随机灵感'), s1.title);

  // 换一批 → seed 变化
  const firstBefore = await p.evaluate(() => document.querySelector('#dlWpGalleryGrid img')?.src);
  await p.click('#dlWpRefreshRandom');
  await p.waitForTimeout(800);
  const firstAfter = await p.evaluate(() => document.querySelector('#dlWpGalleryGrid img')?.src);
  check('换一批后 seed 变化', firstBefore !== firstAfter, { before: (firstBefore || '').slice(30, 80), after: (firstAfter || '').slice(30, 80) });

  // 3. 切我的壁纸：空态提示
  await p.click('#dlWpSourceBar [data-wp-source="custom"]');
  await p.waitForTimeout(600);
  const s2 = await p.evaluate(() => ({
    customShown: document.getElementById('dlWpCustomBox')?.hidden === false,
    emptyTip: (document.getElementById('dlWpGalleryGrid')?.textContent || '').includes('还没有保存的壁纸')
  }));
  check('自定义源：输入区显示 + 空态提示', s2.customShown && s2.emptyTip, s2);

  // 3a. 非法 URL 拒绝
  await p.fill('#dlWpCustomUrl', 'javascript:alert(1)');
  await p.click('#dlWpCustomAdd');
  await p.waitForTimeout(500);
  const rej = await p.evaluate(() => (JSON.parse(localStorage.getItem('juice_daily_wp_custom') || '[]')).length);
  check('javascript: URL 被拒绝', rej === 0, rej);

  // 3b. 合法 URL 添加（用必应真实图）
  const okUrl = await p.evaluate(() => document.querySelector('#dlWpGalleryGrid img')?.src || 'https://picsum.photos/seed/t/1920/1080');
  await p.fill('#dlWpCustomUrl', okUrl);
  await p.click('#dlWpCustomAdd');
  await p.waitForTimeout(3500);
  const s3 = await p.evaluate(() => {
    const list = JSON.parse(localStorage.getItem('juice_daily_wp_custom') || '[]');
    return {
      count: list.length,
      thumbs: document.querySelectorAll('#dlWpGalleryGrid .daily-wp-thumb-card').length,
      delBtns: document.querySelectorAll('#dlWpGalleryGrid .daily-wp-thumb-del').length,
      mainIsCustom: /bing\.com|picsum\.photos/.test(document.getElementById('dlWpMainImg')?.src || '')
    };
  });
  check('合法 URL 已入库并渲染', s3.count === 1 && s3.thumbs === 1 && s3.delBtns === 1, s3);

  // 3c. 设为全站背景（custom 源）
  await p.click('#dlWpBtnSetBg');
  await p.waitForTimeout(3000);
  const bg = await p.evaluate(() => ({
    active: localStorage.getItem('daily_site_bg_active'),
    url: localStorage.getItem('daily_site_bg_url'),
    cls: document.documentElement.classList.contains('has-daily-ambient-bg')
  }));
  check('自定义图可设为全站背景', bg.active === 'true' && bg.url && /^https:/.test(bg.url) && bg.cls, bg);

  // 3d. 删除唯一一张 → 空态；全站背景仍在（互不影响）
  await p.hover('#dlWpGalleryGrid .daily-wp-thumb-card');
  await p.click('#dlWpGalleryGrid .daily-wp-thumb-del');
  await p.waitForTimeout(800);
  const s4 = await p.evaluate(() => ({
    count: (JSON.parse(localStorage.getItem('juice_daily_wp_custom') || '[]')).length,
    bgStill: localStorage.getItem('daily_site_bg_active') === 'true'
  }));
  check('删除后列表清空，全站背景不受影响', s4.count === 0 && s4.bgStill, s4);

  // 关闭全站背景，清理
  await p.click('#dlWpBtnSetBg');
  await p.waitForTimeout(1200);

  // 4. 切回必应：画廊回归 + 持久化源
  await p.click('#dlWpSourceBar [data-wp-source="bing"]');
  await p.waitForTimeout(1500);
  const s5 = await p.evaluate(() => ({
    src: localStorage.getItem('juice_daily_wp_source'),
    active: document.querySelector('#dlWpSourceBar .active')?.dataset.wpSource,
    bingBack: [...document.querySelectorAll('#dlWpGalleryGrid img')].filter(i => /bing\.com/.test(i.src)).length
  }));
  check('切回必应且源已持久化', s5.src === 'bing' && s5.active === 'bing' && s5.bingBack >= 1, s5);

  check('无 JS 报错', errs.length === 0, errs.slice(0, 2));
  await b.close();
  const f = R.filter(x => !x.ok);
  console.log('\n=== ' + (R.length - f.length) + '/' + R.length + ' 通过 ===');
  process.exit(f.length ? 1 : 0);
})().catch(e => { console.error(e); process.exit(1); });
