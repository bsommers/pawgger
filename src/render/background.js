// Backdrop, bay row, river, ground strips and the night/dusk lighting pass (owner: render).
// Pure functions of (g, t): no hidden state. Missing sprites fall back to coloured rectangles.
import { W, H, CELL, ROW, PAL, BAY_X, THEME_T01, TUNING, skyFor, rowY } from '../core/defs.js';
import { blit, rect, ellipse, ring, hash, mod, clamp, frameCount } from './scene.js';

/** Look of the current level: theme, t01 (1 = day, 0 = night), darkness 0..1, warmth 0..1. */
export function envOf(g) {
  const theme = (g && g.level && g.level.theme) || 'day';
  const t01 = THEME_T01[theme] ?? 1;
  return { theme, t01, dark: clamp((0.45 - t01) / 0.45, 0, 1), warm: clamp(1 - Math.abs(t01 - 0.3) / 0.4, 0, 1) * (t01 < 0.8 ? 1 : 0) };
}
const laneByRow = (g, row) => (g && g.level && g.level.lanes ? g.level.lanes.find((l) => l.row === row) : null);

// ------------------------------------------------------------------ sky (rows 0-1)
export function drawSky(ctx, g, t) {
  const e = envOf(g), sky = skyFor(e.t01);
  const bh = Math.ceil(2 * CELL / sky.bands.length);
  sky.bands.forEach((c, i) => rect(ctx, 0, i * bh, W, bh, c));
  const night = e.dark;
  if (sky.star > 0.05) {                                                    // twinkling stars (deterministic)
    for (let i = 0; i < 26; i++) {
      const x = Math.floor(hash(i * 3 + 1) * W), y = Math.floor(hash(i * 3 + 2) * 20), tw = Math.sin(t * (1.5 + hash(i) * 2) + i * 2.1);
      if (hash(i * 7) < sky.star) { ctx.globalAlpha = 0.45 + 0.5 * (tw * 0.5 + 0.5); ctx.fillStyle = '#fff'; ctx.fillRect(x, y, 1, 1); if (i % 7 === 0 && tw > 0.6) ctx.fillRect(x - 1, y, 3, 1); }
    }
    ctx.globalAlpha = 1;
  }
  // sun / moon disc
  const sx = e.theme === 'night' ? 36 : e.theme === 'dusk' ? 188 : 172, sy = e.theme === 'dusk' ? 20 : 9;
  const r = e.theme === 'dusk' ? 6 : 5;
  ellipse(ctx, sx, sy, r + 3, r + 3, sky.sun, 0.18); ellipse(ctx, sx, sy, r + 1, r + 1, sky.sun, 0.35); ellipse(ctx, sx, sy, r, r, sky.sun);
  if (e.theme === 'night') ellipse(ctx, sx + 2, sy - 1, r - 1, r - 1, sky.bands[3], 0.9);                   // crescent bite
  // drifting clouds (day and dusk)
  if (night < 0.6) {
    for (let i = 0; i < 3; i++) {
      const cx = mod(i * 83 + t * (2.5 + i), W + 60) - 30, cy = 5 + (i * 7) % 14;
      const col = e.theme === 'dusk' ? '#f6b8a0' : '#ffffff';
      ellipse(ctx, cx, cy, 11, 3, col, 0.8); ellipse(ctx, cx - 5, cy - 2, 6, 3, col, 0.8); ellipse(ctx, cx + 5, cy - 1, 7, 3, col, 0.8);
    }
  }
}

