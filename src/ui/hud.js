// HUD (owner: ui-shell). Drawn AFTER the renderer, in logical 224x256 units (the caller sets the canvas transform).
// Works in both styles: retro uses the blocky bitmap font and flat plates, ghibli uses soft rounded plates and a serif face.
import { W, H, CELL, ROW, PAL, TIME_LIMIT } from '../core/defs.js';
import { drawText, measureText } from './font.js';

const C = { gold: PAL.hudTxt || '#ffd23a', dim: PAL.hudDim || '#8d7a3a', red: PAL.red || '#ff4a3a', green: PAL.green || '#6cf06c', bg: PAL.hudBg || '#0a0710', white: '#fff4dc', plum: '#2a1830' };
export const COLORS = C;
const SERIF = '"DejaVu Serif", "Trebuchet MS", Verdana, Georgia, serif';

/** Text in either style. opts: color, scale (retro integer, ghibli size = 7*scale), align, shadow. Returns width. */
export function label(ctx, style, text, x, y, opts = {}) {
  const scale = opts.scale ?? 1, align = opts.align ?? 'left', color = opts.color ?? C.white;
  if (style !== 'ghibli') { drawText(ctx, text, x, y, { scale, color, align, shadow: opts.shadow === undefined ? '#000' : opts.shadow }); return measureText(text, scale); }
  ctx.save();
  ctx.font = `bold ${Math.round(8.4 * scale * 10) / 10}px ${SERIF}`; ctx.textAlign = align; ctx.textBaseline = 'alphabetic';
  ctx.lineJoin = 'round'; ctx.lineWidth = Math.max(1.2, scale * 1.4); ctx.strokeStyle = 'rgba(32,16,36,0.78)';
  const by = y + 7 * scale;
  ctx.strokeText(text, x, by); ctx.fillStyle = color; ctx.fillText(text, x, by);
  const w = ctx.measureText(text).width; ctx.restore(); return w;
}
export const textWidth = (ctx, style, text, scale = 1) => {
  if (style !== 'ghibli') return measureText(text, scale);
  ctx.save(); ctx.font = `bold ${Math.round(8.4 * scale * 10) / 10}px ${SERIF}`; const w = ctx.measureText(text).width; ctx.restore(); return w;
};

/** Plate: flat bordered rect (retro) or soft rounded translucent panel (ghibli). */
export function plate(ctx, style, x, y, w, h, o = {}) {
  const a = o.alpha ?? 0.72;
  ctx.save();
  if (style === 'ghibli') {
    const r = Math.min(5, h / 2);
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r); else ctx.rect(x, y, w, h);
    ctx.fillStyle = `rgba(40,22,48,${a})`; ctx.fill();
    ctx.lineWidth = 0.7; ctx.strokeStyle = o.border || 'rgba(255,226,170,0.55)'; ctx.stroke();
  } else {
    ctx.globalAlpha = a; ctx.fillStyle = C.bg; ctx.fillRect(x, y, w, h); ctx.globalAlpha = 1;
    ctx.fillStyle = o.border || C.dim; ctx.fillRect(x, y, w, 1); ctx.fillRect(x, y + h - 1, w, 1); ctx.fillRect(x, y, 1, h); ctx.fillRect(x + w - 1, y, 1, h);
  }
  ctx.restore();
}

