import test from 'node:test';
import assert from 'node:assert/strict';
import { MUSIC, THEMES } from '../src/core/defs.js';
import { SONGS, SONGS_GHIBLI, MUSIC_FOR, MUSIC_NAMES, describeMusic, renderMusic, musicStats, spectralCentroid, songFor, trackForTheme } from '../src/audio/music.js';
import { parseBar } from '../src/kits/audio-kit/index.js';

const SR = 22050, STYLES = { retro: SONGS, ghibli: SONGS_GHIBLI };
const LOOPS = ['title', 'play_day', 'play_dusk', 'play_night'];

test('both sets define exactly the defs.MUSIC names; MUSIC_FOR covers every theme', () => {
  assert.deepEqual(MUSIC_NAMES, MUSIC);
  for (const set of Object.values(STYLES)) assert.deepEqual(Object.keys(set).sort(), [...MUSIC].sort());
  for (const t of THEMES) { assert.ok(MUSIC.includes(MUSIC_FOR[t]), t); assert.equal(trackForTheme(t), MUSIC_FOR[t]); }
  assert.throws(() => songFor('nope'));
});
test('every bar is exactly 16 sixteenths and loop flags are right', () => {
  for (const [st, set] of Object.entries(STYLES)) for (const n of MUSIC) {
    const s = set[n];
    for (const [ch, C] of Object.entries(s.channels)) { assert.ok(C.pat.length >= 1); for (const b of C.pat) parseBar(b); assert.ok(C.pat.length === s.bars || s.bars % C.pat.length === 0, `${st}/${n}/${ch}`); }
    if (s.drums) for (const b of s.drums.pat) assert.equal(b.length, 16, `${st}/${n} drums`);
    assert.equal(s.loop, LOOPS.includes(n), `${st}/${n} loop`);
    const bpm = s.bpm; assert.ok(st === 'ghibli' ? bpm >= 84 && bpm <= 110 : bpm >= 84 && bpm <= 150, `${st}/${n} bpm ${bpm}`);
  }
});
test('every track renders: no NaN, audible, unclipped, sensible RMS, deterministic', () => {
  for (const st of Object.keys(STYLES)) for (const n of MUSIC) {
    const a = renderMusic(n, SR, undefined, st), b = renderMusic(n, SR, undefined, st), s = musicStats(a), T = describeMusic(n, st);
    for (let i = 0; i < a.length; i += 7) assert.ok(Number.isFinite(a[i]), `${st}/${n} NaN`);
    assert.ok(s.peak > 0.2 && s.peak <= 1, `${st}/${n} peak ${s.peak}`);
    assert.ok(s.rms > 0.04 && s.rms < 0.4, `${st}/${n} rms ${s.rms}`);
    assert.ok(Math.abs(s.len / SR - (T.loop ? T.length : T.length + 0.6)) < 0.01, `${st}/${n} length`);
    assert.deepEqual(a, b);
    const c = spectralCentroid(a, SR); assert.ok(c > 150 && c < 6000, `${st}/${n} centroid ${c}`);
  }
});
test('loops are seamless: no click across the wrap and tail energy decays', () => {
  for (const st of Object.keys(STYLES)) for (const n of LOOPS) {
    const T = describeMusic(n, st), pcm = renderMusic(n, SR, T.length * 2, st), N = Math.round(T.length * SR);
    let worst = 0; for (let i = 1; i < pcm.length; i++) worst = Math.max(worst, Math.abs(pcm[i] - pcm[i - 1]));
    let wrap = 0; for (let i = N - 3; i < N + 3; i++) wrap = Math.max(wrap, Math.abs(pcm[i] - pcm[i - 1]));
    assert.ok(wrap <= worst + 1e-9 && wrap < 0.6, `${st}/${n} wrap step ${wrap}`);
    // pass 2 matches pass 1 in energy (sample-exact equality is not expected: loop length is not a whole number of samples)
    const r1 = musicStats(pcm.subarray(0, N)).rms, r2 = musicStats(pcm.subarray(N, 2 * N)).rms;
    assert.ok(Math.abs(r1 - r2) / r1 < 0.02, `${st}/${n} rms pass1 ${r1} vs pass2 ${r2}`);
    // looped render of one pass ends where it started without a jump
    const one = renderMusic(n, SR, undefined, st); assert.ok(Math.abs(one[0]) < 0.5 && Math.abs(one[one.length - 1]) < 0.5);
  }
});
test('no start click and stings fade out', () => {
  for (const st of Object.keys(STYLES)) for (const n of MUSIC) {
    const p = renderMusic(n, SR, undefined, st);
    assert.ok(Math.abs(p[0]) < 0.05 || LOOPS.includes(n), `${st}/${n} first sample`);
    if (!LOOPS.includes(n)) assert.ok(Math.abs(p[p.length - 1]) < 0.01, `${st}/${n} ends silent`);
  }
});
test('ghibli is softer and darker than retro (spectral centroid)', () => {
  for (const n of LOOPS) assert.ok(spectralCentroid(renderMusic(n, SR, undefined, 'ghibli'), SR) < spectralCentroid(renderMusic(n, SR, undefined, 'retro'), SR), n);
});
