// Pawgger audio engine (ARCHITECTURE.md section 8). WebAudio only; Node-importable (no AudioContext touched at import time).
// createAudio(bus, settings) -> { unlock(), play(name, opts), music(name), setSettings(s), setVolume(), setMute(), dispose(), stats, limits }
// The AudioContext is created lazily on the first unlock() (call it from a user gesture). Events before that are dropped.
// Bus events are mapped to SFX names below; a direct {name} on the 'sfx' bus event is also accepted.
import { describe } from './sfx.js';
import { scheduleVoices } from '../kits/audio-kit/index.js';
import { createLiveMusic } from './live-music.js';
import { describeMusic, MUSIC_FOR } from './music.js';
import { SFX, MUSIC, W } from '../core/defs.js';

const MUSIC_FOR_LOOPS = Object.values(MUSIC_FOR);
const clamp01 = (x, d = 0) => (typeof x === 'number' && isFinite(x) ? Math.min(Math.max(x, 0), 1) : d);
export const LIMITS = Object.freeze({ perName: 4, total: 20, retrigger: 0.03 });   // anti-stacking guards (seconds / counts)

// bus event -> SFX name (a function returns null to stay silent). Death by squash or Pete is already voiced by 'squash'.
const EVENT_SFX = Object.freeze({
  hop: () => 'hop',
  row_forward: () => 'row_forward',
  land_log: () => 'land_log',
  splash: () => 'splash',
  squash: () => 'squash',
  death: (p) => (p?.cause === 'squash' || p?.cause === 'pete' ? null : p?.cause === 'time' ? 'timeout' : 'death'),
  home: () => 'home',
  bay_hit: () => 'bay_hit',
  bonus: (p) => (p?.type === 'mouse' ? 'bonus_mouse' : 'bonus_fish'),   // fish and treasure share the bubble chime
  turtle_dive: () => 'turtle_dive',
  croc_snap: () => 'croc_snap',
  honk: () => 'honk',
  pete_taunt: () => 'pete_laugh',
  pete_throw: () => 'pete_throw',
  tick_low: () => 'tick_low',
  extra_life: () => 'extra_life',
  level_clear: () => 'level_clear',
  level_start: () => 'start',
  gameover: () => 'gameover',
});

/**
 * @param bus       event bus from core/events.js (subscribed at construction)
 * @param settings  { master, sfx, music, mute, style: 'retro'|'ghibli' } (read at construction; later changes via setSettings)
 * @param opts      optional { AudioContextCtor } to inject a context class (tests, Node)
 */
