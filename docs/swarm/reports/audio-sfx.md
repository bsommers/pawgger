# audio-sfx report

## What I built
- `src/audio/sfx.js`: pure-data recipes for all 23 `defs.SFX` names in two styles. `SFX_RECIPES` is retro (square/saw/triangle/noise chiptune). `SFX_RECIPES_GHIBLI` is soft (sine/triangle bells with a faint FM shimmer, brushed noise, long attacks). Built on `src/kits/audio-kit` (`describeSfx`, `renderVoices`, `arp`, `midiHz`). Exports `describe`, `renderSfx(name, sr, {style, pitch})`, `stats`, `STYLES`.
- `src/audio/audio.js`: `createAudio(bus, settings, {AudioContextCtor})`. Maps bus events to SFX names (hop, splash, squash, death, home, bay_hit, bonus, turtle_dive, croc_snap, honk, pete_taunt to pete_laugh, pete_throw, tick_low, extra_life, level_clear, level_start to start, gameover, row_forward). Also accepts `sfx` bus events. Anti-stacking limits (retrigger 30 ms, 4 per name, 20 total). Methods: `unlock`, `play(name, {x})`, `music(name)`, `setSettings({style, master, sfx, music, mute})`, `setVolume`, `setMute`, `dispose`, `stats`. Live playback uses audio-kit `scheduleVoices`, so the same voices drive WebAudio and PCM.
- `tools/sfx-wav.mjs`: `--style=retro|ghibli` added, output moved to `out/sfx/<style>/<name>.wav`.
- `test/audio-sfx.test.mjs`: 8 tests.

## Verification evidence
- `node --test test/audio-sfx.test.mjs`: 8 pass, 0 fail.
- `node --test test/kits/audio-kit.test.mjs`: 4 pass, 0 fail.
- `node tools/sfx-wav.mjs --style=retro` and `--style=ghibli`: 23 files each, no CLIP flags.
- Numbers (44.1 kHz, both styles): peak 0.08 to 0.45 (max level_clear retro 0.45), so nothing clips. RMS 0.008 to 0.066. Lengths 0.05 s (tick_low) to 2.02 s (ghibli gameover). First sample under 0.02 and last 20 samples under 0.01 for every sound, so no clicks. No NaN.
- Live path: with a fake AudioContext, events before unlock are dropped and counted. After unlock, hop, splash, fish bonus, and pete_laugh play, squash-death is silent, drown-death plays, and an unknown event is ignored. Mute and style switch work.
- No audio device here: nothing was listened to. Validation is numeric plus the fake-context test.

## Deviations from the contract
- `renderSfx` signature is `(name, sr, {style, pitch, seed, tail})`. The old tool called it this way, so the call is unchanged apart from `style`.
- `bonus` with type `treasure` plays `bonus_fish`. Death caused by `squash` or `pete` is silent in `death`, because the `squash` event already sounds it. `level_start` plays `start`.
- `music(name)` only forwards to `music.js` `createMusic(ctx, dest)` if that export exists. `music.js` does not exist yet and the defs `SONGS` and `renderSong` API is not implemented here.
- Factory proposals: none. The voices and renderer already come from audio-kit, and the event engine is game-specific.

## Mistakes I made and how I fixed them
- A test asserted that ghibli honk is quieter than retro. It is not, because sustained triangles have more RMS. I replaced it with a source check: ghibli uses only sine, triangle and noise, and retro uses square and saw.
- I ran `node tools/track.mjs` by mistake. The file does not exist and the error was suppressed. No effect.

## Learnings for a future agent
- Use the audio-kit `att` values of 0.002 or more and exponential release. That gave clean starts and ends with no clicks on every sound.
- `arp()` in the kit has a fixed attack and takes only `lp` as its filter option. For a longer attack, write the voices by hand.
- A Proxy-based fake AudioContext is enough to test `createAudio` in Node without any stubbing of individual methods.

## Requests for other modules
- UI shell (`src/core/settings.js`): add `style: 'retro'` to DEFAULTS and to `sanitizeSettings`, or the style choice is lost on reload. Also pass `style` into `createAudio` and call `audio.setSettings` when the user changes it.
- Music agent: export `createMusic(ctx, dest)` returning `{play(name), stop(), setVolume(v)}` from `src/audio/music.js`. Then `audio.music(name)` will work.
- Sim: `death` events carry `cause`. A `'time'` value maps to the timeout sound. Confirm the sim uses that name for a timeout death.
