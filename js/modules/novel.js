/* =========================================================
   模块 18：小说书架 · 一搜一读 (Novel Shelf)
   ---------------------------------------------------------
   自研轻量书源引擎（兼容 legado/eso 书源 JSON 的常用子集）：
     - CSS 选择器规则 + legado 经典链（class.x / id.x / tag.x.0 / text.）
     - JSONPath（$.a.b[0] / $.a[*].b，API 型书源）
     - ##正则##替换 后置过滤；@text/@textNodes/@href/@src/@html
     - 不支持 <js>/@js:/{{js}} 规则（明确提示，不做 eval 沙箱）
   抓站全部走 /api/proxy?kind=api（同源中继，内网拦截 + 80/443 白名单）。
   站内不内置任何书源与正文：书源由用户导入，数据只存本机。
   ========================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'juice_novel_v1';
  const PROXY = '/api/proxy?kind=api&url=';
  const MAX_SOURCES = 20;
  const MAX_SHELF = 60;
  const MAX_TOC = 3000;
  const FETCH_TIMEOUT = 15000;

  let inited = false;
  let el = null;

  let state = { sources: [], shelf: [], settings: { fontSize: 18 } };

  /* 目录与正文的会话内缓存：key → { chapters, at } / url → paragraphs */
  const tocCache = new Map();
  const contentCache = new Map();

  /* 当前 detail/reader 上下文 */
  let curBook = null;      // shelf 引用
  let curChapters = null;  // [{name, url}]
  let curCi = 0;
  let lastTocOut = null;   // 最近一次 loadToc 结果（返回目录页时复用）

  /* =======================================================
     本机存储
     ======================================================= */
  function loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const s = JSON.parse(raw) || {};
      if (Array.isArray(s.sources)) state.sources = s.sources.slice(0, MAX_SOURCES);
      if (Array.isArray(s.shelf)) state.shelf = s.shelf.slice(0, MAX_SHELF);
      if (s.settings && typeof s.settings === 'object') {
        state.settings = Object.assign(state.settings, s.settings);
      }
    } catch (e) { /* 存档坏了按空档走 */ }
  }

  function saveState() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      if (window.juiceNotice) window.juiceNotice('本机存储空间不足，书架数据没有保存成功');
    }
  }

  function tap() {
    if (window.SFX && window.SFX.tap) window.SFX.tap();
  }

  function esc(v) {
    return window.escHtml ? window.escHtml(v) : String(v == null ? '' : v);
  }

  /* =======================================================
     书源规则微引擎
     ======================================================= */
  function resolveUrl(href, base) {
    try {
      return new URL(String(href || ''), base || undefined).href;
    } catch (e) {
      return String(href || '');
    }
  }

  /* searchUrl 尾部的 ,{...} 选项：{"charset":"gbk","method":"POST","body":"..."} */
  function splitRuleOpts(tpl) {
    let s = String(tpl || '').trim();
    let opts = {};
    const m = s.match(/,\s*(\{[\s\S]*\})\s*$/);
    if (m) {
      try {
        opts = JSON.parse(m[1]) || {};
        s = s.slice(0, m.index);
      } catch (e) { /* 当作普通 URL */ }
    }
    return { tpl: s.trim(), opts: opts };
  }

  function buildSearchUrl(source, key, page) {
    const parsed = splitRuleOpts(source.searchUrl || '');
    let tpl = parsed.tpl;
    if (!tpl) return null;
    const encKey = encodeURIComponent(key);
    tpl = tpl
      .replace(/\{\{\s*key\s*\}\}/gi, encKey)
      .replace(/\{\{\s*page\s*\}\}/gi, String(page || 1));
    let body = parsed.opts.body
      ? String(parsed.opts.body).replace(/\{\{\s*key\s*\}\}/gi, encKey)
      : '';
    return {
      url: resolveUrl(tpl, source.bookSourceUrl),
      method: (parsed.opts.method || 'GET').toUpperCase(),
      body: body,
      charset: parsed.opts.charset || ''
    };
  }

  /* 字符集判定：URL 选项 → 响应头 → <meta charset> 嗅探 → utf-8 */
  function pickCharset(prefer, headerType, buf) {
    const fromOpt = String(prefer || '').toLowerCase();
    if (fromOpt && fromOpt !== 'utf8' && fromOpt !== 'utf-8') return fromOpt;
    const mh = String(headerType || '').match(/charset=([\w-]+)/i);
    if (mh && mh[1].toLowerCase() !== 'utf-8' && mh[1].toLowerCase() !== 'utf8') return mh[1];
    try {
      const head = new TextDecoder('latin1').decode(new Uint8Array(buf.slice(0, 4096)));
      const mm = head.match(/<meta[^>]+charset=["']?([\w-]+)/i);
      if (mm && mm[1].toLowerCase() !== 'utf-8' && mm[1].toLowerCase() !== 'utf8') return mm[1];
    } catch (e) { /* latin1 一定可用 */ }
    return 'utf-8';
  }

  function decodeBuffer(buf, prefer, headerType) {
    const cs = pickCharset(prefer, headerType, buf);
    try {
      return { text: new TextDecoder(cs).decode(buf), charset: cs };
    } catch (e) {
      return { text: new TextDecoder('utf-8').decode(buf), charset: 'utf-8' };
    }
  }

  /* legado 经典片段 → CSS：class.x[.N] / id.x[.N] / tag.x[.N] / text.文案 / children */
  const SEG_CLASS = /^(class|id|tag)\.([A-Za-z0-9_\\\-\u4e00-\u9fa5]+?)(?:\.(-?\d+|all))?$/i;
  const SEG_TEXT = /^text\.(.+)$/i;
  const PROPS = /^(@)?(text|textnodes|owntext|html|all|href|src|content|value|alt|title)$/i;

  function segmentToCss(seg) {
    const m = seg.match(SEG_CLASS);
    if (!m) return null;
    const head = m[1].toLowerCase();
    let css;
    if (head === 'class') css = '.' + m[2].replace(/\\\\/g, '\\\\');
    else if (head === 'id') css = '#' + m[2];
    else css = m[2].toLowerCase();
    return { css: css, index: m[3] === undefined ? null : (m[3].toLowerCase() === 'all' ? 'all' : parseInt(m[3], 10)) };
  }

  function selectBySeg(nodes, seg) {
    const out = [];
    const textM = String(seg).match(SEG_TEXT);
    const wantText = textM ? textM[1].trim() : null;
    const parsed = wantText ? null : segmentToCss(String(seg).trim());
    nodes.forEach(function (n) {
      if (!n || !n.querySelectorAll) return;
      if (wantText != null) {
        const all = n.querySelectorAll('*');
        for (let i = 0; i < all.length; i++) {
          if ((all[i].textContent || '').trim() === wantText) out.push(all[i]);
        }
        return;
      }
      if (String(seg).trim().toLowerCase() === 'children') {
        const kids = n.children || [];
        for (let i = 0; i < kids.length; i++) out.push(kids[i]);
        return;
      }
      if (!parsed) {
        try {
          out.push.apply(out, Array.prototype.slice.call(n.querySelectorAll(String(seg).trim())));
        } catch (e) { /* 非法选择器按空处理 */ }
        return;
      }
      try {
        out.push.apply(out, Array.prototype.slice.call(n.querySelectorAll(parsed.css)));
      } catch (e) { /* 同上 */ }
    });
    if (parsed && typeof parsed.index === 'number') {
      return [out[parsed.index]].filter(Boolean);
    }
    return out;
  }

  function applyFilters(value, filters) {
    let v = value;
    filters.forEach(function (f) {
      if (!f) return;
      const seg = f.split('##');
      try {
        const re = new RegExp(seg[0], '');
        v = v.replace(re, seg.length > 1 ? seg[1].replace(/\\\\/g, '\\') : '');
      } catch (e) { /* 非法正则跳过 */ }
    });
    return v;
  }

  /* 迷你 JSONPath：$ .key [n] [*]，字段规则允许省略 $.（当普通 key path） */
  function jsonPathGet(data, path) {
    let s = String(path || '').trim();
    if (s.charAt(0) === '$') s = s.slice(1);
    const tokens = [];
    /* (?:^|\.)：裸 key（title / a.b，不带 $. 前缀）也要能取到 */
    const re = /(?:^|\.)([A-Za-z0-9_\-\\?\u4e00-\u9fa5]+)|\[(-?\d+|\*)\]/g;
    let m;
    while ((m = re.exec(s))) {
      if (m[1] !== undefined) tokens.push({ t: 'key', v: m[1] });
      else tokens.push({ t: m[2] === '*' ? 'all' : 'idx', v: m[2] });
    }
    if (!tokens.length) return [data];
    let cur = [data];
    for (let i = 0; i < tokens.length; i++) {
      const tk = tokens[i];
      const next = [];
      cur.forEach(function (node) {
        if (node == null) return;
        if (tk.t === 'key') {
          const v = node[tk.v];
          if (v !== undefined && v !== null) next.push(v);
        } else if (tk.t === 'idx') {
          const idx = parseInt(tk.v, 10);
          const v = Array.isArray(node) ? node[idx < 0 ? node.length + idx : idx] : undefined;
          if (v !== undefined && v !== null) next.push(v);
        } else if (Array.isArray(node)) {
          node.forEach(function (x) { if (x != null) next.push(x); });
        }
      });
      cur = next;
    }
    return cur;
  }

  function isJsonish(v) {
    /* DOM 节点（Document=9 / Element=1 / 文本=3…）都不是 JSON，
       只看 nodeType===1 会把 Document 误判成 JSON 对象 */
    return v != null && typeof v === 'object' && v.nodeType == null;
  }

  /*
    规则求值主入口。
    输入 ctx：Element/Document（HTML 源）或任意 JSON 值（API 源）。
    返回 { value }（字段规则）或 { nodes }（列表规则）或 { err }。
  */
  function evalRule(input, rule, opts) {
    opts = opts || {};
    const base = opts.base || '';
    const isList = !!opts.list;

    let raw = String(rule == null ? '' : rule).trim();
    if (!raw) return isList ? { nodes: [] } : { value: '' };

    /* 后置过滤 ##re##replacement（过滤段里也可能再含 #，按第一个 ## 起全切） */
    let filters = [];
    const fi = raw.indexOf('##');
    if (fi >= 0) {
      filters = raw.slice(fi + 2).split('##');
      raw = raw.slice(0, fi).trim();
    }
    if (/^@?js:/i.test(raw) || /<js>[\s\S]*<\/js>/i.test(raw)) {
      return { err: '该源使用了 JS 规则，本站暂不支持' };
    }
    if (!raw) return isList ? { nodes: [] } : { value: '' };

    /* ---------- JSON 源 ---------- */
    if (raw.charAt(0) === '$' || (isJsonish(input) && raw.charAt(0) !== '.' && raw.charAt(0) !== '#')) {
      const hits = jsonPathGet(input, raw);
      if (isList) return { nodes: hits };
      let v = hits.length ? hits[0] : '';
      if (v != null && typeof v === 'object') v = JSON.stringify(v);
      return { value: applyFilters(String(v == null ? '' : v), filters).trim() };
    }

    /* ---------- HTML 源 ---------- */
    if (isJsonish(input)) return { err: '规则与数据类型不匹配' };
    const segs = raw.split('@');
    let nodes = [input];
    let prop = null;
    for (let i = 0; i < segs.length; i++) {
      const seg = segs[i].trim();
      if (!seg) continue;
      const pm = seg.match(PROPS);
      if (pm && !SEG_TEXT.test(seg)) { prop = pm[2].toLowerCase(); continue; }
      if (i > 0 && nodes.some(isJsonish)) return { err: '规则与数据类型不匹配' };
      nodes = selectBySeg(nodes, seg);
      if (!nodes.length && !isList) break;
    }
    if (isList) return { nodes: nodes };
    if (!prop) prop = 'text';
    const node = nodes[0];
    let value = '';
    if (node) {
      if (prop === 'text') {
        value = (node.textContent || '').trim();
      } else if (prop === 'textnodes' || prop === 'owntext') {
        const parts = [];
        const kids = node.childNodes || [];
        for (let i = 0; i < kids.length; i++) {
          if (kids[i].nodeType === 3) parts.push(kids[i].textContent);
        }
        value = parts.join('\n').trim();
      } else if (prop === 'html') {
        value = node.innerHTML || '';
      } else if (prop === 'all') {
        value = node.outerHTML || '';
      } else {
        value = node.getAttribute(prop) || node[prop] || '';
      }
    }
    value = String(value == null ? '' : value).trim();
    if ((prop === 'href' || prop === 'src') && value) value = resolveUrl(value, base);
    return { value: applyFilters(value, filters) };
  }

  function fieldOf(ctx, rule, base) {
    const r = evalRule(ctx, rule, { base: base });
    return r.err ? '' : String(r.value || '').trim();
  }

  /* =======================================================
     网络（全部走同源代理）
     ======================================================= */
  function proxyFetch(url, opts) {
    opts = opts || {};
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = setTimeout(function () { if (ctrl) ctrl.abort(); }, opts.timeout || FETCH_TIMEOUT);
    const init = {
      method: opts.method || 'GET',
      headers: opts.body ? { 'Content-Type': 'application/x-www-form-urlencoded' } : undefined,
      body: opts.body || undefined,
      signal: ctrl ? ctrl.signal : undefined
    };
    return fetch(PROXY + encodeURIComponent(url), init).then(function (r) {
      clearTimeout(timer);
      if (!r.ok) throw new Error('HTTP ' + r.status);
      return r.arrayBuffer().then(function (buf) {
        return { buf: buf, type: r.headers.get('content-type') || '' };
      });
    }).catch(function (e) {
      clearTimeout(timer);
      throw (e && e.name === 'AbortError') ? new Error('请求超时') : e;
    });
  }

  function fetchDoc(url, preferCharset, method, body) {
    return proxyFetch(url, { charset: preferCharset, method: method, body: body }).then(function (r) {
      const decoded = decodeBuffer(r.buf, preferCharset, r.type);
      const looksJson = /^\s*[[{]/.test(decoded.text) || /json/i.test(r.type);
      if (looksJson) {
        try {
          return { json: JSON.parse(decoded.text), base: url, charset: decoded.charset };
        } catch (e) { /* 落回 HTML */ }
      }
      return { doc: new DOMParser().parseFromString(decoded.text, 'text/html'), base: url, charset: decoded.charset };
    });
  }

  /* =======================================================
     书源解析
     ======================================================= */
  function normalizeSource(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const name = String(raw.bookSourceName || raw.sourceName || '').trim();
    const host = String(raw.bookSourceUrl || raw.sourceUrl || '').trim();
    if (!name || !host || !/^https?:\/\//i.test(host)) return null;
    if (!raw.searchUrl && !(raw.ruleSearch && raw.ruleSearch.bookList)) return null;
    return {
      id: 'nvs_' + Math.abs(hashCode(host)).toString(36),
      name: name.slice(0, 24),
      bookSourceUrl: host,
      searchUrl: String(raw.searchUrl || ''),
      ruleSearch: cleanRuleObj(raw.ruleSearch),
      ruleBookInfo: cleanRuleObj(raw.ruleBookInfo),
      ruleToc: cleanRuleObj(raw.ruleToc),
      ruleContent: cleanRuleObj(raw.ruleContent),
      enabled: true
    };
  }

  function cleanRuleObj(o) {
    if (!o || typeof o !== 'object') return {};
    const out = {};
    Object.keys(o).forEach(function (k) {
      if (typeof o[k] === 'string' && o[k].trim()) out[k] = o[k].trim();
    });
    return out;
  }

  function hashCode(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) {
      h = ((h << 5) - h + s.charCodeAt(i)) | 0;
    }
    return h;
  }

  function getSource(id) {
    return state.sources.find(function (s) { return s.id === id; }) || null;
  }

  function searchSource(source, key) {
    const built = buildSearchUrl(source, key, 1);
    if (!built) return Promise.reject(new Error('书源缺少搜索地址'));
    if (/\{\{/.test(source.searchUrl)) {
      /* {{js}} 模板里除了 key/page 还有别的 → 大概率是 JS 规则 */
      const rest = source.searchUrl.replace(/\{\{\s*(key|page)\s*\}\}/gi, '');
      if (/\{\{/.test(rest)) return Promise.reject(new Error('该源使用了 JS 搜索模板，暂不支持'));
    }
    return fetchDoc(built.url, built.charset, built.method, built.body).then(function (page) {
      const rs = source.ruleSearch || {};
      const listRule = rs.bookList || '';
      if (!listRule) return [];
      const ctx = page.json !== undefined ? page.json : page.doc;
      const ev = evalRule(ctx, listRule, { base: page.base, list: true });
      if (ev.err) throw new Error(ev.err);
      const items = ev.nodes || [];
      const base = page.base;
      const books = [];
      const seen = {};
      items.forEach(function (it) {
        const name = fieldOf(it, rs.name, base);
        const url = fieldOf(it, rs.bookUrl, base);
        if (!name || !url) return;
        const bk = {
          name: name.slice(0, 60),
          author: fieldOf(it, rs.author, base).slice(0, 40),
          kind: fieldOf(it, rs.kind, base).slice(0, 40),
          intro: fieldOf(it, rs.intro, base).slice(0, 200),
          coverUrl: fieldOf(it, rs.coverUrl, base),
          bookUrl: resolveUrl(url, base)
        };
        const k = bk.name + '|' + bk.author;
        if (seen[k]) return;
        seen[k] = 1;
        books.push(bk);
      });
      return books;
    });
  }

  function loadToc(source, book) {
    const cacheKey = source.id + '::' + book.bookUrl;
    if (tocCache.has(cacheKey)) {
      return Promise.resolve(tocCache.get(cacheKey));
    }
    const rt = source.ruleToc || {};
    if (!rt.chapterList) return Promise.reject(new Error('书源缺少目录规则'));
    return fetchDoc(book.bookUrl, book.charset).then(function (page) {
      /* 详情页可顺带补齐封面/简介（ruleBookInfo 存在时） */
      const info = source.ruleBookInfo || {};
      let doc = page.doc;
      let base = page.base;
      let tocUrl = info.tocUrl ? fieldOf(doc, info.tocUrl, base) : '';
      const chain = tocUrl
        ? Promise.resolve(doc)
        : Promise.resolve(doc);
      return chain.then(function (firstDoc) {
        const collect = function (docForToc, baseForToc) {
          let curDoc = docForToc;
          let curBase = baseForToc;
          let chapters = [];
          const seenUrl = {};
          let hops = 0;
          function step() {
            const ev = evalRule(curDoc, rt.chapterList, { base: curBase, list: true });
            if (ev.err) return Promise.reject(new Error(ev.err));
            (ev.nodes || []).forEach(function (it) {
              const nm = fieldOf(it, rt.chapterName || 'a@text', curBase);
              const u = fieldOf(it, rt.chapterUrl || 'a@href', curBase);
              if (!nm || !u) return;
              const abs = resolveUrl(u, curBase);
              if (seenUrl[abs]) return;
              seenUrl[abs] = 1;
              chapters.push({ name: nm.slice(0, 80), url: abs });
            });
            const next = rt.nextTocUrl ? fieldOf(curDoc, rt.nextTocUrl, curBase) : '';
            const absNext = next ? resolveUrl(next, curBase) : '';
            if (absNext && !seenUrl[absNext] && hops < 10 && chapters.length < MAX_TOC) {
              hops++;
              seenUrl[absNext] = 1;
              return fetchDoc(absNext, book.charset).then(function (p2) {
                curDoc = p2.doc;
                curBase = p2.base;
                return step();
              });
            }
            return Promise.resolve();
          }
          return step().then(function () {
            if (chapters.length > MAX_TOC) chapters = chapters.slice(0, MAX_TOC);
            if (!chapters.length) throw new Error('目录解析为空，规则可能不匹配');
            const out = {
              chapters: chapters,
              info: {
                intro: info.intro ? fieldOf(firstDoc, info.intro, base).slice(0, 500) : '',
                author: info.author ? fieldOf(firstDoc, info.author, base).slice(0, 40) : '',
                coverUrl: info.coverUrl ? fieldOf(firstDoc, info.coverUrl, base) : ''
              }
            };
            tocCache.set(cacheKey, out);
            return out;
          });
        };
        if (tocUrl && resolveUrl(tocUrl, base) !== resolveUrl(book.bookUrl, base)) {
          return fetchDoc(resolveUrl(tocUrl, base), book.charset).then(function (p2) {
            return collect(p2.doc, p2.base);
          });
        }
        return collect(doc, base);
      });
    });
  }

  const AD_RE = /(请记住本书|首发域名|天才一秒|一秒记住|最新章节|手机版阅读|手机阅读|章节错误|举报错误|\.la|\.info|\.net|\.org|\.com[^\u4e00-\u9fa5]{0,3}$)/i;

  function loadContent(source, book, chapter) {
    const cacheKey = chapter.url;
    if (contentCache.has(cacheKey)) {
      return Promise.resolve(contentCache.get(cacheKey));
    }
    const rc = source.ruleContent || {};
    if (!rc.content) return Promise.reject(new Error('书源缺少正文规则'));
    let curUrl = chapter.url;
    let hops = 0;
    const parts = [];
    function step() {
      return fetchDoc(curUrl, book.charset).then(function (page) {
        const ev = evalRule(page.doc, rc.content, { base: page.base });
        if (ev.err) throw new Error(ev.err);
        const text = String(ev.value || '');
        text.split(/\n+/).forEach(function (line) {
          const t = line.trim();
          if (!t) return;
          if (AD_RE.test(t) && t.length < 60) return;
          parts.push(t);
        });
        const next = rc.nextContentUrl ? fieldOf(page.doc, rc.nextContentUrl, page.base) : '';
        const absNext = next ? resolveUrl(next, page.base) : '';
        if (absNext && absNext !== curUrl && hops < 8) {
          hops++;
          curUrl = absNext;
          return step();
        }
        if (!parts.length) throw new Error('正文解析为空，规则可能不匹配');
        const out = { paragraphs: parts };
        if (contentCache.size > 30) contentCache.delete(contentCache.keys().next().value);
        contentCache.set(cacheKey, out);
        return out;
      });
    }
    return step();
  }

  /* =======================================================
     渲染
     ======================================================= */
  function render() {
    if (!el) return;
    const view = curView;
    el.querySelectorAll('.nv-screen').forEach(function (s) {
      s.classList.toggle('active', s.dataset.nv === view);
    });
    if (view === 'shelf') renderShelf();
    else if (view === 'search') renderSearch();
    else if (view === 'detail') {
      /* 从阅读器返回目录时复用已加载的详情；没有上下文就给空态 */
      if (curBook && curChapters) renderDetailScreen(lastTocOut || { info: {} });
      else document.getElementById('nvDetail').innerHTML =
        '<div class="nv-empty"><b>还没有选择书籍</b><p>先回书架挑一本吧。</p></div>';
    } else if (view === 'reader') renderReaderFrame();
  }

  function screenHtml() {
    return '' +
      '<div class="nv-screen" data-nv="shelf">' +
        '<div class="nv-head"><h2>📖 小说书架</h2>' +
          '<div class="nv-head-ops"><button class="nv-btn ghost" id="nvGoSearch">🔍 搜书</button>' +
          '<button class="nv-btn ghost" id="nvGoSources">书源管理</button></div></div>' +
        '<div class="nv-sub" id="nvShelfHint">书源与书架都只存在本机，站内不内置任何内容。</div>' +
        '<div id="nvShelf" class="nv-shelf"></div>' +
      '</div>' +
      '<div class="nv-screen" data-nv="search">' +
        '<div class="nv-head"><button class="nv-back" id="nvSearchBack" aria-label="返回书架">←</button><h2>搜书</h2></div>' +
        '<div class="nv-searchbar"><input id="nvKw" maxlength="40" autocomplete="off" placeholder="书名或作者，聚合搜索全部启用书源">' +
          '<button class="nv-btn" id="nvSearchGo">搜索</button></div>' +
        '<div class="nv-src-status" id="nvSrcStatus"></div>' +
        '<div id="nvResults" class="nv-results"></div>' +
        '<div id="nvSrcPanel" class="nv-src-panel" hidden></div>' +
      '</div>' +
      '<div class="nv-screen" data-nv="detail"><div id="nvDetail"></div></div>' +
      '<div class="nv-screen" data-nv="reader">' +
        '<div class="nv-reader-top"><button class="nv-back" id="nvReaderBack" aria-label="返回详情">←</button>' +
          '<span id="nvReaderChName"></span>' +
          '<span class="nv-font-ops"><button class="nv-mini" id="nvFontMinus" aria-label="缩小字号">A-</button>' +
          '<button class="nv-mini" id="nvFontPlus" aria-label="放大字号">A+</button></span></div>' +
        '<div class="nv-reader-body" id="nvReaderBody"></div>' +
        '<div class="nv-reader-foot">' +
          '<button class="nv-btn ghost" id="nvPrev">上一章</button>' +
          '<button class="nv-btn ghost" id="nvToc">目录</button>' +
          '<button class="nv-btn ghost" id="nvNext">下一章</button></div>' +
      '</div>';
  }

  function renderShelf() {
    const host = document.getElementById('nvShelf');
    if (!host) return;
    const hint = document.getElementById('nvShelfHint');
    if (hint) hint.hidden = state.shelf.length > 0;
    if (!state.shelf.length) {
      host.innerHTML = '<div class="nv-empty"><div class="nv-empty-ico">📚</div>' +
        '<b>书架空空</b><p>点右上「搜书」，聚合搜索已启用的书源，把想看的书收进来。<br>' +
        '还没有书源？先去「书源管理」粘贴 legado / eso 书源 JSON。</p></div>';
      return;
    }
    host.innerHTML = state.shelf.map(function (b, i) {
      const cover = b.cover
        ? '<img class="nv-cover" src="' + esc(b.cover) + '" alt="" loading="lazy" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">'
        : '<div class="nv-cover nv-cover-ph">📖</div>';
      return '<div class="nv-book" data-idx="' + i + '">' + cover +
        '<div class="nv-book-mid"><b>' + esc(b.name) + '</b>' +
        '<span>' + esc(b.author || '佚名') + '</span>' +
        '<span class="nv-prog">' + (b.lastCi != null && b.lastChName ? '读到 ' + esc(b.lastChName) : '未开始') + '</span></div>' +
        '<button class="nv-del" data-del="' + i + '" aria-label="移出书架" title="移出书架">✕</button></div>';
    }).join('');
    host.querySelectorAll('.nv-book').forEach(function (card) {
      card.onclick = function (e) {
        if (e.target.closest('.nv-del')) return;
        tap();
        openDetail(parseInt(card.dataset.idx, 10));
      };
    });
    host.querySelectorAll('[data-del]').forEach(function (btn) {
      btn.onclick = function (e) {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.del, 10);
        const b = state.shelf[idx];
        if (!b) return;
        if (!window.confirm('把《' + b.name + '》移出书架？（进度会一并删除）')) return;
        state.shelf.splice(idx, 1);
        saveState();
        renderShelf();
      };
    });
  }

  /* ---------- 搜索 ---------- */
  let searchSeq = 0;

  function renderSearch() {
    renderSrcStatus();
  }

  function enabledSources() {
    return state.sources.filter(function (s) { return s.enabled !== false; });
  }

  function renderSrcStatus() {
    const host = document.getElementById('nvSrcStatus');
    if (!host) return;
    if (!state.sources.length) {
      host.innerHTML = '<span class="nv-none">还没有书源，先在下方粘贴书源 JSON</span>';
    } else {
      host.innerHTML = '已启用 ' + enabledSources().length + ' / ' + state.sources.length + ' 个书源';
    }
  }

  function runSearch() {
    const kw = (document.getElementById('nvKw').value || '').trim();
    const errEl = document.getElementById('nvSrcStatus');
    if (!kw) {
      if (errEl) errEl.innerHTML = '<span class="nv-err">先写点书名或作者再搜</span>';
      return;
    }
    if (!state.sources.length) {
      if (errEl) errEl.innerHTML = '<span class="nv-err">还没有书源：点「书源管理」导入 legado / eso 书源 JSON</span>';
      return;
    }
    tap();
    const seq = ++searchSeq;
    const results = document.getElementById('nvResults');
    const status = document.getElementById('nvSrcStatus');
    results.innerHTML = '<div class="nv-searching">正在聚合搜索「' + esc(kw) + '」…</div>';
    const list = enabledSources();
    let done = 0;
    const stat = {};
    const paintStatus = function () {
      if (!status || seq !== searchSeq) return;
      status.innerHTML = list.map(function (s) {
        const st = stat[s.id] || { t: 'pending' };
        const cls = st.t === 'ok' ? 'ok' : st.t === 'fail' ? 'fail' : 'run';
        const txt = st.t === 'ok' ? st.n + ' 条' : st.t === 'fail' ? '失败' : '…';
        return '<span class="nv-chip ' + cls + '">' + esc(s.name) + ' ' + txt + '</span>';
      }).join('') ;
    };
    paintStatus();
    list.forEach(function (src) {
      searchSource(src, kw).then(function (books) {
        stat[src.id] = { t: 'ok', n: books.length };
        if (seq !== searchSeq) return;
        if (books.length) appendResults(src, books);
        done++;
        paintStatus();
        if (done === list.length && !results.querySelector('.nv-item')) {
          results.innerHTML = '<div class="nv-empty"><div class="nv-empty-ico">🔍</div><b>没搜到「' + esc(kw) + '」</b>' +
            '<p>试试换关键词，或到「书源管理」补几个源。<br>个别源失败时会在上方状态条标红。</p></div>';
        }
      }).catch(function (e) {
        stat[src.id] = { t: 'fail' };
        if (seq !== searchSeq) return;
        done++;
        paintStatus();
        if (done === list.length && !results.querySelector('.nv-item')) {
          results.innerHTML = '<div class="nv-empty"><div class="nv-empty-ico">📭</div><b>全部书源都没搜到</b>' +
            '<p>' + esc(String(e.message || e).slice(0, 80)) + '</p></div>';
        }
      });
    });
  }

  function appendResults(src, books) {
    const results = document.getElementById('nvResults');
    if (!results) return;
    const searching = results.querySelector('.nv-searching');
    if (searching) searching.remove();
    const group = document.createElement('div');
    group.className = 'nv-src-group';
    group.innerHTML = '<div class="nv-src-title">' + esc(src.name) + '</div>' +
      books.map(function (b) {
        return '<div class="nv-item" data-url="' + esc(b.bookUrl) + '">' +
          '<div class="nv-item-main"><b>' + esc(b.name) + '</b>' +
          '<span>' + esc(b.author || '佚名') + (b.kind ? ' · ' + esc(b.kind) : '') + '</span>' +
          (b.intro ? '<i>' + esc(b.intro) + '</i>' : '') + '</div>' +
          '<button class="nv-btn small" data-add>加入书架</button></div>';
      }).join('');
    group.querySelectorAll('.nv-item').forEach(function (item) {
      const data = books[Array.prototype.indexOf.call(group.querySelectorAll('.nv-item'), item)];
      const addBtn = item.querySelector('[data-add]');
      const onShelf = state.shelf.some(function (b) { return b.srcId === src.id && b.bookUrl === data.bookUrl; });
      if (onShelf) {
        addBtn.disabled = true;
        addBtn.textContent = '已在书架';
      }
      addBtn.onclick = function () {
        tap();
        addToShelf(src, data);
        addBtn.disabled = true;
        addBtn.textContent = '已在书架';
      };
      item.querySelector('.nv-item-main').onclick = function () {
        tap();
        addToShelf(src, data);
        openDetailByKey(src.id, data.bookUrl);
      };
    });
    results.appendChild(group);
  }

  function addToShelf(src, data) {
    if (state.shelf.some(function (b) { return b.srcId === src.id && b.bookUrl === data.bookUrl; })) return;
    state.shelf.unshift({
      key: src.id + '::' + data.bookUrl,
      srcId: src.id,
      name: data.name,
      author: data.author,
      cover: data.coverUrl,
      bookUrl: data.bookUrl,
      charset: '',
      addedAt: Date.now()
    });
    if (state.shelf.length > MAX_SHELF) state.shelf.length = MAX_SHELF;
    saveState();
    if (window.juiceNotice) window.juiceNotice('已加入书架：《' + data.name + '》');
  }

  function findInShelf(srcId, bookUrl) {
    return state.shelf.find(function (b) { return b.srcId === srcId && b.bookUrl === bookUrl; }) || null;
  }

  /* ---------- 详情 / 目录 ---------- */
  function openDetail(idx) {
    const b = state.shelf[idx];
    if (b) openDetailByKey(b.srcId, b.bookUrl);
  }

  function openDetailByKey(srcId, bookUrl) {
    const src = getSource(srcId);
    const b = findInShelf(srcId, bookUrl) || { srcId: srcId, bookUrl: bookUrl, name: '加载中…' };
    curBook = b;
    navigate('detail');
    const host = document.getElementById('nvDetail');
    if (!src) {
      host.innerHTML = '<div class="nv-empty"><b>书源已被删除</b><p>这本书所属的书源不存在了，无法继续阅读。</p></div>';
      return;
    }
    host.innerHTML = '<div class="nv-loading">正在打开目录…</div>';
    loadToc(src, b).then(function (out) {
      curChapters = out.chapters;
      lastTocOut = out;
      if (!b.author && out.info.author) { b.author = out.info.author; saveState(); }
      if (!b.cover && out.info.coverUrl) { b.cover = out.info.coverUrl; saveState(); }
      renderDetailScreen(out);
    }).catch(function (e) {
      host.innerHTML = '<div class="nv-empty"><b>目录加载失败</b><p>' + esc(String(e.message || e).slice(0, 120)) + '</p></div>';
    });
  }

  function renderDetailScreen(out) {
    const host = document.getElementById('nvDetail');
    if (!host || !curBook) return;
    const b = curBook;
    const startLabel = b.lastCi != null ? '续读 · ' + esc(b.lastChName || '') : '开始阅读';
    host.innerHTML =
      '<div class="nv-head"><button class="nv-back" id="nvDetailBack" aria-label="返回书架">←</button><h2>书籍详情</h2></div>' +
      '<div class="nv-info">' +
        (b.cover ? '<img class="nv-cover lg" src="' + esc(b.cover) + '" alt="" referrerpolicy="no-referrer" onerror="this.style.display=\'none\'">' : '<div class="nv-cover lg ph">📖</div>') +
        '<div class="nv-info-main"><b class="nv-name">' + esc(b.name) + '</b>' +
        '<span>' + esc(b.author || out.info.author || '佚名') + '</span>' +
        '<span>' + (curChapters ? curChapters.length + ' 章' : '') + '</span></div>' +
      '</div>' +
      (out.info.intro ? '<p class="nv-intro">' + esc(out.info.intro) + '</p>' : '') +
      '<div class="nv-detail-ops"><button class="nv-btn" id="nvStart">' + startLabel + '</button></div>' +
      '<div class="nv-toc-head">目录</div>' +
      '<div class="nv-toc" id="nvTocList">' +
        (curChapters || []).map(function (c, i) {
          const read = b.lastCi != null && i <= b.lastCi;
          return '<button class="nv-ch' + (read ? ' read' : '') + '" data-ci="' + i + '">' + esc(c.name) + '</button>';
        }).join('') +
      '</div>';
    host.querySelector('#nvDetailBack').onclick = function () { tap(); navigate('shelf'); };
    host.querySelector('#nvStart').onclick = function () {
      tap();
      openReader(b.lastCi != null ? b.lastCi : 0);
    };
    host.querySelectorAll('.nv-ch').forEach(function (btn) {
      btn.onclick = function () {
        tap();
        openReader(parseInt(btn.dataset.ci, 10));
      };
    });
  }

  /* ---------- 阅读器 ---------- */
  function openReader(ci) {
    if (!curBook || !curChapters || !curChapters[ci]) return;
    curCi = Math.max(0, Math.min(ci, curChapters.length - 1));
    navigate('reader');
  }

  function renderReaderFrame() {
    const host = document.getElementById('nvReaderBody');
    if (!host || !curBook) return;
    host.innerHTML = '<div class="nv-loading">正在加载正文…</div>';
    const src = getSource(curBook.srcId);
    const ch = curChapters[curCi];
    if (!src || !ch) {
      host.innerHTML = '<div class="nv-empty"><b>无法阅读</b><p>书源不存在或章节缺失。</p></div>';
      return;
    }
    document.getElementById('nvReaderChName').textContent = ch.name;
    loadContent(src, curBook, ch).then(function (out) {
      if (curChapters !== curChaptersRef()) return;
      host.innerHTML = '';
      out.paragraphs.forEach(function (p) {
        const el = document.createElement('p');
        el.textContent = p;
        host.appendChild(el);
      });
      host.scrollTop = 0;
      /* 章节级进度立即落档 */
      curBook.lastCi = curCi;
      curBook.lastChName = ch.name;
      curBook.lastAt = Date.now();
      saveState();
    }).catch(function (e) {
      host.innerHTML = '<div class="nv-empty"><b>正文加载失败</b><p>' + esc(String(e.message || e).slice(0, 120)) + '</p></div>';
    });
  }

  /* 阅读中切章后 renderReaderFrame 里用于判断 curChapters 是否还是同一本书 */
  function curChaptersRef() { return curChapters; }

  function navigate(view) {
    curView = view;
    render();
    if (window.AppRouter && typeof window.AppRouter.replaceView === 'function') {
      window.AppRouter.replaceView(view, view === 'reader' ? { ci: curCi } : null, { skipRestore: true });
    }
  }

  let curView = 'shelf';

  function restoreView(view, payload) {
    if (!inited || !el) return;
    /* 路由把 #/novel 归一成 view='home'；本模块的首页是书架 */
    const v = (!view || view === 'home') ? 'shelf' : view;
    if (v === 'detail') {
      /* 从书架历史恢复：payload 里带 srcId + bookUrl */
      if (payload && payload.srcId) openDetailByKey(payload.srcId, payload.bookUrl);
      else { curView = 'shelf'; render(); }
      return;
    }
    if (view === 'reader') {
      if (curBook && curChapters) {
        curCi = payload && typeof payload.ci === 'number' ? payload.ci : (curBook.lastCi || 0);
        navigate('reader');
      } else {
        curView = 'shelf';
        render();
      }
      return;
    }
    curView = v === 'search' || v === 'shelf' ? v : 'shelf';
    render();
  }

  /* ---------- 书源管理 ---------- */
  function toggleSrcPanel(force) {
    const panel = document.getElementById('nvSrcPanel');
    if (!panel) return;
    const show = force != null ? force : panel.hidden;
    panel.hidden = !show;
    if (show) renderSrcPanel();
  }

  function renderSrcPanel() {
    const panel = document.getElementById('nvSrcPanel');
    if (!panel) return;
    panel.innerHTML =
      '<div class="nv-src-head">书源管理（' + state.sources.length + '/' + MAX_SOURCES + '）' +
      '<button class="nv-mini" id="nvSrcClose" aria-label="收起">收起</button></div>' +
      (state.sources.length
        ? '<div class="nv-src-list">' + state.sources.map(function (s, i) {
            return '<div class="nv-src-row"><label><input type="checkbox" data-toggle="' + i + '"' + (s.enabled !== false ? ' checked' : '') + '> ' + esc(s.name) + '</label>' +
              '<span class="nv-src-host">' + esc(s.bookSourceUrl.replace(/^https?:\/\//, '').slice(0, 32)) + '</span>' +
              '<button class="nv-del" data-sdel="' + i + '" aria-label="删除书源" title="删除书源">✕</button></div>';
          }).join('') + '</div>'
        : '<div class="nv-src-empty">还没有书源。把 legado / eso 导出的书源 JSON（数组或单个对象）粘贴到下面，或填一个书源 JSON 直链。</div>') +
      '<textarea id="nvSrcInput" rows="4" placeholder="粘贴书源 JSON，或 https://…/shuyuan.json 直链"></textarea>' +
      '<div class="nv-src-ops"><button class="nv-btn small" id="nvSrcImport">导入书源</button>' +
      '<span class="nv-src-hint">支持 legado 3.x 书源 JSON 常用子集；含 JS 规则的源会标记不支持。</span></div>';
    panel.querySelector('#nvSrcClose').onclick = function () { tap(); toggleSrcPanel(false); };
    panel.querySelectorAll('[data-toggle]').forEach(function (cb) {
      cb.onchange = function () {
        const s = state.sources[parseInt(cb.dataset.toggle, 10)];
        if (s) { s.enabled = cb.checked; saveState(); }
        renderSrcStatus();
      };
    });
    panel.querySelectorAll('[data-sdel]').forEach(function (btn) {
      btn.onclick = function () {
        const s = state.sources[parseInt(btn.dataset.sdel, 10)];
        if (!s) return;
        if (!window.confirm('删除书源「' + s.name + '」？书架里属于它的书将无法继续阅读。')) return;
        state.sources = state.sources.filter(function (x) { return x !== s; });
        saveState();
        renderSrcPanel();
        renderSrcStatus();
      };
    });
    panel.querySelector('#nvSrcImport').onclick = function () {
      tap();
      importSources(panel.querySelector('#nvSrcInput').value.trim());
    };
  }

  function importSources(text) {
    const panel = document.getElementById('nvSrcPanel');
    const err = function (msg) {
      if (panel) panel.querySelector('.nv-src-hint').textContent = msg;
    };
    if (!text) { err('先粘贴书源 JSON 或直链'); return; }
    const done = function (list) {
      let arr = list;
      if (!Array.isArray(arr)) arr = [arr];
      let added = 0, skipped = 0;
      arr.forEach(function (raw) {
        const s = normalizeSource(raw);
        if (!s) { skipped++; return; }
        if (state.sources.some(function (x) { return x.bookSourceUrl === s.bookSourceUrl; })) { skipped++; return; }
        if (state.sources.length >= MAX_SOURCES) { skipped++; return; }
        state.sources.push(s);
        added++;
      });
      saveState();
      renderSrcPanel();
      renderSrcStatus();
      if (window.juiceNotice) {
        window.juiceNotice(added ? '导入成功 ' + added + ' 个书源' + (skipped ? '，跳过 ' + skipped + ' 个' : '') : '没有可用书源：缺名称/域名/搜索规则');
      }
    };
    if (/^https?:\/\//i.test(text)) {
      panel.querySelector('.nv-src-hint').textContent = '正在拉取书源直链…';
      proxyFetch(text).then(function (r) {
        const decoded = decodeBuffer(r.buf, '', r.type);
        try { done(JSON.parse(decoded.text)); }
        catch (e) { err('直链内容不是合法 JSON'); }
      }).catch(function (e) {
        err('直链拉取失败：' + String(e.message || e).slice(0, 60));
      });
      return;
    }
    try { done(JSON.parse(text)); }
    catch (e) { err('JSON 解析失败：' + String(e.message || e).slice(0, 60)); }
  }

  /* ---------- 初始化 ---------- */
  function init() {
    el = document.getElementById('mod-novel');
    if (!el) return;
    if (inited) return;
    inited = true;
    loadState();
    el.innerHTML = '<div class="nv-root">' + screenHtml() + '</div>';

    document.getElementById('nvGoSearch').onclick = function () { tap(); navigate('search'); };
    document.getElementById('nvGoSources').onclick = function () {
      tap();
      navigate('search');
      toggleSrcPanel(true);
    };
    document.getElementById('nvSearchBack').onclick = function () { tap(); navigate('shelf'); };
    document.getElementById('nvReaderBack').onclick = function () { tap(); navigate('detail'); };
    document.getElementById('nvSearchGo').onclick = runSearch;
    const kw = document.getElementById('nvKw');
    kw.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); runSearch(); }
    });

    function setFont(delta) {
      state.settings.fontSize = Math.max(14, Math.min(30, state.settings.fontSize + delta));
      saveState();
      const body = document.getElementById('nvReaderBody');
      if (body) body.style.fontSize = state.settings.fontSize + 'px';
    }
    document.getElementById('nvFontMinus').onclick = function () { tap(); setFont(-2); };
    document.getElementById('nvFontPlus').onclick = function () { tap(); setFont(2); };

    document.getElementById('nvPrev').onclick = function () { tap(); if (curCi > 0) openReader(curCi - 1); else if (window.juiceNotice) window.juiceNotice('已经是第一章了'); };
    document.getElementById('nvNext').onclick = function () {
      tap();
      if (curChapters && curCi < curChapters.length - 1) openReader(curCi + 1);
      else if (window.juiceNotice) window.juiceNotice('已经是最新章节');
    };
    document.getElementById('nvToc').onclick = function () { tap(); navigate('detail'); };

    /* init 完成先渲染书架；restoreView('home') 会再次归一到 shelf */
    curView = 'shelf';
    render();
  }

  window.AppNovel = {
    init: init,
    restoreView: restoreView,
    /* 供回归测试使用的引擎内部件（只读） */
    _test: {
      evalRule: evalRule,
      resolveUrl: resolveUrl,
      buildSearchUrl: buildSearchUrl,
      splitRuleOpts: splitRuleOpts,
      decodeBuffer: decodeBuffer,
      pickCharset: pickCharset,
      jsonPathGet: jsonPathGet,
      normalizeSource: normalizeSource,
      getState: function () { return state; }
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
