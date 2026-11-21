import test from 'node:test';
import assert from 'node:assert/strict';
import { ART } from '../src/core/defs.js';
import { build } from '../src/art/colby.js';

const want = ART.filter((a) => (Array.isArray(a) ? a[0] : a.module) === 'colby').map((a) => (Array.isArray(a) ? { name: a[1], w: a[2], h: a[3], frames: a[4] } : a));
const bytes = (o) => Buffer.concat(Object.keys(o).sort().flatMap((k) => o[k].flatMap((f) => [Buffer.from(f.rgba), Buffer.from(f.mat)])));
const bbox = (f) => { let x0 = 99, y0 = 99, x1 = -1, y1 = -1; for (let y = 0; y < f.h; y++) for (let x = 0; x < f.w; x++) if (f.rgba[(y * f.w + x) * 4 + 3] >= 128) { x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); } return { x0, y0, x1, y1 }; };

test('manifest conformance', () => {
  const o = build();
  assert.equal(want.length, 10);
  for (const a of want) {
    const fr = o[a.name]; assert.ok(fr, 'missing ' + a.name); assert.equal(fr.length, a.frames, a.name);
    for (const f of fr) { assert.equal(f.w, a.w, a.name); assert.equal(f.h, a.h, a.name); const b = bbox(f); assert.ok(b.x1 >= 0, a.name + ' empty'); }
  }
  for (const k of Object.keys(o)) assert.ok(want.some((a) => a.name === k), 'extra ' + k);
});
test('determinism', () => { assert.ok(bytes(build()).equals(bytes(build()))); });
test('build time < 400 ms', () => { const t = performance.now(); build(); assert.ok(performance.now() - t < 400); });
test('characters are not clipped (outline in-bounds, feet on bottom rows)', () => {
  const o = build();
  for (const n of ['colby_up', 'colby_down', 'colby_left', 'colby_right', 'colby_home']) for (const f of o[n]) { const b = bbox(f); assert.ok(b.y1 >= f.h - 2, `${n} floats (bottom ${b.y1})`); }
});
test('outline never clipped: no non-outline pixel on the border', () => {
  const o = build();
  for (const [k, fr] of Object.entries(o)) fr.forEach((f, i) => {
    for (let t = 0; t < Math.max(f.w, f.h); t++) for (const [x, y] of [[t, 0], [t, f.h - 1], [0, t], [f.w - 1, t]]) {
      if (x >= f.w || y >= f.h) continue; const p = (y * f.w + x) * 4;
      const outl = f.rgba[p] === 0x1a && f.rgba[p + 1] === 0x14 && f.rgba[p + 2] === 0x20;
      assert.ok(f.rgba[p + 3] < 128 || outl, `${k}[${i}] art on border at ${x},${y}`);
    }
  });
});
