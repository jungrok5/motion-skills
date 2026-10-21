# 고딕 목탄 드로잉 (charcoal)

Vine charcoal on toothed paper, drawn and erased like William Kentridge's animated drawings, with one red pastel accent.
After OPUSCAR look no. 13 ("Rebecca"). Kit: `kit.js` → `window.Charcoal`. First film: 문틈 A
(`sermons/2026-10-18-1cor5/film/scenes/door-a.html`, the worked example). New scene: `template.html` + `script.example.js`.

## What it looks like
Velvet blacks, smudged mid-greys (about 60 % of the frame dark to mid, 15 % deep black in the nearest foreground and the
largest masses), small lights erased back to clean paper. Grain shows only in the midtones and only where the stick
touched; rubbed areas are smooth. Edges are broken vine lines. Light is never a glow: it is an eraser lift with streaks
in it. Mist is horizontal streaks erased out of the tone, 2–3 bands drifting at different speeds. The only colour is a
red pastel laid on fairly solid, streaky, tooth peeking through, outlined in charcoal. A warm thread of light may follow
as the resolution. The end card is the drawing erased away, leaving a ghost on the paper.

**Carries well:** darkness and light, temptation, fear, what hides at the edge of the frame, threat creeping closer,
guilt and forgiveness (drawn → erased → redrawn: the palimpsest *is* the message), memory, grief, night watches, a
single sign of rescue (the one colour: blood, a cord, a coat, a lamp).
**Carries badly:** joy, celebration, crowds, bright daylight, speed and humour, many colours, detailed faces. Anything
that needs to read as cheerful in the first second. A bright scene fights the tooth pass (it turns into flat paper).

## Palette
| role | hex |
|---|---|
| paper (clean lift) | `#EEECE7` |
| charcoal (full black) | `#121111` |
| accent — red pastel (body / dark streak / light streak) | `#9C1A1A` / `#6A0F0F` / `#C23C2F` |
| warm thread of light (outer / mid / core), after develop only | `#E8C88E` / `#EFD3A0` / `#FBE7C0` |
| caption / source line / caption shadow | `#EFECE6` / `#D4CEC4` / `rgba(8,7,7,.92)` |
| end card title + CTA / credits / title glow | `#141212` / `#3B3735` / `rgba(238,236,231,.9)` |

Inside the value canvas nothing is a colour: `'#000'` = stick (grainy), `rgba(0,0,255,a)` = rubbed tone (smooth),
`'#fff'` = eraser. Colour is only drawn on the real canvas after `develop()`.

## Type and placement
Gowun Batang 600–700 for captions and the end-card title (a brush-like serif that sits on paper), Noto Sans KR
400/500/600 for source lines and credits (`C.FONTS` for `Pilot.run`). Captions at y = 380 px (upper third), paper-white
on a near-black shadow, with `captionSmudge()` behind them so they read over any part of the drawing. End card at
y = 40 % in dark charcoal on the erased paper. Both orientations work; portrait is the target.
Rendering needs Gowun Batang installed locally (`~/.local/share/fonts/GowunBatang-*.ttf` — Google Fonts is blocked
while recording); the page's Google Fonts link covers the live preview.

## Kit API (`const C = Charcoal`)
Frame px unless noted; `C.SC = H/1920` scales numbers authored at 1080×1920. Every function has a comment in `kit.js`.
- **setup** — `init({tooth, fog, paper, charcoal})` builds tooth, LUTs, sprites, fog band (≈ 0.6 s); constants
  `PAPER CHAR RED WARM FONT SANS FONTS TONE`; sprites `stick stickW smudge smudgeW eraser fogTex`.
- **value canvas** — `begin(clear=true)` → ctx wiped to paper; `sheet(k, fill, w, h)` a static plate built once (k>1
  stays crisp under a push), `drawSheet(x, sheet)`; `develop(ctx)` the tooth pass onto the real canvas.
- **geometry** — `poly(x, pts)`, `seg(a, b, n, jit, r)`, `arch(a, ys, rise, n)` (Gothic pointed arch),
  `persp({F, cx, cy, eye})` → `{P(x,y,z), seg(a3,b3,n), poly(x, pts3)}` pinhole camera in metres.
