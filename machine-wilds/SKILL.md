---
name: machine-wilds
description: Make a place you can walk through in the browser where giant walking machines roam a ruined, overgrown land in mist — a forested valley, a flooded quarry, a drowned harbour, a mountain pass — in a game-engine look, with their lamps cutting cones through the fog. It is this repository's scanned-realm engine (photo-scanned surfaces, objects, plants and leaves from Poly Haven, CC0, a deferred WebGL 2 renderer, the hour and the weather, keyboard / mouse / touch / gamepad) with three things added - land with real relief (ridges, benches, gullies; the walker slows on a climb and cannot scale a cliff), machines built part by part from code as mechanisms (planar legs of two or three segments, a drum between fork cheeks on a pin at every joint, a two-part hydraulic cylinder across each powered hinge on anchors the script finds so the rod never leaves its barrel, ball-jointed feet with toes), and a walk that is planned on the land itself - every footfall is placed on the real height and slope of the ground, a planted foot is a fixed point of the world, a swinging foot clears what lies between, each leg bends as much as its own patch of ground asks, the sole tilts to the slope and each toe droops to the ground under its tip, the body's height and tilt come from the feet that carry it (eased by its mass) and it comes down before a leg runs out; steps shorten on a grade; the ways the machines keep are worn into the land with their footprints pressed in. Machines stand and breathe, gather before they leave, do moves written as key poses, turn their heads to whoever comes near, shake the ground, raise dust or spray and are heard late by the distance. Mist is a weather of its own; every lamp throws a halo and a beam through the air pass. Give it a topic (a place, what ruined it, an hour) and it writes a brief, designs the land, the ruins, the scans, NEW machines for that place (their job, size, legs, gait numbers from their mass, parts, moves, lamps) and the ways they walk, proves the bodies in seconds without a browser (gym - reach, bends, planted feet that never slide, soles on the ground, support, rods in barrels, accelerations a mass can have, idle, anticipation and recovery, loop, determinism; on the realm's own ways and over a test course of ramp, step, side slope, ditch and mound), checks the page, and renders a cast sheet a kind (every side, the walk, the move), stills, a contact sheet or a film. Use when asked for a walkable post-apocalyptic or overgrown-ruin world with giant walking machines or mechs, "robots walking through a foggy forest", machine eyes glowing through mist, legs that adapt to uneven terrain (IK on slopes), a Horizon-like or Shadow-of-the-Colossus-like mood made original, a higher-stakes version of a scanned-realm or walking-colossus piece ("거대한 보행 기계가 걸어다니는 세상", "멸망 이후 폐허 숲", "안개 속 기계 불빛", "걸어다닐 수 있는 폐허 세계", "지형에 맞춰 걷는 기계", "굴곡 있는 지형 IK", "호라이즌 같은 분위기로", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "walkable world with giant walking machines", "mechs in a misty forest", "terrain-adaptive walking machines", "overgrown ruins with robots", "post-apocalyptic forest in the browser"). Source — made in this repository from three of its skills, scanned-realm, walking-colossus and machine-build-reel, with scans from https://polyhaven.com
---

# machine-wilds

A place you walk through, in the look of a current game engine, **where giant machines walk too**: a ruined land
that has grown over, mist lying in it, and machines the size of buildings keeping their old rounds — their lamps the
brightest things in the picture. Each machine is built part by part from code as a mechanism and **walks on the land as
it is**: its footfalls are planned on the real height and slope of the ground, so every leg bends differently, soles
lie on slopes, the body leans into a climb, and nothing slides. A realm is a folder of small source files plus a list
of scans (`assets.json`); `gym.mjs` proves the machines in seconds without a browser, `build.mjs` joins the sources
with the engine into `index.html`, `check.mjs` proves the page, `render.mjs` makes the cast sheets, stills and films.

Made in this repository when the owner asked for a walkable, ruined, forested world with giant walking machines in
mist — "like scanned-realm, with machines like walking-colossus and machine-build-reel, on ground that is not flat,
their legs solved to the terrain". It **is the engine of `scanned-realm`** (which is the engine of `living-realm` with
scans allowed) with machines, relief and mist added; the machines' kinematics, cylinder search and checks follow
`machine-build-reel` (itself after AnyMachine), the stateless gait and the sense of scale follow `walking-colossus`
(after Walking Block). The mood asked for was that of well-known games of overgrown ruins and animal machines; **none
of their designs, names or assets is here** — every machine and place is designed from the topic
(`references/SOURCE.md`). Scans are from <https://polyhaven.com> (CC0) and are not committed.
Built and proven on `examples/iron-valley` 「쇠울림 골짜기」 (a valley 640 m across with 36 m of relief: a broken
viaduct, a maintenance hall with a camp fire, pylons, a container yard; seven kinds of machine — a 25 m long-necked
four-legged watcher, a string of six-legged carriers, a 73 m eight-legged relic on the rim, a skein of five kites
with nine-metre wings overhead, two turtles under mossed domes of plate, a crayfish in oxide-red plates with claws and
a jointed tail that keeps to the brook, a file of four woodlice — and one that fell long ago). `starter/` (Lantern Quarry: a flooded quarry cut in benches, two wardens of a fourth kind, one walking the rim
and one standing in the water) is a second, unrelated topic.

