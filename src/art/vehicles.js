// Art module vehicles: Pete's traffic. Pure & deterministic PixBuf drawing, palette from defs.PAL only.
// All sprites face RIGHT (renderer mirrors for dir -1). Wheels sit on the bottom row (outline on row h-1).
import { PixBuf, ink, shade, mix } from './pixbuf.js';
import { PAL } from '../core/defs.js';

const OUT = PAL.outline;
const E = (c, emit) => ink(c, { emit });
const G = (c, gloss) => ink(c, { gloss });

// ---- shared bits -------------------------------------------------------------------------------
// 4x4 (r=2) or 6x6 (r=3) wheel, bottom pixel row = cy+r-1. `f` rotates the hub pixel so frames read as motion.
function wheel(pb, cx, cy, f, r = 2) {
  pb.circle(cx, cy, r, PAL.tire);
  if (r === 2) { pb.set(cx - 1 + (f ? 1 : 0), cy - 1 + (f ? 1 : 0), PAL.hub); }
  else { pb.rect(cx - 1, cy - 1, 2, 2, PAL.curbD); pb.set(cx - 1 + (f ? 1 : 0), cy - 1 + (f ? 1 : 0), PAL.hub); }
}
const lamp = (pb, x, y, h = 2) => pb.rect(x, y, 1, h, E(PAL.headlight, 0.9));
const tail = (pb, x, y, h = 2) => pb.rect(x, y, 1, h, E(PAL.tail, 0.7));
function done(pb) { return pb.outline(OUT, { diagonal: true }); }
const sprite = (w, h, draw) => { const pb = new PixBuf(w, h); draw(pb); return done(pb); };

// ---- car: red sedan 16x16 -------------------------------------------------------------------------
function car(f) {
  return sprite(16, 16, (pb) => {
    const d = f ? -1 : 0;                                   // body bounce, wheels stay on the road
    pb.rect(1, 8 + d, 14, 4, PAL.carRed);
    pb.rect(1, 11 + d, 14, 1, PAL.carRedD);
    pb.rect(4, 4 + d, 8, 4, PAL.carRed);
    pb.hline(4, 4 + d, 8, shade(PAL.carRed, 1.25));
    pb.rect(5, 5 + d, 3, 2, G(PAL.window, 0.8)); pb.rect(9, 5 + d, 2, 2, G(PAL.window, 0.8));
    pb.set(5, 5 + d, PAL.white);
    pb.set(12, 7 + d, PAL.carRed);
    pb.hline(2, 9 + d, 11, shade(PAL.carRed, 1.2));          // body highlight
    lamp(pb, 14, 8 + d); tail(pb, 1, 8 + d);
    pb.set(14, 11 + d, PAL.curb);
    wheel(pb, 4, 13, f); wheel(pb, 11, 13, f);
  });
}

// ---- racer: yellow low wedge with spoiler 16x16 ----------------------------------------------------
function racer(f) {
  return sprite(16, 16, (pb) => {
    pb.poly([[1, 12], [1, 8], [4, 8], [5, 6], [10, 6], [12, 8], [15, 9], [15, 12]], PAL.carYellow);
    pb.rect(1, 11, 14, 1, PAL.carYellowD);
    pb.hline(2, 10, 12, PAL.white);                          // racing stripe
    pb.rect(6, 7, 4, 2, G(PAL.window, 0.8));
    pb.rect(1, 5, 4, 1, PAL.carRedD); pb.vline(2, 6, 2, PAL.carRedD);   // spoiler
    pb.set(14, 9, E(PAL.headlight, 0.9)); pb.set(14, 10, E(PAL.headlight, 0.9));
    if (f) { pb.set(1, 9, E(PAL.fire, 0.9)); pb.set(1, 10, E(PAL.fireL, 1)); } else { pb.set(1, 10, E(PAL.fire, 0.8)); }
    wheel(pb, 4, 13, f); wheel(pb, 11, 13, f);
    pb.set(5, 10, PAL.carYellowD);
  });
}

