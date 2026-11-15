# 금빛 기름 매크로 (golden oil, macro, high-speed, in the dark)

Kit: `kit.js` → vendored as `scenes/kit-goldoil.js`, global `window.GOLD`. Source: one-scroll-bible
`motion/films/christ/kit-goldoil.js` (「그리스도」, 2026-11). The kit was the film's own engine from the start; its scenes
keep only their subjects. In that film it draws:
- the title (`goldoil-title.js`, 0:14–0:23): in the dark, one drop of oil hangs on a thinning thread, pinches off, falls in slow
  motion with a satellite droplet behind it, lands on old waxed boards without a splash, spreads as a film that carries the light,
  and the light gathers to where the title sits;
- the three anointings (`goldoil-anoint.js`, 0:23–0:44, and their recall at 2:28): Samuel tips a ram's horn over the boy David on a
  dusk hill, Moses pours from a small jug over Aaron at the tent door, Elijah throws his cloak on Elisha. All three use the same
  composition (the one who pours on the left, the one who receives on the right, the light behind), with small backlit
  silhouettes and the oil as the only bright, moving thing. Then the three lights become one sunrise behind an empty cross.

The film vendors this exact file. The kit only changed the last two header comment lines, in both copies. Before/after
stills (17, 31, 38 s, portrait and landscape) had identical PNG hashes. The one exception is landscape 31 s, which also
varies between runs of the *unchanged* file (a cold first run differs in ~87,000 pixels, a warm one in a few). Four renders
each with the old and new file gave the same hash, apart from one outlier that differed by 3 pixels. The figures, the hands
holding the horn, Elijah's cloak and the dusk and tent sets stay in the film.
Template: `template.html` is a different subject, a clay oil lamp on a stone floor filled from a small jug. The last drop
falls and spreads in front of the lamp, the wick is lit, and the film of oil carries the flame's light.

## What it looks like
Product-macro cinematography, the way a high-speed camera films a drop of honey or oil, but in a dark room with one warm light
behind. It never looks like an illustration. What makes it read as **oil** and not water, honey or lava:
- **Transparent amber, never emissive.** A drop is a ball lens. Per pixel it shows what is behind it, upside down and squeezed
  toward the rim (`GOLD.grab` gives it that backdrop). It absorbs blue first and green next as it gets thicker, so the centre
  goes deep gold and the edge stays pale. It glows only with light that comes from behind it.
- **A thick dark rim with a thin bright meniscus.** A Fresnel edge mirrors the room the right way up. There is a sharp key
  highlight plus a soft softbox window, a thin back rim, and a caustic focus at the bottom of the drop.
- **Viscous.** A long thread thins, pinches off and snaps back up. A satellite droplet follows. The drop wobbles as it falls
  (slow motion: about 2.3 s for the fall in the film). It never splashes. It lands, flattens and **spreads as a smooth film
  with a raised rim**: a lens-like dome sinks, faint rings run out, and the edge creeps out unevenly.
- **The film is a lens too.** `GOLD.pool` refracts the floor under it. The floor shows through soaked, darker and golden, bent by
  the meniscus band and the dome, with a sheen of the far light on the surface.
- **Pouring streams** (`GOLD.stream`): a layered ribbon (dark edge → amber → a white-gold core) that tapers. A ripple runs down it,
  a bead sits at the head of the flow, a dark refraction line runs near its far edge, glints ride down it, and a backlit haze
  surrounds it. It can follow any path (oil running down hair).
- **Vessels as silhouettes:** a ram's horn that widens and curls off frame (translucent amber near its thin tip, faint growth
  ridges) and a small jug. Each has a rim of light on the edge toward the light and a bead of oil at the lip.
- **Lens:** shallow focus (the floor is sharp only around the focus row), out-of-focus bokeh discs, dust motes lit only inside the
  beam, blooms with a soft streak and ghosts, a frame-wide glow from the brightest pixels, overlay grain and a warm vignette.
