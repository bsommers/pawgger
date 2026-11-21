import test from 'node:test';
import assert from 'node:assert/strict';
import { createGhibliRenderer } from '../src/render/ghibli.js';
import { makeSurface as ms } from '../src/kits/painter-kit/index.js';
const makeSurface = (w, h) => { const sf = ms(w, h); const c = sf.canvas; if (sf.isShim) c.getContext = () => sf.ctx; c.ctx = sf.ctx; return c; };
import { buildArt } from '../src/art/registry.js';
import { createBus } from '../src/core/events.js';
import { levelDef } from '../src/levels/levels.js';

const mkG = (theme) => ({ t: 3.3, state: 'play', timeLeft: 5, level: { ...levelDef(3, 1), theme }, bays: [], popups: [{ x: 50, y: 50, text: '+10', age: 0.1, ttl: 1 }], extra: [], pete: { mode: 'patrol', x: 90, dir: 1, w: 24 },
  player: { x: 104, y: 216, row: 13, facing: 'up', mode: 'hop', hopT: 0.5, frame: 1 } });

test('draws all themes with sprites and without', async () => {
  const sprites = buildArt({ style: 'ghibli' }); await sprites.ready;
  for (const th of ['day', 'dusk', 'night']) for (const sp of [sprites, null]) {
    const s = makeSurface(896, 1024), ctx = s.getContext('2d');
    const r = createGhibliRenderer(ctx, { sprites: sp, makeCanvas: makeSurface });
    r.draw(mkG(th), 0.5, 1 / 60);
    assert.ok(ctx.calls.length > 200, th);
  }
});
test('deterministic from g.t', async () => {
  const sprites = buildArt({ style: 'ghibli' }); await sprites.ready;
  const run = () => { const s = makeSurface(896, 1024), ctx = s.getContext('2d'); const r = createGhibliRenderer(ctx, { sprites, makeCanvas: makeSurface }); r.draw(mkG('night'), 0, 0); return JSON.stringify(ctx.calls.map((c) => [c.op, c.args.map((a) => (typeof a === 'number' ? +a.toFixed(3) : typeof a))])); };
  assert.equal(run(), run());
});
test('bus events spawn particles', () => {
  const s = makeSurface(896, 1024), r = createGhibliRenderer(s.getContext('2d'), { makeCanvas: makeSurface }), bus = createBus();
  r.attach(bus); bus.emit('splash', { x: 50, y: 60 }); bus.emit('hop', { x: 10, y: 10 });
  assert.ok(r.particleCount() > 10);
});
