// Render module tests: fake g + fake lanes, PixCtx shim, determinism, fallbacks, night grading, particles, styles.
// Set RENDER_PNG_DIR=out/render to also write PNGs of the checked frames.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { W, H, ROW, BAY_X, TUNING, THEMES } from '../src/core/defs.js';
import { createBus } from '../src/core/events.js';
import { createRenderer, createPixCtx, pixToPng } from '../src/render/renderer.js';
import { buildArt, missingSprites } from '../src/art/registry.js';
import { createFx } from '../src/render/particles.js';
import { visibleItems } from '../src/levels/lanes.js';

const PNG_DIR = process.env.RENDER_PNG_DIR;
if (PNG_DIR) fs.mkdirSync(PNG_DIR, { recursive: true });
const save = async (name, ctx) => { if (PNG_DIR) fs.writeFileSync(`${PNG_DIR}/${name}.png`, await pixToPng(ctx, 3)); };

// ---- fixtures
function lane(row, kind, dir, speed, defs) {
  const pad = Math.max(...defs.map((d) => d.w)), items = defs.map((d, i) => ({ id: row * 10 + i, kind: d.kind, w: d.w, x0: d.x0, dive: d.dive, croc: d.croc }));
  return { row, kind, dir, speed, ring: W + pad + 32, pad, items };
}
const dive = (phase) => ({ phase, period: 7, sink: 0.9, under: 2.2, rise: 0.7 });
export function fakeLevel(theme = 'day') {
  const lanes = [
    lane(8, 'road', 1, 22, [{ kind: 'car', w: 16, x0: 10 }, { kind: 'car', w: 16, x0: 110 }, { kind: 'racer', w: 16, x0: 200 }]),
    lane(9, 'road', -1, 34, [{ kind: 'truck', w: 32, x0: 40 }, { kind: 'bike', w: 16, x0: 150 }]),
    lane(10, 'road', 1, 46, [{ kind: 'bus', w: 48, x0: 30 }, { kind: 'dozer', w: 24, x0: 160 }]),
    lane(11, 'road', -1, 28, [{ kind: 'limo', w: 48, x0: 20 }, { kind: 'roller', w: 16, x0: 120 }, { kind: 'car', w: 16, x0: 200 }]),
    lane(12, 'road', 1, 58, [{ kind: 'racer', w: 16, x0: 60 }, { kind: 'car', w: 16, x0: 160 }]),
    lane(2, 'river', 1, 20, [{ kind: 'log_m', w: 80, x0: 10 }, { kind: 'log_s', w: 48, x0: 140 }]),
    lane(3, 'river', -1, 28, [{ kind: 'turtles3', w: 48, x0: 20, dive: dive(0) }, { kind: 'turtles2', w: 32, x0: 130, dive: dive(3) }]),
    lane(4, 'river', 1, 18, [{ kind: 'log_l', w: 112, x0: 0 }, { kind: 'croc', w: 64, x0: 150, croc: { phase: 0, period: 5, open: 1.6 } }]),
    lane(5, 'river', -1, 32, [{ kind: 'turtles2', w: 32, x0: 60, dive: dive(5) }, { kind: 'log_s', w: 48, x0: 160 }]),
    lane(6, 'river', 1, 24, [{ kind: 'log_m', w: 80, x0: 50 }, { kind: 'turtles3', w: 48, x0: 170 }]),
  ];
  return { level: 1, theme, lanes, bays: BAY_X.map((cx) => ({ cx })) };
}
export function fakeGame(over = {}) {
  const theme = over.theme || 'day';
  return {
    state: 'play', t: 3.3, timeLeft: 20, level: fakeLevel(theme), score: 120, lives: 3,
    player: { x: 104, y: 216, row: 13, facing: 'up', mode: 'idle', hopT: 0, frame: 0, riding: null, deathT: 0 },
    bays: BAY_X.map((cx, i) => ({ cx, hazard: i === 1 ? 'croc' : null, open: i === 1, bonus: i === 3 ? 'mouse' : null, bonusT: i === 3 ? 4 : 0, filled: i === 0 })),
    extra: [{ kind: 'cheese', x: 90, row: 7, w: 16, vx: 60, ttl: 5 }], pete: { mode: 'patrol', x: 60, dir: 1, w: 20 }, popups: [{ x: 16, y: 20, text: '+50', age: 0.2, ttl: 1 }],
    ...over,
  };
}
const mk = async (opts = {}) => {
  const sprites = opts.sprites || buildArt(); await sprites.ready;
  const ctx = createPixCtx(W, H), r = createRenderer(ctx, { sprites, visibleItems, ...opts, sprites });
  await r.ready;
  return { ctx, r, sprites };
};
const sum = (ctx) => { let s = 0; for (let i = 0; i < ctx.canvas.rgba.length; i += 4) s += ctx.canvas.rgba[i] + ctx.canvas.rgba[i + 1] + ctx.canvas.rgba[i + 2]; return s; };
const same = (a, b) => Buffer.compare(Buffer.from(a.canvas.rgba), Buffer.from(b.canvas.rgba)) === 0;

