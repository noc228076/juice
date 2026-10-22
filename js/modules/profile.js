/* =========================================================
   玩家身份系统 (Player Profile)
   右上角头像入口 + 昵称设置，供全服排行榜跨玩家比较
   ---------------------------------------------------------
   数据只存本机 localStorage，不上传任何个人信息；
   排行榜只用到随机生成的 id、昵称、头像 emoji。
   ========================================================= */

(function () {
  'use strict';

  const KEY = 'juice_profile_v1';

  /* 内置头像：4 组共 60 个，纯 emoji 不上传图片（零存储、跨端一致）。
     分组展示比一排 60 个更容易挑。 */
  const AVATAR_GROUPS = [
    { name: '表情', list: ['🙂', '😎', '😴', '🤔', '🥳', '😇', '🤯', '😭', '😤', '🫠', '🤡', '👻', '💀', '🤖', '👽'] },
    { name: '动物', list: ['🦊', '🐼', '🐸', '🐧', '🦄', '🐙', '🐱', '🐶', '🐨', '🐯', '🦁', '🐷', '🐔', '🦉', '🐝'] },
    { name: '吃喝', list: ['🧋', '🍋', '🍉', '🥑', '🍩', '🍕', '🍜', '🍺', '☕', '🧊', '🍰', '🥟', '🍫', '🧃', '🥤'] },
    { name: '符号', list: ['🌙', '⚡', '🔥', '👾', '🎮', '🎲', '🎯', '🏆', '💎', '🌊', '⭐', '🍀', '🪐', '🎧', '📚'] }
  ];
  const AVATARS = AVATAR_GROUPS.reduce(function (acc, g) { return acc.concat(g.list); }, []);

  const DEFAULTS = { id: '', name: '', avatar: '🙂' };

  let listeners = [];
  let modalEl = null;

  function randomId() {
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let out = '';
    try {
      const buf = new Uint8Array(16);
      crypto.getRandomValues(buf);
      for (let i = 0; i < buf.length; i++) out += alphabet[buf[i] % alphabet.length];
    } catch (e) {
      for (let i = 0; i < 16; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
    }
    return out;
  }

  function read() {
    let p = null;
    try { p = JSON.parse(localStorage.getItem(KEY) || 'null'); } catch (e) { p = null; }
    if (!p || typeof p !== 'object') p = {};
    if (!/^[A-Za-z0-9_-]{8,64}$/.test(p.id || '')) p.id = randomId();
    p.name = typeof p.name === 'string' ? p.name : '';
    p.avatar = AVATARS.indexOf(p.avatar) >= 0 ? p.avatar : DEFAULTS.avatar;
    return p;
  }

  function write(p) {
    try { localStorage.setItem(KEY, JSON.stringify(p)); } catch (e) {}
    listeners.forEach(function (fn) {
      try { fn(p); } catch (e) {}
    });
    syncHeader();
  }

  function get() {
    const p = read();
    // 首次访问就把 id 固化下来，避免每次刷新都换一个身份
    try {
      if (!localStorage.getItem(KEY)) localStorage.setItem(KEY, JSON.stringify(p));
    } catch (e) {}
    return p;
  }

  function displayName(p) {
    return (p && p.name) ? p.name : '匿名玩家';
  }

  /* ---------------- 顶栏入口 ---------------- */

  function syncHeader() {
    const btn = document.getElementById('globalBtnProfile');
    if (!btn) return;
    const p = get();
    const av = btn.querySelector('.gp-avatar');
    if (av) av.textContent = p.avatar;
    const nick = btn.querySelector('.gp-nick');
    if (nick) nick.textContent = displayName(p);
    btn.title = p.name ? ('当前玩家：' + p.name) : '设置头像和昵称';
    btn.classList.toggle('is-set', !!p.name);
  }

  /* ---------------- 设置弹窗 ---------------- */

  function ensureModal() {
    if (modalEl) return modalEl;
    modalEl = document.createElement('div');
    modalEl.className = 'gp-modal';
    modalEl.id = 'modalProfile';
    modalEl.setAttribute('aria-hidden', 'true');
    modalEl.innerHTML =
      '<div class="gp-backdrop" data-gp-close></div>' +
      '<div class="gp-dialog" role="dialog" aria-modal="true" aria-label="设置玩家头像与昵称">' +
      '<div class="gp-head">' +
      '<div><h3>玩家身份</h3><p>设好头像昵称，就能和全服玩家一起比 2048</p></div>' +
      '<button class="gp-close" type="button" data-gp-close aria-label="关闭">✕</button>' +
      '</div>' +
      '<div class="gp-body">' +
      '<div class="gp-preview"><span class="gp-preview-avatar" id="gpPreviewAvatar">🙂</span>' +
      '<div class="gp-preview-info"><b id="gpPreviewName">匿名玩家</b><span>全服排行榜上显示的名字</span></div></div>' +
      '<div class="gp-label">选择头像</div>' +
      '<div class="gp-avatars" id="gpAvatars"></div>' +
      '<div class="gp-label">昵称 <span>最多 16 个字</span></div>' +
      '<input class="gp-input" id="gpNameInput" type="text" maxlength="16" placeholder="给自己起个名字" autocomplete="off">' +
      '<div class="gp-dup" id="gpDupHint" role="status"></div>' +
      '<div class="gp-tip">昵称和头像只保存在本机，排行榜只上传随机 ID 与这两项，不含任何设备信息。</div>' +
      '</div>' +
      '<div class="gp-foot">' +
      '<button class="gp-btn ghost" type="button" data-gp-close>取消</button>' +
      '<button class="gp-btn primary" type="button" id="gpSave">保存</button>' +
      '</div>' +
      '</div>';
    document.body.appendChild(modalEl);

    const avBox = modalEl.querySelector('#gpAvatars');
    AVATAR_GROUPS.forEach(function (group) {
      const head = document.createElement('div');
      head.className = 'gp-avatar-group';
      head.textContent = group.name;
      avBox.appendChild(head);
      const row = document.createElement('div');
      row.className = 'gp-avatar-row';
      group.list.forEach(function (a) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'gp-avatar-opt';
        b.dataset.avatar = a;
        b.textContent = a;
        b.addEventListener('click', function () { pickAvatar(a); });
        row.appendChild(b);
      });
      avBox.appendChild(row);
    });

    modalEl.querySelectorAll('[data-gp-close]').forEach(function (n) {
      n.addEventListener('click', close);
    });

    const input = modalEl.querySelector('#gpNameInput');
    input.addEventListener('input', function () {
      modalEl.querySelector('#gpPreviewName').textContent = input.value.trim() || '匿名玩家';
      scheduleDupCheck(input.value);
    });
    input.addEventListener('keydown', function (e) {
      if (e.key === 'Enter') { e.preventDefault(); save(); }
      if (e.key === 'Escape') { e.preventDefault(); close(); }
    });

    modalEl.querySelector('#gpSave').addEventListener('click', save);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && modalEl.classList.contains('open')) close();
    });

    return modalEl;
  }

  /* ---------- 昵称重名提示 ----------
     免登录、纯本地身份下无法做「真唯一」：清空浏览器就能换个 ID 抢名字。
     所以这里只做提示：查到别人在用同名就提醒，但不阻止保存。 */
  let dupTimer = 0, dupSeq = 0;

  function scheduleDupCheck(raw) {
    const name = Array.from(String(raw || '').trim()).slice(0, 16).join('');
    const hint = modalEl && modalEl.querySelector('#gpDupHint');
    if (!hint) return;
    clearTimeout(dupTimer);
    if (!name) { hint.textContent = ''; hint.className = 'gp-dup'; return; }
    hint.textContent = '';
    hint.className = 'gp-dup';
    dupTimer = setTimeout(function () { checkDup(name); }, 500);
  }

  function checkDup(name) {
    const myId = get().id;
    const seq = ++dupSeq;
    const mark = function (others) {
      if (seq !== dupSeq) return;                       // 已有更新的一次检查
      const hint = modalEl && modalEl.querySelector('#gpDupHint');
      if (!hint) return;
      if (others > 0) {
        hint.textContent = '已有 ' + others + ' 位玩家在用这个昵称，建议换个更好认的';
        hint.className = 'gp-dup warn';
      } else {
        hint.textContent = '这个昵称还没人用';
        hint.className = 'gp-dup ok';
      }
    };
    const collect = function (board) {
      let n = 0;
      const seen = {};
      (board || []).forEach(function (row) {
        if (!row || row.id === myId) return;
        if (row.name !== name) return;
        if (seen[row.id]) return;
        seen[row.id] = 1;
        n++;
      });
      return n;
    };
    // 查全服榜（任意一个榜都行，名字是同一份 profile 同步过去的）。
    // force=true 绕过 60s 客户端缓存——重名判断必须看最新数据，
    // 否则刚有人在榜上改名也会漏判。
    if (window.AppLeaderboard && window.AppLeaderboard.getBoard) {
      window.AppLeaderboard.getBoard('2048', 50, true)
        .then(function (res) { mark(collect(res && res.board)); })
        .catch(function () { mark(0); });
    } else {
      mark(0);
    }
  }

  let draft = { avatar: '🙂' };

  function pickAvatar(a) {
    draft.avatar = a;
    const m = ensureModal();
    m.querySelector('#gpPreviewAvatar').textContent = a;
    m.querySelectorAll('.gp-avatar-opt').forEach(function (b) {
      b.classList.toggle('sel', b.dataset.avatar === a);
    });
  }

  function open(options) {
    options = options || {};
    if (!options.fromRouter && window.AppRouter && typeof window.AppRouter.openLayer === 'function') {
      window.AppRouter.openLayer('profile');
      return;
    }
    const m = ensureModal();
    const p = get();
    draft = { avatar: p.avatar };
    const dupHint = modalEl.querySelector('#gpDupHint');
    if (dupHint) { dupHint.textContent = ''; dupHint.className = 'gp-dup'; }
    pickAvatar(p.avatar);
    const input = m.querySelector('#gpNameInput');
    input.value = p.name || '';
    m.querySelector('#gpPreviewName').textContent = p.name || '匿名玩家';
    m.classList.add('open');
    m.setAttribute('aria-hidden', 'false');
    if (window.SFX && window.SFX.tap) window.SFX.tap();
    setTimeout(function () { try { input.focus(); } catch (e) {} }, 60);
  }

  function close(options) {
    options = options || {};
    if (!options.fromRouter && window.AppRouter && typeof window.AppRouter.dismissLayer === 'function') {
      window.AppRouter.dismissLayer('profile');
      return;
    }
    if (!modalEl) return;
    modalEl.classList.remove('open');
    modalEl.setAttribute('aria-hidden', 'true');
  }

  function save() {
    const m = ensureModal();
    const input = m.querySelector('#gpNameInput');
    const p = get();
    const name = Array.from(String(input.value || '').replace(/[\u0000-\u001F\u007F]/g, '').trim()).slice(0, 16).join('');
    p.name = name;
    p.avatar = draft.avatar || '🙂';
    write(p);
    close();
    if (window.SFX && window.SFX.ok) window.SFX.ok();

    // 服务端榜单里已经存着旧昵称，改完要立刻推上去，
    // 否则玩家改完头像回来一看，榜上还是旧名字。
    if (window.AppLeaderboard && window.AppLeaderboard.syncProfile) {
      window.AppLeaderboard.syncProfile();
    }
  }

  function onChange(fn) {
    if (typeof fn === 'function') listeners.push(fn);
  }

  function init() {
    get();
    syncHeader();
    const btn = document.getElementById('globalBtnProfile');
    if (btn) {
      btn.addEventListener('click', function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        open();
      });
    }
  }

  window.AppProfile = {
    init: init,
    get: get,
    set: function (patch) {
      const p = get();
      if (patch && typeof patch.name === 'string') p.name = patch.name;
      if (patch && patch.avatar) p.avatar = patch.avatar;
      write(p);
      return p;
    },
    displayName: displayName,
    open: open,
    close: close,
    onChange: onChange,
    AVATARS: AVATARS
  };
})();
