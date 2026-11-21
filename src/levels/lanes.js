// Pawgger lane model (ARCHITECTURE section 3): closed-form item positions, turtle/croc cycles, support tests,
// plus the fairness analysis the level generator and tools/validate-level.mjs share (section 6).
// Pure and Node-safe: no DOM, no Math.random, no integrated positions.
import { W, ROW, rowY, TUNING, TIME_LIMIT, BAY_X, BAY_TOL, START_X } from '../core/defs.js';

export const mod = (a, n) => ((a % n) + n) % n;

/** Level speed multiplier. */
export function speedMul(level) { return Math.min(TUNING.speedCap, 1 + TUNING.speedPerLevel * (level - 1)); }

/** LEFT edge of an item at level time t (seconds). */
export function itemX(lane, item, t) { return mod(item.x0 + lane.dir * lane.speed * t, lane.ring) - lane.pad; }

/** Pixels per second the lane carries a rider (signed). */
export const carryV = (lane) => lane.dir * lane.speed;

/** Lane for a screen row (road rows 8..12 are def.lanes[0..4], river rows 2..6 are def.lanes[5..9]). */
export function laneAtRow(def, row) {
  if (row >= ROW.road[0] && row <= ROW.road[4]) return def.lanes[row - ROW.road[0]];
  if (row >= ROW.river[0] && row <= ROW.river[4]) return def.lanes[5 + row - ROW.river[0]];
  return null;
}

// ---------------------------------------------------------------- turtles
const diveOf = (item) => ({ phase: 0, ...TUNING.turtleDive, ...item.dive });
function diveClock(item, t) {
  const d = diveOf(item);
  const up = d.period - d.sink - d.under - d.rise;
  let u = mod(t + d.phase, d.period);
  if (u < up) return { state: 'up', u, d, p: u / Math.max(up, 1e-9) };
  u -= up; if (u < d.sink) return { state: 'sink', u, d, p: u / d.sink };
  u -= d.sink; if (u < d.under) return { state: 'under', u, d, p: u / d.under };
  u -= d.under; return { state: 'rise', u, d, p: u / d.rise };
}
/** 'up'|'sink'|'under'|'rise'. An item without `dive` never dives (always 'up'). */
export function turtleState(item, t) { return item.dive ? diveClock(item, t).state : 'up'; }
/** True while a turtle group can hold a rider: up, rise, or the first half of sink. */
export function turtleCarries(item, t) {
  if (!item.dive) return true;
  const c = diveClock(item, t);
  return c.state === 'up' || c.state === 'rise' || (c.state === 'sink' && c.u < c.d.sink / 2);
}

// ---------------------------------------------------------------- crocs
const crocOf = (item) => ({ phase: 0, ...TUNING.crocCycle, ...item.croc });
/** 'closed'|'open'. The head is lethal while open (the last `open` seconds of each period). */
export function crocState(item, t) {
  const c = crocOf(item);
  return mod(t + c.phase, c.period) >= c.period - c.open ? 'open' : 'closed';
}
/** Croc geometry at left edge x: back = 48 px trailing end, head = 16 px leading end. */
export function crocParts(lane, item, x) {
  const hw = 16, bw = item.w - hw;
  return lane.dir > 0 ? { back: [x, x + bw], head: [x + bw, x + item.w] } : { head: [x, x + hw], back: [x + hw, x + item.w] };
}

const isTurtle = (item) => item.kind === 'turtles2' || item.kind === 'turtles3';

// ---------------------------------------------------------------- support / collision
/**
 * River support test for one item: 'back' (safe), 'head' (croc head zone: supports when crocState is
 * 'closed', lethal when 'open'; the caller decides with crocState) or null (not supported).
 */
export function supports(lane, item, t, px) {
  if (lane.kind !== 'river') return null;
  const m = TUNING.supportMargin, x = itemX(lane, item, t);
  if (item.kind === 'croc') {
    const { back, head } = crocParts(lane, item, x);
    if (px >= back[0] - m && px <= back[1] + m) return 'back';
    const out = crocState(item, t) === 'open' ? TUNING.hitHalfW : m;   // open head is hit by the player's AABB, closed head by the margin
    const inHead = lane.dir > 0 ? (px >= head[0] && px <= head[1] + out) : (px >= head[0] - out && px <= head[1]);
    return inHead ? 'head' : null;
  }
  if (isTurtle(item) && !turtleCarries(item, t)) return null;
  return px >= x - m && px <= x + item.w + m ? 'back' : null;
}
/** True when px stands on the croc head while it is open (death 'croc'). */
export const isLethalHead = (lane, item, t, px) => item.kind === 'croc' && supports(lane, item, t, px) === 'head' && crocState(item, t) === 'open';

