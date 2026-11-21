// Pawgger soundtrack (ARCHITECTURE.md section 8). Every name in defs.MUSIC is an audio-kit tracker song (plain data, bars of 16 sixteenths).
// Two styles, same names: SONGS ('retro': pulse leads, bouncy bass, drums) and SONGS_GHIBLI (gentle waltz-ish piano arpeggios, soft pads,
// flute-like lead; triangle waves only, no drums). audio.js picks one by settings.style. The same data drives live WebAudio and offline PCM.
import { MUSIC, THEMES } from '../core/defs.js';
import { describeSong, renderSong, pcmStats } from '../kits/audio-kit/index.js';

export const MUSIC_NAMES = MUSIC;
export const MUSIC_STYLES = Object.freeze(['retro', 'ghibli']);
/** Level theme -> looping gameplay track. */
export const MUSIC_FOR = Object.freeze({ day: 'play_day', dusk: 'play_dusk', night: 'play_night' });

// ---- helpers: chords -> note names ---------------------------------------------------------------------------------
const PC = { C: 0, 'C#': 1, Db: 1, D: 2, 'D#': 3, Eb: 3, E: 4, F: 5, 'F#': 6, Gb: 6, G: 7, 'G#': 8, Ab: 8, A: 9, 'A#': 10, Bb: 10, B: 11 };
const NN = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const name = (m) => NN[m % 12] + (Math.floor(m / 12) - 1);
/** 'Am' | 'F' | 'E' -> chord tones (midi numbers) at a given base octave. */
function chord(sym, base = 60) {
  const minor = sym.endsWith('m'), r = PC[minor ? sym.slice(0, -1) : sym];
  return { root: base + r, third: base + r + (minor ? 3 : 4), fifth: base + r + 7, minor };
}
const rep = (s, n) => Array.from({ length: n }, () => s);
const R = (n, len) => `${name(n)}:${len}`;
// bass patterns (16 steps)
const BASS = {
  bounce: (c) => `${R(c.root - 24, 3)} .:1 ${R(c.fifth - 24, 3)} .:1 ${R(c.root - 24, 3)} .:1 ${R(c.fifth - 24, 3)} .:1`,
  walk: (c) => `${R(c.root - 24, 4)} ${R(c.fifth - 24, 4)} ${R(c.root - 24, 4)} ${R(c.third - 24, 4)}`,
  drive: (c) => `${R(c.root - 24, 2)} ${R(c.root - 12, 2)} `.repeat(4).trim(),
  pulse: (c) => `${R(c.root - 24, 3)} ${R(c.root - 24, 1)} .:2 ${R(c.root - 24, 2)} ${R(c.fifth - 24, 2)} .:2 ${R(c.root - 24, 2)} ${R(c.root - 12, 2)}`,
  waltz: (c) => `${R(c.root - 24, 3)} .:3 ${R(c.fifth - 24, 3)} .:3 ${R(c.fifth - 24, 3)} .:1`,   // oom-pah-pah in groups of 3 (waltz-ish)
  whole: (c) => R(c.root - 24, 16),
};
// arpeggio patterns (16 steps)
const ARP = {
  up: (c) => `${R(c.root, 2)} ${R(c.third, 2)} ${R(c.fifth, 2)} ${R(c.third, 2)} `.repeat(2).trim(),
  stab: (c) => `.:2 ${R(c.third, 2)} .:2 ${R(c.fifth, 2)} .:2 ${R(c.third, 2)} .:2 ${R(c.fifth, 2)}`,
  trip: (c) => `${R(c.root, 3)} ${R(c.third, 3)} ${R(c.fifth, 3)} ${R(c.third, 3)} ${R(c.fifth, 3)} ${R(c.root, 1)}`,   // rolling 3-feel
  roll: (c) => `${R(c.root, 3)} ${R(c.fifth, 3)} ${R(c.third + 12, 3)} ${R(c.fifth, 3)} ${R(c.third, 3)} ${R(c.root, 1)}`,
  sparse: (c) => `${R(c.root, 3)} .:3 ${R(c.fifth, 3)} .:3 ${R(c.third + 12, 3)} .:1`,
};
const pad = (c, which, oct = -12) => R(c[which] + oct, 16);
const bars = (chords, f, base) => chords.map((s) => f(chord(s, base)));

