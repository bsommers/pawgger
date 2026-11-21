// painter-kit: painterly (Ghibli-style) vector primitives on Canvas2D. Seeded, deterministic, no Math.random.
// Works with any Canvas2D ctx (browser) or the recording shim from surface.js (Node tests).
import { makeSurface, makeRecordingCtx } from './surface.js';
export { makeSurface, makeRecordingCtx };

const TAU = Math.PI * 2;

// ---- seeded rng (mulberry32), local so the kit has no game imports
export function rng(seed = 1) {
  let s = (seed >>> 0) || 1;
  const next = () => { s = (s + 0x6D2B79F5) >>> 0; let t = s; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  return { next, range: (a, b) => a + (b - a) * next() };
}

// ---- colour helpers: '#rgb' | '#rrggbb' | 'rgba()' in, 'rgb()'/'rgba()' out
export function parseColor(c) {
  if (Array.isArray(c)) return [c[0], c[1], c[2], c[3] ?? 1];
  if (typeof c !== 'string') return [0, 0, 0, 1];
  let m = /^#([0-9a-f]{3,8})$/i.exec(c);
  if (m) {
    let h = m[1]; if (h.length <= 4) h = [...h].map(x => x + x).join('');
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16), h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1];
  }
  m = /^rgba?\(([^)]+)\)$/.exec(c);
  if (m) { const p = m[1].split(',').map(Number); return [p[0], p[1], p[2], p[3] ?? 1]; }
  return [0, 0, 0, 1];
}
export const rgba = (c, a = 1) => { const p = parseColor(c); return `rgba(${p[0] | 0},${p[1] | 0},${p[2] | 0},${+(p[3] * a).toFixed(3)})`; };
export function mix(a, b, t) { const p = parseColor(a), q = parseColor(b); return `rgba(${Math.round(p[0] + (q[0] - p[0]) * t)},${Math.round(p[1] + (q[1] - p[1]) * t)},${Math.round(p[2] + (q[2] - p[2]) * t)},${+(p[3] + (q[3] - p[3]) * t).toFixed(3)})`; }
export const lighten = (c, t) => mix(c, '#ffffff', t);
export const darken = (c, t) => mix(c, '#2a1f2e', t);

// ---- paths (all begin a NEW path and leave it open for fill/stroke/clip)
export function roundRect(ctx, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y); ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r); ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h); ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r); ctx.quadraticCurveTo(x, y, x + r, y); ctx.closePath();
}
// Organic closed blob: smooth curve through n wobbling points around an ellipse.
export function blob(ctx, cx, cy, rx, ry, opts = {}) {
  const { wobble = 0.12, points = 10, seed = 1, rot = 0 } = opts;
  const r = rng(seed), pts = [];
  for (let i = 0; i < points; i++) {
    const a = (i / points) * TAU, k = 1 + (r.next() * 2 - 1) * wobble;
    const x = Math.cos(a) * rx * k, y = Math.sin(a) * ry * k;
    pts.push([cx + x * Math.cos(rot) - y * Math.sin(rot), cy + x * Math.sin(rot) + y * Math.cos(rot)]);
  }
  ctx.beginPath();
  const mid = (p, q) => [(p[0] + q[0]) / 2, (p[1] + q[1]) / 2];
  const s = mid(pts[points - 1], pts[0]);
  ctx.moveTo(s[0], s[1]);
  for (let i = 0; i < points; i++) { const m = mid(pts[i], pts[(i + 1) % points]); ctx.quadraticCurveTo(pts[i][0], pts[i][1], m[0], m[1]); }
  ctx.closePath();
}
// Leaf pointing along angle from base (x,y): length len, width wid.
export function leaf(ctx, x, y, len, wid, angle = -Math.PI / 2) {
  const c = Math.cos(angle), s = Math.sin(angle), P = (u, v) => [x + u * c - v * s, y + u * s + v * c];
  const a = P(len * 0.45, -wid), b = P(len * 0.45, wid), t = P(len, 0);
  ctx.beginPath(); ctx.moveTo(x, y); ctx.quadraticCurveTo(a[0], a[1], t[0], t[1]); ctx.quadraticCurveTo(b[0], b[1], x, y); ctx.closePath();
}
// Fluffy cloud: union of overlapping circles sitting on a flat-ish base (one path).
export function cloud(ctx, cx, cy, w, h, seed = 1) {
  const r = rng(seed), n = 5 + Math.round(w / h);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1), mid = 1 - Math.abs(t - 0.5) * 2;
    const rad = h * (0.32 + 0.3 * mid + r.next() * 0.12), x = cx - w / 2 + rad * 0.6 + t * (w - rad * 1.2), y = cy + h * 0.5 - rad - r.next() * h * 0.05;
    ctx.moveTo(x + rad, y); ctx.arc(x, y, rad, 0, TAU);
  }
  const by = cy + h * 0.5; ctx.moveTo(cx - w * 0.42, by); ctx.rect(cx - w * 0.42, by - h * 0.3, w * 0.84, h * 0.3);
}

