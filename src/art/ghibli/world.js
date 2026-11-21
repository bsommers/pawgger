// Ghibli pack: world (module 'world'): soft asphalt, mossy curb, flower median path, Burger King lot, lily-pad bay nooks with hazards
// and bonuses, painted foliage canopy, painted Burger King / Micro Center storefronts, nerds. Parody signage only (no real logos).
// Cell units (1 unit = GHIBLI_SCALE px). 16-wide tiles wrap horizontally (and vertically where possible). Deterministic.
import { GPAL as G } from '../../core/defs.js';
import { sprite, ell, paint, poly, dot, line, INK } from './characters.js';

const TAU = Math.PI * 2;
const SKIN = '#f6cba2', SKIN_D = '#d9a07a';
const FONT = '"Trebuchet MS","Segoe UI",Verdana,Arial,sans-serif';

/** run fn at dx in {-w,0,w} so shapes crossing the tile edge wrap */
function wrapX(c, w, fn) { for (const dx of [-w, 0, w]) { c.save(); c.translate(dx, 0); fn(dx); c.restore(); } }
function wrapXY(c, fn) { for (const dx of [-16, 0, 16]) for (const dy of [-16, 0, 16]) { c.save(); c.translate(dx, dy); fn(); c.restore(); } }
function rr(kit, c, x, y, w, h, r) { kit.roundRect(c, x, y, w, h, r); }
function text(c, s, cx, cy, size, fill, ink = G.ink, lw = 0.55, maxW = 0) {
  let sz = size; c.font = `bold ${sz}px ${FONT}`;
  if (maxW) { const m = c.measureText(s).width; if (m > maxW) { sz = size * maxW / m; c.font = `bold ${sz}px ${FONT}`; } }
  c.textAlign = 'center'; c.textBaseline = 'middle'; c.lineJoin = 'round';
  if (ink) { c.lineWidth = lw; c.strokeStyle = ink; c.strokeText(s, cx, cy); }
  c.fillStyle = fill; c.fillText(s, cx, cy);
}
function grassTuft(c, x, y, s, lean, col = G.leafL, col2 = G.leaf) {
  for (const [dx, h, a] of [[-0.5, 1.0, -0.4], [0, 1.4, 0], [0.5, 1.0, 0.4]]) {
    c.beginPath(); c.moveTo(x + dx * s - 0.25 * s, y); c.quadraticCurveTo(x + dx * s + a * s * 0.3 + lean * 0.4 * s, y - h * s * 0.6, x + dx * s + a * s + lean * s, y - h * s * 1.5);
    c.quadraticCurveTo(x + dx * s + a * s * 0.3 + lean * 0.4 * s + 0.2 * s, y - h * s * 0.5, x + dx * s + 0.25 * s, y); c.fillStyle = dx === 0 ? col : col2; c.fill();
  }
}
function flower(c, x, y, r, col, centre = G.flower2) {
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU; dot(c, x + Math.cos(a) * r * 0.75, y + Math.sin(a) * r * 0.75, r * 0.55, col); }
  dot(c, x, y, r * 0.5, centre);
}
function leafAt(kit, c, x, y, len, wid, ang, col, vein = 'rgba(45,106,69,0.5)') {
  kit.leaf(c, x, y, len, wid, ang); c.fillStyle = col; c.fill();
  c.beginPath(); c.moveTo(x, y); c.lineTo(x + Math.cos(ang) * len * 0.85, y + Math.sin(ang) * len * 0.85); c.lineWidth = 0.18; c.strokeStyle = vein; c.stroke();
}

// ------------------------------------------------------------------ asphalt tiles (seamless in x and y)
function asphalt(kit, c, seed) {
  const r = kit.rng(seed);
  c.fillStyle = G.road; c.fillRect(0, 0, 16, 16);
  for (let k = 0; k < 9; k++) {                                       // pooled watercolour patches, light and dark
    const x = r.next() * 16, y = r.next() * 16, rx = 2 + r.next() * 3.4, ry = 1.4 + r.next() * 2.4, lt = r.next() < 0.5;
    wrapXY(c, () => { kit.blob(c, x, y, rx, ry, { seed: seed * 7 + k, wobble: 0.25 }); c.fillStyle = lt ? 'rgba(141,138,160,0.32)' : 'rgba(79,76,104,0.30)'; c.fill(); });
  }
  for (let k = 0; k < 26; k++) {                                      // tiny pebbles / grain
    const x = r.next() * 16, y = r.next() * 16, lt = r.next() < 0.5;
    wrapXY(c, () => dot(c, x, y, 0.1 + r.next() * 0.16, lt ? 'rgba(200,196,214,0.5)' : 'rgba(46,43,66,0.5)'));
  }
  c.beginPath(); c.moveTo(1.5, 12.4); c.quadraticCurveTo(3.4, 12, 4.4, 13.4); c.quadraticCurveTo(5.6, 14.6, 7.6, 14.2); c.lineWidth = 0.2; c.strokeStyle = 'rgba(46,43,66,0.55)'; c.stroke();   // hairline crack
}
function drawRoad(kit, c) { asphalt(kit, c, 11); }
function drawRoadDash(kit, c) {
  asphalt(kit, c, 17);
  rr(kit, c, 3.2, 7.65, 10, 1.5, 0.75); c.fillStyle = 'rgba(46,43,66,0.30)'; c.fill();                   // soft shadow of the paint
  rr(kit, c, 3, 7.2, 10, 1.5, 0.75); c.fillStyle = G.roadLine; c.fill();
  rr(kit, c, 3.6, 7.3, 8, 0.45, 0.22); c.fillStyle = 'rgba(255,252,230,0.7)'; c.fill();                   // sun-warmed highlight
  dot(c, 12.2, 8.4, 0.2, 'rgba(110,107,134,0.8)'); dot(c, 5, 7.6, 0.18, 'rgba(110,107,134,0.8)');        // worn spots
}

