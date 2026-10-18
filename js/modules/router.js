/* =========================================================
   全局顶栏调度器与单页路由系统 (App Master Router)
   管理 5 大模块视图切换、URL Hash 监听与移动端视口同步
   ========================================================= */

(function () {
  'use strict';

  let currentModule = 'drinks';
  let lastDrinkMod = 'drinks';
  let lastMysticMod = 'tarot';
  let lastRelaxMod = 'clock';
  // lifeguide 已并入说明书成为第 05 章，不再是独立顶层模块；
  // 保留在 ALLOWED_MODS 里只为兼容老链接，进入后立刻转成说明书 + 该章。
  const ALLOWED_MODS = ['drinks', 'milktea', 'manual', 'fengshui', 'tarot', 'lingqian', 'decision', 'clock', 'merit', 'lifeguide', 'bazi', 'daily', 'scratch'];
  const initializedModules = new Set(['drinks']);

  const MOD_PARENT_MAP = {
    milktea: 'drinks',
    drinks: 'drinks',
    tarot: 'tarot',
    lingqian: 'tarot',
    bazi: 'tarot',
    fengshui: 'tarot',
    clock: 'clock',
    merit: 'clock',
    lifeguide: 'manual'
  };

  function updateGlider(activeTab) {
    const glider = document.getElementById('navTabGlider');
    if (!glider) return;
    if (!activeTab) activeTab = document.querySelector('.nav-tab.active');
    if (!activeTab) return;
    const left = activeTab.offsetLeft;
    const width = activeTab.offsetWidth;
    glider.style.width = width + 'px';
    glider.style.transform = `translateX(${left}px)`;
  }

  // 把激活 tab 滚动到可见区域。
  // 顶栏在窄屏是横向滚动容器，8 个 tab 放不下，深链/子屏跳转时必须显式定位，
  // 否则激活项可能落在可视区之外，用户看不到当前处于哪个模块。
  // 用 getBoundingClientRect 做纯视口坐标比较，避免 offsetLeft 混用不同定位祖先坐标系。
  let navScrollReady = false;
  function scrollTabIntoView(activeTab) {
    const wrapper = activeTab.closest('.nav-tabs-wrapper');
    if (!wrapper) return;
    const w = wrapper.clientWidth;
    if (wrapper.scrollWidth <= w + 1) return;
    const wr = wrapper.getBoundingClientRect();
    const ar = activeTab.getBoundingClientRect();
    const pad = 10;
    let delta = 0;
    if (ar.left < wr.left + pad) {
      delta = ar.left - wr.left - pad;
    } else if (ar.right > wr.right - pad) {
      delta = ar.right - wr.right + pad;
    }
    if (Math.abs(delta) <= 1) return;
    // 首次执行用瞬时定位（页面初始化时平滑滚动会被忽略），之后用平滑动画
    const behavior = navScrollReady ? 'smooth' : 'auto';
    navScrollReady = true;
    wrapper.scrollBy({ left: delta, behavior });
  }

  function switchModule(modKey, updateHash = true) {
    if (!ALLOWED_MODS.includes(modKey)) {
      modKey = 'drinks';
    }
    if (modKey === 'drinks' || modKey === 'milktea') {
      lastDrinkMod = modKey;
    }
    if (modKey === 'tarot' || modKey === 'lingqian' || modKey === 'bazi' || modKey === 'fengshui') {
      lastMysticMod = modKey;
    }
    if (modKey === 'clock' || modKey === 'merit') {
      lastRelaxMod = modKey;
    }

    if (modKey !== 'manual' && window.AppManual && typeof window.AppManual.stopActiveGame === 'function') {
      window.AppManual.stopActiveGame();
    }
    if (modKey !== 'decision' && window.AppDecision && typeof window.AppDecision.closeReceipt === 'function') {
      window.AppDecision.closeReceipt();
    }

    currentModule = modKey;
    document.documentElement.dataset.activeModule = modKey;

    const parentModKey = MOD_PARENT_MAP[modKey] || modKey;
    let matchedTab = null;
    // 切换顶栏 Tab 选中状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isMatch = tab.dataset.mod === parentModKey;
      tab.classList.toggle('active', isMatch);
      if (isMatch) {
        matchedTab = tab;
      }
    });

    if (matchedTab) {
      updateGlider(matchedTab);
      scrollTabIntoView(matchedTab);
    }

    // 同步子导航条 (subnav-pill-btn) 激活态
    document.querySelectorAll('[data-sub-jump]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subJump === modKey);
    });
    // 同步东西玄学 (ew-switch-btn) 激活态
    document.querySelectorAll('[data-ew-jump]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ewJump === modKey);
    });

    // 切换模块视图。
    // 注意：MOD_PARENT_MAP 只用于顶栏 Tab 高亮，不能拿来定位模块——
    // milktea/fengshui/lingqian/merit/bazi 都有自己的 section，必须直接激活自己。
    // 唯一的例外是 lifeguide：它已经并进说明书，没有独立 section 了。
    document.querySelectorAll('.app-module').forEach(mod => {
      mod.classList.remove('active');
    });
    const ownEl = document.getElementById('mod-' + modKey);
    const targetModuleEl = ownEl || document.getElementById('mod-' + parentModKey);
    if (targetModuleEl) {
      targetModuleEl.classList.add('active');
    }
    // 首屏骨架只属于饮品封面。用户在主包还没执行完时切到别的模块（深链、
    // 或极快的手速），骨架必须让位，否则会盖住真正要看的模块。
    document.documentElement.classList.add('cover-ready');

    // 延迟初始化模块（仅在首次切入时初始化，按需加载，节省初始化开销）
    if (!initializedModules.has(modKey)) {
      initializedModules.add(modKey);
      if (modKey === 'milktea' && window.AppMilktea) window.AppMilktea.init();
      if (modKey === 'fengshui' && window.AppFengshui) window.AppFengshui.init();
      if (modKey === 'tarot' && window.AppTarot) window.AppTarot.init();
      if (modKey === 'manual' && window.AppManual) window.AppManual.init();
      if (modKey === 'decision' && window.AppDecision) window.AppDecision.init();
      if (modKey === 'lingqian' && window.AppLingqian) window.AppLingqian.init();
      if (modKey === 'clock' && window.AppClock) window.AppClock.init();
      if (modKey === 'merit' && window.AppMerit) window.AppMerit.init();
      if (modKey === 'bazi' && window.AppBazi) window.AppBazi.init();
      if (modKey === 'daily' && window.AppDaily) window.AppDaily.init();
      if (modKey === 'scratch' && window.AppScratch) window.AppScratch.init();
      // 老链接 #/lifeguide：先进说明书，再直接翻开第 05 章
      // 走 openTest 而不是 AppLifeguide.open()，这样侧栏高亮/当前章状态才对
      if (modKey === 'lifeguide' && window.AppManual) window.AppManual.openTest('lifeguide');
    } else {
      if (modKey === 'manual' && window.AppManual) {
        const body = document.getElementById('sm-homebody');
        if (!body || !body.children.length) window.AppManual.init();
      }
      // 已经初始化过说明书、又从老链接进来：只要把那一章重新翻开即可
      if (modKey === 'lifeguide' && window.AppManual) window.AppManual.openTest('lifeguide');
    }

    if (updateHash) {
      window.location.hash = '#/' + modKey;
    }
  }

  function handleHash() {
    const hash = window.location.hash.replace(/^#\/?/, '').toLowerCase();
    if (ALLOWED_MODS.includes(hash)) {
      switchModule(hash, false);
    }
  }

  function init() {
    // 玩家身份（右上角头像 / 昵称），与路由无关，先初始化
    if (window.AppProfile) window.AppProfile.init();

    // 绑定左上角模块胶囊标签点击事件
    document.querySelectorAll('.nav-tab').forEach((tab) => {
      tab.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        let targetMod = tab.dataset.mod;
        if (targetMod === 'drinks') {
          targetMod = lastDrinkMod || 'drinks';
        } else if (targetMod === 'tarot') {
          targetMod = lastMysticMod || 'tarot';
        } else if (targetMod === 'clock') {
          targetMod = lastRelaxMod || 'clock';
        }
        switchModule(targetMod, true);
      });
    });

    // 绑定子模块胶囊互跳按钮
    document.querySelectorAll('[data-sub-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        switchModule(btn.dataset.subJump, true);
      });
    });

    // 绑定东西方玄学合辑互跳按钮
    document.querySelectorAll('[data-ew-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        switchModule(btn.dataset.ewJump, true);
      });
    });

    // 绑定全局右上角控制中枢事件
    const btnTheme = document.getElementById('globalBtnTheme');
    if (btnTheme) {
      const initTheme = document.documentElement.dataset.theme || 'dark';
      btnTheme.textContent = initTheme === 'dark' ? '☾' : '☀';
      btnTheme.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const curTheme = document.documentElement.dataset.theme;
        const nextTheme = curTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = nextTheme;
        try { localStorage.setItem('dp_theme', nextTheme); } catch (e) {}
        btnTheme.textContent = nextTheme === 'dark' ? '☾' : '☀';
        const ti1 = document.getElementById('themeIcon');
        if (ti1) ti1.textContent = nextTheme === 'dark' ? '☾' : '☀';
        const ti2 = document.querySelector('#btnTheme2 span');
        if (ti2) ti2.textContent = nextTheme === 'dark' ? '☾' : '☀';
      });
    }

    const btnSfx = document.getElementById('globalBtnSfx');
    if (btnSfx) {
      if (window.SFX && typeof window.SFX.isMuted === 'function') {
        const initEnabled = !window.SFX.isMuted();
        btnSfx.textContent = initEnabled ? '🔊' : '🔇';
        if (btnSfx.title) btnSfx.title = initEnabled ? '音效已开启' : '音效已静音';
      }
      btnSfx.addEventListener('click', () => {
        if (window.SFX && window.SFX.toggle) {
          const enabled = window.SFX.toggle();
          btnSfx.textContent = enabled ? '🔊' : '🔇';
          if (btnSfx.title) btnSfx.title = enabled ? '音效已开启' : '音效已静音';
          if (typeof window.__syncDrinkSfx === 'function') {
            window.__syncDrinkSfx(enabled);
          }
        }
      });
    }

    // 监听 Hash 变化
    window.addEventListener('hashchange', handleHash);
    if (window.location.hash) {
      handleHash();
    } else {
      switchModule(currentModule, false);
    }

    window.addEventListener('resize', () => updateGlider());
    // 稍后微任务再次校准 glider 尺寸（字体加载后）
    setTimeout(() => updateGlider(), 100);
  }

  window.AppRouter = {
    init,
    switchModule,
    getCurrentModule: () => currentModule
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
