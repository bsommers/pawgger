import test from 'node:test';
import assert from 'node:assert/strict';
import * as kit from '../../src/kits/painter-kit/index.js';

test('surface is a recording shim in Node', () => {
  const s = kit.makeSurface(64, 32);
  assert.equal(s.w, 64); assert.equal(s.h, 32); assert.ok(s.isShim);
  s.ctx.fillRect(0, 0, 1, 1); assert.equal(s.ctx.count('fillRect'), 1);
});
test('paths and gradients draw', () => {
  const { ctx } = kit.makeSurface(100, 100);
  kit.blob(ctx, 50, 50, 20, 20); ctx.fill();
  kit.cloud(ctx, 50, 50, 80, 30); ctx.fill();
  kit.leaf(ctx, 10, 10, 20, 5); ctx.fill();
  kit.roundRect(ctx, 0, 0, 10, 10, 3); ctx.fill();
  const g = kit.lin(ctx, 0, 0, 0, 10, ['#fff', '#000']); assert.equal(g.stops.length, 2);
  const r = kit.radial(ctx, 5, 5, 0, 5, [[0, '#fff'], [1, '#000']]); assert.equal(r.kind, 'radial');
  assert.equal(ctx.count('fill'), 4);
});
test('deterministic', () => {
  const run = seed => { const { ctx } = kit.makeSurface(100, 100); kit.blob(ctx, 50, 50, 20, 20, { seed }); kit.paperGrain(ctx, 100, 100, seed); kit.washFill(ctx, c => kit.blob(c, 5, 5, 3, 3, { seed }), '#f00', { bounds: { x: 0, y: 0, w: 10, h: 10 } }); return JSON.stringify(ctx.calls); };
  assert.equal(run(3), run(3)); assert.notEqual(run(3), run(4));
});
test('effects emit drawing', () => {
  const { ctx } = kit.makeSurface(100, 100);
  kit.softShadow(ctx, 50, 50, 20, 6); assert.ok(ctx.count('fill') >= 1);
  ctx.reset(); kit.paperGrain(ctx, 200, 200, 1); assert.ok(ctx.count("fillRect") > 10);
  ctx.reset(); kit.brush(ctx, [[0, 0], [5, 5], [10, 0]]); assert.equal(ctx.count('stroke'), 2);
  ctx.reset(); kit.paperGrain(ctx, 1e5, 1e5, 1); assert.ok(ctx.count('fillRect') <= 6000);
});
test('save/restore balanced and sway bounded', () => {
  const { ctx } = kit.makeSurface(200, 200);
  kit.drawCloud(ctx, 50, 50, 80, 30); kit.drawGrassTuft(ctx, 20, 100); kit.drawCatBlob(ctx, 100, 100); kit.drawLog(ctx, 10, 150, 120, 24);
  assert.equal(ctx.count('save'), ctx.count('restore'));
  for (let t = 0; t < 50; t += 0.37) assert.ok(Math.abs(kit.sway(t, 1, 2)) <= 2);
});
test('colour helpers', () => {
  assert.deepEqual(kit.parseColor('#f80'), [255, 136, 0, 1]);
  assert.equal(kit.mix('#000000', '#ffffff', 0.5), 'rgba(128,128,128,1)');
});
