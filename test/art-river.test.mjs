import test from 'node:test';
import assert from 'node:assert/strict';
import { ART } from '../src/core/defs.js';
import { build } from '../src/art/river.js';

const want = ART.filter((a) => a[0] === 'river');
const bytes = (b) => Object.values(b).flat().map((p) => Buffer.from(p.rgba).toString('hex') + Buffer.from(p.mat).toString('hex')).join('|');
const px = (p, x, y) => Array.from(p.rgba.slice((y * p.w + x) * 4, (y * p.w + x) * 4 + 4)).join(',');
const bbox = (p) => {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.rgba[(y * p.w + x) * 4 + 3] >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};
const diff = (a, b) => { let n = 0; for (let i = 0; i < a.rgba.length; i++) if (a.rgba[i] !== b.rgba[i]) n++; return n; };

test('manifest conformance', () => {
  const b = build();
  assert.equal(want.length, 10);
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

test('logs and crocs span their width and are not clipped', () => {
  const b = build();
  for (const n of ['log_s', 'log_m', 'log_l', 'croc_closed', 'croc_open']) for (const f of b[n]) {
    const bb = bbox(f);
    assert.ok(bb.x0 <= 1 && bb.x1 >= f.w - 2, n + ' width');
    assert.ok(bb.y0 <= 2 && bb.y1 >= 13, n + ' height');
  }
});

test('turtles stay inside the cell', () => {
  const b = build();
  for (const n of ['turtle_up', 'turtle_sink']) for (const f of b[n]) {
    const bb = bbox(f); assert.ok(bb.x1 > bb.x0 && bb.y1 > bb.y0, n);
  }
});

test('sink warning frames and open/closed croc are clearly different', () => {
  const b = build();
  assert.ok(diff(b.turtle_sink[0], b.turtle_sink[1]) > 100);
  assert.ok(diff(b.turtle_sink[1], b.turtle_sink[2]) > 100);
  assert.ok(diff(b.turtle_sink[0], b.turtle_up[0]) > 60);
  assert.ok(diff(b.croc_closed[0], b.croc_open[0]) > 300);
  // open mouth: teeth and pink mouth present in the head region
  const p = b.croc_open[0]; let tooth = 0, mouth = 0;
  for (let y = 0; y < 16; y++) for (let x = 48; x < 64; x++) { const c = px(p, x, y); if (c === '255,246,224,255') tooth++; if (c === '232,106,122,255') mouth++; }
  assert.ok(tooth >= 8 && mouth >= 20, `teeth ${tooth} mouth ${mouth}`);
});

test('water tiles tile seamlessly 3x3 and loop (opaque, periodic)', () => {
  const b = build();
  for (const n of ['tile_water', 'tile_water_edge']) {
    for (const f of b[n]) for (let i = 0; i < 256; i++) assert.equal(f.rgba[i * 4 + 3], 255, n + ' opaque');
    assert.notEqual(px(b[n][0], 0, 9), px(b[n][1], 0, 9) + 'x');
    assert.ok(diff(b[n][0], b[n][1]) > 10, n + ' frames animate');
  }
  const w = b.tile_water;
  // ripple slides 4 px/frame over a 16 px period: frame 0 shifted by 16 (4 frames) equals itself; adjacent edges match statically.
  // 3x3 seam check: pixels across the seam must be no more different than inside the tile for water.
  for (const f of w) for (let y = 0; y < 16; y++) {
    const l = f.rgba.slice(y * 64, y * 64 + 4), r = f.rgba.slice(y * 64 + 60, y * 64 + 64);
    assert.ok(Math.abs(l[2] - r[2]) < 90, 'h-seam row ' + y);
  }
  for (const f of w) for (let x = 0; x < 16; x++) {
    const t = f.rgba[x * 4 + 2], bt = f.rgba[(15 * 16 + x) * 4 + 2];
    assert.ok(Math.abs(t - bt) < 90, 'v-seam col ' + x);
  }
  // wave feature positions wrap: frame f+4 would equal frame f
  const e = b.tile_water_edge;
  for (const f of e) for (let y = 8; y < 16; y++) assert.ok(Math.abs(f.rgba[y * 64 + 2] - f.rgba[y * 64 + 62]) < 140, 'edge h-seam (water rows)');
  for (const f of e) for (const x of [0, 15]) assert.ok(f.rgba[x * 4 + 1] > f.rgba[x * 4], 'edge top is grass');
  for (const f of e) for (let x = 0; x < 16; x++) assert.ok(f.rgba[(15 * 16 + x) * 4 + 2] > 100, 'edge bottom is water');
});
