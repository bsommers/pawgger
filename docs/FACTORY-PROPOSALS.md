# Factory proposals (summary)

Everything reusable from Pawgger is staged, never live, in `../game-factory/proposed/pawgger/`. See its `README.md` (review and adopt commands), `CHANGELOG-PAWGGER.md` (index table + one entry each) and `LEARNINGS-PAWGGER.md`.

New: painter-kit, toon-kit, pixctx-kit, library-sprites, audio-kit/live-music, ship-showcase SOP, styles ghibli-painterly and toon-library, `src/lib/grid-hop.js`, `src/lib/grid-hop-autopilot.js` (generic time-expanded A* over hop macros).
Patches: `tools/web/pkg/build-web.mjs` (literal dynamic imports), `tools/web/shot.mjs` (scratch off /tmp), `tools/web/sheet.mjs` (ghibli mode), ship-showcase wiring (five patches).
Not extracted on purpose: lane-gen and per-bay reachability (Pawgger rules; world-gen covers the generic part), botplay/validate-level/sfx/music wrappers, Pawgger's own autopilot (the generic planner replaces it for reuse).
