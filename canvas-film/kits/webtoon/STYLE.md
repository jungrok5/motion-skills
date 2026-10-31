# 웹툰 (Korean colour webtoon, vertical-scroll motion-toon)

Slug `webtoon` · kit `kit.js` → vendored as `scenes/kit-webtoon.js` · global `window.Webtoon` · knowledge base `RESEARCH.md`
(21 GitHub sources + a 38-technique playbook, kept as is) · worked example: `motion-webtoon/examples/donut` 「마지막 도넛」 in the `motion-webtoon` skill, which packages this kit with a cast rig and a mono-manga finish (cast file
`scenes/donut-cast.js`, reference page `scenes/cast-sheet.html`).

## Provenance — ideas, numbers and formulas only; own renderer, no code copied
| source (licence) | what we took |
|---|---|
| BloomBooks/comical-js (MIT) | arc tail (root where centre→target crosses the outline, base along the outline, bowed mid), thought outline from jittered points + outward arcs, thought-tail bubbles, shout outline, merged balloon families via stroke-under-fill |
| drnachio/postext (MIT) | balloon defaults: superellipse oval, padding ≈ .4–.55 em, 14-spike burst, whisper = dashed, tail reach .55, caption box |
| hitode909/speedline + sugyan/speedline.js (MIT) | the focus-line triangle algorithm (θ += .02·(.5+rnd), inner .75·(1+.3·rnd), bold 1.1) and the 10 fps boil |
| MirzaBeig/Anime-Speed-Lines (Unlicense) | speed lines as a masked field with a clear zone round the subject (concept) |
| ashukae/ComfyUI-MangaScreen (MIT) | 4 tone levels (paper, 18 %, 42 %, black), one page-aligned 45° dot screen, ≥ 8 px per dot; + the sqrt radius rule (Observable halftone notes) |
| bmad4ever/comfyui_panels (MIT) | slanted cuts as corner offsets of a panel polygon |
| rough-stuff/rough — Rough.js (MIT, Preet Shihn) | the bowed double-stroke line and its length gain (1 → .4) for the `rough` panel border |
| VRM spec — MToon / SpringBone (VRM Consortium; licence not shown → formulas only) | one hard toon band (as a clip-and-offset crescent), rim as a thin sliver, spring sway (re-written as a closed-form damped sine so frames stay pure) |
| Live2D Cubism samples (Live2D licences → numbers only, nothing ported) | blink 0.10 / 0.05 / 0.15 s, next blink 0–7 s; idle periods 6.5345 / 3.5345 / 15.5345 / 3.2345 s |
| EXPWorlds/Godot-Cel-Shader (MIT) | the cel parameter model (threshold + softness, outline pass) |
| gramener/comicgen (MIT) | the expression / pose vocabulary checklist |
| k-omiq/Pear (MIT) | SFX as stacked strokes (halo → ink → fill) + echo shadows |
| SamDreamsMaker/webtoon-creation-guide (MIT), Clip Studio guides, Comistitch | gutter = time, gap presets (×1.35 to 1080), one moment per screen, dialogue placed before the speaker, mood colour in the gutter |
| mihonapp/mihon (Apache-2.0) | readers add no gaps: the strip owns all spacing |
| google/fonts (SIL OFL 1.1) | Jua, Do Hyeon (Woowahan Brothers), Black Han Sans (Zess Type), Nanum Pen Script (Sandoll), Gaegu (JIKJI SOFT), Noto Sans/Serif KR — loaded by name |

Not used (listed in RESEARCH.md): kumiko (AGPL), manga-image-translator (GPL), ManhwaFormatter, MangaShader's ordered dither,
awesome-webtoon-guidelines (link hub only). Comedy timings, the reading-time formula and every *(ours)* value are our own
calibration — check them on a phone.

