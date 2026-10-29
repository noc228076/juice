/* =========================================================
   全所综合历史档案系统 (Universal History Archive System)
   跨模块测评记录沉淀、分类筛选与一键回顾
   ========================================================= */

(function () {
  'use strict';

  const STORAGE_KEY = 'juice_universal_history_v1';
  let curFilter = 'all';

  function getRecords() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
    } catch (e) {
      return [];
    }
  }

  function saveRecords(list) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    } catch (e) {}
    updateHeaderBadge();
  }

  function add(item) {
    const list = getRecords();
    const now = new Date();
    const timeStr = `${now.getMonth() + 1}月${now.getDate()}日 ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    const record = {
      id: 'rec_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4),
      module: item.module || 'drinks',
      title: item.title || '测评记录',
      subtitle: item.subtitle || '',
      color: item.color || '#D6FF4B',
      badge: item.badge || '测评',
      avatar: item.avatar || '✨',
      time: timeStr,
      timestamp: Date.now(),
      data: item.data || null
    };

    list.unshift(record);
    if (list.length > 50) list.pop();
    saveRecords(list);
    return record;
  }

  function remove(id) {
    let list = getRecords();
    const target = list.find(r => r.id === id);
    list = list.filter(r => r.id !== id);
    saveRecords(list);
    // 同步清理旧版特调存储，防止刷新页面死灰复燃
    if (target && target.module === 'drinks') {
      try {
        const raw = localStorage.getItem('juice_persona_history_v1');
        if (raw) {
          let legacy = JSON.parse(raw);
          if (Array.isArray(legacy)) {
            legacy = legacy.filter(x => ('rec_' + x.timestamp) !== id && x.id !== id && x.timestamp !== target.timestamp);
            localStorage.setItem('juice_persona_history_v1', JSON.stringify(legacy));
          }
        }
      } catch (e) {}
    }
    renderDrawer(curFilter);
  }

  function clear() {
    saveRecords([]);
    try { localStorage.removeItem('juice_persona_history_v1'); } catch (e) {}
    renderDrawer(curFilter);
  }

  function updateHeaderBadge() {
    const list = getRecords();
    const badges = document.querySelectorAll('.history-count-badge, #globalHistoryCount');
    badges.forEach(b => {
      b.textContent = list.length > 99 ? '99+' : list.length;
      b.style.display = list.length > 0 ? 'inline-flex' : 'none';
    });
  }

  function restoreRecord(item) {
    if (!item) return;
    closeDrawer({ fromRouter: true });

    const mod = item.module || 'drinks';
    let ready = Promise.resolve();
    if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
      ready = Promise.resolve(window.AppRouter.navigate(mod, 'home', null, { replace: true }));
    }

    if (window.SFX && window.SFX.page) {
      window.SFX.page();
    }

    ready.then(() => {
      const map = {
        drinks: { record: item },
        milktea: { result: item.data },
        tarot: item.data,
        lingqian: item.data,
        fengshui: item.data,
        bazi: item.data,
        manual: item.data
      };
      if (mod === 'drinks') {
        if (typeof window.__restoreDrinkRecord === 'function') {
          window.__restoreDrinkRecord(item);
        } else if (typeof window.__restoreHistory === 'function' && item.data && item.data.code) {
          window.__restoreHistory(item.data.code);
        }
      } else if (mod === 'milktea') {
        if (window.AppMilktea && typeof window.AppMilktea.restore === 'function' && item.data) {
          window.AppMilktea.restore(item.data);
        }
      } else if (mod === 'fengshui') {
        if (window.AppFengshui && typeof window.AppFengshui.restore === 'function' && item.data) {
          window.AppFengshui.restore(item.data);
        }
      } else if (mod === 'tarot') {
        if (window.AppTarot && typeof window.AppTarot.restore === 'function' && item.data) {
          window.AppTarot.restore(item.data);
        }
      } else if (mod === 'manual') {
        // 说明书存档有两种：答题/游戏报告（test+res），和并入第 05 章的人间清醒（mode）
        const d = item.data || {};
        if (d.mode && !d.test && window.AppLifeguide) {
          window.AppManual.openTest('lifeguide', { silent: true });
          window.AppLifeguide.restore(d);
        } else if (window.AppManual && typeof window.AppManual.restore === 'function' && item.data) {
          window.AppManual.restore(item.data);
        }
      } else if (mod === 'decision') {
        if (window.AppDecision && typeof window.AppDecision.openReceiptLayer === 'function' && item.data) {
          window.AppDecision.openReceiptLayer(item.data);
          if (window.AppRouter && typeof window.AppRouter.openLayer === 'function') {
            window.AppRouter.openLayer('decision', item.data);
          }
        }
      } else if (mod === 'lingqian') {
        if (window.AppLingqian && typeof window.AppLingqian.restore === 'function' && item.data) {
          window.AppLingqian.restore(item.data);
        }
      } else if (mod === 'clock') {
        if (window.AppClock && typeof window.AppClock.restore === 'function' && item.data) {
          window.AppClock.restore(item.data);
        }
      } else if (mod === 'merit') {
        if (window.AppMerit && typeof window.AppMerit.restore === 'function' && item.data) {
          window.AppMerit.restore(item.data);
        }
      } else if (mod === 'lifeguide') {
        // 人间清醒已并入说明书：先切到说明书，再由它翻开第 05 章并恢复现场
        if (window.AppManual) {
          window.AppManual.openTest('lifeguide', { silent: true });
        }
        if (window.AppLifeguide && typeof window.AppLifeguide.restore === 'function' && item.data) {
          window.AppLifeguide.restore(item.data);
        }
      } else if (mod === 'bazi') {
        if (window.AppBazi && typeof window.AppBazi.restore === 'function' && item.data) {
          window.AppBazi.restore(item.data);
        }
      } else if (mod === 'vocab') {
        if (window.AppRouter && typeof window.AppRouter.navigate === 'function') {
          window.AppRouter.navigate('vocab', 'home');
        }
      } else if (mod === 'scratch') {
        if (window.AppScratch && typeof window.AppScratch.restore === 'function' && item.data) {
          window.AppScratch.restore(item.data);
        }
      }

      // Modules render their own restored view. Only sync the router state
      // afterwards, otherwise the router calls restoreView() and renders twice.
      if (window.AppRouter && typeof window.AppRouter.replaceView === 'function' && mod !== 'decision') {
        window.AppRouter.replaceView('result', map[mod] || null, { skipRestore: true });
      }
    }).catch((e) => {
      console.warn('restore record error:', e);
    });
  }

  function renderDrawer(filterMod = 'all') {
    curFilter = filterMod;
    const list = getRecords();
    // 「说明书」这一档同时收编旧的人间清醒记录（见下方 counts.manual）
    const matchMod = (r) => filterMod === 'manual'
      ? (r.module === 'manual' || r.module === 'lifeguide')
      : r.module === filterMod;
    const filtered = filterMod === 'all' ? list : list.filter(matchMod);

    const counts = {
      all: list.length,
      drinks: list.filter(r => r.module === 'drinks').length,
      milktea: list.filter(r => r.module === 'milktea').length,
      fengshui: list.filter(r => r.module === 'fengshui').length,
      tarot: list.filter(r => r.module === 'tarot').length,
      lingqian: list.filter(r => r.module === 'lingqian').length,
      decision: list.filter(r => r.module === 'decision').length,
      clock: list.filter(r => r.module === 'clock').length,
      merit: list.filter(r => r.module === 'merit').length,
      // 人间清醒并入说明书后，新记录归到 manual；旧记录仍是 lifeguide，
      // 所以「说明书」筛选要把两者都算进去，不然老存档会凭空消失
      manual: list.filter(r => r.module === 'manual' || r.module === 'lifeguide').length,
      bazi: list.filter(r => r.module === 'bazi').length,
      scratch: list.filter(r => r.module === 'scratch').length,
      vocab: list.filter(r => r.module === 'vocab').length
    };

    // 渲染分类筛选条
    const filterBar = document.getElementById('uniHistoryFilters');
    if (filterBar) {
      filterBar.innerHTML = `
        <button class="uni-filter-chip ${filterMod === 'all' ? 'active' : ''}" data-mod="all">全部 <span class="chip-count">${counts.all}</span></button>
        <button class="uni-filter-chip ${filterMod === 'drinks' ? 'active' : ''}" data-mod="drinks">🍹 特调 <span class="chip-count">${counts.drinks}</span></button>
        <button class="uni-filter-chip ${filterMod === 'milktea' ? 'active' : ''}" data-mod="milktea">🧋 奶茶 <span class="chip-count">${counts.milktea}</span></button>
        <button class="uni-filter-chip ${filterMod === 'manual' ? 'active' : ''}" data-mod="manual">📖 说明书 <span class="chip-count">${counts.manual}</span></button>
        <button class="uni-filter-chip ${filterMod === 'fengshui' ? 'active' : ''}" data-mod="fengshui">🧭 风水 <span class="chip-count">${counts.fengshui}</span></button>
        <button class="uni-filter-chip ${filterMod === 'tarot' ? 'active' : ''}" data-mod="tarot">🔮 塔罗 <span class="chip-count">${counts.tarot}</span></button>
        <button class="uni-filter-chip ${filterMod === 'lingqian' ? 'active' : ''}" data-mod="lingqian">🎋 灵签 <span class="chip-count">${counts.lingqian}</span></button>
        <button class="uni-filter-chip ${filterMod === 'decision' ? 'active' : ''}" data-mod="decision">🪙 决策 <span class="chip-count">${counts.decision}</span></button>
        <button class="uni-filter-chip ${filterMod === 'clock' ? 'active' : ''}" data-mod="clock">⏰ 摸鱼 <span class="chip-count">${counts.clock}</span></button>
        <button class="uni-filter-chip ${filterMod === 'merit' ? 'active' : ''}" data-mod="merit">📿 功德 <span class="chip-count">${counts.merit}</span></button>
        <button class="uni-filter-chip ${filterMod === 'bazi' ? 'active' : ''}" data-mod="bazi">📜 八字 <span class="chip-count">${counts.bazi}</span></button>
        <button class="uni-filter-chip ${filterMod === 'scratch' ? 'active' : ''}" data-mod="scratch">🎟️ 刮刮乐 <span class="chip-count">${counts.scratch}</span></button>
        <button class="uni-filter-chip ${filterMod === 'vocab' ? 'active' : ''}" data-mod="vocab">📚 背单词 <span class="chip-count">${counts.vocab}</span></button>
      `;

      filterBar.querySelectorAll('.uni-filter-chip').forEach(btn => {
        btn.onclick = () => {
          if (window.SFX && window.SFX.tap) window.SFX.tap();
          renderDrawer(btn.dataset.mod);
        };
      });
    }

    const subText = document.getElementById('historySubText');
    if (subText) subText.textContent = `共 ${filtered.length} 份档案`;

    const listEl = document.getElementById('historyList');
    if (!listEl) return;

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="history-empty">
          <div class="empty-cup-icon">📜</div>
          <h4>暂无该分类档案</h4>
          <p>快去体验左上角的各个研究所，测出你的独家出厂设定吧～</p>
        </div>
      `;
      return;
    }

    function hexToRgba(hex, alpha) {
      if (!hex || !hex.startsWith('#')) return `rgba(214, 255, 75, ${alpha})`;
      let c = hex.substring(1);
      if (c.length === 3) c = c.split('').map(x => x + x).join('');
      const num = parseInt(c, 16);
      return `rgba(${(num >> 16) & 255}, ${(num >> 8) & 255}, ${num & 255}, ${alpha})`;
    }

    let h = '';
    filtered.forEach(item => {
      // color 会进 style 属性：白名单校验，含引号/分号等就回落默认色，
      // 否则一段恶意 color 就能突破 style="" 注入任意标签属性
      const color = /^#[0-9a-fA-F]{3,8}$/.test(String(item.color || '')) ? item.color : '#D6FF4B';
      const bgRgba = hexToRgba(color, 0.12);
      const glowRgba = hexToRgba(color, 0.28);
      const tagRgba = hexToRgba(color, 0.16);
      const borderRgba = hexToRgba(color, 0.35);

      h += `
        <div class="uni-hist-item" data-id="${window.escHtml(item.id)}" style="--card-accent:${color};--avatar-bg:${bgRgba};--avatar-glow:${glowRgba};--tag-bg:${tagRgba};--card-accent-border:${borderRgba};">
          <div class="uni-hist-avatar">${window.escHtml(String(item.avatar || ""))}</div>
          <div class="uni-hist-body">
            <div class="uni-hist-top">
              <span class="uni-hist-mod-tag">${window.escHtml(String(item.badge || ""))}</span>
              <span class="uni-hist-time">${window.escHtml(String(item.time || ""))}</span>
            </div>
            <div class="uni-hist-title">${window.escHtml(String(item.title || ""))}</div>
            <div class="uni-hist-sub">${window.escHtml(String(item.subtitle || ""))}</div>
          </div>
          <div class="uni-hist-ops">
            <button class="uni-btn-view" data-view-id="${window.escHtml(item.id)}" title="查看并还原结果页面">查看 →</button>
            <button class="uni-btn-copy-icon" data-copy-id="${window.escHtml(item.id)}" title="复制测评摘要">📋</button>
            <button class="uni-btn-del" data-del="${window.escHtml(item.id)}" title="删除记录">✕</button>
          </div>
        </div>
      `;
    });

    listEl.innerHTML = h;

    // 查看按钮事件
    listEl.querySelectorAll('.uni-btn-view').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const rec = list.find(r => r.id === btn.dataset.viewId);
        if (rec) restoreRecord(rec);
      };
    });

    // 辅助复制按钮事件
    listEl.querySelectorAll('.uni-btn-copy-icon').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        const rec = list.find(r => r.id === btn.dataset.copyId);
        if (rec) {
          const textToCopy = `【${rec.badge}】${rec.title}\n${rec.subtitle}\n测算时间：${rec.time}`;
          /* 非 HTTPS（局域网 IP 调试）没有 clipboard API：回落 alert 展示全文 */
          if (!(navigator.clipboard && navigator.clipboard.writeText)) {
            alert(textToCopy);
            return;
          }
          navigator.clipboard.writeText(textToCopy).then(() => {
            const originalText = btn.innerHTML;
            btn.innerHTML = '✓';
            btn.style.color = '#34d399';
            btn.style.borderColor = '#34d399';
            setTimeout(() => {
              btn.innerHTML = originalText;
              btn.style.color = '';
              btn.style.borderColor = '';
            }, 1500);
          }).catch(() => {
            alert(textToCopy);
          });
        }
      };
    });

    // 卡片主体点击触发还原查看
    listEl.querySelectorAll('.uni-hist-item').forEach(itemEl => {
      itemEl.onclick = (e) => {
        if (e.target.closest('.uni-btn-del') || e.target.closest('.uni-btn-copy-icon')) return;
        const rec = list.find(r => r.id === itemEl.dataset.id);
        if (rec) restoreRecord(rec);
      };
    });

    // 删除按钮事件
    listEl.querySelectorAll('.uni-btn-del').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        remove(btn.dataset.del);
      };
    });
  }

  function openDrawer(options) {
    options = options || {};
    if (!options.fromRouter && window.AppRouter && typeof window.AppRouter.openLayer === 'function') {
      window.AppRouter.openLayer('history');
      return;
    }
    renderDrawer('all');
    const btnClear = document.getElementById('btnClearHistory');
    if (btnClear) btnClear.style.display = '';
    const modal = document.getElementById('modalHistory');
    if (modal) {
      modal.classList.add('open');
      modal.style.display = 'flex';
      modal.setAttribute('aria-hidden', 'false');
    }
  }

  function closeDrawer(options) {
    options = options || {};
    if (!options.fromRouter && window.AppRouter && typeof window.AppRouter.dismissLayer === 'function') {
      window.AppRouter.dismissLayer('history');
      return;
    }
    const modal = document.getElementById('modalHistory');
    if (modal) {
      modal.classList.remove('open');
      modal.style.display = 'none';
      modal.setAttribute('aria-hidden', 'true');
    }
  }

  function syncLegacyDrinks() {
    try {
      const raw = localStorage.getItem('juice_persona_history_v1');
      if (!raw) return;
      const legacyList = JSON.parse(raw);
      if (!Array.isArray(legacyList) || legacyList.length === 0) return;
      
      const records = getRecords();
      let changed = false;
      legacyList.forEach(item => {
        const exists = records.some(r => r.module === 'drinks' && (r.timestamp === item.timestamp || r.title === `${item.name} (${item.code})`));
        if (!exists) {
          records.push({
            id: item.id || ('rec_' + (item.timestamp || Date.now())),
            module: 'drinks',
            title: `${item.name} (${item.code})`,
            subtitle: `${item.testName || '特调'} · ${item.subText || ''}`,
            color: item.color || '#D6FF4B',
            badge: item.test === 'sbti' ? '🧟 SBTI' : (item.test === 'drink' ? '🍹 特调' : '🧠 MBTI'),
            avatar: item.test === 'drink' ? '🍹' : (item.test === 'sbti' ? '🧟' : '🧠'),
            time: item.dateStr || '近期',
            timestamp: item.timestamp || Date.now(),
            data: item
          });
          changed = true;
        }
      });
      if (changed) {
        records.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        if (records.length > 50) records.length = 50;   // 与 add() 同一上限，迁移批量导入不挤爆
        saveRecords(records);
      }
      // 迁移完成后移除旧键，避免后续删除单条记录后刷新又从旧键复活
      localStorage.removeItem('juice_persona_history_v1');
    } catch (e) {
      console.warn('sync legacy drinks failed', e);
    }
  }

  function init() {
    syncLegacyDrinks();
    updateHeaderBadge();
    const btnClose = document.getElementById('btnCloseHistory');
    const backdrop = document.getElementById('historyBackdrop');
    const btnClear = document.getElementById('btnClearHistory');

    if (btnClose) btnClose.onclick = closeDrawer;
    if (backdrop) backdrop.onclick = closeDrawer;
    if (btnClear) {
      btnClear.onclick = () => {
        if (confirm('确定要清空所有模块的测评档案吗？此操作无法撤销。')) {
          clear();
        }
      };
    }

    const openBtns = document.querySelectorAll('#btnOpenHistory, #globalBtnHistory, #btnResultHistory, #btnResultHistoryPc');
    openBtns.forEach(btn => {
      btn.onclick = () => {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        openDrawer();
      };
    });
  }

  window.UniversalHistory = {
    init,
    add,
    remove,
    clear,
    getRecords,
    renderDrawer,
    openDrawer,
    closeDrawer,
    restoreRecord,
    updateHeaderBadge
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