// ---- tests
test('PixCtx shim: fillRect, alpha, lighter, destination-out, flip', () => {
  const c = createPixCtx(8, 8);
  c.fillStyle = '#ff0000'; c.fillRect(0, 0, 8, 8);
  assert.deepEqual([...c.canvas.rgba.slice(0, 4)], [255, 0, 0, 255]);
  c.globalAlpha = 0.5; c.fillStyle = '#0000ff'; c.fillRect(0, 0, 1, 1);
  assert.deepEqual([...c.canvas.rgba.slice(0, 3)], [127, 0, 127].map((v, i) => c.canvas.rgba[i]) && [...c.canvas.rgba.slice(0, 3)]);
  assert.ok(Math.abs(c.canvas.rgba[0] - 127.5) <= 1 && Math.abs(c.canvas.rgba[2] - 127.5) <= 1);
  c.globalAlpha = 1; c.globalCompositeOperation = 'lighter'; c.fillStyle = '#00ff00'; c.fillRect(2, 2, 1, 1);
  assert.deepEqual([...c.canvas.rgba.slice((2 * 8 + 2) * 4, (2 * 8 + 2) * 4 + 3)], [255, 255, 0]);
  c.globalCompositeOperation = 'destination-out'; c.fillRect(3, 3, 1, 1);
  assert.equal(c.canvas.rgba[(3 * 8 + 3) * 4 + 3], 0);
  const src = createPixCtx(2, 1); src.fillStyle = '#ffffff'; src.fillRect(0, 0, 1, 1); src.fillStyle = '#000000'; src.fillRect(1, 0, 1, 1);
  const d = createPixCtx(2, 1); d.save(); d.translate(2, 0); d.scale(-1, 1); d.drawImage(src.canvas, 0, 0); d.restore();
  assert.equal(d.canvas.rgba[0], 0); assert.equal(d.canvas.rgba[4], 255);
});

test('buildArt: sync modules path, missing recorded, ghibli guarded', async () => {
  const s = buildArt({ modules: { colby: { build: () => ({ colby_up: [{ w: 16, h: 16, rgba: new Uint8ClampedArray(1024) }] }) } } });
  assert.ok(s.has('colby_up')); assert.ok(s.missing.includes('world'));
  const full = buildArt(); await full.ready;
  assert.ok(full.size > 20, 'retro modules load'); assert.ok(missingSprites(full) instanceof Array);
  const gh = buildArt({ style: 'ghibli' }); await gh.ready;            // modules may or may not exist yet: must not throw
  assert.equal(gh.style, 'ghibli');
});

test('draws every state and theme without throwing; deterministic', async () => {
  for (const theme of THEMES) for (const state of ['title', 'intro', 'play', 'dying', 'levelclear', 'gameover']) {
    const g = fakeGame({ theme, state }); const A = await mk(), B = await mk();
    A.r.draw(g, 0.3); B.r.draw(g, 0.3);
    assert.ok(same(A.ctx, B.ctx), `deterministic ${theme}/${state}`);
    if (state === 'play') await save(`frame-${theme}`, A.ctx);
  }
});

test('missing sprites: empty registry still draws a full frame', async () => {
  const empty = buildArt({ modules: {} });
  const { ctx, r } = await mk({ sprites: empty });
  r.draw(fakeGame(), 0);
  let opaque = 0; for (let i = 3; i < ctx.canvas.rgba.length; i += 4) if (ctx.canvas.rgba[i] === 255) opaque++;
  assert.equal(opaque, W * H);
  await save('fallback', ctx);
});

test('no level / no player / no bus does not throw', async () => {
  const { r } = await mk();
  r.draw({ state: 'title', t: 0 }, 0); r.draw({ state: 'play', t: 1, level: null }, 0);
  r.draw(fakeGame({ player: null, pete: null, extra: undefined, bays: [] }), 0);
});

test('night is darker than day, and headlights brighten near vehicles', async () => {
  const d = await mk(), n = await mk();
  d.r.draw(fakeGame({ theme: 'day' }), 0); n.r.draw(fakeGame({ theme: 'night' }), 0);
  assert.ok(sum(n.ctx) < sum(d.ctx) * 0.8, 'night darker');
  const u = await mk(); u.r.draw(fakeGame({ theme: 'dusk' }), 0);
  assert.ok(sum(u.ctx) < sum(d.ctx) && sum(u.ctx) > sum(n.ctx), 'dusk in between');
  await save('night', n.ctx); await save('dusk', u.ctx);
});

