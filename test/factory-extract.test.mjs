// Checks the factory-extract staging: index table, patches apply to copies of the live files, new libs pass their tests.
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const F = path.resolve(ROOT, '../game-factory'), P = path.join(F, 'proposed/pawgger');
const opts = { skip: !fs.existsSync(P) && 'proposals not present' };
const rd = (f) => fs.readFileSync(f, 'utf8');

test('docs exist and changelog has an index with every staged entry', opts, () => {
  for (const f of ['README.md', 'LEARNINGS-PAWGGER.md']) assert.ok(fs.existsSync(path.join(P, f)), f);
  const c = rd(path.join(P, 'CHANGELOG-PAWGGER.md'));
  assert.ok(c.indexOf('## Index') < c.indexOf('## Entries'));
  const rows = c.split('## Entries')[0].split('\n').filter((l) => /^\| \d+ \|/.test(l));
  assert.ok(rows.length >= 16);
  for (const k of ['grid-hop-autopilot', 'build-web', 'shot.mjs', 'painter-kit', 'ship-showcase']) assert.ok(c.includes(k), k);
});

test('every .proposed patch has hunks and applies to a copy of its live target', opts, () => {
  const live = { 'tools_web_pkg_build-web.mjs.proposed': 'tools/web/pkg/build-web.mjs', 'tools_web_shot.mjs.proposed': 'tools/web/shot.mjs' };
  for (const [pf, target] of Object.entries(live)) {
    const d = fs.mkdtempSync(path.join(ROOT, 'out', 'fx-test-'));
    fs.mkdirSync(path.dirname(path.join(d, target)), { recursive: true });
    fs.copyFileSync(path.join(F, target), path.join(d, target));
    const r = spawnSync('patch', ['-p1', '-i', path.join(P, pf)], { cwd: d, encoding: 'utf8' });
    assert.equal(r.status, 0, pf + r.stdout + r.stderr);
    fs.rmSync(d, { recursive: true, force: true });
  }
});

test('new grid-hop libs run their tests in a scratch dir', opts, () => {
  const d = fs.mkdtempSync(path.join(ROOT, 'out', 'fx-test-'));
  for (const sub of ['src/lib', 'test/lib']) { fs.mkdirSync(path.join(d, sub), { recursive: true }); for (const f of fs.readdirSync(path.join(P, 'new', sub))) if (f.startsWith('grid-hop')) fs.copyFileSync(path.join(P, 'new', sub, f), path.join(d, sub, f)); }
  fs.writeFileSync(path.join(d, 'package.json'), '{"type":"module"}');
  const r = spawnSync(process.execPath, ['--test', 'test/lib/'], { cwd: d, encoding: 'utf8' });
  fs.rmSync(d, { recursive: true, force: true });
  assert.equal(r.status, 0, r.stdout.slice(-500));
});