/** Best support in a lane at (t, px): {item, part:'back'|'head'} (a back beats a head) or null. */
export function findSupport(lane, t, px) {
  let head = null;
  for (const item of lane.items) {
    const s = supports(lane, item, t, px);
    if (s === 'back') return { item, part: 'back' };
    if (s === 'head' && !head) head = { item, part: 'head' };
  }
  return head;
}

/** Collision AABB of an item: width w, 14 px tall, centred in the row. */
export function itemRect(lane, item, t) {
  return { x: itemX(lane, item, t), y: rowY(lane.row) - TUNING.itemHalfH, w: item.w, h: TUNING.itemHalfH * 2 };
}
/** Does the player AABB (centre px) overlap any road item right now? Returns the item or null. */
export function roadHit(lane, t, px, slack = 0) {
  const hw = TUNING.hitHalfW + slack;
  for (const item of lane.items) {
    const x = itemX(lane, item, t);
    if (px + hw > x && px - hw < x + item.w) return item;
  }
  return null;
}

// ---------------------------------------------------------------- render feed
/** Items on (or touching) screen at time t, for the renderer. lane/item are the def objects. */
export function visibleItems(def, t) {
  const out = [];
  for (const lane of def.lanes) {
    const y = rowY(lane.row);
    for (const item of lane.items) {
      const x = itemX(lane, item, t);
      if (x + item.w <= 0 || x >= W) continue;
      let state = null, frame = 0;
      if (isTurtle(item)) {
        if (item.dive) {
          const c = diveClock(item, t); state = c.state;
          frame = state === 'up' ? Math.floor(t * 2 + item.id) % 2 : state === 'under' ? Math.floor(t * 2 + item.id) % 2
            : Math.min(2, Math.floor(c.p * 3));
          if (state === 'rise') frame = 2 - Math.min(2, Math.floor(c.p * 3));
        } else { state = 'up'; frame = Math.floor(t * 2 + item.id) % 2; }
      } else if (item.kind === 'croc') { state = crocState(item, t); frame = Math.floor(t * 2 + item.id) % 2; }
      else if (item.kind === 'roller') frame = Math.floor((x + lane.ring) / 4) % 4;
      else if (lane.kind === 'road') frame = Math.floor(t * 8 + item.id) % 2;
      out.push({ lane, item, row: lane.row, kind: item.kind, x, y, w: item.w, dir: lane.dir, state, frame });
    }
  }
  return out;
}

// ================================================================ fairness analysis (section 6)
const HOP = TUNING.hopTime;
/** Smallest road gap (px) a rider can use: wait, land, hop out again (2 hops in the lane) at the lane speed, plus slack. */
export const minRoadGap = (speed) => Math.ceil(2 * TUNING.hitHalfW + 2 + speed * 3 * HOP);

/** Gaps (px) between consecutive items around the ring of a lane. */
export function ringGaps(lane) {
  const s = [...lane.items].sort((a, b) => a.x0 - b.x0);
  if (s.length === 1) return [lane.ring - s[0].w];
  return s.map((it, i) => mod(s[(i + 1) % s.length].x0 - it.x0, lane.ring) - it.w);
}

/** (a) every gap in a road lane is crossable. Returns {ok, min, max, need}. */
export function checkRoadLane(lane) {
  const g = ringGaps(lane), need = minRoadGap(lane.speed);
  return { ok: g.length > 0 && Math.max(...g) >= need && Math.min(...g) >= need, min: Math.min(...g), max: Math.max(...g), need };
}

/** (c) a river lane always has at least one carrying platform. Returns {ok, worst} (worst = min carriers seen). */
export function checkRiverCover(lane, horizon = 120, dt = 0.05) {
  let worst = Infinity;
  for (let t = 0; t < horizon; t += dt) {
    let n = 0;
    for (const it of lane.items) if (!isTurtle(it) || turtleCarries(it, t)) n++;
    if (n < worst) worst = n;
  }
  return { ok: worst >= 1, worst };
}

/** Conservative carrying zone [l, r] of an item (croc: back only; includes the support margin), or null. */
function zone(lane, item, t, shrink = 0) {
  const m = TUNING.supportMargin - shrink, x = itemX(lane, item, t);
  if (isTurtle(item) && !turtleCarries(item, t)) return null;
  if (item.kind === 'croc') { const b = crocParts(lane, item, x).back; return [b[0] - m, b[1] + m]; }
  return [x - m, x + item.w + m];
}
function zones(lane, t) { const z = []; for (const it of lane.items) { const q = zone(lane, it, t); if (q) z.push(q); } return z; }

