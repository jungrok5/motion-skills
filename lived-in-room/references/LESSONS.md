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

- **Chopsticks across a pan "would tip by 88 mm"** → the underside of a thing is sampled every 30 mm, and a pan's rim
  is 2 mm wide: one rim was found and the other missed. The audit cannot tell a thing bridging two thin edges from one
  balanced on a point. Known limit: rest such a thing on a face (they now lie on the table by the pan), or give the
  edge some width. Not fixed by loosening the tolerance.
- **Headphones laid flat "would tip"** → they lie on the round of their cups and the band hovers: the weight is in
  the cups, not at the middle of the box round them → `kit.headphones(flat=True)` sets `lr_com` there.

## What the second pair of eyes caught (and the audit never could)

The audit passed the example with every thing held; the first review then returned 24 findings
(`examples/rooftop-tapes/REVIEW.md`). The ones that are true of any room:

- **The rule of the room was true in the text and false in the plan.** The brief said the washing dried "by the
  door, furthest from the tapes"; the rack stood on the tape wall, 0.25 m from the first tape, with the circulator
  blowing the damp air along it → a `why=` is a claim: measure it on the plan (`render.py --view plan`) before
  believing it. The reviewer did; the builder had not.
- **A sunbeam at an hour before sunrise, from the wrong side** → the dawn patch was placed for the picture → the sun
  is looked up like any other number: sunrise and sunset bearings for the place and date, the sun's bearing and
  height at the hour, the window's true bearing (`FILM.md`). Then ask which wall the sun can ever reach: here that
  answer turned the building round, because the room's rule needed a wall the sun never touches.
- **Everything running and nobody there; nothing changed by the next hour** → decide who holds the phone at each
  hour and take what they carry out of that hour's room (`r.away`); set the clock (`r.hands`); let a screen advance
  rather than turn its own pages.
- **A room dressed around one hobby** → no clothes, nothing to cook on, no trace of washing. Ask of every setting:
  *what does every dwelling of this type have that the brief did not mention?* and put it in the inventory.
- **No curtain on the only window** → the same question, for privacy and for cold.
- **Running machines with no plug** → a spinning fan with no lead is a tell in the foreground: every thing that runs
  gets a lead to a socket, and the sockets get strips when there are more plugs than holes.
- **A lamp whose head hung past the desk and lit the bin** → a turn given with the wrong sign: a thing's front points
  along (sin rz, −cos rz); render the zone in the work light before trusting a rotation.
- **"A 2 a.m. sky that reads as dusk"** → the picture outside was the brightest thing in the frame → two stops down;
  the glass then mirrors the room by itself.
- **The window looked at a picture, not at its own roof** → what is within a few metres is built for real
  (`r.outdoors`): a deck, a parapet, a tank.
- **Winter film on the panes glowed heater-red** → it was frosted *glass*, which mirrors every lamp → `mat.film`: a
  matt translucent sheet.
- **The torch was a theatre spot** → a hard-edged cone → a wide cone with a soft edge (`blend=0.9`) and a hot middle.
- **Not every finding is taken.** Wallpaper seams, a fitted sheet, leaning tapes, better socks: declined, with the
  reason written down (cost against what the film shows; `sheet.py --screen` says what the camera never finds).

- **The second round found the fixes that only half worked.** The heater, moved for the first review, now faced the
  tape wall and washed it orange on film: a light's beam is part of where a thing stands — after moving a lamp or a
  heater, look at where its cone ends against the rule of the room, in a still, before the next review.
- **A tape playing and nobody able to hear it** → headphones on a peg 1.5 m from the seat, no pen out, no label half
  written. A machine that runs wants the trace of the person running it. And a thing that is in one place at night and
  another by day is two objects, each `r.away` at the other hour — the inventory lists both.
- **A night city with every window lit** → at 2 a.m. about one window in twenty is; what reads as a city then is
  street lamps strung along the lanes, a few signs, the red lamps on what is tall. Roofs and tanks are near black.
- **A desk flush to the wall under a curtained window** → the curtain cannot be drawn and the leads have nowhere to
  drop. Stand furniture off the wall by whatever has to pass behind it.
- **A reviewer misread a number** → "a 2.1 m door on a 0.1 m kerb" was a 2.1 m opening that includes the kerb. Say in
  the brief what each dimension is measured from; decline the finding with the numbers, do not rebuild the door.
- **"Too few possessions for seven years"** → a room is also storage: where folded clothes go, where spare bedding
  goes, what stands by the door for washing. Under the hanging clothes is the place a small room keeps them.

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
- **Black dots on the daylight sky** → far lights that were "off" were still black spheres → hide what is off.
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

## Time (4 CPU cores, no GPU; the example room, 407 things)

- Building the room: about 4 s. The audit of the whole room: about 6 s. `check.py --fast`: about 25 s.
- A preview still (960 × 540, 24 samples): 28–35 s at night, 36–40 s in daylight with haze. A film frame at 640 × 360: 13–16 s.

## Blender 5.x from Python

- `pip install bpy` gives Blender as a module, one wheel per Python version (bpy 5.3 → Python 3.13, about 400 MB).
- `Action.fcurves` is gone → every motion is a function of the frame, baked to linear keys on frames 0..n+1.
- The compositor node tree on the scene is gone → the look is made in numpy (`lr.finish`) from linear EXRs read by a
  small reader (`lr.exr`).
- Node-group sockets are made with `nt.interface.new_socket(name, in_out=, socket_type=)`.
- `object.matrix_world` is stale until the next dependency pass → `geo.place()` sets it when it sets a transform;
  never measure an object you have only assigned a location to.