## What it looks like
A phone-screen colour webtoon that the camera **scrolls down**: one tall strip of panels on warm off-white paper, ink-framed,
borderless (soft fade), full-bleed or slanted; gutters of changing size and colour (they are the time between beats; a gutter
can turn from paper to black to carry a mood). Characters in **clean dark-brown lineart** (outline thicker than inner lines,
outline-under-fill so overlapping parts merge into one silhouette), flat colour with **one hard cel band** (light from the
upper left, a slightly cool/purple shade), big expressive eyes with two highlights, brows drawn over the fringe, the fringe's
own cast shadow on the forehead. Three drawing registers switched by beat with **hard cuts**: normal cel-shaded (≈1:6), **SD /
chibi** (1:1.5, mittens, thick line, flat) for gags, and **fake-epic manga** (black panels, focus/speed lines, screentone, aura,
heavy SFX). Lettering is part of the art: round white balloons in Jua, spiky shouts in Black Han Sans, thought clouds and
monologue in Nanum Pen Script, dashed whispers, square narration boxes; SFX laid out syllable by syllable with a white halo,
an ink stroke and a colour fill. Motion-toon life inside the panels: blinks, breathing sway, a hair spring, steam, sparkles,
balloons that pop, SFX that land, a camera that pushes in or punches.

**Carries well:** everyday comedy (office, school, family), escalation into a fake-epic duel and the deflating punchline,
reaction faces, "the thing everyone wants", romance beats (sparkle backgrounds), small mysteries with a reveal, explainer
stories told by characters, anything meant to be read on a phone.
**Carries badly:** awe, liturgy, slow meditation (the medium is chatty and quick), realistic violence, landscapes without
people, scripture read slowly (use a quieter kit), more than ~2 balloons on screen, landscape-first films (it pillarboxes).

## Palette (`Webtoon.C`, `Webtoon.ACCENT`)
| token | hex | use |
|---|---|---|
| `paper` / `white` | `#fbf8f2` / `#ffffff` | strip & gutters / balloons |
| `ink` / `border` / `black` | `#2a2127` / `#1d1a1f` / `#151216` | character + balloon line / panel border / drama panels, tone |
| `skin` / `skinS` | `#ffe3d2` / `#f2b6a4` | default skin + its cel band (casts set their own) |
| `wall`, `wall2`, `wood`, `woodS`, `floor`, `shadow` | `#f6efe5` `#ece2d3` `#e3c8a2` `#c7a57d` `#e8ddcc` `#c5ccda` | calm daylight sets |
| `sweat`, `tear`, `tearL`, `vein`, `blush` | `#bfe6ff` `#9bd6ff` `#e7f7ff` `#e2333f` `#ff8a97` | emotion symbols |
| `aura` / `auraL`, `gloom`, `rays`, `gold` | `#2e1b40` / `#7b4fae`, `#4b5a8a`, `#fff3c4`, `#ffd65c` | menace, gloom, light |
| **`ACCENT`** | `#ff6fa3` | the ONE thing the story is about (the donut glaze); nothing else carries it |
Shade colours come from `shadeOf(c)` (= c × .80/.76/.88); `stoneCol(c, k)` greys anything to stone. Mood passes: `MOOD` / `grade`.

## Fonts and words
Jua (dialogue; Do Hyeon alternative) · Nanum Pen Script (thought, monologue; Gaegu alternative) · Black Han Sans (shout, SFX,
titles) · Noto Sans KR (narration boxes) · Noto Serif KR (rare titles). Load with `<link href=Webtoon.FONT_LINK>` and
`Pilot.run({ fonts: Webtoon.FONTS })`. Dialogue 46 px (≥ 32 px floor at 1080), shout 56, thought 58, narration 38; ≤ 2 lines
(3 max), breaks only at 어절 spaces, balanced lines, the final period dropped. Text appears at once (type-in exists, use
sparingly). Every string goes through `Pilot.tr` inside the kit (balloons, SFX, titles) — pass Korean. Reading time:
`readTime(s)` = 1.2 s + .07 s/char; keep ≤ 2 balloons in the reading zone; nothing important in the top 140 / bottom 300 px
when the camera stops (`SAFE`).

## API (`window.Webtoon`)
- **Frame:** `begin(ctx, bg)` (pillarboxes landscape) · `fade(ctx, t, dur, fi = .4, fo = .4)` · `paper(ctx, x, y, w, h, col, grain)` ·
  `titleCard(ctx, t, { title, kicker, sub, x, y, at, size })` · `endCard(ctx, t, at, { title, end = '끝', next, by })`.
