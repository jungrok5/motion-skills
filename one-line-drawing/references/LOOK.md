# LOOK — the acts, the constants, the sound

## Acts (seconds; `timing` in piece.html)

| act | default | what |
|---|---|---|
| `intro` | 1.8 | the whole tablet (zoom 1): desk, bezel, the grey photo; the stylus slides in from the lower right and settles on the start |
| `draw` | 46 | the one line. The camera pushes to `zoom` (2.4) over ~2 s and rides behind the nib; breathers pull back to ~0.58 × zoom for ~2.6 s where the line moves to a new tag (`breathe: 'auto'`, or times in s from the start of the drawing, or `[]`) |
| `pull` | 1.9 | the stylus lifts away, the camera eases back to the whole tablet |
| `fade` | 1.5 | starts a third into `pull`: the photo fades to white |
| `clean` | 0.9 | the tablet and desk turn into the clean white page at 1:1 |
| `sign` | 1.5 | the looped signature (and the user's handle, if given) |
| `hold` | 2.6 | the finished drawing, still |

## Constants

- Frame 1080 × 1920, 30 fps; the page is the same size, so the clean shot is the page at 1:1.
- Tablet: page scale 0.86 at zoom 1, bezel 46 px, body `#1b1b1d`, desk `#121213`, camera dot at the top.
- Ink `#141414`, base width 3.6 page px; heavier where the hand slows (× 0.8–1.2), tapered over the first 40 / last 60 px.
- Pace: `PACE` per kind (lines 1.25, sweeps 1.12, contours 0.9, loops 0.62 …) ÷ (1 + 9 × curvature), smoothed, eased to
  0.35 into the start, the end and every pause; scaled so the drawing lasts `timing.draw` (or 340 px/s if `draw` is null).
- Hand wobble: ±0.8 px across the travel, a slow drift (140 px) and a faint tremor (23 px).
- Camera: a critically damped spring (ω 2.6) toward the nib 0.35 s ahead; the nib is held inside the middle 70 % of the
  frame; the view stays over the tablet.
- Stylus: 640 × 30 page px, white barrel with a soft grey underside, grey cone and tip; leans 0.62 rad (body to the lower
  right) ± a slow drift; lifts in pauses (shadow grows and slides).
- Photo: sky gradient → bright fog at the horizon; ground by kind (wet patches and speckles, long water glints, field
  tufts, snow); shapes in `mix(#1f1f20, fog, .1 + .8 × depth)`, blurred 0.5 + 5 × depth px; wet and water reflections
  flipped about each ground, stretched 1.15, broken into rippling rows; horizon haze, vignette, grain. Mean luma ~160–190.

## Sound (`scripts/sound.mjs`, from `window.soundEvents()`)

- The nib on glass: noise through a 3.6 kHz and an 820 Hz band-pass, loudness from pen speed (silent in pauses).
- A tap when the nib touches down (start, after each pause).
- Felt piano: a slow pentatonic walk, one note every ~1.7 s; a C-major chord rolls in as the photo fades.
- A quick lighter scribble for the signature; a short echo; room tone; a 1.2 s fade at the end.
- `--silent` leaves it out; `--audio music.wav` mixes the user's own track under it.
