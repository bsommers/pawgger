// Art module world: road, median, start lot, home bays, backdrop strips, signs, nerds. Pure & deterministic PixBuf drawing, palette from defs.PAL only.
// Story: Burger King (south/bottom, west side) to Micro Center (north/top, east side). Signage is original parody art, no real logos.
import { PixBuf, ink, shade, mix, hash2 } from './pixbuf.js';
import { PAL } from '../core/defs.js';
import { glyphRows } from '../ui/font.js';

const OUT = PAL.outline;
const sprite = (w, h, draw) => { const pb = new PixBuf(w, h); draw(pb); return pb.outline(OUT, { diagonal: true }); };

// ---- text (5x7 font glyphs, bold + outlined so signs read at 1x) ---------------------------------------------------
function glyph(pb, ch, x, y, c) {
  const rows = glyphRows(ch);
  for (let j = 0; j < rows.length; j++) for (let i = 0; i < rows[j].length; i++) if (rows[j][i] === '#') pb.set(x + i, y + j, c);
}
const adv = (ch) => (ch === ' ' ? 4 : 7);
const textW = (s) => [...s].reduce((n, ch) => n + adv(ch), 0) - 1;
function boldText(pb, s, x, y, fill, edge) {
  let cx = x;
  for (const ch of s) {
    if (ch !== ' ') {
      if (edge) for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 2; dx++) { glyph(pb, ch, cx + dx, y + dy, edge); }
      cx += adv(ch);
    } else cx += adv(ch);
  }
  cx = x;
  for (const ch of s) {
    if (ch !== ' ') { glyph(pb, ch, cx, y, fill); glyph(pb, ch, cx + 1, y, fill); }
    cx += adv(ch);
  }
}

// ---- asphalt tiles ----------------------------------------------------------------------------------------------------
// Everything is a pure function of (x mod 16, y) so the tile repeats with no seam in both directions.
function asphaltBase(pb, seed) {
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const r = hash2(x, y, seed);
    let c = PAL.asphalt;
    if (r < 0.09) c = PAL.asphaltL; else if (r < 0.2) c = PAL.asphaltD; else if (r > 0.97) c = PAL.tarL;
    if (((x + y) & 1) === 0 && hash2(x >> 1, y >> 1, seed + 3) < 0.25) c = PAL.asphaltD;   // coarse dither patches
    pb.set(x, y, c);
  }
  // a wrapped hairline crack and a pothole-ish patch
  for (const [x, y] of [[2, 12], [3, 12], [4, 13], [5, 13], [6, 14], [7, 14]]) pb.set(x, y, PAL.tarL === PAL.asphaltD ? PAL.black : PAL.tar);
  pb.set(11, 3, PAL.asphaltL); pb.set(12, 3, PAL.asphaltL); pb.set(12, 4, PAL.asphaltD);
  return pb;
}
const tileRoad = () => asphaltBase(new PixBuf(16, 16), 11);
function tileRoadDash() {
  const pb = asphaltBase(new PixBuf(16, 16), 17);
  pb.hline(2, 6, 9, shade(PAL.roadLine, 1.15)); pb.hline(2, 7, 9, PAL.roadLine); pb.hline(2, 8, 9, mix(PAL.roadLine, PAL.pathD, 0.5));
  pb.hline(3, 9, 9, PAL.asphaltD);                                          // soft shadow under the paint
  for (const x of [4, 7, 9]) pb.set(x, 7, PAL.white);                       // glints
  pb.set(2, 6, PAL.asphalt); pb.set(10, 8, PAL.asphalt);                    // worn paint corners
  return pb;
}
function tileCurb() {
  const pb = new PixBuf(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    let c;
    if (y < 9) {                                                            // sidewalk slabs with joints every 8 px
      c = PAL.sidewalk; const r = hash2(x, y, 5);
      if (r < 0.12) c = shade(PAL.sidewalk, 1.12); else if (r > 0.9) c = mix(PAL.sidewalk, PAL.curb, 0.6);
      if (x % 8 === 7 || y === 0) c = mix(PAL.sidewalk, PAL.curbD, 0.55);
    } else if (y === 9) c = shade(PAL.curb, 1.3);                           // lit lip
    else if (y < 12) c = ((x + y) & 1) && hash2(x, y, 2) < 0.3 ? PAL.curbD : PAL.curb;
    else if (y === 12) c = PAL.curbD;
    else c = ((x + y) & 1) === 0 ? PAL.asphaltD : (hash2(x, y, 4) < 0.5 ? PAL.asphalt : PAL.asphaltD);   // gutter shadow
    pb.set(x, y, c);
  }
  pb.set(5, 5, PAL.grassD); pb.set(5, 4, PAL.grass); pb.set(6, 4, PAL.leafL);   // a weed pushing through the joint
  return pb;
}

