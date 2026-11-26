# Source — what this skill was made from

- **The post the owner shared:** CF长风 (@cfenghub) on X, 2026-11-25 —
  https://x.com/cfenghub/status/2125403596757905720?a=_ZUllhPlhe0rXEGbREU&s=19 — quoting the original video and calling it
  "an infinite loop, *the micro world inside a watch dial*, written in pure Three.js: 50 minutes, zero external 3D assets".
  It praises the workbench: film lighting, a warm white key on the desk with soft shadow falloff, ceramic mug, books,
  a magnifier and watchmaker's tools whose materials and reflections are all distinct, a main and a secondary light,
  depth of field, a story mood.
- **The original video:** Rez (@RezAIT00) on X, 2026-11-24 — https://x.com/RezAIT00/status/2125285225769164985/video/1 —
  "makes a world within a watch … This was entirely in threejs, no external assets." 20 s, 1920×1080.

Read through `api.fxtwitter.com/2/thread/<id>`; the clip from `video.twimg.com`, looked at as 1-fps contact sheets
(kept in scratch, never in the repo).

## What the clip does (second by second)

| s | picture |
|---|---|
| 0–2 | a horologer's workbench at night: a seated figure in shadow, desk lamp, clocks, tools, a disassembled watch |
| 2–5 | the camera sinks to the desk and pushes toward a wristwatch lying open; tweezers, wheels, a crystal |
| 5–8 | into the movement: bridges, jewels, a balance wheel; the gold plate is a grid of tiny buildings |
| 8–11 | the gears are above us now — a miniature town at night, trams running round on the gear rims |
| 11–14 | down into the streets: rain, umbrellas, lamplight on cobbles, a shop with a clock sign: HOROLOGER |
| 14–17 | through the shop window: the workshop, shelves of clocks, a figure at a desk |
| 17–20 | the same workbench as the first frame — the loop closes without a cut |

## What is taken (the style)

- **One unbroken camera move through worlds nested inside each other, whose innermost holds the outermost** — so the
  film loops forever with no cut and no fade.
- **Every world at its own scale, in code**: three.js only, no model files, textures or HDRIs; materials told apart
  by roughness, metalness, clearcoat and what they reflect.
- **Film light**: a warm practical key, a secondary light, soft shadow falloff, night outside; depth of field that
  makes each world read as a miniature or as a room.
- **Each world alive**: the inner world moves on its own (in the clip: rain, trams, turning gears).

## What is not taken

- The watch, the town in the movement, the horologer's shop and workbench, the HOROLOGER sign, the composition of any
  shot. The worked example (`examples/lighthouse-bottle`) is a different ring on a different topic, and the starter is a
  third.
- The seated human figure. This skill animates no bodies (see SKILL.md Rules): inhabitants are implied — a lamp left
  burning, an open logbook, a boat with a lit cabin, a turning lens. A topic that needs people walking belongs in a skill
  with a rig (`ten-second-scene`, `cartoon-3d-short`).
- The "50 minutes of generation" claim: this skill gives the method and the tools; time spent is the topic's.
