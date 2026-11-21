// Menus (owner: ui-shell): tiny vertical menu model + drawing, used by title, pause and options.
// Pure logic (no DOM): `createMenu(items)`; an item is { id, text|fn(ctx) -> string, kind: 'action'|'cycle', left(), right(), act() }.
import { W } from '../core/defs.js';
import { label, plate, textWidth, COLORS as C } from './hud.js';

export function createMenu(items, { onMove } = {}) {
  let sel = 0;
  const m = {
    items, get sel() { return sel; }, set sel(v) { sel = Math.max(0, Math.min(items.length - 1, v)); },
    /** Feed a UI action ('up'|'down'|'left'|'right'|'confirm'); returns the activated item id or null. */
    act(a) {
      const it = items[sel];
      if (a === 'up') { sel = (sel + items.length - 1) % items.length; onMove && onMove(); }
      else if (a === 'down') { sel = (sel + 1) % items.length; onMove && onMove(); }
      else if (a === 'left' && it.left) { it.left(); onMove && onMove(); }
      else if (a === 'right' && it.right) { it.right(); onMove && onMove(); }
      else if (a === 'confirm') { if (it.act) it.act(); else if (it.right) it.right(); return it.id; }
      return null;
    },
    /** Pointer hit test in logical coords -> row index or -1. */
    hit(x, y, top, lh = 14) { const i = Math.floor((y - top) / lh); return i >= 0 && i < items.length && Math.abs(x - W / 2) < 100 ? i : -1; },
    draw(ctx, style, top, o = {}) {
      const lh = o.lh ?? 14, t = o.t ?? 0;
      items.forEach((it, i) => {
        const text = typeof it.text === 'function' ? it.text() : it.text, on = i === sel, y = top + i * lh;
        if (on) {
          const w = Math.max(80, textWidth(ctx, style, text) + 24);
          plate(ctx, style, W / 2 - w / 2, y - 2, w, 12, { alpha: 0.85, border: C.gold });
          label(ctx, style, '>', W / 2 - w / 2 + 4 + (Math.floor(t * 4) % 2), y, { color: C.gold });
          label(ctx, style, '<', W / 2 + w / 2 - 9 - (Math.floor(t * 4) % 2), y, { color: C.gold });
        }
        label(ctx, style, text, W / 2, y, { align: 'center', color: on ? C.gold : C.white });
      });
    },
  };
  return m;
}

const STEP = 0.1, clamp01 = (v) => Math.max(0, Math.min(1, Math.round(v * 10) / 10));
const bar = (v) => '[' + '#'.repeat(Math.round(v * 10)) + '-'.repeat(10 - Math.round(v * 10)) + ']';

/** Options menu bound to a settings object; `hooks.change(key)` is called after every edit (persist, apply). */
export function createOptionsMenu(settings, hooks = {}) {
  const chg = (k) => hooks.change && hooks.change(k);
  const vol = (key, name) => ({ id: key, text: () => `${name} ${bar(settings[key] ?? 0)}`, left() { settings[key] = clamp01((settings[key] ?? 0) - STEP); chg(key); }, right() { settings[key] = clamp01((settings[key] ?? 0) + STEP); chg(key); } });
  const tog = (key, name) => ({ id: key, text: () => `${name} ${settings[key] ? 'ON' : 'OFF'}`, left() { settings[key] = !settings[key]; chg(key); }, right() { settings[key] = !settings[key]; chg(key); } });
  const styles = ['retro', 'ghibli', 'toon'];
  const cycle = () => { const i = styles.indexOf(settings.style); settings.style = styles[(i + 1) % styles.length]; chg('style'); };
  return createMenu([
    { id: 'style', text: () => `STYLE ${settings.style === 'ghibli' ? 'GHIBLI' : settings.style === 'toon' ? 'TOON' : '8-BIT'}`, left: cycle, right: cycle },
    vol('master', 'MASTER'), vol('music', 'MUSIC '), vol('sfx', 'SFX   '),
    tog('mute', 'MUTE'), tog('crt', 'CRT '),
    { id: 'back', text: 'BACK', act() {} },
  ], { onMove: hooks.move });
}