- **marks** — `sweep(x, pts, w, a, seed, spr)` side of the stick along a path; `vine(x, pts, w, a, seed, col, brk)`
  broken line (`'#fff'` = eraser line); `blob(x, cx, cy, rx, ry, a, rot, spr)` finger smudge (`spr=C.smudgeW` = soft
  lift); `fillA(x, a, col)`; `tone(x, pts, a)` / `lift(x, pts, a)`; `toneAll(x, a, rub)` night or blackout;
  `smudgeFill(x, pts, a, seed, n)` an unevenly rubbed mass; `hatch(x, x0, y0, x1, y1, n, len, ang, w, a, seed)`.
- **soft layers and light** — `layer(x, paint, {cam, blur, alpha, q})` half-res (q: quarter-res) scratch layer (soft charcoal edges);
  `silhouette(x, pts, alpha, blur, clip)`; `wedge(x, quad, m0, m1, alpha, {reach, falloff, blur})` light lifted with
  the eraser (floor wedge, beam, pool); `glowLine(x, pts, a, seed, {w, al, brk, col, off})` thread of light / rim;
  `fog(x, t, [[y, alpha, px/s], …])`; `eraseWipe(x, t, at)` → 0..1; `captionSmudge(x, t, lines, {y, rx, ry, a})`.
- **the one colour** — `pastelPath(a, b, wA, wB, n, r, wob)` stroke points; `pastel(ctx, [{pts, pr}], fade, {color})`.
- **camera** — `setCam({zm, ox, oy, zc})`, `applyCam(x, depth, shakeK)` (depth > 1 = foreground parting),
  `toScr(p)`, `push(t, t0, dur, amount, ease)` (negative = pull-back), `kick(t, at, dur, amp, p)`, `shake(t, a)`,
  `boil(t, fps=12)`.
- **words** — `captions(ctx, t, lines, o)`, `endCard(ctx, t, card, at, o)` (wrap Story.* with the style's fonts and
  colours; `o` overrides), `fade(ctx, t, dur, fi=1.1, fo=.6)`.

```js
const C = Charcoal, S = SCRIPT, B = S.beat; let plate;
async function init() { C.init(); plate = C.sheet(1.3); const x = plate.getContext('2d');
  C.smudgeFill(x, hillPts, .55, 1); C.sweep(x, hillPts, 30, .3, 2); C.vine(x, hillPts, 2.4, .85, 3); }
function draw(ctx, t) {
  const x = C.begin(); C.setCam({ zm: 1 + C.push(t, 0, 15, .1), zc: [540, 900] });
  C.applyCam(x); C.drawSheet(x, plate); C.toneAll(x, .5);              // drawing + night
  C.applyCam(x); C.wedge(x, quad, src, far, ss(5, 7, t));               // light lifted out of the tone
  C.fog(x, t, [[1150, .4, 12], [1300, .3, -20]]); const k = C.eraseWipe(x, t, B.end);
  C.captionSmudge(x, t, S.lines); C.develop(ctx);                       // tooth pass
  C.captions(ctx, t, S.lines); C.endCard(ctx, t, S.endCard, B.end); C.fade(ctx, t, S.DUR); }
```

## Frame skeleton (keep this order)
`begin` → `setCam` → plate (`applyCam` + `drawSheet`) → `toneAll(night)` → lifts (`wedge`, `blob` with `smudgeW`,
`glowLine`) → subject (own sheet, drawn after the lights so a beam passes behind it) → threat (`layer`/`silhouette`,
boiling on twos) → palimpsest ghosts → `fog` → foreground sheet (`applyCam(x, 1.9–2.6, 1.4–1.5)`) → `toneAll(black)` →
`eraseWipe` → `captionSmudge` → **`develop(ctx)`** → `pastel` → warm `glowLine` → `captions` → `endCard` → `fade`.

## Motion grammar (what worked in 문틈 A)
- **Slow subjective push** the whole film (≈ +8 % over the first third, +13 % on the reveal), a small kick on the
  decisive beat, a slight pull-back for the resolution. The foreground parts faster than the plate (depth 2.6).
