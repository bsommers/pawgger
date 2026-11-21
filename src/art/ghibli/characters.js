// Ghibli pack: characters (module 'colby'): Colby the explorer cat, Pete the rat. Painterly vectors, drawn in cell units (1 unit = GHIBLI_SCALE px).
// Deterministic (no Math.random). Also exports small drawing helpers shared with vehicles.js / river.js.
import { GPAL as G, GHIBLI_SCALE as S } from '../../core/defs.js';

const TAU = Math.PI * 2;
export const INK = (a = 0.85) => `rgba(59,47,58,${a})`;
export const PINK = '#f4a6b4';

/** Build a sprite: n frames of w*h cells; draw(ctx, frameIndex) works in cell units. */
export function sprite(kit, w, h, n, draw) {
  const frames = [];
  for (let i = 0; i < n; i++) {
    const s = kit.makeSurface(w * S, h * S), c = s.ctx;
    c.save(); c.scale(S, S); c.lineJoin = 'round'; c.lineCap = 'round';
    draw(c, i);
    c.restore();
    frames.push(s);
  }
  return { frames, w, h };
}
export function ell(c, x, y, rx, ry, rot = 0) { c.beginPath(); c.ellipse(x, y, rx, ry, rot, 0, TAU); }
export function poly(c, pts) { c.beginPath(); c.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) c.lineTo(pts[i][0], pts[i][1]); c.closePath(); }
/** fill the current path, then a soft ink outline */
export function paint(c, fill, lw = 0.38, ink = INK()) {
  c.fillStyle = fill; c.fill();
  if (lw) { c.lineWidth = lw; c.strokeStyle = ink; c.lineJoin = 'round'; c.stroke(); }
}
/** a soft stroke through 3 points (quadratic) with outline: tails, scarf ends */
export function tube(c, p0, p1, p2, w, color, ink = INK()) {
  for (const [lw, col] of [[w + 0.8, ink], [w, color]]) {
    c.beginPath(); c.moveTo(p0[0], p0[1]); c.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]);
    c.lineWidth = lw; c.strokeStyle = col; c.lineCap = 'round'; c.stroke();
  }
}
export function line(c, x0, y0, x1, y1, w, col) { c.beginPath(); c.moveTo(x0, y0); c.lineTo(x1, y1); c.lineWidth = w; c.strokeStyle = col; c.lineCap = 'round'; c.stroke(); }
export function dot(c, x, y, r, col) { c.beginPath(); c.arc(x, y, r, 0, TAU); c.fillStyle = col; c.fill(); }
export const furGrad = (kit, c, x, y, r) => kit.radial(c, x, y, 0, r * 1.5, [[0, G.furL], [0.5, G.fur], [1, G.furD]], x - r * 0.3, y - r * 0.5);
/** pose transform about the bottom-centre: crouched (sx wide, sy short) or stretched */
function pose(c, sx, sy, cx = 8, by = 15) { c.translate(cx, by); c.scale(sx, sy); c.translate(-cx, -by); }

// ------------------------------------------------------------------ pieces of Colby
function shadow(kit, c, cx = 8, cy = 14.8, rx = 5.5, a = 0.3) { kit.softShadow(c, cx, cy, rx, rx * 0.28, a); }
function stripes(c, list, col = 'rgba(196,99,31,0.75)', w = 0.55) { for (const [x0, y0, x1, y1] of list) line(c, x0, y0, x1, y1, w, col); }

