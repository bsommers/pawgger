// Ghibli (painterly) renderer. Owner: render-ghibli. ARCHITECTURE sections 7 and 12.
// Canvas 896x1024, smoothing on, ctx.scale(GHIBLI_SCALE) so all coordinates are the 224x256 logical ones.
// Ambient look (sky, clouds, water, grass, petals, fireflies, light) is a pure function of g.t.
// Event particles (splash, dust, petals, stars) are driven by the bus and an internal clock.
import { W, H, CELL, ROW, BAY_X, GHIBLI_SCALE, GPAL, rowY } from '../core/defs.js';
import * as kit from '../kits/painter-kit/index.js';

const TAU = Math.PI * 2;
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const mod = (a, n) => ((a % n) + n) % n;
const lerp = (a, b, t) => a + (b - a) * t;
const hash = (n) => { let h = (Math.imul(n | 0, 0x9e3779b1) ^ 0x85ebca6b) >>> 0; h = Math.imul(h ^ (h >>> 15), 0x2c1b3c6d) >>> 0; h = Math.imul(h ^ (h >>> 12), 0x297a2d39) >>> 0; return ((h ^ (h >>> 15)) >>> 0) / 4294967296; };
const rgba = kit.rgba;
const ROAD_KINDS = new Set(['car', 'racer', 'bike', 'dozer', 'truck', 'bus', 'limo', 'roller']);
const THEMES = {
  day:   { top: GPAL.skyDayTop,   mid: GPAL.skyDayMid,   low: GPAL.skyDayLow,   dark: 0,    warm: 0 },
  dusk:  { top: GPAL.skyDuskTop,  mid: GPAL.skyDuskMid,  low: GPAL.skyDuskLow,  dark: 0.2,  warm: 1 },
  night: { top: GPAL.skyNightTop, mid: GPAL.skyNightMid, low: GPAL.skyNightLow, dark: 1,    warm: 0 },
};
const envOf = (g) => { const th = (g && g.level && g.level.theme) || 'day'; return { theme: THEMES[th] ? th : 'day', ...(THEMES[th] || THEMES.day) }; };

