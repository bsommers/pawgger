// toon kit: wraps the painter-kit so any painterly art module draws in flat cartoon "toon" style instead:
//   gradients -> one flat cel colour (middle stop, slightly saturated), soft shadows -> flat dark ellipse,
//   dark outline strokes -> thick near-black (#1a1a1a, the character-library house outline), paper grain -> nothing.
// Geometry, names, sizes and frame counts stay those of the source module, so the sprite manifest is unchanged.
import { GHIBLI_SCALE, TOON_SCALE } from '../../core/defs.js';

export const TOON_INK = '#1a1a1a';
const OUTLINE_MUL = 1.7, OUTLINE_MIN = 0.5, OUTLINE_MAX = 1.3;

function lum(c) {
  const m = /rgba?\(([^)]+)\)/i.exec(c);
  if (m) { const p = m[1].split(',').map(Number); return { l: 0.3 * p[0] + 0.59 * p[1] + 0.11 * p[2], a: p.length > 3 ? p[3] : 1 }; }
  const h = /^#([0-9a-f]{6})$/i.exec(c);
  if (h) { const n = parseInt(h[1], 16); return { l: 0.3 * (n >> 16) + 0.59 * ((n >> 8) & 255) + 0.11 * (n & 255), a: 1 }; }
  return null;
}
const flatOf = (g) => { const s = g.stops; if (!s.length) return '#888'; const e = s[Math.min(s.length - 1, Math.floor(s.length / 2))]; return typeof e === 'string' ? e : e[1]; };   // stops are [pos,colour] pairs or bare colours

/** Wrap a Canvas2D ctx (real or the painter-kit recording shim) so styles are toonified. */
export function toonCtx(target) {
  return new Proxy(target, {
    get(t, k) {
      if (k === 'createLinearGradient' || k === 'createRadialGradient') return (...a) => ({ flat: true, args: a, stops: [], addColorStop(p, c) { this.stops.push([p, c]); } });
      const v = t[k]; return typeof v === 'function' ? v.bind(t) : v;
    },
    set(t, k, v) {
      if (k === 'fillStyle' || k === 'strokeStyle') {
        if (v && typeof v === 'object' && v.flat) v = flatOf(v);
        if (k === 'strokeStyle' && typeof v === 'string') { const q = lum(v); if (q && q.l < 110 && q.a >= 0.45) v = TOON_INK; }
      } else if (k === 'lineWidth' && typeof v === 'number') v = v >= 0.3 ? Math.min(OUTLINE_MAX, Math.max(OUTLINE_MIN, v * OUTLINE_MUL)) : v;
      t[k] = v; return true;
    },
  });
}

/** painter-kit -> toon kit. Surfaces are sized with the toon scale (same 4x as ghibli, asserted). */
export function toonKit(kit) {
  if (TOON_SCALE !== GHIBLI_SCALE) throw new Error('toonKit reuses ghibli geometry: TOON_SCALE must equal GHIBLI_SCALE');
  const flat = (ctx, a, stops) => ({ flat: true, args: a, stops, addColorStop() {} });
  return {
    ...kit,
    makeSurface(w, h) { const s = kit.makeSurface(w, h); return { ...s, ctx: toonCtx(s.ctx) }; },
    lin: (ctx, x0, y0, x1, y1, stops) => flat(ctx, [x0, y0, x1, y1], stops),
    radial: (ctx, x, y, r0, r1, stops) => flat(ctx, [x, y, r0, r1], stops),
    softShadow(ctx, cx, cy, rx, ry, alpha = 0.3) { ctx.save(); ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2); ctx.fillStyle = `rgba(26,26,26,${Math.min(0.5, alpha + 0.1).toFixed(2)})`; ctx.fill(); ctx.restore(); },
    paperGrain() {},
    washFill(ctx, pathFn, color) { ctx.save(); pathFn(ctx); ctx.fillStyle = color; ctx.fill(); pathFn(ctx); ctx.lineWidth = 0.6; ctx.strokeStyle = TOON_INK; ctx.stroke(); ctx.restore(); },
  };
}
