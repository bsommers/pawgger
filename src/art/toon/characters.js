// Toon pack: characters (ART module 'colby'). Colby and Pete are the CC0 character-library art (front + side turnaround cut-outs);
// "up" (back view, which the library lacks), squash/drown/home frames, life icon, and Pete's walk/taunt frames are derived in code
// by scaling/tilting, tinting (source-atop), cape/fur overlays and water masks. build(kit) is ASYNC (images must decode).
import { GHIBLI_SCALE as S } from '../../core/defs.js';
import { toonKit, TOON_INK } from './toonkit.js';
import { loadLibrary } from './library.js';

const TAU = Math.PI * 2;
function sprite(kit, w, h, n, draw) {
  const frames = [];
  for (let i = 0; i < n; i++) {
    const s = kit.makeSurface(w * S, h * S), c = s.ctx;
    c.save(); c.scale(S, S); c.lineJoin = 'round'; c.lineCap = 'round'; draw(c, i); c.restore();
    frames.push(s);
  }
  return { frames, w, h };
}
/** draw library image bottom-centred at (cx,by), height h cell units; optional squash/tilt/flip/crop. */
function put(c, L, { cx = 8, by = 15.4, h = 15, sx = 1, sy = 1, rot = 0, flip = false, crop = null } = {}) {
  const k = h / (crop ? L.h * (crop[3] - crop[1]) : L.h), w = (crop ? L.w * (crop[2] - crop[0]) : L.w) * k;
  c.save(); c.translate(cx, by); c.rotate(rot); c.scale(sx * (flip ? -1 : 1), sy);
  if (crop) c.drawImage(L.img, crop[0] * L.w, crop[1] * L.h, (crop[2] - crop[0]) * L.w, (crop[3] - crop[1]) * L.h, -w / 2, -h, w, h);
  else c.drawImage(L.img, -w / 2, -h, w, h);
  c.restore();
  return { w, h };
}
function tint(c, color, a, x = -2, y = -2, w = 70, hh = 70) { c.save(); c.globalCompositeOperation = 'source-atop'; c.globalAlpha = a; c.fillStyle = color; c.fillRect(x, y, w, hh); c.restore(); }
function shadow(c, cx, cy, rx, ry, a = 0.3) { c.save(); c.beginPath(); c.ellipse(cx, cy, rx, ry, 0, 0, TAU); c.fillStyle = `rgba(26,26,26,${a})`; c.fill(); c.restore(); }
function star(c, x, y, r, col = '#ffd23a') {
  c.beginPath(); for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.45 : r, a = -Math.PI / 2 + (i / 10) * TAU; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.closePath();
  c.fillStyle = col; c.fill(); c.lineWidth = 0.4; c.strokeStyle = TOON_INK; c.stroke();
}
function fur(c, x, y, rx, ry, col = '#e8963c') { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fillStyle = col; c.fill(); }

/** Colby seen from behind, derived from the front view: fur over the face, cape over shirt and belly. Coordinates are fractions of the placed image box. */
function colbyBack(c, L, o) {
  const { w, h } = put(c, L.colby_front, o);
  const X = (f) => 8 + (f - 0.5) * w * (o.sx || 1), Y = (f) => (o.by ?? 15.4) - h * (o.sy || 1) * (1 - f);
  fur(c, X(0.5), Y(0.2), w * 0.25, h * 0.15);                         // back of head covers the face
  for (const s of [-1, 1]) { c.beginPath(); c.moveTo(X(0.5 + s * 0.17), Y(0.1)); c.lineTo(X(0.5 + s * 0.27), Y(0.01)); c.lineTo(X(0.5 + s * 0.31), Y(0.15)); c.closePath(); c.fillStyle = '#e8963c'; c.fill(); }
  c.lineWidth = 0.25; c.strokeStyle = TOON_INK;
  c.beginPath(); c.ellipse(X(0.5), Y(0.2), w * 0.25, h * 0.15, 0, Math.PI * 0.95, Math.PI * 2.05); c.stroke();
  for (const [x0, y0, x1, y1] of [[0.45, 0.07, 0.45, 0.14], [0.5, 0.06, 0.5, 0.15], [0.55, 0.07, 0.55, 0.14]]) { c.beginPath(); c.moveTo(X(x0), Y(y0)); c.lineTo(X(x1), Y(y1)); c.lineWidth = 0.4; c.strokeStyle = '#c76a1f'; c.stroke(); }
  c.beginPath();                                                      // cape
  c.moveTo(X(0.3), Y(0.32)); c.quadraticCurveTo(X(0.5), Y(0.27), X(0.7), Y(0.32)); c.lineTo(X(0.86), Y(0.6)); c.lineTo(X(0.96), Y(0.88));
  c.quadraticCurveTo(X(0.72), Y(0.8), X(0.5), Y(0.86)); c.quadraticCurveTo(X(0.28), Y(0.8), X(0.04), Y(0.88)); c.lineTo(X(0.14), Y(0.6)); c.closePath();
  c.fillStyle = '#f26a10'; c.fill(); c.lineWidth = 0.28; c.strokeStyle = TOON_INK; c.stroke();
  for (const f of [0.3, 0.5, 0.7]) { c.beginPath(); c.moveTo(X(0.5 + (f - 0.5) * 0.4), Y(0.34)); c.quadraticCurveTo(X(f), Y(0.6), X(0.5 + (f - 0.5) * 1.6), Y(0.84)); c.lineWidth = 0.4; c.strokeStyle = '#d65c0c'; c.stroke(); }
  return { w, h };
}

