# Engine and kit reference

All units metres, y up. Colours passed as `col(hex, k)` are linear and may exceed 1 (HDR); plain hex strings are sRGB.

## Film (`lib/cine.js`)
```js
const film = new Film({ dur, fps = 30, W = 1080, H = 1920, fov, near, far,
  atmos: { density, falloff, base = 0, start = 0, color, colorUp, max, scatter, anisotropy, phaseMix, skyGlow },
  cloud: { bottom, top, density, scale, cover, steps, wind, litTop, litBottom, shadow },   // optional raymarched slab
  bloom: { strength, radius, threshold, tint },
  dof:   { focus, aperture, maxCoc } | false,       // aperture = px of blur at infinity (1080-wide frame); set focus each frame
  look:  { exposure, contrast, saturation, lift, gain, shadowTint, highTint, vignette, grain, grainSize, ca, flip } });
film.scene, film.camera                               // plain three.js
film.lamp(pos, hex, { power, size, light, distance, shadow, fog })   // glow in fog; light > 0 also adds a PointLight (candela)
film.mirror({ y, res, streak, atmos })                // → uniforms for wetMaterial; call film.ground(mesh) on ground meshes
film.addPrecip({ kind: 'rain'|'snow', count, box: [min, size], speed, size, sway, wind, shutter, ambient, bright, far })
film.onFrame((t, film) => { … })                     // move things; runs before each render
film.start()                                          // page contract (seek, DURATION, __ready, live loop)
wetMaterial(film, mirrorUniforms, { color, roughness, puddle, puddleScale, ripples, wet, distort, streakMix, setts,
  settsAspect, mask: 'GLSL expr of vec2 p (world xz) → 0..1', drops: [[x, z, t0], …], virtualDepth })
```
Layers: 0 = normal, 1 = ground (main camera only, never in the mirror), 2 = main camera only (trees: invisible in
reflections at night, and they are the most expensive thing to draw twice).

Lamps: `power` scales the in-scatter (halo), `size` softens its core (m), `fog` multiplies the local fog density for that lamp.
Keep ≤ 24 lamps (shader array) and ≤ ~6 real lights (`light > 0`): every real light costs every lit pixel.

## Kit (`lib/kit.js`)
| function | notes |
|---|---|
| `sky(film, { top, mid, horizon, sunDir, sunColor, sunGlow, clouds, stars })` | gradient dome, sun disc + glow, soft fbm clouds; fogged like the scene |
| `facadeMaterial({ mode: 'punched'|'curtain', wall, cell, win, lit, cluster, clusterScale, base, top, seed, litColor, litColor2, cool, flicker, blinds, groundShop, … })` | windows in world space on every vertical face; per-window tone, blinds, curtains, TV flicker; curtain mode reflects the sky and draws mullions; `clusterScale` [.09, .55] lights whole floors |
| `building({ w, d, h, x, z, ry, mat, seed })` | box with its own window seed |
| `stoneMaterial({ color, course, block, grime })` | coursed ashlar with joints, tone per block, grime low down |
| `tree({ seed, height, trunk, depth, spread, up, twig, twigR, minR, lean, view, layer })` | bare deciduous tree; `view` = direction to the camera (twig ribbons face it); `height` ≈ real height |
| `streetLamp(film, { x, z, h, style: 'pole'|'lantern'|'arm', color, power, light, distance, bulb })` | post + head + lamp |
| `wire(points, { r, sag })` | catenary through points |
| `tram(film, { length, red, cream, interior, interiorPower, passengers, sign })` | lofted 1960s tram, lit interior, people, headlights; returns `{ group, heads, lights, noseX, ySign }` |
| `car({ color, snow, tail })` | extruded sedan, optional snow slabs |
| `person({ seated, height, coat })` → `userData.walk(phase)` / `userData.pedal(phase)` | silhouette-grade |
| `dog({ size })` → `userData.walk(phase)` | |
| `skyscraper(film, { x, z, w, d, h, steps, crown, spire, mat, redLights })` | stepped tower, lit crown, spire with blinking red lights |
| `clockTower(film, { h, w, stone, time: [h, m], spireShare })` | gothic tower: buttresses, lancets, 4 clock faces, belfry, pinnacles, spire |
| `gabledHouse({ w, d, h, roofH, roofC, mat })`, `leafMesh(count, { colors, size })` | |
| `tubesGeometry(segs, sides)`, `ribbonsGeometry(segs, view)`, `roundedBox`, `mergeGeometries`, `std`, `glow` | helpers |

## Recipes
- **Rain at night**: `mirror({ res: .5 })`, `wetMaterial({ roughness: .24, puddle: .5, ripples: 1, setts: .11 })`, rain
  `count 26k, size .0035, shutter 1/26, bright .55`, fog `start` just beyond the subject, lamps `phaseMix .93`.
- **Snow**: displaced snow mesh with real tyre grooves, glints in the emissive, prints in the normal (see `shots/snow.html`),
  snow `size .014, sway .45, far 30` (beyond that, flakes read as static), lanterns with real light 260 cd near camera.
- **Clouds / ground fog**: `cloud: { bottom, top, density .1, scale .0032, cover .4, steps 40 }` — the slab is raymarched in
  the post pass against scene depth, so buildings cut it correctly. Lit by `litTop` from above and `litBottom` from below.
- **The puddle is the picture**: `mirror({ res: 1 })`, `wetMaterial({ virtualDepth: true, mask: … })`, `look.flip: 1`,
  focus = distance of the reflected subject. Things on the water (leaves) are seen directly and blur as near objects.
