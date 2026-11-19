# SOURCE — the post this skill was made from

Threads post by @yunseul_ai, shared as https://www.threads.com/share/BAbvjED_BX (read 2026-11-19 from the owner's
screenshots; the post itself is not visible to logged-out readers). A first post and two follow-ups in the same thread,
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

## What this skill takes
- The format: ten seconds, one HTML file, everything in code, a renderer chosen per scene, frames captured to video.
- The prompt's bar: "looks like a code demo = failed", "don't stop at one render".
- The loop and its five criteria — as `audit.mjs` (random moments, 100 % crops, a round table), the rubric in
  `references/BRIEF.md`, and the done-condition in `check.mjs`.
- The stroke anatomy (varied size and colour, round head, thin tail, light-built impasto) — `lib/brush.js`, `lib/strokes-gl.js`.
- Crowds where each person moves on their own — `lib/body.js` actors.

## What it does not take
- The three pictures (the alley, the night sky after the famous painting, the crosswalk) — the examples here are new
  topics: a first bus at a snowy stop, a sunflower field in wind, a stadium wave.
- The author's own videos, frames or prompt wording beyond the quoted method.
- Model names: the method is model-agnostic; the loop is what carries the quality.