/** pith helmet on a head centred at origin: dome + brim + band */
function helmetFront(kit, c, y0 = -2.3, rx = 4.4) {
  ell(c, 0, y0 + 0.3, rx + 1.1, 1.15); paint(c, kit.lin(c, 0, y0, 0, y0 + 1.5, [G.hat, G.hatD]), 0.34);
  c.beginPath(); c.moveTo(-rx, y0); c.ellipse(0, y0, rx, 3.5, 0, Math.PI, TAU); c.closePath();
  paint(c, kit.radial(c, -1.2, y0 - 2.4, 0, 6, [[0, '#f2e4b0'], [0.55, G.hat], [1, G.hatD]]), 0.38);
  c.beginPath(); c.moveTo(-rx + 0.05, y0 - 0.5); c.quadraticCurveTo(0, y0 + 0.6, rx - 0.05, y0 - 0.5); c.lineTo(rx - 0.1, y0 + 0.05); c.quadraticCurveTo(0, y0 + 1.1, -rx + 0.1, y0 + 0.05); c.closePath();
  c.fillStyle = G.scarf; c.fill();                                    // red hat band
  ell(c, -1.6, y0 - 2.2, 0.9, 0.5, -0.5); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
  dot(c, 0, y0 - 3.45, 0.5, G.hatD);
}
/** Colby's front face (head centred at origin, unit 1 = 5.3 wide) */
function headFront(kit, c, o = {}) {
  const eyes = o.eyes || 'open';
  for (const sgn of [-1, 1]) {                                        // ears
    poly(c, [[sgn * 5, -1.2], [sgn * 4.7, -5.8], [sgn * 1.4, -3.6]]); paint(c, G.fur);
    poly(c, [[sgn * 4.4, -2.2], [sgn * 4.3, -4.6], [sgn * 2.6, -3.4]]); c.fillStyle = PINK; c.fill();
  }
  ell(c, 0, 0, 5.4, 4.5); paint(c, kit.radial(c, -1.5, -2, 0, 7, [[0, G.furL], [0.5, G.fur], [1, G.furD]]));
  stripes(c, [[-5.1, 0.2, -4, 0.7], [-5, 1.6, -3.8, 1.8], [5.1, 0.2, 4, 0.7], [5, 1.6, 3.8, 1.8]]);
  ell(c, 0, 2.6, 2.6, 1.7); c.fillStyle = G.cream; c.fill();         // muzzle
  for (const sgn of [-1, 1]) {
    dot(c, sgn * 3.7, 2.4, 1, 'rgba(255,154,168,0.6)');               // cheeks
    if (eyes === 'closed') {                                          // happy ^ ^
      c.beginPath(); c.moveTo(sgn * 3.3, 1.2); c.quadraticCurveTo(sgn * 2.2, -0.9, sgn * 1, 1.2); c.lineWidth = 0.55; c.strokeStyle = INK(); c.stroke();
    } else if (eyes === 'wince') {                                    // > <
      line(c, sgn * 3.2, -0.2, sgn * 1.4, 0.7, 0.5, INK()); line(c, sgn * 3.2, 1.6, sgn * 1.4, 0.7, 0.5, INK());
    } else {
      ell(c, sgn * 2.15, 0.8, 1.25, 1.55); paint(c, kit.lin(c, 0, -0.8, 0, 2.3, [[0, '#b6ef8a'], [0.5, G.eye], [1, '#3a8c58']]), 0.3);
      ell(c, sgn * 2.15, 0.95, 0.6, 1.05); c.fillStyle = '#2a1f2e'; c.fill();
      dot(c, sgn * 2.15 - 0.4, 0.2, 0.42, '#fff'); dot(c, sgn * 2.15 + 0.35, 1.5, 0.2, 'rgba(255,255,255,0.8)');
    }
    for (const dy of [-0.5, 0.5]) line(c, sgn * 4.2, 3 + dy, sgn * 6.4, 2.6 + dy * 2.2, 0.18, 'rgba(255,246,220,0.75)');   // whiskers
  }
  poly(c, [[-0.7, 2], [0.7, 2], [0, 2.8]]); c.fillStyle = '#e2748a'; c.fill();
  c.beginPath(); c.moveTo(0, 2.8); c.lineTo(0, 3.3); c.moveTo(-1.2, 3.8); c.quadraticCurveTo(-0.3, 4.1, 0, 3.3); c.quadraticCurveTo(0.3, 4.1, 1.2, 3.8);
  c.lineWidth = 0.28; c.strokeStyle = INK(0.8); c.stroke();
  if (o.mouth === 'open') { ell(c, 0, 4.1, 0.85, 0.7); c.fillStyle = '#9b3a4a'; c.fill(); }
  if (o.helmet !== false) helmetFront(kit, c);
}
function scarfKnot(kit, c, cx, cy, rx, ry, wv) {
  ell(c, cx, cy, rx, ry); paint(c, kit.lin(c, 0, cy - ry, 0, cy + ry, ['#f26a58', G.scarf]), 0.34);
  line(c, cx - rx * 0.6, cy - ry * 0.3, cx + rx * 0.3, cy - ry * 0.3, 0.3, 'rgba(255,255,255,0.4)');
  void wv;
}

