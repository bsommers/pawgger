# audio-music report

## What I built
- `src/audio/music.js`: audio-kit tracker songs for every `defs.MUSIC` name in two sets, `SONGS` (retro: pulse lead, arp, triangle bass, drums, bpm 84-150) and `SONGS_GHIBLI` (flute-like triangle lead, plucked-triangle waltz arpeggios in groups of 3, two soft pad voices, waltz bass, no drums, bpm 84-104). Exports `MUSIC_NAMES`, `MUSIC_FOR` (day->play_day, dusk->play_dusk, night->play_night), `SONGS`, `SONGS_GHIBLI`, `SONG_SETS`, `songFor(name, style)`, `trackForTheme`, `describeMusic`, `renderMusic(name, sr, seconds, style)`, `musicStats`, `spectralCentroid`.
- Keys: title G (retro) / C (ghibli); day C / F; dusk Am / Dm; night Em (chromatic, tense) / Am. All original.
- `tools/music-wav.mjs` gained `--style=retro|ghibli|both` (ghibli output in `out/music/ghibli/`).
- `test/audio-music.test.mjs` (6 tests).

## Verification evidence
- `node --test test/audio-music.test.mjs` passes: names, all bars parse to 16 steps, bpm ranges, no NaN, peak 0.2..1, RMS 0.04..0.4, lengths, determinism, loop wrap step not a click, pass-1/pass-2 RMS match, stings end silent, ghibli centroid < retro.
- `node tools/music-wav.mjs --style=both`: peaks 0.46-0.86, RMS 0.08-0.19, retro centroid 1.7-2.3 kHz, ghibli 0.6-1.0 kHz. `check-imports`: 0 errors.
- No audio device: judged by numbers only, not by ear.

## Deviations from the contract
- Architecture section 8 says bpm 120-150; retro title/dusk/night/day are 120-138, but retro stings gameover 84 bpm (slow dirge, intentional). Ghibli is 84-104 per task.
- audio-kit songs only support `pulse`/`tri` waves, so "sine" ghibli voices are triangle with low gain; "strings" are two sustained triangle pads.
- Songs are 8 bars (13-23 s per loop), not 16.

## Mistakes I made and how I fixed them
- Tool call to a wrong-case tool name (harmless). A first test asserted sample-exact periodicity of loops; loop length is not a whole number of samples (event rounding), so I compare RMS of both passes instead.

## Learnings for a future agent
- Build bars from chord helpers (`bars(chords, ARP.x)`) so every bar is 16 steps by construction; `parseBar` throws otherwise.
- Live `scheduleSong` in audio-kit ignores drums and plays pulse as square, so live retro music has no drums and the duty differs from the offline render.

## Requests for other modules
- audio-sfx (`audio.js`): pick `SONG_SETS[settings.style] ?? SONGS` (or `songFor(name, style)`), map theme via `MUSIC_FOR`; loop by re-scheduling every `describeMusic(...).length`. Consider drum playback in live mode (kit `scheduleSong` skips drums).
- Shared-library defect: audio-kit `scheduleSong` skips drums and only maps wave to square/triangle (duty ignored).

## Factory proposals
none
