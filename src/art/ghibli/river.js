// Ghibli pack: river (mossy logs with tiny mushrooms, leafy-shelled turtles, a friendly-grumpy croc, animated water tiles).
// Sprites face RIGHT (renderer mirrors). Water tiles are opaque and seamless horizontally and vertically.
import { GPAL as G } from '../../core/defs.js';
import { sprite, ell, paint, tube, poly, dot, line, INK } from './characters.js';

const TAU = Math.PI * 2;

// ------------------------------------------------------------------ logs
function mushroom(kit, c, x, y, s, col) {
  rr(kit, c, x - 0.25 * s, y - 1.6 * s, 0.5 * s, 1.7 * s, 0.2); c.fillStyle = '#f4e8cc'; c.fill();
  c.beginPath(); c.moveTo(x - 1.1 * s, y - 1.4 * s); c.quadraticCurveTo(x, y - 3.3 * s, x + 1.1 * s, y - 1.4 * s); c.closePath(); paint(c, col, 0.28);
  dot(c, x - 0.3 * s, y - 2 * s, 0.22 * s, '#fff'); dot(c, x + 0.4 * s, y - 1.8 * s, 0.17 * s, '#fff');
}
function rr(kit, c, x, y, w, h, r) { kit.roundRect(c, x, y, w, h, r); }
function drawLog(kit, c, w, seed) {
  const r = kit.rng(seed), top = 2.4, h = 11.2;
  // soft ripple / foam under the log
  ell(c, w / 2, 14.6, w / 2 - 1, 1.1); c.fillStyle = 'rgba(241,251,255,0.35)'; c.fill();
  rr(kit, c, 0.6, top, w - 1.2, h, 5.2);
  paint(c, kit.lin(c, 0, top, 0, top + h, ['#c08a56', G.trunkL, G.trunk, '#5a3b26']), 0.4);
  c.save(); rr(kit, c, 0.6, top, w - 1.2, h, 5.2); c.clip();
  for (let k = 0; k < Math.floor(w / 5); k++) {                                   // bark grain
    const y = top + 2 + r.next() * (h - 4), x0 = 3 + r.next() * (w - 12), l = 3 + r.next() * 6;
    line(c, x0, y, x0 + l, y + (r.next() - 0.5) * 0.6, 0.3, 'rgba(59,40,28,0.4)');
  }
  rr(kit, c, 3, top + 0.8, w - 6, 1.6, 0.8); c.fillStyle = 'rgba(255,240,200,0.28)'; c.fill();   // top light
  for (let k = 0; k < Math.floor(w / 14) + 1; k++) {                              // moss patches
    const mx = 6 + r.next() * (w - 12), my = top + (r.next() < 0.5 ? 1.2 : h - 1.5), mw = 2.2 + r.next() * 3;
    kit.blob(c, mx, my, mw, 1.8, { seed: 11 + k * 7 + seed, wobble: 0.2 }); c.fillStyle = kit.rgba(G.moss, 0.92); c.fill();
    kit.blob(c, mx - 0.4, my - 0.4, mw * 0.55, 0.9, { seed: 5 + k, wobble: 0.2 }); c.fillStyle = kit.rgba(G.leafL, 0.8); c.fill();
  }
  c.restore();
  for (const x of [w - 5.2, 5.2]) {                                               // end rings, both ends
    ell(c, x, top + h / 2, 3.2, 4.9); paint(c, kit.radial(c, x, top + h / 2, 0, 5, [['0', '#f0cf94'], ['1', '#c99a62']].map(([a, b]) => [+a, b])), 0.34);
    for (const k of [0.62, 0.3]) { ell(c, x, top + h / 2, 3.2 * k * 1.3, 4.9 * k * 1.3); c.lineWidth = 0.25; c.strokeStyle = 'rgba(122,82,54,0.6)'; c.stroke(); }
    dot(c, x, top + h / 2, 0.45, '#9a6a3e');
  }
  const nm = Math.max(1, Math.floor(w / 28));                                     // tiny mushrooms along the top
  for (let k = 0; k < nm; k++) { const x = 12 + (k + 0.3 + r.next() * 0.4) * (w - 24) / nm; mushroom(kit, c, x, top + 2.4, 1.7, k % 2 ? '#f08a4a' : G.carRed); if (k % 2 === 0) mushroom(kit, c, x + 2.8, top + 2.6, 1.0, '#ff9fb2'); }
  c.save(); c.translate(w * 0.62, top + h - 1.2); c.rotate(0.4);                  // a tiny leaf
  c.beginPath(); c.ellipse(0, 0, 1.6, 0.7, 0, 0, TAU); c.fillStyle = G.leafL; c.fill(); c.restore();
}