// ---- jungle median path (2 frames: leaves sway, flowers blink) ------------------------------------------------------
function tileMedian(f) {
  const pb = new PixBuf(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const r = hash2(x, y, 31);
    let c;
    if (y <= 3 || y >= 12) {                                                // grass verges
      c = r < 0.18 ? PAL.grassD : r > 0.86 ? PAL.leafL : PAL.grass;
      if (((x + y) & 1) === 0 && r < 0.5) c = y <= 3 ? PAL.grassD : PAL.grass;
      if (y === 3 || y === 12) c = r < 0.55 ? PAL.leafD : PAL.grassD;       // dark edge against the path
    } else if (y === 4 || y === 11) c = r < 0.5 ? PAL.pathD : PAL.dirtL;    // path rut edge
    else {                                                                  // packed sand/stone path
      c = PAL.path;
      if (r < 0.12) c = PAL.pathL; else if (r > 0.88) c = PAL.pathD;
      if (((x + y) & 1) === 0 && r < 0.35) c = PAL.pathL;
    }
    pb.set(x, y, c);
  }
  // pebbles
  for (const [x, y] of [[3, 7], [11, 6], [8, 9], [14, 8]]) { pb.set(x, y, PAL.dirt); pb.set(x + 1, y, PAL.dirtL); pb.set(x, y + 1, PAL.pathD); }
  // leaves lying on the path
  pb.set(6, 5, PAL.leaf); pb.set(7, 5, PAL.leafL); pb.set(12, 10, PAL.leaf); pb.set(13, 10, PAL.leafM);
  // fronds along the top verge, tips swing with the frame
  const sw = f ? 1 : 0;
  for (const bx of [2, 9]) {
    pb.set(bx, 2, PAL.leaf); pb.set(bx + 1, 1, PAL.leafM); pb.set(bx + 1 + sw, 0, PAL.leafHL); pb.set(bx - 1 - sw, 1, PAL.leafL); pb.set(bx, 1, PAL.leafM);
  }
  pb.set(13, 2, PAL.leafL); pb.set(13 + sw, 1, PAL.leafHL); pb.set(12 - sw, 2, PAL.leafM);
  // flowers on the lower verge (centres alternate yellow/white, petals blink)
  const flower = (x, y, petal, centre) => {
    pb.set(x, y, centre); pb.set(x - 1, y, f ? petal : mix(petal, PAL.leafD, 0.35)); pb.set(x + 1, y, f ? mix(petal, PAL.leafD, 0.35) : petal);
    pb.set(x, y - 1, petal); pb.set(x, y + 1, f ? petal : PAL.leafD); pb.set(x, y + 2, PAL.leaf);
  };
  flower(4, 13, PAL.scarfHL, PAL.gold); flower(11, 14, PAL.white, PAL.gold);
  pb.set(8, 13, PAL.leafHL); pb.set(15, 13, PAL.leafHL); pb.set(1, 15, PAL.leafM);
  return pb;
}

// ---- start strip: the Burger King parking lot (2 frames: puddle glint) ---------------------------------------------
function tileStart(f) {
  const pb = new PixBuf(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const r = hash2(x, y, 41);
    let c = PAL.asphalt;
    if (r < 0.14) c = PAL.asphaltL; else if (r > 0.86) c = PAL.asphaltD;
    if (((x + y) & 1) === 0 && r < 0.4) c = PAL.asphaltL;
    pb.set(x, y, c);
  }
  pb.hline(0, 3, 16, PAL.roadLine);                                         // stall front line
  pb.hline(0, 4, 16, mix(PAL.roadLine, PAL.asphalt, 0.55));
  for (let y = 5; y < 16; y++) { pb.set(0, y, PAL.roadLine); pb.set(15, y, mix(PAL.roadLine, PAL.asphalt, 0.5)); }   // stall dividers, 16 px apart
  // ketchup splat + dropped fry
  pb.set(4, 8, PAL.fireD); pb.set(5, 8, PAL.red); pb.set(4, 9, PAL.red); pb.set(6, 9, PAL.fireD);
  pb.set(3, 12, PAL.cheese); pb.set(3, 13, PAL.cheeseD); pb.set(4, 12, PAL.cheese);
  // puddle with a glint that hops between frames
  pb.hline(9, 10, 5, PAL.waterD); pb.hline(8, 11, 6, PAL.water); pb.hline(9, 12, 5, PAL.waterD);
  pb.set(f ? 12 : 10, 11, PAL.waterL); pb.set(f ? 12 : 10, 10, PAL.foam);
  return pb;
}

