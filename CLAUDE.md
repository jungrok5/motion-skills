# motion-skills

A collection of Claude Code skills for making motion graphics. Each top-level folder with a `SKILL.md` is one skill
(`canvas-film/`, `tech-motion-explainer/`, `promo-video/`, `motion-webtoon/`, `specimen-tour/`, `cinematic-3d/`, `machine-sim/`, `pixel-diorama/`, `paper-road/`, `pop-up-textbook/`, `knit-diorama/`, `painted-anime-short/`, `ink-summoning/`, `holo-pass/`, `crayon-statechart/`, `cartoon-3d-short/`, `sketchnote-explainer/`, `aesthetics-film/`, `sketch-cartoon-short/`, `sight-gag-short/`, `live-character/`, `parallax-facade/`, `perspective-illusion/`, `hands-on-lab/`, `map-dive/`, `cursor-swarm/`, `swarm-world/`, `doodle-styles/`, `cinecode/`, `paper-cutout-short/`, `heritage-blueprint/`, `point-cloud-morph/`, `landmark-map-3d/`, `ultimate-move-short/`, `luminous-score/`, `photoreal-film/`, `aphorism-film/`, `pencil-dream-short/`, `kinetic-type-collage/`, `oil-paint-world/`, `ink-word-world/`, `lineage-glow/`, `dragon-realm/`, `speedpaint-replay/`, `shred-poster/`, `colored-pencil-world/`, `cloth-rig-character/`, `ink-water-emergence/`, `ballpoint-doodle-short/`, `feeling-pastel/`, `living-realm/`, `scanned-realm/`, `agent-launch-film/`, `storybook-portrait/`, `storybook-short/`, `torn-page-journey/`, `pencil-live-action/`, `walking-colossus/`, `sprite-stack-short/`, `shadow-critter-vignette/`, `street-run-montage/`, `logo-construction/`, `sprite-stack-flight/`, `painted-cloak-hero/`, `machine-build-reel/`, and the fifteen live-page skills `hypertext-hotel/`, `time-machine-page/`, `lit-room/`, `wet-ink-page/`, `jelly-page/`, `sheet-city/`, `event-horizon-page/`, `shatter-page/`, `app-cube/`, `liquid-glass-page/`, `paper-desk/`, `knitted-page/`, `exploded-view-map/`, `swarm-page/`, `droste-page/`); `docs/` is the samples site on GitHub Pages (pushes to `main` deploy it);
`tools/` holds repo tooling, not skills; `references/` holds notes shared by all skills.

- A piece that needs a ready-made 3D model (a skill using three.js, when its style allows outside models): read
  `references/3D-MODELS.md` first — free Polyfork models, commercial use OK, but never commit their `.mjs` source,
  and committed GLBs need their CC BY credit line. Skills that say code-only (`machine-sim`, `swarm-world`,
  `aesthetics-film`, `photoreal-film`, `ink-word-world`, `dragon-realm`, `living-realm`, `torn-page-journey`, `walking-colossus`, `logo-construction`, `sprite-stack-flight`, and every live-page skill) stay code-only.
- `pencil-live-action` builds its real world from Poly Haven CC0 scans the same way: listed per film in `assets.json`, fetched
  with `scripts/fetch-assets.mjs` into a git-ignored `assets/`; commit only `assets.json` and `manifest.cdn.json` (URLs). Its site
  demos read the scans from Poly Haven's server (`window.PLA_CDN` / `?cdn=1`); never put scans in `docs/`.
- Live-page skills (`hic: true` in `SKILL.md`) build a working web page whose real DOM is drawn by WebGL through
  HTML-in-Canvas. They share one runtime: `tools/hic/hic.js`, `tools/hic/hic-test.mjs` and `references/HTML-IN-CANVAS.md`
  are the masters, and each skill carries copies (`lib/hic.js`, `scripts/hic-test.mjs`, `references/HIC.md`). Edit only the
  masters, then run `node tools/sync-hic.mjs`. `--check` must pass before a PR. Read `references/HTML-IN-CANVAS.md` before
  touching one: the page stays real (selectable, typeable, findable) and what you see is what you click.
- `scanned-realm` draws its surfaces, objects, ground plants and tree leaves from Poly Haven CC0 scans, listed per realm in
  `assets.json` and fetched with `scripts/fetch-assets.mjs`. Never commit a realm's `assets/` and never put scans in
  `docs/`; its site demos are built with `build.mjs --cdn` (the page reads the scans from Poly Haven's server and shows the credit).
- A skill (or piece) whose bodies move — people, animals, creatures: read `references/MOTION-QUALITY.md` and take the
  "AI slop" look out — weight sets timing, inertia / follow-through, anticipation before and recovery after big moves,
  every idle breathes, planted feet never slide (turns are stepped). Motion comes from a video-model reference →
  key poses → rig numbers + interpolation, not from limbs tweened separately in code. A new skill ships those as
  brief fields, Rules, a motion row on the cast sheet and `check` failures.
- Generated video / image / voice is a reference, never a committed asset: keep it out of the repo (scratch or a
  git-ignored `ref/`), never in `docs/`. **ElevenLabs (any tool: speech, sound, music, image, video, voice design,
  agents) only after the owner says yes for that request** — say what, which model, how many takes, rough cost, then
  wait; no answer means no call. Code-only skills take no generated motion at all.
- Adding a skill, or absorbing one from another project repo: follow `CONTRIBUTING.md` step by step (a skill takes a topic and designs a new piece in its style — not a
  re-render of its example or a fill-in template; folder layout,
  provenance in `SKILL.md` + `docs/skills.json`, `references/LESSONS.md`, verify from a clean copy, samples page from `docs/_template/`;
  a skill with characters checks every body for impossible bends and front / back / left / right — a cast sheet turned both ways plus a
  joint-limit check).
  Every link the user gave to make the skill from (repo, X / Threads post, video, article, site) is its source, so users
  can see what it was made from: list it in `docs/skills.json` `sources` (shown on the hub card), end the `SKILL.md`
  `description` with it, and put it in the README and the samples page — `node tools/build-hub.mjs --check` fails if one is missing.
  Leave the source repo untouched unless asked.
- The hub (`docs/index.html`) is registry-driven: edit `docs/skills.json`, then run `node tools/build-hub.mjs`
  (`--check` to verify). Never hand-edit the block between `<!-- skills:start -->` and `<!-- skills:end -->`, and never
  put a skill's samples on the hub — they go on `docs/<skill>/index.html`.
- Never put MP4s (or other large media) in `docs/`. Thumbnails are 640 px JPEGs; posters ~1200×675, ≤ 200 KB.
- Shared look lives in `docs/assets/site.css` / `site.js`; skill pages keep the template's sections and classes.
- Before finishing any site change, serve `docs/` (`python3 -m http.server`) and check the hub and touched pages at
  1280 px and 390 px, dark and light: no horizontal scroll, no console errors or 404s, demos load.
- Work on a branch and **always finish with a PR to `main`** — every change, a new skill included. Never push to
  `main`, never merge a PR (or enable auto-merge), never merge a branch into `main` locally: the owner reviews and
  merges. Bring `main` into your branch, not the other way round. Only an explicit "merge it" from the owner for that
  PR changes this.
