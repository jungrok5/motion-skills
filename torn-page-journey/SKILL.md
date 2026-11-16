---
name: torn-page-journey
description: Make a looping 16:9 film in which one traveller rides a bicycle through a chain of feelings, each feeling painted in its own art medium — a child's crayon drawing, a pencil sketchbook, flat gouache, a three-ink woodcut, grey charcoal in the rain, wet watercolour, impasto oil, a chalkboard at night (or a medium you add) — and every page change is a new sheet torn in over the old one, so for a moment the rider is half in one style and half in the next; the traveller is redrawn by every medium, the world, weather and creatures follow the feeling, and the last page tears back into the first. All drawn in code on an HTML Canvas, with one theme re-scored per feeling and every sound synthesised (paper tears, chain, freewheel, bell, rain, birds, crowd, waves, crickets). Outputs a live page and a 1920×1080 MP4 (24 fps). Give it a topic and it designs the traveller, the arc of feelings, the media, the places and the tune. Use for "an art piece that moves from one art style to another", "emotion journey animation", "style-shifting ride", "one character through many art styles", "torn paper transition", "pure code art film", or ("감정마다 그림체가 바뀌는 영상", "그림체가 계속 바뀌는 여행 애니메이션", "자전거 타고 여러 화풍을 지나가는 영상", "찢어진 종이 전환", "코드로만 만든 아트 영상", "이 스타일로 ○○ 이야기 만들어줘", "주제만 바꿔서"). Code-only. Source — made from https://x.com/chetaslua/status/2121885449509851415?a=8qELAlUgdwW0YiWOrYE&s=19
---

# torn-page-journey

One traveller, one ride, no cuts: a character on a bicycle crosses a chain of chapters, and each chapter is one feeling
painted in one art medium. Joy is a child's crayon drawing, curiosity a pencil sketchbook, a busy market flat gouache, the
long climb a carved woodcut under a rayed sun, sorrow grey charcoal in the rain, relief a watercolour with a rainbow, awe an
oil painting at sunset, wonder a chalkboard full of stars. The next page arrives as a fresh sheet torn in from the right,
with a ragged white rim and a shadow, and the edge sweeps over the rider, who is redrawn by every medium yet stays the same
character. The last page tears back into the first, so the film loops. Give it a topic ("a fox carries a lemon tree home",
"a postman's last round", "the first day at a new school") and it writes a brief, designs the traveller as data, picks a
feeling and a medium for each chapter, builds the places from the kit, keys one gesture per chapter, and writes one tune
that every feeling re-scores. Every frame is `seek(t)`, so the same page plays live with sound and renders to MP4.

Made in this repo from Chetaslua's post on X — https://x.com/chetaslua/status/2121885449509851415?a=8qELAlUgdwW0YiWOrYE&s=19 —
a 110-second film made "pure code, JS only", music and every sound included, of a pelican riding a bike "from one art style
<emotion> to the other". `references/LOOK.md` lists what was observed from it. This skill keeps the form and builds all of it
with its own code. The worked example, `examples/lemon-tree` 「The Long Way Home」 (60.5 s, 8 chapters), is a different story
with an original traveller. Never recreate the reference's pelican, its scenes or its chapter order: design new ones for each topic.

**Code-only.** Like the source, everything is code: no generated or downloaded images, video, motion or audio. The motion
principles of `references/MOTION-QUALITY.md` (repo root) are keyed by hand in the rig.

**Fixed (the style)**: the side-on travelling shot, with the traveller in the left third riding right and the world in
parallax behind; one feeling = one medium = one chapter; the torn-page transition (ragged edge, white fibrous rim, shadow,
sweeping right to left over the rider); the traveller drawn by the page's medium, keeping its colours and signature
accessory; the world (place, weather, hour, creatures) following the feeling; one incident per chapter, acted with a
gather and a settle; a companion that breathes; the loop; one theme re-scored per feeling, with the paper, chain,
freewheel and place sounds; 1920×1080 at 24 fps.

