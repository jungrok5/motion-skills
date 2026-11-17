---
name: lived-in-room
description: Build one room as a real-scale 3D scene that reads as lived in, and film a hand-held walk through it at two hours of the day - give it a person and a place (whose room, in which building, at which hours) and it designs that room new. The building comes first (shell, window, door, services, every number looked up and sourced), then an inventory of a few hundred things, each put, hung, stuck, suspended, leant or fixed with a reason, each measured by an audit that reports floating, sinking, tipping and intersection in millimetres. Things are left off square, ajar and half-used; a dozen small things move (a second hand, a screen, washing in moving air, beads of water on the pane, far beacons at the legal flash rate); the city outside is one drawn picture beyond the glass; the film is what a visitor's phone sees coming in at the door - a walking bob, a slow turn, a focus that hunts once, a torch switched on - in a dark room with a few places lit. Written in Python for Blender (bpy), rendered with Cycles, no downloaded or generated assets. Output is a .blend per hour, an MP4 per hour and a frame-sequence page. Use when asked for a detailed / realistic / lived-in room or interior, an archviz walk-through, a "my desk / my studio / my room in 3D", a Blender scene built by an agent, vibe modeling, or "make it like this" for that approach ("방을 3D로 만들어줘", "내 방 3D", "작업실 3D", "생활감 있는 방", "실내 워크스루", "인테리어 3D 영상", "블렌더로 방 만들어줘", "바이브 모델링", "AI로 블렌더", "밤 버전 아침 버전", "이 스타일로 ○○ 방 만들어줘", "주제만 바꿔서", "lived-in room", "interior walkthrough", "room walk-through film", "vibe modeling", "Blender room", "archviz interior", "handheld phone walkthrough"). Source — made from https://note.com/its_kobataka/n/n67bb2f8c9ce4?utm_source=x&utm_medium=social&utm_campaign=202611_vibe_modeling_vol06&utm_content=reply_discovery_01
---

# lived-in-room

One room, built at real size from numbers and filmed as a visitor's phone would film it: 10–40 s per hour of the
day, 24 fps, 1920 × 1080. A project is a folder of Python — the building, the things, where each thing goes and why,
and the light and the walk of each hour — that Blender builds the same way every time. What makes the room read as
real is not the renderer: it is that the building is a particular building, every number was looked up, every thing
is held by something and was put where its user would put it, and small things are moving.

