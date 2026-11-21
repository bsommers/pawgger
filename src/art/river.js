// Art module river: logs, turtles, crocs and animated water tiles. Pure & deterministic PixBuf drawing, palette from defs.PAL only.
// Platform sprites face RIGHT (croc head at the right end); the renderer mirrors for dir -1.
import { PixBuf, ink, shade, mix, hash2 } from './pixbuf.js';
import { PAL } from '../core/defs.js';

const OUT = PAL.outline;
const done = (pb) => pb.outline(OUT, { diagonal: true });
const sprite = (w, h, draw) => { const pb = new PixBuf(w, h); draw(pb); return done(pb); };
const A = (c, a) => ink(c, { a });

// ---- logs -----------------------------------------------------------------------------------------
// Top-down trunk: bark body rows 1..14, ring end caps at both ends, bark furrows and a few knots.
function log(w, seed) {
  return sprite(w, 16, (pb) => {
    pb.rect(3, 2, w - 6, 12, PAL.log);
    pb.rect(2, 3, w - 4, 10, PAL.log);
    pb.rect(1, 5, w - 2, 6, PAL.log);
    pb.hline(3, 2, w - 6, shade(PAL.log, 1.25));              // lit top edge
    pb.hline(3, 3, w - 6, shade(PAL.log, 1.1));
    pb.hline(3, 13, w - 6, PAL.logD);                          // shaded underside
    pb.hline(2, 12, w - 4, shade(PAL.logD, 1.25));
    // bark furrows: short dark dashes along the length at rows 5, 8, 10 with deterministic gaps
    for (const [row, step] of [[5, 7], [8, 9], [10, 6]]) {
      for (let x = 5 + (hash2(row, seed) % 4); x < w - 6; x += step + (hash2(x, row, seed) % 3)) pb.hline(x, row, 2 + (hash2(x, row) % 3), PAL.logD);
    }
    // knots (small dark rings with a light centre)
    const n = Math.max(1, Math.floor(w / 36));
    for (let k = 0; k < n; k++) {
      const kx = Math.floor(((k + 0.5) * (w - 16)) / n) + 8 + (hash2(k, seed) % 5), ky = 6 + (hash2(k, seed + 9) % 4);
      pb.rect(kx, ky, 3, 2, PAL.logD); pb.set(kx + 1, ky, PAL.logRing);
    }
    // end caps with growth rings
    for (const cx of [3, w - 4]) {
      pb.ellipse(cx, 8, 2, 5, PAL.logRing);
      pb.ellipse(cx, 8, 1, 3, shade(PAL.logRing, 0.8));
      pb.set(cx, 8, PAL.logD);
    }
    // one broken branch stub on the shaded side for charm
    pb.rect(Math.floor(w * 0.6), 14, 2, 1, PAL.logD);
  });
}

