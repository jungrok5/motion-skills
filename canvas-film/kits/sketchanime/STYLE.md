# 스케치 애니 (anime-studio promotional sketch)

Slug `sketchanime` · kit `kit.js` → vendored as `scenes/kit-sketchanime.js` · global `window.SketchAnime` · first film:
「도넛 가게 마감까지 3분」 (`canvas-film/examples/sketchride/scenes/sketchride.html` + `sketchride-art.js`, silent, portrait).

**Provenance:** an anime-studio promotional sketch illustration the owner shared (a countdown drawing: riders on an old
motorbike kicking up a dust cloud, lettered 「…あと4日」). The feel is borrowed and the renderer is our own. No drawing,
character, pose or text is copied: the cast, bike, street and words are original, and the line, wash, cloud and lettering
are drawn by this kit's own code.

## What it looks like
**Lots of white paper.** A thin, confident **pencil/brush line** in dark grey-brown (`#3b302e`, never pure black) with
**pressure**: every stroke is a filled ribbon that tapers at both ends, swells and thins with a slow noise, and runs
heavier on the shadow side of a shape (lower right). The line is **a little sketchy**: closed shapes overshoot their
join or stop just short of it, open strokes overshoot by a few px, and now and then a second hairline runs beside a stretch.
The line **boils gently on twos** (12 re-draws a second). Under the line are **soft pastel washes**, quick marker or
watercolour passes. They sit a hair **out of register** (≈ 3 px), so paper shows on one side and the colour overspills on
the other. They carry **stroke texture** (diagonal marker streaks), a soft **paper-light gradient** from the top left, a
faint pooled edge, and here and there a **streak of bare paper** (hair, tanks, trousers). Shading is minimal: **one flat
shadow tone** per colour (cooled toward lavender) and a **grey ink wash** on machines. **Chrome is white paper with
broken black reflection bands**, and metal is **drawn tighter**: spokes, coil springs, fins. **Dust and clouds are big
soft cumulus**: a pale pink-beige wash, a lighter top, shading under each puff, an outline only on the outer edge, and
the tops of the front puffs inked inside the mass. **Speed is a few loose pencil hairlines**, not manga wedges.
**Titles are hand-lettered**: rounded Jua glyphs, each tilted and bobbed a little, a pastel fill printed off the line,
and a darker outline drawn twice (once thinner and offset). **One accent** (`ACCENT`, coral by default; the sample uses
the donut pink) belongs to the subject and to the number that matters.

**Carries well:** light comedy and slice-of-life, motion and speed (riding, running, wind), a countdown or promotional
beat ("D-3"), expressive acting (laughing, panicking, smug), vehicles and gadgets, outdoor air (dust, clouds, breeze),
a title that should feel hand-made and warm.
**Carries badly:** darkness, dread and night (it is paper-white by construction), dense backgrounds (keep them a light
pencil underdrawing), long reading (words are lettered titles, ≤ 2 lines), close-up realism of faces or hands, crowds
(each figure costs ~3–5 ms), anything that needs a second strong colour.

## Palette (`SketchAnime.C`, `SketchAnime.ACCENT`)
| token | hex | use |
|---|---|---|
| `paper` | `#fdfbf7` | the ground, and the knock-out under every opaque shape |
| `ink` / `inkSoft` / `pencil` | `#3b302e` / `#75655f` / `#8a7f7c` | the line; small type; light pencil |
| `skin` / `skinSh` / `blush` | `#fbe2d2` / `#f0c2ac` / `#f29d98` | skin, its shadow tone, hatched blush |
| `pink` `rose` `salmon` `peach` | `#f4b8bd` `#eea3a8` `#f2a594` `#f8cfa9` | hair, clothes, awnings |
| `butter` `lemon` | `#f6d88f` `#f4e08a` | lettering fill, clips, signals |
| `sage` `mint` `teal` | `#b8ccb2` `#bcdcca` `#a9cbc9` | clothes, the tank |
| `sky` `blue` `lavender` `lilac` | `#bcd3e8` `#a9b8da` `#bfbcd8` `#d2c3e0` | shirts, trousers, windows, sweat drops |
| `grey` `slate` `steel` `sand` `cream` `brown` `navy` | … | trousers, metal wash (`steel`), chinos, cardigans, shoes, a tie |
| `chrome` / `rubber` | `#f7f7f8` / `#3d3536` | chrome bodies (with ink reflections), tyres and grips |
| `dust` / `dustSh` | `#f3e4dc` / `#e8d3ca` | dust clouds and their shading (sky clouds: pass `col`/`sh` in pale blue) |
| `ACCENT` | `#ef5a50` | THE subject (`init({ accent })`); nothing else is that hue |
`tone(c, k)`: k > 0 lightens toward paper, k < 0 darkens toward a cool lavender (`shadeOf(c)` = `tone(c, −.26)`, the
one shadow tone).

