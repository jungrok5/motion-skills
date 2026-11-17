# SHOTS — the film grammar

A walking-colossus film is about **scale**: every shot answers "how big is it, and how heavy?" The source film
does it in nine beats, ~5 s each, 45 s, cut on footfalls. Keep the nine beats (the style); design what each one
shows for the topic.

| # | beat | camera | scale cue | cut on |
|---|---|---|---|---|
| 1 | **open** — something huge in the haze | lens at ground level (0.4 m) far ahead, long lens, rack focus from something tiny (a blade, a stake, a puddle) to it | the tiny thing in focus first | fade in |
| 2 | **side** — the whole thing | long lens (fov 27–30) from 150–180 m, slow truck | the full silhouette, legs working | a touchdown |
| 3 | **hero** — low 3/4 | 1.5–2.5 m high, 80–100 m out, it walks toward and past | the horizon line at its knees | |
| 4 | **foot** — a foot lands by the lens | worm's-eye 10–15 m from a foot that plants mid-shot (from `check.mjs --events`), shake 2+ | the claws filling the frame, debris, splash | the slam |
| 5 | **belly** — it passes overhead | on the ground looking straight up, fov 60 | the underside sliding over, lamps, drips | |
| 6 | **life** — it is inhabited | drifting up its face from ~15–30 m | windows, things people left out, loose parts swinging late | |
| 7 | **machine** — knee, pistons | 25 m from a leg as it lifts and slams | hydraulics, hoses, grease | a lift-off |
| 8 | **mirror** — reflection | 1–1.5 m over water (a hero puddle in `GROUND.hero`), a foot plants behind it | the reflection doubling it | |
| 9 | **away** — it walks on | crane rising behind it as it leaves into the haze | it shrinks into the fog | fade out |

## Writing a shot

```js
f_foot: { cam: (tl, t) => {                    // tl = time inside the shot, t = film time
  const k = ease(tl / 4);
  return { world: true,                        // world coords (stays on the ground); omit = path frame (travels with it)
    pos: [80.5 - 1.0 * k, 0.55, 33.0], tgt: [69 - 2 * k, 7.5 + 3.5 * k, 21 - 6 * k], fov: 56,
    shake: 2.2,                                // × footfall shake near the camera
    dof: { focus: 14, aperture: 1.6 },         // metres, blur strength
    post: { fade: 1 } };                       // also exposureMul, fogMul, mistMul, letterbox
} },
```

- **One move per shot**, eased. Long lenses for size, wide lenses only close to the thing.
- **Path frame vs world**: things on the ground (a puddle, a foot, a stake) need `world: true` and coordinates from
  `--events`; things on the body (a balcony, the funnel) use the path frame (`P(t)` = walker x).
- **Aim at real events**: `node <skill>/scripts/check.mjs --events` lists touchdowns per shot with world x, z.
  Put the hero puddle (`GROUND.hero`) and the dressing (`GROUND.dressing`) where the lens is, and keep the scatter
  out of the lens with `GROUND.keepClear`.
- A handheld drift (0.12°) is added to every film shot; shake comes from footfalls near the camera.
- Keep the camera above ground and outside the box — `check.mjs` fails otherwise.

## Checking by looking

1. `shot.mjs --board --n 1` (one frame per shot, contact sheet) → fix framing.
2. `shot.mjs --board --n 3` (start / middle / end) → the move holds the subject, the foot lands in frame.
3. `shot.mjs --shots f_foot --ts 17.9,18.2,18.5 --sheet` around a footfall → the slam reads, debris flies.
4. Score the stills with the rubric in BRIEF.md and write it into the project's BRIEF.md.