- **Strip & camera:** `strip({ top, side, gap, bottom, bg: [[y | 'id' | 'id:end', col]…], panels: [P…] })` → `S` (`S.P[id]`, `S.H`);
  `P = { id, h, gap ('seq'|'action'|'beat'|'scene'|'cliff'|px), x, w, y, row, dy, shape: 'rect'|'round'|'slant', cut: [tl, tr, br, bl],
  border: 'ink'|'thin'|'none'|'fade'|'bleed'|'rough', bg, draw(ctx, t, P), over(ctx, t, P) (panel break, unclipped), cam(t, P) }` —
  panel-local coords, `P.rel` for parallax. `camera(S, stops, { t0, lo })` with stops `{ panel, align: 'mid'|'top'|'bottom'|'fit', off }`
  | `{ at: stripY }` | `{ y }` + `hold`, `glide` (auto from distance), `cut`, `ease: 'io'|'out'|'back'`, `drift` → `cam.y(t)`,
  `cam.arrive[i]`, `cam.leave[i]`, `cam.end`. `drawStrip(ctx, t, S, cam.y(t), { shake, over })` · `drawPanel` · `panelStop` ·
  `gutterAt` · `toStrip(P, t, p)` · `GAP`, `SAFE`. In-panel camera: `kenBurns(t, t0, t1, z1, fx, fy)`, `punch(t, t0)` (1.25 → 1 +
  decaying shake), `mixCam(...)`; frame: `shake(t, t0, A)`, `tremble(t, A)`; `breakGap(ctx, path)`, `roughPoly`.
- **Balloons:** `balloon(ctx, t, b)` / `balloons(ctx, t, [b…])` (one list = one family: overlaps merge, `join: i` adds a bar) with
  `b = { kind: 'talk'|'shout'|'think'|'whisper'|'narr'|'mono'|'wobble', text, x, y, tail: [x, y], at, out | dur, size, font, maxW,
  w, h, reach, bend, type (cps), dark (narr), align, fill, color }` → `{ x, y, w, h }`. `balloonSize`, `layout`, `textBlock`, `readTime`.
- **Lettering:** `sfx(ctx, t, { text, x, y, size, at, out, fill (or [top, bottom]), ink, halo, rot, step, grow, wild, skew, stagger,
  shake, beat (Hz), echo, tremble, arc })` · `rumble(ctx, t, { text: '쿠구구구', x, y, lines })`.
- **Effects:** `focus(ctx, t, { x, y, w, h, cx, cy, rx, ry, inner, at, color, seed })` · `speed(ctx, t, { x, y, w, h, ang, gap })` ·
  `tone(ctx, cov, region)` / `tonePattern` / `toneLevel` / `TONE` · `toneGrad(ctx, x, y, w, h, { from, to, y0, y1, dir: 'r' })` ·
  `rays(ctx, t, cx, cy, o)` · `glow` · `star4` · `sparkles(ctx, t, { cx, cy, rx, ry, n })` · `moodBg(ctx, t, 'sparkle'|'gloom'|'swirl'|
  'burst'|'flat'|'dread'|'drama'|'joy', x, y, w, h)` · `gloomLines` · `spiral` · `aura(ctx, t, { x, y, w, h, k })` ·
  `flash(ctx, t, t0, { hold, dur, rect })` + `freeze(t, t0, len)` · `poof(ctx, t, t0, x, y, r)` · `grade(ctx, rect, mood)` ·
  `emote(ctx, t, 'sweat'|'vein'|'blush'|'sparkle'|'gloom'|'swirl'|'shock'|'steam'|'q'|'ex'|'qex'|'heart'|'dots'|'note', G.head, { at })` ·
  `tears(ctx, t, G.eyes, 'stream'|'fall'|'well', { r, at, floor })` · `crumble(ctx, t, box, drawFn, { id, t0, crack, dur, floor })`.
- **Look helpers:** `inked`, `inkGroup` (merged outlines), `cel` (one hard band), `rim`, `taper`, `bez`, `qb`, `capsule`, `poly`,
  `smooth`, `ell`, `rr`, `shadeOf`, `lightOf`, `mixC`, `rgba`, `stoneCol`, `lwFor(s)`; time: `hash`, `rnd`, `boil`, `backOut`, `pop`,
  `popPeak`, `register(t, ranges)`.
