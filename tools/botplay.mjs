#!/usr/bin/env node
// Headless botplay: node tools/botplay.mjs --levels 1..10 --seeds 1..10 [--skill 1] [--lives 3] [--verbose] [--json]
// Plays each (level, seed) on a fresh game with the real createGame + autopilot; prints clear time, deaths, verdict.
import { createGame } from '../src/sim/game.js';
import { levelDef } from '../src/levels/levels.js';
import { createBot } from '../src/sim/autopilot.js';
import { DT, TIME_LIMIT } from '../src/core/defs.js';

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf('--' + name); return i < 0 ? def : (args[i + 1] ?? true); };
const range = (s) => { const m = String(s).match(/^(\d+)(?:\.\.(\d+))?$/); if (!m) throw new Error('bad range ' + s); const a = +m[1], b = +(m[2] ?? m[1]); return Array.from({ length: b - a + 1 }, (_, i) => a + i); };
const levels = range(opt('levels', '1..10')), seeds = range(opt('seeds', '1..10'));
const skill = +opt('skill', 1), lives = +opt('lives', 3), verbose = args.includes('--verbose'), asJson = args.includes('--json');
const MAX_STEPS = Math.round(lives * 6 * TIME_LIMIT / DT);   // generous: every life may burn a full timer per bay

export function playLevel(level, seed, { skill = 1, lives = 3, maxSteps = MAX_STEPS } = {}) {
  const deaths = [];
  const bus = { emit(type, p) { if (type === 'death') deaths.push({ cause: p?.cause, row: p?.row ?? g?.player?.row, t: +g.t.toFixed(2) }); }, on() { return () => {}; } };
  const g = createGame({ seed, level, startLives: lives, bus, levelDef });
  const bot = createBot({ skill, seed });
  let steps = 0, verdict = 'timeout', clearT = null;
  const t0 = Date.now();
  while (steps++ < maxSteps) {
    if (g.state === 'levelclear') { verdict = 'clear'; clearT = g.t; break; }
    if (g.state === 'gameover') { verdict = 'gameover'; break; }
    g.step(bot.decide(g));
  }
  return { level, seed, verdict, clearT, deaths, bays: g.bays.filter((b) => b.filled).length, score: g.score, ms: Date.now() - t0, stats: bot.stats };
}

const rows = [];
for (const level of levels) {
  const res = seeds.map((seed) => playLevel(level, seed, { skill, lives }));
  rows.push(...res);
  if (!asJson) {
    const cleared = res.filter((r) => r.verdict === 'clear');
    const avg = cleared.length ? (cleared.reduce((a, r) => a + r.clearT, 0) / cleared.length).toFixed(1) : '-';
    const nd = res.reduce((a, r) => a + r.deaths.length, 0);
    const causes = {};
    res.forEach((r) => r.deaths.forEach((d) => { causes[d.cause] = (causes[d.cause] || 0) + 1; }));
    console.log(`L${String(level).padStart(2)}  clear ${cleared.length}/${res.length}  avgTime ${avg}s  deaths ${nd} ${JSON.stringify(causes)}  ${res.every((r) => r.verdict === 'clear') ? 'PASS' : 'FAIL'}`);
    if (verbose) res.forEach((r) => console.log(`   seed ${r.seed}: ${r.verdict} t=${r.clearT?.toFixed(1) ?? '-'} bays=${r.bays} deaths=${JSON.stringify(r.deaths)} ${r.ms}ms`));
    else res.filter((r) => r.verdict !== 'clear').forEach((r) => console.log(`   seed ${r.seed}: ${r.verdict} bays=${r.bays} deaths=${JSON.stringify(r.deaths)}`));
  }
}
const ok = rows.every((r) => r.verdict === 'clear');
if (asJson) console.log(JSON.stringify(rows));
else console.log(ok ? `VERDICT: PASS (${rows.length} runs, skill ${skill})` : `VERDICT: FAIL (${rows.filter((r) => r.verdict !== 'clear').length}/${rows.length} runs not cleared, skill ${skill})`);
process.exit(ok ? 0 : 1);
