import test from 'node:test';
import assert from 'node:assert/strict';
import { ART, PAL } from '../src/core/defs.js';
import { build } from '../src/art/world.js';

const want = ART.filter((a) => a[0] === 'world');
const bytes = (b) => Object.values(b).flat().map((p) => Buffer.from(p.rgba).toString('hex') + Buffer.from(p.mat).toString('hex')).join('|');
const bbox = (p) => {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.rgba[(y * p.w + x) * 4 + 3] >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};

test('manifest conformance', () => {
  const b = build();
  assert.equal(want.length, 19);
  for (const [, name, w, h, n] of want) {
    assert.ok(b[name], 'missing ' + name);
    assert.equal(b[name].length, n, name + ' frames');
    for (const f of b[name]) { assert.equal(f.w, w); assert.equal(f.h, h); }
  }
  for (const k of Object.keys(b)) assert.ok(want.some((a) => a[1] === k), 'extra ' + k);
});

test('deterministic and fast', () => {
  const t0 = performance.now(); const a = build(); const ms = performance.now() - t0;
  assert.ok(ms < 400, 'build ' + ms + ' ms');
  assert.equal(bytes(a), bytes(build()));
});

test('tiles and strips are fully opaque', () => {
  const b = build();
  for (const n of ['tile_road', 'tile_road_dash', 'tile_curb', 'tile_median', 'tile_start', 'bay_empty', 'bay_wall', 'bay_croc', 'bay_snake', 'bg_ticker', 'sign_pete', 'bg_microcenter', 'bg_burger'])
    for (const f of b[n]) for (let i = 3; i < f.rgba.length; i += 4) assert.equal(f.rgba[i], 255, n + ' has a hole');
});

test('tiles are seamless in a 3x3 grid (edge columns match in character)', () => {
  const b = build();
  for (const n of ['tile_road', 'tile_road_dash', 'tile_curb', 'tile_median', 'tile_start'])
    for (const f of b[n]) {
      // repeating horizontally: the seam pair (x=15 | x=0) must not be a hard luminance step larger than typical in-tile steps
      const lum = (x, y) => { const i = (y * 16 + x) * 4; return f.rgba[i] + f.rgba[i + 1] + f.rgba[i + 2]; };
      let seam = 0, inner = 0;
      for (let y = 0; y < 16; y++) { seam += Math.abs(lum(15, y) - lum(0, y)); for (let x = 0; x < 15; x++) inner += Math.abs(lum(x, y) - lum(x + 1, y)) / 15; }
      assert.ok(seam <= inner * 2.5 + 60, `${n}: seam ${seam} vs inner ${inner}`);
    }
});

test('only PAL colours (shade/mix allowed on blends) in tiles of flat sprites', () => {
  const b = build(); const pal = new Set(Object.values(PAL).map((h) => h.toLowerCase()));
  const f = b.bay_empty[0]; let off = 0, tot = 0;
  for (let i = 0; i < f.rgba.length; i += 4) { tot++; const h = '#' + [0, 1, 2].map((k) => f.rgba[i + k].toString(16).padStart(2, '0')).join(''); if (!pal.has(h)) off++; }
  assert.ok(off / tot < 0.05, 'bay_empty off-palette ratio ' + off / tot);
});

test('sprites: not clipped by the cell and feet at the bottom row', () => {
  const b = build();
  for (const n of ['nerd', 'nerd_cheer']) for (const f of b[n]) {
    const bb = bbox(f);
    assert.ok(bb.x0 >= 0 && bb.x1 <= 15 && bb.y0 >= 0, n + ' clipped');
    if (n === 'nerd') assert.equal(bb.y1, 15, n + ' feet row');
  }
  for (const n of ['bay_mouse', 'bay_fish', 'bk_pole']) for (const f of b[n]) { const bb = bbox(f); assert.ok(bb.x1 > bb.x0 && bb.y1 > bb.y0, n + ' empty'); }
});

test('signs have bright text on dark/coloured board (readable)', () => {
  const b = build();
  for (const n of ['bg_microcenter', 'bg_burger']) {
    let white = 0; const f = b[n][0];
    for (let i = 0; i < f.rgba.length; i += 4) if (f.rgba[i] === 255 && f.rgba[i + 1] === 246 && f.rgba[i + 2] === 224) white++;
    assert.ok(white > 150, n + ' white text pixels ' + white);
  }
});
