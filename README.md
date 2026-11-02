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
| [`specimen-tour/`](specimen-tour/) | a short vertical "fly inside a specimen" film — a cut-open 3D model (three.js) of a cell, seed, battery … toured part by part with an orbiting camera that pulls back and pushes in between parts, under a sci-fi HUD, with a rotating closed-specimen opening and an x-ray half; 9:16 and 4:5 MP4 and a live page (a Canvas 2D variant included) | [samples page · plant cell 3D · live](https://jungrok5.github.io/motion-skills/specimen-tour/) |
| [`cinematic-3d/`](cinematic-3d/) | short cinematic 3D shots in the look of stylised renders — rain on a night street, snow at blue hour, a skyline in fog, golden hour in a puddle — simple shapes in three.js carried by one photographic pipeline (wet reflections, height fog and lamp halos, raymarched clouds, self-defocusing rain and snow, depth of field, AgX, grain), rendered to 9:16 MP4s and joined into a film with an ambient mix | [samples page · 「Four Weathers」 4 shots · live](https://jungrok5.github.io/motion-skills/cinematic-3d/) |
| [`machine-sim/`](machine-sim/) | an interactive 3D simulator page of a machine (a walking tank, an engine …) built in three.js code — a light engineering-sheet HUD whose readouts (gait phase, foot loads, stability, cylinder pressure, torque) come from the same model that moves the parts, view presets, and display modes (leader-line labels, solver overlay, x-ray, exploded view, isolate one part, orbit); a scripted cursor tour baked to a 1920×1080 MP4 | [samples page · walking tank · engine · live](https://jungrok5.github.io/motion-skills/machine-sim/) |
| [`pixel-diorama/`](pixel-diorama/) | an animated pixel-art diorama that loops seamlessly — a cozy scene (a floating island, a cabin, a campfire, a character) drawn in code on a 480×270 canvas with integer-only raster helpers, stepped light pools and soft glows, rain, lightning, sparks, smoke and flicker; a live page, a one-loop 1080p / 4K MP4 proven seamless, and a 10-hour video for a lofi stream (optional music) | [samples page · 「Halloween Rain」 + 「First Snow」 · live](https://jungrok5.github.io/motion-skills/pixel-diorama/) |
| [`paper-road/`](paper-road/) | a papercraft stop-motion road trip drawn in code — a toy car drives a road made just ahead of it, unrolled from a paper roll over hills and round a loop or inked onto the paper floor by a fountain pen, while cut-paper mountains fold up and a paper sun rises; a turtle-graphics 3D road, a following camera, poses held on twos with per-pose jitter, a 1920×1080 MP4 (optional soundtrack) and a live page | [samples page · 「Draw a Road」 30 s · live](https://jungrok5.github.io/motion-skills/paper-road/) |

To use a skill with Claude Code, copy (or symlink) its folder into `.claude/skills/` of your project, or point the agent at
its `SKILL.md`.

## Adding a skill

Skills usually arrive from another project repo where they were proven on real work. To add or absorb one so it lands
like the others (folder layout, provenance, lessons, samples page, registry entry), follow
[CONTRIBUTING.md](CONTRIBUTING.md) (Korean). The site lives in [`docs/`](docs/): the hub is drawn from
[`docs/skills.json`](docs/skills.json) (`node tools/build-hub.mjs` prerenders it), each skill page starts from
[`docs/_template/`](docs/_template/), and GitHub Pages publishes `docs/` from `main`.
