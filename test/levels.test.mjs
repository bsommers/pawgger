import test from 'node:test';
import assert from 'node:assert/strict';
import { W, ROW, TUNING, THEMES, BAY_X, rowY } from '../src/core/defs.js';
import { itemX, turtleState, turtleCarries, crocState, crocParts, supports, isLethalHead, findSupport, itemRect, visibleItems, speedMul,
  checkRoadLane, checkRiverCover, riverPairWindow, findRoute, analyzeDef, BAY_OFFSETS, minRoadGap, laneAtRow, mod } from '../src/levels/lanes.js';
import { levelDef } from '../src/levels/levels.js';

const near = (a, b, e = 1e-6) => assert.ok(Math.abs(a - b) < e, `${a} !~ ${b}`);
const riverLane = (items, o = {}) => ({ row: 4, kind: 'river', dir: 1, speed: 20, ring: 400, pad: 112, items, ...o });
const roadLane = (items, o = {}) => ({ row: 9, kind: 'road', dir: 1, speed: 40, ring: 300, pad: 48, items, ...o });
const cache = new Map();
const def = (l, s = 1) => { const k = l + ':' + s; if (!cache.has(k)) cache.set(k, levelDef(l, s)); return cache.get(k); };

// ---------------------------------------------------------------- lane model (section 3)
test('itemX: left edge, closed form, direction and wrap', () => {
  const lane = roadLane([{ id: 0, kind: 'car', w: 16, x0: 100 }], { ring: 300, pad: 16 });
  near(itemX(lane, lane.items[0], 0), 100 - 16);
  near(itemX(lane, lane.items[0], 1), 100 + 40 - 16);
  const left = { ...lane, dir: -1 };
  near(itemX(left, left.items[0], 1), 100 - 40 - 16);
  near(itemX(left, left.items[0], 10), mod(100 - 400, 300) - 16);   // negative wraps into [0, ring)
  near(itemX(lane, lane.items[0], 300 / 40), itemX(lane, lane.items[0], 0));   // one full ring period
});
test('speedMul ramps and caps', () => {
  near(speedMul(1), 1); near(speedMul(11), 1 + TUNING.speedPerLevel * 10); near(speedMul(500), TUNING.speedCap);
});
test('seamless wrap: items only jump while fully off screen; ring >= W + pad; pad = widest item', () => {
  for (const level of [1, 7, 20, 30]) for (const lane of def(level).lanes) {
    assert.ok(lane.ring >= W + lane.pad, `ring L${level} row ${lane.row}`);
    assert.equal(lane.pad, Math.max(...lane.items.map((i) => i.w)));
    for (const it of lane.items) {
      let prev = itemX(lane, it, 0); const tol = lane.speed * 0.01 + 1e-6;   // the formula lands at -pad + (one step)
      for (let t = 0.01; t < 40; t += 0.01) {
        const x = itemX(lane, it, t);
        if (Math.abs(x - prev) > lane.speed * 0.02 + 1e-6) {
          const [a, b] = [prev, x];   // jump: before/after must both be invisible
          assert.ok((a >= W - tol || a + it.w <= tol) && (b >= W - tol || b + it.w <= tol), `pop-in L${level} row ${lane.row} ${a}->${b}`);
        }
        prev = x;
      }
    }
  }
});
test('turtleState cycle order, durations and defaults', () => {
  const d = TUNING.turtleDive, it = { kind: 'turtles2', w: 32, dive: { phase: 0 } };
  const up = d.period - d.sink - d.under - d.rise;
  assert.equal(turtleState(it, 0), 'up'); assert.equal(turtleState(it, up - 0.01), 'up');
  assert.equal(turtleState(it, up + 0.01), 'sink');
  assert.equal(turtleState(it, up + d.sink + 0.01), 'under');
  assert.equal(turtleState(it, up + d.sink + d.under + 0.01), 'rise');
  assert.equal(turtleState(it, d.period + 0.01), 'up');
  assert.equal(turtleState({ kind: 'turtles3', w: 48 }, 5), 'up');          // no dive field: never dives
  assert.equal(turtleState({ ...it, dive: { phase: up } }, 0), 'sink');      // phase shifts the cycle
});
test('turtle carries: up, rise, first half of sink only', () => {
  const d = TUNING.turtleDive, it = { kind: 'turtles2', w: 32, dive: { phase: 0 } }, up = d.period - d.sink - d.under - d.rise;
  assert.ok(turtleCarries(it, 0)); assert.ok(turtleCarries(it, up + d.sink * 0.4));
  assert.ok(!turtleCarries(it, up + d.sink * 0.6)); assert.ok(!turtleCarries(it, up + d.sink + 1));
  assert.ok(turtleCarries(it, up + d.sink + d.under + 0.1));
  const lane = riverLane([{ ...it, id: 0, x0: 120 }]);
  const x = itemX(lane, lane.items[0], up + d.sink + 1);
  assert.equal(supports(lane, lane.items[0], up + d.sink + 1, x + 10), null);   // under water: no support
});
test('staggered dive phases: a diving lane never has all turtles under', () => {
  for (let level = 3; level <= 30; level += 3) for (const lane of def(level).lanes.filter((l) => l.kind === 'river')) {
    const c = checkRiverCover(lane); assert.ok(c.ok, `L${level} row ${lane.row}`);
    const tur = lane.items.filter((i) => i.dive);
    if (tur.length > 1) assert.ok(new Set(tur.map((i) => i.dive.phase)).size > 1, 'phases staggered');
  }
});
test('crocState: open during the last `open` seconds of the period', () => {
  const c = TUNING.crocCycle, it = { kind: 'croc', w: 64, croc: { phase: 0, period: c.period, open: c.open } };
  assert.equal(crocState(it, 0), 'closed'); assert.equal(crocState(it, c.period - c.open - 0.01), 'closed');
  assert.equal(crocState(it, c.period - c.open + 0.01), 'open'); assert.equal(crocState(it, c.period + 0.01), 'closed');
});
test('croc geometry: 48 back at trailing end, 16 head at leading end (both directions)', () => {
  const lane = riverLane([], { dir: 1 }), left = riverLane([], { dir: -1 }), it = { kind: 'croc', w: 64 };
  assert.deepEqual(crocParts(lane, it, 100), { back: [100, 148], head: [148, 164] });
  assert.deepEqual(crocParts(left, it, 100), { head: [100, 116], back: [116, 164] });
});
test('supports: log margin, croc back / head, lethal open head', () => {
  const m = TUNING.supportMargin, croc = { id: 0, kind: 'croc', w: 64, x0: 160, croc: { phase: 0, period: 5, open: 1.6 } };
  const lane = riverLane([{ id: 1, kind: 'log_m', w: 80, x0: 160 + 112 + 40 }, croc], { dir: 1, speed: 0, ring: 600, pad: 112 });
  const [log] = lane.items, lx = itemX(lane, log, 0), cx = itemX(lane, croc, 0);
  assert.equal(supports(lane, log, 0, lx), 'back'); assert.equal(supports(lane, log, 0, lx - m), 'back');
  assert.equal(supports(lane, log, 0, lx - m - 0.1), null); assert.equal(supports(lane, log, 0, lx + 80 + m), 'back');
  assert.equal(supports(lane, log, 0, lx + 80 + m + 0.1), null);
  assert.equal(supports(lane, croc, 0, cx + 20), 'back');                      // back
  assert.equal(supports(lane, croc, 0, cx + 56), 'head');                      // head zone (dir +1: leading = right)
  assert.equal(isLethalHead(lane, croc, 0, cx + 56), false);                   // closed at t=0
  assert.equal(isLethalHead(lane, croc, 4, cx + 56), true);                    // open at t=4
  assert.equal(isLethalHead(lane, croc, 4, cx + 20), false);                   // back is always safe
  assert.equal(supports(lane, croc, 0, cx - m - 1), null);
  const rd = roadLane([{ id: 0, kind: 'car', w: 16, x0: 50 }]);
  assert.equal(supports(rd, rd.items[0], 0, 40), null);                        // roads never support
  assert.equal(findSupport(lane, 0, lx + 5).item, log);
  assert.equal(findSupport(lane, 0, 1000), null);
});
test('itemRect: w x 14 centred in the row', () => {
  const lane = roadLane([{ id: 0, kind: 'truck', w: 32, x0: 100 }]);
  assert.deepEqual(itemRect(lane, lane.items[0], 0), { x: itemX(lane, lane.items[0], 0), y: rowY(9) - 7, w: 32, h: 14 });
});
test('visibleItems: on-screen only, with state/frame/dir', () => {
  const d = def(8);
  for (const t of [0, 3.3, 12]) {
    const v = visibleItems(d, t);
    assert.ok(v.length > 10);
    for (const e of v) {
      assert.ok(e.x + e.w > 0 && e.x < W); near(e.y, rowY(e.lane.row)); assert.equal(e.dir, e.lane.dir); assert.ok(Number.isInteger(e.frame) && e.frame >= 0);
      if (e.kind.startsWith('turtles')) assert.ok(['up', 'sink', 'under', 'rise'].includes(e.state));
      if (e.kind === 'croc') assert.ok(['open', 'closed'].includes(e.state));
    }
  }
});

