# factory-extract report

## What I built
Staged under ../game-factory/proposed/pawgger/: new/src/lib/grid-hop.js (+test), new/src/lib/grid-hop-autopilot.js (generic time-expanded A* over hop macros, +5 tests), tools_web_pkg_build-web.mjs.proposed (unified diff, 4 hunks), tools_web_shot.mjs.proposed, README.md (review/adopt), LEARNINGS-PAWGGER.md, index table (16 rows) plus 5 new entries in CHANGELOG-PAWGGER.md (existing entries untouched). Also docs/FACTORY-PROPOSALS.md and test/factory-extract.test.mjs.

## Verification evidence
test/factory-extract.test.mjs + factory-sop.test.mjs: 11 pass. Patches apply to scratch copies of live files and yield files byte-identical to Pawgger's. Factory `node --test test/`: 114 pass, 0 fail. `git status --short` in game-factory: only `?? proposed/`.

## Deviations from the contract
lane-gen and Pawgger's own autopilot not extracted (Pawgger-specific; generic planner is clean-room). tools_sheet.mjs.proposed left as written (path tools/sheet.mjs; needs -p2 from tools/web).

## Mistakes I made and how I fixed them
A stale comment in grid-hop-autopilot about the heuristic; rewritten.

## Learnings for a future agent
See LEARNINGS-PAWGGER.md. Factory tool copies live at tools/web/, not the template.

## Requests for other modules
none. Factory proposals: see the index.
