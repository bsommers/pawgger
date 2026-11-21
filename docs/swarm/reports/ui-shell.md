# ui-shell report

## What I built
- `src/main.js`: fixed-step 1/60 loop with accumulator (cap 8 steps/frame), hop edge buffering (UI acts -> one pending hop carried until a sim step consumes it), modes title / options / help / hi / entry / gameover / play (+pause) / attract, query params (autostart, level, seed, bot, time, nosound, screen=title|play|gameover|hi|options|help, style, noattract, touch), `window.__pawgger = {game, ui, step(n), state(), setBot, setStyle, toggleStyle, act, start, hop}`.
- Style switch (settings.style persisted in its own key `pawgger.style`, `?style=`, key G, Options row, touch button): resizes canvas 224x256 <-> 896x1024, toggles body class (CSS pixelated vs smooth), calls `renderer.setStyle`, `audio.setSettings({style})`, re-triggers music. Works from title and mid-game without restarting.
- `src/ui/hud.js` (score/hi plates in row 0 sized to leave the MICRO CENTER sign visible, lives cat heads, level, time bar with low-time blink, Pete ticker text in row 15, level intro/clear banners), `menus.js`, `screens.js` (title with logo/tagline/compass, help = story, hi-score table, name entry, game over "OUT OF WHOPPERS", pause), `touch.js` (D-pad, GO, pause, style buttons, swipe/tap).
- `index.html`, `style.css` (CSS scanline/vignette overlay for retro CRT), `tools/build-web.mjs` (renamed to pawgger; see mistakes), `tools/shot.mjs` (scratch -> out/shot-tmp), `tools/smoke_web.sh`, `test/ui.test.mjs`.

## Verification evidence
- shot.mjs headless Chrome, both styles: title (retro+ghibli), play (retro+ghibli), gameover (retro), no console errors other than expected 404s of not-yet-written siblings (autopilot.js, render/ghibli.js) while they were missing.
- Keys: Enter starts, ArrowUp x2 moves Colby row 13 -> 11, g toggles style, p pauses (eval of state). Attract starts after 8 s idle (mode=attract). `step(2400)` with bot runs to level 1 play without exceptions. Name entry -> hi table works.
- `node tools/build-web.mjs` OK (296 KB, 108 KB gz); `sh tools/smoke_web.sh` -> SMOKE_WEB OK, 0 errors. `node --test test/ui.test.mjs` 7/7.
- Audio not audible here; only wired (unlock on first act, music per state, mute/volume via setSettings).

## Deviations from the contract
- `settings.js` has no `style` key (sanitizeSettings drops it), so style persists under separate localStorage key `pawgger.style`.
- CRT: contract says `crt.js` applied on the output canvas; the canvas is 224x256 (scaled by CSS) so I use a CSS overlay (`#crt`) instead; crt.js unused.
- Ghibli HUD uses a serif face and rounded plates; ghibli renderer (`src/render/ghibli.js`) was still missing when I verified, so ghibli screenshots show the retro-sprite fallback.
- `?time=` maps to theme (night/dusk/day) via g.level.theme on level_start; `?poll=` ignored.

## Mistakes I made and how I fixed them
- Score plate covered the "M" of MICRO CENTER: shortened label to "SC".
- Bundle crashed (404 `dist/bays.js`): the window-level module map in the old build was installed after hoisted ESM imports, too late for game.js top-level awaits. Rewrote the build to turn each `import(identifier)` into a switch of literal imports that esbuild bundles.
- Oldstyle Palatino numerals made the ghibli score unreadable: use DejaVu Serif first.

## Learnings for a future agent
- ESM hoists imports: never rely on globals set in a bundle entry body for modules evaluated during import.
- input.js already emits `char` acts with the letter; G toggles style via that, so name entry must swallow them.
- Title scene is live because main.js advances `g.t` itself while in title (sim does not).

## Requests for other modules
- core (settings.js): add `style` to DEFAULTS/sanitizeSettings so it persists with the rest.
- render-ghibli: export `createGhibliRenderer(ctx,{settings,visibleItems,bus,sprites,makeCanvas})`; HUD is drawn by main.js after `r.draw`, rows 0/14/15 should leave room.
- qa-bot: `src/sim/autopilot.js` `createBot().decide(g) -> {hop}`; main.js has a trivial fallback bot.

Factory proposals: none.
