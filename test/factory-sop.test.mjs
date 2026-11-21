// Verifies the staged ship-showcase SOP files (proposed factory contribution).
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = path.resolve(ROOT, '../game-factory/proposed/pawgger');
const have = fs.existsSync(P);
const T = path.join(P, 'new/templates/web-project');
const rd = f => fs.readFileSync(f, 'utf8');
const opts = { skip: !have && 'game-factory proposals not present' };

test('skill has factory frontmatter and required sections', opts, () => {
  const s = rd(path.join(P, 'new/skills/ship-showcase.md'));
  const fm = s.match(/^---\n([\s\S]*?)\n---/)[1];
  for (const k of ['name: ship-showcase', 'description:', 'triggers:', 'needs:', 'outputs:', 'model:', 'cost:', 'capabilities:']) assert.ok(fm.includes(k), k);
  for (const h of ['## Steps', '## Gotchas', '## Verification']) assert.ok(s.includes(h), h);
  assert.match(s, /200/);
  assert.match(s, /parody/i);
});

test('shots.config.json is valid with 2+ styles and a hero', opts, () => {
  const c = JSON.parse(rd(path.join(T, 'shots.config.json')));
  assert.ok(c.styles.length >= 2 && c.shots.length >= 3 && c.hero.out);
});

test('shots.mjs dry run plans shot x style captures', opts, () => {
  const r = spawnSync(process.execPath, [path.join(T, 'tools/shots.mjs'), '--dry', '--hero'], { encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const lines = r.stdout.split('\n').filter(l => l.startsWith('node tools/shot.mjs'));
  const c = JSON.parse(rd(path.join(T, 'shots.config.json')));
  assert.equal(lines.length, c.shots.length * c.styles.length + 1);
  assert.ok(lines.some(l => l.includes('style=alt')));
});

test('make-gif.sh crops then palettes; refuses empty input', opts, () => {
  const s = rd(path.join(T, 'tools/make-gif.sh'));
  assert.ok(s.indexOf('crop=') < s.indexOf('palettegen'));
  const r = spawnSync('sh', [path.join(T, 'tools/make-gif.sh'), path.join(ROOT, 'out/none-frames')], { encoding: 'utf8' });
  assert.notEqual(r.status, 0);
});

test('pages workflow tests, assembles play/, deploys', opts, () => {
  const w = rd(path.join(T, '.github/workflows/pages.yml'));
  for (const k of ['npm test', '_site/play', 'upload-pages-artifact', 'deploy-pages', 'pages: write']) assert.ok(w.includes(k), k);
});

test('README template has every showcase section', opts, () => {
  const r = rd(path.join(T, 'README.template.md'));
  for (const k of ['banner', 'shields.io', 'hero.gif', 'Style: classic', 'The story', 'Controls', 'How it is built', 'swarm', 'Credits', 'parody']) assert.ok(r.toLowerCase().includes(k.toLowerCase()), k);
});

test('each .proposed patch targets a real factory file and has hunks', opts, () => {
  const ps = fs.readdirSync(P).filter(f => f.endsWith('.proposed'));
  assert.ok(ps.length >= 5);
  for (const f of ps) assert.match(rd(path.join(P, f)), /^@@ /m, f);
});

test('changelog logs the ship-showcase entry', opts, () => {
  assert.match(rd(path.join(P, 'CHANGELOG-PAWGGER.md')), /ship-showcase/);
});