export function createAudio(bus, settings = {}, { AudioContextCtor } = {}) {
  const Ctor = AudioContextCtor || (typeof globalThis !== 'undefined' && (globalThis.AudioContext || globalThis.webkitAudioContext)) || null;
  const vol = { master: clamp01(settings?.master, 0.8), sfx: clamp01(settings?.sfx, 1), music: clamp01(settings?.music, 0.7) };
  const state = {
    muted: !!settings?.mute, style: settings?.style === 'ghibli' || settings?.style === 'toon' ? 'ghibli' : 'retro',   // toon reuses the ghibli music + SFX sets
    ctx: null, nodes: null, active: [], lastPlay: new Map(), musicApi: null, musicName: null, 
  };
  const stats = { played: 0, dropped: 0, ignored: 0, byName: {} };
  const unsubs = [];

  function applyVolumes() {
    const n = state.nodes;
    if (!n) return;
    n.master.gain.value = state.muted ? 0 : vol.master;
    n.sfx.gain.value = vol.sfx;
    n.music.gain.value = vol.music;
  }

  function build(ctx) {
    const master = ctx.createGain(), sfx = ctx.createGain(), music = ctx.createGain(), limiter = ctx.createDynamicsCompressor();
    limiter.threshold.value = -6; limiter.knee.value = 0; limiter.ratio.value = 20; limiter.attack.value = 0.002; limiter.release.value = 0.12;
    sfx.connect(master); music.connect(master); master.connect(limiter); limiter.connect(ctx.destination);
    state.ctx = ctx; state.nodes = { master, sfx, music, limiter };
    applyVolumes();
    loadMusic();
  }

  // Live music: createLiveMusic loops describeMusic() tracks on the music bus (drums included).
  function loadMusic() {
    if (state.musicApi || !state.ctx) return;
    try {
      state.musicApi = createLiveMusic(state.ctx, state.nodes.music, { describe: describeMusic, style: state.style });
      if (state.musicName) state.musicApi.play(state.musicName);
    } catch { state.musicApi = null; }
  }

  function playSfx(name, o = {}) {
    if (!SFX.includes(name)) { stats.ignored++; return false; }
    const ctx = state.ctx;
    if (!ctx || ctx.state === 'closed' || !state.nodes) { stats.dropped++; return false; }   // not unlocked yet
    const now = ctx.currentTime;
    state.active = state.active.filter((a) => a.end > now);
    const last = state.lastPlay.get(name), same = state.active.filter((a) => a.name === name).length;
    if ((last !== undefined && now - last < LIMITS.retrigger) || same >= LIMITS.perName || state.active.length >= LIMITS.total) {
      stats.dropped++; return false;
    }
    const pan = typeof o.x === 'number' ? Math.max(-0.7, Math.min(0.7, ((o.x - W / 2) / (W / 2)) * 0.7)) : 0;
    const voices = describe(name, { style: state.style });
    const end = scheduleVoices(ctx, state.nodes.sfx, voices, now + 0.005, { pan });
    state.active.push({ name, end }); state.lastPlay.set(name, now);
    stats.played++; stats.byName[name] = (stats.byName[name] || 0) + 1;
    return true;
  }

  function playMusic(name) {
    if (name != null && !MUSIC.includes(name)) return false;
    state.musicName = name ?? null;
    if (!state.ctx) return true;   // remembered; applied once unlocked and music.js is loaded
    if (state.musicApi) state.musicApi[name == null ? 'stop' : 'play'](name ?? undefined);
    return true;
  }

  /** Pick a style and mix levels at once; undefined keys keep their value. */
  function setSettings(s = {}) {
    if (s.master !== undefined) vol.master = clamp01(s.master, vol.master);
    if (s.sfx !== undefined) vol.sfx = clamp01(s.sfx, vol.sfx);
    if (s.music !== undefined) { vol.music = clamp01(s.music, vol.music); state.musicApi?.setVolume?.(vol.music); }
    if (s.mute !== undefined) state.muted = !!s.mute;
    if (s.style === 'retro' || s.style === 'ghibli' || s.style === 'toon') { state.style = s.style === 'retro' ? 'retro' : 'ghibli'; state.musicApi?.setStyle?.(state.style); }   // toon -> ghibli audio set
    applyVolumes();
  }

  const api = {
    stats, limits: LIMITS,
    /** Create (once) and resume the AudioContext. Call from a user gesture (click, key, touch). */
    unlock() {
      if (!state.ctx && Ctor) {
        try { build(new Ctor()); } catch { return Promise.resolve(false); }
      }
      if (!state.ctx) return Promise.resolve(false);
      return Promise.resolve(state.ctx.resume ? state.ctx.resume() : undefined).then(() => true, () => false);
    },
    /** Play an SFX name directly (UI sounds such as menu_move). opts.x optional screen x for panning. */
    play(name, opts) { return playSfx(name, opts); },
    /** Music state name from defs.MUSIC (play_* and title loop; stings are one-shots). null stops. */
    music(name) { return playMusic(name); },
    setSettings,
    /** master, sfx and music levels in 0..1. Undefined arguments keep their current value. */
    setVolume(master, sfx, music) { setSettings({ master, sfx, music }); },
    setMute(on) { setSettings({ mute: on }); },
    get muted() { return state.muted; },
    get style() { return state.style; },
    get volume() { return { ...vol }; },
    get ctx() { return state.ctx; },
    dispose() {
      unsubs.splice(0).forEach((u) => u && u());
      state.musicApi?.stop?.();
      if (state.ctx?.close) state.ctx.close().catch?.(() => {});
      state.ctx = null; state.nodes = null; state.musicApi = null;
    },
  };

  if (bus) {
    for (const [type, map] of Object.entries(EVENT_SFX)) {
      unsubs.push(bus.on(type, (p) => { const name = map(p); if (name) playSfx(name, p); }));
    }
    unsubs.push(bus.on('sfx', (e) => { if (e && typeof e.name === 'string') playSfx(e.name, e); }));
    unsubs.push(bus.on('music', (e) => playMusic(e ? e.name : null)));
    unsubs.push(bus.on('level_start', (p) => playMusic(MUSIC_FOR[p?.theme] || 'play_day')));
    unsubs.push(bus.on('level_clear', () => playMusic('levelclear')));
    unsubs.push(bus.on('gameover', () => playMusic('gameover')));
    unsubs.push(bus.on('death', () => {   // respawn emits no level_start, so the level loop resumes after the short sting
      const loop = state.musicName && MUSIC_FOR_LOOPS.includes(state.musicName) ? state.musicName : null;
      state.musicApi?.play('death', { then: loop });
    }));
  }
  return api;
}