// ---- gradients. stops: ['#a','#b',...] (even) or [[t,'#a'],...]
function addStops(g, stops) { stops.forEach((s, i) => Array.isArray(s) ? g.addColorStop(s[0], s[1]) : g.addColorStop(stops.length === 1 ? 0 : i / (stops.length - 1), s)); return g; }
export const lin = (ctx, x0, y0, x1, y1, stops) => addStops(ctx.createLinearGradient(x0, y0, x1, y1), stops);
export const radial = (ctx, x, y, r0, r1, stops, fx = x, fy = y) => addStops(ctx.createRadialGradient(fx, fy, r0, x, y, r1), stops);

// ---- effects
// Soft elliptical drop shadow (radial falloff), good under sprites.
export function softShadow(ctx, cx, cy, rx, ry, alpha = 0.3, color = '#3b2f3a') {
  ctx.save(); ctx.translate(cx, cy); ctx.scale(1, ry / rx);
  ctx.fillStyle = radial(ctx, 0, 0, 0, rx, [[0, rgba(color, alpha)], [0.6, rgba(color, alpha * 0.5)], [1, rgba(color, 0)]]);
  ctx.beginPath(); ctx.arc(0, 0, rx, 0, TAU); ctx.fill(); ctx.restore();
}
// Seeded paper/watercolour grain: many tiny faint specks. Cheap enough for backdrops (count scales with area).
export function paperGrain(ctx, w, h, seed = 1, opts = {}) {
  const { density = 0.0012, alpha = 0.05, size = 1.6, light = '#fff6dc', dark = '#3b2f3a', maxSpecks = 6000 } = opts;
  const n = Math.min(maxSpecks, Math.round(w * h * density)), r = rng(seed);
  ctx.save();
  for (let i = 0; i < n; i++) {
    const x = r.next() * w, y = r.next() * h, s = size * (0.4 + r.next());
    ctx.fillStyle = rgba(r.next() < 0.5 ? light : dark, alpha * (0.5 + r.next()));
    ctx.fillRect(x, y, s, s);
  }
  ctx.restore();
}
// Watercolour-ish fill of the path built by pathFn(ctx): body colour, darker pooled edge, light bloom top-left.
// pathFn must define a closed path; bounds {x,y,w,h} used for the bloom gradient (optional).
export function washFill(ctx, pathFn, color, opts = {}) {
  const { edge = 0.22, edgeWidth = 2, bloom = 0.25, bounds = null, seed = 1 } = opts;
  ctx.save();
  pathFn(ctx); ctx.fillStyle = color; ctx.fill();
  if (bounds && bloom > 0) {
    const { x, y, w, h } = bounds;
    ctx.save(); pathFn(ctx); ctx.clip();
    ctx.fillStyle = radial(ctx, x + w * 0.35, y + h * 0.3, 0, Math.max(w, h) * 0.7, [[0, rgba('#ffffff', bloom)], [1, rgba('#ffffff', 0)]]);
    ctx.fillRect(x, y, w, h);
    ctx.restore();
  }
  if (edge > 0) { pathFn(ctx); ctx.lineWidth = edgeWidth; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(darken(color, 0.45), edge); ctx.stroke(); }
  ctx.restore();
}
// Variable-width brush stroke through pts [[x,y],...]: round-capped segments tapering from w0 to w1.
export function brush(ctx, pts, opts = {}) {
  const { color = '#3b2f3a', w0 = 4, w1 = 1, alpha = 1, jitter = 0, seed = 1 } = opts;
  if (!pts || pts.length < 2) return;
  const r = rng(seed); ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.strokeStyle = rgba(color, alpha);
  for (let i = 0; i < pts.length - 1; i++) {
    const t = i / (pts.length - 1), j = jitter ? (r.next() - 0.5) * jitter : 0;
    ctx.lineWidth = Math.max(0.3, w0 + (w1 - w0) * t);
    ctx.beginPath(); ctx.moveTo(pts[i][0] + j, pts[i][1] + j); ctx.lineTo(pts[i + 1][0], pts[i + 1][1]); ctx.stroke();
  }
  ctx.restore();
}
// Gentle sway in [-amp, amp] as a pure function of time t (seconds) and phase.
export const sway = (t, phase = 0, amp = 1, speed = 1) => amp * (Math.sin(t * speed * 1.7 + phase) * 0.7 + Math.sin(t * speed * 0.9 + phase * 1.7 + 1.3) * 0.3);

