/* =========================================================
   2048 全服排行榜 API (Vercel Serverless Function)
   存储：Upstash Redis REST（Vercel Marketplace 安装后自动注入环境变量）
   零依赖：只用 Node 18+ 内置 fetch，不需要 npm install
   ---------------------------------------------------------
   GET  /api/leaderboard?limit=50   读取排行榜
   POST /api/leaderboard            提交一局战绩
        body: { id, name, avatar, score, maxTile, moves, merges }
   ========================================================= */

'use strict';

const ZSET = 'j2048:z';          // member = playerId, score = 最高分
const HASH = 'j2048:p';          // field  = playerId, value = JSON 详情
const RL_PREFIX = 'j2048:rl:';   // 每玩家提交频率限制
const BOARD_CAP = 1000;          // 只保留前 1000 名，防止 zset 无限增长
const RL_WINDOW = 60;            // 限流窗口（秒）
const RL_MAX = 20;               // 窗口内最多提交次数

/* ---------------- 存储适配层 ---------------- */

function restConfig() {
  const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token: token };
}

// 本地开发没有 Redis 时用进程内存储，保证 `node server.js` 也能跑通全流程。
// 线上（NODE_ENV=production）缺环境变量会明确报 503，绝不静默假装成功。
const useMemory = !restConfig() && process.env.NODE_ENV !== 'production';
const mem = { z: new Map(), p: new Map(), rl: new Map() };

async function call(command) {
  const cfg = restConfig();
  const res = await fetch(cfg.url, {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + cfg.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(command)
  });
  const data = await res.json();
  if (data && data.error) throw new Error(data.error);
  return data ? data.result : null;
}

async function pipeline(commands) {
  const cfg = restConfig();
  const res = await fetch(cfg.url + '/pipeline', {
    method: 'POST',
    headers: {
      Authorization: 'Bearer ' + cfg.token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(commands)
  });
  const data = await res.json();
  if (!Array.isArray(data)) throw new Error((data && data.error) || 'pipeline failed');
  return data.map((d) => (d && d.error ? null : d.result));
}

/* ---------------- 内存实现（仅本地开发） ---------------- */

const memStore = {
  zscore: (id) => (mem.z.has(id) ? mem.z.get(id) : null),
  zadd: (id, score) => { mem.z.set(id, score); return 1; },
  zcard: () => mem.z.size,
  zrevrank: (id) => {
    const sorted = [...mem.z.entries()].sort((a, b) => b[1] - a[1]);
    const i = sorted.findIndex((e) => e[0] === id);
    return i < 0 ? null : i;
  },
  zrevrange: (start, stop) => {
    const sorted = [...mem.z.entries()].sort((a, b) => b[1] - a[1]);
    const out = [];
    for (let i = start; i <= stop && i < sorted.length; i++) {
      out.push(sorted[i][0], String(sorted[i][1]));
    }
    return out;
  },
  zremrangebyrank: () => 0,
  hget: (id) => (mem.p.has(id) ? mem.p.get(id) : null),
  hset: (id, val) => { mem.p.set(id, val); return 1; },
  hmget: (ids) => ids.map((id) => (mem.p.has(id) ? mem.p.get(id) : null)),
  incr: (key) => {
    const n = (mem.rl.get(key) || 0) + 1;
    mem.rl.set(key, n);
    return n;
  },
  expire: () => 1
};

/* ---------------- 校验与清洗 ---------------- */

// 按码点截断，避免把 emoji 的代理对切成半个字符
function clampText(value, max) {
  const s = String(value == null ? '' : value).replace(/[\u0000-\u001F\u007F]/g, '').trim();
  return Array.from(s).slice(0, max).join('');
}

function isPowerOfTwo(n) {
  return n >= 2 && n <= 1048576 && (n & (n - 1)) === 0;
}

function parseRun(body) {
  const id = clampText(body.id, 64);
  if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) return { error: '玩家标识不合法' };

  const score = Math.round(Number(body.score));
  const maxTile = Math.round(Number(body.maxTile));
  const moves = Math.round(Number(body.moves));
  const merges = Math.round(Number(body.merges));

  if (!Number.isFinite(score) || score < 0 || score > 5e7) return { error: '分数不合法' };
  if (!Number.isFinite(maxTile) || !isPowerOfTwo(maxTile)) return { error: '最大方块不合法' };
  if (!Number.isFinite(moves) || moves < 0 || moves > 1e6) return { error: '步数不合法' };
  if (!Number.isFinite(merges) || merges < 0 || merges > 1e6) return { error: '合并次数不合法' };
  // 2 分方块合成 4 才得 4 分，所以分数不可能低于最大方块本身
  if (score < maxTile) return { error: '分数与方块不匹配' };

  return {
    id,
    name: clampText(body.name, 16) || '匿名玩家',
    avatar: clampText(body.avatar, 8) || '🙂',
    score,
    maxTile,
    moves,
    merges
  };
}

