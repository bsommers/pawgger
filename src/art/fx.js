// Art module fx: PAWGGER logo, title scene, cursor paw, particles, treasures, touch button.
// Pure & deterministic PixBuf drawing, palette from defs.PAL only (plus shade/mix).
import { PixBuf, ink, shade, mix, hash2 } from './pixbuf.js';
import { PAL } from '../core/defs.js';
import { glyphRows } from '../ui/font.js';

const OUT = PAL.outline;
const sprite = (w, h, draw, diag = true) => { const pb = new PixBuf(w, h); draw(pb); return pb.outline(OUT, { diagonal: diag }); };
const shim = (c, e = 0.5, s = 1) => ink(c, { emit: e, spark: s });

// ---------------------------------------------------------------- logo
const WORD = 'PAWGGER';
// logo-only W: two V shapes with a centre peak and two feet (reads as W, not N, at 1x)
const LOGO_W = ['#.....#', '#.....#', '#..#..#', '#..#..#', '#.#.#.#', '##...##', '.#...#.'];
function paw(pb, cx, cy, s, pad, toe) {
  // paw print: big pad + four toes; s = scale (1 => 9px wide)
  pb.ellipse(cx, cy + 2 * s, 3 * s, 2 * s + 1, pad);
  pb.ellipse(cx - 3 * s, cy - s, s, s + 1, toe);
  pb.ellipse(cx + 3 * s, cy - s, s, s + 1, toe);
  pb.ellipse(cx - s, cy - 3 * s, s, s + 1, toe);
  pb.ellipse(cx + s, cy - 3 * s, s, s + 1, toe);
}
function logo() {
  const pb = new PixBuf(192, 48);
  const SX = 4, SY = 5, GAP = 3, EXT = 5;
  const colsOf = (ch) => (ch === 'W' ? 7 : 5);
  const total = [...WORD].reduce((a, ch) => a + colsOf(ch) * SX, 0) + (WORD.length - 1) * GAP;
  const ox = Math.floor((192 - total - EXT) / 2), oy = 3;
  const mask = new Set();
  const glyphX = [];
  let gxNext = ox;
  [...WORD].forEach((ch) => {
    const gx = gxNext; glyphX.push(gx); gxNext += colsOf(ch) * SX + GAP;
    (ch === 'W' ? LOGO_W : glyphRows(ch)).forEach((row, j) => [...row].forEach((c, k) => {
      if (c !== '#') return;
      for (let dy = 0; dy < SY; dy++) for (let dx = 0; dx < SX; dx++) mask.add((oy + j * SY + dy) * 192 + gx + k * SX + dx);
    }));
  });
  // fatten diagonals: fill pixels whose two orthogonal neighbours (diagonal pair) are set
  const has = (x, y) => mask.has(y * 192 + x);
  const add = [];
  for (let y = oy; y < oy + 7 * SY; y++) for (let x = ox; x < ox + total; x++) {
    if (has(x, y)) continue;
    if ((has(x - 1, y) && has(x, y - 1)) || (has(x + 1, y) && has(x, y + 1)) || (has(x - 1, y) && has(x, y + 1)) || (has(x + 1, y) && has(x, y - 1))) add.push(y * 192 + x);
  }
  add.forEach((v) => mask.add(v));
  const each = (fn) => { for (const v of mask) fn(v % 192, (v / 192) | 0); };
  // extrusion (back to front)
  for (let d = EXT; d >= 1; d--) each((x, y) => pb.set(x + d, y + d, d === EXT ? shade(PAL.furD, 0.7) : d >= 3 ? PAL.stripe : PAL.furD));
  // face gradient yellow (top) -> orange (bottom)
  const yTop = oy, yBot = oy + 7 * SY;
  each((x, y) => {
    const t = (y - yTop) / (yBot - yTop);
    const base = t < 0.25 ? PAL.gold : t < 0.5 ? mix(PAL.gold, PAL.furL, 0.5) : t < 0.75 ? PAL.furL : PAL.fur;
    pb.set(x, y, ink(base, { gloss: 0.5 }));
  });
  // top-edge highlight and bottom-edge shade
  each((x, y) => { if (!has(x, y - 1)) pb.set(x, y, ink(PAL.white, { gloss: 1, spark: 0.6 })); else if (!has(x, y + 1)) pb.set(x, y, PAL.fur); });
  each((x, y) => { if (!has(x - 1, y) && has(x, y - 1)) pb.set(x, y, PAL.cream); });
  // paw print stamped in the counter of the first G (index 3)
  const gx = glyphX[3];
  paw(pb, gx + 10, oy + 17, 2, ink(PAL.outline), ink(PAL.outline));
  paw(pb, gx + 10, oy + 17, 2, ink(PAL.furD), ink(PAL.furD));   // brown paw over the dark: gives a 1px edge
  // sparkle
  pb.set(ox + 5, oy - 1, ink(PAL.white, { emit: 1, spark: 1 }));
  return pb.outline(OUT, { diagonal: true });
}