// ---- sample sprites (used by the example page and tests; also a style reference)
export function drawGrassTuft(ctx, x, y, s = 1, t = 0, seed = 3) {
  const r = rng(seed), cols = ['#2d6a45', '#4f9a52', '#8cc66a', '#a6d76f'];
  for (let i = 0; i < 9; i++) {
    const a = -Math.PI / 2 + (i - 4) * 0.2 + sway(t, i) * 0.08, len = (16 + r.next() * 14) * s;
    leaf(ctx, x + (i - 4) * 3 * s, y, len, 3 * s, a); ctx.fillStyle = cols[i % cols.length]; ctx.fill();
  }
}
export function drawCatBlob(ctx, cx, cy, s = 1) {
  softShadow(ctx, cx, cy + 22 * s, 26 * s, 7 * s, 0.3);
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.moveTo(cx + sx * 9 * s, cy - 16 * s); ctx.lineTo(cx + sx * 20 * s, cy - 34 * s); ctx.lineTo(cx + sx * 25 * s, cy - 10 * s); ctx.closePath(); ctx.fillStyle = '#f4923a'; ctx.fill(); }
  washFill(ctx, c => blob(c, cx, cy, 28 * s, 24 * s, { seed: 7, wobble: 0.04 }), '#f4923a', { bounds: { x: cx - 28 * s, y: cy - 24 * s, w: 56 * s, h: 48 * s }, bloom: 0.35 });
  ctx.fillStyle = rgba('#c4631f', 0.5); for (const dx of [-12, 0, 12]) { ctx.beginPath(); ctx.ellipse(cx + dx * s, cy - 18 * s, 3 * s, 6 * s, 0, 0, TAU); ctx.fill(); }
  for (const sx of [-1, 1]) { ctx.beginPath(); ctx.ellipse(cx + sx * 10 * s, cy - 2 * s, 5 * s, 6 * s, 0, 0, TAU); ctx.fillStyle = '#6fcf6a'; ctx.fill(); ctx.beginPath(); ctx.ellipse(cx + sx * 10 * s, cy - 2 * s, 1.8 * s, 4 * s, 0, 0, TAU); ctx.fillStyle = '#3b2f3a'; ctx.fill();
    ctx.beginPath(); ctx.arc(cx + sx * 17 * s, cy + 7 * s, 5 * s, 0, TAU); ctx.fillStyle = rgba('#ff9aa8', 0.5); ctx.fill(); }
  ctx.beginPath(); ctx.moveTo(cx - 3 * s, cy + 6 * s); ctx.lineTo(cx + 3 * s, cy + 6 * s); ctx.lineTo(cx, cy + 10 * s); ctx.closePath(); ctx.fillStyle = '#ff9aa8'; ctx.fill();
  brush(ctx, [[cx - 6 * s, cy + 11 * s], [cx, cy + 13 * s], [cx + 6 * s, cy + 11 * s]], { w0: 1.5 * s, w1: 1.5 * s, color: '#3b2f3a', alpha: 0.7 });
}
export function drawCloud(ctx, cx, cy, w, h, seed = 5) {
  softShadow(ctx, cx, cy + h * 0.55, w * 0.45, h * 0.12, 0.12, '#6a6fb8');
  cloud(ctx, cx, cy, w, h, seed); ctx.fillStyle = lin(ctx, 0, cy - h / 2, 0, cy + h / 2, ['#ffffff', '#f4f8fc', '#dbe6f2']); ctx.fill();
}
export function drawLog(ctx, x, y, w, h, seed = 9) {
  softShadow(ctx, x + w / 2, y + h + 4, w * 0.48, h * 0.18, 0.28);
  washFill(ctx, c => roundRect(c, x, y, w, h, h / 2), '#7a5236', { bounds: { x, y, w, h }, bloom: 0.25 });
  ctx.save(); roundRect(ctx, x, y, w, h, h / 2); ctx.clip();
  ctx.fillStyle = lin(ctx, 0, y, 0, y + h, [rgba('#ffffff', 0.18), rgba('#ffffff', 0), rgba('#2a1f2e', 0.28)]); ctx.fillRect(x, y, w, h);
  const r = rng(seed); for (let i = 0; i < 5; i++) { const yy = y + h * (0.25 + i * 0.15); brush(ctx, [[x + 4, yy], [x + w * 0.5, yy + r.next() * 3], [x + w - 4, yy]], { w0: 1.2, w1: 0.8, color: '#4a3020', alpha: 0.3 }); }
  ctx.restore();
  for (const ex of [x + h * 0.3, x + w - h * 0.3]) { ctx.beginPath(); ctx.ellipse(ex, y + h / 2, h * 0.28, h * 0.4, 0, 0, TAU); ctx.fillStyle = '#c99a62'; ctx.fill(); ctx.strokeStyle = rgba('#7a5236', 0.6); ctx.lineWidth = 1; ctx.stroke(); }
  ctx.save(); ctx.beginPath(); ctx.rect(x, y - h * 0.4, w, h * 0.8); ctx.clip();
  washFill(ctx, c => blob(c, x + w / 2, y + h * 0.05, w * 0.42, h * 0.3, { seed, wobble: 0.1, points: 14 }), '#6aa55a', { edge: 0.15, bloom: 0.2, bounds: { x, y: y - h * 0.3, w, h: h * 0.7 } });
  ctx.restore();
  const r2 = rng(seed + 1); for (let i = 0; i < 8; i++) { const gx = x + w * (0.12 + 0.76 * r2.next()); leaf(ctx, gx, y + h * 0.1, h * 0.5, h * 0.12, -Math.PI / 2 + (r2.next() - 0.5) * 0.8); ctx.fillStyle = i % 2 ? '#8cc66a' : '#4f9a52'; ctx.fill(); }
}