- **Boil on twos**: anything alive (a shadow edge, fingers, the dark) re-seeds its jitter 12×/s with `rng(boil(t)·k)`.
- **Palimpsest**: earlier positions stay as faint smears (`vine`/`sweep` at a ≈ .2) — the drawing remembers.
- **Light as erasure**: a door opening = the eraser wedge widening; hope = the white thread turning warm.
- **Darkness as rubbing**: night is `toneAll`; a flood or a full black is rubbed tone with a few lifted passes, never
  a flat #000; black frames are silence, not a cut.
- **The one colour arrives late and is drawn on** (`pr` 0→1 over ~0.55 s per stroke), then fades with the wipe.
- **End card**: the eraser takes the drawing away in six alternating strokes, a 5 % ghost stays under the words.

## Performance (1080×1920, Chromium headless, 4 shared CPUs)
- `init` ≈ 0.6–0.9 s (tooth 2 M px + LUT 65 k entries + sprites; the door plate adds ≈ 0.3 s).
- `develop` ≈ 20 ms per frame (getImageData + per-pixel LUT + putImageData) — the fixed cost of the style.
- Door scene ≈ 80–95 ms/frame; template ≈ 80–90 ms/frame. `eraseWipe` frames cost ≈ +60 ms (≈ 600 smudge stamps).
- The paper tooth follows the camera (`develop` maps it through `C.cam`): no grain sliding over the drawing on a push.
- `layer(…, { q: true })` paints at quarter resolution (blur px at quarter res) — use it for cast shadows and glows
  (a 1080×1920 film: the shadow layer 29 → 16 ms a frame).
- The kit is not slower than the pre-kit scene (interleaved runs: 87–98 ms before, 75–85 ms after).

## Pitfalls
- **Stick vs rubbed is the blue channel.** Paint smudges/rubbed tone with `rgba(0,0,255,a)` or the `smudge` sprite;
  painting a big area with `'#000'` at low alpha makes the whole thing grainy (looks like digital noise).
- **Colour before develop is lost** — develop overwrites the canvas from values. Pastel, warm light and words go after.
- **Bright scenes die.** The LUT pushes values above ≈ 88 % darkness to full black and below 5 % to clean paper; keep
  the big masses mid-grey and the lights small.
- **A lifted beam in the air needs `blur`** (≈ 6–10 at half res), or it reads as a cut-out shape with hard edges.
  Floor wedges can stay crisp (door scene). A beam lifts everything under it — draw the subject on its own sheet after.
- **Shapes made only of hard polygons read as cut paper**, not charcoal: blur the layer and rub the rim with `smudge`
  blobs (template's threat). Two dark masses facing each other can turn into faces — check the negative space.
- **Don't wrap paint in save/restore inside `layer`.** Chrome rasterised the door's wedge ±1 differently when the
  half-res layer was saved/restored around it (found in this refactor); `layer` resets composite/alpha itself and
  `silhouette` saves only around its clip. Also: stills are slightly seek-order dependent at the ±1 level — compare
  before/after stills rendered in the same order.
- **Seek safety**: `begin()` wipes the value canvas each frame (the pre-kit scene did not, so a frame under full black
  showed a 0.1 % trace of the previous one). Anything seeded per frame must use `boil(t)`, never a running counter.
- Two-line captions must fit 900 px at 54 px Gowun Batang (~16 Hangul per line).
- The end card in Story.endCard gives only the title a glow (`titleShadow`); before the kit the door scene glowed every
  end-card line. The difference is invisible except where credits cross the faded red posts (max 15/255, 745 px).

## What a scene author still draws
The story: the plate's geometry (a room in `persp` metres, a landscape in px), the subject and its sheet, what the
light falls through (the door's aperture → `wedge` quad), the threat's shape and timing, the pastel stroke paths, the
beat timeline (`state(t)`: zoom, shake, night, light, threat), and `script.js` (beats, lines, end card). The template
shows each of these with a placeholder (✎ marks).
