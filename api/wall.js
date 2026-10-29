/* =========================================================
   弹幕墙 · 留言墙 Serverless (Wall API)
   GET    /api/wall?limit=50  → 最新留言（最新在前）+ 总数
   POST   /api/wall            → 发留言（限频 + 内容校验 + 拒链接）
   DELETE /api/wall            → 删留言：
          { at, id }            本人删除（id 必须与留言作者一致）
          { at } + x-admin-token 管理员删除
   存储：Upstash Redis ZSET jwall（score=时间戳，member=JSON）
   只保留最新 300 条。零依赖，与 api/leaderboard.js 同一套基础设施。
   ========================================================= */

const BOARD_CAP = 300;
const RL_WINDOW = 60;   // 限频窗口（秒）
const RL_MAX = 10;      // 窗口内最多留言条数（按人）
const RL_IP_MAX = 30;   // 窗口内最多留言条数（按 IP——id 可被脚本轮换，IP 维度兜底 NAT 场景放稍宽）

/* Vercel 函数拿客户端 IP 只能靠 x-forwarded-for（取第一跳）。
   本地 server.js 转发时也带上，内存模式可测。 */
function clientIp(req) {
  const xff = (req.headers && req.headers['x-forwarded-for']) || '';
  const first = String(xff).split(',')[0].trim();
  return first || 'unknown';
}

/* 常数时间比较，防理论上的计时侧信道逐字节猜 ADMIN_TOKEN */
function safeEqual(given, expected) {
  if (typeof given !== 'string' || typeof expected !== 'string') return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  if (a.length !== b.length) {
    // 长度不同也要做一次比较，避免长度本身成为信号
    require('crypto').timingSafeEqual(a, a);
    return false;
  }
  return require('crypto').timingSafeEqual(a, b);
}

function restConfig() {
  let url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  let token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';
  if (!url || !token) {
    // Vercel 集成 Custom Prefix 会把变量改名成 <PREFIX>_REST_API_URL，按后缀反查
    for (const key of Object.keys(process.env)) {
      if (!/_REST_API_URL$/.test(key)) continue;
      const base = key.slice(0, -'_REST_API_URL'.length);
      const paired = process.env[base + '_REST_API_TOKEN'];
      if (process.env[key] && paired) {
        url = process.env[key];
        token = paired;
        break;
      }
    }
  }
  if (!url || !token) return null;
  return { url: url.replace(/\/+$/, ''), token };
}

const useMemory = !restConfig() && process.env.NODE_ENV !== 'production';
const mem = []; // [{ score, member }]
const memRl = {}; // 限频计数（内存模式）

function clampText(v, max) {
  if (typeof v !== 'string') return '';
  return Array.from(String(v).replace(/[\u0000-\u001F\u007F]/g, '').trim()).slice(0, max).join('');
}

function intIn(v, lo, hi) {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n >= lo && n <= hi ? n : null;
}

async function pipeline(cmds) {
  const cfg = restConfig();
  const out = [];
  for (const cmd of cmds) {
    const resp = await fetch(cfg.url + '/' + cmd.map(encodeURIComponent).join('/'), {
      headers: { Authorization: 'Bearer ' + cfg.token }
    });
    const data = await resp.json();
    out.push(data.result !== undefined ? data.result : data);
  }
  return out;
}

/* ---------------- 内存模式（本地无 Redis 时） ---------------- */
function memAdd(score, member) {
  memDel(member);
  mem.push({ score, member });
  mem.sort((a, b) => a.score - b.score);
  if (mem.length > BOARD_CAP) mem.splice(0, mem.length - BOARD_CAP);
}
function memRevMembers(a, b) {
  const slice = mem.slice(Math.max(0, mem.length - (b + 1)), mem.length - a);
  return slice.reverse().map(i => i.member);
}
function memDel(member) {
  const i = mem.findIndex(x => x.member === member);
  if (i >= 0) mem.splice(i, 1);
}