// ------------------------------------------------------------------ turtles
function drawTurtle(kit, c, i, o = {}) {
  const { sx = 1, tint = 0 } = o;
  c.save(); c.translate(8, 8.2); c.scale(sx, sx); c.translate(-8, -8.2);
  const pad = i % 2 ? 1 : -1;
  for (const [x, y, rot, back] of [[4.4, 3.6, -0.5, 1], [11.2, 3.4, 0.5, 0], [4.4, 12.8, 0.5, 1], [11.2, 13, -0.5, 0]]) {   // flippers paddle
    const up = y < 8 ? -1 : 1;
    ell(c, x, y + up * pad * 0.4, 2.1, 1.1, rot + pad * up * 0.35); paint(c, back ? '#8fb06a' : '#a3c47a');
  }
  tube(c, [3.8, 8.2], [1.6, 8.4 + pad * 0.5], [1.2, 8.8], 1.1, '#8fb06a');         // tail
  ell(c, 13, 8, 2.1, 1.9); paint(c, kit.radial(c, 12.6, 7.2, 0, 3, [[0, '#c4de92'], [1, '#8fb06a']]));   // head
  dot(c, 13.8, 7.2, 0.62, '#fff'); dot(c, 13.95, 7.25, 0.34, '#2a1f2e'); dot(c, 13.8, 8.9, 0.34, 'rgba(255,154,168,0.7)');
  c.beginPath(); c.moveTo(13.1, 6.5); c.lineTo(14.6, 6.8); c.lineWidth = 0.3; c.strokeStyle = INK(); c.stroke();
  ell(c, 8, 8.2, 5.4, 4.8); paint(c, kit.radial(c, 6.4, 5.8, 0, 8, [[0, G.leafL], [0.55, G.leaf], [1, G.leafD]]), 0.42);      // shell
  c.save(); ell(c, 8, 8.2, 5.4, 4.8); c.clip();
  line(c, 3.4, 8.2, 12.6, 8.2, 0.4, 'rgba(45,106,69,0.8)');                       // leaf veins
  for (const x of [5.2, 8, 10.6]) { c.beginPath(); c.moveTo(x - 1, 3.4); c.quadraticCurveTo(x + 0.6, 6, x - 0.2, 8.2); c.quadraticCurveTo(x + 0.6, 10.4, x - 1, 13); c.lineWidth = 0.32; c.strokeStyle = 'rgba(45,106,69,0.75)'; c.stroke(); }
  for (const [x, y] of [[6.6, 5.4], [9.4, 5.2], [6.6, 11], [9.4, 11.2]]) ell(c, x, y, 1.1, 0.55, y < 8 ? -0.5 : 0.5), c.fillStyle = 'rgba(166,215,111,0.65)', c.fill();
  c.restore();
  ell(c, 6.2, 5.2, 1.5, 0.8, -0.6); c.fillStyle = 'rgba(255,255,255,0.4)'; c.fill();
  c.restore();
  if (tint) { c.fillStyle = `rgba(74,166,207,${tint})`; c.fillRect(0, 0, 16, 16); }
}
function ripples(c, y, n, a = 0.7) { for (let k = 0; k < n; k++) { ell(c, 8, y, 3 + k * 2.4, (3 + k * 2.4) * 0.45); c.lineWidth = 0.35; c.strokeStyle = `rgba(241,251,255,${(a - k * 0.2).toFixed(2)})`; c.stroke(); } }
function drawTurtleSink(kit, c, i) {
  c.save(); c.beginPath(); c.rect(0, 0, 16, 16); c.clip();
  drawTurtle(kit, c, 0, { sx: 1 - i * 0.07 });
  // water creeping over the shell; alpha-washed so the sprite fades into the river
  c.fillStyle = `rgba(74,166,207,${[0.35, 0.6, 0.82][i]})`; ell(c, 8, 8.2, 6.6, 5.8); c.fill();
  c.restore();
  ripples(c, 8.2, 2 + (i > 1 ? 1 : 0), 0.8);
  if (i >= 1) dot(c, 12.6, 4, 0.6, 'rgba(241,251,255,0.8)'); if (i >= 2) { dot(c, 3.2, 5, 0.5, 'rgba(241,251,255,0.8)'); dot(c, 4.5, 3.2, 0.35, 'rgba(241,251,255,0.7)'); }
}
function drawTurtleUnder(kit, c, i) {
  ell(c, 8, 8.2, 5.2, 4.6); c.fillStyle = 'rgba(45,111,166,0.55)'; c.fill();                    // a shadow under the surface
  ell(c, 8, 8.2, 3.4, 3); c.fillStyle = 'rgba(79,154,82,0.25)'; c.fill();
  ripples(c, 8.2, 1, 0.45);
  const b = i ? 1 : 0;
  for (const [x, y, r] of [[5.5, 4 - b, 0.7], [10.5, 3 + b * 0.6, 0.5], [8, 1.8 - b * 0.5, 0.4]]) { dot(c, x, y, r, 'rgba(241,251,255,0.3)'); c.beginPath(); c.arc(x, y, r, 0, TAU); c.lineWidth = 0.2; c.strokeStyle = 'rgba(241,251,255,0.9)'; c.stroke(); }
}