**Designed per topic**: the traveller (species or person, silhouette, colours, accessory, mass) and what rides in the
basket; the arc of feelings (4–9) and their order; the medium for each feeling, and new media when the topic needs one
(references/MEDIA.md); each chapter's place, road (flat, climb, descent), companion, movers and gesture; new props and
critters; the tune and the beds. The template and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/media.js` | the media behind one interface (`page`, `col`, `shape`, `line`, `wash`, `post`): `crayon`, `pencil`, `gouache`, `woodcut`, `charcoal`, `watercolour`, `oil`, `chalk`; add your own (`MEDIA.x = {…}`) |
| `lib/kit.js` | scenery drawn through any medium: sky, sun, moon, stars, constellation, cloud, hills, mountains, road, grass, trees (6 kinds), houses (3), fence, lamp, flowers, water, boat, stall, bunting, pole, balloon, kite, rainbow, puddle, rock, glow; live things that breathe or move: `bird`, `butterfly`, `rain`, `critter` (cat, dog, rabbit, owl, hen), `person`; `each` (scatter on a fixed grid), `groundLine` |
| `lib/rider.js` | the traveller on a bicycle, from a spec: `snout` / `bird` / `human` heads, tails, scarf, hat, pack, basket + `cargo`; legs and arms by two-bone IK with fixed bone lengths (feet locked on the pedals, knees forward, elbows down), the bike tilting on the road, wheels rolling the distance, breathing, blinking, follow-through; `MOODS` (posture, face), `GESTURES` (wave, flap, look, catch, bell, shiver, feetup, each with an anticipation and a recovery); audits joints (`LIM`), feet and gestures |
| `lib/journey.js` | `Journey`: chapters on a timeline, the plates (painted lazily over the range each layer shows), the distance / speed / crank / follow-through tables (the loop closes on whole wheel and crank turns), the torn-page transition, the grade, the live player with sound, the checks and the render contract |
| `lib/score.js` | `arrange(info, {theme, moods, sfx})`: one tune re-scored per feeling (`MOODS`: tempo, mode, lead, accompaniment, bass, beat, bed), crossfaded across the tears, plus tears, chain, freewheel ticks and gesture sounds; `renderScore` (FM bells, plucked strings, felt piano, reed, flute, brass, strings, pads, drums, beds, effects, reverb) |
| `lib/sheet.js` | `castSheet(SPEC)`: every medium facing right and left, the pedal stroke, the idle, every gesture's key poses |
| `templates/` | `BRIEF.md`, `cast.js` + `cast.html`, `index.html` (3 commented chapters), `score.js` |
| `scripts/new-journey.mjs` | start a project (`lib/` + the template, or `--from lemon-tree`) |
| `scripts/render.mjs` | stills (`--stills 3,12`), a contact sheet (`--sheet 24`), or the MP4 (workers × ffmpeg chunks, `--audio out/x.wav`) |
| `scripts/score.mjs` | the page's score → WAV (the score is resolved by the page from its chapters) |
| `scripts/check.mjs` | proves a page (or a cast sheet): clean load, every chapter draws, deterministic, every body / feet / wheel / gesture / film rule, the media change at every tear, neighbours look different, the loop closes, motion numbers (foot-to-pedal, slip, cranks, breathing, lag), the score, the cost of a frame |
| `references/` | **BRIEF** (topic → brief, the cast and still reviews) · **LOOK** (the form, observed from the source) · **MEDIA** (the media, the feelings they carry, adding one) · **KIT** (API) · **LESSONS** (what broke and the fix) |
| `examples/lemon-tree/` | the worked example: `BRIEF.md`, `cast.js` + `cast.html`, `index.html` (8 chapters), `score.js` |

## Project layout (what you create)
```
my-journey/
  BRIEF.md     the topic as a ride: traveller, arc of feelings, chapters, tune (references/BRIEF.md) — written first
  cast.js      the traveller as data (+ cargo) — reviewed on cast.html before any chapter
  cast.html    the cast sheet
  index.html   the journey: chapters (mood × medium × place × gesture) → J.check(...) → J.start()
  score.js     the tune + arrange(info, …)
  lib/         copy of the skill's lib/ (new-journey.mjs); pages import it through the import map "tpj/"
  out/         stills, sheets, the WAV and the MP4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs index.html --sheet 24 --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (Canvas 2D; ~17 ms a frame at quarter
size, ~0.1–0.2 s a 1080p frame with PNG encoding; 60 s renders in a few minutes with 4 workers).

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it in from the user's topic (references/BRIEF.md explains how):
   - the traveller, what they carry, their mass and idle;
   - an arc of 4–9 feelings that is a story and leads back to its start;
   - for every chapter: its medium (references/MEDIA.md; never the same as a neighbour), place, road, companion, movers,
     gesture and sound;
   - the tune.

   Save it as `BRIEF.md` before any code. If the user gives a reference video, pull stills (`ffmpeg -i ref.mp4 -vf fps=1/3,tile=3x4 sheet.jpg`),
   note its media, transitions and pacing, then design your own traveller and chapters.
2. **Start**: `node <skill>/scripts/new-journey.mjs my-journey` (or `--from lemon-tree`).
3. **Traveller.** Write `cast.js` from the brief: a new spec for this topic (the fields are in references/KIT.md and
   `templates/cast.js`), and a `cargo` drawn through `M`. Render `cast.html --stills 0 --scale .5`, run
   `check.mjs cast.html`, and score the sheet against the cast review in references/BRIEF.md: it must read in every medium
   facing both ways, with the chest, face and toes on the facing side, the tail and pack behind, the chainring in front only
   facing left, feet on the pedals through the stroke, a breathing idle, and gestures that gather and settle. Fix and repeat.
4. **New media and props.** If a feeling needs a medium the library lacks, write it in the page (references/MEDIA.md) and
   look at it on the cast sheet. Props and critters the kit lacks are drawn in the page with `M.shape` / `M.line`, so they
   come out in every medium.