## Fonts and words
`Jua` for lettered titles (`HAND`), `Gaegu` for small handwritten lines (`PEN`; map the family to `Gaegu-Bold.ttf` in
film.json, as the sample does, since Regular is too thin), `Noto Sans KR` for the end card's small lines. Pass
`SketchAnime.FONTS` to `Pilot.run`. `letter()` translates the whole string and then splits it into glyphs
(`Pilot.chars`), so translations work. A glyph can be popped (`scale`), recoloured (`color(i, ch)`), shaken
(`shake`) or struck out (`scribble` over `glyphs[i]`).
Portrait safe zones: nothing important in the top 140 px or the bottom 300 px (titles at y ≈ 260–450, a pen note at
y ≤ 1580).

## Kit API (`window.SketchAnime`, design space 1080 × 1920, px)
- setup: `init({ accent, paperSeed })` · `W` `H` `C` `ACCENT` `HAND` `PEN` `SANS` `FONTS` · `frame(t, { boil })` (called by `begin`) · `t12(t)` · `hash(x)`
- colour: `tone(c, k)` · `shadeOf(c)` · `rgba(c, a)` · `pattern(c)` (the cached marker texture)
- paths: `pen()` → `.m .l .q .c .z .ell .poly .smooth .path() .bbox` · `curve(pts, closed)` · `densify(pts)` · `locks(pts)` (sharp tips + curve controls: hair, flames, torn edges)
- line: `ink(ctx, penOrPts, { lw, col, a, press, boil, over, loop, heavy, hv, taper, min, sketch, seed })` · `line(ctx, pts, o)` (one open stroke, `smooth`)
- wash: `knock(ctx, pen)` · `wash(ctx, pen, col, { a, mis, off, knock, light, lightAng, edge, gaps, gapAng, gapW, seed })` · `shade(ctx, clipPen, shadePen, col, { a, tone })` · `greyWash(ctx, pen, { a, col, clip })` · `shape(ctx, pen, col, { wash, line, knock })`
- tubes and metal: `tube(ctx, spine, widths, col, { caps, joint, line, wash, noLine })` → `{ pen, left, right, spine }` · `chromeTube(ctx, spine, w, o)` · `coil(ctx, a, b, r, turns)` · `wheel(ctx, x, y, r, ang, { blur, spokes, tyre, hub })`
- motion: `spring(x)` · `sway(t, hz, amp, ph)` · `flutter(t, seed, hz)` · `bump(t, at, amp, dur)` · `strand(ctx, root, ang, len, w, t, { col, wind, hz, amp, curl, wash })` (a hair lock / ribbon end in wind) · `ribbon(ctx, root, ang, len, w0, w1, t, col, { wind, amp, droop })` (a tie / scarf / shirt tail)
- dust and cloud: `cloudMass(ctx, lobes, { col, sh, lw, shade, ground, line })` · `cloudLobes(x, y, rx, ry, t, { seed, n, front, billow })` · `cloud(ctx, x, y, rx, ry, t, o)` · `dustLobes(t, src(te) → [x, y] | null, { dt, life, r0, r1, drift, spread, front, strength(te), from, until })`
- speed and marks: `speed(ctx, t, { x0, x1, y0, y1, n, v, len, lw, a, ang })` · `whoosh(ctx, pts, { n, gap })` · `spinArcs(ctx, x, y, r, t, { dir, a0, step, len })` · `pop(ctx, x, y, r, k)` · `blush(ctx, x, y, r, a)` · `sweat(ctx, x, y, s, ang)`
- figures: `BODY` · `LOOK` · `ik2(a, b, l1, l2, bend)` · `pose(F)` → G · `figure(ctx, G, { parts, held })` · `PARTS` · `hand(ctx, wrist, ang, kind, skin)` · `walkFeet(x0, x, step, lift)` · `standY(ground, s)`
  F = { x, y (pelvis), s, dir (1 faces right, −1 left), lean, bob, neck, head: { tilt }, look: { skin, hair, hairStyle 'bob'|'long'|'messy'|'spiky',
  clip, ahoge, glasses, top, topStyle 'shirt'|'hoodie'|'cardigan', sleeve 'short'|'rolled'|'long', collar, tie, bottom, skirt, sock, shoe },
  face: { eyes 'open'|'wide'|'panic'|'laugh'|'closed'|'smug'|'squint', mouth 'smile'|'laugh'|'yell'|'grit'|'smug'|'o'|'flat', brows 'calm'|'up'|'worry'|'angry', blush, sweat, look, blink },
  hands: [near, far] (null = hangs, or { at: [x, y] WORLD grip point, ang (world rad), kind 'grip'|'fist'|'flat'|'hold'|'open'|'relax', bend ±1 }),
  legs: [near, far] (null = straight down to `ground`, or { at: [x, y] world ankle, ang (foot, world rad), lift }), ground, kneel 0..1, wind 0..1, t, seed }
  G = { toW(p), toF(p), arms[i] { sh, el, wr, grip, ang, ok }, legs[i] { hip, kn, an, ok }, head, lean, … } (frame coords; `toW` → world)