// ------------------------------------------------------------------ croc: back 48 px at the trailing (left) end, head 16 px at the right
function crocBody(kit, c, i) {
  const wag = i ? 1.1 : -0.6;
  ell(c, 32, 14.5, 26, 1.1); c.fillStyle = 'rgba(241,251,255,0.3)'; c.fill();
  c.beginPath(); c.moveTo(0.8, 8 + wag); c.quadraticCurveTo(8, 6.4 + wag * 0.4, 16, 3.8); c.lineTo(16, 12.2); c.quadraticCurveTo(8, 9.6 - wag * 0.4, 0.8, 8 + wag); c.closePath();   // tail
  paint(c, kit.lin(c, 0, 3, 0, 13, [G.leaf, G.leafD]), 0.4);
  for (const sy of [1, -1]) for (const x of [20, 38]) { ell(c, x + (i ? 0.6 * sy : 0), 8 + sy * 5.9, 2.4, 1.2, sy * 0.4); paint(c, G.leafD); }   // stubby legs
  kit.roundRect(c, 13, 2.8, 36, 10.4, 5); paint(c, kit.lin(c, 0, 2.8, 0, 13.2, ['#7fc06a', G.leaf, G.leafD]), 0.42);                         // back
  c.save(); kit.roundRect(c, 13, 2.8, 36, 10.4, 5); c.clip();
  for (let k = 0; k < 12; k++) { const x = 17 + k * 2.7; for (const y of [5.6, 10.4]) { ell(c, x, y, 1.05, 1.05); c.fillStyle = k % 2 ? G.moss : G.leafD; c.fill(); } poly(c, [[x - 0.8, 8.4], [x, 7.2], [x + 0.8, 8.4]]); c.fillStyle = '#2d6a45'; c.fill(); }
  for (const x of [22, 31, 41]) { dot(c, x, 8, 0.9, G.leafL); }                                                                                // leafy bumps
  kit.roundRect(c, 17, 3.4, 28, 1.4, 0.7); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fill();
  c.restore();
}
function eyeBumps(kit, c, i, grump) {
  for (const sy of [-1, 1]) {
    const y = 8 + sy * 3.9;
    ell(c, 51.2, y, 1.9, 1.8); paint(c, G.leaf, 0.34);
    ell(c, 51.6, y, 1.2, 1.2); c.fillStyle = '#fff3b0'; c.fill();
    if (i && sy < 0) { line(c, 50.7, y, 52.6, y, 0.4, INK()); }                                   // blink
    else { ell(c, 52, y, 0.5, 0.85); c.fillStyle = '#2a1f2e'; c.fill(); dot(c, 51.6, y - 0.4, 0.22, '#fff'); }
    c.beginPath(); c.moveTo(50, y - sy * 0.5 - (grump ? 0.8 : 0)); c.lineTo(53, y + (grump ? 0.5 : -0.3) * sy * 0); c.lineWidth = 0.7; c.strokeStyle = G.leafD; c.stroke();   // heavy grumpy lid
    c.beginPath(); c.moveTo(50, y - 0.8 + sy * 0.2); c.lineTo(53, y - 0.2 - sy * 0.1 + (grump ? 0.5 : 0)); c.lineWidth = 0.28; c.strokeStyle = INK(); c.stroke();
  }
}
function drawCroc(kit, c, i, open) {
  crocBody(kit, c, i);
  if (!open) {
    c.beginPath(); c.moveTo(46, 4); c.quadraticCurveTo(56, 2.2, 63.2, 5.4); c.quadraticCurveTo(64, 8, 63.2, 10.6); c.quadraticCurveTo(56, 13.8, 46, 12); c.closePath();
    paint(c, kit.lin(c, 0, 2.5, 0, 13.5, ['#8fcf78', G.leaf, G.leafD]), 0.42);
    kit.roundRect(c, 51, 3.6, 10, 1.3, 0.6); c.fillStyle = 'rgba(255,255,255,0.28)'; c.fill();
    for (const sy of [-1, 1]) dot(c, 61.6, 8 + sy * 1.9, 0.5, '#2d6a45');                         // nostrils
    c.beginPath(); c.moveTo(52, 8.4); c.quadraticCurveTo(58, 9.6 + (i ? 0.4 : 0), 62.8, 8.2); c.lineWidth = 0.34; c.strokeStyle = INK(); c.stroke();   // closed grumpy-sweet mouth
    for (const x of [55.5, 59]) for (const sy of [-1, 1]) poly(c, [[x, 8.8 + sy * 0.7], [x + 0.7, 8.6 + sy * 0.7], [x + 0.35, 8.8 + sy * 1.6]]), c.fillStyle = '#fff6dc', c.fill();
    eyeBumps(kit, c, i, true);
  } else {
    const gap = i ? 3.3 : 2.6;                                                                     // jaw wide open; frame 1 a little wider
    c.beginPath(); c.moveTo(47, 8 - 1.2); c.quadraticCurveTo(58, 8 - gap * 1.5, 63.4, 8 - gap); c.lineTo(63.4, 8 + gap); c.quadraticCurveTo(58, 8 + gap * 1.5, 47, 8 + 1.2); c.closePath();
    paint(c, kit.lin(c, 0, 4, 0, 12, ['#b9475a', '#e0788a', '#b9475a']), 0.4);                    // mouth interior
    ell(c, 55, 8, 4.2, 1.5); c.fillStyle = '#f4a0ac'; c.fill();                                   // tongue
    for (const sy of [-1, 1]) {
      c.beginPath(); c.moveTo(46, 8 + sy * 3.9); c.quadraticCurveTo(57, 8 + sy * (4.2 + gap * 1.2), 63.4, 8 + sy * (gap + 1.1)); c.lineTo(63.6, 8 + sy * gap); c.quadraticCurveTo(57, 8 + sy * gap * 1.5, 47, 8 + sy * 1.2); c.closePath();
      paint(c, kit.lin(c, 0, 8, 0, 8 + sy * 6, [G.leafD, G.leaf, '#8fcf78']), 0.42);
      for (const x of [51, 54, 57, 60]) poly(c, [[x, 8 + sy * (gap * (0.4 + (x - 47) / 40 * 1.1) + 0.3)], [x + 1, 8 + sy * (gap * (0.4 + (x - 47) / 40 * 1.1) + 0.3)], [x + 0.5, 8 + sy * (gap * (0.4 + (x - 47) / 40 * 1.1) - 0.9)]]), c.fillStyle = '#fff6dc', c.fill();
      dot(c, 61.4, 8 + sy * (gap + 0.6), 0.45, '#2d6a45');
    }
    eyeBumps(kit, c, i, false);
  }
}

