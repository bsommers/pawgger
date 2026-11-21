# render report

## What I built
- `src/art/registry.js`: `buildArt({style, modules?, kit?})` returns `sprites {get, has, mirror(name,i), names, size, missing, ready}`. Retro loads `src/art/{colby,vehicles,river,world,fx}.js`, ghibli loads `src/art/ghibli/{characters,vehicles,river,world,fx}.js` (with painter-kit), all via guarded dynamic imports. It returns synchronously and fills as imports settle (`await sprites.ready`); `opts.modules` gives a fully synchronous build. PixBufs become canvases in the browser, stay PixBufs in Node. `missingSprites()` helper.
- `src/render/renderer.js`: `createRenderer(ctx,{sprites,settings,style,bus,visibleItems,font,makeCanvas})` -> `{draw(g,alpha,dt?), attach(bus), setStyle, setSettings, setSprites, items(g), fx, ready}`. Also `createPixCtx/createPixCanvas/pixToPng` (RGBA-backed Canvas2D shim for Node PNGs). Particle clock derives from `g.t` (or a fixed 60 Hz in non-running states), so replays are identical. Ghibli delegates to `src/render/ghibli.js` (guarded import, factory guessed as `createGhibliRenderer | createRenderer | default`); until it loads, or if missing, the retro path draws, scaled to fit the ctx canvas.
- `src/render/background.js`: per-theme sky bands, stars, sun/moon, clouds, bay row (bays, hazards, bonuses, filled bays with colby_home + nerds, cheering at level clear), animated water with lane-flow highlights, glints/moon path, shore edges, median/road/start, burger storefront, Pete ticker panel, night/dusk lighting with an offscreen light map (destination-out headlight cones, Colby lantern, firefly lights) plus additive `glow_head` and tail lights, candle-like fireflies in the bay row, red time-warning frame.
- `src/render/scene.js`: sprite blitting with rectangle fallbacks for every sprite, lane items (shadows, log/turtle/croc wakes, dive states from `visibleItems.frame`), Colby pose (hop arc, squash/stretch, landing squash, riding bob, shadow), Pete, cheese (`roller` sprite), popups.
- `src/render/particles.js`: fx-kit based; splash/fur/dust/sparkle/confetti/bubble/foam presets, ripples, sprite stamps (`fx_splash`, `fx_star`, `fx_puff`), screen shake and flash, bus handlers for hop, land_log, splash, squash, death, home, bay_hit, bonus, turtle_dive, croc_snap, pete_throw, extra_life, level_clear, level_start, gameover.
- `test/render.test.mjs` (13 tests).

## Verification evidence
- `node --test test/render.test.mjs`: 13 pass (shim ops, buildArt sync and async, all states x themes drawn and frame-identical across instances, empty registry gives a fully opaque frame, no level/player/bus, night < dusk < day brightness, g.t purity, hop pose, events/shake/particle decay, fx determinism, style hooks, 2x canvas, perf).
- `RENDER_PNG_DIR=out/render node --test test/render.test.mjs` writes frame-day/dusk/night/hop/fallback PNGs; I viewed day and night: real art, items, wakes, headlight cones, fireflies and the Burger King storefront all show.
- Perf: Node shim (slow CPU compositing) averages well under 40 ms/frame including the night pass; the browser uses native canvas.

## Deviations from the contract
- `buildArt()` is sync-return/async-fill (dynamic imports cannot be synchronous); `sprites.ready` is the barrier. The renderer tolerates late fill.
- `bg_ticker` (opaque) is drawn only while `g.pete.line` is non-empty; otherwise `bg_burger` shows on row 15.
- Bay hazard frames: 0 closed, 2 open (1 if `b.warn` is ever set); the sim has no warn flag.
- `tile_curb` is unused (its art is sidewalk-above/gutter-below; no row in section 1 fits), and `sign_pete` is drawn on the start strip right end when `g.level.peteMode !== 'none'`.

## Mistakes I made and how I fixed them
- First determinism test failed because the font module import resolved asynchronously (popup fell back to a rectangle on the first frame). Added `r.ready` (awaits lanes/font imports) and the tests await it.
- Ticker covered the burger storefront permanently; fixed as above.

## Learnings for a future agent
- Do not integrate hidden per-frame state; derive dt from `g.t` deltas.
- Light map via an offscreen canvas and `destination-out` is cheap and keeps pixel look; stepped ellipses avoid gradients.
- Pete x is the CENTRE (pete.js), cheese `e.x` is the LEFT edge.

## Requests for other modules
- render-ghibli: `src/render/ghibli.js` should export `createGhibliRenderer(ctx, {settings, visibleItems, bus, sprites, makeCanvas})` (or `createRenderer`/default) returning `{draw(g, alpha, dt), attach(bus), setSettings?}`; I pass `sprites: buildArt({style:'ghibli'})`.
- ui-shell: call `await r.ready` is optional; call `r.attach(bus)` once; pass `dt` as the third `draw` arg if you want particles to run during pause-free frames; draw the HUD after `r.draw`. The shell, not the renderer, applies CRT (`crt.js`) and integer scaling.
- sim-extras: optional `bays[i].warn` flag would drive hazard frame 1.
- art-world: clarify intended use of `tile_curb` and `sign_pete`.

## Factory proposals
- `pixctx-kit` (Canvas2D shim + PNG helper) staged at `../game-factory/proposed/pawgger/new/src/kits/pixctx-kit/index.js`, logged in CHANGELOG-PAWGGER.md.
