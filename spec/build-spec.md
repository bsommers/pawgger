# Pawgger: build specification

A Frogger parody starring Colby the orange cat. This file is the brief for the build session. It condenses everything the user asked for while building **PawFall** (the Pitfall! parody) and reuses the same working method, now backed by a much richer game-factory. The user's original PawFall prompt is kept verbatim in Appendix A, and every later directive is condensed in section 2.

> Note on the path: the request named both `../pawger` and `../pawgger`. This spec is saved at the explicitly given path, `../pawgger/spec/build-spec.md`, and the game is called **Pawgger**. The request also called the game "Frogger" in one place. This spec treats Frogger as the game being parodied and Pawgger as the title.

---

## 1. The game

**Title:** Pawgger. **Parodies:** Frogger (Konami/Sega, 1981).
**Hero:** Colby the orange cat, a jungle explorer in pith helmet and red scarf. He already exists as sprites in the shared library (see §6).
**Villain:** Perring Parkway Pete, a sunglasses-and-pinstripes rat tycoon. This time the road is **Perring Parkway**, which is Pete's own road, so the traffic is his.
**Shared universe:** the same theme and characters as KÄSEKRIEG (`../callofcheeseduty-ratops/`), `../catxzzon/`, `../duum/desktop/` and `../pawfall/`. Read those for tone before inventing anything.
**Look and feel:** blocky retro graphics, code-drawn pixel art, synthesized audio, a locked palette. It is a 2D, fixed-screen arcade game viewed top-down. PawFall is the reference for how the pieces fit together, and a 3D game follows after this one.
**Creative brief (quoted from the user):** "get creative and wow me."

### Core Frogger mechanics to deliver
- Fixed screen, grid hops: one tap moves Colby one cell up, down, left or right. No free running.
- Bottom to top. Start strip, a road of traffic lanes, a median safe strip, a river of logs and turtles, and a row of five home bays (the "lily pads") at the top.
- Road: lanes of vehicles at different speeds and directions. Touching a vehicle costs a life.
- River: Colby must ride logs, turtles and crocodile backs. Landing in open water drowns him. Being carried off the screen edge kills him. Turtles dive on a cycle.
- Home bays: reaching an empty bay scores. Fill all five to clear the level. Some bays hold a hazard (a croc head, a snake) or a bonus (a fly, here a mouse or a fish).
- Timer per attempt, 3 lives, a score for each forward row, each bay, each bonus and the remaining time, and an extra life at a score threshold.
- Escalation: every level is faster and denser, with new hazards. Perring Parkway Pete shows up as a boss-NPC that taunts and throws or drives his own hazard.

### Creative ideas to wow (pick and refine; the user asked for creativity)
- Pete's Parkway Pickles delivery trucks, cheese-wheel rollers, tuna-can buses, a limo with Pete in the back that honks.
- Jungle river variants: logs, turtles, hippos, croc-over-log combos, a vine that swings Colby across a gap.
- A day-to-dusk-to-night cycle across the levels, with sky and lighting changes as in PawFall's `skyFor`.
- Treasures (tuna, sardine, gold, collar) as optional pickups in the lanes, reusing PawFall's art and scores.
- A parallax-free but richly animated backdrop: skyline, jungle canopy, drifting clouds, headlight glow at night.
- A title attract mode played by the autopilot bot, high-score table, pause and options.

---

## 2. Everything the user asked for (condensed from all prompts)

### Product and theme
1. Build a parody of a classic arcade game using the same theme and characters as the user's other Colby games.
2. Blocky, very retro look similar to the original game. Get creative and wow the user.
3. A 3D game will follow, so keep the engine and assets reusable.

### Method
4. **Use `../game-factory/`.** Whenever you build a tool that is useful and reusable by other sessions, save it in the game factory and update the factory. Keep a log and a toolbox of everything useful: graphics, sound, solving, debugging, testing, media, creative design, anything.
5. **Work in multiple parallel sub-agents, choosing the best model for the job** (Haiku, Sonnet, Opus). Follow the user's standing rules in their CLAUDE.md: always pass an explicit `model`; Haiku for mechanical work, Sonnet for multi-file integration, debugging and review, Opus only for complex architecture or high-risk security audits; planning, research and mapping agents must be Sonnet or Haiku; subagents keep their output short.
6. **Open a web tracker** with a Gantt-style chart showing the media that is being created, the agents that are active, the phase of the plan, and everything else, as for the other games. It belongs in the game factory (`swarm/dashboard`, copied into each game as `tools/swarm-tracker`). Pick a free port, since 4780 and 4795 are taken by other games, and 4841 was PawFall's. Say what you chose and verify it loads.
7. **Git and publishing:** initialise git, push to a **public** GitHub repo, and set up GitHub Pages when done. Pawgger lives at `github.com/bsommers/pawgger`, with Pages from a workflow (site at `/`, playable game at `/play/`).

