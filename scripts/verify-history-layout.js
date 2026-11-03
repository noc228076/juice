/* 档案抽屉重排回归：分类只显示有记录的项、卡片操作下移、窄屏筛选换行 */
const { chromium } = require('playwright');
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }

const seed = () => {
  const H = window.UniversalHistory;
  H.clear();
  H.add({ module: 'decision', title: '裁决: 冲 / 去', subtitle: '量子抛硬币 · 今天要不要出门', color: '#34D399', badge: '决策', avatar: '🪙' });
  H.add({ module: 'decision', title: '裁决: 1 点 · 小（稳一手）', subtitle: '命运掷骰子 · 大小单双', color: '#34D399', badge: '决策', avatar: '🪙' });
  H.add({ module: 'decision', title: '裁决: 阴杯 · 暂缓行动', subtitle: '祈愿掷圣杯 · 诚心默念', color: '#34D399', badge: '决策', avatar: '🪙' });
  H.add({ module: 'manual', title: '说明书 · 舒尔特方格：专注入门', subtitle: '5×5 方格 · 用时 28.4 秒', color: '#A78BFA', badge: '说明书', avatar: '📖' });
  H.add({ module: 'drinks', title: '你的特调人格是「青柠气泡」', subtitle: '清爽 · 直接 · 行动派', color: '#D6FF4B', badge: '特调', avatar: '🍹' });
  H.openDrawer();
};

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const errs = [];

  // 手机 430
  const ctx = await b.newContext({ viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  p.on('pageerror', e => errs.push(String(e)));
  await p.goto('http://127.0.0.1:3456/index.html?t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1500);
  await p.evaluate(seed);
  await p.waitForTimeout(500);

  const m = await p.evaluate(() => {
    const card = document.querySelector('.uni-hist-item');
    const title = card.querySelector('.uni-hist-title');
    const tag = card.querySelector('.uni-hist-mod-tag');
    const time = card.querySelector('.uni-hist-time');
    const body = card.querySelector('.uni-hist-body');
    const ops = card.querySelector('.uni-hist-ops');
    const lh = parseFloat(getComputedStyle(title).lineHeight);
    return {
      chips: [...document.querySelectorAll('.uni-filter-chip')].map(x => x.textContent.trim().replace(/\s+/g, ' ')),
      zeroChips: [...document.querySelectorAll('.uni-filter-chip')].filter(x => / 0$/.test(x.textContent.trim())).length,
      titleLines: Math.round(title.getBoundingClientRect().height / lh),
      tagH: Math.round(tag.getBoundingClientRect().height),
      timeH: Math.round(time.getBoundingClientRect().height),
      opsBelow: ops.getBoundingClientRect().top >= body.getBoundingClientRect().bottom - 1,
      cardOverflow: card.scrollWidth > card.clientWidth,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      cardH: Math.round(card.getBoundingClientRect().height),
    };
  });
  check('分类只保留有记录的项', m.chips.length === 4, m.chips);
  check('不出现 0 条分类', m.zeroChips === 0, m.zeroChips);
  check('标题单行显示', m.titleLines === 1, m.titleLines);
  check('分类标签不被挤成竖排', m.tagH <= 24, m.tagH);
  check('时间单行显示', m.timeH <= 18, m.timeH);
  check('操作行位于正文下方', m.opsBelow, m.opsBelow);
  check('卡片无横向溢出', !m.cardOverflow && !m.pageOverflow, { card: m.cardOverflow, page: m.pageOverflow });

  // 筛选 + 删除最后一条后仍保留当前分类
  await p.evaluate(() => [...document.querySelectorAll('.uni-filter-chip')].find(x => x.dataset.mod === 'decision').click());
  await p.waitForTimeout(300);
  const f1 = await p.evaluate(() => ({
    items: document.querySelectorAll('.uni-hist-item').length,
    active: (document.querySelector('.uni-filter-chip.active') || {}).dataset.mod,
    sub: document.getElementById('historySubText').textContent,
  }));
  check('分类筛选生效', f1.items === 3 && f1.active === 'decision' && /3/.test(f1.sub), f1);

  await p.evaluate(() => { window.confirm = () => true; document.querySelector('.uni-btn-del').click(); });
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.uni-btn-del').click());
  await p.waitForTimeout(300);
  await p.evaluate(() => document.querySelector('.uni-btn-del').click());
  await p.waitForTimeout(400);
  const f2 = await p.evaluate(() => ({
    chips: [...document.querySelectorAll('.uni-filter-chip')].map(x => x.textContent.trim().replace(/\s+/g, ' ')),
    empty: !!document.querySelector('.history-empty'),
    active: (document.querySelector('.uni-filter-chip.active') || {}).dataset.mod,
  }));
  check('删空后保留当前分类（0 条）', f2.chips.some(t => t.includes('决策 0')) && f2.active === 'decision', f2.chips);
  check('删空后显示空态', f2.empty, f2.empty);
  await p.evaluate(() => [...document.querySelectorAll('.uni-filter-chip')].find(x => x.dataset.mod === 'all').click());
  await p.waitForTimeout(300);
  const f3 = await p.evaluate(() => [...document.querySelectorAll('.uni-filter-chip')].map(x => x.textContent.trim().replace(/\s+/g, ' ')));
  check('回到全部后 0 条分类隐藏', !f3.some(t => t.includes('决策')), f3);
  await ctx.close();

  // 窄屏 360：筛选条换行，不横向截断
  const ctx2 = await b.newContext({ viewport: { width: 360, height: 780 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errs.push(String(e)));
  await p2.goto('http://127.0.0.1:3456/index.html?t=' + Date.now(), { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(1500);
  await p2.evaluate(seed);
  await p2.waitForTimeout(500);
  const n = await p2.evaluate(() => {
    const bar = document.querySelector('.uni-history-filter-bar');
    const rows = new Set([...document.querySelectorAll('.uni-filter-chip')].map(x => Math.round(x.getBoundingClientRect().top))).size;
    return {
      wrap: getComputedStyle(bar).flexWrap,
      rows,
      barOverflow: bar.scrollWidth > bar.clientWidth + 1,
      pageOverflow: document.documentElement.scrollWidth > window.innerWidth,
      cardOverflow: document.querySelector('.uni-hist-item').scrollWidth > document.querySelector('.uni-hist-item').clientWidth,
    };
  });
  check('360 筛选条换行', n.wrap === 'wrap' && n.rows >= 2, { wrap: n.wrap, rows: n.rows });
  check('360 无横向截断', !n.barOverflow && !n.pageOverflow && !n.cardOverflow, n);
  await ctx2.close();

  check('无 JS 报错', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const pass = R.filter(x => x.ok).length;
  console.log(`\n== ${pass}/${R.length} PASS ==`);
  if (pass !== R.length) process.exit(1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
