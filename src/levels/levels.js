// Pawgger level generator (ARCHITECTURE section 6): levelDef(level, seed) is deterministic in (level, seed) and
// self-validating (fairness checks from lanes.js; it re-rolls its own sub-seed until a level is provably playable).
import { W, ROW, TUNING, THEMES, BAY_X, BAY_COUNT, ITEM_KINDS } from '../core/defs.js';
import { createRng } from '../core/rng.js';
import { speedMul, mod, minRoadGap, analyzeDef, markBayProven, BAY_OFFSETS } from './lanes.js';

export { speedMul };
export { itemX, turtleState, crocState, supports, itemRect, visibleItems, laneAtRow, findSupport } from './lanes.js';

const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const MAX_ATTEMPTS = 60;
/** Mix (level, seed, attempt) into one well-spread 32-bit seed. */
function mixSeed(level, seed, attempt) {
  let h = Math.imul((seed | 0) ^ 0x9e3779b9, 0x85ebca6b) ^ Math.imul(level + 1, 0xc2b2ae35) ^ Math.imul(attempt + 7, 0x27d4eb2f);
  h ^= h >>> 15; h = Math.imul(h, 0x2c1b3c6d); h ^= h >>> 12; return h >>> 0;
}
function shuffle(rng, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = rng.int(0, i); [a[i], a[j]] = [a[j], a[i]]; } return a; }
function weighted(rng, entries) {
  const tot = entries.reduce((s, e) => s + e[1], 0); let r = rng.next() * tot;
  for (const [v, w] of entries) { r -= w; if (r < 0) return v; }
  return entries[entries.length - 1][0];
}

/** Lay items round a ring: raw = [{kind, gap}] (gap = space after the item). Pads the last gap so ring >= W + pad. */
function ringFrom(rng, raw) {
  const pad = Math.max(...raw.map((r) => ITEM_KINDS[r.kind].w));
  let total = raw.reduce((s, r) => s + ITEM_KINDS[r.kind].w + r.gap, 0);
  if (total < W + pad) { raw[raw.length - 1].gap += W + pad - total; total = W + pad; }
  const off = rng.int(0, total - 1); let cum = 0;
  const items = raw.map((r, id) => {
    const w = ITEM_KINDS[r.kind].w, item = { id, kind: r.kind, w, x0: mod(off + cum, total) };
    cum += w + r.gap; return item;
  });
  return { items, ring: total, pad };
}
/** Grow raw items (kind from pick(i), gap from gap(kind, i)) until the ring is long enough, min 2 items. */
function growRaw(pick, gap, minItems = 2) {
  const raw = []; let total = 0, maxW = 0;
  while (raw.length < 40) {
    const kind = pick(raw.length), w = ITEM_KINDS[kind].w;
    raw.push({ kind, gap: Math.round(gap(kind, raw.length)) }); total += w + raw[raw.length - 1].gap; maxW = Math.max(maxW, w);
    if (raw.length >= minItems && total >= W + maxW) break;
  }
  return raw;
}

// ---------------------------------------------------------------- road
const FAMILIES = {
  cars:    { kinds: ['car', 'car', 'car', 'bike'], speed: 1 },
  mix:     { kinds: ['car', 'truck', 'bike', 'dozer', 'car'], speed: 1 },
  trucks:  { kinds: ['truck', 'bus', 'dozer', 'truck'], speed: 0.9 },
  racers:  { kinds: ['racer', 'car', 'racer', 'bike'], speed: 1.15 },
  rollers: { kinds: ['roller'], speed: 1.25 },
  limo:    { kinds: ['limo', 'limo', 'car', 'limo'], speed: 0.85 },
};
function pickFamilies(rng, level) {
  const out = []; let limo = 0, roller = 0, racer = 0;
  for (let i = 0; i < 5; i++) {
    const opts = [['cars', 3], ['mix', 3], ['trucks', 2.5]];
    if (level >= 3 && racer < 2) opts.push(['racers', 2]);
    if (level >= 4 && roller < 1) opts.push(['rollers', 2]);
    if (level >= 4 && limo < 1) opts.push(['limo', 3]);
    const f = i === 0 ? weighted(rng, opts.filter((o) => o[0] !== 'racers' && o[0] !== 'rollers')) : weighted(rng, opts);
    if (f === 'limo') limo++; if (f === 'rollers') roller++; if (f === 'racers') racer++;
    out.push(f);
  }
  if (level >= 4 && limo === 0) out[rng.int(1, 4)] = 'limo';        // set piece: the limo lane
  return out;
}
function roadSpeeds(rng, sm) {
  const base = TUNING.baseRoadSpeed;
  for (let tries = 0; tries < 50; tries++) {
    const perm = shuffle(rng, base);
    const order = perm.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map((e) => e[1]);
    if (!(order.includes(0) && order.includes(4))) return perm.map((v) => v * sm);   // rows 8 and 12 never both fastest
  }
  return base.map((v) => v * sm);
}
function buildRoad(rng, level, t, i, family, speed, rest) {
  const fam = FAMILIES[family], sp = Math.round(speed * fam.speed * rng.range(0.92, 1.08) * 10) / 10;
  const need = minRoadGap(sp);
  const lo = need + Math.round(lerp(44, 4, t) * (rest ? 1.5 : 1)), hi = lo + Math.round(lerp(80, 28, t) * (rest ? 1.4 : 1));
  const raw = growRaw((n) => fam.kinds[rng.int(0, fam.kinds.length - 1)], () => rng.range(lo, hi));
  return { row: ROW.road[i], kind: 'road', family, speed: sp, ...ringFrom(rng, raw) };
}

