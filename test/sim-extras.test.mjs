import test from 'node:test';
import assert from 'node:assert/strict';
import { initPete, updatePete, peteRect, TAUNTS } from '../src/sim/pete.js';
import { initBays, updateBays, bayForHop, BONUS_SHOW } from '../src/sim/bays.js';
import { createRng } from '../src/core/rng.js';
import { createBus } from '../src/core/events.js';
import { W, ROW, rowY, BAY_X, TUNING } from '../src/core/defs.js';

const DT = 1 / 60;

function fakeG(level = {}, seed = 7) {
  const bus = createBus();
  const events = [];
  bus.on('*', (type, payload) => events.push({ type, payload }));
  return { seed, rng: createRng(seed), bus, events, t: 0, state: 'play', extra: [], level: { speedMul: 1, peteMode: 'none', cheeseEvery: 0, bays: null, ...level } };
}

function run(g, seconds, fn) {
  const steps = Math.round(seconds / DT);
  for (let i = 0; i < steps; i++) { updatePete(g, DT); if (fn) fn(i); }
}

// ---------------------------------------------------------------- Pete: taunts
test('TAUNTS: 12 lines, ALL CAPS, <= 28 chars, at least 4 about BK / Micro Center / nerds', () => {
  assert.equal(TAUNTS.length, 12);
  for (const line of TAUNTS) {
    assert.ok(line.length <= 28, `too long: ${line}`);
    assert.equal(line, line.toUpperCase(), `not caps: ${line}`);
  }
  const themed = TAUNTS.filter((l) => /WHOPPER|BURGER|MICRO|NERD/.test(l));
  assert.ok(themed.length >= 4, `only ${themed.length} themed lines`);
});

test('taunt mode: emits pete_taunt with lines from TAUNTS and is never lethal', () => {
  const g = fakeG({ peteMode: 'taunt' });
  initPete(g);
  run(g, 20);
  const taunts = g.events.filter((e) => e.type === 'pete_taunt');
  assert.ok(taunts.length >= 3, `expected several taunts, got ${taunts.length}`);
  for (const e of taunts) assert.ok(TAUNTS.includes(e.payload.line));
  assert.equal(peteRect(g), null);
});

test('taunt lines do not repeat back to back', () => {
  const g = fakeG({ peteMode: 'taunt' }, 3);
  initPete(g);
  run(g, 120);
  const lines = g.events.filter((e) => e.type === 'pete_taunt').map((e) => e.payload.line);
  for (let i = 1; i < lines.length; i++) assert.notEqual(lines[i], lines[i - 1]);
});

test('hidden mode (peteMode none): no rect, no events, no cheese', () => {
  const g = fakeG({ peteMode: 'none' });
  initPete(g);
  run(g, 10);
  assert.equal(g.pete.mode, 'hidden');
  assert.equal(peteRect(g), null);
  assert.equal(g.events.length, 0);
});

// ---------------------------------------------------------------- Pete: patrol
test('patrol: rect is on the median row, lethal, and width 2*peteHalfW', () => {
  const g = fakeG({ peteMode: 'patrol' });
  initPete(g);
  const r = peteRect(g);
  assert.ok(r);
  assert.equal(r.y, rowY(ROW.median) - TUNING.itemHalfH);
  assert.equal(r.w, TUNING.peteHalfW * 2);
  assert.equal(r.x, g.pete.x - r.w / 2);
});

test('patrol: walks at peteSpeed, pauses and turns at the edge, stays on screen', () => {
  const g = fakeG({ peteMode: 'patrol' });
  initPete(g);
  g.pete.dir = 1;
  const x0 = g.pete.x;
  run(g, 0.5);
  const moved = g.pete.x - x0;
  assert.ok(Math.abs(moved - TUNING.peteSpeed * 0.5) < 1, `moved ${moved}`);
  let minX = Infinity, maxX = -Infinity, turns = 0, prevDir = g.pete.dir;
  run(g, 60, () => {
    minX = Math.min(minX, g.pete.x); maxX = Math.max(maxX, g.pete.x);
    if (g.pete.dir !== prevDir) { turns++; prevDir = g.pete.dir; }
  });
  assert.ok(turns >= 4, `expected several turnarounds, got ${turns}`);
  assert.ok(minX >= 0 && maxX <= W, `left screen: ${minX}..${maxX}`);
});

