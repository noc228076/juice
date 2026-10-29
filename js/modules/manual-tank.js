/* =========================================================
   自我说明书 · 第 16 章「坦克防线」(TANK DEFENSE)
   按 1985 年 Famicom/NES《Battle City》原版规则实现：
   13×13 战场、每关 20 辆敌军、35 关、三条命、道具与星级。

   数值与规则依据（逐条对照 ROM 反汇编）：
     https://github.com/feichao93/battle-city/tree/master/resources/nes-values
   35 关地图与每关敌军配置：
     https://github.com/feichao93/battle-city/tree/master/src/stages
     （MIT License · Copyright (c) feichao93）
   参考项目：feichao93/battle-city（MIT）
   早期 Canvas 绘制结构参考 tec-shrimp1/tank-battle（MIT）
   移植时按本站 40px/格 的尺寸等比放大 2.5 倍。

   原版关键规则：
   - 玩家移速 0.045 px/ms（本作 112.5 px/s），敌人 basic/power/armor
     0.03（75 px/s），fast 0.06（150 px/s）。
   - 玩家子弹 0 星 300 px/s、1~3 星 600；弹数 0/1 星 1 发、2/3 星 2 发；
     点按开火，按住不连发。
   - 敌人每帧 1/32 概率开火，不瞄准；同屏最多 4 辆。
   - 每关 20 辆，出生间隔 190−4×关卡号 帧（第 1 关 3.1 秒）。
   - 带道具的是每关第 4/11/18 辆，首次被击中掉落。
   - 前 1/8 出生间隔时间随机游走，之后追玩家，再之后冲基地。
   - 砖墙 4×4 子砖，普通子弹削 4×1 条；3 星子弹整块清除并可破钢。
   - 分数首次达到 20000 加一条命（整局一次）。

   MIT License · Copyright (c) feichao93
   Permission is hereby granted, free of charge, to any person obtaining a copy
   of this software and associated documentation files (the "Software"), to deal
   in the Software without restriction, including without limitation the rights
   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
   copies of the Software, and to permit persons to whom the Software is
   furnished to do so, subject to the following conditions:

   The above copyright notice and this permission notice shall be included in
   all copies or substantial portions of the Software.

   THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
   IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
   FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
   AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
   LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
   OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
   THE SOFTWARE.
   ========================================================= */

