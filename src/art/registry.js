// Art registry (owner: render). buildArt({style}) -> sprites { get(name), has(name), mirror(name, frame), names(), ready, missing }.
//  - retro: loads src/art/{colby,vehicles,river,world,fx}.js (each exports build() -> { name: PixBuf[] | {frames,w,h} }).
//  - ghibli: loads src/art/ghibli/{characters,vehicles,river,world,fx}.js (each exports build(kit) -> { name: {frames,w,h} }).
// Modules are imported dynamically and guarded: a missing or broken module is skipped (recorded in sprites.missing) and
// the renderer draws coloured rectangles for any sprite that is absent. buildArt() is synchronous and returns at once;
// the maps fill in as the imports settle. Await sprites.ready when you need everything (tests, tools, boot screens).
// Pass opts.modules = { colby: <module>, ... } to build synchronously from already imported modules.
import { ART } from '../core/defs.js';

export const RETRO_MODULES = ['colby', 'vehicles', 'river', 'world', 'fx'];
export const GHIBLI_MODULES = ['characters', 'vehicles', 'river', 'world', 'fx'];
export const TOON_MODULES = GHIBLI_MODULES;   // src/art/toon/*.js (characters are async: library cut-outs)

const hasDom = () => typeof document !== 'undefined' && typeof document.createElement === 'function';

/** PixBuf -> canvas in the browser (so drawImage is fast); a PixBuf stays a PixBuf in Node. */
export function toCanvas(p) {
  if (!p || !p.rgba || !hasDom()) return p;
  try {
    const c = document.createElement('canvas'); c.width = p.w; c.height = p.h;
    const x = c.getContext('2d');
    x.putImageData(new ImageData(new Uint8ClampedArray(p.rgba), p.w, p.h), 0, 0);
    return c;
  } catch { return p; }
}

function normalize(entry) {
  if (!entry) return null;
  if (Array.isArray(entry)) {
    if (!entry.length) return null;
    return { frames: entry, w: entry[0].w ?? entry[0].width, h: entry[0].h ?? entry[0].height };
  }
  if (Array.isArray(entry.frames) && entry.frames.length) {
    const f = entry.frames[0];
    return { frames: entry.frames, w: entry.w ?? f.w ?? f.width, h: entry.h ?? f.h ?? f.height };
  }
  return null;
}

function createSprites(style) {
  const map = new Map();       // name -> {frames (drawable), raw (PixBuf|surface), w, h}
  const mirrors = new Map();   // "name#frame" -> drawable
  const missing = [];
  const sprites = {
    style, missing, map,
    ready: null,
    has: (n) => map.has(n),
    get: (n) => map.get(n) || null,
    names: () => [...map.keys()],
    get size() { return map.size; },
    /** Horizontally mirrored drawable for frame i of sprite `name` (null if it cannot be made). Cached. */
    mirror(name, i = 0) {
      const s = map.get(name); if (!s) return null;
      const k = name + '#' + i;
      if (mirrors.has(k)) return mirrors.get(k);
      const raw = s.raw[i] ?? s.raw[0];
      let out = null;
      if (raw && typeof raw.flipX === 'function') out = toCanvas(raw.flipX());
      else if (raw && hasDom()) {
        try {
          const c = document.createElement('canvas'); c.width = raw.width ?? raw.w; c.height = raw.height ?? raw.h;
          const x = c.getContext('2d'); x.translate(c.width, 0); x.scale(-1, 1); x.drawImage(raw.canvas ?? raw, 0, 0); out = c;
        } catch { out = null; }
      }
      mirrors.set(k, out); return out;
    },
    add(name, entry) {
      const n = normalize(entry); if (!n) return false;
      map.set(name, { frames: n.frames.map((f) => (f && f.rgba ? toCanvas(f) : (f && f.canvas ? f.canvas : f))), raw: n.frames, w: n.w, h: n.h });
      return true;
    },
  };
  return sprites;
}