// ---- turtles (swim, sink warning, under) -----------------------------------------------------------
function shellBody(pb, cx, cy, rx, ry, base, light, dark) {
  pb.ellipse(cx, cy, rx, ry, base);
  pb.hline(cx - rx + 2, cy - ry + 1, rx * 2 - 3, light);
  pb.hline(cx - rx + 2, cy + ry - 1, rx * 2 - 3, dark);
  // hex scute pattern
  pb.rect(cx - 1, cy - 1, 3, 3, dark);
  pb.set(cx, cy, light);
  pb.vline(cx - 3, cy - 1, 3, dark); pb.vline(cx + 3, cy - 1, 3, dark);
}
function turtleUp(f) {
  return sprite(16, 16, (pb) => {
    const k = f ? 1 : 0;
    // flippers (paddling: alternate pairs)
    pb.rect(3, 2 + k, 3, 3, PAL.turtle); pb.rect(3, 11 - k, 3, 3, PAL.turtle);
    pb.rect(9, 1 + (1 - k), 3, 3, PAL.turtle); pb.rect(9, 12 + k - 1 + (1 - k) * 0, 3, 3, PAL.turtle);
    // tail + head (right)
    pb.rect(0, 7, 3, 2, PAL.turtle);
    pb.rect(12, 6, 4, 4, PAL.turtle); pb.set(14, 6 + k * 0, PAL.white); pb.set(14, 7, PAL.outline);
    pb.set(13, 9, PAL.turtleD);
    shellBody(pb, 7, 8, 6, 5, PAL.turtleShell, PAL.turtleL, PAL.turtleD);
    pb.hline(3, 4, 8, PAL.turtleL);
  });
}
// Sink warning: 0 = foam ring + shell lower, 1 = shell half under tinted water + bubbles, 2 = only a pale ghost shell with a red-ish flash.
function turtleSink(f) {
  const pb = new PixBuf(16, 16);
  const water = (c, a) => A(c, a);
  if (f === 0) {
    pb.ring(7, 8, 8, 7, PAL.foam, 1);                          // foam ring: it is going down
    pb.rect(12, 7, 3, 2, PAL.turtle); pb.rect(1, 7, 2, 2, PAL.turtle);
    shellBody(pb, 7, 8, 5, 4, PAL.turtleShell, PAL.turtleL, PAL.turtleD);
    pb.set(2, 3, PAL.bubble); pb.set(12, 13, PAL.bubble);
  } else if (f === 1) {
    pb.ring(7, 8, 8, 7, PAL.foam, 1); pb.ring(7, 8, 6, 5, water(PAL.waterL, 200), 1);
    pb.ellipse(7, 8, 5, 4, mix(PAL.turtleShell, PAL.water, 0.5));
    pb.hline(4, 6, 6, mix(PAL.turtleL, PAL.waterL, 0.5));
    pb.rect(6, 7, 3, 3, mix(PAL.turtleD, PAL.water, 0.5));
    pb.rect(12, 7, 2, 2, mix(PAL.turtle, PAL.water, 0.5));
    for (const [x, y] of [[3, 2], [11, 3], [13, 12], [2, 13]]) pb.set(x, y, PAL.bubble);
  } else {
    pb.ring(7, 8, 8, 7, water(PAL.foam, 230), 1);
    pb.ellipse(7, 8, 4, 3, mix(PAL.turtleD, PAL.water, 0.7));
    pb.set(7, 8, mix(PAL.turtleL, PAL.waterL, 0.6));
    pb.circle(3, 3, 1, PAL.bubble); pb.circle(12, 4, 1, PAL.bubble); pb.circle(11, 12, 1, PAL.bubble); pb.circle(4, 12, 1, PAL.bubble);
    pb.set(7, 1, PAL.red); pb.set(7, 14, PAL.red);              // "!" flash marks: unmistakable last warning
  }
  return f === 2 ? pb : done(pb);
}
function turtleUnder(f) {
  const pb = new PixBuf(16, 16);                               // no outline: the water shows through, only bubbles and a faint shadow
  pb.ellipse(7, 8, 5, 3, A(PAL.waterD, 110));
  const o = f ? 1 : 0;
  const bub = [[5, 9 - o], [9, 5 + o], [11, 10 - o], [3, 4 + o], [13, 7]];
  bub.forEach(([x, y], i) => {
    if (i % 2 === 0) { pb.circle(x, y, 1, PAL.bubble); pb.set(x - 1, y - 1, PAL.white); }
    else pb.set(x, y, PAL.bubble);
  });
  return pb;
}