// ---------------------------------------------------------------- river
function buildRiver(rng, level, t, j, type, speed, dirTurtleDive) {
  const sp = Math.round(speed * rng.range(0.92, 1.1) * 10) / 10;
  const cover = clamp(lerp(0.62, 0.4, t) + (type === 'train' ? 0.3 : 0), 0.3, 0.9);
  const mean = (w) => (w * (1 - cover)) / cover;
  const gapOf = (w) => clamp(mean(w) * rng.range(0.7, 1.3), 18, 150);
  let pick, gap = (k) => gapOf(ITEM_KINDS[k].w), raw;
  if (type === 'logL') pick = () => weighted(rng, [['log_l', 3], ['log_m', 2]]);
  else if (type === 'logM') pick = () => weighted(rng, [['log_m', 3], ['log_s', 1.5 + 3 * t]]);
  else if (type === 'logS') pick = () => weighted(rng, [['log_s', 3], ['log_m', 1]]);
  else if (type === 'turtle') pick = () => weighted(rng, [['turtles2', 2 + 2 * t], ['turtles3', 3]]);
  else if (type === 'chain') { pick = () => weighted(rng, [['turtles2', 1], ['turtles3', 2]]); gap = () => rng.int(0, 10); }
  else if (type === 'croc') { pick = (n) => (n % 2 === 0 ? 'croc' : 'log_s'); gap = (k) => gapOf(ITEM_KINDS[k].w) * 0.9; }
  if (type === 'train') {
    const n = rng.int(3, 4), base = [];
    for (let i = 0; i < n; i++) base.push({ kind: weighted(rng, [['log_m', 2], ['log_s', 1]]), gap: i < n - 1 ? rng.int(4, 12) : rng.int(52, 90) });
    raw = base;
  } else raw = growRaw(pick, gap, type === 'croc' ? 4 : 2);
  const ring = ringFrom(rng, raw);
  const items = ring.items;
  const lane = { row: ROW.river[j], kind: 'river', family: type, speed: sp, ...ring };
  const tur = items.filter((it) => it.kind.startsWith('turtles'));
  if (tur.length >= 2 && dirTurtleDive) {                                   // staggered dive phases: never all under at once
    const td = TUNING.turtleDive, period = Math.round(td.period * rng.range(0.9, 1.15) * 10) / 10;
    const under = Math.round(td.under * (1 + 0.25 * t) * 10) / 10, off = rng.range(0, period);
    tur.forEach((it, i) => { it.dive = { phase: Math.round(mod(off + (i * period) / tur.length, period) * 100) / 100, period, sink: td.sink, under, rise: td.rise }; });
  }
  const crocs = items.filter((it) => it.kind === 'croc');
  if (crocs.length) {
    const cc = TUNING.crocCycle, period = Math.round(cc.period * rng.range(0.9, 1.1) * 10) / 10, open = Math.round(cc.open * lerp(1, 1.3, t) * 10) / 10, off = rng.range(0, period);
    crocs.forEach((it, i) => { it.croc = { phase: Math.round(mod(off + (i * period) / crocs.length, period) * 100) / 100, period, open }; });
  }
  return lane;
}
function pickRiverTypes(rng, level, t, pieces) {
  const types = [];
  if (level === 1) { for (let j = 0; j < 5; j++) types.push(j % 2 === 0 ? 'logL' : 'logM'); }
  else {
    let crocLanes = 0; const maxCroc = level >= 10 ? 2 : 1;
    for (let j = 0; j < 5; j++) {
      const opts = [['logL', 3 * (1 - t) + 0.5], ['logM', 2.5], ['logS', 0.5 + 2 * t], ['turtle', 1.5 + 2 * t]];
      if (level >= 3 && crocLanes < maxCroc && j >= 1) opts.push(['croc', 1.5 + t]);
      const ty = weighted(rng, opts); if (ty === 'croc') crocLanes++; types.push(ty);
    }
  }
  if (rng.chance(level === 1 ? 0.4 : 0.55 - 0.3 * t)) { const j = rng.int(1, 3); types[j] = 'train'; pieces.push('log-train'); }   // set piece: the log train
  if (level >= 3 && rng.chance(0.55)) {                                                                                      // set piece: turtle chain beside one safe lane
    const j = rng.int(0, 3); if (types[j] !== 'train' && types[j + 1] !== 'train') { types[j] = 'chain'; types[j + 1] = 'turtle'; pieces.push('turtle-chain'); }
  }
  const logs = types.filter((x) => x.startsWith('log') || x === 'train').length;
  if (logs < (level < 10 ? 2 : 1)) { const j = types.findIndex((x) => x === 'turtle' || x === 'croc'); if (j >= 0) types[j] = 'logM'; }
  return types;
}