- words: `letter(ctx, s, x, y, { size, fill, color(i, ch), ink, lw, align, k, rot, jit, ls, seed, maxW, scale(i, ch), shake, mis })` → `{ w, h, size, glyphs }` ·
  `scribble(ctx, x, y, w, h, k, { lw, n })` · `caption(ctx, s, x, y, a, { size, color })` · `captions(ctx, t, lines, { y, size, fill, color, small })` · `endCard(ctx, t, card, at, { y, veil, fill })`
- frame and post: `begin(ctx, t)` · `cam(ctx, s, x, y)` · `finish(ctx, a)` (paper tooth, multiplied) · `fade(ctx, t, dur, fi = .4, fo = .4)`

```js
const S = window.SCRIPT, D = SketchAnime, GROUND = 1420;
function draw(ctx, t) {
  D.begin(ctx, t);                                   // paper + the boil frame for this t
  ctx.save(); D.cam(ctx, 1.05, 540, 1300);
  D.cloud(ctx, 760 - t * 9, 600, 230, 120, t, { col: '#eef2f7', sh: '#d8e1ec', front: 1 });
  D.ink(ctx, [[-60, GROUND], [1140, GROUND]], { lw: 2, heavy: null, over: 0 });
  const G = D.pose({ x: 480, y: D.standY(GROUND, 1.4), s: 1.4, dir: 1, ground: GROUND, t, wind: .4, seed: 3,
    look: { hairStyle: 'bob', hair: '#c9a58e', top: D.C.cream, topStyle: 'cardigan', sleeve: 'long', bottom: D.C.sage },
    face: { eyes: 'laugh', mouth: 'laugh' }, hands: [{ at: [600, 1080], ang: -1, kind: 'open' }, null] });
  D.figure(ctx, G);
  ctx.restore(); D.finish(ctx);
  D.captions(ctx, t, S.lines, { y: 330 }); D.fade(ctx, t, S.DUR);
}
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: S.DUR, fonts: D.FONTS, init: async () => D.init(), draw });
```

