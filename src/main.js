// Pawgger shell (owner: ui-shell): fixed-step loop, input edge buffering, title/attract/pause/options/game over/hi-scores,
// HUD, style switch (retro 224x256 pixelated <-> ghibli 896x1024 smooth, live), query params, window.__pawgger for tools.
// Sibling modules (game, renderer, audio, autopilot) are imported with try/catch: a missing one degrades, never crashes.
import { W, H, DT, THEME_T01, START_LIVES, STYLES, DEFAULT_STYLE, GHIBLI_SCALE, TOON_SCALE } from './core/defs.js';
import { createBus } from './core/events.js';
import { createInput } from './core/input.js';
import { loadSettings, saveSettings, loadHi, saveHi, hiRank, insertHi, topScore } from './core/settings.js';
import { createRng } from './core/rng.js';
import { createHud } from './ui/hud.js';
import { createMenu, createOptionsMenu } from './ui/menus.js';
import { drawTitle, drawOptions, drawHelp, drawHiScores, drawNameEntry, drawGameOver, drawPaused } from './ui/screens.js';
import { createTouch } from './ui/touch.js';
import { label as hudLabelFn } from './ui/hud.js';

const tryImp = async (f) => { try { return await f(); } catch (e) { console.warn('optional module unavailable:', e && e.message); return null; } };
const [gameMod, rendMod, audioMod, botMod] = await Promise.all([
  tryImp(() => import('./sim/game.js')), tryImp(() => import('./render/renderer.js')),
  tryImp(() => import('./audio/audio.js')), tryImp(() => import('./sim/autopilot.js')),
]);

const q = new URLSearchParams(typeof location !== 'undefined' ? location.search : '');
const qn = (k, d) => (q.has(k) && isFinite(+q.get(k)) ? +q.get(k) : d);
const store = (() => { try { return localStorage; } catch { return null; } })();
const STYLE_KEY = 'pawgger.style';

const canvas = document.getElementById('game'), frame = document.getElementById('frame');
const ctx = canvas.getContext('2d');
const settings = loadSettings();
if (q.has('nosound')) settings.mute = true;
let style = [q.get('style'), (() => { try { return store && store.getItem(STYLE_KEY); } catch { return null; } })()].find((s) => STYLES.includes(s)) || DEFAULT_STYLE;
settings.style = style;
let hi = loadHi();
const bus = createBus();
const seedQ = qn('seed', null);
const baseSeed = () => (seedQ !== null ? seedQ : (Date.now() & 0xffff) || 1);

// ------------------------------------------------------------------ game / modules
function makeGame() {
  if (!gameMod) return { state: 'title', score: 0, lives: 0, levelNum: 1, t: 0, timeLeft: 30, player: null, bays: [], step() {}, newGame() {} };
  const g = gameMod.createGame({ seed: baseSeed(), level: qn('level', 1), bus, startLives: START_LIVES });
  g.hiscore = topScore(hi);
  return g;
}
let g = makeGame();
const renderer = rendMod ? rendMod.createRenderer(ctx, { settings, style, bus }) : null;
const audio = audioMod && !q.has('nosound') ? audioMod.createAudio(bus, settings) : null;
let bot = null; try { bot = botMod && botMod.createBot ? botMod.createBot({ skill: 1 }) : null; } catch { bot = null; }
const hud = createHud();

// fallback bot (only when autopilot.js is missing): hop up on a timer, dodge sideways at random
const fbRng = createRng(7); let fbT = 0;
const fallbackBot = (gg) => { fbT -= DT; if (fbT > 0) return {}; fbT = 0.3 + fbRng.next() * 0.3; const r = fbRng.next(); return { hop: r < 0.6 ? 'up' : r < 0.8 ? 'left' : r < 0.95 ? 'right' : 'down' }; };
const botCmd = (gg) => { try { if (bot) { const c = bot.decide(gg) || {}; return c; } } catch { /* fall through */ } return fallbackBot(gg); };

// ------------------------------------------------------------------ ui state
const ui = { mode: 'title', t: 0, idle: 0, acc: 0, paused: false, bot: q.has('bot'), attractT: 0, goT: 0, name: '', rank: -1, hl: -1, back: 'title', lastMusic: null, hop: null, screenT: 0 };
const IDLE_ATTRACT = 8;
const sfx = (n) => { try { audio && audio.play && audio.play(n); } catch { /* ignore */ } };
const persist = () => { saveSettings(settings); try { store && store.setItem(STYLE_KEY, settings.style); } catch { /* ignore */ } };

