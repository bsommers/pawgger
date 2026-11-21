// Ghibli pack: fx (module 'fx'): hand-lettered PAWGGER logo, lush title scene, soft particles, glowing treasures, paw cursor, touch button.
// Cell units (1 unit = GHIBLI_SCALE px). Deterministic (seeded kit.rng, no Math.random).
import { GPAL as G } from '../../core/defs.js';
import { sprite, ell, paint, poly, dot, line, INK } from './characters.js';

const TAU = Math.PI * 2;
function rr(kit, c, x, y, w, h, r) { kit.roundRect(c, x, y, w, h, r); }
function glow(kit, c, x, y, r, col, a) { c.fillStyle = kit.radial(c, x, y, 0, r, [[0, kit.rgba(col, a)], [1, kit.rgba(col, 0)]]); c.fillRect(x - r, y - r, r * 2, r * 2); }
function sparkle(c, x, y, r, col, rot = 0) {                       // four-point twinkle
  c.save(); c.translate(x, y); c.rotate(rot); c.beginPath();
  for (let k = 0; k < 8; k++) { const a = (k / 8) * TAU, rad = k % 2 ? r * 0.28 : r; c.lineTo(Math.cos(a) * rad, Math.sin(a) * rad); }
  c.closePath(); c.fillStyle = col; c.fill(); c.restore();
}
function paw(c, x, y, s, col, ink) {                               // cat paw print: pad + four toe beans
  const draw = (f) => { ell(c, x, y + 0.9 * s, 1.5 * s, 1.25 * s); f(); for (const [dx, dy, rx, ry, rot] of [[-1.6, -0.5, 0.6, 0.8, -0.4], [-0.55, -1.5, 0.58, 0.8, -0.1], [0.55, -1.5, 0.58, 0.8, 0.1], [1.6, -0.5, 0.6, 0.8, 0.4]]) { ell(c, x + dx * s, y + dy * s, rx * s, ry * s, rot); f(); } };
  if (ink) { c.lineWidth = 0.5 * s; c.strokeStyle = ink; c.lineJoin = 'round'; draw(() => c.stroke()); }
  c.fillStyle = col; draw(() => c.fill());
}