/**
 * (b) adjacent river lanes A (rider is on it) -> B (hop target, one lane nearer the bays): fraction of time and the longest
 * continuous window (s) in which a rider can hop up (x kept) or up-and-sideways (+-16 px), landing on a carrying platform.
 */
export function riverPairWindow(A, B, horizon = 40, dt = 0.05) {
  let hits = 0, run = 0, best = 0, n = 0;
  for (let t = 0; t < horizon; t += dt, n++) {
    const za = zones(A, t), zb = zones(B, t + HOP);
    let ok = false;
    for (const a of za) {
      for (const b of zb) for (const dx of [0, -16, 16]) {
        const lo = Math.max(a[0], b[0] - dx, 0), hi = Math.min(a[1], b[1] - dx, W);
        if (hi - lo >= 1) { ok = true; break; }
      }
      if (ok) break;
    }
    if (ok) { hits++; run += dt; if (run > best) best = run; } else run = 0;
  }
  return { frac: hits / n, longest: best, ok: best >= 0.3 };
}

/**
 * (d) Route BFS over (row, time, x) with the same closed forms. Time quantum = hopTime / 2; a hop takes 2 quanta, waiting
 * carries a rider with the lane. Start at row 13, x = START_X at level time t0, goal = hop from row 2 into a bay within BAY_TOL.
 * Returns {ok, time (s until the bay), path?:[{t,row,x}]}.
 */
export function findRoute(def, { t0 = 0, limit = TIME_LIMIT * 0.8, path = false, bay = -1, all = false } = {}) {
  const q = HOP / 2, K = Math.floor(limit / q), NS = W + 1, FIRST = ROW.river[0], START = 13;
  const lanes = []; for (let r = 0; r <= 15; r++) lanes[r] = laneAtRow(def, r);
  const landX = (x) => x >= TUNING.hopMaxX - 1e-6 && x <= TUNING.hopMaxXR + 1e-6;
  const isRoad = (r) => lanes[r] && lanes[r].kind === 'road';
  const zcache = new Map();
  const safe = (row, k, x) => {
    const t = t0 + k * q, lane = lanes[row];
    if (!lane) return landX(x);                                    // median / start strip
    if (lane.kind === 'road') {
      if (!landX(x)) return false;
      const ck = row * 1048576 + k; let m = zcache.get(ck); if (!m) { m = new Int8Array(NS); zcache.set(ck, m); }
      const xi = Math.round(x);                                      // x is integral in every route state (START_X +- 16 steps)
      if (xi === x) { if (!m[xi]) m[xi] = roadHit(lane, t, x, 1) ? 2 : 1; return m[xi] === 1; }
      return !roadHit(lane, t, x, 1);
    }
    if (x < 0 || x > W) return false;
    const ck = row * 1048576 + k; let zs = zcache.get(ck);          // carrying zones of this (row, time) computed once, not per x
    if (!zs) { zs = []; for (const it of lane.items) { const z = zone(lane, it, t, 1); if (z) zs.push(z); } zcache.set(ck, zs); }
    for (const z of zs) if (x >= z[0] && x <= z[1]) return true;
    return false;
  };
  const layers = new Map();
  const L = (k) => { let l = layers.get(k); if (!l) { l = { x: Array.from({ length: 14 }, () => new Float32Array(NS).fill(NaN)), par: new Int32Array(14 * NS).fill(-1), list: [] }; layers.set(k, l); } return l; };
  const put = (k, row, x, from) => {
    const l = L(k), s = Math.round(x); if (s < 0 || s > W || !Number.isNaN(l.x[row][s])) return;
    l.x[row][s] = x; l.par[row * NS + s] = from; l.list.push(row * NS + s);
  };
  const enc = (k, row, s) => (k * 14 + row) * NS + s;
  const near = (x) => (bay >= 0 ? [BAY_X[bay]] : BAY_X).some((c) => Math.abs(x - c) <= BAY_TOL);
  put(0, START, START_X, -2);
  const got = new Set();
  for (let k = 0; k <= K; k++) {
    const cur = layers.get(k); if (!cur) continue;
    if (!path) layers.delete(k - 3);
    for (const idx of cur.list) {
      const row = Math.floor(idx / NS), s = idx % NS, x = cur.x[row][s];
      const from = enc(k, row, s), lane = lanes[row];
      if (k + 1 <= K) { const nx = lane && lane.kind === 'river' ? x + carryV(lane) * q : x; if (safe(row, k + 1, nx)) put(k + 1, row, nx, from); }
      if (k + 2 > K) continue;
      if (all && row === FIRST) {                                   // collect every bay reachable (no early return until all 5)
        BAY_X.forEach((c, i) => { if (Math.abs(x - c) <= BAY_TOL) got.add(i); });
        if (got.size === BAY_X.length) return { ok: true, time: (k + 2) * q, bays: got };
      } else if (row === FIRST && near(x)) {
        const out = { ok: true, time: (k + 2) * q };
        if (path) {
          const pts = [{ t: t0 + (k + 2) * q, row: 1, x }]; let id = from, kk = k;
          while (id >= 0) {
            const idx = id % (14 * NS), rr = Math.floor(idx / NS), ss = idx % NS; kk = Math.floor(id / (14 * NS));
            pts.push({ t: t0 + kk * q, row: rr, x: layers.get(kk).x[rr][ss] }); id = layers.get(kk).par[idx];
          }
          out.path = pts.reverse();
        }
        return out;
      }
      const dest = [];
      if (row > FIRST) dest.push([row - 1, x]);
      if (row < START) dest.push([row + 1, x]);
      const [lo, hi] = isRoad(row) || !lane ? [TUNING.hopMaxX, TUNING.hopMaxXR] : [0, W];
      for (const dx of [-16, 16]) if (x + dx >= lo && x + dx <= hi) dest.push([row, x + dx]);
      for (const [r2, x2] of dest) {
        if (isRoad(r2) && !safe(r2, k + 1, x2)) continue;
        if (isRoad(row) && !safe(row, k + 1, x)) continue;
        if (safe(r2, k + 2, x2)) put(k + 2, r2, x2, from);
      }
    }
  }
  return all ? { ok: got.size === BAY_X.length, time: Infinity, bays: got } : { ok: false, time: Infinity };
}

