# Pawgger architecture (binding contract)

Frogger parody. Fixed 224x256 screen, 16 px grid, 14 cols x 16 rows. `src/core/defs.js` holds every constant (read it: ROW map, BAY_X, TUNING, SCORES, ITEM_KINDS, EVENTS, SFX, MUSIC, ART). Zero deps, ES modules, Node-safe sim, fixed 1/60 step, seeded RNG (`src/core/rng.js` `createRng`), no `Math.random` in sim/levels. Art is code-drawn into `PixBuf` (`src/art/pixbuf.js`) using only `defs.PAL` (+ `shade`/`mix`). Port 4850 is the swarm tracker.

## 1. Screen (top to bottom)
row0 HUD/canopy · row1 five home bays (x = BAY_X, 32 wide) · rows 2-6 river (5 lanes) · row7 median · rows 8-12 road (5 lanes) · row13 start strip · row14 HUD bottom (lives, level, time bar) · row15 Pete ticker. Colby is a top-down cat; x = centre, y = row centre (`rowY(row)`).

## 2. Modules and owners (disjoint)
| Module | Files | Agent |
|---|---|---|
| sim core + grid hop | `src/sim/game.js`, `src/sim/player.js`, `src/lib/grid-hop.js` | sim-core |
| lanes + level gen + validator | `src/levels/lanes.js`, `src/levels/levels.js`, `tools/validate-level.mjs` | lane-gen |
| Pete + bays | `src/sim/pete.js`, `src/sim/bays.js` | sim-extras |
| autopilot | `src/sim/autopilot.js`, `tools/botplay.mjs` | qa-bot |
| art | `src/art/{colby,vehicles,river,world,fx}.js`, `src/art/registry.js` | art-* |
| render | `src/render/{renderer,scene,background,particles}.js` | render |
| audio | `src/audio/{sfx,music,audio}.js` | audio-* |
| UI shell | `src/main.js`, `index.html`, `style.css`, `src/ui/{hud,menus,screens,touch}.js`, build | ui-shell |

## 3. Lane model (closed form: the key to a fair, lookahead-able, seamless game)
A lane is `{row, kind:'road'|'river', dir:+1|-1, speed, ring, pad, items:[item]}` with item `{id, kind, w, x0, dive?, croc?}`.
`itemX(lane, item, t) = mod(item.x0 + lane.dir*lane.speed*t, lane.ring) - lane.pad` is the item's LEFT edge at level time `t` (seconds). `lane.pad = max item w in the lane`, `lane.ring >= W + pad` so wrapping happens off screen. `speed` is already scaled by level. Everything (collision, carry, bot lookahead, validator) must use these functions, never integrate positions.
- `lane.dir` +1 = moves right. Vehicle and platform sprites face right; mirror for dir -1.
- Turtles: `item.dive = {phase, period, sink, under, rise}` (defaults from TUNING.turtleDive). `turtleState(item,t)` returns `'up'|'sink'|'under'|'rise'`. Supports a rider when `up`, `rise`, or in the first half of `sink`. Stagger `phase` per item.
- Croc: `item.croc = {phase, period, open}`. `crocState(item,t)` returns `'closed'|'open'`. Back = 48 px at the trailing end, head = 16 px at the leading end (leading = direction of travel). Back always supports; head supports when closed, kills when open.
- Support test (river): rider centre x within `[left - margin, left + w + margin]` of a supporting item (back only for croc). Lethal head: AABB overlap with open head. Carry: while riding, `player.x += lane.dir*lane.speed*dt`.
- Road kill: player AABB (TUNING.hitHalfW/H) vs item AABB (`w` x 14 px centred in the row). `roller` rolls like a vehicle (cheese wheel, may be faster).

## 4. Sim rules (sim-core)
- Input per step: `cmd = {hop: null|'up'|'down'|'left'|'right', start?:bool}`. A hop begins when idle (or buffers one pending hop). Hop = linear move of 16 px in `TUNING.hopTime`; `up` into row 1 only if `|x - bayCx| <= BAY_TOL` for a bay, otherwise `bay_wall` death. Down is blocked below row 13; left/right clamp to `[hopMaxX, hopMaxXR]` on land rows; on river rows a sideways hop is allowed anywhere on screen.
- On landing (and every step while idle) in a river row: find supporting item else `drown` death (`splash`). Riding item gets `player.riding = {lane, id}` and carries. Centre x outside `[0, W]` = `edge` death. Landing on an open croc head = `croc` death.
- On a road row: any overlap kill = `squash`. Pete and `g.extra[]` rectangles (cheese wheels thrown by Pete) kill the same way (`cause 'pete'`).
- Score: `forwardRow` the first time each row is reached on this attempt (reset per attempt), `bay` + `timeBonusPerSec * floor(timeLeft)` on a bay, `bonus*` when a mouse/fish bay is entered (bonus is added on top), `levelClear` when 5 bays are filled. Extra life at `extraLifeFirst` then every `extraLifeEvery` (emit `extra_life`).
- Timer: `timeLeft` counts down from `TIME_LIMIT` per attempt; at 0 = `timeout` death. Emit `tick_low` each whole second under 8.
- Death: state `dying` for 1.2 s (`player.mode` = `squash`/`drown`, frame anim set in the SAME function that sets the mode), then lives-1; 0 lives = `gameover` else respawn at START with `timeLeft` reset. `home`: Colby shown in the bay for the remainder of the level (`bays[i].filled = true`), then a respawn after 0.8 s. Filling the 5th bay = `levelclear` state for 2.5 s then the next level (`level_start`).
- State machine: title, intro (1.5 s, "LEVEL n"), play, dying, levelclear, gameover. `g.step` in states other than play only advances timers.
- Determinism: same seed + same cmd sequence = same game. Level time `g.t` runs only in `play`/`dying` and resets on `startLevel`.