- **Character helpers:** `ik(a, target, L1, L2, bend)` · `blink(seed, t)` · `sway(t, seed, amp)` · `spring(t, events, o)`.
- **Rig (`Webtoon.Rig`):** `person(ctx, t, spec, o)` → `G` (normal body; ctx `null` = geometry only), `chibi(ctx, t, spec, o)` (SD;
  `stone`, `crack`), `face(ctx, t, spec, x, y, s, o)` (head only), `fitReach(t, spec, o, 'L'|'R', target)` (leans until the hand
  gets there), `hand(ctx, pose, x, y, ang, sz, flip, o)` (poses open, cup, fist/rock/hold, point, scissors, paper/wave, grab,
  pinch, thumb, mitt), `gripOffset`, `EXPR` (neutral, smile, glint, shock, cry, joy, chew, determined, dead, talk, happy, worried,
  tired, angry, blank), `eye`, `mouth`, `drawHead`, `palOf`. Person options: `x, y` (feet), `s` (1 → 640 px tall), `turn` (0 front,
  ±.55 3/4, + faces right), `headTurn, tilt, nod, lean, pose ('stand'|'walk'|'sit'|'kneel'|'crouch'), ph, crouch, bob, expr` (+ `eyes,
  brows, mouth, talk, look, blush, open`), `arms: { L, R }` (**screen** left/right: `{ to, hand, ang, bend, thumb, front, prop,
  propFront }` — `to` is where the GRIP lands; 2-bone IK with fixed bone lengths, wrist ≤ 80° off the forearm), `sway, hairEv,
  stone, crack, alpha, light, only: 'head'`. `G = { head: { x, y, r, dir, tilt }, eyes, mouth, hands: { L, R } ({ x, y, ang, grip,
  reach, elbow }), shoulders, neck, hip, top, box }`. A spec is a look: `{ name, seed, h, head, build, pal, shirt, outer, tie, hood,
  skirt, lanyard, band, glasses, moustache, bags, wrinkles, browW, hairBack(ctx, G), hairFront(ctx, G) }` (hair in head units —
  see the comment above `Rig` in kit.js for `G.fx / ox / bx / shadow`).

```js
const WT = Webtoon, R = WT.Rig;
const STRIP = WT.strip({ top: 300, panels: [
  { id: 'a', h: 820, border: 'fade', draw: (c, t, P) => { roomBg(c, P); const G = R.person(c, t, SPEC, { x: 400, y: 760, s: 1.1, turn: .55, expr: 'talk' });
      WT.balloon(c, t, { text: '안녕하세요!', x: 700, y: 140, tail: G.mouth, at: 1 }); } },
  { id: 'b', h: 1100, gap: 'beat', border: 'bleed', bg: '#fff',
    draw: (c, t, P) => { WT.focus(c, t, { x: 0, y: 0, w: P.w, h: P.h, at: 6 }); R.chibi(c, t, SPEC, { x: P.w / 2, y: 980, s: 1.6, expr: 'shock' }); },
    over: (c, t) => WT.sfx(c, t, { text: '헉', x: 300, y: 160, size: 180, at: 6 }), cam: t => WT.punch(t, 6) },
] });
const CAM = WT.camera(STRIP, [{ panel: 'a', hold: 5 }, { panel: 'b', glide: .12, hold: 3 }]);
function draw(ctx, t) { WT.begin(ctx); WT.drawStrip(ctx, t, STRIP, CAM.y(t), { shake: WT.shake(t, 6, 10) }); WT.flash(ctx, t, 6); WT.fade(ctx, t, 10); }
Pilot.run({ W: Pilot.W, H: Pilot.H, dur: 10, fonts: WT.FONTS, draw });
```

## Motion grammar (incl. gutter-as-time and comedy pacing)
- **The scroll is the cut.** One strip per scene, read downward, never cut away. Stop on a panel (hold ≈ reading time), glide through
  gutters with ease-in-out (`glide` auto = .35 + gap/1400, .4–1.6 s); `drift` (20–40 px) during a hold keeps it alive.
- **Gutter = time.** `GAP.seq` 56 inside a sequence, `action` 160, `beat` 320 (+ a pause mid-gap: a stop `{ at: gutterY, hold: .3–.6 }`),
  `scene` 640, `cliff` 900. Mood changes happen in a gutter (`strip.bg` ramp: paper → black for the epic, back to paper after).