// ------------------------------------------------------------------ Colby facing the camera / away / right
function drawDown(kit, c, i) {
  const st = i === 1;
  c.save(); pose(c, st ? 0.97 : 1.03, st ? 1.03 : 0.95);
  shadow(kit, c);
  tube(c, [11.5, 13.2], [15, 12.6 - (st ? 1 : 0)], [14, 8.2], 1.9, G.fur);   // tail
  line(c, 14.3, 9.4, 14.2, 8.4, 1.3, G.furD);
  for (const x of [5.3, 10.7]) { ell(c, x, 14.1, 1.6, 1.05); paint(c, G.fur); }       // back paws
  ell(c, 8, 11.3, 4.7, 3.9); paint(c, furGrad(kit, c, 8, 11.3, 4.7));
  ell(c, 8, 12.3, 2.5, 2.2); c.fillStyle = G.cream; c.fill();
  stripes(c, [[3.8, 10.5, 4.9, 11.2], [3.6, 12.2, 4.8, 12.6], [12.2, 10.5, 11.1, 11.2], [12.4, 12.2, 11.2, 12.6]]);
  for (const x of [6, 10]) { ell(c, x, 14.2 + (st ? 0.2 : 0), 1.35, 1); paint(c, G.cream); }  // front paws
  // scarf: band + a flowing tail
  tube(c, [11, 10], [13.4, 11.2 + (st ? 0.8 : 0)], [12.9, 13.4], 1.7, G.scarf);
  ell(c, 8, 9.7, 4.3, 1.45); paint(c, kit.lin(c, 0, 8.3, 0, 11, ['#f26a58', G.scarf]));
  c.save(); c.translate(8, 6.1); c.scale(0.94, 0.94); headFront(kit, c, { mouth: st ? 'open' : null }); c.restore();
  c.restore();
}
function drawUp(kit, c, i) {
  const st = i === 1;
  c.save(); pose(c, st ? 0.97 : 1.03, st ? 1.03 : 0.95);
  shadow(kit, c);
  tube(c, [9.5, 13.2], [14.8, 14], [13.4, 8.6], 1.9, G.fur);
  line(c, 13.5, 9.6, 13.4, 8.7, 1.3, G.furD);
  for (const x of [5.3, 10.7]) { ell(c, x, 14.3, 1.6, 1.05); paint(c, G.fur); }
  ell(c, 8, 11, 4.7, 4); paint(c, furGrad(kit, c, 8, 11, 4.7));
  stripes(c, [[5.2, 9.8, 6.4, 10.4], [9.6, 10.4, 10.8, 9.8], [4.8, 12, 6.6, 12.6], [9.4, 12.6, 11.2, 12], [6.4, 14, 9.6, 14]]);
  tube(c, [5.3, 10.2], [2.6, 11.6 + (st ? 0.8 : 0)], [2.8, 13.6], 1.7, G.scarf);
  ell(c, 8, 9.3, 4.4, 1.4); paint(c, kit.lin(c, 0, 8, 0, 10.6, ['#f26a58', G.scarf]));
  c.save(); c.translate(8, 5.9); c.scale(0.94, 0.94);
  for (const sgn of [-1, 1]) { poly(c, [[sgn * 5.2, -0.5], [sgn * 4.9, -5.6], [sgn * 1.6, -3.4]]); paint(c, G.fur); poly(c, [[sgn * 4.5, -1.6], [sgn * 4.4, -4.5], [sgn * 2.8, -3.2]]); c.fillStyle = 'rgba(244,166,180,0.7)'; c.fill(); }
  ell(c, 0, 0.6, 5.2, 4.1); paint(c, kit.radial(c, -1.5, -1, 0, 7, [[0, G.fur], [1, G.furD]]));
  ell(c, 0, -0.6, 5.7, 1.2); paint(c, kit.lin(c, 0, -1.8, 0, 0.6, [G.hat, G.hatD]), 0.34);
  c.beginPath(); c.moveTo(-4.6, -1.4); c.ellipse(0, -1.4, 4.6, 4.2, 0, Math.PI, TAU); c.closePath();
  paint(c, kit.radial(c, -1.2, -3.8, 0, 7, [[0, '#f2e4b0'], [0.55, G.hat], [1, G.hatD]]), 0.38);
  line(c, -4.4, -1.2, 4.4, -1.2, 0.55, G.scarf);
  ell(c, -1.6, -3.9, 1, 0.55, -0.5); c.fillStyle = 'rgba(255,255,255,0.5)'; c.fill();
  c.restore();
  c.restore();
}
function drawRight(kit, c, i) {
  const st = i === 1;
  c.save(); c.translate(-0.3, 0); pose(c, st ? 0.97 : 1.02, st ? 1.03 : 0.95, 8);
  shadow(kit, c, 8, 14.9, 6.2);
  tube(c, [3.4, 11.4], [0.8 + (st ? 0.6 : 0), 10.4], [1.6, 6.6 + (st ? 1.6 : 0)], 1.9, G.fur);
  const bp = st ? 2.6 : 4.2, fp = st ? 12 : 10.6;
  for (const [x, f] of [[bp + 1.2, 0], [fp - 1.4, 0], [bp, 1], [fp, 1]]) { ell(c, x, 14.2, 1.5, 1); paint(c, f ? G.fur : G.furD); }
  ell(c, 7.2, 10.8, 5.3, 3.5); paint(c, furGrad(kit, c, 7.2, 10.8, 5.3));
  ell(c, 8, 12.6, 3.4, 1.4); c.fillStyle = G.cream; c.fill();
  stripes(c, [[4.8, 8.2, 5.4, 9.8], [6.8, 7.6, 7.4, 9.4], [8.8, 8.2, 9.2, 9.8]]);
  // scarf streaming behind
  tube(c, [9.3, 9.6], [6.2, 8.2 + (st ? -0.8 : 0.6)], [3.4, 9.6 + (st ? 0.8 : -0.4)], 1.7, G.scarf);
  line(c, 5.6, 8.9, 4, 9.2, 0.25, 'rgba(255,255,255,0.45)');
  ell(c, 9.7, 9.4, 1.5, 2.2, 0.3); paint(c, kit.lin(c, 8.6, 0, 11, 0, ['#f26a58', G.scarf]), 0.34);
  // head
  poly(c, [[8.4, 5.2], [8.6, 1.4], [11.6, 3.6]]); paint(c, G.fur);
  ell(c, 11, 7.2, 4.1, 3.7); paint(c, kit.radial(c, 9.6, 5.4, 0, 6.5, [[0, G.furL], [0.5, G.fur], [1, G.furD]]));
  ell(c, 13.9, 8.6, 1.9, 1.35); c.fillStyle = G.cream; c.fill();
  poly(c, [[15, 7.7], [15.9, 7.9], [15.3, 8.6]]); c.fillStyle = '#e2748a'; c.fill();
  c.beginPath(); c.moveTo(15.3, 8.6); c.quadraticCurveTo(14.9, 9.7, 13.8, 9.5); c.lineWidth = 0.26; c.strokeStyle = INK(); c.stroke();
  dot(c, 11.9, 9, 0.9, 'rgba(255,154,168,0.55)');
  ell(c, 13.1, 7, 1.05, 1.35); paint(c, kit.lin(c, 0, 5.6, 0, 8.4, [[0, '#b6ef8a'], [0.5, G.eye], [1, '#3a8c58']]), 0.28);
  ell(c, 13.35, 7.15, 0.55, 0.95); c.fillStyle = '#2a1f2e'; c.fill(); dot(c, 12.95, 6.5, 0.38, '#fff');
  line(c, 14.4, 8.4, 15.6, 8.1, 0.17, 'rgba(255,246,220,0.8)'); line(c, 14.4, 9, 15.6, 9.3, 0.17, 'rgba(255,246,220,0.8)');
  // helmet (side)
  ell(c, 10.8, 4.6, 5.1, 1.1, -0.06); paint(c, kit.lin(c, 0, 3.8, 0, 5.6, [G.hat, G.hatD]), 0.34);
  c.beginPath(); c.moveTo(7, 4.4); c.ellipse(10.4, 4.4, 3.7, 3.3, 0, Math.PI, TAU); c.closePath();
  paint(c, kit.radial(c, 9.2, 2.4, 0, 6, [[0, '#f2e4b0'], [0.55, G.hat], [1, G.hatD]]), 0.38);
  line(c, 7.1, 4.3, 13.9, 4.3, 0.55, G.scarf);
  ell(c, 9.2, 2.1, 0.9, 0.5, -0.4); c.fillStyle = 'rgba(255,255,255,0.55)'; c.fill();
  c.restore();
}

