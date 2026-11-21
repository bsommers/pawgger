// Particles, ripples, shake and flash (owner: render). Built on src/kits/fx-kit; listens to the sim's event bus.
// Time advances only through update(dt); the renderer derives dt from g.t, so a replayed game draws identical frames.
import { createParticles, createShake, createFlash } from '../kits/fx-kit/index.js';
import { PAL, rowY, ROW, BAY_X, CELL, W } from '../core/defs.js';
import { blit, ring, rect, clamp } from './scene.js';

const PRESETS = {
  splash: { n: 14, v: 80, life: 0.75, g: 240, a0: -Math.PI * 0.95, arc: Math.PI * 0.9, colors: [PAL.waterL, PAL.water, PAL.foam, '#ffffff'] },
  fur: { n: 14, v: 70, life: 0.7, g: 160, a0: -Math.PI, arc: Math.PI * 1.1, colors: [PAL.fur, PAL.furL, PAL.furD, PAL.cream] },
  dust: { n: 4, v: 18, life: 0.35, g: -12, a0: -Math.PI, arc: Math.PI, colors: ['#d9c9a0', '#b0a078', PAL.pathL] },
  sparkle: { n: 14, v: 70, life: 0.85, g: 30, a0: 0, arc: Math.PI * 2, colors: [PAL.gold, PAL.fireL, '#ffffff', PAL.furL] },
  confetti: { n: 36, v: 55, life: 2.2, g: 60, a0: -Math.PI, arc: Math.PI, colors: [PAL.red, PAL.gold, PAL.green, PAL.waterL, PAL.nose], sz: 2 },
  bubble: { n: 5, v: 14, life: 0.9, g: -28, a0: -Math.PI * 0.8, arc: Math.PI * 0.6, colors: [PAL.bubble, PAL.foam] },
  poof: { n: 7, v: 26, life: 0.45, g: 0, a0: 0, arc: Math.PI * 2, colors: ['#ffffff', '#cfcfdc'] },
  foam: { n: 8, v: 50, life: 0.5, g: 120, a0: -Math.PI, arc: Math.PI, colors: [PAL.foam, '#ffffff', PAL.waterL] },
};

