// Screens (owner: ui-shell): title, options frame, help, hi-score table, name entry, game over, pause. Logical 224x256 units.
// Story texts per ARCHITECTURE section 13. Every screen is a pure function of (ctx, style, state, t).
import { W, H } from '../core/defs.js';
import { label, plate, catHead, textWidth, COLORS as C } from './hud.js';

export const TAGLINE = 'FROM THE WHOPPER TO THE WORKSTATION';
export const GAMEOVER_TEXT = 'OUT OF WHOPPERS';
export const COMPASS = 'BURGER KING > MICRO CENTER';

const dim = (ctx, a, y0 = 0, y1 = H) => { ctx.save(); ctx.fillStyle = `rgba(8,4,16,${a})`; ctx.fillRect(0, y0, W, y1 - y0); ctx.restore(); };

function paw(ctx, x, y, s, color) {
  ctx.save(); ctx.fillStyle = color;
  const dot = (dx, dy, r) => { ctx.beginPath(); ctx.arc(x + dx * s, y + dy * s, r * s, 0, 7); ctx.fill(); };
  dot(0, 1, 2.1); dot(-2.2, -0.8, 1); dot(-0.8, -2, 1); dot(0.8, -2, 1); dot(2.2, -0.8, 1);
  ctx.restore();
}

/** Big logo: "PAWGGER" with a chunky shadow, bobbing letters, paw prints. */
export function drawLogo(ctx, style, t, y = 30) {
  const text = 'PAWGGER', gh = style === 'ghibli';
  ctx.save();
  if (!gh) {
    // 4x blocky letters, one by one so each bobs. W uses a 7-column glyph (the 5-column font W reads as N at 4x).
    const adv = (ch) => (ch === 'W' ? 7 : 5) * 4 + 4;
    const total = [...text].reduce((a, ch) => a + adv(ch), 0) - 4;
    let gx = Math.round((W - total) / 2);
    const LOGO_W = ['#.....#', '#.....#', '#..#..#', '#..#..#', '#.#.#.#', '##...##', '.#...#.'];
    for (let i = 0; i < text.length; i++) {
      const by = y + Math.round(Math.sin(t * 3 + i * 0.7) * 2), ch = text[i];
      const pass = (dx, dy, color) => {
        if (ch !== 'W') { label(ctx, style, ch, gx + dx, by + dy, { scale: 4, color, shadow: null }); return; }
        ctx.fillStyle = color;
        LOGO_W.forEach((row, j) => [...row].forEach((c, k) => { if (c === '#') ctx.fillRect(gx + dx + k * 4, by + dy + j * 4, 4, 4); }));
      };
      pass(4, 4, '#3a1408'); pass(2, 2, '#a8501a'); pass(0, 0, i % 2 ? '#ffb347' : '#ff8a2a');
      gx += adv(ch);
    }
  } else {
    const face = '"Palatino Linotype", Palatino, Georgia, serif'; let px = 38;
    ctx.font = `bold ${px}px ${face}`; const mw = ctx.measureText(text).width; if (mw > 160) { px = Math.floor(px * 160 / mw); ctx.font = `bold ${px}px ${face}`; }
    ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    const by = y + px * 0.8 + Math.sin(t * 2) * 1.5;
    ctx.lineWidth = 7; ctx.strokeStyle = 'rgba(40,16,40,0.7)'; ctx.strokeText(text, W / 2, by);
    const g = ctx.createLinearGradient(0, by - 30, 0, by); g.addColorStop(0, '#ffd27a'); g.addColorStop(1, '#f07a2a');
    ctx.fillStyle = g; ctx.fillText(text, W / 2, by);
    ctx.lineWidth = 1.2; ctx.strokeStyle = 'rgba(255,246,220,0.8)'; ctx.strokeText(text, W / 2, by);
  }
  paw(ctx, 13, y + 14, 2.2, gh ? '#ffe2b0' : '#ffb347'); paw(ctx, W - 13, y + 14, 2.2, gh ? '#ffe2b0' : '#ffb347');
  ctx.restore();
}

export function drawTitle(ctx, style, t, menu, o = {}) {
  dim(ctx, 0.5, 16, 224);
  drawLogo(ctx, style, t, 26);
  label(ctx, style, 'A COLBY THE CAT ADVENTURE', W / 2, 70, { align: 'center', color: C.white });
  // ghibli's serif is wider than the pixel font: shrink so the plate keeps a margin inside the frame
  const full = textWidth(ctx, style, TAGLINE), ts = Math.min(1, (W - 24) / full), tw = full * ts;
  plate(ctx, style, W / 2 - tw / 2 - 5, 82, tw + 10, 12, { alpha: 0.8, border: '#ff8a2a' });
  label(ctx, style, TAGLINE, W / 2, 85 + (1 - ts) * 3, { align: 'center', color: '#ffb347', scale: ts });
  catHead(ctx, W / 2 - 5 + Math.sin(t * 2) * 0, 100 + Math.abs(Math.sin(t * 5)) * -3, style === 'ghibli');
  menu.draw(ctx, style, 120, { t });
  label(ctx, style, COMPASS, W / 2, 190, { align: 'center', color: C.gold });
  label(ctx, style, 'ARROWS/WASD MOVE  ENTER SELECT', W / 2, 201, { align: 'center', color: C.white });
  label(ctx, style, 'G STYLE   P PAUSE   M MUTE', W / 2, 211, { align: 'center', color: C.white });
  if (o.hint && Math.floor(t * 2) % 2 === 0) label(ctx, style, o.hint, W / 2, 112, { align: 'center', color: C.gold });
}