// ------------------------------------------------------------------ logo: hand-lettered PAWGGER, built from fat round-capped strokes
const LET = {
  P: (c, w, h) => { c.moveTo(0, h); c.lineTo(0, 0); c.lineTo(w * 0.55, 0); c.bezierCurveTo(w * 1.05, 0, w * 1.05, h * 0.55, w * 0.55, h * 0.55); c.lineTo(0, h * 0.55); },
  A: (c, w, h) => { c.moveTo(0, h); c.lineTo(w * 0.5, 0); c.lineTo(w, h); c.moveTo(w * 0.2, h * 0.68); c.lineTo(w * 0.8, h * 0.68); },
  W: (c, w, h) => { c.moveTo(0, 0); c.lineTo(w * 0.25, h); c.lineTo(w * 0.5, h * 0.3); c.lineTo(w * 0.75, h); c.lineTo(w, 0); },
  G: (c, w, h) => { c.moveTo(w * 0.96, h * 0.2); c.bezierCurveTo(w * 0.8, -h * 0.12, 0, -h * 0.1, 0, h * 0.5); c.bezierCurveTo(0, h * 1.1, w * 0.9, h * 1.12, w * 0.98, h * 0.6); c.lineTo(w * 0.55, h * 0.6); },
  E: (c, w, h) => { c.moveTo(w * 0.92, 0); c.lineTo(0, 0); c.lineTo(0, h); c.lineTo(w * 0.92, h); c.moveTo(0, h * 0.5); c.lineTo(w * 0.7, h * 0.5); },
  R: (c, w, h) => { LET.P(c, w, h); c.moveTo(w * 0.5, h * 0.55); c.lineTo(w * 0.98, h); },
};
function drawLogo(kit, c) {
  const word = 'PAWGGER', lw = 17.5, lh = 24, gap = 6.6, sw = 6.2, total = word.length * lw + (word.length - 1) * gap;
  const x0 = 8 + (170 - total) / 2 + 3, y0 = 12;
  glow(kit, c, 96, 28, 96, '#fff1a8', 0.3);
  const pass = (width, style, dy = 0) => {
    word.split('').forEach((ch, k) => {
      c.save(); c.translate(x0 + k * (lw + gap) + sw / 2, y0 + dy + Math.sin(k * 1.3) * 0.7); c.rotate((k % 2 ? 0.035 : -0.035));
      c.beginPath(); LET[ch](c, lw, lh); c.lineWidth = width; c.lineCap = 'round'; c.lineJoin = 'round'; c.strokeStyle = typeof style === 'function' ? style(k) : style; c.stroke(); c.restore();
    });
  };
  pass(sw + 3.4, 'rgba(59,47,58,0.28)', 1.6);                                                    // soft drop shadow
  pass(sw + 2.4, '#5a3040');                                                                       // plum outline
  pass(sw, (k) => ['#f4923a', '#f7a64a', '#f4923a', '#f58a38', '#f7a64a', '#f4923a', '#f58a38'][k]);
  pass(sw * 0.62, (k) => (k % 2 ? '#ffb85e' : '#ffa648'));                                         // lighter body
  pass(sw * 0.2, 'rgba(255,240,200,0.8)', -1.1);                                                   // glossy highlight
  const cx = x0 + 3 * (lw + gap);                                                                  // a leaf sprouting from the first G
  c.save(); c.translate(cx + 3, y0 - 3.4);
  kit.leaf(c, 0, 0, 9, 4.8, -2.3); paint(c, kit.lin(c, -6, -6, 0, 0, [G.leafL, G.leaf]), 0.5, '#2d4a3a');
  c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(-2.3) * 7.5, Math.sin(-2.3) * 7.5); c.lineWidth = 0.35; c.strokeStyle = 'rgba(45,106,69,0.8)'; c.stroke();
  kit.leaf(c, 0, 0, 7, 3.6, -0.7); paint(c, G.leaf, 0.5, '#2d4a3a'); c.restore();
  paw(c, 181, 39, 2.1, '#ffd0a0', 'rgba(90,48,64,0.95)');                                          // paw print stamp
  paw(c, 177, 15, 1.1, 'rgba(255,208,160,0.8)', 'rgba(90,48,64,0.5)');
  sparkle(c, 6, 10, 2.6, '#fff', 0.2); sparkle(c, 188, 8, 2.2, '#fff6a8', 0.4); sparkle(c, 10, 42, 1.6, '#fff6a8');
}

