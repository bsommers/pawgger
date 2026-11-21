// Autopilot for Pawgger: A* over hop macros using the closed-form lane functions (no sim cloning).
// createBot({skill, seed}) -> {decide(g) -> {hop?, start?}, reset(), stats}
// The planner mirrors game.js step order exactly (cmd -> t += DT -> hop progress/landing -> carry -> collisions).
// skill 1 = perfect play (tight plan, no mistakes). Lower skill = reaction delay, thinner margins, rare misclicks.
import { TUNING, ROW, rowY, W, CELL, BAY_TOL, TIME_LIMIT, START_ROW } from '../core/defs.js';
import { findSupport, crocState, itemX } from '../levels/lanes.js';
import { createRng } from '../core/rng.js';

const DT = 1 / 60;
const HK = Math.ceil(TUNING.hopTime / DT - 1e-9);   // steps a hop takes (8)
const UNIT = 4;                                      // wait quantum in ticks (HK is a multiple)
const HOP_DIRS = ['up', 'left', 'right', 'down'];
const ROAD_ROWS = ROW.road;
const BAY_SAFE_X = BAY_TOL - 1;

/** Build the read-only predictive world (Pete path, cheese, bays) for one planning call. */
function snapshot(g, slack) {
  const n0 = Math.round(g.t / DT);
  const w = { g, n0, t0: g.t, slack, lanes: g.lanesByRow, bays: g.bays || [], extras: (g.extra || []).filter((e) => e.kind === 'cheese') };
  // Pete patrol position per tick (mirrors pete.js tickPatrol).
  w.peteX = null; w.throws = [];
  const p = g.pete;
  if (p && p.mode === 'patrol') {
    const X_LO = 14, X_HI = W - 14;
    const speed = TUNING.peteSpeed * (g.level?.speedMul || 1);
    const N = 60 * 40;
    const xs = new Float32Array(N + 1);
    let x = p.x, dir = p.dir, pause = p.pauseT || 0;
    xs[0] = x;
    for (let i = 1; i <= N; i++) {
      if (pause > 0) pause -= DT;
      else { x += dir * speed * DT; if (x <= X_LO) { x = X_LO; dir = 1; pause = 0.6; } else if (x >= X_HI) { x = X_HI; dir = -1; pause = 0.6; } }
      xs[i] = x;
    }
    w.peteX = xs;
    if (p.throws) for (let k = 0; k < 8; k++) w.throws.push(Math.round((p.throwT + k * p.cheeseEvery) / DT));
  }
  return w;
}

const peteXAt = (w, off) => (off >= 0 && off < w.peteX.length ? w.peteX[off] : w.peteX[w.peteX.length - 1]);

/** Road/Pete/cheese collision at absolute tick n for player centre (px, py). */
function roadDead(w, n, px, py) {
  const t = w.t0 + (n - w.n0) * DT, s = w.slack;
  const hw = TUNING.hitHalfW + s, hh = TUNING.hitHalfH + TUNING.itemHalfH;
  for (let i = 0; i < ROAD_ROWS.length; i++) {
    const lane = w.lanes[ROAD_ROWS[i]];
    if (!lane || Math.abs(py - rowY(lane.row)) >= hh + s * 0.5) continue;
    for (const item of lane.items) {
      const x = itemX(lane, item, t);
      if (px + hw > x && px - hw < x + item.w) return true;
    }
  }
  const off = n - w.n0;
  if (w.peteX && Math.abs(py - rowY(ROW.median)) < hh + s * 0.5) {
    const pxx = peteXAt(w, off);
    if (px + hw > pxx - TUNING.peteHalfW && px - hw < pxx + TUNING.peteHalfW) return true;
  }
  for (const e of w.extras) {
    if (Math.abs(py - rowY(e.row)) >= hh + s * 0.5) continue;
    const ex = e.x + e.vx * (t - w.t0);
    if (px + hw > ex && px - hw < ex + e.w) return true;
  }
  if (w.peteX && w.throws.length && py > rowY(ROW.median) + 8 && py < rowY(START_ROW) - 8) {
    // a cheese wheel spawns on a random road row at Pete's x: stay out of his column around throw time
    for (const th of w.throws) {
      if (off >= th - 6 && off <= th + 36 && Math.abs(px - peteXAt(w, th)) < 26) return true;
    }
  }
  return false;
}

