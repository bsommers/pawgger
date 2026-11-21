// grid-hop: generic grid-hop movement for Frogger-like games (factory candidate, zero deps).
// A "mover" is any object {x, y, hop:null|{fx,fy,tx,ty,dir}, hopT:0..1, facing, queued}.
//   makeHop(cfg)           -> normalised config {cell, hopTime, limit}
//   hopTarget(p, dir)      -> {x, y} one cell away in dir ('up'|'down'|'left'|'right'), no limits applied
//   startHop(p, dir, cfg)  -> true if a hop began (false: busy, bad dir, or cfg.limit(p, target, dir) returned null)
//   stepHop(p, dt, cfg)    -> 'landed' on the step the hop completes (p snaps exactly to target), else null
//   queueHop(p, dir) / takeQueued(p) -> one-deep input buffer while hopping (latest press wins)
// cfg.limit(p, target, dir) may clamp the target or return null to block the hop (walls, bounds).
export const DIRS = Object.freeze({ up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] });

export function makeHop(cfg = {}) {
  return { cell: cfg.cell ?? 16, hopTime: cfg.hopTime ?? 0.12, limit: cfg.limit ?? null };
}

export function hopTarget(p, dir, cfg = {}) {
  const d = DIRS[dir];
  if (!d) return null;
  const c = cfg.cell ?? 16;
  return { x: p.x + d[0] * c, y: p.y + d[1] * c };
}

export function startHop(p, dir, cfg = {}) {
  if (p.hop || !DIRS[dir]) return false;
  let t = hopTarget(p, dir, cfg);
  if (cfg.limit) t = cfg.limit(p, t, dir);
  if (!t) return false;
  if (t.x === p.x && t.y === p.y) return false;
  p.hop = { fx: p.x, fy: p.y, tx: t.x, ty: t.y, dir };
  p.hopT = 0;
  p.facing = dir;
  return true;
}

export function stepHop(p, dt, cfg = {}) {
  const h = p.hop;
  if (!h) return null;
  p.hopT = Math.min(1, p.hopT + dt / (cfg.hopTime ?? 0.12));
  if (p.hopT >= 1) {
    p.x = h.tx; p.y = h.ty; p.hop = null; p.hopT = 0;
    return 'landed';
  }
  p.x = h.fx + (h.tx - h.fx) * p.hopT;
  p.y = h.fy + (h.ty - h.fy) * p.hopT;
  return null;
}

export function queueHop(p, dir) { if (DIRS[dir]) p.queued = dir; }
export function takeQueued(p) { const q = p.queued ?? null; p.queued = null; return q; }