// ------------------------------------------------------------------ bay row (row 1) and storefront (row 0)
export function drawBays(ctx, sprites, g, t) {
  // wall tiles fill the whole row, bays are drawn over them
  for (let c = 0; c < 14; c++) if (!blit(ctx, sprites, 'bay_wall', 0, c * CELL, CELL)) { rect(ctx, c * CELL, CELL, CELL, CELL, PAL.bay); rect(ctx, c * CELL, CELL, CELL, 3, PAL.leafD); rect(ctx, c * CELL, CELL + 3, CELL, 1, PAL.leaf); }
  const bays = g.bays && g.bays.length ? g.bays : BAY_X.map((cx) => ({ cx }));
  bays.forEach((b, i) => {
    const cx = b.cx ?? BAY_X[i], x0 = cx - 16;
    const water = 0.5 + 0.5 * Math.sin(t * 2 + i);
    let name = 'bay_empty', fr = 0;
    if (b.hazard === 'croc' || b.hazard === 'snake') { name = 'bay_' + b.hazard; fr = b.open ? 2 : (b.warn ? 1 : 0); }
    if (!blit(ctx, sprites, name, fr, x0, CELL)) {
      if (!blit(ctx, sprites, 'bay_empty', 0, x0, CELL)) {                    // fallback: sunken pool
        rect(ctx, x0, CELL, 32, CELL, PAL.bayWater); rect(ctx, x0, CELL, 32, 2, PAL.leafD); rect(ctx, x0 + 2 + Math.round(water * 4), CELL + 8, 6, 1, PAL.waterL);
      }
      if (b.hazard) rect(ctx, cx - 5, CELL + 6, 10, 6, b.open ? PAL.crocMouth : (b.hazard === 'croc' ? PAL.croc : PAL.snake));
    }
    if (b.filled) {
      const lvl = g.state === 'levelclear';
      blit(ctx, sprites, 'colby_home', Math.floor(t * 2 + i), cx - 16, CELL) || (rect(ctx, cx - 14, CELL + 3, 12, 11, PAL.fur), rect(ctx, cx - 12, CELL + 6, 2, 2, PAL.eye));
      const jump = lvl ? Math.abs(Math.sin(t * 8 + i)) * 2 : 0;
      const nm = lvl ? 'nerd_cheer' : 'nerd';
      blit(ctx, sprites, nm, lvl ? Math.floor(t * 6 + i) : i, cx, CELL - Math.round(jump));
    } else if (b.bonus && (b.bonusT === undefined || b.bonusT > 0)) {
      if (!(b.bonusT !== undefined && b.bonusT < 1 && Math.floor(t * 10) % 2)) {
        const nm = 'bay_' + b.bonus, by = Math.round(Math.sin(t * 4 + i) * 1);
        if (!blit(ctx, sprites, nm, Math.floor(t * 3), cx - 8, CELL + by)) { rect(ctx, cx - 4, CELL + 6 + by, 8, 6, b.bonus === 'mouse' ? PAL.silver : PAL.tuna); rect(ctx, cx - 4, CELL + 6 + by, 2, 2, PAL.nose); }
      }
    }
  });
}