/* ---------------- 读取 ---------------- */
async function readWall(limit) {
  /* ZREVRANGE 不带 WITHSCORES 时返回纯成员数组（一条一个元素）。
     之前这里按 i += 2 步进（那是 WITHSCORES 的成对格式），
     导致每隔一条就被跳过——线上 total 与返回条数对不上、看起来像留言被挤掉。 */
  let members, total;
  if (useMemory) {
    members = memRevMembers(0, limit - 1);
    total = mem.length;
  } else {
    const out = await pipeline([
      ['ZREVRANGE', 'jwall', '0', String(limit - 1)],
      ['ZCARD', 'jwall']
    ]);
    members = out[0] || [];
    total = out[1] || 0;
  }
  const wall = [];
  members.forEach(function (m) {
    try {
      const d = JSON.parse(m);
      wall.push({
        name: d.n || '匿名玩家', avatar: d.a || '🙂', text: d.t || '',
        at: d.at || 0, owner: d.i || ''   // owner 仅用于前端判断「是不是我的」，不回显完整 ID
      });
    } catch (e) { /* 跳过坏数据 */ }
  });
  return { wall, total };
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
    res.status(503).json({ ok: false, error: '弹幕墙后端尚未配置：请在 Vercel 项目里安装 Upstash Redis 集成' });
    return;
  }

  try {
    const q = req.query || {};

    if (req.method === 'GET') {
      const limit = Math.min(50, Math.max(1, parseInt(q.limit, 10) || 50));
      const me = clampText(q.id, 64);
      const { wall, total } = await readWall(limit);
      // 只回传「这条是不是你的」，不暴露他人 ID
      const out = wall.map(w => ({
        name: w.name, avatar: w.avatar, text: w.text, at: w.at,
        mine: !!(me && w.owner === me)
      }));
      res.status(200).json({ ok: true, wall: out, total, online: !useMemory });
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

      const id = clampText(body.id, 64);
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
        res.status(400).json({ ok: false, error: '玩家标识不合法' });
        return;
      }

      const text = clampText(body.text, 60);
      const name = clampText(body.name, 16) || '匿名玩家';
      const avatar = clampText(body.avatar, 8) || '🙂';
      if (!text) { res.status(400).json({ ok: false, error: '写点内容再发吧' }); return; }
      if (/https?:\/\/|www\./i.test(text)) {
        res.status(400).json({ ok: false, error: '留言里别带链接哦' });
        return;
      }

      // 限频：双维度。同一人每分钟 RL_MAX 条；同一 IP 每分钟 RL_IP_MAX 条。
      // 只按 id 限频会被「每次随机换 id」的脚本绕过，IP 维度是兜底。
      const ip = clientIp(req);
      let hits, ipHits;
      if (useMemory) {
        const now = Date.now();
        const bump = (k) => {
          memRl[k] = (memRl[k] || []).filter(t => now - t < RL_WINDOW * 1000);
          memRl[k].push(now);
          return memRl[k].length;
        };
        hits = bump('id:' + id);
        ipHits = bump('ip:' + ip);
      } else {
        const rlKey = 'jrl:wall:' + id;
        const rlIpKey = 'jrl:wallip:' + ip;
        const out = await pipeline([
          ['INCR', rlKey], ['EXPIRE', rlKey, String(RL_WINDOW)],
          ['INCR', rlIpKey], ['EXPIRE', rlIpKey, String(RL_WINDOW)]
        ]);
        hits = out[0] || 0;
        ipHits = out[2] || 0;
      }
      if (hits > RL_MAX || ipHits > RL_IP_MAX) {
        res.status(429).json({ ok: false, error: '发送太频繁啦，休息一下再发' });
        return;
      }

      const at = Date.now();
      const member = JSON.stringify({ n: name, a: avatar, t: text, at, i: id });

      let wall, total;
      if (useMemory) {
        memAdd(at, member);
        wall = (await readWall(50)).wall;
        total = mem.length;
      } else {
        const out = await pipeline([
          ['ZADD', 'jwall', String(at), member],
          ['ZREMRANGEBYRANK', 'jwall', '0', String(-(BOARD_CAP + 1))],
          ['ZCARD', 'jwall']
        ]);
        total = out[2] || 0;
        wall = (await readWall(50)).wall;
      }

      res.status(200).json({
        ok: true,
        wall: wall.map(w => ({
          name: w.name, avatar: w.avatar, text: w.text, at: w.at, mine: w.owner === id
        })),
        total
      });
      return;
    }

    if (req.method === 'DELETE') {
      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      const at = intIn(body && body.at, 0, 8640000000000);
      if (at == null) { res.status(400).json({ ok: false, error: '缺少留言时间戳' }); return; }

      const token = req.headers['x-admin-token'];
      const isAdmin = !!(process.env.ADMIN_TOKEN && safeEqual(String(token || ''), process.env.ADMIN_TOKEN));
      const me = clampText(body && body.id, 64);
      if (!isAdmin && !me) {
        res.status(403).json({ ok: false, error: '只能删除自己的留言' });
        return;
      }

      // 删除也限频：每次 DELETE 都要 ZRANGE 全表找目标，按 IP 限住防止脚本刷命令量
      const delIp = clientIp(req);
      let delHits;
      if (useMemory) {
        const now = Date.now();
        memRl['del:' + delIp] = (memRl['del:' + delIp] || []).filter(t => now - t < RL_WINDOW * 1000);
        memRl['del:' + delIp].push(now);
        delHits = memRl['del:' + delIp].length;
      } else {
        const delKey = 'jrl:walldel:' + delIp;
        const out = await pipeline([['INCR', delKey], ['EXPIRE', delKey, String(RL_WINDOW)]]);
        delHits = out[0] || 0;
      }
      if (delHits > 20) {
        res.status(429).json({ ok: false, error: '操作太频繁，稍后再试' });
        return;
      }

      // 找到目标留言，本人删除时必须校验作者
      let target = null;
      if (useMemory) {
        target = mem.find(x => { try { return JSON.parse(x.member).at === at; } catch (e) { return false; } });
      } else {
        const members = await pipeline([['ZRANGE', 'jwall', '0', '-1']]);
        target = (members[0] || []).find(m => { try { return JSON.parse(m).at === at; } catch (e) { return false; } });
      }
      if (!target) { res.status(404).json({ ok: false, error: '留言不存在或已被删除' }); return; }

      if (!isAdmin) {
        let owner = '';
        try { owner = JSON.parse(target.member || target).i || ''; } catch (e) { owner = ''; }
        if (!owner || owner !== me) {
          res.status(403).json({ ok: false, error: '只能删除自己的留言' });
          return;
        }
      }

      if (useMemory) {
        memDel(target.member);
      } else {
        await pipeline([['ZREM', 'jwall', target]]);
      }

      const { wall } = await readWall(50);
      res.status(200).json({
        ok: true,
        wall: wall.map(w => ({
          name: w.name, avatar: w.avatar, text: w.text, at: w.at,
          mine: !!(me && w.owner === me)
        })),
        total: useMemory ? mem.length : (await readWall(1)).total
      });
      return;
    }

    res.status(405).json({ ok: false, error: '方法不支持' });
  } catch (err) {
    // 固定文案：上游错误细节（配额/网络）不回显给客户端
    console.error('[wall] error:', err && err.message);
    res.status(500).json({ ok: false, error: '弹幕墙服务暂时不可用，请稍后再试' });
  }
};
