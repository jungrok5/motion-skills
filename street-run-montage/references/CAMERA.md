# CAMERA — the shot grammar

A shot is `{ beats, cam, …params }` in `F.shots([...])`. Film time is cut into shots of whole beats (so every cut lands
on the beat); story time — where the ride is — runs on from shot to shot. `rate: .5` plays a shot at half speed (slow
motion; story time advances half as fast), `back: .3` starts a shot .3 s of story earlier than the last one ended
(repeat the action across a cut), `tau: 12` jumps story time.

## The rigs (lib/film.js `CAMS`; every value can be overridden in the shot)
| cam | where it is | use it for | defaults |
|---|---|---|---|
| `wide` | fixed, down the street ahead (`lead` m) and a little aside (`d`), long lens | the opening, a new place | lead 20, d 1.8, h 2.2, fov 22 |
| `side` | tracking alongside at `d`, `h` | cruising, a carve, a point | d 3.4, h .95, fov 38 |
| `low-side` | tracking at board height, wide lens | speed, a kickflip, a grind | d 2.0, h .16, fov 64 |
| `front` | tracking ahead, looking back at them (`x` aside) | coming toward us, pushing | d 3.6, h .75, fov 42 |
| `low-front` | the same, low and wide | downhill, the companion beside | d 2.3, h .14, fov 68 |
| `rear` | following behind | a manual, away into the place | d 3.4, h 1.25, fov 46 |
| `feet` | beside the board at deck height | the push, the grind sparks, the stance | d .95, h .12, fov 48 |
| `face` | in front of the face (where the head points) | a look, a reaction | d 1.15, h 1.35, fov 34 |
| `buddy` | tracking the companion low | the companion's own shot | d 1.25, h .2, fov 52 |
| `worm` | fixed on the ground under the jump (`atTau`, `lead`, `x`) | the biggest air, against the sky | h .06, fov 74 |
| `pass` | fixed beside the path, panning as they pass (`anchor`, `lead`) | a whoosh past, entering a place | d 3.2, h .9, fov 44 |
| `overhead` | high above, a little behind | a tuck, the geometry of a place | d 1.2, h 7.5, fov 40 |
| `orbit` | circling from `a0` to `a1` degrees | a shuvit, a turn | d 2.8, h 1.0 |
| `hero` | fixed, low, in front (`anchor`) | the stop and the cheer, the destination behind | d 3.2, h .55, fov 34 |

Common params: `side` (±1, which side of the path), `look` (`rider` · `buddy` · `board` · `head` · `both`), `ly` (aim
higher / lower), `push` (dolly in over the shot, 0–1), `drift` (slide along the path), `roll` (degrees, `rollK` eases it
out), `shake`, `offset` ([x, y, z]), `through: true` (allow the camera inside a solid — rarely), `blur` (streak amount),
`lines` (anime speed lines 0–1), `in: 'flash' | 'dip'`, `out: 'flash'`, `fade` (seconds to white at the end), `shadow`
(shadow frustum half-size). Fixed rigs are placed from the subject at `atTau` (story time) or at `anchor` (0–1 through
the shot, default .5).

## Cutting
- 1.5–3 s average (3–6 beats at 120 bpm), the opening and the end longer (8–10 beats).
- Change the camera *kind* at every cut; alternate sides and heights (low ↔ high, near ↔ far, left ↔ right).
- Cut **into** a trick just before the pop (½–1 beat), so the gather is seen; let the landing settle before the next cut.
- Slow motion only on the best trick or two, with a flash or a dip in; the music thins for it (the score's `break`).
- The companion gets its own shot every 4–6 shots, and is in the frame in at least half the others.
- Close on the feet early (the board, the stance), on the face once (a look at the companion), and end on a still shot.
- Cameras are pulled clear of walls along their line of sight; if a tracking shot keeps hitting a wall, use the other
  `side` or a smaller `d` — and check the still.