- **Panel shapes.** Full-width bleed for key moments, borderless fade for calm/memory, narrow or side-by-side (`row`) for quick
  reactions, slanted cuts for action; mix widths. Breaking the border (`over` + `breakGap`) for climaxes and gag over-reactions.
- **Comedy (RESEARCH §4):** setup (1–3 normal panels, dialogue holds .6 s + .09 s/syllable) → **silent beat** (same framing, no text or
  "……", only a blink or a sweat drop, .8–1.2 s, after a beat gutter) → **punchline** (a hard cut or ≤ .12 s glide to a full-width
  panel, SD switch, focus lines or flash, SFX pop, `punch`, hold 1.5–2 s) → aftermath (small panel, deadpan face, 1 s). The pause goes
  *before* the punch; never a big gap after it. Contrast sells it: cel-shaded setup → flat SD punchline with thicker lines. One
  emotion symbol per face unless the pile-up is the joke. Running gags: same framing three times, the third breaks it.
- **Entrances:** balloons pop .6 → ~1.08 → 1 in .22 s (shouts 1.12 + shake), SFX syllables 0 → 1.25 → 1 staggered 40–50 ms, focus
  lines rush in (inner 1.25 → .75 in .15 s), thought tails bubble in 60 ms apart, emotes pop with overshoot.
- **Micro-motion:** blinks (seeded, Live2D timing), sway (incommensurate sines), hair `spring` kicks on turns and stops (`hairEv`),
  steam, sparkles twinkle, boils at 8–12 fps on gag beats only. Effects that boil (focus lines) re-randomise at 10 fps.
- **Registers switch on a hard cut** (`register(t, ranges)`, optional `poof`); never morph normal ↔ SD.

## Performance (1080 × 1920, headless Chromium, `seek(t)` timing)
Template: 4.5 ms mean, 15 ms worst (the end-card frame). Cast sheet (≈ 25 figures, effects, balloons on one page): 7–30 ms. Costly
things: `toneGrad` (≈ 10k dots for a full frame — keep it to a panel), `crumble` (an offscreen copy of the figure every frame while it
falls), `sparkles` with glow, many `R.person` calls (≈ 0.5–1 ms each). `R.person(null, …)` (geometry only) is cheap — use it to aim tails.
Balloon layouts and tone patterns are cached.

## Pitfalls
- `arms.L / R` are SCREEN sides. In 3/4 (`turn > 0`, facing right) L is the near arm (drawn in front), R the far one (behind the body
  unless `front: true`). Aim `to` at where the GRIP should be, not the wrist; if `G.hands.L.reach` is false, use `Rig.fitReach` (lean),
  crouch, or move the target — never let a hand float short. Animated reaches: fix `bend` so the elbow cannot flip sides.
- A held thing is drawn from the hand (`prop` behind the fingers / `propFront` in front) at `H.grip` — it then moves with the hand.
- Path2D: after `rect()` call `moveTo` before an `ellipse()` in the same path (else a stray edge joins them — broke a bite mask once).
- Hair callbacks are called twice (normal + the fringe-shadow pass): guard strands/highlights/clips with `if (G.shadow) return`.
- Balloons and SFX translate their own text: pass the Korean string, never a pre-sliced one. Keep tails out of the safe zones' faces.
- Camera stops clamp to the strip (`lo` default −700 lets the first panel centre); stops must be in time order.
- Faces are tuned for `s` ≈ 0.8–7; below 0.6 use the SD rig or a silhouette. Line weight follows `lwFor(s)`, not s.
- Keep the accent for the one thing; office palettes stay calm (blue-grey shade, warm walls).
- Moustache + side part + dark hair on a small face can read as an unfortunate historical likeness — keep facial hair wide and soft.

## What a scene author still draws
The story: the strip (panels, gutters, the camera stops timed to the beats), each panel's composition (where people stand, their
poses, expressions and hand targets per beat), backgrounds/props (a film's cast file — `donut-cast.js` has the office, pantry,
fridge, desk, donut, boxes), the words (in the film's `script*.js`), which effect lands on which beat, and the body check. The kit
draws everything about *how* it looks; a cast file draws *who* (specs + hair + props). Start from `template.html` + `script.example.js`.
