# 채색 필사본 (illuminated manuscript miniature)

Kit: `kit.js` → vendored as `scenes/kit-illuminated.js`, global `window.Illum`. Source: one-scroll-bible
`motion/pilot/kingdom.html` (the first film's 07 kingdom scene: shepherd → king). It was ported to a module for
「침묵의 400년」 (Daniel's statue, Zechariah and the angel, 2026-10) and packaged here. That film's figures now sit in
its own `illum-figures.js` on top of this kit (vendored); refactor diffed pixel-identical on 276 stills, both
orientations. Template: `template.html` (a different subject: one sheep apart from the flock).

## What it looks like
A page of vellum lies in candlelight on a dark table. It has a lapis bar border on the left and top, with gold and
white tracery and a vermilion roundel at the corner. In the middle is a gothic arch window framed in lapis with gold
stars and a gold band. Inside the arch is a miniature: a diapered lapis ground of gold quatrefoils, a green hill with
ink grass (or a chequered floor), and figures painted as **flat colour inside an ink contour**: pale ovals for faces
with a few lines and a rosy cheek, scalloped fleece, robes with a few folds. **Gold leaf** is the material that moves.
It is burnished, with a texture, a candle sheen from the upper left, and punched rosettes. At a beat, a bright glint
sweeps across every gold surface at once, or tooled rays rise behind a figure.

## Meanings it carries
**Well:** kingship and glory (the shepherd made king, an everlasting throne); a vision explained (Daniel's statue,
painted in its materials); angels and annunciations; temple and priest; a holy figure in a still moment; "this is
sacred, and it is old"; a single image held while it is explained.
**Badly:** motion through space (it is a page: figures appear, glow and turn, they don't run); landscape; violence and
fear (use `charcoal`); modern life; long sequences (one or two pages per film are plenty).

## Palette
| role | value |
|---|---|
| vellum | `#ECDCB4` (`PAL.VEL`) + fbm, edges `rgba(120,80,40,.35)`, flecks |
| lapis | `#27469A` (border, frame), ground `#22408e` with quatrefoils `#d9b45e` |
| vermilion | `#C43A20` (arch rim, roundel, tunics) |
| green | `#4e7a3c` (the hill) |
| white | `#fbf6e6` (highlights, dotted rim) |
| ink | `#2A1A10` (`INK`) contours 1.4–4 |
| gold leaf | texture `[170,128,46]`→`[214,174,84]`, sheen `rgba(255,236,170,.3)`, glint `rgba(255,252,226,.95)` |
| flesh / wool / linen / hair | `#f0d6ba` / `#f3ecd8` / `#f1ead6` / `#8e4020` |
| desk | `#0b0806` with a candle glow `[255,170,90]` from the upper left |

## Fonts and words
The page carries no words. A miniature is read by its picture, and words on art collide with captions. Captions sit
above or below the page: portrait page bottom is y = 1222, landscape y = 796. In landscape, callout labels can sit
beside the page.

## API
- **Setup:** `init({L})` builds the vellum, the gold texture and the static page (~0.3 s). `L = {page:[x,y,w,h],
  arch:[x,y,w,h]}` is the layout. The default leaves room for words above and below in portrait and centres the page
  in landscape.
- **Frame:** `desk(ctx,t)` draws the dark table and candle. `push(ctx,t,t0,amt)` is a slow push-in.
  `page(ctx,t,paint,{rays,ground,glint})` draws the page, the lapis ground, optional rays `{at:[x,y],k}`, the hill or
  `'floor'`, and then your `paint(ctx,{ax,ay,aw,ah,gy})` clipped to the arch, then the rim. `glint` 0..1 sweeps over
  all gold drawn in that call.
- **Ink primitives:** `fillInk(ctx,path,colour,lw)`, `line(ctx,svgPath,lw,colour,a)`, `gold(ctx,path,{lw,punch})`,
  `punch(ctx,[x0,y0,x1,y1,sp])`, `archP(x,y,w,h)`, `P2(svg)`, `rectP`, `ell` and `glow`.
- **Figures:** `face(ctx,cx,cy,s,dir,up)` is a gothic face. `sheep(ctx,x,y,s,dir,rot)` is about 150 × 100 at s = 1.
  The worked example's priest, angel, shepherd, altar and statue are in one-scroll-bible
  `motion/films/silence400/illum-figures.js`. Copy their way of building a figure (SVG paths in local units +
  `fillInk` + a few `line`s + `gold` for what shines).
- `PAL`, `INK`, `VERM`, `LAP`, `GRN`.

```js
const I = Illum;  // init: I.init();
function draw(ctx, t) {
  I.desk(ctx, t); ctx.save(); I.push(ctx, t, 0, .05);
  I.page(ctx, t, (c, A) => { I.sheep(c, A.ax + A.aw * .5, A.gy - 40, .9, 1); }, { rays: { at: [W / 2, H * .5], k: ss(12, 13, t) }, glint: t > 12 && t < 15 ? (t - 12) / 3 : null });
  ctx.restore();
}
```

## Motion grammar (what worked)
- **Painted in, not drawn.** A shape appears whole (fade or a quick wipe), one after another, like a miniaturist
  laying in colour. Ink contours come with the shape.
- **Gold is the light.** The one sudden thing is a glint across all the gold together, or rays rising. The film's
  statue scene lights one metal at a time as each kingdom is named, and unlit metals wash back toward the vellum.
- **Hold the page.** The camera only creeps (`push`, 4–5 % over 12 s). Explanations play as callouts beside it
  (landscape) or captions under it (portrait).
- **Figures turn small.** An angle of 0.1–0.2 rad on a head, a wing lifted a few units, smoke scrolls rising. Bigger
  motion breaks the page.

## Performance (1080×1920, Windows laptop CPU, seek + 1 px readback, measured 2026-10-31)
The template is ready in 0.35 s (vellum 480², gold texture 512², the page baked once). Per frame: ~27 ms painted, ~40 ms
with 64 tooled rays and the glint. Each `gold()` call clips, fills a pattern and lays a full-frame gradient. Dozens per
frame are fine; hundreds are not.

## Pitfalls
- **The glint is per call.** `page()` sets it for everything drawn during that call. Gold baked into the static page
  (border, frame) never glints.
- **`gold()` fills its clip with a full-frame gradient under an identity transform.** That is right for leaf that
  catches one candle, but inside a scaled figure the sheen doesn't scale. That is intended, so don't "fix" it.
- **Layout first:** call `init({L})` with your page and arch before anything draws. The page is baked once.
- **Faces read as blobs below s ≈ 1.2.** Keep a figure's head at least ~50 px tall on screen, or show it from behind
  (the worked example's shepherd).
- **Mannequins:** stiff, symmetrical full figures look like dolls. Real miniatures are flat but gestural: a lifted
  hand, a tilted head, a robe that flares. A statue that looked like a mannequin was rejected in review.

## What a scene author still draws
The miniature's subject and its figures; when each part is painted in and lit; where the rays come from; any callouts
or captions around the page.