## How a shape is drawn (keep the order)
Every opaque thing is **knock → wash → ink**, back to front (`shape()` does all three): `knock` fills the exact silhouette
with paper, which hides what is behind. `wash` lays the offset texture, and `shade`/`greyWash` go on top of it. `ink`
comes last, so the line sits on the colour as in the reference. Things behind come first. For a vehicle with riders:
far arms and far legs → the vehicle's back parts → the bodies from rear to front (`parts: ['hairBack', 'body',
'nearLeg', 'head']`) → near arms that wrap around someone in front → the vehicle's front parts (fork, lamp, handlebar)
→ the driver's near arm. Then `finish`, then the words (screen space), then `fade`.

## Motion grammar
- **The camera rides alongside.** Moving things stay near one screen spot: the world streams past at parallax (far
  roofs .35, shopfronts .9, the road 1) with a few speed hairlines. When it speeds up, the subject surges a little
  ahead. On the brake the camera overshoots and settles back. Keep distance as a table built from speed (pure in t).
- **Suspension and wheels:** wheels stay on the road (a hop lifts both). The body bounces on them (`bump`, a road
  vibration), pitches nose-down on the brake, and squats on landing. Wheel angle = distance / radius. At speed the
  spokes melt into grey with streaks (`blur`). A locked wheel stops turning and leaves a skid line.
- **Wind is the life:** hair (`hairStyle` locks stream back with `wind`), ties and scarves (`ribbon`), short sleeves
  and the back of a shirt puff and flap (`flutter`), and box lids flap open. Wind follows speed and drops to a breeze
  when things stop.
- **Dust is one mass:** puffs from `dustLobes` are dragged along behind the wheel (keep ~80 % of the vehicle's travel
  so the cloud hugs it). Feed every lobe in one call to `cloudMass` so the trail draws as one outlined cumulus. To
  have the dust catch up, roll a dedicated mass in from behind: a base row sitting on the road, a middle row, billows
  on top, and a few front puffs (`layer: 1`).
- **Acting reads on the face:** `laugh` (^ ^ + an open laughing mouth), `panic`/`grit` (bulging eyes + clenched teeth +
  sweat), `smug` (squeezed eyes + tongue), `wide` + `o` (the shock beat), `closed` + `flat` (deflated). Change faces on
  beats, not every frame. Blinks only on open eyes.
- **Words are lettered on beats:** glyphs pop in one after another (`k`). To count down, strike the old number
  (`scribble`, 0.35 s), then pop the new one in its place (`scale` on glyph 0), and shake the last one.
- **Ends:** a pull-back (`cam` to ~0.7) onto a small final picture, a lettered closing line, fade 0.4 s.

## Bodies (BODY-CHECK)
`pose()` solves every limb with `ik2` (fixed bone lengths, one bend direction per limb in the figure's facing frame:
knees −1 = forward, elbows +1 = back/down). Hands take a WORLD grip point and a direction: the grip lands exactly there,
the wrist sits half a hand behind, and the hand's angle is clamped to ≤ 80° off the forearm. Legs take the ankle point
(on a peg, on the ground). `kneel` puts the near knee down with the shin flat behind. Limbs are straight bones with a
short rounded joint (`tube(…, { joint })`). `arms[i].ok === false` means the target was out of reach, so move the
target or lean the body; never place a hand freely. **Overhead holds** (a box held up, a banner) need `bend: -1` on both
hands, so the elbows go out behind the head. The default sends the near elbow forward across the face.

## Performance (1080 × 1920, Chromium headless, shared 4-CPU box, draw only)
- `init`: paper tooth baked once, and the marker textures for the palette pre-built (≈ 3 ms each, ≈ 100 ms in all).
  Other colours build lazily on first use.
- Sample film (3 riders, bike, street, shop, dust trail, engulf cloud, lettering): **mean 27.9 / median 26.3 ms**
  (p95 43 ms) over 40 frames, measured while an MP4 render ran on the same CPUs. Rendering the 19-s film (570 frames,
  4 workers) takes ~2–3 min.
- Template (one figure, pot, clouds): **mean 12.5 / median 7.2 ms** (p95 28 ms).
- The cost is in the number of strokes (each is a filled polygon) and the number of washed shapes. A figure is ~3–5 ms
  and a spoked wheel ~1 ms. Dust masses are cheap, but every lobe tests every other lobe for its outline, so keep it
  under ~80 lobes per mass.

## Pitfalls
- **Even-odd checkers:** never shade a union of lobes with an even-odd clip (overlaps flip to holes). `cloudMass`
  shades with a gradient and stroked crescents clipped to the union.
- **Bubble-wrap clouds:** fully outlined lobes of equal size read as balloons. Make the base row sit below the ground or
  a flattened base, keep front puffs few and of mixed size (they only ink their tops), and add a body lobe that fills
  the middle of a ring.
- **Rounded knees:** a 3-point limb drawn as a smooth curve turns a right-angle knee into one long arc. Limbs use
  `joint`.
- **Elbow humps:** a hand target close to its shoulder folds the elbow far behind the back, which reads as a hump. Move
  hanging hands down by the hip, or pass `null`.
- **Stroke-seed drift:** strokes are seeded by draw order (`frame()` resets the counter). A stroke that appears
  conditionally re-seeds everything drawn after it on that frame (a one-frame jump in the boil). Pass `seed` to
  strokes that matter, or draw conditional things last.
- **Busy backgrounds kill it:** the reference has none. Draw streets at ~40 % alpha in pencil and a few washes, and
  keep the subject and the dust the only full-strength things.
- **Wash colours are textures:** `pattern(c)` builds a 256-px tile per distinct colour string, so don't make colours
  per frame (`rgba` with a moving alpha). Fade with `globalAlpha` instead.
- **Fonts:** Gaegu Regular is hairline-thin at caption sizes. Map the `Gaegu` family to `Gaegu-Bold.ttf` in film.json.
- **Portrait first:** landscape pillarboxes the 1080 × 1920 frame (`begin`).

## What a scene author still draws
The vehicle or props (see `sketchride-art.js`: a bike from `wheel`, `chromeTube`, `coil`, `tube`, washes), the
street or set (light!), the cast's looks and acting per beat (`pose` inputs), what hands hold (`held`, or draw the
thing and target the hands to it), the dust sources, the camera (speed table, offsets, the pull-back), and the words.
