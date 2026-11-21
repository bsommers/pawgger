import test from 'node:test';
import assert from 'node:assert/strict';
import { makeHop, hopTarget, startHop, stepHop, queueHop, takeQueued } from '../../src/lib/grid-hop.js';

const mk = () => ({ x: 32, y: 48, hop: null, hopT: 0, facing: 'up', queued: null });

test('hopTarget moves one cell', () => {
  const p = mk();
  assert.deepEqual(hopTarget(p, 'up'), { x: 32, y: 32 });
  assert.deepEqual(hopTarget(p, 'right'), { x: 48, y: 48 });
  assert.equal(hopTarget(p, 'bogus'), null);
});
test('hop interpolates linearly and lands exactly', () => {
  const cfg = makeHop({ hopTime: 0.1 });
  const p = mk();
  assert.equal(startHop(p, 'left', cfg), true);
  assert.equal(startHop(p, 'up', cfg), false, 'busy');
  assert.equal(stepHop(p, 0.05, cfg), null);
  assert.ok(Math.abs(p.x - 24) < 1e-9);
  assert.equal(stepHop(p, 0.06, cfg), 'landed');
  assert.deepEqual([p.x, p.y, p.hop], [16, 48, null]);
});
test('limit callback can clamp or block', () => {
  const cfg = makeHop({ limit: (p, t, dir) => (dir === 'down' ? null : { x: Math.min(t.x, 40), y: t.y }) });
  const p = mk();
  assert.equal(startHop(p, 'down', cfg), false);
  startHop(p, 'right', cfg);
  assert.equal(p.hop.tx, 40);
});
test('queue keeps only the latest press', () => {
  const p = mk();
  queueHop(p, 'left'); queueHop(p, 'right');
  assert.equal(takeQueued(p), 'right');
  assert.equal(takeQueued(p), null);
});
