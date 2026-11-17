# LESSONS — what went wrong while building this skill, and the fix

Problem → cause → fix. All of it happened on the starter or on the worked example (`examples/rooftop-tapes`).
Read it before starting a room; add to it when a room teaches you something that is true of any room.

## What the audit caught (things a person placing by eye gets wrong)

The first layout of the example — 357 things placed carefully, by reasoning, without looking — failed the audit in
about forty places. None of them was visible in the dark night stills.

- **A plant pot 140 mm across on a 100 mm sill** → "its middle is 40 mm outside what holds it: it would tip". The sill
  depth follows from the wall and the frame (190 − 120 + a 20 mm stool); the pot has to follow from the sill.
- **A waste bin through the desk's side panel; a radio standing in a phone; a pan on a book; two slippers
  overlapping** → things were given positions one at a time, each plausible, never checked against each other →
  the audit's pair list, deepest first.
- **Headphones hung on a hook with their cups 25 mm inside the wall** → a thing with depth cannot hang flat on the
  wall face → `r.hang(hook='peg')` holds it 45 mm out; the thing reports how far it reaches back (`ob['lr_depth']`).
- **Cassette cases lying across a rack 82 mm deep; upright ones pushed 2 mm into its back panel; a radio's aerial
  into the shelf above** → a container's usable depth is its depth minus its back; check the tallest and deepest
  thing against it before filling it. `r.put(level=…)` refuses a thing taller than the shelf gap.
- **A blanket wider than the mattress, 45 mm into the wall; a rug corner under the mattress; a cable routed through
  the drawer unit** → the same error at furniture scale.
- **`rel=` given in metres instead of fractions** → the thing landed outside its support →
  `PlacementError: nothing of ['sideboard'] is under it at (-0.128, 3.070)`. Because `r.put()` only lowers a thing
  onto something, a wrong position fails loudly instead of floating quietly.

## What was wrong with the audit itself

An audit that cries wolf gets ignored, so each false alarm was traced to its cause.

- **"The desk is sunk 30 mm into the power strip under it"** → underside samples included points between the legs →
  sample only points that are on the underside's own faces.
- **"A tape is sunk 16.8 mm into the tape lying on top of it"; "the sideboard is sunk into the carton on its lower
  shelf"** → anything above the underside was taken for its support → only a thing that reaches *below* the underside
  can hold it up (or one named in `on=`: a sheet of paper under another).
- **"Floor × desk: 239 mm"** → inside-test by ray parity, and a ray that passes through the shared diagonal of a quad
  is counted once instead of twice → three rays in odd directions, majority vote; and no sample outside the other
  thing's box is tested at all.
- **"A tape on the sill would tip"** → the underside of a box was sampled at its corners only, and the corners at the
  front overhung by 2 mm → faces are sampled on a grid.
- **"The desk lamp would tip"** → its weight was assumed to be at the middle of its bounding box → builders say where
  the weight is (`ob['lr_com']`: a lamp's base, a plant's pot).
- **"The blanket would tip"** → a soft thing was resting, rigid, on the one highest bump of the mattress → a thing's
  `soft=` widens what counts as held.
- **Beads of water "1.6–2.2 mm from the window"** → the drop's back was placed from a formula, not from its mesh →
  take origins from the built bounds.
- After these, `audit.py --break` (lift a thing 180 mm, sink one 10 mm, expect both reported) was added so the audit
  proves it can still see.

## Modelling

- **A fan tilted as a whole stands on the edge of its base** → build the head as its own `Part`, tilt it, `merge` it
  onto an upright base. The rotor then hung 13 mm from the motor: a moving part needs the shaft it turns on.
- **A lamp that is switched off was a black ball; the ceiling panel a black square** → an emission-only material is
  black at strength 0 → `mat.emit()` is a surface (frosted glass, a quartz tube) that also emits.
- **A light and its lamp with the same name** → Blender renames the second (`desk lamp.001`) and a lookup by name
  finds the wrong one → keep handles (`r.h['desk light'] = r.lamp(...)`), never look objects up by name.
- **A spinning top stood on its tip** → at rest it lies on tip and rim: 45° for that profile, and the audit then sees
  two contact points with the weight between them.

## Light and the outside

- **The picture outside was a blur of huge squares** → a plate 150 m wide in 2400 px, of which a 1.5 m window shows
  about 20 m → draw wide and dense (90 m in 3600 px here), at the scale the distance implies, horizon at eye height.
- **The mast with the beacon was never in the window** → from each place on the walk the window shows a different
  part of the plate → work out which part the walk sees (a line from the camera through the window to the plate) and
  put the far lights there.
- **Yellow water tanks glowing at midnight** → the plate is emissive: everything on it shines by its drawn colour →
  draw unlit things nearly black at night.
- **Black dots on the dawn sky** → far lights that were "off" were still black spheres → hide what is off.
- **The phone torch: invisible at 0.4 W, a white-hot disc at 13 W** → a spot light has the intensity of a point light
  of the same watts; in a small room 2–3 W reads as a torch.
- **The heater turned the whole room red** → an emissive element and a light at 11 W → 6.5 W, hue toward orange. The
  room still reads as heated; the tapes read as tapes.
- **Lamps are warm at exposure 0.9 and white at 2** → exposure belongs to the developing step; lower it there.
- **EEVEE does not render here** → it needs a graphics context; a headless machine without a GPU has none → the skill
  renders with Cycles, which runs anywhere.

## Process

- **A background render picked up half-edited files** → each version is built when its turn comes, from the files
  as they are then → do not edit a project while its render is running; or render in a copy.
- **Dark stills hid every fault** → review in the work light (`render.py --view`), judge the mood in the stills.
- **The numbers in the brief drifted from the room** → counts change every round → the brief quotes `sheet.py
  --inventory` and `check.py`, run last.

## Time (4 CPU cores, no GPU; the example room, 369 things)

- Building the room: about 3 s. The audit of the whole room: about 5 s. `check.py --fast`: about 20 s.
- A preview still (960 × 540, 24 samples): 27–34 s at night, 34–40 s at dawn with haze.

## Blender 5.x from Python

- `pip install bpy` gives Blender as a module, one wheel per Python version (bpy 5.3 → Python 3.13, about 400 MB).
- `Action.fcurves` is gone → every motion is a function of the frame, baked to linear keys on frames 0..n+1.
- The compositor node tree on the scene is gone → the look is made in numpy (`lr.finish`) from linear EXRs read by a
  small reader (`lr.exr`).
- Node-group sockets are made with `nt.interface.new_socket(name, in_out=, socket_type=)`.
- `object.matrix_world` is stale until the next dependency pass → `geo.place()` sets it when it sets a transform;
  never measure an object you have only assigned a location to.
