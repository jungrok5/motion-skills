---
name: machine-build-reel
description: Design and build a giant working machine part by part in Blender, entirely from code, and render its studio "build reel" — give it a topic (a 30 m heron-like walker, a six-legged mountain cargo hauler, a tree-planting strider, a lunar crane walker) and it designs a new machine for it - its job and scale, how it carries its own weight, every joint as a real mechanism (a fork and tongue on a steel pin, a bolted drum with a cap, a two-part hydraulic cylinder across each powered hinge whose anchors the script picks so the rod never leaves its barrel), legs as 2- or 3-segment planar chains (mammal / heron or insect), feet with a ball socket and toes, a neck, a sensor head, trailing whiskers, a radar that spins; a rig with every rigid part on exactly one bone; a stateless walk (lateral four-beat, tripod or wave), a breathing idle and big moves written as key poses with anticipation and recovery. Then the reel in the source video's grammar: a grey cyclorama studio with a 1.75 m orange figure for scale, the machine walking past it, the parts arriving in build order (feet first, structure before shells, lights last), low strides among the legs, the big move, the head waking with its lights stuttering on, the design sheet, the close-up plates and reference-beside-built pairs. 15 checks with numbers (Blender pose = kinematics, reach, no reversed bends, planted feet that never slide, support, rods in barrels with leverage, part-vs-part clash through every action, idle breath, anticipation / recovery, loops, determinism) gate the render. Outputs a .blend, a .glb with one animation per action, a three.js player, turnaround / motion / plate sheets, and a Cycles MP4 reel. Use for "build a machine in Blender from code", "walking robot / mech / strider / walker", "hydraulic legs", "rigged machine with walk cycle", "turnaround and close-up plates", "reference to model video", "AnyMachine", "블렌더로 기계 만들기", "걷는 로봇 영상", "거대 보행 기계", "유압 다리 기계", "부품 하나하나 코드로 만든 기계", "이 영상처럼 기계 만들어줘", "이 스타일로 ○○ 기계 만들어줘", "주제만 바꿔서". Source — made from https://x.com/apekshik/status/2122464141990588795?a=wPnMYQkwOmHrLCQmpTA&s=19 and the repository it links, https://github.com/apekshik/anymachine.
---

# machine-build-reel

A machine that works, built **part by part by a script** in Blender — every joint a mechanism, every powered hinge a
hydraulic cylinder whose rod stays in its barrel through every move — rigged, animated, checked, and shown in a
**build reel**: a grey studio, a 1.75 m figure for scale, the machine walking past it, its parts arriving in build
order, the joints up close, and the drawings beside what was built.

Made from apek's X post <https://x.com/apekshik/status/2122464141990588795?a=wPnMYQkwOmHrLCQmpTA&s=19> (an 87 s video
of "Stilt", a 30 m walking robot built in Blender entirely from code with 160 parts, working hydraulics, a rig and a
walk cycle) and the method in the repository it links, **AnyMachine** <https://github.com/apekshik/anymachine> (MIT):
references good enough to model from, a parts breakdown written before any geometry, one build script, check renders
beside the references, motion read from video clips, a clash check. This skill takes that *method*, the *studio look*
and the *reel grammar* (references/SOURCE.md); its code is written here and none of the Stilt's design is reused.
Starter: `starter/` — **WADER**, a 25 m four-legged heron-like walker (ceramic over carbon). Worked example on a new
topic: `examples/ridge-hauler/` — **RIDGE HAULER**, a 9 m six-legged mountain cargo walker with a 20 ft container
(insect legs, tripod gait, industrial finish, a spinning radar, kneels to set its load down).
Live: https://jungrok5.github.io/motion-skills/machine-build-reel/

