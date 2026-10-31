# 등잔 아래 두루마리 (lamplit scroll)

Kit: `kit.js` → vendored as `scenes/kit-lamplit.js`, global `window.Lamplit`. Source: one-scroll-bible
`motion/films/silence400/film.html` (「침묵의 400년」, 2026-10: the opening, the burning scroll, the copying, the
two-promises scroll, Nazareth, the waiting sky). That film now draws with this kit (vendored); refactor diffed
pixel-identical on 276 stills, both orientations. Template: `template.html` (a different subject: two passages far
apart on one scroll).

## What it looks like
Night. One scroll lies on a dark table under a clay oil lamp whose flame breathes. The parchment is warm, fibrous and
burnt at the top and bottom edges, with wooden rollers. The lamp's light is a pool on the table and a gradient on the
sheet, and everything outside it falls to black. Words are **written on the scroll in brown-black ink**. They are never
floating type. They come in letter by letter, and each letter flares orange as the pen passes. When a word matters it
**burns to burnished gold** with a halo, a pen of light underlines it at reading pace, and a nib glows at its head.
The scroll is the main character. It opens from the middle, unrolls sideways across blank years with a ruler of
ticks, and the camera pulls back until two passages far apart are one scroll. Light runs along it from one to the
other. Dust motes drift only where the lamp reaches. There is fine moving grain and a vignette. Outside: a long-exposure
star sky turning round the pole, the milky way, a far walled town whose lamps flicker, and watchers in silhouette.

## Meanings it carries
**Well:** Scripture as a written, kept, copied thing; promise and fulfilment (two passages, one scroll); waiting and
the years between; a word that goes out and is lit again; reading slowly; a scroll burnt and written again
(Jer 36); translation (one text becomes another under a band of light); the night watch and long waiting.
**Badly:** crowds, action, landscape and journeys (use `inkmap`), faces and drama (use `illuminated`, `puppet`),
bright daylight joy, anything that needs many characters on screen.

## Palette
| role | value |
|---|---|
| night | `#05060a` (`PAL.night`); table pool `rgba(120,80,40,.35·light)` |
| parchment | fbm ×(222,196,150), lamplit `rgba(255,214,150,.18)` → dark `rgba(20,10,0,.55–1)`; edges `rgba(60,30,5,.45)` |
| rollers | wood `[92,58,30]`→`[160,110,60]` by light |
| ink | `#2b1a0b` (`INK`); label `#6a4a26`; source line `#5a3d1f` |
| gold | words `rgba(255,214,130)` + halo `rgba(255,200,90)` blur 40; rule `rgba(196,140,40)`; title `#e9c77a` |
| flame | `rgba(255,240,200)` → `rgba(255,190,90)` → `rgba(255,120,40,0)`; halo `[255,170,80]` |
| sky | `#02030a` → `#070c26` → `#151536` → `#2c1f33`; far ridge `#0b1030`, town `#0a0e28`, near ridge `#020309` |

## Fonts and words
Noto Serif KR 600 for the words on the scroll (line height 1.7) and for titles. Noto Sans KR for source lines
(`Lamplit.FONTS` → `Pilot.run({ fonts })`). Every string on the scroll comes from the script and goes through
`Pilot.tr` before `Lamplit.lines()`, so it can be translated. A `/` in the string marks where a translator lets it break.
Captions (spoken words) sit above the scroll, or in a dark band below it. They never sit on the parchment.

## API
- **Setup:** `init()` builds the parchment, grain and motes (~0.1 s). `initSky()` builds the milky way and 1,900 stars
  (~1–2 s; only when a scene uses `starSky`). `initBurn(R)` sets up a burn over the rectangle `R = {cx,cy,sw,sh,x0,y0}`.
- **Light:** `glow(ctx,x,y,r,[r,g,b],a)`, `nib(ctx,x,y,r)`, `flicker(t)`, `pool(ctx,cx,cy,h,light)`, and
  `lamp(ctx,x,y,s,t,a)`, a clay lamp with a living flame.
- **Scroll:** `scroll(ctx,cx,cy,w,h,open,light)` opens from the middle. `longScroll(ctx,x0,x1,cy,h,light,lx)` gives a
  scroll of any length with mirrored tiles and no seams. `ruler(ctx,a,b,y,until,n)` draws year ticks cut at the unrolled
  edge. `sweep(ctx,x0,x1,cy,h,k,on)` runs light along the scroll and returns the head x.
- **Words:** `lines(s,size,maxW)` wraps evenly at the kit font. `wrap`/`wrapEven(ctx,s,maxW)` honour `/` breaks.
  `block(ctx,lines,x,y,o)` lays text out per grapheme, with `charAlpha` and `charGlow` for writing in or going out,
  `lineAlpha` and RTL. `inkText(ctx,lines,cx,y,size,{lit,alpha,reveal,glow,lineAlpha})` writes ink that can burn to
  gold. `underline(ctx,lines,cx,y,size,word,k)` gives the shared word a gold rule and soft light.
  `pen(ctx,lines,cx,y,size,prog,nib)` underlines at reading pace. `centredY(cy,n,size)` returns the first baseline that
  centres the letter bodies. `title(ctx,s,t,a,b)` draws a gold title with a rule drawing out.
