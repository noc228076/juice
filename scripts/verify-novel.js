/* 小说模块回归：书源规则引擎单测 + 书架→搜索→目录→正文 全流程 e2e（mock 代理） */
const { chromium } = require('playwright');
const R = [];
function check(n, ok, d) { R.push({ n, ok: !!ok, d }); console.log((ok ? 'PASS' : 'FAIL') + '  ' + n + (d !== undefined ? '  → ' + JSON.stringify(d) : '')); }

/* ---------- 书源抓取夹具 ---------- */
const SEARCH_HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div class="result-list">
  <div class="result-item"><div class="item-txt"><h3><a href="/book/101.html">剑来</a></h3>
    <span class="author">作者：烽火戏诸侯</span><span class="cat">玄幻</span>
    <img src="/cover/101.jpg"><p class="intro">大千世界，无奇不有。</p></div></div>
  <div class="result-item"><div class="item-txt"><h3><a href="/book/102.html">剑仙三千万</a></h3>
    <span class="author">作者：乘风御剑</span><img src="/cover/102.jpg"></div></div>
</div></body></html>`;

const DETAIL_HTML = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div id="info"><h1>剑来</h1><p>作者：烽火戏诸侯</p><div id="intro">大千世界，无奇不有。少年陈平安。</div></div>
<div id="list"><dl>
  <dd><a href="/book/101/1.html">第一章 小镇陋巷</a></dd>
  <dd><a href="/book/101/2.html">第二章 出门远行</a></dd>
  <dd><a href="/book/101/3.html">第三章 龙泉窑上</a></dd>
</dl></div></body></html>`;

const CHAPTER_HTML = (title, marker, withNext) => `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title></head><body>
<h1>${title}</h1><div id="content">
${marker}第一段，少年背着一根竹箧，走进了雨里。
请记住本书首发域名 biquge.example。
第二段，窑工们直起腰，看这群外来客。
${withNext ? '<a href="2_2.html" class="nextpage">下一页</a>' : ''}
</div></body></html>`;

const SRC_JSON = [{
  bookSourceName: '夹具书源',
  bookSourceUrl: 'https://fake-novel.test',
  searchUrl: '/search?q={{key}},{"charset":"utf-8"}',
  ruleSearch: {
    bookList: 'class.result-item',
    name: 'tag.h3.0@tag.a.0@text',
    author: 'class.author@text##^作者：',
    kind: 'class.cat.0@text',
    intro: 'class.intro.0@text',
    coverUrl: 'tag.img.0@src',
    bookUrl: 'tag.h3.0@tag.a.0@href'
  },
  ruleBookInfo: { intro: '#intro@text', author: '#info p.0@text##^作者：', tocUrl: '' },
  ruleToc: { chapterList: '#list dl dd', chapterName: 'a@text', chapterUrl: 'a@href' },
  ruleContent: { content: '#content@textNodes', nextContentUrl: 'class.nextpage.0@href' }
}];

