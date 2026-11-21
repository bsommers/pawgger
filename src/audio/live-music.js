// Generic looping live-music scheduler (WebAudio). Node-importable; no globals touched at import.
// createLiveMusic(ctx, dest, { describe(name, style) -> {events,length,loop}, style, timer }) -> { play, stop, setStyle, setVolume, dispose, stats, current }
// Events come from audio-kit describeSong(): tones {t,wave,hz,vel,dur,sus} and drums {t,d:'k'|'s'|'h'|'t',vel,noiseOff}.
// Loops are scheduled ahead (one pass at a time, back to back on the audio clock) by a lookahead timer; one-shots play once.
const ATT = 0.006, REL = 0.02, MASTER = 0.78, FADE = 0.12;
const DRUM = {
  k: { sweep: [150, 45, 0.12], decay: 0.2, gain: 0.6 }, s: { hp: 1400, decay: 0.13, gain: 0.26, tone: [185, 0.18] },
  h: { hp: 6500, decay: 0.045, gain: 0.1 }, t: { sweep: [230, 110, 0.15], decay: 0.24, gain: 0.4 },
};

export function createLiveMusic(ctx, dest, { describe, style = 'retro', lookahead = 1.0, interval = 250, timer } = {}) {
  const T = timer || { set: (f, ms) => setInterval(f, ms), clear: (h) => clearInterval(h) };
  const stats = { passes: 0, tracks: 0, nodes: 0 };
  let cur = null, handle = null, noiseBuf = null, curStyle = style;

  const noise = () => {
    if (noiseBuf) return noiseBuf;
    noiseBuf = ctx.createBuffer(1, ctx.sampleRate | 0 || 44100, ctx.sampleRate || 44100);
    const d = noiseBuf.getChannelData(0); let s = 12345;
    for (let i = 0; i < d.length; i++) { s = (Math.imul(s, 1664525) + 1013904223) >>> 0; d[i] = s / 2147483648 - 1; }
    return noiseBuf;
  };

  function schedulePass(tr, t0) {
    for (const ev of tr.song.events) {
      const t = t0 + ev.t, g = ctx.createGain();
      let src, end;
      if (ev.kind === 'tone') {
        src = ctx.createOscillator(); src.type = ev.wave === 'tri' ? 'triangle' : 'square'; src.frequency.value = ev.hz;
        const v = ev.vel * MASTER; end = t + ev.dur + REL;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + ATT);
        g.gain.exponentialRampToValueAtTime(Math.max(v * ev.sus, 0.0005), t + ev.dur); g.gain.linearRampToValueAtTime(0, end);
        src.connect(g);
      } else {
        const D = DRUM[ev.d]; if (!D) continue;
        const v = (ev.vel ?? 1) * D.gain * MASTER; end = t + D.decay + 0.02;
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.002); g.gain.exponentialRampToValueAtTime(0.0008, t + D.decay);
        if (D.sweep) {
          src = ctx.createOscillator(); src.type = 'sine';
          src.frequency.setValueAtTime(D.sweep[0], t); src.frequency.exponentialRampToValueAtTime(D.sweep[1], t + D.sweep[2]);
          src.connect(g);
        } else {
          src = ctx.createBufferSource(); src.buffer = noise(); src.loop = true;
          const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = D.hp; src.connect(f); f.connect(g);
        }
      }
      g.connect(tr.bus);
      src.start(t, src.buffer ? (ev.noiseOff || 0) : undefined);
      src.stop(end + 0.01);
      tr.srcs.push(src); stats.nodes++;
    }
    stats.passes++;
  }

  function pump() {
    const tr = cur; if (!tr) return;
    const now = ctx.currentTime;
    if (tr.loop) { while (tr.next - now < lookahead) { schedulePass(tr, tr.next); tr.next += tr.song.length; } }
    else if (now > tr.next + 0.1) { release(tr, 0.02); cur = null; clearTimer(); if (tr.then) start(tr.then); }   // sting finished (optionally resume a loop)
  }
  const clearTimer = () => { if (handle != null) { T.clear(handle); handle = null; } };

  function release(tr, fade = FADE) {
    const now = ctx.currentTime;
    try { tr.bus.gain.cancelScheduledValues(now); tr.bus.gain.setValueAtTime(tr.bus.gain.value, now); tr.bus.gain.linearRampToValueAtTime(0, now + fade); } catch { /* ignore */ }
    for (const s of tr.srcs) { try { s.stop(now + fade + 0.02); } catch { /* already stopped */ } }
    tr.srcs.length = 0;
    setTimeout?.(() => { try { tr.bus.disconnect(); } catch { /* ignore */ } }, (fade + 0.1) * 1000).unref?.();
  }

  function stop(fade = FADE) { clearTimer(); if (cur) { release(cur, fade); cur = null; } }

  function start(name, then = null) {
    const song = describe(name, curStyle);
    if (!song || !(song.length > 0)) return false;
    const bus = ctx.createGain(); bus.gain.value = 1; bus.connect(dest);
    const t0 = ctx.currentTime + 0.06;
    cur = { name, song, then, loop: !!song.loop, bus, srcs: [], next: t0 };
    stats.tracks++;
    if (cur.loop) { pump(); handle = T.set(pump, interval); }
    else { schedulePass(cur, t0); cur.next = t0 + song.length; handle = T.set(pump, interval); }
    return true;
  }

  return {
    stats,
    get current() { return cur ? cur.name : null; },
    /** Start a track (loops for play_*, once for stings). Same looping track already playing: no-op. */
    play(name, { then = null } = {}) {
      if (cur && cur.name === name && cur.loop) return true;
      stop(); return start(name, then);
    },
    stop,
    /** Switch song set; restarts the current looping track in the new style. */
    setStyle(s) {
      if (s === curStyle) return; curStyle = s;
      if (cur && cur.loop) { const n = cur.name; stop(); start(n); }
    },
    setVolume() { /* level is the dest node's gain (owned by the caller) */ },
    dispose() { stop(0.02); },
  };
}
