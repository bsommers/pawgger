# qa-bot report

## What I built
- `src/sim/autopilot.js`: `createBot({skill, seed})` -> `{decide(g), reset(), stats}`; exported `plan(g, slack, maxNodes)` for tests. A* over (row, x, tick) with macros wait(4 ticks)/up/down/left/right, mirroring game.js step order exactly (cmd, t+=DT, hop progress, landing, carry in landing step, collisions). Uses only closed-form `itemX/findSupport/crocState`, Pete patrol prediction, cheese extrapolation, bay hazard phase, throw-column avoidance. Plan is executed by absolute tick and replanned on any mismatch / new cheese / bay filled. Watchdog: 10 s without progress drops safety slack. Skill knob: lower skill = thicker margins, random hesitation, rare misclick.
- `tools/botplay.mjs --levels a..b --seeds a..b [--skill s] [--lives n] [--verbose] [--json]`: per-level clear time, deaths by cause, PASS/FAIL, exit code.
- `test/autopilot.test.mjs` (5 tests).

## Verification evidence
- `node tools/botplay.mjs --levels 1..10 --seeds 1..10` (skill 1): 100/100 cleared, avg 15-17 s per level, 0 deaths except L5 seed 1 (2 timeouts, see fairness).
- skill 0.5 and 0.2 runs clear with 0-2 deaths per level. `node --test test/autopilot.test.mjs`: 5 pass.
- Fairness sweep: independent BFS (copy of lanes.js findRoute with goal restricted to one bay), levels 1..14 x seeds 1..10 x 5 bays x 8 start offsets (out/dbg10.mjs).

## Deviations from the contract
- None in API. `createGame` default levelDef is the empty fallback; callers must pass `levelDef` (lanes.js does not export it).

## Mistakes I made and how I fixed them
- First run used the fallback empty level (bot looked stuck at row 7); passed `levelDef` explicitly.
- Greedy fallback hopped into a filled bay (bay_wall deaths); now it never enters the home row unless the planner says the bay is open.

## Learnings for a future agent
- FAIRNESS FINDING: `findRoute`/validator proves a route to ANY bay, not to EACH bay. Level 5 seed 1, bay index 4 (x=208): unreachable for level time 0..~64 s (row 2 turtles lane, dir +1, 7 diving groups never offer support near x 196-220 aligned with row 3). Out of 500 (level, seed, bay) checks for L1-14 x S1-10 it is the only one. Bot waits on the start strip and clears at ~101 s (2 timeout deaths). Suggest validator checks per-bay reachability within TIME_LIMIT*0.8 for at least one start offset.
- Planner cost: ~8k node expansions per full route (~ms); exhaustive failure capped at 150k.

## Requests for other modules
- lane-gen: per-bay reachability in validate-level (above); fix L5 S1 row 2 (lane 5 of def) so bay 4 is reachable.
- sim-core: game.js default `levelDef` fallback is empty; wire `levels.js` in so `createGame({seed})` plays the real game.

Factory proposals: none.
