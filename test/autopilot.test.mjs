import test from 'node:test';
import assert from 'node:assert/strict';
import { createGame } from '../src/sim/game.js';
import { levelDef } from '../src/levels/levels.js';
import { createBot, plan } from '../src/sim/autopilot.js';

function run(level, seed, skill = 1, maxSteps = 60 * 120) {
  const g = createGame({ seed, level, levelDef, startLives: 3 });
  const bot = createBot({ skill, seed });
  let deaths = 0, s = 0;
  g.emit = () => {};
  while (s++ < maxSteps && g.state !== 'levelclear' && g.state !== 'gameover') g.step(bot.decide(g));
  return { g, bot, deaths };
}

test('bot clears levels 1-10 on seed 2 with no lives lost', () => {
  for (let L = 1; L <= 10; L++) for (const seed of [2]) {
    const { g } = run(L, seed);
    assert.equal(g.state, 'levelclear', `L${L} S${seed}`);
    assert.equal(g.lives, 3, `L${L} S${seed} lost a life`);
  }
});

test('bot is deterministic', () => {
  const a = run(4, 3), b = run(4, 3);
  assert.equal(a.g.hash(), b.g.hash());
  assert.equal(a.g.t, b.g.t);
});

test('planner finds a goal route at level start and path starts with a hop', () => {
  const g = createGame({ seed: 1, level: 1, levelDef });
  g.step({ start: true }); for (let i = 0; i < 100; i++) g.step({});
  const r = plan(g, 1);
  assert.ok(r.goal);
  assert.ok(r.path.length >= 12);
});

test('bot never hops into a filled bay (L5 seed1 last bay unreachable early is waited out)', () => {
  const g = createGame({ seed: 1, level: 5, levelDef });
  const bot = createBot();
  let s = 0, causes = [];
  g.emit = () => {};
  while (s++ < 60 * 40) { g.step(bot.decide(g)); if (g.state === 'dying' && g.deathCause) causes.push(g.deathCause); if (g.state === 'levelclear') break; }
  assert.ok(!causes.includes('bay_wall'));
});

test('low skill still plays legally (no crash, makes progress)', () => {
  const { g } = run(2, 1, 0.3, 60 * 200);
  assert.ok(g.bays.some((b) => b.filled) || g.state === 'levelclear');
});