/** Candle-like fireflies drifting over the bay row; visibility grows with darkness. Returns their light points for the lighting pass. */
export function fireflies(g, t) {
  const e = envOf(g), vis = e.dark * 1 + e.warm * 0.4;
  const pts = [];
  if (vis < 0.12) return pts;
  const n = Math.round(4 + 5 * vis);
  for (let i = 0; i < n * 5; i++) {
    const bay = i % 5, cx = BAY_X[bay], h = hash(i * 13 + 5), h2 = hash(i * 17 + 9);
    const x = cx + Math.sin(t * (0.5 + h * 0.6) + h2 * 30) * 13, y = CELL + 8 + Math.sin(t * (0.7 + h2 * 0.5) + h * 40) * 5;
    const flick = 0.5 + 0.5 * Math.sin(t * (4 + h * 5) + h2 * 20);
    if (i >= n * 5 * vis) break;
    pts.push({ x, y, a: 0.45 + 0.55 * flick });
  }
  return pts;
}
export function drawFireflies(ctx, pts) {
  const lt = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  for (const p of pts) {
    const x = Math.round(p.x), y = Math.round(p.y);
    ctx.fillStyle = '#ffd25a'; ctx.globalAlpha = 0.20 * p.a; ctx.fillRect(x - 2, y - 1, 5, 3); ctx.fillRect(x - 1, y - 2, 3, 5);
    ctx.globalAlpha = 0.95 * p.a; ctx.fillStyle = '#fff6a0'; ctx.fillRect(x, y, 1, 1); ctx.globalAlpha = 0.5 * p.a; ctx.fillStyle = '#ffb030'; ctx.fillRect(x, y + 1, 1, 1);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = lt;
}

// ------------------------------------------------------------------ river (rows 2-6)
export function drawRiver(ctx, sprites, g, t) {
  const e = envOf(g), nWater = frameCount(sprites, 'tile_water') || 4;
  for (const row of ROW.river) {
    const y = row * CELL, lane = laneByRow(g, row), sp = lane ? lane.dir * lane.speed : (row % 2 ? -1 : 1) * TUNING.baseRiverSpeed[row - 2];
    const fr = Math.floor(t * 3 + row) % nWater;
    for (let c = 0; c < 14; c++) if (!blit(ctx, sprites, 'tile_water', fr, c * CELL, y)) {
      rect(ctx, c * CELL, y, CELL, CELL, (c + row) % 2 ? PAL.water : '#2a72dc');
    }
    // flowing highlight dashes (move with the lane)
    ctx.fillStyle = PAL.waterL;
    for (let i = 0; i < 5; i++) {
      const x = mod(hash(row * 9 + i) * (W + 24) + sp * t * 0.55, W + 24) - 12, yy = y + 2 + Math.floor(hash(row * 5 + i * 3) * 12), len = 3 + (i % 3) * 2;
      ctx.globalAlpha = 0.35 + 0.25 * Math.sin(t * 2 + i + row); ctx.fillRect(Math.round(x), yy, len, 1);
    }
    ctx.globalAlpha = 1;
    // sun glints (day) / moon path (night)
    if (e.dark < 0.5) { for (let i = 0; i < 4; i++) { const k = Math.sin(t * 2.6 + hash(row * 4 + i) * 20); if (k > 0.82) { rect(ctx, Math.floor(hash(row * 11 + i) * W), y + 2 + Math.floor(hash(row * 3 + i) * 12), 1, 1, '#fff'); } } }
    else { const mx = 36; for (let i = 0; i < 5; i++) { const w = 2 + Math.round(Math.sin(t * 1.5 + i + row) * 1.5); rect(ctx, mx - w + Math.round(Math.sin(t + i * 2) * 3), y + 1 + i * 3, w * 2, 1, '#cfd8ff', 0.5); } }
  }
  // shore edges: top of row 2 (bay side) and bottom of row 6 (median side)
  for (let c = 0; c < 14; c++) {
    if (!blit(ctx, sprites, 'tile_water_edge', Math.floor(t * 3 + c) % (frameCount(sprites, 'tile_water_edge') || 1), c * CELL, 2 * CELL)) { rect(ctx, c * CELL, 2 * CELL, CELL, 2, PAL.leafD); rect(ctx, c * CELL, 2 * CELL + 2, CELL, 1, PAL.foam, 0.6); }
    if (!blit(ctx, sprites, 'tile_water_edge', Math.floor(t * 3 + c) % (frameCount(sprites, 'tile_water_edge') || 1), c * CELL, 6 * CELL, { flipY: true })) { rect(ctx, c * CELL, 6 * CELL + 14, CELL, 2, PAL.dirtD); rect(ctx, c * CELL, 6 * CELL + 13, CELL, 1, PAL.foam, 0.6); }
  }
}

// ------------------------------------------------------------------ ground strips and road
export function drawGround(ctx, sprites, g, t) {
  for (let c = 0; c < 14; c++) {
    const x = c * CELL;
    // median (row 7)
    if (!blit(ctx, sprites, 'tile_median', hash(c + 40) < 0.5 ? 0 : 1, x, 7 * CELL)) { rect(ctx, x, 7 * CELL, CELL, CELL, PAL.path); rect(ctx, x, 7 * CELL, CELL, 2, PAL.pathL); rect(ctx, x + 3 + (c * 5) % 9, 7 * CELL + 6, 3, 1, PAL.pathD); rect(ctx, x, 7 * CELL + 14, CELL, 2, PAL.pathD); }
    // road (rows 8-12)
    for (const row of ROW.road) {
      const y = row * CELL;
      const nm = row > ROW.road[0] ? 'tile_road_dash' : 'tile_road';
      if (!blit(ctx, sprites, nm, 0, x, y)) {
        if (!blit(ctx, sprites, 'tile_road', 0, x, y)) { rect(ctx, x, y, CELL, CELL, PAL.asphalt); rect(ctx, x + (c * 7 + row * 3) % 14, y + 5 + (c + row) % 6, 2, 1, PAL.asphaltL); }
        if (row > ROW.road[0]) rect(ctx, x + 2, y, 8, 1, PAL.roadLine);
      }
    }
    // start strip (row 13)
    if (!blit(ctx, sprites, 'tile_start', hash(c + 90) < 0.5 ? 0 : 1, x, 13 * CELL)) { rect(ctx, x, 13 * CELL, CELL, CELL, PAL.sidewalk); rect(ctx, x, 13 * CELL, CELL, 2, PAL.curb); rect(ctx, x + 8, 13 * CELL + 9, 1, 3, PAL.curbD); }
  }
  blit(ctx, sprites, 'bk_pole', Math.floor(t * 1.5), 0, 13 * CELL);
  if (g && g.level && g.level.peteMode && g.level.peteMode !== 'none') blit(ctx, sprites, 'sign_pete', 0, W - 32, 13 * CELL);   // Pete's billboard once he patrols
}
/** HUD rows backdrop (14 = black, 15 = burger storefront / Pete ticker). Drawn after the night overlay so it stays readable. */
export function drawBottom(ctx, sprites, g) {
  rect(ctx, 0, 14 * CELL, W, CELL, PAL.hudBg);
  if (!blit(ctx, sprites, 'bg_burger', 0, 0, 15 * CELL)) rect(ctx, 0, 15 * CELL, W, CELL, '#2a1810');
  // Pete's taunt ticker panel (opaque) replaces the storefront while a line is showing; the UI draws the text over it
  if (g && g.pete && g.pete.line) { if (!blit(ctx, sprites, 'bg_ticker', 0, 0, 15 * CELL)) rect(ctx, 0, 15 * CELL, W, CELL, PAL.hudBg); }
}
/** Row 0: HUD canopy and the Micro Center storefront over the bays. */
export function drawTop(ctx, sprites) {
  if (!blit(ctx, sprites, 'bg_canopy', 0, 0, 0)) { rect(ctx, 0, 0, W, 6, PAL.leafD); for (let x = 0; x < W; x += 8) rect(ctx, x, 5, 6, 3 + (x / 8) % 3, PAL.leaf); }
  blit(ctx, sprites, 'bg_microcenter', 0, 0, 0);
}

// ------------------------------------------------------------------ night / dusk lighting
/**
 * Night/dusk grading of rows 0-13. `dark` is an offscreen canvas ctx (W x H) used as a light map: the whole map is filled
 * with a night tint, lights are punched out with destination-out, then the map is composited. Additive glows follow.
 */
export function drawLighting(ctx, sprites, g, t, items, dark, extraLights = []) {
  const e = envOf(g);
  if (e.dark <= 0.02 && e.warm <= 0.02) return;
  const worldH = 14 * CELL;
  if (e.warm > 0.02) rect(ctx, 0, 0, W, worldH, '#ff8a3a', 0.09 * e.warm);                          // dusk warmth
  if (dark && e.dark > 0.02) {
    dark.globalCompositeOperation = 'source-over'; dark.clearRect(0, 0, W, H);
    dark.globalAlpha = 0.66 * e.dark + 0.05 * e.warm; dark.fillStyle = '#04051a'; dark.fillRect(0, 0, W, worldH); dark.globalAlpha = 1;
    dark.globalCompositeOperation = 'destination-out'; dark.fillStyle = '#000';
    const punch = (cx, cy, rx, ry, k = 1) => { const lv = [[1, 0.42], [0.66, 0.5], [0.36, 0.55]]; for (const [s, a] of lv) { dark.globalAlpha = a * k; stepped(dark, cx, cy, rx * s, ry * s); } };
    for (const it of items || []) {
      if (isRoad(it.kind)) { const dir = it.dir || 1, row = Math.floor(it.y / CELL), fx = dir > 0 ? it.x + it.w : it.x; punch(fx + dir * 16, row * CELL + 8, 20, 7, 1); punch(it.x + it.w / 2, row * CELL + 8, it.w / 2 + 2, 6, 0.6); }
    }
    const p = g.player;
    if (p && p.mode !== 'dead') punch(p.x, p.y, 17, 14, 0.9);                                       // Colby carries a little glow
    for (const f of fireflies(g, t)) punch(f.x, f.y, 9, 6, 0.8 * f.a);
    for (const l of extraLights) punch(l.x, l.y, l.rx ?? 14, l.ry ?? 10, l.k ?? 1);
    dark.globalAlpha = 1; dark.globalCompositeOperation = 'source-over';
    ctx.drawImage(dark.canvas, 0, 0);
  }
  // additive headlight glows (+ tail lights)
  const lt = ctx.globalCompositeOperation; ctx.globalCompositeOperation = 'lighter';
  const glow = (0.55 * e.dark + 0.22 * e.warm);
  for (const it of items || []) {
    if (!isRoad(it.kind)) continue;
    const dir = it.dir || 1, y = Math.floor(it.y / CELL) * CELL, fx = dir > 0 ? it.x + it.w - 6 : it.x + 6 - 24;
    ctx.globalAlpha = glow;
    if (!blit(ctx, sprites, 'glow_head', 0, fx, y, { flip: dir < 0 })) {
      ctx.fillStyle = PAL.headlight;
      for (let k = 0; k < 4; k++) { const len = 20 - k * 4; ctx.globalAlpha = glow * (0.18 + 0.1 * k); ctx.fillRect(dir > 0 ? it.x + it.w - 1 : it.x + 1 - len, y + 7 - 3 + k, len, 6 - k * 2); }
    }
    ctx.globalAlpha = Math.min(1, glow * 1.4); ctx.fillStyle = PAL.tail;
    const bx = dir > 0 ? it.x : it.x + it.w - 1; ctx.fillRect(Math.round(bx), y + 5, 1, 2); ctx.fillRect(Math.round(bx), y + 10, 1, 2);
  }
  ctx.globalAlpha = 1; ctx.globalCompositeOperation = lt;
  drawFireflies(ctx, e.dark > 0.02 || e.warm > 0.02 ? fireflies(g, t) : []);
}
const isRoad = (k) => ['car', 'racer', 'bike', 'dozer', 'truck', 'bus', 'limo', 'roller'].includes(k);
function stepped(c, cx, cy, rx, ry) {
  const y0 = Math.ceil(cy - ry), y1 = Math.floor(cy + ry);
  for (let y = Math.max(0, y0); y <= Math.min(14 * CELL - 1, y1); y++) { const dy = (y + 0.5 - cy) / ry, k = 1 - dy * dy; if (k <= 0) continue; const hw = Math.round(rx * Math.sqrt(k)); if (hw > 0) c.fillRect(Math.round(cx) - hw, y, hw * 2, 1); }
}

/** Last-seconds warning: pulsing red frame around the playfield. */
export function drawTimeWarning(ctx, g, t) {
  if (g.state !== 'play' || g.timeLeft === undefined || g.timeLeft > 8) return;
  const k = (8 - g.timeLeft) / 8, pulse = 0.5 + 0.5 * Math.sin(t * (6 + k * 8));
  ctx.globalAlpha = 0.18 + 0.32 * k * pulse; ctx.fillStyle = PAL.red;
  ctx.fillRect(0, 0, W, 1); ctx.fillRect(0, 13 * CELL + 15, W, 1); ctx.fillRect(0, 0, 1, 14 * CELL); ctx.fillRect(W - 1, 0, 1, 14 * CELL);
  ctx.globalAlpha = 1;
}
export { rowY, ring };