// ---- crocodile (64x16, back 48 px + head 16 px at the RIGHT end) -----------------------------------
function crocBody(pb, f) {
  const k = f ? 1 : 0;
  // tail tapering left, wagging
  pb.poly([[0, 7 + k], [8, 4], [8, 12], [0, 9 + k]], PAL.croc);
  // back
  pb.rect(8, 2, 40, 12, PAL.croc);
  pb.rect(6, 4, 3, 8, PAL.croc);
  pb.hline(8, 2, 40, shade(PAL.croc, 1.2));
  pb.hline(8, 13, 40, PAL.crocD); pb.hline(8, 12, 40, shade(PAL.crocD, 1.3));
  // spine scutes: two staggered rows of bumps
  for (let x = 9; x < 46; x += 4) {
    pb.rect(x, 5, 2, 2, PAL.crocD); pb.set(x, 5, shade(PAL.croc, 1.3));
    pb.rect(x + 2, 9, 2, 2, PAL.crocD); pb.set(x + 2, 9, shade(PAL.croc, 1.3));
  }
  pb.hline(8, 7, 40, shade(PAL.croc, 0.9)); pb.hline(8, 8, 40, shade(PAL.croc, 0.9));
  // legs poking out (top & bottom)
  pb.rect(14, 0, 4, 2, PAL.crocD); pb.rect(14, 14, 4, 2, PAL.crocD);
  pb.rect(36, 0, 4, 2, PAL.crocD); pb.rect(36, 14, 4, 2, PAL.crocD);
  // neck joining head
  pb.rect(46, 3, 4, 10, PAL.croc);
}
function crocClosed(f) {
  return sprite(64, 16, (pb) => {
    crocBody(pb, f);
    // head: rounded snout 48..63 with eyes bumps and nostrils
    pb.rect(48, 3, 12, 10, PAL.croc);
    pb.rect(60, 5, 3, 6, PAL.croc); pb.rect(59, 4, 2, 8, PAL.croc);
    pb.hline(48, 3, 12, shade(PAL.croc, 1.2));
    pb.hline(48, 12, 12, PAL.crocD);
    pb.hline(51, 8, 11, PAL.crocD);                             // closed mouth seam
    pb.rect(51, 3, 3, 2, PAL.crocD); pb.rect(51, 11, 3, 2, PAL.crocD); // eye sockets
    pb.set(52, 3, f ? PAL.crocD : PAL.fireL); pb.set(52, 12, f ? PAL.crocD : PAL.fireL);        // eyes (blink on frame 1)
    pb.set(62, 6, PAL.crocD); pb.set(62, 10, PAL.crocD);        // nostrils
    pb.set(54, 8, PAL.tooth); pb.set(57, 8, PAL.tooth); pb.set(60, 8, PAL.tooth); // a hint of teeth
  });
}
function crocOpen(f) {
  return sprite(64, 16, (pb) => {
    crocBody(pb, f);
    // gape: upper jaw (rows 1..5) and lower jaw (rows 10..14) flung apart, hot-pink mouth between, big teeth.
    const jawH = f ? 6 : 5;                                    // frame 1: jaws snap wider
    pb.rect(48, 5, 14, 6, PAL.crocMouth);                      // mouth interior
    pb.rect(46, 4, 4, 8, PAL.crocMouth);
    pb.rect(48, 1, 15, jawH - 1, PAL.croc);                    // upper jaw
    pb.rect(48, 16 - jawH, 15, jawH - 1, PAL.croc);            // lower jaw
    pb.rect(62, 1, 1, 3, PAL.croc);
    pb.hline(48, 1, 15, shade(PAL.croc, 1.2)); pb.hline(48, 14, 15, PAL.crocD);
    pb.hline(48, jawH - 1, 15, PAL.crocD); pb.hline(48, 16 - jawH, 15, PAL.crocD);
    // tongue
    pb.rect(50, 7, 8, 2, shade(PAL.crocMouth, 0.8));
    // big white teeth: triangles pointing into the mouth from both jaws, alternating
    for (let i = 0; i < 5; i++) {
      const x = 49 + i * 3;
      pb.vline(x, jawH, 2 + (i % 2), PAL.tooth); pb.vline(x + 1, jawH, 1, PAL.tooth);
      pb.vline(x + (i % 2), 16 - jawH - 2 - (i % 2), 2 + (i % 2), PAL.tooth);
    }
    pb.set(49, 7, PAL.red); pb.set(49, 8, PAL.red);            // throat glow: danger
    pb.rect(51, 1, 3, 2, PAL.crocD); pb.set(52, 1, PAL.red);   // angry red eyes
    pb.rect(51, 13, 3, 2, PAL.crocD); pb.set(52, 14, PAL.red);
  });
}

