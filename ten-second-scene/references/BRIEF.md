# BRIEF — topic → one ten-second scene

Write `BRIEF.md` in the project **before any code** (`new-scene.mjs` copies the template below). The brief is where a
topic becomes *this* scene: what the one image is, what moves in it and why, which tool draws it, and what each of the
five criteria means for it. The audit rounds are judged against the brief, so be concrete — "rain" is not a brief,
"rain that you only see where it crosses the sign light and in rings on the puddles" is.

<!-- template -->
# BRIEF — 「title」

## The scene (one line)
What the viewer sees in ten seconds, in one sentence a stranger would repeat.

## Why this topic, this image
- The moment: when and where exactly (hour, weather, season, place).
- The one thing that makes it worth ten seconds (the beat: something arrives, turns, is revealed, or simply breathes).
- What a person who knows this place would check first (the details that prove someone looked).

## Frame
- Size: 1080×1920 (9:16) unless the topic needs 1920×1080 · 30 fps · 10.0 s.
- Camera: where it stands, height, lens (fov), the one move it makes (push, drift, rise, none) and its easing.
- Composition: where the eye lands first, second, third (three depths: near / middle / far).

## Tool (one per scene)
- `canvas2d` (illustrated, many small hand-made things, signage, rain, reflections) · `webgl` (a painting: tens of
  thousands of strokes, shader motion) · `three` (a real 3D space, hundreds to thousands of individually moving
  things, a camera that moves through depth). Why this one.

## Timeline (seconds)
| t | what happens | what the eye does |
|---|---|---|
| 0.0 | the first frame is already a finished picture (no blank, no fade from black longer than 0.4 s) | |
| … | | |
| 10.0 | the last frame is a picture too (it may loop) | |

## The five criteria, for this scene
| criterion | what passing means HERE (concrete) | the likely failure to watch for |
|---|---|---|
| density (밀도) | | |
| light (빛) | | |
| people / proportion (사람 비례) — or scale, if there are no people | | |
| weight of motion (움직임의 무게) | | |
| colour (색) | | |

## Cast (if anyone moves) — references/BODY.md
| who | height · mass | clothes / colours | idle (what breathes, shifts, looks) | stance and gaze per beat | big move: anticipation → action → recovery |
|---|---|---|---|---|---|

## Palette
5–9 named colours with hex, which light each belongs to (key / fill / practical / shadow), and what is NOT in it.

## Not in this scene
Things that would make it read as a code demo for this topic (perfect gradients, evenly spaced copies, pure hues,
everything moving at one speed, …) and anything taken from an existing artwork or brand.
<!-- /template -->

## Rubric — how a round is judged (five moments × five criteria)

Look at each moment **at 100%** (`audit/round-NN/tNN.png` and the three crops beside it), not the downscaled sheet.
A cell is ✓ only if a stranger seeing that crop alone would think a person spent hours on it. Write ✗ with what is
wrong in words you could fix from ("lamp cone has no falloff — hard edge at 0.4 m", not "light bad").

| criterion | ✓ looks like | ✗ looks like (the "code demo" tells) |
|---|---|---|
| **density** | detail at every scale: big shapes, then things, then wear, texture, small incident; no area that is one flat fill; detail where the eye goes and quieter (but not empty) elsewhere | flat fills, perfect gradients, empty corners, the same element copied at even spacing, detail only at one scale |
| **light** | one clear key with falloff; practical lights that light *things* (wet ground, faces, walls); shadows with colour; highlights that are rare and earned; air between depths | everything lit evenly, glows pasted on without lighting anything, black shadows, no falloff, every surface the same brightness |
| **people / proportion** | adults ~7–7.5 heads; people scale with depth and with doors, steps, cars; poses with weight on a foot; the right number of people for the place and hour; no person deformed or cut oddly — without people, the same for objects (a door is a door's size) | dolls, giants next to doorways, everyone the same height and pose, floating, sliding, legs bending the wrong way |
| **weight of motion** | heavy things start and stop late, light things flutter; overshoot and settle; anticipation before big moves; nothing moves at one constant speed; idles breathe; different things move at different rates | linear tweens, everything on one sine, feet sliding, instant starts and stops, a frozen person, one global wiggle |
| **colour** | a palette with a reason (the light's colour and its complement in shadow); limited saturated accents; values grouped; colour varies inside every area | pure #f00/#0f0/#00f, rainbow noise, grey mud, every object its own unrelated hue, no warm/cool split |

The measured numbers (`flat`, `p1–p99`, `litPlace`, `hueEntropy`, `clip`, `slide`) are hints for where to look; a
cell is decided by eye. A round passes only when **all 25 cells** are ✓ in the same round, on the current file.