// ------------------------------------------------------------------ squash / drown / home / life
function drawSquash(kit, c, i) {
  const flat = i > 0, y = 12.3;
  kit.softShadow(c, 8, 14.6, 7, 1.6, 0.3);
  if (!flat) {                                                        // impact: bulging
    ell(c, 8, 11.5, 6.6, 3.2); paint(c, furGrad(kit, c, 8, 11, 6.5));
    c.save(); c.translate(8, 9); c.scale(0.85, 0.7); headFront(kit, c, { eyes: 'wince' }); c.restore();
    return;
  }
  tube(c, [13, y], [15.6, y + 0.4], [15.2, y - 2], 1.3, G.fur);
  tube(c, [4, y - 0.4], [0.8, y - 1.6], [0.6, y - 0.2], 1.7, G.scarf);   // scarf splayed
  ell(c, 8, y, 7, 2.2); paint(c, furGrad(kit, c, 8, y, 6));
  stripes(c, [[4, y - 1.6, 4.6, y - 0.5], [7, y - 1.9, 7.4, y - 0.7], [10, y - 1.6, 10.2, y - 0.5]]);
  for (const x of [2.4, 13.6]) { ell(c, x, y + 1.6, 1.3, 0.8); paint(c, G.cream); }
  ell(c, 8, y - 1.2, 3.2, 1.8); paint(c, kit.lin(c, 0, y - 3, 0, y + 0.6, [G.hat, G.hatD]), 0.34);   // flat helmet
  line(c, 5, y - 0.8, 11, y - 0.8, 0.5, G.scarf);
  for (const sgn of [-1, 1]) { line(c, 8 + sgn * 1.4, y + 0.2, 8 + sgn * 2.2, y + 1, 0.4, INK()); line(c, 8 + sgn * 2.2, y + 0.2, 8 + sgn * 1.4, y + 1, 0.4, INK()); }
  if (i === 2) for (const [x, yy, k] of [[2.5, 5, 0], [8, 3, 1], [13.4, 5.5, 2]]) {   // stars circling
    c.save(); c.translate(x, yy); c.rotate(k); poly(c, [[0, -1.5], [0.45, -0.45], [1.5, 0], [0.45, 0.45], [0, 1.5], [-0.45, 0.45], [-1.5, 0], [-0.45, -0.45]]);
    c.fillStyle = G.gold; c.fill(); c.restore();
  }
}
function drawDrown(kit, c, i) {
  const wave = (y, a) => { c.beginPath(); c.moveTo(0, 16); c.lineTo(0, y); for (let x = 0; x <= 16; x += 2) c.lineTo(x, y + Math.sin(x * 0.9 + i) * a); c.lineTo(16, 16); c.closePath(); };
  if (i === 0) {                                                      // flailing + splash crown
    c.save(); c.translate(8, 6.6); c.scale(0.9, 0.9); headFront(kit, c, { eyes: 'wince', mouth: 'open' }); c.restore();
    for (const sgn of [-1, 1]) { ell(c, 8 + sgn * 6, 7.8, 1.1, 1.5, sgn * 0.4); paint(c, G.fur); }
    wave(11.4, 0.5); c.fillStyle = 'rgba(74,166,207,0.88)'; c.fill();
    for (const [x, y, r] of [[3, 9.4, 0.8], [5, 8.4, 0.6], [11, 8.6, 0.6], [13, 9.5, 0.8], [1.5, 7, 0.5], [14.5, 7.4, 0.5]]) dot(c, x, y, r, G.foam);
  } else if (i === 1) {                                               // head and helmet only
    c.save(); c.translate(8, 8); c.scale(0.9, 0.9); headFront(kit, c, { eyes: 'wince' }); c.restore();
    wave(10.6, 0.4); c.fillStyle = 'rgba(74,166,207,0.92)'; c.fill();
    wave(13, 0.5); c.fillStyle = 'rgba(45,111,166,0.6)'; c.fill();
    dot(c, 14, 7, 0.7, G.foam); dot(c, 2.4, 8, 0.5, G.foam);
  } else if (i === 2) {                                               // helmet bobbing
    c.save(); c.translate(8, 10.6); c.scale(0.9, 0.9); helmetFront(kit, c); c.restore();
    wave(11.6, 0.4); c.fillStyle = 'rgba(74,166,207,0.93)'; c.fill();
    wave(13.6, 0.5); c.fillStyle = 'rgba(45,111,166,0.55)'; c.fill();
    for (const [x, y, r] of [[12.5, 7.5, 0.8], [3, 6, 0.6], [13.6, 5, 0.5]]) { dot(c, x, y, r, 'rgba(241,251,255,0.8)'); }
  } else {                                                            // ripples and bubbles
    for (const [rx, a] of [[6.5, 0.5], [4, 0.7], [2, 0.9]]) { ell(c, 8, 11, rx, rx * 0.4); c.lineWidth = 0.4; c.strokeStyle = `rgba(241,251,255,${a})`; c.stroke(); }
    for (const [x, y, r] of [[8, 8.5, 0.9], [9.4, 6.4, 0.7], [7, 4.4, 0.55], [8.8, 2.8, 0.4]]) { dot(c, x, y, r, 'rgba(241,251,255,0.35)'); c.beginPath(); c.arc(x, y, r, 0, TAU); c.lineWidth = 0.22; c.strokeStyle = 'rgba(241,251,255,0.9)'; c.stroke(); }
  }
}
function drawHome(kit, c, i) {
  const hop = i ? 1.1 : 0;
  c.save(); c.translate(0, -hop);
  kit.softShadow(c, 8, 15 + hop, 5, 1.3, 0.3);
  tube(c, [11, 14], [15.6, 13.6], [14.4, 9.4 + (i ? -1 : 0)], 1.8, G.fur);
  ell(c, 8, 12.4, 4.2, 3.2); paint(c, furGrad(kit, c, 8, 12.4, 4.2));
  ell(c, 8, 13, 2.3, 2); c.fillStyle = G.cream; c.fill();
  for (const x of [5.6, 10.4]) { ell(c, x, 15, 1.4, 0.9); paint(c, G.cream); }
  for (const sgn of [-1, 1]) { tube(c, [8 + sgn * 3.6, 11.4], [8 + sgn * 6, 9], [8 + sgn * 5.6, 5.6 - (i ? 0.8 : 0)], 1.5, G.fur); dot(c, 8 + sgn * 5.6, 5.4 - (i ? 0.8 : 0), 1, G.cream); }
  ell(c, 8, 10.4, 3.9, 1.2); paint(c, G.scarf, 0.34);
  c.save(); c.translate(8, 6.4); c.scale(0.9, 0.9); headFront(kit, c, { eyes: 'closed', mouth: 'open' }); c.restore();
  c.restore();
}
function drawLife(kit, c) {
  c.save(); c.scale(10 / 16, 10 / 16);                                // head icon in a 10x10 cell
  c.save(); c.translate(8, 9.4); c.scale(1.28, 1.28); headFront(kit, c); c.restore();
  c.restore();
}

