# LOOK — the engraver, the card look, cel paint and the frame

## The engraver (`Plate.done`)

Per pixel, from the tone map (R = tone, A = cut) and the style map (R = angle, G = gap × 16, B = wave):

- `u = across / gap + noise · 0.22 + wave · 1.1 · sin(along / 7gap + across / 23gap)` — parallel lines, wobbling a hair.
- line half-width `= 0.5 · tone^0.82 · swell` (swell ±18 % along the line: the burin's pressure), never under ~0.75 px.
- `tone < 0.24` → long dashes (9 gaps) kept with probability tone / 0.24, tapered at their ends.
- `tone > 0.58` → a crossing set at +76°, growing to 0.95 half-width at 0.94; `tone > 0.94` → solid.
- Ink `rgb(26,25,24)` on paper `rgb(247,245,239)`. A plate's `ink` is the share of inked pixels.

### Tone habits (the bar every new subject meets)
| part | tone | lines |
|---|---|---|
| sky (top → horizon) | 0.2 → 0.02, clouds' bellies 0.3, crowns 0 | horizontal, gap 2.6, wave 0.5 |
| lit walls | 0.15–0.35 (gradient left → right) | horizontal |
| shade sides, roofs | 0.45–0.7 | diagonal 60–70° or horizontal, denser |
| openings, glass | 0.75–0.9, lighter at the bottom | vertical |
| ledges, sills, cornices | paper white, with a 0.7–0.8 band under | — |
| foliage clumps | radial 0.12 → 0.8 from the upper left | 30° ± 15, wave 0.35 |
| water | 0.25 → 0.75 downward, white crests | horizontal, wave 0.8 |
| far things | lighter (0.1–0.3), finer gap | as near |
| outlines | tone 1, 2–3 px near, 1.3 px far | — |

## The card look (world.js shader)

- Haze: `smoothstep(near, far, depth) × strength` mixes toward paper (set per set: `haze: [near, far, strength]`).
- Depth of field: the out-of-focus copy (`plate.blur`) is mixed in by `(focus·0.5 − depth) / (focus·0.32)` in front and
  gently behind `3.5 × focus`.
- Paper-lift shadow: a blurred silhouette at 20 % ink, behind and down-right by `lift` (≈ 4 % of the card size).
- Colour management is off: what the plates paint is what the frame shows.

## Cel paint (rig.js `cel`)

- Fill the shade colour, then the base colour shifted toward the light (upper left of the SCREEN, whatever the part's
  rotation or mirroring) and clipped to the shape: a crisp shade edge on the far side. Shades lean a little cool.
- Outline `#2a201e`-ish, 2.2 px at the character canvas, round joins. Eyes: white, iris, pupil, one highlight, an upper
  lid line; blink squashes them to a curve.
- Far limbs are a touch darker than near ones so the two never merge.

## The frame

- Making-of: 1920 × 1608 — the comp (1920 × 804) on top, a 2 px dark rule, the breakdown (1920 × 804) under it with a
  small monospace label (set, card count, camera, time). Film: the comp alone (1920 × 804).
- Breakdown: the transparency checkerboard (16 px white / #e4e4e4), no haze, no depth of field; every card outlined in
  its layer colour with corner and centre handles; the shot camera as a green frustum, a grey aim line to its look point,
  an orange target dot and its magenta path over the shot.
- 24 fps, hard cuts, a paper flip on each cut.
