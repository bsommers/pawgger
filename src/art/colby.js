// art module 'colby': Colby (orange tabby jungle explorer, top-down 3/4 view) and Perring Parkway Pete (smug rat mob boss).
// Pure + deterministic; PixBuf only; colours from defs.PAL. Characters get a 1px PAL.outline (added last, so art stays
// inside a 1px margin: feet end on row h-2, the outline row is h-1).
import { PixBuf } from './pixbuf.js';
import { PAL } from '../core/defs.js';

const OUT = PAL.outline;
const isArt = (b, x, y) => { const p = (y * b.w + x) * 4; return b.rgba[p + 3] >= 128 && !(b.rgba[p] === 0x1a && b.rgba[p + 1] === 0x14 && b.rgba[p + 2] === 0x20); };
const copyPx = (b, sx, sy, dx, dy) => { const s = (sy * b.w + sx) * 4, d = (dy * b.w + dx) * 4; for (let k = 0; k < 4; k++) { b.rgba[d + k] = b.rgba[s + k]; b.mat[d + k] = b.mat[s + k]; } };
const clearPx = (b, x, y) => { const d = (y * b.w + x) * 4; for (let k = 0; k < 4; k++) { b.rgba[d + k] = 0; b.mat[d + k] = 0; } };
/** If art touches a border row/column the 1px outline would be clipped: squeeze one row/column out near that edge. */
function fit(b) {
  const touches = (fn, n) => { for (let t = 0; t < n; t++) { const [x, y] = fn(t); if (isArt(b, x, y)) return true; } return false; };
  if (touches((t) => [t, 0], b.w)) { for (let y = 2; y >= 1; y--) for (let x = 0; x < b.w; x++) copyPx(b, x, y - 1, x, y); for (let x = 0; x < b.w; x++) clearPx(b, x, 0); }
  if (touches((t) => [0, t], b.h)) { for (let x = 2; x >= 1; x--) for (let y = 0; y < b.h; y++) copyPx(b, x - 1, y, x, y); for (let y = 0; y < b.h; y++) clearPx(b, 0, y); }
  if (touches((t) => [b.w - 1, t], b.h)) { for (let x = b.w - 3; x <= b.w - 2; x++) for (let y = 0; y < b.h; y++) copyPx(b, x + 1, y, x, y); for (let y = 0; y < b.h; y++) clearPx(b, b.w - 1, y); }
  return b;
}
const done = (b) => fit(b).outline(OUT);

// ------------------------------------------------------------------ Colby parts (16x16, centre between x=7 and x=8)

function ears(b, y) {
  for (const [x, d] of [[3, 1], [12, -1]]) {
    b.set(x, y, PAL.fur); b.set(x, y + 1, PAL.fur); b.set(x + d, y + 1, PAL.fur);
    b.set(x, y + 1, PAL.nose);
  }
}

/** Pith helmet seen from above/behind: dome, highlight, band, brim. y = dome top row. */
function helmet(b, y, o = {}) {
  const w = o.w || 5;
  b.ellipse(8, y + 3, w, 3, PAL.hat);                  // dome
  b.ellipse(8, y + 4, w, 2, PAL.hat);
  b.hline(8 - w + 1, y + 5, 2 * w - 2, PAL.hatD);      // brim shadow edge
  b.hline(8 - w + 2, y + 4, 2 * w - 3, PAL.hatBand);   // band
  b.rect(6, y + 1, 3, 1, PAL.hatHL); b.set(5, y + 2, PAL.hatHL); // shine
  b.set(8, y, PAL.hatD);                               // top knob
}

function stripes(b, ys, xs) { for (const y of ys) for (const x of xs) b.set(x, y, PAL.stripe); }

function bootsPair(b, y, spread = 0) {
  for (const x of [4 - spread, 10 + spread]) { b.rect(x, y, 2, 2, PAL.boot); b.set(x, y, PAL.furD); }
}