**Fixed by the skill (the style)**
- **Machines are mechanisms, built by code**: planar legs (2 or 3 segments, mammal or insect), every joint a drum
  between fork cheeks on a pin, every powered hinge a cylinder on lugs whose anchors the script finds from everything
  the machine does; every part rides exactly one bone; three levels of detail are three builds of the same code.
- **The walk is planned on the land**: footfalls on the ground's real height and tilt (moved off faces too steep,
  solids and deep water), planted feet fixed in the world, swings that clear the ground between, the body's height and
  tilt from its feet through a window as long as its mass asks, a soft limit that lowers the body before a leg runs
  out, shorter steps on a grade. Every pose is a pure function of time — what is drawn is what was checked.
- **Old, not clean**: rusted and mossed industrial hydraulics, some under pale ceramic shells. Every kind has an `age`:
  grime in the creases, rust run down from seams and fittings, moss on what faces up — laid in the machine's own space,
  so it walks with it. Rods stay bright where the seals wipe them. No kind is factory-new.
- **A body has weight**: heavier → longer cycle, more of it on the ground, slower sink into each step; it gathers
  before it leaves and runs on a little when it stops; it breathes while it stands; moves are key poses with an
  anticipation and an overshoot; trailing parts lag. No downloaded or generated motion.
- **The walker may have a body**: a two-legged machine of the realm's own design, driven from the keys, seen from inside
  (first person), from behind (third) or from above (top), nearer or further by the wheel. It keeps every rule the
  others keep — planted feet do not slide, the hip is no higher than the legs reach, it gathers and gives.
- **The ways are worn**: across a way the ground is eased toward level, no stretch steeper than its machines climb,
  footprints pressed in, nothing planted on it; the walker may cross and stand under a machine.
- **Mist and lamps**: a `mist` weather; every lamp is a halo and (with a cone) a beam marched through the air, light
  on what it falls on, a lens that glows. The realm opens dark and misty; the hour and the weather still go round.
- **Everything of scanned-realm**: scans through the engine (surfaces re-baked, objects instanced with levels, cut-out
  plants, leaf atlases), CC0 only, listed per realm and never committed, the walk that does not wait for the download,
  four quality tiers, the HUD, the lens on the tour, `?scan=0`.

**Designed for every topic (never reused from the example or the starter)**
- The place: what it was, what ruined it, how long ago; its land in metres (where it is steep, where it is level),
  water, ruins as builders written for it, the list of scans it is made of, its trees.
- **Its machines**: what each is for, its size and mass, how many legs of which kind, segment lengths, the gait its
  mass implies, its body, head, load and lamps as parts written for it, its idle and its move; how many of each.
- The ways they keep (laid where the land lets them), where they stand, what they do there; what the walker meets
  first, and the set piece where one passes close.
