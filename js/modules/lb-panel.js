/* =========================================================
   全服排行榜面板（三个小游戏共用）
   ---------------------------------------------------------
   2048 / 反应速度 / 色彩敏锐度 的榜单结构完全一致，只有
   「指标怎么读、怎么显示」不同。这里把面板的 DOM、分页签、
   本机战绩存取、全服榜拉取都收在一处，各游戏只提供一份
   descriptor（见下），不再各写一遍。

   用法：
     var panel = window.AppLbPanel.create({
       game: 'reaction',        // 对应 api/leaderboard.js 的 game 参数
       storeKey: 'sm_reaction_runs',   // 本机战绩的 localStorage 键
       higher: false,           // 数值越小越好（反应毫秒）
       unit: ' ms',
       idPrefix: 'reaction',    // 生成本页唯一的 DOM id
       describe: function (run) { return { score: run.ms, extra: { acc: run.acc } }; },
       formatScore: function (v) { return v + ' ms'; },
       localRows: function (run, i) { return [...]; },   // 本机战绩的列
       globalRows: function (row, i) { return [...]; }    // 全服榜的列
     });
     panel.mount(hostEl);       // 首次渲染
     panel.submit(run);         // 每局结束时上报
     panel.destroy();           // 退出游戏时解绑
   ========================================================= */

