/* =========================================================
   2048 全服排行榜客户端 (Online Leaderboard Client)
   与 api/leaderboard.js 对接；后端不可用时自动退回本机战绩
   ========================================================= */

(function () {
  'use strict';

  const ENDPOINT = '/api/leaderboard';
  const TIMEOUT = 8000;

  // 最近一次成功拉到的榜单，用于断网时仍能展示上一份快照
  let cache = { board: [], total: 0, online: false, at: 0 };
  let pending = null;

  function withTimeout(promise, ms) {
    return new Promise(function (resolve, reject) {
      const t = setTimeout(function () { reject(new Error('timeout')); }, ms);
      promise.then(function (v) { clearTimeout(t); resolve(v); },
        function (e) { clearTimeout(t); reject(e); });
    });
  }

  function available() {
    return typeof fetch === 'function';
  }

  async function getBoard(limit, force) {
    if (!available()) return Object.assign({}, cache, { offline: true });
    // 60 秒内复用结果，避免每次渲染都打网络
    if (!force && cache.at && Date.now() - cache.at < 60000) return cache;
    if (pending) return pending;

    pending = withTimeout(fetch(ENDPOINT + '?limit=' + (limit || 50), {
      headers: { Accept: 'application/json' }
    }), TIMEOUT)
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok || !data || !data.ok) {
            throw new Error((data && data.error) || ('HTTP ' + res.status));
          }
          cache = {
            board: Array.isArray(data.board) ? data.board : [],
            total: data.total || 0,
            online: !!data.online,
            at: Date.now()
          };
          return cache;
        });
      })
      .catch(function (err) {
        return Object.assign({}, cache, { offline: true, error: err && err.message });
      })
      .then(function (out) { pending = null; return out; });

    return pending;
  }

  async function submit(run) {
    if (!available()) return { ok: false, offline: true, error: '当前浏览器不支持网络请求' };
    const profile = window.AppProfile ? window.AppProfile.get() : null;
    if (!profile) return { ok: false, error: '玩家身份未初始化' };

    const payload = {
      id: profile.id,
      name: profile.name || '匿名玩家',
      avatar: profile.avatar || '🙂',
      score: run.score,
      maxTile: run.maxTile,
      moves: run.moves,
      merges: run.merges
    };

    try {
      const res = await withTimeout(fetch(ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      }), TIMEOUT);
      const data = await res.json();
      if (!res.ok || !data || !data.ok) {
        return { ok: false, error: (data && data.error) || ('HTTP ' + res.status) };
      }
      if (Array.isArray(data.board)) {
        cache = { board: data.board, total: data.total || 0, online: !!data.online, at: Date.now() };
      }
      return data;
    } catch (err) {
      return { ok: false, offline: true, error: err && err.message };
    }
  }

  window.AppLeaderboard = {
    getBoard: getBoard,
    submit: submit,
    peek: function () { return cache; }
  };
})();