/** River check at absolute tick n at x (row is a river row). True = dead. */
function riverDead(w, n, row, px) {
  if (px < 0 || px > W) return true;
  const lane = w.lanes[row];
  if (!lane) return true;
  const t = w.t0 + (n - w.n0) * DT, s = w.slack;
  for (const item of lane.items) {
    if (!item.croc || crocState(item, t) !== 'open') continue;
    const left = itemX(lane, item, t);
    const hx = lane.dir > 0 ? left + item.w - 16 : left;
    if (px + TUNING.hitHalfW + s > hx && px - TUNING.hitHalfW - s < hx + 16) return true;
  }
  if (!findSupport(lane, t, px)) return true;
  if (s > 0 && (!findSupport(lane, t, px - s) || !findSupport(lane, t, px + s))) return true;
  return false;
}

/** Advance one idle step. Returns new x or null if dead. */
function waitTick(w, n, row, x) {
  // state at tick n -> tick n+1 ; riding carry applied on river rows
  const n1 = n + 1;
  const isRiver = row >= ROW.river[0] && row <= ROW.river[4];
  if (isRiver) {
    const lane = w.lanes[row];
    x += lane.dir * lane.speed * DT;
    if (riverDead(w, n1, row, x)) return null;
  }
  if (roadDead(w, n1, x, rowY(row))) return null;
  return x;
}

/** Simulate a hop from (row,x) at tick n (cmd issued at step n+1). Returns {row,x,n} or null if dead/blocked. */
function simHop(w, n, row, x, dir) {
  let tr = row, tx = x;
  if (dir === 'up') { if (row <= ROW.home) return null; tr = row - 1; }
  else if (dir === 'down') { if (row >= START_ROW) return null; tr = row + 1; }
  else {
    tx = x + (dir === 'left' ? -CELL : CELL);
    if (!(row >= ROW.river[0] && row <= ROW.river[4])) tx = Math.max(TUNING.hopMaxX, Math.min(TUNING.hopMaxXR, tx));
    if (tx === x) return null;
  }
  const fy = rowY(row), ty = rowY(tr);
  for (let k = 1; k < HK; k++) {
    const f = Math.min(1, (k * DT) / TUNING.hopTime);
    if (roadDead(w, n + k, x + (tx - x) * f, fy + (ty - fy) * f)) return null;
  }
  const nl = n + HK;
  if (roadDead(w, nl, tx, ty)) return null;
  if (tr === ROW.home) return { row: tr, x: tx, n: nl, goal: bayOk(w, nl, tx) };
  if (tr >= ROW.river[0] && tr <= ROW.river[4]) {
    if (riverDead(w, nl, tr, tx)) return null;
    const lane = w.lanes[tr];
    tx += lane.dir * lane.speed * DT;                 // carry applied in the landing step
    if (riverDead(w, nl, tr, tx)) return null;
  }
  return { row: tr, x: tx, n: nl, goal: false };
}

function bayOk(w, n, x) {
  let best = -1, bd = Infinity;
  w.bays.forEach((b, i) => { const d = Math.abs(x - b.cx); if (d < bd) { bd = d; best = i; } });
  if (best < 0 || bd > BAY_SAFE_X - w.slack * 0.5) return false;
  const b = w.bays[best];
  if (b.filled) return false;
  if (b.hazard) {
    const { period, open } = TUNING.bayHazardCycle;
    const ph = ((b._phase ?? 0) + (n - w.n0) * DT) % period;
    const m = 0.1 + w.slack * 0.1;
    if (ph < open + m || ph > period - m) return false;
  }
  return true;
}