/** Retro song: lead (hand-written bars) + arp + bass + drums. */
function retro({ bpm, chords, lead, arp = 'up', bass = 'bounce', drums, loop = true, vel = {}, duty = 0.25, arpDuty = 0.125 }) {
  const song = { bpm, bars: lead.length, loop, channels: {
    lead: { wave: 'pulse', duty, vel: vel.lead ?? 0.28, gate: 0.75, sus: 0.35, pat: lead },
    bass: { wave: 'tri', vel: vel.bass ?? 0.38, gate: 0.85, sus: 0.8, pat: bars(chords, BASS[bass], 60) },
  } };
  if (arp) song.channels.harm = { wave: 'pulse', duty: arpDuty, vel: vel.arp ?? 0.1, gate: 0.5, sus: 0.2, pat: bars(chords, ARP[arp], 60) };
  if (drums) song.drums = { vel: vel.drums ?? 0.9, pat: drums };
  return song;
}

/** Ghibli song: flute lead + piano arpeggio (plucked triangle) + two soft pad voices + waltz bass; no drums. */
function ghibli({ bpm, chords, lead, arp = 'trip', bass = 'waltz', loop = true, leadVel = 0.2, padVel = 0.055, pads = true }) {
  const song = { bpm, bars: lead.length, loop, channels: {
    flute: { wave: 'tri', vel: leadVel, gate: 0.95, sus: 0.7, pat: lead },
    piano: { wave: 'tri', vel: 0.16, gate: 1.0, sus: 0.06, pat: bars(chords, ARP[arp], 60) },
    bass: { wave: 'tri', vel: 0.26, gate: 0.9, sus: 0.3, pat: bars(chords, BASS[bass], 60) },
  } };
  if (pads) {
    song.channels.pad1 = { wave: 'tri', vel: padVel, gate: 1.0, sus: 0.85, pat: chords.map((s) => pad(chord(s), 'third', -12)) };
    song.channels.pad2 = { wave: 'tri', vel: padVel, gate: 1.0, sus: 0.85, pat: chords.map((s) => pad(chord(s), 'fifth', -12)) };
  }
  return song;
}

// drum grids (16 chars: k s h t, K = kick+hat, S = snare+hat)
const D_FOUR = rep('K.h.S.h.K.h.S.h.', 7).concat(['K.h.S.h.K.ttSsss']);
const D_DUSK = rep('K...h...S...h.h.', 7).concat(['K...h...S.t.t.s.']);
const D_NIGHT = rep('K.h.K.hhS.h.K.h.', 3).concat(['K.h.K.hhS.h.KttK']).concat(rep('K.h.K.hhS.h.K.h.', 3)).concat(['K.hhK.hhS.sSS.sS']);

