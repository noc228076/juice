#!/usr/bin/env node
/* 电视直播验收：Worker API + #/tv iframe + 真实播放 + 暂停 + 手机布局
 *
 * 前置：
 *   node scripts/build-tv-data.js
 *   node tv-worker/dev-server.mjs        （127.0.0.1:8787）
 *   node server.js                       （127.0.0.1:3456）
 *
 * 运行：node scripts/verify-tv.js
 */
'use strict';

const path = require('path');
const { chromium } = require('playwright');

const BASE = process.env.TV_BASE || 'http://127.0.0.1:3456';
const API = process.env.TV_API || 'http://127.0.0.1:8787';
const CHROME = process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe';

let failed = 0;
function check(name, ok, detail) {
  console.log((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : ' :: ' + JSON.stringify(detail)));
  if (!ok) failed++;
}

async function apiTests() {
  const ping = await fetch(API + '/ping').then((r) => r.json());
  check('Worker /ping 可用', ping.ok === true, ping);
  check('内置频道数 83', ping.meta && ping.meta.channels === 83, ping.meta);

  const extra = await fetch(API + '/playlist?local=extra').then((r) => r.json());
  const verified = await fetch(API + '/playlist?local=verified').then((r) => r.json());
  check('extra 185 条', extra.count === 185, extra.count);
  // verified 原始 194 条，其中 2 条是已知 TVU 测试卡，构建时被 URL_BLACKLIST 剔除
  check('verified 192 条（黑名单剔除 2 条）', verified.count === 192, verified.count);

  const leaked = extra.channels.filter((c) => !String(c.url).startsWith(API + '/media?'));
  check('频道表只下发不透明 /media 地址', leaked.length === 0, leaked.slice(0, 2));

  const cctv = extra.channels.find((c) => c.name === 'CCTV-1');
  const media = await fetch(cctv.url);
  const body = await media.text();
  check('CCTV-1 媒体入口 200', media.status === 200, media.status);
  check('播放列表已重写为 /proxy', body.includes('/proxy?url='), body.slice(0, 120));
  check('播放列表 Content-Type 正确',
    String(media.headers.get('content-type') || '').includes('mpegurl'),
    media.headers.get('content-type'));

  const seg = body.split(/\r?\n/).find((l) => l && !l.startsWith('#'));
  if (seg) {
    const sr = await fetch(seg, { headers: { Range: 'bytes=0-1023' } });
    check('分片 Range 206', sr.status === 206, sr.status);
    check('分片 Content-Range 正确', !!sr.headers.get('content-range'), sr.headers.get('content-range'));
  } else {
    check('播放列表含分片地址', false, body.slice(0, 160));
  }

  const privateProxy = await fetch(API + '/proxy?url=' + encodeURIComponent('http://127.0.0.1:8787/ping'));
  check('私网地址被拒绝', privateProxy.status === 403, privateProxy.status);

  const opt = await fetch(API + '/playlist?local=extra', {
    method: 'OPTIONS',
    headers: { Origin: 'http://localhost:3456', 'Access-Control-Request-Headers': 'range' },
  });
  check('OPTIONS 204', opt.status === 204, opt.status);
  check('CORS 允许 Range',
    String(opt.headers.get('access-control-allow-headers') || '').toLowerCase().includes('range'),
    opt.headers.get('access-control-allow-headers'));
}

async function launch() {
  return chromium.launch({
    headless: true,
    executablePath: CHROME,
    args: ['--autoplay-policy=no-user-gesture-required'],
  });
}

