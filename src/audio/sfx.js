// Pawgger sound effects (ARCHITECTURE.md section 8). Every name in defs.SFX is a pure recipe -> list of voices (plain data).
// The same voices drive live WebAudio (audio.js via audio-kit scheduleVoices) and the offline PCM path (Node tests, tools/sfx-wav.mjs).
// Two styles, same names: SFX_RECIPES ('retro', 8-bit square/triangle/noise) and SFX_RECIPES_GHIBLI (softer sine/triangle/bell/brushed noise).
import { SFX } from '../core/defs.js';
import { describeSfx, renderVoices, pcmStats, midiHz, voicesDuration } from '../kits/audio-kit/index.js';

export const SFX_NAMES = SFX;
export const STYLES = Object.freeze(['retro', 'ghibli']);

// ---- retro: chiptune blips, square-wave arps, noise bursts --------------------------------------------------------
export const SFX_RECIPES = Object.freeze({
  hop: (v) => {                                                       // bouncy blip, pitch rises
    v({ src: 'square', dur: 0.08, gain: 0.15, f: [300, 620], filters: [{ type: 'lp', f: 2800, q: 0.7 }] });
    v({ src: 'noise', dur: 0.012, gain: 0.05, f: 1, filters: [{ type: 'hp', f: 3000, q: 0.7 }] });
  },
  land_log: (v) => {                                                  // wooden thunk
    v({ src: 'triangle', dur: 0.08, gain: 0.2, f: [220, 150] });
    v({ src: 'noise', dur: 0.03, gain: 0.08, f: 1, filters: [{ type: 'lp', f: 900, q: 0.7 }] });
  },
  splash: (v) => {                                                    // noisy plop
    v({ src: 'noise', dur: 0.3, gain: 0.22, att: 0.008, f: 1, filters: [{ type: 'bp', f: [1800, 400], q: 1 }] });
    v({ src: 'sine', dur: 0.14, gain: 0.16, f: [520, 180] });
  },
  squash: (v) => {                                                    // comic squeak-thud
    v({ src: 'square', dur: 0.12, gain: 0.12, f: [900, 300], filters: [{ type: 'lp', f: 2500, q: 0.7 }] });
    v({ src: 'sine', dur: 0.18, gain: 0.3, f: [140, 45] });
  },
  death: (v) => {                                                     // sad wah down
    v({ src: 'saw', dur: 0.5, gain: 0.16, f: [520, 90], filters: [{ type: 'lp', f: [2000, 300], q: 1.5 }] });
    v({ src: 'noise', dur: 0.1, gain: 0.08, t: 0.4, f: 1, filters: [{ type: 'lp', f: 600, q: 0.7 }] });
  },
  home: (v, { arp, midiHz: hz }) => {                                 // victory arpeggio + chord
    arp(v, [72, 76, 79, 84], 0.07, { dur: 0.16, gain: 0.16 });
    [84, 88, 91].forEach((n) => v({ src: 'triangle', t: 0.3, dur: 0.5, gain: 0.12, f: hz(n) }));
  },
  bay_hit: (v) => {                                                   // bonk
    v({ src: 'square', dur: 0.2, gain: 0.15, f: [180, 90], filters: [{ type: 'lp', f: 1200, q: 0.9 }] });
    v({ src: 'noise', dur: 0.12, gain: 0.05, f: 1, filters: [{ type: 'lp', f: 800, q: 0.7 }] });
  },
  bonus_mouse: (v, { arp }) => arp(v, [84, 88, 91, 96], 0.03, { dur: 0.06, gain: 0.13 }),   // quick chirp
  bonus_fish: (v) => {                                                // two bubbles
    v({ src: 'sine', dur: 0.18, gain: 0.2, f: [400, 1200] });
    v({ src: 'sine', t: 0.12, dur: 0.14, gain: 0.14, f: [500, 1400] });
  },
  turtle_dive: (v) => v({ src: 'sine', dur: 0.45, gain: 0.2, f: [600, 120], fm: { ratio: 2, depth: 30 } }),
  croc_snap: (v) => {                                                 // jaw snap
    v({ src: 'noise', dur: 0.07, gain: 0.28, att: 0.002, f: 1, filters: [{ type: 'bp', f: [3000, 800], q: 1.5 }] });
    v({ src: 'square', dur: 0.06, gain: 0.1, f: [400, 120] });
  },
  honk: (v) => {                                                      // two-tone horn
    v({ src: 'saw', dur: 0.22, gain: 0.11, f: 330, filters: [{ type: 'lp', f: 1500, q: 0.7 }] });
    v({ src: 'saw', t: 0.26, dur: 0.24, gain: 0.11, f: 392, filters: [{ type: 'lp', f: 1500, q: 0.7 }] });
  },
  pete_laugh: (v, { arp }) => arp(v, [76, 74, 72, 70, 67, 64], 0.09, { dur: 0.1, gain: 0.14, lp: 2500 }),   // descending square
  pete_throw: (v) => {                                                // whoosh
    v({ src: 'noise', dur: 0.3, gain: 0.18, att: 0.02, f: 1, filters: [{ type: 'bp', f: [400, 2500], q: 1 }] });
    v({ src: 'triangle', dur: 0.18, gain: 0.12, f: [500, 150] });
  },
  tick_low: (v) => v({ src: 'square', dur: 0.03, gain: 0.14, att: 0.001, f: 1200 }),
  extra_life: (v, { arp }) => arp(v, [67, 71, 74, 79, 83, 86, 91], 0.055, { dur: 0.12, gain: 0.15 }),   // 1-up
  level_clear: (v, { arp, midiHz: hz }) => {
    arp(v, [67, 71, 74, 79, 83, 86], 0.09, { dur: 0.2, gain: 0.14 });
    [79, 83, 86, 91].forEach((n) => v({ src: 'triangle', t: 0.6, dur: 0.5, gain: 0.12, f: hz(n) }));
  },
  gameover: (v, { arp }) => arp(v, [67, 64, 62, 59, 55, 52], 0.22, { src: 'triangle', dur: 0.3, gain: 0.18, lp: 2000 }),
  menu_move: (v) => v({ src: 'square', dur: 0.04, gain: 0.12, att: 0.002, f: 880 }),
  menu_select: (v, { arp }) => arp(v, [76, 88], 0.06, { dur: 0.08, gain: 0.14 }),
  start: (v, { arp }) => arp(v, [60, 64, 67, 72, 64, 67, 72, 76], 0.08, { dur: 0.14, gain: 0.13 }),
  row_forward: (v) => v({ src: 'square', dur: 0.05, gain: 0.08, f: [520, 780] }),
  timeout: (v) => {                                                   // two buzzes
    v({ src: 'square', dur: 0.25, gain: 0.13, f: 233 });
    v({ src: 'square', t: 0.3, dur: 0.25, gain: 0.13, f: 196 });
  },
});