// ---- RETRO ---------------------------------------------------------------------------------------------------------
export const SONGS = Object.freeze({
  // jaunty jungle-meets-arcade, G major, bpm 132
  title: retro({ bpm: 132, chords: ['G', 'C', 'D', 'G', 'Em', 'C', 'D', 'G'], bass: 'bounce', arp: 'stab', drums: D_FOUR, lead: [
    'G5:2 B5:2 D6:4 C6:2 B5:2 A5:2 G5:2', 'E5:2 G5:2 C6:4 B5:2 G5:2 E5:4', 'F#5:2 A5:2 D6:4 C6:2 A5:2 F#5:2 A5:2', 'G5:4 B5:2 D6:2 G6:8',
    'E5:2 G5:2 B5:4 A5:2 G5:2 E5:4', 'C5:2 E5:2 G5:4 A5:2 G5:2 E5:2 C5:2', 'D5:2 F#5:2 A5:4 B5:2 A5:2 F#5:4', 'G5:2 D5:2 B4:2 D5:2 G5:8'] }),
  // C major, bpm 138: bright, bouncy
  play_day: retro({ bpm: 138, chords: ['C', 'F', 'G', 'C', 'Am', 'F', 'G', 'C'], bass: 'bounce', arp: 'up', drums: D_FOUR, lead: [
    'E5:2 G5:2 C6:4 B5:2 G5:2 E5:2 G5:2', 'A5:2 F5:2 C5:2 F5:2 A5:4 G5:2 F5:2', 'G5:2 B5:2 D6:4 B5:2 G5:2 D5:4', 'E5:4 G5:2 E5:2 C5:4 .:4',
    'A5:2 C6:2 E6:4 C6:2 A5:2 E5:2 A5:2', 'F5:2 A5:2 C6:4 A5:2 F5:2 A5:4', 'G5:2 A5:2 B5:2 D6:2 G6:4 D6:2 B5:2', 'C6:4 G5:2 E5:2 C5:4 .:4'] }),
  // A minor, bpm 120: moodier, slower groove
  play_dusk: retro({ bpm: 120, chords: ['Am', 'F', 'C', 'G', 'Am', 'F', 'G', 'E'], bass: 'walk', arp: 'up', drums: D_DUSK, duty: 0.5, lead: [
    'E5:4 A5:4 G5:2 E5:2 C5:4', 'F5:4 A5:4 C6:2 A5:2 F5:4', 'E5:2 G5:2 C6:4 B5:2 G5:2 E5:4', 'D5:4 G5:4 B5:4 A5:2 G5:2',
    'C6:4 B5:2 A5:2 E5:4 A5:4', 'A5:4 F5:2 A5:2 C6:8', 'B5:2 A5:2 G5:4 D5:4 G5:4', 'G#5:4 B5:4 E6:4 .:4'] }),
  // E minor, bpm 138: tense, chromatic, driving
  play_night: retro({ bpm: 138, chords: ['Em', 'Em', 'C', 'B', 'Em', 'Am', 'B', 'B'], bass: 'drive', arp: 'stab', drums: D_NIGHT, duty: 0.5, vel: { lead: 0.26 }, lead: [
    'E5:2 .:2 E5:2 G5:2 F#5:2 .:2 E5:2 D#5:2', 'E5:2 .:2 E5:2 B5:2 A5:2 G5:2 F#5:4', 'C6:4 B5:2 G5:2 E5:4 G5:4', 'B5:2 A#5:2 B5:2 D#6:2 F#6:4 D#6:2 B5:2',
    'E5:2 .:2 E5:2 G5:2 F#5:2 .:2 E5:2 D#5:2', 'A5:4 C6:4 B5:4 A5:2 G5:2', 'D#6:2 B5:2 F#5:2 B5:2 D#6:2 B5:2 F#5:2 D#5:2', 'B5:8 .:8'] }),
  // stings
  levelclear: retro({ bpm: 144, loop: false, chords: ['C', 'C'], bass: 'bounce', arp: 'up', lead: ['C5:2 E5:2 G5:2 C6:2 E6:4 D6:2 E6:2', 'G6:4 C7:8 .:4'] }),
  gameover: retro({ bpm: 84, loop: false, chords: ['Am', 'Am'], bass: 'whole', arp: null, duty: 0.5, lead: ['E5:4 D#5:4 D5:4 C#5:4', 'C5:8 G4:4 .:4'] }),
  death: retro({ bpm: 150, loop: false, chords: ['Am'], bass: 'whole', arp: null, duty: 0.5, lead: ['G5:2 F#5:2 F5:2 E5:2 D#5:2 D5:2 C#5:2 C5:2'] }),
});