// ---- bike: a rat on a scooter 16x16 -----------------------------------------------------------------
function bike(f) {
  return sprite(16, 16, (pb) => {
    const d = f ? 1 : 0;                                     // rat bobs on the scooter
    wheel(pb, 3, 12, f, 3); wheel(pb, 12, 12, f, 3);
    pb.rect(3, 10, 10, 1, PAL.carGreen);                     // deck
    pb.rect(3, 9, 10, 1, PAL.carGreenD);
    pb.vline(12, 4, 6, PAL.carGrey);                         // steering column
    pb.hline(11, 4, 3, PAL.carGrey);                         // handlebar
    pb.set(14, 5, E(PAL.headlight, 0.9));
    // rat rider
    pb.rect(5, 6 + d, 4, 3, PAL.peteFur);                    // body
    pb.rect(6, 6 + d, 2, 1, PAL.peteSuit);                   // jacket flash
    pb.line(9, 7 + d, 11, 5, PAL.peteFur);                   // arm to handlebar
    pb.rect(8, 3 + d, 4, 3, PAL.peteFur);                    // head
    pb.set(11, 4 + d, PAL.black);                            // eye
    pb.set(12, 5 + d, PAL.peteEar);                          // nose
    pb.rect(8, 2 + d, 2, 1, PAL.peteEar);                    // ear
    pb.hline(8, 2 + d, 1, PAL.peteFurD);
    pb.hline(4, 8 + d, 2, PAL.peteEar); pb.set(3, 7 + d, PAL.peteEar); // tail
    pb.set(10, 9, PAL.peteFurD); pb.set(9, 9, PAL.peteFurD);           // foot
  });
}

// ---- dozer: yellow bulldozer 24x16 -----------------------------------------------------------------
function dozer(f) {
  return sprite(24, 16, (pb) => {
    const d = f ? -1 : 0;
    pb.rect(2, 11, 18, 4, PAL.tire);                         // track
    pb.rect(3, 12, 16, 1, PAL.tarL);
    for (let i = 0; i < 8; i++) pb.set(3 + i * 2 + (f ? 1 : 0), 14, PAL.hub);   // tread links
    pb.circle(4, 12, 2, PAL.tire); pb.circle(17, 12, 2, PAL.tire);
    pb.rect(4, 8 + d, 14, 4, PAL.carYellow);                 // body
    pb.rect(4, 11 + d, 14, 1, PAL.carYellowD);
    pb.rect(5, 3 + d, 7, 5, PAL.carYellow);                  // cab
    pb.rect(6, 4 + d, 5, 3, G(PAL.window, 0.8));
    pb.hline(5, 3 + d, 7, shade(PAL.carYellow, 1.25));
    pb.rect(13, 6 + d, 3, 2, PAL.carYellowD);                // hood
    pb.vline(14, 2 + d, 4, PAL.tarL);                        // exhaust pipe
    if (f) { pb.set(14, 1, PAL.carGrey); pb.set(15, 0, PAL.asphaltL); }
    pb.set(15, 1 + d + 0, PAL.tarL);
    // blade at the front (right)
    pb.rect(20, 5, 3, 9, PAL.carGrey);
    pb.vline(20, 5, 9, PAL.curb);
    pb.rect(19, 9, 1, 2, PAL.carYellowD); pb.rect(19, 7 + d, 1, 2, PAL.carYellowD);   // arm
    pb.hline(20, 13, 3, PAL.curbD);
    pb.set(22, 6, PAL.white);
    lamp(pb, 17, 8 + d);
  });
}