// ------------------------------------------------------------------ Pete the rat
const PETE_SUIT = (kit, c, y0, y1) => kit.lin(c, 0, y0, 0, y1, [G.peteSuitL, G.peteSuit]);
function peteHeadSide(kit, c, hx, hy) {
  ell(c, hx - 2, hy - 3.2, 2.2, 2.2); paint(c, G.peteFur); ell(c, hx - 2, hy - 3.1, 1.2, 1.2); c.fillStyle = PINK; c.fill();   // ear
  ell(c, hx, hy, 4.3, 3.6); paint(c, kit.radial(c, hx - 1, hy - 1.5, 0, 6, [[0, '#b9b5c9'], [1, G.peteFur]]));
  ell(c, hx + 3.9, hy + 1, 2.7, 1.7); paint(c, '#b9b5c9', 0.3);        // snout
  dot(c, hx + 6.2, hy + 0.5, 0.85, '#d96c86');
  ell(c, hx + 1.7, hy - 0.4, 1.1, 0.95); c.fillStyle = '#fff'; c.fill();
  ell(c, hx + 2, hy - 0.1, 0.5, 0.5); c.fillStyle = '#2a1f2e'; c.fill();
  c.beginPath(); c.moveTo(hx + 0.4, hy - 1.7); c.lineTo(hx + 3, hy - 0.7); c.lineWidth = 0.55; c.strokeStyle = G.peteFur; c.stroke();     // heavy smug lid
  c.beginPath(); c.moveTo(hx + 0.5, hy - 1.7); c.lineTo(hx + 3, hy - 0.7); c.lineWidth = 0.25; c.strokeStyle = INK(); c.stroke();
  c.beginPath(); c.moveTo(hx + 3, hy + 2.4); c.quadraticCurveTo(hx + 4.6, hy + 3.1, hx + 5.4, hy + 2.1); c.lineWidth = 0.25; c.strokeStyle = INK(); c.stroke();   // smirk
  line(c, hx + 5, hy + 1.4, hx + 6.9, hy + 0.7, 0.14, 'rgba(255,246,220,0.8)'); line(c, hx + 5, hy + 1.9, hx + 6.9, hy + 2.3, 0.14, 'rgba(255,246,220,0.8)');
}
function drawPeteWalk(kit, c, i) {
  const bob = i ? -0.5 : 0, wd = i ? 1.4 : -1.4;
  kit.softShadow(c, 11.5, 15, 8.4, 1.3, 0.3);
  tube(c, [5.6, 12.2 + bob], [0.8, 13.6], [1.2, 8.8 + (i ? 1 : 0)], 0.9, PINK);
  for (const [x, back] of [[9 + wd, 1], [14 - wd, 0]]) { ell(c, x, 14.6, 2.1, 1.05); paint(c, back ? '#2a2540' : '#3a3550'); }
  ell(c, 12, 9.8 + bob, 6.6, 5.2); paint(c, PETE_SUIT(kit, c, 4, 15));
  c.beginPath(); c.moveTo(15.4, 6.6 + bob); c.lineTo(17.2, 9 + bob); c.lineTo(15, 12 + bob); c.closePath(); c.fillStyle = G.cream; c.fill();   // shirt
  poly(c, [[16.2, 8.2 + bob], [17.4, 9.6 + bob], [15.4, 11.4 + bob]]); c.fillStyle = G.scarf; c.fill();                                       // red tie
  c.beginPath(); c.arc(13.5, 10.6 + bob, 2.2, 0.2, 2.8); c.lineWidth = 0.28; c.strokeStyle = G.gold; c.stroke();                                // watch chain
  ell(c, 12.4 + (i ? 1 : -1), 10.2 + bob, 1.7, 1.2); paint(c, G.peteSuit, 0.3); ell(c, 14 + (i ? 1.4 : -0.6), 11.2 + bob, 0.8, 0.8); c.fillStyle = G.peteFur; c.fill();  // swinging arm + hand
  peteHeadSide(kit, c, 17, 6.9 + bob);
}
function drawPeteTaunt(kit, c, i) {
  kit.softShadow(c, 16, 30.2, 11, 1.6, 0.3);
  tube(c, [24.5, 27], [31.4, 26], [29.8, 19.5], 1.2, PINK);
  for (const sgn of [-1, 1]) { ell(c, 16 + sgn * 4.6, 29.4, 3.1, 1.5); paint(c, '#2a2540'); }
  ell(c, 16, 22, 9.6, 8.4); paint(c, PETE_SUIT(kit, c, 13, 30));
  poly(c, [[12.5, 14], [19.5, 14], [16, 24]]); c.fillStyle = G.cream; c.fill();
  poly(c, [[12.5, 14], [16, 24], [11, 21]]); c.fillStyle = G.peteSuitL; c.fill();
  poly(c, [[19.5, 14], [16, 24], [21, 21]]); c.fillStyle = G.peteSuitL; c.fill();
  poly(c, [[15, 15], [17, 15], [17.6, 19], [16, 23.4], [14.4, 19]]); c.fillStyle = G.scarf; c.fill();                 // red tie
  for (const y of [24.6, 27.2]) dot(c, 16, y, 0.6, G.gold);
  // left arm on hip; right arm raised, finger wagging
  ell(c, 7.3, 22, 2.4, 4.4, 0.4); paint(c, G.peteSuit, 0.34); dot(c, 8.6, 25.8, 1.3, G.peteFur);
  const wag = i ? 0.35 : -0.35;
  c.save(); c.translate(24, 19); c.rotate(wag);
  ell(c, 0, -2.6, 2, 4.4); paint(c, G.peteSuit, 0.34); dot(c, 0, -7, 1.8, G.peteFur);
  line(c, 0, -7.4, 0, -10.6, 1.1, G.peteFur); c.restore();
  // head
  for (const sgn of [-1, 1]) { ell(c, 16 + sgn * 7.3, 4.6, 3.3, 3.3); paint(c, G.peteFur); ell(c, 16 + sgn * 7.3, 4.6, 2, 2); c.fillStyle = PINK; c.fill(); }
  ell(c, 16, 10, 7.5, 6.5); paint(c, kit.radial(c, 13.5, 6.5, 0, 11, [[0, '#b9b5c9'], [1, G.peteFur]]));
  ell(c, 16, 13.2, 4, 2.9); paint(c, '#c8c4d6', 0.3);
  ell(c, 16, 11.4, 1.2, 0.9); c.fillStyle = '#d96c86'; c.fill();
  for (const sgn of [-1, 1]) {
    ell(c, 16 + sgn * 3.6, 8.9, 1.9, 1.5); c.fillStyle = '#fff'; c.fill();
    ell(c, 16 + sgn * 3.2, 9.2, 0.8, 0.8); c.fillStyle = '#2a1f2e'; c.fill();
    c.beginPath(); c.moveTo(16 + sgn * 5.8, 7.1); c.lineTo(16 + sgn * 1.7, 8.3); c.lineWidth = 1; c.strokeStyle = G.peteFur; c.stroke();   // heavy lid
    c.beginPath(); c.moveTo(16 + sgn * 5.9, 6.9); c.lineTo(16 + sgn * 1.6, 8.2); c.lineWidth = 0.38; c.strokeStyle = INK(); c.stroke();
    line(c, 16 + sgn * 3, 14, 16 + sgn * 8.4, 12.6 + sgn * 0.4, 0.2, 'rgba(255,246,220,0.85)'); line(c, 16 + sgn * 3, 14.8, 16 + sgn * 8.4, 15.6, 0.2, 'rgba(255,246,220,0.85)');
  }
  if (i) { ell(c, 16, 15.2, 2.4, 1.7); c.fillStyle = '#9b3a4a'; c.fill(); }                           // cackling
  else { c.beginPath(); c.moveTo(12.6, 15); c.quadraticCurveTo(16, 17.6, 19.8, 14.4); c.lineWidth = 0.4; c.strokeStyle = INK(); c.stroke(); }
  poly(c, [[15.1, 14.4], [16.9, 14.4], [16.9, 16.4], [15.1, 16.4]]); c.fillStyle = '#fff6dc'; c.fill(); c.lineWidth = 0.25; c.strokeStyle = INK(); c.stroke();   // buck tooth
  c.beginPath(); c.moveTo(16, 14.4); c.lineTo(16, 16.4); c.lineWidth = 0.2; c.strokeStyle = INK(); c.stroke();
}

export function build(kit) {
  const out = {};
  out.colby_up = sprite(kit, 16, 16, 2, (c, i) => drawUp(kit, c, i));
  out.colby_down = sprite(kit, 16, 16, 2, (c, i) => drawDown(kit, c, i));
  out.colby_right = sprite(kit, 16, 16, 2, (c, i) => drawRight(kit, c, i));
  out.colby_left = sprite(kit, 16, 16, 2, (c, i) => { c.translate(16, 0); c.scale(-1, 1); drawRight(kit, c, i); });
  out.colby_squash = sprite(kit, 16, 16, 3, (c, i) => drawSquash(kit, c, i));
  out.colby_drown = sprite(kit, 16, 16, 4, (c, i) => drawDrown(kit, c, i));
  out.colby_home = sprite(kit, 16, 16, 2, (c, i) => drawHome(kit, c, i));
  out.colby_life = sprite(kit, 10, 10, 1, (c) => drawLife(kit, c));
  out.pete_walk = sprite(kit, 24, 16, 2, (c, i) => drawPeteWalk(kit, c, i));
  out.pete_taunt = sprite(kit, 32, 32, 2, (c, i) => drawPeteTaunt(kit, c, i));
  return out;
}
