import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { createBus } from '../src/core/events.js';
import { createRng } from '../src/core/rng.js';
import { W, ROW, rowY, BAY_X, TIME_LIMIT, SCORES, TUNING } from '../src/core/defs.js';

// Fake level: rows given in `spec` ({row: {dir,speed,items}}); river rows default to a static full-width log pair.
const fullLogs = () => [{ kind: 'log_l', w: 112, x0: 112 }, { kind: 'log_l', w: 112, x0: 224 }];
function fakeLevel(spec = {}, bays) {
  return () => {
    const lanes = [];
    for (const row of [...ROW.road, ...ROW.river]) {
      const river = ROW.river.includes(row);
      const s = spec[row] || (river ? { items: fullLogs(), speed: 0 } : { items: [] });
      const items = s.items.map((it, i) => ({ id: i + 1, ...it }));
      const pad = Math.max(16, ...items.map((i) => i.w));
      lanes.push({ row, kind: river ? 'river' : 'road', dir: s.dir ?? 1, speed: s.speed ?? 0, ring: s.ring ?? W + pad, pad, items });
    }
    return { level: 1, seed: 1, theme: 'day', speedMul: 1, lanes, peteMode: 'none', cheeseEvery: 0,
      bays: BAY_X.map((cx, i) => ({ cx, hazard: null, bonus: null, ...(bays?.[i] || {}) })) };
  };
}
function mkGame(spec, bays, o = {}) {
  const bus = createBus(); const ev = [];
  bus.on('*', (type, p) => ev.push([type, p]));
  const g = createGame({ seed: 7, bus, levelDef: fakeLevel(spec, bays), ...o });
  g.step({ start: true });
  for (let i = 0; i < 100 && g.state !== 'play'; i++) g.step();
  return { g, ev };
}
const run = (g, n, cmd) => { for (let i = 0; i < n; i++) g.step(i === 0 && cmd ? cmd : {}); };
const hopAndLand = (g, dir) => run(g, 9, { hop: dir });
const put = (g, row, x) => { const p = g.player; p.row = row; p.y = rowY(row); p.x = x; p.hop = null; p.riding = null; p.mode = 'idle'; };
const evs = (ev, t) => ev.filter(([k]) => k === t).map(([, p]) => p);

test('state machine: title -> intro -> play', () => {
  const g = createGame({ levelDef: fakeLevel() });
  assert.equal(g.state, 'title');
  g.step({ start: true });
  assert.equal(g.state, 'intro');
  run(g, 100);
  assert.equal(g.state, 'play');
  assert.ok(g.t < 0.2, 'level time only runs in play');
});

test('hop moves 16px in hopTime and scores each forward row once', () => {
  const { g, ev } = mkGame();
  g.step({ hop: 'up' });
  assert.equal(g.player.mode, 'hop');
  run(g, 9);
  assert.equal(g.player.row, 12);
  assert.equal(g.player.y, rowY(12));
  assert.equal(evs(ev, 'row_forward').length, 1);
  assert.equal(g.score, SCORES.forwardRow);
  hopAndLand(g, 'down'); hopAndLand(g, 'up');
  assert.equal(g.score, SCORES.forwardRow, 'no double points for the same row');
});

test('hop buffering: one pending hop, latest press wins', () => {
  const { g } = mkGame();
  g.step({ hop: 'up' });
  g.step({ hop: 'left' });
  g.step({ hop: 'right' });
  run(g, 20);
  assert.equal(g.player.row, 12);
  assert.ok(g.player.x > 104, 'right was buffered, left dropped');
});

test('down is blocked below the start row; land sideways hop clamps; river does not', () => {
  const { g } = mkGame();
  hopAndLand(g, 'down');
  assert.equal(g.player.row, 13);
  put(g, 13, 12);
  hopAndLand(g, 'left');
  assert.equal(g.player.x, TUNING.hopMaxX);
  put(g, 4, 6);
  hopAndLand(g, 'left');
  assert.equal(g.deathCause, 'edge');
});

test('hop into wall (up from row 2 away from a bay) = bay_wall death', () => {
  const { g, ev } = mkGame();
  put(g, 2, 40);
  hopAndLand(g, 'up');
  assert.equal(g.state, 'dying');
  assert.equal(evs(ev, 'bay_hit')[0].why, 'wall');
  assert.equal(evs(ev, 'death')[0].cause, 'bay_wall');
});