// ------------------------------------------------------------------ title scene 224x96
function drawTitle(kit, c) {
  const r = kit.rng(7);
  c.fillStyle = kit.lin(c, 0, 0, 0, 96, [[0, G.skyDayTop], [0.5, G.skyDayMid], [1, G.skyDayLow]]); c.fillRect(0, 0, 224, 96);
  glow(kit, c, 168, 22, 46, '#fff6c8', 0.75); dot(c, 168, 22, 8, G.sun); dot(c, 168, 22, 6, '#fffbd0');
  for (let k = 0; k < 7; k++) { const a = k / 7 * TAU + 0.3; line(c, 168 + Math.cos(a) * 11, 22 + Math.sin(a) * 11, 168 + Math.cos(a) * 17, 22 + Math.sin(a) * 17, 0.8, 'rgba(255,241,168,0.45)'); }
  for (const [x, y, w, h, s, a] of [[40, 22, 64, 20, 3, 1], [120, 11, 78, 22, 5, 0.95], [205, 34, 50, 15, 8, 0.9], [14, 52, 46, 13, 2, 0.8], [96, 38, 42, 12, 4, 0.85]]) {   // big clouds with shaded undersides
    kit.cloud(c, x + 1, y + 2.4, w, h, s); c.fillStyle = kit.rgba(G.cloudShade, a); c.fill();
    kit.cloud(c, x, y, w, h, s); c.fillStyle = kit.rgba('#ffffff', a); c.fill();
  }
  const hill = (base, amp, ph, f, lo, hi) => { c.beginPath(); c.moveTo(0, 96); for (let x = 0; x <= 224; x += 2) c.lineTo(x, base + Math.sin(x / 224 * TAU * f + ph) * amp + Math.sin(x * 0.07 + ph) * amp * 0.25); c.lineTo(224, 96); c.closePath(); c.fillStyle = kit.lin(c, 0, base - amp, 0, 96, [lo, hi]); c.fill(); };
  hill(52, 5, 1, 1.4, '#a8cfc0', '#8fb9b0');                                                                         // far misty hills
  hill(58, 6, 3, 1.1, '#8cc4a0', '#6aa88a');
  const hy2 = (x) => 58 + Math.sin(x / 224 * TAU * 1.1 + 3) * 6 + Math.sin(x * 0.07 + 3) * 1.5;                       // far road hugs the ridge of the mid hill
  c.beginPath(); for (let x = 128; x <= 224; x += 2) (x === 128 ? c.moveTo(x, hy2(x) + 0.6) : c.lineTo(x, hy2(x) + 0.6)); c.lineWidth = 1.1; c.strokeStyle = 'rgba(110,107,134,0.9)'; c.stroke();
  { const lx = 170, ly = hy2(lx) + 0.6, ang = Math.atan2(hy2(lx + 4) - hy2(lx - 4), 8); c.save(); c.translate(lx, ly); c.rotate(ang);
    rr(kit, c, -6, -3, 12, 3, 1.3); paint(c, '#2f2f48', 0.2); rr(kit, c, -4.6, -3.7, 6, 1.9, 0.8); c.fillStyle = '#9fd0ee'; c.fill(); dot(c, -3.6, 0.1, 0.9, '#222'); dot(c, 3.4, 0.1, 0.9, '#222'); c.restore(); }
  hill(66, 5, 0.4, 1.8, G.leafL, G.leaf);                                                                            // green rolling hills
  for (let k = 0; k < 18; k++) { const x = k * 13 + r.next() * 8, y = 64 + Math.sin(x / 224 * TAU * 1.8 + 0.4) * 5 + 3 + r.next() * 3; dot(c, x, y + 0.2, 1.7 + r.next(), 'rgba(45,106,69,0.55)'); dot(c, x - 0.4, y - 0.3, 1.1, 'rgba(140,198,106,0.6)'); }   // tree puffs
  for (const [x, y, s] of [[20, 63, 1], [52, 60, 0.8], [198, 62, 1.1]]) { rr(kit, c, x - 0.6 * s, y, 1.2 * s, 4 * s, 0.4); c.fillStyle = G.trunk; c.fill(); for (const [dx, dy, rd] of [[0, -3, 4.2], [-3, -1, 3.2], [3, -1.2, 3.4]]) { dot(c, x + dx * s, y + dy * s, rd * s, G.leaf); dot(c, x + dx * s - 0.8 * s, y + dy * s - 0.8 * s, rd * s * 0.6, G.leafL); } }
  c.beginPath(); c.moveTo(0, 74);                                                                                    // river
  for (let x = 0; x <= 224; x += 2) c.lineTo(x, 73 + Math.sin(x * 0.05 + 1) * 1.6);
  for (let x = 224; x >= 0; x -= 2) c.lineTo(x, 88 + Math.sin(x * 0.04) * 1.8);
  c.closePath(); c.fillStyle = kit.lin(c, 0, 72, 0, 90, [G.waterL, G.water, G.waterD]); c.fill();
  for (let k = 0; k < 26; k++) { const x = r.next() * 224, y = 76 + r.next() * 11; line(c, x, y, x + 5 + r.next() * 9, y, 0.3, r.next() < 0.6 ? 'rgba(241,251,255,0.6)' : 'rgba(255,255,255,0.35)'); }   // moving-water highlights
  for (const [x, y] of [[40, 78], [120, 82], [186, 77]]) sparkle(c, x, y, 1.2, '#fff', 0.2);
  c.beginPath(); c.moveTo(0, 73.4); for (let x = 0; x <= 224; x += 2) c.lineTo(x, 73 + Math.sin(x * 0.05 + 1) * 1.6); c.lineWidth = 0.9; c.strokeStyle = G.riverbank; c.stroke();
  // little cat on a log, floating down the river
  const lx = 96, ly = 82;
  softShadow(kit, c, lx, ly + 3.2, 17, 2, 0.35);
  rr(kit, c, lx - 16, ly - 2.4, 32, 6.4, 3); paint(c, kit.lin(c, 0, ly - 2.4, 0, ly + 4, ['#c08a56', G.trunk, '#5a3b26']), 0.4);
  ell(c, lx + 16, ly + 0.8, 1.5, 3); paint(c, '#d9a96e', 0.3); ell(c, lx + 16, ly + 0.8, 0.6, 1.3); c.fillStyle = '#9a6a3e'; c.fill();
  for (const x of [lx - 8, lx - 1, lx + 7]) line(c, x, ly - 0.6, x + 4, ly - 0.4, 0.25, 'rgba(59,40,28,0.5)');
  ell(c, lx - 11, ly - 2.2, 2.4, 1); c.fillStyle = G.moss; c.fill();
  ell(c, lx + 2, ly + 5.6, 10, 1.2); c.fillStyle = 'rgba(241,251,255,0.5)'; c.fill();
  const cx = lx + 2, cy = ly - 2.8;                                                                                  // Colby: scarf, hat, tail up
  c.beginPath(); c.moveTo(cx - 3.4, cy); c.bezierCurveTo(cx - 7, cy - 1, cx - 7.4, cy - 7, cx - 5, cy - 8.4); c.lineWidth = 1.6; c.strokeStyle = G.furD; c.lineCap = 'round'; c.stroke();
  c.beginPath(); c.moveTo(cx - 3.4, cy); c.bezierCurveTo(cx - 7, cy - 1, cx - 7.4, cy - 7, cx - 5, cy - 8.4); c.lineWidth = 1.1; c.strokeStyle = G.fur; c.stroke();
  ell(c, cx, cy - 1.6, 4, 3.1); paint(c, kit.radial(c, cx - 1, cy - 3, 0, 5, [[0, G.furL], [0.6, G.fur], [1, G.furD]]), 0.35);
  poly(c, [[cx + 1.4, cy - 4.4], [cx + 2.2, cy - 7.4], [cx + 4.4, cy - 4.8]]); paint(c, G.fur, 0.3);
  ell(c, cx + 3.2, cy - 4.4, 2.6, 2.3); paint(c, kit.radial(c, cx + 2.6, cy - 5.2, 0, 3, [[0, G.furL], [1, G.fur]]), 0.35);
  poly(c, [[cx + 1.6, cy - 5.2], [cx + 1.8, cy - 7.8], [cx + 3.6, cy - 6.2]]); paint(c, G.fur, 0.3);
  poly(c, [[cx + 4.4, cy - 6], [cx + 5.4, cy - 8], [cx + 5.8, cy - 5.2]]); paint(c, G.fur, 0.3); poly(c, [[cx + 4.8, cy - 6], [cx + 5.4, cy - 7.2], [cx + 5.6, cy - 5.6]]); c.fillStyle = '#f4a6b4'; c.fill();
  dot(c, cx + 4.5, cy - 4.8, 0.5, '#fff'); dot(c, cx + 4.6, cy - 4.8, 0.3, G.ink); dot(c, cx + 2.4, cy - 4.8, 0.45, '#fff'); dot(c, cx + 2.5, cy - 4.8, 0.28, G.ink);
  ell(c, cx + 3.6, cy - 3.6, 0.4, 0.25); c.fillStyle = '#e07a8a'; c.fill();
  ell(c, cx + 3.2, cy - 6.7, 3.6, 0.9); paint(c, G.hat, 0.3); c.beginPath(); c.moveTo(cx + 1.6, cy - 6.7); c.quadraticCurveTo(cx + 3.2, cy - 9.8, cx + 4.8, cy - 6.7); c.closePath(); paint(c, G.hat, 0.3);   // explorer hat
  c.beginPath(); c.moveTo(cx + 0.6, cy - 2.6); c.quadraticCurveTo(cx + 2.4, cy - 1.4, cx + 4.4, cy - 2.4); c.lineWidth = 1.1; c.strokeStyle = G.scarf; c.stroke();
  c.beginPath(); c.moveTo(cx + 0.8, cy - 2.2); c.quadraticCurveTo(cx - 0.6, cy - 0.4, cx - 1.6, cy + 0.4); c.lineWidth = 0.9; c.stroke();                 // scarf tail
  for (const s of [-1, 1]) ell(c, cx + 1.6 + s * 1.4, cy + 0.8, 0.9, 0.6), c.fillStyle = G.furL, c.fill();
  for (const [x, y] of [[lx - 22, 84], [lx + 26, 86]]) { ell(c, x, y, 5, 0.8); c.lineWidth = 0.3; c.strokeStyle = 'rgba(241,251,255,0.7)'; c.stroke(); }
  c.fillStyle = kit.lin(c, 0, 86, 0, 96, [G.leaf, G.leafD]);                                                         // foreground bank
  c.beginPath(); c.moveTo(0, 96); for (let x = 0; x <= 224; x += 2) c.lineTo(x, 89 + Math.sin(x * 0.04) * 1.8 + Math.sin(x * 0.2) * 0.5); c.lineTo(224, 96); c.closePath(); c.fill();
  for (let k = 0; k < 44; k++) { const x = r.next() * 224, y = 90 + r.next() * 6; for (const [dx, h, a] of [[-0.5, 2.6, -0.3], [0, 3.6, 0.1], [0.5, 2.4, 0.4]]) { c.beginPath(); c.moveTo(x + dx - 0.25, y + 1); c.quadraticCurveTo(x + dx + a * 0.4, y - h * 0.6, x + dx + a, y - h); c.quadraticCurveTo(x + dx + 0.4, y - h * 0.4, x + dx + 0.25, y + 1); c.fillStyle = k % 2 ? G.leafL : G.grassL; c.fill(); } }
  for (let k = 0; k < 20; k++) { const x = 4 + r.next() * 216, y = 91 + r.next() * 4, col = [G.flower1, G.flower2, G.flower3][k % 3]; for (let p = 0; p < 5; p++) { const a = p / 5 * TAU; dot(c, x + Math.cos(a) * 0.6, y + Math.sin(a) * 0.6, 0.45, col); } dot(c, x, y, 0.35, '#ffe68a'); }
  for (const [x, y] of [[26, 30], [60, 20], [190, 50]]) { c.beginPath(); c.moveTo(x - 2, y); c.quadraticCurveTo(x - 1, y - 1.4, x, y); c.quadraticCurveTo(x + 1, y - 1.4, x + 2, y); c.lineWidth = 0.4; c.strokeStyle = INK(0.7); c.stroke(); }   // birds
  for (let k = 0; k < 7; k++) leafPetal(c, 10 + k * 33 + r.next() * 10, 30 + r.next() * 36, r.next() * TAU);
  kit.paperGrain(c, 224, 96, 5, { density: 0.0012, alpha: 0.05, size: 0.35 });
}
function leafPetal(c, x, y, a) { c.save(); c.translate(x, y); c.rotate(a); ell(c, 0, 0, 0.9, 0.5); c.fillStyle = 'rgba(255,196,210,0.85)'; c.fill(); c.restore(); }
function softShadow(kit, c, x, y, rx, ry, a) { kit.softShadow(c, x, y, rx, ry, a); }

