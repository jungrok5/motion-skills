# The brief

Write `BRIEF.md` next to the page **before any code**. `check.mjs` fails without it, without any of the sections below,
or with a `TODO` left in it. The brief is where the topic becomes *this* scene: a new place, two new printings, a new
clue, a new cast, new beats. The starter and the example are examples of the style, not menus.

## Template

```markdown
# <title> — brief

## Topic
- What happens, in one sentence; whose story it is; the mood (a family mystery, a quiet grief, a small wonder, dread)
- The label (the place name, 1–6 syllables, set vertically top right) and the caption (the small title line at the foot)
- Length (9–18 s) and what it must not become (a jump scare, gore, words on screen beyond the label / caption / a slip,
  a recreation of the source)

## Place
- One place in the folded view. What stands on the wall line, face on (walls, windows, doors, shelves, a building)
- What lies on the floor, in plan (tiles / planks / earth / grass, rugs, a table top, a track, puddles) and what stands on
  it in elevation (chairs, a chair-like thing, a swing frame) — with its ground line G
- Where the wall meets the floor (floorY, 0.3–0.78 of 1080); a sheared side wall if the room needs one
- What stands in front of the figures (the `front` layer), if anything
- Palette (4–6 muted inks) and the accent: crimson, and the one thing it belongs to

## Two printings
- **A, now** — time, light, colour, what is worn / broken / missing, what moves (rain, a cone, ripples)
- **B, then** (or before / another season) — the same layout printed again: what is different and why
- **The change when A returns** — the one thing, in crimson, where it is, how it prints in

## Cast
- For each figure: name, height (px), mass, head scale (children 1.2–1.35), hair, clothes, what they carry, which
  printing it lives on, its idle (breath, blinks)

## Beats
| t (s) | beat | stance · gaze | anticipation | action | recovery |
|---|---|---|---|---|---|
| … | now | | | | |
| … | shift | | | roller → | |
| … | then | | | | |
| … | return | | | ← roller | |
| … | after | | | | |
| … | hold | | | | |

An opening hold ≥ 2.5 s, ≥ 2.5 s on B, ≥ 2 s after the return. At least one keyed big move (antic → big → settle).

## Motion
- Walks: from → to, steps per second (1.3–2.6); turns: from → to yaw, stepped
- The big move(s): keys and times; what trails (coat, cloth, hair)
- Reference: hand-keyed, or a video-model clip of *your* figure (model, prompt, take) kept out of the repo —
  ElevenLabs or any paid generator only after the owner says yes for that request

## Sound
- Ambience (each may play only on A or only on B: `{ type, from, to }`), surface for footsteps
- Events with times; music: none (default) or piano, and why

## Review
| round | what looked wrong | fix |
|---|---|---|
| 1 | | |
```

## Rubric — score the stills and the contact sheet

Render `--sheet 12` and stills at the touch / look, the big move, the change, the hold. Pass / fail each line; fix the
worst fail first.

1. **The folded view.** The wall is face on; the floor is laid flat with rows parallel to the frame; nothing converges
   to a vanishing point; a figure further back is higher, not smaller. It looks like a plate, not a photo of a room.
2. **Printed, not filled.** Every surface has the ragged edge, mottle and speckle; wood has grain, glass has scratches,
   light falls in chalky cones; no clean vector fill anywhere.
3. **Muted, one accent.** Mid-tones throughout; crimson only on the clue. Squint: the eye goes to the clue first.
4. **The people of the style.** Tall, thin, long neck, small long face with a flush; flat clothes; a dark blot shadow.
   They read against the plate (not dark on dark).
5. **Two printings of one block.** B has the same layout; the difference is time, light, colour, state — and it tells
   something.
6. **The change reads.** On the final hold, someone who saw A first can point at what is new without being told.
7. **Bodies are possible.** Knees fold back, feet planted, the near arm on the facing side, hands reach what they hold;
   turns are stepped. "Does anything float, skate, or stand dead still? Does the big move gather and land?"
8. **Locked camera, one shot.** Nothing moves the frame; the label and caption are legible on both printings.
9. **Quiet sound.** Tone under every second; the roller swells at each printing; steps land on heel strikes; no clip.
10. **New.** Nothing taken from the source (no mansion with a pool and red vines, no 마마 characters, no 김도윤 plate) or
    from the starter / example unless the brief says why.