// ---------------------------------------------------------------- title scene
function titleScene() {
  const W = 224, H = 96, pb = new PixBuf(W, H);
  const sky = [PAL.tunnelDark, '#2a1a4a', '#4a2a5e', '#8a3a5a', '#d6603a', '#ffa23a'];
  for (let y = 0; y < 76; y++) {
    const f = (y / 76) * (sky.length - 1), i = Math.min(sky.length - 2, f | 0), t = f - i;
    for (let x = 0; x < W; x++) {
      const dither = hash2(x, y, 7) < t ? 1 : 0;
      pb.set(x, y, sky[i + dither]);
    }
  }
  // stars
  for (let i = 0; i < 40; i++) { const x = (hash2(i, 1, 3) * W) | 0, y = (hash2(i, 2, 3) * 40) | 0; pb.set(x, y, i % 5 === 0 ? ink(PAL.white, { emit: 1, spark: 1 }) : PAL.hatHL); }
  // big moon with glow
  const mx = 150, my = 30;
  for (let r = 26; r > 15; r--) pb.ring(mx, my, r, r, mix('#4a2a5e', PAL.hatHL, (26 - r) / 22), 1);
  pb.circle(mx, my, 15, ink(PAL.white, { emit: 0.7 }));
  pb.circle(mx + 2, my + 2, 13, PAL.hatHL);
  pb.circle(mx - 1, my - 1, 13, PAL.white);
  [[-5, -4, 3], [4, 3, 4], [-3, 7, 2], [7, -6, 2]].forEach(([dx, dy, r]) => pb.circle(mx + dx, my + dy, r, mix(PAL.white, PAL.hatHL, 0.6)));
  // far jungle ridge
  const ridge = (base, amp, seed, c) => { for (let x = 0; x < W; x++) { const h = base - Math.round(amp * (Math.sin(x * 0.07 + seed) + 0.6 * Math.sin(x * 0.19 + seed * 2))); pb.rect(x, h, 1, 76 - h, c); } };
  ridge(54, 5, 1, mix(PAL.leafD, '#4a2a5e', 0.6));
  ridge(60, 4, 4, PAL.leafD);
  // big city/store lights on the far right
  for (let i = 0; i < 6; i++) pb.rect(168 + i * 9, 52 + (i % 2) * 2, 5, 12, PAL.tunnelMid);
  for (let i = 0; i < 14; i++) { const x = 169 + (hash2(i, 5, 9) * 50 | 0), y = 54 + (hash2(i, 6, 9) * 8 | 0); pb.set(x, y, ink(PAL.fireL, { emit: 1 })); }
  // palm trees (left)
  const palm = (x, y, h, lean) => {
    for (let i = 0; i < h; i++) pb.rect(x + Math.round(lean * i / h * 6) - (i < h / 2 ? 0 : 0), y - i, 2, 1, PAL.trunkD);
    const tx = x + lean * 6, ty = y - h;
    [[-9, 2], [-7, -2], [-3, -4], [3, -4], [7, -2], [9, 2], [-5, 3], [5, 3]].forEach(([dx, dy]) => {
      pb.line(tx, ty, tx + dx, ty + dy, PAL.leafDark2); pb.line(tx, ty + 1, tx + dx, ty + dy + 1, PAL.leafD);
    });
    pb.circle(tx, ty, 1, PAL.leafD);
  };
  palm(14, 72, 40, 1); palm(36, 72, 30, -1); palm(88, 72, 34, 1);
  // river bank / ground
  pb.rect(0, 72, W, 24, PAL.leafDark2);
  // river (left)
  for (let y = 74; y < H; y++) for (let x = 0; x < 112; x++) {
    const wob = Math.sin(x * 0.3 + y * 0.9) > 0.8;
    pb.set(x, y, wob ? PAL.waterL : y > 88 ? PAL.waterD : PAL.water);
  }
  pb.rect(0, 74, 112, 1, PAL.waterL);
  // moon reflection
  for (let y = 76; y < 94; y += 2) pb.hline(mx - 40 + (y % 4) * 2, y, 8, ink(PAL.hatHL, { emit: 0.4 }));
  // log with tiny Colby
  pb.ellipse(54, 84, 20, 4, PAL.log); pb.rect(34, 83, 40, 2, PAL.logD); pb.hline(40, 81, 28, PAL.logRing);
  pb.ellipse(34, 84, 2, 4, PAL.logRing);
  const cx = 52, cy = 80;
  pb.rect(cx - 3, cy - 3, 7, 5, PAL.fur); pb.rect(cx - 3, cy - 1, 7, 1, PAL.stripe);          // body
  pb.rect(cx + 3, cy - 6, 5, 4, PAL.fur); pb.set(cx + 3, cy - 7, PAL.fur); pb.set(cx + 7, cy - 7, PAL.fur); // head + ears
  pb.set(cx + 6, cy - 5, PAL.eye); pb.set(cx + 8, cy - 4, PAL.nose);
  pb.rect(cx + 2, cy - 8, 7, 1, PAL.hat); pb.rect(cx + 3, cy - 9, 5, 1, PAL.hat); pb.rect(cx + 3, cy - 8, 5, 1, PAL.hatBand);  // explorer hat
  pb.rect(cx + 1, cy - 8, 9, 1, PAL.hat);
  pb.rect(cx - 6, cy - 2, 3, 1, PAL.fur); pb.set(cx - 7, cy - 3, PAL.fur);                      // tail
  pb.rect(cx + 3, cy - 2, 5, 1, PAL.scarf);
  // road (right) with dashed line and Pete's limo
  pb.rect(112, 74, W - 112, 22, PAL.asphalt);
  pb.rect(112, 74, W - 112, 2, PAL.curb); pb.rect(112, 76, W - 112, 1, PAL.curbD);
  for (let x = 118; x < W; x += 20) pb.rect(x, 87, 10, 1, PAL.roadLine);
  for (let x = 0; x < W - 112; x++) for (let y = 77; y < 96; y++) if (hash2(x, y, 11) > 0.93) pb.set(112 + x, y, PAL.asphaltL);
  const lx = 150, ly = 76;
  pb.rect(lx, ly + 5, 56, 9, PAL.limo); pb.rect(lx + 2, ly + 3, 48, 3, PAL.limoL); pb.rect(lx + 8, ly + 4, 36, 3, PAL.window);
  for (let i = 0; i < 4; i++) pb.rect(lx + 11 + i * 9, ly + 4, 1, 3, PAL.limo);
  pb.hline(lx, ly + 5, 56, PAL.limoL); pb.hline(lx, ly + 12, 56, PAL.limoL);
  pb.rect(lx + 54, ly + 7, 3, 3, ink(PAL.headlight, { emit: 1 })); pb.rect(lx - 1, ly + 7, 2, 3, ink(PAL.tail, { emit: 1 }));
  [lx + 8, lx + 42].forEach((x) => { pb.circle(x, ly + 14, 3, PAL.tire); pb.set(x, ly + 14, PAL.hub); });
  pb.rect(lx + 22, ly + 1, 6, 2, PAL.peteShade); pb.rect(lx + 23, ly - 1, 4, 2, PAL.peteFur);  // Pete's head poking out of the sunroof
  pb.set(lx + 24, ly, PAL.peteShade); pb.set(lx + 26, ly, PAL.peteShade); pb.set(lx + 22, ly - 1, PAL.peteEar); pb.set(lx + 27, ly - 1, PAL.peteEar);
  // headlight beam
  for (let i = 1; i < 12; i++) pb.hline(lx + 57 + i, ly + 8 - (i >> 2), 1, ink(PAL.headlight, { a: 90 - i * 6 }));
  // road shadow over the horizon blend
  pb.rect(0, 72, W, 2, PAL.leafDark2);
  return pb;
}