// ---------------------------------------------------------------- level generation (section 6)
test('levelDef shape: 10 lanes (road 8..12 then river 2..6), 5 bays, alternating directions', () => {
  for (const level of [1, 2, 9, 30]) {
    const d = def(level);
    assert.deepEqual(d.lanes.map((l) => l.row), [8, 9, 10, 11, 12, 2, 3, 4, 5, 6]);
    assert.deepEqual(d.lanes.map((l) => l.kind), ['road', 'road', 'road', 'road', 'road', 'river', 'river', 'river', 'river', 'river']);
    for (let i = 1; i < 5; i++) { assert.equal(d.lanes[i].dir, -d.lanes[i - 1].dir); assert.equal(d.lanes[5 + i].dir, -d.lanes[4 + i].dir); }
    assert.equal(d.bays.length, 5); d.bays.forEach((b, i) => { assert.equal(b.cx, BAY_X[i]); assert.ok(!(b.hazard && b.bonus)); });
    assert.ok(d.bays.some((b) => !b.hazard));
    assert.equal(d.theme, THEMES[(level - 1) % 3]); assert.equal(d.level, level); near(d.speedMul, speedMul(level));
    assert.equal(laneAtRow(d, 8), d.lanes[0]); assert.equal(laneAtRow(d, 2), d.lanes[5]);
  }
});
test('ramp: level 1 gentle; crocs from 3; rollers and limo from 4; Pete modes; throw interval', () => {
  const kinds = (d) => new Set(d.lanes.flatMap((l) => l.items.map((i) => i.kind)));
  for (let s = 1; s <= 20; s++) {
    const a = def(1, s), b = def(2, s), c = def(3, s);
    assert.ok(![...kinds(a)].some((k) => k.startsWith('turtles') || k === 'croc' || k === 'limo' || k === 'roller' || k === 'racer'));
    assert.ok(a.lanes.flatMap((l) => l.items).every((i) => !i.dive));
    assert.ok(!kinds(b).has('croc') && !kinds(b).has('limo') && !kinds(b).has('roller'));
    assert.ok(!kinds(c).has('limo') && !kinds(c).has('roller'));
    assert.ok(a.bays.every((x) => !x.hazard));
    assert.ok(def(4, s).meta.setPieces.includes('limo-lane') && kinds(def(4, s)).has('limo'));
  }
  assert.ok([...Array(20).keys()].some((s) => [...new Set(def(3, s + 1).lanes.flatMap((l) => l.items.map((i) => i.kind)))].includes('croc')));
  assert.deepEqual([1, 2, 3, 5, 6, 12].map((l) => def(l).peteMode), ['none', 'taunt', 'patrol', 'patrol', 'patrol_throw', 'patrol_throw']);
  assert.equal(def(5).cheeseEvery, 0); assert.ok(def(6).cheeseEvery > 3 && def(6).cheeseEvery < 12); assert.ok(def(30).cheeseEvery < def(6).cheeseEvery);
});
test('rows 8 and 12 are never both the two fastest road lanes', () => {
  for (let level = 1; level <= 30; level += 3) for (let s = 1; s <= 20; s++) {
    const r = def(level, s).meta.roadBase;
    const top = r.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 2).map((e) => e[1]);
    assert.ok(!(top.includes(0) && top.includes(4)), `L${level} s${s}`);
  }
});
test('set pieces appear across levels: log train, turtle chain, limo lane, rest median', () => {
  const seen = new Set();
  for (let level = 1; level <= 30; level++) for (let s = 1; s <= 6; s++) def(level, s).meta.setPieces.forEach((p) => seen.add(p));
  for (const p of ['log-train', 'turtle-chain', 'limo-lane', 'rest-median']) assert.ok(seen.has(p), p);
});
test('determinism: same (level, seed) -> identical JSON', () => {
  for (const [l, s] of [[1, 1], [6, 3], [30, 20]]) assert.equal(JSON.stringify(levelDef(l, s)), JSON.stringify(levelDef(l, s)));
});
test('different seed -> different output', () => {
  for (const l of [1, 5, 12, 30]) {
    const sigs = new Set(); for (let s = 1; s <= 20; s++) sigs.add(JSON.stringify(def(l, s).lanes));
    assert.equal(sigs.size, 20, `level ${l}`);
  }
  assert.notEqual(JSON.stringify(def(2, 1).lanes), JSON.stringify(def(3, 1).lanes));
});
test('no Math.random in lanes.js / levels.js', async () => {
  const fs = await import('node:fs');
  for (const f of ['../src/levels/lanes.js', '../src/levels/levels.js']) assert.ok(!/Math\.random\(/.test(fs.readFileSync(new URL(f, import.meta.url), 'utf8')));
});

// ---------------------------------------------------------------- fairness checks themselves
test('minRoadGap covers the player body plus two hops of lane travel', () => {
  for (const v of [10, 40, 150]) assert.ok(minRoadGap(v) >= 2 * TUNING.hitHalfW + v * 2 * TUNING.hopTime);
});
test('checkRoadLane: crossable gaps pass, tight gaps fail', () => {
  const need = minRoadGap(40);
  const ok = roadLane([{ id: 0, kind: 'car', w: 16, x0: 0 }, { id: 1, kind: 'car', w: 16, x0: 16 + need + 10 }], { ring: 2 * (16 + need + 10) });
  assert.ok(checkRoadLane(ok).ok);
  const tight = roadLane([{ id: 0, kind: 'car', w: 16, x0: 0 }, { id: 1, kind: 'car', w: 16, x0: 16 + need - 5 }], { ring: 2 * (16 + need - 5) });
  assert.ok(!checkRoadLane(tight).ok);
});
test('checkRiverCover fails when every turtle sinks together', () => {
  const dive = { phase: 0 }, it = (id, x0) => ({ id, kind: 'turtles2', w: 32, x0, dive });
  assert.ok(!checkRiverCover(riverLane([it(0, 0), it(1, 100)])).ok);
  const stag = (id, x0, phase) => ({ id, kind: 'turtles2', w: 32, x0, dive: { phase } });
  assert.ok(checkRiverCover(riverLane([stag(0, 0, 0), stag(1, 100, 3.5)])).ok);
});
test('riverPairWindow: overlapping platforms give a window; disjoint lanes none', () => {
  const A = riverLane([{ id: 0, kind: 'log_l', w: 112, x0: 150 }], { speed: 0, ring: 400, row: 5 });
  const B = riverLane([{ id: 0, kind: 'log_l', w: 112, x0: 150 }], { speed: 0, ring: 400, row: 4 });
  assert.ok(riverPairWindow(A, B).ok);
  const far = riverLane([{ id: 0, kind: 'log_s', w: 48, x0: 150 + 160 }], { speed: 0, ring: 400, row: 4 });
  const smallA = riverLane([{ id: 0, kind: 'log_s', w: 48, x0: 150 }], { speed: 0, ring: 400, row: 5 });
  assert.ok(!riverPairWindow(smallA, far).ok);
});
test('findRoute: solvable levels route, a wall of cars does not', () => {
  const d = def(10, 1); const r = findRoute(d, { path: true });
  assert.ok(r.ok && r.time >= 12 * TUNING.hopTime - 1e-6 && r.time < 24);
  assert.equal(r.path[0].row, 13); assert.equal(r.path.at(-1).row, 1);
  const wall = structuredClone(d);
  wall.lanes[2].items = Array.from({ length: 14 }, (_, i) => ({ id: i, kind: 'car', w: 16, x0: i * 16 })); wall.lanes[2].ring = 224; wall.lanes[2].pad = 16;
  assert.ok(!findRoute(wall).ok);
});

test('per-bay reachability: level 5 seed 1 reaches every bay at every sampled start time (qa-bot regression)', () => {
  const d = def(5, 1);
  for (let b = 0; b < 5; b++) for (const t0 of [...BAY_OFFSETS, 0, 8, 16, 24, 32, 40, 48, 56, 64]) assert.ok(findRoute(d, { t0, bay: b }).ok, `bay ${b} t0=${t0}`);
});
test('per-bay check is a mutation catcher: a never-carrying row 2 blocks the bays, analyzeDef flags it', () => {
  const d = structuredClone(def(5, 1));
  assert.ok(analyzeDef(d).ok);
  const lane = d.lanes.find((l) => l.row === 2); lane.items = lane.items.slice(0, 1); lane.items[0].x0 = 0; lane.speed = 0;
  d.lanes.find((l) => l.row === 2).items[0].w = 16;
  const a = analyzeDef(d);
  assert.ok(!a.ok && a.failures.some((f) => /bay \d unreachable/.test(f)), a.failures.join('; '));
});

// ---------------------------------------------------------------- the big one
test('levels 1..30 x seeds 1..20 all validate (a)(b)(c)(d)', () => {
  for (let level = 1; level <= 30; level++) for (let seed = 1; seed <= 20; seed++) {
    const d = def(level, seed), a = analyzeDef(d, { fresh: seed <= 2 });
    assert.ok(d.meta.valid && a.ok, `L${level} s${seed}: ${a.failures.join('; ')}`);
  }
});