function bayDefs(rng, level) {
  const n = level < 2 ? 0 : level < 5 ? (rng.chance(0.5) ? 1 : 0) : level < 10 ? 1 : level < 17 ? 2 : rng.chance(0.5) ? 3 : 2;
  const idx = shuffle(rng, [0, 1, 2, 3, 4]), bays = BAY_X.map((cx) => ({ cx, hazard: null, bonus: null }));
  for (let i = 0; i < n; i++) bays[idx[i]].hazard = rng.pick(['croc', 'snake']);
  const free = idx.filter((i) => !bays[i].hazard), nb = level < 2 ? 1 : rng.int(1, 2);
  for (let i = 0; i < nb && i < free.length; i++) bays[free[i]].bonus = rng.pick(['mouse', 'fish']);
  return bays;
}

function generate(level, seed, attempt) {
  const rng = createRng(mixSeed(level, seed, attempt));
  const t = Math.min(1, (level - 1) / 24), sm = speedMul(level), pieces = [];
  const d0 = rng.chance(0.5) ? 1 : -1, r0 = rng.chance(0.5) ? 1 : -1;
  const fams = pickFamilies(rng, level), rs = roadSpeeds(rng, sm);
  const road = fams.map((f, i) => {
    const lane = buildRoad(rng, level, t, i, f, rs[i], i === 0);
    lane.dir = d0 * (i % 2 === 0 ? 1 : -1); return lane;
  });
  if (fams.includes('limo')) pieces.push('limo-lane');
  pieces.push('rest-median');
  const types = pickRiverTypes(rng, level, t, pieces);
  const speeds = shuffle(rng, TUNING.baseRiverSpeed).map((v) => v * sm * (level === 1 ? 0.9 : 1));
  const diveP = clamp((level - 2) / 12, 0, 0.85);
  let safeChain = false;
  const river = types.map((ty, j) => {
    const sp = speeds[j] * (ty === 'croc' ? 1.1 : 1);
    let dives = ty === 'chain' ? true : ty === 'turtle' ? rng.chance(diveP) : false;
    if (ty === 'turtle' && types[j - 1] === 'chain') dives = false;           // the chain's neighbour is the safe lane
    if (ty === 'turtle' && level === 2) dives = false;
    const lane = buildRiver(rng, level, t, j, ty, sp, dives);
    lane.dir = r0 * (j % 2 === 0 ? 1 : -1); void safeChain; return lane;
  });
  const bays = bayDefs(rng, level);
  const peteMode = level <= 1 ? 'none' : level === 2 ? 'taunt' : level <= 5 ? 'patrol' : 'patrol_throw';
  const cheeseEvery = peteMode === 'patrol_throw' ? Math.round(lerp(9, 4.5, Math.min(1, (level - 6) / 20)) * rng.range(0.9, 1.1) * 10) / 10 : 0;
  return {
    level, seed, theme: THEMES[(level - 1) % THEMES.length], speedMul: sm, lanes: [...road, ...river], bays, peteMode, cheeseEvery,
    meta: { attempt, setPieces: pieces, valid: false, families: fams, roadBase: rs },
  };
}

/** Deterministic in (level, seed). Re-rolls an internal sub-seed until analyzeDef passes (level n, seed s always yields the same def). */
const CACHE = new Map();   // levelDef is pure in (level, seed); callers get a private clone
export function levelDef(level, seed = 1) {
  const key = level + ':' + seed;
  if (!CACHE.has(key)) CACHE.set(key, levelDefUncached(level, seed));
  return markBayProven(structuredClone(CACHE.get(key)));
}
function levelDefUncached(level, seed) {
  let def = null;
  for (let a = 0; a < MAX_ATTEMPTS; a++) {
    def = generate(level, seed, a);
    if (analyzeDef(def, { offsets: [0, 9.1], bayOffsets: BAY_OFFSETS }).ok) { def.meta.valid = true; return def; }
  }
  return def;
}
