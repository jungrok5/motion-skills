# LOOK — the form, observed from the source

Source: Kimo (@asynkimo) on X — https://x.com/asynkimo/status/2121716250820964431?a=8jjw0gVhdGPGqgSNo04&s=19 — "You can
turn pixel art to any angle with sprite stacking", a 17-second, 1920×1080, 60 fps silent clip. Watched as a reference
(frames kept outside the repo); nothing from it is reused — not its car, its track, its colours or its words. What this
skill takes from it is the *form*:

| t (s) | what happens | what the skill keeps |
|---|---|---|
| 0–1.5 | a white page; a blue car's slices fly together in the air, the wheels as separate dots below, then the car turns | opening on the object being assembled / turning |
| 1.5–6 | a green field with a race track (asphalt, red-white curbs) shatters in in big triangles; the car drives the track, the track turns under it, a soft drop shadow | the shard transition into the world, the camera turning with the mover, the footprint shadow |
| 6–8 | caption **"Draw the car from 4 sides"**: top (front up), side, front, back drawn in a row on white | the `views` beat: four orthographic views in a row with labels |
| 8–11 | caption **"Each row of the side view becomes a slice"**: a blue scan line across the side view; the top view in the middle; on the right the stack builds slice by slice, the newest one hovering above | the `slices` beat: scan line, the top view masked by the row (the slice), the stack growing with the next slice dropping in |
| 11–14 | caption **"Stack the slices 1 px apart and turn them"**: the stack closes and turns | the `stack` beat: spread → 1 px, then a turn |
| 14–17 | the car at a few angles on white, then back to the track | the `turn` beat, and back to the world |

## The style rules that follow from it
- **One pixel size per frame.** The art is a 480 × 270 canvas (×4 = 1080p). A beat may zoom by an integer (the whole frame
  scales), never one object alone. No smoothing, no sub-pixel drawing; rotation is nearest-neighbour sampling per slice.
- **Slices go straight up the screen**, `lift` px per slice (1 by default, as in the source), whatever the camera's turn:
  that is the sprite-stack "camera pitch". The ground is not foreshortened.
- **Light from one side for the whole film** (default upper left). Lateral faces turned toward it keep their colour, the
  ones turned away drop one or two steps (`shade`), so the light *moves across the object* as it turns. The shadow is the
  footprint, offset away from the light, darkening what is under it.
- **The four views are drawn pixel art** with an outline colour, 2–3 tones per material and one accent — the same rules a
  sprite artist uses. They are shown on screen, so they must read on their own.
- **Captions are plain, centred, at the top**, one short sentence each, the same language through the short; on paper dark
  ink, over the world light text with a dark edge. Labels under the views are small.
- **Paper** for the explainer beats: one warm off-white, nothing else on it but the object, its shadow, the scan line and
  the labels.
- **The world is small and alive**: water glints, wakes and dust trails, buoys and flags sway — and the hero is never still
  (it moves, rocks or idles).
- **Shards**: a 12-column triangle grid switches from the middle outward, ~0.6 s.

## What is designed per topic (never copied)
The hero and its four views, the palette, the props, the ground materials and places, the course, the camera, the beat
lengths, the captions and their language, the tune and the engine. A car on a race track is the source's subject — do not
make it unless the user asks for exactly that, and even then design your own car and track.