// ------------------------------------------------------------------ particles
function drawSplash(kit, c, i) {                                   // expanding ring of soft droplets that falls and fades
  const t = (i + 0.5) / 4, a = 1 - t * 0.7;
  ell(c, 8, 10.5, 2 + t * 5.6, 0.8 + t * 2); c.lineWidth = 0.7 - t * 0.35; c.strokeStyle = `rgba(241,251,255,${a})`; c.stroke();
  for (let k = 0; k < 6; k++) {
    const ang = -Math.PI * (0.12 + k * 0.152), sp = 3.2 + (k % 2) * 1.4, x = 8 + Math.cos(ang) * sp * (0.4 + t * 1.6), y = 10 + Math.sin(ang) * sp * (0.9 + t * 0.8) + t * t * 6;
    dot(c, x, y, (1.1 - t * 0.5) * (k % 2 ? 0.8 : 1), `rgba(143,212,232,${a})`); dot(c, x - 0.25, y - 0.25, 0.3, `rgba(255,255,255,${a})`);
  }
}
function drawPuff(kit, c, i) {                                     // cloudy dust puff grows and thins out
  const t = (i + 0.4) / 4, a = 0.9 - t * 0.7;
  for (const [dx, dy, rd] of [[0, 0, 3.4], [-3, 1, 2.6], [3, 1.2, 2.8], [-1.5, -2.4, 2.4], [1.8, -2, 2.2]]) {
    const gx = 8 + dx * (0.7 + t * 0.9), gy = 9 + dy * (0.7 + t * 0.9) - t * 1.2, R = rd * (0.7 + t * 0.7);
    dot(c, gx, gy, R, `rgba(219,230,242,${a})`); dot(c, gx - 0.4, gy - 0.5, R * 0.72, `rgba(255,255,255,${a})`);
  }
}
function drawStar(kit, c, i) {
  const rot = i * 0.4, k = [1, 0.7, 1, 0.55][i];
  glow(kit, c, 4, 4, 4, '#fff1a8', 0.5);
  sparkle(c, 4, 4, 3.3 * k, G.gold, rot); sparkle(c, 4, 4, 2 * k, '#fffbd8', rot + 0.78); dot(c, 4, 4, 0.5, '#fff');
}
function drawBubble(kit, c, i) {
  const rd = [1.9, 2.3, 2.7][i];
  dot(c, 3, 3, rd, 'rgba(143,212,232,0.28)'); dot(c, 3, 3, rd, 'rgba(255,255,255,0.0)'); c.beginPath(); c.arc(3, 3, rd, 0, TAU); c.lineWidth = 0.35; c.strokeStyle = 'rgba(241,251,255,0.9)'; c.stroke();
  dot(c, 3 - rd * 0.38, 3 - rd * 0.4, rd * 0.25, '#fff');
}

