/* =========================================================
   全局顶栏调度器与单页路由系统 (App Master Router)
   管理 5 大模块视图切换、URL Hash 监听与移动端视口同步
   ========================================================= */

(function () {
  'use strict';

  let currentModule = 'drinks';
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
    if (!['drinks', 'milktea', 'manual', 'fengshui', 'tarot'].includes(modKey)) {
      modKey = 'drinks';
    }

    currentModule = modKey;
    document.documentElement.dataset.activeModule = modKey;

    let matchedTab = null;
    // 切换顶栏 Tab 选中状态
    document.querySelectorAll('.nav-tab').forEach(tab => {
      const isMatch = tab.dataset.mod === modKey;
      tab.classList.toggle('active', isMatch);
      if (isMatch) {
        matchedTab = tab;
        tab.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
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
    if (['drinks', 'milktea', 'manual', 'fengshui', 'tarot'].includes(hash)) {
      switchModule(hash, false);
    }
  }

  function init() {
    // 绑定左上角 5 模块胶囊标签点击事件
    document.querySelectorAll('.nav-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        switchModule(tab.dataset.mod, true);
      });
    });

    // 绑定全局右上角控制中枢事件
    const btnTheme = document.getElementById('globalBtnTheme');
    if (btnTheme) {
      btnTheme.addEventListener('click', () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const curTheme = document.documentElement.dataset.theme;
        const nextTheme = curTheme === 'dark' ? 'light' : 'dark';
        document.documentElement.dataset.theme = nextTheme;
        try { localStorage.setItem('dp_theme', nextTheme); } catch (e) {}
        btnTheme.textContent = nextTheme === 'dark' ? '☾' : '☀';
      });
    }

    const btnSfx = document.getElementById('globalBtnSfx');
    if (btnSfx) {
      btnSfx.addEventListener('click', () => {
        if (window.SFX && window.SFX.toggle) {
          const enabled = window.SFX.toggle();
          btnSfx.textContent = enabled ? '🔊' : '🔇';
          if (btnSfx.title) btnSfx.title = enabled ? '音效已开启' : '音效已静音';
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