// ---------------------------------------------------------------- cursor paw
function cursorPaw() {
  return sprite(12, 12, (pb) => {
    pb.ellipse(5, 8, 3, 2, PAL.fur);
    pb.rect(2, 4, 2, 2, PAL.fur); pb.rect(5, 2, 2, 3, PAL.fur); pb.rect(8, 4, 2, 2, PAL.fur); pb.rect(0, 6, 2, 2, PAL.fur);
    pb.set(5, 8, PAL.nose); pb.set(6, 8, PAL.nose); pb.hline(4, 9, 3, PAL.nose);
    pb.hline(5, 2, 2, PAL.furL);
  }, false);
}

// ---------------------------------------------------------------- particles
function splash(f) {
  const pb = new PixBuf(16, 16), r = [2, 4, 6, 7][f], a = [255, 255, 220, 140][f];
  for (let i = 0; i < 8; i++) {
    const ang = (i / 8) * Math.PI * 2, rr = i % 2 ? r : r * 0.7;
    const x = Math.round(8 + Math.cos(ang) * rr), y = Math.round(8 + Math.sin(ang) * rr * 0.9 - (f < 2 ? (i % 2) * 2 : -f));
    pb.set(x, y, ink(i % 3 ? PAL.waterL : PAL.foam, { a }));
    if (f < 2) pb.set(x, y + 1, ink(PAL.water, { a }));
  }
  pb.ring(8, 9, r + 1, Math.max(1, (r + 1) >> 1), ink(PAL.foam, { a: a - 40 }));
  if (f === 0) { pb.rect(7, 5, 2, 4, PAL.waterL); pb.set(7, 4, PAL.foam); }
  return pb;
}
function puff(f) {
  const pb = new PixBuf(16, 16), r = [2, 4, 5, 7][f], a = [255, 220, 160, 90][f];
  const c = mix(PAL.carWhite, PAL.carGrey, f / 3);
  [[0, 0, r], [-r / 2, 1, r * 0.7], [r / 2, 1, r * 0.7], [0, -r / 3, r * 0.6]].forEach(([dx, dy, rr]) => {
    pb.circle(Math.round(8 + dx), Math.round(8 + dy), Math.max(1, Math.round(rr)), ink(c, { a }));
  });
  pb.circle(8 - (r >> 2), 8 - (r >> 2), Math.max(1, r >> 2), ink(PAL.white, { a }));
  return pb;
}
function star(f) {
  const pb = new PixBuf(8, 8), a = [255, 255, 220, 150][f], L = [1, 3, 2, 1][f];
  const c = ink(f % 2 ? PAL.gold : PAL.white, { a, emit: 1, spark: 1 });
  pb.set(3, 3, c); pb.set(4, 3, c); pb.set(3, 4, c); pb.set(4, 4, c);
  for (let i = 1; i <= L; i++) { pb.set(3 - i, 3, c); pb.set(4 + i, 4, c); pb.set(4, 3 - i, c); pb.set(3, 4 + i, c); }
  if (f === 1) { pb.set(1, 1, ink(PAL.gold, { a })); pb.set(6, 6, ink(PAL.gold, { a })); }
  return pb;
}
function bubble(f) {
  const pb = new PixBuf(6, 6), r = [1, 2, 2][f], a = [255, 220, 150][f];
  pb.ring(3, 3, r + (f ? 0 : 0), r, ink(PAL.bubble, { a, gloss: 1 }));
  if (r === 1) pb.set(3, 3, ink(PAL.bubble, { a }));
  pb.set(2, 2, ink(PAL.white, { a, spark: 1 }));
  return pb;
}

