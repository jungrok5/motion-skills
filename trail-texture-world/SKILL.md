---
name: trail-texture-world
description: Make a top-down pixel-art walk where the ground remembers — the "texture trail" trick from 2D games, all in code. One trail texture records where the walker went (when each texel was last pressed by a foot, when the body last covered it and which way it pushed, the ripples still spreading) and every terrain reads that same texture in its own way — sand and snow keep prints, tall grass and reeds bend away and spring back, water rings out, leaf litter is pushed aside and stays, mud keeps deep prints that fill with water, glowing moss lights up under each step and fades, hard ground keeps nothing. Give it a topic and it designs the grounds and how each reads the memory, the map, a weighted pixel walker (planted feet that never slide, starts that gather, stepped turns, hops that land, breathing idles, a lagging scarf or lantern), and a route that cuts between the world, a split screen of the trail texture beside the world, and the texture alone. Outputs a live page you can walk (keys / click, space hops, V switches the view) and a deterministic 1080p MP4 with footsteps synthesised per ground. Use when asked for footprints / trails in a 2D or pixel game scene, a "texture trail" or "trail texture", terrain that reacts to the player, grass that bends when walked through, snow or sand prints, ripples where a character wades, a pixel walk through different terrains, or "make one like this in another place" ("텍스처 트레일", "발자국 남는 지형", "지나간 자리가 남는 픽셀 게임", "풀이 휘고 물결이 퍼지는", "걸어간 자국", "이 스타일로 ○○ 걷는 장면 만들어줘", "footprints in snow pixel art", "grass bending trail", "terrain memory"). Source — made from https://x.com/asynkimo/status/2125001098087776442?a=44aj8xink6AcTDapx-c&s=19.
---

# trail-texture-world

Top-down pixel walks over ground that remembers. A world of named grounds is baked once from a map function; a walker
crosses it on a route; and **one trail texture** — a window of the world round the camera — records the walk: when a foot
last pressed each texel (and how hard), when the body last covered it and which way it was pushed, and the height of every
ripple still spreading. Every ground reads that same texture in its own way, so the trick is visible as a difference:
prints in sand, reeds that bend and spring back, rings on a pool, leaves that stay pushed aside, moss that glows and fades,
a road that keeps nothing. A split view shows the texture itself beside the world. Everything draws into a 320×180 canvas
scaled up nearest-neighbour (×6 = 1080p). A film is one walk integrated at 120 Hz from the route, and the texture is rebuilt
every frame from the stamp log (the newest press wins, so the rebuild is the same as an accumulating texture), which keeps
every frame a pure function of `t`. The live page lets the viewer take the walker with the same body and the same texture.

