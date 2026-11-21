# lane-gen report

## What I built
- `src/levels/lanes.js`: closed-form lane model (`itemX`, `turtleState`, `turtleCarries`, `crocState`, `crocParts`, `supports`, `isLethalHead`, `findSupport`, `itemRect`, `roadHit`, `visibleItems`, `speedMul`, `laneAtRow`, `carryV`) plus the shared fairness analysis (`minRoadGap`, `checkRoadLane`, `checkRiverCover`, `riverPairWindow`, `findRoute` BFS, `analyzeDef`).
- `src/levels/levels.js`: `levelDef(level, seed)` (re-exports the lane functions). Seeded sub-RNG per (level, seed, attempt); re-rolls the attempt until `analyzeDef` passes (in practice attempt 0 always passes). Set pieces: log train, turtle chain beside a non-diving lane, limo lane (level 4+), rest median (row 8 gets wider gaps), rollers 4+, racers 3+, crocs 3+, Pete modes per section 6, bay hazards/bonuses. `def.meta = {attempt, setPieces, valid, families, roadBase}`.
- `tools/validate-level.mjs`: `[--levels 1..30] [--seeds 20] [--timeline L[:seed]] [--quiet]`; difficulty table, ASCII timeline following the BFS route, determinism / uniqueness / ring checks. Exit 1 on failure.
- `test/levels.test.mjs`: 24 node:test cases.

## Verification evidence
- `node tools/validate-level.mjs`: "OK: 30 levels x 20 seeds, 0 failure(s)" (~19 s); difficulty column rises 11 -> 64.
- `npm test`: 178 pass, 0 fail; `check-imports`: 0 errors.
- Mutation checks (all went red, then restored): `turtleCarries` full sink instead of half; `itemX` sign flipped; `minRoadGap` weakened (first survived, so I added a test pinning it to TUNING, now red).

## Deviations from the contract
- `supports()` returns `'head'` for the croc head zone whether open or closed; the caller decides with `crocState` (helper `isLethalHead`). The open-head zone extends hitHalfW at the outer end, closed head TUNING.supportMargin.
- `visibleItems` returns `lane`/`item` as the def objects and adds `row`.
- Wrap: item lands at `-pad + one step`, so an item with w == pad shows a sub-pixel sliver for one frame (inherent to the contract formula).
- Validator BFS is conservative: croc heads never count as support; support margin shrunk by 1 px; road AABB +1 px.
- `levelDef` adds a `meta` field. hazard-kit.js not used (entity-based, not closed-form).

## Mistakes I made and how I fixed them
- First pop-in test ignored the one-step sliver; added a step tolerance.
- `minRoadGap` mutation survived because generator and checker shared it; added an invariant test against TUNING.
- Initial `findRoute` left dead path code; rewrote with parent pointers.

## Learnings for a future agent
- Full 600-level validation costs ~19 s; levelDef itself runs a 2-offset BFS (~30 ms).
- Difficulty is gentle on the road (gaps are always >= 1.06x the crossable minimum); tune `lerp(44, 4, t)` in `buildRoad` for harder late levels.

## Requests for other modules
- sim-core: use `findSupport(lane, t, px)` then `isLethalHead`; on a road row use `roadHit`. Lane for a row: `laneAtRow(def, row)`. Riding id = `item.id` (unique per lane).
- sim-extras: `def.bays[i].hazard/bonus`, `def.cheeseEvery` (s; 0 = no throwing), `def.peteMode`.
- Factory proposals: none.