export function createGhibliRenderer(ctx, opts = {}) {
  let settings = opts.settings || {};
  let sprites = opts.sprites || null;
  let visibleItems = opts.visibleItems || null;
  let bus = opts.bus || null;
  const makeCanvas = opts.makeCanvas || ((w, h) => { const sf = kit.makeSurface(w, h), c = sf.canvas; if (!c.getContext || sf.isShim) c.getContext = () => sf.ctx; return c; });
  const S = GHIBLI_SCALE;
  const toon = opts.look === 'toon';       // flat cartoon look (see render/toon.js): banded sky, no grain/vignette/dapple
  let offs = [];
  let clock = 0, lastT = null;          // particle clock (seconds)
  const parts = [];                      // event particles
  const ripples = [];                    // event ripples {x,y,age,life,r}
  const cache = { grain: null, vignette: null, glows: new Map(), clouds: null, dark: null, darkCtx: null };
  const missing = new Set();

  // ------------------------------------------------------------ sprite helpers (logical units; sprites are w*S px)
  const spr = (name) => { try { return sprites && sprites.get ? sprites.get(name) : null; } catch { return null; } };
  function img(name, frame = 0) {
    const s = spr(name); if (!s || !s.frames || !s.frames.length) { missing.add(name); return null; }
    return { im: s.frames[mod(Math.floor(frame) || 0, s.frames.length)], w: s.w, h: s.h };
  }
  /** draw sprite `name` with top-left (x,y) in logical px; returns false when missing. */
  function blit(name, frame, x, y, o = {}) {
    const f = img(name, frame); if (!f || !f.im) return false;
    const a = ctx.globalAlpha;
    if (o.alpha !== undefined) ctx.globalAlpha = a * o.alpha;
    const w = o.w ?? f.w, h = o.h ?? f.h;
    try {
      if (o.flip) { ctx.save(); ctx.translate(x + w, y); ctx.scale(-1, 1); ctx.drawImage(f.im, 0, 0, w, h); ctx.restore(); }
      else ctx.drawImage(f.im, x, y, w, h);
    } catch { ctx.globalAlpha = a; return false; }
    ctx.globalAlpha = a;
    return true;
  }
  const rrect = (x, y, w, h, r, fill) => { ctx.beginPath(); kit.roundRect(ctx, x, y, w, h, r); ctx.fillStyle = fill; ctx.fill(); };

  // cached soft glow (white-ish radial) as a canvas, tinted by colour
  function glow(color) {
    let c = cache.glows.get(color);
    if (c === undefined) {
      try {
        c = makeCanvas(64, 64); const x = c.getContext('2d');
        x.fillStyle = kit.radial(x, 32, 32, 0, 32, [[0, rgba(color, 1)], [0.35, rgba(color, 0.45)], [1, rgba(color, 0)]]); x.fillRect(0, 0, 64, 64);
      } catch { c = null; }
      cache.glows.set(color, c);
    }
    return c;
  }
  function drawGlow(color, cx, cy, rx, ry, a) {
    const c = glow(color); if (!c || a <= 0.003) return;
    const pa = ctx.globalAlpha; ctx.globalAlpha = pa * clamp(a, 0, 1);
    try { ctx.drawImage(c, cx - rx, cy - ry, rx * 2, ry * 2); } catch { /* ignore */ }
    ctx.globalAlpha = pa;
  }

  // ------------------------------------------------------------ cached layers
  function getGrain() {
    if (cache.grain === null) {
      try {
        const c = makeCanvas(448, 512), x = c.getContext('2d');
        kit.paperGrain(x, 448, 512, 7, { density: 0.02, alpha: 0.07, size: 1.3, maxSpecks: 7000 });
        // a few long soft fibres
        x.strokeStyle = 'rgba(255,246,220,0.05)'; x.lineWidth = 0.6;
        for (let i = 0; i < 160; i++) { const px = hash(i * 3) * 448, py = hash(i * 3 + 1) * 512, a = hash(i * 3 + 2) * TAU; x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * 8, py + Math.sin(a) * 8); x.stroke(); }
        cache.grain = c;
      } catch { cache.grain = false; }
    }
    return cache.grain;
  }
  function getVignette() {
    if (cache.vignette === null) {
      try {
        const c = makeCanvas(224, 256), x = c.getContext('2d');
        x.fillStyle = kit.radial(x, 112, 128, 70, 190, [[0, 'rgba(40,24,48,0)'], [0.7, 'rgba(40,24,48,0.10)'], [1, 'rgba(30,16,40,0.38)']]); x.fillRect(0, 0, 224, 256);
        cache.vignette = c;
      } catch { cache.vignette = false; }
    }
    return cache.vignette;
  }
  function getClouds() {
    if (!cache.clouds) {
      cache.clouds = [];
      for (let i = 0; i < 4; i++) {
        try {
          const w = 56 + i * 12, h = 20 + i * 3, c = makeCanvas(Math.ceil((w + 12) * 2), Math.ceil((h + 10) * 2)), x = c.getContext('2d');
          x.scale(2, 2);
          kit.cloud(x, (w + 12) / 2, h / 2 + 3, w, h, 11 + i * 5); x.fillStyle = rgba('#5a4a70', 0.12); x.fill();
          x.save(); x.translate(0, -1.2); kit.cloud(x, (w + 12) / 2, h / 2 + 3, w, h, 11 + i * 5);
          x.fillStyle = kit.lin(x, 0, 0, 0, h + 8, [[0, '#ffffff'], [0.6, GPAL.cloud], [1, GPAL.cloudShade]]); x.fill(); x.restore();
          cache.clouds.push({ c, w: w + 12, h: h + 10 });
        } catch { /* ignore */ }
      }
    }
    return cache.clouds;
  }

  // ------------------------------------------------------------ backdrop
  function drawSky(env, t) {
    if (toon) { for (const [y0, y1, col] of [[0, H * 0.3, env.top], [H * 0.3, H * 0.62, env.mid], [H * 0.62, H, env.low]]) { ctx.fillStyle = col; ctx.fillRect(0, y0, W, y1 - y0 + 0.5); } }
    else { ctx.fillStyle = kit.lin(ctx, 0, 0, 0, H, [[0, env.top], [0.45, env.mid], [1, env.low]]); ctx.fillRect(0, 0, W, H); }
    // sun / moon
    if (env.theme === 'day') { drawGlow('#fff1a8', 176, 14, 70, 56, 0.9); ctx.globalAlpha = 0.95; ctx.beginPath(); ctx.arc(176, 14, 9, 0, TAU); ctx.fillStyle = GPAL.sun; ctx.fill(); ctx.globalAlpha = 1; }
    else if (env.theme === 'dusk') { drawGlow('#ffb070', 70, 26, 90, 40, 0.9); ctx.beginPath(); ctx.arc(70, 24, 10, 0, TAU); ctx.fillStyle = '#ffe3a0'; ctx.fill(); }
    else {
      drawGlow('#c8d4ff', 40, 14, 60, 50, 0.7); ctx.beginPath(); ctx.arc(40, 14, 8, 0, TAU); ctx.fillStyle = GPAL.moon; ctx.fill();
      ctx.fillStyle = 'rgba(200,190,170,0.35)'; ctx.beginPath(); ctx.arc(37, 12, 2, 0, TAU); ctx.arc(43, 17, 1.5, 0, TAU); ctx.fill();
      for (let i = 0; i < 26; i++) { const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * (0.6 + hash(i) * 1.2) + i)); ctx.fillStyle = rgba('#fff6d8', 0.7 * tw); ctx.fillRect(hash(i + 50) * W, hash(i + 90) * 30, 0.7, 0.7); }
    }
    // drifting layered clouds
    const cl = getClouds(); if (!cl.length) return;
    const tint = env.theme === 'night' ? 0.35 : env.theme === 'dusk' ? 0.85 : 1;
    for (let i = 0; i < 6; i++) {
      const k = cl[i % cl.length], sp = 1.2 + (i % 3) * 0.8, x = mod(hash(i + 3) * (W + 120) + t * sp, W + 120) - 80, y = -4 + (i % 3) * 9 + hash(i) * 6;
      ctx.globalAlpha = (0.55 + 0.35 * hash(i + 9)) * tint; ctx.drawImage(k.c, x, y, k.w, k.h);
    }
    ctx.globalAlpha = 1;
    if (env.theme === 'dusk') { ctx.globalAlpha = 0.25; ctx.fillStyle = '#ff9a6a'; ctx.fillRect(0, 0, W, 30); ctx.globalAlpha = 1; }
  }

  function tileRow(name, row, frameFn, o = {}) {
    for (let c = 0; c < 14; c++) if (!blit(name, frameFn ? frameFn(c) : 0, c * CELL, row * CELL, o)) return false;
    return true;
  }
  function fallbackRow(row, top, bot) {
    ctx.fillStyle = kit.lin(ctx, 0, row * CELL, 0, row * CELL + CELL, [top, bot]); ctx.fillRect(0, row * CELL, W, CELL);
  }

  function laneOf(g, row) { return g.level && g.level.lanes ? g.level.lanes.find((l) => l.row === row) : null; }

  function drawGroundRows(g, t, env) {
    // row 0 storefront
    if (!blit('bg_microcenter', 0, 0, 0)) { if (!blit('bg_canopy', 0, 0, 0)) { fallbackRow(0, GPAL.leafD, GPAL.leaf); } }
    // row 1: wall tiles then bays
    if (!tileRow('bay_wall', 1)) { ctx.fillStyle = GPAL.leaf; ctx.fillRect(0, CELL, W, CELL); ctx.fillStyle = GPAL.leafD; ctx.fillRect(0, CELL, W, 3); }
    // river body: painted gradient, then animated tiles
    ctx.fillStyle = kit.lin(ctx, 0, 2 * CELL, 0, 7 * CELL, [[0, GPAL.waterL], [0.5, GPAL.water], [1, GPAL.waterD]]); ctx.fillRect(0, 2 * CELL, W, 5 * CELL);
    for (const row of ROW.river) tileRow('tile_water', row, (c) => Math.floor(t * 2.5 + c * 0.7 + row), { alpha: 0.82 });
    tileRow('tile_water_edge', 2, (c) => Math.floor(t * 2 + c), { alpha: 0.9 });
    // median
    if (!tileRow('tile_median', 7, (c) => (c + (c >> 2)) & 1)) fallbackRow(7, GPAL.path, GPAL.pathD);
    // road
    for (const row of ROW.road) if (!tileRow('tile_road', row, null)) fallbackRow(row, GPAL.road, GPAL.roadD);
    // start strip + bottom rows
    if (!tileRow('tile_start', 13, (c) => (c + (c >> 1)) & 1)) fallbackRow(13, GPAL.path, GPAL.pathD);
    if (!tileRow('tile_start', 14, (c) => (c + 1 + (c >> 2)) & 1)) fallbackRow(14, GPAL.pathD, GPAL.moss);
    if (!blit('bg_burger', 0, 0, 15 * CELL)) fallbackRow(15, GPAL.curb, GPAL.roadD);
    // soft depth: dark band under the river bank, shade below the median
    ctx.fillStyle = kit.lin(ctx, 0, 7 * CELL - 3, 0, 7 * CELL + 2, [rgba(GPAL.ink, 0), rgba(GPAL.ink, 0.18)]); ctx.fillRect(0, 7 * CELL - 3, W, 5);
    ctx.fillStyle = kit.lin(ctx, 0, 2 * CELL, 0, 2 * CELL + 5, [rgba(GPAL.ink, 0.22), rgba(GPAL.ink, 0)]); ctx.fillRect(0, 2 * CELL, W, 5);
    ctx.fillStyle = kit.lin(ctx, 0, 8 * CELL - 4, 0, 8 * CELL, [rgba(GPAL.ink, 0), rgba(GPAL.ink, 0.14)]); ctx.fillRect(0, 8 * CELL - 4, W, 4);
    // road lane dashes (soft strokes) and curb lines
    ctx.lineCap = 'round'; ctx.lineWidth = 1;
    for (let r = 9; r <= 12; r++) {
      const y = r * CELL + 0.5; ctx.strokeStyle = rgba(GPAL.roadLine, 0.5); ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(1, y); ctx.lineTo(W - 1, y); ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.strokeStyle = rgba(GPAL.curb, 0.7); ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(0, 8 * CELL + 0.6); ctx.lineTo(W, 8 * CELL + 0.6); ctx.moveTo(0, 13 * CELL - 0.6); ctx.lineTo(W, 13 * CELL - 0.6); ctx.stroke();
    // water: flowing highlights and ambient ripples
    for (const row of ROW.river) {
      const lane = laneOf(g, row), dir = lane ? lane.dir : (row % 2 ? 1 : -1), sp = lane ? lane.speed * 0.6 : 14, y0 = row * CELL;
      ctx.lineCap = 'round';
      for (let i = 0; i < 7; i++) {
        const seed = row * 31 + i, x = mod(hash(seed) * (W + 40) + dir * t * (sp + hash(seed + 5) * 6), W + 40) - 20, y = y0 + 3 + hash(seed + 9) * 10;
        const a = 0.25 + 0.3 * Math.abs(Math.sin(t * 1.3 + seed)), len = 4 + hash(seed + 3) * 7;
        ctx.strokeStyle = rgba(GPAL.foam, a); ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x - len / 2, y); ctx.quadraticCurveTo(x, y - 1.2, x + len / 2, y); ctx.stroke();
      }
      for (let i = 0; i < 2; i++) {
        const seed = row * 17 + i, per = 3.2 + hash(seed) * 2, ph = mod(t / per + hash(seed + 1), 1), x = hash(seed + 2) * W, y = y0 + 4 + hash(seed + 4) * 8;
        ctx.strokeStyle = rgba(GPAL.foam, 0.45 * (1 - ph)); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(x, y, 1 + ph * 7, 0.5 + ph * 2.4, 0, 0, TAU); ctx.stroke();
      }
    }
    // swaying grass on the strips
    drawGrass(t, env);
    // lanterns (visible, glow comes from the lighting pass)
    drawLanternPosts(t, env);
    // start strip sign pole
    blit('bk_pole', Math.floor(t * 1.5), 0, 13 * CELL);
  }

  const GRASS_ROWS = [[1, 0.3], [7, 1], [13, 1], [14, 0.6]];
  function drawGrass(t, env) {
    const tintA = env.theme === 'night' ? '#3c7a5a' : GPAL.leaf, tintB = env.theme === 'night' ? '#5a9a7a' : GPAL.leafL;
    for (const [row, density] of GRASS_ROWS) {
      const n = Math.round(34 * density), y0 = row * CELL;
      for (let pass = 0; pass < 2; pass++) {
        ctx.beginPath();
        for (let i = 0; i < n; i++) {
          const seed = row * 101 + i, bx = hash(seed) * W, by = y0 + (row === 7 ? 1 : 2) + hash(seed + 1) * (CELL - 4);
          if (row === 1 && (BAY_X.some((cx) => Math.abs(bx - cx) < 18))) continue;
          const h = 3 + hash(seed + 2) * 3, sw = kit.sway(t, seed * 0.37, 1.6, 1);
          for (let b = -1; b <= 1; b++) {
            if ((b + 1 + pass) % 2 === 0 && pass === 1) continue;
            ctx.moveTo(bx + b * 0.9, by); ctx.quadraticCurveTo(bx + b * 1.2 + sw * 0.4, by - h * 0.6, bx + b * 1.8 + sw, by - h);
          }
        }
        ctx.lineWidth = 0.7; ctx.lineCap = 'round'; ctx.strokeStyle = rgba(pass ? tintB : tintA, 0.85); ctx.stroke();
      }
      // flowers
      for (let i = 0; i < Math.round(8 * density); i++) {
        const seed = row * 77 + i, fx = hash(seed) * W, fy = y0 + 3 + hash(seed + 1) * 9;
        if (row === 1 && BAY_X.some((cx) => Math.abs(fx - cx) < 18)) continue;
        const sw = kit.sway(t, seed, 0.5, 1), col = [GPAL.flower1, GPAL.flower2, GPAL.flower3][i % 3];
        ctx.fillStyle = col; ctx.beginPath(); ctx.arc(fx + sw, fy, 1.1, 0, TAU); ctx.fill(); ctx.fillStyle = '#fff6dc'; ctx.beginPath(); ctx.arc(fx + sw, fy, 0.4, 0, TAU); ctx.fill();
      }
    }
  }

  const LANTERNS = [[40, 7 * CELL + 3], [184, 7 * CELL + 3], [24, 13 * CELL + 3], [200, 13 * CELL + 3], [112, 13 * CELL + 3]];
  function drawLanternPosts(t, env) {
    for (const [x, y] of LANTERNS) {
      ctx.fillStyle = rgba(GPAL.ink, 0.25); ctx.beginPath(); ctx.ellipse(x, y + 9, 2.5, 0.9, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = GPAL.trunk; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(x, y + 9); ctx.lineTo(x, y - 3); ctx.stroke();
      rrect(x - 2, y - 7, 4, 5, 1.2, env.warm || env.dark ? '#ffd88a' : '#e8d3a0');
      ctx.fillStyle = GPAL.trunk; ctx.fillRect(x - 2.4, y - 7.6, 4.8, 1);
    }
  }

  // ------------------------------------------------------------ bays
  function drawBays(g, t) {
    const bays = g.bays && g.bays.length ? g.bays : BAY_X.map((cx) => ({ cx }));
    bays.forEach((b, i) => {
      const cx = b.cx ?? BAY_X[i], x0 = cx - 16;
      let name = 'bay_empty', fr = 0;
      if (b.hazard === 'croc' || b.hazard === 'snake') { name = 'bay_' + b.hazard; fr = b.open ? 2 : (b.warn ? 1 : 0); }
      if (!blit(name, fr, x0, CELL)) {
        if (!blit('bay_empty', 0, x0, CELL)) {
          rrect(x0 + 1, CELL + 1, 30, 14, 5, GPAL.waterD); rrect(x0 + 3, CELL + 3, 26, 10, 4, GPAL.water);
        }
        if (b.hazard) { rrect(cx - 6, CELL + 5, 12, 7, 3, b.open ? GPAL.carRed : GPAL.pickle); }
      }
      if (b.filled) {
        const lvl = g.state === 'levelclear';
        drawGlow('#fff0a0', cx, CELL + 8, 20, 14, 0.35 + 0.15 * Math.sin(t * 3 + i));
        blit('colby_home', Math.floor(t * 2 + i), cx - 16, CELL) || rrect(cx - 7, CELL + 3, 14, 11, 5, GPAL.fur);
        const jump = lvl ? Math.abs(Math.sin(t * 8 + i)) * 2.5 : 0;
        blit(lvl ? 'nerd_cheer' : 'nerd', lvl ? Math.floor(t * 6 + i) : i, cx, CELL - jump);
      } else if (b.bonus && (b.bonusT === undefined || b.bonusT > 0)) {
        if (!(b.bonusT !== undefined && b.bonusT < 1 && Math.floor(t * 10) % 2)) {
          const by = Math.sin(t * 4 + i) * 1;
          drawGlow('#fff6b0', cx, CELL + 8 + by, 12, 10, 0.4);
          if (!blit('bay_' + b.bonus, Math.floor(t * 3), cx - 8, CELL + by)) rrect(cx - 4, CELL + 6 + by, 8, 6, 3, b.bonus === 'mouse' ? '#c9c4d4' : GPAL.carBlue);
        }
      }
    });
  }

  // ------------------------------------------------------------ lane items
  function rowOfItem(it) { return it.lane && typeof it.lane === 'object' && it.lane.row !== undefined ? it.lane.row : Math.floor((it.y ?? 0) / CELL); }
  function fallbackItem(it, x, y, w) {
    const k = it.kind;
    if (k.startsWith('log')) rrect(x, y + 2, w, 12, 5, GPAL.trunk);
    else if (k.startsWith('turtle')) { for (let i = 0; i < w / 16; i++) { ctx.fillStyle = it.state === 'under' ? rgba(GPAL.waterD, 0.8) : GPAL.moss; ctx.beginPath(); ctx.ellipse(x + i * 16 + 8, y + 8, 7, 6, 0, 0, TAU); ctx.fill(); } }
    else if (k === 'croc') { rrect(x, y + 3, w, 10, 5, GPAL.leafD); rrect(it.dir > 0 ? x + w - 16 : x, y + 4, 16, 8, 4, it.state === 'open' ? GPAL.carRed : GPAL.leaf); }
    else { const col = { car: GPAL.carRed, racer: GPAL.carYellow, bike: GPAL.carGreen, dozer: GPAL.carYellow, truck: GPAL.carBlue, bus: GPAL.carYellow, limo: GPAL.inkSoft, roller: GPAL.gold }[k] || GPAL.carRed; rrect(x + 1, y + 3, w - 2, 10, 3, col); rrect(x + 3, y + 5, Math.max(2, w - 8), 3, 1.5, '#cfe6f2'); }
  }
  function drawItems(items, t) {
    const list = items.slice().sort((a, b) => rowOfItem(a) - rowOfItem(b));
    for (const it of list) {
      const k = it.kind, row = rowOfItem(it), y = row * CELL, w = it.w ?? 16, x = it.x, dir = it.dir || 1, river = !ROAD_KINDS.has(k);
      if (x > W || x + w < 0) continue;
      const seed = (it.item && it.item.id !== undefined ? it.item.id : Math.round(x)) | 0;
      if (!river) {
        kit.softShadow(ctx, x + w / 2, y + 13.2, w * 0.52, 2.6, 0.38);
        const s = spr(k), nfr = s && s.frames ? s.frames.length : 2;
        const fr = typeof it.frame === 'number' ? it.frame : (k === 'roller' ? Math.floor(x / 4) : Math.floor(t * 8 + seed));
        const bob = k === 'roller' ? 0 : Math.sin(t * 14 + seed) * 0.12;
        if (!blit(k, mod(fr, nfr), x, y + bob, { flip: dir < 0 })) fallbackItem(it, x, y, w);
        continue;
      }
      // water wake: soft ripples and foam around the item
      ctx.fillStyle = rgba(GPAL.ink, 0.16); ctx.beginPath(); ctx.ellipse(x + w / 2, y + 12, w / 2 + 1, 3.2, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = rgba(GPAL.foam, 0.55); ctx.lineWidth = 0.7; ctx.lineCap = 'round';
      for (let i = 0; i < 2; i++) {
        const ph = mod(t * 0.7 + i * 0.5 + seed * 0.13, 1);
        ctx.globalAlpha = 0.7 * (1 - ph); ctx.beginPath(); ctx.ellipse(x + w / 2, y + 11, w / 2 + 1 + ph * 4, 3 + ph * 2, 0, 0, TAU); ctx.stroke();
      }
      ctx.globalAlpha = 1;
      if (k.startsWith('log')) {
        const bob = Math.sin(t * 2 + seed) * 0.5;
        if (!blit(k, 0, x, y + bob)) fallbackItem(it, x, y + bob, w);
      } else if (k.startsWith('turtle')) {
        const n = Math.max(1, Math.round(w / 16)), st = it.state || 'up';
        for (let i = 0; i < n; i++) {
          const bob = st === 'up' ? Math.sin(t * 2.4 + i * 1.7 + seed) * 0.8 : 0, tx = x + i * 16, ty = y + bob;
          const has = typeof it.frame === 'number', f = has ? it.frame + i : Math.floor(t * 2 + i);
          let ok;
          if (st === 'under') ok = blit('turtle_under', f, tx, y, { alpha: 0.7 });
          else if (st === 'sink' || st === 'rise') ok = blit('turtle_sink', has ? it.frame : (st === 'sink' ? Math.floor(t * 6) % 3 : 2 - (Math.floor(t * 6) % 3)), tx, y);
          else ok = blit('turtle_up', f, tx, ty, { flip: dir < 0 });
          if (!ok) fallbackItem({ ...it, w: 16 }, tx, ty, 16);
        }
      } else if (k === 'croc') {
        if (!blit(it.state === 'open' ? 'croc_open' : 'croc_closed', Math.floor(t * 2 + seed), x, y, { flip: dir < 0 })) fallbackItem(it, x, y, w);
      } else fallbackItem(it, x, y, w);
    }
  }

  // ------------------------------------------------------------ Colby, Pete, extras
  function colbyPose(g, t, alpha) {
    const p = g.player; if (!p) return null;
    let x = p.x; const y = p.y;
    if (p.mode === 'riding' && p.riding && g.level && g.level.lanes) { const lane = g.level.lanes.find((l) => l.row === p.row); if (lane) x += lane.dir * lane.speed * alpha * (1 / 60); }
    const hop = p.mode === 'hop' ? clamp(p.hopT || 0, 0, 1) : 0, arc = Math.sin(Math.PI * hop);
    let along = 1, across = 1;
    if (p.mode === 'hop') {
      along = 1 + 0.3 * arc; across = 1 - 0.14 * arc;
      if (hop < 0.18) { const k = 1 - hop / 0.18; along *= 1 - 0.14 * k; across *= 1 + 0.1 * k; }
      if (hop > 0.78) { const k = (hop - 0.78) / 0.22; along *= 1 - 0.16 * Math.sin(Math.PI * k); across *= 1 + 0.12 * Math.sin(Math.PI * k); }
    } else if (p.mode === 'idle' || p.mode === 'riding') { const br = Math.sin(t * 2.6) * 0.025; along = 1 - br; across = 1 + br; }
    const bob = p.mode === 'riding' ? Math.sin(t * 3.3 + x * 0.05) * 0.7 : 0;
    return { x, y, hop, arc, along, across, lift: arc * 6, bob, vert: p.facing === 'up' || p.facing === 'down' };
  }
  function drawColby(g, t, alpha) {
    const p = g.player, o = colbyPose(g, t, alpha); if (!o || p.mode === 'dead' || p.mode === 'home') return;
    const k = 1 - o.arc * 0.45;
    kit.softShadow(ctx, o.x, o.y + 7.2 + o.bob * 0.3, 7 * k, 2.6 * k, 0.4 - o.arc * 0.15);
    let name, frame = p.frame | 0, a = 1, dy = 0;
    if (p.mode === 'squash') { name = 'colby_squash'; frame = Math.min(2, frame); }
    else if (p.mode === 'drown') { name = 'colby_drown'; const kk = clamp((p.deathT || 0) / 1.0, 0, 1); frame = Math.min(3, p.frame ? p.frame : Math.floor(kk * 4)); a = 1 - kk * 0.4; dy = kk * 3; }
    else { name = 'colby_' + (p.facing || 'up'); frame = p.mode === 'hop' ? (o.arc > 0.35 ? 1 : 0) : 0; }
    ctx.save();
    ctx.globalAlpha = a;
    ctx.translate(o.x, o.y + 7 - o.lift + o.bob + dy);
    if (o.vert) ctx.scale(o.across, o.along); else ctx.scale(o.along, o.across);
    const ok = blit(name, frame, -8, -15);
    if (!ok) { rrect(-6, -12, 12, 12, 5, GPAL.fur); rrect(-6, -14, 3, 3, 1, GPAL.furD); rrect(3, -14, 3, 3, 1, GPAL.furD); rrect(-6, -4, 12, 2.5, 1, GPAL.scarf); ctx.fillStyle = GPAL.eye; ctx.fillRect(-3, -8, 2, 2); ctx.fillRect(1, -8, 2, 2); }
    ctx.restore();
  }
  function drawPete(g, t) {
    const pe = g.pete; if (!pe || pe.mode === 'hidden' || pe.mode === 'none') return;
    const y = ROW.median * CELL, dir = pe.dir || 1;
    if (pe.mode === 'taunt') {
      const x = clamp(pe.x ?? 190, 16, W - 16) - 16, by = Math.sin(t * 5) * 0.8;
      kit.softShadow(ctx, x + 16, y + 14, 12, 3, 0.35);
      if (!blit('pete_taunt', Math.floor(t * 3), x, y - 16 + by)) { rrect(x + 6, y - 8 + by, 20, 24, 6, GPAL.peteSuit); rrect(x + 8, y - 14 + by, 16, 9, 4, GPAL.peteFur); }
      return;
    }
    const x = (pe.x ?? 0) - 12;
    kit.softShadow(ctx, x + 12, y + 14, 11, 2.8, 0.38);
    if (!blit('pete_walk', Math.floor(t * 6), x, y, { flip: dir < 0 })) { rrect(x + 2, y + 4, 20, 10, 4, GPAL.peteSuit); rrect(dir > 0 ? x + 14 : x, y + 2, 10, 7, 3, GPAL.peteFur); }
  }
  function drawExtras(g, t) {
    for (const e of g.extra || []) {
      const row = e.row ?? ROW.median, y = row * CELL, x = e.x;
      kit.softShadow(ctx, x + 8, y + 13.5, 8, 2.2, 0.35);
      const spin = Math.floor(e.x / 4) * (e.vx < 0 ? -1 : 1);
      if (!blit('roller', spin, x, y, { flip: (e.vx || 0) < 0 })) { ctx.fillStyle = GPAL.gold; ctx.beginPath(); ctx.ellipse(x + 8, y + 8, 7, 6, 0, 0, TAU); ctx.fill(); }
    }
  }

  // ------------------------------------------------------------ ambient: petals, fireflies, dragonflies, dapple
  function drawPetals(env, t) {
    if (env.theme === 'night') return;
    const n = 16;
    for (let i = 0; i < n; i++) {
      const sp = 5 + hash(i) * 6, fall = 9 + hash(i + 11) * 9;
      const x = mod(hash(i + 3) * (W + 40) + t * sp + Math.sin(t * 0.9 + i) * 8, W + 40) - 20, y = mod(hash(i + 7) * 280 + t * fall, 270) - 10;
      const rot = t * (1 + hash(i)) + i, sx = 0.5 + 0.5 * Math.abs(Math.sin(t * 1.6 + i));
      ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.scale(1, sx);
      ctx.fillStyle = rgba(i % 3 === 0 ? '#ffd9e2' : i % 3 === 1 ? '#fff0a0' : '#ffb3c4', 0.85); ctx.beginPath(); ctx.ellipse(0, 0, 1.7, 0.9, 0, 0, TAU); ctx.fill(); ctx.restore();
    }
  }
  function fireflyPos(i, t) { return { x: mod(hash(i) * W + Math.sin(t * 0.5 + i * 2.1) * 14 + t * 2 * (hash(i + 4) - 0.5), W), y: 20 + hash(i + 20) * 200 + Math.sin(t * 0.7 + i) * 8, a: Math.pow(0.5 + 0.5 * Math.sin(t * (1 + hash(i + 8)) * 1.5 + i * 3), 2) }; }
  function drawFireflies(env, t) {
    if (env.theme === 'day') return;
    const n = env.theme === 'night' ? 26 : 10;
    for (let i = 0; i < n; i++) { const f = fireflyPos(i, t); drawGlow('#e8ff90', f.x, f.y, 6, 6, 0.8 * f.a); ctx.fillStyle = rgba('#fffbd0', 0.9 * f.a); ctx.beginPath(); ctx.arc(f.x, f.y, 0.7, 0, TAU); ctx.fill(); }
  }
  function drawDragonflies(env, t) {
    if (env.theme !== 'day') return;
    for (let i = 0; i < 3; i++) {
      const ph = t * (0.18 + i * 0.05) + i * 2, x = mod(ph * 60 + i * 80, W + 30) - 15, y = 3 * CELL + 6 + Math.sin(t * 1.1 + i * 2) * 14 + i * 14;
      const beat = Math.sin(t * 40 + i) > 0 ? 1 : 0.4;
      ctx.save(); ctx.translate(x, y);
      ctx.strokeStyle = rgba('#e8f6ff', 0.65); ctx.lineWidth = 0.6; ctx.beginPath(); ctx.ellipse(-0.5, -1.4 * beat, 2.6, 0.8, -0.3, 0, TAU); ctx.ellipse(-0.5, 1.4 * beat, 2.6, 0.8, 0.3, 0, TAU); ctx.stroke();
      ctx.strokeStyle = i % 2 ? '#ff8aa0' : '#4aa6cf'; ctx.lineWidth = 1; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(3, 0); ctx.stroke(); ctx.restore();
    }
  }
  function drawDapple(env, t) {
    if (env.theme !== 'day' && env.theme !== 'dusk') return;
    const lt = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
    const warm = env.theme === 'dusk' ? '#ff9a50' : '#fff2b0';
    for (let i = 0; i < 9; i++) {
      const x = mod(hash(i) * W + Math.sin(t * 0.25 + i * 1.7) * 18 + t * 2, W + 60) - 30, y = 14 + hash(i + 5) * 220 + Math.sin(t * 0.31 + i) * 10;
      drawGlow(warm, x, y, 22 + hash(i + 2) * 14, 14 + hash(i + 3) * 8, env.theme === 'dusk' ? 0.16 : 0.2);
    }
    // light shafts
    ctx.fillStyle = kit.lin(ctx, 0, 0, 80, 120, [rgba('#fff6c8', env.theme === 'dusk' ? 0.1 : 0.14), rgba('#fff6c8', 0)]);
    for (let i = 0; i < 3; i++) { const x = 40 + i * 70 + Math.sin(t * 0.2 + i) * 8; ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x + 24, 0); ctx.lineTo(x + 84, H); ctx.lineTo(x + 40, H); ctx.closePath(); ctx.fill(); }
    ctx.globalCompositeOperation = lt;
    // drifting cloud shadows (day)
    if (env.theme === 'day') {
      const cl = getClouds();
      if (cl.length) for (let i = 0; i < 3; i++) { const k = cl[i % cl.length], x = mod(hash(i + 40) * (W + 140) + t * (3 + i), W + 140) - 90, y = 40 + i * 70 + hash(i) * 20; ctx.globalAlpha = 0.07; ctx.save(); ctx.translate(x, y); ctx.filter = 'none'; ctx.fillStyle = '#2d3a6a'; ctx.beginPath(); ctx.ellipse(k.w * 0.6, k.h * 0.6, k.w * 0.8, k.h * 0.5, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      ctx.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------ lighting (night darkness with holes, dusk tint, headlights, lanterns)
  function drawLighting(g, t, items, env) {
    const worldH = 14 * CELL;
    if (env.warm > 0.02) {
      ctx.fillStyle = kit.lin(ctx, 0, 0, 0, worldH, [rgba('#ff8f5a', 0.3), rgba('#d8506a', 0.26), rgba('#5a3a8a', 0.3)]); ctx.fillRect(0, 0, W, H);
    }
    const lights = [];
    for (const it of items) {
      if (!ROAD_KINDS.has(it.kind)) continue;
      const dir = it.dir || 1, row = rowOfItem(it), fx = dir > 0 ? it.x + it.w : it.x;
      lights.push({ x: fx + dir * 14, y: row * CELL + 8, rx: 26, ry: 11, k: 1 }, { x: it.x + it.w / 2, y: row * CELL + 8, rx: it.w * 0.7 + 6, ry: 9, k: 0.55 });
    }
    for (const [x, y] of LANTERNS) lights.push({ x, y: y - 4, rx: 30, ry: 26, k: 0.95 });
    const p = g.player; if (p && p.mode !== 'dead' && p.mode !== 'home') lights.push({ x: p.x, y: p.y, rx: 26, ry: 22, k: 0.9 });
    if (env.theme === 'night') {
      if (!cache.dark) { try { cache.dark = makeCanvas(448, 512); cache.darkCtx = cache.dark.getContext('2d'); } catch { cache.dark = false; } }
      const dk = cache.darkCtx;
      if (dk) {
        dk.setTransform(2, 0, 0, 2, 0, 0); dk.globalCompositeOperation = 'source-over'; dk.globalAlpha = 1; dk.clearRect(0, 0, W, H);
        dk.fillStyle = kit.lin(dk, 0, 0, 0, H, [rgba('#0a0f3a', 0.7), rgba('#12185a', 0.66)]); dk.fillRect(0, 0, W, H);
        dk.globalCompositeOperation = 'destination-out';
        const hole = (l, a) => { const c = glow('#ffffff'); if (c) { dk.globalAlpha = clamp(a * l.k, 0, 1); dk.drawImage(c, l.x - l.rx, l.y - l.ry, l.rx * 2, l.ry * 2); } };
        for (const l of lights) { hole(l, 1); hole({ ...l, rx: l.rx * 0.6, ry: l.ry * 0.6 }, 0.8); }
        for (let i = 0; i < 26; i++) { const f = fireflyPos(i, t); hole({ x: f.x, y: f.y, rx: 10, ry: 10, k: 0.7 * f.a }, 1); }
        hole({ x: 40, y: 14, rx: 40, ry: 34, k: 0.6 }, 1);
        dk.globalAlpha = 1; dk.globalCompositeOperation = 'source-over';
        ctx.drawImage(cache.dark, 0, 0, W, H);
      }
    }
    // additive glows: headlight cones, tail lights, lanterns
    const lt = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
    const gl = 0.6 * env.dark + 0.28 * env.warm;
    if (gl > 0.01) {
      for (const it of items) {
        if (!ROAD_KINDS.has(it.kind)) continue;
        const dir = it.dir || 1, y = rowOfItem(it) * CELL, fx = dir > 0 ? it.x + it.w - 6 : it.x + 6 - 24;
        ctx.globalAlpha = gl;
        if (!blit('glow_head', 0, fx, y, { flip: dir < 0 })) drawGlow('#fff3b0', dir > 0 ? it.x + it.w + 8 : it.x - 8, y + 8, 18, 9, 0.9);
        drawGlow('#ff5040', dir > 0 ? it.x : it.x + it.w, y + 8, 5, 5, 0.7);
        ctx.globalAlpha = 1;
      }
      for (const [x, y] of LANTERNS) { drawGlow('#ffcf70', x, y - 4, 16, 16, gl * (0.9 + 0.1 * Math.sin(t * 5 + x))); }
    }
    ctx.globalCompositeOperation = lt; ctx.globalAlpha = 1;
  }

  // ------------------------------------------------------------ event particles
  function spawn(p) { if (parts.length < 400) parts.push(Object.assign({ age: 0, life: 0.6, x: 0, y: 0, vx: 0, vy: 0, g: 0, r: 1, color: '#fff', kind: 'dot', rot: 0, vr: 0 }, p)); }
  function addRipple(x, y, life = 0.9, r = 9) { if (ripples.length < 30) ripples.push({ x, y, age: 0, life, r }); }
  const rnd = (() => { let s = 12345; return () => { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; return s / 4294967296; }; })();
  const handlers = {
    hop: (e) => { const x = e.x ?? 0, y = e.y ?? 0; for (let i = 0; i < 4; i++) spawn({ kind: 'puff', x: x + (rnd() - 0.5) * 6, y: y + 6, vx: (rnd() - 0.5) * 22, vy: -3 - rnd() * 6, life: 0.4 + rnd() * 0.2, r: 1.6 + rnd(), color: '#fff6e0' }); },
    land_log: (e) => { addRipple(e.x ?? 0, (e.y ?? 0) + 4, 0.7, 8); },
    splash: (e) => { const x = e.x ?? 0, y = e.y ?? 0; addRipple(x, y + 3, 1.2, 14); addRipple(x, y + 3, 0.9, 8); for (let i = 0; i < 14; i++) spawn({ kind: 'drop', x, y, vx: (rnd() - 0.5) * 50, vy: -30 - rnd() * 40, g: 140, life: 0.7, r: 1 + rnd() * 0.8, color: i % 2 ? GPAL.foam : GPAL.waterL }); },
    squash: (e) => { const x = e.x ?? 0, y = e.y ?? 0; for (let i = 0; i < 8; i++) spawn({ kind: 'puff', x, y, vx: (rnd() - 0.5) * 50, vy: (rnd() - 0.5) * 30 - 6, life: 0.6, r: 2 + rnd() * 1.5, color: '#fff0d6' }); for (let i = 0; i < 5; i++) { const a = rnd() * TAU; spawn({ kind: 'star', x, y: y - 2, vx: Math.cos(a) * 36, vy: Math.sin(a) * 36 - 10, g: 40, life: 0.8, r: 2.2, color: GPAL.gold, vr: 6 }); } },
    death: (e) => { if (e.cause === 'drown') return; },
    home: (e) => { const x = e.x ?? 0; for (let i = 0; i < 22; i++) { const a = rnd() * TAU, s = 20 + rnd() * 40; spawn({ kind: 'petal', x, y: 24, vx: Math.cos(a) * s, vy: Math.sin(a) * s * 0.6 - 18, g: 26, life: 1.4 + rnd() * 0.6, r: 1.6, color: ['#ffb3c4', '#fff0a0', '#ffd9e2'][i % 3], vr: 5 }); } },
    bonus: (e) => { const x = e.x ?? (e.bay != null ? BAY_X[e.bay] : 100); for (let i = 0; i < 10; i++) { const a = rnd() * TAU; spawn({ kind: 'star', x, y: 24, vx: Math.cos(a) * 30, vy: Math.sin(a) * 30, life: 0.9, r: 2, color: GPAL.gold, vr: 5 }); } },
    turtle_dive: (e) => { for (let i = 0; i < 5; i++) spawn({ kind: 'bubble', x: (e.x ?? 100) + (rnd() - 0.5) * 12, y: (e.lane != null ? (typeof e.lane === 'number' ? e.lane : 4) : 4) * CELL + 10, vx: 0, vy: -10, life: 0.9, r: 1 + rnd(), color: GPAL.foam }); },
    croc_snap: (e) => { addRipple(e.x ?? 100, (typeof e.lane === 'number' ? e.lane : 4) * CELL + 10, 0.8, 12); },
    level_clear: () => { for (let i = 0; i < 40; i++) spawn({ kind: 'petal', x: rnd() * W, y: -4, vx: (rnd() - 0.5) * 20, vy: 20 + rnd() * 30, g: 0, life: 3, r: 1.6, color: ['#ffb3c4', '#fff0a0', '#ffd9e2', '#b9a2ff'][i % 4], vr: 4 }); },
  };
  function updateParticles(dt) {
    for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.age += dt; if (p.age >= p.life) { parts.splice(i, 1); continue; } p.vy += p.g * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt; if (p.kind === 'puff') { p.vx *= 0.94; p.vy *= 0.94; } }
    for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].age += dt; if (ripples[i].age >= ripples[i].life) ripples.splice(i, 1); }
  }
  function drawParticles() {
    for (const r of ripples) { const k = r.age / r.life; ctx.strokeStyle = rgba(GPAL.foam, 0.8 * (1 - k)); ctx.lineWidth = 0.8; ctx.beginPath(); ctx.ellipse(r.x, r.y, 2 + k * r.r, 1 + k * r.r * 0.4, 0, 0, TAU); ctx.stroke(); }
    for (const p of parts) {
      const k = p.age / p.life, a = 1 - k;
      if (p.kind === 'puff') { drawGlow(p.color, p.x, p.y, p.r * (1.5 + k * 2), p.r * (1.5 + k * 2), 0.6 * a); }
      else if (p.kind === 'drop') { ctx.fillStyle = rgba(p.color, 0.9 * a); ctx.beginPath(); ctx.ellipse(p.x, p.y, p.r * 0.8, p.r * 1.1, 0, 0, TAU); ctx.fill(); }
      else if (p.kind === 'bubble') { ctx.strokeStyle = rgba(p.color, 0.8 * a); ctx.lineWidth = 0.5; ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.stroke(); }
      else if (p.kind === 'star') {
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillStyle = rgba(p.color, a); ctx.beginPath();
        for (let i = 0; i < 8; i++) { const rr = i % 2 ? p.r * 0.45 : p.r, an = (i / 8) * TAU; ctx.lineTo(Math.cos(an) * rr, Math.sin(an) * rr); }
        ctx.closePath(); ctx.fill(); ctx.restore();
      } else if (p.kind === 'petal') { ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.scale(1, 0.55 + 0.45 * Math.abs(Math.sin(p.rot * 1.3))); ctx.fillStyle = rgba(p.color, 0.95 * Math.min(1, a * 2)); ctx.beginPath(); ctx.ellipse(0, 0, p.r * 1.2, p.r * 0.7, 0, 0, TAU); ctx.fill(); ctx.restore(); }
      else { ctx.fillStyle = rgba(p.color, a); ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, TAU); ctx.fill(); }
    }
  }

  // ------------------------------------------------------------ popups, time warning
  function drawPopups(g) {
    ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
    for (const q of g.popups || []) {
      const life = q.ttl || 1, k = clamp(1 - (q.age || 0) / life, 0, 1), pop = 1 + 0.35 * Math.max(0, 1 - (q.age || 0) * 6);
      ctx.save(); ctx.globalAlpha = Math.min(1, k * 2.5); ctx.translate(q.x, q.y - 3); ctx.scale(pop, pop);
      ctx.font = 'bold 7px "Trebuchet MS", "Segoe UI", sans-serif'; ctx.lineWidth = 2; ctx.strokeStyle = rgba(GPAL.ink, 0.85); ctx.strokeText(String(q.text), 0, 0); ctx.fillStyle = '#ffe98a'; ctx.fillText(String(q.text), 0, 0); ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
  function drawTimeWarning(g, t) {
    if (g.state !== 'play' || g.timeLeft === undefined || g.timeLeft >= 8) return;
    const k = (8 - g.timeLeft) / 8, pulse = 0.5 + 0.5 * Math.sin(t * (4 + k * 6));
    ctx.fillStyle = kit.radial(ctx, 112, 128, 80, 190, [[0, 'rgba(255,60,50,0)'], [1, rgba('#ff3a30', (0.18 + 0.3 * k) * pulse)]]); ctx.fillRect(0, 0, W, H);
  }

  // ------------------------------------------------------------ main draw
  function items(g) {
    if (!g.level) return [];
    try { return (visibleItems || fallbackVisible)(g.level, g.t || 0) || []; } catch { return fallbackVisible(g.level, g.t || 0); }
  }
  function fallbackVisible(def, t) {
    const out = [];
    for (const lane of (def && def.lanes) || []) for (const item of lane.items || []) {
      const w = item.w ?? 16, x = mod((item.x0 || 0) + lane.dir * lane.speed * t, lane.ring) - lane.pad;
      if (x + w <= 0 || x >= W) continue;
      out.push({ lane, item, row: lane.row, kind: item.kind, x, y: lane.row * CELL + 8, w, dir: lane.dir, state: null, frame: Math.floor(t * 2) % 2 });
    }
    return out;
  }

  const api = {
    get missing() { return [...missing]; },
    get sprites() { return sprites; },
    setSprites(s) { sprites = s; missing.clear(); },
    setSettings(s) { settings = s || {}; },
    setVisibleItems(f) { visibleItems = f; },
    items,
    attach(b) { api.detach(); bus = b; if (bus && bus.on) offs = Object.keys(handlers).map((k) => bus.on(k, handlers[k])); return () => api.detach(); },
    detach() { for (const o of offs) { try { if (typeof o === 'function') o(); } catch { /* ignore */ } } offs = []; },
    resize() { /* canvas is owned by the caller; logical scale is derived from ctx.canvas.width */ },
    clearFx() { parts.length = 0; ripples.length = 0; },
    particleCount() { return parts.length + ripples.length; },
    draw(g, alpha = 0, dt) {
      const t = g.t || 0;
      let step = dt;
      if (step === undefined) { const running = g.state === 'play' || g.state === 'dying'; step = lastT === null ? 0 : (running ? Math.max(0, t - lastT) : 1 / 60); if (g.paused) step = 0; }
      step = clamp(step, 0, 0.1); lastT = t; clock += step; updateParticles(step);
      const cs = ctx.canvas && ctx.canvas.width ? ctx.canvas.width / W : S;
      ctx.setTransform(cs, 0, 0, cs, 0, 0); ctx.imageSmoothingEnabled = true; try { ctx.imageSmoothingQuality = 'high'; } catch { /* ignore */ }
      ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over';
      missing.clear();
      const env = envOf(g), its = items(g);
      ctx.save();
      drawSky(env, t);
      drawGroundRows(g, t, env);
      drawBays(g, t);
      drawItems(its, t);
      drawPete(g, t);
      drawExtras(g, t);
      if (g.player) drawColby(g, t, alpha);
      drawParticles();
      drawDragonflies(env, t);
      drawPetals(env, t);
      if (!toon) drawDapple(env, t);
      drawLighting(g, t, its, env);
      drawFireflies(env, t);
      drawTimeWarning(g, t);
      const vg = toon ? null : getVignette(); if (vg) { ctx.globalAlpha = 1; ctx.drawImage(vg, 0, 0, W, H); }
      const gr = toon ? null : getGrain(); if (gr) { ctx.globalAlpha = 0.9; ctx.drawImage(gr, 0, 0, W, H); ctx.globalAlpha = 1; }
      drawPopups(g);
      ctx.restore();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
    },
  };
  if (bus) api.attach(bus);
  return api;
}

export { createGhibliRenderer as createRenderer, rowY };
export default createGhibliRenderer;