// ---- facing UP (away from camera): hop frame 0 = crouched, 1 = stretched
function drawUp(f) {
  const b = new PixBuf(16, 16);
  const s = f ? 1 : 0;                                  // stretch
  // tail curling out the back
  const tp = f ? [[9, 12], [10, 13], [11, 14], [12, 14]] : [[9, 12], [10, 13], [10, 14], [11, 14]];
  for (let i = 0; i < tp.length; i++) b.set(tp[i][0], tp[i][1], i % 2 ? PAL.furD : PAL.fur);
  b.set(tp[3][0] + 1, tp[3][1] - 1, PAL.furL); b.set(tp[3][0], tp[3][1], PAL.furL);
  // back feet + body
  bootsPair(b, 13 + (s ? 0 : 0), s);
  b.ellipse(8, 10 - s, 4, 4, PAL.fur);
  b.rect(5, 12 - s, 6, 2, PAL.fur);
  stripes(b, [8 - s, 10 - s], [5, 6, 9, 10]); b.set(8, 12 - s, PAL.furD);
  b.set(7, 9 - s, PAL.furL); b.set(8, 9 - s, PAL.furL);
  // front paws poking past the head
  b.rect(3, 6 - s, 2, 2, PAL.cream); b.rect(11, 6 - s, 2, 2, PAL.cream);
  // scarf wrapped at the neck with a trailing end
  b.hline(4, 7 - s, 8, PAL.scarf); b.hline(5, 8 - s, 6, PAL.scarf); b.set(9, 8 - s, PAL.scarfHL);
  b.rect(10, 9 - s, 2, 3, PAL.scarf); b.set(11, 11 - s, PAL.scarfHL);
  // head, ears, helmet
  b.ellipse(8, 5 - s, 4, 3, PAL.fur);
  ears(b, 1 - s);
  helmet(b, 0 - s + 1 - 1 + 0, {});
  return done(b);
}

// ---- facing DOWN (toward camera): face visible
function face(b, cx, ey, o = {}) {
  const l = cx - 3, r = cx + 2;
  for (const x of [l, r]) {
    if (o.blink) { b.hline(x, ey + 1, 2, PAL.eyeD); continue; }
    b.rect(x, ey, 2, 2, PAL.eye); b.set(x + 1, ey + 1, PAL.eyeD); b.set(x, ey, PAL.white);
  }
  b.set(cx - 1, ey + 2, PAL.nose); b.set(cx, ey + 2, PAL.nose);
  if (o.mouth === 'open') { b.rect(cx - 1, ey + 3, 2, 1, PAL.outline); b.set(cx - 1, ey + 3, PAL.black); }
  else { b.set(cx - 1, ey + 3, PAL.furD); b.set(cx, ey + 3, PAL.furD); }
}

function drawDown(f) {
  const b = new PixBuf(16, 16);
  const s = f ? 1 : 0;
  // tail peeking up behind the shoulder
  b.set(13, 9 - s, PAL.fur); b.set(13, 8 - s, PAL.furD); b.set(13, 7 - s, PAL.fur); b.set(12, 6 - s, PAL.furL);
  // body & paws
  b.ellipse(8, 11, 4, 3, PAL.fur);
  b.rect(5, 11, 6, 2, PAL.fur);
  b.set(5, 10, PAL.stripe); b.set(10, 10, PAL.stripe); b.set(5, 12, PAL.stripe); b.set(10, 12, PAL.stripe);
  b.set(7, 11, PAL.cream); b.set(8, 11, PAL.cream); b.set(7, 12, PAL.cream); b.set(8, 12, PAL.cream);
  bootsPair(b, 13 + 0, s);
  // scarf
  b.hline(4, 9, 8, PAL.scarf); b.hline(5, 10, 6, PAL.scarf); b.set(6, 9, PAL.scarfHL);
  b.rect(10, 10, 2, 3, PAL.scarf); b.set(11, 12, PAL.scarfHL);
  // head
  b.ellipse(8, 7 - s, 5, 3, PAL.fur);
  b.rect(4, 6 - s, 8, 3, PAL.fur);
  b.hline(5, 9 - s, 6, PAL.cream);
  ears(b, 2 - s);
  face(b, 8, 6 - s);
  b.set(3, 7 - s, PAL.cream); b.set(12, 7 - s, PAL.cream);   // whisker flicks
  // helmet sits above the eyes
  b.ellipse(8, 3 - s, 5, 2, PAL.hat);
  b.hline(4, 4 - s, 8, PAL.hatBand); b.hline(3, 5 - s, 10, PAL.hatD);
  b.hline(5, 2 - s, 3, PAL.hatHL); b.set(8, 0 - s + 1, PAL.hatD);
  return done(b);
}