// ---- home bays: Micro Center glass-door alcoves with a lily pad pond --------------------------------------------------
function bayBase({ lily = true } = {}) {
  const pb = new PixBuf(32, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) {
    const r = hash2(x, y, 51);
    if (y < 8) pb.set(x, y, ((x + y) & 1) === 0 && r < 0.6 ? PAL.leafDark2 : PAL.bay);
    else {
      let c = PAL.bayWater;
      if (r < 0.2) c = PAL.waterD; else if (r > 0.9) c = PAL.water;
      if (y === 8) c = ((x & 1) === 0) ? PAL.waterL : PAL.water;            // shoreline sheen
      pb.set(x, y, c);
    }
  }
  // glass door frame: lintel, posts, mullions
  pb.hline(0, 0, 32, PAL.silver); pb.hline(0, 1, 32, PAL.silverD);
  for (const x of [0, 30]) { pb.vline(x, 0, 16, PAL.silver); pb.vline(x + 1, 0, 16, PAL.silverD); }
  for (const [x, y] of [[4, 3], [8, 5], [23, 4], [27, 6]]) { pb.set(x, y, PAL.gem); pb.set(x + 1, y + 1, PAL.gemD); }   // glass glints
  pb.hline(2, 2, 28, PAL.leafD);
  // ripples
  for (const [x, y] of [[4, 12], [26, 10], [6, 14], [24, 14], [9, 10]]) { pb.hline(x, y, 3, PAL.waterL); pb.set(x - 1, y, PAL.waterD); }
  if (lily) {
    pb.ellipse(16, 12.5, 6, 3, PAL.lilyD); pb.ellipse(16, 12, 5, 2.5, PAL.lily);
    pb.line(16, 12, 21, 10, PAL.bayWater); pb.set(17, 11, PAL.bayWater);   // pad notch
    pb.hline(12, 11, 4, shade(PAL.lily, 1.25));
    pb.set(14, 13, PAL.lilyD); pb.set(18, 13, PAL.lilyD);
    pb.rect(15, 10, 2, 2, PAL.scarfHL); pb.set(15, 9, PAL.white); pb.set(16, 10, PAL.gold);   // tiny blossom
  }
  return pb;
}
function bayWall() {
  // Micro Center wall segment between the doors: panel seams, a lit shelf with monitors and a "NEW" price tag.
  const pb = new PixBuf(16, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
    const r = hash2(x, y, 61);
    let c = PAL.peteSuit;
    if (((x + y) & 1) === 0 && r < 0.4) c = PAL.peteSuitL; else if (r > 0.9) c = mix(PAL.peteSuit, PAL.black, 0.4);
    pb.set(x, y, c);
  }
  pb.hline(0, 0, 16, PAL.silverD); pb.hline(0, 15, 16, PAL.black);
  pb.rect(2, 3, 12, 8, PAL.tunnelDark); pb.frame(2, 3, 12, 8, PAL.silverD);
  pb.rect(3, 4, 4, 3, PAL.black); pb.rect(4, 5, 2, 1, PAL.gem); pb.rect(9, 4, 4, 3, PAL.black); pb.rect(10, 5, 2, 1, PAL.green);   // two monitors
  pb.hline(3, 9, 10, PAL.window); pb.hline(3, 10, 10, PAL.windowD);                                                              // shelf glow
  pb.rect(5, 12, 6, 2, PAL.scarf); pb.hline(6, 12, 4, PAL.white);                                                               // price tag
  pb.set(2, 1, PAL.red); pb.set(13, 1, PAL.green);                                                                                // status LEDs
  return pb;
}

function croc(f) {
  const pb = bayBase({ lily: false });
  const eye = (x, y) => { pb.rect(x, y, 3, 2, PAL.croc); pb.set(x + 1, y, PAL.fireL); pb.set(x + 1, y + 1, PAL.black); pb.set(x, y, PAL.crocD); pb.set(x + 2, y, PAL.crocD); };
  if (f === 0) {                                                            // lurking: eyes and snout tip above the water, ripple rings
    pb.ring(16, 11.5, 8, 3, PAL.waterL); pb.ring(16, 11.5, 11, 4, PAL.waterD);
    eye(11, 9); eye(19, 9);
    pb.rect(13, 10, 6, 2, PAL.croc); pb.set(14, 10, PAL.black); pb.set(17, 10, PAL.black); pb.hline(14, 11, 4, PAL.crocD);
  } else if (f === 1) {                                                     // closed jaws, raised head, teeth peeking
    pb.ellipse(16, 11, 8, 4.5, PAL.crocD); pb.rect(9, 7, 14, 6, PAL.croc);
    pb.hline(10, 7, 12, shade(PAL.croc, 1.25)); pb.hline(9, 12, 14, PAL.crocD);
    eye(9, 5); eye(20, 5);
    pb.set(14, 8, PAL.black); pb.set(17, 8, PAL.black); pb.set(14, 9, PAL.crocD); pb.set(17, 9, PAL.crocD);
    for (const x of [11, 14, 17, 20]) pb.set(x, 12, PAL.tooth);
    pb.hline(8, 14, 16, PAL.waterL);
  } else {                                                                  // SNAP: jaws wide, pink mouth, fangs
    pb.rect(9, 3, 14, 4, PAL.croc); pb.hline(10, 3, 12, shade(PAL.croc, 1.25)); pb.rect(10, 6, 12, 1, PAL.crocD);
    eye(9, 1); eye(20, 1);
    pb.set(14, 4, PAL.black); pb.set(17, 4, PAL.black);
    pb.rect(10, 7, 12, 4, PAL.crocMouth); pb.hline(13, 9, 6, PAL.fireD);     // mouth + tongue
    pb.rect(9, 11, 14, 3, PAL.crocD); pb.hline(10, 11, 12, PAL.croc);        // lower jaw
    for (const x of [10, 12, 14, 16, 18, 20]) { pb.set(x, 7, PAL.tooth); if ((x & 3) === 2) pb.set(x, 8, PAL.tooth); pb.set(x + 1, 10, PAL.tooth); }
    pb.hline(8, 14, 16, PAL.waterL);
  }
  return pb;
}
function snake(f) {
  const pb = bayBase({ lily: false });
  const top = [9, 6, 2][f], ph = f * 1.3;
  for (let y = top + 4; y < 16; y++) {                                      // S-curve body with belly and diamond marks
    const cx = 16 + Math.round(Math.sin(y * 0.85 + ph) * 2.5);
    pb.rect(cx - 2, y, 4, 1, PAL.snake); pb.set(cx - 2, y, PAL.snakeD); pb.set(cx + 1, y, PAL.snakeD);
    if (y % 3 === 0) { pb.set(cx - 1, y, PAL.snakeD); pb.set(cx, y, PAL.snakeD); } else pb.set(cx, y, PAL.snakeBelly);
  }
  const hx = 16 + Math.round(Math.sin((top + 4) * 0.85 + ph) * 2.5);
  pb.ellipse(hx, top + 2.5, 4.5, 3.2, PAL.snake); pb.hline(hx - 3, top, 6, shade(PAL.snake, 1.25));
  pb.set(hx - 3, top + 2, PAL.fireL); pb.set(hx + 2, top + 2, PAL.fireL); pb.set(hx - 3, top + 3, PAL.black); pb.set(hx + 2, top + 3, PAL.black);
  if (f === 2) {                                                            // strike: open mouth, fangs, forked tongue
    pb.rect(hx - 2, top + 4, 4, 3, PAL.crocMouth); pb.set(hx - 2, top + 4, PAL.tooth); pb.set(hx + 1, top + 4, PAL.tooth);
    pb.set(hx - 2, top + 5, PAL.tooth); pb.set(hx + 1, top + 5, PAL.tooth);
  } else { pb.hline(hx - 1, top + 5, 2, PAL.snakeD); }
  if (f >= 1) { const ty = top + 7 - (f === 2 ? 1 : 0); pb.set(hx, ty, PAL.red); pb.set(hx - 1, ty + 1, PAL.red); pb.set(hx + 1, ty + 1, PAL.red); }
  pb.hline(8, 14, 16, PAL.waterL);
  return pb;
}

