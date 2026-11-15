# Kit — the API

Pages are ES modules with an import map `{ "pcs/": "./lib/" }` (new-film.mjs writes it). Order in a page: palette → layers →
props → the hero's timeline → shots → checks → `F.start()`. Build sprites only after `new Stage()` and `await F.ready()` (the
stage sets the resolution sprites are cut at and loads the label font).

## lib/paper.js — `P`
| | |
|---|---|
| `piece(ctx, pts, col, o)` | one piece of paper. `o.edge` `'torn'` (white rim, default) · `'cut'` · `'felt'`; `rim` px; `rough`; `tex` (fibres 0…1); `light` (soft key 0…1); `lift` (px off the piece below → soft shadow); `grad: [top, bottom]`; `alpha`; `seed` |
| shapes | `rect(x,y,w,h)` `rrect(x,y,w,h,r)` `ellipse(cx,cy,rx,ry)` `arch(x,yBottom,w,h)` `capsule(x0,y0,x1,y1,r0,r1)` `blob(cx,cy,rx,ry,lobes,seed)` `cloudShape(x,yBottom,w,h,bumps)` `crescent(cx,cy,r)` `star(cx,cy,r)` `burst(cx,cy,r0,r1,n)`; `shift` `scale` `flipX` |
| details | `ink(ctx, pts, { col, w, a, dash })` thin line · `dot(ctx,x,y,r,col)` · `dab(ctx,x,y,r,col,a)` soft blush / glow on paper |
| `sprite([x0,y0,x1,y1], paint, o)` | rasterise once; origin = the anchor (a joint, a layer's corner). `o.res`, `o.shadow` (baked shadow blur, 0 = none), `o.blur` (depth of field) |
| `image(src, { pivot, px })` | an image as a sprite · `parts(manifest, { px, pivots })` every part of a cut-parts manifest · `darker(s)` |
| `put(ctx, s, { lift, a })` | draw a sprite at the current transform; shadow along the stage light, in screen space |
| timing / noise | `span(t,a,b,ease)` · `ease.{sine,io,out,out3,back,pop…}` · `keys(list,t,prop)` · `rng(seed)` · `hash` · `n1` · `clamp` `lerp` |
| colour | `mix(a,b,k)` · `tone(c,k)` (− darker toward warm brown-violet, + lighter toward cream) · `rgba(c,a)` · `CREAM` |

## lib/puppet.js — `Pup`
| | |
|---|---|
| `biped(o)` | the standard two-legged puppet, cut in code: `paintHead`, `paintTorso`, lengths (`torso thigh shin foot arm fore limbW hipW shoulder`), `colours`, `alts.head`, `z` overrides, `extraParts`, `paintThigh/Shin/Foot/Arm/Fore` |
| `bipedParts(imgs, o)` | the same rig from cut-out images (`P.parts`): `neck`, `shoulder`, `joints`, `z`, `extraParts` |
| `puppet(spec)` | any rig: `parts: [{ id, parent, at, z, bounds + paint | img, alts, rest, lim, sole }]` (quadrupeds, birds, vehicles with turning wheels) |
| `draw(ctx, pp, pose, o)` | pose = `{ x, y | ground, facing (1, −1, or ±.3 edge-on), scale, rot, angles, swap, hide, step, jitter }`; `o.extra = { partId: ctx => … }` draws a held prop in that part's px; returns world matrices |
| `where(pp, pose, id, [x,y])` · `soles(pp, pose)` · `solve` | geometry without drawing: aim props, place hands, check feet |
| poses | `stand(o)` · `walk(phase, { stride, knee, arms, lean })` · `walkSpeed(pp)` (px per cycle so the planted foot does not slide) · `blend(a, b, k)` |
| `LIM` | joint ranges (deg, facing right, + = clockwise): knees `0…150` (fold back), elbows `−150…0` (fold forward), hips `−110…60`, shoulders `−185…70`, neck `±40`, waist `±30`, ankles `−40…45`. Every draw audits them → `body: …` |
| `sheet(ctx, pp, poses, o)` | the cast sheet: each pose facing right and left, pins marked |

## lib/stage.js — `Stage`
| | |
|---|---|
| `new Stage({ seed, light: [dx, dy], step: 12, jitter: 1, grade, bg, fadeIn, fadeOut, W, H })` | `await F.ready()` before painting |
| `F.layer(b, paint, o)` / `F.prop(b, paint, o)` | painted once (layer shadow 14, prop shadow 7); `o.blur` for out-of-focus foreground |
| `F.shot(dur, (g, lt, u) => …, { name, cam: [{ t, x, y, zoom, e }], tr: { type: 'dissolve' \| 'black' \| 'card', d } })` | |
| `g.put(s, x, y, z, { lift, rot, s, sx, a, jit, id })` | a sprite on depth z (0 = screen, 1 = puppet plane, < 1 behind, > 1 in front) |
| `g.puppet(pp, pose, z, o)` · `g.at(z, ctx => …)` · `g.screen(fn)` · `g.glow(x, y, r, col, a, z)` | |
| `g.lt`, `g.t` (already stepped to 12 a second) · `g.step` (the step index) · `F.quant(t)` · `F.camAt(shot, lt)` · `F.check(name, t => bool)` | |
| grade | `{ key, keyA, keyAt, fill, fillA, vignette, grain, flicker, lift }`; `?off=grade,vignette,grain,jitter` |

## lib/kit.js — `K` (examples of the grammar; compose new pieces the same way)
`backdrop` · `cloud` · `hills` · `waves` · `house` (→ window / door rects for lit panes) · `pane` · `cobbles` · `grass` · `sun` ·
`moon` · `starPiece` · `string` · `stick` · `lamp` · `flame` · `beam` · `boat` · `lighthouse` · `tree` · `label` · `FONT`

## lib/score.js
`renderScore(spec, sr, dur)` — `musicbox`, `pluck`, `keys`, `bass`, `reed`, `pad`, `brush`, `air`, `rain`, `sea`, `sfx` (`tap`
`strike` `creak` `rustle` `bell` `chime` `whoosh` `pop` `boing` `step` `thump` `paper` `flip` `fwump` `splash` `thunder` …),
`reverb`; helpers `tune(bpm, [[midi, beats]…], t0)`, `oompah`, `beat`.

## Contract every film page fulfils
`window.seek(t)` renders frame t (time is held on 12 steps a second); `window.DURATION`, `window.FPS` (24), `window.STEP` (12),
`window.SIZE`, `window.runChecks(t)` (names of broken rules + body audits), `window.shotAt(t)`, `window.film`,
`window.__ready = true` — all set by `F.start()`. `?render=1` fixed canvas, no live loop · `?t=12` one frozen frame ·
`?scale=.5` preview size (sprites are cut at that size) · `?off=…`. The live page fits the window and loops; click / space
pauses, ← → jump a second, the bar scrubs, ♪ plays the score in sync.
