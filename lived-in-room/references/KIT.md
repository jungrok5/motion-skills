# KIT — the library (`lib/lr`)

    from lr import geo, mat, draw, kit        # in skeleton.py / props.py / layout.py / film.py
    from lr.geo import Part

Metres everywhere. The inside south-west corner of the floor is (0, 0, 0); X east (width W), Y north (depth D),
Z up (height H). Walls are `'N'` (y = D), `'S'` (y = 0), `'E'` (x = W), `'W'` (x = 0). A place on a wall is
`(u, z)`: u metres from the wall's left end as you face it from inside. A thing's front is its −Y side.

## The room — `r` (what `build(r)`, `furnish(r)`, `light(r)`, `motion(r)`, `camera(r)` receive)

| | |
|---|---|
| `r.v` | the version being built (`'night'`, `'afternoon'`, … or `'work'` for the review views) |
| `r.W, r.D, r.H` | inside size · `r.items` the register · `r.h` a dict for handles `layout.py` leaves for `film.py` |
| `r.rng(tag)` | seeded randomness that is the same in every version · `r.nudge(tag, amount)` one number in ± amount |
| `r.name(base)` | a unique object name (`tape`, `tape.002`, …) · `r.zone(name)` names the zone of what follows |
| `r.wall_pt(wall, u, z, d)` | world point on a wall, d metres into the room · `r.wall_rz(wall)` the turn that faces a thing into the room |

**Skeleton** (`skeleton.py`)

| call | makes |
|---|---|
| `r.shell((W, D, H), wall=0.2, floor=, walls=, ceiling=)` | floor and ceiling; remembers wall thickness (one number or per wall) |
| `r.window(wall, u, sill, w, h, frame_d, face, stile, setback, slide, glass_t, lock, handle, stool, casing, wrap)` | a two-sash sliding window: frame, rails, sashes, panes, crescent lock, pull, inner sill; `wrap` = share of each pane covered with winter film. Cuts its opening |
| `r.door(wall, u, w, h, leaf_t, face, open_deg, swing, hinge, lever_z, step, lock, closer)` | frame and leaf with lever handles, a kerb, a lock case, a closer; sets `r.doorway` (where the walk starts) |
| `r.opening(wall, u, z, w, h)` | a bare hole (for an opening of your own) |
| `r.walls()` | the four walls as solids round their openings (called for you after `build`) |
| `r.skirting(height, thick)` · `r.cornice(height, depth)` | boards at the foot and head of the walls |
| `r.drops(window_item, n, moving)` | water on the room side of the inner pane |

**Supports** — the only ways into the room (`METHOD.md` §4). Each takes `kind=` (an id in `inventory.py`) and `why=`.

| call | notes |
|---|---|
| `r.put(ob, on, at=(x, y) \| rel=(u, v), rz, askew, level, under, tilt, soft)` | lowers the thing onto `on` (an item, a list, `'floor'`). `rel` is in the support's own frame (u left → right facing its front, v front → back) and then `rz` is relative to it. `level` = a shelf of a `shelf_unit`; `under` = start looking below this height |
| `r.against(ob, wall, u, gap)` | furniture on the floor, back to a wall |
| `r.stack(obs, on, at \| rel, askew, drift)` | a pile, each on the one before |
| `r.hang(ob, wall, u, z, hook='nail' \| 'hook' \| 'peg', out)` · `r.hang(ob, frm=item, at=point)` | makes and registers the fixing; `frm` hangs from something that is there |
| `r.stick(ob, wall, u, z, roll)` · `r.stick(ob, on=item, point, normal)` | flat to a wall or to a face of a thing |
| `r.suspend(ob, x, y, drop)` | from the ceiling; makes the cord and its rose |
| `r.lean(ob, wall, u, foot, turn)` | foot out, top on the wall |
| `r.fix(ob, to, wall, u, z, d \| loc, rz, rot, embed)` | screwed, built in, plugged in |
| `r.allow(a, b)` | two things that are meant to pass through each other |
| `r.away(things, on=version)` | (in `film.py`) things the tenant has with her at that hour, or that the hour does not have: built and audited, not rendered then |

**Film** (`film.py`) — see `FILM.md`: `r.backdrop`, `r.plate_pt`, `r.outdoors`, `r.beacon`, `r.lamp`, `r.glow`, `r.lit`,
`r.ambient`, `r.daylight`, `r.haze`, `r.phone_light`, `r.hands`, `r.camera`, `r.walk`, `r.animate`, `r.spin`, `r.tick`,
`r.pages`, `r.flicker`, `r.blink`, `r.flutter`, `r.travel`.

## Modelling — `lr.geo.Part`

One thing = one `Part` = one object. Author it in its own frame: origin under its footprint (z = 0 is what it stands
on), front toward −Y. A thing that hangs or sticks has its back on y = 0 and its hanging / glued point at the origin.
**Every piece is a closed shell** — the audit needs an inside.