// ---- bonuses: a computer mouse (mouse bay) and a graphics card (fish bay) ----------------------------------------------
function mouse(f) {
  return sprite(16, 16, (pb) => {
    pb.ellipse(8, 9, 5, 5.5, PAL.silver); pb.rect(3, 7, 10, 5, PAL.silver);
    pb.ellipse(8, 9, 4.5, 5, PAL.carGrey);
    pb.hline(5, 4, 6, PAL.white); pb.set(4, 5, PAL.white); pb.set(11, 5, PAL.white);                 // highlight
    pb.hline(4, 12, 8, PAL.silverD); pb.hline(5, 13, 6, PAL.silverD);                                // underside shade
    pb.vline(8, 4, 5, PAL.silverD); pb.hline(4, 8, 9, PAL.silverD);                                  // button split
    pb.rect(7, 5, 2, 3, f ? PAL.gem : PAL.gemD);                                                     // scroll wheel (glows alternately)
    pb.set(7, 5, f ? PAL.white : PAL.gem);
    pb.set(5, 5, PAL.silver); pb.set(11, 5, PAL.silver);
    pb.set(8, 2, PAL.silverD); pb.set(8, 1, PAL.silverD); pb.set(9, 1, PAL.silverD);                 // cable
    pb.set(f ? 9 : 7, 0, PAL.silverD);
    pb.set(f ? 12 : 3, 14, PAL.green); pb.set(f ? 13 : 2, 14, PAL.green);                            // RGB underglow
  });
}
function gpu(f) {
  return sprite(16, 16, (pb) => {
    pb.rect(1, 3, 14, 9, PAL.leafD); pb.rect(1, 3, 14, 1, PAL.leaf);                                  // PCB
    pb.rect(2, 4, 12, 7, PAL.asphaltD); pb.hline(2, 4, 12, PAL.tarL);                                  // shroud
    for (const cx of [5, 11]) {                                                                         // two fans spin between frames
      pb.circle(cx, 7.5, 2.6, PAL.black); pb.circle(cx, 7.5, 0.8, PAL.silver);
      if (f) { pb.set(cx - 2, 7, PAL.silverD); pb.set(cx + 1, 7, PAL.silverD); pb.set(cx, 5, PAL.silverD); pb.set(cx, 9, PAL.silverD); }
      else { pb.set(cx - 1, 5, PAL.silverD); pb.set(cx + 1, 9, PAL.silverD); pb.set(cx - 2, 8, PAL.silverD); pb.set(cx + 2, 6, PAL.silverD); }
    }
    pb.hline(2, 10, 12, f ? PAL.green : PAL.gem);                                                      // RGB strip
    pb.rect(2, 12, 12, 2, PAL.gold); for (let x = 3; x < 14; x += 2) pb.set(x, 13, PAL.goldD);         // gold PCIe contacts
    pb.rect(0, 2, 2, 11, PAL.silver); pb.set(0, 12, PAL.silverD); pb.set(1, 5, PAL.silverD); pb.set(1, 8, PAL.silverD);   // I/O bracket
    pb.set(13, 2, PAL.fireL); pb.set(14, 2, PAL.fire);                                                  // power connector
  });
}

