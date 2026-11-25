# The film (kit/film.py, film.json)

```
blender -b --factory-startup -P <skill>/kit/film.py -- --project <project> --plan                 # timeline + clearance
blender -b --factory-startup -P <skill>/kit/film.py -- --project <project> --stills 0,6,13.8 --res 640x360 --samples 12
blender -b --factory-startup -P <skill>/kit/film.py -- --project <project> --res 1280x720 --samples 24   # frames (resumes)
```

It runs `build.py` in film mode, then: lays `sheet.png` on a 3 km wooden desk at the real scale (from
`sheet.json`), adds the props (`props.cup [x, y, r]`, `props.pencil [[x, y], [x, y]]`, on the desk outside the
sheet), wraps every material, keys every part, the site, the lights, the world and the camera, measures clearance,
writes `timeline.json` and renders.

## The timeline

All times come from the tempo: `beat = 60 / bpm`, a landing slot every `beat / grid` from `downbeat`.

| key | meaning |
|---|---|
| `stages[].beats [a, b]` | the stage's first and last landing, in beats; landings are spread evenly and snapped to the grid, so parts land together in pulses |
| `stages[].order` | `height` (default: bottom-up, then sweeping round the centre), `angle`, `radial`, `panel`, `xy` - only `height` guarantees support; use the others for parts that do not stack |
| `stages[].fly` | `drop` (from 6-11 m above, a little sideways, tumbling), `rise` (from under the paper), `slide` (from outside, low) |
| `stages[].pop` | name prefixes that grow from their base instead of flying (crowns, fruit, plants) |
| `wave.beat` | the wave's start: a bar's downbeat (beat 16, 20, 24 …) |
| `wave.keys` | `[seconds after the wave, radius m]`: eased out of the origin, then geometric to the horizon |
| `lights_beat` | the lights' earliest beat (each also waits for the wave to reach it) |

Overlap stages only as far as `check.py`'s `order` allows (a stage that rests on another starts after the other's
parts under it have landed). Leave the last beat before the wave quiet or nearly so: the riser needs the room.

## The materials and the wave

One node group (`wave`) gives every material `alive` (0 before the front, 1 behind it) and `edge` (the front line).
Parts' materials become: white clay (`(0.80, 0.79, 0.76)`) that flashes its stage colour (`flash` keyed to 1 from
0.3 s before landing to just after, then out over 0.65 s) -> the real material behind the front, with a warm line on
the front. Paper and desk: visible, then transparent. Materials used only by site stages: transparent, then real.
The world goes from a pale studio to the look's sky, the studio sun fades, the look's sun rises, over 2.2 s.

## The camera

- **open**: `hold` s still, straight down through `lens` (200 mm) with the whole sheet filling the frame and north up
  (`az: -90`), then a spiral down to the first key by `end` s: the lens shortens and the distance falls together,
  the elevation drops from 90 degrees, the azimuth turns.
- **keys**: `{t, loc, target, lens}` or `{t, shot}`; positions, yaw / pitch (unwrapped, the short way round) and log
  lens are each interpolated by a monotone cubic (no overshoot past a key). Put the `hero` shot on the wave.
- **the way in**: over a wall or a gate, along a path, through the middle of a real, open opening (not beside a
  post), a key just inside facing the room (not a blank wall), then turn round towards the view while backing in,
  and end on the brief's last view. Keep 0.6 m in front and 0.2 m to every edge: `--plan` measures it with nine rays
  a frame after the wave; `check.py` fails what is closer.
- **ev**: `[[t, exposure], …]`: a little under during the clay build (white clay on paper is bright), up for the
  sky, up again inside.

## Render times (the example, 2,029 parts, CPU only, 4 cores)

640x360 at 14 samples: 4-7 s a frame; 550 frames in about an hour. `--plan` (no frames) 25 s. Use `--step 2` and
`--stills` while iterating; render the full film last. On a GPU 1280x720 at 24-32 samples is the normal pass.
