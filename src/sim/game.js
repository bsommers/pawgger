// Pawgger simulation core (ARCHITECTURE sections 4 and 5). Pure, deterministic, fixed step, Node-safe.
import { W, DT, CELL, ROW, rowY, BAY_X, BAY_TOL, START_ROW, TUNING, SCORES, TIME_LIMIT, START_LIVES, THEMES } from '../core/defs.js';
import { createRng } from '../core/rng.js';
import { createPlayer, resetPlayer, setMode, animatePlayer } from './player.js';
import { startHop, stepHop, queueHop, takeQueued } from '../lib/grid-hop.js';

// ---- optional collaborators (other agents own them): guarded imports with fallbacks ----
async function tryImport(path) { try { return await import(path); } catch { return {}; } }
const lanesMod = await tryImport('../levels/levels.js');   // levels.js re-exports lanes.js and adds levelDef
const peteMod = await tryImport('./pete.js');
const baysMod = await tryImport('./bays.js');

const mod = (a, n) => ((a % n) + n) % n;
const fallbackLanes = {
  levelDef: (level, seed) => ({ level, seed, theme: THEMES[(level - 1) % 3], speedMul: 1, lanes: [], peteMode: 'none', cheeseEvery: 0,
    bays: BAY_X.map((cx) => ({ cx, hazard: null, bonus: null })) }),
  itemX: (lane, item, t) => mod(item.x0 + lane.dir * lane.speed * t, lane.ring) - lane.pad,
  turtleState: (item, t) => {
    const d = { ...TUNING.turtleDive, ...(item.dive || {}) };
    const cyc = d.sink + d.under + d.rise, tt = mod(t + (d.phase || 0), d.period + 0);
    const u = d.period - cyc;                      // up time = period - dive parts
    if (tt < u) return 'up';
    if (tt < u + d.sink) return 'sink';
    if (tt < u + d.sink + d.under) return 'under';
    return 'rise';
  },
  crocState: (item, t) => {
    const c = { ...TUNING.crocCycle, ...(item.croc || {}) };
    return mod(t + (c.phase || 0), c.period) >= c.period - c.open ? 'open' : 'closed';
  },
};
const L0 = { ...fallbackLanes };
for (const k of Object.keys(fallbackLanes)) if (typeof lanesMod[k] === 'function') L0[k] = lanesMod[k];
if (typeof lanesMod.supports === 'function') L0.supports = lanesMod.supports;

// Head rect of a croc item: 16 px at the leading end.
function crocHead(lane, item, left) { return lane.dir > 0 ? { x: left + item.w - 16, w: 16 } : { x: left, w: 16 }; }

function makeSupports(L) {
  if (L.supports) return L.supports;
  const m = TUNING.supportMargin;
  return (lane, item, t, px) => {
    const left = L.itemX(lane, item, t);
    if (item.croc) {
      const h = crocHead(lane, item, left);
      const backL = lane.dir > 0 ? left : left + 16, backR = backL + 48;
      if (px >= backL - m && px <= backR + m) return 'back';
      if (L.crocState(item, t) === 'closed' && px >= h.x - m && px <= h.x + h.w + m) return 'head';
      return null;
    }
    if (item.dive) {
      const s = L.turtleState(item, t);
      if (s === 'under') return null;
      if (s === 'sink') {
        const d = { ...TUNING.turtleDive, ...item.dive };
        const cyc = d.period - (d.sink + d.under + d.rise), tt = mod(t + (item.dive.phase || 0), d.period);
        if (tt - cyc > d.sink / 2) return null;
      }
    }
    return (px >= left - m && px <= left + item.w + m) ? 'back' : null;
  };
}

// ---- fallbacks for sim-extras modules ----
function fbInitBays(g) {
  g.bays = g.level.bays.map((b) => ({ cx: b.cx, hazard: b.hazard ?? null, bonus: b.bonus ?? null, filled: false, open: false, bonusT: 0 }));
}
function fbInitPete(g) { g.pete = { mode: 'hidden', x: 0, dir: 1, w: 20, line: '', lineT: 0 }; g.extra = []; }
function fbBayForHop(g, x) {
  let best = -1, bd = Infinity;
  g.bays.forEach((b, i) => { const d = Math.abs(x - b.cx); if (d < bd) { bd = d; best = i; } });
  if (best < 0 || bd > BAY_TOL) return { index: -1, ok: false, why: 'wall' };
  const b = g.bays[best];
  if (b.filled) return { index: best, ok: false, why: 'filled' };
  if (b.hazard && b.open) return { index: best, ok: false, why: 'hazard' };
  return { index: best, ok: true, why: null };
}
const initPete = peteMod.initPete || fbInitPete;
const updatePete = peteMod.updatePete || (() => {});
const peteRect = peteMod.peteRect || (() => null);
const initBays = baysMod.initBays || fbInitBays;
const updateBays = baysMod.updateBays || (() => {});
const bayForHop = baysMod.bayForHop || fbBayForHop;

