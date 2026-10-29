/* =========================================================
   小游戏全服排行榜 API (Vercel Serverless Function)
   支持 29 个 game key（28 个在役 + legacy minesweeper）
   存储：Upstash Redis REST（Vercel Marketplace 安装后自动注入环境变量）
   零依赖：只用 Node 18+ 内置 fetch，不需要 npm install
   ---------------------------------------------------------
   GET    /api/leaderboard?game=2048&limit=50   读取排行榜
   POST   /api/leaderboard                      提交一局战绩
          body: { game, id, name, avatar, ...指标 }
   DELETE /api/leaderboard                      删除一条战绩（需 x-admin-token）
          body: { game, id }
   ========================================================= */

'use strict';

/* 每个游戏的存储键与排序方向。
   higher=true：数值越大越好（分数、通关数），用 ZREVRANGE / ZREVRANK；
   higher=false：数值越小越好（反应毫秒 / 扫雷与舒尔特用时），用 ZRANGE / ZRANK。 */
const GAMES = {
  '2048': { z: 'j2048:z', p: 'j2048:p', higher: true },
  // 背单词三榜：按「背完的单词数」排名，detail 里带学习时长 ms。
  // 日/周榜的 zset 键带客户端本地的周期号（见 vocabCfg），过期自动清理。
  'vocab_day': { vocab: 'day', higher: true },
  'vocab_week': { vocab: 'week', higher: true },
  'vocab_all': { vocab: 'all', z: 'jvocab:a:z', p: 'jvocab:a:p', higher: true },
  reaction: { z: 'jreaction:z', p: 'jreaction:p', higher: false },
  // 反应速度擂台拆成三关各排各的：
  // 第二关 = 选择反应平均时，第三关 = Go 反应中位数（都是毫秒，越低越好）
  reaction2: { z: 'jreaction2:z', p: 'jreaction2:p', higher: false },
  reaction3: { z: 'jreaction3:z', p: 'jreaction3:p', higher: false },
  color: { z: 'jcolor:z', p: 'jcolor:p', higher: true },
  // 扫雷三档难度各排各的：跨难度比时间没有意义，
  // 初级 30 秒和高级 300 秒不是同一种成绩。
  mine_easy: { z: 'jmine_e:z', p: 'jmine_e:p', higher: false },
  mine_medium: { z: 'jmine_m:z', p: 'jmine_m:p', higher: false },
  mine_hard: { z: 'jmine_h:z', p: 'jmine_h:p', higher: false },
  // 舒尔特方格同样按难度分榜：5×5 / 6×6 / 7×7 的用时不可比
  schulte_easy: { z: 'jsch_e:z', p: 'jsch_e:p', higher: false },
  schulte_medium: { z: 'jsch_m:z', p: 'jsch_m:p', higher: false },
  schulte_hard: { z: 'jsch_h:z', p: 'jsch_h:p', higher: false },
  // 定位射击靶场：30 秒总分，越高越好
  // （v125 换键名：旧 jaim:* 里有调试期写入的探测数据，弃用）
  aim: { z: 'jaim_v2:z', p: 'jaim_v2:p', higher: true },
  // 数独按难度分榜：排名值是错误数（越少越好）
  sudoku_easy: { z: 'jsudo_e:z', p: 'jsudo_e:p', higher: false },
  sudoku_medium: { z: 'jsudo_m:z', p: 'jsudo_m:p', higher: false },
  sudoku_hard: { z: 'jsudo_h:z', p: 'jsudo_h:p', higher: false },
  // 数字华容道按难度分榜：排名值是步数（越少越好）
  slide_easy: { z: 'jslide_e:z', p: 'jslide_e:p', higher: false },
  slide_medium: { z: 'jslide_m:z', p: 'jslide_m:p', higher: false },
  slide_hard: { z: 'jslide_h:z', p: 'jslide_h:p', higher: false },
  // 俄罗斯方块：单局总分，越高越好
  tetris: { z: 'jtetris:z', p: 'jtetris:p', higher: true },
  // 贪吃蛇按速度分榜：慢速/标准/快速的分数不可比
  snake_slow: { z: 'jsnake_s:z', p: 'jsnake_s:p', higher: true },
  snake_normal: { z: 'jsnake_n:z', p: 'jsnake_n:p', higher: true },
  snake_fast: { z: 'jsnake_f:z', p: 'jsnake_f:p', higher: true },
  // 泡泡猫泡泡龙按难度分榜：简单（警戒线固定）与挑战（线上移）分数不可比
  bubble_easy: { z: 'jbubble_e:z', p: 'jbubble_e:p', higher: true },
  bubble_hard: { z: 'jbubble_h:z', p: 'jbubble_h:p', higher: true },
  // 坦克防线：单局总分（击毁敌军 + 道具分），越高越好
  tank: { z: 'jtank:z', p: 'jtank:p', higher: true },
  // 旧版三档共用一个榜。保留只为兼容尚未刷新的客户端和后台删除接口，
  // 前端已经不再写这里。
  minesweeper: { z: 'jmine:z', p: 'jmine:p', higher: false, legacy: true }
};