// ---------------------------------------------------------------- treasures (12x12, 3 shimmer frames, outline included)
const SPARK = [[2, 2], [8, 3], [5, 8]];
function sparkle(pb, f, x0 = 0, y0 = 0) {
  const [x, y] = SPARK[f];
  pb.set(x0 + x, y0 + y, ink(PAL.white, { emit: 1, spark: 1 }));
  if (f !== 1) { pb.set(x0 + x - 1, y0 + y, ink(PAL.white, { a: 160, spark: 1 })); pb.set(x0 + x + 1, y0 + y, ink(PAL.white, { a: 160, spark: 1 })); }
}
function whopper(f) {
  return sprite(12, 12, (pb) => {
    // 10 wide x 10 tall at (1,1): triple-decker, 3 thick patties
    const X = 1;
    pb.rect(X + 1, 1, 8, 1, PAL.pathL); pb.rect(X, 2, 10, 2, PAL.path); pb.rect(X, 3, 10, 1, PAL.pathD);   // top bun
    pb.set(X + 2, 2, PAL.cream); pb.set(X + 5, 1, PAL.cream); pb.set(X + 7, 2, PAL.cream); pb.set(X + 4, 3 - 1, PAL.cream);
    pb.rect(X - 0, 4, 10, 1, PAL.leafM); pb.set(X + 1, 4, PAL.leafHL); pb.set(X + 5, 4, PAL.leafHL);    // lettuce
    pb.rect(X, 5, 10, 1, PAL.dirtD);                                                                       // patty 1
    pb.rect(X, 6, 10, 1, PAL.cheese);                                                                      // cheese
    pb.rect(X, 7, 10, 1, PAL.dirtL);                                                                       // patty 2
    pb.rect(X, 8, 10, 1, PAL.red); pb.set(X + 3, 8, PAL.leafM);                                            // tomato
    pb.rect(X, 9, 10, 1, PAL.dirtD);                                                                       // patty 3
    pb.rect(X, 10, 10, 1, PAL.pathD); pb.rect(X + 1, 10, 8, 1, PAL.path);                                  // bottom bun
    pb.set(X + 9, 6, PAL.cheese); pb.set(X + 9, 7, PAL.cheeseD);
    sparkle(pb, f);
  });
}
function fries(f) {
  return sprite(12, 12, (pb) => {
    [[2, 1, 7], [4, 0, 8], [6, 1, 7], [8, 0, 7], [3, 2, 6]].forEach(([x, y, h]) => { pb.rect(x, y + (f === 1 && x === 4 ? 0 : 0), 2, h, x % 4 ? PAL.cheese : PAL.cheeseD); pb.set(x, y, PAL.white); });
    pb.rect(2, 5, 8, 1, PAL.cheeseD);
    pb.poly([[1, 6], [10, 6], [9, 11], [2, 11]], PAL.red); pb.rect(1, 6, 9, 1, PAL.carRedD);
    pb.rect(4, 8, 3, 2, PAL.cheese); pb.set(5, 8, PAL.red);
    sparkle(pb, f);
  });
}
function tuna(f) {
  return sprite(12, 12, (pb) => {
    pb.rect(1, 3, 10, 7, PAL.tunaCan); pb.rect(1, 3, 10, 1, PAL.white); pb.rect(1, 9, 10, 1, PAL.silverD);
    pb.rect(1, 5, 10, 3, PAL.tunaLabel); pb.rect(2, 6, 4, 1, PAL.tuna); pb.set(6, 6, PAL.tuna); pb.set(7, 5, PAL.tuna); pb.set(7, 7, PAL.tuna);
    pb.rect(2, 2, 8, 1, PAL.silver); pb.hline(3, 1, 6, PAL.silverD);
    sparkle(pb, f);
  });
}
function sardine(f) {
  return sprite(12, 12, (pb) => {
    pb.rect(0, 3, 12, 6, PAL.silver); pb.rect(0, 8, 12, 1, PAL.silverD); pb.rect(0, 3, 12, 1, PAL.white);
    pb.rect(1, 4, 10, 4, PAL.tunaLabel);
    pb.ellipse(5, 6, 3, 1, PAL.silver); pb.hline(5, 5, 3, PAL.white); pb.set(8, 6, PAL.silver); pb.set(9, 5, PAL.silver); pb.set(9, 7, PAL.silver); pb.set(3, 6, PAL.black);
    pb.rect(10, 1, 2, 3, PAL.silverD); pb.set(11, 0, PAL.silver);   // key tab
    sparkle(pb, f);
  });
}
function gold(f) {
  return sprite(12, 12, (pb) => {
    pb.circle(5, 6, 5, PAL.goldD); pb.circle(5, 5, 4, PAL.gold); pb.circle(4, 4, 2, mix(PAL.gold, PAL.white, 0.4));
    pb.rect(5, 3, 2, 6, PAL.goldD); pb.rect(4, 4, 2, 1, PAL.goldD); pb.rect(4, 7, 3, 1, PAL.goldD);   // $-ish mark
    pb.rect(8, 7, 3, 4, PAL.gold); pb.rect(8, 7, 3, 1, PAL.goldD);                                     // little bar
    sparkle(pb, f);
    pb.setMat({ spark: 0.6, gloss: 1, emit: 0.3 }, 0, 0, 12, 12);
  });
}
function collar(f) {
  return sprite(12, 12, (pb) => {
    pb.ring(5, 5, 5, 4, PAL.scarf, 2); pb.ring(5, 5, 5, 4, PAL.red, 1);
    pb.rect(1, 3, 2, 1, PAL.carRedD);
    pb.circle(5, 10, 1, PAL.gold); pb.set(5, 10, PAL.goldD); pb.rect(4, 8, 3, 1, PAL.silver);          // bell + buckle
    pb.set(2, 5, PAL.gold); pb.set(8, 5, PAL.gold); pb.set(5, 1, PAL.gold); pb.set(9, 7, PAL.gold);   // studs
    pb.rect(9, 9, 3, 3, PAL.gem); pb.set(9, 9, PAL.white);
    sparkle(pb, f);
  });
}

