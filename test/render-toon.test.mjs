import test from 'node:test';
import assert from 'node:assert/strict';
import { createToonRenderer } from '../src/render/toon.js';
import { createRenderer } from '../src/render/renderer.js';
import { makeSurface as ms } from '../src/kits/painter-kit/index.js';
import * as kit from '../src/kits/painter-kit/index.js';
import { buildArt } from '../src/art/registry.js';
import { levelDef } from '../src/levels/levels.js';
import { loadSettings } from '../src/core/settings.js';
import { createOptionsMenu } from '../src/ui/menus.js';

const makeSurface = (w, h) => { const sf = ms(w, h); const c = sf.canvas; if (sf.isShim) c.getContext = () => sf.ctx; c.ctx = sf.ctx; return c; };
const mkG = (theme) => ({ t: 3.3, state: 'play', timeLeft: 20, level: { ...levelDef(3, 1), theme }, bays: [], popups: [], extra: [], pete: { mode: 'taunt', x: 90, dir: 1, w: 24 },
  player: { x: 104, y: 216, row: 13, facing: 'up', mode: 'hop', hopT: 0.5, frame: 1 } });

test('toon renderer draws day/dusk/night with the toon sprite set and uses colby_up/pete_taunt', async () => {
  const sprites = buildArt({ style: 'toon', kit }); await sprites.ready;
  for (const th of ['day', 'dusk', 'night']) {
    const s = makeSurface(896, 1024), ctx = s.getContext('2d');
    const r = createToonRenderer(ctx, { sprites, makeCanvas: makeSurface });
    r.draw(mkG(th), 0.5, 1 / 60);
    assert.ok(ctx.calls.length > 200, th); assert.deepEqual(r.missing, [], 'no sprite missing');
  }
});
test('toon look is flat: no paper grain or vignette draw', async () => {
  const sprites = buildArt({ style: 'toon', kit }); await sprites.ready;
  const count = (create) => { const s = makeSurface(896, 1024), ctx = s.getContext('2d'); create(ctx).draw(mkG('day'), 0, 0); return ctx.calls.length; };
  const gh = buildArt({ style: 'ghibli', kit }); await gh.ready;
  const { createGhibliRenderer } = await import('../src/render/ghibli.js');
  assert.ok(count((c) => createToonRenderer(c, { sprites, makeCanvas: makeSurface })) < count((c) => createGhibliRenderer(c, { sprites: gh, makeCanvas: makeSurface })));
});
test('renderer.setStyle accepts toon, settings persist it, options menu cycles 3 styles', () => {
  const r = createRenderer(makeSurface(896, 1024).getContext('2d'), { makeCanvas: makeSurface });
  assert.equal(r.setStyle('toon'), 'toon'); assert.equal(r.setStyle('bogus'), 'toon'); assert.equal(r.setStyle('retro'), 'retro');
  const store = { d: {}, getItem(k) { return this.d[k] ?? null; }, setItem(k, v) { this.d[k] = v; } };
  store.setItem('pawgger.settings', JSON.stringify({ style: 'toon' })); assert.equal(loadSettings(store).style, 'toon');
  const s = { style: 'retro', master: 1, music: 1, sfx: 1 }, seen = [], m = createOptionsMenu(s, { change: (k) => k === 'style' && seen.push(s.style) });
  m.act('right'); m.act('right'); m.act('right'); assert.deepEqual(seen, ['ghibli', 'toon', 'retro']);
});
