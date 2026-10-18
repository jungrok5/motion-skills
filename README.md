# motion-skills

A collection of reusable skills for making motion graphics with AI agents (Claude Code skills: each folder has a
`SKILL.md` an agent can follow, plus the scripts and references it needs).

**Samples:** https://jungrok5.github.io/motion-skills/. The hub has one card per skill. Each skill has a samples page
with a live demo that runs in the browser and a gallery of work made with the skill.

| Skill | What it makes | Samples |
|---|---|---|
| [`canvas-film/`](canvas-film/) | a cinematic multi-scene film drawn in HTML Canvas — a different visual style per scene, ElevenLabs music/SFX, MP4 in 16:9 and 9:16, and a live web player in many languages from the same scene files | [samples page · 21 styles](https://jungrok5.github.io/motion-skills/canvas-film/) |
| [`tech-motion-explainer/`](tech-motion-explainer/) | a 60–110 s technical explainer (pipeline, protocol, server loop) drawn in HTML Canvas — a live player with chapters, a written explanation and a glossary page per topic, an MP4, a 9:16 vertical cut, 3D ways of explaining (three.js), and pieces scroll-scrubbed inside another page | [samples page · 12 topics · 7 approaches](https://jungrok5.github.io/motion-skills/tech-motion-explainer/) |

To use a skill with Claude Code, copy (or symlink) its folder into `.claude/skills/` of your project, or point the agent at
its `SKILL.md`.

## Adding a skill

Skills usually arrive from another project repo where they were proven on real work. To add or absorb one so it lands
like the others (folder layout, provenance, lessons, samples page, registry entry), follow
[CONTRIBUTING.md](CONTRIBUTING.md) (Korean). The site lives in [`docs/`](docs/): the hub is drawn from
[`docs/skills.json`](docs/skills.json) (`node tools/build-hub.mjs` prerenders it), each skill page starts from
[`docs/_template/`](docs/_template/), and GitHub Pages publishes `docs/` from `main`.
