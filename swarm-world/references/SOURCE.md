# SOURCE — harnoorDev/swarm-build, the 3D part

- Repo: https://github.com/harnoorDev/swarm-build (MIT © Harnoor Singh). Only the 3D world was taken:
  `skills/swarm-build/examples/3d.html` — live at https://harnoordev.github.io/swarm-build/skills/swarm-build/examples/3d.html,
  a 31 s recording at `docs/demo-3d.mp4` in the repo. The page-building part of swarm-build (frames, typing, streaming text
  on a real website) is not in this skill; `cursor-swarm` in this repo covers documents built by cursors.
- swarm-build credits the idea to Joel Califa's Swarm (a site that builds itself as you scroll); no code from that project
  is used there or here.

## What the source does, beat by beat (31 s recording)
1. **0–2 s** — an empty pale sky; sixteen named cursors gather in a cluster; the session pill reads `valley-line · 0 objects · 16 agents`.
2. **2–3 s** — the conductor places the train (crosshair, "placing the train"); the coaches assemble part by part.
3. **3–9 s** — the train eases out of the first field. The tracklayer runs ahead laying sleepers; terraformer and surveyor
   sweep side to side far ahead drawing the ground as coral wireframe; painter / planter / gardener sweep sunflower and
   lavender fields row by row; riggers raise windmills; carpenters lay fences; the log starts ("rigger raised the windmill").
4. **9–14 s** — the harbour town: one cursor pulls up three houses then drops three roofs ("building houses 2/3",
   "roofing 1/3"); the renderer paints the sea; boats are moored, lamps lit, the lighthouse raised.
5. **14–20 s** — the climb: the whole crew plants the pine forest five at a time, rocks placed, snow-tipped pines higher up,
   the light turning to golden hour.
6. **20–22 s** — the train pulls into the summit station; "conductor pulled into the station"; the pill reads `built in 0:20.0`.
7. **22–31 s** — cursors leave; the camera arcs up behind the station, turns by the east past the sea, and looks back over
   the whole valley; lamps and the lighthouse glow; a replay button appears.

## The mechanisms, and where they are here
| source (examples/3d.html) | here |
|---|---|
| `buildable()` shader patch: `aBuild` per instance, grow from base, coral wireframe pass, dithered solid, depth pass | `World.#materials()` (accent as a uniform) |
| Catmull-Rom line, `pathAt`, `nearest` with `yn` / `yb` blends, the bed cut in `height()` | `line`, `at`, `nearest`, `ground` |
| timetable `SCH`, `trainS`, `pOfS`, `buildAt(s, lead)` | `timetable`, `travS`, `pOfS`, `buildAt` |
| `job(type, roles, items)`, the greedy hand-out with `freeAt`, `blocked` fronts and deadlines; items re-timed to their cursor | `raise / hop / lay / sweep`, `#schedule()` |
| `workPoint(j, p)` — where each cursor is working | `workPoint` |
| `drawMarks` — boxes, handles, labels, click rings | `#marks` |
| `doing(j)`, `did(j)`, `where()` with landmarks, the throttled log | `#doing`, `#did`, `where`, `#story` |
| camera `chase()` with zones, the reveal arc and turn | `#chase`, `#frame` |
| the DOM cursor engine (`swarm-build.js`) with build sites `swarm.anchor(name, fn, { at, by, doing })` | `#crewSegments` + `agentAt` — the same behaviour (linger at the last site, travel to the next and wait, slip off-screen) as a pure function of t, drawn on the canvas with the engine's glyphs |

## What was added
- Seekable time (`seek(t)`), so the world renders to MP4 frame by frame; the crew's gathering and clocking-off as part of it.
- Everything topic-specific as data in the page (the source's world became `examples/valley-line`).
- Localised words and HUD (templates), dark-sky theme, stars, sky bodies via `onFrame`.
- `check.mjs` (schedule audit, determinism, rules), `render.mjs` (sheets, MP4, synthesised sound), `new-world.mjs`.