/** createFx({sprites, seed}) -> { attach(bus)->detach, update(dt), draw(ctx), shake, flash, burst(...), ripple(...), clear(), count } */
export function createFx({ sprites: sprites0 = null, seed = 20240611 } = {}) {
  let sprites = sprites0;
  const parts = createParticles({ seed, max: 480, presets: PRESETS });
  const shake = createShake({ maxPx: 4, decay: 2.4, seed: seed + 1 });
  const flash = createFlash();
  const ripples = [];      // {x,y,age,life,rx,ry}
  const stamps = [];       // sprite one-shots {name,x,y,age,life,vy}
  let clock = 0, unsub = null;

  const ripple = (x, y, big = 1) => { if (ripples.length > 24) ripples.shift(); ripples.push({ x, y, age: 0, life: 0.7 * big, rx: 9 * big, ry: 3.5 * big }); };
  const stamp = (name, x, y, life = 0.5, vy = 0, w = 16) => { if (stamps.length > 40) stamps.shift(); stamps.push({ name, x, y, age: 0, life, vy, w }); };
  const laneRow = (lane) => (typeof lane === 'number' && lane >= ROW.river[0] && lane <= ROW.road[4] ? lane : ROW.river[2]);

  const handlers = {
    hop: (e) => { if (e && e.y !== undefined) { const row = Math.floor(e.y / CELL); if (ROW.river.includes(row)) ripple(e.x, e.y + 2, 0.7); else parts.burst('dust', e.x, e.y + 6); } },
    land_log: (e) => { if (e) { ripple(e.x, e.y + 3, 0.8); parts.burst('foam', e.x, e.y + 4, { n: 3, v: 22 }); } },
    splash: (e) => { if (!e) return; parts.burst('splash', e.x, e.y); parts.burst('bubble', e.x, e.y + 2); stamp('fx_splash', e.x - 8, e.y - 10, 0.5, -6); ripple(e.x, e.y + 3, 1.4); shake.kick(0.28); },
    squash: (e) => { if (!e) return; parts.burst('fur', e.x, e.y); parts.burst('poof', e.x, e.y, { n: 5 }); stamp('fx_star', e.x - 4, e.y - 10, 0.7, -10, 8); stamp('fx_puff', e.x - 8, e.y - 8, 0.45, -4); flash.trigger('#ffffff', 0.12, 0.35); shake.kick(0.55); },
    death: (e) => {
      if (!e) return; shake.kick(0.3); flash.trigger(PAL.red, 0.2, 0.28);
      if (e.cause === 'timeout') { parts.burst('poof', e.x, e.y, { n: 8 }); parts.burst('sparkle', e.x, e.y, { n: 6, colors: [PAL.furL, '#ffffff'] }); }
      else if (e.cause === 'pete') { parts.burst('fur', e.x, e.y, { n: 10 }); shake.kick(0.2); }
      else if (e.cause === 'croc' || e.cause === 'bay_hazard') { parts.burst('foam', e.x, e.y, { n: 10 }); parts.burst('fur', e.x, e.y, { n: 6 }); }
      else if (e.cause === 'edge' || e.cause === 'bay_wall') parts.burst('poof', e.x, e.y, { n: 6 });
    },
    home: (e) => { const x = e && e.x !== undefined ? e.x : BAY_X[(e && e.bay) || 0], y = CELL + 8; parts.burst('sparkle', x, y, { n: 22 }); parts.burst('confetti', x, y, { n: 14, v: 40 }); flash.trigger(PAL.gold, 0.16, 0.22); stamp('fx_star', x - 4, y - 8, 0.8, -14, 8); },
    bay_hit: (e) => { const x = e && e.bay !== undefined ? BAY_X[e.bay] : 112; parts.burst('poof', x, CELL + 8, { n: 6 }); shake.kick(0.25); },
    bonus: (e) => { const x = e && e.bay !== undefined ? BAY_X[e.bay] : 112; parts.burst('sparkle', x, CELL + 8, { n: 16 }); },
    turtle_dive: (e) => { if (!e) return; const y = rowY(laneRow(e.lane)); parts.burst('bubble', e.x ?? 100, y + 2); ripple(e.x ?? 100, y + 3, 1); },
    croc_snap: (e) => { if (!e) return; const y = rowY(laneRow(e.lane)); parts.burst('foam', e.x ?? 100, y, { n: 10 }); ripple(e.x ?? 100, y + 3, 1.2); shake.kick(0.18); },
    pete_throw: (e) => { if (e && e.x !== undefined) parts.burst('poof', e.x, rowY(e.row ?? ROW.median), { n: 6 }); },
    extra_life: () => { parts.burst('sparkle', W / 2, 150, { n: 26, v: 90 }); flash.trigger(PAL.green, 0.2, 0.2); },
    level_clear: () => { for (let i = 0; i < 6; i++) parts.burst('confetti', 18 + i * 38, 4, { n: 14, v: 30, a0: 0.2, arc: Math.PI * 0.6 }); shake.kick(0.12); },
    level_start: () => { parts.clear(); ripples.length = 0; stamps.length = 0; },
    gameover: () => { shake.kick(0.4); },
  };

  return {
    parts, shake, flash, ripple, stamp, setSprites(s) { sprites = s; },
    get count() { return parts.count + ripples.length + stamps.length; },
    burst: (type, x, y, over) => parts.burst(type, x, y, over),
    clear() { parts.clear(); ripples.length = 0; stamps.length = 0; },
    /** Subscribe to the sim bus. Returns an unsubscribe function. */
    attach(bus) {
      this.detach();
      if (!bus || !bus.on) return () => {};
      const offs = Object.keys(handlers).map((k) => bus.on(k, handlers[k]));
      unsub = () => { for (const f of offs) if (typeof f === 'function') f(); unsub = null; };
      return unsub;
    },
    detach() { if (unsub) unsub(); },
    emit(type, payload) { if (handlers[type]) handlers[type](payload); },
    update(dt) {
      dt = clamp(dt, 0, 0.1); clock += dt;
      parts.update(dt); shake.update(dt); flash.update(dt);
      for (let i = ripples.length - 1; i >= 0; i--) { ripples[i].age += dt; if (ripples[i].age >= ripples[i].life) ripples.splice(i, 1); }
      for (let i = stamps.length - 1; i >= 0; i--) { const s = stamps[i]; s.age += dt; s.y += s.vy * dt; if (s.age >= s.life) stamps.splice(i, 1); }
    },
    /** Draw ripples, sprite stamps and particles (call after the world, before the night pass is fine too). */
    draw(ctx) {
      for (const r of ripples) { const k = r.age / r.life; ring(ctx, r.x, r.y, r.rx * (0.3 + k), r.ry * (0.3 + k), PAL.foam, 0.8 * (1 - k)); if (k < 0.5) ring(ctx, r.x, r.y, r.rx * (0.1 + k * 0.6), r.ry * (0.1 + k * 0.6), PAL.waterL, 0.7 * (1 - k)); }
      for (const s of stamps) {
        const n = (sprites && sprites.get && sprites.get(s.name)) ? sprites.get(s.name).frames.length : 0, fr = n ? Math.min(n - 1, Math.floor((s.age / s.life) * n)) : 0;
        if (!n) { if (s.name === 'fx_star') rect(ctx, s.x + 2, s.y + 2, 3, 3, PAL.gold, 1 - s.age / s.life); continue; }
        blit(ctx, sprites, s.name, fr, s.x, s.y, { alpha: clamp(1.4 - s.age / s.life, 0, 1) });
      }
      parts.draw(ctx);
    },
    clockNow: () => clock,
    offset() { return shake.offset(); },
  };
}
