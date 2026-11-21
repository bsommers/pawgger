import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as kit from '../src/kits/painter-kit/index.js';
import { artManifest, STYLES, TOON_SCALE } from '../src/core/defs.js';
import { buildArt, missingSprites } from '../src/art/registry.js';
import { toonCtx, toonKit, TOON_INK } from '../src/art/toon/toonkit.js';
import { sha256, decodePng, encodePng, cutout, bbox } from '../src/kits/library-sprites/index.js';
import { sanitizeSettings } from '../src/core/settings.js';
import * as characters from '../src/art/toon/characters.js';
import * as vehicles from '../src/art/toon/vehicles.js';
import * as river from '../src/art/toon/river.js';
import * as world from '../src/art/toon/world.js';
import * as fx from '../src/art/toon/fx.js';

const root = new URL('../', import.meta.url).pathname;
const MODS = { colby: characters, vehicles, river, world, fx };

test('toon is a registered style with 4x scale', () => {
  assert.deepEqual([...STYLES], ['retro', 'ghibli', 'toon']); assert.equal(TOON_SCALE, 4);
  assert.equal(sanitizeSettings({ style: 'toon' }).style, 'toon'); assert.equal(sanitizeSettings({ style: 'x' }).style, 'retro');
});
for (const [mod, m] of Object.entries(MODS)) {
  test(`toon ${mod}: manifest conformance (names, sizes, frames)`, async () => {
    const built = await m.build(kit);
    const want = artManifest().filter((a) => a.module === mod);
    for (const a of want) {
      const v = built[a.name]; assert.ok(v, `missing ${a.name}`);
      assert.equal(v.frames.length, a.frames, `${a.name} frames`); assert.equal(v.w, a.w); assert.equal(v.h, a.h);
      for (const f of v.frames) { assert.equal(f.w, a.w * TOON_SCALE); assert.equal(f.h, a.h * TOON_SCALE); assert.ok(f.ctx.calls.length > 2, `${a.name} draws`); }
    }
    for (const k of Object.keys(built)) assert.ok(want.some((a) => a.name === k), `extra ${k}`);
  });
}
test('toon sprites are deterministic', async () => {
  const sig = async () => JSON.stringify(Object.entries(await characters.build(kit)).map(([k, v]) => [k, v.frames.map((f) => f.ctx.calls.length)]));
  assert.equal(await sig(), await sig());
});
test('buildArt(toon) provides every ART sprite', async () => {
  const s = buildArt({ style: 'toon', kit }); await s.ready;
  assert.equal(s.style, 'toon'); assert.deepEqual(missingSprites(s), []); assert.deepEqual(s.missing, []);
});
test('toon kit: gradients become flat colours, outlines thick near-black', () => {
  const rec = kit.makeSurface(8, 8).ctx, c = toonCtx(rec), tk = toonKit(kit);
  c.fillStyle = tk.lin(c, 0, 0, 0, 1, ['#111111', '#ff0000', '#00ff00']); assert.equal(rec.fillStyle, '#ff0000');
  c.fillStyle = tk.radial(c, 0, 0, 0, 1, [[0, '#fff'], [0.5, '#0000ff'], [1, '#000']]); assert.equal(rec.fillStyle, '#0000ff');
  c.strokeStyle = 'rgba(59,47,58,0.85)'; assert.equal(rec.strokeStyle, TOON_INK);
  c.strokeStyle = '#f0e0a0'; assert.equal(rec.strokeStyle, '#f0e0a0');
  c.lineWidth = 0.38; assert.ok(rec.lineWidth >= 0.5);
});
test('library cut-outs: manifest hashes, license, provenance, transparency', () => {
  const man = JSON.parse(readFileSync(root + 'src/art/toon/library/manifest.json', 'utf8'));
  assert.equal(man.license, 'CC0-1.0'); assert.match(man.library, /character-library/);
  const lock = JSON.parse(readFileSync(root + 'assets.lock.json', 'utf8'));
  for (const [name, s] of Object.entries(man.sprites)) {
    const bytes = readFileSync(root + `src/art/toon/library/${name}.png`);
    assert.equal(sha256(bytes), s.sha256, name);
    const img = decodePng(bytes); assert.equal(img.w, s.w); assert.equal(img.h, s.h);
    assert.equal(img.rgba[3], 0, 'corner transparent'); const bb = bbox(img); assert.ok(bb.y1 - bb.y0 > s.h * 0.95, 'figure fills height');
    const entry = lock.assets.find((a) => a.id === s.asset); assert.ok(entry, 'asset in assets.lock.json'); assert.equal(entry.files.find((f) => f.path === 'turnaround.jpeg').sha256, s.sourceSha256);
  }
  for (const a of lock.assets) assert.equal(JSON.parse(readFileSync(root + a.dest + '/asset.json', 'utf8')).license, 'CC0-1.0');
});
test('library-sprites kit: png round trip and cutout of a flat background', () => {
  const w = 40, h = 30, img = { w, h, rgba: new Uint8ClampedArray(w * h * 4) };
  for (let i = 0; i < w * h; i++) img.rgba.set([200, 195, 185, 255], i * 4);
  for (let y = 8; y < 22; y++) for (let x = 10; x < 30; x++) img.rgba.set([230, 120, 30, 255], (y * w + x) * 4);
  assert.deepEqual(decodePng(encodePng(img)).rgba, img.rgba);
  cutout(img, { tol: 20 }); assert.equal(img.rgba[3], 0); assert.deepEqual(bbox(img), { x0: 10, y0: 8, x1: 30, y1: 22 });
});