**Fixed by the style** (every machine): built by code, part by part, in Blender (no generated or downloaded mesh — the
references guide the build, they are never the model); every joint a real mechanism (fork + drum + pin, bolted flanges
and caps, actuators on lugs); every rigid part on exactly one bone; the load path decided before geometry
(PARTS.md); hydraulic anchors chosen by the script from every action; motion as pure functions of time (stateless
gait, key-posed moves); the studio — grey cyclorama, soft sun key + fill + rim, AgX, the orange 1.75 m figure; the reel
order (walk past the figure → assembly → low stride → big move → head wake → design sheet → plates → reference |
built pairs) with dips to dark; the checks gate the render.
**Designed per topic** (never reused): what the machine is for, its size and what carries the load; leg count, kind
(mammal / heron 3-segment or insect 2-segment), segment lengths, widths, which joints are powered; the body, head,
cargo, masts and every part the stock builders do not have (written as project code); the finish (palette roles:
ceramic, paint, galvanized, carbon …); the gait numbers its mass implies; the big moves as key poses; the plates (which
mechanisms to show close); where the figure stands.

## What's in this folder
| path | what |
|---|---|
| `mbr/geom.py` | mesh builder in a bone's frame: `box taper cyl tube ring torus bolts loft shell sweep` (material slot per face) |
| `mbr/materials.py` | Principled presets by role (`ceramic paint plastic carbon graphite steel galvanized rubber glass emit`), a `Palette` |
| `mbr/kin.py` | kinematics: planar limbs (abduction or coxa yaw + 2/3 segments, closed form), feet / hands and digits, neck, head, extras (`fixed spin lag`), actuator anchor points — every bone's world matrix as a function of a command |
| `mbr/motion.py` | actions: `walk` (stateless gait: `lateral tripod wave` or offsets), `idle` (whole-number loop), moves as key poses (`body.* neck.* head.* light hand.* curl.* gamma.* extra.*`), light flicker |
| `mbr/actuators.py` | anchor search: samples every action, keeps the rod in its barrel, maximises the smallest lever arm, clears the far lug, sides alternate along the pin |
| `mbr/kit.py` · `mbr/stock.py` | `k.part(name, mesh, bone, mats, stage, frame, bevel, share)`; stock mechanisms: `limb hip segment foot toe hand actuators lug neck whisker`, finishes `ceramic` / `industrial` |
| `mbr/rig.py` · `mbr/build.py` | armature from the analytic rest pose, rigid skinning, actions keyed every frame; `.blend`, `.glb`, `machine_info.json` |
| `mbr/check.py` | 15 checks with numbers (below) |
| `mbr/studio.py` · `mbr/render.py` · `mbr/sheets.py` | cyclorama, lights, figure, cameras; views, plates, Freestyle line drawings; turnaround / motion / plate sheets |
| `mbr/reel.py` | the reel's sections, resumable frames, boards, ffmpeg assembly |
| `scripts/machine.py` | the command line: `new build check sheet still reel player jobs` |
| `player/` | three.js player: a button per action + assembly, scale figure, scrolling floor; vendored three r170 + GLTFLoader |
| `templates/` | `BRIEF.md`, `PARTS.md` copied by `new` |
| `starter/` | WADER: `machine.py`, `BRIEF.md`, `PARTS.md` |
| `examples/ridge-hauler/` | the proof on a new topic: `machine.py` (chassis, container, cab, mast, radar), `BRIEF.md`, `PARTS.md` |
| `references/` | **SOURCE** · **PIPELINE** (the reference-first method, step by step here) · **BRIEF** (topic → brief, rubric) · **MECHANISMS** (joints, load paths, stock builders, writing parts) · **MOTION** (gait numbers, key poses, motion quality) · **REEL** · **REFERENCES** (image / video models, permission, code-only drawings) · **LESSONS** |
| `fonts/` | Inter Medium for labels (OFL) |