function escapeJsonSafe(obj) {
  return JSON.stringify(obj);
}

/* ---------------- 读榜 ---------------- */

async function readBoard(limit) {
  let flat;
  let total;

  if (useMemory) {
    flat = memStore.zrevrange(0, limit - 1);
    total = memStore.zcard();
  } else {
    const out = await pipeline([
      ['ZREVRANGE', ZSET, '0', String(limit - 1), 'WITHSCORES'],
      ['ZCARD', ZSET]
    ]);
    flat = out[0] || [];
    total = out[1] || 0;
  }

  const ids = [];
  for (let i = 0; i < flat.length; i += 2) ids.push(flat[i]);
  if (!ids.length) return { board: [], total };

  let details;
  if (useMemory) {
    details = memStore.hmget(ids);
  } else {
    details = await call(['HMGET', HASH].concat(ids));
  }

  const board = ids.map((id, i) => {
    let d = null;
    try { d = JSON.parse(details[i] || 'null'); } catch (e) { d = null; }
    return {
      id,
      name: (d && d.n) || '匿名玩家',
      avatar: (d && d.a) || '🙂',
      maxTile: (d && d.mt) || 0,
      at: (d && d.at) || 0,
      score: Number(flat[i * 2 + 1]) || 0
    };
  });

  return { board, total };
}

/* ---------------- 处理请求 ---------------- */

module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return;
  }

  if (!restConfig() && !useMemory) {
    res.status(503).json({
      ok: false,
      error: '排行榜后端尚未配置：请在 Vercel 项目里安装 Upstash Redis 集成'
    });
    return;
  }

  try {
    if (req.method === 'GET') {
      const q = req.query || {};
      const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 50));
      const { board, total } = await readBoard(limit);
      res.status(200).json({ ok: true, board, total, online: !useMemory });
      return;
    }

    if (req.method === 'POST') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      if (!body || typeof body !== 'object') {
        res.status(400).json({ ok: false, error: '请求体不是合法 JSON' });
        return;
      }

      const run = parseRun(body);
      if (run.error) {
        res.status(400).json({ ok: false, error: run.error });
        return;
      }

      // 限流：同一玩家 60 秒内最多 20 次提交
      let hits;
      if (useMemory) {
        hits = memStore.incr(RL_PREFIX + run.id);
      } else {
        const out = await pipeline([
          ['INCR', RL_PREFIX + run.id],
          ['EXPIRE', RL_PREFIX + run.id, String(RL_WINDOW)]
        ]);
        hits = out[0] || 0;
      }
      if (hits > RL_MAX) {
        res.status(429).json({ ok: false, error: '提交太频繁，请稍后再试' });
        return;
      }

      const stamp = Date.now();
      let prevScore;
      if (useMemory) {
        prevScore = memStore.zscore(run.id);
      } else {
        const raw = await call(['ZSCORE', ZSET, run.id]);
        prevScore = raw == null ? null : Number(raw);
      }

      const isBest = prevScore == null || run.score > prevScore;
      // 昵称/头像每次提交都同步，分数只在刷新纪录时更新
      const detail = escapeJsonSafe({
        n: run.name,
        a: run.avatar,
        mt: isBest ? run.maxTile : undefined,
        at: isBest ? stamp : undefined
      });

      if (useMemory) {
        if (isBest) memStore.zadd(run.id, run.score);
        memStore.hset(run.id, detail);
      } else {
        const cmds = [];
        if (isBest) {
          cmds.push(['ZADD', ZSET, String(run.score), run.id]);
          cmds.push(['ZREMRANGEBYRANK', ZSET, '0', String(-(BOARD_CAP + 1))]);
        }
        cmds.push(['HSET', HASH, run.id, detail]);
        await pipeline(cmds);
      }

      const rank = useMemory
        ? memStore.zrevrank(run.id)
        : await call(['ZREVRANK', ZSET, run.id]);
      const { board, total } = await readBoard(50);

      res.status(200).json({
        ok: true,
        online: !useMemory,
        isBest,
        rank: rank == null ? null : rank + 1,
        best: Math.max(run.score, prevScore || 0),
        total,
        board
      });
      return;
    }

    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    res.status(500).json({ ok: false, error: '排行榜服务暂时不可用：' + (err && err.message ? err.message : 'unknown') });
  }
};