// ---- ghibli: soft sine / triangle bells, long attacks, brushed noise -----------------------------------------------
// bell: sine partial with a faint inharmonic FM shimmer and a soft 2nd partial.
const bell = (v, hz, midi, t, dur, gain) => {
  v({ src: 'sine', t, dur, gain, att: 0.006, f: hz(midi), fm: { ratio: 3.5, depth: 2 } });
  v({ src: 'sine', t, dur: dur * 0.5, gain: gain * 0.25, att: 0.004, f: hz(midi) * 2 });
};
const brush = (v, t, dur, gain, band, att = 0.03) => v({ src: 'noise', t, dur, gain, att, f: 1, filters: [{ type: 'bp', f: band, q: 0.8 }] });

export const SFX_RECIPES_GHIBLI = Object.freeze({
  hop: (v) => v({ src: 'sine', dur: 0.12, gain: 0.14, att: 0.01, f: [330, 495] }),
  land_log: (v) => {
    v({ src: 'sine', dur: 0.14, gain: 0.22, att: 0.004, f: [140, 70] });
    brush(v, 0, 0.1, 0.06, [700, 300], 0.01);
  },
  splash: (v) => {
    brush(v, 0, 0.45, 0.16, [2000, 500], 0.05);
    v({ src: 'sine', t: 0.02, dur: 0.2, gain: 0.12, att: 0.005, f: [600, 220] });
  },
  squash: (v) => {
    v({ src: 'sine', dur: 0.14, gain: 0.16, att: 0.004, f: [700, 260] });
    v({ src: 'sine', dur: 0.2, gain: 0.2, att: 0.004, f: [120, 60] });
  },
  death: (v, { arp }) => arp(v, [67, 63, 60, 55], 0.14, { src: 'triangle', dur: 0.5, gain: 0.14 }),
  home: (v, { midiHz: hz }) => {
    [72, 76, 79, 84].forEach((n, i) => bell(v, hz, n, i * 0.09, 0.6, 0.14));
    [84, 88, 91].forEach((n) => bell(v, hz, n, 0.4, 0.9, 0.1));
  },
  bay_hit: (v) => {
    v({ src: 'sine', dur: 0.18, gain: 0.18, att: 0.004, f: [200, 120] });
    brush(v, 0, 0.1, 0.07, [600, 200], 0.005);
  },
  bonus_mouse: (v, { arp }) => arp(v, [88, 91, 95], 0.04, { src: 'sine', dur: 0.25, gain: 0.1 }),
  bonus_fish: (v) => {
    v({ src: 'sine', dur: 0.2, gain: 0.14, att: 0.006, f: [350, 900] });
    v({ src: 'sine', t: 0.12, dur: 0.16, gain: 0.12, att: 0.006, f: [450, 1100] });
  },
  turtle_dive: (v) => v({ src: 'sine', dur: 0.5, gain: 0.16, att: 0.01, f: [500, 160], fm: { ratio: 1.5, depth: 20 } }),
  croc_snap: (v) => {
    brush(v, 0, 0.09, 0.2, [2500, 900], 0.002);
    v({ src: 'sine', dur: 0.08, gain: 0.1, att: 0.002, f: [300, 140] });
  },
  honk: (v) => {                                                      // soft goose-like honk
    v({ src: 'triangle', dur: 0.22, gain: 0.14, att: 0.02, f: 330, filters: [{ type: 'lp', f: 1200, q: 0.7 }] });
    v({ src: 'triangle', t: 0.26, dur: 0.24, gain: 0.14, att: 0.02, f: 392, filters: [{ type: 'lp', f: 1200, q: 0.7 }] });
  },
  pete_laugh: (v, { arp }) => arp(v, [76, 74, 72, 70, 67, 64], 0.09, { src: 'triangle', dur: 0.14, gain: 0.12 }),
  pete_throw: (v) => brush(v, 0, 0.3, 0.14, [1200, 300], 0.03),
  tick_low: (v) => v({ src: 'sine', dur: 0.04, gain: 0.08, att: 0.002, f: 1000 }),
  extra_life: (v, { arp }) => arp(v, [67, 71, 74, 79, 83, 86, 91], 0.07, { src: 'triangle', dur: 0.4, gain: 0.12 }),
  level_clear: (v, { midiHz: hz }) => {
    [67, 71, 74, 79, 83, 86].forEach((n, i) => bell(v, hz, n, i * 0.1, 0.4, 0.12));
    [79, 83, 86, 91].forEach((n) => bell(v, hz, n, 0.6, 0.9, 0.1));
  },
  gameover: (v, { arp }) => arp(v, [67, 64, 62, 59, 55, 52], 0.3, { src: 'triangle', dur: 0.5, gain: 0.14 }),
  menu_move: (v) => v({ src: 'sine', dur: 0.05, gain: 0.1, att: 0.003, f: 880 }),
  menu_select: (v, { arp }) => arp(v, [76, 88], 0.07, { src: 'sine', dur: 0.15, gain: 0.12 }),
  start: (v, { arp }) => arp(v, [60, 64, 67, 72, 76], 0.1, { src: 'triangle', dur: 0.35, gain: 0.11 }),
  row_forward: (v) => v({ src: 'sine', dur: 0.08, gain: 0.08, att: 0.004, f: [520, 700] }),
  timeout: (v) => {
    v({ src: 'triangle', dur: 0.3, gain: 0.12, att: 0.01, f: 233, filters: [{ type: 'lp', f: 1000, q: 0.7 }] });
    v({ src: 'triangle', t: 0.35, dur: 0.3, gain: 0.12, att: 0.01, f: 196, filters: [{ type: 'lp', f: 1000, q: 0.7 }] });
  },
});

export const RECIPES_BY_STYLE = Object.freeze({ retro: SFX_RECIPES, ghibli: SFX_RECIPES_GHIBLI });
const cache = new Map();

/** Voices for one name in one style (plain data). opts.pitch scales pitched voices. Unknown style falls back to retro. */
export function describe(name, { style = 'retro', pitch = 1 } = {}) {
  const table = RECIPES_BY_STYLE[style] || SFX_RECIPES;
  if (pitch === 1) {
    const key = `${style}:${name}`;
    if (!cache.has(key)) cache.set(key, describeSfx(table, name));
    return cache.get(key).map((o) => ({ ...o }));
  }
  return describeSfx(table, name, { pitch });
}
export const duration = voicesDuration;

/** Offline render of one SFX name to mono Float32Array. opts: { style, pitch, seed, tail }. Peak kept <= 0.98. */
export function renderSfx(name, sr = 44100, opts = {}) { return renderVoices(describe(name, opts), sr, opts); }
export const stats = pcmStats;
export { midiHz };