// ---- backdrop strips -------------------------------------------------------------------------------------------------
function bgCanopy() {
  const pb = new PixBuf(224, 16);
  for (let x = 0; x < 224; x++) {
    // ragged hanging edge made of two overlapping bumpy waves
    const edge = 9 + Math.round(Math.sin(x * 0.31) * 2 + Math.sin(x * 0.11 + 1) * 2 + (hash2(x, 0, 77) * 2 | 0));
    for (let y = 0; y < 16; y++) {
      if (y > edge) continue;
      const r = hash2(x, y, 71);
      let c = y < 3 ? PAL.leafDark2 : PAL.leafD;
      if (r < 0.14) c = PAL.leafDark2; else if (r > 0.9 && y > 3) c = PAL.leaf;
      if (y >= edge - 1 && y > 4) c = r < 0.5 ? PAL.leaf : PAL.leafD;      // lit fringe on the dangling bottom edge
      if (y === edge && r < 0.7) c = PAL.leafM;
      pb.set(x, y, c);
    }
  }
  for (let i = 0; i < 22; i++) {                                           // hanging vines with leaf drips
    const x = (i * 10 + (hash2(i, 1, 9) * 8 | 0)) % 224, len = 4 + (hash2(i, 2, 9) * 6 | 0);
    for (let k = 0; k < len; k++) pb.set(x, 9 + k, k % 3 === 2 ? PAL.leaf : PAL.leafD);
    if (len > 6) { pb.set(x + 1, 9 + len - 1, PAL.leafM); pb.set(x - 1, 9 + len - 2, PAL.leafM); }
  }
  for (let i = 0; i < 14; i++) { const x = 6 + i * 16 + (hash2(i, 3, 5) * 6 | 0), y = 3 + (hash2(i, 4, 5) * 4 | 0); pb.set(x, y, PAL.leafM); pb.set(x + 1, y, PAL.leaf); }   // sun-kissed leaves
  for (const x of [20, 71, 133, 190]) { pb.set(x, 7, PAL.fireD); pb.set(x + 1, 7, PAL.scarfHL); pb.set(x, 8, PAL.leafM); }   // orchid blossoms
  return pb;
}
function bgTicker() {
  const pb = new PixBuf(224, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 224; x++) pb.set(x, y, hash2(x, y, 81) < 0.1 ? PAL.tunnelMid : PAL.hudBg);
  pb.hline(0, 0, 224, PAL.hudDim); pb.hline(0, 1, 224, PAL.tunnelMid); pb.hline(0, 15, 224, PAL.black);
  for (let x = 4; x < 224; x += 8) { pb.set(x, 0, PAL.hudTxt); pb.set(x + 4, 15, PAL.hudDim); }       // marquee bulbs
  pb.rect(0, 2, 3, 13, PAL.peteSuit); pb.rect(221, 2, 3, 13, PAL.peteSuit);                           // end caps
  pb.vline(3, 2, 13, PAL.peteSuitL); pb.vline(220, 2, 13, PAL.peteSuitL);
  return pb;
}
function signPete() {
  const pb = new PixBuf(32, 16);
  pb.fill(PAL.peteSuit);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 32; x++) if (((x + y) & 1) === 0 && hash2(x, y, 91) < 0.3) pb.set(x, y, PAL.peteSuitL);
  pb.frame(0, 0, 32, 16, PAL.trunkL); pb.frame(1, 1, 30, 14, PAL.trunkD);
  for (const [x, y] of [[0, 0], [31, 0], [0, 15], [31, 15]]) pb.set(x, y, PAL.gold);
  // PETE in gold bold letters
  const s = 'PETE'; let cx = 3;
  for (const ch of s) { glyph(pb, ch, cx, 2, PAL.peteTie); glyph(pb, ch, cx + 1, 2, PAL.peteTie); cx += 7; }
  // the rat himself: ears, face, shades, gold tooth
  pb.rect(8, 10, 3, 3, PAL.peteEar); pb.rect(21, 10, 3, 3, PAL.peteEar);
  pb.rect(11, 10, 10, 5, PAL.peteFur); pb.hline(11, 10, 10, PAL.peteHL); pb.hline(12, 14, 8, PAL.peteFurD);
  pb.rect(12, 11, 3, 2, PAL.peteShade); pb.rect(17, 11, 3, 2, PAL.peteShade); pb.hline(15, 11, 2, PAL.peteShade); pb.set(12, 11, PAL.peteHL);
  pb.set(15, 13, PAL.peteEar); pb.set(16, 13, PAL.peteEar); pb.set(17, 14, PAL.peteTooth); pb.hline(12, 13, 2, PAL.peteFurD); pb.hline(18, 13, 2, PAL.peteFurD);
  return pb;
}

