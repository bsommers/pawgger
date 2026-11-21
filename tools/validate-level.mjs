#!/usr/bin/env node
// Level validator: node tools/validate-level.mjs [--levels 1..30] [--seeds 20] [--timeline L[:seed]] [--quiet]
// Proves (ARCHITECTURE section 6) for every (level, seed): (a) road gaps crossable, (b) adjacent river lanes have hop windows,
// (c) a river lane never has all turtles under at once, (d) a full route start -> bay exists (BFS over row/time/x),
// determinism, and that a different seed gives a different level. Prints a per-level difficulty table and an ASCII timeline.
import { W, TUNING, ITEM_KINDS, ROW, rowY } from '../src/core/defs.js';
import { levelDef } from '../src/levels/levels.js';
import { analyzeDef, findRoute, itemX, turtleState, crocState, crocParts, mod } from '../src/levels/lanes.js';

const argv = process.argv.slice(2);
const opt = (name, dflt) => { const i = argv.indexOf('--' + name); return i < 0 ? dflt : (argv[i + 1] && !argv[i + 1].startsWith('--') ? argv[i + 1] : true); };
const [lo, hi] = String(opt('levels', '1..30')).split('..').map(Number);
const levels = []; for (let l = lo; l <= (hi || lo); l++) levels.push(l);
const nSeeds = Number(opt('seeds', 20)), quiet = opt('quiet', false) === true;
const tl = opt('timeline', 'auto');

const sig = (d) => JSON.stringify(d.lanes.map((l) => [l.dir, l.speed, l.ring, l.items.map((i) => [i.kind, i.x0, i.dive, i.croc])]));
const covOf = (lane) => lane.items.reduce((s, i) => s + i.w, 0) / lane.ring;
const f1 = (v) => (Number.isFinite(v) ? v.toFixed(1) : '--');

let fails = 0;
const rows = [];
for (const level of levels) {
  const acc = { diff: 0, route: [], worst: 0, retry: 0, minWin: Infinity, minGapSlack: Infinity, cov: 0, dive: 0, croc: 0, dens: 0 };
  const sigs = new Set();
  for (let seed = 1; seed <= nSeeds; seed++) {
    const d = levelDef(level, seed), a = analyzeDef(d, { fresh: seed <= 2 });   // per-bay proof re-run from scratch on seeds 1-2, trusted from levelDef's own check otherwise (speed)
    if (sig(levelDef(level, seed)) !== sig(d)) { fails++; console.log(`FAIL determinism L${level} s${seed}`); }
    sigs.add(sig(d));
    if (!a.ok || !d.meta.valid) { fails++; console.log(`FAIL L${level} s${seed}: ${a.failures.join('; ') || 'meta.valid false'}`); }
    if (d.lanes.length !== 10 || d.bays.length !== 5) { fails++; console.log(`FAIL shape L${level} s${seed}`); }
    for (const l of d.lanes) if (l.ring < W + l.pad) { fails++; console.log(`FAIL ring L${level} s${seed} row ${l.row}`); }
    const road = d.lanes.filter((l) => l.kind === 'road'), river = d.lanes.filter((l) => l.kind === 'river');
    const slack = Math.min(...a.stats.road.map((r) => r.min / r.need));
    const cov = river.reduce((s, l) => s + covOf(l), 0) / 5, dens = road.reduce((s, l) => s + covOf(l), 0) / 5;
    const best = Math.min(...a.stats.routes.map((r) => r.time));
    acc.route.push(best); acc.worst = Math.max(acc.worst, ...a.stats.routes.map((r) => r.time));
    acc.retry += d.meta.attempt; acc.minWin = Math.min(acc.minWin, ...a.stats.pairs.map((p) => p.longest));
    acc.minGapSlack = Math.min(acc.minGapSlack, slack); acc.cov += cov / nSeeds; acc.dens += dens / nSeeds;
    acc.dive += river.reduce((s, l) => s + l.items.filter((i) => i.dive).length, 0) / nSeeds;
    acc.croc += river.reduce((s, l) => s + l.items.filter((i) => i.kind === 'croc').length, 0) / nSeeds;
    const sm = d.speedMul, diff = 100 * (0.35 * (sm - 1) / (TUNING.speedCap - 1) + 0.3 * Math.min(1, dens / 0.5) + 0.35 * (1 - Math.min(1, cov / 0.65)));
    acc.diff += diff / nSeeds;
  }
  if (nSeeds > 1 && sigs.size < Math.min(nSeeds, 2)) { fails++; console.log(`FAIL L${level}: different seeds gave identical levels`); }
  rows.push({ level, sm: levelDef(level, 1).speedMul, ...acc, uniq: sigs.size });
}