### What the factory is now expected to provide (the user added these while PawFall was building)
8. A reusable **physics engine, hazard creator, world generator and level generator**.
9. Reusable **artwork, character, soundtrack/songs, special-effects and game-documentation** components.
10. A way to manage **game library assets reusable across titles**, stored in GitHub repos as directed by a human, an AI agent or another driving surface, with a **registry made from multiple asset libraries**. Descriptors must make a library easy for a person, an agent or software to consume and understand.
11. **Built-in guidance, like a skill router for AI coding agents**: an assistive layer that says how to make best use of the factory and its capabilities, including the asset libraries.
12. **Game style presets and theming guidance**, so tooling can be chosen for 8-bit retro, side scrollers, 2.5D, 3D, ray traced, cartoon and the like.
13. The factory must be drivable by **AI coding agents, API calls, MCP servers and old-school humans**, as one piece of an autonomous software factory.

### Operating instructions
14. Keep going as agents finish. Launch queued agents when slots free up, under a concurrency cap.
15. Commit and push game-factory updates to GitHub when they are ready.
16. Temp and build output go under `/datanapps/claude-tmp`, never `/tmp`.
17. Commit trailer: `Co-Authored-By: Claude Sonnet 5.5 <noreply@anthropic.com>`.
18. Before committing, re-run the tests yourself. Agent claims are not evidence.

### Factory contribution policy (added by the user for this build)
19. **Grow the factory as you go.** Any agent that builds a tool, module or generator that other games could reuse must evaluate it for the factory and, if it qualifies, stage it there. Reusable candidates include `grid-hop`, lane generation and fairness validation, vehicle/log/turtle art recipes, new SFX recipes and songs, tracker improvements, QA bots, and scripts.
20. **Never edit existing factory files in place.** Changes to an existing factory piece are written as a **parallel file** under `../game-factory/proposed/pawgger/`, mirroring the original path with a `.proposed` suffix (for example `proposed/pawgger/swarm/dashboard/server.mjs.proposed`). New, non-conflicting additions (new files that replace nothing) go under `../game-factory/proposed/pawgger/new/<path>` as well, so the user can review everything in one place. No PRs at this point.
21. **One big change log:** `../game-factory/proposed/pawgger/CHANGELOG-PAWGGER.md`. Every agent appends an entry (id, file, NEW or MODIFIES `<original path>`, why, how it was used in Pawgger, how to adopt it, test status). The orchestrator keeps an index table at the top. Agents append with small atomic edits and never rewrite others' entries.
22. **Scripts used by this session live in the log too:** any script the session used that came from the factory and was patched locally in Pawgger must have its patched copy recorded in `proposed/pawgger/` and listed in the change log with a diff summary.
23. The orchestrator does a final pass: runs the factory tests unmodified (proposed files must not break them), verifies the log is complete against `git status` in the factory, and reports it. Nothing under `proposed/` is applied to the live factory without the user's review.

---

## 3. What now exists (use it, do not rebuild it)

Everything below is in `../game-factory/` (GitHub `bsommers/game-factory`, `main`). Start with `AGENTS.md`, `docs/SURFACES.md` and `docs/GUIDE.md`.

| Need | Where | How |
|---|---|---|
| One entry point | `bin/factory` (CLI, `--json` everywhere), also HTTP (`factory serve`) and MCP (`factory mcp`) | `factory capabilities --json` lists all 36 capabilities |
| Scaffold a zero-dep web game | `factory new <dir> <Title> --web` | copies the template, the libs and the kits |
| Platformer/arcade physics, hazards, world generation, fairness validator, autopilot | template `src/lib/` (`platformer-physics`, `hazard-kit`, `world-gen`, `autopilot-kit`) | extracted from PawFall; read `src/lib/README.md` |
| Art, character, audio, FX, docs kits | template `src/kits/` | `docs/KITS.md` |
| Style presets and themes | `styles/` (11 presets, 3 themes) | `factory styles recommend --idea "..."`, `factory styles apply --project . --style <id> --theme jungle` |
| Asset libraries and registry | `factory-core/library`, `docs/LIBRARIES.md` | `factory library ...`, `factory registry ...` |
| Skill router | `skills/`, `factory guide route/plan/check/explain` | `docs/GUIDE.md` |
| Swarm tracker and scheduling | `swarm/` (dashboard, `swarm-plan`, `swarm-next`, `track`) | `factory swarm plan/next/status`, `docs/SWARM` in PawFall is the worked example |
| Lessons from the PawFall build | `docs/LEARNINGS-PAWFALL.md`, `LEARNINGS.md` | read before writing the contract |