/** A* over (row, x, tick). Returns {path:[{n,dir}], goal:boolean, bestRow}. */
export function plan(g, slack, maxNodes = 150000) {
  const w = snapshot(g, slack);
  const p = g.player;
  const horizonTicks = Math.max(0, Math.floor((g.timeLeft - 0.15) / DT));
  const maxU = Math.floor(horizonTicks / UNIT);
  const rowA = [p.row], xA = [p.x], uA = [0], par = [-1], actA = [null];
  const seen = new Set();
  const key = (u, row, x) => ((u * 16 + row) * 256) + Math.round(x / 2);
  seen.add(key(0, p.row, p.x));
  const buckets = new Map();
  const push = (f, id) => { let b = buckets.get(f); if (!b) buckets.set(f, b = []); b.push(id); };
  const h = (row) => Math.max(0, row - 1) * (HK / UNIT);
  push(h(p.row), 0);
  let bestId = 0, goalId = -1, goalHop = null, expanded = 0;
  const fmax = maxU + h(START_ROW) + 4;
  for (let f = h(p.row); f <= fmax && goalId < 0; f++) {
    const b = buckets.get(f);
    if (!b) continue;
    for (let bi = 0; bi < b.length; bi++) {
      const id = b[bi];
      const row = rowA[id], x = xA[id], u = uA[id], n = w.n0 + u * UNIT;
      if (++expanded > maxNodes) { f = fmax + 1; break; }
      // progress tracking for fallback
      if (row < rowA[bestId] || (row === rowA[bestId] && u < uA[bestId])) bestId = id;
      // wait one quantum
      if (u + 1 <= maxU) {
        let xx = x, ok = true;
        for (let k = 0; k < UNIT; k++) { xx = waitTick(w, n + k, row, xx); if (xx === null) { ok = false; break; } }
        if (ok) {
          const kk = key(u + 1, row, xx);
          if (!seen.has(kk)) { seen.add(kk); rowA.push(row); xA.push(xx); uA.push(u + 1); par.push(id); actA.push('wait'); push(u + 1 + h(row), rowA.length - 1); }
        }
      }
      // hops
      if (u + HK / UNIT <= maxU) {
        for (let di = 0; di < 4; di++) {
          const dir = HOP_DIRS[di];
          const r = simHop(w, n, row, x, dir);
          if (!r) continue;
          if (r.row === ROW.home) {
            if (r.goal) { goalId = rowA.length; rowA.push(r.row); xA.push(r.x); uA.push(u + HK / UNIT); par.push(id); actA.push(dir); goalHop = r; break; }
            continue;
          }
          const nu = u + HK / UNIT;
          const kk = key(nu, r.row, r.x);
          if (seen.has(kk)) continue;
          seen.add(kk);
          rowA.push(r.row); xA.push(r.x); uA.push(nu); par.push(id); actA.push(dir);
          push(nu + h(r.row), rowA.length - 1);
        }
      }
      if (goalId >= 0) break;
    }
  }
  const end = goalId >= 0 ? goalId : bestId;
  const path = [];
  for (let id = end; par[id] >= 0; id = par[id]) {
    if (actA[id] !== 'wait') path.push({ n: w.n0 + uA[par[id]] * UNIT, dir: actA[id], row: rowA[par[id]], x: xA[par[id]], toX: xA[id], toRow: rowA[id] });
  }
  path.reverse();
  const maxX = new Array(16).fill(-1);
  for (let i = 0; i < rowA.length; i++) if (xA[i] > maxX[rowA[i]]) maxX[rowA[i]] = xA[i];
  return { path, goal: goalId >= 0, bestRow: rowA[end], expanded, maxX };
}

