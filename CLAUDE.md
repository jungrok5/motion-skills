# motion-skills

A collection of Claude Code skills for making motion graphics. Each top-level folder with a `SKILL.md` is one skill
(`canvas-film/`, `tech-motion-explainer/`, `promo-video/`); `docs/` is the samples site on GitHub Pages (pushes to `main` deploy it);
`tools/` holds repo tooling, not skills.

- Adding a skill, or absorbing one from another project repo: follow `CONTRIBUTING.md` step by step (folder layout,
  provenance in `SKILL.md` + `docs/skills.json`, `references/LESSONS.md`, verify from a clean copy, samples page from `docs/_template/`).
  Leave the source repo untouched unless asked.
- The hub (`docs/index.html`) is registry-driven: edit `docs/skills.json`, then run `node tools/build-hub.mjs`
  (`--check` to verify). Never hand-edit the block between `<!-- skills:start -->` and `<!-- skills:end -->`, and never
  put a skill's samples on the hub — they go on `docs/<skill>/index.html`.
- Never put MP4s (or other large media) in `docs/`. Thumbnails are 640 px JPEGs; posters ~1200×675, ≤ 200 KB.
- Shared look lives in `docs/assets/site.css` / `site.js`; skill pages keep the template's sections and classes.
- Before finishing any site change, serve `docs/` (`python3 -m http.server`) and check the hub and touched pages at
  1280 px and 390 px, dark and light: no horizontal scroll, no console errors or 404s, demos load.
- Work on a branch; do not push to `main` without the owner's go-ahead.
