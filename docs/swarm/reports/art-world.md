# art-world report

## What I built
`src/art/world.js` (export `build`, default): all 19 manifest names of module `world`: seamless `tile_road`, `tile_road_dash`, `tile_curb`, 2-frame `tile_median` (swaying fronds, blinking flowers) and `tile_start` (Burger King lot with stall lines, ketchup, fry, puddle glint); `bay_empty` (Micro Center glass-door alcove with pond and lily pad), `bay_wall` (store wall with monitors), `bay_croc` and `bay_snake` (3 frames: lurk, rise, snap/strike), `bay_mouse` (computer mouse, wheel glow) and `bay_fish` (graphics card, spinning fans); `bg_canopy`, `bg_ticker`, `sign_pete`; story: `bg_microcenter` (red-and-white boxy sign, striped awning, monitor windows), `bg_burger` (orange sign with bun icons, no logo or crown), `bk_pole`, `nerd` (glasses, hoodie, laptop, soldering iron) and `nerd_cheer`. Signs use bold outlined 5x7 glyphs from `src/ui/font.js` (`glyphRows`).
Test: `test/art-world.test.mjs`.

## Verification evidence
`node tools/sheet.mjs world --scale 6` prints OK (build about 14 ms); `node --test test/art-world.test.mjs` 7/7 pass (manifest, determinism, build under 400 ms, opacity, seam metric, palette ratio, clipping and feet row, sign legibility). Viewed nerds, bays, tiles and strips as images and fixed glasses, cheer arms and burger windows (they resembled arches, removed).

## Deviations from the contract
None. Backdrop strips `bg_canopy` has a transparent ragged lower edge; the others are opaque. `bg_ticker`/`bg_burger` share row 15 and `bg_canopy`/`bg_microcenter` share row 0: the renderer must choose which to draw.

## Mistakes I made and how I fixed them
Nerd glasses were black blobs and cheer arms were hidden behind the head; redrew as lens windows plus bars and moved arms outward. Burger windows with booth shapes read as golden arches, replaced by mullioned windows.

## Learnings for a future agent
`artManifest()` has no `kind`/`desc`, so the sheet tool's tile-alpha check is inactive; the test covers opacity. Drawing a pixel as a function of (x mod 16, y) gives seamless tiles.

## Requests for other modules
Renderer: draw the nerds standing in/next to filled bays; `bay_mouse`/`bay_fish` are transparent and go over `bay_empty`. Wished-for palette colours: a mid grey-blue for the Micro Center wall and a cream skin tone. Factory proposals: none.