test('drown: hop from median into empty river', () => {
  const { g, ev } = mkGame({ 6: { items: [] } });
  put(g, 7, 100);
  hopAndLand(g, 'up');
  assert.equal(g.state, 'dying');
  assert.equal(g.player.mode, 'drown');
  assert.equal(evs(ev, 'splash').length, 1);
  assert.equal(evs(ev, 'death')[0].cause, 'drown');
});

test('carry on log, with land_log event', () => {
  const { g, ev } = mkGame({ 4: { dir: 1, speed: 24, items: fullLogs() } });
  put(g, 5, 60);
  hopAndLand(g, 'up');
  assert.equal(g.player.mode, 'riding');
  assert.equal(g.player.row, 4);
  assert.equal(g.player.riding.lane, 4);
  const x0 = g.player.x;
  run(g, 60);
  assert.ok(Math.abs(g.player.x - x0 - 24) < 0.5, `carried ${g.player.x - x0}`);
  assert.equal(evs(ev, 'land_log').length, 1);
});

test('carried off the edge = edge death', () => {
  const { g } = mkGame({ 3: { dir: 1, speed: 40, items: fullLogs() } });
  put(g, 3, W - 6);
  run(g, 2);
  assert.equal(g.player.mode, 'riding');
  run(g, 60);
  assert.equal(g.deathCause, 'edge');
});

test('turtle sink = death (support lost)', () => {
  const dive = { phase: 0, period: 7, sink: 0.9, under: 2.2, rise: 0.7 };
  const { g } = mkGame({ 5: { speed: 0, items: [{ kind: 'turtles3', w: 48, x0: 96, dive }] } });
  put(g, 5, 60);
  run(g, 3);
  assert.equal(g.state, 'play', 'safe while up');
  assert.equal(g.player.mode, 'riding');
  run(g, 60 * 7);
  assert.equal(g.deathCause, 'drown');
});

test('croc: open head kills, closed head and back support', () => {
  // x0=164, w=64 -> left edge 100, dir +1: back 100..148, head 148..164
  const mk = (phase) => mkGame({ 4: { dir: 1, speed: 0, items: [{ kind: 'croc', w: 64, x0: 164, croc: { phase, period: 5, open: 1.6 } }] } }).g;
  const a = mk(3.5);
  put(a, 4, 156); run(a, 2);
  assert.equal(a.deathCause, 'croc');
  const b = mk(0);
  put(b, 4, 156); run(b, 2);
  assert.equal(b.state, 'play', 'closed head supports');
  put(b, 4, 120); run(b, 2);
  assert.equal(b.state, 'play', 'back supports');
});

test('road squash', () => {
  const { g, ev } = mkGame({ 12: { speed: 0, items: [{ kind: 'car', w: 16, x0: 120 }] } });
  hopAndLand(g, 'up'); // car occupies x 104..120, player x=104
  assert.equal(g.state, 'dying');
  assert.equal(g.player.mode, 'squash');
  assert.equal(evs(ev, 'squash')[0].kind, 'car');
  assert.equal(g.deathCause, 'squash');
});

test('cheese (g.extra) kills like a car, cause pete', () => {
  const { g } = mkGame();
  g.extra.push({ kind: 'cheese', x: 96, row: 13, w: 16, vx: 0, ttl: 5 });
  run(g, 2);
  assert.equal(g.deathCause, 'pete');
});

test('bay fill scores bay + time bonus, respawns after 0.8s', () => {
  const { g, ev } = mkGame();
  run(g, 30);
  put(g, 2, 64);
  const before = g.score;
  hopAndLand(g, 'up');
  assert.equal(g.bays[1].filled, true);
  assert.equal(g.player.mode, 'home');
  const h = evs(ev, 'home')[0];
  assert.equal(h.bay, 1);
  assert.equal(g.score - before, SCORES.bay + SCORES.timeBonusPerSec * Math.floor(h.timeLeft));
  run(g, 60);
  assert.equal(g.player.mode, 'idle');
  assert.equal(g.player.row, 13);
  assert.ok(g.timeLeft > TIME_LIMIT - 0.5, "timer reset on respawn");
});

