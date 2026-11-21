import test from 'node:test';
import assert from 'node:assert/strict';
import { SFX } from '../src/core/defs.js';
import { createBus } from '../src/core/events.js';
import { SFX_RECIPES, SFX_RECIPES_GHIBLI, renderSfx, stats, describe } from '../src/audio/sfx.js';
import { createAudio } from '../src/audio/audio.js';

const SR = 44100;

test('every defs.SFX name has a recipe in both styles', () => {
  for (const name of SFX) {
    assert.equal(typeof SFX_RECIPES[name], 'function', `retro missing ${name}`);
    assert.equal(typeof SFX_RECIPES_GHIBLI[name], 'function', `ghibli missing ${name}`);
  }
  assert.equal(Object.keys(SFX_RECIPES).length, SFX.length);
  assert.equal(Object.keys(SFX_RECIPES_GHIBLI).length, SFX.length);
});

for (const style of ['retro', 'ghibli']) {
  test(`${style}: every SFX renders finite, audible, click-free, peak <= 1, sane length`, () => {
    for (const name of SFX) {
      const pcm = renderSfx(name, SR, { style });
      const s = stats(pcm);
      assert.ok(pcm.length > 0, `${name}: empty`);
      assert.ok(![...pcm].some((x) => !Number.isFinite(x)), `${name}: NaN/Infinity`);
      assert.ok(s.peak <= 1, `${name}: clipping peak ${s.peak}`);
      assert.ok(s.peak > 0.05, `${name}: too quiet / silent (peak ${s.peak.toFixed(3)})`);
      assert.ok(s.rms > 0.005, `${name}: rms too low (${s.rms.toFixed(4)})`);
      const sec = pcm.length / SR;
      assert.ok(sec >= 0.03 && sec <= 2.5, `${name}: duration ${sec.toFixed(2)}s out of range`);
      // no clicks: the sound starts from silence and ends faded out
      assert.ok(Math.abs(pcm[0]) < 0.02, `${name}: click at start (${pcm[0]})`);
      let tailMax = 0;
      for (let i = pcm.length - 20; i < pcm.length; i++) tailMax = Math.max(tailMax, Math.abs(pcm[i]));
      assert.ok(tailMax < 0.01, `${name}: click at end (tail ${tailMax})`);
    }
  });
}

test('rendering is deterministic and pitch option changes the sound', () => {
  const a = renderSfx('splash', SR, { style: 'retro' }), b = renderSfx('splash', SR, { style: 'retro' });
  assert.deepEqual(Array.from(a.slice(0, 500)), Array.from(b.slice(0, 500)));
  const p = renderSfx('hop', SR, { style: 'retro', pitch: 1.5 }), q = renderSfx('hop', SR, { style: 'retro' });
  assert.notDeepEqual(Array.from(p.slice(200, 260)), Array.from(q.slice(200, 260)));
});

test('ghibli uses only soft sources (sine, triangle, brushed noise); retro uses square/saw chiptune', () => {
  for (const name of SFX) {
    for (const o of describe(name, { style: 'ghibli' })) assert.ok(['sine', 'triangle', 'noise'].includes(o.src), `${name}: ${o.src}`);
  }
  const retroSrc = new Set(SFX.flatMap((n) => describe(n, { style: 'retro' }).map((o) => o.src)));
  assert.ok(retroSrc.has('square') && retroSrc.has('saw'));
});

test('unknown name throws; unknown style falls back to retro', () => {
  assert.throws(() => renderSfx('nope', SR));
  assert.deepEqual(describe('hop', { style: 'bogus' }), describe('hop', { style: 'retro' }));
});

// ---- createAudio with a fake WebAudio context --------------------------------------------------------------------
function fakeCtxClass(log) {
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect() {}, gain: param(), frequency: param(), Q: param(), pan: param(),
    threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
  return class FakeCtx {
    constructor() { this.currentTime = 0; this.sampleRate = SR; this.state = 'running'; this.destination = node(); }
    createGain() { return node(); }
    createDynamicsCompressor() { return node(); }
    createBiquadFilter() { return node(); }
    createStereoPanner() { return node(); }
    createBuffer(c, n) { return { getChannelData: () => new Float32Array(n) }; }
    createBufferSource() { return { ...node(), start() {}, stop() {} }; }
    createOscillator() { log.osc++; return { ...node(), type: 'sine', start() {}, stop() {} }; }
    resume() { return Promise.resolve(); }
    close() { return Promise.resolve(); }
  };
}

test('createAudio: events before unlock are dropped, after unlock they play with mapping', async () => {
  const log = { osc: 0 };
  const bus = createBus();
  const a = createAudio(bus, { style: 'ghibli' }, { AudioContextCtor: fakeCtxClass(log) });
  bus.emit('hop', { dir: 'up', x: 100, y: 0 });
  assert.equal(a.stats.played, 0);
  assert.equal(a.stats.dropped, 1);
  assert.equal(await a.unlock(), true);
  bus.emit('hop', { dir: 'up', x: 100, y: 0 });
  bus.emit('splash', { x: 10, y: 0 });
  bus.emit('death', { cause: 'squash', x: 0, y: 0 });   // squash already voices it: silent death
  bus.emit('death', { cause: 'drown', x: 0, y: 0 });
  bus.emit('bonus', { type: 'fish', bay: 0, points: 150 });
  bus.emit('pete_taunt', { line: 'hi' });
  bus.emit('level_clear', { level: 1, bonus: 0 });
  bus.emit('not_an_event', {});
  assert.deepEqual(a.stats.byName, { hop: 1, splash: 1, death: 1, bonus_fish: 1, pete_laugh: 1, level_clear: 1 });
  assert.ok(log.osc > 0);
  a.dispose();
});

test('createAudio: mute, style switch and direct play', async () => {
  const bus = createBus();
  const a = createAudio(bus, { mute: true }, { AudioContextCtor: fakeCtxClass({ osc: 0 }) });
  await a.unlock();
  assert.equal(a.muted, true);
  assert.equal(a.style, 'retro');
  assert.equal(a.play('menu_move'), true);
  assert.equal(a.play('no_such_sfx'), false);
  a.setSettings({ style: 'ghibli', mute: false });
  assert.equal(a.style, 'ghibli');
  assert.equal(a.muted, false);
  a.dispose();
});