export function drawOptions(ctx, style, t, menu, title = 'OPTIONS') {
  dim(ctx, 0.72);
  label(ctx, style, title, W / 2, 40, { scale: 2, align: 'center', color: C.gold });
  menu.draw(ctx, style, 78, { t, lh: 16 });
  label(ctx, style, 'LEFT/RIGHT CHANGE   ESC BACK', W / 2, 220, { align: 'center', color: C.white });
}

const HELP = [
  'COLBY JUST ATE HIS TRIPLE WHOPPER AT',
  'THE BURGER KING. NOW HE MUST CROSS',
  "PETE'S PARKWAY TO THE MICRO CENTER",
  'TO BUY COMPUTERS AND HANG WITH THE',
  'NERDS.',
  '',
  'HOP ACROSS THE TRAFFIC, RIDE LOGS AND',
  'TURTLES, AND REACH A MICRO CENTER',
  'DOOR. FILL ALL FIVE DOORS TO CLEAR',
  'THE LEVEL. MOUSE 200  GPU 150.',
  '',
  'BEWARE CROCS, SNAKES AND PETE THE RAT.',
  '',
  'BURGER KING / MICRO CENTER NAMES ARE',
  'AFFECTIONATE PARODY, UNAFFILIATED.',
];
export function drawHelp(ctx, style, t) {
  dim(ctx, 0.82);
  label(ctx, style, 'HOW TO PLAY', W / 2, 20, { scale: 2, align: 'center', color: C.gold });
  HELP.forEach((l, i) => label(ctx, style, l, W / 2, 48 + i * 11, { align: 'center', color: i > 12 ? C.dim : C.white }));
  label(ctx, style, 'PARKWAY RUNS NORTH-SOUTH', W / 2, 226, { align: 'center', color: C.gold });
  label(ctx, style, 'PRESS ANY KEY', W / 2, 240, { align: 'center', color: Math.floor(t * 2) % 2 ? C.white : C.dim });
}

export function drawHiScores(ctx, style, t, list, hl = -1) {
  dim(ctx, 0.8);
  label(ctx, style, 'HI-SCORES', W / 2, 24, { scale: 2, align: 'center', color: C.gold });
  list.forEach((e, i) => {
    const y = 56 + i * 16, on = i === hl && Math.floor(t * 4) % 2 === 0;
    if (i === hl) plate(ctx, style, 40, y - 3, W - 80, 13, { alpha: 0.7, border: C.gold });
    label(ctx, style, `${i + 1}.`, 48, y, { color: C.dim });
    label(ctx, style, e.name, 70, y, { color: on ? C.white : C.gold });
    label(ctx, style, String(e.score).padStart(6, '0'), W - 48, y, { align: 'right', color: on ? C.gold : C.white });
  });
  label(ctx, style, 'PRESS ANY KEY', W / 2, 226, { align: 'center', color: Math.floor(t * 2) % 2 ? C.white : C.dim });
}

export function drawNameEntry(ctx, style, t, name, score) {
  dim(ctx, 0.78);
  label(ctx, style, 'NEW HI-SCORE!', W / 2, 52, { scale: 2, align: 'center', color: C.gold });
  label(ctx, style, String(score).padStart(6, '0'), W / 2, 78, { scale: 2, align: 'center', color: C.white });
  label(ctx, style, 'ENTER YOUR INITIALS', W / 2, 108, { align: 'center', color: C.white });
  for (let i = 0; i < 3; i++) {
    const x = W / 2 - 30 + i * 24, ch = name[i] || '', cur = i === name.length && Math.floor(t * 3) % 2 === 0;
    plate(ctx, style, x - 2, 126, 18, 22, { alpha: 0.85, border: i === name.length ? C.gold : C.dim });
    label(ctx, style, ch || (cur ? '_' : ''), x + 7, 130, { scale: 2, align: 'center', color: C.gold });
  }
  label(ctx, style, 'TYPE A-Z   ENTER OK', W / 2, 170, { align: 'center', color: C.dim });
}

export function drawGameOver(ctx, style, t, g) {
  dim(ctx, 0.6, 64, 190);
  label(ctx, style, 'GAME OVER', W / 2, 78, { scale: 3, align: 'center', color: C.red });
  label(ctx, style, GAMEOVER_TEXT, W / 2, 108, { scale: 1, align: 'center', color: C.gold });
  label(ctx, style, `SCORE ${String(g.score).padStart(6, '0')}   LEVEL ${g.levelNum}`, W / 2, 126, { align: 'center', color: C.white });
  if (Math.floor(t * 2) % 2 === 0) label(ctx, style, 'PRESS ENTER', W / 2, 160, { align: 'center', color: C.gold });
}

export function drawPaused(ctx, style, t, menu) {
  dim(ctx, 0.6);
  label(ctx, style, 'PAUSED', W / 2, 70, { scale: 3, align: 'center', color: C.gold });
  menu.draw(ctx, style, 110, { t, lh: 16 });
}