// ---- facing RIGHT (profile-ish 3/4): left = flipX
function drawRight(f) {
  const b = new PixBuf(16, 16);
  const s = f ? 1 : 0;
  // tail trailing left, lifted when hopping
  const ty = f ? 9 : 11;
  b.line(2, ty + 2, 5, ty, PAL.fur); b.line(1, ty + 1, 2, ty + 2, PAL.furD); b.set(1, ty, PAL.furL); b.set(0, ty + 1, PAL.furL);
  b.set(3, ty + 1, PAL.furD);
  // legs
  b.rect(f ? 3 : 5, 13, 2, 2, PAL.boot); b.rect(f ? 12 : 10, 13, 2, 2, PAL.boot);
  b.rect(f ? 3 : 5, 13, 1, 1, PAL.furD);
  // body (horizontal)
  b.ellipse(7, 10, 5, 3, PAL.fur); b.rect(3, 10, 8, 3, PAL.fur);
  stripes(b, [8, 10, 12], [5, 8]); b.hline(5, 12, 6, PAL.cream);
  // scarf ring + trailing end
  b.vline(10, 7, 6, PAL.scarf); b.vline(11, 8, 4, PAL.scarf); b.set(10, 8, PAL.scarfHL);
  b.rect(8, 7, 2, 1, PAL.scarf); b.rect(6, 6, 2, 1, PAL.scarf); b.set(6, 6, PAL.scarfHL);
  // head
  b.ellipse(11, 7, 3, 3, PAL.fur); b.rect(9, 6, 5, 3, PAL.fur);
  b.hline(10, 9, 4, PAL.cream);
  b.set(13, 7, PAL.eye); b.set(13, 6, PAL.eyeD); b.set(12, 6, PAL.white); b.set(12, 7, PAL.eye);
  b.set(14, 8, PAL.nose);
  b.set(9, 3, PAL.fur); b.set(10, 3, PAL.nose);               // far ear
  // helmet
  b.ellipse(10, 3, 4, 2, PAL.hat); b.hline(6, 4, 9, PAL.hatBand); b.hline(6, 5, 10, PAL.hatD);
  b.hline(8, 2, 3, PAL.hatHL); b.set(10, 0, PAL.hatD); b.set(10, 1, PAL.hat);
  return done(b);
}

// ---- squash: 3 frames (impact, flat, flat + stars)
function drawSquash(i) {
  const b = new PixBuf(16, 16);
  if (i === 0) {                                          // starting to squish
    b.ellipse(8, 11, 6, 3, PAL.fur); b.rect(3, 11, 10, 3, PAL.fur);
    b.ellipse(8, 8, 4, 2, PAL.hat); b.hline(4, 9, 8, PAL.hatBand);
    b.hline(4, 12, 8, PAL.furD); b.rect(5, 13, 2, 1, PAL.boot); b.rect(10, 13, 2, 1, PAL.boot);
    b.set(6, 10, PAL.white); b.set(10, 10, PAL.white);
  } else {                                                // pancake
    const y = 12;
    b.ellipse(8, y, 7, 2, PAL.fur); b.rect(2, y, 12, 2, PAL.fur);
    b.hline(3, y + 2, 10, PAL.furD);
    stripes(b, [y - 1, y + 1], [4, 7, 10]);
    b.ellipse(8, y - 2, 4, 1, PAL.hat); b.hline(5, y - 1, 6, PAL.hatBand); b.set(7, y - 3, PAL.hatHL);
    b.set(5, y, PAL.outline); b.set(6, y + 1, PAL.outline); b.set(6, y, PAL.outline); b.set(5, y + 1, PAL.outline);
    b.set(9, y, PAL.outline); b.set(10, y + 1, PAL.outline); b.set(10, y, PAL.outline); b.set(9, y + 1, PAL.outline);
    b.hline(1, y + 1, 2, PAL.scarf); b.hline(13, y, 2, PAL.scarf);        // scarf ends splayed
    b.set(1, y + 2, PAL.furL); b.set(14, y + 2, PAL.furL);                // paws
    if (i === 2) {                                        // stars circling
      for (const [x, yy] of [[2, 6], [8, 4], [13, 6]]) { b.set(x, yy, PAL.gold); b.set(x - 1, yy, PAL.goldD); b.set(x + 1, yy, PAL.goldD); b.set(x, yy - 1, PAL.gold); b.set(x, yy + 1, PAL.goldD); }
    }
  }
  return done(b);
}