// ---------------------------------------------------------------- touch button
function btnTouch(f) {
  const pb = new PixBuf(32, 32), down = f === 1;
  const fill = down ? ink(PAL.furL, { a: 210 }) : ink(PAL.hudBg, { a: 150 });
  pb.circle(16, 16, 15, ink(PAL.outline, { a: 230 }));
  pb.circle(16, 16, 14, ink(down ? PAL.fur : PAL.hudTxt, { a: 230 }));
  pb.circle(16, 16, 12, fill);
  const c = down ? ink(PAL.outline) : ink(PAL.hudTxt);
  // chevron / paw
  paw(pb, 16, 15, 2, c, c);
  if (down) pb.ring(16, 16, 12, 12, ink(PAL.white, { a: 200 }), 1);
  return pb;
}

export function build() {
  const out = {};
  out.logo = [logo()];
  out.title_scene = [titleScene()];
  out.cursor_paw = [cursorPaw()];
  out.fx_splash = [0, 1, 2, 3].map(splash);
  out.fx_puff = [0, 1, 2, 3].map(puff);
  out.fx_star = [0, 1, 2, 3].map(star);
  out.fx_bubble = [0, 1, 2].map(bubble);
  const tr = { tr_whopper: whopper, tr_fries: fries, tr_tuna: tuna, tr_sardine: sardine, tr_gold: gold, tr_collar: collar };
  for (const [k, fn] of Object.entries(tr)) out[k] = [0, 1, 2].map(fn);
  out.btn_touch = [btnTouch(0), btnTouch(1)];
  return out;
}
