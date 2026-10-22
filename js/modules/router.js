/* =========================================================
   全局顶栏调度器与单页路由系统 (App Master Router)
   统一管理模块、模块内视图与浮层的历史状态
   ========================================================= */

(function () {
  'use strict';

  const STATE_VERSION = 1;
  const HOME_MOD = 'drinks';
  const ALLOWED_MODS = ['drinks', 'milktea', 'manual', 'fengshui', 'tarot', 'lingqian', 'decision', 'clock', 'merit', 'films', 'lifeguide', 'bazi', 'daily', 'scratch', 'wall', 'tv'];
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
    films: 'films',
    decision: 'decision',
    scratch: 'scratch',
    wall: 'wall',
    tv: 'tv'
  };
  const MODULE_API = {
    drinks: 'AppDrinks',
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
    films: 'AppFilms',
    decision: 'AppDecision',
    scratch: 'AppScratch',
    wall: 'AppWall',
    tv: 'AppTv'
  };
  const MOD_PARENT_MAP = {
    milktea: 'drinks',
    drinks: 'drinks',
    tarot: 'tarot',
    lingqian: 'tarot',
    bazi: 'tarot',
    fengshui: 'tarot',
    clock: 'clock',
    merit: 'clock',
    films: 'clock',
    tv: 'clock',
    lifeguide: 'manual'
  };

  const initializedModules = new Set(['drinks']);
  const initializingModules = new Map();
  const chunkLoads = Object.create(null);
  const MODULE_CSS_HREF = 'css/modules.bundle.css';

  let currentState = null;
  let currentModule = HOME_MOD;
  let lastDrinkMod = 'drinks';
  let lastMysticMod = 'tarot';
  let lastRelaxMod = 'clock';
  let moduleCssLoad = null;
  let lunarScheduled = false;
  let navSeq = 0;
  let suppressHashChange = false;
  let layerClosing = null;
  let layerFallbackTimer = null;
  let layerPushed = false;
  let initialized = false;

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

  /* 离开电视直播必须停流：<video> 在 display:none 下不会自动暂停，
     否则切到别的模块后画面/声音/流量仍在跑。 */
  let prevActiveMod = '';
  function stopLeavingMod(nextMod) {
    if (prevActiveMod === 'tv' && nextMod !== 'tv') {
      if (window.AppTv && typeof window.AppTv.destroy === 'function') {
        try { window.AppTv.destroy(); } catch (e) {}
      }
    }
    prevActiveMod = nextMod;
  }

  function activateModule(modKey) {
    const parentModKey = MOD_PARENT_MAP[modKey] || modKey;
    document.querySelectorAll('.app-module').forEach(mod => {
      mod.classList.remove('active');
    });
    const ownEl = document.getElementById('mod-' + modKey);
    const targetModuleEl = ownEl || document.getElementById('mod-' + parentModKey);
    if (targetModuleEl) targetModuleEl.classList.add('active');
    document.documentElement.classList.add('cover-ready');
    stopLeavingMod(modKey);
  }

  function setNavLoading(isLoading) {
    document.documentElement.classList.toggle('nav-loading', !!isLoading);
    let el = document.getElementById('navLoadOverlay');
    if (!isLoading) {
      if (el) el.remove();
      return;
    }
    if (el) return;
    el = document.createElement('div');
    el.id = 'navLoadOverlay';
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', 'polite');
    el.innerHTML = '<div class="nav-load-card"><span class="nav-load-spinner" aria-hidden="true"></span><b>正在打开…</b><small>首次进入需要加载该模块</small></div>';
    const viewport = document.getElementById('modules-viewport');
    (viewport || document.body).appendChild(el);
  }

  function ensureLunarReady() {
    return new Promise((resolve) => {
      const done = () => resolve(!!window.Solar);
      if (window.Solar) return done();
      loadChunk('lunar').then(done).catch(done);
    });
  }

  function refreshLunarConsumers() {
    if (window.AppDaily && typeof window.AppDaily.refreshLunar === 'function') {
      window.AppDaily.refreshLunar();
    }
    if (window.AppClock && typeof window.AppClock.refreshLunar === 'function') {
      window.AppClock.refreshLunar();
    }
  }

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

  function runModuleInit(modKey) {
    if (modKey === 'manual' && window.AppManual) {
      const body = document.getElementById('sm-homebody');
      if (!body || !body.children.length) window.AppManual.init();
    }
    if (modKey === 'daily' && window.AppDaily) {
      window.AppDaily.init();
      scheduleIdleChunk('lunar');
    }
    if (modKey === 'clock' && window.AppClock) {
      window.AppClock.init();
      scheduleIdleChunk('lunar');
    }
    if (modKey !== 'manual' && modKey !== 'daily' && modKey !== 'clock' && modKey !== 'drinks') {
      const apiName = MODULE_API[modKey];
      const api = apiName && window[apiName];
      if (api && typeof api.init === 'function') api.init();
    }
  }

  function shouldReinit(modKey) {
    return modKey === 'manual' || modKey === 'tv';
  }

  function initModuleOnce(modKey) {
    const sharedChunk = MODULE_CHUNKS[modKey];
    if (initializedModules.has(modKey)) {
      if (shouldReinit(modKey)) runModuleInit(modKey);
      return Promise.resolve();
    }
    if (initializingModules.has(modKey)) return initializingModules.get(modKey);

    const chunk = MODULE_CHUNKS[modKey];
    const apiName = MODULE_API[modKey];
    if (!chunk) {
      initializedModules.add(modKey);
      runModuleInit(modKey);
      return Promise.resolve();
    }

    // Multiple modules can share one chunk (tarot/lingqian/fengshui all use
    // mystic). Cache the chunk promise separately, but let every module run
    // its own init exactly once. Tying init to the first requester leaves the
    // next tab switching its nav highlight while the old page stays visible.
    const task = loadChunk(chunk).then(() => {
      if (currentModule !== modKey || initializedModules.has(modKey)) return;
      const api = window[apiName];
      if (!api) {
        console.warn('[Router] module API missing after chunk load:', modKey, apiName);
        return;
      }
      initializedModules.add(modKey);
      runModuleInit(modKey);
    }).catch((err) => {
      console.error('[Router]', err);
    }).finally(() => {
      initializingModules.delete(modKey);
    });
    initializingModules.set(modKey, task);
    return task;
  }

  function updateGlider(activeTab) {
    const glider = document.getElementById('navTabGlider');
    if (!glider) return;
    if (!activeTab) activeTab = document.querySelector('.nav-tab.active');
    if (!activeTab) return;
    glider.style.width = activeTab.offsetWidth + 'px';
    glider.style.transform = `translateX(${activeTab.offsetLeft}px)`;
  }

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
    const behavior = navScrollReady ? 'smooth' : 'auto';
    navScrollReady = true;
    wrapper.scrollBy({ left: delta, behavior });
  }

  function updateChrome(modKey) {
    const parentModKey = MOD_PARENT_MAP[modKey] || modKey;
    let matchedTab = null;
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isMatch = tab.dataset.mod === parentModKey;
      tab.classList.toggle('active', isMatch);
      if (isMatch) matchedTab = tab;
    });
    if (matchedTab) {
      updateGlider(matchedTab);
      scrollTabIntoView(matchedTab);
    }
    document.querySelectorAll('[data-sub-jump]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.subJump === modKey);
    });
    document.querySelectorAll('[data-ew-jump]').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.ewJump === modKey);
    });
  }

  function normalizeMod(modKey) {
    const raw = String(modKey || '').toLowerCase();
    if (!ALLOWED_MODS.includes(raw)) return null;
    // 旧链接 #/lifeguide：人间清醒章节已移除，落到说明书目录
    if (raw === 'lifeguide') return { mod: 'manual', view: 'home' };
    if (raw === 'drinks') return { mod: 'drinks', view: 'home' };
    return { mod: raw, view: 'home' };
  }

  function normalizeState(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const norm = normalizeMod(raw.mod);
    if (!norm) return null;
    let view = typeof raw.view === 'string' && raw.view ? raw.view : norm.view;
    if (norm.mod === 'drinks' && view !== 'quiz' && view !== 'result') view = 'home';
    if (norm.mod === 'manual' && raw.mod === 'lifeguide') view = 'home';
    const layer = typeof raw.layer === 'string' && raw.layer ? raw.layer : null;
    const payload = raw.payload && typeof raw.payload === 'object' ? raw.payload : null;
    return {
      juice: STATE_VERSION,
      mod: norm.mod,
      view,
      layer,
      payload,
      depth: Number.isInteger(raw.depth) && raw.depth >= 0 ? raw.depth : 0
    };
  }

  function stateUrl(state) {
    if (!state || state.mod === HOME_MOD) {
      return window.location.pathname + window.location.search;
    }
    return window.location.pathname + window.location.search + '#/' + state.mod;
  }

  function urlWithoutHash() {
    return window.location.pathname + window.location.search;
  }

  function rememberModule(modKey) {
    if (modKey === 'drinks' || modKey === 'milktea') lastDrinkMod = modKey;
    if (modKey === 'tarot' || modKey === 'lingqian' || modKey === 'bazi' || modKey === 'fengshui') lastMysticMod = modKey;
    if (modKey === 'clock' || modKey === 'merit' || modKey === 'films' || modKey === 'tv') lastRelaxMod = modKey;
  }

  function layerApi(name) {
    if (name === 'history') {
      return {
        open: () => window.UniversalHistory && window.UniversalHistory.openDrawer({ fromRouter: true }),
        close: () => window.UniversalHistory && window.UniversalHistory.closeDrawer({ fromRouter: true })
      };
    }
    if (name === 'decision') {
      return {
        open: (payload) => window.AppDecision && window.AppDecision.openReceiptLayer && window.AppDecision.openReceiptLayer(payload),
        close: () => window.AppDecision && window.AppDecision.closeReceipt({ fromRouter: true })
      };
    }
    if (name === 'clock') {
      return {
        open: () => window.AppClock && window.AppClock.openZenScreensaver({ fromRouter: true }),
        close: () => window.AppClock && window.AppClock.closeZenScreensaver({ fromRouter: true })
      };
    }
    if (name === 'profile') {
      return {
        open: () => window.AppProfile && window.AppProfile.open({ fromRouter: true }),
        close: () => window.AppProfile && window.AppProfile.close({ fromRouter: true })
      };
    }
    if (name === 'tarot-poster') {
      return {
        open: (payload) => window.AppTarot && window.AppTarot.openPosterLayer && window.AppTarot.openPosterLayer(payload),
        close: () => window.AppTarot && window.AppTarot.closePoster && window.AppTarot.closePoster({ fromRouter: true })
      };
    }
    return null;
  }

  function closeLayerDom(name) {
    if (!name) return;
    const api = layerApi(name);
    if (api && typeof api.close === 'function') {
      try { api.close(); } catch (e) {}
    }
  }

  function openLayerDom(name, payload) {
    const api = layerApi(name);
    if (api && typeof api.open === 'function') {
      try { api.open(payload); } catch (e) { console.error('[Router] layer open failed:', name, e); }
    }
  }

  function restoreModuleView(state) {
    const apiName = MODULE_API[state.mod];
    const api = apiName && window[apiName];
    if (api && typeof api.restoreView === 'function') {
      try {
        api.restoreView(state.view, state.payload);
      } catch (e) {
        console.error('[Router] restoreView failed:', state.mod, state.view, e);
      }
    }
  }

  function applyState(rawState, source) {
    const state = normalizeState(rawState);
    if (!state) return Promise.resolve();
    const seq = ++navSeq;
    const prev = currentState;
    if (prev && prev.layer && prev.layer !== state.layer) {
      closeLayerDom(prev.layer);
    }
    if (source === 'popstate') {
      if (state.layer) layerPushed = true;
      else layerPushed = false;
    }
    if (layerClosing && state.layer !== layerClosing) {
      layerClosing = null;
      clearTimeout(layerFallbackTimer);
      layerFallbackTimer = null;
    }
    currentState = state;
    currentModule = state.mod;
    rememberModule(state.mod);
    document.documentElement.dataset.activeModule = state.mod;
    updateChrome(state.mod);

    if (!prev || prev.mod !== state.mod) {
      if (window.AppManual && typeof window.AppManual.stopActiveGame === 'function') {
        window.AppManual.stopActiveGame();
      }
    } else if (prev.mod === state.mod && prev.view === 'game' && state.view !== 'game') {
      // 同模块内离开 game 视图（典型：游戏页按浏览器后退到目录）——
      // 也必须暂停游戏，否则计时器/键盘监听在目录页仍然活着。
      // stopActiveGame 是模块无关的统一出口，任何模块引入带
      // 计时器/监听的实例都自动被这里覆盖。
      if (window.AppManual && typeof window.AppManual.stopActiveGame === 'function') {
        window.AppManual.stopActiveGame();
      }
    }

    if (state.mod === 'drinks') {
      activateModule(state.mod);
      initModuleOnce(state.mod).then(() => {
        if (seq !== navSeq) return;
        restoreModuleView(state);
        if (state.layer) openLayerDom(state.layer, state.payload);
      });
      return Promise.resolve();
    }

    if (source === 'program') setNavLoading(true);
    const moduleTask = initModuleOnce(state.mod);
    const cssTask = loadModuleCss().catch((err) => {
      console.error('[Router]', err);
    });
    return Promise.all([cssTask, moduleTask]).then(() => {
      if (seq !== navSeq) return;
      activateModule(state.mod);
      restoreModuleView(state);
      if (state.layer) openLayerDom(state.layer, state.payload);
    }).finally(() => {
      if (seq === navSeq) setNavLoading(false);
    });
  }

  function replaceHistory(state) {
    const normalized = normalizeState(state);
    if (!normalized) return;
    window.history.replaceState(normalized, '', stateUrl(normalized));
  }

  function pushHistory(state) {
    const normalized = normalizeState(state);
    if (!normalized) return;
    window.history.pushState(normalized, '', stateUrl(normalized));
  }

  function navigate(modKey, view, payload, options) {
    options = options || {};
    const norm = normalizeMod(modKey);
    if (!norm) return Promise.resolve();
    const target = normalizeState({
      mod: modKey,
      view: view || norm.view,
      layer: null,
      payload: payload || null
    });
    if (!target) return Promise.resolve();
    const prev = currentState;
    if (prev && prev.layer) {
      closeLayerDom(prev.layer);
      layerPushed = false;
      target.depth = prev.depth;
      replaceHistory(target);
      return applyState(target, 'program');
    }
    if (prev && prev.mod === target.mod && prev.view === target.view && !prev.layer && !options.force) {
      return Promise.resolve();
    }
    if (options.replace) {
      target.depth = prev ? prev.depth : 0;
      replaceHistory(target);
    } else {
      target.depth = prev ? prev.depth + 1 : 0;
      pushHistory(target);
    }
    return applyState(target, 'program');
  }

  function pushView(view, payload) {
    if (!currentState) return Promise.resolve();
    const target = normalizeState({
      mod: currentState.mod,
      view: view,
      layer: null,
      payload: payload || null
    });
    if (!target) return Promise.resolve();
    if (currentState.layer) {
      closeLayerDom(currentState.layer);
      layerPushed = false;
      target.depth = currentState.depth;
      replaceHistory(target);
    } else {
      target.depth = currentState.depth + 1;
      pushHistory(target);
    }
    return applyState(target, 'program');
  }

  function replaceView(view, payload, options) {
    options = options || {};
    if (!currentState) return Promise.resolve();
    const target = normalizeState({
      mod: currentState.mod,
      view: view,
      layer: null,
      payload: payload || null
    });
    if (!target) return Promise.resolve();
    if (currentState.layer) closeLayerDom(currentState.layer);
    layerPushed = false;
    target.depth = currentState.depth;
    replaceHistory(target);
    if (options.skipRestore) {
      currentState = target;
      currentModule = target.mod;
      rememberModule(target.mod);
      document.documentElement.dataset.activeModule = target.mod;
      updateChrome(target.mod);
      return Promise.resolve();
    }
    return applyState(target, 'program');
  }

  function openLayer(name, payload, options) {
    options = options || {};
    if (!currentState || !name) return Promise.resolve();
    const target = normalizeState({
      mod: currentState.mod,
      view: currentState.view,
      layer: name,
      payload: payload || null
    });
    if (!target) return Promise.resolve();
    if (currentState.layer && currentState.layer !== name) {
      closeLayerDom(currentState.layer);
      target.depth = currentState.depth;
      replaceHistory(target);
      layerPushed = true;
    } else if (currentState.layer === name) {
      target.depth = currentState.depth;
      replaceHistory(target);
    } else {
      target.depth = currentState.depth + 1;
      pushHistory(target);
      layerPushed = true;
    }
    return applyState(target, 'program');
  }

  function dismissLayer(name, options) {
    options = options || {};
    if (!name) return;
    if (!currentState || currentState.layer !== name) {
      closeLayerDom(name);
      return;
    }
    if (layerClosing === name) return;
    if (options.replace || !layerPushed) {
      closeLayerDom(name);
      layerPushed = false;
      const target = normalizeState({
        mod: currentState.mod,
        view: currentState.view,
        layer: null,
        payload: currentState.payload
      });
      target.depth = currentState.depth;
      replaceHistory(target);
      applyState(target, 'program');
      return;
    }
    layerClosing = name;
    closeLayerDom(name);
    window.history.back();
    clearTimeout(layerFallbackTimer);
    layerFallbackTimer = setTimeout(() => {
      if (!currentState || currentState.layer !== name) {
        layerClosing = null;
        return;
      }
      layerClosing = null;
      layerPushed = false;
      const target = normalizeState({
        mod: currentState.mod,
        view: currentState.view,
        layer: null,
        payload: currentState.payload
      });
      target.depth = currentState.depth;
      closeLayerDom(name);
      replaceHistory(target);
      applyState(target, 'program');
    }, 650);
  }

  function back(fallback) {
    if (!currentState) return;
    if (currentState.layer) {
      dismissLayer(currentState.layer);
      return;
    }
    if (currentState.depth > 0) {
      // A replaced entry (e.g. a result page) has depth but no in-site entry
      // behind it. Only call history.back() when the URL proves one exists.
      if (window.location.hash) {
        window.history.back();
      } else {
        const home = normalizeState({ mod: HOME_MOD, view: 'home', layer: null, payload: null });
        home.depth = 0;
        window.history.replaceState(
          home,
          '',
          urlWithoutHash()
        );
        applyState(home, 'program');
      }
      return;
    }
    if (currentState.view !== 'home') {
      replaceView('home');
      return;
    }
    if (typeof fallback === 'function') fallback();
  }

  function parseHashState() {
    const raw = decodeURIComponent(window.location.hash.replace(/^#\/?/, '')).trim().toLowerCase();
    if (!raw) return { state: { mod: HOME_MOD, view: 'home', layer: null, payload: null }, valid: true, home: true };
    const norm = normalizeMod(raw);
    if (!norm) return { state: { mod: HOME_MOD, view: 'home', layer: null, payload: null }, valid: false, home: true };
    if (norm.mod === HOME_MOD) return { state: { mod: HOME_MOD, view: 'home', layer: null, payload: null }, valid: true, home: true };
    return { state: { mod: norm.mod, view: norm.view, layer: null, payload: null }, valid: true, home: false };
  }

  function scheduleHashUnlock() {
    suppressHashChange = true;
    setTimeout(() => { suppressHashChange = false; }, 60);
  }

  function handlePopState(event) {
    scheduleHashUnlock();
    let state = normalizeState(event.state);
    if (state) {
      applyState(state, 'popstate');
      return;
    }
    const parsed = parseHashState();
    state = normalizeState(parsed.state);
    replaceHistory(state);
    applyState(state, 'popstate');
  }

  function handleHashChange() {
    if (suppressHashChange) {
      suppressHashChange = false;
      return;
    }
    const parsed = parseHashState();
    if (!parsed.valid) {
      const home = normalizeState({ mod: HOME_MOD, view: 'home', layer: null, payload: null });
      replaceHistory(home);
      applyState(home, 'hash');
      return;
    }
    if (currentState && currentState.mod === parsed.state.mod && currentState.view === parsed.state.view && !currentState.layer) {
      return;
    }
    const target = normalizeState(parsed.state);
    replaceHistory(target);
    applyState(target, 'hash');
  }

  function bindNavigation() {
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
        navigate(targetMod, 'home');
      });
    });
    document.querySelectorAll('[data-sub-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        navigate(btn.dataset.subJump, 'home');
      });
    });
    document.querySelectorAll('[data-ew-jump]').forEach(btn => {
      btn.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        navigate(btn.dataset.ewJump, 'home');
      });
    });
  }

  function bindGlobalControls() {
    const btnTheme = document.getElementById('globalBtnTheme');
    if (btnTheme) {
      const syncThemeUi = (theme) => {
        const dark = theme === 'dark';
        const ico = document.getElementById('gnavThemeIco');
        if (ico) ico.textContent = dark ? '☾' : '☀';
        const txt = document.getElementById('gnavThemeTxt');
        if (txt) txt.textContent = dark ? '深色主题' : '浅色主题';
        const ti1 = document.getElementById('themeIcon');
        if (ti1) ti1.textContent = dark ? '☾' : '☀';
        const ti2 = document.querySelector('#btnTheme2 span');
        if (ti2) ti2.textContent = dark ? '☾' : '☀';
      };
      syncThemeUi(document.documentElement.dataset.theme || 'dark');
      btnTheme.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const curTheme = document.documentElement.dataset.theme;
        const nextTheme = curTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = nextTheme;
        try { localStorage.setItem('dp_theme', nextTheme); } catch (e) {}
        syncThemeUi(nextTheme);
      });
    }
    /* 「⋯」菜单开合：点外部 / Esc 关闭 */
    const moreWrap = document.getElementById('gnavMore');
    const moreBtn = document.getElementById('globalBtnMore');
    const moreMenu = document.getElementById('gnavMenu');
    if (moreWrap && moreBtn && moreMenu) {
      const setOpen = (open) => {
        moreMenu.hidden = !open;
        moreBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
      };
      moreBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        setOpen(moreMenu.hidden);
      });
      moreMenu.addEventListener('click', (e) => e.stopPropagation());
      document.addEventListener('click', () => setOpen(false));
      document.addEventListener('keydown', (e) => { if (e.key === 'Escape') setOpen(false); });
      window.__closeGnavMenu = () => setOpen(false);
    }
    /* Space 快速开测：活动屏幕上有可见的「开始* / 新开一局」按钮时，空格直接开始 */
    window.addEventListener('keydown', (e) => {
      if (e.code !== 'Space' || e.repeat) return;
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
      const active = document.querySelector('.sm-screen.active');
      if (!active) return;
      const btn = Array.from(active.querySelectorAll('button')).find(b => {
        if (!b.offsetWidth) return false;
        const t = (b.textContent || '').trim();
        return t.startsWith('开始') || t === '新开一局';
      });
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      btn.click();
    });
    const btnAbout = document.getElementById('globalBtnAbout');
    if (btnAbout) {
      let aboutEl = null;
      btnAbout.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        if (typeof window.__closeGnavMenu === 'function') window.__closeGnavMenu();
        if (!aboutEl) {
          aboutEl = document.createElement('div');
          aboutEl.className = 'gp-modal';
          aboutEl.id = 'modalAbout';
          aboutEl.setAttribute('aria-hidden', 'true');
          let ver = '';
          const appJs = document.querySelector('script[src*="app.bundle.js"]');
          const mv = appJs && appJs.src.match(/v=([0-9]+)/);
          if (mv) ver = 'v' + mv[1];
          aboutEl.innerHTML =
            '<div class="gp-backdrop" data-about-close></div>' +
            '<div class="gp-dialog" role="dialog" aria-modal="true" aria-label="关于本站">' +
            '<div class="gp-head">' +
            '<div><h3>关于本站</h3><p>灵感人格研究所 · Inspiration Persona Lab</p></div>' +
            '<button class="gp-close" type="button" data-about-close aria-label="关闭">✕</button>' +
            '</div>' +
            '<div class="gp-body">' +
            '<p>一台专为年轻人打造的<b>工位摸鱼、解压娱乐与自我测评</b>纯前端工具箱。免登录、无广告，所有数据只存在你的设备本地。</p>' +
            '<div class="gp-label">📌 10 大功能</div>' +
            '<div class="gp-func-list">' +
            '<div>🍹 <b>饮品测评</b> —— 测专属饮料 / 奶茶人格，支持当代 SBTI 发疯测试与 MBTI。</div>' +
            '<div>📖 <b>自我说明书</b> —— 15 关挑战：扫雷、俄罗斯方块、贪吃蛇、泡泡猫等 11 款小游戏 + 全服冲榜。</div>' +
            '<div>☯️ <b>东西玄学</b> —— 22 张塔罗大阿卡那、观音百签摇签、八字精准排盘、工位风水。</div>' +
            '<div>⏰ <b>摸鱼解压</b> —— 实时带薪秒薪时钟、全屏 Fliqlo 翻页屏保、电子木鱼、碎纸解压、' +
            '<b>摸鱼片单</b>（124 个追剧站点索引，含老板键一键切换）、'
            '<b>电视直播</b>（央视 18 个频道站内直接看）。</div>' +
            '<div>🪙 <b>纠结拯救</b> —— 命运大轮盘、抛硬币、掷骰子、掷圣杯，治好选择困难症。</div>' +
            '<div>🗞️ <b>今日风向</b> —— 每天 60 秒早报速递、全网实时热搜榜、必应 4K 壁纸。</div>' +
            '<div>🎟️ <b>幸运刮刮乐</b> —— 5 款经典拟真彩票，真实物理刮擦涂层与刮彩账本。</div>' +
            '<div>💬 <b>弹幕墙</b> —— 一人一句留言上墙，看看大家在聊什么。</div>' +
            '</div>' +
            '<div class="gp-tip">💡 极简提示：按 <b>Space</b> 快速开测 / 敲木鱼，按 <b>ESC</b> 退出全屏屏保。</div>' +
            '<div class="gp-label">开源</div>' +
            '<p>本项目以 <b>MIT</b> 协议开源，欢迎参观与拍砖：<br>' +
            '<a href="https://github.com/noc228076/juice" target="_blank" rel="noopener">github.com/noc228076/juice</a></p>' +
            '<div class="gp-label">数据来源</div>' +
            '<ul class="gp-about-list">' +
            '<li>影视榜单与海报：豆瓣（经本站代理，规避 Referer 与跨域限制）</li>' +
            '<li>摸鱼片单：<a href="https://github.com/laoma528/awesome-zhuiju-free" target="_blank" rel="noopener">awesome-zhuiju-free</a>（CC BY 4.0）</li>' +
            '<li>热榜 / 早报：codelife.cc、60s 公开接口，失败自动回落本地缓存</li>' +
            '<li>排行榜与弹幕墙：Upstash Redis（只存随机 ID、昵称、头像与成绩）</li>' +
            '</ul>' +
            '<div class="gp-label">构建版本</div>' +
            '<p class="gp-about-ver" id="gpAboutVer">' + (ver || 'dev') + '</p>' +
            '</div>' +
            '<div class="gp-foot">' +
            '<a class="gp-btn ghost" href="https://github.com/noc228076/juice" target="_blank" rel="noopener">GitHub</a>' +
            '<button class="gp-btn primary" type="button" data-about-close>知道了</button>' +
            '</div>' +
            '</div>' +
            '</div>';
          document.body.appendChild(aboutEl);
          aboutEl.querySelectorAll('[data-about-close]').forEach(el => {
            el.addEventListener('click', () => {
              aboutEl.classList.remove('open');
              aboutEl.setAttribute('aria-hidden', 'true');
            });
          });
        }
        aboutEl.classList.add('open');
        aboutEl.setAttribute('aria-hidden', 'false');
      });
    }
    const btnSfx = document.getElementById('globalBtnSfx');
    if (btnSfx) {
      const syncSfxUi = (enabled) => {
        const ico = document.getElementById('gnavSfxIco');
        if (ico) ico.textContent = enabled ? '🔊' : '🔇';
        const txt = document.getElementById('gnavSfxTxt');
        if (txt) txt.textContent = enabled ? '音效开启' : '音效已静音';
      };
      if (window.SFX && typeof window.SFX.isMuted === 'function') {
        syncSfxUi(!window.SFX.isMuted());
      }
      btnSfx.addEventListener('click', () => {
        if (window.SFX && window.SFX.toggle) {
          const enabled = window.SFX.toggle();
          syncSfxUi(enabled);
          if (typeof window.__syncDrinkSfx === 'function') window.__syncDrinkSfx(enabled);
        }
      });
    }
  }

  function initializeHistory() {
    const existing = normalizeState(window.history.state);
    if (existing) {
      layerPushed = false;
      existing.depth = 0;
      replaceHistory(existing);
      applyState(existing, 'init');
      return;
    }
    const parsed = parseHashState();
    if (!parsed.valid) {
      const home = normalizeState({ mod: HOME_MOD, view: 'home', layer: null, payload: null });
      replaceHistory(home);
      applyState(home, 'init');
      return;
    }
    if (parsed.home) {
      const home = normalizeState(parsed.state);
      home.depth = 0;
      replaceHistory(home);
      applyState(home, 'init');
      return;
    }
    const home = normalizeState({ mod: HOME_MOD, view: 'home', layer: null, payload: null });
    home.depth = 0;
    replaceHistory(home);
    const target = normalizeState(parsed.state);
    target.depth = 1;
    pushHistory(target);
    applyState(target, 'init');
  }

  function init() {
    if (initialized) return;
    initialized = true;
    if (window.AppProfile) window.AppProfile.init();
    bindNavigation();
    bindGlobalControls();
    window.addEventListener('popstate', handlePopState);
    window.addEventListener('hashchange', handleHashChange);
    window.addEventListener('resize', () => updateGlider());
    initializeHistory();
    setTimeout(() => updateGlider(), 100);
  }

  window.AppRouter = {
    init,
    navigate,
    pushView,
    replaceView,
    openLayer,
    dismissLayer,
    back,
    getState: () => (currentState ? { ...currentState, payload: currentState.payload } : null),
    getCurrentModule: () => currentModule,
    switchModule: (modKey) => navigate(modKey, 'home')
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