## 5. Cross-module API (every hook; example calls)
```js
// levels (lane-gen)
import { itemX, turtleState, crocState, supports, itemRect, visibleItems, levelDef, speedMul } from './levels/lanes.js';  // lanes.js: pure functions above
levelDef(level, seed)  // -> {level, seed, theme:'day'|'dusk'|'night', speedMul, lanes:[10 lanes: road rows 8..12 then river rows 2..6, each as section 3], bays:[{cx, hazard:null|'croc'|'snake', bonus:null|'mouse'|'fish'}] x5, peteMode, cheeseEvery}
visibleItems(def, t)   // -> [{lane, item, kind, x, y, w, dir, state, frame}] for the renderer (state: 'up'|'sink'|'under'|'rise' for turtles, 'open'|'closed' for crocs)
supports(lane, item, t, px) // -> 'back'|'head'|null  (river support test incl. margin)
// sim-core (game.js)
import { createGame } from './sim/game.js';
const g = createGame({ seed: 1, level: 1, bus, startLives: 3 });
g.startLevel(n); g.step({hop:'up'}); g.state; g.level /*levelDef*/; g.t; g.timeLeft; g.score; g.lives; g.player; g.bays; g.extra; g.pete; g.popups
// g.player = {x, y, row, facing:'up'|'down'|'left'|'right', mode:'idle'|'hop'|'riding'|'squash'|'drown'|'home'|'dead', hopT /*0..1*/, frame /*sprite frame idx*/, riding:null|{lane:rowIndex,id}, deathT}
// g.bays[i] = {cx, hazard, bonus, filled, open /*hazard currently lethal*/, bonusT /*seconds left showing a bonus*/}
// g.extra = [{kind:'cheese', x /*left*/, row, w:16, vx, ttl}]  // pete.js pushes/moves them, game.js collides with them
// g.pete = {mode:'hidden'|'taunt'|'patrol', x, dir, w, line, lineT}
// sim-extras
import { initPete, updatePete, peteRect } from './sim/pete.js';   // initPete(g) at startLevel; updatePete(g, dt) each play step; peteRect(g)->{x,y,w,h}|null (lethal when in patrol)
import { initBays, updateBays, bayForHop } from './sim/bays.js';  // initBays(g) fills g.bays from g.level.bays; updateBays(g, dt) cycles croc/snake open, spawns/expires bonuses; bayForHop(g, x) -> {index, ok, why:'wall'|'hazard'|'filled'|null}
// game.js imports these with try/catch fallbacks (no-op stubs) so it runs before they exist.
// autopilot (qa-bot)
import { createBot } from './sim/autopilot.js'; const bot = createBot({skill:1}); const cmd = bot.decide(g); // -> {hop} ; bot.reset()
// grid hop module (src/lib/grid-hop.js, generic, a FACTORY CANDIDATE) exports: makeHop(cfg) / startHop(p, dir, cfg) / stepHop(p, dt, cfg) -> 'landed'|null / hopTarget(p, dir)
// render
import { createRenderer } from './render/renderer.js'; const r = createRenderer(ctx, {sprites, settings}); r.draw(g, alpha) /*alpha 0..1 for hop interpolation*/; r.attach(bus) // particles/shake
// registry
import { buildArt } from './art/registry.js'; const sprites = buildArt(); sprites.get('car') -> {frames:[PixBuf|canvas], w, h}; sprites.has(name)
// audio
import { createAudio } from './audio/audio.js'; const audio = createAudio(bus, settings); audio.unlock(); audio.music('play_day'); audio.setSettings(s)
// sfx.js exports SFX_RECIPES, describeSfx, renderSfx (PCM), stats; music.js exports SONGS, renderSong, MUSIC_FOR (state->track)
```
Missing sprites: the renderer MUST fall back to coloured rectangles. Missing art modules: `buildArt` skips what does not exist.

