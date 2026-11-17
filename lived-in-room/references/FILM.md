# FILM — the hour, the small motions, the phone in the visitor's hand

The room is built once. `film.py` is everything that differs between its versions: `light(r)`, `motion(r)`,
`camera(r)`, each switching on `r.v`. `check.py` fails when the versions are not the same model.

## The outside is one picture

Do not model what is beyond the window. It is one picture on a plate (`r.backdrop(image, wall, distance, width,
strength, z, u)`), far enough that it parallaxes like a distance as the visitor walks:

- **Draw it in code** (`lr.draw.sky`, `lr.draw.skyline`, or your own Pillow drawing in `props.py`), wide: the walk sees
  different parts of it from different places. The example's is 3600 × 1350 px for a plate 90 m wide, 40 m away.
- **Put its horizon at eye height**: `z = eye + (v_horizon − 0.5) × plate height`. A horizon at the wrong height is the
  one error a viewer feels without knowing why.
- **Draw at the scale the distance implies**: something 15 m wide and 40 m away is 15 m wide on the plate; a 30 m
  slab a kilometre off is about 1.2 m. From a high room, storeys can be vague. From a low one the picture's vanishing
  point has to agree with the room's camera — draw it for the eye height, or choose a view that hides the street.
- **It lights the room**: the plate is emissive (`strength`), so the window glows by the hour's colour. Give the night
  plate a little blur and bloom; a far city is never sharp.
- **Far lights move.** `r.beacon(u, v, per_min, …)` puts a light on the plate at a picture position. Look up the rule
  for the place (which lights are steady, which flash, how often), set `ROOM['beacon_range']`, and give each
  structure its own rate and phase — lights that flash in step look like a machine. A rate outside the range is
  reported as a problem. Lights that are off at an hour are hidden, not black.
- **Glass.** The pane is `mat.glass(window=True)`: light and shadow rays pass straight through, so the room is lit by
  the plate without refraction noise. When the outside is darker than the room, the pane mirrors the room: keep the
  night picture dark (a 2 a.m. sky is nearly black, far dimmer than a desk lamp) and the reflection comes for free.
  `r.drops(window, n, moving)` puts water on the room side of the pane; the moving ones run, stall and run.
  `r.window(wrap=…)` covers the lower panes with winter film — a matt translucent sheet (`mat.film`), not frosted
  glass, which would mirror every lamp.

## Small motions

A room in which nothing moves is a still photograph however much is in it. Give it many small motions, none of
them the subject:

| call | for | driven by |
|---|---|---|
| `r.tick(hand, start=…)` | a clock's second hand | one step a second with a quartz overshoot |
| `r.spin(ob, rpm)` | fan blades, a reel, a turntable | constant speed (motion blur does the rest) |
| `r.pages(material, n, hold= / times=)` | a screen (material from `kit.screen_pages`) | steps through drawn pages |
| `r.flicker(light or socket, amount, speed)` | lamps, heater elements, meters | ± a few per cent, never zero |
| `r.blink(target, per_min, duty)` | a standby LED, a cursor, a beacon | a fixed rate |
| `r.flutter(ob, axis, amp, freq)` | paper and cloth hinged at their origin | gusty air: a sticky note by its glue strip, washing on its rod, a calendar on its nail |
| `r.travel(ob, fn)` | a drop on glass, a toy | any path |
| `r.animate(target, fn, name)` | anything else | fn(frame) → {data path: value} |

Rules: name each motion (it is counted and listed by `sheet.py --motions`); give each its own rate and seed; say in
the brief what drives it (mains ripple, moving air, a clock). A thing that moves in air needs something that moves
the air. `check.py` wants at least six motions per version and fails one that is registered and never changes.

## Light: a dark room, a few places picked out

- **Evenly lit is what gives a render away.** Decide where the eye should go and light those places; let the rest
  fall away. In the example the night has five: the desk under its lamp, the screen, the heater's glow on the floor,
  the pillow end, the window.
