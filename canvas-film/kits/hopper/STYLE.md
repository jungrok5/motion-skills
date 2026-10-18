# B · 호퍼풍 사실주의 (Hopper-style quiet realism)

Kit: `kit.js` → vendored as `scenes/kit-hopper.js`, global `window.Hopper`. Source brief: Lemo-Opuscar no. 48
"Hopper-Style American Realism" (after Edward Hopper, *Office in a Small City*, *Morning Sun*, *Nighthawks*).
Worked example: [문틈 B](../../sermons/2026-10-18-1cor5/film/scenes/door-b.html) (night). Template: `template.html` (day).

## What it looks like
A still, almost empty one-point interior (or a street seen through a window), painted in big flat matte planes with a
few long dragged strokes on canvas weave. One unseen light source, a bulb or the low sun, throws **hard-edged**
parallelograms through an opening onto the floor and walls. Crisp cast shadows cross that light: window bars, a figure,
or something we never see. The palette is desaturated, with **one** saturated accent. Figures are 3–4 soft-edged value
shapes, never outlined, standing apart. The camera is low (1 m), fixed, and pushes in by ≤ 5 % over the film.

Under the hood it is a real little 3D world in metres seen through a pinhole camera, so every light shape is a true
projection, and that is why the light looks right. The world is painted twice in init, once **unlit** (ambient) and
once **lit** (same seeds, lit colours). A light is "clip to the projected light polygon, show the lit layer". A shadow
inside it is "clip to the projected silhouette, show the unlit layer again".

