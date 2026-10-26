/* =========================================================
   模块 12：摸鱼片单 (Slacking Watchlist)
   第三方追剧资源索引，与「摸鱼时钟」「功德木鱼」同级。
   数据来自 api/zhuiju.js（代理 awesome-zhuiju-free，CC BY 4.0）
   ========================================================= */

(function () {
  'use strict';

  const FILMS_KEY = 'juice_films_cache_v1';
  const FILMS_FAV_KEY = 'juice_films_fav_v1';
  let filmsData = null;        // { updatedAt, categories, resources }
  let filmsCat = '';           // '' = 全部
  let filmsStatus = '';        // '' = 全部状态 | recommended | caution
  let filmsFav = [];

  function loadFilmsFav() {
    try { filmsFav = JSON.parse(localStorage.getItem(FILMS_FAV_KEY) || '[]'); } catch (e) { filmsFav = []; }
    if (!Array.isArray(filmsFav)) filmsFav = [];
  }
  function saveFilmsFav() {
    try { localStorage.setItem(FILMS_FAV_KEY, JSON.stringify(filmsFav.slice(0, 100))); } catch (e) {}
  }

  /* 数据源实际使用的状态值：recommended / caution / removed
     （早期代码按 ok/broken 写，导致 recommended 全部落进「未检测」） */
  function filmsStatusMeta(st) {
    if (st === 'recommended' || st === 'ok') return { cls: 'ok', text: '可用' };
    if (st === 'caution') return { cls: 'warn', text: '谨慎' };
    if (st === 'removed' || st === 'broken') return { cls: 'bad', text: '已失效' };
    return { cls: '', text: '未检测' };
  }

  /* 链接类型判定：
     - b.zhuiju.me 等是项目方的「下载页/跳转页」（WordPress 站点，BunnyCDN），
       国内经常访问不了，需要明确标注，避免用户以为是影视站打不开；
     - 其余按普通站点处理。 */
  const REDIRECT_HOSTS = ['b.zhuiju.me', 'zhuiju.me'];
  function linkKind(url) {
    if (!url) return 'site';
    try {
      const h = new URL(url).hostname.replace(/^www\./, '');
      if (REDIRECT_HOSTS.indexOf(h) >= 0) return 'download';
    } catch (e) {}
    return 'site';
  }

  function countStatus(st) {
    if (!filmsData) return 0;
    return filmsData.resources.filter(function (r) { return r.status === st; }).length;
  }

  function renderFilmsCats() {
    const box = document.getElementById('filmsCats');
    if (!box || !filmsData) return;
    const cats = filmsData.categories || {};
    const items = [{ key: '', label: '精选优先' }];
    Object.keys(cats).forEach(function (k) {
      const n = filmsData.resources.filter(function (r) { return r.category === k; }).length;
      if (n) items.push({ key: k, label: cats[k] + ' ' + n });
    });
    const statusItems = [
      { key: '', label: '全部状态' },
      { key: 'recommended', label: '✅ 可用 ' + countStatus('recommended') },
      { key: 'caution', label: '⚠️ 谨慎 ' + countStatus('caution') },
      { key: 'removed', label: '⛔ 已失效 ' + countStatus('removed') }
    ];
    box.innerHTML =
      items.map(function (it) {
        return '<button type="button" class="films-cat' + (filmsCat === it.key ? ' active' : '') +
          '" data-cat="' + it.key + '">' + it.label + '</button>';
      }).join('') +
      '<span class="films-cat-sep"></span>' +
      statusItems.map(function (it) {
        return '<button type="button" class="films-cat status' + (filmsStatus === it.key ? ' active' : '') +
          '" data-status="' + it.key + '">' + it.label + '</button>';
      }).join('');
    box.querySelectorAll('[data-cat]').forEach(function (b) {
      b.onclick = function () {
        filmsCat = b.getAttribute('data-cat');
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        renderFilmsCats();
        renderFilmsGrid();
      };
    });
    box.querySelectorAll('[data-status]').forEach(function (b) {
      b.onclick = function () {
        filmsStatus = b.getAttribute('data-status');
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        renderFilmsCats();
        renderFilmsGrid();
      };
    });
  }

  function renderFilmsGrid() {
    const grid = document.getElementById('filmsGrid');
    const sub = document.getElementById('filmsSub');
    if (!grid || !filmsData) return;

    let list = filmsData.resources;
    if (filmsCat) list = list.filter(function (r) { return r.category === filmsCat; });
    if (filmsStatus) list = list.filter(function (r) { return r.status === filmsStatus; });

    if (sub) {
      sub.textContent = filmsData.total + ' 个站点 · 源数据更新于 ' + (filmsData.updatedAt || '未知') +
        ' · 当前显示 ' + list.length + ' 个' +
        (filmsStatus === 'recommended' ? '（已验证可用）' : filmsStatus === 'caution' ? '（需自行判断）' : '');
    }

    grid.innerHTML = list.map(function (r) {
      const st = filmsStatusMeta(r.status);
      const fav = filmsFav.indexOf(r.id) >= 0;
      const risk = r.riskCopyright === 'high'
        ? '<span class="films-badge risk">版权风险</span>' : '';
      const feat = r.featured ? '<span class="films-badge feat">精选</span>' : '';
      const kind = linkKind(r.url);
      const kindBadge = kind === 'download'
        ? '<span class="films-badge dl">下载页</span>' : '';
      const openLabel = kind === 'download' ? '去下载页' : '打开';
      const note = kind === 'download'
        ? '<div class="films-kindnote">这是项目方的下载/介绍页，不是影视站点；国内网络可能打不开</div>'
        : '';
      return '<div class="films-card' + (kind === 'download' ? ' is-download' : '') + '" data-id="' + escapeHtml(r.id) + '">' +
        '<div class="films-card-top">' +
          '<div class="films-name">' + escapeHtml(r.name) + feat + kindBadge + risk + '</div>' +
          '<button class="films-fav' + (fav ? ' on' : '') + '" data-fav="' + escapeHtml(r.id) + '" ' +
            'aria-label="' + (fav ? '取消收藏' : '收藏') + '">' + (fav ? '★' : '☆') + '</button>' +
        '</div>' +
        '<div class="films-sum">' + escapeHtml(r.summary || '暂无简介') + '</div>' +
        '<div class="films-meta">' +
          '<span class="films-score">摸鱼 ' + (r.score || '-') + '</span>' +
          '<span class="films-status ' + st.cls + '">' + st.text + '</span>' +
          (r.checkedAt ? '<span class="films-date">' + escapeHtml(r.checkedAt) + '</span>' : '') +
        '</div>' +
        note +
        '<div class="films-actions">' +
          '<a class="films-open' + (kind === 'download' ? ' alt' : '') + '" href="' + safeHref(r.url) + '" target="_blank" rel="noopener noreferrer">' + openLabel + '</a>' +
          '<button class="films-copy" data-url="' + escapeHtml(r.url) + '">复制地址</button>' +
        '</div>' +
      '</div>';
    }).join('');

    if (!list.length) {
      grid.innerHTML = '<div class="films-empty">这个分类下暂时没有资源</div>';
    }

    grid.querySelectorAll('[data-fav]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        const id = b.getAttribute('data-fav');
        const i = filmsFav.indexOf(id);
        if (i >= 0) filmsFav.splice(i, 1); else filmsFav.unshift(id);
        saveFilmsFav();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        renderFilmsGrid();
      };
    });
    grid.querySelectorAll('[data-url]').forEach(function (b) {
      b.onclick = function (e) {
        e.stopPropagation();
        const url = b.getAttribute('data-url');
        const done = function () {
          b.textContent = '已复制';
          setTimeout(function () { b.textContent = '复制地址'; }, 1400);
        };
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done).catch(function () { window.prompt('复制这个地址：', url); });
        } else {
          window.prompt('复制这个地址：', url);
        }
      };
    });
  }

  /* 统一委托 window.escHtml（js/esc.js，核心包） */
  function escapeHtml(str) {
    return window.escHtml(str);
  }

  // href 用：只放行 http(s)，其余一律回落 '#'（防 javascript: 协议注入）
  function safeHref(url) {
    var u = String(url || '');
    return /^https?:///i.test(u) ? window.escUrl(u) : '#';
  }

  function loadFilms(force) {
    const grid = document.getElementById('filmsGrid');
    const sub = document.getElementById('filmsSub');
    if (!grid) return;

    /* 先渲染本地缓存争取秒开，但缓存必须有过期时间：
       排序与状态是服务端算的，永远用缓存会导致规则更新后页面不跟随。
       5 分钟：上游每 30 分钟探测一次，前端 5 分钟拉一次服务端，
       相当于上游更新后最多 35 分钟内可见。 */
    const CACHE_TTL = 5 * 60 * 1000;
    let cacheFresh = false;
    if (!filmsData && !force) {
      try {
        const cached = JSON.parse(localStorage.getItem(FILMS_KEY) || 'null');
        if (cached && cached.resources && cached.resources.length) {
          filmsData = cached;
          cacheFresh = Date.now() - (cached._cachedAt || 0) < CACHE_TTL;
          renderFilmsCats();
          renderFilmsGrid();
        }
      } catch (e) {}
    }
    if (filmsData && !force && cacheFresh) return;

    if (!filmsData && sub) sub.textContent = '正在加载资源…';
    if (!filmsData && grid) grid.innerHTML = '<div class="films-empty">正在加载…</div>';

    /* 带时间戳绕过 HTTP 缓存：接口虽然设了 Cache-Control，
       但浏览器/中间层仍可能返回旧快照，导致排序规则更新后页面不跟随 */
    fetch('/api/zhuiju?_=' + Date.now(), { headers: { Accept: 'application/json' }, cache: 'no-store' })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || '加载失败');
        filmsData = d;
        try {
          localStorage.setItem(FILMS_KEY, JSON.stringify(Object.assign({ _cachedAt: Date.now() }, d)));
        } catch (e) {}
        renderFilmsCats();
        renderFilmsGrid();
      })
      .catch(function (err) {
        if (grid && !filmsData) {
          grid.innerHTML = '<div class="films-empty">加载失败：' + escapeHtml(err.message || '网络异常') +
            '<br><button class="films-retry" id="filmsRetry" type="button">重试</button></div>';
          const btn = document.getElementById('filmsRetry');
          if (btn) btn.onclick = function () { loadFilms(true); };
        }
        if (sub && !filmsData) sub.textContent = '资源加载失败，可点重试';
      });
  }

  function initFilms() {
    loadFilmsFav();
    const boss = document.getElementById('filmsBoss');
    if (boss) {
      boss.onclick = function () {
        // 老板键：立刻切到功德木鱼，看起来像一直在敲
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
          window.AppRouter.navigate('merit', 'home');
        } else {
          location.hash = '#/merit';
        }
      };
    }
    loadFilms(false);
  }


  window.AppFilms = {
    init: initFilms
  };
})();