/* 三个扫雷榜与难度的对应关系，服务端据此校验客户端没有串榜 */
const MINE_LEVELS = {
  mine_easy: 'easy',
  mine_medium: 'medium',
  mine_hard: 'hard'
};

const SCHULTE_LEVELS = {
  schulte_easy: 'easy',
  schulte_medium: 'medium',
  schulte_hard: 'hard'
};

const SUDOKU_LEVELS = {
  sudoku_easy: 'easy',
  sudoku_medium: 'medium',
  sudoku_hard: 'hard'
};

const SLIDE_LEVELS = {
  slide_easy: 'easy',
  slide_medium: 'medium',
  slide_hard: 'hard'
};

const BUBBLE_LEVELS = {
  bubble_easy: 'easy',
  bubble_hard: 'hard'
};

const SNAKE_LEVELS = {
  snake_slow: 'slow',
  snake_normal: 'normal',
  snake_fast: 'fast'
};

const BOARD_CAP = 1000;          // 每个榜单只保留前 1000 名
const RL_WINDOW = 60;            // 限流窗口（秒）
const RL_MAX = 20;               // 窗口内最多提交次数（按 id）
const RL_IP_MAX = 90;            // 窗口内最多提交次数（按 IP——id 可被脚本轮换，IP 维度兜底；放宽以照顾公司/校园 NAT）

/* Vercel 函数拿客户端 IP 只能靠 x-forwarded-for（取第一跳） */
function clientIp(req) {
  const xff = (req.headers && req.headers['x-forwarded-for']) || '';
  const first = String(xff).split(',')[0].trim();
  return first || 'unknown';
}

/* ---------------- 存储适配层 ---------------- */