// ------------------------------------------------------------------ treasures: 12x12, gentle bob + pulsing glow + twinkle
function treasure(kit, c, i, col, draw) {
  const bob = Math.sin(i / 3 * TAU) * 0.35, pulse = 0.4 + 0.2 * Math.sin(i / 3 * TAU + 1);
  glow(kit, c, 6, 6.2, 6.4, col, pulse);
  softShadow(kit, c, 6, 11, 3.6, 0.7, 0.25);
  c.save(); c.translate(0, bob); draw(c); c.restore();
  const [sx, sy] = [[2, 2.2], [10, 3], [9.6, 9]][i]; sparkle(c, sx, sy, 1.1, '#fff', i * 0.5);
}
function drawWhopper(kit, c, i) {
  treasure(kit, c, i, '#ffd35a', (c) => {
    c.beginPath(); c.moveTo(1.6, 5); c.bezierCurveTo(1.6, 0.4, 10.4, 0.4, 10.4, 5); c.closePath(); paint(c, kit.lin(c, 0, 1, 0, 5, ['#f6c06a', '#d98c34']), 0.35);
    for (const [x, y] of [[4, 2.4], [6, 1.9], [8, 2.5], [5, 3.6], [7.2, 3.4]]) { ell(c, x, y, 0.4, 0.22, 0.5); c.fillStyle = '#fff3d0'; c.fill(); }
    c.beginPath(); c.moveTo(1.2, 5.2); for (let x = 1.2; x <= 10.8; x += 0.8) c.lineTo(x, 5.2 + (Math.floor((x - 1.2) / 0.8) % 2 ? 0.7 : 0)); c.lineTo(10.8, 6); c.lineTo(1.2, 6); c.closePath(); paint(c, G.leafL, 0.3);   // lettuce frill
    rr(kit, c, 1.4, 6, 9.2, 1.3, 0.6); paint(c, '#ffd35a', 0.25); rr(kit, c, 1.2, 7.2, 9.6, 1.5, 0.7); paint(c, '#6b3d26', 0.3);
    rr(kit, c, 1.6, 8.6, 8.8, 1.2, 0.5); paint(c, '#e0584a', 0.25);
    rr(kit, c, 1.6, 9.5, 8.8, 1.7, 0.8); paint(c, '#e8a04a', 0.3);
  });
}
function drawFries(kit, c, i) {
  treasure(kit, c, i, '#ffcf5a', (c) => {
    for (const [x, y, h, a] of [[3.6, 1.6, 6, -0.18], [5, 0.7, 6.6, -0.05], [6.4, 0.9, 6.4, 0.04], [7.8, 1.2, 6, 0.12], [8.8, 2, 5.4, 0.2], [4.4, 2.4, 5, -0.1]]) {
      c.save(); c.translate(x, y + 6); c.rotate(a); rr(kit, c, -0.55, -h, 1.1, h, 0.3); paint(c, kit.lin(c, -0.5, 0, 0.5, 0, ['#ffe08a', '#e7b640']), 0.25); c.restore();
    }
    c.beginPath(); c.moveTo(2.2, 5.6); c.lineTo(9.8, 5.6); c.lineTo(8.8, 11.2); c.lineTo(3.2, 11.2); c.closePath(); paint(c, kit.lin(c, 0, 5.6, 0, 11.2, ['#ee5a4c', '#c0342c']), 0.35);
    c.beginPath(); c.moveTo(4.4, 6.4); c.quadraticCurveTo(6, 9.8, 7.6, 6.4); c.quadraticCurveTo(6, 7.4, 4.4, 6.4); c.fillStyle = '#ffd35a'; c.fill();
  });
}
function fish(kit, c, i, body, belly, fin, len, hh, glowCol) {
  treasure(kit, c, i, glowCol, (c) => {
    const w = Math.sin(i / 3 * TAU) * 0.35, x0 = 6 - len / 2, x1 = 6 + len / 2;
    c.beginPath(); c.moveTo(x0 + 1.2, 6); c.lineTo(x0 - 0.8, 6 - hh * 0.8 + w); c.lineTo(x0 - 0.4, 6); c.lineTo(x0 - 0.8, 6 + hh * 0.8 - w); c.closePath(); paint(c, fin, 0.3);   // tail wags
    c.beginPath(); c.moveTo(x1, 6); c.bezierCurveTo(x1 - len * 0.2, 6 - hh * 1.2, x0 + len * 0.3, 6 - hh * 1.1, x0 + 1.2, 6); c.bezierCurveTo(x0 + len * 0.3, 6 + hh * 1.1, x1 - len * 0.2, 6 + hh * 1.2, x1, 6); c.closePath();
    paint(c, kit.lin(c, 0, 6 - hh, 0, 6 + hh, [body, belly]), 0.35);
    poly(c, [[6 - 0.8, 6 - hh * 0.9], [6 + 0.8, 6 - hh * 1.5], [6 + 1.8, 6 - hh * 0.8]]); paint(c, fin, 0.25);
    dot(c, x1 - 1.4, 5.4, 0.7, '#fff'); dot(c, x1 - 1.2, 5.4, 0.38, G.ink);
    line(c, x0 + len * 0.45, 6 - hh * 0.5, x0 + len * 0.45, 6 + hh * 0.5, 0.25, 'rgba(255,255,255,0.5)');
  });
}
function drawTuna(kit, c, i) { fish(kit, c, i, '#4f86d6', '#dff0ff', '#3a68b0', 8.6, 2.5, '#9fd0ff'); }
function drawSardine(kit, c, i) { fish(kit, c, i, '#9fb3c8', '#f4f8ff', '#7e94ac', 8.8, 1.5, '#e0f0ff'); }
function drawGold(kit, c, i) {
  treasure(kit, c, i, '#ffd35a', (c) => {
    const sq = [1, 0.55, 1][i];                                    // coin spins
    c.save(); c.translate(6, 6); c.scale(sq, 1); dot(c, 0, 0, 4.4, '#e0a620'); c.lineWidth = 0.35; c.strokeStyle = INK(0.7); c.beginPath(); c.arc(0, 0, 4.4, 0, TAU); c.stroke();
    dot(c, 0, 0, 3.5, kit.radial(c, -1, -1.4, 0, 4.4, [[0, '#fff1a8'], [1, '#f2c02e']]));
    c.beginPath(); c.arc(0, 0, 2.5, 0, TAU); c.lineWidth = 0.3; c.strokeStyle = 'rgba(160,110,10,0.7)'; c.stroke();
    paw(c, 0, 0.1, 0.6, 'rgba(160,110,10,0.85)'); c.restore();
  });
}
function drawCollar(kit, c, i) {
  treasure(kit, c, i, '#ff8a8a', (c) => {
    c.beginPath(); c.ellipse(6, 5.6, 4.6, 3.6, 0, 0, TAU); c.lineWidth = 2.2; c.strokeStyle = INK(0.8); c.stroke(); c.lineWidth = 1.5; c.strokeStyle = '#e0483c'; c.stroke();
    c.beginPath(); c.ellipse(6, 5.6, 4.6, 3.6, 0, Math.PI * 1.1, Math.PI * 1.9); c.lineWidth = 0.4; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.stroke();
    for (let k = 0; k < 6; k++) dot(c, 6 + Math.cos(k * 1.05 + 0.4) * 4.6, 5.6 + Math.sin(k * 1.05 + 0.4) * 3.6, 0.28, '#ffe68a');
    const sw = Math.sin(i / 3 * TAU) * 0.3;                          // bell swings
    dot(c, 6 + sw, 9.8, 1.55, '#e0a620'); c.beginPath(); c.arc(6 + sw, 9.8, 1.55, 0, TAU); c.lineWidth = 0.3; c.strokeStyle = INK(0.7); c.stroke(); dot(c, 5.6 + sw, 9.3, 0.5, '#fff1a8'); line(c, 5 + sw, 10.2, 7 + sw, 10.2, 0.22, 'rgba(120,80,0,0.7)');
  });
}

