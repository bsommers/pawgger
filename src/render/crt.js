// CRT pass (owner: render): scanlines, phosphor shimmer band and vignette applied on the OUTPUT canvas after the
// integer upscale, so the lines are crisp device pixels. Cheap: one fillRect per logical row + one cached gradient.
export function createCRT(mk) {
  let vig = null, vigKey = '';
  function vignette(w, h) {
    const key = w + 'x' + h;
    if (vig && vigKey === key) return vig;
    vigKey = key; vig = null;
    if (!mk) return null;
    try {
      const c = mk(w, h), x = c.getContext('2d');
      if (!x.createRadialGradient) return null;
      const g = x.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.38, w / 2, h / 2, Math.hypot(w, h) * 0.55);
      g.addColorStop(0, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,0,0,0.42)');
      x.fillStyle = g; x.fillRect(0, 0, w, h);
      vig = c;
    } catch { vig = null; }
    return vig;
  }
  return {
    /** v = viewport { ox, oy, s, w, h } of the upscaled picture inside the output canvas. */
    apply(ctx, v, t = 0) {
      const { ox, oy, s, w, h } = v;
      if (s >= 2) {
        const th = Math.max(1, Math.floor(s / 3)), top = s - th;
        ctx.fillStyle = 'rgba(0,0,0,0.28)';
        for (let y = 0; y < h; y += s) ctx.fillRect(ox, oy + y + top, w, th);
        if (s >= 3) { ctx.fillStyle = 'rgba(255,255,255,0.025)'; for (let y = 0; y < h; y += s) ctx.fillRect(ox, oy + y, w, 1); }
      }
      // slow rolling bright band
      const by = oy + ((t * 22 * s) % (h + 40 * s)) - 20 * s;
      ctx.fillStyle = 'rgba(255,255,255,0.025)';
      ctx.fillRect(ox, Math.max(oy, by), w, Math.max(0, Math.min(oy + h, by + 14 * s) - Math.max(oy, by)));
      const vg = vignette(w, h);
      if (vg) ctx.drawImage(vg, ox, oy);
    },
  };
}
