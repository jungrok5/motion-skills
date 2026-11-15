# ENGINE — the film API

A film page is one module: `Film.create` → `world` → `life` → `landmark` → timeline (`time`, `camera`, `focus`,
`weather`) → words (`title`, `label`, `poi`, `area`, `street`, `clock`, `end`) → `check` → `start`. Units are metres,
x east, z south (north is −z), y up; the origin is the centre `fetch-place.mjs` was given.

## Film.create(o)
`{ place: './place.json', duration: 18, lang: 'ko' | 'en' | 'ja' | 'local', size: [1080, 1920], fps: 30, haze: 1,
vignette: .24, grain: .016, fadeIn: .6, edgeMargin: 30, edgeFog: .3, shadowMap: 4096 }` — `lang` picks `name:ko` etc.
from the data for `poi()` and `street()`, falling back to English, then the local name.

## F.world(o) — the city from place.json
| option | what |
|---|---|
| `palette` | colours, merged over `DEFAULT_PALETTE` (lib/world.js): `ground plaza path parking road curb marking grass park wood pitch sand deck playground flower[] quay bridge walls[] wallW[] roofs[] trim glass glassSky mansard chimney trees[] trunk lamp lampLight` |
| `levels: [a, b]`, `levelH` | storeys for buildings without a mapped height (seeded per building), metres per storey (3.2) |
| `roofs: { flat, mansard, gable, hip }` | roof style weights; OSM `roof:shape` wins; gable/hip only on near-rectangles, mansard needs ≥ 9 m and a clean inset |
| `paint(b, { h, r, P })` | per-building override → `{ wall, roof, mansard, windows (0 none · 1 punched · 2 bands · 3 curtain glass · 4 small), roofStyle }` — districts, a famous street, the glass towers |
| `clear: [{ at, r } \| { poly }]`, `clearIds` | remove OSM buildings / trees / lamps where the hand-built landmark goes |
| `trees: { scale, fill: { wood, park, grass }, kind, conifers }`, `extraTrees` | mapped trees always; `fill` = trees per m² added to bare parks and woods |
| `useOSMColours`, `heightScale`, `roofBoxes`, `waterTanks`, `waterY` (−2.4), `atlas` (4096 px), `tile` (240 m) | |
Water is every `natural=water` area and river line, sunk to `waterY` with stone quays and a planar reflection.
Buildings standing in water (moored barges) float at water level. Party walls (shared with a neighbour) get no windows.

## F.life(o)
`{ cars: 1 (density), buses: .06, speed: 1, drive: 'right' | 'left', carColours: [], people: 600, clothes: [],
crowds: [{ at, r, n, mill }], boats: { n, lane, len, wid, hull, stripe, paths }, seed }` — cars follow routes joined
from the drivable roads (straightest continuation), people the footways, plazas and sidewalks, boats the river
centre lines. Headlight pools, lit windows on cars and boats, wakes — all switch with the night value.

## F.landmark(name, build(K, g), { at, rot, top })
`g` is a group at `at` (map metres), turned `rot` degrees clockwise seen from above; build in metres around its base
centre. Kit (lib/kit.js): `mat(c, { rough, metal, emissive, glow, day })` (emissive scales with night) · `group` ·
`box(w,h,d,mat,{at,rot,round})` · `cyl(rt,rb,h)` · `sphere` · `lathe([[r,y]…])` · `extrude([[x,z]…], depth, {holes, bevel})` ·
`beam(a,b,r)` · `cable(a,b,sag,r)` · `lattice(c, { cell, bar, pattern: 'x'|'xx'|'grid' })` (alpha-cut skin, lattice
shadows) · `column(sections, skin, { edges, edgeMat })` (lofted 4-sided tube through `{ c:[x,y,z], hx, hz }`) ·
`band(w,h,d,mat)` (lattice ring: friezes, railings) · `arch(span, rise, t, d)` · `dome(r,h)` · `lights(points, c,
{ size, k, twinkle: { from, to, rate, only } })` · `beacon(at, { len, spread, speed })` · `screen(w, h, draw(g, t, w, h))`
(a canvas redrawn from t: billboards, departure boards) · `sample(path, step)` · `every(fn(t, look))`.
See references/LANDMARKS.md.

## Timeline
- `F.time([{ t, sky: 'day'|'morning'|'golden'|'dusk'|'night'|'overcast', mix: { night: .3 }, ease, …overrides }])` —
  any preset field can be overridden per key (`sunAz`, `sunEl`, `windows`, `lamps`, `fogD`, `water`, …; lib/look.js).
- `F.camera([{ t, at: [x, z], h, yaw, pitch, dist, fov, ease }])` — Catmull-Rom through the keys. `yaw` = the compass
  bearing the camera looks toward (0 north, 90 east, −45 north-west); write it continuous (−45 → −223, not 315 → 137).
  `pitch` = degrees down from the horizon; `dist` from the target point (`at`, `h`).
- `F.focus([{ t, tilt, focusY, band, fall }])` — tilt-shift strength (0–1), the sharp band's centre (0 top – 1 bottom
  of the frame), its half-height and the fall-off.
- `F.weather([{ t, rain }])` — rain 0–1: streaks, wetter light, denser haze, rain noise in the score.
- `F.cue(t, kind, o)` — score events (`sparkle` with `len`, `chime`). `F.every(fn)` — your own per-frame update.

## Words
- `F.title({ kicker, text, sub, coords, from, to, x, y, size })` · `F.clock({ keys: [{ t, time: '16:40', icon:
  'sun'|'sunset'|'moon'|'cloud'|'rain' }], from, to })` · `F.end({ kicker, text, sub, from })`
- `F.label({ text, at, y, icon, color, big, from, to, priority, side, sub, minDist, maxDist })` — icons: food cafe bar
  shop hotel museum sight star park transit ferry worship culture school health info view water
- `F.poi(match, o)` — a POI from the data by name (string or RegExp), icon from its category, text from `lang`
- `F.autoPois({ near, r, n, cats, gap, skip, label, each })` — pick n spread-out POIs
- `F.area({ text, at, color, from, to })` — italic area / water names
- `F.street(match, { text, size, from, to, at, near, offset, opacity, readAt })` — the name painted along the real road
  (joined chain), reading left-to-right for the camera at `readAt`
Pins fade where they overlap a higher-priority pin, flip side at the frame edge, stay out of the top 4 % and bottom 8 %.

## Checks and contract
`F.check(name, t => bool)` adds a rule. Built in: the frame stays on the map (or ≥ 30 % in haze), the camera clears the
roofs, pitch 8–89°, every `poi` / `street` was found. `check.mjs` also proves loading, fonts, determinism, no blank or
blown frames, pins never overlap.
`window.seek(t)` · `renderAt(t)` · `DURATION` · `FPS` · `SIZE` · `runChecks(t)` · `cues()` · `FILM` · `__ready`.
Query: `?render=1` (no live loop) · `?t=8` · `?scale=.5` · `?msaa=0` · `?shadow=2048` ·
`?off=post,labels,life,shadows,reflect`. Live page: loops; space pauses; ← → step a second.