Made from KOBATAKA's article "Vibe Modeling vol.06 — 65 ways to make an AI × Blender 3D scene look real"
(<https://note.com/its_kobataka/n/n67bb2f8c9ce4?utm_source=x&utm_medium=social&utm_campaign=202611_vibe_modeling_vol06&utm_content=reply_discovery_01>);
`references/SOURCE.md` is a summary of it in Korean, with each of the 65 mapped to where it lives in this skill.
Built and proven in this repo on `examples/rooftop-tapes` 「옥탑 녹음실」 — a Seoul rooftop room and the 191 cassettes
of the tenant who records her neighbourhood, at 02:14 and at 06:50: a topic that is not in the article.

**Fixed by the skill (the style)**
- One room at real scale, built in code: no downloaded models, no texture files, no generated assets. Pictures in
  the room (spines, labels, screens, posters, the view outside) are drawn in code.
- The order: setting → the building's spec → skeleton → inventory → placement → film. The building is researched and
  built before any furniture exists.
- Nothing guessed: every number of the building, and of anything the camera gets close to, has a source in `RESEARCH.md`.
- Every thing has a support type — place, hang, stick, suspend, lean, fix — and the whole room is measured for
  floating, sinking, tipping and intersection, in millimetres, every time it changes.
- Placement by use, with the traces of use: off square, ajar, half-used. One dirt for the whole room.
- Many small motions; the outside as one picture; a dark room with a few places picked out; lamps kept warm by exposure.
- The film is a hand-held phone walk from the door, at two hours of the day from the same model.
- Reviewed in rounds by a second agent that did not build it; the findings are judged, not obeyed.
- Determinism: a frame is a function of its number. Output: `.blend`, linear EXR → PNG → MP4, a frame-sequence page.

**Designed for every topic (never reused from the example)**
- The building: type, decade, structure, storey, country — and therefore the shell, the window, the door, the services.
- The person, their history as things, and the rule by which they arrange the room.
- The inventory: which things, how many, their real sizes; the handful that are theirs alone; what is on the screens.
- Where each thing goes and why; which are left off square, ajar, half-used.
- The picture outside and its far lights; the two hours; what is on at each; what moves; the two walks.

## What's in this folder
| path | what |
|---|---|
| `lib/lr/room.py` | `Room`: the register of things, the skeleton (`shell`, `walls`, `skirting`, `cornice`), the six supports (`put`, `against`, `stack`, `hang`, `stick`, `suspend`, `lean`, `fix`) |
| `lib/lr/openings.py` | `window` (frame, two sashes on two tracks, panes, crescent lock, inner sill), `door`, `drops` (water on the pane) |
| `lib/lr/phys.py` · `audit.py` | measuring: where a thing comes to rest, gaps, penetration depth, tipping; the audit of the whole room; screen time per thing |
| `lib/lr/shoot.py` | motions (`tick`, `spin`, `pages`, `flicker`, `blink`, `flutter`, `travel`), light (`lamp`, `glow`, `backdrop`, `beacon`, `daylight`, `haze`, `phone_light`, the work light), the camera (`walk`: bob, tremor, turn cap, focus lag and hunt) |
| `lib/lr/geo.py` | `Part`: closed-shell modelling from numbers — `box`, `sheet`, `lathe`, `cyl`, `pipe`, `sphere`, `prism`, `tube`, `skin`, `slab`, `drape`, `merge`; `import_glb`, `close_mesh` |
| `lib/lr/mat.py` | materials with wear and the one shared dirt: `paint`, `wall`, `wood`, `planks`, `metal`, `plastic`, `ceramic`, `fabric`, `paper`, `glass`, `emit`, `picture`, `volume` |
| `lib/lr/draw.py` | pictures in Pillow: `spine` (vertical CJK setting), `scrawl` (hand lettering), `waveform`, `sky`, `skyline`; the bundled Hangul + Latin face |
| `lib/lr/kit.py` | the common things: shelf unit, desk, drawers, books and `shelve`, paper, poster, note, frame, mug, bottle, plant, cushion, mattress, blanket, towel, lamps, outlet, switch, power strip, cable, monitor, laptop, keyboard, headphones, clock, fan |
| `lib/lr/project.py` · `scene.py` · `finish.py` · `exr.py` | the project driver and versions · Cycles settings and quality presets · the phone look in numpy (bloom, AgX, grain) · EXR reader |
| `scripts/new_room.py` | start a project: the starter's files plus the `BRIEF.md` and `RESEARCH.md` forms |
| `scripts/audit.py` | measure the room: every fault with its number; `--break` proves the audit can see |
| `scripts/render.py` | stills (`--still night:0.5`), work-light review views (`--view plan,desk`, `--supports`), frames (`--version`, `--all`, `--step`), `.blend` (`--blend`) |
| `scripts/sheet.py` | the inventory as built, screen time per thing, the walk as a contact sheet, the motions, the camera second by second |
| `scripts/check.py` | files, inventory, research, model, audit, life, camera, picture |
| `scripts/finish.py` · `encode.py` · `flipbook.py` | EXR → PNG · MP4 per version · a page that plays the frames |
| `templates/` | `BRIEF.md` and `RESEARCH.md` forms, the frame-sequence player |
| `starter/` | the smallest room (a desk under a window, 55 things, two hours): runs as it is |
| `examples/rooftop-tapes/` | the worked example: `BRIEF.md`, `RESEARCH.md`, `REVIEW.md`, and the six project files |
| `references/` | **SOURCE** (the article, summarised in Korean, and the 65 mapped) · **BRIEF** (topic → brief, the questions, the rubric) · **METHOD** (skeleton first, nothing guessed, how things are made, how they are held, lived-in) · **FILM** (outside, motions, light, the walk, versions, render) · **REVIEW** (rounds, the reviewer's brief, the retro) · **KIT** (library reference) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-room/
  BRIEF.md        the room on paper: setting, spec, inventory, placement, film, rounds, score
  RESEARCH.md     where every number comes from: one section per id, each with a source
  REVIEW.md       the rounds: what the reviewer found, what was taken, what was declined and why
  room.py         ROOM = dict(title, fps, size, seed, versions={name: dict(seconds, look)}, beacon_range, views)
  inventory.py    INVENTORY = [dict(id, name, n, size, method, support, use, ref), …]   every kind, listed first
  skeleton.py     def build(r)      the building: shell, window, door, services
  props.py        this room's own things and pictures
  layout.py       def furnish(r)    every thing, with how it is held and why it is there
  film.py         def light(r), motion(r), camera(r)   per version (r.v); def plate(r) for the outside
  out/            views/, stills/, exr/<version>/, frames/<version>/, <version>.blend, <version>.mp4, flipbook/   (not committed)
```
Run every script from the project folder: `python3 <skill>/scripts/audit.py`.

Requirements: Python 3.13 with `bpy` 5.x (`pip install bpy`; or Blender 5.x itself: `blender -b -P <script> -- <args>`),
numpy, Pillow, ffmpeg. No GPU needed; one that Blender can see is used.

## Workflow
1. **Topic → brief.** Read `references/BRIEF.md` and `references/METHOD.md`. Decide the building, the person, their
   history as things, the two hours and the rule of the room; ask the user the questions in `BRIEF.md` when they
   are there, read their own file about themselves when they have one. `new_room.py my-room --title "…"`, then write
   §1 of `BRIEF.md`. Show it to the user before building when they are there to answer.
2. **Research the building, then the things.** For every part of the shell and every thing the camera will get
   close to, ask whose trade it is and look in that trade's catalogue, rule or convention. Write `RESEARCH.md` (what
   was opened, the numbers, how they are used here) and BRIEF §2. Nothing is modelled from memory.
3. **Inventory.** List every kind in `inventory.py` — count, real size, method, support, use, source — before building any.
4. **Skeleton.** Write `skeleton.py` from the spec: `r.shell`, `r.window`, `r.door`, skirting, services.
   `render.py --view plan` and one elevation: does it read as that building with nothing in it?
5. **Things, zone by zone.** Build this room's own things in `props.py`; place everything in `layout.py` through the
   six supports, each with `kind=` and `why=`, furniture first. After each zone: `audit.py` (must pass before the next
   zone) and `render.py --view <zone>` in the work light. A sunk thing is re-seated, never nudged upward.
6. **Leave the traces of use**: off square, ajar, half-used — as many as the brief decided, where a hand would leave them.
7. **Film.** In `film.py`: the picture outside and its far lights; what is on at each hour; every small motion and
   what drives it; the two walks. `render.py --still night:0.2,night:0.8,dawn:0.5` and read the medians;
   `sheet.py --camera` for the turn speed; `sheet.py --walk` for the whole of both walks on one sheet.
8. **Check.** `check.py` must pass: documents filled in, inventory matches what was built in number and size,
   every source present, the versions are the same room, the audit passes and proves it can see, enough moves,
   enough is off square, every thing has its why, the walks start at the door and never whip or pass through
   anything, each hour is neither black nor burnt and the two differ, a frame renders the same twice.
9. **Review rounds.** Give a separate agent the work-light views, the supports picture, stills, BRIEF §1 and the
   audit line, with the brief in `references/REVIEW.md`. Take or decline each finding in `REVIEW.md`, fix, audit,
   re-render, review again asking for new findings only. Use `sheet.py --screen` to fix what is large on screen first.
   Stop when a round brings only details. If a fix fails twice, stop rendering and find the cause.
10. **Render, develop, join.** In the background: `render.py --all --step 2` (every other frame first), then
    `render.py --all`. `finish.py` → `encode.py`; `flipbook.py` when the film has to play where no video may go;
    `render.py --all --blend` for the scenes. Pull stills from the result and look at them. Score them with the rubric
    and write the retro; put what is true of any room into `references/LESSONS.md`.

## Rules
- **Design for the topic.** The example and the starter show the style; they are not parts bins. A new topic gets its
  own building, person, inventory, pictures and walks. Reuse library calls, not the example's room.
- **One style.** Whatever the topic: real scale, the building first, sourced numbers, declared supports and the audit,
  traces of use, small motions, the drawn outside, the dark room, the phone walk, two hours from one model.
- **Skeleton before things.** No furniture until the empty shell reads as its building type.
- **Numbers are looked up.** A skeleton part without a source fails `check.py`. An estimate is written as an estimate.
- **Every thing is held.** It enters through `put / hang / stick / suspend / lean / fix`; the audit must pass before
  anything is rendered for judgement; pairs that pass through each other are declared, not ignored.
- **Closed meshes only.** A mesh without an inside cannot be measured; an imported one is closed first or rebuilt.
- **A place is a use.** Every thing carries `why=`: when and for what it is used. Nothing is placed for the picture.
- **Not everything is square, shut and full** — and not everything is askew either.
- **No logos, no trade marks, no named designs.** Machines are types; famous objects are shapes.
- **Many small motions**, each with its own rate and something that drives it; far lights follow the rule of the place.
- **Dark on purpose.** A few places lit; exposure set when developing; the work light for looking, the film light for mood.
- **The walk is a person**: from the door, at a hand's height, bobbing only while walking, never past the turn cap,
  never through a thing.
- **Two hours, one room.** Versions differ in `film.py` only.
- **Deterministic.** `r.rng(tag)` for chance, functions of the frame for motion, no wall-clock time.
- **Check by looking — at the right picture.** Every change → the audit; every zone → a work-light view; every light
  change → a still with its median; every walk → the contact sheet.
- **Generated media is reference only** and stays out of the repository; this skill needs none.

## Contract
- `room.py` defines `ROOM`; `versions` maps a name to `dict(seconds, look)`; a version's frame count is `seconds × fps`.
- `skeleton.build(r)` makes only the building and calls `r.shell` first. `layout.furnish(r)` makes everything else and
  must not depend on `r.v`. `film.light(r)`, `film.motion(r)`, `film.camera(r)` are called once per version, in that
  order, after the room exists; `film.plate(r)` (optional) puts the outside behind the work-light views.
- Every object in the room is registered with a `kind` that is an id in `inventory.py` and one of the six supports.
- A thing is authored with its origin under its footprint and its front toward −Y; a hung or stuck thing with its
  back on y = 0. Units are metres.
- Motions are functions of the frame registered with `r.animate` and its helpers; `r.camera` then `r.walk` set the
  camera. Local frames run `1..n`; functions are also evaluated at `0` and `n + 1` for motion blur.
- `render.py` writes `out/exr/<version>/NNNN.exr` (linear Rec.709, 16-bit float, no look). `finish.py` writes
  `out/frames/<version>/NNNNN.png`. `encode.py` writes `out/<version>.mp4` and `out/film.mp4`.
- Colours are `'#rrggbb'` sRGB strings; a number given as a light's colour is a temperature in kelvin.
