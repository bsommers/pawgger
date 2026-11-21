# art-ghibli-chars report

## What I built
- `src/art/ghibli/characters.js` (module `colby`: Colby all facings, squash, drown, home, life, Pete walk/taunt), `vehicles.js` (car, racer, bike, dozer, truck, bus, limo, roller, glow_head), `river.js` (3 logs with moss + mushrooms, turtle up/sink/under, croc closed/open, tile_water, tile_water_edge). Each exports `build(kit)` returning `{name:{frames:[Surface],w,h}}` at w*GHIBLI_SCALE. characters.js also exports shared helpers (sprite, ell, paint, tube, poly, dot, line).
- `test/art-ghibli-chars.test.mjs` (6 tests: manifest conformance, determinism via recorded ctx calls, build < 400 ms; all pass, builds take under 10 ms in Node).
- Preview page `out/previews/ghibli-sheet.html` (?mods=characters,vehicles,river&only=..&scale=..) and `ghibli-bbox.html`.

## Verification evidence
- Looked at out/previews/ghibli-chars.png, ghibli-vehicles.png, ghibli-river.png, ghibli-final.png (headless Chrome).
- Numeric alpha bounding boxes in Chrome (alpha>200): feet/wheels on bottom rows (y 58-63 of 64), no clipping on the final pass except intentional full-width frames (squash flat, drown water, croc/log ends).
- tools/sheet.mjs only loads `src/art/<mod>.js` (retro), so it could not be used for the ghibli pack.

## Deviations from the contract
- None in names/sizes/frames. Outline is a soft ink stroke (ARCHITECTURE s12), not PAL.outline.
- Frame semantics: colby 0=crouched, 1=stretched; turtle_sink 3 frames fade under water; croc frame 1 = tail swish + blink (+ wider jaw when open).

## Mistakes I made and how I fixed them
- Stretch scale of 1.07 clipped the helmet at the top; reduced to 1.03. Dozer exhaust puff and croc legs touched the cell edge; moved inward. Mushrooms were too small to read; scaled up.

## Learnings for a future agent
- In Node the painter-kit surface is a recording shim (no pixels): pixel checks need Chrome (`tools/shot.mjs --eval`).
- Water tiles are seamless because wave frequencies are integer cycles per 16 units and blobs are drawn at +-16 offsets.

## Requests for other modules
- tools/sheet.mjs: add a `--style ghibli` mode. Renderer: sprites are drawn with soft shadows included, do not add another.
- Palette wish: GPAL has no pink (I use #f4a6b4 for ears/tails) or a mushroom-cap orange.

## Factory proposals
none
