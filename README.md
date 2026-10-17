# motion-skills

A collection of reusable skills for making motion graphics with AI agents (Claude Code skills: each folder has a
`SKILL.md` an agent can follow, plus the scripts and references it needs).

| skill | what it makes |
|---|---|
| [`canvas-film/`](canvas-film/) | a cinematic multi-scene film drawn in HTML Canvas — a different visual style per scene, ElevenLabs music/SFX, MP4 in 16:9 and 9:16, and a live web player in many languages from the same scene files |

To use a skill with Claude Code, copy (or symlink) its folder into `.claude/skills/` of your project, or point the agent at
its `SKILL.md`.

**Samples:** https://jungrok5.github.io/motion-skills/ — a live demo of each skill playing in the browser, and the gallery of
the 21 film styles (source: [`docs/`](docs/), served by GitHub Pages from `main` → `/docs`).
