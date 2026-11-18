# SOURCE — what this skill was made from

- **The post:** apek (@apekshik), X, 2026-11-16 —
  https://x.com/apekshik/status/2122464141990588795?a=wPnMYQkwOmHrLCQmpTA&s=19
  > i built a 100-foot walking robot in Blender, entirely from code, using AnyMachine … anymachine starts from a single
  > reference image. from that it generates more references: frontal, side, top, three-quarter, then a close-up of
  > every joint. Fable 5.2 then takes those and builds it out completely, not as one mesh but as individual parts. for
  > my stilt walker that was 160 unique parts, a fully working hydraulics, a full rig and a walk cycle. the real work
  > was the pipeline: references good enough to model from, and checking every part against them.
- **The repository it links:** AnyMachine — https://github.com/apekshik/anymachine (MIT). `PIPELINE.md` is the
  method; `stilt/` the worked example (a 2,200-line `build_stilt.py`, 40 reference images, `PARTS.md`, a clash check,
  a GLB verify). Read 2026-11-17; nothing was copied from it — the code here is new, the Stilt's design is not reused.
- **The video** (87 s, 1280×720, read from 1-fps contact sheets; it stays in scratch, never in the repo):

| time | what is on screen | here |
|---|---|---|
| 0–16 s | grey studio, floor sweeping into a wall, soft key; the white-and-black 30 m walker walks in place, a small orange figure at its feet; fade to dark | reel `walk` (the machine travels past the figure) |
| 17–30 s | narrow frame: parts arrive — feet, legs, the body, shells, head; the sensor lights come on last | reel `assembly` (stages, lights last) |
| 31–43 s | closer and lower, the walk among the legs, the knees and their drums big in frame | reel `stride` |
| 44–53 s | close on the head on its curved neck: it lifts, blue lights flicker on, it looks left, right | reel `head` (`wake` move) |
| 54–60 s | the concept painting (two walkers in fog, a person for scale); the turnaround on grey | reel `sheet` (refs/concept.png, else the design sheet) |
| 61–64 s | a grid of close-up plates of every mechanism | reel `plates` |
| 66–79 s | pairs: reference plate on the left, the built model framed the same on the right, a dip to dark between pairs | reel `compare` |
| 80–86 s | full views, reference beside model (front, side, three-quarter) | reel `compare` (views) |

## What was taken
- **The method** (PIPELINE.md here): concept → turnaround → single views → one close-up plate per mechanism, each made
  from the ones before → a parts breakdown with the load path *before* geometry → one build script → check renders
  framed like the references → motion read from video clips (timing, not tracking) → a clash check → export and verify.
- **The habits** in the build script: every joint a mechanism; actuator anchors picked by sampling every action
  (rod inside the barrel, largest lever arm, the build fails otherwise); rigid parts on exactly one bone; assert the
  rules; write the numbers out (`machine_info.json`).
- **The look and the reel grammar:** grey cyclorama, soft daylight, white ceramic over black carbon, blue sensor
  lights, the orange scale figure, dips to dark between sections.

## What is this repo's
- The engine (planar limb kinematics with closed-form IK, the stateless gait, key-posed moves, the anchor search, the
  checks, the reel renderer, the player), the stock mechanisms and finishes, the code-only path (Freestyle line
  drawings and a design sheet standing in for generated references), the starter WADER and the worked example
  RIDGE HAULER.
- The rules about permission (no paid generator without the owner's yes), committed media and motion quality.
