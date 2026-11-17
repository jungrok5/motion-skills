# BRIEF — from a topic to a swarm page

Write `BRIEF.md` in the project before code (`templates/BRIEF.md` is the blank). A topic can be any page people read and
use: a log, a ledger, a line-up, a notice, a menu, a scoreboard, a guestbook, a recipe card.

## 1 · The page
- **What it is and who uses it.** It must work as a page: real content, editable where it makes sense, at least one
  structured element (a table, a list, a form) the reader can act on (sort, tick, fill).
- **The words.** A kicker, a headline (editable, `data-hic-edit`), a short note that hints at the flight in the topic's
  own voice ("Open the hives and the ledger goes out foraging"), the body. Never the source's wording.
- **Controls.** The fly trigger (in the topic's verb: "Open the hives", "Lights out", "Throw them", "Release"), a land
  control ("Call them home", "Land", "Reel in") marked `data-swarm-hold`, a sound toggle (held).
- **Ink and type.** Ink that reads on the sky at rest (dark on a light sky, pale on night). If the light turns, a second ink
  under `[data-swarm-light="b"]`. System font stacks.

## 2 · The creature — what the ink becomes
| topic feel | creature | notes |
|---|---|---|
| evening, a crowd, wonder | `starling` | sheet formation, dark at dusk, pale at night, flap 7–9, glide 0.35–0.45 |
| work, sweetness, summer | `bee` | ball formation, amber tint 0.7–0.8, flap 20–30 (a flicker), glide ≈ 0.1 |
| night, music, festivals | `firefly` | ball, blend `add`, yellow-green tint 1.0, slow speed, pulse (flap 3–6) |
| sea, market, school | `fish` | stream, silver/blue tint, fast turns, sky = underwater gradient + rays |
| school, farewells, offices | `plane` | stream, white tint, flap 0, slow turns, high glide |
| anything else | `custom` | write `creature.glsl` (references/ENGINE.md) |

- **Mass.** Light and quick (bees, fish): speed 180–260, maxTurn 3–4, follow 8–26. Heavy and slow (planes, big birds):
  speed 140–200, maxTurn 1–1.6, follow 3–10. The springs set the lag and follow-through; the turn rate sets the arc.
- **Idle at rest.** Hops every 1–4 s (a few birds shuffle on the roost); sheen 0.02–0.04. Calm topics: slower hops.

## 3 · The flock
- **Formation:** `sheet` (murmuration veil that folds; thick 0.1–0.2), `ball` (swarm, thick 1), `stream` (school,
  squadron; stretch 1.6–2.5).
- **Where it roams:** `area` above the scene, clear of the held controls' corner if possible; `depth` 0.25–0.4.
- **Neighbours / reaction / salience:** 7 / 0.07–0.12 s / 3–5. Higher alignment and salience = turns sweep through
  faster; higher wander and cohesion = busier, rounder swarms.
- **Gather → lift:** gather 0.25–0.45 s; lift wave 900–1500 px/s from the trigger; kick 220–360.
- **Land:** `top` (reading order), `origin` (back to the trigger first: a hive, a stage), `random`; span 1.2–2 s.

## 4 · Sky and setting
- **Hour and weather:** gradient stops (top → bottom), sun or moon (x, y, r, glow), clouds (amount, band, shade, lit),
  cirrus, stars, rays, vignette. The sky is the page's background: keep the text area calm (no sun disc behind text).
- **Second light** (optional): `skyB` + `light.turn` — dusk → night, day → storm, noon → golden hour. The creature's
  `tintB` and the page's second ink go with it.
- **Scene in front:** SVG in `#scene` from `onResize(W, H)` — roofs, reeds, hives, a stage, a harbour wall. It never
  flies, sits below the text, and is reflected when `water` is on.

## 5 · Trigger and sound
- Fly: a button (default), `trigger.intro` (one element flies on load and returns — great for showing the idea), or a
  page-specific call to `swarm.fly(el)`. Land: the held control, Escape, or your own call.
- Sound: `wings` (noise flutter), `buzz` (detuned saws), `paper` (high whoosh), `hum`; ambience `crickets` / `birds`.

## Still review (score every still; a "no" fails it)
- **rest** (`--act rest`): Is the page readable at a glance and does it look designed for the topic? Does the scene stay
  clear of the text? Is the sky calm behind the words? At 390 px wide, does it still read?
- **lift-off** (`--act fly --at 0.3`): Do grains near the trigger already fly while farther ones quiver (a wave, not a
  pop)? Is there a gather before the jump?
- **flight** (`--at 3`, `--at 7`): One coherent flock with folds and density, depth (near birds larger), banking in turns?
  Does it read as THIS creature (shape, colour, beat)? Anything floating dead, flipping, or stuck in a corner?
  Held controls still in place?
- **landing** (`--act land --at 1.5`, `--at 5`): Do they come home in the brief's order, braking and settling, not
  snapping? Is the page whole and crisp at the end?
- **light** (if it turns): is the text readable in both lights?
- "Does anything float, skate, or stand dead still? Does the lift-off gather and the landing settle?"
