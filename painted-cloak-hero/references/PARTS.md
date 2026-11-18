# PARTS — character.json reference

Units are metres; the hero stands on z = 0, faces -Y at yaw 0, its left side (`.L`) is +X. Colours are `#hex` (sRGB).
A material is a colour string or `{color, rough, sheen, coat, sss, emit, pattern, paint}`. Every material is
hand-painted by default (references/PAINT.md); `"paint": false` turns it off for one material.

## Top level
```json
{
  "name": "my-hero", "title": "…",
  "body": { "height": 1.75, "heads": 6.8, "build": 1.0, "legs": 1.0, "arms": 1.0, "feet": 1.0, "headWidth": 1.0, "skin": "#d6a786" },
  "face": { "eyes": "#1d1410", "iris": "#3a2a20", "eyeSize": 0.55, "brows": "#2a1d16", "mouth": "#8e4a3c", "mouthWidth": 1.0, "blush": null },
  "bodyPart": { "legs": <material under the trousers>, "arms": <material>, "noFeet": false },
  "style": { "paintAll": true, "paint": { <stroke defaults for every material> } },
  "parts": [ … in layering order … ],
  "motion": { … MOTION.md … },
  "review": { "title": "HERO / ANIMATION REVIEW", "bg": "#7d7a97", "floor": "#76738f", "grid": "#8c89a3", "gridStep": 0.25,
              "light": 1.0, "orbit": [-25, 80], "clipSeconds": 3.0,
              "camera": { "elev": 7, "lens": 50, "fill": 0.86, "zoom": 1.0, "dx": 0.16 } }
}
```
`heads` is total height ÷ head height. 6.5–7.2 = the source's "simple stylized proportions" (an adult: small head,
long legs, shoulders ~0.22 H wide); 4 = a chibi (big head). Every proportion in `pch/body.py` blends between the two
by `heads`, so anything between works.

## Library parts (pch/parts.py)
Every part also takes `color`, `rough`, `sheen`, `paint` (and `pattern`, used only when `paint` is false).

| type | what | main keys |
|---|---|---|
| `hair_bob` | shell over the head, face window tucked in smoothly | `length`, `bangs`, `volume`, `faceWidth` |
| `hair_tail` | ponytail / braid on a chain | `style`, `from`, `length`, `thick`, `segments`, `tie`, `ribbon`, `stiff` |
| `trousers` | a seat from the waist to the crotch + one loose leg each, its own mesh | `fit` (1.22), `length` (1 ankle, .5 knee), `cuff` |
| `top` | shirt / tunic / jacket body + sleeves | `to` chest/waist/hips, `sleeves` short/long/wide/puff/none, `cuff`, `collar`, `buttons`, `buttonCount` |
| `boots` | boots or shoes | `height` (0 shoe … 1 knee), `cuff`, `sole` |
| `cloak` | **the hero's cloak**: a mantle over both shoulders (rides the chest) and a long body on N bone chains, open at the front, clear of the hanging arms, frayed hem | `length` (hem height ÷ leg, .32), `opening` (deg, 70), `flare` (.35), `hemCurve` (× H lower at the back, .04), `fringe` (m, .06; 0 = clean), `chains` (9), `segments` (4), `lag` (frames, 3), `stiff`, `damp`, `gravity`, `drag`, `cone`, `twist`, `fold`, `armKick` (.9), `clasp`, `cord` |
| `hat` | on the head | `style` wide / cone / cap / beanie / pointed, `brim`, `droop`, `crown`, `peak` (cone), `sit`, `tilt`, `roll`, `band`, `ties` (cone), `brimFringe` (m; .02 for wide / cone) |
| `skirt`, `dress`, `coat`, `sash`, `bow`, `scarf`, `cape` | from cloth-rig-character, still here for heroes that wear them | see the keys in `pch/parts.py` docstrings |

The hat is two pieces: the crown painted round it, the brim painted radially with a frayed edge. The cloak is one
mesh with one painted texture (the strokes run over the shoulder seam).

## A part of your own (project parts.py)
```python
from pch.parts import part, P
from pch import geom
from mathutils import Vector

@part('satchel')
def satchel(ctx, p):
    b, j, H = ctx.body, ctx.j, ctx.body.H      # proportions (b.waist_z, b.torso(z) -> (rx, ry), b.head_c, joints ctx.j)
    top = Vector((-(b.torso(b.hip_z)[0] + ctx.shell() + 0.02 * H), -0.035 * H, b.hip_z))
    pts = [top, top + Vector((0, 0, -0.06 * H)), top + Vector((0, 0, -0.12 * H))]
    bones = ctx.chain('satchel', 'hips', pts, stiff=.12, damp=.14, cone=40, collide=['legs'], lag=2)
    bag = geom.ellipsoid('bag', pts[1], (0.028 * H, 0.075 * H, 0.06 * H))
    ctx.add(bag, p.get('color', '#7a4a26'), bones=bones)     # painted automatically
```
Then `{"type": "satchel", "color": "#…"}` in `parts`. Helpers: `ctx.shell(extra)` (how far out this layer sits),
`ctx.add(obj, material, bones=[…] | rigid='head')`, `ctx.chain(name, parent, points, **RIG params)`,
`ctx.painted(material, obj)` (the painted version of a material for that mesh). A piece can carry its own weights:
`ctx.pieces[-1]['wfn'] = lambda co: [('chest', 1.0)] or None` (see the cloak). The full example is
`examples/snow-postman/parts.py`.

A project `@clip('name')` works the same way (MOTION.md).