async function uiTests(browser) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));

  await page.goto(BASE + '/index.html?t=' + Date.now() + '#/tv', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('#mod-tv.active', { timeout: 10000 });
  const frame = page.frameLocator('#tvFrame');
  await frame.locator('#channelList .ch-item').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);

  const parent = await page.evaluate(() => ({
    active: document.documentElement.dataset.activeModule,
    tvActive: !!document.querySelector('#mod-tv.active'),
    navTab: document.querySelector('.nav-tab.active')?.dataset.mod,
    tvPill: document.querySelector('#mod-tv .subnav-pill-btn.active')?.dataset.subJump,
    pills: document.querySelectorAll('#mod-tv .subnav-pill-btn').length,
  }));
  check('#/tv 激活', parent.active === 'tv' && parent.tvActive, parent);
  check('顶栏高亮在摸鱼解压', parent.navTab === 'clock', parent.navTab);
  check('电视页子导航 6 项且 tv active', parent.pills === 6 && parent.tvPill === 'tv', parent);

  const list = await frame.locator('#channelList .ch-item').count();
  const feed = await frame.locator('#feedInfo').innerText();
  const status = await frame.locator('#nowStatus').innerText();
  check('频道表 83 个', list === 83, { list, feed, status });
  check('两源合并成功', /2\/2/.test(feed), feed);

  const groups = await frame.locator('#groupList .group-item').allInnerTexts();
  check('分组含央视/卫视/动画',
    groups.some((g) => g.includes('央视')) && groups.some((g) => g.includes('卫视')) && groups.some((g) => g.includes('动画')),
    groups);

  // 点 CCTV-1（按 .nm 精确匹配，避开 CCTV-10/11）
  const rows = frame.locator('#channelList .ch-item');
  let idx = -1;
  const n = await rows.count();
  for (let i = 0; i < n; i++) {
    const t = await rows.nth(i).locator('.nm').innerText();
    if (t.trim() === 'CCTV-1') { idx = i; break; }
  }
  check('找到 CCTV-1', idx >= 0, idx);
  if (idx >= 0) await rows.nth(idx).click();

  const video = frame.locator('#video');
  let play = null;
  for (let i = 0; i < 50; i++) {
    play = await video.evaluate((v) => ({
      readyState: v.readyState, currentTime: v.currentTime,
      videoWidth: v.videoWidth, videoHeight: v.videoHeight,
      paused: v.paused, muted: v.muted,
    })).catch(() => null);
    if (play && play.readyState >= 2 && play.currentTime > 2 && play.videoWidth > 0) break;
    await page.waitForTimeout(500);
  }
  check('CCTV-1 出画面', !!play && play.readyState >= 2 && play.currentTime > 2 && play.videoWidth > 0, play);
  check('分辨率 ≥ 1280x720', !!play && play.videoWidth >= 1280 && play.videoHeight >= 720, play);

  // 全绿检测：抽 160x90 帧，绿色主导像素占比不能过高
  const greenRatio = await video.evaluate((v) => {
    try {
      const c = document.createElement('canvas');
      c.width = 160; c.height = 90;
      const ctx = c.getContext('2d');
      ctx.drawImage(v, 0, 0, c.width, c.height);
      const d = ctx.getImageData(0, 0, c.width, c.height).data;
      let green = 0, total = 0;
      for (let i = 0; i < d.length; i += 4) {
        total++;
        if (d[i + 1] > 60 && d[i + 1] > d[i] * 1.35 && d[i + 1] > d[i + 2] * 1.35) green++;
      }
      return green / total;
    } catch (e) { return -1; }
  }).catch(() => -1);
  check('画面不是全绿花屏', greenRatio >= 0 && greenRatio < 0.6, greenRatio);

  await page.locator('#mod-tv').screenshot({ path: path.join(__dirname, '..', 'scratch', '_tv_verify.png') }).catch(() => {});

  // 离开 #/tv → 子应用应暂停
  await page.evaluate(() => { location.hash = '#/clock'; });
  await page.waitForTimeout(1200);
  const pausedAfterLeave = await video.evaluate((v) => v.paused).catch(() => null);
  const clockActive = await page.evaluate(() => !!document.querySelector('#mod-clock.active'));
  check('离开电视页后视频暂停', clockActive && pausedAfterLeave === true, { clockActive, pausedAfterLeave });

  // 返回 #/tv → iframe 仍在，不报错
  await page.evaluate(() => { location.hash = '#/tv'; });
  await page.waitForTimeout(800);
  const back = await page.evaluate(() => ({
    active: !!document.querySelector('#mod-tv.active'),
    frame: !!document.querySelector('#tvFrame'),
  }));
  check('返回电视页 iframe 仍在', back.active && back.frame, back);
  check('无 pageerror', errors.length === 0, errors.slice(0, 5));

  await context.close();
}

async function mobileTests(browser) {
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block',
  });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(e.message.slice(0, 200)));
  await page.goto(BASE + '/index.html?t=' + Date.now() + '#/tv', { waitUntil: 'domcontentloaded', timeout: 20000 });
  await page.waitForSelector('#mod-tv.active', { timeout: 10000 });
  const frame = page.frameLocator('#tvFrame');
  await frame.locator('#channelList .ch-item').first().waitFor({ timeout: 20000 });
  await page.waitForTimeout(800);

  const layout = await page.evaluate(() => {
    const f = document.getElementById('tvFrame');
    const r = f.getBoundingClientRect();
    return {
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      frameW: Math.round(r.width), frameH: Math.round(r.height), vw: window.innerWidth,
      frameVisible: r.width > 200 && r.height > 300,
    };
  });
  check('手机端无横向溢出', layout.overflow <= 1, layout);
  check('手机端 iframe 尺寸正常', layout.frameVisible && layout.frameW <= layout.vw, layout);

  const inner = await frame.locator('body').evaluate(() => ({
    mainCols: getComputedStyle(document.querySelector('main')).gridTemplateColumns,
    videoTop: document.getElementById('videoBox').getBoundingClientRect().top,
    listTop: document.getElementById('channelList').getBoundingClientRect().top,
  })).catch(() => null);
  check('手机端播放器在频道列表上方', !!inner && inner.videoTop < inner.listTop, inner);
  check('手机端无 pageerror', errors.length === 0, errors.slice(0, 5));
  await context.close();
}

(async () => {
  try {
    await apiTests();
    const browser = await launch();
    try {
      await uiTests(browser);
      await mobileTests(browser);
    } finally {
      await browser.close();
    }
  } catch (e) {
    console.error('FATAL', e && e.stack ? e.stack : e);
    process.exit(1);
  }
  console.log(failed ? `\n${failed} 项失败` : '\n全部通过');
  process.exit(failed ? 1 : 0);
})();
