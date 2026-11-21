# render-ghibli report
## What I built
`src/render/ghibli.js` exporting `createGhibliRenderer(ctx,{settings,visibleItems,bus,sprites,makeCanvas})` -> `{draw(g,alpha,dt), attach(bus), detach, setSettings, setSprites, items, clearFx, particleCount, sprites, missing}`. Gradient sky per theme with sun/moon/stars and drifting cached clouds, animated water (tiles + flowing highlights + ripples + per-item wakes), swaying grass and flowers, lanterns, bays/filled bays/bonuses, bg_microcenter (row 0) and bg_burger (row 15), items with soft shadows, Colby squash/stretch + drown/squash frames, Pete, cheese, event particles (dust, splash, stars, petals, bubbles, ripples), petals, fireflies, dragonflies, dapple/light shafts/cloud shadows, night darkness mask with headlight/lantern/Colby holes, dusk warm grade, time-warning vignette, cached vignette and paper grain, popups. Rect/ellipse fallbacks when sprites missing.
## Verification evidence
`node --test test/render-ghibli.test.mjs` 3 pass (all themes with/without sprites, determinism, bus events). Headless Chrome shots out/ghibli/{day,dusk,night}.png at `?style=ghibli&autostart=1&time=0.9|0.4|0.05&level=3`: no console errors; looked at all three.
## Deviations from the contract
Signature takes the orchestrator's option bag. Sky is mostly covered by row 0/1 sprites, so it is visible only through clouds/glows. Ambient is pure in g.t; event particles use an internal clock.
## Mistakes I made and how I fixed them
Early screenshot showed no vehicles: sprites fill asynchronously and the first frames ran before ready (not a bug, it resolves itself). Default makeCanvas initially returned a kit Surface (no getContext); now adapted.
## Learnings for a future agent
Use ?time=0.05/0.4/0.9 for night/dusk/day and `__pawgger.step(n)` to advance. `missing` is recomputed each frame.
## Requests for other modules
None. Water tile seams are faintly visible vertically (art-river tile_water at alpha .82).
Factory proposals: none.