const titleMenu = createMenu([
  { id: 'start', text: 'START GAME' }, { id: 'options', text: 'OPTIONS' }, { id: 'hi', text: 'HI-SCORES' }, { id: 'help', text: 'HOW TO PLAY' },
], { onMove: () => sfx('menu_move') });
const pauseMenu = createMenu([{ id: 'resume', text: 'RESUME' }, { id: 'options', text: 'OPTIONS' }, { id: 'quit', text: 'QUIT TO TITLE' }], { onMove: () => sfx('menu_move') });
const optMenu = createOptionsMenu(settings, {
  move: () => sfx('menu_move'),
  change(k) {
    if (k === 'style') applyStyle(settings.style);
    else { audio && audio.setSettings && audio.setSettings(settings); applyBody(); }
    persist();
  },
});

// ------------------------------------------------------------------ style switch + layout
const inp = createInput({ target: window });
const touch = createTouch({ input: inp, canvas, onStyle: () => toggleStyle(), onPause: () => onAct({ act: 'pause' }) });
function applyBody() { document.body.classList.toggle('ghibli', style === 'ghibli' || style === 'toon'); document.body.classList.toggle('toon', style === 'toon'); document.body.classList.toggle('crt', !!settings.crt); document.body.classList.toggle('touch', touch.enabled); }
function layout() {
  const vw = window.innerWidth, vh = window.innerHeight - (touch.enabled ? 176 : 0);
  let s = Math.min(vw / W, vh / H);
  if (style === 'retro' && s >= 1) s = Math.floor(s);
  s = Math.max(0.25, s);
  frame.style.width = Math.round(W * s) + 'px'; frame.style.height = Math.round(H * s) + 'px';
}
function applyStyle(id) {
  if (!STYLES.includes(id)) return style;
  style = id; settings.style = id;
  const k = id === 'ghibli' ? GHIBLI_SCALE : id === 'toon' ? TOON_SCALE : 1;
  if (canvas.width !== W * k) { canvas.width = W * k; canvas.height = H * k; }
  applyBody(); layout();
  if (renderer) renderer.setStyle(id);
  if (audio && audio.setSettings) { audio.setSettings({ style: id }); ui.lastMusic = null; updateMusic(); }
  persist();
  return style;
}
const toggleStyle = () => { sfx('menu_select'); return applyStyle(STYLES[(STYLES.indexOf(style) + 1) % STYLES.length]); };
window.addEventListener('resize', layout);

// ------------------------------------------------------------------ music
function musicFor() {
  const m = ui.mode;
  if (m !== 'play' && m !== 'gameover') return 'title';
  if (m === 'gameover') return 'gameover';
  switch (g.state) {
    case 'intro': case 'play': return 'play_' + ((g.level && g.level.theme) || 'day');
    case 'dying': return 'death';
    case 'levelclear': return 'levelclear';
    case 'gameover': return 'gameover';
    default: return 'title';
  }
}
function updateMusic() {
  if (!audio || !audio.music) return;
  const n = musicFor();
  if (n !== ui.lastMusic) { ui.lastMusic = n; try { audio.music(n); } catch { /* ignore */ } }
}
bus.on('state', updateMusic);
bus.on('level_start', () => { if (q.has('time') && g.level) { const t01 = qn('time', 1); g.level.theme = t01 < 0.15 ? 'night' : t01 < 0.65 ? 'dusk' : 'day'; } updateMusic(); });

// ------------------------------------------------------------------ flow
function toTitle() { g = makeGame(); renderer && renderer.clearFx && renderer.clearFx(); ui.mode = 'title'; ui.paused = false; ui.idle = 0; ui.hop = null; titleMenu.sel = 0; updateMusic(); }
function startGame() {
  g = makeGame(); renderer && renderer.clearFx && renderer.clearFx();
  g.step({ start: true });
  ui.mode = 'play'; ui.paused = false; ui.acc = 0; ui.hop = null; ui.idle = 0; sfx('start'); updateMusic();
}
function startAttract() { g = makeGame(); g.step({ start: true }); ui.mode = 'attract'; ui.attractT = 0; ui.acc = 0; updateMusic(); }
function toGameOver() {
  ui.mode = 'gameover'; ui.goT = 0; ui.rank = hiRank(hi, g.score); ui.name = ''; updateMusic();
}
function setPause(p) { if (ui.mode !== 'play') return; ui.paused = p; g.paused = p; pauseMenu.sel = 0; if (p) sfx('menu_select'); }