// ---- water tiles (seamless on both axes: every feature is periodic over 16 px) ----------------------
const wrap = (v) => ((v % 16) + 16) % 16;
function put(pb, x, y, c) { pb.set(wrap(x), wrap(y), c); }
// Wave rows at fixed y; a ripple highlight slides by 4 px per frame (period 16 => 4 frames loop exactly).
const WAVES = [[2, 0], [6, 7], [10, 3], [13, 11]];             // [row, x phase]
function waterBase(pb) {
  pb.fill(PAL.water);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const h = hash2(x, y, 41);
    if (h % 11 === 0) pb.set(x, y, mix(PAL.water, PAL.waterD, 0.45));   // static dark grain
  }
}
function ripples(pb, f, rows) {
  for (const [row, ph] of rows) {
    const s = ph + f * 4;
    for (let i = 0; i < 5; i++) put(pb, s + i, row, PAL.waterL);        // 5-px highlight
    put(pb, s - 1, row, mix(PAL.water, PAL.waterL, 0.5)); put(pb, s + 5, row, mix(PAL.water, PAL.waterL, 0.5));
    for (let i = 1; i < 4; i++) put(pb, s + i + 2, row + 1, PAL.waterD);   // trough under the crest
  }
}
function tileWater(f) {
  const pb = new PixBuf(16, 16);
  waterBase(pb);
  ripples(pb, f, WAVES);
  // sparkle that appears on a different spot each frame
  const sp = [[3, 4], [11, 1], [8, 12], [14, 9]][f];
  put(pb, sp[0], sp[1], PAL.white);
  return pb;
}
// Water against a bank: top 5 rows are the (periodic, wavy) riverbank, then a foam line, then water below.
function tileEdge(f) {
  const pb = new PixBuf(16, 16);
  waterBase(pb);
  ripples(pb, f, [[9, 2], [13, 9]]);
  const lip = (x) => 4 + [0, 1, 1, 0, 0, 1, 0, 0][(x >> 1) & 7] + ((x % 4 === 3) ? 1 : 0);  // bank lower edge (period 16)
  for (let x = 0; x < 16; x++) {
    const e = lip(x);
    for (let y = 0; y < e; y++) pb.set(x, y, y < 2 ? PAL.grass : (y < e - 1 ? PAL.dirt : PAL.dirtL));
    if (x % 3 === 0) pb.set(x, 0, PAL.grassD);
    if (hash2(x, 1, 7) % 3 === 0) pb.set(x, 1, PAL.grassD);
    pb.set(x, 2, hash2(x, 2, 5) % 4 === 0 ? PAL.dirtD : PAL.dirt);
    pb.set(x, e, PAL.dirtD);                                  // wet shadow line
    // foam creeping in and out with the frame
    const fo = (x + f * 4) % 16;
    if (fo < 9) pb.set(x, e + 1, fo % 4 === 3 ? PAL.waterL : PAL.foam);
    else pb.set(x, e + 1, PAL.waterL);
  }
  return pb;
}

export function build() {
  return {
    log_s: [log(48, 1)], log_m: [log(80, 2)], log_l: [log(112, 3)],
    turtle_up: [turtleUp(0), turtleUp(1)],
    turtle_sink: [turtleSink(0), turtleSink(1), turtleSink(2)],
    turtle_under: [turtleUnder(0), turtleUnder(1)],
    croc_closed: [crocClosed(0), crocClosed(1)],
    croc_open: [crocOpen(0), crocOpen(1)],
    tile_water: [0, 1, 2, 3].map(tileWater),
    tile_water_edge: [0, 1, 2, 3].map(tileEdge),
  };
}
export default build;
