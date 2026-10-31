# motion-skills

A collection of reusable skills for making motion graphics with AI agents (Claude Code skills: each folder has a
`SKILL.md` an agent can follow, plus the scripts and references it needs).

**Samples:** https://jungrok5.github.io/motion-skills/. The hub has one card per skill. Each skill has a samples page
with a live demo that runs in the browser and a gallery of work made with the skill.

| Skill | What it makes | Samples |
|---|---|---|
| [`canvas-film/`](canvas-film/) | a cinematic multi-scene film drawn in HTML Canvas — a different visual style per scene, ElevenLabs music/SFX, MP4 in 16:9 and 9:16, and a live web player in many languages from the same scene files | [samples page · 21 styles · 35 kits](https://jungrok5.github.io/motion-skills/canvas-film/) |
| [`tech-motion-explainer/`](tech-motion-explainer/) | a 60–110 s technical explainer (pipeline, protocol, server loop) drawn in HTML Canvas — a live player with chapters, a written explanation and a glossary page per topic, an MP4, a 9:16 vertical cut, 3D ways of explaining (three.js), and pieces scroll-scrubbed inside another page | [samples page · 12 topics · 7 approaches](https://jungrok5.github.io/motion-skills/tech-motion-explainer/) |
| [`promo-video/`](promo-video/) | a 15–40 s promo / ad video for a business from its site or blog — style proposal and storyboard, one HTML page per video, MP4 in 16:9 and 9:16, ElevenLabs narration, SFX and music (or music composed in code) mixed to −14 LUFS, and a one-shot prompt per video | [samples page · 9 videos · 9 styles](https://jungrok5.github.io/motion-skills/promo-video/) |
| [`motion-webtoon/`](motion-webtoon/) | a vertical-scroll motion webtoon (무빙툰) drawn in HTML Canvas — a strip of panels read by a scrolling camera, Korean balloons and SFX lettering, a cast defined as data on a physically constrained rig (checked numerically and by a reviewer), a black-and-white manga print finish with one accent colour, ElevenLabs narration / music / SFX, a 9:16 MP4 and live pages that draw in the browser | [samples page · 「마지막 도넛」 3 scenes · live](https://jungrok5.github.io/motion-skills/motion-webtoon/) |

To use a skill with Claude Code, copy (or symlink) its folder into `.claude/skills/` of your project, or point the agent at
its `SKILL.md`.

## Adding a skill

Skills usually arrive from another project repo where they were proven on real work. To add or absorb one so it lands
like the others (folder layout, provenance, lessons, samples page, registry entry), follow
[CONTRIBUTING.md](CONTRIBUTING.md) (Korean). The site lives in [`docs/`](docs/): the hub is drawn from
[`docs/skills.json`](docs/skills.json) (`node tools/build-hub.mjs` prerenders it), each skill page starts from
[`docs/_template/`](docs/_template/), and GitHub Pages publishes `docs/` from `main`.