// ---- GHIBLI --------------------------------------------------------------------------------------------------------
export const SONGS_GHIBLI = Object.freeze({
  // C major, bpm 92: warm, sunrise-on-the-meadow
  title: ghibli({ bpm: 92, chords: ['C', 'Am', 'F', 'G', 'C', 'Em', 'F', 'G'], arp: 'roll', lead: [
    'E5:6 G5:3 C6:3 B5:4', 'C6:6 A5:3 E5:3 A5:4', 'A5:6 C6:3 F5:3 A5:4', 'G5:6 B5:3 D6:3 D6:4',
    'E5:3 G5:3 C6:6 G5:4', 'G5:6 B5:3 E6:3 D6:4', 'C6:6 A5:3 F5:3 C6:4', 'D6:6 B5:3 G5:3 G5:4'] }),
  // F major, bpm 96: gentle daylight waltz
  play_day: ghibli({ bpm: 96, chords: ['F', 'Bb', 'C', 'F', 'Dm', 'Bb', 'C', 'F'], arp: 'trip', lead: [
    'A4:6 C5:3 F5:3 E5:4', 'D5:6 F5:3 D5:3 Bb4:4', 'C5:6 E5:3 G5:3 E5:4', 'F5:12 .:4',
    'D5:6 F5:3 A5:3 G5:4', 'F5:6 D5:3 Bb4:3 D5:4', 'E5:3 G5:3 C6:6 Bb5:4', 'A5:12 .:4'] }),
  // D minor, bpm 88: golden-hour wistfulness
  play_dusk: ghibli({ bpm: 88, chords: ['Dm', 'Bb', 'F', 'C', 'Dm', 'Gm', 'A', 'Dm'], arp: 'roll', lead: [
    'F5:6 A5:3 D6:3 C6:4', 'D6:6 Bb5:3 F5:3 Bb5:4', 'C6:6 A5:3 F5:3 A5:4', 'G5:6 E5:3 G5:3 C6:4',
    'A5:6 F5:3 D5:3 F5:4', 'G5:6 Bb5:3 D6:3 C6:4', 'C#6:6 E6:3 A5:3 G5:4', 'F5:12 .:4'] }),
  // A minor, bpm 84: moonlit, sparse and soft
  play_night: ghibli({ bpm: 84, chords: ['Am', 'Am', 'F', 'E', 'Am', 'Dm', 'E', 'Am'], arp: 'sparse', leadVel: 0.17, lead: [
    'E5:8 C5:4 E5:4', 'A5:6 G5:3 E5:3 C5:4', 'A5:8 F5:4 A5:4', 'G#5:6 B5:3 E5:3 .:4',
    'E5:6 A5:3 C6:3 B5:4', 'A5:6 F5:3 D5:3 F5:4', 'E5:4 G#5:4 B5:4 E5:4', 'A4:12 .:4'] }),
  levelclear: ghibli({ bpm: 104, loop: false, chords: ['C', 'C'], arp: 'roll', lead: ['C5:3 E5:3 G5:3 C6:7', 'E6:4 D6:4 C6:8'] }),
  gameover: ghibli({ bpm: 84, loop: false, chords: ['Dm', 'Dm'], arp: 'sparse', lead: ['F5:6 E5:3 D5:3 C5:4', 'D5:12 .:4'] }),
  death: ghibli({ bpm: 100, loop: false, chords: ['Dm'], arp: 'sparse', pads: false, lead: ['A5:4 F5:4 D5:4 A4:4'] }),
});

export const SONG_SETS = Object.freeze({ retro: SONGS, ghibli: SONGS_GHIBLI });
/** Song data for a style ('retro' default; unknown styles fall back to retro). */
export function songFor(trackName, style = 'retro') {
  const s = (SONG_SETS[style] ?? SONGS)[trackName];
  if (!s) throw new Error('unknown music track: ' + trackName);
  return s;
}
/** Track name for a level theme ('day'|'dusk'|'night'); unknown -> play_day. */
export const trackForTheme = (theme) => MUSIC_FOR[theme] ?? 'play_day';

// ---- describe / render / analysis ----------------------------------------------------------------------------------
export const describeMusic = (trackName, style = 'retro') => describeSong(songFor(trackName, style));
/** Offline PCM (Float32Array mono). `seconds` defaults to one pass (loops) or one pass plus tail (stings). */
export const renderMusic = (trackName, sr = 44100, seconds, style = 'retro') => renderSong(songFor(trackName, style), sr, seconds);
export const musicStats = (pcm) => pcmStats(pcm);

/** Spectral centroid (Hz) over up to 2^16 samples from the middle of the buffer (Hann window, radix-2 FFT). */
export function spectralCentroid(pcm, sr = 44100) {
  let n = 1; while (n * 2 <= Math.min(pcm.length, 65536)) n *= 2;
  const off = Math.max(0, (pcm.length - n) >> 1), re = new Float64Array(n), im = new Float64Array(n);
  for (let i = 0; i < n; i++) re[i] = pcm[off + i] * (0.5 - 0.5 * Math.cos((2 * Math.PI * i) / (n - 1)));
  for (let i = 1, j = 0; i < n; i++) { let b = n >> 1; for (; j & b; b >>= 1) j ^= b; j ^= b; if (i < j) { [re[i], re[j]] = [re[j], re[i]]; } }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = (-2 * Math.PI) / len, wr = Math.cos(ang), wi = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let cr = 1, ci = 0;
      for (let k = 0; k < len / 2; k++) {
        const a = i + k, b = a + len / 2, tr = re[b] * cr - im[b] * ci, ti = re[b] * ci + im[b] * cr;
        re[b] = re[a] - tr; im[b] = im[a] - ti; re[a] += tr; im[a] += ti;
        const t = cr * wr - ci * wi; ci = cr * wi + ci * wr; cr = t;
      }
    }
  }
  let num = 0, den = 0;
  for (let k = 1; k < n / 2; k++) { const m = Math.hypot(re[k], im[k]); num += m * ((k * sr) / n); den += m; }
  return den > 0 ? num / den : 0;
}
export { THEMES };
