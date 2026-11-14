# PARTS — character.json reference

Units are metres; the hero stands on z = 0, faces -Y at yaw 0, its left side (`.L`) is +X. Colours are `#hex` (sRGB).
A material is a colour string or `{color, rough, sheen, coat, sss, emit, pattern}`.

## Top level
```json
{
  "name": "my-hero", "title": "…",
  "body": { "height": 1.1, "heads": 4.0, "build": 1.0, "legs": 1.0, "arms": 1.0, "feet": 1.0, "headWidth": 1.0, "skin": "#f2d3bd" },
  "face": { "eyes": "#2a1c16", "iris": "#6b4a3a", "eyeSize": 1.0, "brows": "#3a2a20", "mouth": "#9c4848", "mouthWidth": 1.0, "blush": "#f2a7a0" },
  "bodyPart": { "legs": <material: tights / trousers>, "arms": <material: sleeves under everything>, "noFeet": false },
  "headPart": { "ears": true },
  "parts": [ … in layering order … ],
  "motion": { … see MOTION.md … },
  "review": { "title": "HERO / ANIMATION REVIEW", "bg": "#8c8ea0", "floor": "#77798a", "grid": "#6d6f80", "light": 1.0,
              "camera": { "yaw": -12, "elev": 7, "lens": 50, "fill": 0.92, "zoom": 1.0, "dx": null } }
}
```
`heads` is total height ÷ head height: 3.6 = toddler-round, 4.0 = the source's hero, 4.6 = older child.

## Library parts (crc/parts.py)
Every part also takes `color`, `rough`, `sheen`, `pattern` unless noted. Cloth chain parameters (`stiff`, `damp`,
`gravity`, `cone`, `twist`, `fold`, `kick`) are in RIG.md.

| type | what | main keys |
|---|---|---|
| `hair_bob` | shell over the head, face window tucked in smoothly, bangs | `length` (0 = pulled back, 1 = shoulder), `bangs` (edge height, r units above head centre; 0.1), `volume`, `faceWidth` (1.0) |
| `hair_tail` | ponytail or braid hanging on a chain; optional ribbon at the end on its own chain | `style` tail/braid, `from` nape/crown/side.L/side.R, `length` (× height), `thick`, `segments`, `tie`, `ribbon {color, width, length}`, `stiff` |
| `top` | bodice + sleeves | `to` chest/waist/hips, `sleeves` puff/short/long/wide/none, `sleevePattern`, `sleeveColor`, `cuff`, `collar`, `buttons` (colour), `buttonCount` |
| `skirt` | bell / A-line skirt with a ring of chains | `from` chest/waist/hips, `length` (hem height as a fraction of the leg), `flare`, `bell` (0 cone … 1 round), `folds`, `foldDepth`, `depth`, `chains`, `segments`, `petticoat`, `name` |
| `dress` | `top` + `skirt` in one cloth | keys of both |
| `coat` | long sleeves, buttons, A-line hem (`hem` chains), optional `hood` | keys of both; defaults bell .15, flare 1.7, stiff .14 |
| `sash` | band round the body | `at` chest/waist/hips, `width` |
| `bow` | knot + two loops + two tails, all on chains | `at` back/front/side.L/side.R, `height` waist/chest/neck/hips, `x`, `size`, `width`, `tail`, `spread`, `segments`, `loopStiff` |
| `boots` | boots or shoes | `height` (0 shoe … 1 knee), `cuff`, `sole`, `upturn` (kkotsin / boat toes) |
| `hat` | on the head | `style` wide/cap/beanie/pointed, `brim`, `droop`, `crown`, `sit`, `tilt`, `roll`, `band` |
| `scarf` | ring + two tails on chains | `width`, `length`, `tails` front/back, `two`, `segments` |
| `cape` | from the shoulders down the back, ring of chains | `length`, `span` (deg), `flare`, `chains`, `segments` |

Prints (`pattern`): `{kind: floral|dots|stripes|check|band, base, ink, ink2, scale, count, flower, petals, colors[],
repeat, axis: u|v, at, width, repeat_uv: [u, v], seed}`. They are drawn into a 512 px image with numpy, so the .glb and
the player show them too.

## A part of your own (project parts.py)
```python
from crc.parts import part, P
from crc import geom
from mathutils import Vector

@part('tassel')
def tassel(ctx, p):
    b, H = ctx.body, ctx.body.H          # proportions (b.waist_z, b.torso(z) -> (rx, ry), b.head_c, ctx.j joints ...)
    top = Vector((0, -(b.torso(b.waist_z)[1] + ctx.shell()), b.waist_z))
    pts = [top + Vector((0, 0, -0.15 * H * t)) for t in (0, .33, .66, 1)]
    bones = ctx.chain('tassel', 'spine', pts, stiff=.06, gravity=1, collide=['skirt'])   # a cloth chain
    ob = geom.tube('tassel', pts, 0.006 * H)
    ctx.add(ob, p.get('color', '#c8203a'), bones=bones)    # bind: bones=[...] blends, rigid='head' follows one bone
```
Then `{"type": "tassel", "color": "#…"}` in `parts`. Helpers: `ctx.shell(extra)` (how far out this layer sits),
`ctx.outer_r(z, theta)` (radius of the skirts built so far — hang things outside them), `ctx.surfaces` (register your
own skirt-like surface so later parts and chains stay outside it). See `examples/hanbok-girl/parts.py`.

A project `@clip('name')` works the same way (crc/clips.py: a function `(m, c, t, root) -> pose dict`; start from
`m.base(root)` or another clip).