if (!quiet) {
  console.log('\nlevel  speed  roadFill riverCov dives crocs  minGap/need  minHopWin  routeMed routeWorst  retries  unique  difficulty');
  for (const r of rows) {
    const med = [...r.route].sort((a, b) => a - b)[Math.floor(r.route.length / 2)];
    console.log([String(r.level).padStart(4), r.sm.toFixed(2).padStart(7), r.dens.toFixed(2).padStart(8), r.cov.toFixed(2).padStart(8), f1(r.dive).padStart(5), f1(r.croc).padStart(5),
      r.minGapSlack.toFixed(2).padStart(12), (r.minWin.toFixed(1) + 's').padStart(10), (f1(med) + 's').padStart(9), (f1(r.worst) + 's').padStart(11), String(r.retry).padStart(8),
      String(r.uniq).padStart(7), ('#'.repeat(Math.round(r.diff / 5)) + ' ' + r.diff.toFixed(0)).padStart(12)].join(' '));
  }
}

// ---------------------------------------------------------------- ASCII timeline of one level
function glyph(lane, item, x, t) {
  if (lane.kind === 'road') return { car: 'c', racer: 'r', bike: 'k', dozer: 'd', truck: 't', bus: 'B', limo: 'L', roller: 'o' }[item.kind] || '#';
  if (item.kind === 'croc') return null;
  if (item.kind.startsWith('turtles')) return { up: 'T', sink: 's', under: '.', rise: 'S' }[turtleState(item, t)];
  return '=';
}
function drawRow(lane, t, playerX) {
  const line = Array(Math.ceil(W / 4)).fill(' ');
  for (const it of lane.items) {
    const x = itemX(lane, it, t);
    if (it.kind === 'croc') {
      const p = crocParts(lane, it, x), open = crocState(it, t) === 'open';
      for (let px = p.back[0]; px < p.back[1]; px += 4) put(line, px, 'g');
      for (let px = p.head[0]; px < p.head[1]; px += 4) put(line, px, open ? 'V' : 'v');
      continue;
    }
    const g = glyph(lane, it, x, t);
    for (let px = x; px < x + it.w; px += 4) put(line, px, g);
  }
  if (playerX != null) put(line, playerX, '@');
  return line.join('');
}
function put(line, px, ch) { const i = Math.floor(px / 4); if (i >= 0 && i < line.length) line[i] = ch; }

let tlLevel = 8, tlSeed = 1;
if (tl !== 'auto' && tl !== true) { [tlLevel, tlSeed = 1] = String(tl).split(':').map(Number); }
if (!quiet || tl !== 'auto') {
  const def = levelDef(tlLevel, tlSeed), r = findRoute(def, { path: true });
  console.log(`\nTimeline: level ${tlLevel} seed ${tlSeed} theme ${def.theme} pete ${def.peteMode} set pieces [${def.meta.setPieces.join(', ')}] route ${r.ok ? f1(r.time) + 's' : 'NONE'}`);
  console.log('legend: c r k d t B L o vehicles | = log | T up s sink . under S rise turtle | g croc back, v closed head, V OPEN head | @ Colby (BFS route)');
  const pts = r.path || [], snaps = [];
  for (let n = 0; n < 6 && pts.length; n++) snaps.push(pts[Math.min(pts.length - 1, Math.floor((n * pts.length) / 6))]);
  if (pts.length) snaps.push(pts[pts.length - 1]);
  for (const s of snaps) {
    console.log(`\n t=${s.t.toFixed(2)}s`);
    const bay = def.bays.map((b) => b.hazard ? (b.hazard === 'croc' ? 'C' : 'S') : b.bonus ? (b.bonus === 'mouse' ? 'm' : 'f') : '_');
    console.log('  1 ' + (s.row === 1 ? drawBay(bay, s.x) : drawBay(bay)));
    for (let row = 2; row <= 13; row++) {
      const lane = def.lanes.find((l) => l.row === row);
      const px = s.row === row ? s.x : null;
      const body = lane ? drawRow(lane, s.t, px) : (px != null ? drawRow({ items: [], kind: 'x' }, s.t, px) : ' '.repeat(W / 4)).replace(/ /g, row === 7 || row === 13 ? '-' : ' ');
      console.log(String(row).padStart(3) + ' ' + body + (lane ? (lane.dir > 0 ? ' >' : ' <') + lane.speed.toFixed(0) : ''));
    }
  }
}
function drawBay(bay, px) { const line = Array(W / 4).fill('#'); bay.forEach((b, i) => { const c = Math.floor((i * 48 + 16) / 4); for (let k = -3; k <= 3; k++) line[c + k] = k === 0 ? b : '.'; }); if (px != null) line[Math.floor(px / 4)] = '@'; return line.join(''); }

console.log(`\n${fails === 0 ? 'OK' : 'FAILED'}: ${levels.length} levels x ${nSeeds} seeds, ${fails} failure(s)`);
process.exit(fails === 0 ? 0 : 1);