| | |
|---|---|
| `p.box(size, at, rot, mat, bevel, faces={'front': picture}, center)` | a chamfered box standing on `at`; a picture on any face |
| `p.sheet(w, h, at, rot, mat, image, t, flat)` | a thin card, upright (picture to the front) or lying (picture up) |
| `p.cyl(r, h, …, r2)` · `p.pipe(r_out, r_in, h)` · `p.sphere(r, …, squash)` | round things |
| `p.lathe(profile, …, label, label_z)` | a profile turned round Z; end where it began for a hollow thing (a cup); `label` wraps a picture round it |
| `p.prism(outline, h)` · `geo.rrect`, `geo.circle`, `geo.rprofile` | an outline extruded; outline helpers |
| `p.tube(path, r)` | a cable, a rail, a wire, a handle |
| `p.skin(rings)` · `p.slab(w, d, top_fn)` · `p.drape(width, front, back, over_r)` | cloth: any cross-sections joined; a soft slab; cloth hung over a rail |
| `p.merge(other, at, rot)` · `p.turn(rot)` · `p.shift(d)` · `p.ground()` | build a sub-assembly and tilt it; lay a thing on its side; move the origin |
| `p.build()` | → the Blender object |
| `geo.import_glb(path)` · `geo.close_mesh(ob)` | a mesh you did not model: one object, origin under it; weld, fill, report what is still open |

`ob['lr_com'] = (x, y, z)` — where a thing's weight is, when that is not its middle (a lamp's base).
`ob['lr_levels']`, `ob['lr_clear']` — a unit's shelf heights and gaps, for `r.put(level=…)`.

## Materials — `lr.mat`

Every recipe has wandering roughness (`wear`) and takes `dirt=` from the room's one dirt group.

`paint` · `wall` (paper / emulsion with a weave) · `wood` · `planks` (boards or printed sheet flooring) · `metal` ·
`plastic` · `rubber` · `ceramic` (glaze, optional speckle) · `fabric` (weave, sheen, optional stripes) · `paper` ·
`glass(window=True)` for panes · `film` (a translucent sheet that glows when lit from behind: winter film, tracing
paper) · `liquid` ·
`emit(color, strength, off=)` · `picture(name, image, emission=, coat=, screen=)` · `volume`. `mat.emit_socket(m)` is the socket to flicker or blink. `mat.DIRT` holds the room's dirt colour and scale.

## Pictures — `lr.draw` (Pillow)

`draw.new`, `draw.text`, `draw.fit`, `draw.wrap`, `draw.font(size, weight)` — the bundled face covers Latin and the
2,350 common Hangul syllables. `draw.spine(title, w, h, …)` sets a spine vertically (CJK upright, Latin turned).
`draw.scrawl` hand-letters a line. `draw.waveform`, `draw.sky`, `draw.skyline(size, sky, layers)`, `draw.grain`.

## Common things — `lr.kit`

Each returns one object, not yet in the room. Sizes are arguments: look the real ones up.

| | |
|---|---|
| furniture | `shelf_unit`, `wall_shelf`, `desk`, `drawers(ajar=…)`, `low_table`, `stool` |
| books and paper | `book(title=…, lying=…)`, `shelve(r, unit, level, books)`, `paper`, `poster`, `note`, `frame`, `mirror`, `carton` |
| vessels | `mug(fill=…)`, `bottle(fill=…, label=…)`, `can`, `pot`, `cup_of_pens`, `bin`, `plant` |
| soft | `cushion`, `mattress`, `blanket(roll=…)` (a duvet thrown back: fat where it rolls over on itself), `towel`, `curtain` (hung from a rail), `clothes_rail` + `garment(sleeves=…)` (on hangers) |
| lights | `desk_lamp`, `floor_lamp`, `pendant`, `ceiling_panel` (each with `ob['lr_bulb']` where it has a bulb) |
| electrics | `outlet`, `switch`, `power_strip`, `cable(points)`, `sag(p0, p1, drop)` |
| screens | `screen_pages(name, images)`, `monitor`, `laptop`, `keyboard`, `mouse`, `headphones` (to hang on a peg; `flat=True` to lie on a desk) |
| moving | `clock()` → (clock, second hand, pivot) — `hands=True` adds separate hour and minute hands for `r.hands()` · `fan()` → (body, rotor, pivot, tilt) |

These are the common words. What makes a room one person's room is built in the project's `props.py` from `Part`.

## A project's files

| file | holds |
|---|---|
| `room.py` | `ROOM = dict(title, fps, size, seed, versions={name: dict(seconds, look, median)}, look, beacon_range, views, min_motions, min_askew)` |
| `inventory.py` | `INVENTORY = [dict(id, name, n, size, method, support, use, ref)]` |
| `skeleton.py` · `layout.py` · `film.py` | `build(r)` · `furnish(r)` · `light(r)`, `motion(r)`, `camera(r)`, and `plate(r)` when the review views should see the outside |
| `props.py` | this room's own things and pictures |
| `BRIEF.md` · `RESEARCH.md` · `REVIEW.md` | the design · where the numbers come from · the rounds |