test('bonus adds on top; filled bay is a wall on re-entry', () => {
  const { g, ev } = mkGame({}, [null, { bonus: 'mouse' }]);
  g.bays[1].bonusT = 2;
  const before = g.score;
  put(g, 2, 64); hopAndLand(g, 'up');
  assert.equal(g.score - before, SCORES.bay + SCORES.timeBonusPerSec * Math.floor(g.timeLeft) + SCORES.bonusMouse);
  assert.equal(evs(ev, 'bonus')[0].type, 'mouse');
  run(g, 60);
  put(g, 2, 64); hopAndLand(g, 'up');
  assert.equal(g.deathCause, 'bay_wall');
});

test('5 bays = levelclear, then level 2 after 2.5s', () => {
  const { g, ev } = mkGame();
  for (let i = 0; i < 5; i++) {
    put(g, 2, BAY_X[i]);
    hopAndLand(g, 'up');
    if (i < 4) run(g, 60);
  }
  assert.equal(g.state, 'levelclear');
  assert.equal(evs(ev, 'level_clear')[0].level, 1);
  run(g, 160);
  assert.equal(g.levelNum, 2);
  assert.equal(g.state, 'intro');
  assert.equal(evs(ev, 'level_start').pop().level, 2);
  assert.ok(g.bays.every((b) => !b.filled));
});

test('timer: tick_low each second under 8, timeout death at 0', () => {
  const { g, ev } = mkGame();
  run(g, Math.round(TIME_LIMIT * 60) + 5);
  assert.equal(g.deathCause, 'timeout');
  assert.equal(g.timeLeft, 0);
  assert.deepEqual(evs(ev, 'tick_low').map((e) => e.timeLeft), [7, 6, 5, 4, 3, 2, 1]);
});

test('lives: respawn then gameover at 0', () => {
  const { g, ev } = mkGame();
  for (let i = 0; i < 3; i++) {
    g.extra.push({ kind: 'cheese', x: g.player.x - 8, row: 13, w: 16, vx: 0, ttl: 5 });
    run(g, 2);
    g.extra.length = 0;
    run(g, 80);
    if (i < 2) { assert.equal(g.state, 'play'); assert.equal(g.lives, 2 - i); }
  }
  assert.equal(g.state, 'gameover');
  assert.equal(g.lives, 0);
  assert.equal(evs(ev, 'gameover').length, 1);
  assert.deepEqual(evs(ev, 'death').map((d) => d.livesLeft), [2, 1, 0]);
});

test('extra life at 10000 then every 30000', () => {
  const { g, ev } = mkGame();
  g.score = 9900;
  put(g, 2, 16); hopAndLand(g, 'up');
  assert.equal(g.lives, 4);
  assert.equal(evs(ev, 'extra_life')[0].lives, 4);
  g.score = 39900;
  run(g, 60);
  put(g, 2, 64); hopAndLand(g, 'up');
  assert.equal(g.lives, 5);
  assert.equal(g.nextExtra, 70000);
});

function script(seed) {
  const { g } = mkGame({ 10: { dir: -1, speed: 30, items: [{ kind: 'car', w: 16, x0: 50 }, { kind: 'car', w: 16, x0: 180 }] } }, null, { seed });
  const r = createRng(99);
  const hs = [];
  for (let i = 0; i < 1500; i++) { g.step({ hop: r.chance(0.1) ? r.pick(['up', 'down', 'left', 'right']) : null, start: r.chance(0.01) }); hs.push(g.hash()); }
  return hs.join(',');
}
test('determinism: same seed + cmds = same state hash trace', () => {
  assert.equal(script(5), script(5));
});

test('scripted run crosses the road lane and a river lane to a bay', () => {
  const { g } = mkGame({
    10: { dir: 1, speed: 20, items: [{ kind: 'car', w: 16, x0: 20 }] },
    4: { dir: 1, speed: 24, items: fullLogs() },
  });
  put(g, 13, 64);
  while (g.player.row > 2 && g.state === 'play') {
    if (g.player.row === 11) { // wait until the car in row 10 is far from x
      const lane = g.lanesByRow[10];
      for (let n = 0; n < 900; n++) {
        const x = (((lane.items[0].x0 + lane.speed * g.t) % lane.ring) + lane.ring) % lane.ring - lane.pad;
        if (Math.abs(x + 8 - g.player.x) > 40) break;
        g.step();
      }
    }
    hopAndLand(g, 'up');
  }
  assert.equal(g.state, 'play');
  assert.equal(g.player.row, 2);
  assert.ok(g.score >= 10 * 11, `score ${g.score}`);
  g.player.x = 64;
  hopAndLand(g, 'up');
  assert.equal(g.bays[1].filled, true);
});
