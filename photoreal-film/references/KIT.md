# KIT — the `pf` library

`from pf import draw, geo, light, mat, util` inside a shot. Units are metres, angles radians unless a name says `deg`
or the argument is a camera/sun angle (documented below). Every builder links its object to the scene and returns it.

## A shot (`pf.film.Shot`, the `s` in `build(s)`)
| call | what |
|---|---|
| `s.n`, `s.fps`, `s.id` | frames in the shot (local frames run 1..n), frame rate, id |
| `s.u(f)`, `s.sec(f)` | frame → 0..1 across the shot, → seconds |
| `s.rng(tag)` | a seeded `random.Random` for this film + shot + tag (the only allowed randomness) |
| `s.camera(lens=50, fstop=2.8, sensor=36, blades=0, squeeze=1.0, clip=(0.005, 2000))` | the lens; `blades` shapes the bokeh, `squeeze` > 1 makes it oval (anamorphic) |
| `s.shoot(fn)` | `fn(f) → dict(pos, look, focus=point or metres, roll=deg, up=(x,y,z), lens=mm, fstop=N)` |
| `s.shake(f, pos=0.002, rot=0.15, speed=1, seed=0)` | hand-held offset `((dx,dy,dz), roll_deg)` for frame f |
| `s.animate(target, fn)` | `fn(f) → {data_path: value}` baked to linear keys on frames 0..n+1; target = object, light data, modifier, node socket … |
| `s.spin(ob, rpm, axis=2)` | constant rotation |
| `s.plate(shot_id, frame)` | path of a finished frame of another shot (declare it in `film.py` `plates=[…]`) |
| `s.film`, `s.scene`, `s.quality` | the Film, the bpy scene, the quality preset in use |

`film.py`: `FILM = dict(title, fps=24, size=(1920, 804), bars=(1920, 1080), seed, look={…}, shots=[dict(id, frames,
fade_in=('black'|'white'|'#hex', n), fade_out=(…), look={…}, plates=[(shot, frame)], shutter=0.5, locked=False)])`.
`look` keys and defaults are in `pf/film.py` `DEFAULT_LOOK`.

## geo — modelling
| call | makes |
|---|---|
| `lathe(name, profile[(r,z)…], seg=96, closed=True, rmod=None, angle=35)` | a profile turned round Z. `rmod(theta, r, z, i) → r` for knurls, ribs, scallops. Points with r = 0 become poles |
| `prism(name, outline[(x,y)…], depth, holes=(), bevel=0, bevel_seg=3)` | an extruded outline with a real bevel inside the outline |
| `tube(name, path[(x,y,z)…], radius, seg=12, closed=False, taper=None)` | a swept round section; `helix(r, pitch, turns)` gives spring paths |
| `box(name, size, bevel_w=0)`, `cyl(name, r, h, bevel_w=0)`, `ring(name, r_in, r_out, h, bevel_w=0)`, `sphere(name, r)` | primitives with rounded edges |
| `plane(name, sx, sy)`, `grid(name, sx, sy, nx, ny, height(X, Y))` | flat and height-field surfaces (`fbm2(X, Y, seed)` for terrain) |
| `text(name, body, size, depth, bevel_w, tracking, font)` | 3D lettering (`draw.FONT_TITLE`, `draw.FONT` are bundled Inter, OFL) |
| `scatter(name, count, bounds, size, seed)` | one mesh of tiny octahedra: dust, grit |
| outlines: `circle`, `arc`, `rrect`, `gear(teeth, r_out, r_root)`, `transform2`, `rrect_profile(r0, r1, z0, z1, b)` | 2D point lists for `prism` / `lathe` |
| `bevel(ob, width, seg)`, `subsurf`, `solidify`, `boolean(ob, cutter, op)`, `apply(ob)`, `shade(ob, angle)` | modifiers, applied at once |
| `clone(ob)`, `radial(ob, n, parent)`, `join(objs)`, `group(name, objs)`, `empty(name, loc, parent)`, `origin_to(ob, point)`, `look_at(ob, target)` | instancing and rigging |

Keyword arguments on every builder: `mat=`, `parent=`, `loc=`, `rot=`, `scale=`.