- **The world is black.** Light comes from things in the room (`r.lamp()` at a lamp's `lr_bulb`, emissive screens and
  elements via `r.glow()`) and from outside (the plate; `r.daylight()`; `r.ambient()` for the sky's fill).
- **A lamp is a thing and a light.** The shade, bulb and stand are in the room in every version; `r.lamp(..., on=…)` /
  `r.glow(material, strength, on=…)` decide whether they are lit. A bulb that is off is frosted glass, not a black ball
  (`mat.emit(…, off=colour)`).
- **Warm lamps stay warm by exposure, not by paint.** If 2,700 K lamps photograph white, the frame is over-exposed.
  Exposure is `look['exposure']` per version, in stops, applied when the frames are developed — change it and run
  `finish.py`, do not re-render and do not recolour the bulbs.
- **Numbers.** `render.py` prints the median, p95 and p99.5 of every still. A night interior sits around a median of
  15–35 (of 255) with p99.5 near 200; a hazy low-sun hour 30–60. Put the target in the brief; `versions[v]['median'] = (lo, hi)`
  makes `check.py` hold you to it.
- **To look at the room, use the work light**: `render.py --view <name>` renders the same room evenly lit from the
  viewpoints in `ROOM['views']`. Mood hides exactly the faults a review is for.

Light power is in Blender watts and only ratios matter: in a 14 m² room a desk lamp is about 5 W at its bulb, a glow
lamp 0.5–1 W, a heater's light 6–8 W as a wide spot, a phone torch 3 W, a low sun 3 through `r.daylight`.

## Haze

`r.haze(density)` fills the room with thin air you can see: 0.02–0.05 per metre. The sun through a window becomes a
soft beam and a patch on the far wall. It costs about half again in render time and needs more samples. A hard
bright band in haze is light squeezing through a gap (a blind's slats, a door crack): shade the gap, do not turn the
haze down.

## The walk

The film is what someone sees who comes in at the door holding a phone.

    r.camera(lens=24, fstop=6)
    r.walk([dict(t=0.0, pos=(x, y, z), look=(x, y, z)),
            dict(t=4.0, pos=…, look=…),
            dict(t=12.0, pos=…, look=…, close=True, hunt=True), …],
           shake=0.36, step=0.65, pan_cap=12)
    r.phone_light(on_at=9.2, watts=3.0, angle=75, blend=0.9)

- **Keys** say where the phone is and what it points at. Two keys at the same place are a stop; the path eases into
  and out of stops and passes through the others.
- **It starts in the doorway** (`check.py`: within a metre of the door) at a hand's height, 1.3–1.5 m.
- **It bobs only while walking**: once per `step` (0.57–0.66 m), scaled by speed; standing still, only the hand's
  tremor is left — a slow wander with a small 9–10 Hz part. `close=True` halves it: people brace to frame a detail.
- **It never whips round.** `pan_cap` is the fastest turn allowed, degrees a second; the default follows the
  seven-second rule for 24 frames a second (a full picture width in seven seconds ≈ 10° a second at 24–26 mm).
  `sheet.py --camera` prints the turn speed second by second. Give a turn more time or less angle.
- **Focus follows late and hunts once.** The autofocus lags by `af` seconds; at a key with `hunt=True` it overshoots and
  settles — the moment a phone finds a near subject. Use it once or twice.
- **The torch**: `r.phone_light(on_at)` switches on a white light beside the lens. Light that moves with the picture
  tells the viewer there is a person behind it. A phone's LED is a wide soft flood with a hot middle (cone 70–85°,
  `blend` near 0.9), not a hard-edged spot; keep it weak enough that what it lands on is not burnt.
- **Each version takes its own path**, to what that hour lights.
- A phone's main camera is 24–26 mm-equivalent; its small sensor at ƒ/1.6 has roughly the depth of field of ƒ/6 on
  full frame — most of the room sharp, a near thing soft.

## Versions

`ROOM['versions'] = {name: dict(seconds, look)}`. Make one hour properly; another hour is then a matter of light and
path. Things that differ by hour (a lamp on or off, a screen asleep, far lights hidden) are set in `film.py` through
`r.lit(on)`, `r.glow`, `r.lamp(on=…)` — never by changing what is in the room.

**Each hour has its own state, and someone is holding the phone.** A room in which every lamp is on, every machine
running and nobody there — and in which nothing has moved by the next hour — reads as a set. So the brief says who
walks in at each hour, and `film.py` says what follows from it:

- `r.away(things, on='afternoon')` — what that person has with them is not lying in the room: the shoes on their feet,
  the bag on their shoulder, the thing in the bag; and what the hour does not have (water on the pane in a dry
  afternoon). The thing is still built, placed and audited; it is only not rendered in that version. The phone is never
  in the room: it is the camera.
- `r.hands(hour_hand, minute_hand, h, m)` — a clock shows the hour of the version (`kit.clock(hands=True)`).
- A screen shows one thing progressing (`kit.screen_pages` of the same view a step further on), not pages turning
  by themselves.

**The sun has a date, an hour and a bearing.** Decide which way the window really faces, look up the sun's azimuth and
altitude for the place, the date and the hour, and convert (for a window in the plan-north wall):
`r.daylight(elev=altitude, azim=sun_azimuth − window_bearing)` — the sign is the side the sun is on as you look out of
the window: positive to the right, negative to the left; its light falls to the opposite side of the room. Then check where the patch lands against the room's own rule. In the
example the first version put a dawn patch on the tape wall at an hour before sunrise; the review worked that out,
and the building was turned (`examples/rooftop-tapes/REVIEW.md`).

**The outside can be partly real.** What is within a few metres of the window — a terrace, a parapet, a tank, a
balcony rail — is built as geometry and registered with `r.outdoors(ob)`; it slides against the far picture as the
visitor walks, which a single plate cannot do.

## Render and develop

| quality | samples | size | for | about (4 CPU cores, the example room) |
|---|---|---|---|---|
| `draft` | 10 | ¼ | is anything in the way? `check.py` | 6–8 s |
| `preview` | 24 | ½ | light, exposure, where the eye goes | 27–40 s |
| `final` | 48 | full | the film, with a GPU | minutes without one |
| `hero` | 192 | full | single stills | — |

`render.py --version <v>` writes linear EXRs and resumes; `--step 2` renders every other frame first, so a 12 fps
cut exists long before the 24 fps one. `finish.py` develops them with the phone's look (glow round lamps, AgX, a
little distortion and vignette, sensor grain — stronger at night). `encode.py` makes `out/<version>.mp4`;
`flipbook.py` makes a page that plays the frames where no video file may go.

The film is silent: the source has no sound in it. Add the room's own (a tick, a fan, a street) in an editor if the
piece wants it.