test('patrol: pause at the edge holds x still', () => {
  const g = fakeG({ peteMode: 'patrol' });
  initPete(g);
  g.pete.x = 200; g.pete.dir = 1;
  run(g, 1.0, () => {});
  const atEdge = g.pete.x;
  assert.equal(g.pete.dir, -1);
  // the first step after the turn is a pause, so x does not move for a fraction of a second
  const g2 = fakeG({ peteMode: 'patrol' });
  initPete(g2);
  g2.pete.x = 209; g2.pete.dir = 1;
  run(g2, 0.1);
  assert.equal(g2.pete.dir, -1);
  const pinned = g2.pete.x;
  run(g2, 0.3);
  assert.equal(g2.pete.x, pinned, 'Pete should stand still while pausing');
  assert.ok(atEdge <= 210);
});

// ---------------------------------------------------------------- Pete: patrol_throw
test('patrol_throw: throws every cheeseEvery seconds onto road rows, emits pete_throw', () => {
  const g = fakeG({ peteMode: 'patrol_throw', cheeseEvery: 3 });
  initPete(g);
  run(g, 10);
  const throws = g.events.filter((e) => e.type === 'pete_throw');
  assert.ok(throws.length >= 3 && throws.length <= 4, `throws=${throws.length}`);
  for (const e of throws) assert.ok(ROW.road.includes(e.payload.row));
  assert.ok(g.extra.length >= 1);
  assert.ok(g.extra.every((e) => e.kind === 'cheese' && e.w === 16));
});

test('cheese moves at cheeseSpeed, expires after its ttl, and is culled off screen', () => {
  const g = fakeG({ peteMode: 'patrol_throw', cheeseEvery: 100 });
  initPete(g);
  g.extra.push({ kind: 'cheese', x: 100, row: 9, w: 16, vx: TUNING.cheeseSpeed, ttl: 10 });
  updatePete(g, 0.5);
  assert.ok(Math.abs(g.extra[0].x - (100 + TUNING.cheeseSpeed * 0.5)) < 1e-6);
  run(g, 10.5);
  assert.equal(g.extra.length, 0, 'ttl expiry should remove the wheel');
  g.extra.push({ kind: 'cheese', x: W - 5, row: 9, w: 16, vx: 200, ttl: 10 });
  updatePete(g, 0.5);
  assert.equal(g.extra.length, 0, 'off-screen wheel should be culled');
});

test('patrol (no throws) never emits pete_throw or adds cheese', () => {
  const g = fakeG({ peteMode: 'patrol', cheeseEvery: 2 });
  initPete(g);
  run(g, 15);
  assert.equal(g.events.filter((e) => e.type === 'pete_throw').length, 0);
  assert.equal(g.extra.length, 0);
});

test('same seed gives the same taunts and throws', () => {
  const a = fakeG({ peteMode: 'patrol_throw', cheeseEvery: 2 }, 99);
  const b = fakeG({ peteMode: 'patrol_throw', cheeseEvery: 2 }, 99);
  initPete(a); initPete(b);
  run(a, 20); run(b, 20);
  assert.deepEqual(a.events.map((e) => [e.type, e.payload]), b.events.map((e) => [e.type, e.payload]));
  assert.equal(a.pete.x, b.pete.x);
});

// ---------------------------------------------------------------- bays
function bayG(bays, seed = 5) {
  return fakeG({ bays }, seed);
}