**Style choice.** `factory styles recommend` ranked `retro-8bit-sidescroller` first for a Frogger idea (the text mentioned 8-bit), with `top-down-arcade` second. Pawgger is a fixed-screen top-down arcade game with an 8-bit look, so use the `top-down-arcade` camera and grid movement with the 8-bit palette and CRT conventions from `retro-8bit-sidescroller`. Apply the `jungle` theme, then record any departure from the preset in `config/style.json`.

**Do not use the platformer physics module for hop movement as-is.** Frogger movement is grid-based and carry-based (logs move the frog). Extend `hazard-kit` for lane patterns (rollers, cyclers) and add a small `grid-hop` module. If it generalises, upstream it to the factory when done.

---

## 4. Shared assets: `bsommers/pawfall-assets`

A published, public, CC0 library of 100 assets from PawFall (17 characters, 28 sprites, 9 tilesets, 12 FX, 28 sound effects, 6 songs), tagged `style:retro-8bit-sidescroller`. Colby's sprites, treasures, FX, the logo and the sound effects are directly reusable.

```
factory registry add --source bsommers/pawfall-assets@main
factory registry refresh
factory registry search --query colby
factory library install --project . --registryId pawfall-assets --assets <ids>
```

Installing writes `assets.lock.json` with hashes. Prefer installing Colby and Pete from the library over redrawing them. Anything new and reusable that Pawgger makes (vehicles, logs, turtles, lane tiles, new songs) should be added to a library afterwards (`factory library add`) and published. Pawgger may well get its own `pawgger-assets`, or add to `pawfall-assets`. Ask the user before publishing anything.

---

## 5. Method: the swarm (same as PawFall)

Read `../pawfall/docs/swarm/SWARM.md` first. It is the template manifest, with 14 numbered rules, role appendices (`art`, `sim`, `audio`, `tools`) and one section per agent.

### Steps
1. **Contract first, by the orchestrator (not delegated).** Write `ARCHITECTURE.md` and `src/core/defs.js` before any agent starts: canvas size and layout, palette, game constants (grid size, lane count, speeds, timer, lives, scoring), entity kinds, events, SFX and music names, the art manifest (every sprite name, size and frame count), the sim API, the world/level API, and every cross-module hook with name, arguments, return shape and an example call. Run `tools/check-imports.mjs` after every edit to it.
2. **Manifest** at `docs/swarm/SWARM.md` with each agent's model, phase, owned files and task. Disjoint file ownership between agents. Generate prompts and `plan.json` with `factory swarm plan` (or `swarm-plan.mjs`).
3. **Launch under a concurrency cap of 5**, with `swarm-next`. Spawn each agent with: "Read `<repo>/docs/swarm/prompts/<id>.md` and execute it exactly," with an explicit model.
4. **Wave plan (proposed):**
   - p1: sim-core (grid hop, lanes, carry, collisions, lives, timer, score), lane-gen and level generator (with a fairness validator), art-vehicles, art-river (logs, turtles, croc, water tiles), render.
   - p2: art-world (backdrop, lane tiles, home bays), art-fx, audio-sfx, audio-music, ui-shell, tracker-media (only if the factory dashboard needs a change).
   - p3: qa-bot (an autopilot that clears levels), hazards (Pete as boss-NPC).
   - p4: site and docs, factory-extract (anything reusable, e.g. `grid-hop` and lane generation).
