// Scene drawing (owner: render): sprite blitting with rectangle fallbacks, lane items, Colby, Pete, extras, popups.
// Everything is a pure function of (g, t, alpha): no hidden state, so screenshots are deterministic.
import { PAL, CELL, W, rowY, ROW, TUNING } from '../core/defs.js';

// ------------------------------------------------------------------ helpers
export const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
export const mod = (a, n) => ((a % n) + n) % n;
export const hash = (n) => { let h = (Math.imul(n | 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0; return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };

/** Drawable frame i of sprite `name`, or null. */
export function frameOf(sprites, name, i = 0) {
  const s = sprites && sprites.get ? sprites.get(name) : null;
  if (!s || !s.frames || !s.frames.length) return null;
  return s.frames[mod(Math.floor(i) || 0, s.frames.length)];
}
export const frameCount = (sprites, name) => { const s = sprites && sprites.get ? sprites.get(name) : null; return s ? s.frames.length : 0; };

/**
 * Draw sprite frame at integer x,y. Options: flip (horizontal mirror), flipY, w/h (destination size), alpha.
 * Returns true when a sprite was drawn, false when it is missing (caller then draws a fallback rectangle).
 */
export function blit(ctx, sprites, name, frame, x, y, o = {}) {
  const s = sprites && sprites.get ? sprites.get(name) : null;
  if (!s || !s.frames.length) return false;
  const idx = mod(Math.floor(frame) || 0, s.frames.length);
  let img = s.frames[idx], flipCtx = false;
  if (o.flip) { const m = sprites.mirror ? sprites.mirror(name, idx) : null; if (m) img = m; else flipCtx = true; }
  if (!img) return false;
  const dw = o.w ?? s.w, dh = o.h ?? s.h;
  const a = ctx.globalAlpha;
  if (o.alpha !== undefined) ctx.globalAlpha = a * o.alpha;
  x = Math.round(x); y = Math.round(y);
  if (flipCtx || o.flipY) {
    ctx.save(); ctx.translate(flipCtx ? x + dw : x, o.flipY ? y + dh : y); ctx.scale(flipCtx ? -1 : 1, o.flipY ? -1 : 1);
    ctx.drawImage(img, 0, 0, dw, dh); ctx.restore();
  } else if (dw === s.w && dh === s.h) ctx.drawImage(img, x, y);
  else ctx.drawImage(img, x, y, dw, dh);
  ctx.globalAlpha = a;
  return true;
}

export function rect(ctx, x, y, w, h, c, alpha) {
  if (alpha !== undefined) { const a = ctx.globalAlpha; ctx.globalAlpha = a * alpha; ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); ctx.globalAlpha = a; return; }
  ctx.fillStyle = c; ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}
/** Pixel-stepped filled ellipse (scanlines). */
export function ellipse(ctx, cx, cy, rx, ry, c, alpha) {
  if (rx < 0.5 || ry < 0.5) return;
  const a = ctx.globalAlpha; if (alpha !== undefined) ctx.globalAlpha = a * alpha;
  ctx.fillStyle = c;
  const y0 = Math.ceil(cy - ry), y1 = Math.floor(cy + ry);
  for (let y = y0; y <= y1; y++) {
    const dy = (y + 0.5 - cy) / ry, k = 1 - dy * dy; if (k <= 0) continue;
    const hw = Math.round(rx * Math.sqrt(k));
    if (hw > 0) ctx.fillRect(Math.round(cx) - hw, y, hw * 2, 1);
  }
  ctx.globalAlpha = a;
}
/** Pixel-stepped 1 px elliptical ring (used for ripples). */
export function ring(ctx, cx, cy, rx, ry, c, alpha) {
  if (rx < 1 || ry < 0.5) return;
  const a = ctx.globalAlpha; if (alpha !== undefined) ctx.globalAlpha = a * alpha;
  ctx.fillStyle = c;
  const n = Math.max(8, Math.round((rx + ry) * 2.2));
  for (let i = 0; i < n; i++) { const th = (i / n) * Math.PI * 2; ctx.fillRect(Math.round(cx + Math.cos(th) * rx), Math.round(cy + Math.sin(th) * ry), 1, 1); }
  ctx.globalAlpha = a;
}

// ------------------------------------------------------------------ lanes
const VEH = {
  car: [PAL.carRed, PAL.carRedD], racer: [PAL.carYellow, PAL.carYellowD], bike: [PAL.carGreen, PAL.carGreenD], dozer: [PAL.carYellow, PAL.carYellowD],
  truck: [PAL.carBlue, PAL.carBlueD], bus: [PAL.carYellow, PAL.carYellowD], limo: [PAL.limo, PAL.limoL], roller: [PAL.cheese, PAL.cheeseD],
};
export const isRiverKind = (k) => k === 'croc' || k.startsWith('log') || k.startsWith('turtle');
const rowOfItem = (it) => (it.lane && typeof it.lane === 'object' && it.lane.row !== undefined ? it.lane.row : Math.floor((it.y ?? 0) / CELL));

function fallbackItem(ctx, it, x, y, w) {
  const k = it.kind;
  if (k.startsWith('log')) { rect(ctx, x, y + 2, w, 12, PAL.log); rect(ctx, x, y + 11, w, 3, PAL.logD); rect(ctx, x, y + 2, w, 1, PAL.logRing); }
  else if (k.startsWith('turtle')) { for (let i = 0; i < w / 16; i++) { ellipse(ctx, x + i * 16 + 8, y + 8, 7, 6, it.state === 'under' ? PAL.waterD : PAL.turtle); ellipse(ctx, x + i * 16 + 8, y + 8, 4, 3.5, PAL.turtleShell); } }
  else if (k === 'croc') { const head = it.dir > 0 ? x + w - 16 : x; rect(ctx, x, y + 3, w, 10, PAL.croc); rect(ctx, head, y + 4, 16, 8, it.state === 'open' ? PAL.crocMouth : PAL.crocD); }
  else { const [a, b] = VEH[k] || [PAL.carGrey, PAL.carWhite]; rect(ctx, x + 1, y + 3, w - 2, 10, a); rect(ctx, x + 1, y + 10, w - 2, 3, b); rect(ctx, x + 3, y + 5, Math.max(2, w - 8), 3, PAL.window); }
}

/** Draw all visible lane items (`items` is the output of visibleItems(def, t)). */
export function drawItems(ctx, sprites, items, t) {
  if (!items || !items.length) return;
  const list = items.slice().sort((a, b) => rowOfItem(a) - rowOfItem(b));
  for (const it of list) {
    const k = it.kind, row = rowOfItem(it), y = row * CELL, w = it.w ?? 16, x = Math.round(it.x), dir = it.dir || 1, river = isRiverKind(k);
    if (x > W || x + w < 0) continue;
    const seed = (it.item && it.item.id !== undefined ? it.item.id : x) | 0;
    if (!river) {
      rect(ctx, x + 1, y + 13, w - 2, 2, '#000', 0.28);                         // drop shadow on tarmac
      const nfr = frameCount(sprites, k) || 2;
      const fr = typeof it.frame === 'number' ? it.frame : (k === 'roller' ? Math.floor(x / 4) : Math.floor(t * 8 + seed));
      if (!blit(ctx, sprites, k, mod(fr, nfr), x, y, { flip: dir < 0 })) fallbackItem(ctx, it, x, y, w);
      continue;
    }
    // water wake: foam dashes slide along the item's edges (pure function of t and the item's x)
    const slide = Math.floor(it.x * 0.5);
    ctx.fillStyle = PAL.foam;
    for (let i = 0; i < Math.min(5, Math.ceil(w / 20)); i++) {
      const px = x + mod(slide * dir + i * 21 + seed * 7, w); ctx.globalAlpha = 0.55;
      ctx.fillRect(px, y + 1, 2, 1); ctx.fillRect(w - (px - x) + x - 2, y + 14, 2, 1);
    }
    ctx.globalAlpha = 1;
    if (k.startsWith('log')) {
      const bob = Math.round(Math.sin(t * 2 + seed) * 0.6);
      if (!blit(ctx, sprites, k, 0, x, y + bob)) fallbackItem(ctx, it, x, y + bob, w);
    } else if (k.startsWith('turtle')) {
      const n = Math.max(1, Math.round(w / 16)), st = it.state || 'up';
      for (let i = 0; i < n; i++) {
        const bob = st === 'up' ? Math.round(Math.sin(t * 2.4 + i * 1.7 + seed)) : 0;
        const tx = x + i * 16, ty = y + bob;
        let ok;
        const has = typeof it.frame === 'number', f = has ? it.frame + i : Math.floor(t * 2 + i);
        if (st === 'under') ok = blit(ctx, sprites, 'turtle_under', f, tx, y, { alpha: 0.7 });
        else if (st === 'sink' || st === 'rise') ok = blit(ctx, sprites, 'turtle_sink', has ? it.frame : (st === 'sink' ? Math.floor(t * 6) % 3 : 2 - (Math.floor(t * 6) % 3)), tx, y);
        else ok = blit(ctx, sprites, 'turtle_up', Math.floor(t * 2 + i + seed), tx, ty, { flip: dir < 0 });
        if (!ok) fallbackItem(ctx, { ...it, w: 16 }, tx, ty, 16);
      }
    } else if (k === 'croc') {
      const nm = it.state === 'open' ? 'croc_open' : 'croc_closed';
      if (!blit(ctx, sprites, nm, Math.floor(t * 2 + seed), x, y, { flip: dir < 0 })) fallbackItem(ctx, it, x, y, w);
    } else fallbackItem(ctx, it, x, y, w);
  }
}

// ------------------------------------------------------------------ Colby
/** Pixel position and visual params of Colby for this frame (exported for tests and the ghibli renderer). */
export function colbyPose(g, t, alpha = 0) {
  const p = g.player; if (!p) return null;
  let x = p.x, y = p.y;
  if (p.mode === 'riding' && p.riding && g.level && g.level.lanes) {                         // carry extrapolation by alpha (1/60 s)
    const lane = g.level.lanes.find((l) => l.row === p.row);
    if (lane) x += lane.dir * lane.speed * alpha * (1 / 60);
  }
  const hop = p.mode === 'hop' ? clamp(p.hopT || 0, 0, 1) : 0;
  const arc = Math.sin(Math.PI * hop);
  const vert = p.facing === 'up' || p.facing === 'down';
  let w = 16, h = 16;
  if (p.mode === 'hop') {
    const stretch = Math.round(3 * arc), land = hop > 0.8 ? Math.round((hop - 0.8) / 0.2 * 2) : 0, crouch = hop < 0.15 ? 2 : 0;
    if (vert) { h = 16 + stretch - land - crouch; w = 16 - Math.round(arc) + land + crouch; } else { w = 16 + stretch - land - crouch; h = 16 - Math.round(arc) + land + crouch; }
  }
  const bob = p.mode === 'riding' ? Math.round(Math.sin(t * 3.3 + x * 0.05) * 0.7) : 0;
  return { x, y, hop, arc, w, h, lift: Math.round(arc * 5) + (bob < 0 ? 1 : 0) * 0, bob, vert };
}

export function drawColbyShadow(ctx, g, t, alpha) {
  const p = g.player, o = colbyPose(g, t, alpha);
  if (!o || p.mode === 'dead' || p.mode === 'home') return;
  const k = 1 - o.arc * 0.4;
  ellipse(ctx, o.x, o.y + 6, 6 * k, 2.2 * k, '#000', 0.32 - o.arc * 0.12);
}

export function drawColby(ctx, sprites, g, t, alpha) {
  const p = g.player, o = colbyPose(g, t, alpha);
  if (!o || p.mode === 'dead' || p.mode === 'home') return;
  let name, frame = p.frame | 0;
  if (p.mode === 'squash') name = 'colby_squash';
  else if (p.mode === 'drown') name = 'colby_drown';
  else { name = 'colby_' + (p.facing || 'up'); if (p.mode === 'hop') frame = o.arc > 0.35 ? 1 : 0; else frame = 0; }
  const dx = Math.round(o.x - o.w / 2), dy = Math.round(o.y + 8 - o.h - o.lift + o.bob);
  const sized = p.mode === 'hop' ? { w: o.w, h: o.h } : {};
  if (p.mode === 'drown') {                                                                        // sink with a wobble
    const k = clamp((g.player.deathT || 0) / 1.0, 0, 1);
    if (!blit(ctx, sprites, name, frame, dx, dy + Math.round(k * 4), { alpha: 1 - k * 0.5 })) { ellipse(ctx, o.x, o.y + 2, 6, 5, PAL.fur, 1 - k); }
    return;
  }
  if (!blit(ctx, sprites, name, frame, dx, dy, sized)) {                                          // fallback: orange block with ears and scarf
    const cx = Math.round(o.x), cy = Math.round(o.y - o.lift + o.bob);
    rect(ctx, cx - 5, cy - 5, 10, 10, p.mode === 'squash' ? PAL.furD : PAL.fur); rect(ctx, cx - 5, cy - 7, 3, 3, PAL.furD); rect(ctx, cx + 2, cy - 7, 3, 3, PAL.furD);
    rect(ctx, cx - 5, cy + 2, 10, 2, PAL.scarf); rect(ctx, cx - 3, cy - 2, 2, 2, PAL.eye); rect(ctx, cx + 1, cy - 2, 2, 2, PAL.eye);
  }
}

// ------------------------------------------------------------------ Pete, cheese
export function drawPete(ctx, sprites, g, t) {
  const pe = g.pete; if (!pe || pe.mode === 'hidden' || pe.mode === 'none') return;
  const y = rowY(ROW.median) - 8, dir = pe.dir || 1;
  if (pe.mode === 'taunt') {
    const x = Math.round(clamp(pe.x ?? 190, 16, W - 16) - 16), by = Math.round(Math.sin(t * 5) * 1);
    if (!blit(ctx, sprites, 'pete_taunt', Math.floor(t * 3), x, y + 16 - 32 + by)) { rect(ctx, x + 6, y - 8 + by, 20, 24, PAL.peteSuit); rect(ctx, x + 8, y - 14 + by, 16, 8, PAL.peteFur); rect(ctx, x + 10, y - 11 + by, 12, 3, PAL.peteShade); }
    return;
  }
  const x = Math.round((pe.x ?? 0) - 12);
  rect(ctx, x + 2, y + 13, 20, 2, '#000', 0.3);
  if (!blit(ctx, sprites, 'pete_walk', Math.floor(t * 6), x, y, { flip: dir < 0 })) { rect(ctx, x + 2, y + 4, 20, 10, PAL.peteSuit); rect(ctx, dir > 0 ? x + 14 : x, y + 2, 10, 7, PAL.peteFur); rect(ctx, dir > 0 ? x + 18 : x + 2, y + 4, 4, 2, PAL.peteShade); }
}
export function drawExtras(ctx, sprites, g, t) {
  for (const e of g.extra || []) {
    const row = e.row ?? ROW.median, y = row * CELL, x = Math.round(e.x);
    rect(ctx, x + 2, y + 13, 12, 2, '#000', 0.28);
    const spin = Math.floor(e.x / 4) * (e.vx < 0 ? -1 : 1);
    if (!blit(ctx, sprites, 'roller', spin, x, y, { flip: (e.vx || 0) < 0 })) { ellipse(ctx, x + 8, y + 8, 7, 6, PAL.cheese); ellipse(ctx, x + 6, y + 7, 1.5, 1.5, PAL.cheeseHole); ellipse(ctx, x + 10, y + 10, 1.5, 1.5, PAL.cheeseHole); }
  }
}

// ------------------------------------------------------------------ popups (floating score text). font: { drawText(ctx,text,x,y,opts) }
export function drawPopups(ctx, g, font) {
  for (const q of g.popups || []) {
    const life = q.ttl || 1, k = clamp(1 - (q.age || 0) / life, 0, 1);
    if (k < 0.25 && Math.floor((q.age || 0) * 20) % 2) continue;
    const txt = String(q.text);
    if (font && font.drawText) font.drawText(ctx, txt, Math.round(q.x), Math.round(q.y - 3), { color: PAL.hudTxt, shadow: PAL.black, align: 'center' });
    else { ctx.fillStyle = PAL.hudTxt; ctx.fillRect(Math.round(q.x) - txt.length * 3, Math.round(q.y - 3), txt.length * 6, 5); }
  }
}

export { TUNING };
