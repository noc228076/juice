/* =========================================================
   模块 14：弹幕墙 · 一人一句上墙 (Bullet Wall)
   最新留言以弹幕形式循环飞过，底部输入直接上墙。
   数据存服务端（api/wall.js），本模块只做展示与提交。
   ========================================================= */

(function () {
  'use strict';

  const API = '/api/wall';
  const POLL_MS = 30000;

  let inited = false;
  let el = null;
  let wall = [];            // 最新在前 {name, avatar, text, at}
  let total = 0;
  let pollTimer = null;

  /* 弹幕引擎状态 */
  const engine = { items: [], queue: [], qi: 0, raf: 0, last: 0 };
  let lastSends = [];       // 客户端侧软限频提示（服务端仍硬限）

  function profile() {
    const p = window.AppProfile ? window.AppProfile.get() : null;
    return {
      id: (p && p.id) || '',
      name: (p && p.name) || '匿名玩家',
      avatar: (p && p.avatar) || '🙂'
    };
  }

  /* ---------- 弹幕引擎 ---------- */
  function spawn(item, mine) {
    const stage = document.getElementById('wlStage');
    if (!stage) return;
    /* 去重：同一条留言（at 唯一）同一时刻只允许一条在飞，
       否则「初始补发 + 循环补位 + 轮询重置队列」三条路径会叠出重复弹幕 */
    if (item.at && engine.items.some(function (d) { return d.at === item.at; })) return;
    const hint = document.getElementById('wlStageHint');
    if (hint && hint.parentNode === stage) hint.remove();

    const elm = document.createElement('div');
    elm.className = 'wl-dm' + (mine ? ' mine' : '');
    elm.innerHTML = '<span class="a"></span><span class="n"></span><span class="t"></span>';
    elm.querySelector('.a').textContent = item.avatar;
    elm.querySelector('.n').textContent = item.name;
    elm.querySelector('.t').textContent = item.text;
    /* 航道避让：已占用的航道（含正在飞行的）不再选，避免弹幕叠字 */
    const LANES = 8;
    const used = {};
    engine.items.forEach(function (d) { used[d.lane] = true; });
    const free = [];
    for (let li = 0; li < LANES; li++) if (!used[li]) free.push(li);
    const lane = free.length ? free[(Math.random() * free.length) | 0] : ((Math.random() * LANES) | 0);
    const dur = 8500 + Math.random() * 5500;
    elm.style.top = (7 + lane * (74 / (LANES - 1))) + '%';
    stage.appendChild(elm);

    engine.items.push({
      el: elm,
      at: item.at || 0,
      lane: lane,
      x: stage.clientWidth,
      w: elm.offsetWidth || 160,
      speed: (stage.clientWidth + (elm.offsetWidth || 160) + 40) / (dur / 1000)
    });
    if (!engine.raf) {
      engine.last = performance.now();
      engine.raf = requestAnimationFrame(frame);
    }
  }

  function frame(now) {
    const dt = Math.min((now - engine.last) / 1000, 0.1);
    engine.last = now;
    const stage = document.getElementById('wlStage');
    for (let i = engine.items.length - 1; i >= 0; i--) {
      const d = engine.items[i];
      d.x -= d.speed * dt;
      d.el.style.transform = 'translateX(' + d.x.toFixed(1) + 'px)';
      if (d.x < -(d.w + 40)) {
        d.el.remove();
        engine.items.splice(i, 1);
        scheduleCycle();
      }
    }
    if (engine.items.length || engine.queue.length) {
      engine.raf = requestAnimationFrame(frame);
    } else {
      engine.raf = 0;
    }
  }

  function scheduleCycle() {
    if (!engine.queue.length || document.hidden) return;
    const item = engine.queue[engine.qi % engine.queue.length];
    engine.qi++;
    setTimeout(function () { spawn(item, false); }, 250 + Math.random() * 900);
  }

  function refillQueue() {
    const flying = {};
    engine.items.forEach(function (d) { if (d.at) flying[d.at] = true; });
    engine.queue = wall.slice(0, 40).filter(function (c) { return !flying[c.at]; });
    engine.qi = 0;
  }

  /* 冷启动：墙上还没有弹幕时先投放几条，否则「飞出→补一条」的循环永远不启动 */
  function primeStage() {
    if (!wall.length) return;
    const live = engine.items.length;
    if (live > 0) return;
    /* 冷启动：只从队列里取前几条，且取完就推进 qi，
       避免与 scheduleCycle 抢同一条造成重复 */
    const n = Math.min(4, engine.queue.length);
    for (let i = 0; i < n; i++) {
      const item = engine.queue[engine.qi++];
      if (!item) break;
      (function (it, delay) {
        setTimeout(function () {
          const stage = document.getElementById('wlStage');
          const mod = document.getElementById('mod-wall');
          if (!stage || !mod || !mod.classList.contains('active')) return;
          spawn(it, false);
        }, 350 + i * 850);
      })(item, i * 850);
    }
  }

  /* ---------- 列表与计数 ---------- */
  function relTime(at) {
    const d = Date.now() - at;
    if (d < 60000) return '刚刚';
    if (d < 3600000) return Math.floor(d / 60000) + ' 分钟前';
    return Math.floor(d / 3600000) + ' 小时前';
  }

  function renderList() {
    const list = document.getElementById('wlList');
    if (!list) return;
    list.innerHTML = '';
    wall.slice(0, 12).forEach(function (c) {
      const row = document.createElement('div');
      row.className = 'wl-item' + (c.mine ? ' mine' : '');
      row.innerHTML = '<span class="a"></span><div class="mid"><span class="n"></span>' +
        '<span class="t"></span></div>' +
        (c.mine ? '<button class="wl-del" type="button" aria-label="删除我的这条留言">✕</button>' : '') +
        '<span class="time"></span>';
      row.querySelector('.a').textContent = c.avatar;
      row.querySelector('.n').textContent = c.name;
      row.querySelector('.t').textContent = c.text;
      row.querySelector('.time').textContent = relTime(c.at);
      const del = row.querySelector('.wl-del');
      if (del) {
        del.addEventListener('click', function (e) {
          e.stopPropagation();
          deleteComment(c.at, del);
        });
      }
      list.appendChild(row);
    });
    if (!wall.length) {
      list.innerHTML = '<div class="wl-empty">墙上还空着，来发第一条吧</div>';
    }
    const cnt = document.getElementById('wlCount');
    if (cnt) cnt.textContent = String(total);
  }

  function renderWall() {
    refillQueue();
    renderList();
    primeStage();
  }

  /* ---------- 网络 ---------- */
  function fetchWall() {
    const me = profile();
    const url = API + '?limit=50' + (me.id ? '&id=' + encodeURIComponent(me.id) : '');
    return fetch(url, { headers: { Accept: 'application/json' } })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) throw new Error((d && d.error) || 'bad');
        wall = d.wall || [];
        total = d.total || 0;
        refillQueue();
        renderList();
        primeStage();
        return d;
      })
      .catch(function () { /* 静默：下次轮询再试 */ });
  }

  /* 手动刷新：转圈 → 拉最新 → 轻提示 */
  function manualRefresh() {
    const btn = document.getElementById('wlRefresh');
    const errEl = document.getElementById('wlErr');
    if (btn) { btn.disabled = true; btn.classList.add('spin'); btn.textContent = '↻ 刷新中'; }
    if (errEl) errEl.textContent = '';
    fetchWall().then(function (d) {
      if (btn) { btn.disabled = false; btn.classList.remove('spin'); btn.textContent = '↻ 刷新'; }
      if (!d) { if (errEl) errEl.textContent = '刷新失败，稍后再试'; return; }
      if (errEl) {
        errEl.textContent = '';
        errEl.className = 'wl-err wl-err-ok';
        errEl.textContent = '已刷新 · 共 ' + (d.total || 0) + ' 条';
        setTimeout(function () {
          if (errEl.textContent.indexOf('已刷新') === 0) {
            errEl.textContent = '';
            errEl.className = 'wl-err';
          }
        }, 1800);
      }
    });
  }

  function sendText() {
    const input = document.getElementById('wlInput');
    const errEl = document.getElementById('wlErr');
    if (!input) return;
    const text = (input.value || '').trim();
    errEl.textContent = '';
    if (!text) { errEl.textContent = '写点内容再发吧'; return; }

    const p = profile();
    if (!p.id) { errEl.textContent = '玩家身份未初始化，刷新页面再试'; return; }

    const btn = document.getElementById('wlSend');
    if (btn) { btn.disabled = true; btn.textContent = '发送中'; }

    fetch(API, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ id: p.id, name: p.name, avatar: p.avatar, text: text })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) {
          errEl.textContent = (d && d.error) || '发送失败，稍后再试';
          return;
        }
        wall = d.wall || [];
        total = d.total || total;
        refillQueue();
        renderList();
        primeStage();
        input.value = '';
        const counter = document.getElementById('wlCounter');
        if (counter) counter.textContent = '0/60';
      })
      .catch(function () { errEl.textContent = '网络异常，稍后再试'; })
      .finally(function () {
        if (btn) { btn.disabled = false; btn.textContent = '发送'; }
      });
  }

  function deleteComment(at, btn) {
    const errEl = document.getElementById('wlErr');
    const me = profile();
    if (!me.id) return;
    if (btn) { btn.disabled = true; btn.textContent = '…'; }
    fetch(API, {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({ at: at, id: me.id })
    })
      .then(function (r) { return r.json(); })
      .then(function (d) {
        if (!d || !d.ok) {
          if (errEl) errEl.textContent = (d && d.error) || '删除失败';
          if (btn) { btn.disabled = false; btn.textContent = '✕'; }
          return;
        }
        wall = d.wall || [];
        total = typeof d.total === 'number' ? d.total : total;
        refillQueue();
        renderList();
        primeStage();
      })
      .catch(function () {
        if (errEl) errEl.textContent = '网络异常，稍后再试';
        if (btn) { btn.disabled = false; btn.textContent = '✕'; }
      });
  }

  /* ---------- 初始化 ---------- */
  function init() {
    if (inited) { fetchWall(); return; }
    inited = true;
    el = document.getElementById('wallBody');
    if (!el) return;

    el.innerHTML =
      '<div class="wl-stage" id="wlStage"><div class="wl-hint" id="wlStageHint">最新留言会从这里飞过 →</div></div>' +
      '<div class="wl-inputbar">' +
      '<span class="wl-me-avatar" id="wlMeAvatar">🙂</span>' +
      '<div class="wl-me-col"><span class="wl-me-name" id="wlMeName">匿名玩家</span>' +
      '<input class="wl-input" id="wlInput" maxlength="60" autocomplete="off" ' +
      'placeholder="一人一句，最多 60 字（回车发送）"></div>' +
      '<span class="wl-counter" id="wlCounter">0/60</span>' +
      '<button class="wl-send" id="wlSend" type="button">发送</button></div>' +
      '<div class="wl-err" id="wlErr" role="alert"></div>' +
      '<div class="wl-list-head">最近留言</div>' +
      '<div class="wl-list" id="wlList"></div>';

    const me = profile();
    const avEl = document.getElementById('wlMeAvatar');
    if (avEl) avEl.textContent = me.avatar;
    const nameEl = document.getElementById('wlMeName');
    if (nameEl) nameEl.textContent = me.name;

    const sendBtn = document.getElementById('wlSend');
    if (sendBtn) sendBtn.addEventListener('click', sendText);
    const refreshBtn = document.getElementById('wlRefresh');
    if (refreshBtn) refreshBtn.addEventListener('click', manualRefresh);
    const input = document.getElementById('wlInput');
    if (input) {
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter') { e.preventDefault(); sendText(); }
      });
      input.addEventListener('input', function () {
        const c = document.getElementById('wlCounter');
        if (c) c.textContent = input.value.length + '/60';
      });
    }

    fetchWall().then(primeStage);
    pollTimer = setInterval(function () {
      if (document.hidden) return;
      const mod = document.getElementById('mod-wall');
      if (mod && mod.classList.contains('active')) fetchWall();
    }, POLL_MS);
  }

  window.AppWall = { init: init };
})();
