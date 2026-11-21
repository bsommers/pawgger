import test from 'node:test';
import assert from 'node:assert/strict';
import * as kit from '../src/kits/painter-kit/index.js';
import { artManifest, GHIBLI_SCALE } from '../src/core/defs.js';
import * as world from '../src/art/ghibli/world.js';
import * as fx from '../src/art/ghibli/fx.js';

const MODS = { world, fx };
const sig = (b) => JSON.stringify(Object.entries(b).map(([k, v]) => [k, v.frames.map((f) => f.ctx.calls)]));

for (const [mod, m] of Object.entries(MODS)) {
  test(`ghibli ${mod}: manifest conformance`, () => {
    const built = m.build(kit);
    const want = artManifest().filter((a) => a.module === mod);
    assert.ok(want.length > 10);
    for (const a of want) {
      const v = built[a.name];
      assert.ok(v, `missing ${a.name}`);
      assert.equal(v.frames.length, a.frames, `${a.name} frames`);
      assert.equal(v.w, a.w); assert.equal(v.h, a.h);
      for (const f of v.frames) { assert.equal(f.w, a.w * GHIBLI_SCALE); assert.equal(f.h, a.h * GHIBLI_SCALE); }
    }
    for (const k of Object.keys(built)) assert.ok(want.some((a) => a.name === k), `extra ${k}`);
  });
  test(`ghibli ${mod}: deterministic and fast`, () => {
    const t0 = performance.now(); const a = m.build(kit); const ms = performance.now() - t0;
    assert.equal(sig(a), sig(m.build(kit)));
    assert.ok(ms < 400, `build took ${ms.toFixed(0)} ms`);
    for (const v of Object.values(a)) for (const f of v.frames) assert.ok(f.ctx.calls.length > 5, 'every frame draws something');
  });
}
