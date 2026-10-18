/* =========================================================
   全局顶栏调度器与单页路由系统 (App Master Router)
   管理 7 个顶栏模块 / 13 条路由的视图切换、URL Hash 监听与移动端视口同步
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
  const initializingModules = new Map();

  // 按需 chunk。顺序在 build-bundles.js 中定义，这里只负责 URL 与初始化。
  const MODULE_CHUNKS = {
    milktea: 'milktea',
    manual: 'manual',
    lifeguide: 'manual',
    tarot: 'mystic',
    lingqian: 'mystic',
    fengshui: 'mystic',
    bazi: 'bazi',
    clock: 'relax',
    merit: 'relax',
    decision: 'decision',
    scratch: 'scratch'
  };

  const MODULE_API = {
    daily: 'AppDaily',
    milktea: 'AppMilktea',
    manual: 'AppManual',
    lifeguide: 'AppManual',
    tarot: 'AppTarot',
    lingqian: 'AppLingqian',
    fengshui: 'AppFengshui',
    bazi: 'AppBazi',
    clock: 'AppClock',
    merit: 'AppMerit',
    decision: 'AppDecision',
    scratch: 'AppScratch'
  };

  const chunkLoads = Object.create(null);
  const MODULE_CSS_HREF = 'css/modules.bundle.css';
  let moduleCssLoad = null;
  let lunarScheduled = false;

  function appVersion() {
    if (window.__APP_VERSION__) return String(window.__APP_VERSION__);
    const script = document.querySelector('script[src*="app.bundle.js"]');
    const match = script && script.src.match(/[?&]v=(\d+)/);
    return match ? match[1] : '';
  }

  function loadChunk(name) {
    if (chunkLoads[name]) return chunkLoads[name];
    chunkLoads[name] = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const ver = appVersion();
      script.src = `js/chunks/${name}.js` + (ver ? `?v=${ver}` : '');
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => {
        script.remove();
        delete chunkLoads[name];
        reject(new Error('chunk load failed: ' + name));
      };
      document.head.appendChild(script);
    });
    return chunkLoads[name];
  }

  // 非饮品模块的样式独立成包。首次进入时与 JS chunk 并行加载，
  // CSS 就绪后再激活 section，避免深链先显示一帧无样式内容。
  function loadModuleCss() {
    if (moduleCssLoad) return moduleCssLoad;
    moduleCssLoad = new Promise((resolve, reject) => {
      const existing = document.querySelector('link[data-module-css]');
      if (existing) {
        if (existing.sheet) {
          resolve();
          return;
        }
        existing.addEventListener('load', resolve, { once: true });
        existing.addEventListener('error', reject, { once: true });
        return;
      }
      const link = document.createElement('link');
      const ver = appVersion();
      link.rel = 'stylesheet';
      link.href = MODULE_CSS_HREF + (ver ? `?v=${ver}` : '');
      link.dataset.moduleCss = '';
      link.onload = () => resolve();
      link.onerror = () => {
        link.remove();
        moduleCssLoad = null;
        reject(new Error('module css load failed'));
      };
      document.head.appendChild(link);
    });
    return moduleCssLoad;
  }

  function activateModule(modKey) {
    const parentModKey = MOD_PARENT_MAP[modKey] || modKey;
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
  }

  // lunar 也被 bazi chunk 包含；若 bazi 已加载过，这里直接跳过重复请求。
  function ensureLunarReady() {
    return new Promise((resolve) => {
      const done = () => resolve(!!window.Solar);
      if (window.Solar) return done();
      loadChunk('lunar').then(done).catch(done);
    });
  }

  // 农历库只补日期文本：Daily / Clock 先渲染主内容，等它到达再刷新。
  // 不要在这里重新 init，否则 Daily 会重复请求四组接口。
  function refreshLunarConsumers() {
    if (window.AppDaily && typeof window.AppDaily.refreshLunar === 'function') {
      window.AppDaily.refreshLunar();
    }
    if (window.AppClock && typeof window.AppClock.refreshLunar === 'function') {
      window.AppClock.refreshLunar();
    }
  }

  // lunar 体积大，不能进首屏；Daily / Clock 的农历显示依赖它。
  // 只有真正进入这两个模块后才调度，首页不下载这份 89 KB Brotli 的库。
  // 内容先渲染，农历到达后只刷新日期文本，不重复 init。
  function scheduleIdleChunk(name) {
    if (name !== 'lunar' || lunarScheduled) return;
    lunarScheduled = true;
    const run = () => {
      ensureLunarReady().then(refreshLunarConsumers).catch(() => {});
    };
    if ('requestIdleCallback' in window) {
      window.requestIdleCallback(run, { timeout: 4000 });
    } else {
      setTimeout(run, 2500);
    }
  }

  // 所有入口（首次加载、chunk 已就绪、共享 chunk 等待完成）都走同一套初始化，
  // 避免 manual / lifeguide 共用 manual chunk 时，后发入口漏掉 init 或 openTest。
  // Daily / Clock 首屏即渲染，农历库只补日期文本，绝不阻塞内容加载。
  function runModuleInit(modKey) {
    if (modKey === 'manual' && window.AppManual) {
      const body = document.getElementById('sm-homebody');
      if (!body || !body.children.length) window.AppManual.init();
    }
    if (modKey === 'lifeguide' && window.AppManual) {
      if (!initializedModules.has('manual')) window.AppManual.init();
      window.AppManual.openTest('lifeguide');
    }
    if (modKey === 'daily' && window.AppDaily) {
      window.AppDaily.init();
      scheduleIdleChunk('lunar');
    }
    if (modKey === 'clock' && window.AppClock) {
      window.AppClock.init();
      scheduleIdleChunk('lunar');
    }
    if (modKey !== 'manual' && modKey !== 'lifeguide' && modKey !== 'daily' && modKey !== 'clock') {
      const apiName = MODULE_API[modKey];
      const api = apiName && window[apiName];
      if (api && typeof api.init === 'function') api.init();
    }
  }

  // 核心模块（已在主包）没有 chunk，但仍需要 init。
  // 共享入口 manual / lifeguide 每次都要补跑，处理空目录与章节恢复；
  // 其余模块只初始化一次，避免 Daily 重复拉取四组接口。
  function shouldReinit(modKey) {
    return modKey === 'manual' || modKey === 'lifeguide';
  }

  function initModuleOnce(modKey) {
    // 同一次访问里既点 #/manual 又点 #/lifeguide 时，两者共用 manual chunk。
    // 等共享 chunk 加载完后再按当前入口补初始化，而不是复用旧 task 的初始化结果。
    const sharedChunk = MODULE_CHUNKS[modKey];
    const pending = Array.from(initializingModules.entries()).find(([key, task]) => (
      task && MODULE_CHUNKS[key] === sharedChunk
    ));
    if (pending) {
      return pending[1].then(() => {
        if (currentModule !== modKey) return;
        runModuleInit(modKey);
      });
    }

    if (initializedModules.has(modKey)) {
      if (shouldReinit(modKey)) runModuleInit(modKey);
      return Promise.resolve();
    }
    if (initializingModules.has(modKey)) return initializingModules.get(modKey);

    const chunk = MODULE_CHUNKS[modKey];
    const apiName = MODULE_API[modKey];
    if (!chunk) {
      if (apiName) {
        initializedModules.add(modKey);
        runModuleInit(modKey);
        return Promise.resolve();
      }
      initializedModules.add(modKey);
      return Promise.resolve();
    }

    const task = loadChunk(chunk).then(() => {
      if (chunk === 'lunar') refreshLunarConsumers();
      if (currentModule !== modKey) return;
      const api = window[apiName];
      if (!api) {
        console.warn('[Router] module API missing after chunk load:', modKey, apiName);
        return;
      }
      initializedModules.add(modKey);
      if (modKey === 'daily' || modKey === 'clock' || modKey === 'manual' || modKey === 'lifeguide') {
        runModuleInit(modKey);
      } else if (typeof api.init === 'function') {
        api.init();
      }
    }).catch((err) => {
      console.error('[Router]', err);
    }).finally(() => {
      initializingModules.delete(modKey);
    });
    initializingModules.set(modKey, task);
    return task;
  }

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
  // 顶栏在窄屏是横向滚动容器，7 个 tab 放不下，深链/子屏跳转时必须显式定位，
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

    if (updateHash) {
      window.location.hash = '#/' + modKey;
    }

    // 饮品相关视图的样式都在核心包里，立即切换。
    // 其余模块先并行取 CSS / JS，CSS 就绪后再激活 section。
    if (modKey === 'drinks') {
      activateModule(modKey);
      return initModuleOnce(modKey);
    }

    const moduleTask = initModuleOnce(modKey);
    const cssTask = loadModuleCss().catch((err) => {
      console.error('[Router]', err);
    });
    return Promise.all([cssTask, moduleTask]).then(() => {
      if (currentModule === modKey) activateModule(modKey);
    });
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