export async function build(kit0) {
  const kit = toonKit(kit0), L = await loadLibrary(), out = {};
  const crouch = (i) => (i ? { sx: 0.94, sy: 1.06 } : { sx: 1.06, sy: 0.93 });
  out.colby_down = sprite(kit, 16, 16, 2, (c, i) => { shadow(c, 8, 15.3, 5.4, 1.1); put(c, L.colby_front, crouch(i)); });
  out.colby_up = sprite(kit, 16, 16, 2, (c, i) => { shadow(c, 8, 15.3, 5.4, 1.1); colbyBack(c, L, crouch(i)); });
  out.colby_left = sprite(kit, 16, 16, 2, (c, i) => { shadow(c, 8, 15.3, 5.6, 1.1); put(c, L.colby_side, crouch(i)); });
  out.colby_right = sprite(kit, 16, 16, 2, (c, i) => { shadow(c, 8, 15.3, 5.6, 1.1); put(c, L.colby_side, { ...crouch(i), flip: true }); });
  out.colby_squash = sprite(kit, 16, 16, 3, (c, i) => {
    const sy = [0.5, 0.28, 0.17][i], sx = [1.25, 1.55, 1.8][i];
    shadow(c, 8, 15.3, 4 + i * 1.6, 1.1, 0.3);
    put(c, L.colby_front, { sx, sy }); tint(c, '#e0262e', [0.15, 0.3, 0.45][i]);
    if (i > 0) { star(c, 4, 15.4 - 15 * sy - 1.2, 1.3); star(c, 12, 15.4 - 15 * sy - 0.4, 1.0); }
  });
  out.colby_drown = sprite(kit, 16, 16, 4, (c, i) => {
    const wl = [15.4, 11.6, 8.2, 5.4][i];                              // water line (y) cuts the sprite: she sinks
    c.save(); put(c, L.colby_front, { sx: 1 - i * 0.03, rot: [0, 0.06, -0.09, 0.12][i] }); tint(c, '#3f9fe0', [0.12, 0.25, 0.4, 0.5][i]);
    c.globalCompositeOperation = 'destination-out'; c.fillStyle = '#000'; c.fillRect(-2, wl, 20, 20); c.restore();
    c.beginPath(); c.ellipse(8, wl, 6.6 + i * 0.5, 1.5, 0, 0, TAU); c.fillStyle = '#4aa6e0'; c.fill(); c.lineWidth = 0.55; c.strokeStyle = TOON_INK; c.stroke();
    c.beginPath(); c.ellipse(6.2, wl - 0.2, 1.8, 0.35, 0, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.75)'; c.fill();
    for (let k = 0; k <= i; k++) { c.beginPath(); c.arc(11 + (k % 2) * 1.6, wl - 2 - k * 1.7, 0.8 + (k % 3) * 0.25, 0, TAU); c.fillStyle = 'rgba(255,255,255,0.65)'; c.fill(); c.lineWidth = 0.35; c.strokeStyle = TOON_INK; c.stroke(); }
  });
  out.colby_home = sprite(kit, 16, 16, 2, (c, i) => {
    shadow(c, 8, 15.3, 5.2, 1.1); put(c, L.colby_front, { sx: i ? 0.95 : 1.04, sy: i ? 1.04 : 0.95, by: i ? 14.6 : 15.4 });
    star(c, 2.2, 3.5 + i * 1.5, 1.5); star(c, 13.8, 5 - i, 1.2); star(c, 14, 11, 0.9, '#fff3a0');
  });
  out.colby_life = sprite(kit, 10, 10, 1, (c) => { put(c, L.colby_front, { cx: 5, by: 9.8, h: 9.4, crop: [0.18, 0.0, 0.82, 0.37] }); });
  out.pete_walk = sprite(kit, 24, 16, 2, (c, i) => {                  // faces RIGHT (renderer mirrors for left)
    shadow(c, 12, 15.3, 8, 1.1, 0.3); put(c, L.pete_side, { cx: 12, by: 15.4 - (i ? 0.35 : 0), h: 15, rot: i ? 0.035 : -0.035, flip: true });
  });
  out.pete_taunt = sprite(kit, 32, 32, 2, (c, i) => {
    shadow(c, 16, 30.8, 8, 1.6, 0.3);
    put(c, L.pete_front, { cx: 16, by: 31, h: 30, sx: i ? 0.96 : 1.03, sy: i ? 1.04 : 0.97, rot: i ? 0.05 : -0.05 });
  });
  return out;
}
export default build;