## Project layout (what you create)
```
my-machine/
  BRIEF.md        topic → machine: job, scale, load path, legs, finish, gait, moves, plates; then the review log
  PARTS.md        the parts breakdown, written BEFORE geometry: axes, dimensions, every part → bone, joint types
  machine.py      MACHINE (the numbers) + build(k) (the parts, as code)
  refs/           optional references (concept.png, front/left/…png, plates/<plate>.png) + jobs_*.json prompts — never committed
  out/            machine.blend, machine.glb, machine_info.json, check.json, REVIEW.md, sheets, reel/, player/  (git-ignored)
```
Run every command from the project folder: `<python with bpy> <skill>/scripts/machine.py <command>`.

Requirements: Blender's Python — `pip install bpy` (bpy 5.x needs Python 3.13; tested with bpy 5.2.4) or Blender itself
(`blender -b --python <skill>/scripts/machine.py -- <command>`); ffmpeg; Mesa EGL (`libegl1`) for the Freestyle line
drawings on a machine without a GPU. Cycles on the CPU, denoised. A build ≈ 5 s, all checks ≈ 4 s, a 640×360 reel frame
≈ 4–5 s and a 960×540 one ≈ 10 s on 4 cores.

## Workflow
1. **Topic → brief.** `machine.py new my-machine` (`--from ridge-hauler` for the example). Write `BRIEF.md` from
   references/BRIEF.md before any code: what it does, true size (look up real things of that size), what carries the
   weight, leg kind and count, finish, gait character, the big move, the plates. If the user gave an image, it goes in
   `refs/concept.png` and the brief describes *that* machine.
2. **References (optional, with permission).** `machine.py jobs` writes the prompt files for a concept → turnaround →
   single views → one close-up plate per mechanism (references/REFERENCES.md). An image model is called **only after
   the owner says yes** (what, which model, how many, cost); results go in `refs/`, never in the repo. Without them the
   skill runs code-only: the design sheet and line drawings stand in, and the reel says "drawing", not "reference".
3. **Parts breakdown.** `PARTS.md` (templates/PARTS.md): axes and origin, overall dimensions, every joint's housing
   size, **the load path** (a guyed mast, a box girder, a truss …), every part → its bone, which joints are powered,
   where the views disagree. Do not write `build(k)` until the load path and joint types are decided.
4. **Numbers.** `MACHINE` in `machine.py`: body height, limbs (`at`, `segs`, `kind`, `knee`, `gamma`, `home`, `width`,
   `drum`, `act`), neck links, head, extras, palette, gait, idle, moves (key poses with a gather and an overshoot), plates.
5. **Parts.** `build(k)`: stock limbs in a finish (`stock.limbs(k, style=…)`) plus everything that makes this machine —
   body, cargo, head, masts — as project functions using `k.part` and `geom` (references/MECHANISMS.md). Give every part
   an assembly `stage`.
6. **Check.** `machine.py check` must pass all 15 (below); it writes `out/REVIEW.md` with each failure, its number and
   where. Fix one thing per pass and log it in BRIEF.md.
