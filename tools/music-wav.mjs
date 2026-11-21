// Render every music track to out/music/<name>.wav (16-bit mono) through the pure-JS offline path; prints length/peak/RMS/centroid.
// usage: node tools/music-wav.mjs [name ...] [--sr=44100] [--seconds=N] [--loops=N] [--style=retro|ghibli|both]
import { mkdirSync, writeFileSync } from 'node:fs';
import { MUSIC_NAMES, MUSIC_STYLES, describeMusic, renderMusic, musicStats, spectralCentroid } from '../src/audio/music.js';

const args = process.argv.slice(2), flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const names = args.filter((a) => !a.startsWith('--')), sr = +(flags.sr || 44100);
const list = names.length ? names : MUSIC_NAMES;
const styles = flags.style === 'both' ? ['retro', 'ghibli'] : [flags.style || 'retro'];
for (const st of styles) if (!MUSIC_STYLES.includes(st)) { console.error('unknown --style ' + st + ' (retro|ghibli|both)'); process.exit(2); }

export function wavBytes(pcm, rate) {
  const b = Buffer.alloc(44 + pcm.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(rate, 24); b.writeUInt32LE(rate * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(pcm.length * 2, 40);
  for (let i = 0; i < pcm.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
  return b;
}
for (const style of styles) {
  const dir = style === 'retro' ? 'out/music' : `out/music/${style}`;
  mkdirSync(dir, { recursive: true });
  for (const n of list) {
    const T = describeMusic(n, style);
    const secs = flags.seconds ? +flags.seconds : flags.loops ? T.length * +flags.loops : undefined;
    const pcm = renderMusic(n, sr, secs, style), s = musicStats(pcm);
    writeFileSync(`${dir}/${n}.wav`, wavBytes(pcm, sr));
    console.log(`${style.padEnd(6)} ${n.padEnd(11)} ${(s.len / sr).toFixed(2)}s  ${T.bpm}bpm ${T.loop ? 'loop' : 'sting'}  peak ${s.peak.toFixed(2)}  rms ${s.rms.toFixed(3)}  centroid ${Math.round(spectralCentroid(pcm, sr))}Hz${s.peak > 1 ? '  CLIP' : ''}`);
  }
}
