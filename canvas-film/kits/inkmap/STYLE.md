# 양피지 잉크 지도 (ink map on parchment)

Kit: `kit.js` → vendored as `scenes/kit-inkmap.js`, global `window.InkMap` (with `InkMap.MED`, the ancient Mediterranean
and Near East). Source: one-scroll-bible `motion/films/silence400/film.html` (「침묵의 400년」, 2026-10: the diaspora,
Alexander, Rome's roads, the gospel on the roads), after the first film's `motion/pilot/wilderness.html` map and old
maps like the Peutinger Table. That film now draws with this kit (vendored); refactor diffed pixel-identical on 276
stills, both orientations. Template: `template.html` (a different subject: one journey, Ur → Haran → Canaan).

## What it looks like
One big map on stained parchment. It is warm, blotched, burnt at the edges, with a faint graticule. Coasts are drawn in
pencil-ink with four ripple lines running along them and a faint blue-grey wash on the water. The great rivers are ink
lines with a hand tremor. Mountain ranges are rows of outlined peaks, hatched on the shadow side. Desert is fine
stipple. There is a compass rose and names with a parchment halo. Then history is **drawn onto it**:
- a people on the move is a dashed ink trail with a red head;
- an army is red dashes with a bronze watercolour wash spreading behind it;
- built roads are ink casings with vermilion inside;
- sea lanes are fine blue dots with small ink ships;
- cities get lamps that light;
- the gospel or a promise is a route of gold light, or light running out along every road.

The camera moves over that one map with eased keys of lon, lat and zoom. **The shot never cuts.**

## Meanings it carries
**Well:** journeys (patriarchs, exodus, exile and return, Paul); spread (a people scattered with their Scriptures, a
language following an army, a message on the roads); preparation (roads, lanes and synagogues ready before the
gospel); where something happened, and how far; "the whole region at once", as one pull-back.
**Badly:** inner life, faces, a single intimate moment, anything abstract with no place. A map is also not proof:
label what is traditional or approximate, and don't draw a precise route the sources don't give.

## Palette
| role | value |
|---|---|
| parchment | `[233,220,192]` → `[196,168,122]` by stain and edge burn; graticule `rgba(120,90,50,.06)` |
| water | wash `rgba(96,136,160,.42)` (multiplied with the stains), ripples `#2c4a5e` at .17–.43 |
| ink | `#3A2418` (`INK`): coasts 2.6, islands 2, rivers 1.6–2.6, peaks 1.7 / 1 hatch; desert `rgba(58,36,24,.32)` |
| moving | red `#B23A1E` (`RED`); army wash `rgba(196,122,58,.32/.22)` blur 18; roads `#c8402a` (`ROAD`) in 6.5 ink |
| sea lanes | `rgba(40,70,110,.8)` dots |
| light | gold route `#f2c96a` + shadow `rgba(255,200,90,.95)`; light run `#f6d27a` / core `#fff6da`; lamps `[255,196,90]` |
| around | `#2a1d12` (`BG`); word bands `rgba(10,6,3,.78–.94)` |

## Fonts and words
Noto Serif KR 600 for place names: big region names 64 px with letter spacing 22, cities 38 px with a dot. The map
holds no words of its own. Pass the translated text into `build(…, { labels })` and `label(ctx, text, …)`, so every
language uses its own Bible's place names. A label written into `build` cannot fade. Use `label()` live for a place
that appears during the shot, e.g. a city founded halfway through. Spoken words go in dark bands (`bands()`) at the top
and bottom, never on the light parchment.

## API (map pixels unless noted; z = the zoom `begin()` returns — divide line widths by it)
- **Projection:** `projection({scale,lat,lon0,lat0})` sets `mx(lon)` and `my(lat)`. The default suits the Mediterranean
  to Persia. `P(place)` maps a city name or `[lon,lat]` to `[x,y]`.
- **Map:** `build(D, {labels, font, cityDots})` returns a canvas and paints once (~0.5 s). D holds `seas`, `islands`,
  `city`, `rivers`, `ranges`, `desert`, `compass`, `extent`, `grid` and `seed`. `MED` is a ready D for the ancient
  Mediterranean and Near East, with 70 cities including patriarchal, exodus and kingdom sites. `MED.routes` gives
  example historical lines: Roman roads, sea lanes, Paul's journeys, Alexander and Abraham.
- **Camera:** `camAt(keys,t)` takes keys `[[t,lon,lat,zoom],…]` and returns `[lon,lat,z]`. `begin(ctx,cam,map)` returns z.
  `end(ctx)`. In screen space: `dim(ctx,k)` and `bands(ctx,top,bottom)`.
- **Paths:** `route(places,n)`, `smoothPts`, `arcPts(a,b,bend)` (a curved hop), `wobble`, `pth`, `polyLen`,
  `partial(ctx,pts,p)` (strokes the first fraction p and returns the head), `pointAt(pts,p)`, and
  `atPlace(route,pts,name)` (where a stop lies, by length).
- **Route styles** (each strokes fraction p of pts and returns the head): `trail`, `march(…, wash)`, `road`,
  `lane(…, a)`, `goldRoute` and `lightRun`.
- **Props:** `cityLamp(ctx,p,k,z,t,seed)`, `label(ctx,text,p,a,{size,dx,dy,al})`, `tinyScroll(ctx,x,y,s,a)`,
  `inkShip(ctx,x,y,s,dir,a)` and `glow`.

```js
const M = InkMap;  // init: M.build(M.MED, { labels: [{ text: Pilot.tr('대해'), at: [18, 34.6], size: 64, ls: 22 }] }); pts = M.route(M.MED.routes.paul[0], 10);
function draw(ctx, t) {
  const z = M.begin(ctx, M.camAt([[0, 36, 35, 1.6], [12, 31, 37, 1.2]], t)); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
  M.goldRoute(ctx, pts, ss(2, 10, t), z); M.cityLamp(ctx, 'antioch', 1, z, t, 0);
  M.end(ctx); M.bands(ctx, 360, H * .74); /* captions */
}
```

## Motion grammar (what worked)
- **One shot, many beats.** The film's 35-second preparation sequence is one camera move over one map: scattered people
  → one language → the Bible in Greek (a scroll over the dimmed map) → roads and lanes → synagogue lamps. Cuts would
  break "it was all one plan".
- **Things are drawn, not shown.** Every route draws itself at the speed of the story. A head (red dot, ink dot, light)
  shows where it is now. Labels appear when the thing they name exists.
- **Stagger by index.** `st = t0 + i * .3–.45`. Many routes starting in a ripple read as spread; all at once reads as a
  diagram.
- **Light last.** The parchment dims a little (`dim`) before light runs on it, or gold reads as yellow on cream.
- **Camera keys:** hold before a beat, then move. Zoom out through the long moves and in on the place that matters
  (×2–2.5 for one city, ×0.85–1 for the whole region).

## Performance (1080×1920, Windows laptop CPU, seek + 1 px readback, measured 2026-10-31)
The template is ready in 0.6 s, almost all of it `build` for MED. Per frame: 13–21 ms (one `drawImage` of the map, the
routes, the lamps, the bands; the light run is the top end). In 「침묵의 400년」 the map shots run 24–33 ms with dozens
of roads, lanes, ships and lamps. `march`'s blurred wash is the one costly call: use one at a time.

## Pitfalls
- **The map canvas is about 5,000 × 2,800 px.** That is fine for Chromium, but don't build two, and don't build in draw().
- **Line widths and sizes are in map pixels.** Divide by z for constant screen size: `2.4 / z`, `5 / z`. Labels
  written into the map scale with it, which is right for place names.
- **Places by name must exist in `D.city`** (the built map's table). `P()` and `arcPts()` read it after `build`.
- **City dots:** `build` dots every city in `D.city`. Pass only the cities the film uses if you want a cleaner map, or
  `{ cityDots: false }`.
- **Labels over routes:** draw live labels after the routes. Keep big names (seas, regions) out of the routes' way, or
  they get crossed.
- **Words on the parchment** need `bands()`. Measure the narration's safe line and pass it as `bottom`.
- **Geography is simplified.** It is a stage, not a survey. Approximate sites carry the traditional location. Say so in
  the description when it matters.

## What a scene author still draws
The story's routes and their timing; which places are named, and when; the camera keys; any figure or object on the
map beyond ships, scrolls and lamps (in the worked example: a gold-leaf cross on a hill above Jerusalem, a miniature of
the statue in the corner, the copperplate ship sprite).
