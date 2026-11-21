import test from 'node:test';
import assert from 'node:assert/strict';
import { createBus } from '../src/core/events.js';
import { createAudio } from '../src/audio/audio.js';
import { createLiveMusic } from '../src/audio/live-music.js';
import { describeMusic } from '../src/audio/music.js';

function fakeCtx() {
  const c = { currentTime: 0, sampleRate: 8000, state: 'running', made: [], destination: {}, resume: async () => {}, close: async () => {} };
  const param = () => ({ value: 0, setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {}, cancelScheduledValues() {} });
  const node = (kind, extra = {}) => { const n = { kind, connect() {}, disconnect() {}, gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param(), pan: param(), started: [], stopped: [], start(t) { this.started.push(t); }, stop(t) { this.stopped.push(t); }, ...extra }; c.made.push(n); return n; };
  c.createGain = () => node('gain'); c.createOscillator = () => node('osc'); c.createDynamicsCompressor = () => node('comp');
  c.createBiquadFilter = () => node('filter'); c.createBufferSource = () => node('bufsrc');
  c.createBuffer = (ch, n) => ({ getChannelData: () => new Float32Array(n) });
  c.createStereoPanner = () => node('pan');
  return c;
}
const fakeTimer = () => { const t = { fn: null, set(f) { t.fn = f; return 1; }, clear() { t.fn = null; } }; return t; };
const count = (c, kind) => c.made.filter((n) => n.kind === kind).length;

test('describeMusic contains drums', () => {
  assert.ok(describeMusic('play_day').events.some((e) => e.kind === 'drum'));
});

test('loop reschedules ahead every pass; style switch restarts; no exceptions', () => {
  const ctx = fakeCtx(), tm = fakeTimer();
  const m = createLiveMusic(ctx, {}, { describe: describeMusic, timer: tm, lookahead: 1 });
  assert.ok(m.play('play_day'));
  assert.equal(m.stats.passes, 1);
  const len = describeMusic('play_day').length;
  ctx.currentTime = 0.5; tm.fn(); assert.equal(m.stats.passes, 1);   // next pass not yet within lookahead
  ctx.currentTime = len - 0.5; tm.fn(); assert.equal(m.stats.passes, 2);
  ctx.currentTime = 2 * len; tm.fn(); assert.ok(m.stats.passes >= 3);
  assert.equal(m.play('play_day'), true); const p = m.stats.tracks; assert.equal(m.stats.tracks, p);   // same loop: no restart
  const before = m.stats.tracks; m.setStyle('ghibli'); assert.equal(m.stats.tracks, before + 1); assert.equal(m.current, 'play_day');
  m.setStyle('ghibli'); assert.equal(m.stats.tracks, before + 1);
  m.stop(); assert.equal(m.current, null); assert.equal(tm.fn, null);
});

test('sting plays once, schedules nothing more, and resumes nothing (or the given loop)', () => {
  const ctx = fakeCtx(), tm = fakeTimer();
  const m = createLiveMusic(ctx, {}, { describe: describeMusic, timer: tm });
  m.play('gameover'); const passes = m.stats.passes; assert.equal(passes, 1);
  ctx.currentTime = 30; tm.fn(); tm.fn?.();
  assert.equal(m.stats.passes, passes); assert.equal(m.current, null);
  m.play('death', { then: 'play_day' }); ctx.currentTime = 60; tm.fn();
  assert.equal(m.current, 'play_day');
});

test('createAudio wires bus events to music, drums present, volume + style respected', () => {
  const bus = createBus(), ctx = fakeCtx();
  const a = createAudio(bus, { music: 0.4, style: 'retro' }, { AudioContextCtor: function () { return ctx; } });
  bus.emit('level_start', { level: 1, theme: 'day' });   // before unlock: remembered
  return a.unlock().then(() => {
    const oscs = count(ctx, 'osc'), noise = count(ctx, 'bufsrc');
    assert.ok(oscs > 20 && noise > 0, 'tones and drums scheduled');
    assert.equal(a.volume.music, 0.4);
    a.setSettings({ style: 'ghibli', music: 0.2 }); assert.equal(a.style, 'ghibli'); assert.ok(count(ctx, 'osc') > oscs);
    const n0 = ctx.made.length;
    bus.emit('level_clear', { level: 1 }); assert.ok(ctx.made.length > n0);
    bus.emit('level_start', { level: 2, theme: 'night' });
    bus.emit('gameover', {}); bus.emit('death', { cause: 'car' }); bus.emit('death', { cause: 'squash' });
    a.music('title'); a.music(null); a.setMute(true); a.dispose();
  });
});