export function createBot(opts = {}) {
  const skill = Math.max(0.05, Math.min(1, opts.skill ?? 1));
  const rng = createRng(opts.seed ?? 7);
  const bot = {
    skill,
    stats: { plans: 0, replans: 0, noRoute: 0, fallbacks: 0, watchdog: 0, expanded: 0 },
    path: null, idx: 0, extraCount: 0, levelKey: null, lastProgressT: 0, bestRow: 99, bayCount: 0, desperate: false, lastPlanTick: -1, noRouteStreak: 0, waitUntil: 0,
    reset() { this.path = null; this.idx = 0; this.lastProgressT = 0; this.bestRow = 99; this.bayCount = 0; this.desperate = false; this.noRouteStreak = 0; this.waitUntil = 0; },
    decide(g) {
      if (g.state === 'title' || g.state === 'gameover') return g.state === 'title' ? { start: true } : {};
      if (g.state !== 'play') { this.path = null; return {}; }
      const p = g.player;
      if (p.mode === 'home' || p.hop || p.mode === 'dead') return {};
      const lk = g.levelNum + ':' + (g.player.row === START_ROW && g.timeLeft > TIME_LIMIT - 0.05 ? 'r' : '');
      const filled = (g.bays || []).reduce((a, b) => a + (b.filled ? 1 : 0), 0);
      const nowTick = Math.round(g.t / DT);
      if (g.levelNum !== this.levelKey) { this.levelKey = g.levelNum; this.path = null; this.lastProgressT = g.t; this.bestRow = 99; this.bayCount = filled; this.desperate = false; }
      if (filled !== this.bayCount) { this.bayCount = filled; this.path = null; this.lastProgressT = g.t; this.bestRow = 99; }
      if (g.timeLeft > TIME_LIMIT - 0.05) { this.path = null; this.bestRow = 99; this.lastProgressT = g.t; }
      if (p.row < this.bestRow) { this.bestRow = p.row; this.lastProgressT = g.t; }
      // watchdog: no progress for a long time -> drop caution
      if (g.t - this.lastProgressT > 10 && !this.desperate) { this.desperate = true; this.stats.watchdog++; this.path = null; }
      const ec = (g.extra || []).length;
      if (ec !== this.extraCount) { this.extraCount = ec; if (ec > 0) this.path = null; }
      // validate current plan
      let step = this.path && this.path[this.idx];
      if (step && nowTick > step.n) { this.path = null; step = null; }
      if (step && (Math.abs(p.x - step.x) > 3 || p.row !== step.row)) { this.path = null; step = null; }
      if (!step && this.waitUntil > nowTick) return {};
      if (!step) {
        const slack = this.desperate ? 0 : 1 + (1 - skill) * 1.5;
        let r = plan(g, slack);
        this.stats.plans++; this.stats.expanded += r.expanded;
        if (!r.goal && slack > 0) r = plan(g, 0);
        if (!r.goal) {
          this.stats.noRoute++;
          // on a safe land row with no route to any open bay: hold position and re-check shortly (routes open and close with lane phase)
          if (p.row === START_ROW || p.row === ROW.median) { this.waitUntil = nowTick + 90; return {}; }
          // keep the best-progress partial path; if there is none, fall back to a greedy safe hop
          if (!r.path.length) return this.greedy(g);
        }
        this.path = r.path; this.idx = 0; step = this.path[0];
        if (!step) return {};
      }
      if (nowTick < step.n) return {};
      // human-like hesitation / mistakes
      if (skill < 1) {
        if (rng.chance((1 - skill) * 0.12)) { this.path = null; return {}; }
        if (rng.chance((1 - skill) * 0.03)) { this.path = null; return { hop: rng.pick(HOP_DIRS) }; }
      }
      this.idx++;
      // after this hop the next planned hop's expected start state is verified in the validation above
      return { hop: step.dir };
    },
    greedy(g) {
      this.stats.fallbacks++;
      const w = snapshot(g, 0), p = g.player, n = w.n0;
      for (const dir of HOP_DIRS) { const r = simHop(w, n, p.row, p.x, dir); if (r && (r.row !== ROW.home || r.goal)) return { hop: dir }; }
      if (p.row !== ROW.river[0]) return { hop: 'up' };
      return {};
      return { hop: 'up' };
    },
  };
  return bot;
}