(async () => {
  const b = await chromium.launch({ channel: 'chrome' });
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 }, serviceWorkers: 'block' });
  const p = await ctx.newPage();
  const errs = [];
  p.on('pageerror', e => errs.push(String(e).slice(0, 200)));

  /* 代理 mock：按 url 参数分流到夹具 */
  await p.route('**/api/proxy*', route => {
    const u = new URL(route.request().url());
    const target = decodeURIComponent(u.searchParams.get('url') || '');
    const pick = (re, body) => (re.test(target) ? route.fulfill({ status: 200, contentType: 'text/html; charset=utf-8', body }) : null);
    pick(/\/search\?q=/, SEARCH_HTML)
      || pick(/\/book\/101\.html$/, DETAIL_HTML)
      || pick(/\/book\/101\/1\.html$/, CHAPTER_HTML('第一章 小镇陋巷', '【1-1】', true))
      || pick(/\/book\/101\/2_2\.html$/, CHAPTER_HTML('第一章 小镇陋巷', '【1-2】', false))
      || pick(/\/book\/101\/2\.html$/, CHAPTER_HTML('第二章 出门远行', '【2-1】', false))
      || pick(/\/book\/101\/3\.html$/, CHAPTER_HTML('第三章 龙泉窑上', '【3-1】', false))
      || route.fulfill({ status: 404, body: 'no fixture' });
  });

  await p.goto('http://127.0.0.1:3456/index.html?t=' + Date.now() + '#/novel', { waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#mod-novel.active', { timeout: 15000 });
  await p.waitForTimeout(1200);

  /* ---------- 引擎单测（真实浏览器环境里跑） ---------- */
  const unit = await p.evaluate((srcJson) => {
    const T = window.AppNovel._test;
    const out = {};
    // 1. URL 解析
    out.resolve = T.resolveUrl('/book/1.html', 'https://x.test/a/b/') === 'https://x.test/book/1.html';
    // 2. searchUrl 选项拆分 + key 替换
    const built = T.buildSearchUrl(srcJson[0], '剑来', 1);
    out.searchUrl = built.url === 'https://fake-novel.test/search?q=' + encodeURIComponent('剑来');
    out.searchOpts = built.charset === 'utf-8' && built.method === 'GET';
    // 3. 经典链规则
    const doc = new DOMParser().parseFromString('<div class="row"><h3><a href="/b/1">书名A</a></h3><span class="au">作者：张三</span></div>', 'text/html');
    const docT = new DOMParser().parseFromString('<div class="wrap"><h3>书名A副标题</h3><a href="/b/1">书名A</a></div>', 'text/html');
    const list = T.evalRule(doc, 'class.row', { base: 'https://x.test', list: true });
    out.listChain = list.nodes && list.nodes.length === 1;
    const it = list.nodes[0];
    out.nameChain = T.evalRule(it, 'tag.h3.0@tag.a.0@text', {}).value === '书名A';
    out.authorFilter = T.evalRule(it, 'class.au.0@text##^作者：', {}).value === '张三';
    out.href = T.evalRule(it, 'tag.a.0@href', { base: 'https://x.test' }).value === 'https://x.test/b/1';
    // 4. CSS 规则 + index
    out.css = T.evalRule(doc, '.row h3 a@text', {}).value === '书名A';
    // 5. text. 规则（祖先文本不同于目标元素的现实场景）
    out.textSel = T.evalRule(docT, 'text.书名A@href', { base: 'https://x.test' }).value === 'https://x.test/b/1';
    // 6. JS 规则拒绝
    out.jsReject = !!T.evalRule(doc, '@js:1', {}).err;
    // 7. JSONPath
    const json = { data: { books: [{ t: 'A', u: '/1' }, { t: 'B', u: '/2' }] } };
    const jl = T.evalRule(json, '$.data.books[*]', { list: true });
    out.jsonList = jl.nodes.length === 2;
    out.jsonField = T.evalRule(jl.nodes[1], '$.t', {}).value === 'B';
    out.jsonBare = T.evalRule(jl.nodes[1], 'u', {}).value === '/2';
    // 8. textNodes
    const doc2 = new DOMParser().parseFromString('<div id="c">第一段\n第二段</div>', 'text/html');
    out.textNodes = T.evalRule(doc2.querySelector('#c'), '@textNodes', {}).value === '第一段\n第二段';
    // 9. gbk 解码：GBK 字节「剑来」= 0xBD 0xA3 0xC0 0xB4
    const gbkBuf = new Uint8Array([0xBD, 0xA3, 0xC0, 0xB4]).buffer;
    out.gbk = T.decodeBuffer(gbkBuf, 'gbk', '').text === '剑来';
    out.charsetSniff = T.pickCharset('', 'text/html; charset=GBK', new ArrayBuffer(0)) === 'GBK';
    // 10. 书源归一化 + 非法拒绝
    out.norm = T.normalizeSource(srcJson[0]).id.length > 4;
    out.normReject = !T.normalizeSource({ bookSourceName: 'x' });
    return out;
  }, SRC_JSON);

  check('URL 解析', unit.resolve, unit.resolve);
  check('searchUrl 拆分与 key 替换', unit.searchUrl, unit.searchUrl);
  check('searchUrl 选项（charset/method）', unit.searchOpts, unit.searchOpts);
  check('经典链列表规则', unit.listChain, unit.listChain);
  check('经典链字段规则 tag.h3.0@tag.a.0@text', unit.nameChain, unit.nameChain);
  check('## 过滤（去「作者：」前缀）', unit.authorFilter, unit.authorFilter);
  check('@href 自动补全绝对地址', unit.href, unit.href);
  check('纯 CSS 规则', unit.css, unit.css);
  check('text. 文本定位规则', unit.textSel, unit.textSel);
  check('JS 规则明确拒绝', unit.jsReject, unit.jsReject);
  check('JSONPath 列表', unit.jsonList, unit.jsonList);
  check('JSONPath 字段 $.t', unit.jsonField, unit.jsonField);
  check('JSON 字段省略 $.（bare key）', unit.jsonBare, unit.jsonBare);
  check('@textNodes 保留换行', unit.textNodes, unit.textNodes);
  check('GBK 解码', unit.gbk, unit.gbk);
  check('charset 优先级（响应头）', unit.charsetSniff, unit.charsetSniff);
  check('书源归一化', unit.norm, unit.norm);
  check('非法书源拒绝', unit.normReject, unit.normReject);

  /* ---------- 全流程 e2e ---------- */
  // 导入书源
  const imported = await p.evaluate((src) => {
    window.AppNovel.importSourcesForTest(src);
    return window.AppNovel._test.getState().sources.length;
  }, SRC_JSON).catch(() => 0);
  // importSourcesForTest 未导出的话走 UI 导入
  if (!imported) {
    await p.click('#nvGoSources');
    await p.fill('#nvSrcInput', JSON.stringify(SRC_JSON));
    await p.click('#nvSrcImport');
    await p.waitForTimeout(300);
  }
  const srcCount = await p.evaluate(() => window.AppNovel._test.getState().sources.length);
  check('书源导入入库', srcCount === 1, srcCount);

  // 聚合搜索 → 结果
  await p.fill('#nvKw', '剑来');
  await p.click('#nvSearchGo');
  await p.waitForSelector('.nv-item', { timeout: 10000 });
  const s1 = await p.evaluate(() => ({
    items: document.querySelectorAll('.nv-item').length,
    chipOk: document.querySelectorAll('.nv-chip.ok').length,
    firstName: document.querySelector('.nv-item b') && document.querySelector('.nv-item b').textContent,
    authorClean: (document.querySelector('.nv-item span') || {}).textContent,
  }));
  check('聚合搜索出结果', s1.items === 2 && s1.chipOk === 1, s1);
  check('搜索字段解析（书名/作者去前缀）', s1.firstName === '剑来' && /烽火/.test(s1.authorClean || ''), s1);

  // 加入书架 → 书架卡片
  await p.click('.nv-item [data-add]');
  await p.waitForTimeout(200);
  const shelf1 = await p.evaluate(() => window.AppNovel._test.getState().shelf.length);
  check('加入书架', shelf1 === 1, shelf1);

  // 点结果进详情 → 目录解析（3 章）
  await p.evaluate(() => { document.querySelector('.nv-item .nv-item-main').click(); });
  await p.waitForSelector('.nv-ch', { timeout: 10000 });
  const d1 = await p.evaluate(() => ({
    chs: document.querySelectorAll('.nv-ch').length,
    name: (document.querySelector('.nv-name') || {}).textContent,
    intro: ((document.querySelector('.nv-intro') || {}).textContent || '').slice(0, 6),
  }));
  check('详情目录解析', d1.chs === 3 && d1.name === '剑来' && d1.intro === '大千世界，无', d1);

  // 开读第一章：正文含两段、广告行被滤、跨页拼接
  await p.click('#nvStart');
  await p.waitForTimeout(900);
  const r1 = await p.evaluate(() => ({
    ps: [...document.querySelectorAll('#nvReaderBody p')].map(x => x.textContent),
    chName: document.getElementById('nvReaderChName').textContent,
    view: document.querySelector('#mod-novel .nv-screen.active').dataset.nv,
  }));
  check('正文分段渲染', r1.view === 'reader' && r1.ps.length === 4 && r1.ps[0].indexOf('【1-1】') === 0, r1);
  check('广告行过滤', !r1.ps.some(t => t.indexOf('请记住') >= 0), r1.ps);

  // 下一章 → 第二章
  await p.click('#nvNext');
  await p.waitForTimeout(900);
  const r2 = await p.evaluate(() => ({
    chName: document.getElementById('nvReaderChName').textContent,
    first: document.querySelector('#nvReaderBody p') && document.querySelector('#nvReaderBody p').textContent,
    prog: window.AppNovel._test.getState().shelf[0].lastChName,
  }));
  check('下一章切换 + 进度落档', r2.chName === '第二章 出门远行' && r2.first.indexOf('【2-1】') === 0 && r2.prog === '第二章 出门远行', r2);

  // 刷新后续读：书架显示进度
  await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(1400);
  const s2 = await p.evaluate(() => ({
    prog: (document.querySelector('.nv-prog') || {}).textContent,
    shelf: window.AppNovel._test.getState().shelf.length,
  }));
  check('刷新后书架与进度恢复', s2.shelf === 1 && /第二章/.test(s2.prog || ''), s2);

  // 移动端布局
  await ctx.close();
  const ctx2 = await b.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, serviceWorkers: 'block' });
  const p2 = await ctx2.newPage();
  p2.on('pageerror', e => errs.push('mob: ' + String(e).slice(0, 120)));
  await p2.goto('http://127.0.0.1:3456/index.html?t=' + Date.now() + '#/novel', { waitUntil: 'domcontentloaded' });
  await p2.waitForTimeout(1500);
  const mob = await p2.evaluate(() => ({
    overflow: document.documentElement.scrollWidth > innerWidth,
    subnav: [...document.querySelectorAll('[data-sub-jump="novel"]')].length,
    shelfVisible: document.querySelector('#mod-novel .nv-screen.active') !== null,
  }));
  check('移动端无横向溢出', !mob.overflow && mob.shelfVisible, mob);
  check('5 条解压子导航都有小说入口', mob.subnav === 5, mob.subnav);
  await ctx2.close();

  check('无 JS 报错', errs.length === 0, errs.slice(0, 3));
  await b.close();
  const pass = R.filter(x => x.ok).length;
  console.log(`\n== ${pass}/${R.length} PASS ==`);
  if (pass !== R.length) process.exit(1);
})().catch(e => { console.error('FATAL', e.message); process.exit(1); });