- The hour and the weather the page opens on, the round, the tour and views, the sounds, the words and their language.

## What's in this folder
| path | what |
|---|---|
| `scripts/gym.mjs` | the machines walked over the land **in Node** (no browser, seconds): numbers and pass / fail for every unit; `--course` the test course (ramp, drop, side slope, ditch, mound); `--sheet` a side view of each unit on the land's real profile; `--map` the land's relief, slopes, ways and every footfall |
| `scripts/check.mjs` | the gym on the realm and the course · no two machines in each other's legs · the page loads clean · every scan arrived and baked · spawn, views and tour can be walked (and no climb is past the walker) · the machines audited again in the page · nothing solid on a way · every state reads · the lamps show in the mist · budgets; `--walk` only the walking part |
| `scripts/render.mjs` | `--cast [kind] --close` the same kinds from arm's length (body, belly, hip, knee, foot, head) · `--cast [kind]` the cast sheet (a kind alone in a studio beside a 1.75 m figure: front, back, both sides, four three-quarters, the walk from both sides, standing, the move's gather / peak / recover, leaving, a turn) · `--shot` · `--views` · `--sheet` (every view × day, dusk, night, rain, snow, mist) · `--tour 12` · `--phone` · `--film` · `--mats` |
| `scripts/film.mjs` | a film from the shots a realm declares (`film: [{ name, dur, tod, weather, t, cam(u) }]`): every frame's camera and clock are functions of time, so frames are written one by one and a render that stops goes on where it was; `--still` two frames a shot first; `--sound` the footfalls and calls placed from the same functions → `out/film.mp4` |
| `scripts/fetch-assets.mjs` · `build.mjs` · `new-realm.mjs` | `assets.json` → `assets/` from Poly Haven · sources + engine → `index.html` (`--cdn`: the page reads the scans from Poly Haven's server) · start a realm folder from the starter or `--from iron-valley` |
| `lib/48_mech.js` | `LR.mech`: frames, planar limbs (2 / 3 segments, the ankle that leans with the fold), feet and toes, neck, head, extras (`fixed spin lag`), the cylinder anchor search — numbers only |
| `lib/48_mech_avatar.js` | the walker's own body: a kind on two legs that steps as it goes (walk, run, turn, back, side, hop, fall), its exercise for the gym, the fit and the cast sheet — numbers only |
| `lib/48_mech_gait.js` | ways, units, footfalls on the land, the timetable of a lap (walk · arrive · stand · leave), the command at time t, pressing the ways and footprints into the land, the audit — numbers only |
| `lib/48_mech_fly.js` | kinds that fly: a line in the air, speed with the climb, bank before the turn, wing beats in bouts and glides, the body riding the beat, its audit — numbers only |
| `lib/48_mech_kit_fit.js` | fittings: pipes, hoses, rivets, hatches, louvres, tanks, junction boxes, ladders, rails, fins, gaiters, warning bars, stacks, dishes — and what the stock legs and cylinders carry |
| `lib/48_mech_kit.js` | the part kit: `k.bone(name, (g) => …)`, `k.limbs()`, `k.neckLinks()`, `k.loft`, `k.lamp`, palette roles, three levels of detail |
| `lib/48_mech_run.js` | the machines in the page: one skinned mesh a level a unit, lamps, the feet the walker bumps into, ground shake, footfall events, the head that turns, the studio, wrecks |
| `lib/17_mechmats.js` | recipes: `steel chrome paintmetal rustplate ceramic rubber concrete asphalt` (a scan may take any of their names) |
| `lib/00_core.js` … `lib/90_app.js`, `lib/shell.html`, `vendor/` | the scanned-realm engine with: the skinned path (`70_render`), lamps in the air and light passes (`75_post`), `mist` (`25_weather`), slopes (`80_player`), footfalls and calls (`85_audio`), dust and spray (`60_fx`) · three.js r170 and meshoptimizer (MIT) |
| `starter/` | Lantern Quarry — the smallest realm that uses every part, steps ①–⑧ commented |
| `examples/iron-valley/` | 「쇠울림 골짜기」 — `BRIEF.md`, `realm.json`, `assets.json`, `src/` (land, words, ruins, machines, parts, details, plants, start) |
| `references/` | **BRIEF** (topic → brief, the review) · **MACHINES** (designing a kind: every key, mass → numbers, parts, ways, what each check means) · **KIT** (every builder of the engine) · **ASSETS** (choosing and fitting scans, licence) · **LOOK** · **PERF** · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-realm/
  BRIEF.md            written first (references/BRIEF.md): the place, its machines, its ways, its scans
  realm.json          { "title", "subtitle", "lang", "bg" }
  assets.json         { "res": "1k", "textures": [ids], "models": [ids | { id, maps, heavy }], "atlases": [{ id, map }] }
  src/10_land.js      the height function (real relief), water, roads, cover maps; the ways as lists of points
  src/15_words.js     the HUD's strings (any language)                                   (optional)
  src/20_ruins.js     what people left — builders of your own from LR.Geo
  src/25_machines.js  LR.mech.define(kind, numbers) · LR.mech.route · LR.mech.spawn · LR.gym = () => { land; machines }
  src/26_parts.js     each kind's parts: k.limbs(), then body, head, load, lamps
  src/30_details.js   placed scans, wrecks, names of places, sounds
  src/40_plants.js    species, scatter by a woods function — off the ways (LR.mech.wayDist)
  src/90_main.js      LR.start({ materials, weather, round, build, tour, views, strings })   ← always last
  assets/  index.html  out/      fetched · built · stills, sheets, maps (none of them committed)
```
Sources are plain scripts joined in name order into one module: a later file sees the earlier ones; no import/export.

## Requirements
Node 18+ with Playwright Chromium, `curl`, ffmpeg; network access to `api.polyhaven.com` and `dl.polyhaven.org` when
fetching. No npm install, no keys. `gym.mjs` needs only Node. The page needs WebGL 2 and wants a real GPU; without one
(CI, containers) a 640 × 360 still takes 1–2 minutes on the CPU. Serve a realm's folder to look at it
(`python3 -m http.server`) — browsers do not read textures from `file://`.

## Workflow
1. **Topic → brief.** Read `references/BRIEF.md` and `references/MACHINES.md`; write `BRIEF.md`: the place and what
   happened to it, the plan with coordinates and heights, **each machine** (job, size, mass, legs, gait, look, idle,
   move, lamps, how many), the ways, the set piece, what it is made of (scans), the hour, the walk, the words.
2. **Land first, with numbers.** `new-realm.mjs my-realm`, write `src/10_land.js`, sketch the ways as points, set
   `LR.gym`. `gym.mjs my-realm --map` draws relief, slopes over 30° in red and the ways: lay each way where the land
   lets a machine of that size go (and where the walker will see it), keep ruins off them.
3. **A kind in numbers** (`src/25_machines.js`): limbs, ride height, gait from the mass, idle, one move in key poses.
   `gym.mjs my-realm --course --sheet`: the kind must pass on the course before its parts are written; read the sheet
   (a leg that folds shut, a body that jumps, a foot in the air) and fix the numbers, not the check.
4. **Its ways on the land.** `gym.mjs my-realm --sheet --map`: every unit must pass on its own way. A way that fails
   is moved, or its machine's stride / ride / follow changed; units on one way are spaced so their legs never meet.
5. **Choose and fetch the scans** (`references/ASSETS.md`), then the **parts** (`src/26_parts.js`): stock legs in a
   style, then the body, head, load and lamps of this machine — never the example's. `render.mjs my-realm --cast`
   shows each kind from every side and in motion: grade it with the rubric (front / back / left / right agree, joints
   are mechanisms, the silhouette is its own, the figure makes the size readable).
   Then the **fittings** (`references/MACHINES.md`): the plant this machine's work needs — mains and a line to every
   hip, accumulators, a cooler behind louvres, stacks — and a person's way round it (rungs, rails, hatches at a
   person's size). `render.mjs my-realm --cast --close` stands next to each kind: if a tile shows a smooth shape with
   nothing bolted to it, it is not finished.
6. **Ruins, details, plants** — as in scanned-realm (`references/KIT.md`), with `LR.mech.wayDist(x, z)` in every
   `avoid`. Fallen trunks and stumps along the ways, a wreck (`LR.mech.wreck`) where the story wants one.
7. **The walk and the set piece.** Spawn, tour, 8–12 views; one place where a machine passes close enough to be
   frightening and the walker is safe — and **a way from there to the machine**: nothing fences the walker off from what
   the place is about. Barriers and parapets carry their real tops (a hop gets over them), a deck's edge is a drop the
   walker may take, and there is a way back up. `check.mjs my-realm --walk` draws the walk map.
8. **Judge it, then verify.** Stills in mist at dusk, at night, at dawn and one clear noon: with a machine walking at
   the eye, one seen from the side, one far (only its lights). Worst first: air and light, then the machines'
   read, then plants and surfaces. `check.mjs my-realm` must print `check OK`; `render.mjs --sheet`, `--phone`.
   Open the page from a server on a machine with a GPU, walk under a machine, listen. `?prof=1` shows the milliseconds.
9. **A film, if asked.** Declare five or six shots in `LR.start({ film })` — each a place, an hour, the second of the
   valley's clock it starts at (ask the gym where a machine is then) and a camera as a function of the shot's time.
   `film.mjs my-realm --still` (two frames a shot: look at them), `--sound`, then `film.mjs my-realm` in the
   background: hours on a CPU, resumable. Never commit the MP4.
10. **Deliver.** The folder (`index.html` + `assets/`) on any static host, or `build.mjs my-realm --cdn --out
   realm.html`. Say how many megabytes arrive, what was measured and what was not, and where the look stops.

## Rules
- **Design for the topic.** The example's valley, viaduct, crane, carriers and relic — and the starter's quarry and
  wardens — belong to their briefs. A new topic gets its own land, ruins, scans, **machines** and ways. Reuse the kit's
  mechanisms and the engine, not the designs. Never rebuild a machine from a game or a film: no names, silhouettes or
  markings of someone else's.
- **One style.** Whatever the topic: scans through the engine, machines as mechanisms built by code, the walk planned
  on the land, mist and lamps, the walker's first person. A cartoon robot or a flat graphic is another skill.
- **Legs follow the ground, the ground is not flattened to the legs.** A way is eased, never levelled; the gym must
  show legs at different lengths on it. If a check fails, change the way, the stride or the leg — not the limit.
- **Weight sets timing** (`references/MOTION-QUALITY.md` at the repo root): the body may not be thrown about
  (≤ 1.6 m/s² over 80 t), planted feet never slide (≤ 4 mm) and lie on the ground (≤ 30 mm), no joint bends the wrong
  way or folds shut, the idle breathes, a move gathers (≥ 4 %) and overshoots (≥ 3 %), it turns by stepping.
- **Every joint is a mechanism; every part rides one bone; the script picks the cylinders.** If no anchor pair keeps a
  rod in its barrel, the joint's range is too wide: change the gait, do not hide the cylinder.
- **Nothing on a way.** Trees, scans and ruins keep off with `LR.mech.wayDist`; `check.mjs` fails on a solid there.
- **Dark, not murky.** After dark the mist holds a light of its own (`glow` in the look, `LR.wx.airGlow`), so trunks and
  machines stand as shapes against it; `check.mjs` warns when a night picture is flat (light ± under 0.045) and fails a
  blank one. A view that is black is a view pointed at nothing: move it.
- **Lamps are the picture.** Give each kind lamps with a reason (an eye, a search light, running lights, a beacon),
  few beams (the passes carry 12 lamps a frame, nearest and brightest first), colours that separate the kinds.
- **Code-only motion, CC0 scans, nothing generated committed.** Sound is synthesised in the page. ElevenLabs or any
  paid generator only after the owner's yes for that request. Not Megascans (Fab's licence); never a ripped asset.