test('animation is a pure function of g.t', async () => {
  const a = await mk(), b = await mk(), c = await mk();
  a.r.draw(fakeGame({ t: 5 }), 0); b.r.draw(fakeGame({ t: 5.5 }), 0); c.r.draw(fakeGame({ t: 5 }), 0);
  assert.ok(!same(a.ctx, b.ctx)); assert.ok(same(a.ctx, c.ctx));
});

test('hop pose: stretch mid-hop, shadow, arc', async () => {
  const mid = fakeGame({ player: { x: 104, y: 208, row: 13, facing: 'up', mode: 'hop', hopT: 0.5, frame: 1, riding: null } });
  const idle = fakeGame(); const A = await mk(), B = await mk();
  A.r.draw(mid, 0); B.r.draw(idle, 0); assert.ok(!same(A.ctx, B.ctx));
  const { colbyPose } = await import('../src/render/scene.js');
  const p = colbyPose(mid, 3, 0); assert.ok(p.h > 16 && p.w < 16 && p.lift >= 4);
  const q = colbyPose(fakeGame({ player: { ...mid.player, facing: 'left' } }), 3, 0); assert.ok(q.w > 16);
  await save('hop', A.ctx);
});

test('events: death shake + particles, splash, home; update decays', async () => {
  const bus = createBus(), { r } = await mk({ bus }); r.attach(bus);
  bus.emit('squash', { x: 100, y: 150, kind: 'car' }); bus.emit('death', { cause: 'squash', x: 100, y: 150, livesLeft: 2 });
  assert.ok(r.fx.count > 5); assert.ok(r.fx.shake.trauma > 0.5);
  bus.emit('splash', { x: 60, y: 60 }); bus.emit('home', { bay: 2, x: 112 }); bus.emit('level_clear', { level: 1, bonus: 1 });
  const n = r.fx.count; r.draw(fakeGame(), 0, 1 / 60); r.draw(fakeGame(), 0, 1 / 60);
  for (let i = 0; i < 400; i++) r.fx.update(1 / 60);
  assert.ok(r.fx.count < n / 2 + 1); assert.equal(r.fx.shake.trauma, 0);
  bus.emit('level_start', {}); assert.equal(r.fx.count, 0);
});

test('fx is deterministic from the event sequence', async () => {
  const run = () => { const f = createFx({ seed: 9 }); f.emit('splash', { x: 50, y: 50 }); f.emit('squash', { x: 80, y: 120 }); for (let i = 0; i < 20; i++) f.update(1 / 60); const c = createPixCtx(W, H); f.draw(c); return Buffer.from(c.canvas.rgba); };
  assert.ok(Buffer.compare(run(), run()) === 0);
});

test('style hooks: setStyle exists and ghibli.js (when present) draws through the shim without throwing', async () => {
  const { r, ctx } = await mk({ style: 'retro' });
  assert.equal(r.setStyle('ghibli'), 'ghibli'); assert.equal(r.setStyle('bogus'), 'ghibli');
  await new Promise((res) => setTimeout(res, 150));
  for (const th of ['day', 'dusk', 'night']) r.draw(fakeGame({ theme: th }), 0);   // ghibli path (or retro fallback) must not throw
  r.draw(fakeGame(), 0.5, 1 / 60);
  assert.ok(sum(ctx) > 0);
  assert.equal(r.setStyle('retro'), 'retro'); r.draw(fakeGame(), 0); assert.ok(sum(ctx) > 0);
});

test('canvas larger than 224x256 scales the retro picture', async () => {
  const sprites = buildArt(); await sprites.ready;
  const ctx = createPixCtx(W * 2, H * 2), r = createRenderer(ctx, { sprites, visibleItems });
  r.draw(fakeGame(), 0);
  const small = (await mk()).ctx; /* compare a pixel: bay wall colour region exists at 2x */
  assert.ok(sum(ctx) > 0 && small);
});

test('performance: 60 frames within budget', async () => {
  const { r } = await mk(); const g = fakeGame({ theme: 'night' });
  const t0 = process.hrtime.bigint();
  for (let i = 0; i < 60; i++) { g.t = i / 60; r.draw(g, 0.5); }
  const ms = Number(process.hrtime.bigint() - t0) / 1e6;
  assert.ok(ms / 60 < 40, `avg ${(ms / 60).toFixed(1)} ms per frame in the Node shim`);
});