// ------------------------------------------------------------------ mossy curb
function drawCurb(kit, c) {
  c.fillStyle = kit.lin(c, 0, 0, 0, 6.5, [G.leafL, G.moss]); c.fillRect(0, 0, 16, 6.5);                      // grass verge
  const r = kit.rng(31);
  for (let k = 0; k < 7; k++) { const x = (k + r.next() * 0.6) * 2.3; wrapX(c, 16, () => grassTuft(c, x, 5.2 + r.next() * 1.2, 1.1, 0.12, G.grassL, G.leaf)); }
  wrapX(c, 16, () => { flower(c, 3.2, 2.2, 0.55, G.flower2); flower(c, 11.6, 3.4, 0.5, G.flower1); });
  c.fillStyle = kit.lin(c, 0, 6.5, 0, 12.4, ['#d6cdbd', G.curb, '#8d8578']); c.fillRect(0, 6.5, 16, 5.9);       // stone lip
  for (const x of [0, 8]) { c.beginPath(); c.moveTo(x, 6.6); c.lineTo(x, 12.2); c.lineWidth = 0.3; c.strokeStyle = 'rgba(80,70,64,0.5)'; c.stroke(); }
  c.fillStyle = 'rgba(255,248,230,0.45)'; c.fillRect(0, 6.8, 16, 0.5);
  for (const [x, w] of [[1.8, 2.6], [6.6, 1.8], [11, 3.2]]) wrapX(c, 16, () => { kit.blob(c, x, 7, w, 0.9, { seed: Math.floor(x * 10), wobble: 0.3 }); c.fillStyle = kit.rgba(G.moss, 0.95); c.fill(); kit.blob(c, x - 0.3, 6.8, w * 0.55, 0.45, { seed: 3, wobble: 0.2 }); c.fillStyle = G.leafL; c.fill(); });
  c.fillStyle = G.road; c.fillRect(0, 12.4, 16, 4);                                                              // gutter
  const g = kit.lin(c, 0, 12.4, 0, 16, ['rgba(46,43,66,0.55)', 'rgba(46,43,66,0)']); c.fillStyle = g; c.fillRect(0, 12.4, 16, 3.6);
  for (const x of [2, 7.5, 12.5]) dot(c, x, 14.4, 0.14, 'rgba(46,43,66,0.5)');
}

// ------------------------------------------------------------------ flower-dotted median path (2 frames: grass sways)
function drawMedian(kit, c, i) {
  const r = kit.rng(41), sw = i ? 0.35 : -0.35;
  c.fillStyle = G.moss; c.fillRect(0, 0, 16, 16);
  c.fillStyle = kit.lin(c, 0, 0, 0, 16, [G.grassL, G.moss, G.leaf]); c.fillRect(0, 0, 16, 16);
  c.beginPath(); c.moveTo(0, 4.2);                                                                                  // winding sandy path
  for (let x = 0; x <= 16.01; x += 0.5) c.lineTo(x, 4.4 + Math.sin(x / 16 * TAU) * 0.7);
  for (let x = 16; x >= -0.01; x -= 0.5) c.lineTo(x, 11.6 + Math.sin(x / 16 * TAU + 1) * 0.6);
  c.closePath(); c.fillStyle = kit.lin(c, 0, 4, 0, 12.4, [G.path, '#ead09a', G.pathD]); c.fill();
  c.beginPath(); c.moveTo(0, 4.4); for (let x = 0; x <= 16.01; x += 0.5) c.lineTo(x, 4.4 + Math.sin(x / 16 * TAU) * 0.7); c.lineWidth = 0.35; c.strokeStyle = 'rgba(100,150,80,0.9)'; c.stroke();
  for (let k = 0; k < 9; k++) { const x = r.next() * 16, y = 5.6 + r.next() * 5, rr_ = 0.2 + r.next() * 0.3; wrapX(c, 16, () => { ell(c, x, y, rr_ * 1.4, rr_); c.fillStyle = k % 2 ? 'rgba(191,154,86,0.8)' : 'rgba(250,240,210,0.7)'; c.fill(); }); }
  for (let k = 0; k < 6; k++) { const x = (k + 0.3 + r.next() * 0.4) * 2.7, y = r.next() < 0.5 ? 1.5 + r.next() * 2 : 12.8 + r.next() * 2.4; wrapX(c, 16, () => grassTuft(c, x, y + 1, 1.2, sw, G.grassL, G.leaf)); }
  const cols = [G.flower1, G.flower2, G.flower3];
  [[2.2, 2, 0], [6.4, 13.6, 1], [10, 2.6, 2], [13.6, 14, 0], [4.4, 14.8, 2], [8.6, 1.2, 0], [14.4, 3, 1]].forEach(([x, y, k], n) => {
    const pulse = ((i + n) % 2) ? 0.62 : 0.5; wrapX(c, 16, () => flower(c, x, y + (i ? 0.1 : 0), pulse, cols[k], k === 1 ? '#f4a6b4' : G.flower2));
  });
}

// ------------------------------------------------------------------ start strip: Burger King lot (2 frames: puddle glint)
function drawStart(kit, c, i) {
  asphalt(kit, c, 23);
  c.fillStyle = 'rgba(244,190,120,0.16)'; c.fillRect(0, 0, 16, 16);                                                  // warm lot light
  for (const x of [0, 16]) { c.beginPath(); c.moveTo(x, 1.4); c.lineTo(x, 14.6); c.lineWidth = 0.7; c.strokeStyle = 'rgba(243,227,160,0.85)'; c.stroke(); }    // stall lines
  c.beginPath(); c.moveTo(0, 14.9); c.lineTo(16, 14.9); c.lineWidth = 0.4; c.strokeStyle = 'rgba(243,227,160,0.6)'; c.stroke();
  wrapX(c, 16, () => {
    kit.blob(c, 10.8, 5.6, 3, 1.5, { seed: 5, wobble: 0.25 }); c.fillStyle = 'rgba(79,134,214,0.45)'; c.fill();             // puddle
    kit.blob(c, 10.4, 5.4, 2, 0.8, { seed: 8, wobble: 0.25 }); c.fillStyle = 'rgba(191,227,247,0.55)'; c.fill();
    const gx = 9.4 + i * 2, gy = 5.2; dot(c, gx, gy, 0.35, '#fff'); line(c, gx - 0.8, gy, gx + 0.8, gy, 0.15, '#fff'); line(c, gx, gy - 0.7, gx, gy + 0.7, 0.15, '#fff');
    kit.blob(c, 3.6, 11.6, 1.1, 0.7, { seed: 2, wobble: 0.4 }); c.fillStyle = 'rgba(224,72,60,0.85)'; c.fill();           // ketchup splat
    dot(c, 4.5, 11.2, 0.25, 'rgba(224,72,60,0.8)');
    c.save(); c.translate(13, 12.4); c.rotate(0.5); rr(kit, c, -1.1, -0.3, 2.2, 0.6, 0.25); c.fillStyle = '#f6cf5a'; c.fill(); c.restore();   // dropped fry
    c.save(); c.translate(13.8, 13); c.rotate(-0.3); rr(kit, c, -0.9, -0.3, 1.8, 0.6, 0.25); c.fillStyle = '#e7b640'; c.fill(); c.restore();
  });
}

