# sim-core report

## What I built
- `src/lib/grid-hop.js`: generic hop (makeHop/hopTarget/startHop/stepHop/queueHop/takeQueued, `limit` callback). Factory candidate.
- `src/sim/player.js`: createPlayer/resetPlayer/setMode (mode and frame anim set together)/animatePlayer.
- `src/sim/game.js`: `createGame` per section 4/5: state machine, hop buffering, river support/carry/edge/croc/turtle, road squash, Pete/cheese kill, bays, scoring, extra life, timer/tick_low, death/respawn/gameover, levelclear. Emits all sim events (hop, row_forward, land_log, splash, squash, death, home, bay_hit, bonus, turtle_dive, croc_snap, honk, tick_low, extra_life, level_clear, level_start, gameover, state). Extras: `g.hash()`, `g.newGame()`, `g.popups`, `opts.levelDef` / `opts.lanes` injection seams.
- pete.js / bays.js / lanes.js are imported with guarded top-level dynamic imports and local fallbacks.

## Verification evidence
`node --test test/sim-core.test.mjs test/lib/` all green (hop buffering, wall, drown, carry, edge, turtle, croc, squash, cheese, bay, bonus, 5 bays, timer, lives, extra life, determinism, scripted crossing). Mutation: flipped carry sign in game.js -> 2 tests red; restored -> green.

## Deviations from the contract
- `player.riding.lane` is the row number. Death `livesLeft` = lives-1, but `g.lives` decrements at the end of the 1.2 s dying state. `home` is a player mode inside state `play` (no extra state). Row-1 landing awards no `row_forward`. Title `start` begins a new game; gameover `start` returns to title.
- Bonus is collected only if `bays[i].bonus && bonusT > 0`.

## Mistakes I made and how I fixed them
- Assumed croc opens at cycle start; real lanes.js opens it at the end (`period-open`). Fixed fallback and tests.
- First draft of tests wrote a lowercase tool name; trivial.

## Learnings for a future agent
- Use `opts.levelDef` to inject fake levels; tests pin the player with `put()` instead of hopping.
- Not yet verified against real pete.js/bays.js/levels.js (absent at finish time): default level then has 0 lanes.

## Requests for other modules
- sim-extras: `bayForHop` must return `why:'filled'|'wall'|'hazard'`; game treats `ok:false` as death. bonusT>0 means collectable bonus.
- lane-gen: `levelDef` currently has no levels.js; export from lanes.js or levels.js (game imports `../levels/lanes.js`).

Factory proposals: none.
