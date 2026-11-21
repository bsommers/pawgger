import test from 'node:test';
import assert from 'node:assert/strict';
import { ART } from '../src/core/defs.js';
import { build } from '../src/art/vehicles.js';

const want = ART.filter((a) => a[0] === 'vehicles');
const bytes = (b) => Object.values(b).flat().map((p) => Buffer.from(p.rgba).toString('hex') + Buffer.from(p.mat).toString('hex')).join('|');
function bbox(p) {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.rgba[(y * p.w + x) * 4 + 3] >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
}

test('manifest conformance', () => {
  const b = build();
  assert.equal(want.length, 9);
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

test('vehicles: wheels on bottom row, nothing empty, transparent background', () => {
  const b = build();
  for (const [, name, w, h] of want) {
    if (name === 'glow_head') continue;
    for (const f of b[name]) {
      const bb = bbox(f);
      assert.equal(bb.y1, h - 1, name + ' bottom row');
      assert.ok(bb.x0 <= 1 && bb.x1 >= w - 2, name + ' spans width');
      assert.ok(bb.y0 >= 0);
      let op = 0; for (let i = 3; i < f.rgba.length; i += 4) if (f.rgba[i] >= 128) op++;
      assert.ok(op > 0 && op < w * h);
    }
  }
});

test('glow_head is soft, translucent and emissive', () => {
  const p = build().glow_head[0];
  let maxA = 0, emit = 0;
  for (let i = 0; i < p.w * p.h; i++) { maxA = Math.max(maxA, p.rgba[i * 4 + 3]); emit = Math.max(emit, p.mat[i * 4]); }
  assert.ok(maxA >= 128 && maxA < 255);
  assert.equal(emit, 255);
});