// ------------------------------------------------------------------ home bays: lily-pad nooks in the Micro Center front (32x16)
function bayBase(kit, c, o = {}) {
  const r = kit.rng(51);
  c.fillStyle = kit.lin(c, 0, 0, 0, 7.6, ['#27573f', '#2d6a45', '#3d8450']); c.fillRect(0, 0, 32, 8);                       // shaded leafy back wall
  for (let k = 0; k < 12; k++) { const x = r.next() * 32, y = r.next() * 7; leafAt(kit, c, x, y, 2 + r.next() * 1.6, 1 + r.next() * 0.5, r.next() * TAU, r.next() < 0.5 ? 'rgba(79,154,82,0.55)' : 'rgba(45,106,69,0.7)'); }
  rr(kit, c, 4, 1, 24, 7, 1.2); c.fillStyle = kit.lin(c, 0, 1, 0, 8, ['rgba(191,227,247,0.85)', 'rgba(143,212,232,0.55)']); c.fill();   // glass door
  c.lineWidth = 0.4; c.strokeStyle = '#9aa4b4'; c.stroke();
  line(c, 16, 1.2, 16, 7.8, 0.35, '#9aa4b4'); line(c, 4.4, 4.6, 27.6, 4.6, 0.25, 'rgba(154,164,180,0.8)');
  line(c, 7, 6.6, 11, 2.2, 0.55, 'rgba(255,255,255,0.35)'); line(c, 19, 6.8, 22, 2.8, 0.45, 'rgba(255,255,255,0.3)');            // glass glints
  c.fillStyle = kit.lin(c, 0, 8, 0, 16, [G.waterL, G.water, G.waterD]); c.fillRect(0, 8, 32, 8);                                   // pond
  c.fillStyle = 'rgba(241,251,255,0.7)'; c.fillRect(0, 8, 32, 0.45);
  for (let k = 0; k < 5; k++) { const x = 3 + r.next() * 26, y = 9.4 + r.next() * 5.6; line(c, x, y, x + 2.2 + r.next() * 1.6, y, 0.22, 'rgba(241,251,255,0.5)'); }
  if (o.lily !== false) for (const [x, y, rad, a, fl] of [[8.5, 12.6, 2.9, 0.4, 1], [24, 11.8, 2.5, 3.2, 0]]) {                                      // lily pads
    c.beginPath(); c.moveTo(x, y); c.arc(x, y, rad, a + 0.45, a + TAU - 0.45); c.closePath(); c.fillStyle = kit.radial(c, x - 0.6, y - 0.6, 0, rad, [[0, G.leafL], [1, G.leaf]]); c.fill(); c.lineWidth = 0.25; c.strokeStyle = 'rgba(45,106,69,0.8)'; c.stroke();
    if (fl) flower(c, x + 0.4, y - 0.2, 0.65, G.flower1, G.flower2);
  }
  for (const x of [0, 32]) { rr(kit, c, x - 1.1, 0, 2.2, 16, 0.6); c.fillStyle = kit.lin(c, 0, 0, 0, 16, ['#c8cbd6', '#8d8aa0']); c.fill(); }            // door posts
  c.fillStyle = 'rgba(46,43,66,0.18)'; c.fillRect(0, 0, 32, 1.1);
}
function drawBayEmpty(kit, c) { bayBase(kit, c); }
function drawBayWall(kit, c) {
  const r = kit.rng(61);
  c.fillStyle = kit.lin(c, 0, 0, 0, 16, ['#3d8450', '#2d6a45', '#27573f']); c.fillRect(0, 0, 16, 16);
  for (let k = 0; k < 26; k++) { const x = r.next() * 16, y = r.next() * 16, a = r.next() * TAU, lt = r.next() < 0.45; wrapXY(c, () => leafAt(kit, c, x, y, 2 + r.next() * 1.4, 1 + r.next() * 0.5, a, lt ? kit.rgba(G.leafL, 0.7) : kit.rgba(G.leaf, 0.8))); }
  for (const [x, y, col] of [[3, 4, G.flower1], [11, 8, G.flower2], [6, 12, G.flower3], [14, 3, G.flower2]]) wrapX(c, 16, () => flower(c, x, y, 0.5, col));
  c.fillStyle = kit.lin(c, 0, 0, 0, 4, ['rgba(255,255,255,0.18)', 'rgba(255,255,255,0)']); c.fillRect(0, 0, 16, 4);
}
function drawBayCroc(kit, c, i) {                                  // 0 dozing (safe-looking), 1 stirring, 2 jaws wide (lethal)
  bayBase(kit, c, { lily: i === 0 ? 'few' : false });
  const open = [0, 0.45, 1][i], cx = 16, cy = 12.6;
  softShadow(kit, c, cx, 13.4, 7.5, 1.6, 0.25);
  ell(c, cx, cy + 0.6, 8, 2.6); c.fillStyle = kit.lin(c, 0, cy - 2, 0, cy + 3, [G.leafL, G.leaf, G.leafD]); c.fill();                        // back/snout above water
  for (const x of [-5.5, -2.5, 0.5, 3.5, 6]) { dot(c, cx + x, cy - 1.6 + Math.abs(x) * 0.05, 0.5, G.leafD); }
  const jaw = 0.4 + open * 2.3;
  c.beginPath(); c.moveTo(cx - 5, cy + 0.2); c.quadraticCurveTo(cx, cy - 2.2 - jaw, cx + 5, cy + 0.2); c.closePath(); c.fillStyle = G.leaf; c.fill();     // upper jaw
  if (open > 0) { rr(kit, c, cx - 4.2, cy - 0.6 + 0.2, 8.4, jaw, 0.5); c.fillStyle = '#e0584a'; c.fill();
    for (let k = 0; k < 5; k++) { const tx = cx - 3.6 + k * 1.8; poly(c, [[tx - 0.4, cy - 0.6], [tx + 0.4, cy - 0.6], [tx, cy + 0.4]]); c.fillStyle = '#fff'; c.fill(); poly(c, [[tx - 0.4, cy + jaw - 0.4], [tx + 0.4, cy + jaw - 0.4], [tx, cy + jaw - 1.4]]); c.fillStyle = '#fff'; c.fill(); } }
  c.beginPath(); c.moveTo(cx - 5.2, cy + 0.2 + jaw); c.quadraticCurveTo(cx, cy + 2.6 + jaw, cx + 5.2, cy + 0.2 + jaw); c.lineWidth = 0.5; c.strokeStyle = G.leafD; c.stroke();
  for (const sx of [-1, 1]) { dot(c, cx + sx * 3.4, cy - 2.2, 1.1, G.leaf); dot(c, cx + sx * 3.4, cy - 2.4, 0.85, '#fff6a8'); const pv = open > 0.5 ? 0.65 : 0.2; ell(c, cx + sx * 3.4, cy - 2.4, pv, 0.8); c.fillStyle = INK(0.9); c.fill(); }
  c.fillStyle = 'rgba(241,251,255,0.55)'; c.fillRect(cx - 9, cy + 2.4, 18, 0.3);
}
function softShadow(kit, c, x, y, rx, ry, a) { kit.softShadow(c, x, y, rx, ry, a); }
function drawBaySnake(kit, c, i) {                                 // 0 hidden ripples, 1 rising, 2 striking with tongue
  bayBase(kit, c, { lily: i === 0 });
  const rise = [0, 0.55, 1][i], bx = 16, by = 13.4;
  if (i === 0) { for (const k of [0, 1]) { ell(c, bx + 3, by + 0.6, 2 + k * 1.3, 0.55 + k * 0.3); c.lineWidth = 0.22; c.strokeStyle = 'rgba(241,251,255,0.6)'; c.stroke(); } return; }
  const h = 2.6 + rise * 5.4, lean = rise * 1.6;
  c.beginPath(); c.moveTo(bx - 1.8, by); c.bezierCurveTo(bx - 2.4, by - h * 0.4, bx - 0.4 + lean, by - h * 0.6, bx + lean * 1.4 - 1.2, by - h); c.lineTo(bx + lean * 1.4 + 1.2, by - h); c.bezierCurveTo(bx + 0.6 + lean, by - h * 0.6, bx + 2.4, by - h * 0.4, bx + 1.8, by); c.closePath();
  c.fillStyle = kit.lin(c, bx - 2, 0, bx + 2, 0, [G.leafL, G.pickle, G.leaf]); c.fill(); c.lineWidth = 0.3; c.strokeStyle = INK(0.75); c.stroke();
  for (let k = 0; k < 3; k++) { const yy = by - h * (0.2 + k * 0.22); rr(kit, c, bx - 1.4 + lean * (0.2 + k * 0.2), yy, 2.8, 0.7, 0.3); c.fillStyle = 'rgba(255,211,90,0.8)'; c.fill(); }
  const hx = bx + lean * 1.4, hy = by - h;
  ell(c, hx, hy - 0.6, 2, 1.7); c.fillStyle = G.leafL; c.fill(); c.lineWidth = 0.3; c.strokeStyle = INK(0.75); c.stroke();
  for (const s of [-1, 1]) { dot(c, hx + s * 1.0, hy - 1.1, 0.55, '#fff6a8'); ell(c, hx + s * 1.0, hy - 1.1, 0.14, 0.45); c.fillStyle = INK(0.95); c.fill(); }
  if (i === 2) { line(c, hx, hy + 0.9, hx, hy + 2.6, 0.3, '#e0483c'); line(c, hx, hy + 2.6, hx - 0.7, hy + 3.3, 0.25, '#e0483c'); line(c, hx, hy + 2.6, hx + 0.7, hy + 3.3, 0.25, '#e0483c'); }
  ell(c, bx, by + 0.4, 3.4, 0.8); c.fillStyle = 'rgba(241,251,255,0.7)'; c.fill();
}

