import test from 'node:test';
import assert from 'node:assert/strict';
import { ART } from '../src/core/defs.js';
import { build } from '../src/art/fx.js';

const want = ART.filter((a) => a[0] === 'fx');
const bytes = (b) => Object.values(b).flat().map((p) => Buffer.from(p.rgba).toString('hex') + Buffer.from(p.mat).toString('hex')).join('|');
const bbox = (p) => {
  let x0 = p.w, y0 = p.h, x1 = -1, y1 = -1;
  for (let y = 0; y < p.h; y++) for (let x = 0; x < p.w; x++) if (p.rgba[(y * p.w + x) * 4 + 3] >= 128) { x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y); }
  return { x0, y0, x1, y1 };
};

test('manifest conformance', () => {
  const b = build();
  assert.equal(want.length, 14);
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

test('nothing clipped: treasures and logo have transparent margins; scene fully opaque', () => {
  const b = build();
  for (const k of Object.keys(b).filter((n) => n.startsWith('tr_'))) for (const f of b[k]) {
    const r = bbox(f); assert.ok(r.x1 >= r.x0, k);
    assert.ok(r.x0 >= 0 && r.y0 >= 0 && r.x1 <= 11 && r.y1 <= 11, k);
  }
  const l = bbox(b.logo[0]); assert.ok(l.x0 >= 2 && l.x1 <= 189 && l.y0 >= 0 && l.y1 <= 47, JSON.stringify(l));
  const s = bbox(b.title_scene[0]); assert.deepEqual(s, { x0: 0, y0: 0, x1: 223, y1: 95 });
});

test('whopper is triple-decker: at least 3 dark patty rows', () => {
  const f = build().tr_whopper[0];
  let rows = 0;
  for (let y = 0; y < 12; y++) { const o = (y * 12 + 6) * 4; if (f.rgba[o] < 130 && f.rgba[o + 1] < 90 && f.rgba[o + 3] > 0 && f.rgba[o] > 40) rows++; }
  assert.ok(rows >= 3, 'patty rows ' + rows);
});
