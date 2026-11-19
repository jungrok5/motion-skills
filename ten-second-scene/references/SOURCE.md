# SOURCE — the post this skill was made from

Threads post by @yunseul_ai, shared as https://www.threads.com/share/BAbvjED_BX (read 2026-11-19 from the owner's
screenshots; the post itself is not visible to logged-out readers), and its video, shared by the owner as a screen
recording. A first post and two follow-ups in the same thread,
then answers to comments.

## What the post says, beat by beat
1. Three ten-second videos made **with Claude Code alone — no video AI** (and, from the same author's other posts, no
   image model). The working method is the one a recent model uses when it paints: a rain-swept alley, a starry night,
   and a crosswalk crossed by more than 2,000 people.
2. The starry night has **more than 60,000 brush strokes**; on the crosswalk **each person moves separately**.
   Each piece took **30 minutes to an hour**.
3. The prompt (translated): *"Make a 10-second scene in one HTML file. Don't use video AI, image generation models or
   outside images — draw the picture and the motion entirely in code. Someone seeing it for the first time should feel a
   person made it with care; if it looks like a demo made with code, it has failed. Don't render once and stop — take time."*
4. Tools differ per piece: the alley in **Canvas 2D**, the starry night in **WebGL**, the crosswalk in **three.js**. All
   three are **one HTML file each**, and frames were captured into a video.
5. The method: **render, pull any five moments and look at them at 100 %, write down where they break the criteria,
   fix, render again — repeat until all five pass.**
6. The criteria are five: **density, light, people's proportion, weight of motion, colour.** That is why the night sky
   was corrected 34 times and the alley and the crosswalk more than 20.
7. From the answers: strokes are not ribbons — size and colour vary, heads rounded, tails thinned, and strokes laid over
   each other by the light give thickness (an oil look). Cutting ten-second shots together makes longer films (token
   cost is the limit). Photo-real people do not animate well this way; cel-like animation does. The author also notes
   that a model tends to miss things a person would fix in one pass and fix them again later, so a count like "34" is
   partly that — and some work still gets finished by hand.

## The video (screen recording the owner shared, 21.7 s, 1080×2340)
https://drive.google.com/file/d/1ns7arhoD70a2yHjp-F3wUkHOR4XRrxq8/view?usp=drivesdk — a phone recording of the post
playing two of the three films (the starry night shows only as a thumbnail). Kept as a reference outside the repo.
- **「AFTER THE RAIN」 — "a Seoul alley at dusk"** (Canvas 2D). A high three-quarter view down onto a corner: a lit
  snack bar with a striped awning on the corner, signs with hangul, rooftop water tanks and aerials, a red church cross,
  tangled power lines and poles, a ginkgo in autumn. The street is wet: every light becomes a long reflection and a few
  puddles. People with umbrellas, bags and a suitcase cross, a scooter passes; the dusk sky is violet with lit cloud.
- **「THE CROSSING」 — "two thousand people, one green light"** (three.js). Straight down onto a wide crosswalk at
  night: cars with headlights and tail-lights wait, the crowd on both pavements is dots of hair and shoulders with a
  few red umbrellas, street lamps and tree pits make pools of light; on the green the crowd floods across. The camera
  then tilts up to reveal a lit station facade with a fan window and a screen.
- **The opening.** Each film opens on a title card over the scene that is already running: spaced serif capitals, a
  short rule, an italic subtitle, and a small spaced credit line at the foot; it fades within about two seconds.

## What this skill takes
- The format: ten seconds, one HTML file, everything in code, a renderer chosen per scene, frames captured to video, and
  the opening title card (the kit's `card`).
- The prompt's bar: "looks like a code demo = failed", "don't stop at one render".
- The loop and its five criteria — as `audit.mjs` (random moments, 100 % crops, a round table), the rubric in
  `references/BRIEF.md`, and the done-condition in `check.mjs`.
- The stroke anatomy (varied size and colour, round head, thin tail, light-built impasto) — `lib/brush.js`, `lib/strokes-gl.js`.
- Crowds where each person moves on their own — `lib/body.js` actors.

## What it does not take
- The three pictures (the alley, the night sky after the famous painting, the crosswalk), their titles and credit
  wording — the examples here are new
  topics: a first bus at a snowy stop, a sunflower field in wind, a stadium wave.
- The author's own videos, frames or prompt wording beyond the quoted method.
- Model names: the method is model-agnostic; the loop is what carries the quality.