// ------------------------------------------------------------------ water (opaque, seamless)
function waveLine(c, y, k, phase, amp, w, col) {
  c.beginPath();
  for (let x = -2; x <= 18.01; x += 0.5) { const edge = Math.sin((Math.max(0, Math.min(16, x)) / 16) * Math.PI) ** 2, yy = y + Math.sin((x / 16) * TAU * k + phase * edge) * amp;   // phase eases to 0 at the tile edges so every frame matches at x=0/16 (no seams between neighbouring frames)
    if (x === -2) c.moveTo(x, yy); else c.lineTo(x, yy); }
  c.lineWidth = w; c.strokeStyle = col; c.stroke();
}
function waterBase(kit, c, i) {
  c.fillStyle = G.water; c.fillRect(0, 0, 16, 16);
  const ph = (i / 4) * TAU;
  for (const [x, y, rx, ry, col] of [[4, 4, 5, 2.6, 'rgba(143,212,232,0.35)'], [13, 11, 4.5, 2.4, 'rgba(45,111,166,0.25)'], [9, 15, 4, 2, 'rgba(143,212,232,0.25)']]) {
    const xx = x;                                                          // blobs are static: only waves/sparkles animate, so neighbouring columns on different frames still join
    for (const dx of [-16, 0, 16]) for (const dy of [-16, 0, 16]) { ell(c, xx + dx, y + dy, rx, ry); c.fillStyle = col; c.fill(); }
  }
  for (const dy of [-16, 0]) { waveLine(c, 3.4 + dy + 16, 1, ph, 0.5, 0.45, 'rgba(241,251,255,0.55)'); waveLine(c, 3.4 + dy, 1, ph, 0.5, 0.45, 'rgba(241,251,255,0.55)'); }
  waveLine(c, 9.2, 1, ph + 2, 0.5, 0.4, 'rgba(241,251,255,0.45)'); waveLine(c, 14.2, 1, ph + 4, 0.4, 0.35, 'rgba(45,111,166,0.45)');
  waveLine(c, 6.4, 1, ph + 1, 0.35, 0.3, 'rgba(45,111,166,0.35)');
  const sp = [[2, 7, 0], [9, 12, 1], [12, 5, 2], [6, 1.6, 3]];                                       // sparkles blink in turn
  for (const [x, y, k] of sp) { const on = (i + k) % 4 === 0; dot(c, x, y, on ? 0.55 : 0.25, on ? '#fff' : 'rgba(255,255,255,0.5)'); }
}
function drawWaterEdge(kit, c, i) {
  waterBase(kit, c, i);
  const ph = (i / 4) * TAU;
  c.beginPath(); c.moveTo(0, 0); c.lineTo(16, 0);
  for (let x = 16; x >= 0; x -= 0.5) c.lineTo(x, 4.6 + Math.sin((x / 16) * TAU * 2 + ph) * 0.35);
  c.closePath(); c.fillStyle = 'rgba(241,251,255,0.85)'; c.fill();                                    // foam fringe
  c.beginPath(); c.moveTo(0, 0); c.lineTo(16, 0);
  for (let x = 16; x >= 0; x -= 0.5) c.lineTo(x, 3.8 + Math.sin((x / 16) * TAU * 2 + ph) * 0.35);
  c.closePath(); c.fillStyle = kit.lin(c, 0, 0, 0, 4, [G.pathD, G.path]); c.fill();                   // sandy bank
  c.beginPath(); c.moveTo(0, 0); c.lineTo(16, 0); for (let x = 16; x >= 0; x -= 0.5) c.lineTo(x, 2 + Math.sin(x * 1.3) * 0.2); c.closePath(); c.fillStyle = G.moss; c.fill();   // grass lip
  for (const x of [1, 3.4, 6, 8.8, 11.4, 14]) { c.beginPath(); c.moveTo(x - 0.4, 2.2); c.lineTo(x, 0.7); c.lineTo(x + 0.4, 2.2); c.fillStyle = G.leafL; c.fill(); }
  for (const [x, y, r] of [[2.6, 3.1, 0.45], [7.4, 3.4, 0.35], [12.4, 3, 0.5]]) { dot(c, x, y, r, '#a99a86'); }
}

export function build(kit) {
  const out = {};
  out.log_s = sprite(kit, 48, 16, 1, (c) => drawLog(kit, c, 48, 3));
  out.log_m = sprite(kit, 80, 16, 1, (c) => drawLog(kit, c, 80, 7));
  out.log_l = sprite(kit, 112, 16, 1, (c) => drawLog(kit, c, 112, 13));
  out.turtle_up = sprite(kit, 16, 16, 2, (c, i) => drawTurtle(kit, c, i));
  out.turtle_sink = sprite(kit, 16, 16, 3, (c, i) => drawTurtleSink(kit, c, i));
  out.turtle_under = sprite(kit, 16, 16, 2, (c, i) => drawTurtleUnder(kit, c, i));
  out.croc_closed = sprite(kit, 64, 16, 2, (c, i) => drawCroc(kit, c, i, false));
  out.croc_open = sprite(kit, 64, 16, 2, (c, i) => drawCroc(kit, c, i, true));
  out.tile_water = sprite(kit, 16, 16, 4, (c, i) => waterBase(kit, c, i));
  out.tile_water_edge = sprite(kit, 16, 16, 4, (c, i) => drawWaterEdge(kit, c, i));
  return out;
}