(function () {
  'use strict';

  window.startTank = function (root, onFinish) {
    var kit = window.SMGameKit;
    var STAGES = window.SM_TANK_STAGES || [];
    var el = kit.makeRoot(root);
    var destroyed = false, finished = false;

    /* ---------- 尺寸与地形 ---------- */
    var GRID = 13, TILE = 40, W = GRID * TILE;
    var SUB = TILE / 4;              // 砖墙子格 10px
    var STEEL_SUB = TILE / 2;        // 钢墙子格 20px
    var EMPTY = 0, BRICK = 1, STEEL = 2, WATER = 3, FOREST = 4, ICE = 5, BASE = 6;

    var UP = 0, RIGHT = 1, DOWN = 2, LEFT = 3;
    var DIR_VEC = [{ x: 0, y: -1 }, { x: 1, y: 0 }, { x: 0, y: 1 }, { x: -1, y: 0 }];

    var BASE_C = 6, BASE_R = 12;
    var BASE_RECT = { x: BASE_C * TILE, y: BASE_R * TILE, w: TILE, h: TILE };
    var PLAYER_SPAWN = { c: 4, r: 12 };
    var ENEMY_SPAWN_X = [6, 12, 0];
    var BASE_WALL_CELLS = [[5, 11], [6, 11], [7, 11], [5, 12], [7, 12]];

    /* 原版数值按 16px→40px 放大 2.5 倍 */
    var PLAYER_SPEED = 112.5;
    var ENEMY_SPEED = 75;
    var FAST_SPEED = 150;
    var BULLET_SLOW = 300;
    var BULLET_FAST = 600;
    var PLAYER_SPAWN_ANIM = 0.62;
    var ENEMY_SPAWN_ANIM = 0.93;
    var PLAYER_SHIELD = 2.5;
    var FIRE_SLOT_DELAY = 0.15;
    var LIVES = 3;
    var EXTRA_LIFE_SCORE = 20000;
    var MAX_ACTIVE = 4;
    var ENEMIES_PER_STAGE = 20;

    var ENEMY_TYPES = {
      basic: { speed: ENEMY_SPEED, hp: 1, bulletSpeed: BULLET_SLOW, score: 100 },
      fast: { speed: FAST_SPEED, hp: 1, bulletSpeed: BULLET_SLOW, score: 200 },
      power: { speed: ENEMY_SPEED, hp: 1, bulletSpeed: BULLET_FAST, score: 300 },
      armor: { speed: ENEMY_SPEED, hp: 4, bulletSpeed: BULLET_SLOW, score: 400 }
    };
    var POWERUP_TABLE = ['helmet', 'clock', 'shovel', 'star', 'grenade', 'tank', 'grenade', 'star'];
    var POWERUP_POS = [60, 180, 300, 420];

    /* 旧版 describe 把 kills/waves 放在顶层，lb-panel 只转发 extra，
       导致成绩被服务端以「击毁数不合法」拒收。这里从全局历史档案
       把这两个字段补回本机战绩，下次进章节时由 syncLocal 自动补交。 */
    function repairTankLocalRuns() {
      try {
        var raw = localStorage.getItem('sm_tank_runs');
        if (!raw) return;
        var runs = JSON.parse(raw);
        if (!Array.isArray(runs) || !runs.length) return;
        var hist = JSON.parse(localStorage.getItem('juice_universal_history_v1') || '[]');
        if (!Array.isArray(hist)) return;
        var changed = false;
        for (var i = 0; i < runs.length; i++) {
          var r = runs[i];
          if (!r || (r.kills != null && r.waves != null)) continue;
          for (var j = 0; j < hist.length; j++) {
            var rec = hist[j];
            var d = rec && rec.data;
            var test = d && d.test;
            var det = d && d.res && d.res.detail;
            if (!rec || rec.module !== 'manual' || !test || test.id !== 'tank' || !det) continue;
            if (Number(det.score) !== Number(r.score)) continue;
            r.kills = det.kills;
            r.waves = det.waves;
            changed = true;
            break;
          }
        }
        if (changed) localStorage.setItem('sm_tank_runs', JSON.stringify(runs));
      } catch (e) {}
    }
    repairTankLocalRuns();

    var lbPanel = window.AppLbPanel ? window.AppLbPanel.create({
      game: 'tank',
      storeKey: 'sm_tank_runs',
      higher: true,
      idPrefix: 'lbtank',
      formatScore: function (v) { return v + ' 分'; },
      // 服务端 parseRun 需要 kills / waves；lb-panel 只转发 extra 里的字段，
      // 放在顶层会被丢掉，提交变成「只有分数」→ 400 击毁数不合法。
      describe: function (run) {
        return { score: run.score, extra: { kills: run.kills, waves: run.waves } };
      },
      localCols: function (r) {
        return [
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">第 ' + (r.waves || 1) + ' 关</span>',
          '<span class="lb-meta">击毁 ' + (r.kills || 0) + '</span>'
        ];
      },
      globalCols: function (r) {
        return [
          '<span class="lb-ava">' + window.AppLbPanel.esc(r.avatar || '🙂') + '</span>',
          '<span class="lb-name">' + window.AppLbPanel.esc(r.name || '匿名玩家') +
            (r.isMe ? '<i class="lb-me">我</i>' : '') + '</span>',
          '<span class="lb-score">' + (r.score || 0) + '</span>',
          '<span class="lb-tile">第 ' + ((r.extra && r.extra.waves) || 1) + ' 关</span>'
        ];
      }
    }) : null;

    /* ---------- 状态 ---------- */
    var tiles = [], brickMask = [], steelMask = [];
    var player = null;
    var enemies = [];
    var bullets = [];
    var explosions = [];
    var powerup = null;
    var held = [false, false, false, false];
    var heldOrder = [];
    var moveDir = null;

    var score = 0, kills = 0, stage = 1, lives = LIVES, star = 0;
    var shotsFired = 0, shotsHit = 0;
    var enemyQueue = [], spawnedCount = 0, spawnTimer = 0, spawnIdx = 0;
    var remaining = ENEMIES_PER_STAGE;
    var stageTime = 0, readyT = 0, clearT = 0;
    var freezeT = 0, shovelT = 0, extraLife = false;
    var baseAlive = true;
    var respawnT = 0, slideT = 0, slideDir = UP;
    var bannerTitle = '', bannerSub = '', bannerT = 0;
    var mode = 'intro';           // intro | play | over
    var paused = false, suspended = false;
    var pendingOver = 0;
    var rafId = 0, lastTs = 0;
    var canvasEl = null, ctx = null;
    var overTimer = 0, pendingResult = null;

    /* ---------- 工具 ---------- */
    function rand(a, b) { return a + Math.random() * (b - a); }
    /* 原版是 60fps 下每帧掷一次的概率。本作按真实时间折算，
       否则 120/144Hz 屏上敌人开火和转向决策都会成倍变快。 */
    function perFrame(p, dt) {
      return 1 - Math.pow(1 - p, dt * 60);
    }
    function rectsOverlap(a, b) {
      return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
    }
    function roundRect(c, x, y, w, h, r) {
      var rr = Math.min(r, w / 2, h / 2);
      c.beginPath();
      c.moveTo(x + rr, y);
      c.arcTo(x + w, y, x + w, y + h, rr);
      c.arcTo(x + w, y + h, x, y + h, rr);
      c.arcTo(x, y + h, x, y, rr);
      c.arcTo(x, y, x + w, y, rr);
      c.closePath();
    }
    function opposite(dir) { return (dir + 2) % 4; }

    /* ---------- 关卡数据 ---------- */
    /* 原版砖墙 token：1 位 hex 时每一位代表一个 2×2 象限全有/全无；
       4 位 hex 时每位是一个 2×2 象限的 4 个子砖。统一展开成 4×4 行优先掩码。 */
    function parseBrickMask(str) {
      var m = 0;
      var v = parseInt(str, 16);
      if (isNaN(v)) return 0xFFFF;
      if (str.length === 1) {
        var quads = [[0, 0], [0, 1], [1, 0], [1, 1]];
        for (var q = 0; q < 4; q++) {
          if (!(v & (1 << q))) continue;
          var qr = quads[q][0], qc = quads[q][1];
          m |= 1 << ((qr * 2) * 4 + qc * 2);
          m |= 1 << ((qr * 2) * 4 + qc * 2 + 1);
          m |= 1 << ((qr * 2 + 1) * 4 + qc * 2);
          m |= 1 << ((qr * 2 + 1) * 4 + qc * 2 + 1);
        }
        return m;
      }
      var parts = [(v >> 12) & 0xF, (v >> 8) & 0xF, (v >> 4) & 0xF, v & 0xF];
      var qs = [[0, 0], [0, 1], [1, 0], [1, 1]];
      for (var i = 0; i < 4; i++) {
        var p = parts[i], qr2 = qs[i][0], qc2 = qs[i][1];
        if (p & 1) m |= 1 << ((qr2 * 2) * 4 + qc2 * 2);
        if (p & 2) m |= 1 << ((qr2 * 2) * 4 + qc2 * 2 + 1);
        if (p & 4) m |= 1 << ((qr2 * 2 + 1) * 4 + qc2 * 2);
        if (p & 8) m |= 1 << ((qr2 * 2 + 1) * 4 + qc2 * 2 + 1);
      }
      return m;
    }
    function parseSteelMask(str) {
      var v = parseInt(str, 16);
      if (isNaN(v)) return 0xF;
      var m = 0;
      if (v & 1) m |= 1;
      if (v & 2) m |= 2;
      if (v & 4) m |= 4;
      if (v & 8) m |= 8;
      return m;
    }
    function expandBots(list) {
      var out = [];
      for (var i = 0; i < list.length; i++) {
        var m = /^(\d+)\*(.+)$/.exec(list[i]);
        if (m) {
          for (var k = 0; k < parseInt(m[1], 10); k++) out.push(m[2]);
        } else {
          out.push(list[i]);
        }
      }
      return out;
    }
    function mapStageIndex(n) {
      if (n <= 35) return n;
      if (n <= 70) return n - 35;
      return ((n - 71) % 35) + 1;
    }
    function configStage(n) { return Math.min(n, 35); }

    function loadStage(n) {
      var cfg = STAGES[mapStageIndex(n) - 1];
      // 第 36~70 关：地图用 n−35，敌军配置固定按第 35 关
      var botsCfg = n > 35 ? STAGES[34].bots : cfg.bots;
      tiles = []; brickMask = []; steelMask = [];
      for (var r = 0; r < GRID; r++) {
        tiles.push([]); brickMask.push([]); steelMask.push([]);
        var tokens = (cfg.map[r] || '').trim().split(/\s+/);
        for (var c = 0; c < GRID; c++) {
          var tok = tokens[c] || 'X';
          var t = tok.charAt(0).toUpperCase();
          var type = EMPTY, bm = 0, sm = 0;
          if (t === 'B') { type = BRICK; bm = parseBrickMask(tok.slice(1)); }
          else if (t === 'T') { type = STEEL; sm = parseSteelMask(tok.slice(1)); }
          else if (t === 'R') { type = WATER; }
          else if (t === 'F') { type = FOREST; }
          else if (t === 'S') { type = ICE; }
          else if (t === 'E') { type = BASE; }
          tiles[r].push(type);
          brickMask[r].push(bm);
          steelMask[r].push(sm);
        }
      }
      enemyQueue = expandBots(botsCfg || []);
      while (enemyQueue.length < ENEMIES_PER_STAGE) enemyQueue.push('basic');
      enemyQueue = enemyQueue.slice(0, ENEMIES_PER_STAGE);
      spawnedCount = 0;
      spawnIdx = 0;
      spawnTimer = 0;
      remaining = ENEMIES_PER_STAGE;
      stageTime = 0;
      freezeT = 0; shovelT = 0;
      baseAlive = true;
      powerup = null;
    }

    /* ---------- 地形 ---------- */
    function tileAt(c, r) {
      if (c < 0 || r < 0 || c >= GRID || r >= GRID) return STEEL;
      return tiles[r][c];
    }
    function blocksSub(c, r, sr, sc) {
      var t = tileAt(c, r);
      if (t === WATER || t === BASE) return true;
      if (t === BRICK) {
        var m = brickMask[r][c];
        if (!m) return false;
        // 一个 20px 子格对应砖墙掩码里的 2×2 个 10px 子砖
        var br = sr * 2, bc = sc * 2;
        for (var dr = 0; dr < 2; dr++) {
          for (var dc = 0; dc < 2; dc++) {
            if (m & (1 << ((br + dr) * 4 + bc + dc))) return true;
          }
        }
        return false;
      }
      if (t === STEEL) {
        var sm = steelMask[r][c];
        return !!(sm & (1 << (sr * 2 + sc)));
      }
      return false;
    }
    /* 原版坦克阻挡粒度是 8×8 tile（本作 20px 子格），不是整块 16×16。
       否则半块砖的空半边也会挡路，看起来就是一圈空气墙。 */
    function rectHitsSolid(x, y, w, h) {
      if (x < 0 || y < 0 || x + w > W || y + h > W) return true;
      var c0 = Math.floor(x / TILE), c1 = Math.floor((x + w - 0.001) / TILE);
      var r0 = Math.floor(y / TILE), r1 = Math.floor((y + h - 0.001) / TILE);
      for (var r = r0; r <= r1; r++) {
        for (var c = c0; c <= c1; c++) {
          var t = tiles[r][c];
          if (t === WATER || t === BASE) return true;
          if (t !== BRICK && t !== STEEL) continue;
          for (var sr = 0; sr < 2; sr++) {
            for (var sc = 0; sc < 2; sc++) {
              var sx = c * TILE + sc * STEEL_SUB;
              var sy = r * TILE + sr * STEEL_SUB;
              if (x < sx + STEEL_SUB && x + w > sx &&
                  y < sy + STEEL_SUB && y + h > sy &&
                  blocksSub(c, r, sr, sc)) return true;
            }
          }
        }
      }
      return false;
    }
    function setBaseWalls(type) {
      for (var i = 0; i < BASE_WALL_CELLS.length; i++) {
        var c = BASE_WALL_CELLS[i][0], r = BASE_WALL_CELLS[i][1];
        tiles[r][c] = type;
        brickMask[r][c] = type === BRICK ? 0xFFFF : 0;
        steelMask[r][c] = type === STEEL ? 0xF : 0;
      }
    }
    function damageBricks(x, y, w, h) {
      var hit = false;
      var c0 = Math.max(0, Math.floor(x / TILE)), c1 = Math.min(GRID - 1, Math.floor((x + w - 0.001) / TILE));
      var r0 = Math.max(0, Math.floor(y / TILE)), r1 = Math.min(GRID - 1, Math.floor((y + h - 0.001) / TILE));
      for (var r = r0; r <= r1; r++) {
        for (var c = c0; c <= c1; c++) {
          if (tiles[r][c] !== BRICK) continue;
          var m = brickMask[r][c];
          if (!m) continue;
          for (var sr = 0; sr < 4; sr++) {
            for (var sc = 0; sc < 4; sc++) {
              var bit = 1 << (sr * 4 + sc);
              if (!(m & bit)) continue;
              var sx = c * TILE + sc * SUB, sy = r * TILE + sr * SUB;
              if (x < sx + SUB && x + w > sx && y < sy + SUB && y + h > sy) {
                m &= ~bit;
                hit = true;
              }
            }
          }
          brickMask[r][c] = m;
          if (m === 0) tiles[r][c] = EMPTY;
        }
      }
      return hit;
    }
    function damageSteel(x, y, w, h) {
      var hit = false;
      var c0 = Math.max(0, Math.floor(x / TILE)), c1 = Math.min(GRID - 1, Math.floor((x + w - 0.001) / TILE));
      var r0 = Math.max(0, Math.floor(y / TILE)), r1 = Math.min(GRID - 1, Math.floor((y + h - 0.001) / TILE));
      for (var r = r0; r <= r1; r++) {
        for (var c = c0; c <= c1; c++) {
          if (tiles[r][c] !== STEEL) continue;
          var m = steelMask[r][c];
          if (!m) continue;
          for (var sr = 0; sr < 2; sr++) {
            for (var sc = 0; sc < 2; sc++) {
              var bit = 1 << (sr * 2 + sc);
              if (!(m & bit)) continue;
              var sx = c * TILE + sc * STEEL_SUB, sy = r * TILE + sr * STEEL_SUB;
              if (x < sx + STEEL_SUB && x + w > sx && y < sy + STEEL_SUB && y + h > sy) {
                m &= ~bit;
                hit = true;
              }
            }
          }
          steelMask[r][c] = m;
          if (m === 0) tiles[r][c] = EMPTY;
        }
      }
      return hit;
    }
    function steelBlocks(x, y, w, h) {
      var c0 = Math.max(0, Math.floor(x / TILE)), c1 = Math.min(GRID - 1, Math.floor((x + w - 0.001) / TILE));
      var r0 = Math.max(0, Math.floor(y / TILE)), r1 = Math.min(GRID - 1, Math.floor((y + h - 0.001) / TILE));
      for (var r = r0; r <= r1; r++) {
        for (var c = c0; c <= c1; c++) {
          if (tiles[r][c] !== STEEL) continue;
          var m = steelMask[r][c];
          if (!m) continue;
          for (var sr = 0; sr < 2; sr++) {
            for (var sc = 0; sc < 2; sc++) {
              if (!(m & (1 << (sr * 2 + sc)))) continue;
              var sx = c * TILE + sc * STEEL_SUB;
              var sy = r * TILE + sr * STEEL_SUB;
              if (x < sx + STEEL_SUB && x + w > sx &&
                  y < sy + STEEL_SUB && y + h > sy) return true;
            }
          }
        }
      }
      return false;
    }

    /* ---------- 坦克 ---------- */
    function makeTank(opts) {
      return {
        x: opts.x, y: opts.y, w: TILE, h: TILE,
        dir: opts.dir === undefined ? UP : opts.dir,
        isPlayer: !!opts.isPlayer,
        kind: opts.kind || 'basic',
        moveSpeed: opts.speed || 100,
        bulletSpeed: opts.bulletSpeed || BULLET_SLOW,
        hp: opts.hp || 1,
        maxHp: opts.hp || 1,
        scoreValue: opts.score || 0,
        alive: true,
        spawnT: opts.spawnT || 0,
        shield: opts.shield || 0,
        slotT: 0,
        waitT: 0,
        tread: 0,
        carrier: !!opts.carrier,
        dropped: false
      };
    }
    function tankRect(t) { return { x: t.x, y: t.y, w: TILE, h: TILE }; }
    function tankCx(t) { return t.x + TILE / 2; }
    function tankCy(t) { return t.y + TILE / 2; }
    function isSpawning(t) { return t.spawnT > 0; }
    function isInvulnerable(t) { return t.spawnT > 0 || t.shield > 0; }

    function tankBlocked(t) {
      if (rectHitsSolid(t.x, t.y, TILE, TILE)) return true;
      if (player && player !== t && player.alive && !isSpawning(player) &&
          rectsOverlap(tankRect(t), tankRect(player))) return true;
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (e === t || !e.alive || isSpawning(e)) continue;
        if (rectsOverlap(tankRect(t), tankRect(e))) return true;
      }
      return false;
    }
    /* 原版转向时对齐到 8px 网格（本作 20px 半格），这里按半格逐步吸附 */
    function alignAxis(t, axis, dt) {
      var grid = TILE / 2;
      var cur = t[axis];
      var nearest = Math.round(cur / grid) * grid;
      var diff = nearest - cur;
      if (Math.abs(diff) < 0.5) { t[axis] = nearest; return; }
      var stepMag = Math.min(Math.abs(diff), t.moveSpeed * dt);
      var signs = [diff > 0 ? 1 : -1, diff > 0 ? -1 : 1];
      for (var i = 0; i < signs.length; i++) {
        t[axis] = cur + signs[i] * stepMag;
        if (!tankBlocked(t)) return;
        t[axis] = cur;
      }
    }
    function tankMove(t, dir, dt) {
      t.dir = dir;
      var horizontal = (dir === LEFT || dir === RIGHT);
      if (horizontal) alignAxis(t, 'y', dt);
      else alignAxis(t, 'x', dt);
      var v = DIR_VEC[dir];
      var step = t.moveSpeed * dt;
      var ox = t.x, oy = t.y;
      t.x += v.x * step;
      t.y += v.y * step;
      if (tankBlocked(t)) {
        t.x = ox; t.y = oy;
        return false;
      }
      t.tread += step;
      return true;
    }
    function bulletsInFlight(t) {
      var n = 0;
      for (var i = 0; i < bullets.length; i++) {
        if (bullets[i].owner === t && bullets[i].alive) n++;
      }
      return n;
    }
    function canFire(t) {
      return bulletsInFlight(t) < 1;
    }
    function fireBullet(t) {
      var v = DIR_VEC[t.dir];
      var bx = tankCx(t) + v.x * (TILE / 2);
      var by = tankCy(t) + v.y * (TILE / 2);
      var power = 1;
      var speed = t.bulletSpeed;
      if (t.isPlayer) {
        speed = star >= 1 ? BULLET_FAST : BULLET_SLOW;
        power = star >= 3 ? 3 : 1;
        shotsFired++;
      }
      bullets.push({
        owner: t,
        isPlayer: !!t.isPlayer,
        x: bx, y: by,
        dir: t.dir,
        speed: speed,
        power: power,
        alive: true
      });
      if (window.SFX && window.SFX.shoot) window.SFX.shoot();
    }
    function hitByBullet(t, bullet) {
      if (!t.alive || isInvulnerable(t)) return 'blocked';
      if (t.isPlayer) {
        t.alive = false;
        return 'killed';
      }
      if (bullet.owner && bullet.owner.isPlayer) shotsHit++;
      if (t.carrier && !t.dropped) {
        t.dropped = true;
        spawnPowerUp();
      }
      t.hp -= 1;
      if (t.hp > 0) return 'damaged';
      t.alive = false;
      return 'killed';
    }

    /* ---------- 玩家 ---------- */
    function spawnPlayer() {
      player = makeTank({
        x: PLAYER_SPAWN.c * TILE,
        y: PLAYER_SPAWN.r * TILE,
        dir: UP,
        isPlayer: true,
        speed: PLAYER_SPEED,
        bulletSpeed: BULLET_SLOW,
        hp: 1,
        spawnT: PLAYER_SPAWN_ANIM,
        shield: PLAYER_SHIELD
      });
      respawnT = 0;
      slideT = 0;
      clearSpawnTile(PLAYER_SPAWN.c, PLAYER_SPAWN.r);
    }
    function clearSpawnTile(c, r) {
      if (c < 0 || r < 0 || c >= GRID || r >= GRID) return;
      tiles[r][c] = EMPTY;
      brickMask[r][c] = 0;
      steelMask[r][c] = 0;
    }
    function onIce(t) {
      var c = Math.floor(tankCx(t) / TILE);
      var r = Math.floor(tankCy(t) / TILE);
      return tileAt(c, r) === ICE;
    }
    function updatePlayer(dt) {
      var t = player;
      if (!t || !t.alive) return;
      if (t.shield > 0) t.shield -= dt;
      if (t.slotT > 0) t.slotT -= dt;
      if (isSpawning(t)) { t.spawnT -= dt; return; }
      if (slideT > 0) {
        slideT -= dt;
        // 前 0.28 秒锁定方向，之后允许改向；松开也会继续滑
        if (slideT <= 0.37 && moveDir !== null) slideDir = moveDir;
        tankMove(t, slideDir, dt);
        return;
      }
      if (moveDir !== null) {
        tankMove(t, moveDir, dt);
        if (onIce(t)) {
          slideT = 0.65;
          slideDir = moveDir;
        }
      }
    }
    function tryPlayerFire() {
      var t = player;
      if (mode !== 'play' || paused || finished || readyT > 0 || clearT > 0 || pendingOver > 0) return;
      if (!t || !t.alive || isSpawning(t) || t.slotT > 0) return;
      var limit = star >= 2 ? 2 : 1;
      if (bulletsInFlight(t) >= limit) return;
      fireBullet(t);
    }

    /* ---------- 敌方 ---------- */
    function spawnIntervalFrames(n) {
      return 190 - 4 * configStage(n);
    }
    function aiPhase() {
      var s = spawnIntervalFrames(stage);
      var k = Math.floor((stageTime * 60) / 64);
      if (k > Math.floor(s / 4)) return 2;   // 冲基地
      if (k > Math.floor(s / 8)) return 1;   // 追玩家
      return 0;                              // 随机游走
    }
    function chooseTargetDir(e) {
      var phase = aiPhase();
      if (phase === 0) return (Math.random() * 4) | 0;
      var tx = BASE_RECT.x + TILE / 2, ty = BASE_RECT.y + TILE / 2;
      if (phase === 1 && player && player.alive) {
        tx = tankCx(player); ty = tankCy(player);
      }
      var dx = tx - tankCx(e), dy = ty - tankCy(e);
      var verticalFirst = Math.random() < 0.5;
      if (verticalFirst) {
        if (Math.abs(dy) > 1) return dy > 0 ? DOWN : UP;
        if (Math.abs(dx) > 1) return dx > 0 ? RIGHT : LEFT;
      } else {
        if (Math.abs(dx) > 1) return dx > 0 ? RIGHT : LEFT;
        if (Math.abs(dy) > 1) return dy > 0 ? DOWN : UP;
      }
      return e.dir;
    }
    function updateAI(e, dt) {
      if (isSpawning(e)) { e.spawnT -= dt; return; }
      if (freezeT > 0) return;
      if (e.waitT > 0) { e.waitT -= dt; return; }
      var grid = TILE / 2;
      var atGrid = Math.abs(e.x - Math.round(e.x / grid) * grid) < 0.7 &&
        Math.abs(e.y - Math.round(e.y / grid) * grid) < 0.7;
      if (atGrid && Math.random() < perFrame(1 / 16, dt)) e.dir = chooseTargetDir(e);
      var moved = tankMove(e, e.dir, dt);
      if (!moved) {
        // 原版：75% 原地等 2 帧继续撞，25% 掉头；概率同样按 60fps 折算
        if (Math.random() < perFrame(0.25, dt)) e.dir = opposite(e.dir);
        else e.waitT = 2 / 60;
        if (atGrid && Math.random() < 0.5) e.dir = chooseTargetDir(e);
      }
      if (canFire(e) && Math.random() < perFrame(1 / 32, dt)) fireBullet(e);
    }
    function spawnEnemy() {
      if (!enemyQueue.length) return;
      var kind = enemyQueue.shift();
      var cfg = ENEMY_TYPES[kind] || ENEMY_TYPES.basic;
      var c = ENEMY_SPAWN_X[spawnIdx];
      spawnIdx = (spawnIdx + 1) % ENEMY_SPAWN_X.length;
      clearSpawnTile(c, 0);
      var e = makeTank({
        x: c * TILE,
        y: 0,
        dir: DOWN,
        kind: kind,
        speed: cfg.speed,
        bulletSpeed: cfg.bulletSpeed,
        hp: cfg.hp,
        score: cfg.score,
        spawnT: ENEMY_SPAWN_ANIM,
        carrier: spawnedCount === 3 || spawnedCount === 10 || spawnedCount === 17
      });
      spawnedCount++;
      enemies.push(e);
    }
    function activeEnemies() {
      var n = 0;
      for (var i = 0; i < enemies.length; i++) if (enemies[i].alive) n++;
      return n;
    }

    /* ---------- 道具 ---------- */
    function spawnPowerUp() {
      if (!player || !player.alive) return;
      var x, y, tries = 0;
      do {
        x = POWERUP_POS[(Math.random() * 4) | 0];
        y = POWERUP_POS[(Math.random() * 4) | 0];
        tries++;
      } while (tries < 20 && Math.abs(x + TILE / 2 - tankCx(player)) < 30 &&
        Math.abs(y + TILE / 2 - tankCy(player)) < 30);
      var type = POWERUP_TABLE[(Math.random() * POWERUP_TABLE.length) | 0];
      powerup = { x: x, y: y, type: type, t: 0 };
    }
    function applyPowerUp(type) {
      score += 500;
      if (type === 'star') {
        if (star < 3) star++;
      } else if (type === 'helmet') {
        if (player) player.shield = 10;
      } else if (type === 'clock') {
        freezeT = 10;
      } else if (type === 'shovel') {
        shovelT = 20.5;
        setBaseWalls(STEEL);
      } else if (type === 'grenade') {
        grenadeAll();
      } else if (type === 'tank') {
        lives++;
      }
      checkExtraLife();
      updateHud();
    }
    function grenadeAll() {
      for (var i = 0; i < enemies.length; i++) {
        var e = enemies[i];
        if (!e.alive || isSpawning(e)) continue;
        e.alive = false;
        remaining = Math.max(0, remaining - 1);
        addExplosion(tankCx(e), tankCy(e), true);
      }
      if (window.SFX && window.SFX.boom) window.SFX.boom();
    }
    function checkExtraLife() {
      if (!extraLife && score >= EXTRA_LIFE_SCORE) {
        extraLife = true;
        lives++;
        if (window.SFX && window.SFX.win) window.SFX.win();
      }
    }
    function updatePowerUp(dt) {
      if (!powerup) return;
      powerup.t += dt;
      if (!player || !player.alive || isSpawning(player)) return;
      var dx = Math.abs(powerup.x + TILE / 2 - tankCx(player));
      var dy = Math.abs(powerup.y + TILE / 2 - tankCy(player));
      if (dx < 30 && dy < 30) {
        var type = powerup.type;
        powerup = null;
        applyPowerUp(type);
      }
    }
    function updateShovel(dt) {
      if (shovelT <= 0) return;
      shovelT -= dt;
      if (shovelT <= 0) {
        shovelT = 0;
        setBaseWalls(BRICK);
        return;
      }
      if (shovelT > 3.2) {
        setBaseWalls(STEEL);
      } else {
        var phase = Math.floor(shovelT / 0.267) % 2;
        setBaseWalls(phase ? BRICK : STEEL);
      }
    }

    /* ---------- 子弹 ---------- */
    function bulletRect(b) {
      var vertical = (b.dir === UP || b.dir === DOWN);
      var w = vertical ? 8 : 10, h = vertical ? 10 : 8;
      return { x: b.x - w / 2, y: b.y - h / 2, w: w, h: h };
    }
    /* 普通弹削一条 4×1 子砖（40×10）；3 星按原版清 16×8 px（本作 40×20） */
    function damageRect(b) {
      var big = b.power >= 3;
      var vertical = (b.dir === UP || b.dir === DOWN);
      if (big) {
        return vertical
          ? { x: b.x - TILE / 2, y: b.y - SUB, w: TILE, h: SUB * 2 }
          : { x: b.x - SUB, y: b.y - TILE / 2, w: SUB * 2, h: TILE };
      }
      return vertical
        ? { x: b.x - TILE / 2, y: b.y - SUB / 2, w: TILE, h: SUB }
        : { x: b.x - SUB / 2, y: b.y - TILE / 2, w: SUB, h: TILE };
    }
    function addExplosion(x, y, big) {
      explosions.push({
        x: x, y: y, big: !!big,
        t: 0,
        dur: big ? 0.55 : 0.3,
        r: big ? TILE * 0.9 : TILE * 0.4,
        sparks: (function () {
          var out = [];
          var n = big ? 9 : 5;
          for (var i = 0; i < n; i++) out.push({ a: Math.random() * Math.PI * 2, d: rand(0.3, 1), s: rand(2, 5) });
          return out;
        })()
      });
    }
    function updateExplosions(dt) {
      for (var i = explosions.length - 1; i >= 0; i--) {
        explosions[i].t += dt;
        if (explosions[i].t >= explosions[i].dur) explosions.splice(i, 1);
      }
    }
    function bulletHitsBase(b) {
      if (!baseAlive) return false;
      return rectsOverlap(bulletRect(b), BASE_RECT);
    }
    function updateBullets(dt) {
      for (var i = 0; i < bullets.length; i++) {
        var b = bullets[i];
        if (!b.alive) continue;
        var v = DIR_VEC[b.dir];
        var step = b.speed * dt;
        var sub = Math.max(1, Math.ceil(step / 4));
        for (var s = 0; s < sub && b.alive; s++) {
          b.x += v.x * step / sub;
          b.y += v.y * step / sub;
          var r = bulletRect(b);
          if (r.x < 0 || r.y < 0 || r.x + r.w > W || r.y + r.h > W) {
            b.alive = false;
            addExplosion(b.x, b.y, false);
            break;
          }
          var dmg = damageRect(b);
          var hitBrick = damageBricks(dmg.x, dmg.y, dmg.w, dmg.h);
          var hitSteel = false;
          var br = bulletRect(b);
          if (b.power >= 3) {
            hitSteel = damageSteel(dmg.x, dmg.y, dmg.w, dmg.h);
          } else if (steelBlocks(br.x, br.y, br.w, br.h)) {
            // 钢墙用子弹自身的小判定盒，不能用 40px 宽的削砖范围，
            // 否则隔着一格钢墙也会被误挡。
            hitSteel = true;
          }
          if (hitBrick || hitSteel) {
            b.alive = false;
            addExplosion(b.x, b.y, false);
            if (b.isPlayer && player) player.slotT = FIRE_SLOT_DELAY;
            break;
          }
          // 地形必须先于基地判定：否则子弹矩形同时压到护墙和基地时，
          // 会隔着砖墙直接把老鹰打掉。
          if (bulletHitsBase(b)) {
            b.alive = false;
            destroyBase();
            break;
          }
          var list = [player].concat(enemies);
          for (var j = 0; j < list.length; j++) {
            var t = list[j];
            if (!t || !t.alive || t === b.owner || isSpawning(t)) continue;
            if (t.isPlayer === b.isPlayer) continue;
            if (!rectsOverlap(r, tankRect(t))) continue;
            var result = hitByBullet(t, b);
            b.alive = false;
            if (result === 'killed') onTankKilled(t);
            else if (result === 'blocked') addExplosion(b.x, b.y, false);
            if (b.isPlayer && player) player.slotT = FIRE_SLOT_DELAY;
            break;
          }
        }
      }
      // 原版只有玩家子弹会与其它子弹对撞；敌人子弹之间互相穿过
      for (var a = 0; a < bullets.length; a++) {
        if (!bullets[a].alive || !bullets[a].isPlayer) continue;
        for (var k = 0; k < bullets.length; k++) {
          if (k === a || !bullets[k].alive) continue;
          if (bullets[k].owner === bullets[a].owner) continue;
          if (Math.abs(bullets[a].x - bullets[k].x) < 15 &&
              Math.abs(bullets[a].y - bullets[k].y) < 15) {
            bullets[a].alive = false;
            bullets[k].alive = false;
            break;
          }
        }
      }
      bullets = bullets.filter(function (b) { return b.alive; });
    }

    /* ---------- 事件 ---------- */
    function onTankKilled(t) {
      if (t.isPlayer) {
        addExplosion(tankCx(t), tankCy(t), true);
        lives = Math.max(0, lives - 1);
        star = 0;
        updateHud();
        if (lives <= 0) { triggerOver('坦克全毁'); return; }
        respawnT = 1.0;
        return;
      }
      kills++;
      score += t.scoreValue;
      remaining = Math.max(0, remaining - 1);
      addExplosion(tankCx(t), tankCy(t), true);
      if (window.SFX && window.SFX.boom) window.SFX.boom();
      checkExtraLife();
      updateHud();
    }
    function destroyBase() {
      if (!baseAlive) return;
      baseAlive = false;
      addExplosion(BASE_RECT.x + TILE / 2, BASE_RECT.y + TILE / 2, true);
      addExplosion(BASE_RECT.x + 8, BASE_RECT.y + TILE - 8, true);
      addExplosion(BASE_RECT.x + TILE - 8, BASE_RECT.y + 8, true);
      if (window.SFX && window.SFX.boom) window.SFX.boom();
      triggerOver('基地被摧毁');
    }
    function triggerOver(reason) {
      if (finished || pendingOver > 0) return;
      pendingOver = 1.0;
      bannerTitle = reason || '本局结束';
      bannerSub = '得分 ' + score;
      bannerT = 1.4;
      if (window.SFX && window.SFX.foul) window.SFX.foul();
    }

    /* ---------- 关卡流程 ---------- */
    function startStage(n) {
      stage = n;
      loadStage(n);
      enemies = [];
      bullets = [];
      explosions = [];
      player = null;
      spawnPlayer();
      readyT = 1.5;
      bannerTitle = '第 ' + n + ' 关';
      bannerSub = '准备';
      bannerT = 1.6;
      updateHud();
    }
    function stageClear() {
      clearT = 2.5;
      bannerTitle = '第 ' + stage + ' 关完成';
      bannerSub = '准备进入下一关';
      bannerT = 2.2;
      if (window.SFX && window.SFX.win) window.SFX.win();
    }

    /* ---------- 主循环 ---------- */
    function update(dt) {
      if (bannerT > 0) bannerT -= dt;
      if (pendingOver > 0) {
        pendingOver -= dt;
        updateExplosions(dt);
        if (pendingOver <= 0) finishGame();
        return;
      }
      if (readyT > 0) {
        readyT -= dt;
        updateExplosions(dt);
        return;
      }
      if (clearT > 0) {
        clearT -= dt;
        updateExplosions(dt);
        if (clearT <= 0) {
          var next = stage + 1;
          if (next > 70) next = 1;
          startStage(next);
        }
        return;
      }
      stageTime += dt;
      if (freezeT > 0) freezeT = Math.max(0, freezeT - dt);
      updateShovel(dt);
      updatePowerUp(dt);

      if (player && player.alive) updatePlayer(dt);
      else if (respawnT > 0) {
        respawnT -= dt;
        if (respawnT <= 0) spawnPlayer();
      }
      for (var i = 0; i < enemies.length; i++) {
        if (enemies[i].alive) updateAI(enemies[i], dt);
      }
      updateBullets(dt);
      updateExplosions(dt);
      enemies = enemies.filter(function (e) { return e.alive; });

      spawnTimer -= dt;
      if (spawnTimer <= 0 && enemyQueue.length && activeEnemies() < MAX_ACTIVE) {
        spawnEnemy();
        spawnTimer = spawnIntervalFrames(stage) / 60;
      }
      if (remaining <= 0 && activeEnemies() === 0 && clearT <= 0) stageClear();
    }

    function loop(ts) {
      rafId = 0;
      if (destroyed || finished || paused || suspended) return;
      if (!lastTs) lastTs = ts;
      var dt = Math.min(0.05, (ts - lastTs) / 1000);
      lastTs = ts;
      update(dt);
      draw(ts / 1000);
      if (!destroyed && !finished && !paused && !suspended) rafId = requestAnimationFrame(loop);
    }
    function ensureLoop() {
      if (rafId || destroyed || finished || paused || suspended) return;
      lastTs = 0;
      rafId = requestAnimationFrame(loop);
    }
    function stopLoop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = 0; }
    }

    /* ---------- 绘制 ---------- */
    function drawBrickTile(m, x, y) {
      if (!m) return;
      ctx.save();
      ctx.beginPath();
      for (var sr = 0; sr < 4; sr++) {
        for (var sc = 0; sc < 4; sc++) {
          if (m & (1 << (sr * 4 + sc))) ctx.rect(x + sc * SUB, y + sr * SUB, SUB, SUB);
        }
      }
      ctx.clip();
      ctx.fillStyle = '#4A2010';
      ctx.fillRect(x, y, TILE, TILE);
      for (var r = 0; r < 4; r++) {
        for (var c = 0; c < 4; c++) {
          var px = x + c * SUB, py = y + r * SUB;
          ctx.fillStyle = '#B5532C';
          ctx.fillRect(px + 1, py + 1, SUB - 2, SUB - 2);
          ctx.fillStyle = 'rgba(255,220,180,.18)';
          ctx.fillRect(px + 1, py + 1, SUB - 2, 2);
          ctx.fillStyle = 'rgba(0,0,0,.22)';
          ctx.fillRect(px + 1, py + SUB - 3, SUB - 2, 2);
        }
      }
      ctx.restore();
    }
    function drawSteelTile(m, x, y) {
      if (!m) return;
      for (var sr = 0; sr < 2; sr++) {
        for (var sc = 0; sc < 2; sc++) {
          if (!(m & (1 << (sr * 2 + sc)))) continue;
          var px = x + sc * STEEL_SUB, py = y + sr * STEEL_SUB;
          ctx.fillStyle = '#4D5566';
          ctx.fillRect(px, py, STEEL_SUB, STEEL_SUB);
          ctx.fillStyle = '#9AA5B8';
          ctx.fillRect(px + 1, py + 1, STEEL_SUB - 2, STEEL_SUB - 2);
          ctx.fillStyle = 'rgba(255,255,255,.55)';
          ctx.fillRect(px + 1, py + 1, STEEL_SUB - 2, 2);
          ctx.fillRect(px + 1, py + 1, 2, STEEL_SUB - 2);
          ctx.fillStyle = 'rgba(0,0,0,.30)';
          ctx.fillRect(px + 1, py + STEEL_SUB - 3, STEEL_SUB - 2, 2);
          ctx.fillRect(px + STEEL_SUB - 3, py + 1, 2, STEEL_SUB - 2);
          ctx.fillStyle = '#DFE6F0';
          ctx.fillRect(px + STEEL_SUB / 2 - 3, py + STEEL_SUB / 2 - 3, 6, 6);
        }
      }
    }
    function drawWaterTile(x, y, time) {
      var g = ctx.createLinearGradient(x, y, x, y + TILE);
      g.addColorStop(0, '#1D4F80');
      g.addColorStop(1, '#102C4A');
      ctx.fillStyle = g;
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(150,205,255,.34)';
      ctx.lineWidth = 1.6;
      for (var i = 0; i < 3; i++) {
        var yy = y + 9 + i * 11;
        ctx.beginPath();
        for (var px = 0; px <= TILE; px += 5) {
          var py = yy + Math.sin(px / TILE * Math.PI * 2 + time * 2.4 + i * 1.9) * 2.2;
          if (px === 0) ctx.moveTo(x, py); else ctx.lineTo(x + px, py);
        }
        ctx.stroke();
      }
    }
    function drawIceTile(x, y) {
      ctx.fillStyle = '#C9E4F2';
      ctx.fillRect(x, y, TILE, TILE);
      ctx.strokeStyle = 'rgba(255,255,255,.75)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 6, y + 8); ctx.lineTo(x + 22, y + 30);
      ctx.moveTo(x + 30, y + 5); ctx.lineTo(x + 14, y + 34);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(80,140,180,.35)';
      ctx.strokeRect(x + 0.5, y + 0.5, TILE - 1, TILE - 1);
    }
    function drawForestTile(x, y, time) {
      ctx.save();
      ctx.fillStyle = '#1D5526';
      ctx.fillRect(x, y, TILE, TILE);
      for (var i = 0; i < 4; i++) {
        var px = x + (i % 2) * 20 + 10;
        var py = y + ((i >> 1) | 0) * 20 + 10;
        var sway = Math.sin(time * 1.6 + px * 0.05) * 1.4;
        ctx.fillStyle = '#2C7A35';
        ctx.beginPath(); ctx.arc(px + sway, py, 13, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#43A94B';
        ctx.beginPath(); ctx.arc(px + sway - 2, py - 2.5, 7, 0, Math.PI * 2); ctx.fill();
      }
      ctx.restore();
    }
    function drawBase(time) {
      var x = BASE_RECT.x, y = BASE_RECT.y;
      var cx = x + TILE / 2, cy = y + TILE / 2;
      ctx.save();
      ctx.fillStyle = '#0D1017';
      ctx.fillRect(x, y, TILE, TILE);
      var gold = baseAlive ? '#E8C04A' : '#5A5F6B';
      var dark = baseAlive ? '#8A6F1C' : '#33373F';
      if (baseAlive) {
        ctx.shadowColor = 'rgba(232,192,74,.45)';
        ctx.shadowBlur = 12 + Math.sin(time * 2) * 5;
      }
      ctx.fillStyle = dark;
      roundRect(ctx, cx - 16, cy + 9, 32, 7, 3);
      ctx.fill();
      ctx.fillStyle = gold;
      ctx.beginPath();
      ctx.moveTo(cx, cy - 14);
      ctx.lineTo(cx + 14, cy - 3);
      ctx.lineTo(cx + 9, cy + 12);
      ctx.lineTo(cx + 3, cy + 7);
      ctx.lineTo(cx, cy + 14);
      ctx.lineTo(cx - 3, cy + 7);
      ctx.lineTo(cx - 9, cy + 12);
      ctx.lineTo(cx - 14, cy - 3);
      ctx.closePath();
      ctx.fill();
      ctx.beginPath();
      ctx.arc(cx, cy - 10, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;
      ctx.fillStyle = '#0D1017';
      ctx.beginPath();
      ctx.arc(cx - 2, cy - 11, 1.2, 0, Math.PI * 2);
      ctx.arc(cx + 2, cy - 11, 1.2, 0, Math.PI * 2);
      ctx.fill();
      if (!baseAlive) {
        ctx.strokeStyle = 'rgba(200,90,50,.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(cx - 12, cy - 9); ctx.lineTo(cx + 11, cy + 11);
        ctx.moveTo(cx + 12, cy - 8); ctx.lineTo(cx - 10, cy + 9);
        ctx.stroke();
      }
      ctx.restore();
    }
    function enemyColor(e, time) {
      if (e.carrier && !e.dropped) {
        return Math.floor(time * 7.5) % 2 ? '#B53121' : '#C9D4E6';
      }
      if (e.kind !== 'armor') return '#B8C0CC';
      var flip = Math.floor(time * 60) % 2;
      if (e.hp >= 4) return flip ? '#7BC86C' : '#C9D4E6';
      if (e.hp === 3) return flip ? '#E7C94B' : '#C9D4E6';
      if (e.hp === 2) return flip ? '#E7C94B' : '#7BC86C';
      return '#C9D4E6';
    }
    function drawTank(t, time) {
      if (!t.alive) return;
      ctx.save();
      ctx.translate(tankCx(t), tankCy(t));
      if (isSpawning(t)) {
        var k = 1 - t.spawnT / (t.isPlayer ? PLAYER_SPAWN_ANIM : ENEMY_SPAWN_ANIM);
        ctx.rotate(time * 12);
        ctx.strokeStyle = 'rgba(255,255,255,' + (0.35 + 0.5 * Math.abs(Math.sin(time * 18))) + ')';
        ctx.lineWidth = 2.5;
        for (var i = 0; i < 6; i++) {
          ctx.beginPath();
          ctx.moveTo(0, 0);
          ctx.lineTo(Math.cos(i * Math.PI / 3) * (8 + k * 10), Math.sin(i * Math.PI / 3) * (8 + k * 10));
          ctx.stroke();
        }
        ctx.restore();
        return;
      }
      ctx.rotate(t.dir * Math.PI / 2);
      var body = t.isPlayer ? '#E7C94B' : enemyColor(t, time);
      var tread = t.isPlayer ? '#8A6A1F' : 'rgba(0,0,0,.45)';
      var H2 = TILE / 2;
      ctx.fillStyle = tread;
      roundRect(ctx, -H2, -H2 + 2, 9, TILE - 4, 3); ctx.fill();
      roundRect(ctx, H2 - 9, -H2 + 2, 9, TILE - 4, 3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.32)';
      var off = (t.tread % 8 + 8) % 8;
      for (var yy = -H2 + 4 - off; yy < H2 - 4; yy += 8) {
        if (yy < -H2) continue;
        ctx.fillRect(-H2 + 1, yy, 7, 2.5);
        ctx.fillRect(H2 - 8, yy, 7, 2.5);
      }
      ctx.fillStyle = body;
      roundRect(ctx, -H2 + 8, -H2 + 4, TILE - 16, TILE - 7, 4);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.38)';
      ctx.lineWidth = 1.4;
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,.16)';
      roundRect(ctx, -H2 + 9, -H2 + 5, TILE - 18, 6, 3); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,.20)';
      ctx.fillRect(-H2 + 9, H2 - 6, TILE - 18, 4);
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(0, 2, 8.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.28)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.fillStyle = body;
      roundRect(ctx, -3.2, -H2 + 1, 6.4, 19, 2); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,.28)';
      ctx.stroke();
      if (t.maxHp > 1) {
        for (var hp = 0; hp < t.maxHp; hp++) {
          ctx.fillStyle = hp < t.hp ? '#FFE27A' : 'rgba(0,0,0,.35)';
          ctx.fillRect(-9 + hp * 6, H2 - 5.5, 4, 3);
        }
      }
      ctx.restore();
      if (t.shield > 0) {
        var a = Math.min(1, t.shield / 1.2);
        ctx.save();
        ctx.translate(tankCx(t), tankCy(t));
        ctx.rotate(time * 5);
        ctx.strokeStyle = 'rgba(120,220,255,' + (0.35 + a * 0.45) + ')';
        ctx.lineWidth = 2.4;
        for (var s = 0; s < 4; s++) {
          ctx.beginPath();
          ctx.arc(0, 0, TILE * 0.62, s * Math.PI / 2, s * Math.PI / 2 + Math.PI / 3);
          ctx.stroke();
        }
        ctx.restore();
      }
    }
    function drawBullet(b) {
      if (!b.alive) return;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.rotate(b.dir * Math.PI / 2);
      ctx.fillStyle = b.isPlayer ? '#FFF3C4' : '#FFD0A8';
      roundRect(ctx, -3, -6, 6, 12, 2.5);
      ctx.fill();
      ctx.fillStyle = '#FFFFFF';
      roundRect(ctx, -1.5, -6, 3, 5, 1.5);
      ctx.fill();
      ctx.restore();
    }
    function drawExplosion(e) {
      var k = e.t / e.dur;
      var fade = Math.pow(1 - k, 1.5);
      var R = e.r * (0.35 + k * 0.85);
      ctx.save();
      ctx.translate(e.x, e.y);
      var g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, 'rgba(255,255,225,' + fade + ')');
      g.addColorStop(0.3, 'rgba(255,205,95,' + (fade * 0.96) + ')');
      g.addColorStop(0.62, 'rgba(245,120,50,' + (fade * 0.78) + ')');
      g.addColorStop(1, 'rgba(245,120,50,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, R, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = 'rgba(255,225,165,' + (fade * 0.55) + ')';
      ctx.lineWidth = 1 + 2 * fade;
      ctx.beginPath();
      ctx.arc(0, 0, R * 1.15, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,235,190,' + fade + ')';
      for (var i = 0; i < e.sparks.length; i++) {
        var s = e.sparks[i];
        var d = R * (0.6 + s.d * 0.9);
        ctx.beginPath();
        ctx.arc(Math.cos(s.a) * d, Math.sin(s.a) * d, s.s * fade, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    }
    function drawPowerUp(p, time) {
      if (!p) return;
      if (Math.floor(time * 7.5) % 2 === 0) return;   // 原版 8 帧显示 / 8 帧隐藏
      var x = p.x, y = p.y;
      ctx.save();
      ctx.fillStyle = '#0D1017';
      roundRect(ctx, x + 3, y + 3, TILE - 6, TILE - 6, 6);
      ctx.fill();
      ctx.strokeStyle = '#F0C24B';
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.fillStyle = '#F0C24B';
      var cx = x + TILE / 2, cy = y + TILE / 2;
      if (p.type === 'star') {
        ctx.beginPath();
        for (var i = 0; i < 10; i++) {
          var ang = -Math.PI / 2 + i * Math.PI / 5;
          var rad = i % 2 === 0 ? 13 : 6;
          var px = cx + Math.cos(ang) * rad, py = cy + Math.sin(ang) * rad;
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'helmet') {
        ctx.beginPath();
        ctx.arc(cx, cy + 2, 11, Math.PI, 0);
        ctx.lineTo(cx + 11, cy + 10);
        ctx.lineTo(cx - 11, cy + 10);
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'clock') {
        ctx.beginPath(); ctx.arc(cx, cy, 11, 0, Math.PI * 2); ctx.fill();
        ctx.strokeStyle = '#0D1017'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - 6);
        ctx.moveTo(cx, cy); ctx.lineTo(cx + 5, cy + 2); ctx.stroke();
      } else if (p.type === 'shovel') {
        ctx.fillRect(cx - 3, cy - 12, 6, 12);
        ctx.beginPath();
        ctx.moveTo(cx - 8, cy);
        ctx.lineTo(cx + 8, cy);
        ctx.lineTo(cx + 5, cy + 12);
        ctx.lineTo(cx - 5, cy + 12);
        ctx.closePath();
        ctx.fill();
      } else if (p.type === 'grenade') {
        ctx.beginPath(); ctx.arc(cx, cy + 3, 9, 0, Math.PI * 2); ctx.fill();
        ctx.fillRect(cx - 2, cy - 12, 4, 7);
        ctx.fillRect(cx + 2, cy - 12, 6, 3);
      } else {
        // tank：加命
        ctx.fillRect(cx - 12, cy - 6, 24, 12);
        ctx.fillRect(cx - 4, cy - 12, 8, 6);
        ctx.fillRect(cx - 1, cy - 18, 2, 8);
      }
      ctx.restore();
    }
    function drawBanner() {
      if (bannerT <= 0) return;
      ctx.save();
      ctx.fillStyle = 'rgba(5,7,11,.62)';
      ctx.fillRect(0, W / 2 - 62, W, 124);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#F0C24B';
      ctx.font = 'bold 36px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(bannerTitle, W / 2, W / 2 - 16);
      ctx.fillStyle = '#8994A8';
      ctx.font = '16px -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif';
      ctx.fillText(bannerSub, W / 2, W / 2 + 28);
      ctx.restore();
    }
    function draw(time) {
      if (!ctx) return;
      ctx.clearRect(0, 0, W, W);
      ctx.fillStyle = '#0B0E14';
      ctx.fillRect(0, 0, W, W);
      ctx.strokeStyle = 'rgba(255,255,255,.032)';
      ctx.lineWidth = 1;
      for (var i = 1; i < GRID; i++) {
        var p = i * TILE + 0.5;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, W); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(W, p); ctx.stroke();
      }
      for (var r = 0; r < GRID; r++) {
        for (var c = 0; c < GRID; c++) {
          var t = tiles[r][c];
          var x = c * TILE, y = r * TILE;
          if (t === BRICK) drawBrickTile(brickMask[r][c], x, y);
          else if (t === STEEL) drawSteelTile(steelMask[r][c], x, y);
          else if (t === WATER) drawWaterTile(x, y, time);
          else if (t === ICE) drawIceTile(x, y);
        }
      }
      drawBase(time);
      drawPowerUp(powerup, time);
      if (player) drawTank(player, time);
      for (var e = 0; e < enemies.length; e++) drawTank(enemies[e], time);
      for (var b = 0; b < bullets.length; b++) drawBullet(bullets[b]);
      for (var k = 0; k < explosions.length; k++) drawExplosion(explosions[k]);
      for (var r2 = 0; r2 < GRID; r2++) {
        for (var c2 = 0; c2 < GRID; c2++) {
          if (tiles[r2][c2] === FOREST) drawForestTile(c2 * TILE, r2 * TILE, time);
        }
      }
      drawBanner();
      ctx.strokeStyle = 'rgba(255,255,255,.06)';
      ctx.lineWidth = 2;
      ctx.strokeRect(1, 1, W - 2, W - 2);
    }

    /* ---------- HUD / 屏幕 ---------- */
    function updateHud() {
      var s = el.querySelector('#tkStage');
      if (s) s.textContent = stage;
      var sc = el.querySelector('#tkScore');
      if (sc) sc.textContent = score;
      var st = el.querySelector('#tkStar');
      if (st) st.textContent = star;
      var l = el.querySelector('#tkLives');
      if (l) l.textContent = Math.max(0, lives);
      var rem = el.querySelector('#tkLeft');
      if (rem) rem.textContent = remaining;
    }
    function setPaused(p) {
      if (mode !== 'play' || finished) return;
      paused = p;
      var ov = el.querySelector('#tkOverlay');
      if (ov) ov.classList.toggle('is-active', p);
      var btn = el.querySelector('#tkPause');
      if (btn) btn.textContent = p ? '▶ 继续' : '暂停';
      if (p) stopLoop();
      else { lastTs = 0; ensureLoop(); }
    }
    function togglePause() {
      if (mode !== 'play' || finished || pendingOver > 0) return;
      if (window.SFX && window.SFX.tap) window.SFX.tap();
      setPaused(!paused);
    }

    /* ---------- 输入 ---------- */
    var KEYMAP = {
      ArrowUp: UP, ArrowDown: DOWN, ArrowLeft: LEFT, ArrowRight: RIGHT,
      w: UP, a: LEFT, s: DOWN, d: RIGHT,
      W: UP, A: LEFT, S: DOWN, D: RIGHT
    };
    function onKeyDown(e) {
      var tag = ((e.target && e.target.tagName) || '').toLowerCase();
      if (tag === 'input' || tag === 'textarea') return;
      if (e.key === 'p' || e.key === 'P') {
        e.preventDefault();
        togglePause();
        return;
      }
      var d = KEYMAP[e.key];
      if (d !== undefined) {
        e.preventDefault();
        if (!held[d]) { held[d] = true; heldOrder.push(d); }
        moveDir = d;
        return;
      }
      if (e.key === ' ' || e.key === 'Spacebar' || e.key === 'j' || e.key === 'J') {
        e.preventDefault();
        if (!e.repeat) tryPlayerFire();
      }
    }
    function onKeyUp(e) {
      var d = KEYMAP[e.key];
      if (d !== undefined) {
        held[d] = false;
        var i = heldOrder.indexOf(d);
        if (i >= 0) heldOrder.splice(i, 1);
        moveDir = heldOrder.length ? heldOrder[heldOrder.length - 1] : null;
      }
    }
    function addKeyListeners() {
      window.addEventListener('keydown', onKeyDown);
      window.addEventListener('keyup', onKeyUp);
    }
    function removeKeyListeners() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    }
    function bindHold(btn, dir) {
      btn.addEventListener('pointerdown', function (e) {
        e.preventDefault();
        try { btn.setPointerCapture(e.pointerId); } catch (err) {}
        btn.classList.add('on');
        if (!held[dir]) { held[dir] = true; heldOrder.push(dir); }
        moveDir = dir;
      });
      function release() {
        btn.classList.remove('on');
        held[dir] = false;
        var i = heldOrder.indexOf(dir);
        if (i >= 0) heldOrder.splice(i, 1);
        moveDir = heldOrder.length ? heldOrder[heldOrder.length - 1] : null;
      }
      btn.addEventListener('pointerup', release);
      btn.addEventListener('pointercancel', release);
      btn.addEventListener('pointerleave', release);
    }
    function bindControls() {
      var dirOf = { up: UP, right: RIGHT, down: DOWN, left: LEFT };
      Array.prototype.forEach.call(el.querySelectorAll('.tk-key'), function (btn) {
        bindHold(btn, dirOf[btn.getAttribute('data-dir')]);
      });
      var fireBtn = el.querySelector('#tkFire');
      if (fireBtn) {
        fireBtn.addEventListener('pointerdown', function (e) {
          e.preventDefault();
          tryPlayerFire();
        });
      }
      // 鼠标左键 / 触屏点画布也能开火（原版点按开火，不连发）
      if (canvasEl) {
        canvasEl.addEventListener('pointerdown', function (e) {
          if (e.pointerType === 'mouse' && e.button !== 0) return;
          e.preventDefault();
          tryPlayerFire();
        });
      }
      var pauseBtn = el.querySelector('#tkPause');
      if (pauseBtn) pauseBtn.onclick = function () { togglePause(); };
      var restartBtn = el.querySelector('#tkRestart');
      if (restartBtn) restartBtn.onclick = function () {
        if (window.SFX && window.SFX.tap) window.SFX.tap();
        startGame();
      };
      var resumeBtn = el.querySelector('#tkResume');
      if (resumeBtn) resumeBtn.onclick = function () { setPaused(false); };
      var overlay = el.querySelector('#tkOverlay');
      if (overlay) overlay.onclick = function (e) {
        if (e.target === overlay && paused) setPaused(false);
      };
    }

    /* ---------- 开局 / 结算 ---------- */
    function resetState() {
      score = 0; kills = 0; stage = 1; lives = LIVES; star = 0;
      shotsFired = 0; shotsHit = 0;
      enemies = []; bullets = []; explosions = []; powerup = null;
      held = [false, false, false, false]; heldOrder = []; moveDir = null;
      pendingOver = 0; readyT = 0; clearT = 0; bannerT = 0;
      respawnT = 0; baseAlive = true; extraLife = false;
      freezeT = 0; shovelT = 0; slideT = 0;
      startStage(1);
    }
    function startGame() {
      if (overTimer) { clearTimeout(overTimer); overTimer = 0; }
      pendingResult = null;
      removeKeyListeners();
      resetState();
      mode = 'play';
      paused = false; suspended = false; finished = false;
      el.innerHTML = kit.hud(
        '<b>坦克防线 · 第 <span id="tkStage">1</span> 关</b>',
        '<span class="ms-stat">⭐ <span id="tkScore">0</span></span>' +
        '<span class="ms-stat">★ <span id="tkStar">0</span></span>' +
        '<span class="ms-stat">❤ <span id="tkLives">' + LIVES + '</span></span>' +
        '<span class="ms-stat">敌 <span id="tkLeft">' + ENEMIES_PER_STAGE + '</span></span>'
      ) +
        '<div class="tk-wrap">' +
        '<canvas id="tkCanvas" class="tk-canvas" width="' + W + '" height="' + W + '"></canvas>' +
        '<div class="tk-pad">' +
        '<div class="tk-dpad">' +
        '<button type="button" class="tk-key" data-dir="up" aria-label="向上">▲</button>' +
        '<div class="tk-dpad-mid">' +
        '<button type="button" class="tk-key" data-dir="left" aria-label="向左">◀</button>' +
        '<button type="button" class="tk-key" data-dir="down" aria-label="向下">▼</button>' +
        '<button type="button" class="tk-key" data-dir="right" aria-label="向右">▶</button>' +
        '</div></div>' +
        '<div class="tk-actions">' +
        '<button type="button" class="tk-fire" id="tkFire">开火</button>' +
        '<div class="tk-mini-row">' +
        '<button type="button" class="tk-mini" id="tkPause">暂停</button>' +
        '<button type="button" class="tk-mini" id="tkRestart">重开</button>' +
        '</div></div>' +
        '</div>' +
        '<div class="tk-overlay" id="tkOverlay"><div>⏸ 已暂停<br>' +
        '<small>按 P、点任意处或「继续」回到战场</small><br>' +
        '<button type="button" class="btn accent" id="tkResume">继续</button></div></div>' +
        '</div>';
      canvasEl = el.querySelector('#tkCanvas');
      ctx = canvasEl ? canvasEl.getContext('2d') : null;
      bindControls();
      addKeyListeners();
      updateHud();
      draw(performance.now() / 1000);
      ensureLoop();
    }
    function pickCert(v) {
      var certs = window.SM_DATA.tank.certs;
      for (var i = 0; i < certs.length; i++) {
        if (v >= certs[i].min) return certs[i];
      }
      return certs[certs.length - 1];
    }
    function finishGame() {
      if (finished) return;
      finished = true;
      mode = 'over';
      stopLoop();
      removeKeyListeners();
      var cert = pickCert(score);
      var localRank = 0;
      if (lbPanel && (kills > 0 || stage > 1)) {
        localRank = lbPanel.submit({ score: score, kills: kills, waves: stage });
      }
      var accPct = shotsFired ? Math.min(100, Math.round(shotsHit / shotsFired * 100)) : 0;
      pendingResult = {
        icon: cert.icon,
        name: cert.name,
        tag: '击毁 ' + kills + ' 辆 · 抵达第 ' + stage + ' 关',
        text: cert.text + ' 本局共开火 ' + shotsFired + ' 次、命中 ' + shotsHit + ' 次，' +
          (baseAlive ? '基地守到了最后一刻。' : '基地没能守住。'),
        big: { label: '本局总分', value: score + ' <small>分</small>' },
        bars: [
          { label: '关卡推进', pct: Math.min(100, Math.round(stage / 35 * 100)), hi: true },
          { label: '命中效率', pct: accPct },
          { label: '基地完整度', pct: baseAlive ? 100 : 0 }
        ],
        blocks: [
          {
            h: '战场战报',
            text: '坚守到第 ' + stage + ' 关，击毁敌方坦克 ' + kills + ' 辆，剩余生命 ' + Math.max(0, lives) + ' 条。' +
              (localRank ? '本局在本机战绩榜上排名第 ' + localRank + '。' : '')
          },
          {
            h: '战术复盘',
            text: '原版规则下敌人前 1/8 出生间隔只随机游走，之后才追人、再之后才冲基地。先清靠近基地的，再追远处的；砖墙是掩体也是牢笼，该轰开时别犹豫。'
          }
        ],
        quip: window.SM_DATA.tank.disclaimer,
        cert: cert.name + ' · 认证',
        detail: { type: cert.name, score: score, kills: kills, waves: stage }
      };
      overTimer = setTimeout(function () {
        overTimer = 0;
        if (destroyed || suspended || !pendingResult) return;
        var res = pendingResult;
        pendingResult = null;
        onFinish(res);
      }, 700);
    }
    function intro() {
      mode = 'intro';
      stopLoop();
      removeKeyListeners();
      el.innerHTML = kit.hud('<b>坦克防线</b>', '原版规则') +
        '<div class="rz-stage">' +
        '<div class="rz-big" style="font-size:30px">坦克防线</div>' +
        '<div class="rz-sub">守住基地，顶住一波波钢铁洪流<br>方向键 / WASD 移动 · 空格 / 鼠标左键开火 · P 暂停</div>' +
        '<div class="tk-tips">按 1985 年 NES 原版规则：13×13 战场 · 35 关 · 每关 20 辆<br>' +
        '三条命 · 吃星升级火力 · 第 4/11/18 辆带道具 · 点按开火不连发</div>' +
        '<button type="button" class="btn accent" id="tkNew" style="margin-top:18px;width:auto;padding:12px 34px">开始防守</button>' +
        '</div>';
      var btn = el.querySelector('#tkNew');
      if (btn) btn.onclick = function () {
        if (window.SFX && window.SFX.go) window.SFX.go();
        startGame();
      };
    }
    function mountLbHost() {
      kit.mountLbHostFor(lbPanel, root, el);
    }

    intro();
    mountLbHost();

    return {
      pause: function () {
        suspended = true;
        stopLoop();
        removeKeyListeners();
        if (overTimer) { clearTimeout(overTimer); overTimer = 0; }
      },
      repaint: function () {
        if (destroyed) return;
        suspended = false;
        if (pendingResult) {
          var res = pendingResult;
          pendingResult = null;
          onFinish(res);
          return;
        }
        addKeyListeners();
        if (mode === 'play' && !paused && !finished) { lastTs = 0; ensureLoop(); }
      },
      destroy: function () {
        destroyed = true;
        stopLoop();
        removeKeyListeners();
        if (overTimer) { clearTimeout(overTimer); overTimer = 0; }
        pendingResult = null;
        if (lbPanel) lbPanel.destroy();
      }
    };
  };
})();