// ------------------------------------------------------------------ bonuses (transparent, drawn over bay_empty)
function glow(kit, c, x, y, r, col, a) { const g = kit.radial(c, x, y, 0, r, [[0, kit.rgba(col, a)], [1, kit.rgba(col, 0)]]); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function drawMouse(kit, c, i) {                                    // computer mouse
  const bob = i ? -0.35 : 0.2;
  glow(kit, c, 8, 8 + bob, 8, '#9fe8ff', i ? 0.55 : 0.35);
  softShadow(kit, c, 8, 13.6, 4.4, 1, 0.3);
  c.save(); c.translate(0, bob);
  c.beginPath(); c.moveTo(8, 2.6); c.bezierCurveTo(12.4, 2.6, 13, 6, 12.8, 9.6); c.bezierCurveTo(12.6, 13, 10.4, 14, 8, 14); c.bezierCurveTo(5.6, 14, 3.4, 13, 3.2, 9.6); c.bezierCurveTo(3, 6, 3.6, 2.6, 8, 2.6); c.closePath();
  paint(c, kit.lin(c, 3, 3, 13, 14, ['#f4f6fb', '#c9d2e4', '#8f9bb8']), 0.4);
  c.beginPath(); c.moveTo(8, 2.8); c.lineTo(8, 7.4); c.lineWidth = 0.3; c.strokeStyle = INK(0.6); c.stroke();
  c.beginPath(); c.moveTo(3.4, 7.4); c.quadraticCurveTo(8, 8.6, 12.6, 7.4); c.stroke();
  rr(kit, c, 7.2, 3.8, 1.6, 2.8, 0.8); c.fillStyle = i ? '#ff5fa2' : '#5fd0ff'; c.fill(); c.lineWidth = 0.25; c.strokeStyle = INK(0.7); c.stroke();      // scroll wheel (colour flips)
  c.beginPath(); c.moveTo(4.4, 5); c.quadraticCurveTo(5, 3.6, 6.6, 3.4); c.lineWidth = 0.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.stroke();
  c.beginPath(); c.moveTo(8, 14); c.quadraticCurveTo(8.6, 15.4, 10.4, 15.6); c.lineWidth = 0.3; c.strokeStyle = INK(0.7); c.stroke();         // tail cable
  c.restore();
  if (i) { dot(c, 13.4, 2.6, 0.4, '#fff'); line(c, 12.6, 2.6, 14.2, 2.6, 0.15, '#fff'); line(c, 13.4, 1.8, 13.4, 3.4, 0.15, '#fff'); }
}
function drawGpu(kit, c, i) {                                      // graphics card with a spinning fan
  const bob = i ? -0.3 : 0.2;
  glow(kit, c, 8, 8 + bob, 8, '#a9ffb4', i ? 0.55 : 0.35);
  softShadow(kit, c, 8, 13.6, 6, 1, 0.3);
  c.save(); c.translate(0, bob);
  rr(kit, c, 1.2, 3.6, 13.6, 8.4, 1); paint(c, kit.lin(c, 0, 3.6, 0, 12, ['#4a5a80', '#2d3556']), 0.4);
  rr(kit, c, 1.6, 4, 12.8, 1.2, 0.5); c.fillStyle = 'rgba(255,255,255,0.22)'; c.fill();
  rr(kit, c, 2.2, 11.8, 7.4, 1.5, 0.3); c.fillStyle = G.gold; c.fill();                                  // gold edge connector
  for (let k = 0; k < 5; k++) line(c, 2.8 + k * 1.4, 12, 2.8 + k * 1.4, 13.1, 0.2, '#b98a1e');
  dot(c, 8, 8, 3.2, '#1b2036'); c.lineWidth = 0.3; c.strokeStyle = '#9aa4b4'; c.stroke();                // fan
  for (let k = 0; k < 5; k++) { const a = (k / 5) * TAU + i * 0.6; c.beginPath(); c.moveTo(8, 8); c.quadraticCurveTo(8 + Math.cos(a - 0.5) * 3.2, 8 + Math.sin(a - 0.5) * 3.2, 8 + Math.cos(a + 0.2) * 2.8, 8 + Math.sin(a + 0.2) * 2.8); c.closePath(); c.fillStyle = k % 2 ? '#5fe08a' : '#86f2a6'; c.fill(); }
  dot(c, 8, 8, 0.7, '#e8f0ff');
  for (const [x, y] of [[12.4, 5.6], [12.4, 6.9]]) rr(kit, c, x - 0.8, y - 0.25, 1.6, 0.5, 0.2), c.fillStyle = i ? '#ff5fa2' : '#5fd0ff', c.fill();   // RGB strips
  rr(kit, c, 2, 5.4, 1.2, 4.2, 0.3); c.fillStyle = '#9aa4b4'; c.fill();
  c.restore();
}

// ------------------------------------------------------------------ backdrop strips
function foliageFill(kit, c, w, h, seed, cols, n, lenA = 3.2) {
  const r = kit.rng(seed);
  for (let k = 0; k < n; k++) leafAt(kit, c, r.next() * w, r.next() * h, lenA * (0.7 + r.next() * 0.8), 1.3 + r.next() * 0.9, r.next() * TAU, cols[Math.floor(r.next() * cols.length)], 'rgba(30,70,45,0.35)');
}
function drawCanopy(kit, c) {                                      // transparent ragged lower edge; dark enough for HUD text
  const r = kit.rng(71);
  c.beginPath(); c.moveTo(0, 0); c.lineTo(224, 0);
  for (let x = 224; x >= 0; x -= 2) c.lineTo(x, 10 + Math.sin(x * 0.31) * 1.4 + Math.sin(x * 0.11 + 2) * 1.8 + (r.next() < 0.1 ? 1.4 : 0));
  c.closePath(); c.fillStyle = kit.lin(c, 0, 0, 0, 14, ['#1f4d38', '#2d6a45', '#3a7d4c']); c.fill();
  foliageFill(kit, c, 224, 11, 72, ['rgba(45,106,69,0.9)', 'rgba(31,77,56,0.9)', 'rgba(79,154,82,0.8)'], 120, 3);
  for (let x = 2; x < 224; x += 3 + r.next() * 4) { const y = 9 + Math.sin(x * 0.31) * 1.4 + Math.sin(x * 0.11 + 2) * 1.8; leafAt(kit, c, x, y - 1, 2.8 + r.next() * 1.6, 1.4, 1.2 + r.next() * 0.8, r.next() < 0.5 ? G.leaf : G.leafD, 'rgba(30,70,45,0.4)'); }
  for (let k = 0; k < 14; k++) {                                                              // hanging vines with tiny leaves
    const x = 6 + k * 16 + r.next() * 8, len = 3 + r.next() * 4, y0 = 9 + Math.sin(x * 0.31) * 1.4;
    c.beginPath(); c.moveTo(x, y0 - 1); c.quadraticCurveTo(x + 1, y0 + len * 0.5, x - 0.4, y0 + len); c.lineWidth = 0.3; c.strokeStyle = G.leafD; c.stroke();
    leafAt(kit, c, x - 0.4, y0 + len, 1.4, 0.8, 1.9, G.leafL); leafAt(kit, c, x + 0.4, y0 + len * 0.55, 1.2, 0.7, 0.9, G.leaf);
  }
  for (let k = 0; k < 16; k++) { const x = 4 + r.next() * 216, y = 2 + r.next() * 7; flower(c, x, y, 0.45, [G.flower1, G.flower2, G.flower3][k % 3]); }
  for (let k = 0; k < 9; k++) { const x = 8 + k * 25 + r.next() * 8; kit.blob(c, x, 2.6, 5 + r.next() * 4, 1.6, { seed: k * 3 + 1, wobble: 0.3 }); c.fillStyle = 'rgba(255,241,168,0.12)'; c.fill(); }   // dappled light
}
function drawTicker(kit, c) {
  c.fillStyle = kit.lin(c, 0, 0, 0, 16, ['#5a4a55', '#3b2f3a', '#2c2330']); c.fillRect(0, 0, 224, 16);
  const r = kit.rng(81);
  for (let k = 0; k < 40; k++) { const x = r.next() * 224, y = 1 + r.next() * 14; line(c, x, y, x + 3 + r.next() * 6, y + (r.next() - 0.5) * 0.4, 0.2, 'rgba(255,240,214,0.07)'); }
  c.fillStyle = kit.lin(c, 0, 0, 0, 3, [G.leaf, G.leafD]); c.fillRect(0, 0, 224, 1.6);                         // mossy trim
  for (let x = 1; x < 224; x += 2.6 + r.next() * 1.6) { leafAt(kit, c, x, 0.6, 1.8 + r.next(), 0.9, 1.57 + (r.next() - 0.5) * 0.9, r.next() < 0.5 ? G.leaf : G.leafL, 'rgba(30,70,45,0.4)'); }
  c.fillStyle = 'rgba(255,255,255,0.08)'; c.fillRect(0, 2, 224, 0.5);
  c.fillStyle = 'rgba(0,0,0,0.25)'; c.fillRect(0, 15.4, 224, 0.6);
}
function drawSignPete(kit, c) {                                    // little wooden "PETE" signboard with rat ears
  softShadow(kit, c, 16, 14.6, 11, 1, 0.28);
  for (const x of [8, 24]) { rr(kit, c, x - 0.7, 11, 1.4, 4, 0.4); paint(c, G.trunk, 0.3); }
  for (const x of [8.6, 23.4]) { ell(c, x, 2.8, 2.2, 2.4); paint(c, G.peteFur, 0.35); ell(c, x, 3, 1.1, 1.3); c.fillStyle = '#f4a6b4'; c.fill(); }   // ears
  rr(kit, c, 2.5, 3.4, 27, 9, 1.8); paint(c, kit.lin(c, 0, 3.4, 0, 12.4, [G.trunkL, '#946a42']), 0.5);
  rr(kit, c, 3.6, 4.4, 24.8, 7, 1.2); c.lineWidth = 0.25; c.strokeStyle = 'rgba(59,40,28,0.55)'; c.stroke();
  text(c, 'PETE', 16, 8.2, 5.4, '#fff1c8', '#3b2f3a', 0.7, 22);
  dot(c, 3.6, 4.4, 0.3, '#5a3b26'); dot(c, 28.4, 4.4, 0.3, '#5a3b26'); dot(c, 3.6, 11.4, 0.3, '#5a3b26'); dot(c, 28.4, 11.4, 0.3, '#5a3b26');
}

// ------------------------------------------------------------------ Micro Center (row 0, goal side): boxy red-and-white sign over the bays
function drawMicroCenter(kit, c) {
  c.fillStyle = kit.lin(c, 0, 0, 0, 16, ['#9fb3cf', '#8da1bf', '#6f84a6']); c.fillRect(0, 0, 224, 16);                 // blue-grey wall
  const r = kit.rng(91);
  for (let k = 0; k < 20; k++) { const x = r.next() * 224, y = r.next() * 16; kit.blob(c, x, y, 6 + r.next() * 8, 1.2 + r.next(), { seed: k + 5, wobble: 0.3 }); c.fillStyle = r.next() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(40,50,80,0.07)'; c.fill(); }
  c.fillStyle = '#4a5a80'; c.fillRect(0, 0, 224, 1.2); c.fillStyle = 'rgba(255,255,255,0.25)'; c.fillRect(0, 1.2, 224, 0.4);   // roof trim
  for (const x0 of [4, 168]) for (let k = 0; k < 3; k++) { rr(kit, c, x0 + k * 17, 3, 14, 9, 0.8); c.fillStyle = kit.lin(c, 0, 3, 0, 12, ['rgba(191,227,247,0.9)', 'rgba(94,140,190,0.9)']); c.fill(); c.lineWidth = 0.3; c.strokeStyle = '#d8dee9'; c.stroke(); line(c, x0 + k * 17 + 2, 11, x0 + k * 17 + 6, 4, 0.5, 'rgba(255,255,255,0.35)'); }   // glowing display windows
  // the sign: a boxy red box with a white band
  const sx = 62, sw = 100;
  rr(kit, c, sx + 0.8, 2.6, sw, 11.4, 1.2); c.fillStyle = 'rgba(30,40,70,0.3)'; c.fill();
  rr(kit, c, sx, 1.8, sw, 11.4, 1.2); paint(c, kit.lin(c, 0, 1.8, 0, 13.2, ['#ee5a4c', '#d6382e', '#b02a24']), 0.5);
  rr(kit, c, sx + 1.4, 3.2, sw - 2.8, 8.6, 0.8); c.fillStyle = '#fff6ea'; c.fill(); c.lineWidth = 0.3; c.strokeStyle = 'rgba(120,30,26,0.6)'; c.stroke();
  text(c, 'MICRO CENTER', sx + sw / 2, 7.7, 6.8, '#c8281f', 'rgba(120,20,16,0.9)', 0.35, sw - 8);
  for (let k = 0; k < 8; k++) dot(c, sx + 3 + k * ((sw - 6) / 7), 2.6, 0.28, '#fff6a8');                          // bulbs
  for (const x of [sx + 8, sx + sw - 8]) { line(c, x, 13, x, 16, 0.6, '#6a7694'); }
  for (let x = 40; x < 190; x += 24) if (x < 58 || x > 166) { flower(c, x, 15, 0.5, G.flower1); }
  for (const x of [34, 58, 168, 192]) { ell(c, x, 15.6, 3.6, 2); c.fillStyle = G.leaf; c.fill(); ell(c, x - 0.6, 15.2, 2.2, 1.1); c.fillStyle = G.leafL; c.fill(); }   // shrubs
}

// ------------------------------------------------------------------ Burger King (row 15, start side): bun-and-text sign, warm storefront
function bun(kit, c, x, y, w, h) {                                 // a little burger icon (bun, lettuce, patty, bun)
  c.beginPath(); c.moveTo(x, y + h * 0.42); c.quadraticCurveTo(x + w / 2, y - h * 0.5, x + w, y + h * 0.42); c.closePath(); paint(c, kit.lin(c, 0, y, 0, y + h * 0.45, ['#f0b25a', '#d98c34']), 0.3);
  for (const [fx, fy] of [[0.3, 0.2], [0.5, 0.1], [0.7, 0.2]]) { ell(c, x + w * fx, y + h * fy, 0.4, 0.22, 0.5); c.fillStyle = '#fff3d0'; c.fill(); }
  rr(kit, c, x - 0.3, y + h * 0.44, w + 0.6, h * 0.16, h * 0.08); c.fillStyle = G.leafL; c.fill();
  rr(kit, c, x, y + h * 0.6, w, h * 0.17, h * 0.08); c.fillStyle = '#6b3d26'; c.fill();
  rr(kit, c, x, y + h * 0.77, w, h * 0.23, h * 0.1); paint(c, '#e8a04a', 0.3);
}
function drawBurger(kit, c) {
  c.fillStyle = kit.lin(c, 0, 0, 0, 16, ['#f3d9a8', '#f0c88a', '#e0a866']); c.fillRect(0, 0, 224, 16);              // warm storefront wall
  const r = kit.rng(101);
  for (let k = 0; k < 16; k++) { kit.blob(c, r.next() * 224, r.next() * 16, 8, 1.4, { seed: k + 2, wobble: 0.3 }); c.fillStyle = 'rgba(255,255,255,0.08)'; c.fill(); }
  c.fillStyle = kit.lin(c, 0, 0, 0, 3, ['#9c4a2a', '#c0623a']); c.fillRect(0, 0, 224, 2.4);                           // tiled roof edge
  for (let x = 1; x < 224; x += 4) { ell(c, x, 2.4, 2, 1); c.fillStyle = '#b4562f'; c.fill(); }
  const windows = [[6, 24], [34, 24], [160, 24], [190, 24]];
  for (const [x, w] of windows) { rr(kit, c, x, 5, w, 7.6, 1); c.fillStyle = kit.lin(c, 0, 5, 0, 12.6, ['#ffe9b0', '#ffc86a']); c.fill(); c.lineWidth = 0.35; c.strokeStyle = '#7a4a2c'; c.stroke();   // lit windows
    for (let k = 1; k < 4; k++) line(c, x + k * w / 4, 5.2, x + k * w / 4, 12.4, 0.25, 'rgba(122,74,44,0.7)'); line(c, x + 0.4, 8.8, x + w - 0.4, 8.8, 0.25, 'rgba(122,74,44,0.6)');
    for (let k = 0; k < 3; k++) { dot(c, x + 4 + k * 8, 10.6, 0.8, 'rgba(255,255,255,0.4)'); } }
  const sx = 62, sw = 100;                                                                                            // sign
  rr(kit, c, sx + 0.8, 3.2, sw, 11, 4); c.fillStyle = 'rgba(80,40,20,0.3)'; c.fill();
  rr(kit, c, sx, 2.6, sw, 11, 4); paint(c, kit.lin(c, 0, 2.6, 0, 13.6, ['#f08a3c', '#e0662a', '#c04a1c']), 0.5);
  rr(kit, c, sx + 1.4, 4, sw - 2.8, 8.2, 3); c.fillStyle = '#2f5aa8'; c.fill(); c.lineWidth = 0.3; c.strokeStyle = 'rgba(255,240,214,0.8)'; c.stroke();
  bun(kit, c, sx + 5, 4.8, 9.5, 7);
  text(c, 'BURGER KING', sx + 18 + (sw - 22) / 2, 8.3, 6.8, '#fff3d0', '#7a2a12', 0.45, sw - 26);
  for (let k = 0; k < 8; k++) dot(c, sx + 5 + k * ((sw - 10) / 7), 3.4, 0.25, '#fff6a8');
  for (const x of [3, 62, 167, 220]) { ell(c, x, 15.8, 3, 1.8); c.fillStyle = G.leaf; c.fill(); }
  c.fillStyle = 'rgba(0,0,0,0.12)'; c.fillRect(0, 15.4, 224, 0.6);
}
function drawBkPole(kit, c, i) {                                   // roadside pole sign; bulbs and the bun blink
  softShadow(kit, c, 8, 15.2, 4.6, 0.9, 0.3);
  rr(kit, c, 7.2, 7.6, 1.6, 8, 0.5); paint(c, kit.lin(c, 7, 0, 9, 0, ['#b7bcc8', '#8b91a0']), 0.3);
  glow(kit, c, 8, 4.4, 8, '#ffd35a', i ? 0.55 : 0.28);
  rr(kit, c, 2.4, 0.8, 11.2, 7.2, 2); paint(c, kit.lin(c, 0, 0.8, 0, 8, ['#2f5aa8', '#244884']), 0.4);
  bun(kit, c, 4, 1.6, 8, 5.6);
  for (const [x, y] of [[3.4, 1.4], [12.6, 1.4], [3.4, 7.4], [12.6, 7.4], [8, 1.1], [8, 7.7]]) { const on = ((x + y) % 2 === 0) === (i === 1); dot(c, x, y, on ? 0.55 : 0.32, on ? '#fff6a8' : '#b09a5a'); }
}

// ------------------------------------------------------------------ nerds (feet at the bottom row)
const NERDS = [
  { hood: '#4f86d6', hoodD: '#3a68b0', hair: '#3b2f3a', hairKind: 0 },
  { hood: '#62b667', hoodD: '#3f8a4a', hair: '#a6642a', hairKind: 1 },
  { hood: '#9a7ad8', hoodD: '#7456b4', hair: '#2a2a3a', hairKind: 2 },
  { hood: '#f08a4a', hoodD: '#c46a2e', hair: '#e8c26a', hairKind: 0 },
];
function nerdBody(kit, c, n, o) {
  const { cheer = false, bob: bob0 = 0, armUp = 0 } = o, bob = bob0 + 0.5;
  softShadow(kit, c, 8, 15.2, 4.6, 0.9, 0.32);
  c.save(); c.translate(0, bob);
  for (const s of [-1, 1]) { rr(kit, c, 8 + s * 1.6 - 1.1, 12, 2.2, 3.4 - bob, 0.8); paint(c, '#4a4a6a', 0.3); ell(c, 8 + s * 1.7, 15.2 - bob, 1.6, 0.7); paint(c, '#f4f4f4', 0.3); }   // legs, sneakers
  rr(kit, c, 3.6, 7.2, 8.8, 6, 2.6); paint(c, kit.lin(c, 0, 7, 0, 13, [n.hood, n.hoodD]), 0.4);                         // hoodie
  c.beginPath(); c.moveTo(6.2, 7.6); c.quadraticCurveTo(8, 9.6, 9.8, 7.6); c.lineWidth = 0.35; c.strokeStyle = INK(0.7); c.stroke();      // hood neckline
  line(c, 7.2, 8.8, 7.2, 10.2, 0.25, '#fff'); line(c, 8.8, 8.8, 8.8, 10.2, 0.25, '#fff');                                // drawstrings
  const hy = 4.6;
  ell(c, 8, hy, 3.6, 3.5); paint(c, kit.radial(c, 7, hy - 1, 0, 4, [[0, '#ffe2c0'], [1, SKIN]]), 0.4);                    // head
  if (n.hairKind === 0) { c.beginPath(); c.moveTo(4.3, hy - 0.4); c.quadraticCurveTo(4.6, hy - 4.2, 8, hy - 3.9); c.quadraticCurveTo(11.4, hy - 4.2, 11.7, hy - 0.4); c.quadraticCurveTo(9.4, hy - 2.2, 8, hy - 2.1); c.quadraticCurveTo(6, hy - 2.2, 4.3, hy - 0.4); paint(c, n.hair, 0.3); }
  else if (n.hairKind === 1) { c.beginPath(); c.moveTo(4.2, hy + 0.4); c.quadraticCurveTo(3.6, hy - 4.4, 8, hy - 4.2); c.quadraticCurveTo(12.4, hy - 4.4, 11.8, hy + 0.4); c.quadraticCurveTo(10.6, hy - 1.8, 8, hy - 1.9); c.quadraticCurveTo(5.4, hy - 1.8, 4.2, hy + 0.4); paint(c, n.hair, 0.3); for (const x of [5, 8, 11]) dot(c, x, hy - 4.1, 0.9, n.hair); }
  else { c.beginPath(); c.moveTo(4.4, hy - 0.2); c.quadraticCurveTo(5, hy - 3.9, 8, hy - 3.8); c.quadraticCurveTo(11, hy - 3.9, 11.6, hy - 0.2); c.quadraticCurveTo(9, hy - 1.4, 6.6, hy - 1.2); c.quadraticCurveTo(5.2, hy - 1, 4.4, hy - 0.2); paint(c, n.hair, 0.3); poly(c, [[10, hy - 3.7], [11.4, hy - 5], [11.8, hy - 3.3]]); paint(c, n.hair, 0.25); }   // cowlick
  for (const s of [-1, 1]) { const ex = 8 + s * 1.5; rr(kit, c, ex - 1.2, hy - 0.5, 2.4, 1.9, 0.9); c.fillStyle = 'rgba(214,236,255,0.65)'; c.fill(); c.lineWidth = 0.3; c.strokeStyle = G.ink; c.stroke(); dot(c, ex, hy + 0.4, 0.45, G.ink); dot(c, ex + 0.2, hy + 0.2, 0.17, '#fff'); }   // thick glasses
  line(c, 8 - 0.3, hy + 0.2, 8 + 0.3, hy + 0.2, 0.3, G.ink);
  if (cheer) { ell(c, 8, hy + 2.3, 0.9, 0.7); c.fillStyle = '#7a2a2a'; c.fill(); ell(c, 8, hy + 2.55, 0.5, 0.3); c.fillStyle = '#f08a8a'; c.fill(); }
  else { c.beginPath(); c.moveTo(7.2, hy + 2.1); c.quadraticCurveTo(8, hy + 2.7, 8.8, hy + 2.1); c.lineWidth = 0.3; c.strokeStyle = INK(0.8); c.stroke(); }
  dot(c, 5.4, hy + 1.6, 0.55, 'rgba(255,154,168,0.5)'); dot(c, 10.6, hy + 1.6, 0.55, 'rgba(255,154,168,0.5)');
  if (!cheer) {                                                                                                        // laptop held in front
    rr(kit, c, 4.4, 9.2, 7.2, 4.6, 0.6); paint(c, kit.lin(c, 0, 9, 0, 14, ['#c9d2e4', '#8f9bb8']), 0.35);
    rr(kit, c, 5.2, 9.8, 5.6, 3, 0.3); c.fillStyle = 'rgba(30,40,70,0.0)'; c.fill();
    dot(c, 8, 11.3, 0.7, n.hair === '#e8c26a' ? '#ffd35a' : '#fff6a8'); dot(c, 8, 11.3, 0.3, G.ink);                    // sticker on the lid
    for (const s of [-1, 1]) { ell(c, 8 + s * 4.3, 11.4, 0.9, 1.1); paint(c, SKIN, 0.25); }
  } else {
    const up = armUp;
    for (const s of [-1, 1]) {                                                                                         // arms raised
      c.beginPath(); c.moveTo(8 + s * 3.8, 9); c.quadraticCurveTo(8 + s * 5.6, 7 - up, 8 + s * 5.4, 4.4 - up); c.lineWidth = 2; c.strokeStyle = n.hood; c.lineCap = 'round'; c.stroke();
      ell(c, 8 + s * 5.4, 4 - up, 1, 1); paint(c, SKIN, 0.3);
    }
  }
  c.restore();
}
function drawNerd(kit, c, i) { nerdBody(kit, c, NERDS[i % 4], {}); }
function drawNerdCheer(kit, c, i) { nerdBody(kit, c, NERDS[0], { cheer: true, bob: i ? -0.7 : 0, armUp: i ? 1.2 : 0 }); if (i) { for (const [x, y] of [[2.4, 3], [13.6, 2.4]]) { line(c, x - 0.6, y, x + 0.6, y, 0.25, G.gold); line(c, x, y - 0.6, x, y + 0.6, 0.25, G.gold); } } }

export function build(kit) {
  const o = {};
  o.tile_road = sprite(kit, 16, 16, 1, (c) => drawRoad(kit, c));
  o.tile_road_dash = sprite(kit, 16, 16, 1, (c) => drawRoadDash(kit, c));
  o.tile_curb = sprite(kit, 16, 16, 1, (c) => drawCurb(kit, c));
  o.tile_median = sprite(kit, 16, 16, 2, (c, i) => drawMedian(kit, c, i));
  o.tile_start = sprite(kit, 16, 16, 2, (c, i) => drawStart(kit, c, i));
  o.bay_empty = sprite(kit, 32, 16, 1, (c) => drawBayEmpty(kit, c));
  o.bay_wall = sprite(kit, 16, 16, 1, (c) => drawBayWall(kit, c));
  o.bay_croc = sprite(kit, 32, 16, 3, (c, i) => drawBayCroc(kit, c, i));
  o.bay_snake = sprite(kit, 32, 16, 3, (c, i) => drawBaySnake(kit, c, i));
  o.bay_mouse = sprite(kit, 16, 16, 2, (c, i) => drawMouse(kit, c, i));
  o.bay_fish = sprite(kit, 16, 16, 2, (c, i) => drawGpu(kit, c, i));
  o.bg_canopy = sprite(kit, 224, 16, 1, (c) => drawCanopy(kit, c));
  o.bg_ticker = sprite(kit, 224, 16, 1, (c) => drawTicker(kit, c));
  o.sign_pete = sprite(kit, 32, 16, 1, (c) => drawSignPete(kit, c));
  o.bg_microcenter = sprite(kit, 224, 16, 1, (c) => drawMicroCenter(kit, c));
  o.bg_burger = sprite(kit, 224, 16, 1, (c) => drawBurger(kit, c));
  o.bk_pole = sprite(kit, 16, 16, 2, (c, i) => drawBkPole(kit, c, i));
  o.nerd = sprite(kit, 16, 16, 4, (c, i) => drawNerd(kit, c, i));
  o.nerd_cheer = sprite(kit, 16, 16, 2, (c, i) => drawNerdCheer(kit, c, i));
  return o;
}
export default build;