// ---- truck: Pete's Parkway Pickles delivery truck 32x16 ----------------------------------------------
function pickleBig(pb, x, y) {                              // 13x6 pickle with bumps
  pb.ellipse(x + 6.5, y + 3, 6.5, 3, PAL.pickle);
  pb.hline(x + 2, y + 1, 8, shade(PAL.pickle, 1.35));
  pb.hline(x + 2, y + 5, 9, PAL.pickleD);
  for (const [dx, dy] of [[3, 2], [6, 3], [9, 2], [5, 1], [8, 4]]) pb.set(x + dx, y + dy, PAL.pickleD);
  pb.set(x + 12, y + 3, PAL.pickleD);
}
function truck(f) {
  return sprite(32, 16, (pb) => {
    const d = f ? -1 : 0;
    pb.rect(1, 2 + d, 21, 10, PAL.carWhite);                 // cargo box
    pb.rect(1, 11 + d, 21, 1, PAL.carGrey);
    pb.hline(1, 2 + d, 21, PAL.white);
    pb.rect(1, 2 + d, 21, 1, PAL.carGrey);
    pb.rect(1, 3 + d, 21, 1, PAL.white);
    pickleBig(pb, 4, 4 + d);
    pb.rect(18, 4 + d, 3, 5, PAL.pickleD); pb.rect(18, 4 + d, 3, 1, PAL.pickle);   // jar-lid stripe
    pb.rect(23, 7 + d, 8, 5, PAL.pickle);                    // cab hood/body
    pb.rect(23, 4 + d, 5, 4, PAL.pickle);                    // cab roof
    pb.rect(24, 5 + d, 3, 2, G(PAL.window, 0.8));
    pb.rect(23, 11 + d, 8, 1, PAL.pickleD);
    pb.hline(23, 4 + d, 5, shade(PAL.pickle, 1.3));
    pb.rect(30, 9 + d, 1, 2, PAL.curb);                      // bumper
    lamp(pb, 30, 7 + d);
    tail(pb, 1, 8 + d, 2);
    pb.rect(1, 12, 30, 1, PAL.tarL);                         // chassis
    wheel(pb, 6, 13, f); wheel(pb, 12, 13, f); wheel(pb, 27, 13, f);
  });
}

// ---- bus: tuna-can bus 48x16 --------------------------------------------------------------------------
function bus(f) {
  return sprite(48, 16, (pb) => {
    const d = f ? -1 : 0;
    pb.rect(1, 2 + d, 46, 10, PAL.tunaCan);                  // can body
    pb.hline(2, 2 + d, 44, PAL.white);                       // rim shine
    pb.hline(1, 3 + d, 46, PAL.carGrey);
    pb.hline(1, 11 + d, 46, PAL.curb);
    pb.rect(0 + 1, 2 + d, 1, 10, PAL.curb); pb.rect(46, 2 + d, 1, 10, PAL.curb);
    pb.rect(2, 4 + d, 44, 3, G(PAL.window, 0.8));            // windows
    for (let x = 8; x < 44; x += 7) pb.vline(x, 4 + d, 3, PAL.tunaCan);
    pb.hline(2, 4 + d, 44, shade(PAL.window, 1.3));
    pb.rect(3, 8 + d, 42, 3, PAL.tunaLabel);                 // label band
    pb.hline(3, 8 + d, 42, shade(PAL.tunaLabel, 1.3));
    // pink fish on the label
    pb.ellipse(14, 9.5 + d, 3.5, 1.4, PAL.tuna); pb.poly([[17, 9 + d], [20, 8 + d], [20, 11 + d]], PAL.tuna); pb.set(11, 9 + d, PAL.black);
    pb.ellipse(32, 9.5 + d, 3.5, 1.4, PAL.tuna); pb.poly([[35, 9 + d], [38, 8 + d], [38, 11 + d]], PAL.tuna); pb.set(29, 9 + d, PAL.black);
    lamp(pb, 46, 8 + d, 2); tail(pb, 1, 8 + d, 2);
    pb.rect(1, 12, 46, 1, PAL.tarL);
    wheel(pb, 10, 12, f, 3); wheel(pb, 38, 12, f, 3);
  });
}