// ---- drown: 4 frames (splash, sinking, helmet bobs, bubbles)
function ripple(b, y, rx, c = PAL.waterL) { b.ring(8, y, rx, Math.max(1, rx >> 1), c); }
function drawDrown(i) {
  const b = new PixBuf(16, 16);
  if (i === 0) {                                          // flailing, splash crown
    b.ellipse(8, 10, 4, 3, PAL.fur); b.ellipse(8, 6, 4, 3, PAL.fur); helmet(b, 1, { w: 4 });
    b.rect(3, 4, 2, 2, PAL.cream); b.rect(11, 4, 2, 2, PAL.cream);
    b.hline(4, 12, 8, PAL.waterL); b.hline(2, 13, 12, PAL.water);
    for (const x of [2, 4, 11, 13]) b.set(x, 11, PAL.foam);
    for (const x of [1, 14]) b.set(x, 9, PAL.foam);
    b.set(8, 8, PAL.white); b.set(7, 8, PAL.white);
  } else if (i === 1) {                                   // head & helmet above water
    b.ellipse(8, 8, 4, 3, PAL.fur); helmet(b, 2, { w: 4 });
    b.set(6, 8, PAL.white); b.set(9, 8, PAL.white); b.set(6, 9, PAL.outline); b.set(9, 9, PAL.outline);
    b.rect(3, 10, 10, 1, PAL.waterL); b.rect(1, 11, 14, 2, PAL.water); b.hline(3, 13, 10, PAL.waterD);
    b.set(14, 8, PAL.bubble); b.set(2, 9, PAL.bubble);
  } else if (i === 2) {                                   // only the helmet bobs
    b.ellipse(8, 9, 4, 2, PAL.hat); b.hline(5, 10, 6, PAL.hatBand); b.set(7, 8, PAL.hatHL); b.set(8, 7, PAL.hatD);
    b.hline(3, 11, 10, PAL.waterL); b.rect(1, 12, 14, 2, PAL.water);
    b.set(12, 7, PAL.bubble); b.set(3, 6, PAL.bubble); b.set(13, 5, PAL.foam);
  } else {                                                // ripples + bubbles
    ripple(b, 11, 6); ripple(b, 11, 3, PAL.foam);
    b.set(8, 8, PAL.bubble); b.set(9, 6, PAL.bubble); b.set(7, 4, PAL.foam); b.set(8, 5, PAL.waterL); b.set(5, 7, PAL.bubble);
  }
  return i >= 2 ? b : done(b);                            // water bits get no outline in the last frames
}

// ---- home celebration: sitting facing the camera, arms up
function drawHome(i) {
  const b = new PixBuf(16, 16);
  const hop = i ? 1 : 0;
  b.ellipse(8, 11 - hop, 4, 3, PAL.fur); b.rect(5, 11 - hop, 6, 3, PAL.fur);
  b.rect(7, 11 - hop, 2, 3, PAL.cream);
  b.rect(4, 14 - hop, 2, 1, PAL.boot); b.rect(10, 14 - hop, 2, 1, PAL.boot);
  // arms thrown up
  b.rect(2, 5 - hop, 2, 3, PAL.fur); b.rect(12, 5 - hop, 2, 3, PAL.fur);
  b.rect(3, 8 - hop, 2, 3, PAL.fur); b.rect(11, 8 - hop, 2, 3, PAL.fur);
  b.rect(2, 4 - hop, 2, 1, PAL.cream); b.rect(12, 4 - hop, 2, 1, PAL.cream);
  b.hline(5, 9 - hop, 6, PAL.scarf); b.set(9, 10 - hop, PAL.scarf);
  b.rect(4, 6 - hop, 8, 3, PAL.fur); b.ellipse(8, 7 - hop, 4, 2, PAL.fur);
  b.set(4, 3 - hop, PAL.fur); b.set(11, 3 - hop, PAL.fur);
  // happy closed ^ eyes, open grin
  for (const x of [5, 10]) { b.set(x, 7 - hop, PAL.eyeD); b.set(x + 1, 6 - hop, PAL.eyeD); }
  b.set(7, 8 - hop, PAL.nose); b.set(8, 8 - hop, PAL.nose);
  b.hline(7, 9 - hop, 2, PAL.black);
  b.ellipse(8, 3 - hop, 5, 2, PAL.hat); b.hline(4, 4 - hop, 8, PAL.hatBand); b.hline(5, 2 - hop, 3, PAL.hatHL); b.set(8, 0 - hop + 1, PAL.hatD);
  if (i) { b.set(0, 2, PAL.gold); b.set(15, 3, PAL.gold); b.set(1, 1, PAL.fireL); b.set(14, 1, PAL.fireL); }
  else { b.set(0, 3, PAL.gold); b.set(15, 2, PAL.gold); b.set(15, 1, PAL.fireL); }
  return done(b);
}

