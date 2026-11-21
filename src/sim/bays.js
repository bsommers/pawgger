// Home bays: croc/snake hazards cycle open/closed; mouse/fish bonuses appear in empty bays (ARCHITECTURE sections 4, 5).
// Pure, Node-safe, fixed-step. Randomness only through g.rng (seeded).
import { BAY_X, BAY_TOL, TUNING } from '../core/defs.js';
import { createRng } from '../core/rng.js';

export const BONUS_SHOW = 6;          // seconds a mouse/fish stays in an empty bay
const BONUS_FIRST = [2, 5];           // first appearance window after level start (seeded)
const BONUS_GAP = [9, 14];            // gap between appearances in the same bay (seeded)

function rngOf(g) {
  if (!g.rng) g.rng = createRng(g.seed ?? 1);
  return g.rng;
}

/** Fill g.bays from g.level.bays. Each bay gets a staggered hazard phase and a bonus schedule. */
export function initBays(g) {
  const src = g.level?.bays?.length ? g.level.bays : BAY_X.map((cx) => ({ cx, hazard: null, bonus: null }));
  const rng = rngOf(g);
  const { period } = TUNING.bayHazardCycle;
  g.bays = src.map((b, i) => ({
    cx: b.cx,
    hazard: b.hazard ?? null,
    bonus: b.bonus ?? null,
    filled: false,
    open: false,
    bonusT: 0,
    // staggered so neighbouring hazards do not open in unison
    _phase: (i * period / src.length) % period,
    _nextBonus: b.bonus ? rng.range(BONUS_FIRST[0], BONUS_FIRST[1]) : Infinity,
  }));
}

/** Advance hazard cycles and bonus timers by dt seconds. */
export function updateBays(g, dt) {
  if (!g.bays) initBays(g);
  const rng = rngOf(g);
  const { period, open: openFor } = TUNING.bayHazardCycle;
  g.bays.forEach((b) => {
    if (b.hazard) {
      b._phase = (b._phase + dt) % period;
      b.open = b._phase < openFor;
    } else {
      b.open = false;
    }
    if (b.bonusT > 0) {
      b.bonusT = Math.max(0, b.bonusT - dt);
    }
    if (b.bonus) {
      if (b.filled) {
        b.bonusT = 0;
        return;
      }
      b._nextBonus -= dt;
      if (b._nextBonus <= 0) {
        b.bonusT = BONUS_SHOW;
        b._nextBonus = rng.range(BONUS_GAP[0], BONUS_GAP[1]);
      }
    }
  });
}

/**
 * Classify a hop that lands on the home row at x.
 * -> {index, ok, why} where why is 'wall' (no bay in reach), 'filled', 'hazard' (open croc/snake) or null (ok).
 */
export function bayForHop(g, x) {
  let best = -1, bd = Infinity;
  (g.bays || []).forEach((b, i) => {
    const d = Math.abs(x - b.cx);
    if (d < bd) { bd = d; best = i; }
  });
  if (best < 0 || bd > BAY_TOL) return { index: -1, ok: false, why: 'wall' };
  const b = g.bays[best];
  if (b.filled) return { index: best, ok: false, why: 'filled' };
  if (b.hazard && b.open) return { index: best, ok: false, why: 'hazard' };
  return { index: best, ok: true, why: null };
}