7. **Look.** `machine.py sheet` → `turnaround.png` (front, back, **left and right**, both three-quarters, top),
   `motion_sheet.png` (walk key poses from **both sides**, idle breath in / out, every move's gather / peak / recover),
   `plates.png`. Score them with the rubric (references/BRIEF.md). With references, put each plate beside its
   reference and list every difference in BRIEF.md ("what differs from the references") — fix it or accept it in
   writing.
8. **Reel.** `machine.py reel` (refuses while a check fails; `--force` for a draft; `--res 640x360 --samples 14` for a
   quick pass; `--only walk,head`; resumable) → `out/reel/reel.mp4`. Look at the stills of every section before the
   full render.
9. **Hand-off.** `machine.py player` → `out/player/` (serve it). The `.blend` opens with the rig, one action per move,
   the studio; the `.glb` imports anywhere (walk in place; `machine_info.json` has the speed, parts, bones, actuator
   strokes).

## Rules
- **Design per topic.** Never re-skin the starter or the example for a new topic, never rebuild the source's Stilt.
  The job, scale, load path, legs, finish, gait and moves come from the brief; parts the stock lacks are written in
  the project's `machine.py`.
- **One style.** New parts use the same mechanisms (fork + drum + pin, bolted caps, actuators on lugs), the palette
  roles, the studio and the reel order.
- **Every joint is a mechanism.** No sphere pushed into a cylinder: a drum between fork cheeks on a pin, caps and
  bolts; powered hinges get a barrel and a rod on their own bones aimed at each other; feet are a ball in a socket
  with toes on pins.
- **Let the script pick what a person would fudge.** Actuator anchors come from `actuators.search` over every action;
  the build fails if no anchor pair keeps a rod in its barrel.
- **Every part rides exactly one bone; no part shares a bone's name.** (asserted)
- **Bodies are possible.** Each limb bends one way only — never past straight the other way (`bends`), never folded
  past 165°; front / back / left / right agree on the turnaround; it walks where its head points.
- **Weight sets timing; every idle breathes; moves gather first and overshoot on the way back; planted feet never
  slide; loose parts follow through** (whiskers, antennas: `lag` extras with a soft limit). references/MOTION-QUALITY.md
  at the repo root.
- **Generated media is reference only.** Image or video model output lives in `refs/` (git-ignored), is read for
  shapes and timing, and is never committed or put in `docs/`. ElevenLabs or any paid generator only after the owner's
  yes for that request.
- **Deterministic.** Every pose is a function of time; the same spec gives the same machine (`determinism`).
- **Checks gate the reel.** A failing check is fixed (or the reel is called a draft); differences from references are
  written down, not left for someone to find.
- **Sizes.** The player's `.glb` is exported without bevels at every 2nd frame (≈ 1–2 MB). No MP4 in `docs/`.

## Checks (`machine.py check`)
`parts` · `bake` (Blender's evaluated pose = kinematics, mm) · `reach` (no limb target clamped) · `bends` (no reversed
bend, fold ≤ 165°) · `limits` (hinge ranges, against `limits` when given) · `feet` (planted-foot slip and ground
contact in mm, lowest swinging toe) · `support` (≥ 2 feet down for 4 legs, ≥ 3 for 6+) · `actuators` (min rod overlap
≥ 15 %, min lever arm) · `clash` (part vs part on different bones through every action, new contacts vs rest) · `idle`
(body, head and lights move) · `move:<name>` (anticipation ≥ 4 %, recovery overshoot ≥ 3 % of the main channel) ·
`loops` · `facing` · `determinism`.

## Contract
- `machine.py`: `MACHINE` dict (references/MECHANISMS.md lists every key) and `build(k)`; optional `DESCRIPTION`
  (used by `jobs`). World: metres, +X forward, +Y left, +Z up, ground z = 0.
- Bones: `root`, `body`, per limb `hip_<L>`, `thigh|shin|tarsus_<L>` (arms `upperarm|forearm_<L>`), `foot_<L>` /
  `hand_<L>`, `digit<i>_<L>`, `act_<joint>_<L>_cyl|_rod`; `neck_01…`, `head`, extras by name. Limb bone frames: X = pin
  axis, Y along the segment, Z its in-plane front; feet / head: X right, Y forward, Z up.
- `.blend`: collections `Machine` (armature `rig` + parts, each with `bone`, `stage`, `mats`) and `Studio` (`Cyc`,
  `Key`, `Fill`, `Rim`, `Figure`); actions `A_walk A_idle A_<move>` (in place, keyed every frame from frame 1).
- `.glb`: Y-up, one animation per action. `machine_info.json`: `parts, bones, actuators{anchors, Bl, Rl, lever,
  range}, walk{cycle, duty, stride, speed, offsets}, actions{frames, dur, loop, speed, light[]}`.
- Player: `index.html?src=<dir>&action=<name>` loads `<dir>/machine.glb` + `meta.json`; `window.action(name)`,
  `window.seek(t)`, `window.DURATION`, `window.__ready`; `?capture` hides the controls.
