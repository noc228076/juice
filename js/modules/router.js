/* =========================================================
   全局顶栏调度器与单页路由系统 (App Master Router)
   管理 5 大模块视图切换、URL Hash 监听与移动端视口同步
   ========================================================= */

(function () {
  'use strict';

  let currentModule = 'drinks';
  let lastMysticMod = 'tarot';
  const ALLOWED_MODS = ['drinks', 'milktea', 'manual', 'fengshui', 'tarot', 'lingqian', 'decision', 'clock', 'merit', 'lifeguide', 'bazi', 'daily'];
  const initializedModules = new Set(['drinks']);

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

  function switchModule(modKey, updateHash = true) {
    if (!ALLOWED_MODS.includes(modKey)) {
      modKey = 'drinks';
    }
    if (modKey === 'tarot' || modKey === 'lingqian' || modKey === 'bazi') {
      lastMysticMod = modKey;
    }

    if (modKey !== 'manual' && window.AppManual && typeof window.AppManual.stopActiveGame === 'function') {
      window.AppManual.stopActiveGame();
    }
    if (modKey !== 'decision' && window.AppDecision && typeof window.AppDecision.closeReceipt === 'function') {
      window.AppDecision.closeReceipt();
    }

    currentModule = modKey;
    document.documentElement.dataset.activeModule = modKey;

    const hasSeparateLingqianTab = !!document.querySelector('.nav-tab[data-mod="lingqian"]');
    const hasSeparateBaziTab = !!document.querySelector('.nav-tab[data-mod="bazi"]');
    let matchedTab = null;
    // 切换顶栏 Tab 选中状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isMysticSub = (!hasSeparateLingqianTab && modKey === 'lingqian') || (!hasSeparateBaziTab && modKey === 'bazi');
      const isMatch = tab.dataset.mod === modKey || (isMysticSub && tab.dataset.mod === 'tarot');
      tab.classList.toggle('active', isMatch);
      if (isMatch) {
        matchedTab = tab;
        const wrapper = tab.closest('.nav-tabs-wrapper');
        if (wrapper && wrapper.scrollWidth > wrapper.clientWidth + 4) {
          const targetLeft = tab.offsetLeft - (wrapper.clientWidth - tab.offsetWidth) / 2;
          wrapper.scrollTo({ left: Math.max(0, targetLeft), behavior: 'smooth' });
        }
      }
    });

    if (matchedTab) {
      updateGlider(matchedTab);
    }

    // 切换模块视图
    document.querySelectorAll('.app-module').forEach(mod => {
      mod.classList.remove('active');
    });
    const targetModuleEl = document.getElementById('mod-' + modKey);
    if (targetModuleEl) {
      targetModuleEl.classList.add('active');
    }

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
      if (modKey === 'lifeguide' && window.AppLifeguide) window.AppLifeguide.init();
      if (modKey === 'bazi' && window.AppBazi) window.AppBazi.init();
      if (modKey === 'daily' && window.AppDaily) window.AppDaily.init();
    } else {
      if (modKey === 'manual' && window.AppManual) {
        const body = document.getElementById('sm-homebody');
        if (!body || !body.children.length) window.AppManual.init();
      }
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
    // 绑定左上角模块胶囊标签点击事件
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        let targetMod = tab.dataset.mod;
        if (targetMod === 'tarot') {
          targetMod = lastMysticMod || 'tarot';
        }
        switchModule(targetMod, true);
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