// ---- Micro Center (row 0): boxy red-and-white sign over the five glass-door bays ---------------------------------------
function bgMicroCenter() {
  const pb = new PixBuf(224, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 224; x++) {
    const r = hash2(x, y, 101);
    let c = PAL.peteSuit;
    if (((x + y) & 1) === 0 && r < 0.35) c = PAL.peteSuitL; else if (r > 0.92) c = mix(PAL.peteSuit, PAL.black, 0.4);
    pb.set(x, y, c);
  }
  pb.hline(0, 0, 224, PAL.silverD); pb.hline(0, 1, 224, PAL.black);          // roof parapet
  for (let x = 16; x < 224; x += 32) pb.vline(x, 2, 10, mix(PAL.peteSuit, PAL.black, 0.4));          // panel seams over the door posts
  // storefront windows lit by monitors, left and right of the sign
  const win = (x) => {
    pb.rect(x, 4, 14, 7, PAL.black); pb.frame(x, 4, 14, 7, PAL.silverD);
    pb.rect(x + 2, 5, 4, 4, PAL.black); pb.rect(x + 3, 6, 2, 2, PAL.gem); pb.hline(x + 3, 9, 2, PAL.silverD);                    // monitor
    pb.rect(x + 8, 5, 4, 4, PAL.black); pb.rect(x + 9, 6, 2, 2, PAL.green); pb.hline(x + 9, 9, 2, PAL.silverD);                  // monitor
    pb.set(x + 13, 4, PAL.white);
  };
  for (const x of [4, 24, 44, 160, 180, 200]) win(x);
  pb.rect(2, 4, 1, 7, PAL.silverD); pb.rect(221, 4, 1, 7, PAL.silverD);
  // the sign: red box, white border, bulbs, bold white label
  const label = 'MICRO CENTER', sw = textW(label) + 10, sx = 112 - (sw >> 1);
  pb.rect(sx, 1, sw, 11, PAL.black); pb.rect(sx + 1, 2, sw - 2, 9, PAL.carRed);
  pb.hline(sx + 1, 2, sw - 2, PAL.scarfHL); pb.hline(sx + 1, 10, sw - 2, PAL.carRedD);
  pb.frame(sx, 1, sw, 11, PAL.white);
  boldText(pb, label, sx + 5, 3, PAL.white, PAL.black);
  for (let x = sx + 3; x < sx + sw - 2; x += 6) { pb.set(x, 1, PAL.gold); }                                                        // bulbs
  pb.vline(sx + 8, 12, 0, PAL.black);
  // red-and-white striped awning: the bays hang beneath it
  for (let x = 0; x < 224; x++) {
    const stripe = ((x >> 2) & 1) === 0;
    pb.set(x, 12, stripe ? PAL.carRed : PAL.white); pb.set(x, 13, stripe ? PAL.carRed : PAL.white);
    pb.set(x, 14, stripe ? PAL.carRedD : PAL.silver);
    pb.set(x, 15, ((x >> 2) & 1) === 0 ? PAL.carRedD : PAL.black);                                                              // scalloped hem
    if (x % 4 === 3 || x % 4 === 0) pb.set(x, 15, PAL.black);
  }
  return pb;
}

// ---- Burger King (row 15): bun-and-text sign, warm storefront, no crown, no logo -----------------------------------
function bun(pb, x, y) {
  pb.ellipse(x + 6.5, y + 3, 6.5, 3.2, PAL.path); pb.hline(x + 2, y, 9, PAL.pathL);                                             // top bun dome
  for (const [dx, dy] of [[3, 2], [6, 1], [9, 2], [5, 3], [8, 3]]) pb.set(x + dx, y + dy, PAL.white);                            // sesame seeds
  pb.hline(x, y + 4, 13, PAL.leafL); pb.hline(x + 1, y + 5, 11, PAL.leaf);                                                      // lettuce
  pb.hline(x + 1, y + 6, 11, PAL.trunk); pb.hline(x + 2, y + 7, 9, PAL.trunkD);                                                 // patty
  pb.hline(x + 1, y + 8, 11, PAL.path); pb.hline(x + 2, y + 9, 9, PAL.pathD);                                                   // bottom bun
  pb.set(x + 2, y + 4, PAL.cheese); pb.set(x + 10, y + 4, PAL.cheese);
}
function bgBurger() {
  const pb = new PixBuf(224, 16);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 224; x++) {
    const r = hash2(x, y, 111);
    let c = PAL.brickL;
    if (y % 4 === 3) c = PAL.mortar; else if ((x + (y >> 2) * 4) % 8 === 7) c = PAL.mortar;
    else if (r < 0.15) c = PAL.brick; else if (r > 0.9) c = PAL.cream;
    pb.set(x, y, c);
  }
  pb.hline(0, 0, 224, PAL.carRedD); pb.hline(0, 1, 224, PAL.carRed);       // roof trim
  for (let x = 0; x < 224; x += 2) pb.set(x, 2, PAL.black);
  // warm lit windows with a dining booth silhouette
  const win = (x) => {
    pb.rect(x, 5, 16, 9, PAL.fireD); pb.rect(x + 1, 6, 14, 7, PAL.fireL); pb.hline(x + 1, 6, 14, PAL.cheese); pb.frame(x, 5, 16, 9, PAL.black);
    pb.vline(x + 8, 6, 7, PAL.black); pb.hline(x + 1, 10, 14, PAL.fireD); pb.set(x + 4, 7, PAL.white); pb.set(x + 12, 7, PAL.white);   // mullion, sill glow, glints
  };
  for (const x of [4, 24, 44, 164, 184]) win(x);
  // door with handle at the right (drive-thru side)
  pb.rect(206, 4, 14, 12, PAL.black); pb.rect(207, 5, 12, 11, PAL.fireL); pb.vline(212, 5, 11, PAL.black); pb.set(211, 10, PAL.silver); pb.set(214, 10, PAL.silver);
  // the sign: rounded orange board, yellow border, white outlined label, a bun at each end
  const label = 'BURGER KING', sw = textW(label) + 10, sx = 112 - (sw >> 1);
  pb.rect(sx, 3, sw, 12, PAL.black); pb.rect(sx + 1, 4, sw - 2, 10, PAL.fire);
  pb.hline(sx + 1, 4, sw - 2, PAL.fireL); pb.hline(sx + 1, 13, sw - 2, PAL.fireD);
  pb.frame(sx, 3, sw, 12, PAL.cheese); pb.set(sx, 3, PAL.black); pb.set(sx + sw - 1, 3, PAL.black);
  boldText(pb, label, sx + 5, 5, PAL.white, PAL.brickD);
  bun(pb, sx - 15, 3); bun(pb, sx + sw + 2, 3);
  return pb;
}