test('croc/snake bays open for bayHazardCycle.open of every period, with staggered phases', () => {
  const { period, open } = TUNING.bayHazardCycle;
  const g = bayG(BAY_X.map((cx, i) => ({ cx, hazard: i % 2 ? 'snake' : 'croc', bonus: null })));
  initBays(g);
  let openSamples = 0, total = 0;
  const firstOpen = new Set();
  const steps = Math.round(period * 4 / DT);
  let tAt = 0;
  for (let i = 0; i < steps; i++) {
    updateBays(g, DT);
    tAt += DT;
    g.bays.forEach((b, idx) => { if (b.open && tAt < period) firstOpen.add(idx); });
    if (g.bays[0].open) openSamples++;
    total++;
  }
  assert.ok(Math.abs(openSamples / total - open / period) < 0.02, `open fraction ${openSamples / total}`);
  assert.ok(firstOpen.size >= 3, 'hazards should open at different times');
});

test('plain bays never open', () => {
  const g = bayG(BAY_X.map((cx) => ({ cx, hazard: null, bonus: null })));
  initBays(g);
  run(g, 10, () => updateBays(g, DT));
  assert.ok(g.bays.every((b) => b.open === false));
});

test('bonus appears only in an empty bay with a bonus, lasts about 6 s, and clears when filled', () => {
  const levelBays = BAY_X.map((cx, i) => ({ cx, hazard: null, bonus: i === 2 ? 'mouse' : null }));
  const g = bayG(levelBays, 11);
  initBays(g);
  let seen = 0, maxShow = 0, shownOther = false;
  for (let i = 0; i < Math.round(40 / DT); i++) {
    updateBays(g, DT);
    if (g.bays[2].bonusT > 0) { seen++; maxShow = Math.max(maxShow, g.bays[2].bonusT); }
    if (g.bays.some((b, idx) => idx !== 2 && b.bonusT > 0)) shownOther = true;
  }
  assert.ok(seen > 0, 'bonus should appear within 40 s');
  assert.ok(maxShow <= BONUS_SHOW + 1e-9);
  assert.equal(shownOther, false);
  // filling the bay clears the bonus
  g.bays[2].bonusT = 3;
  g.bays[2].filled = true;
  updateBays(g, DT);
  assert.equal(g.bays[2].bonusT, 0);
});

test('bonus duration is about BONUS_SHOW seconds', () => {
  const g = bayG([{ cx: BAY_X[0], hazard: null, bonus: 'fish' }, ...BAY_X.slice(1).map((cx) => ({ cx, hazard: null, bonus: null }))], 2);
  initBays(g);
  g.bays[0]._nextBonus = 0.01;
  let t = 0;
  while (g.bays[0].bonusT === 0 && t < 2) { updateBays(g, DT); t += DT; }
  assert.ok(g.bays[0].bonusT > 0, 'bonus should appear');
  let life = 0;
  while (g.bays[0].bonusT > 0 && life < 20) { updateBays(g, DT); life += DT; }
  assert.ok(Math.abs(life - BONUS_SHOW) < 0.1, `shown for ${life}s`);
});

test('bayForHop: wall, filled, hazard (open), and ok', () => {
  const g = bayG(BAY_X.map((cx, i) => ({ cx, hazard: i === 1 ? 'croc' : null, bonus: null })));
  initBays(g);
  assert.deepEqual(bayForHop(g, 40), { index: -1, ok: false, why: 'wall' });
  assert.equal(bayForHop(g, BAY_X[0] + 2).ok, true);
  assert.equal(bayForHop(g, BAY_X[0] + 2).why, null);
  g.bays[0].filled = true;
  assert.equal(bayForHop(g, BAY_X[0]).why, 'filled');
  g.bays[1].open = true;
  assert.deepEqual(bayForHop(g, BAY_X[1]), { index: 1, ok: false, why: 'hazard' });
  g.bays[1].open = false;
  assert.equal(bayForHop(g, BAY_X[1]).ok, true);
});