// ------------------------------------------------------------------ cursor + touch button
function drawCursor(kit, c) { paw(c, 5.6, 5.6, 1.7, '#ffb25e', 'rgba(90,48,64,0.95)'); }
function drawBtn(kit, c, i) {                                      // soft round pad, dips when pressed
  const d = i ? 0.8 : 0;
  softShadow(kit, c, 16, 29 - d, 12, 1.6, i ? 0.18 : 0.3);
  dot(c, 16, 16 + d, 13.6, 'rgba(59,47,58,0.42)');
  dot(c, 16, 15.6 + d, 12.6, kit.radial(c, 13, 11 + d, 0, 18, [[0, i ? 'rgba(244,180,110,0.95)' : 'rgba(255,214,150,0.95)'], [1, i ? 'rgba(210,110,50,0.95)' : 'rgba(240,138,60,0.95)']]));
  c.beginPath(); c.arc(16, 15.6 + d, 12.6, 0, TAU); c.lineWidth = 0.7; c.strokeStyle = 'rgba(255,248,226,0.9)'; c.stroke();
  c.beginPath(); c.arc(16, 15.6 + d, 10.6, Math.PI * 1.15, Math.PI * 1.7); c.lineWidth = 0.9; c.strokeStyle = 'rgba(255,255,255,0.5)'; c.stroke();
  paw(c, 16, 15 + d, 2.8, 'rgba(255,248,226,0.95)', 'rgba(120,60,30,0.55)');
}