function ingest(sprites, modName, mod, kit) {
  const fn = mod && (mod.build || mod.default);
  if (typeof fn !== 'function') { sprites.missing.push(modName); return 0; }
  let out;
  try { out = fn(kit); } catch (e) { sprites.missing.push(modName + ' (build threw: ' + (e && e.message) + ')'); return 0; }
  let n = 0;
  for (const [name, entry] of Object.entries(out || {})) if (sprites.add(name, entry)) n++;
  return n;
}

async function ingestAsync(sprites, modName, mod, kit) {   // toon modules may return a Promise (library images decode asynchronously)
  const fn = mod && (mod.build || mod.default);
  if (typeof fn !== 'function') { sprites.missing.push(modName); return 0; }
  let out;
  try { out = await fn(kit); } catch (e) { sprites.missing.push(modName + ' (build threw: ' + (e && e.message) + ')'); return 0; }
  let n = 0;
  for (const [name, entry] of Object.entries(out || {})) if (sprites.add(name, entry)) n++;
  return n;
}

/**
 * @param {{style?:'retro'|'ghibli', modules?:object, kit?:object, onModule?:Function}} [opts]
 * @returns sprites (see header). sprites.ready resolves to sprites when every module has been tried.
 */
export function buildArt(opts = {}) {
  const style = opts.style === 'ghibli' ? 'ghibli' : opts.style === 'toon' ? 'toon' : 'retro';
  const sprites = createSprites(style);
  const names = style === 'ghibli' ? GHIBLI_MODULES : style === 'toon' ? TOON_MODULES : RETRO_MODULES;
  if (opts.modules) {                                      // synchronous path
    for (const m of names) if (opts.modules[m]) ingest(sprites, m, opts.modules[m], opts.kit); else sprites.missing.push(m);
    if (style === 'toon') { sprites.ready = (async () => { for (const m of names) { if (opts.modules[m]) await ingestAsync(sprites, m, opts.modules[m], opts.kit); else sprites.missing.push(m); } return sprites; })(); return sprites; }
    sprites.ready = Promise.resolve(sprites);
    return sprites;
  }
  const dir = style === 'ghibli' ? './ghibli/' : './';
  const load = async () => {
    let kit = opts.kit;
    if (style !== 'retro' && !kit) {
      try { kit = await import('../kits/painter-kit/index.js'); kit = kit.default ?? kit; } catch { kit = undefined; }
    }
    // Each import is independent; order is fixed so the result is deterministic. Literal paths keep bundlers happy.
    const loaders = style === 'toon'
      ? { characters: () => import('./toon/characters.js'), vehicles: () => import('./toon/vehicles.js'), river: () => import('./toon/river.js'), world: () => import('./toon/world.js'), fx: () => import('./toon/fx.js') }
      : style === 'ghibli'
      ? { characters: () => import('./ghibli/characters.js'), vehicles: () => import('./ghibli/vehicles.js'), river: () => import('./ghibli/river.js'), world: () => import('./ghibli/world.js'), fx: () => import('./ghibli/fx.js') }
      : { colby: () => import('./colby.js'), vehicles: () => import('./vehicles.js'), river: () => import('./river.js'), world: () => import('./world.js'), fx: () => import('./fx.js') };
    for (const m of names) {
      try { if (style === 'toon') await ingestAsync(sprites, m, await loaders[m](), kit); else ingest(sprites, m, await loaders[m](), kit); } catch { sprites.missing.push(m); }
      if (opts.onModule) { try { opts.onModule(m, sprites); } catch { /* ignore */ } }
    }
    void dir;
    return sprites;
  };
  sprites.ready = load();
  return sprites;
}

/** Names from defs.ART that this registry has no sprite for (handy in tests and tools). */
export function missingSprites(sprites) { return ART.map((a) => a[1]).filter((n) => !sprites.has(n)); }

export default buildArt;