// Roadside burger sign on a pole (2 frames: the bulbs and the bun blink).
function bkPole(f) {
  return sprite(16, 16, (pb) => {
    pb.rect(7, 8, 2, 7, PAL.silverD); pb.vline(7, 8, 7, PAL.silver); pb.rect(5, 14, 6, 1, PAL.curbD);                // pole and base
    pb.ellipse(8, 5, 6, 4.5, PAL.fire); pb.hline(4, 2, 8, PAL.fireL); pb.hline(3, 8, 10, PAL.fireD);                // sign disc
    pb.rect(4, 3, 8, 3, PAL.path); pb.hline(4, 3, 8, PAL.pathL);                                                    // bun
    pb.rect(3, 5, 10, 1, PAL.leafL); pb.rect(4, 6, 8, 1, PAL.trunk); pb.rect(4, 7, 8, 1, PAL.path);                 // lettuce, patty, bottom bun
    for (const x of [6, 9]) pb.set(x, 3, PAL.white);
    pb.set(f ? 2 : 13, 2, PAL.fireL); pb.set(f ? 13 : 2, 7, PAL.fireL); pb.set(f ? 8 : 5, 0, PAL.white); pb.set(f ? 11 : 8, 0, PAL.gold);   // blinking bulbs
  });
}

// ---- nerds ---------------------------------------------------------------------------------------------------------
function nerdBody(pb, o) {
  const { dy = 0, skin = PAL.furL, shirt = PAL.white, pants = PAL.peteSuit, hair = PAL.trunk, up = false } = o;
  const y = (v) => v + dy;
  // legs and shoes
  pb.rect(5, y(12), 2, 2, pants); pb.rect(9, y(12), 2, 2, pants); pb.rect(5, y(14), 2, 1, PAL.black); pb.rect(9, y(14), 2, 1, PAL.black);
  // torso
  pb.rect(4, y(8), 8, 5, shirt); pb.hline(4, y(12), 8, shade(shirt, 0.85));
  // arms
  if (up) { pb.rect(2, y(6), 2, 3, shirt); pb.rect(12, y(6), 2, 3, shirt); pb.rect(1, y(3), 2, 3, skin); pb.rect(13, y(3), 2, 3, skin); pb.set(2, y(6), shirt); pb.set(13, y(6), shirt); }
  else { pb.rect(3, y(8), 1, 4, shirt); pb.rect(12, y(8), 1, 4, shirt); pb.set(3, y(12), skin); pb.set(12, y(12), skin); }
  // head
  pb.rect(4, y(3), 8, 5, skin); pb.rect(5, y(2), 6, 7, skin); pb.rect(5, y(8), 6, 1, shade(skin, 0.85));
  // hair
  pb.rect(5, y(2), 6, 2, hair); pb.rect(4, y(3), 1, 2, hair); pb.rect(11, y(3), 1, 2, hair);
  return y;
}
function glasses(pb, y, frameC = PAL.black) {
  pb.rect(4, y(5), 3, 2, PAL.window); pb.rect(9, y(5), 3, 2, PAL.window);
  pb.hline(3, y(4), 10, frameC); pb.hline(4, y(7), 3, frameC); pb.hline(9, y(7), 3, frameC); pb.set(7, y(5), frameC); pb.set(8, y(5), frameC);
  pb.set(4, y(5), PAL.white); pb.set(9, y(5), PAL.white); pb.set(6, y(6), PAL.windowD); pb.set(11, y(6), PAL.windowD);
}
function nerdGlasses(o = {}) {
  return sprite(16, 16, (pb) => {
    const y = nerdBody(pb, { ...o, hair: PAL.trunkD });
    glasses(pb, y);
    pb.hline(7, y(8), 2, PAL.furD);                                                                                // mouth
    if (o.up) { pb.rect(6, y(8), 4, 1, PAL.black); pb.hline(7, y(8), 2, PAL.scarf); }          // cheering open mouth
    pb.rect(9, y(9), 2, 3, PAL.carWhite); pb.rect(10, y(9), 1, 3, PAL.carBlue); pb.set(10, y(9), PAL.carBlueD);      // pocket protector with pens
    pb.set(10, y(9), PAL.carBlueD); pb.set(9, y(9), PAL.carRed);
  });
}
function nerdHoodie() {
  return sprite(16, 16, (pb) => {
    const y = nerdBody(pb, { shirt: PAL.hatBand, pants: PAL.asphaltD, hair: PAL.hatBand });
    pb.rect(3, 2, 10, 3, PAL.hatBand); pb.rect(2, 4, 3, 5, PAL.hatBand); pb.rect(11, 4, 3, 5, PAL.hatBand);          // hood up around the face
    pb.rect(5, 4, 6, 4, PAL.furL); pb.hline(5, 4, 6, PAL.furD);
    pb.hline(3, 2, 10, shade(PAL.hatBand, 1.25));
    pb.rect(5, 5, 6, 1, PAL.black); pb.set(6, 5, PAL.eye); pb.set(9, 5, PAL.eye); pb.set(6, 6, PAL.white); pb.set(9, 6, PAL.white);   // visor-ish eyes
    pb.rect(3, 6, 2, 3, PAL.black); pb.rect(11, 6, 2, 3, PAL.black); pb.hline(4, 3, 8, PAL.black);                  // big over-ear headphones
    pb.set(3, 6, PAL.gem); pb.set(12, 6, PAL.gem);
    pb.hline(7, 7, 2, PAL.furD);
    pb.rect(6, 10, 4, 2, shade(PAL.hatBand, 0.8)); pb.set(7, 9, PAL.white); pb.set(8, 9, PAL.white);                  // kangaroo pocket + drawstrings
  });
}
function nerdLaptop() {
  return sprite(16, 16, (pb) => {
    const y = nerdBody(pb, { shirt: PAL.leaf, pants: PAL.tarL, hair: PAL.dirtL });
    glasses(pb, y, PAL.hatD);
    pb.hline(7, y(8), 2, PAL.furD);
    pb.rect(3, y(9), 10, 4, PAL.silver); pb.rect(4, y(10), 8, 2, PAL.black);                                         // laptop held up: lid back faces us
    pb.hline(3, y(9), 10, PAL.white); pb.set(8, y(10), PAL.gem); pb.set(9, y(11), PAL.fire); pb.set(5, y(11), PAL.red);   // stickers
    pb.hline(3, y(13), 10, PAL.silverD);
    pb.set(2, y(10), PAL.furL); pb.set(13, y(10), PAL.furL);                                                         // hands
    pb.hline(5, 14, 6, PAL.black);
    pb.set(4, y(6) + 5, PAL.window);                                                                                  // screen glow spill
  });
}
function nerdSolder() {
  return sprite(16, 16, (pb) => {
    const y = nerdBody(pb, { shirt: PAL.hatD, pants: PAL.asphalt, hair: PAL.black });
    pb.rect(4, y(3), 8, 2, PAL.leafD); pb.rect(4, y(4), 3, 3, PAL.leafHL); pb.rect(9, y(4), 3, 3, PAL.leafHL);       // safety goggles
    pb.rect(5, y(5), 1, 1, PAL.white); pb.rect(10, y(5), 1, 1, PAL.white); pb.set(7, y(5), PAL.leafD); pb.set(8, y(5), PAL.leafD);
    pb.hline(7, y(8), 2, PAL.black);
    pb.rect(12, y(7), 1, 4, PAL.furL);                                                                                // arm raised holding the iron
    pb.rect(13, y(6), 1, 4, PAL.black); pb.rect(14, y(5), 1, 2, PAL.silver);                                          // iron body and tip
    pb.set(14, y(4), PAL.fireL); pb.set(15, y(3), PAL.fire); pb.set(13, y(3), PAL.white);                              // spark
    pb.set(15, y(1), PAL.silverD);                                                                                   // smoke wisp
    pb.rect(4, y(10), 4, 2, PAL.leaf); pb.set(5, y(10), PAL.gold); pb.set(6, y(11), PAL.gold);                        // little circuit board in the other hand
  });
}
function nerdCheer(f) {
  return nerdGlasses({ up: true, dy: f ? -1 : 0, shirt: f ? PAL.white : PAL.carWhite });
}

export function build() {
  return {
    tile_road: [tileRoad()], tile_road_dash: [tileRoadDash()], tile_curb: [tileCurb()],
    tile_median: [tileMedian(0), tileMedian(1)], tile_start: [tileStart(0), tileStart(1)],
    bay_empty: [bayBase()], bay_wall: [bayWall()],
    bay_croc: [croc(0), croc(1), croc(2)], bay_snake: [snake(0), snake(1), snake(2)],
    bay_mouse: [mouse(0), mouse(1)], bay_fish: [gpu(0), gpu(1)],
    bg_canopy: [bgCanopy()], bg_ticker: [bgTicker()], sign_pete: [signPete()],
    bg_microcenter: [bgMicroCenter()], bg_burger: [bgBurger()], bk_pole: [bkPole(0), bkPole(1)],
    nerd: [nerdGlasses(), nerdHoodie(), nerdLaptop(), nerdSolder()],
    nerd_cheer: [nerdCheer(0), nerdCheer(1)],
  };
}
export default build;