## 6. Level generation and fairness (lane-gen)
`levelDef` is deterministic in `(level, seed)`. Level 1 is gentle: sparse cars, wide logs. Ramp: more and faster vehicles, shorter platforms, more turtles that dive, crocs from level 3, rollers and limo from level 4, Pete patrol from level 3, throwing from level 6; theme cycles day/dusk/night. Row 8 and row 12 never both fastest. Alternate lane directions. The validator `node tools/validate-level.mjs [--levels 1..30] [--seeds 20]` derives from TUNING (hopTime, speeds, margins), never magic numbers, and proves: (a) every road lane has a gap crossable by waiting then one hop; (b) for each adjacent river pair there is a time window where a platform in the next lane overlaps in x with a platform in this lane enough to hop (reach geometry: a vertical hop keeps x, a sideways hop shifts 16 px); (c) a river lane never has all turtles under at once; (d) a full route exists from start to a bay (BFS over (row, time, x-slot) using the same closed forms). Also a "different seed gives different output" test and determinism test.

## 7. Render
Order: backdrop (sky tint band per theme, canopy, ticker), bay row (`bay_*` sprites, wall tiles between bays, filled bays show `colby_home`, bonuses), river (animated `tile_water`, shore edge at row 2/7), lane items sorted by lane, median, road (tiles + dashed lines), start strip, Colby (interpolated during hop, riding items shown via the sim position), extras and Pete, particles, popups, HUD (ui-shell), night: dark overlay with headlight `glow_head` additive near vehicles, dusk: warm tint; CRT pass optional via `settings.crt`. Integer-scaled, pixelated. All animation is a pure function of `g.t` (no hidden state) so screenshots are deterministic.

## 8. Audio
One synthesis description drives live WebAudio and offline PCM. SFX recipes are pure data (kit pattern in `src/kits/audio-kit`, `../pawfall/src/audio/sfx.js`). Songs: tracker songs (`audio-kit`), bpm 120-150, loops seamless. Names are those in `defs.SFX` / `defs.MUSIC`. No audio device here: validate by numbers (peak <= 1, no NaN, durations) and say so in the report.

## 9. UI shell
Query params: `autostart`, `level`, `seed`, `bot` (autopilot plays), `time` (fix time-of-day t01), `nosound`, `poll`, `screen=title|play|gameover`. `window.__pawgger = {game, step(n), state(), setBot(b)}` for `tools/shot.mjs`. Controls: arrows/WASD hop, Space/Enter start, P pause, M mute, touch D-pad. Title attract mode: after 8 s idle the bot plays. High scores via `src/core/settings.js`. Build: `node tools/build-web.mjs` -> single file `dist/pawgger.html`; `tools/smoke_web.sh` must pass.

## 10. Tests and tools
`npm test` = `node --test test/*.test.mjs test/kits/*.test.mjs test/lib/*.test.mjs`. Import checker `node tools/check-imports.mjs` must report 0 errors. Art: `node tools/sheet.mjs <module> --scale 6` must print OK and write `out/previews/<module>.png`; art manifest is validated against `defs.ART`.

## 11. Factory contribution rules (applies to EVERY agent)
The factory lives at `../game-factory/`. If you build a tool, module, recipe or script that other games could reuse (or you must patch a factory-provided file), you must also do this:
1. NEVER edit a live factory file. A changed copy of an existing factory file goes to `../game-factory/proposed/pawgger/<same relative path>.proposed`. A brand-new reusable file goes to `../game-factory/proposed/pawgger/new/<relative path it should have in the factory>`.
2. Append ONE entry to `../game-factory/proposed/pawgger/CHANGELOG-PAWGGER.md` (section `## Entries`, append only; use `cat >> file <<'EOF'`): `### <agent> | NEW or MODIFIES <path> | <file under proposed/>` then Why, How Pawgger used it, How to adopt, Tests (command + result). One short paragraph each.
3. Copy of the game's own useful scripts counts too. Do not duplicate what the factory already has; check `../game-factory/docs/FACTORY-TOOLS.md` first.
4. Mention it under "Factory proposals" in your report. If nothing qualifies, write "none".