- **Camera (the scene's job):** a slow, constant push-in around the landing point, which stays put on screen. The film adds a
  small sideways drift while the drop hangs, and the shot opens from black.

## Meanings it carries
**Well:**
- Anointing: "Messiah / Christ = the anointed one". A drop that becomes light, oil poured over a head (kings, priests,
  prophets), the same act seen three times.
- Something small and precious given and spreading: one drop that spreads, a gift poured out (Mary's nard, the widow's jar that
  does not run out, the oil of gladness).
- Lamps and readiness: oil filling a lamp, the ten virgins, the tabernacle lamp kept burning, a light passed on.
- Consecration and the holy: the tent of meeting, holy anointing oil (Ex 30), a quiet sacred moment where a material carries
  the light.
- A title or a turning word: a slow macro moment that holds attention while the words land (it was the film's title shot).

**Badly:**
- People acting, faces and hands. The engine draws no people, and the film's figures are small backlit silhouettes. The hands
  holding the horn needed many rounds of fixes (see Checks).
- Landscapes, journeys, crowds, history told as events. It is a close, slow look built on one material.
- Bright daylight, cool colours, joy with motion. The look is warm amber in the dark, and its time is slow.
- Water, blood, wine. With the absorption fixed toward amber, any liquid reads as oil or honey. Changing `ABS` makes a new look.
- Long holds on a vessel. A horn shown alone for long reads as a prop ("이 뿔이 한참 보이는데", see Checks).

## Palette
| role | value |
|---|---|
| room | ground `#120b06`; the far lamp, out of focus: `rgba(246,184,100)` → `rgba(214,142,64)` (.14) → `rgba(130,78,32)` (.38) → `rgba(60,36,16)` (.7) → `rgba(26,16,8)` |
| oil | absorption per unit thickness `ABS = [0.05, 0.22, 0.95]` (blue first, then green); inner tint `GOLD.GOLD = [255,206,120]`; highlight `[255,246,228]`; back rim `[255,205,130]`; caustic `[255,214,140]` |
| stream (backlit) | edge `[96,46,8]` → `[190,110,28]` → `[246,170,64]` → `[255,226,150]` → core `[255,252,238]`; haze `[255,170,70]`; refraction line `rgba(40,18,2,.55)` |
| stream (front-lit) | `[52,26,6]` → `[140,76,18]` → `[214,140,44]` → `[255,228,160]` → `[255,252,240]` |
| vessels | fill `#120a05`, rim `[255,186,96]` at .85, horn amber through the tip `[200,110,40]` |
| floor | wood `74·l+6, 46·l+4, 26·l+2` (grain lines, fibres, pores); stone `66·l+6, 50·l+5, 36·l+4` (cracks) |
| lens | motes `[255,226,160]` → `[255,196,110]`; bokeh `[255,180,90]`; vignette `rgba(6,4,2,.6)` |
| the film's dusk (David) | `#140b07` → `#3d2011` → `#a85c24` → `#58290f` → `#0d0704`, sun `rgba(255,220,150)` |
| template (lamp) | clay `#1c1009` with a rim `[255,186,96]`, flame `[255,140,44]` → `[255,200,110]` → `[255,246,222]` |

## API (`const GOLD = window.GOLD`)
All in screen pixels, times in seconds. Load after `lib.js` (Pilot). No images, no network.
- `GOLD.grab(ctx, q = .25)` → `bg`: a small copy of the frame so far. Drops and the film refract it. Grab after everything
  that should show *through* the oil, and before the oil.
- `GOLD.drop(ctx, x, y, r, u, o)`: a drop, per pixel. Options:
  - `bg`; `s` (stretch, 1 = round, >1 tall); `tp` (taper, + = narrow top);
  - `neck: { top, hw: q → px }`, a thread up to y = top (q = 0 at the top … 1 at the centre) that melts smoothly into the body;
  - `alpha`; `flip` (a mirror image: the reflection in a waxed floor);
  - `lens` (2.4), `dens` (.85), `caus` (.5), `spec` (1), `rim` (1), `key: [lx,ly,lz]`.

  It reads and writes the canvas pixels (`getImageData`), so it ignores the current transform, clip and composite mode.
- `GOLD.floor(w, h, o)` → canvas: a floor in perspective with macro depth of field, built once. `o: { hor (screen y of the horizon),
  focus (the sharp row), kind: 'wood'|'stone', seed, lines (grain density) }`. Draw it with `ctx.setTransform` for the camera push.
- `GOLD.pool(ctx, cx, cy, R, k, o)`: a thin film spread on a surface seen at an angle. R is the max radius, k the spread 0..1.
  Options:
  - `bg` (grab after the floor), `tilt` (.16), `t` (s since landing), `glow` (0..1, the light it carries);
  - `dome` (0..1), `domeR` (.6), `caus` (.25), `sheen` (1), `rings: [[t0, amp, speed], …]`;
  - `ragged` (1), `seed`, `q` (.55), `alpha`.

  It is drawn with `drawImage`, so it follows the current transform.
- `GOLD.stream(ctx, x0, y0, x1, y1, k, o)`: a pour from a lip (a parabola). `GOLD.stream(ctx, pts, k, o)` follows any path.
  k is how far it has reached, 0..1. `o: { w (px at the source), t, back (backlit), alpha, glints (5), speed, taper (1.6) }`.
  Returns the head point. `GOLD.path(x0, y0, x1, y1)` gives the parabola as points.
- `GOLD.horn(ctx, x, y, L, ang, o)` → `{ x, y, w, C }`: a ram's horn. Oil leaves its narrow tip at (x, y), and it widens toward
  angle `ang` and curls. `o: { curl (.9), wide (.19), rim, rimA, light (rad: where the rim light comes from), fill }`. C is the
  centre line from the tip, `[x, y, angle, half-width]`; hands grip at `C[i]`.
- `GOLD.jar(ctx, x, y, L, ang, o)` → `{ x, y, C }`: a small jug, mouth at (x, y), body along `ang`. Same options.
- `GOLD.motes(ctx, t, o)`: dust in the beam. Options:
  - `n`, `seed`, `x`, `y`, `w`, `h`, `size`, `a`;
  - `light: [x, y, R]`;
  - `pull: [x, y, k, spreadX, spreadY]` gathers the motes to a point (e.g. under a title).
- `GOLD.bokeh(ctx, o)`: out-of-focus discs, `o: { n, seed, x, y, w, h, r, col, a, t }`.
- `GOLD.bloom(ctx, x, y, col, k, o)`: lens bloom from a bright point, `o: { r (140), streak (.45; 0 = none), ghosts (true) }`.
- `GOLD.glow(ctx, k, o)`: bloom from every bright pixel (downscale → cube → blur → screen), `o: { q (1/6), blur (7), wide }`.
- `GOLD.finish(ctx, t, o)`: grain and a warm vignette, `o: { grain (.08), vignette (.6), vy (.46) }`.
- Also: `GOLD.css(rgb, a)`, `GOLD.GOLD` (the oil tint).

```js
function draw(ctx, t) {
  backdrop(ctx, t); GOLD.bokeh(ctx, { … });                            // the far lamp, out of focus
  ctx.save(); ctx.setTransform(z, 0, 0, z, cx * (1 - z), S * (1 - z)); ctx.drawImage(FLOOR, 0, 0); ctx.restore();
  GOLD.pool(ctx, px, py, R, k, { bg: GOLD.grab(ctx, .5), t: t - tLand, glow, dome: Math.exp(-(t - tLand) * 2.6), rings });
  /* solid things: a lamp, a vessel (GOLD.jar / GOLD.horn), silhouettes */ GOLD.stream(ctx, lipX, lipY, x1, y1, k, { w, t, back: true });
  const bg = GOLD.grab(ctx); GOLD.drop(ctx, x, y, r, t, { bg, s, tp, neck });
  GOLD.motes(ctx, t, { light: [lx, ly, R] }); GOLD.glow(ctx, .5); GOLD.finish(ctx, t); /* words */ }
```
Draw in this order:
1. backdrop, bokeh
2. floor, light on the floor
3. `grab`, then the pool
4. solid things, then streams
5. `grab`, then drops
6. flames and blooms, motes
7. `glow`, `finish`
8. a dark band and the words

## Motion grammar
- Slow motion everywhere. A drop hangs about 1 s while its thread thins and falls for about 2.3 s. The film spreads for
  seconds (`1 − e^(−0.75·t)`). Only the wobble is fast.
- The camera always pushes in, slowly, about the point that matters. It never cuts inside the look.
- Light arrives and leaves softly: `ss` ramps of about 1.5 s for glow, and a short flash only at the moment of landing.
- In a pour, the oil is the only moving bright thing. People are still silhouettes.

## Performance
- `drop` and `pool` are per-pixel JavaScript. A drop costs about its bounding box (r² plus its thread). The film costs about
  (2·R·q)² pixels. Keep drops under about 10 % of the frame width and the film at `q` ≤ .55.
- `floor` is a per-pixel pass over the whole frame. Build it once per orientation (in `init`, or cached by size), never per frame.
- `grab` reads the canvas back, so use as few as you need (the template uses two per frame).

## Checks (what went wrong on the way)
- **The horn held the screen too long.** The maintainer said "이 뿔이 한참 보이는데 여기에 너무 시간 쓰는 것 같아" (2026-11-11),
  so the horn shot went down to 2.2 s. Then "이 뿔 장면은 없어도 되지않나?" (2026-11-13) cut it, and the title now melts straight
  into the dusk hill. A vessel on its own is a prop. Show it pouring, over someone.
- **Hands and the horn.** The film's look checks flagged Samuel's horn sitting on his head like a hat, arms like square sticks
  with mitten hands, and the horn reading as a flat board. They also flagged the horn passing in front of the boy's face "as if
  offering him a drink". All of this is figure work, not the kit. Keep the vessel's tip above and behind the head, use `C`
  from `horn()` for the grip, and never cross a face.
- **Three times, one composition, on purpose.** The three anointings share one composition so that "three offices meet in one"
  reads as a picture (`same_reason` in the film's review). When the climax recalled them, "세 직분 장면 심심함" came back
  (2026-11-14). The fix lifted the gold out of each recalled scene into one light that becomes a sunrise. Repetition needs a
  payoff.
- **A drop needs something to refract.** Without `bg`, or over a flat black backdrop, a drop is a brown disc. Put a warm,
  out-of-focus light *behind* it, and grab after it.
- **Template.** A jug left hanging after the pour read as floating, so it lifts out of frame once its drop has gone. A drop of
  3 % of the frame's short side was too small to read on a phone, so the template uses 4.5 %.