(function () {
  'use strict';

  var MAX_LOCAL = 12;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function fmtDay(ts) {
    var d = new Date(ts);
    if (isNaN(d.getTime())) return '--';
    return (d.getMonth() + 1) + '/' + d.getDate();
  }

  /* ---------------- 本机战绩 ---------------- */

  function loadLocal(storeKey) {
    try {
      var raw = localStorage.getItem(storeKey);
      if (!raw) return [];
      var arr = JSON.parse(raw);
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  }

  function saveLocal(storeKey, list) {
    try { localStorage.setItem(storeKey, JSON.stringify(list.slice(0, MAX_LOCAL))); } catch (e) {}
  }

  /* ---------------- 面板 ---------------- */

  function create(cfg) {
    var game = cfg.game;
    var higher = cfg.higher !== false;      // 默认越高越好
    var unit = cfg.unit || '';
    var idp = cfg.idPrefix || game;
    var storeKey = cfg.storeKey;

    var tab = 'global';
    var global = null;          // { board, total, online }
    var loading = false;
    var error = '';
    var myRank = 0;
    var open = typeof window.matchMedia === 'function'
      ? window.matchMedia('(min-width: 700px)').matches
      : false;

    var host = null;
    var destroyed = false;
    var onProfileChange = null;

    function localRuns() {
      var list = loadLocal(storeKey).filter(function (r) {
        return r && typeof r.score === 'number' && isFinite(r.score);
      });
      list.sort(function (a, b) {
        if (a.score !== b.score) return higher ? b.score - a.score : a.score - b.score;
        return (b.at || 0) - (a.at || 0);
      });
      return list;
    }

    function bestLocal() {
      var runs = localRuns();
      return runs.length ? runs[0].score : 0;
    }

    function loadGlobal(force) {
      if (!window.AppLeaderboard || loading) return;
      loading = true;
      error = '';
      render();
      window.AppLeaderboard.getBoard(game, 50, force).then(function (res) {
        loading = false;
        global = {
          board: (res && res.board) || [],
          total: (res && res.total) || 0,
          online: !!(res && res.online)
        };
        if (res && res.offline) error = '网络不可用，显示的是上次结果';
        if (res && res.error && !(res.board && res.board.length)) error = res.error;
        syncMyRank();
        render();
      });
    }

    function syncMyRank() {
      if (!global || !window.AppProfile) return;
      var me = window.AppProfile.get();
      var board = global.board || [];
      for (var i = 0; i < board.length; i++) {
        if (board[i].id === me.id) { myRank = i + 1; return; }
      }
      myRank = 0;
    }

    // 返回本局在本机战绩里的名次（1 起），供结算文案引用
    function submit(run) {
      if (!window.AppLeaderboard) return 0;
      var d = cfg.describe(run);
      var stamp = Date.now();
      var rec = { score: d.score, at: stamp };
      if (d.extra) for (var k in d.extra) if (Object.prototype.hasOwnProperty.call(d.extra, k)) rec[k] = d.extra[k];
      var list = loadLocal(storeKey);
      list.push(rec);
      list.sort(function (a, b) {
        if (a.score !== b.score) return higher ? b.score - a.score : a.score - b.score;
        return (b.at || 0) - (a.at || 0);
      });
      saveLocal(storeKey, list);
      var localRank = 0;
      for (var i = 0; i < list.length; i++) {
        if (list[i].at === stamp) { localRank = i + 1; break; }
      }

      loading = true;
      window.AppLeaderboard.submit(Object.assign({
        game: game,
        score: d.score
      }, d.extra || {})).then(function (res) {
        loading = false;
        if (res && res.ok) {
          global = { board: res.board || [], total: res.total || 0, online: !!res.online };
          myRank = res.rank || 0;
          error = '';
        } else {
          error = (res && res.error) || '提交失败';
        }
        if (!destroyed) render();
      });
      if (!destroyed) render();
      return localRank;
    }

    /* ---------------- 渲染 ---------------- */

    function rowsHTML(list, isGlobal) {
      if (!list.length) return '';
      var html = '';
      for (var i = 0; i < list.length; i++) {
        var cols = isGlobal ? cfg.globalCols(list[i], i) : cfg.localCols(list[i], i);
        var extraCls = (i === 0 ? ' top' : '') + (isGlobal && list[i].isMe ? ' me' : '');
        html += '<div class="lb-row' + (isGlobal ? ' is-global' : '') + extraCls + '">' +
          '<span class="lb-rank">' + (i === 0 ? '👑' : (i + 1)) + '</span>' +
          cols.join('') +
          '</div>';
      }
      return html;
    }

    function globalHTML() {
      var me = window.AppProfile ? window.AppProfile.get() : { id: '', name: '', avatar: '🙂' };
      var board = (global && global.board) || [];

      if (loading && !board.length) return '<div class="lb-empty">正在连接全服排行榜…</div>';
      if (!board.length) {
        return '<div class="lb-empty">全服榜还没有战绩，打完一局就能上榜' +
          (error ? '<br><span class="lb-err">' + esc(error) + '</span>' : '') + '</div>';
      }

      var view = board.map(function (r) {
        return Object.assign({}, r, { isMe: r.id === me.id });
      });
      var html = rowsHTML(view, true);
      if (error) html += '<div class="lb-err">' + esc(error) + '</div>';
      return html;
    }

    function mineHTML() {
      var runs = localRuns();
      if (!runs.length) return '<div class="lb-empty">还没有战绩，先来一局吧</div>';
      return rowsHTML(runs, false);
    }

    function panelHTML() {
      var runs = localRuns();
      var best = runs.length ? runs[0].score : 0;
      var top = (global && global.board && global.board.length) ? global.board[0].score : null;
      var summary = tab === 'global'
        ? (top != null ? ' · 全服最佳 ' + cfg.formatScore(top) : ' · 全服榜')
        : (runs.length ? ' · 共 ' + runs.length + ' 局 · 最佳 ' + cfg.formatScore(best) : ' · 暂无记录');

      var head = '<button class="lb-toggle" id="' + idp + 'Lb" aria-expanded="' + (open ? 'true' : 'false') + '">' +
        (open ? '▼' : '▶') + ' 排行榜' + summary + '</button>';
      if (!open) return head;

      var tabs = '<div class="lb-tabs">' +
        '<button class="lb-tab' + (tab === 'global' ? ' active' : '') + '" data-lb-tab="global">🌍 全服榜</button>' +
        '<button class="lb-tab' + (tab === 'mine' ? ' active' : '') + '" data-lb-tab="mine">📁 我的战绩</button>' +
        // 榜单有 60 秒缓存，想立刻看到别人的新成绩就点这里。
        // 加载中直接给旋转态——render() 会整块重绘，没法靠 class 维持动画。
        '<button class="lb-refresh' + (loading ? ' spin' : '') + '" id="' + idp + 'Refresh"' +
        (loading ? ' disabled' : '') + ' title="刷新全服榜" aria-label="刷新全服榜">↻</button>' +
        '</div>';

      var body;
      if (tab === 'global') {
        var me = window.AppProfile ? window.AppProfile.get() : null;
        var myName = me && me.name ? me.name : '匿名玩家';
        var myBest = runs.length ? best : 0;
        body = '<div class="lb-me-card">' +
          '<span class="lb-ava">' + esc(me ? me.avatar : '🙂') + '</span>' +
          '<span class="lb-me-name">' + esc(myName) + '</span>' +
          '<span class="lb-me-rank">' + (myRank ? '全服第 ' + myRank + ' 名' : '本机最佳 ' + cfg.formatScore(myBest)) + '</span>' +
          '<button class="lb-edit" id="' + idp + 'EditProfile">设置</button>' +
          '</div>' +
          '<div class="lb">' + globalHTML() + '</div>';
      } else {
        body = '<div class="lb">' + mineHTML() + '</div>';
      }

      return '<div class="lb-wrap">' + head + tabs + body + '</div>';
    }

    function render() {
      if (!host || destroyed) return;
      host.innerHTML = panelHTML();

      var btn = host.querySelector('#' + idp + 'Lb');
      if (btn) btn.onclick = function () {
        open = !open;
        render();
        if (open && tab === 'global' && !global) loadGlobal(false);
      };

      host.querySelectorAll('[data-lb-tab]').forEach(function (b) {
        b.onclick = function () {
          var next = b.getAttribute('data-lb-tab');
          if (tab === next) return;
          tab = next;
          render();
          if (tab === 'global') loadGlobal(false);
        };
      });

      var refreshBtn = host.querySelector('#' + idp + 'Refresh');
      if (refreshBtn) refreshBtn.onclick = function () {
        if (loading) return;
        loadGlobal(true);   // 加载态会让按钮自己变成旋转
      };

      var edit = host.querySelector('#' + idp + 'EditProfile');
      if (edit) edit.onclick = function () {
        if (window.AppProfile) window.AppProfile.open();
      };
    }

    // renderUI() 每次重绘都会调用 mount()，所以这里不能重复注册监听、
    // 也不能每次都打网络——只在第一次挂载时拉一次全服榜。
    function mount(el) {
      var first = host !== el;
      host = el;
      host.className = 'lb-host';
      render();
      if (first && open && tab === 'global') loadGlobal(false);
      if (window.AppProfile && !onProfileChange) {
        // 改完资料要重新拉一次：缓存里还是旧昵称，光重绘换不掉。
        // 服务端同步由 profile.js 的 save() 负责（它先发 PATCH），
        // 这里只等一拍再强制刷新，避免和 PATCH 抢跑导致拉回旧名字。
        onProfileChange = function () {
          if (destroyed) return;
          render();
          setTimeout(function () {
            if (!destroyed) loadGlobal(true);
          }, 300);
        };
        window.AppProfile.onChange(onProfileChange);
      }
    }

    function destroy() {
      destroyed = true;
      host = null;
    }

    return {
      mount: mount,
      submit: submit,
      destroy: destroy,
      bestLocal: bestLocal,
      refresh: function () { render(); }
    };
  }

  window.AppLbPanel = {
    create: create,
    esc: esc,
    fmtDay: fmtDay,
    loadLocal: loadLocal
  };
})();