- **Do not commit `assets/`, `out/` or an MP4**, and never put scans in `docs/`; the samples site reads them from
  Poly Haven's server (`--cdn`) and says so. Keep the credit on the glass.
- **Budget** (`references/PERF.md`): a kind ≤ ~50 k triangles near, ≤ 192 bones, ≤ 16 units; a view ≤ ~580 draw calls
  and 4.2 M triangles on `medium`. **A page that cannot start says so** (the engine's panels; translate their strings).
- **Say where the look stops** (`references/LOOK.md`): lamps throw no shadows of their own; screen-space light, levels
  of detail, a browser; frame rate on a real GPU is whatever was measured, or not measured.

## Contract
- `LR.gym = (o) => { if (!o.studio) land(); machines(); }` — the land and the machines and nothing else: what
  `gym.mjs`, `check.mjs` and the cast sheet run.
- `LR.mech.define(kind, { title, tonnes, ride, belly, aware, lensGain, palette, limbs: [{ name, kind: 'mammal' | 'insect',
  at, segs, knee, gamma, coxa, hipDrop, home, width, drum, bar, ball, toes, toeLen, act, style }], neck: { at, links },
  head: { len }, extras: [{ name, type: 'fixed' | 'spin' | 'lag', parent, at, dir, len, … }], gait: { cycle, duty, stride,
  lift, pattern: 'lateral' | 'tripod' | 'wave' | offsets, dip, dipTime, sway, roll, nod, follow, smooth, footTilt, … },
  idle: { period, breath, shift, scan }, moves: { name: { dur, main, sound, keys } }, build(k) })` ·
  `LR.mech.mirror(limb)` · `LR.mech.route(name, [[x, z]…], { width, grade, ease, rough, worn })` ·
  `LR.mech.spawn(kind, { name, route, offset, halts: [{ at, hold, move }] } | { post: [x, z], yaw, moves, rest })` ·
  `LR.mech.plan()` (footfalls, worn ways, cylinders) · `LR.mech.start()` (meshes; last in the build) ·
  `LR.mech.wayDist(x, z)` · `LR.mech.wreck(kind, { x, z, yaw, pose, moss })` · `LR.mech.poseAt(unit, t)` ·
  `LR.mech.audit(unit)` — every key in `references/MACHINES.md`.
- Parts: `k.bone(name, (g) => …)` (`g` is an `LR.Geo` in that bone's frame), `k.mat(role)`, `k.limbs({ style: 'shell' |
  'girder' })`, `k.neckLinks`, `k.loft(axis, sections, o)`, `k.xcyl / ycyl / zcyl / ball / bolts`, `k.lamp(bone, { at, dir,
  color, power, cone, range, lens, glow })`, `k.n(sides)`, `k.fine`, `k.mid`. Bones: `body`, `hip_<L>`,
  `thigh|shin|tarsus_<L>`, `foot_<L>`, `toe<i>_<L>`, `act_<joint>_<L>_cyl|_rod`, `neck_01…`, `head`, extras by name.
- Everything of scanned-realm's contract: `assets.json`, `LR.start({ materials, build, weather: { tod, weather },
  round, film, tour, views, strings })`, `LR.mat.photo`, `LR.models`, `LR.atlas`, `LR.Geo`, `LR.world` (a solid may carry
  `{ y0, y1 }`: it then stops only who is at that height — a parapet on a deck — and does not count as standing on a way under it), the page options
  (`?q= ?scale= ?scan=0 ?safe=1 ?prof=1 ?tod= ?wx=clear|rain|snow|mist ?at= ?tour=0 ?off=…,lamps,shake`), still mode
  `?render=1` with `window.realm.shot({ cam, up, tod, weather, t, frames, dof, focus })`, `window.READY`.
  `?cast=<kind>` opens the studio; `?t=150` starts the live page's clock at that second. A still keeps the hour and weather of the
  one before it unless told: give every `--shot` its `tod` and `wx`. `window.realm.reel.{ shots, pose, warm, frame }` is what `film.mjs` drives.
