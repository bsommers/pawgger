# factory-sop report

## What I built
Staged under `../game-factory/proposed/pawgger/`: skill `new/skills/ship-showcase.md`; `new/docs/SHIP-SHOWCASE.md`; `new/templates/web-project/` with `README.template.md`, `shots.config.json`, `tools/shots.mjs` (shot x style driver, `--hero` builds the GIF), `tools/make-gif.sh` (crop, then two-pass palette ffmpeg), `.github/workflows/pages.yml`, `docs/README.md`. Wiring diffs (`*.proposed`): scaffold copy list, `guide check` rules (`no-readme-shots` error, `no-pages-workflow` error, `no-hero` warn), GUIDE.md, FACTORY-TOOLS.md, PLAYBOOK.md step 5, and a guide test patch. CHANGELOG entry added. Test: `test/factory-sop.test.mjs`.

## Verification evidence
- Factory copy in /datanapps/claude-tmp with all patches applied: `node --test test/` 115 pass, 0 fail; `factory new --web` scaffolded all files; guide check flagged the stub README and no hero, not the workflow.
- Stub game: `shots.mjs --hero` gave 6 PNGs (two styles differ) and a 40-frame GIF; crop to 320x180 confirmed with ffprobe.
- Pawgger test: 8 pass.

## Deviations from the contract
None (no game code touched).

## Mistakes I made and how I fixed them
The existing "healthy project" guide test failed after adding rules; extended its fixture and added a rules test (in the patch).

## Learnings for a future agent
`skills/INDEX.json` is generated: run `guide index` after adding a skill. Absolute `/src` paths 404 under a Pages repo subpath. A real Pages deploy was not tested.

## Requests for other modules
site-docs: use `tools/shots.mjs` and `make-gif.sh` from the staged templates (copy into tools/), fill README.template.md, verify 200s per the skill.

Factory proposals: ship-showcase (see CHANGELOG-PAWGGER.md).
