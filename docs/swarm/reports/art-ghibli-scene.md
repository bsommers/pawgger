# art-ghibli-scene report

## What I built
`src/art/ghibli/world.js` (all 19 `world` names) and `src/art/ghibli/fx.js` (all 14 `fx` names), both `build(kit)` (also default export) on painter-kit, cell units x GHIBLI_SCALE. World: soft asphalt tiles with painted dash, mossy curb, flower median path (2 frames sway), Burger King lot start strip, lily-pad glass-door bay nooks, hedge bay wall, croc and snake bays (3 frames each: dormant, warning, lethal), computer-mouse and graphics-card bonuses, foliage canopy, dark mossy ticker, PETE signboard, painted Micro Center and Burger King storefronts (original parody signs, no logos), blinking bk_pole, 4 nerd variants and a 2-frame cheering nerd. FX: hand-lettered PAWGGER logo (stroked round letters, leaf, paw prints, sparkles), lush title_scene (sun, clouds, hills, distant limo on a ridge road, river, Colby on a log, flowers), splash/puff/star/bubble particles, 6 glowing treasures (bobbing, pulsing, twinkle), paw cursor, 2-frame touch button.

## Verification evidence
`node --test test/art-ghibli-scene.test.mjs`: 4/4 pass (manifest, frame counts, surface sizes, determinism via recorded calls, build 16 ms world / 10 ms fx, every frame draws). Previews via headless Chrome: `out/previews/ghibli-world1.png`, `ghibli-fx1.png`, `ghibli-title.png`, `ghibli-strips.png`, no console errors. Numeric browser checks (`out/previews/ghibli-scene-check.html`): nerd feet on bottom row (63), nothing clipped, tile left/right edge colour difference 0-3 per channel (curb 10), tiles fully opaque after a gutter fix. `tools/sheet.mjs` is retro-only (imports src/art/<mod>.js, no kit), so it was not used for ghibli.

## Deviations from the contract
Bay hazard frame order is assumed: 0 dormant, 1 warning, 2 lethal (jaws open or snake striking). Text on signs uses canvas `fillText` (font stack Trebuchet/Verdana/sans-serif), so glyph shapes differ per machine; the Node shim only records the calls.

## Mistakes I made and how I fixed them
Nerd hair/head clipped at the top in cheer frame: lowered the base by 0.5 and shrank the jump. Stray door rectangle over the Burger King sign: removed. Paper grain on the title was blocky (size is in cell units): shrunk. Far road and limo floated in the sky: now follow the ridge curve. Curb bottom row was semi-transparent: gutter fill extended past 16.

## Learnings for a future agent
Draw every feature that may cross a tile edge via a wrap helper at dx -16/0/16 (and dy for vertical tiling). painter-kit sizes (e.g. paperGrain size) are in the sprite's drawing units, not px. A tiny page that imports the pack and screenshots with tools/shot.mjs `--wait-for "document.title==='done'"` is the fastest visual loop.

## Requests for other modules
Renderer: bay_mouse/bay_fish are transparent and go over bay_empty; bg_canopy has a transparent ragged lower edge; nerds are drawn standing on the bottom row. Wished-for palette colour: a skin tone and a mid blue-grey wall in GPAL. Shared defect: `tools/sheet.mjs` has no ghibli mode. Factory proposals: none.