/** Little orange cat head (life icon), 10x10 at (x,y). */
export function catHead(ctx, x, y, ghibli) {
  ctx.save(); ctx.translate(x, y);
  const o = '#e8872c', d = '#a8501a', l = '#ffd9a0';
  if (ghibli) {
    ctx.fillStyle = o; ctx.beginPath(); ctx.arc(5, 6, 4.2, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.moveTo(1.2, 5); ctx.lineTo(1.6, 0.6); ctx.lineTo(4.4, 2.6); ctx.fill();
    ctx.beginPath(); ctx.moveTo(8.8, 5); ctx.lineTo(8.4, 0.6); ctx.lineTo(5.6, 2.6); ctx.fill();
    ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.arc(3.7, 5.6, 0.7, 0, 7); ctx.arc(6.3, 5.6, 0.7, 0, 7); ctx.fill();
    ctx.fillStyle = '#f08a8a'; ctx.beginPath(); ctx.arc(5, 7.2, 0.6, 0, 7); ctx.fill();
  } else {
    ctx.fillStyle = d; ctx.fillRect(1, 0, 2, 3); ctx.fillRect(7, 0, 2, 3); ctx.fillRect(1, 2, 8, 7);
    ctx.fillStyle = o; ctx.fillRect(2, 1, 1, 2); ctx.fillRect(7, 1, 1, 2); ctx.fillRect(2, 3, 6, 5);
    ctx.fillStyle = l; ctx.fillRect(3, 6, 4, 2);
    ctx.fillStyle = '#1a0e08'; ctx.fillRect(3, 4, 1, 2); ctx.fillRect(6, 4, 1, 2);
    ctx.fillStyle = '#f08a8a'; ctx.fillRect(4, 7, 2, 1);
  }
  ctx.restore();
}

const pad = (n, k) => String(Math.max(0, Math.floor(n))).padStart(k, '0');

/** Time bar colour by remaining fraction. */
const barColor = (f) => (f > 0.5 ? C.green : f > 0.25 ? C.gold : C.red);

/** Speech bubble with tail, centred on cx, bottom at y. */
export function bubble(ctx, style, text, cx, y, tailX) {
  const w = Math.min(W - 6, textWidth(ctx, style, text) + 10), h = 13, x = Math.max(3, Math.min(W - 3 - w, cx - w / 2));
  plate(ctx, style, x, y - h, w, h, { alpha: 0.9, border: C.red });
  ctx.save(); ctx.fillStyle = style === 'ghibli' ? 'rgba(40,22,48,0.9)' : C.bg; ctx.beginPath();
  const tx = Math.max(x + 6, Math.min(x + w - 6, tailX ?? cx)); ctx.moveTo(tx - 3, y - 1); ctx.lineTo(tx + 3, y - 1); ctx.lineTo(tx, y + 4); ctx.fill(); ctx.restore();
  label(ctx, style, text, x + w / 2, y - h + 3, { align: 'center', color: '#ffb0a0' });
}

export function createHud() {
  return {
    /** g: game, o: {style, hi, attract, t} */
    draw(ctx, g, o = {}) {
      const style = o.style || 'retro', gh = style === 'ghibli', hi = Math.max(o.hi || 0, g.score || 0);
      ctx.save(); ctx.imageSmoothingEnabled = gh;
      // ---- row 0: score left, hi right (plates keep the text readable over the storefront)
      // retro: 1-letter prefixes keep both plates inside x<56 and x>168 so the MICRO CENTER sign (x 56..168) is never covered
      const sc = (gh ? 'SC ' : 'S') + pad(g.score, 6), hs = (gh ? 'HI ' : 'H') + pad(hi, 6);
      const sw = textWidth(ctx, style, sc) + 8, hw = textWidth(ctx, style, hs) + 8;
      plate(ctx, style, 2, 2, sw, 11); label(ctx, style, sc, 6, 4, { color: C.gold });
      plate(ctx, style, W - 2 - hw, 2, hw, 11); label(ctx, style, hs, W - 6, 4, { align: 'right', color: C.white });
      // ---- row 14: lives, level, time bar
      const y0 = ROW.hudBot * CELL;
      if (gh) { ctx.fillStyle = 'rgba(30,16,36,0.78)'; ctx.fillRect(0, y0, W, CELL); }
      const lives = Math.max(0, g.lives | 0), shown = Math.min(lives, 4);
      for (let i = 0; i < shown; i++) catHead(ctx, 3 + i * 11, y0 + 3, gh);
      if (lives > 4) label(ctx, style, `+${lives - 4}`, 3 + 4 * 11, y0 + 4, { color: C.gold });
      label(ctx, style, `LV ${g.levelNum ?? 1}`, 74, y0 + 4, { color: C.gold });
      const f = Math.max(0, Math.min(1, (g.timeLeft ?? TIME_LIMIT) / TIME_LIMIT)), bx = 106, bw = 96, by = y0 + 4;
      const low = f < 0.27 && g.state === 'play', blink = low && Math.floor((o.t || 0) * 5) % 2 === 0;
      if (gh) {
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, bw, 8, 4) : ctx.rect(bx, by, bw, 8); ctx.fillStyle = 'rgba(0,0,0,0.5)'; ctx.fill();
        if (f > 0) { ctx.beginPath(); ctx.roundRect ? ctx.roundRect(bx, by, Math.max(4, bw * f), 8, 4) : ctx.rect(bx, by, bw * f, 8); ctx.fillStyle = blink ? '#fff' : barColor(f); ctx.fill(); }
      } else {
        ctx.fillStyle = '#000'; ctx.fillRect(bx - 1, by - 1, bw + 2, 10); ctx.fillStyle = '#3a3040'; ctx.fillRect(bx, by, bw, 8);
        ctx.fillStyle = blink ? '#fff' : barColor(f); ctx.fillRect(bx, by, Math.round(bw * f), 8);
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(bx, by, Math.round(bw * f), 2);
      }
      label(ctx, style, `${Math.ceil(g.timeLeft ?? TIME_LIMIT)}`, W - 4, y0 + 4, { align: 'right', color: low ? C.red : C.white });
      // ---- row 15: Pete ticker
      if (g.pete && g.pete.line && (g.state === 'play' || g.state === 'intro')) {
        const ty = ROW.ticker * CELL;
        if (gh) { ctx.fillStyle = 'rgba(40,16,24,0.86)'; ctx.fillRect(0, ty, W, CELL); }
        label(ctx, style, 'PETE:', 4, ty + 4, { color: C.red });
        label(ctx, style, g.pete.line, 36, ty + 4, { color: C.white });
      }
      // ---- banners
      if (g.state === 'intro') this.banner(ctx, style, `LEVEL ${g.levelNum}`, 'BURGER KING TO MICRO CENTER', g.stateT || 0);
      else if (g.state === 'levelclear') this.banner(ctx, style, 'LEVEL CLEAR!', 'NERD APPROVED', g.stateT || 0, C.green);
      ctx.restore();
    },
    banner(ctx, style, big, small, t, color = C.gold) {
      const a = Math.min(1, t * 5), y = 104 + (1 - a) * -8;
      ctx.save(); ctx.globalAlpha = a;
      plate(ctx, style, 8, y, W - 16, 38, { alpha: 0.82 });
      label(ctx, style, big, W / 2, y + 6, { scale: 2, align: 'center', color });
      label(ctx, style, small, W / 2, y + 26, { align: 'center', color: C.white });
      ctx.restore();
    },
  };
}
export { W, H };