// ---- life icon 10x10: helmeted cat head
function drawLife() {
  const b = new PixBuf(10, 10);
  b.rect(1, 5, 8, 3, PAL.fur); b.ellipse(5, 6, 4, 2, PAL.fur);
  b.set(1, 3, PAL.fur); b.set(8, 3, PAL.fur); b.set(1, 4, PAL.nose); b.set(8, 4, PAL.nose);
  b.hline(2, 8, 6, PAL.cream);
  b.set(2, 6, PAL.eye); b.set(3, 6, PAL.eyeD); b.set(6, 6, PAL.eye); b.set(7, 6, PAL.eyeD);
  b.set(4, 7, PAL.nose); b.set(5, 7, PAL.nose);
  b.ellipse(5, 3, 3, 2, PAL.hat); b.hline(2, 4, 6, PAL.hatBand); b.set(4, 2, PAL.hatHL);
  return done(b);
}

// ------------------------------------------------------------------ Pete (smug rat mob boss)
const PS = { fur: PAL.peteFur, furD: PAL.peteFurD, suit: PAL.peteSuit, suitL: PAL.peteSuitL, stripe: PAL.peteStripe, tie: PAL.peteTie, ear: PAL.peteEar };

/** pete_walk: 24x16 side view, facing right, waddle in 2 frames */
function drawPeteWalk(f) {
  const b = new PixBuf(24, 16);
  const bob = f ? 1 : 0;
  // tail
  b.line(1, 12, 4, 10 - bob, PS.ear); b.set(0, 11, PS.ear); b.set(0, 10 + bob, PS.ear);
  // legs
  const a = f ? 1 : 0;
  b.rect(7 + a, 13, 3, 2, PAL.black); b.rect(13 - a, 13, 3, 2, PAL.black);
  b.rect(7 + a, 12, 3, 1, PS.suit); b.rect(13 - a, 12, 3, 1, PS.suit);
  // fat pinstripe body
  b.ellipse(11, 8 - bob + 1, 7, 5, PS.suit); b.rect(5, 8 - bob + 1, 13, 4, PS.suit);
  for (const x of [6, 9, 12, 15]) b.vline(x, 6 - bob + 1, 6, PS.stripe);
  b.hline(8, 5 - bob, 4, PS.suitL);
  // tie + lapel
  b.vline(17, 7 - bob, 4, PS.tie); b.set(17, 7 - bob, PAL.goldD);
  // arm with cigar-less smug hand
  b.rect(11, 9 - bob, 3, 2, PS.suitL); b.rect(13, 10 - bob, 2, 2, PS.fur);
  // head
  b.ellipse(19, 6 - bob, 3, 3, PS.fur); b.rect(17, 5 - bob, 5, 3, PS.fur);
  b.rect(21, 7 - bob, 2, 2, PS.fur); b.set(23, 8 - bob, PAL.nose);     // snout + nose
  b.set(21, 9 - bob, PAL.peteTooth);                                  // gold tooth
  b.rect(17, 1 - bob, 3, 3, PS.fur); b.rect(18, 2 - bob, 1, 1, PS.ear); // ear
  b.rect(19, 4 - bob, 4, 2, PAL.peteShade); b.set(20, 4 - bob, PAL.peteHL); // shades
  b.set(22, 6 - bob, PS.furD);
  // fedora
  b.rect(16, 1 - bob, 7, 1, PAL.black); b.rect(18, 0 - bob + 0, 4, 1, PAL.black);
  b.hline(18, 1 - bob, 4, PS.tie);
  return done(b);
}