5. **Models.** Haiku for mechanical sound-effect recipes and the site. Sonnet for sim, generators, art, render, UI and QA. Opus only if a genuinely hard design question appears. Never opus for planning or research.
6. **Checkpoints.** Keep `docs/CHECKPOINT.md` up to date after every completion. Each agent writes `docs/swarm/reports/<id>.md` and a progress file.
7. **Orchestrator verification after each agent.** Re-run the tests, the import checker, and the art sheet tool for each art module. Look at the screenshots yourself. Check each hand-off request between agents. For PawFall, one such request (`updatePete` and `HAZARDS[kind].init` being called by sim-core) had to be verified in the code.
8. **Integration:** build with `tools/build-web.mjs`, smoke-test the single-file build with `tools/smoke_web.sh`, take screenshots with `tools/shot.mjs`, and make gameplay GIFs with the screenshot frames plus `ffmpeg`. Crop to the game area before scaling.
9. **Publish:** commit, create the public repo, push, enable Pages in workflow mode, and wait for the run. Replace placeholder repo links in the site and README. Check that `/` and `/play/` return 200.
10. **Factory upkeep (revised):** do not push to or modify the live factory. Stage `LEARNINGS-PAWGGER.md`, reusable modules and patched scripts under `../game-factory/proposed/pawgger/` per §2 items 19-23, finish the change log, and re-run the factory tests to prove nothing broke.

### Proposed port for the tracker
**Chosen: 4850** (verified free). Put it in `README.md`, `docs/CHECKPOINT.md`, `docs/SWARM.md` and `package.json`. Do not reuse 4780, 4795 or 4841.

---

## 6. Lessons from PawFall to apply on day one

(Full list: `../game-factory/docs/LEARNINGS-PAWFALL.md`.)

- A `*/` inside a `/** */` comment ends it early. It broke `defs.js` for the whole swarm. Use `//` for inline notes in doc blocks.
- Put every cross-module hook in the contract, with an example call. The UI agent had to guess the autopilot entry point.
- Set derived presentation fields (`pose`, `frame`) in the same function that changes mode, not on the next tick.
- Poll input once per frame and carry edges until a sim step consumes them. A hop press must not be lost on a zero-step frame.
- Derive the fairness validator from the same numbers as the physics (speeds, gaps, hop timing), so retuning cannot silently break levels. Check the reach geometry before tuning.
- Stagger cycling hazards (turtle dive phases, gap phases) so they never all open together.
- A seeded generator needs a "different seed gives different output" test.
- Keep art in a 1 px margin so outlines fit; judge sprites at x6 with `sheet --only`; small, low-contrast sprites are the risk.
- Seamless scrolling lanes need the period to divide the tile width. Pawgger scrolls lanes constantly, so this matters more here than in PawFall.
- Keep SFX recipes as pure data so live and offline rendering match. Validate music bars. Dynamic import of optional modules needs try/catch so Node tests pass.
- The autopilot bot is a first-class QA tool: look-ahead over the real hazard update functions, a no-progress watchdog, and a skill knob.
- Extract reusable engines only after the game is integrated and green.
- No `Math.random` in the sim. Use a seeded RNG, a fixed 1/60 step, and keep the sim Node-safe and deterministic.
- Audio was only checked by numbers (no audio device). Say so in reports and the README, and invite the user to listen.
- A repo's `.gitignore` entry such as `*.log` can silently drop a folder named `*.log`. Check that `git ls-files` matches the library or asset index before publishing.
- Other sessions push to `game-factory`, so `git fetch` and rebase before pushing, then re-run the tests.

---

## 7. Technical baseline (copy from PawFall unless the contract says otherwise)

- Zero-dependency ES-module browser game, Canvas 2D, integer-scaled and pixelated.
- Logical resolution: choose for a vertical-lane layout (for example 224×256 or 256×224 for classic proportions). Decide this in the contract and keep it fixed.
- All art drawn in code into `PixBuf`s with a locked `PAL`. A shared palette with PawFall lets the installed Colby sprites match.
- All audio synthesized: live WebAudio, plus pure-JS offline PCM for WAV previews and tests.
- Deterministic, Node-safe sim with a fixed 1/60 step and a seeded RNG.
- Tools in `tools/`: `shot.mjs` (headless Chrome), `sheet.mjs` (art sheets validated against the manifest), `check-imports.mjs`, `serve.mjs`, `build-web.mjs`, `sfx-wav.mjs`, `music-wav.mjs`, `botplay.mjs`, `validate-level.mjs`. These come with `factory new --web`.
- Query parameters on the shell: `autostart`, `screen`/`level`, `seed`, `bot`, `time`, `nosound`, `poll`.
- Controls: arrows or WASD to hop, Space to start, P to pause, plus touch buttons for phones.
- Verification: `node --test test/*.mjs` green, the import checker with 0 errors, art sheets "OK", the bot clearing every level on a range of seeds, and a smoke-tested single-file build.