Source: made from [Kimo's post](https://x.com/asynkimo/status/2125001098087776442?a=44aj8xink6AcTDapx-c&s=19) on X —
*"Texture trails are one of my favorite tricks for 2D games. One texture remembers where the player walked, and each terrain
uses it in its own way"* — an 8-second clip of a knight crossing snow, tall grass and a river, with the trail texture shown
beside the game. This skill borrows the technique and the split-screen way of showing it; the engine, the terrains, the
walkers and both examples are this repo's own code, and no character, map or art from the clip is reproduced.

## Fixed (the style) vs designed per topic
| fixed — every piece | designed for each topic |
|---|---|
| one trail texture (foot time + strength, body time + push, ripple height), read by every ground | the grounds: which ones, their palettes, and **how each reads the memory** (prints, bending, rings, glow, pushed litter, nothing) and for how long |
| ≥ 2 grounds that read it, no two the same way; a ground that keeps nothing makes the memory visible | the map: where each ground lies, its edges, the decorations |
| the memory shown at least once: split view (texture \| world) or the texture alone | the walker: who, its art (down / up / right), colours, mass, speed, step, followers, the light it carries |
| top-down pixel art: 320×180, ×6 nearest-neighbour, integer pixels, ordered dither, 3 tones per ground, outlined props | day or night: ambient colour, lanterns, lamps, glowing things |
| a walker with weight: planted feet locked, prints exactly under them, starts gather, stops settle, corners arc, stepped turns, hops gather → fly → land → recover, idles breathe, followers lag | the route: beats, waits, turns, hops, which view when, captions |
| deterministic film from a route; a walkable live page; footsteps synthesised per ground | the title and subtitle; which sounds the grounds make |
| code-only: no image, model, audio or video files; no generated motion | |

## What's in this folder
| path | what |
|---|---|
| `lib/trail.js` | the engine (`window.TT`): `TT.create()` → the piece `F` with `F.look`, `F.world`, `F.walker`, `F.route`, `F.start`; the trail texture and its rebuild, the walker simulation (gait with locked feet, turns, hops, springs, followers), the renderer (ground pass, y-sorted blades / litter / props / walker, particles, night light, split and trail views), 3×5 and 5×5 pixel fonts, seeded `rng` / `hash` / `noise` (`fbm`, `value`, `wander`), colour helpers, `?sheet=cast`, `?map=1`, the page contract and the live controls |
| `lib/kit.js` | terrains and decorations (`window.TK`): `snow`, `sand`, `mud`, `grass`, `reeds`, `water`, `moss`, `leaves`, `ground`; `rock`, `bush`, `tree`, `palm`, `log`, `lily`, `tuft`, `pebble`, `flower`, `shroom`, `lamp`; `scatter`, `nearPath`, `blob` |
| `templates/world.html` | a commented starting piece (*Low Tide*: a beach at dawn) — every part meant to be replaced |
| `templates/BRIEF.md` | the brief to fill before code, and the review list stills are scored on |
| `scripts/new-world.mjs` | start a project: `lib/` + `index.html` + `BRIEF.md` + `out/` (`--from <example>` to start from an example) |
| `scripts/render.mjs` | stills, a contact sheet, the cast sheet / route map (`--q sheet=cast`, `--q map=1`), the MP4 with sound |
| `scripts/check.mjs` | proves a piece: loads, draws, deterministic; **the trail** (each ground changes because of it, each its own way, how long it lasts, the texture is shown); the body (feet, prints, reach, sides, facing, teleport); weight (starts, hops, acceleration, breathing idles, lagging followers); format; code-only; route clearance; speed |
| `references/` | **TRAIL** (how the texture works, writing a ground, the walker, the API) · **LESSONS** (what broke and the fix) |
| `examples/oasis-courier/` | *The Last Well* (39.5 s, day): a salt courier over dune sand, a caravan road, dry reeds, a well pool and its wet shore; a hop over the channel |
| `examples/lantern-hollow/` | *Lantern Hollow* (36.9 s, night): a child with a lantern over leaf litter, glowing moss, a creek and its mud banks; a hop over a rill |

## Project layout (what you create)
```
my-walk/
  BRIEF.md       the brief (written first)
  index.html     the piece: TT.create → F.look → F.world → F.walker → F.route → F.start()
  lib/           copy of the skill's lib/ (new-world.mjs)
  out/           stills, sheets, the MP4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs index.html --stills 3,12 --scale 3`.

Requirements: Node + Playwright Chromium, ffmpeg. No GPU, no network, no npm install. A 40 s film renders in about two minutes.

## Workflow
1. **Topic → brief.** Fill `BRIEF.md` (`templates/BRIEF.md`): who walks, across what, day or night; the **grounds table** — for
   each ground, what it reads (foot / body / wave), what it does with the memory, how long it remembers, its sound, whether it
   slows or sinks the walker; the map; the walker (mass and why, art, asymmetric things, followers, light); the route table.
   With a reference, list what each of its terrains does with the trail first (`references/TRAIL.md` → "reading a
   reference"), then design your own — never copy its character, map or art.
2. **Start**: `node <skill>/scripts/new-world.mjs my-walk` (or `--from oasis-courier` / `--from lantern-hollow`).
3. **Grounds and map first.** Write each ground (kit factory with your palette, or your own `base` / `px` — TRAIL.md "writing
   a ground") and `map(x, y, n)`. Look at the whole world: `render.mjs index.html --q map=1 --stills 0`. Shapes must read;
   tune thresholds there. Add decorations; keep solid ones off the route (`TK.nearPath`).
4. **The walker.** Art for down / up / right (≈ 11 × 15, origin at the hip), colours, arms, legs, followers. Look at the cast
   sheet: `render.mjs index.html --q sheet=cast --stills 0`. Every facing, a stride each way with planted feet marked, start,
   stop, a stepped turn, a hop each way. Score it with the body rules below before writing the route.
5. **The route.** Steps of `{ at | to | wait | hop, view, caption, face, speed }`. Start still under the title; walk every
   ground that reads the trail long enough to see it; show the memory (`view: 'split'`, `'trail'`); end walking away.
   Re-check on `?map=1`: the path is coloured by view, prints are dotted, the closest solid prop is printed.
6. **Stills and sheet**: `render.mjs index.html --sheet 8` and `--stills` at moments just after each ground is crossed. Score
   them on the brief's review list; fix anything under 2.
7. **Check**: `node <skill>/scripts/check.mjs index.html` — every line `ok`. It prints the numbers: pixels each ground changes
   because of the trail at +0.5 / +2 / +6 s, foot drift, print offset, reach, facing, acceleration, gather and recover times.
8. **Render**: `render.mjs index.html` → `out/<folder>.mp4`, 1920×1080, H.264, with footsteps per ground (`--mute` for none,
   `--scale 12` for 4K). Watch it once through, with sound.

## Rules
- **Design for the topic.** The grounds, the map, the walker and the route come from the brief. The examples and the template
  show the style; never drop the courier, the child, the oasis or the beach into a topic they don't fit, and never recreate the
  reference clip's knight, snowfield, grass patch or river crossing.
- **One style.** Whatever the topic: top-down pixel art at 320×180, 3 tones per ground with ordered dither, outlined props, the
  pixel fonts, the split view's black texture with bright feet. New grounds and props use the same painter and palette habits.
- **One texture, many readings.** Grounds never keep their own trail state: they read `S.foot` / `S.body` / `S.wave` (and
  neighbours) from the one texture. At least two grounds on the route read it, no two the same way (`check` compares the
  colours each adds); a ground that keeps nothing is welcome — it shows the others remember. Each ground's memory has its own
  length (`life`): prints that fill back with dither, grass that springs back, leaves that stay until the memory runs out.
- **Show the memory.** At least one beat in `split` (texture | world) or `trail`. The texture view is truthful: it draws the
  same texels the grounds read.
- **Pixels stay pixels.** Draw through the painter (`P.px`, `P.rect`, `P.sprite`, `P.big`, `P.text`) into the 320×180 buffer.
  No smoothing, no `arc` / `stroke` / `filter`, no text but the pixel fonts, no image files. The video is an integer upscale
  with `flags=neighbor`.
- **Weight sets the timing.** Mass in the brief → `F.walker({ mass })`: acceleration and turn rate fall with mass, the
  gathering before a start, a hop's crouch and its recovery grow with √mass, springs (crouch, lean) are slower. Never tween
  the walker's position or limbs directly; give the route, the body does the rest.
- **Feet are planted.** A planted foot is locked to the world until it lifts; every print is stamped where a foot landed, so
  prints line up with boots. Turns on the spot are two steps; corners become arcs. `check` fails a foot that drifts > 0.5 px,
  a print > 0.5 px from its foot, a leg past its reach, a left foot right of the line of travel, a facing that disagrees with
  the travel, a body that jumps (teleport).
- **The body agrees with itself.** Face, chest, hips and toes point one way; in side view the near leg and arm are drawn in
  front. `left` mirrors `right` only when the body is symmetric — a held lantern is a follower on `handR` (it moves behind the
  body when facing left), a bag on one hip needs its own `left` art.
- **Alive at rest, inertia in motion.** Idles breathe (1 px chest), blink on an irregular beat and shift weight; starts gather,
  stops overshoot and settle; hops gather, land on both feet (deeper prints, a bigger splash) and recover; followers lag every
  start, stop and turn. `check` fails a still idle, a start without gathering, a hop without crouch or recovery, followers
  that do not lag.
- **Code-only.** No generated or downloaded motion, art, sound or models: motion is keyed in code from the rules above.
- **Pure function of t.** No `Math.random`, `Date` or state between frames in a piece; choices are seeded (`TT.rng`, `n.rnd`).
- **Check by looking and by numbers**: the map, the cast sheet, a contact sheet, stills scored on the review list, and
  `check.mjs` all `ok` before the render.

## Contract every piece fulfils
`window.seek(t)` draws frame t; `window.DURATION`, `window.FPS` (30), `window.PIXEL = { W: 320, H: 180, scale: 6 }`,
`window.__ready = true`, `window.TRAIL` (`samples` at 120 Hz, `stamps`, `steps`, `walker`, `world`, `matUse`, `matAt(x, y)`,
`setOff([...])`, `setView(v)`, `walkerBox(t)`, `matMask(t)`, `night`) — all set by `F.start()`. Queries: `?render=1` (no fitting,
no live loop), `?t=12.5` (one frozen frame), `?view=world|split|trail` (force a view), `?sheet=cast`, `?map=1` (both a 640×360
page, render at ×3), `?off=trail,blades,litter,light,title,caption,walker,still` (switch parts off; `still` freezes animation),
`?play=1` (walk at once). The live page plays the film on a loop at the largest integer scale; the first key or click hands the
walker to the viewer (arrows / WASD walk, click or tap to walk there, space hops forward, V cycles world → split → trail,
Esc returns to the film).
