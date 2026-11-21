// Player (Colby) state helpers. Pure data + small functions; game.js owns the rules.
import { START_X, START_ROW, rowY } from '../core/defs.js';

export const DEATH_ANIM = { squash: { frames: 3 }, drown: { frames: 4 } };

export function createPlayer() {
  const p = { x: START_X, y: rowY(START_ROW), row: START_ROW, facing: 'up', mode: 'idle', hopT: 0, frame: 0, riding: null, deathT: 0,
    hop: null, queued: null, homeT: 0 };
  return p;
}

export function resetPlayer(p) {
  Object.assign(p, { x: START_X, y: rowY(START_ROW), row: START_ROW, facing: 'up', mode: 'idle', hopT: 0, frame: 0, riding: null,
    deathT: 0, hop: null, queued: null, homeT: 0 });
  return p;
}

// Sets the mode AND its frame animation in one place (contract: never set mode elsewhere).
export function setMode(p, mode) {
  p.mode = mode;
  p.frame = 0;
  if (mode === 'squash' || mode === 'drown') { p.deathT = 0; p.hop = null; p.hopT = 0; p.queued = null; p.riding = null; }
  else if (mode === 'home') { p.homeT = 0; p.hop = null; p.hopT = 0; p.queued = null; p.riding = null; }
  return p;
}

const DEATH_TIME = 1.2;
export function animatePlayer(p, dt) {
  if (p.mode === 'squash' || p.mode === 'drown') {
    p.deathT += dt;
    const n = DEATH_ANIM[p.mode].frames;
    p.frame = Math.min(n - 1, Math.floor((p.deathT / DEATH_TIME) * n));
  } else if (p.mode === 'hop') p.frame = p.hopT < 0.5 ? 1 : 0;
  else if (p.mode === 'home') { p.homeT += dt; p.frame = Math.floor(p.homeT * 4) % 2; }
  else p.frame = 0;
}