// ---- limo: Pete in the back, honk frame 48x16 ----------------------------------------------------------
function limo(f) {
  return sprite(48, 16, (pb) => {
    const d = f ? -1 : 0;
    pb.rect(1, 7 + d, 46, 5, PAL.limo);
    pb.rect(5, 3 + d, 36, 4, PAL.limo);                      // cabin
    pb.hline(5, 3 + d, 36, PAL.limoL);
    pb.hline(2, 8 + d, 44, PAL.limoL);                       // shiny waistline
    pb.hline(1, 11 + d, 46, PAL.tarL);
    pb.set(42, 6 + d, PAL.limo); pb.set(43, 7 + d, PAL.limo); pb.set(41, 5 + d, PAL.limo);
    // windows (back one holds Pete)
    pb.rect(6, 4 + d, 6, 3, G(PAL.windowD, 0.7));            // rear
    pb.rect(14, 4 + d, 12, 3, G(PAL.windowD, 0.7));          // Pete's window
    pb.rect(28, 4 + d, 8, 3, G(PAL.windowD, 0.7));
    pb.rect(37, 4 + d, 3, 3, G(PAL.window, 0.8));
    // Pete in the back seat: fat grey head, shades, gold tooth
    pb.rect(18, 4 + d, 5, 3, PAL.peteFur);
    pb.hline(19, 5 + d, 4, PAL.peteShade);
    pb.set(23, 6 + d, PAL.peteFurD); pb.set(20, 6 + d, PAL.peteTooth);
    pb.set(18, 4 + d, PAL.peteEar);
    pb.hline(2, 9 + d, 3, PAL.curb);                         // chrome
    pb.hline(44, 9 + d, 2, PAL.curb);
    lamp(pb, 46, 8 + d); tail(pb, 1, 8 + d);
    pb.hline(30, 10 + d, 4, PAL.limoL);                      // door line
    pb.vline(15, 8 + d, 3, PAL.black); pb.vline(30, 8 + d, 3, PAL.black);
    if (f) {                                                 // honk! little sound arcs at the front
      pb.set(46, 3, PAL.hudTxt); pb.set(47, 2, PAL.hudTxt); pb.set(47, 5, PAL.hudTxt);
      pb.set(45, 1, PAL.white);
      pb.hline(44, 4, 2, PAL.hudTxt);
      pb.set(1, 1, PAL.white);
    }
    wheel(pb, 9, 13, f); wheel(pb, 38, 13, f); wheel(pb, 15, 13, f);
  });
}

// ---- roller: cheese wheel, 4 rolling frames, 120 degree loop (30 degrees per frame) ---------------------
function roller(f) {
  const CY = 8.5;
  return sprite(16, 16, (pb) => {
    pb.circle(8, CY, 6.5, PAL.cheese);
    pb.ring(8, CY, 6.5, 6.5, PAL.cheeseD, 2);                 // darker rind
    pb.ellipse(6, CY - 2.5, 2.2, 1.4, mix(PAL.cheese, PAL.white, 0.55));   // highlight stays put (light from above)
    const a0 = (f * 30) * Math.PI / 180;
    for (let k = 0; k < 3; k++) {
      const a = a0 + k * 2 * Math.PI / 3;
      pb.circle(8 + Math.cos(a) * 3.6, CY + Math.sin(a) * 3.6, 1.1, PAL.cheeseHole);
    }
    pb.set(8, 8, PAL.cheeseHole); pb.set(8, 9, PAL.cheeseHole);
    // rind notch that rotates, so rolling is readable
    const rx = 8 + Math.cos(a0 + 1) * 5.6, ry = CY + Math.sin(a0 + 1) * 5.6;
    pb.set(Math.round(rx), Math.round(ry), PAL.cheeseD);
  });
}

// ---- glow_head: soft additive headlight cone, 24x16, no outline; origin at the left-centre -------------
function glowHead() {
  const pb = new PixBuf(24, 16);
  for (let x = 0; x < 24; x++) {
    const t = x / 23, half = 1.2 + t * 6.3;                  // cone widens to the right
    for (let y = 0; y < 16; y++) {
      const dy = Math.abs(y + 0.5 - 8);
      if (dy > half) continue;
      const edge = 1 - dy / half;                            // 0 at cone edge, 1 on axis
      const a = Math.round(215 * (1 - t) ** 1.2 * Math.min(1, edge * 1.6 + 0.15));
      if (a < 6) continue;
      pb.set(x, y, ink(PAL.headlight, { a, emit: 1 }));
    }
  }
  return pb;
}

export function build() {
  return {
    car: [car(0), car(1)],
    racer: [racer(0), racer(1)],
    bike: [bike(0), bike(1)],
    dozer: [dozer(0), dozer(1)],
    truck: [truck(0), truck(1)],
    bus: [bus(0), bus(1)],
    limo: [limo(0), limo(1)],
    roller: [roller(0), roller(1), roller(2), roller(3)],
    glow_head: [glowHead()],
  };
}
export default build;
