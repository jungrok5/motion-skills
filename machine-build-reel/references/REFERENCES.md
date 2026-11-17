# REFERENCES — generated images and video, permission, the code-only path

The source spent most of its effort on references: one concept turned into a turnaround, single views and a
close-up plate per mechanism, each generated from the ones before it, each approved by a person. This skill keeps
that path but never takes it on its own.

## Permission first
Image and video models cost the owner money. Before any call, say **what** (which images / clips), **which model**,
**how many takes**, **roughly what it costs**, and wait for a yes. A yes covers that request only. **ElevenLabs (any
tool: image, video, speech, sound, music) only after the owner says yes for that request** — no answer means no
call. Without a yes, run code-only.

## The jobs
`machine.py jobs` writes `refs/jobs_concept.json`, `jobs_turnaround.json`, `jobs_views.json`, `jobs_plates.json`
from the machine's `DESCRIPTION`, its scale and its `plates` — prompts only, nothing is called. Each job lists the
images it must be given as references (the chain that stops drift). Prompt habits:
- Say the scale ("about 25 m tall; a 1.75 m person beside it; joint housings 1.0 to 2.3 m across").
- Plates: "studio product render of the <mechanism> for a 3D modeller, every part readable and physically
  plausible as real heavy engineering, flat grey, no labels".
- Keep a person in the concept; keep the turnaround clean (flat grey, no shadows, no labels).

Save the results as `refs/concept.png`, `refs/turnaround.png`, `refs/front.png left.png three-quarter.png …`,
`refs/plates/<plate name with _>.png`. The reel picks them up automatically ("reference" in the pairs).
`refs/` images are git-ignored (`new` writes the `.gitignore`; the `jobs_*.json` prompts are kept): generated images are references, never committed, never in `docs/`.

## Using references in the build
1. Measure off the single views (pixels per metre from the figure; ground and top lines; where each joint sits) into
   PARTS.md.
2. Where views disagree, write which one wins.
3. After the build: `machine.py sheet` and the reel's `compare` boards put each plate beside its reference. List every
   difference in BRIEF.md's table — fixed, or accepted with a reason. The source's own notes did this ("plainer than
   its plates in the hands, elbows and feet").

## The code-only path (default)
No generator, no downloads: the brief and PARTS.md carry the design; the **design sheet** (orthographic Freestyle line
drawings with height, length, stride, cycle) stands in for the concept; each plate's **line drawing** (same camera,
flat paper, ink lines) stands in for its reference and is labelled "drawing" — never "reference". The checks do the
"checking every part" the source did against images: collisions, rods, reach, bends, feet.
Freestyle needs an OpenGL context: on a machine without a GPU install Mesa EGL (`apt-get install libegl1
libegl-mesa0 libgl1-mesa-dri`).

## Motion clips
Same rules: owner's yes, `refs/motion/`, read for timing (frame strips), never tracked or committed; the timings go
into `moves` key poses and the model / prompt / take into BRIEF.md (references/MOTION.md).