---

## 8. Definition of done

- Playable at `https://bsommers.github.io/pawgger/play/`, with a showcase site at `/` (screenshots, gameplay GIF, how to play, characters, the swarm story, tech notes).
- Public repo `bsommers/pawgger`, with README, `docs/HOW-TO-PLAY.md`, `docs/HOW-IT-WAS-MADE.md`.
- Tracker was live during the build and showed agents, phases, media totals, and the sprite, sound and music galleries.
- All tests green, bot clears every level, no console errors in headless Chrome, the single-file build smoke-tested.
- Factory proposals staged (not applied) under `../game-factory/proposed/pawgger/` with `CHANGELOG-PAWGGER.md` complete: learnings, any reusable `grid-hop` or lane module, patched scripts, new library assets or style notes. Factory tests re-run and green.
- A final report to the user: what was built, what was verified and how, what was not (for example, audio never listened to), and what is left.

---

## Appendix A. The original PawFall prompt (verbatim)

> - We're building a game called PawFall. It is a parody of Pitfall, the old Atari game  It uses the same theme as the other games in this directory, the Orange Cat like KaseKrieg and the others. @../callofcheeseduty-ratops/ @../catxzzon/ @../duum/desktop/ .
> - Colby the Orange cat is a Jungle explorer like in Pitfall by Activision
> - this is a 2.xD side scroller like Pitfall. same characters from the other colby games named before - Perring Parkway Pete is the villan,
> - get creative and wow me.
> - This version of the game is very similar to the Atari game with blocky graphics. We're gonna build another 3D game after this one.
> - Use @../game-factory/ and As before, when you're building tools that are useful and can be reused by other sessions in the future, save them in the game factory and update the game factory. We want to keep a log of and a toolbox of everything we build that's useful, whether it's creating graphics, sound, solving, debugging, testing, creating media, doing creative design, or whatever, sky's the limit.
> - As before initialize git push to a public repo and make github pages when you're done
> - work in multiple parallel sub-agents choosing the best model for the job. You can pick from Haiku, Sonnet, Opus in this session.
> - Open a web tracker with a camp chart showing the media that's getting created, the agents that are active, the phase of the plan and everything just like before with the other games. This should be part of the build tracker and probably part of the game factory I'm thinking. But let me know what you think the best location for this tooling to live. I think it's already in there. But again, if you need to update and modify, go ahead.

For Pawgger, read "PawFall / Pitfall" as "Pawgger / Frogger" and "2.xD side scroller" as "fixed-screen top-down arcade".

## Appendix B. The user's follow-up messages during the PawFall build (verbatim)

1. "keep going with wave 2 as agents finish" (said several times)
2. "I can't acces :4780 's page"
3. "Looking at the tracker, it looks like we could have a physics engine, a core physics engine, a hazard creator. and a world generator and a level generator added to the game factory's toolbox."
4. "We should probably have components for artwork, characters, soundtrack and songs, special effects and game documentation as well."
5. "When it's ready, commit and push all the game factory updates to the remote on GitHub."
6. "This game factory should be able to be driven by AI coding agents, by API calls, by MCP servers, and by old-school, old-fashioned humans. So think about that as you're updating the game factory. Make it amenable to any of those types of personas interacting with them, like the AI agent or the humans or another piece of software. We're trying to fit this all into an autonomous software factory."
7. "We should probably have some way also to manage game library assets that can be reused across multiple titles. I'm thinking that the game factory can store these in GitHub repos as directed by the human or the AI agent or other driving surface. And I guess it makes sense to have an ability to create a registry from multiple asset libraries. It needs descriptors and things that make it easy for a person or an AI agent or other piece of software to consume the asset library, know what's in it, and then make use of it."
8. "This game factory should have built-in guidance with it and all the tools, so it helps you select almost like a model router for skill, I mean a skill router for AI coding agents, but it's an assistive piece of machinery that lets you know how to make best use of the game factory and its capabilities, including the asset libraries."
9. "We probably also want to put in some game style presets or overall theming guidance to be able to select tooling for example 8-bit retro games side scrollers 2.5 D 3D ray traced games cartoon games That sort of thing"
10. "yes, do all three and publish pawfall-assets" (commit the stray files, add the style config, make gameplay GIFs, and publish the asset library)