const INTRO_T = 1.5, DYING_T = 1.2, HOME_T = 0.8, CLEAR_T = 2.5;
const overlap = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;

export function createGame(opts = {}) {
  const seed = opts.seed ?? 1;
  const bus = opts.bus || { emit() {}, on() { return () => {}; } };
  const L = { ...L0, ...(opts.lanes || {}) };
  const supports = (opts.lanes && opts.lanes.supports) || (opts.lanes && opts.lanes.itemX ? makeSupports({ ...L, supports: null }) : makeSupports(L));
  const levelDefFn = opts.levelDef || L.levelDef;
  const startLives = opts.startLives ?? START_LIVES;
  const emit = (type, payload) => bus.emit(type, payload);

  const g = {
    emit,
    seed, rng: createRng(seed), state: 'title', levelNum: opts.level ?? 1, level: null, t: 0, timeLeft: TIME_LIMIT,
    score: 0, lives: startLives, player: createPlayer(), bays: [], extra: [], pete: null, popups: [],
    bestRow: START_ROW, stateT: 0, deathCause: null, nextExtra: SCORES.extraLifeFirst, lanesByRow: {},
    _prev: new Map(), _honk: new Map(),
  };

  function setState(to) {
    const from = g.state;
    if (from === to) return;
    g.state = to; g.stateT = 0;
    emit('state', { from, to });
  }
  function popup(x, y, text) { g.popups.push({ x, y, text, age: 0, ttl: 1.0 }); }
  function addScore(n) {
    g.score += n;
    while (g.score >= g.nextExtra) {
      g.nextExtra += SCORES.extraLifeEvery;
      g.lives += 1;
      emit('extra_life', { lives: g.lives });
    }
  }

  function buildLevel(n) {
    g.levelNum = n;
    g.level = levelDefFn(n, seed);
    g.lanesByRow = {};
    for (const lane of g.level.lanes) g.lanesByRow[lane.row] = lane;
    g.t = 0;
    g._prev.clear(); g._honk.clear();
    g.extra = [];
    initBays(g);
    if (!g.bays || !g.bays.length) fbInitBays(g);
    initPete(g);
    if (!g.pete) fbInitPete(g);
    if (!g.extra) g.extra = [];
    resetPlayer(g.player);
    g.timeLeft = TIME_LIMIT; g.bestRow = START_ROW; g.deathCause = null;
  }
  function startLevel(n) {
    buildLevel(n);
    setState('intro');
    emit('level_start', { level: n, theme: g.level.theme });
  }
  function newGame() {
    g.score = 0; g.lives = startLives; g.nextExtra = SCORES.extraLifeFirst; g.popups = [];
    startLevel(opts.level ?? 1);
  }

  // ---- hop ----
  const hopCfg = {
    cell: CELL, hopTime: TUNING.hopTime,
    limit(p, t, dir) {
      if (dir === 'down' && p.row >= START_ROW) return null;
      if (dir === 'up' && p.row <= ROW.home) return null;
      if (dir === 'left' || dir === 'right') {
        if (!ROW.river.includes(p.row)) t.x = Math.max(TUNING.hopMaxX, Math.min(TUNING.hopMaxXR, t.x));
      }
      return t;
    },
  };
  function tryHop(dir) {
    const p = g.player;
    if (!startHop(p, dir, hopCfg)) return false;
    p.riding = null;
    p.mode = 'hop';
    emit('hop', { dir, x: p.hop.fx, y: p.hop.fy });
    return true;
  }

  // ---- death ----
  function die(cause, kind) {
    const p = g.player;
    if (g.state !== 'play' || p.mode === 'squash' || p.mode === 'drown') return;
    g.deathCause = cause;
    const squashy = cause === 'squash' || cause === 'pete';
    if (squashy) emit('squash', { x: p.x, y: p.y, kind: kind ?? cause });
    else if (cause === 'drown') emit('splash', { x: p.x, y: p.y });
    setMode(p, squashy ? 'squash' : 'drown');
    setState('dying');
    emit('death', { cause, x: p.x, y: p.y, livesLeft: g.lives - 1 });
  }
  function respawn() {
    resetPlayer(g.player);
    g.timeLeft = TIME_LIMIT; g.bestRow = START_ROW;
    setState('play');
  }

  // ---- geometry ----
  const itemRectAt = (lane, item) => ({ x: L.itemX(lane, item, g.t), y: rowY(lane.row) - TUNING.itemHalfH, w: item.w, h: TUNING.itemHalfH * 2 });
  const playerBox = () => { const p = g.player; return { x: p.x - TUNING.hitHalfW, y: p.y - TUNING.hitHalfH, w: TUNING.hitHalfW * 2, h: TUNING.hitHalfH * 2 }; };

  function checkRoad() {
    const pb = playerBox();
    for (const row of ROW.road) {
      const lane = g.lanesByRow[row];
      if (!lane) continue;
      for (const item of lane.items) if (overlap(pb, itemRectAt(lane, item))) { die('squash', item.kind); return true; }
    }
    return false;
  }
  function checkHazards() {
    const pb = playerBox();
    const pr = peteRect(g);
    if (pr && g.pete.mode === 'patrol' && overlap(pb, { x: pr.x, y: pr.y, w: pr.w, h: pr.h })) { die('pete'); return true; }
    for (const e of g.extra) if (overlap(pb, { x: e.x, y: rowY(e.row) - TUNING.itemHalfH, w: e.w, h: TUNING.itemHalfH * 2 })) { die('pete'); return true; }
    return false;
  }
  function checkRiver(justLanded) {
    const p = g.player;
    if (p.x < -TUNING.edgeKill || p.x > W + TUNING.edgeKill) { die('edge'); return; }
    const lane = g.lanesByRow[p.row];
    if (!lane) { die('drown'); return; }
    const pb = playerBox();
    for (const item of lane.items) {
      if (!item.croc || L.crocState(item, g.t) !== 'open') continue;
      const left = L.itemX(lane, item, g.t), h = crocHead(lane, item, left);
      if (overlap(pb, { x: h.x, y: rowY(lane.row) - TUNING.itemHalfH, w: h.w, h: TUNING.itemHalfH * 2 })) { die('croc'); return; }
    }
    let found = null;
    if (p.riding) { const cur = lane.items.find((i) => i.id === p.riding.id); if (cur && supports(lane, cur, g.t, p.x)) found = cur; }
    if (!found) for (const item of lane.items) if (supports(lane, item, g.t, p.x)) { found = item; break; }
    if (!found) { die('drown'); return; }
    const wasRiding = !!p.riding;
    p.riding = { lane: lane.row, id: found.id };
    if (p.mode !== 'riding') p.mode = 'riding';
    if (justLanded || !wasRiding) emit('land_log', { x: p.x, y: p.y, kind: found.kind });
  }

  function fillBay(r) {
    const p = g.player, b = g.bays[r.index];
    b.filled = true;
    p.x = b.cx; p.y = rowY(ROW.home); p.row = ROW.home; p.facing = 'up';
    setMode(p, 'home');
    const tb = SCORES.timeBonusPerSec * Math.floor(g.timeLeft);
    const points = SCORES.bay + tb;
    let bonus = 0;
    if (b.bonus && b.bonusT > 0) {
      bonus = b.bonus === 'fish' ? SCORES.bonusFish : SCORES.bonusMouse;
      emit('bonus', { type: b.bonus, bay: r.index, points: bonus });
      b.bonusT = 0;
    }
    emit('home', { bay: r.index, x: b.cx, timeLeft: g.timeLeft, points, bonus });
    popup(b.cx, rowY(ROW.home), String(points + bonus));
    addScore(points + bonus);
    if (g.bays.every((x) => x.filled)) {
      emit('level_clear', { level: g.levelNum, bonus: SCORES.levelClear });
      addScore(SCORES.levelClear);
      setState('levelclear');
    }
  }

  function onLanded() {
    const p = g.player;
    p.row = Math.round((p.y - CELL / 2) / CELL);
    p.mode = 'idle';
    if (p.row === ROW.home) {
      const r = bayForHop(g, p.x);
      if (r.ok) { fillBay(r); return; }
      emit('bay_hit', { bay: r.index, why: r.why });
      die(r.why === 'hazard' ? 'bay_hazard' : 'bay_wall');
      return;
    }
    if (ROW.river.includes(p.row)) {
      checkRiver(true);
      if (g.state !== 'play') return;
    }
    if (p.row < g.bestRow) {
      g.bestRow = p.row;
      emit('row_forward', { row: p.row, points: SCORES.forwardRow });
      popup(p.x, p.y, String(SCORES.forwardRow));
      addScore(SCORES.forwardRow);
    }
  }

  function laneEvents() {
    const p = g.player;
    for (const lane of g.level.lanes) {
      for (const item of lane.items) {
        const key = lane.row + ':' + item.id;
        const left = L.itemX(lane, item, g.t);
        const onscreen = left + item.w > 0 && left < W;
        if (item.dive) {
          const s = L.turtleState(item, g.t), prev = g._prev.get(key);
          if (prev === 'up' && s === 'sink' && onscreen) emit('turtle_dive', { lane: lane.row, x: left });
          g._prev.set(key, s);
        } else if (item.croc) {
          const s = L.crocState(item, g.t), prev = g._prev.get(key);
          if (prev === 'closed' && s === 'open' && onscreen) emit('croc_snap', { lane: lane.row, x: left });
          g._prev.set(key, s);
        } else if (item.kind === 'limo') {
          const cd = g._honk.get(key) ?? 0;
          if (cd > 0) g._honk.set(key, cd - DT);
          else if (Math.abs(p.row - lane.row) <= 1 && Math.abs(left + item.w / 2 - p.x) < 56 && onscreen) {
            g._honk.set(key, 3);
            emit('honk', { lane: lane.row, x: left });
          }
        }
      }
    }
  }

  function playStep(cmd) {
    const p = g.player;
    const alive = () => g.state === 'play' && p.mode !== 'home';
    // input
    if (cmd.hop && alive()) { if (p.hop) queueHop(p, cmd.hop); else tryHop(cmd.hop); }
    g.t += DT;
    // timer
    if (alive()) {
      const prev = g.timeLeft;
      g.timeLeft -= DT;
      if (g.timeLeft > 0 && Math.floor(g.timeLeft) < Math.floor(prev) && Math.floor(prev) <= 7) emit('tick_low', { timeLeft: Math.floor(prev) });
      if (g.timeLeft <= 0) { g.timeLeft = 0; die('timeout'); }
    }
    if (g.state === 'play') { try { updateBays(g, DT); updatePete(g, DT); } catch { /* sibling module bug must not crash the sim */ } }
    if (g.state === 'play') laneEvents();
    // hop
    if (g.state === 'play' && p.hop) {
      if (stepHop(p, DT, hopCfg) === 'landed') {
        onLanded();
        if (g.state === 'play' && p.mode !== 'home') { const q = takeQueued(p); if (q) tryHop(q); }
      }
    }
    // carry + river support while idle/riding
    if (g.state === 'play' && !p.hop && p.mode !== 'home' && ROW.river.includes(p.row)) {
      if (p.riding) { const lane = g.lanesByRow[p.riding.lane]; if (lane) p.x += lane.dir * lane.speed * DT; }
      checkRiver(false);
    }
    // collisions
    if (g.state === 'play' && p.mode !== 'home') { if (!checkRoad()) checkHazards(); }
    animatePlayer(p, DT);
  }

  function step(cmd = {}) {
    const p = g.player;
    g.stateT += DT;
    g.popups = g.popups.filter((q) => { q.age += DT; q.y -= 12 * DT; return q.age < q.ttl; });
    switch (g.state) {
      case 'title': if (cmd.start) newGame(); break;
      case 'intro': if (g.stateT >= INTRO_T) setState('play'); break;
      case 'play':
        playStep(cmd);
        if (g.state === 'play' && p.mode === 'home' && p.homeT >= HOME_T) respawn();
        break;
      case 'dying':
        g.t += DT;
        animatePlayer(p, DT);
        if (p.deathT >= DYING_T) {
          g.lives -= 1;
          if (g.lives <= 0) { setMode(p, 'dead'); setState('gameover'); emit('gameover', { score: g.score, level: g.levelNum }); } else respawn();
        }
        break;
      case 'levelclear':
        animatePlayer(p, DT);
        if (g.stateT >= CLEAR_T) startLevel(g.levelNum + 1);
        break;
      case 'gameover': if (cmd.start) setState('title'); break;
      default: break;
    }
    return g;
  }

  function hash() {
    const f = (v) => Math.round(v * 1000);
    const p = g.player;
    const parts = [g.state, g.levelNum, f(g.t), f(g.timeLeft), g.score, g.lives, f(p.x), f(p.y), p.mode, p.row, p.frame, g.bestRow,
      g.bays.map((b) => (b.filled ? 1 : 0) + (b.open ? 'o' : '')).join(''), g.extra.length, g.pete ? g.pete.mode + f(g.pete.x) : ''];
    let h = 2166136261;
    for (const c of parts.join('|')) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619) >>> 0; }
    return h >>> 0;
  }

  Object.assign(g, { step, startLevel, newGame, hash });
  buildLevel(g.levelNum);
  return g;
}