export function build(kit) {
  const o = {};
  o.logo = sprite(kit, 192, 48, 1, (c) => drawLogo(kit, c));
  o.title_scene = sprite(kit, 224, 96, 1, (c) => drawTitle(kit, c));
  o.cursor_paw = sprite(kit, 12, 12, 1, (c) => drawCursor(kit, c));
  o.fx_splash = sprite(kit, 16, 16, 4, (c, i) => drawSplash(kit, c, i));
  o.fx_puff = sprite(kit, 16, 16, 4, (c, i) => drawPuff(kit, c, i));
  o.fx_star = sprite(kit, 8, 8, 4, (c, i) => drawStar(kit, c, i));
  o.fx_bubble = sprite(kit, 6, 6, 3, (c, i) => drawBubble(kit, c, i));
  o.tr_whopper = sprite(kit, 12, 12, 3, (c, i) => drawWhopper(kit, c, i));
  o.tr_fries = sprite(kit, 12, 12, 3, (c, i) => drawFries(kit, c, i));
  o.tr_tuna = sprite(kit, 12, 12, 3, (c, i) => drawTuna(kit, c, i));
  o.tr_sardine = sprite(kit, 12, 12, 3, (c, i) => drawSardine(kit, c, i));
  o.tr_gold = sprite(kit, 12, 12, 3, (c, i) => drawGold(kit, c, i));
  o.tr_collar = sprite(kit, 12, 12, 3, (c, i) => drawCollar(kit, c, i));
  o.btn_touch = sprite(kit, 32, 32, 2, (c, i) => drawBtn(kit, c, i));
  return o;
}
export default build;
