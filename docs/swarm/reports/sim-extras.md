# sim-extras report (Pete and home bays)

## What I built
- `src/sim/pete.js`: exports `TAUNTS` (12 ALL CAPS lines, each <= 28 chars, 6 about Burger King / Micro Center / nerds), `initPete(g)`, `updatePete(g, dt)`, `peteRect(g)`.
  - `none` -> mode `hidden`. `taunt` -> mode `taunt`, emits `pete_taunt` every 4-6 s (seeded), no-repeat. `patrol` -> mode `patrol` walks row 7 at `peteSpeed * speedMul`, pauses 0.6 s at each edge, lethal via `peteRect`. `patrol_throw` -> patrol plus a cheese wheel every `cheeseEvery` s onto a random road row (`g.extra`, `kind:'cheese'`, ttl 10 s, moves at `cheeseSpeed`, culled off screen), emits `pete_throw`.
- `src/sim/bays.js`: exports `initBays(g)`, `updateBays(g, dt)`, `bayForHop(g, x)`, `BONUS_SHOW` (6 s).
  - Croc/snake bays open for 2 of every 6 s (`TUNING.bayHazardCycle`), phases staggered by bay index. Plain bays never open.
  - Bays with a bonus show mouse/fish for 6 s on a seeded schedule (first at 2-5 s, then every 9-14 s), only while empty. Filling clears it.
- `test/sim-extras.test.mjs`: 16 node:test cases on a fake `g` (no game.js). All pass. Full `node --test test/*.test.mjs` also passes (52/52 at time of run).

## Verification evidence
- `node --test test/sim-extras.test.mjs` -> 16 pass, 0 fail.
- Mutation check 1: `PAUSE_AT_EDGE = 0` in pete.js -> 1 test fails (pause holds x still). Restored.
- Mutation check 2: bay open window doubled -> 1 test fails (open fraction). Restored. Both restored and re-verified green.
- Integration smoke (game.js step loop, level 6 overrides): bays open 480/1200 steps (40% = 2/5 expected), Pete patrols, 2 cheese wheels alive at peak, bonus appears in bay 0 and expires.

## Deviations from the contract
- Pete's `g.pete.x` is the centre x (as Colby). `peteRect` returns the LEFT edge, matching game.js's AABB overlap.
- `patrol_throw` uses `g.pete.mode === 'patrol'` (with a `throws` flag), because game.js only treats mode `patrol` as lethal.
- Taunt lines also show in patrol mode (flavour), not only in taunt mode.
- Extra fields added on bays (`_phase`, `_nextBonus`) and on pete (`lineCd`, `pauseT`, `throwT`, ...). Underscore-prefixed or additive, the renderer can ignore them.

## Mistakes I made and how I fixed them
- Smoke test first looked broken (bays never opened, no events). Cause: my test script set bays by hand without calling `initBays`, and the stub levelDef in game.js gives no hazards. Fixed the script, not the modules.

## Learnings for a future agent
- game.js does not expose its emitter on `g` (no `g.bus`, no `g.emit`), so `pete_taunt`, `pete_throw` and nothing else from my modules reaches the bus. See Requests.
- Bays need `initBays(g)` before the first `updateBays`. A hand-built `g.bays` without `_phase` never opens (NaN).

## Requests for other modules
- **sim-core (game.js), required**: expose the emitter on the game object, e.g. `g.emit = emit` in createGame, or `g.bus = bus`. pete.js uses `g.emit` if present, else `g.bus.emit`, and silently drops events otherwise.
- **lane-gen (levels.js/lanes.js)**: `levelDef` must set `peteMode` (`none|taunt|patrol|patrol_throw`), `cheeseEvery`, `speedMul`, and `bays[i].{hazard, bonus}`. The stub in game.js currently gives `none` and no hazards.

## Factory proposals
- None.
