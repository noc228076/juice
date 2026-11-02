/* 扫雷真实对局冒烟：开局 → 连续点格子 → 必然触发 over → settle/finish 链 → 结果屏。
   这是 R9 复查 P0（settle 断链）的回归用例。 */
const { chromium } = require('playwright');

(async () => {
  const b = await chromium.launch({
    headless: true,
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    args: ['--no-proxy-server'],
  });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', (e) => errs.push(String(e).slice(0, 200)));

  await page.goto('http://127.0.0.1:3456/index.html?t=' + Date.now() + '#/manual', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('#mod-manual.active', { timeout: 10000 });
  await page.waitForTimeout(1500);

  // 打开扫雷章节
  await page.evaluate(() => { window.AppManual.openTest('minesweeper'); });
  await page.waitForSelector('#scr-sm-mine.active', { timeout: 8000 });
  await page.waitForTimeout(600);

  // 选难度（初级 9x9 · 10 雷）开局：intro 是难度选择，无「开始」钮
  await page.locator('#scr-sm-mine button', { hasText: '初级' }).first().click();
  await page.waitForTimeout(600);

  /* 扫雷每秒 paint() 重建棋盘 DOM，外部坐标点击会和重绘竞态：
     在 evaluate 内直接对当格派发 click（同 [[iab-canvas-testing]] 教训） */
  for (let i = 0; i < 26; i++) {
    const r = await page.evaluate(() => {
      const cells = document.querySelectorAll('#msGrid .ms-cell:not(.open)');
      if (!cells.length) return { done: true };
      cells[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      const scr = document.getElementById('scr-sm-mine');
      return {
        done: false,
        open: document.querySelectorAll('#msGrid .ms-cell.open').length,
        mineActive: !!scr && scr.classList.contains('active'),
      };
    });
    if (r.done || r.mineActive === false) break;
    const res = await page.evaluate(() => ({
      result: document.getElementById('scr-sm-result')?.classList.contains('active') || false,
      body: (document.getElementById('sm-resultbody') || {}).innerHTML?.length || 0,
    }));
    if (res.result) { console.log('RESULT_SHOWN after', i + 1, 'reveals'); break; }
    await page.waitForTimeout(150);
  }
  await page.waitForTimeout(2200);
  const final = await page.evaluate(() => ({
    resultShown: document.getElementById('scr-sm-result')?.classList.contains('active') || false,
    resultBodyLen: (document.getElementById('sm-resultbody') || {}).innerHTML?.length || 0,
  }));
  console.log('FINAL', JSON.stringify(final));
  console.log('PAGEERRORS', errs.length ? errs.slice(0, 3) : 'none');
  await b.close();
  if (errs.length || !final.resultShown) process.exit(1);
})().catch((e) => { console.error('FATAL', e.message); process.exit(1); });