function onAct(e) {
  try { audio && audio.unlock && audio.unlock(); } catch { /* ignore */ }
  const a = e.act; ui.idle = 0;
  if (ui.mode === 'attract') { toTitle(); return; }
  const letter = a === 'char' ? e.key : null;
  if (ui.mode === 'entry') {
    if (letter) { if (ui.name.length < 3) ui.name += letter; sfx('menu_move'); }
    else if (a === 'backspace' || a === 'back') ui.name = ui.name.slice(0, -1);
    else if (a === 'confirm' && ui.name.length) {
      hi = insertHi(hi, ui.name.padEnd(3, '-'), g.score); saveHi(hi); ui.hl = hi.findIndex((x) => x.name === ui.name.padEnd(3, '-') && x.score === Math.floor(g.score));
      ui.mode = 'hi'; ui.back = 'title'; ui.screenT = 0; sfx('menu_select');
    }
    return;
  }
  if (a === 'mute') { settings.mute = !settings.mute; audio && audio.setSettings && audio.setSettings(settings); persist(); return; }
  if (a === 'crt') { settings.crt = !settings.crt; applyBody(); persist(); return; }
  if (a === 'fullscreen') { try { (document.fullscreenElement ? document.exitFullscreen() : frame.requestFullscreen()); } catch { /* ignore */ } return; }
  if (letter === 'G') { toggleStyle(); return; }
  if (a === 'help' && (ui.mode === 'title' || (ui.mode === 'play' && ui.paused))) { ui.back = ui.mode; ui.mode = 'help'; ui.screenT = 0; return; }
  switch (ui.mode) {
    case 'title': {
      if (a === 'confirm' || a === 'up' || a === 'down' || a === 'left' || a === 'right') {
        const id = titleMenu.act(a);
        if (id) { sfx('menu_select'); if (id === 'start') startGame(); else if (id === 'options') { ui.back = 'title'; ui.mode = 'options'; optMenu.sel = 0; } else if (id === 'hi') { ui.mode = 'hi'; ui.hl = -1; ui.back = 'title'; ui.screenT = 0; } else if (id === 'help') { ui.back = 'title'; ui.mode = 'help'; ui.screenT = 0; } }
      }
      break;
    }
    case 'options': {
      if (a === 'back') { ui.mode = ui.back === 'play' ? 'play' : 'title'; break; }
      const id = optMenu.act(a);
      if (id === 'back') { sfx('menu_select'); ui.mode = ui.back === 'play' ? 'play' : 'title'; }
      break;
    }
    case 'help': case 'hi':
      if (ui.screenT > 0.25 && (a === 'confirm' || a === 'back' || a === 'char' || a === 'jump')) { ui.mode = ui.back === 'play' ? 'play' : 'title'; sfx('menu_select'); }
      break;
    case 'gameover':
      if (a === 'confirm' && ui.goT > 0.8) { sfx('menu_select'); if (ui.rank >= 0) ui.mode = 'entry'; else { g.step({ start: true }); toTitle(); } updateMusic(); }
      break;
    case 'play':
      if (ui.paused) {
        if (a === 'pause' || a === 'back') { setPause(false); break; }
        const id = pauseMenu.act(a);
        if (id === 'resume') setPause(false);
        else if (id === 'options') { ui.back = 'play'; ui.mode = 'options'; optMenu.sel = 0; }
        else if (id === 'quit') toTitle();
      } else if (a === 'pause' || a === 'back') setPause(true);
      else if (a === 'up' || a === 'down' || a === 'left' || a === 'right') ui.hop = a;
      break;
    default: break;
  }
}

inp.on(onAct);

document.addEventListener('visibilitychange', () => { if (document.hidden && ui.mode === 'play' && !ui.paused) setPause(true); });
window.addEventListener('blur', () => { if (ui.mode === 'play' && !ui.paused) setPause(true); });

