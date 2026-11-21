// Render every SFX to out/sfx/<name>.wav (16-bit mono) through the pure-JS offline path; prints peak/RMS/length.
// usage: node tools/sfx-wav.mjs [name ...] [--sr=44100] [--pitch=1] [--style=retro|ghibli]
// Writes out/sfx/<style>/<name>.wav (run from the repo root).
import { mkdirSync, writeFileSync } from 'node:fs';
import { SFX_NAMES, STYLES, renderSfx, stats } from '../src/audio/sfx.js';

const args = process.argv.slice(2), flags = Object.fromEntries(args.filter((a) => a.startsWith('--')).map((a) => a.slice(2).split('=')));
const names = args.filter((a) => !a.startsWith('--')), sr = +(flags.sr || 44100), pitch = +(flags.pitch || 1);
const style = flags.style || 'retro';
if (!STYLES.includes(style)) { console.error(`unknown --style=${style} (use ${STYLES.join(' or ')})`); process.exit(2); }
const list = names.length ? names : SFX_NAMES;

export function wavBytes(pcm, sr) {
  const b = Buffer.alloc(44 + pcm.length * 2);
  b.write('RIFF', 0); b.writeUInt32LE(36 + pcm.length * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16);
  b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(pcm.length * 2, 40);
  for (let i = 0; i < pcm.length; i++) b.writeInt16LE(Math.round(Math.max(-1, Math.min(1, pcm[i])) * 32767), 44 + i * 2);
  return b;
}
mkdirSync(`out/sfx/${style}`, { recursive: true });
for (const n of list) {
  const pcm = renderSfx(n, sr, { pitch, style }), s = stats(pcm);
  writeFileSync(`out/sfx/${style}/${n}.wav`, wavBytes(pcm, sr));
  console.log(`${n.padEnd(14)} peak ${s.peak.toFixed(2)}  rms ${s.rms.toFixed(3)}  ${(s.len / sr).toFixed(2)}s${s.peak > 1 ? '  CLIP' : ''}`);
}