/** Run every check on a levelDef. Returns {ok, failures:[string], stats}. */
export const BAY_OFFSETS = [0, 9.7, 19.3, 47.1];   // start times: first ~20 s of level time, then a mid-level window
const BAY_PROVEN = new WeakSet();   // defs levelDef already proved per-bay reachable (identity only: clones/mutated copies are re-checked)
export const markBayProven = (def) => { BAY_PROVEN.add(def); return def; };
export function analyzeDef(def, { offsets = [0, 5.3, 11.7, 17.9], bayOffsets = BAY_OFFSETS, fresh = false } = {}) {
  const failures = [];
  const stats = { road: [], river: [], pairs: [], routes: [] };
  for (const lane of def.lanes) {
    if (lane.kind === 'road') {
      const r = checkRoadLane(lane); stats.road.push({ row: lane.row, ...r });
      if (!r.ok) failures.push(`road row ${lane.row}: gap ${r.min}..${r.max} < need ${r.need}`);
    } else {
      const c = checkRiverCover(lane); stats.river.push({ row: lane.row, ...c });
      if (!c.ok) failures.push(`river row ${lane.row}: no carrier at some time`);
    }
  }
  for (let r = ROW.river[0] + 1; r <= ROW.river[4]; r++) {      // A = row r (lower on screen), B = row r-1
    const w = riverPairWindow(laneAtRow(def, r), laneAtRow(def, r - 1)); stats.pairs.push({ from: r, to: r - 1, ...w });
    if (!w.ok) failures.push(`river pair ${r}->${r - 1}: longest hop window ${w.longest.toFixed(2)} s`);
  }
  for (const t0 of offsets) {
    const r = findRoute(def, { t0 }); stats.routes.push({ t0, ok: r.ok, time: r.time });
    if (!r.ok) failures.push(`no route to a bay starting at t0=${t0}`);
  }
  stats.bays = [];
  if (!fresh && BAY_PROVEN.has(def)) bayOffsets = [];            // proven by levelDef's identical check; pass {fresh:true} to force
  for (const t0 of bayOffsets) {                                  // every bay reachable from every sampled start time
    const r = findRoute(def, { t0, all: true }); stats.bays.push({ t0, ok: r.ok, reached: [...r.bays] });
    let bad = false;
    for (let b = 0; b < BAY_X.length; b++) if (!r.bays.has(b)) { bad = true; failures.push(`bay ${b} unreachable starting at t0=${t0}`); }
    if (bad) break;
  }
  return { ok: failures.length === 0, failures, stats };
}