- **Texture writing:** `ink(ctx,x0,y0,w,rows,lh,s,seed,prog,col,a,rtl)` writes pseudo-script rows.
  `hebInk(ctx,x0,y0,w,rows,lh,s,text,prog,col,a)` writes real right-to-left text into rows. Both return the head, so a
  `quill(ctx,x,y,s)` can follow it. `retext(ctx,cx,cy,sw,sh,k,drawOld,drawNew)` turns one text into another under a band
  of light.
- **Fire:** `burn(ctx,t,t0,t1,paint)` burns the scroll painted by `paint(ctx)` between t0 and t1. It gives a soft burn
  front, a char band, a glowing rim, `flame()` tongues on the front and embers rising.
- **Night outside:** `starSky(ctx,t,t0,{meteor})` is a long exposure that starts at t0. `town(ctx,t,fr)` draws a far
  ridge with a walled town, its lamps and mist. `ridge(ctx,near)` draws the near ridge. `person(ctx,x,y,h,kind,tilt)`
  draws a silhouette; kind is `''`, `'staff'` or `'child'`. `HORIZON = {far, near}`.
- **Post:** `vignette(ctx,k)`, `filmGrain(ctx,t,a)` (24 steps a second) and `dust(ctx,t,[x,y],light)`, all in screen space.

```js
const L = Lamplit;  // init: L.init();
function draw(ctx, t) {
  ctx.fillStyle = L.PAL.night; ctx.fillRect(0, 0, W, H);
  const light = ss(.3, 2, t) * L.flicker(t), lines = L.lines(Pilot.tr(S.text), 46, 760), y0 = L.centredY(cy, lines.length, 46);
  ctx.save(); /* camera: translate/scale */ L.pool(ctx, W / 2, cy, 640, light); L.scroll(ctx, W / 2, cy, 900, 640, eio(clamp((t - 1) / 2.4)), light);
  L.inkText(ctx, lines, W / 2, y0, 46, { lit: ss(12, 13, t), reveal: k => ss(4 + k * .08, 4.3 + k * .08, t) });
  L.underline(ctx, lines, W / 2, y0, 46, Pilot.tr(S.word), ss(12, 12.8, t)); ctx.restore();
  L.dust(ctx, t, [W / 2, cy - 200], light); L.filmGrain(ctx, t); L.vignette(ctx, .7);
}
```

## Motion grammar (what worked)
- **The first frame is already a picture.** In a feed the first impression is the lamp lit and the scroll partly open,
  not black. Fade from black only where the film joins other material.
- **Light is the actor.** A word goes out letter by letter, each letter flaring as it dies, and the lamp sinks
  (8.8–12 s in the film). The same words light again later, so the end rhymes with the start.
- **Silence on black** holds after a going-out: one line in cream on black, no picture. It costs nothing and reads as
  weight.
- **Never cut inside the scroll's story.** Unroll it, travel with the edge, then pull back with a zoom eased in log
  space (`Math.exp(lerp(log z0, log z1, k))`), so the move feels even.
- **Gold is earned.** Words are ink until they mean something, then they burn gold. Use one or two gold moments per
  minute at most.
- **Camera:** a creeping push-in (≤ 7 % over 12 s) on a held shot, then one pull-back at the turn.

## Performance (1080×1920, Windows laptop CPU, seek + 1 px readback, measured 2026-10-31)
| page | ready | per frame |
|---|---|---|
| template (scroll, words, pen, sweep, dust, grain, vignette) | 0.3 s | ~70 ms |
| 「침묵의 400년」 opening scroll / waiting sky (`starSky`) / burning scroll / Nazareth pull-back | 3.7 s (all its kits + `initSky`) | 67 / 75 / 106 / 82 ms |
Most of a scroll frame is the `blur(24px)` shadow under the sheet, plus full-frame grain and vignette. Draw one or two
blurred scrolls per frame, not more. `burn` rebuilds two half-resolution masks every frame, which makes it the
heaviest shot. Fine for rendering (workers run in parallel), but heavy for a live phone player: keep burns short.

## Pitfalls
- **The words must be measured in the right font.** Wrap in `draw` (or after `Pilot.run` has loaded `FONTS`), never at
  load time, or every line breaks at a fallback face's widths. The renderer now stops if Noto Serif KR is missing.
  Before that fix, a film went out drawn in Batang with faux bold.
- **Ink on a dark sheet:** `scroll()`'s light below ~.35 makes the ink unreadable. Keep words on the lit part.
- **`underline` finds the word by `indexOf` in each wrapped line.** If a translation breaks the shared word across two
  lines, it will not light. Put a `/` before it, or choose the word per language in the i18n file.
- **The parchment is light.** Captions laid over it need a dark band. Keep them off the scroll.
- **`burn` and `initBurn` must get the same rectangle.** The front points are in that rectangle's pixels.
- **`hebInk` needs a Hebrew-capable serif** (Noto Serif Hebrew) loaded like the other fonts, or it falls back to Times.

## What a scene author still draws
The story's timing curves (lamp, open, unroll, pull, lit); which words are on the scroll and which one is lit; any
figure or object beyond lamp, scroll and quill; the camera path; what happens in the night outside.
