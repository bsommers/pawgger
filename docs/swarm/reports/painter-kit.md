# painter-kit report

## What I built
`src/kits/painter-kit/{index.js,surface.js,README.md,example.html}`: makeSurface (OffscreenCanvas/DOM canvas/Node recording shim), blob, roundRect, leaf, cloud, lin, radial, softShadow, paperGrain (capped 6000 specks), washFill, brush, sway, rng, colour helpers (parseColor/rgba/mix/lighten/darken), sample sprites (drawCloud, drawGrassTuft, drawCatBlob, drawLog). Test `test/kits/painter-kit.test.mjs`. Preview `out/previews/painter-kit.png`. Factory staging under `../game-factory/proposed/pawgger/` (kit, `ghibli-painterly` preset + THEMING.md, changelog entry).

## Verification evidence
`node --test test/kits/painter-kit.test.mjs`: 6 pass. Staged kit copy: 6 pass. Headless Chrome shot viewed: soft cloud, grass tuft, round cat, mossy log all render painterly. Preset has all schema-required keys, no extras.

## Deviations from the contract
Added exports beyond section 12 (rng, colour helpers, sample sprites). Path helpers leave a path open (caller fills).

## Mistakes I made and how I fixed them
Cat mouth was drawn as a frown (fixed). A test used a canvas too small for grain density (fixed).

## Learnings for a future agent
Shim records calls, it does not rasterise. paperGrain on small areas emits few specks; raise `density`. Factory has no root package.json, so staged kit tests need a type:module parent.

## Requests for other modules
none

## Factory proposals
NEW kit + `ghibli-painterly` preset (see CHANGELOG-PAWGGER.md). STYLES.md row to add is in the entry text.
