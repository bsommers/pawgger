// Ghibli pack: vehicles (chunky, rounded, toy-like, warm, with steam puffs). All face RIGHT; wheels sit on the bottom row of the cell.
import { GPAL as G } from '../../core/defs.js';
import { sprite, ell, paint, tube, poly, dot, line, INK, PINK } from './characters.js';

const WIN = ['#d9f3ff', '#7fb8dc'];
function rr(kit, c, x, y, w, h, r) { kit.roundRect(c, x, y, w, h, r); }
/** rounded body panel: gradient lighter top, outline, glossy highlight */
function panel(kit, c, x, y, w, h, r, col, lw = 0.38) {
  rr(kit, c, x, y, w, h, r); paint(c, kit.lin(c, 0, y, 0, y + h, [kit.lighten(col, 0.3), col, kit.darken(col, 0.18)]), lw);
  rr(kit, c, x + 0.7, y + 0.5, w - 1.4, Math.min(1, h * 0.2), 0.5); c.fillStyle = 'rgba(255,255,255,0.32)'; c.fill();
}
function window_(kit, c, x, y, w, h, r = 0.8) { rr(kit, c, x, y, w, h, r); paint(c, kit.lin(c, 0, y, 0, y + h, WIN), 0.3); line(c, x + 0.5, y + 0.5, x + 1.3, y + 0.5, 0.35, 'rgba(255,255,255,0.8)'); }
/** wheel with a rotating hub; bottom of the tyre at cy + r */
function wheel(kit, c, cx, cy, r, rot = 0) {
  dot(c, cx, cy, r, '#3b2f3a'); c.beginPath(); c.arc(cx, cy, r, 0, 6.3); c.lineWidth = 0.3; c.strokeStyle = INK(); c.stroke();
  dot(c, cx, cy, r * 0.55, '#d8d4c8');
  for (let k = 0; k < 3; k++) { const a = rot + k * 2.094; line(c, cx, cy, cx + Math.cos(a) * r * 0.52, cy + Math.sin(a) * r * 0.52, 0.32, '#7a7580'); }
  dot(c, cx, cy, r * 0.18, '#3b2f3a');
}
/** little steam puffs trailing behind (left of x0) */
function puffs(c, x0, y0, i, n = 2) {
  for (let k = 0; k < n; k++) { const t = (k + i * 0.5) / n, a = 0.7 * (1 - t); dot(c, x0 - 0.6 - t * 3.4, y0 - t * 2.4, 0.5 + t * 0.9, `rgba(255,255,255,${a.toFixed(2)})`); }
}
function lamp(c, x, y, r = 0.8) { dot(c, x, y, r, G.gold); dot(c, x - 0.2, y - 0.2, r * 0.4, '#fff'); }
const bobOf = (i) => (i ? -0.35 : 0);

