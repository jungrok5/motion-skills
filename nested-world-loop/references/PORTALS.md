# Portals — how worlds sit inside each other

A ring is `worlds[0] → worlds[1] → … → worlds[N-1] → worlds[0]`. Each world declares one `portal`: where the **next**
world sits, as a similarity transform of the next world's coordinates into this one's:

```js
portal: { at: [x, y, z], scale: s, rot: [rx, ry, rz],      // next-world point q ↦ at + s · R · q   (this world's units)
          aperture: { center, normal, w, h } | { center, normal, r, up },   // optional: an opening the next world is seen through
          bounds: [x0, y0, z0, x1, y1, z1] }                // the box (NEXT world's units) the next world occupies
```

Work it out from one matching point: pick a point you know in both worlds (the bottle's axis and the sea's axis; the
room's window and the cottage's window; the cabin's hatch and the lantern's hatch), then `at = P_this − s · R · P_next`.
Write that sum in a comment beside the portal — every example does.

## Two kinds of portal

**Containment** (no `aperture`): the next world physically fits inside an object of this world — a bottle, a jar, a
watch case, a snow globe, a box. The camera flies *into* it (through a neck, a gap, the glass). Rules:
- the inner world fits inside the container's inside: shape its edges to the container (the bottle's sea narrows with
  the shoulder — `examples/lighthouse-bottle` builds the resin from the bottle's own profile);
- the container's walls are glass or open, so the inner world can be seen from outside before the camera enters;
- `bounds` is a box **inside** the container's hollow (for a cylinder, the inscribed box), never touching its walls:
  once the camera is in that box, outer-world geometry inside the box is cut away — the glass must not be.

**Aperture** (`aperture` set): the next world is seen *through* an opening — a picture's canvas, a window, a door, a
hatch, a screen. The next world can be any size behind it (it is stencil-masked to the opening while the camera is
outside). Rules:
- the opening is a **real hole** in this world's geometry (a wall shape with a hole, a glazing ring with a gap, a floor
  plate with a hole) — the aperture is not geometry, it only masks;
- nothing of this world lies behind the opening — the next world fills it (the engine also enforces this: what lies
  behind the aperture plane never draws through the opening);
- the normal points to the side the camera comes from; the camera must cross the plane *inside* the opening;
- `bounds` is the room behind the opening (next world's units) — after the camera passes the opening, every outer
  world's geometry inside that box is cut away, so an outer shell can never intrude.

## The hand-off

The camera path is defined in each world's own coordinates. The first key of every world is its **entry pose**; the
previous world's path ends at that pose mapped through the portal. The engine draws each frame in the coordinates of the
world the camera is in ("the root"), and switches root at the entry key — invisible because the same pose is the same
picture from either side. `check.mjs` proves it: it draws the moments just before and after each seam from both worlds
and compares them.

What makes a hand-off visible, and how the engine handles it:

| trap | what happens | handled by |
|---|---|---|
| light falls off with distance in units | a 1/400 world's lamps would be 160 000× too bright, or clamped dim | intensity × c², range × c per pass; three's 0.1-unit falloff clamp lowered |
| fog is per distance unit | the inner world's fog would fill the whole outer room | fog density / c, and it starts at the inner world's aperture or bounds |
| shadow cameras are in units | wrong near/far, acne | shadow near/far/extent/normalBias × c per pass |
| reflections are fixed in root space | a world turned by its portal reflects the wrong way | `scene.environmentRotation` follows the portal; keep env maps roughly symmetric about the turn axis |
| depth precision across 10⁵ in scale | z-fighting | one logarithmic depth buffer shared by all passes |
| glass in an inner world, backdrop in an outer one | the backdrop paints over the glass | opaque sweep for all worlds, then a glass sweep inner → outer |
| enclosing shell around the inner world | the outer room's walls cut through the inner world | `bounds` hollowing |

## How many worlds are drawn

Each frame draws the camera's world, `inner` worlds inside it (default 2) and `outer` worlds around it (default 1).
Raise `outer` to 2 when the camera can see out past the enclosing world (from the lantern, through the bottle's glass,
to the giant cabin). check.mjs's hand-off test catches a ring that needs it: the moment after a seam differs.

## Camera keys

`keys: [{ pos, look, fov, bokeh, pace, up, roll, exposure }]` per world. With no `at` on the keys, the engine times the
move itself: the whole ring at a constant **perceived** speed (|move| ÷ distance to what you look at), bent by each key's
`pace` (1 cruise, 0.75 linger, 1.3 hurry) over `film({ duration })`. A push from a room into a 1/400 miniature then feels
like one steady dolly. Keys:
- `look` is what is in focus (depth of field focuses on it) and sets the perceived speed — keep it on the subject;
- the path is a centripetal Catmull–Rom through the keys, joined across worlds with C1 continuity, so the last key of a
  world and the next world's entry pose shape the seam together: put a key just before each opening, aimed through it;
- looking straight down needs an `up` (e.g. `[0, 0, -1]`), interpolated with the rest;
- 3–6 keys per world. More keys = more places the move can wobble.

## Patterns that close a ring

- **Container → its world → a building with a lit window → the first room.** (the source: watch → town → shop window →
  workbench; the starter: painting → cottage window → study)
- **Container → its world → a tower / lantern / attic → a hatch down → the first room.** (lighthouse-bottle)
- **Book → its illustration → a desk in that illustration → the book on it.**
- **Screen → the game world → an arcade → the screen.**
- **Map → the land → a cartographer's tent → the map.**

The return portal is usually 1:1 (a window or hatch into the room of the same size), and the big zoom is the container.
