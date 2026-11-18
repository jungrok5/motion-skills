# machine-wilds

A walkable place in the browser where **giant walking machines roam a ruined, overgrown land in mist** — their lamps
cutting cones through the fog. It is this repository's `scanned-realm` engine (photo-scanned surfaces, objects and
plants from Poly Haven, CC0; a deferred WebGL 2 renderer; the hour and the weather; keyboard, mouse, touch, gamepad)
with land that has real relief, machines built part by part from code as mechanisms, and a walk that is **planned on
the land**: every footfall sits on the real height and slope of the ground, planted feet never slide, each leg bends
as much as its own patch of ground asks, soles tilt to the slope, and the body's height and lean come from its feet.

The machines are old: rusted, mossed industrial hydraulics, some under pale ceramic shells — each kind has an `age`
that lays grime, rust streaks and moss in its own space. A kind may also **fly**: wings as driven bones on a line in
the air, banking before it turns, beating in bouts and gliding between, its lamp combing the mist from above.

Give it a topic (a place, what ruined it, an hour) and it designs the land, the ruins, the scans, **new machines for
that place** and the ways they walk — and proves the bodies in seconds, without a browser, before anything is rendered.

## Quick start
```bash
# the starter (Lantern Quarry: a flooded quarry, two wardens)
cp -r machine-wilds/starter my-realm
node machine-wilds/scripts/gym.mjs my-realm --course --sheet     # the machine over ramp, step, side slope, ditch, mound → out/gym-course.png
node machine-wilds/scripts/gym.mjs my-realm --map --sheet        # on its own way, on the realm's land → out/map.png, out/gym.png
node machine-wilds/scripts/fetch-assets.mjs my-realm             # the scans (28 MB, Poly Haven, CC0) → my-realm/assets/
node machine-wilds/scripts/build.mjs my-realm                    # → my-realm/index.html
node machine-wilds/scripts/render.mjs my-realm --cast            # each kind alone in a studio, every side and its motion → out/cast-<kind>.jpg
node machine-wilds/scripts/render.mjs my-realm --views           # stills of the named views
node machine-wilds/scripts/check.mjs my-realm                    # must print "check OK"
node machine-wilds/scripts/film.mjs my-realm --still             # (a realm that declares a film) one frame a shot; without --still the frames, then out/film.mp4
cd my-realm && python3 -m http.server 8000                       # walk it: http://localhost:8000/
```
The worked example is `examples/iron-valley` 「쇠울림 골짜기」 (101 MB of scans): the same commands with that folder.
Without the scans a realm still builds and walks (`?scan=0`): recipes stand in for every surface.

Requirements: Node 18+ with Playwright Chromium, `curl`, ffmpeg. `gym.mjs` needs only Node. The page wants WebGL 2 and
a real GPU; on a machine without one a 640 × 360 still takes one to two minutes.

Controls: W A S D / arrows to walk, mouse to look, Shift to run, Space to hop; two thumbs on a phone; a gamepad.
`1`–`4` the hour, `5`–`8` clear / rain / snow / mist, `T` the automatic round, `C` the tour, `M` sound, `P` numbers.

## What it is made from
Made in this repository from three of its skills — [`scanned-realm`](../scanned-realm) (the engine and the scans),
[`walking-colossus`](../walking-colossus) (the stateless gait, the scale) and
[`machine-build-reel`](../machine-build-reel) (machines as mechanisms, the cylinder search, the checks) — with scans
from <https://polyhaven.com> (CC0, fetched per realm, never committed). No design, name or asset of any game is used;
`references/SOURCE.md` says what came from where.

Samples: https://jungrok5.github.io/motion-skills/machine-wilds/