function drawCar(kit, c, i) {
  const b = bobOf(i);
  kit.softShadow(c, 8, 15.3, 7.4, 1.1, 0.28); puffs(c, 1.2, 12, i);
  c.save(); c.translate(0, b);
  panel(kit, c, 1.2, 6.4, 13.8, 6.2, 2.6, G.carRed);
  panel(kit, c, 3.9, 2.9, 8, 5.2, 2.4, G.carRed); window_(kit, c, 5, 4, 3, 3); window_(kit, c, 8.4, 4, 2.7, 3);
  lamp(c, 14.2, 9.4); dot(c, 1.7, 9.2, 0.7, '#ffb0a0');
  line(c, 7, 8.2, 9, 8.2, 0.3, 'rgba(59,47,58,0.5)');
  c.restore();
  wheel(kit, c, 4.6, 13.4, 2.1, i * 0.5); wheel(kit, c, 11.6, 13.4, 2.1, i * 0.5);
}
function drawRacer(kit, c, i) {
  const b = bobOf(i);
  kit.softShadow(c, 8, 15.3, 7.4, 1.1, 0.28); puffs(c, 0.6, 11.6, i, 3);
  c.save(); c.translate(0, b);
  panel(kit, c, 0.6, 5.2, 2.4, 1.2, 0.5, G.carBlue); line(c, 1.6, 6.2, 1.6, 8.4, 0.5, INK(0.8));   // spoiler on struts
  rr(kit, c, 0.3, 4.6, 3.6, 1.2, 0.5); paint(c, kit.darken(G.carBlue, 0.1));
  c.beginPath(); c.moveTo(1, 12.4); c.quadraticCurveTo(0.8, 7.6, 4.4, 7.2); c.quadraticCurveTo(7, 4.6, 9.2, 5.8); c.quadraticCurveTo(11, 7, 15, 9.4); c.quadraticCurveTo(15.6, 12.4, 14.8, 12.6); c.closePath();
  paint(c, kit.lin(c, 0, 5, 0, 12.6, [kit.lighten(G.carBlue, 0.3), G.carBlue, kit.darken(G.carBlue, 0.2)]));
  c.beginPath(); c.moveTo(6.2, 7); c.quadraticCurveTo(8, 5.6, 9.4, 6.5); c.lineTo(10.4, 8); c.lineTo(6, 8); c.closePath(); paint(c, kit.lin(c, 0, 5.5, 0, 8, WIN), 0.3);
  line(c, 5, 10.2, 12, 10.2, 0.5, G.carYellow); lamp(c, 14.3, 10);
  c.restore();
  wheel(kit, c, 4.2, 13.7, 1.9, i * 0.5); wheel(kit, c, 11.8, 13.7, 1.9, i * 0.5);
}
function drawBike(kit, c, i) {
  const b = bobOf(i);
  kit.softShadow(c, 8, 15.3, 6.4, 1, 0.26); puffs(c, 1.6, 12, i);
  wheel(kit, c, 3.6, 13.1, 2.4, i * 0.6); wheel(kit, c, 12.4, 13.1, 2.4, i * 0.6);
  c.save(); c.translate(0, b);
  panel(kit, c, 3.2, 10.2, 8.4, 2.2, 1, G.carGreen);                     // deck
  line(c, 11.6, 11.2, 12.2, 5.4, 0.8, '#7a7580'); line(c, 11.2, 5.2, 13.8, 5, 0.7, '#3b2f3a');   // steering column + bar
  // rat rider, plump and smug, scarf flying
  tube(c, [4.6, 8.2], [2.4, 7.4], [1.4, 9.6 + i * 0.6], 0.6, PINK);
  ell(c, 7.2, 7.6, 2.8, 2.6); paint(c, kit.lin(c, 0, 5, 0, 10, [G.peteSuitL, G.peteSuit]));
  ell(c, 11, 4.7, 2.2, 2); paint(c, G.peteFur); ell(c, 9.6, 2.6, 1, 1); paint(c, G.peteFur, 0.3);
  ell(c, 13.2, 5.2, 1.2, 0.9); paint(c, '#b9b5c9', 0.28); dot(c, 14.2, 5, 0.45, '#d96c86');
  dot(c, 11.5, 4.3, 0.45, '#2a1f2e');
  tube(c, [9.4, 6.2], [7, 5.4 - i * 0.4], [5.4, 6.4], 0.8, G.scarf);
  c.beginPath(); c.moveTo(8.6, 3.6); c.ellipse(10.4, 3.6, 1.9, 1.5, 0, Math.PI, 6.28); c.closePath(); paint(c, G.carYellow, 0.3);   // little cap
  line(c, 8.7, 9.6, 11.2, 8, 0.7, G.peteFur);
  c.restore();
}
function drawDozer(kit, c, i) {
  const b = bobOf(i);
  kit.softShadow(c, 12, 15.3, 11, 1.2, 0.28); puffs(c, 1.2, 8.6, i, 3);
  c.save(); c.translate(0, b);
  rr(kit, c, 1.4, 8.6, 18, 5.4, 2.7); paint(c, '#4f4c68');                // track
  for (let k = 0; k < 7; k++) line(c, 3 + k * 2.4 + (i ? 1 : 0), 9, 3 + k * 2.4 + (i ? 1 : 0), 9.8, 0.35, '#8d8aa0');
  for (const x of [4.2, 10.4, 16.2]) { dot(c, x, 11.3, 1.4, '#8d8aa0'); dot(c, x, 11.3, 0.5, '#4f4c68'); }
  panel(kit, c, 4, 5.5, 10.6, 5.2, 1.8, G.carYellow);
  panel(kit, c, 5.2, 1.6, 6.2, 5, 1.6, G.carYellow); window_(kit, c, 6, 2.6, 4.6, 3);
  rr(kit, c, 4.5, 0.6, 7.6, 1.3, 0.6); paint(c, kit.darken(G.carYellow, 0.15), 0.3);   // roof
  line(c, 13.8, 6, 13.8, 2, 0.7, '#3b2f3a'); dot(c, 13.8, 1.8, 0.6, G.scarf);          // exhaust stack with a puff
  dot(c, 14.2 + i * 0.4, 1.6 - i * 0.2, 0.9, 'rgba(255,255,255,0.7)');
  line(c, 14.4, 9.2, 21, 9.4, 1, '#7a7580');                                            // blade arm
  panel(kit, c, 20.4, 5.2, 2.8, 8.4, 1.2, '#b9b1a4');
  lamp(c, 15, 7.6, 0.8);
  c.restore();
}
function drawTruck(kit, c, i) {
  const b = bobOf(i);
  kit.softShadow(c, 16, 15.3, 14.4, 1.2, 0.28); puffs(c, 1.4, 12, i, 3);
  c.save(); c.translate(0, b);
  panel(kit, c, 1.2, 2.8, 20.2, 10.2, 2.4, G.pickle);                                  // cargo box
  panel(kit, c, 22.2, 5.6, 8.8, 7.4, 2.4, G.carGreen);
  window_(kit, c, 24.2, 6.8, 4.6, 3.2);
  c.save(); c.translate(11.4, 7.9);                                                     // pickle emblem
  ell(c, 0, 0, 4.6, 2.1, -0.1); paint(c, '#9ad46c', 0.34); dot(c, -1.6, -0.6, 0.35, G.leafD); dot(c, 0.4, 0.7, 0.35, G.leafD); dot(c, 2.2, -0.5, 0.35, G.leafD);
  line(c, -3, -1, -2, -1.6, 0.4, 'rgba(255,255,255,0.7)'); c.restore();
  lamp(c, 30.4, 11, 0.8);
  c.restore();
  wheel(kit, c, 6.4, 13.4, 2.1, i * 0.5); wheel(kit, c, 12.2, 13.4, 2.1, i * 0.5); wheel(kit, c, 26.2, 13.4, 2.1, i * 0.5);
}
function drawBus(kit, c, i) {
  const b = bobOf(i);
  kit.softShadow(c, 24, 15.3, 22, 1.3, 0.28); puffs(c, 1.2, 12, i, 3);
  c.save(); c.translate(0, b);
  panel(kit, c, 1.2, 1.8, 45.6, 11.4, 3.4, '#8fb4d8');                                  // tuna-can bus
  rr(kit, c, 1.8, 10.2, 44.4, 2.2, 1); c.fillStyle = 'rgba(255,255,255,0.35)'; c.fill();
  line(c, 1.6, 3.8, 46.4, 3.8, 0.4, 'rgba(59,47,58,0.35)');
  for (let k = 0; k < 7; k++) window_(kit, c, 4 + k * 5.2, 4.4, 4, 3.4, 1);
  window_(kit, c, 40.6, 4.4, 4.4, 5.2, 1);
  c.save(); c.translate(20, 11.2); c.font = 'bold 2.4px sans-serif'; c.fillStyle = G.scarf; c.textAlign = 'center'; c.fillText('TUNA', 8, 0.7); c.restore();
  lamp(c, 46.2, 10.4, 0.8);
  c.restore();
  wheel(kit, c, 8.6, 13.4, 2.1, i * 0.5); wheel(kit, c, 38.6, 13.4, 2.1, i * 0.5);
}
function drawLimo(kit, c, i) {
  const b = i ? -0.5 : 0;
  kit.softShadow(c, 24, 15.3, 22, 1.2, 0.28); puffs(c, 1.2, 12, i, 3);
  c.save(); c.translate(0, b);
  panel(kit, c, 1, 5.6, 46, 7, 3, '#4a3a68');
  panel(kit, c, 8, 2.6, 28, 4.6, 2.2, '#4a3a68');
  for (let k = 0; k < 4; k++) window_(kit, c, 10 + k * 6.4, 3.5, 5.2, 2.8, 0.8);
  window_(kit, c, 36.4, 4, 3.6, 3, 0.8);
  line(c, 2, 9, 45, 9, 0.5, G.gold);                                                    // gold stripe
  dot(c, 22, 5, 0.9, G.peteFur); dot(c, 21.3, 4.2, 0.45, G.peteFur); dot(c, 22.7, 4.2, 0.45, G.peteFur);   // Pete's silhouette in the window
  lamp(c, 46, 8.8, 0.9); poly(c, [[44.4, 6.2], [45.6, 6.2], [45, 5.4]]); c.fillStyle = G.gold; c.fill();
  c.restore();
  if (i) for (let k = 0; k < 3; k++) { c.save(); c.translate(44.6, 4.6); c.rotate(-1.4 + k * 0.55); line(c, 1, 0, 2.2, 0, 0.45, 'rgba(255,241,168,0.95)'); c.restore(); }   // honk!
  wheel(kit, c, 9.4, 13.4, 2.1, i * 0.5); wheel(kit, c, 38.6, 13.4, 2.1, i * 0.5);
}
function drawRoller(kit, c, i) {
  const a = i * Math.PI / 6;                                                            // 30 degrees a frame, 3-fold holes: 4 frames loop
  kit.softShadow(c, 8, 15.2, 6.6, 1, 0.28);
  dot(c, 8, 8, 7.2, kit.darken(G.carYellow, 0.28));
  c.beginPath(); c.arc(8, 8, 7.2, 0, 6.3); paint(c, kit.radial(c, 8, 8, 0, 8.5, [[0, '#ffe589'], [0.7, G.gold], [1, '#e0a83a']], 6, 5), 0.4);
  c.beginPath(); c.arc(8, 8, 5.4, 0, 6.3); c.fillStyle = 'rgba(255,255,255,0.18)'; c.fill();
  for (let k = 0; k < 3; k++) {
    const t = a + k * 2.0944, u = a + 1.0472 + k * 2.0944;
    ell(c, 8 + Math.cos(t) * 4.2, 8 + Math.sin(t) * 4.2, 1.5, 1.1, t); c.fillStyle = '#d99a2e'; c.fill();
    ell(c, 8 + Math.cos(u) * 5.8, 8 + Math.sin(u) * 5.8, 0.8, 0.6, u); c.fillStyle = '#d99a2e'; c.fill();
    ell(c, 8 + Math.cos(t + 0.4) * 1.6, 8 + Math.sin(t + 0.4) * 1.6, 0.6, 0.5, 0); c.fillStyle = '#d99a2e'; c.fill();
  }
  c.beginPath(); c.arc(8, 8, 7.2, 3.6, 4.6); c.lineWidth = 0.5; c.strokeStyle = 'rgba(255,255,255,0.6)'; c.stroke();
}
function drawGlow(kit, c) {                                                             // soft additive headlight cone; origin at the left-centre
  c.beginPath(); c.moveTo(0, 6); c.lineTo(24, 0.5); c.lineTo(24, 15.5); c.lineTo(0, 10); c.closePath();
  c.fillStyle = kit.lin(c, 0, 0, 24, 0, [[0, 'rgba(255,241,168,0.7)'], [0.5, 'rgba(255,241,168,0.25)'], [1, 'rgba(255,241,168,0)']]); c.fill();
  c.fillStyle = kit.radial(c, 1, 8, 0, 6, [[0, 'rgba(255,250,214,0.85)'], [1, 'rgba(255,241,168,0)']]); c.fillRect(0, 2, 8, 12);
}

export function build(kit) {
  const out = {};
  out.car = sprite(kit, 16, 16, 2, (c, i) => drawCar(kit, c, i));
  out.racer = sprite(kit, 16, 16, 2, (c, i) => drawRacer(kit, c, i));
  out.bike = sprite(kit, 16, 16, 2, (c, i) => drawBike(kit, c, i));
  out.dozer = sprite(kit, 24, 16, 2, (c, i) => drawDozer(kit, c, i));
  out.truck = sprite(kit, 32, 16, 2, (c, i) => drawTruck(kit, c, i));
  out.bus = sprite(kit, 48, 16, 2, (c, i) => drawBus(kit, c, i));
  out.limo = sprite(kit, 48, 16, 2, (c, i) => drawLimo(kit, c, i));
  out.roller = sprite(kit, 16, 16, 4, (c, i) => drawRoller(kit, c, i));
  out.glow_head = sprite(kit, 24, 16, 1, (c) => drawGlow(kit, c));
  return out;
}
