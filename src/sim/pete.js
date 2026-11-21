// Perring Parkway Pete: taunts, median patrol, and cheese throws (ARCHITECTURE sections 4, 5, 13).
// Pure, Node-safe, fixed-step. Randomness only through g.rng (seeded). No dependency on game.js.
import { W, ROW, rowY, TUNING } from '../core/defs.js';
import { createRng } from '../core/rng.js';

// 12 original ALL CAPS taunt lines, each <= 28 chars. At least 4 reference the Burger King, Micro Center or the nerds.
export const TAUNTS = Object.freeze([
  'NICE TRY, FUR-BALL!',
  'THE PICKLES ARE MINE!',
  'THE NERDS CAN WAIT!',
  'NO WHOPPER, NO ENTRY!',
  'NO WHOPPER ON MY ROAD!',
  'MICRO CENTER WON\'T SAVE YOU',
  'THE NERDS WILL NOT CHEER',
  'PAY THE ROAD TOLL, FUR-BALL!',
  'TRAFFIC IS MY BEST FRIEND',
  'SLOW DOWN, SNACK-CAT!',
  'GO BACK TO BURGER KING!',
  'MY RAT PACK RULES THE ROAD',
]);

const LINE_SHOW = 3.0;                 // seconds a taunt stays on the ticker
const LINE_GAP = [4, 6];               // seconds between taunts (seeded)
const PAUSE_AT_EDGE = 0.6;             // seconds Pete stands still before turning around
const X_LO = 14, X_HI = W - 14;        // Pete centre x bounds on the median
const CHEESE_W = 16, CHEESE_TTL = 10;  // seconds before a cheese wheel rolls out of play
const CHEESE_MARGIN = 24;              // off-screen margin before a wheel is culled

function rngOf(g) {
  if (!g.rng) g.rng = createRng(g.seed ?? 1);
  return g.rng;
}

// game.js must expose its emitter as g.emit (or g.bus); until it does, events are silently dropped.
function emit(g, type, payload) {
  if (typeof g.emit === 'function') g.emit(type, payload);
  else if (g.bus && typeof g.bus.emit === 'function') g.bus.emit(type, payload);
}

function pickLine(g, prev) {
  const rng = rngOf(g);
  let i = rng.int(0, TAUNTS.length - 1);
  if (TAUNTS.length > 1 && TAUNTS[i] === prev) i = (i + 1) % TAUNTS.length;
  return i;
}

function nextGap(g) {
  const [a, b] = LINE_GAP;
  return rngOf(g).range(a, b);
}

/** Set up Pete for the current level. Mode comes from g.level.peteMode. */
export function initPete(g) {
  const lvl = g.level || {};
  const pm = lvl.peteMode || 'none';
  const mode = pm === 'taunt' ? 'taunt' : (pm === 'patrol' || pm === 'patrol_throw') ? 'patrol' : 'hidden';
  const rng = rngOf(g);
  g.extra = g.extra || [];
  g.pete = {
    mode,
    x: (X_LO + X_HI) / 2,
    dir: rng.chance(0.5) ? 1 : -1,
    w: TUNING.peteHalfW * 2,
    line: '',
    lineT: 0,
    lineCd: rng.range(1, 2),           // first taunt comes quickly
    lastLine: '',
    pauseT: 0,
    throws: pm === 'patrol_throw',
    cheeseEvery: lvl.cheeseEvery > 0 ? lvl.cheeseEvery : 4,
    throwT: 0,
  };
  g.pete.throwT = g.pete.cheeseEvery;
}

function tickTaunts(g, dt) {
  const p = g.pete;
  if (p.lineT > 0) {
    p.lineT -= dt;
    if (p.lineT <= 0) { p.lineT = 0; p.line = ''; }
  }
  p.lineCd -= dt;
  if (p.lineCd <= 0) {
    const i = pickLine(g, p.lastLine);
    p.line = TAUNTS[i];
    p.lastLine = p.line;
    p.lineT = LINE_SHOW;
    p.lineCd = nextGap(g);
    emit(g, 'pete_taunt', { line: p.line });
  }
}

function tickPatrol(g, dt) {
  const p = g.pete;
  if (p.pauseT > 0) {
    p.pauseT -= dt;
  } else {
    const speed = TUNING.peteSpeed * (g.level?.speedMul || 1);
    p.x += p.dir * speed * dt;
    if (p.x <= X_LO) { p.x = X_LO; p.dir = 1; p.pauseT = PAUSE_AT_EDGE; }
    else if (p.x >= X_HI) { p.x = X_HI; p.dir = -1; p.pauseT = PAUSE_AT_EDGE; }
  }
  if (p.throws) {
    p.throwT -= dt;
    if (p.throwT <= 0) {
      p.throwT += p.cheeseEvery;
      throwCheese(g);
    }
  }
}

function throwCheese(g) {
  const rng = rngOf(g);
  const row = rng.pick(ROW.road);
  const dir = rng.chance(0.5) ? 1 : -1;
  const p = g.pete;
  g.extra.push({
    kind: 'cheese',
    x: p.x - CHEESE_W / 2,
    row,
    w: CHEESE_W,
    vx: dir * TUNING.cheeseSpeed,
    ttl: CHEESE_TTL,
  });
  emit(g, 'pete_throw', { x: p.x, row });
}

function moveCheese(g, dt) {
  if (!g.extra) return;
  for (const e of g.extra) {
    if (e.kind !== 'cheese') continue;
    e.x += e.vx * dt;
    e.ttl -= dt;
  }
  g.extra = g.extra.filter((e) => e.kind !== 'cheese' || (
    e.ttl > 0 && e.x + e.w > -CHEESE_MARGIN && e.x < W + CHEESE_MARGIN));
}

/** Advance Pete by dt seconds. Call once per play step. */
export function updatePete(g, dt) {
  if (!g.pete) initPete(g);
  const p = g.pete;
  if (p.mode === 'hidden') { moveCheese(g, dt); return; }
  tickTaunts(g, dt);
  if (p.mode === 'patrol') tickPatrol(g, dt);
  moveCheese(g, dt);
}

/** Lethal rectangle for Pete (left-edge x) while patrolling; null otherwise. */
export function peteRect(g) {
  const p = g.pete;
  if (!p || p.mode !== 'patrol') return null;
  return {
    x: p.x - p.w / 2,
    y: rowY(ROW.median) - TUNING.itemHalfH,
    w: p.w,
    h: TUNING.itemHalfH * 2,
  };
}