## 12. Visual styles: `retro` (8-bit) and `ghibli` (painterly), switchable at runtime
The game ships BOTH. `settings.style` in `STYLES` ('retro' default), query `?style=ghibli`, key G toggles, options menu has a Style row, `window.__pawgger.setStyle(id)`. Layout, sim, audio events and all names in `defs.ART` are identical in both styles; only the pixels/colours/music colour change.
- **retro**: everything above (PixBuf, locked `PAL`, 224x256 canvas, integer-scaled, pixelated, CRT optional).
- **ghibli**: soft, hand-painted, warm, Ghibli-inspired (original look, no copying of any film's characters or scenes). Vector/painterly art drawn with Canvas 2D paths and gradients at `GHIBLI_SCALE` (4x): outlines are soft dark-plum `GPAL.ink` strokes at low alpha or omitted, shapes have rounded organic forms, gradient shading, watercolour paper grain, soft drop shadows, big fluffy clouds, swaying grass, dragonflies and falling petals, dappled light, glowing lanterns at dusk, fireflies and moon glow at night. Canvas 896x1024, `imageSmoothingEnabled = true`, no CRT pass, CSS `image-rendering: auto`.
- **Kit**: `src/kits/painter-kit/` (owner: painter-kit) gives the primitives every ghibli module uses: `makeSurface(w,h)` (OffscreenCanvas/document canvas in browser, a recording ctx shim in Node for tests), `blob/roundRect/leaf/cloud` path helpers, `lin/radial` gradient helpers with palette stops, `softShadow`, `paperGrain(ctx,w,h,seed)` (seeded), `washFill` (watercolour-ish fill with edge darkening), `brush(ctx, pts, ...)`, `sway(t)`. Seeded and deterministic; no `Math.random`.
- **Art API**: `src/art/ghibli/{characters,vehicles,river,world,fx}.js` each export `build(kit)` returning `{ [name]: {frames:[Surface], w, h} }` for every `defs.ART` name of that module, sprite pixel size = `w*GHIBLI_SCALE` x `h*GHIBLI_SCALE`; plus `src/art/registry.js` `buildArt({style})` picks the pack (render agent owns registry). Nothing outside the pack may depend on how it draws.
- **Renderer**: `createRenderer(ctx, {style})`, `r.setStyle(id)`; the ghibli path is `src/render/ghibli.js` (scene, painterly sky with drifting clouds, water with moving highlights, parallax-free but richly animated backdrop, light/dusk/night grading, particles as petals/fireflies/bubbles).
- **Audio**: `createAudio(bus, settings)` reads `settings.style`; `music.js` exports `SONGS` (retro) and `SONGS_GHIBLI` (gentle: triangle/sine "piano", "strings", flute-like lead, waltz or 6/8 feel, bpm 84-110) under the same `defs.MUSIC` names; `sfx.js` exports `SFX_RECIPES` and `SFX_RECIPES_GHIBLI` (softer: sine/triangle, bell-like, brushed noise, rounded envelopes).
- **Factory**: the painter-kit, a `ghibli-painterly` style preset and a theming guide are proposed to the factory under `../game-factory/proposed/pawgger/` (ARCHITECTURE section 11), with `factory styles` consumers in mind (look at `../game-factory/styles/` format and add the preset as a NEW file in `proposed/pawgger/new/styles/`, plus a `.proposed` of any index it must be listed in).

## 13. The story (binding creative requirement from the user)
Perring Parkway has a **Burger King on its west side** and a **Micro Center on the other side**. Colby the Cat just ate his triple whopper at the Burger King and must cross Pete's parkway to the Micro Center, to buy computers and hang out with the computer nerds. This must feature **prominently**:
- Screen mapping: the start strip (row 13) is the Burger King lot and row 15 (`bg_burger`) is the Burger King storefront with a big readable "BURGER KING" sign; row 0 (`bg_microcenter`) is the Micro Center storefront with a big readable "MICRO CENTER" sign over the five home bays (the bays are its glass doors/display alcoves). Compass note on the title/help: the parkway runs north-south, Burger King on the west side (bottom), Micro Center on the east side (top).
- Bonuses: `bay_mouse` is a computer mouse (200 pts), `bay_fish` is a graphics card (150 pts) (sprite names stay, art changes). Treasures `tr_whopper` and `tr_fries` (burger/fries) appear as optional pickups in lanes; `tr_tuna`, `tr_sardine`, `tr_gold`, `tr_collar` remain.
- Computer nerds (`nerd`, `nerd_cheer`) stand next to / in filled bays and cheer on level clear; each filled bay shows `colby_home` holding a shopping bag.
- Text: title tagline "FROM THE WHOPPER TO THE WORKSTATION"; level intro "LEVEL n: BURGER KING TO MICRO CENTER"; home popup "NEW GPU!" / "NERD APPROVED"; game over "OUT OF WHOPPERS"; Pete taunts reference traffic and the nerds ("THE NERDS CAN WAIT, FUR-BALL!", "NO WHOPPER, NO ENTRY!").
- Branding: these are the user's chosen real-world parody references. Draw ORIGINAL pixel/painted signage and building art (no copied logos or trademarked marks; a crown-less bun-and-text sign and a boxy red-and-white store sign with the words are enough). In the Ghibli style the same buildings are painted. Flag in the README that the names are affectionate parody and the project is unaffiliated.