## Meanings it carries
**Well:** solitude, waiting, absence (an empty room), the ordinary day; light *arriving* (grace, revelation, hope, a
call); something at a threshold (a door, a window, a gap); time passing (the sun's patch travelling); one act that
breaks a still order; a presence shown only by its shadow (temptation, fear, the unseen).
**Badly:** crowds and many characters, fast action, celebration and joy at volume, cosmic or abstract ideas with no
place, nature and landscape (a street through a window works, open country does not), spectacle (the supernatural
works only as shadow and light), anything that needs a lot of on-screen text.

## Palette
| role | night (문틈) | day (no. 48) |
|---|---|---|
| walls | back `#332f27`→`#423b2f`→`#4a4234`, left `#2a2f2c`, right `#36362e` | `#9EB8A0`, dark `#5E7C66` (shade ×0.72) |
| ceiling / bg | `#1e2426` / `#0d0f0f` | cream `#ECE6D2` |
| floor | planks `[44,34,27]`–`[34,26,21]`; lit `[180,166,136]`–`[150,136,108]` | grey-green `#7E8876` |
| light | cold bulb `#dfe3cf`, warm "hope" `#f6cf92`, moon `rgba(84,100,104,.34)` | sun `#FCE6AC`, later `#F7CB8C` |
| trim | `#4f4b40` | cream in shade |
| **accent** | `#9c1a1a` (`Hopper.ACCENT`, or `SCRIPT.accent`) | same |
| words | text `#efe6d3`, source `#cbbfa9`, CTA `#e9cf9f`, shadow `rgba(5,6,6,.9)` | same |

Avoid heavy outlines, vector-clean figures, dark saturated walls, and fuzzy light patches. Light edges stay hard.

## Fonts and words
Noto Serif KR 600 for captions and the 700 title. Noto Sans KR for the source line, passage and CTA
(`Hopper.FONTS` → `Pilot.run({ fonts })`). Captions sit in the upper third: portrait y 400, landscape y 160, usually
over the back wall. The end card sits at portrait y = H·0.36 over the room sunk to 30 % (`Hopper.sink`).

## API (all lengths in metres unless px is stated; a `poly` is `[[x,y,z],…]`; x right, y up, z away; floor y = 0)
- **Setup:** `init(o)` builds the weave and vignette (W×H, ~0.3 s). `layer(paint)` → a W×H canvas.
  `weave(w,h,seed)`, `vignette(w,h,o)`.
- **Camera:** `eye(ori)` gives the low still eye preset. `camera(o)` → `cam` with `P(x,y,z)`→px, `ppm(z)`,
  `clip(poly)`, `path(ctx,poly,fresh)`, `fill(ctx,poly,style)`. `Q.z/Q.x/Q.y` build axis quads. `clipRect(poly2,…)`,
  `hull(pts,i,j)`, `hinge(x,z)`→`(th,a,b,y)`, `bez(out,p0..p3,n)`.
- **Room:** `room({xl,xr,h,zn,zb}, cam)` → `R` with `R.poly.{floor,ceiling,left,right,back}` and `R.wall(name)` →
  `map(u,v,w)`. `R.paint(ctx, look)` paints the shell (walls, strokes, ceiling shade), `R.boards(ctx, look, {seed,z1,clip})`
  the plank floor, `R.baseboards(ctx, {gaps,…})` the skirting. Looks: `LOOK.night`, `dayLook(k, sun?)`, `BOARDS.night/nightLit`,
  `boardsLook(hex,k)`.
- **Openings:** `opening(ctx, cam, map, {u0,u1,v0,v1,depth,hole,reveal,head,sill,casing,ledge})` → `{poly, outer}`
  (paint what is beyond inside `poly`). `mullions(…)`, `panes(map, rect, rows, cols, bar)` → glass cells.
- **Lights:** `lamp({x,y,z})` is a point light, `sun([dx,dy,dz])` a parallel one. Both give `onto(q, plane)`,
  `project(poly, plane)` and `cast(sil, {x,k,sink,z | place(u,v), clip, plane})` (a silhouette's shadow). The lamp also
  gives `through(rect, plane, depth)`, the pool through a doorway or window. Planes: `FLOOR`, `wallZ(z)`, `wallX(x)`.
  `boxShadow(L, box, plane)`. `litFraction(L, pts, cells, plane)` says how much of an object the light reaches.
- **Light and shadow drawing:** `clip(ctx,cam,polys)`, `within(ctx,cam,polys,fn)`, `drawLit(ctx,I,lit,warm,wk)`,
  `dim(ctx,amb)`, `shadowIn(ctx,cam,polys,paint)`, `lightShapes(…, 'screen')`, `glow(ctx,[sx,sy],r,'r,g,b',a)`,
  `wash(ctx,'r,g,b',a)`, `glowLine(…)`, `softShadow(ctx,cam,poly,blur,a)`, `lampTint(ctx,tint,y0,fall)`.
- **Paint:** `strokes(ctx,cam,n,seed,fn(u,v)→xyz,{len,slant,w,a,hi,lo})`, `plane(ctx,cam,poly,style,st?)`,
  `box(ctx,cam,[x0,x1,y0,y1,z0,z1],{front,top,left,right,bottom},st?)`, `bevelPanel(ctx,cam,map,[a0,a1,y0,y1],e,{…})`,
  `lit(hex,sun)`, `shade(hex,k)`, `mute(hex,k)`.
- **Accent:** `brush(seed)` makes the bristles once. `brushStroke(ctx,cam,{a,b,w,seed},br,p,lb,color)` is a loaded dry
  brush drawn on to progress p.
- **Figure:** `figureParts({h,w,skirt})` → `{parts, sil}`. `figure(ctx,cam,F,{x,z,lit,side,colors,litColors,sun,soft})`
  paints soft value shapes, lit side fading across the body, layers cached.
- **Motion:** `creak(dt,d)`, `breathe(t,t0,rise,period)`, `flicker(t,rate,seed,thr)`, `push(ctx,zoom,[sx,sy])`,
  `whip(ctx,u,dx)`, `flash(ctx,a)`.
- **Post and words:** `finish(ctx,{grain})` (weave overlay .55 + vignette), `sink(ctx,k)`, `captions(ctx,t,lines,o)`,
  `endCard(ctx,t,card,at,o)`, `fade(ctx,t,dur)`, plus `PAL`, `ACCENT`, `FONT`, `FONTS`.

```js
const cam = Hopper.camera(Hopper.eye()), R = Hopper.room({ xl: -1.05, xr: 1.45, h: 3.2, zn: .7, zb: 5 }, cam);
const sun = Hopper.sun([1, -.45, .3]), cells = Hopper.panes(R.wall('left'), [2.2, 3.4, .35, 2.6], 2, 2, .07);
let base, lit;  // init: Hopper.init(); base = Hopper.layer(x => { R.paint(x, Hopper.dayLook(.72)); R.boards(x, Hopper.boardsLook('#7E8876', .72)); });
                //       lit = Hopper.layer(x => { R.paint(x, Hopper.dayLook(1, '#FCE6AC')); R.boards(x, Hopper.boardsLook(Hopper.lit('#7E8876'), 1)); });
function draw(ctx, t) {
  ctx.save(); ctx.drawImage(base, 0, 0);
  ctx.save(); Hopper.clip(ctx, cam, [R.poly.floor]); Hopper.clip(ctx, cam, cells.map(c => sun.project(c, Hopper.FLOOR)));
  Hopper.drawLit(ctx, 1, lit); ctx.restore();          // + Hopper.shadowIn(...) for anything standing in the light
  ctx.restore(); Hopper.finish(ctx); Hopper.captions(ctx, t, SCRIPT.lines); Hopper.endCard(ctx, t, SCRIPT.endCard, SCRIPT.beat.end); Hopper.fade(ctx, t, SCRIPT.DUR);
}
```

## Motion grammar (what worked)
- **Stillness, then one event under a second.** In 문틈 the door slams at 15.4 s: the lamp blows to I = 2.3, the shadow
  swells over the lens, then black. In the template the light reaches her at 14.0 s with a 0.5 burst (`flash`),
  `exp(−6t)`. Anything that moves before the event moves on stiff, physical curves (`creak`: give once, settle with a
  small wobble).
- **The light is the actor.** Widen a gap step by step (three creaks: 15° → 26° → 40°), let the sun's patch travel
  (animate its azimuth `dz`), turn a cold bulb warm (`drawLit(…, warm, wk)`), or blink it (`flicker`).
- **Shadows tell what you don't show.** The horned figure is never drawn, only its projection. The hand shows as a
  silhouette against the lit corridor.
- **Camera:** a 4–5 % push over the whole film (`push`) and nothing else; at most one `whip`, at the event.
- **Colour arrives last.** The accent is absent (muted, `mute`) until the meaning lands: the brushed blood, or the dress
  in sunlight via `litColors`.
- **Black is a beat.** 문틈 cuts to full black with silence (16.5–19.3 s) before the answer.

## Performance (1080×1920, shared 4-CPU box)
| page | init | seek only (CPU record) | seek + 1 px readback | render loop (seek + JPEG screenshot) |
|---|---|---|---|---|
| door-b before the kit | ~0.5 s | — | 22.6 ms (best of 5 runs 21.7–24.3) | — |
| door-b on the kit | ~0.5 s | 21 ms | 23.5 ms (23.5–24.0), +4 %, within noise | ~80 ms |
| template | ~0.5 s | 25 ms | ~36 ms | ~90 ms |
Heavy work happens once: the weave (~0.3 s), each W×H layer (~50–100 ms), and figure layers on first use. Per frame
it is clips and drawImage. A blur `ctx.filter` on the frame canvas costs ~20 ms per frame, so bake blur into small
cached canvases, as `figure` does.

## Pitfalls
- **Base and lit layers must share seeds.** Paint them with the same `R.paint` / `R.boards` calls and only the colours
  changed, otherwise strokes and planks jump at the light's edge.
- **Shadows go only inside a light's clip.** Then they are consistent for free: a silhouette that isn't lit casts its
  shadow outside the patch, where it never shows.
- **Clip unions use nonzero winding.** Projected polygons keep their orientation, but if you hand-build a silhouette
  whose sub-loops wind opposite ways, holes appear. `figureParts().sil` is one closed loop.
- **A point lamp projects anything at or above its height to infinity.** Clip silhouettes below the lamp first
  (`cast(…, { clip })`; 문틈 clips at the doorway height `AH`). A sun parallel to a plane (`d[a] = 0`) divides by zero.
- **Floor foreshortening flattens shadows.** In 문틈 the readable part of a cast shadow is head and horns, so the
  silhouette is stretched ×0.62 above the shoulders (`silhouette(arm, VS)`).
- **The portrait camera sees the side walls only beyond z ≈ 3.8 m.** A side-wall window nearer the camera is
  off-screen, which makes it the perfect unseen light source (template, and 문틈's moon window).
- **Planks can run past the back wall.** 문틈's planks run to `zb + T` under the threshold and overlap the bottom of
  the back wall, and the baseboards hide that. With no baseboards, keep `z1 = zb`.
- **Land the event on its beat.** Timed light must reach its target on the beat, so compute the crossing from geometry
  (`DZ_HIT` in the template) instead of tuning by eye. Use `litFraction` to light the subject exactly when the patch
  arrives.
- **`opening` draws only the reveal faces that face the camera.** Paint the "beyond" afterwards with
  `within(ctx, cam, [op.poly], …)`.
- **End card over a central subject.** It sinks to 30 %, but if the subject is busy, move it or pass `endCard(…, { y })`.
- **`whip` smears what is already drawn.** Call it after the world and before `finish` and the words.
- **The refactor had to be exact.** Every kit primitive repeats the door's original canvas calls in the original
  order, so door-b renders pixel-identical (max diff 0). Keep that order if you change a primitive the door uses
  (`R.paint`, `R.boards`, `strokes`, `brushStroke`, `lamp.cast/through`, `glow`, `finish`), or re-diff the door.

## What a scene author still draws
The one image: the subject's geometry (the kit covers boxes, panels, hinged leaves and standing figures; anything
else is `cam.fill` polygons and `strokes`); how moving parts are lit (문틈's door leaf takes its light level from
ambient + floor bounce: `C(c) = c·lv`); what lies beyond each opening (corridor, sky, street); the story's timing
curves (opening angle, lamp intensity, ambient, azimuth); silhouettes for things that only appear as shadows; and the
accent moment.