## mat — materials (all return a bpy material)
| recipe | key arguments |
|---|---|
| `metal(name, color, rough, brushed=None|'linear'|'radial'|'cast', grain, wear, aniso, scale, coat, tarnish)` | `scale`: 1 for a part seen whole at 0.3-1 m, 30-60 for a macro of a 2 cm part |
| `paint(name, color, rough, coat, peel, flake, wear, scale)` | lacquer, enamel, car paint |
| `glass(name, tint, ior, rough, coating=nm)` | coating 90-140 nm magenta/amber, 180-260 nm green/blue |
| `plastic`, `rubber`, `leather(color, rough, cell, depth, spec)`, `matte` | |
| `emit(name, color, strength, falloff)` | a surface that is a light |
| `floor(name, color, rough, smudge, scale)` | the polished studio floor |
| `wood(light, dark, rough, scale, coat, axis)`, `rock(light, dark, scale, disp)`, `water(color, rough, ior, depth_tint)` | |
| `picture(name, image, rough, emission, coat)` | an image on a surface (a plate or a `pf.draw` image) |
| `engraved(name, base, mask, wrap=('cyl', z0, z1) | ('disc', r0, r1), fill, depth, rough, brushed, scale, flip, tarnish)` | paint-filled engraving from a strip image wrapped round the part |
| `volume(name, density, color, aniso)` | haze material (use `light.haze`) |
| `mat.G(name)` | the graph builder itself, for a material no recipe covers: `g.n(kind, Input=value_or_socket)`, `g.noise`, `g.ramp`, `g.mix`, `g.bump`, `g.principled` |

Colours are `'#rrggbb'` (sRGB) or linear tuples.

## light
| call | what |
|---|---|
| `area(name, loc, aim, size, watts, color, spread=180, visible=False)` | softbox; a number as `color` is a colour temperature in K |
| `panel(name, loc, aim, size, strength, color)` | an emissive plane *in* the picture |
| `spot(name, loc, aim, watts, color, angle, blend, radius)`, `point(...)`, `sun(elev, azim, strength, color, angle)` | |
| `sky(scene, elev, azim, strength, sun_strength, air, dust, ozone, altitude)` | physical sky as the world |
| `ambient(scene, color, strength, top=None)` | flat or gradient world |
| `haze(name, bounds, density, color, aniso)` | a box of even haze |

## draw — images drawn in Python
`canvas(w, h, bg)` → `(image, ImageDraw)`; `text(d, xy, s, size, fill, tracking, anchor)`; `ticks(...)`; `font(size)`;
`save(shot, name, image)` → path under `out/tex/`. For a strip that wraps a part keep the same px/mm both ways:
width = circumference × ppm, height = band × ppm (see `strip()` in `examples/aperture/props.py`).

## util
Easing (`t` in 0..1): `linear smooth smoother ease_in ease_out ease_in_out expo_in expo_out back_out spring`;
`seg(f, f0, f1, ease)` = progress of frame f through [f0, f1]; `pulse(f, f0, f1, f2, f3)`; `lerp`, `remap`, `clamp`;
`noise1(x, seed)`, `fbm1(x, seed)`; `rng(seed)`; `hexcol('#rrggbb')`, `kelvin(K)`.

## finish — the look (`film.py` `look=`)
`exposure` (stops) · `bloom`, `bloom_at` · `halation` · `streak` · `ca` · `distortion` · `vignette` · `tonemap`
(`'agx'`, `'filmic'`, `'linear'`) · `contrast` · `saturation` · `lift` · `shadows`, `highlights`, `split` · `black` ·
`grain`, `grain_size` · `soften`. `pf.finish.stats(img)` and `sharpness(img)` are what `check.py` and the contact sheet use.

## sound — `pf.sound.Score`
`drone(t0, t1, freq, gain)` · `whoosh(t0, t1, gain)` (peaks at t1: put the peak on the cut) · `tick`, `ticks(t0, t1, rate)` ·
`clunk(t, gain, size)` · `shutter(t)` · `hit(t, gain)` · `riser(t0, t1)` · `swell(t0, t1, notes_hz, gain)` · `shimmer` ·
`rumble` · `surf` · `add(t0, mono, gain, pan, reverb)` for your own signal. A project's `score.py` has
`def score(sc, film)`; without it `sound.auto(film)` scores the cut list.

## Quality presets (`pf/scene.py` `QUALITY`)
| preset | samples | scale | for |
|---|---|---|---|
| `draft` | 10 | 0.25 | check.py, composition |
| `preview` | 24 | 0.5 | light, focus, materials (5-10 s a frame on 4 cores) |
| `final` | 40 | 1.0 | the film |
| `hero` | 256 | 1.0 | posters, plates, single stills |

`--spp` and `--scale` override them. A GPU that Blender can see (OptiX, CUDA, Metal, HIP, oneAPI) is used automatically.
