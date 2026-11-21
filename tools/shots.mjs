#!/usr/bin/env node
// Capture every shot in shots.config.json for every style, and (with --hero) the hero GIF frames.
// node tools/shots.mjs [--config shots.config.json] [--only id,id] [--hero] [--dry]
// Needs tools/shot.mjs (headless Chrome over CDP). Writes <outDir>/<shot>-<style>.png, then
// --hero also runs tools/make-gif.sh (crop first, then ffmpeg palette GIF) unless --no-gif.
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const opt = (n, d) => { const i = args.indexOf(n); return i < 0 ? d : args[i + 1]; };
const cfgPath = path.resolve(ROOT, opt('--config', 'shots.config.json'));
const only = opt('--only', '') ? opt('--only').split(',') : null;
const dry = args.includes('--dry'), hero = args.includes('--hero');
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const styles = cfg.styles?.length ? cfg.styles : [{ id: 'default', query: '' }];
const outDir = path.resolve(ROOT, cfg.outDir || 'docs/screenshots');

const withQuery = (url, q) => (!q ? url : url + (url.includes('?') ? '&' : '?') + q);
function shot(url, out, s, extra = []) {
  const a = ['tools/shot.mjs', '--url', url, '--out', out, '--size', s.size || cfg.size || '1280x720'];
  if (s.wait != null) a.push('--wait', String(s.wait));
  if (s.waitFor) a.push('--wait-for', s.waitFor);
  if (s.eval) a.push('--eval', s.eval);
  if (s.keys) a.push('--keys', s.keys);
  a.push(...extra);
  if (dry) { console.log('node', a.join(' ')); return true; }
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = spawnSync(process.execPath, a, { cwd: ROOT, stdio: 'inherit' });
  return r.status === 0;
}

let failed = 0, made = 0;
for (const sh of cfg.shots || []) {
  if (only && !only.includes(sh.id)) continue;
  for (const st of styles) {
    const out = path.join(outDir, `${sh.id}-${st.id}.png`);
    if (shot(withQuery(sh.url, st.query), out, sh)) made++; else { failed++; console.error('FAILED', sh.id, st.id); }
  }
}
if (hero && cfg.hero) {
  const h = cfg.hero, st = styles.find((x) => x.id === h.style) || styles[0];
  const dir = path.join(ROOT, 'out/hero-frames');
  if (!dry) { fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true }); }
  if (shot(withQuery(h.url, st.query), path.join(dir, 'f.png'), h, ['--frames', String(h.frames || 40), '--interval', String(h.interval || 100)])) made++; else failed++;
}
if (hero && cfg.hero && !dry && !failed && !args.includes('--no-gif')) {
  const h = cfg.hero;
  const r = spawnSync('sh', ['tools/make-gif.sh', 'out/hero-frames', h.out || 'docs/hero.gif', h.crop || 'none', String(h.width || 640), String(h.fps || 10)], { cwd: ROOT, stdio: 'inherit' });
  if (r.status !== 0) failed++;
}
console.log(`shots: ${made} captured, ${failed} failed`);
process.exit(failed ? 1 : 0);
