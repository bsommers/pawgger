# art-vehicles report

## What I built
`src/art/vehicles.js` exports `build()` -> {car, racer, bike, dozer, truck, bus, limo, roller, glow_head}, PixBuf only, PAL colours only, 1px PAL.outline (diagonal), all facing right, wheels on the bottom row. Red sedan, yellow wedge racer with spoiler/flame, rat-on-scooter bike, yellow dozer with blade and puffing exhaust, Parkway Pickles truck with big pickle, tuna-can bus with fish label, black limo with Pete (shades, gold tooth) in back (frame 1 = honk arcs), cheese-wheel roller (4 frames, 120 degree loop), glow_head (additive cone, alpha fading, emit=1, no outline).

## Verification evidence
`node --test test/art-vehicles.test.mjs`: 4 pass (manifest sizes/frames, determinism, build < 400 ms (about 8 ms), bottom row = h-1, glow translucency). Looked at out/previews/vehicles.png twice; numeric bbox bottoms all 15 (roller 14 + outline).

## Deviations from the contract
None in the art. `sheet.mjs` could not print OK (see requests).

## Mistakes I made and how I fixed them
Roller initially sat one row high; fixed by centring at y 8.5.

## Learnings for a future agent
Draw without outline, call `.outline(PAL.outline,{diagonal:true})` last; wheel content bottom at y=14.

## Requests for other modules
Defect: `tools/sheet.mjs` filters `artManifest()` with `a.module/a.name/a.frames`, but `defs.ART` rows are arrays, so every sprite is reported EXTRA and OK is never printed (for all art modules). Fix sheet.mjs to map arrays to objects (or artManifest to return objects).
Wished palette colours: a light peteFur highlight for the rat on the bike; a mid-grey for chrome. Factory proposals: none.