5. **Chapters, one at a time.** Each chapter gets:
   - `mood`, `medium` and `dur` (6–10 s);
   - a `ground` line (a climb slows the ride and stands the rider on the pedals; a descent coasts);
   - 3–5 layers painted once, scattered with `K.each` so any range draws the same things;
   - a companion that breathes and something that moves (`back` / `front`);
   - one gesture.

   Place things that must meet (an owl on its branch, a rabbit the rider passes) on the same grid with jitter 0, or aim them
   with `g.X` and `R.where()`. After each chapter, take a still mid-way and one mid-tear: `render.mjs index.html --stills 11,15 --scale .5`.
6. **Sheet and review**: `render.mjs index.html --sheet 24 --scale .5`, then a still per chapter and per tear, scored against
   the still review in references/BRIEF.md. Check that every page is one medium throughout, that its feeling is nameable,
   and that it differs from the page before. Check the tear's edge, rim and shadow, and that the rider is half and half.
   Nothing may float, skate or stand dead; the gestures must gather and land, and the world must be alive. Fix and repeat.
7. **Check**: `node <skill>/scripts/check.mjs index.html` must print only `ok`. Add `J.check(...)` for the film's own rules.
8. **Score**: write the tune in `score.js` (scale degrees, one chord root a bar). Bend the moods for this film
   (`moods: { sorrow: { bpm: 60 } }`) and add each chapter's effects (`sound: { sfx: [{ at, type }] }`). Listen on the live
   page (♪), then run `node <skill>/scripts/score.mjs index.html` → `out/<name>.wav`.
9. **Render**: `render.mjs index.html --workers 4 --audio out/<name>.wav` → `out/<name>.mp4`. Look at stills from the MP4
   before handing it over.

## Rules
- **Design for the topic.** The traveller, the cargo, the feelings, the media, the places, the gestures and the tune are
  designed for this topic. Do not reuse the template's girl or the example's fox and lemon tree unless the topic is exactly
  theirs. Never recreate the reference's pelican, its scenes or its order.
- **One form.** A single side-on travelling shot with no cuts and the traveller in the left third. Each page change is a torn
  page, never a crossfade or a cut. Each chapter is one feeling in one medium, and neighbours never share a medium. The
  last page tears back into the first.
- **One medium per page, all of it.** Scenery, critters, effects and the traveller are all drawn through the page's
  medium (`M`). Nothing is pasted on in a neutral style. A new medium follows references/MEDIA.md.
- **One traveller.** Every medium redraws the same character, keeping its silhouette, colours and accessory (`role: 'hero'`).
  It never turns into a different design.
- **Pure function of t.** No `Math.random`, no `Date`, no state between frames. Use seeded `rng`, `hash`, `n1` and `keys`, and
  scatter with `K.each`. `check.mjs` proves it.
- **Weight sets timing.** The rider's mass, in the brief, sets the speed, the follow-through spring and the settle. Big moves
  take longer to gather and to settle.
- **Feet on the pedals; wheels on the road.** The feet stay locked to the pedals unless a gesture lifts them while coasting.
  The wheels touch the road line and roll the distance travelled. The cranks turn while pedalling and hold while coasting.
  The check reports the numbers.
- **Bodies that can exist.** Head, chest and toes face one way. The chest, face and toes are on the facing side; the tail
  and pack are behind. Facing left, the chainring is on the near side. Knees bend forward and elbows down, with the neck
  within ±45° (`R.LIM`). Look at every new rider and gesture both ways on the cast sheet first.
- **Gather, act, settle.** Every gesture has an anticipation that moves against the action (at least .12 s) and settles
  back with overshoot. `gestureProblem()` and the check enforce it.
- **Alive at rest.** The rider breathes, blinks and twitches on irregular beats. Every companion breathes and blinks and
  moves a tail or ear. Something in each world moves besides the scroll.
- **Trailing parts lag.** The scarf, tail, ears and cargo follow the smoothed speed and overshoot the bumps.
- **The loop closes.** The last tear must end exactly at the start state. The runtime handles the tables; live things must
  use `g.t` (it wraps), never their own clock.
- **Readable at a glance.** The traveller's head and cargo are never cut. No text on screen except something drawn in the
  world. Light pages and dark pages alternate.

## Contract every journey page fulfils
`window.seek(t)` renders frame t; `window.DURATION`, `window.FPS` (24), `window.SIZE = {W, H}` (1920×1080 stage units),
`window.runChecks(t)` (names of broken rules), `window.shotAt(t)` (`{i, name, lt, medium}`), `window.riderAt(t)` (joints and
numbers), `window.film`, `window.__ready = true` — all set by `J.start()`. `?render=1` = fixed canvas, no live loop; `?t=20` =
one frozen frame; `?scale=.5` = preview size (plates are painted at that size); `?off=grain,vignette,texture`. The live page
fits the window, draws at 24 fps (at ≤ .75 of 1080p unless `?scale=1`), painting the next chapter's plates ahead of time. Click or space pauses, ← → jump a
second, the bar scrubs (ticks mark the chapters), and ♪ plays the score in sync.