function restConfig() {
  let url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL || '';
  let token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN || '';

  // Vercel 集成里的 Custom Prefix 会把变量改名成 <PREFIX>_REST_API_URL，
  // 例如 STORAGE_KV_REST_API_URL。这里按后缀反查，避免因为一个前缀就整站 503。
  if (!url || !token) {
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

function memZ(game) {
  if (!mem.z.has(game)) mem.z.set(game, new Map());
  return mem.z.get(game);
}
function memP(game) {
  if (!mem.p.has(game)) mem.p.set(game, new Map());
  return mem.p.get(game);
}
function sortedEntries(game, higher) {
  const arr = [...memZ(game).entries()];
  arr.sort((a, b) => (higher ? b[1] - a[1] : a[1] - b[1]));
  return arr;
}

const memStore = {
  zscore: (game, id) => {
    const m = memZ(game);
    return m.has(id) ? m.get(id) : null;
  },
  zadd: (game, id, score) => { memZ(game).set(id, score); return 1; },
  zcard: (game) => memZ(game).size,
  zrank: (game, id, higher) => {
    const i = sortedEntries(game, higher).findIndex((e) => e[0] === id);
    return i < 0 ? null : i;
  },
  zrange: (game, higher, start, stop) => {
    const sorted = sortedEntries(game, higher);
    const out = [];
    for (let i = start; i <= stop && i < sorted.length; i++) {
      out.push(sorted[i][0], String(sorted[i][1]));
    }
    return out;
  },
  hget: (game, id) => {
    const m = memP(game);
    return m.has(id) ? m.get(id) : null;
  },
  hset: (game, id, val) => { memP(game).set(id, val); return 1; },
  hmget: (game, ids) => {
    const m = memP(game);
    return ids.map((id) => (m.has(id) ? m.get(id) : null));
  },
  hdel: (game, id) => { memP(game).delete(id); return 1; },
  zrem: (game, id) => { memZ(game).delete(id); return 1; },
  incr: (key) => {
    const n = (mem.rl.get(key) || 0) + 1;
    mem.rl.set(key, n);
    return n;
  }
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

function intIn(value, min, max) {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function resolveGame(raw) {
  const key = String(raw || '2048').toLowerCase();
  return GAMES[key] ? key : null;
}

/* 背单词榜的周期键。period 由客户端按本地时间生成（避免服务器时区错位）：
   日榜 YYYYMMDD（8 位）、周榜 YYYYWW（6 位，ISO 周一到周日）。
   日/周键带 TTL，过期周期自动清理，防止键无限累积。 */
function vocabCfg(game, period) {
  if (game === 'vocab_all') return { z: 'jvocab:a:z', p: 'jvocab:a:p', higher: true, ttl: 0 };
  const raw = String(period || '');
  if (game === 'vocab_day') {
    if (!/^\d{8}$/.test(raw)) return null;
    return { z: 'jvocab:d:' + raw + ':z', p: 'jvocab:d:' + raw + ':p', higher: true, ttl: 9 * 86400 };
  }
  if (game === 'vocab_week') {
    if (!/^\d{6}$/.test(raw)) return null;
    return { z: 'jvocab:w:' + raw + ':z', p: 'jvocab:w:' + raw + ':p', higher: true, ttl: 74 * 86400 };
  }
  return null;
}

/* 每个榜的单词数上限（防刷：一天不可能背超 2000 词） */
function vocabCountCap(game) {
  if (game === 'vocab_day') return 2000;
  if (game === 'vocab_week') return 14000;
  return 500000;
}

/* 每个游戏返回 { score, extra }，score 是参与排名的指标。
   三个游戏统一用 body.score 传排名值，差异只在合法区间与附加字段。 */
function parseRun(game, body) {
  if (game === '2048') {
    const score = intIn(body.score, 0, 5e7);
    const maxTile = intIn(body.maxTile, 2, 1048576);
    const moves = intIn(body.moves, 0, 1e6);
    const merges = intIn(body.merges, 0, 1e6);
    if (score == null) return { error: '分数不合法' };
    if (maxTile == null || !isPowerOfTwo(maxTile)) return { error: '最大方块不合法' };
    if (moves == null) return { error: '步数不合法' };
    if (merges == null) return { error: '合并次数不合法' };
    // 2 分方块合成 4 才得 4 分，所以分数不可能低于最大方块本身
    if (score < maxTile) return { error: '分数与方块不匹配' };
    return { score, extra: { mt: maxTile } };
  }

  if (game === 'reaction2') {
    // 第二关：选择反应平均时（毫秒，越低越好）+ 正确数
    const ms = intIn(body.score, 80, 3000);
    const acc = intIn(body.acc, 0, 20);
    const traps = intIn(body.traps, 0, 20);
    if (ms == null) return { error: '反应时间不合法' };
    if (acc == null) return { error: '正确次数不合法' };
    if (traps == null) return { error: '规则反转识别数不合法' };
    return { score: ms, extra: { acc, traps } };
  }

  if (game === 'reaction3') {
    // 第三关：Go 反应中位数（毫秒，越低越好）+ 红点误按数
    const ms = intIn(body.score, 80, 3000);
    const falseHit = intIn(body.falseHit, 0, 20);
    const goCount = intIn(body.goCount, 0, 20);
    if (ms == null) return { error: '反应时间不合法' };
    if (falseHit == null) return { error: '误按次数不合法' };
    if (goCount == null) return { error: 'Go 次数不合法' };
    return { score: ms, extra: { falseHit, goCount } };
  }

  if (game === 'reaction') {
    // 人类简单反应极限约 100ms，低于 80ms 基本是脚本或误触
    const ms = intIn(body.score, 80, 3000);
    const acc = intIn(body.acc, 0, 20);
    const age = intIn(body.age, 10, 99);
    if (ms == null) return { error: '反应时间不合法' };
    if (acc == null) return { error: '正确次数不合法' };
    if (age == null) return { error: '反应年龄不合法' };
    return { score: ms, extra: { acc, age } };
  }

  if (game === 'color') {
    const level = intIn(body.score, 0, 500);
    if (level == null) return { error: '通关数不合法' };
    return { score: level, extra: {} };
  }

  if (game === 'minesweeper' || MINE_LEVELS[game]) {
    // 排名值就是用时（秒），越小越好。
    // 用时下限 1 秒：再快基本是脚本；上限 2 小时，覆盖高级慢局。
    const sec = intIn(body.score, 1, 7200);
    const lv = String(body.lv || '');
    if (sec == null) return { error: '成绩不合法' };
    if (['easy', 'medium', 'hard'].indexOf(lv) < 0) return { error: '难度不合法' };
    // 分榜后必须对上号：往初级榜塞高级成绩直接拒绝。
    // 旧版 minesweeper 榜不校验，免得老客户端提交失败。
    if (MINE_LEVELS[game] && MINE_LEVELS[game] !== lv) return { error: '成绩与难度不匹配' };
    return { score: sec, extra: { sec, lv } };
  }

  if (SCHULTE_LEVELS[game]) {
    // 排名值就是总用时（秒），越小越好。
    // 25 格最快也要几秒，下限 1 秒挡住脚本；上限 10 分钟够慢手了。
    const sec = intIn(body.score, 1, 600);
    const lv = String(body.lv || '');
    const err = intIn(body.err, 0, 999);
    if (sec == null) return { error: '成绩不合法' };
    if (['easy', 'medium', 'hard'].indexOf(lv) < 0) return { error: '难度不合法' };
    if (SCHULTE_LEVELS[game] !== lv) return { error: '成绩与难度不匹配' };
    if (err == null) return { error: '错误次数不合法' };
    return { score: sec, extra: { sec, lv, err } };
  }

  if (game === 'aim') {
    // 定位射击靶场：30 秒限时总分，每球 100–300 分，
    // 一局命中 20–30 球，正常区间几千分；0–99999 足够宽容。
    const score = intIn(body.score, 0, 99999);
    const hits = intIn(body.hits, 0, 500);
    const acc = intIn(body.acc, 0, 100);
    const streak = intIn(body.streak, 0, 500);
    if (score == null) return { error: '分数不合法' };
    if (hits == null) return { error: '命中数不合法' };
    if (acc == null) return { error: '命中率不合法' };
    if (streak == null) return { error: '连击数不合法' };
    // 分数粗校验：得分不可能超过命中数 × 单球上限(300)
    if (score > hits * 300) return { error: '分数与命中数不匹配' };
    return { score, extra: { hits, acc, streak } };
  }

  if (SUDOKU_LEVELS[game]) {
    // 排名值是错误数（越少越好）。完成一局错误数 0–81。
    const mistakes = intIn(body.score, 0, 81);
    const lv = String(body.lv || '');
    if (mistakes == null) return { error: '错误数不合法' };
    if (SUDOKU_LEVELS[game] !== lv) return { error: '成绩与难度不匹配' };
    return { score: mistakes, extra: { mistakes, lv } };
  }

  if (SLIDE_LEVELS[game]) {
    // 排名值是步数（越少越好）。洗牌后的最优解远小于 10 万步，上限防溢出。
    const moves = intIn(body.score, 1, 99999);
    const lv = String(body.lv || '');
    if (moves == null) return { error: '步数不合法' };
    if (SLIDE_LEVELS[game] !== lv) return { error: '成绩与难度不匹配' };
    return { score: moves, extra: { moves, lv } };
  }

  if (game === 'tetris') {
    // 单局总分：经典计分 100/300/500/800 × 等级，
    // 0–500 万覆盖休闲到硬核长局；行数 0–10000。
    const score = intIn(body.score, 0, 5000000);
    const lines = intIn(body.lines, 0, 10000);
    const level = intIn(body.level, 1, 100);
    if (score == null) return { error: '分数不合法' };
    if (lines == null) return { error: '行数不合法' };
    if (level == null) return { error: '等级不合法' };
    return { score, extra: { lines, level } };
  }

  if (SNAKE_LEVELS[game]) {
    // 分数 = 吃到食物数 × 10；长度 = 蛇身节数（初始 3）。
    const score = intIn(body.score, 0, 99999);
    const length = intIn(body.length, 3, 400);
    const lv = String(body.lv || '');
    if (score == null) return { error: '分数不合法' };
    if (length == null) return { error: '蛇身长度不合法' };
    if (SNAKE_LEVELS[game] !== lv) return { error: '成绩与难度不匹配' };
    // 分数必须是 10 的倍数（每个食物 +10），且与长度自洽
    if (score % 10 !== 0) return { error: '分数与食物数不匹配' };
    if (score / 10 !== length - 3) return { error: '分数与蛇身长度不匹配' };
    return { score, extra: { length, lv } };
  }

  if (BUBBLE_LEVELS[game]) {
    // 泡泡猫泡泡龙：无尽模式总分 = 消除×10 + 坠落×20，再乘连消倍率（最高 ×3）。
    // 0–50 万覆盖休闲到长局；消除数 0–9999，波数 1–999。
    const score = intIn(body.score, 0, 500000);
    const popped = intIn(body.popped, 0, 9999);
    const wave = intIn(body.wave, 1, 999);
    const lv = String(body.lv || '');
    if (score == null) return { error: '分数不合法' };
    if (popped == null) return { error: '消除数不合法' };
    if (wave == null) return { error: '波数不合法' };
    if (BUBBLE_LEVELS[game] !== lv) return { error: '成绩与难度不匹配' };
    // 粗校验：单颗泡泡（含坠落与倍率）最多 60 分，另留清屏奖励余量
    if (score > popped * 60 + 300) return { error: '分数与消除数不匹配' };
    return { score, extra: { lv: BUBBLE_LEVELS[game] } };
  }

  if (game === 'tank') {
    // 坦克防线（NES 原版规则）：击毁敌军 100/200/300/400 分，道具 500 分/个。
    // 每关最多 3 个道具，按「每辆都当装甲车 + 每关 4 个道具」粗校验。
    const score = intIn(body.score, 0, 2000000);
    const kills = intIn(body.kills, 0, 9999);
    const waves = intIn(body.waves, 1, 9999);
    if (score == null) return { error: '分数不合法' };
    if (kills == null) return { error: '击毁数不合法' };
    if (waves == null) return { error: '关卡数不合法' };
    if (score > kills * 400 + waves * 2000) return { error: '分数与战绩不匹配' };
    return { score, extra: { kills, waves } };
  }

  return { error: '未知游戏' };
}

/* ---------------- 读榜 ---------------- */

async function readBoard(game, limit, cfgOverride) {
  const cfgGame = cfgOverride || GAMES[game];
  let flat;
  let total;

  if (useMemory) {
    flat = memStore.zrange(game, cfgGame.higher, 0, limit - 1);
    total = memStore.zcard(game);
  } else {
    const rangeCmd = cfgGame.higher
      ? ['ZREVRANGE', cfgGame.z, '0', String(limit - 1), 'WITHSCORES']
      : ['ZRANGE', cfgGame.z, '0', String(limit - 1), 'WITHSCORES'];
    const out = await pipeline([rangeCmd, ['ZCARD', cfgGame.z]]);
    flat = out[0] || [];
    total = out[1] || 0;
  }

  const ids = [];
  for (let i = 0; i < flat.length; i += 2) ids.push(flat[i]);
  if (!ids.length) return { board: [], total };

  let details;
  if (useMemory) {
    details = memStore.hmget(game, ids);
  } else {
    details = await call(['HMGET', cfgGame.p].concat(ids));
  }

  const board = ids.map((id, i) => {
    let d = null;
    try { d = JSON.parse(details[i] || 'null'); } catch (e) { d = null; }
    const extra = {};
    if (d && d.mt != null) extra.maxTile = d.mt;
    if (d && d.acc != null) extra.acc = d.acc;
    if (d && d.age != null) extra.age = d.age;
    if (d && d.sec != null) extra.sec = d.sec;
    if (d && d.lv != null) extra.lv = d.lv;
    if (d && d.err != null) extra.err = d.err;
    if (d && d.kills != null) extra.kills = d.kills;
    if (d && d.waves != null) extra.waves = d.waves;
    if (d && d.ms != null) extra.ms = d.ms;   // 背单词榜：学习时长
    return {
      id,
      name: (d && d.n) || '匿名玩家',
      avatar: (d && d.a) || '🙂',
      at: (d && d.at) || 0,
      score: Number(flat[i * 2 + 1]) || 0,
      extra
    };
  });

  /* 同分排序：主指标相同时，先达到的排前面。
     ZSET 的 score 只有一个数值，同分时 Redis 按 member（随机 ID）的
     字典序排——对玩家没有意义，所以这里统一用 at 时间戳做二级排序。
     舒尔特额外要求「同秒数时错得少的在前」，单独加一层。 */
  board.sort((a, b) => {
    if (a.score !== b.score) {
      return cfgGame.higher ? b.score - a.score : a.score - b.score;
    }
    if (SCHULTE_LEVELS[game]) {
      const ae = (a.extra && a.extra.err) || 0;
      const be = (b.extra && b.extra.err) || 0;
      if (ae !== be) return ae - be;
    }
    return (a.at || 0) - (b.at || 0);
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
      const game = resolveGame(q.game);
      if (!game) {
        res.status(400).json({ ok: false, error: '未知游戏' });
        return;
      }
      const limit = Math.min(100, Math.max(1, parseInt(q.limit, 10) || 50));
      if (GAMES[game].vocab) {
        const cfg = vocabCfg(game, q.period);
        if (!cfg) { res.status(400).json({ ok: false, error: '周期参数不合法' }); return; }
        const dynKey = game + ':' + (q.period || 'all');
        const { board, total } = await readBoard(dynKey, limit, cfg);
        res.status(200).json({ ok: true, game, board, total, online: !useMemory });
        return;
      }
      const { board, total } = await readBoard(game, limit);
      res.status(200).json({ ok: true, game, board, total, online: !useMemory });
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

      const game = resolveGame(body.game);
      if (!game) {
        res.status(400).json({ ok: false, error: '未知游戏' });
        return;
      }
      const cfgGame = GAMES[game];

      const id = clampText(body.id, 64);
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
        res.status(400).json({ ok: false, error: '玩家标识不合法' });
        return;
      }

      /* ---- 背单词榜：语义是「周期内累计背完的单词数」，取历史最大值 ----
         客户端每个周期维护单调递增的绝对计数（日/周重置），重复提交
         更大值才覆盖，天然幂等；detail 附带累计学习时长。 */
      if (GAMES[game].vocab) {
        const cfg = vocabCfg(game, body.period);
        if (!cfg) { res.status(400).json({ ok: false, error: '周期参数不合法' }); return; }
        const count = intIn(body.count, 1, vocabCountCap(game));
        if (count == null) { res.status(400).json({ ok: false, error: '单词数不合法' }); return; }
        const ms = intIn(body.ms, 0, 366 * 86400000);
        if (ms == null) { res.status(400).json({ ok: false, error: '时长不合法' }); return; }
        const acc = body.acc == null ? null : intIn(body.acc, 0, 100);
        if (acc == null && body.acc != null) { res.status(400).json({ ok: false, error: '正确率不合法' }); return; }

        // 与普通游戏同款双维度限流
        const dynKey = game + ':' + (body.period || 'all');
        let vHits, vIpHits;
        const vRlKey = 'jrl:' + game + ':' + id;
        const vRlIpKey = 'jrl:' + game + 'ip:' + clientIp(req);
        if (useMemory) {
          vHits = memStore.incr(vRlKey);
          vIpHits = memStore.incr(vRlIpKey);
        } else {
          const out = await pipeline([
            ['INCR', vRlKey], ['EXPIRE', vRlKey, String(RL_WINDOW)],
            ['INCR', vRlIpKey], ['EXPIRE', vRlIpKey, String(RL_WINDOW)]
          ]);
          vHits = out[0] || 0;
          vIpHits = out[2] || 0;
        }
        if (vHits > RL_MAX || vIpHits > RL_IP_MAX) {
          res.status(429).json({ ok: false, error: '提交太频繁，请稍后再试' });
          return;
        }

        const stamp = Date.now();
        const name = clampText(body.name, 16) || '匿名玩家';
        const avatar = clampText(body.avatar, 8) || '🙂';

        let prev = null, prevDetail = null;
        if (useMemory) {
          prev = memStore.zscore(dynKey, id);
          prevDetail = memStore.hget(dynKey, id);
        } else {
          const out = await pipeline([
            ['ZSCORE', cfg.z, id],
            ['HGET', cfg.p, id]
          ]);
          prev = out[0] == null ? null : Number(out[0]);
          prevDetail = out[1];
        }
        try { prevDetail = prevDetail ? JSON.parse(prevDetail) : null; } catch (e) { prevDetail = null; }

        const isBest = prev == null || count > prev;
        const detail = { n: name, a: avatar };
        if (isBest) {
          detail.at = stamp;
          detail.ms = ms;
        } else if (prevDetail) {
          if (prevDetail.at != null) detail.at = prevDetail.at;
          if (prevDetail.ms != null) detail.ms = prevDetail.ms;
        }
        if (detail.at == null) detail.at = stamp;
        /* 正确率不参与排名，始终存最新一份（词数没破纪录时正确率也在变） */
        if (acc != null) detail.acc = acc;
        else if (prevDetail && prevDetail.acc != null) detail.acc = prevDetail.acc;
        const payload = JSON.stringify(detail);

        if (useMemory) {
          if (isBest) memStore.zadd(dynKey, id, count);
          memStore.hset(dynKey, id, payload);
        } else {
          const cmds = [];
          if (isBest) {
            cmds.push(['ZADD', cfg.z, String(count), id]);
            cmds.push(['ZREMRANGEBYRANK', cfg.z, '0', String(-(BOARD_CAP + 1))]);
          }
          cmds.push(['HSET', cfg.p, id, payload]);
          if (cfg.ttl) {
            cmds.push(['EXPIRE', cfg.z, String(cfg.ttl)]);
            cmds.push(['EXPIRE', cfg.p, String(cfg.ttl)]);
          }
          await pipeline(cmds);
        }
        res.status(200).json({ ok: true, game, online: !useMemory, isBest });
        return;
      }

      const run = parseRun(game, body);
      if (run.error) {
        res.status(400).json({ ok: false, error: run.error });
        return;
      }

      // 限流：双维度。同一玩家同一游戏 60 秒 RL_MAX 次；
      // 同一 IP 60 秒 RL_IP_MAX 次（脚本每次随机换 id 也绕不过 IP 维度）。
      let hits, ipHits;
      const rlKey = 'jrl:' + game + ':' + id;
      const rlIpKey = 'jrl:lbip:' + clientIp(req);
      if (useMemory) {
        hits = memStore.incr(rlKey);
        ipHits = memStore.incr(rlIpKey);
      } else {
        const out = await pipeline([
          ['INCR', rlKey],
          ['EXPIRE', rlKey, String(RL_WINDOW)],
          ['INCR', rlIpKey],
          ['EXPIRE', rlIpKey, String(RL_WINDOW)]
        ]);
        hits = out[0] || 0;
        ipHits = out[2] || 0;
      }
      if (hits > RL_MAX || ipHits > RL_IP_MAX) {
        res.status(429).json({ ok: false, error: '提交太频繁，请稍后再试' });
        return;
      }

      const stamp = Date.now();
      let prevScore;
      let prevDetail = null;
      if (useMemory) {
        prevScore = memStore.zscore(game, id);
        prevDetail = memStore.hget(game, id);
      } else {
        const out = await pipeline([
          ['ZSCORE', cfgGame.z, id],
          ['HGET', cfgGame.p, id]
        ]);
        prevScore = out[0] == null ? null : Number(out[0]);
        prevDetail = out[1];
      }
      try { prevDetail = prevDetail ? JSON.parse(prevDetail) : null; } catch (e) { prevDetail = null; }

      // 反应时间是越低越好，其余是越高越好
      const isBest = prevScore == null || (cfgGame.higher ? run.score > prevScore : run.score < prevScore);

      // 昵称/头像每次提交都同步；成绩与日期只在刷新纪录时更新。
      // 未破纪录时必须沿用旧值——JSON.stringify 会丢掉值为 undefined 的字段，
      // 读回来就成了 0，榜单上会显示「最高方块 0」。
      const detail = {
        n: clampText(body.name, 16) || '匿名玩家',
        a: clampText(body.avatar, 8) || '🙂'
      };
      if (isBest) {
        detail.at = stamp;
        if (run.extra.mt != null) detail.mt = run.extra.mt;
        if (run.extra.acc != null) detail.acc = run.extra.acc;
        if (run.extra.age != null) detail.age = run.extra.age;
        if (run.extra.sec != null) detail.sec = run.extra.sec;
        if (run.extra.lv != null) detail.lv = run.extra.lv;
        if (run.extra.err != null) detail.err = run.extra.err;
        if (run.extra.kills != null) detail.kills = run.extra.kills;
        if (run.extra.waves != null) detail.waves = run.extra.waves;
      } else if (prevDetail) {
        if (prevDetail.at != null) detail.at = prevDetail.at;
        if (prevDetail.mt != null) detail.mt = prevDetail.mt;
        if (prevDetail.acc != null) detail.acc = prevDetail.acc;
        if (prevDetail.age != null) detail.age = prevDetail.age;
        if (prevDetail.sec != null) detail.sec = prevDetail.sec;
        if (prevDetail.lv != null) detail.lv = prevDetail.lv;
        if (prevDetail.err != null) detail.err = prevDetail.err;
        if (prevDetail.kills != null) detail.kills = prevDetail.kills;
        if (prevDetail.waves != null) detail.waves = prevDetail.waves;
      }
      if (detail.at == null) detail.at = stamp;

      const payload = JSON.stringify(detail);

      if (useMemory) {
        if (isBest) memStore.zadd(game, id, run.score);
        memStore.hset(game, id, payload);
      } else {
        const cmds = [];
        if (isBest) {
          cmds.push(['ZADD', cfgGame.z, String(run.score), id]);
          // 超出上限的低分记录直接裁掉，防止 zset 无限增长
          cmds.push(cfgGame.higher
            ? ['ZREMRANGEBYRANK', cfgGame.z, '0', String(-(BOARD_CAP + 1))]
            : ['ZREMRANGEBYRANK', cfgGame.z, String(BOARD_CAP), '-1']);
        }
        cmds.push(['HSET', cfgGame.p, id, payload]);
        await pipeline(cmds);
      }

      let rank;
      if (useMemory) {
        rank = memStore.zrank(game, id, cfgGame.higher);
      } else {
        rank = await call([cfgGame.higher ? 'ZREVRANK' : 'ZRANK', cfgGame.z, id]);
      }
      const { board, total } = await readBoard(game, 50);
      // readBoard 里做过同分重排，rank 要按重排后的位置算，
      // 否则名次会和榜单显示对不上
      {
        const i = board.findIndex((r) => r.id === id);
        if (i >= 0) rank = i;
      }

      res.status(200).json({
        ok: true,
        game,
        online: !useMemory,
        isBest,
        rank: rank == null ? null : rank + 1,
        best: isBest ? run.score : prevScore,
        total,
        board
      });
      return;
    }

    /* 只改昵称/头像，不动成绩。
       玩家在右上角改完资料后，三个榜都要立刻换名字——以前只有下次
       提交战绩才会同步，于是改完看榜还是旧名字。 */
    if (req.method === 'PATCH') {
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

      const name = clampText(body.name, 16) || '匿名玩家';
      const avatar = clampText(body.avatar, 8) || '🙂';

      // PATCH 也要限流：此前只有 POST 有限流，PATCH 不传 game 会遍历
      // 22 个榜单 × HGET/HSET（最多 44 条 Redis 命令），极易被刷爆命令配额。
      let pHits, pIpHits;
      const pRlKey = 'jrl:patch:' + id;
      const pRlIpKey = 'jrl:patchip:' + clientIp(req);
      if (useMemory) {
        pHits = memStore.incr(pRlKey);
        pIpHits = memStore.incr(pRlIpKey);
      } else {
        const out = await pipeline([
          ['INCR', pRlKey],
          ['EXPIRE', pRlKey, String(RL_WINDOW)],
          ['INCR', pRlIpKey],
          ['EXPIRE', pRlIpKey, String(RL_WINDOW)]
        ]);
        pHits = out[0] || 0;
        pIpHits = out[2] || 0;
      }
      if (pHits > 10 || pIpHits > 30) {
        res.status(429).json({ ok: false, error: '改名太频繁，请稍后再试' });
        return;
      }

      // 不传 game 就更新全部榜单：玩家只有一份身份，三个榜理应一致
      const games = body.game ? [resolveGame(body.game)] : Object.keys(GAMES);
      if (games.some((g) => !g)) {
        res.status(400).json({ ok: false, error: '未知游戏' });
        return;
      }

      const updated = [];
      for (const g of games) {
        const cfgGame = GAMES[g];
        /* 背单词日/周榜的存储键带客户端周期号（jvocab:d:YYYYMMDD:p），
           GAMES 表里没有 z/p——直接取值会变成 HGET "null" <id>，
           Upstash 把 null 当字符串执行，返回空后静默 continue，
           昵称在这两个榜上永远同步不了。这类榜无法枚举全部周期键，
           只能跳过（昵称由下一次 POST 上报时同步）。 */
        if (cfgGame.vocab && g !== 'vocab_all') continue;
        /* memory 模式下 vocab 榜读写走 game:period 动态键（POST/GET 一致）；
           走到这里只剩 vocab_all（day/week 已 continue），period 为空 → 'all' */
        const storeKey = (useMemory && cfgGame.vocab) ? g + ':' + ((body && body.period) || 'all') : g;
        let raw;
        if (useMemory) {
          raw = memStore.hget(storeKey, id);
        } else {
          raw = await call(['HGET', cfgGame.p, id]);
        }
        if (!raw) continue;   // 该榜还没有这个人的记录，跳过

        let d = null;
        try { d = JSON.parse(raw); } catch (e) { d = null; }
        if (!d || typeof d !== 'object') d = {};
        d.n = name;
        d.a = avatar;

        if (useMemory) {
          memStore.hset(storeKey, id, JSON.stringify(d));
        } else {
          await call(['HSET', cfgGame.p, id, JSON.stringify(d)]);
        }
        updated.push(g);
      }

      res.status(200).json({ ok: true, updated });
      return;
    }

    if (req.method === 'DELETE') {
      const expected = process.env.ADMIN_TOKEN || '';
      // 未配置密钥时一律拒绝：宁可删不掉，也不能留一个谁都能调用的删除接口
      if (!expected) {
        res.status(403).json({ ok: false, error: '未配置 ADMIN_TOKEN，删除接口已禁用' });
        return;
      }
      // Node 把请求头名统一小写，X-Admin-Token 形式的读取是死代码
      const given = String((req.headers && req.headers['x-admin-token']) || '');
      // 常数时间比较，防计时侧信道逐字节猜 token（与 api/wall.js 同款）
      const eq = (() => {
        const a = Buffer.from(given);
        const b = Buffer.from(expected);
        if (a.length !== b.length) {
          require('crypto').timingSafeEqual(a, a);
          return false;
        }
        return require('crypto').timingSafeEqual(a, b);
      })();
      if (!eq) {
        res.status(403).json({ ok: false, error: '无权限' });
        return;
      }

      let body = req.body;
      if (typeof body === 'string') {
        try { body = JSON.parse(body); } catch (e) { body = null; }
      }
      const game = resolveGame(body && body.game);
      if (!game) {
        res.status(400).json({ ok: false, error: '未知游戏' });
        return;
      }
      const id = clampText(body && body.id, 64);
      if (!/^[A-Za-z0-9_-]{8,64}$/.test(id)) {
        res.status(400).json({ ok: false, error: '玩家标识不合法' });
        return;
      }

      const cfgGame = GAMES[game];
      /* 背单词日/周榜没有固定 z/p 键（键带客户端周期号），
         需要调用方带上 period 才能定位到真实键——否则会 ZREM "null" <id>
         删 0 条却返回成功，管理员以为删掉了其实没有。 */
      const delCfg = cfgGame.vocab && game !== 'vocab_all'
        ? vocabCfg(game, body && body.period)
        : cfgGame;
      if (!delCfg) {
        res.status(400).json({ ok: false, error: '背单词日/周榜需要 period 参数（日榜 YYYYMMDD / 周榜 YYYYWW）' });
        return;
      }
      /* memory 模式下 vocab 榜的读写走 game:period 动态键（POST/GET 一致），
         DELETE 必须用同一个键，否则删的是从未写入的键——0 条却报成功 */
      const memDelKey = (useMemory && cfgGame.vocab)
        ? game + ':' + ((body && body.period) || 'all')
        : game;
      if (useMemory) {
        memStore.zrem(memDelKey, id);
        memStore.hdel(memDelKey, id);
      } else {
        await pipeline([
          ['ZREM', delCfg.z, id],
          ['HDEL', delCfg.p, id]
        ]);
      }
      res.status(200).json({ ok: true, game, removed: id });
      return;
    }

    res.status(405).json({ ok: false, error: 'Method Not Allowed' });
  } catch (err) {
    // 固定文案：err.message 可能带 Upstash 配额/网络细节，不回显给客户端
    console.error('[leaderboard] error:', err && err.message);
    res.status(500).json({ ok: false, error: '排行榜服务暂时不可用，请稍后再试' });
  }
};