// ------------------------------------------------------------------ update / render
function simStep() {
  const cmd = ui.bot || ui.mode === 'attract' ? { ...botCmd(g) } : { hop: ui.hop };
  if (!(ui.bot || ui.mode === 'attract')) ui.hop = null;
  g.step(cmd);
}
function update(dt) {
  ui.t += dt; ui.screenT += dt;
  if (ui.mode === 'play' || ui.mode === 'attract') {
    if (ui.mode === 'play' && ui.paused) { ui.acc = 0; return; }
    ui.acc += dt;
    let n = 0;
    while (ui.acc >= DT && n++ < 8) {
      simStep(); ui.acc -= DT;
      if (g.state === 'gameover') break;
    }
    if (n >= 8) ui.acc = 0;
    if (ui.mode === 'attract') { ui.attractT += dt; if (g.state === 'gameover' || ui.attractT > 50) toTitle(); }
    else if (g.state === 'gameover') toGameOver();
  } else {
    if (g.state === 'title' || ui.mode === 'gameover') g.t += dt;   // keep the scene alive behind menus
    if (ui.mode === 'gameover') ui.goT += dt;
    if (ui.mode === 'title') { ui.idle += dt; if (ui.idle > IDLE_ATTRACT && !q.has('noattract')) startAttract(); }
  }
}
function render(dt) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (renderer) renderer.draw(g, ui.mode === 'play' && !ui.paused ? ui.acc / DT : 0, ui.paused ? 0 : undefined);
  else { ctx.fillStyle = '#123'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  const cs = canvas.width / W;
  ctx.setTransform(cs, 0, 0, cs, 0, 0); ctx.imageSmoothingEnabled = style !== 'retro'; ctx.globalAlpha = 1;
  const t = ui.t, m = ui.mode;
  if (m === 'play' || m === 'attract' || m === 'gameover' || m === 'entry') hud.draw(ctx, g, { style, hi: topScore(hi), t });
  if (m === 'title') drawTitle(ctx, style, t, titleMenu);
  else if (m === 'options') drawOptions(ctx, style, t, optMenu, ui.back === 'play' ? 'OPTIONS' : 'OPTIONS');
  else if (m === 'help') drawHelp(ctx, style, t);
  else if (m === 'hi') drawHiScores(ctx, style, t, hi, ui.hl);
  else if (m === 'entry') drawNameEntry(ctx, style, t, ui.name, g.score);
  else if (m === 'gameover') drawGameOver(ctx, style, t, g);
  else if (m === 'play' && ui.paused) drawPaused(ctx, style, t, pauseMenu);
  else if (m === 'attract' && Math.floor(t * 2) % 2 === 0) { hudLabel('DEMO  PRESS ANY KEY', W / 2, 98); }
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  void dt;
}
function hudLabel(s, x, y) { hudLabelFn(ctx, style, s, x, y, { align: 'center', color: '#ffd23a' }); }

let last = performance.now();
function loop(now) {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000)); last = now;
  try { inp.poll(); update(dt); render(dt); } catch (e) { console.error(e); }
  requestAnimationFrame(loop);
}

// ------------------------------------------------------------------ boot
applyStyle(style);
layout();
if (q.get('screen') === 'play' || q.has('autostart')) startGame();
else if (q.get('screen') === 'gameover') { startGame(); g.score = 1234; g.lives = 0; g.state = 'gameover'; toGameOver(); }
else if (q.get('screen') === 'hi') { ui.mode = 'hi'; ui.back = 'title'; }
else if (q.get('screen') === 'options') { ui.mode = 'options'; ui.back = 'title'; }
else if (q.get('screen') === 'help') { ui.mode = 'help'; ui.back = 'title'; }
if (q.has('bot')) ui.bot = true;

window.__pawgger = {
  get game() { return g; }, get ui() { return ui; }, get renderer() { return renderer; }, get audio() { return audio; },
  step(n = 1) { for (let i = 0; i < n; i++) { if (ui.mode === 'title') g.t += DT; else simStep(); } if (g.state === 'gameover' && ui.mode === 'play') toGameOver(); render(0); return g.state; },
  state() { return { mode: ui.mode, state: g.state, score: g.score, lives: g.lives, level: g.levelNum, t: g.t, style, paused: ui.paused, canvas: [canvas.width, canvas.height] }; },
  setBot(b) { ui.bot = !!b; }, setStyle: applyStyle, toggleStyle, act: (a, extra) => onAct({ act: a, ...extra }), start: startGame, hop(d) { ui.hop = d; },
};
requestAnimationFrame(loop);
