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
  let filmsCat = '';           // '' = 全部（精选优先）
  let filmsFav = [];

  function loadFilmsFav() {
    try { filmsFav = JSON.parse(localStorage.getItem(FILMS_FAV_KEY) || '[]'); } catch (e) { filmsFav = []; }
    if (!Array.isArray(filmsFav)) filmsFav = [];
  }
  function saveFilmsFav() {
    try { localStorage.setItem(FILMS_FAV_KEY, JSON.stringify(filmsFav.slice(0, 100))); } catch (e) {}
  }

  function filmsStatusMeta(st) {
    if (st === 'ok') return { cls: 'ok', text: '可用' };
    if (st === 'caution') return { cls: 'warn', text: '谨慎' };
    if (st === 'broken') return { cls: 'bad', text: '失效' };
    return { cls: '', text: '未检测' };
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
    box.innerHTML = items.map(function (it) {
      return '<button type="button" class="films-cat' + (filmsCat === it.key ? ' active' : '') +
        '" data-cat="' + it.key + '">' + it.label + '</button>';
    }).join('');
    box.querySelectorAll('[data-cat]').forEach(function (b) {
      b.onclick = function () {
        filmsCat = b.getAttribute('data-cat');
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

    if (sub) {
      sub.textContent = filmsData.total + ' 个站点 · 数据更新于 ' + (filmsData.updatedAt || '未知') +
        (filmsCat ? '' : ' · 精选与高摸鱼指数优先');
    }

    grid.innerHTML = list.map(function (r) {
      const st = filmsStatusMeta(r.status);
      const fav = filmsFav.indexOf(r.id) >= 0;
      const risk = r.riskCopyright === 'high'
        ? '<span class="films-badge risk">版权风险</span>' : '';
      const feat = r.featured ? '<span class="films-badge feat">精选</span>' : '';
      return '<div class="films-card" data-id="' + r.id + '">' +
        '<div class="films-card-top">' +
          '<div class="films-name">' + escapeHtml(r.name) + feat + risk + '</div>' +
          '<button class="films-fav' + (fav ? ' on' : '') + '" data-fav="' + r.id + '" ' +
            'aria-label="' + (fav ? '取消收藏' : '收藏') + '">' + (fav ? '★' : '☆') + '</button>' +
        '</div>' +
        '<div class="films-sum">' + escapeHtml(r.summary || '暂无简介') + '</div>' +
        '<div class="films-meta">' +
          '<span class="films-score">摸鱼 ' + (r.score || '-') + '</span>' +
          '<span class="films-status ' + st.cls + '">' + st.text + '</span>' +
          (r.checkedAt ? '<span class="films-date">' + r.checkedAt + '</span>' : '') +
        '</div>' +
        '<div class="films-actions">' +
          '<a class="films-open" href="' + escapeHtml(r.url) + '" target="_blank" rel="noopener noreferrer">打开</a>' +
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

  function escapeHtml(str) {
    return String(str || '').replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function loadFilms(force) {
    const grid = document.getElementById('filmsGrid');
    const sub = document.getElementById('filmsSub');
    if (!grid) return;

    // 先渲染本地缓存，网络回来再刷新
    if (!filmsData && !force) {
      try {
        const cached = JSON.parse(localStorage.getItem(FILMS_KEY) || 'null');
        if (cached && cached.resources && cached.resources.length) {
          filmsData = cached;
          renderFilmsCats();
          renderFilmsGrid();
        }
      } catch (e) {}
    }
    if (filmsData && !force) return;

    if (!filmsData && sub) sub.textContent = '正在加载资源…';
    if (!filmsData && grid) grid.innerHTML = '<div class="films-empty">正在加载…</div>';

    fetch('/api/zhuiju', { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || '加载失败');
        filmsData = d;
        try { localStorage.setItem(FILMS_KEY, JSON.stringify(d)); } catch (e) {}
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