/** pete_taunt: 32x32 front view, finger wagging / cackling */
function drawPeteTaunt(f) {
  const b = new PixBuf(32, 32);
  const j = f ? 1 : 0;
  // tail curling at the side
  b.line(24, 28, 29, 26, PS.ear); b.line(29, 26, 30, 22, PS.ear);
  // feet
  b.rect(8, 29, 6, 2, PAL.black); b.rect(18, 29, 6, 2, PAL.black);
  // fat pinstripe suit
  b.ellipse(16, 22, 10, 8, PS.suit); b.rect(6, 20, 20, 9, PS.suit);
  for (const x of [8, 11, 14, 18, 21, 24]) b.vline(x, 17, 11, PS.stripe);
  b.hline(10, 17, 5, PS.suitL);
  // shirt + tie
  b.rect(14, 17, 4, 6, PAL.white); b.rect(15, 18, 2, 8, PS.tie); b.set(15, 18, PAL.goldD); b.set(16, 24, PAL.goldD);
  // watch chain
  b.line(10, 24, 13, 25, PAL.gold);
  // arms: left hand on hip, right wagging finger
  b.rect(3, 19, 4, 7, PS.suit); b.rect(3, 26, 4, 2, PS.fur);
  b.rect(25, 17 - j, 4, 6, PS.suit); b.rect(26, 14 - j, 3, 3, PS.fur); b.set(27, 12 - j, PS.fur); b.set(27, 11 - j, PS.fur);
  // head
  b.ellipse(16, 10, 8, 6, PS.fur); b.rect(9, 8, 14, 6, PS.fur);
  // ears
  b.ellipse(8, 5, 3, 3, PS.fur); b.ellipse(24, 5, 3, 3, PS.fur); b.rect(7, 5, 2, 2, PS.ear); b.rect(23, 5, 2, 2, PS.ear);
  // snout + whiskers
  b.ellipse(16, 14, 4, 3, PAL.peteHL); b.set(15, 13, PAL.nose); b.set(16, 13, PAL.nose); b.set(15, 14, PAL.nose); b.set(16, 14, PAL.nose);
  b.hline(10, 14, 3, PAL.peteHL); b.hline(20, 14, 3, PAL.peteHL);
  // grin with gold tooth
  if (f) { b.rect(12, 15, 8, 3, PAL.black); b.rect(12, 15, 8, 1, PAL.white); b.rect(15, 15, 2, 2, PAL.peteTooth); }
  else { b.hline(12, 16, 8, PAL.black); b.rect(15, 16, 2, 2, PAL.peteTooth); b.set(11, 15, PAL.black); b.set(20, 15, PAL.black); }
  // shades
  b.rect(9, 8, 6, 3, PAL.peteShade); b.rect(17, 8, 6, 3, PAL.peteShade); b.hline(15, 8, 2, PAL.peteShade);
  b.set(10, 8, PAL.peteHL); b.set(18, 8, PAL.peteHL); b.set(11, 9, PAL.peteHL); b.set(19, 9, PAL.peteHL);
  // fedora
  b.rect(8, 3, 16, 2, PAL.black); b.rect(11, 0, 10, 4, PAL.black); b.hline(11, 3, 10, PS.tie);
  b.set(12, 1, PAL.peteFurD); b.set(13, 1, PAL.peteFurD);
  return done(b);
}

// ------------------------------------------------------------------ public build
export function build() {
  const out = {};
  out.colby_up = [drawUp(0), drawUp(1)];
  out.colby_down = [drawDown(0), drawDown(1)];
  const r = [drawRight(0), drawRight(1)];
  out.colby_right = r;
  out.colby_left = r.map((p) => p.flipX());
  out.colby_squash = [0, 1, 2].map(drawSquash);
  out.colby_drown = [0, 1, 2, 3].map(drawDrown);
  out.colby_home = [0, 1].map(drawHome);
  out.colby_life = [drawLife()];
  out.pete_walk = [0, 1].map(drawPeteWalk);
  out.pete_taunt = [0, 1].map(drawPeteTaunt);
  return out;
}
export default build;
