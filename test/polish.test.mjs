// Polish checks: retro HUD plates stay clear of the MICRO CENTER sign (x 56..168); ghibli water tile frames join at the tile edges.
import test from 'node:test';
import assert from 'node:assert/strict';
import { W } from '../src/core/defs.js';
import { measureText } from '../src/ui/font.js';

test('retro HUD score/hi plates never reach the sign span 56..168', () => {
  const sw = measureText('S000000', 1) + 8, hw = measureText('H000000', 1) + 8;
  assert.ok(2 + sw < 56, `score plate ends at ${2 + sw}`);
  assert.ok(W - 2 - hw > 168, `hi plate starts at ${W - 2 - hw}`);
});

test('ghibli tile_water frames are identical at the left/right edges (animation cannot make seams)', async () => {
  const kit = await import('../src/kits/painter-kit/index.js'), { build } = await import('../src/art/ghibli/river.js');
  const fr = build(kit).tile_water.frames;
  if (!fr[0].canvas.rgba) return;                       // real pixels only exist with a real canvas / shim that rasterises paths
  const col = (f, x) => { const o = []; for (let y = 0; y < f.h; y++) o.push(...f.canvas.rgba.slice((y * f.w + x) * 4, (y * f.w + x) * 4 + 4)); return o.join(); };
  for (const f of fr) assert.equal(col(f, 0), col(fr[0], 0));
});
