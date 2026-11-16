---
name: storybook-portrait
description: Draw a character portrait in the contemporary picture-book style — matte gouache skin, dark dry-brushed hair with coloured streaks and flyaway hairs, big round eyes with small side-glancing pupils, tiny features low on an oversized head, red cheeks, a long neck, crayon-textured patterned clothes, thin wobbling ink lines, white paper — entirely in JavaScript on a canvas, with no image files. Give it a topic (a job, a person, a moment, a feeling) and it writes a brief, designs a new character for it (hair, clothes, palette, a story detail, props drawn in the same media), paints it stroke by stroke in a painter's order, and keeps it alive afterwards — breathing, irregular blinks, glances where the eyes lead and the head follows with a counter-move and overshoot, hair and earrings that lag. Outputs a 1080×1350 (or 2160×2700) PNG, an MP4 of the drawing being made and then alive, a live page, and a cast sheet turned both ways. Use for "draw this in a picture-book style", "storybook character", "children's book illustration in code", "gouache portrait with JavaScript / p5.js style code", "make a character for <topic> in this style", "그림책 스타일로 그려줘", "동화책 일러스트", "이 스타일로 ○○ 그려줘", "주제만 바꿔서 이 그림체로", "자바스크립트로 그린 캐릭터", "과슈 느낌 인물화", "캐릭터 일러스트 만들어줘". Source — made from https://x.com/vamsibatchuk/status/2121788887823778297?a=NmhF1v14IKYs7TtTVf4&s=19
---

# storybook-portrait

One character, painted in code in the manner of a contemporary picture book, then alive. The input is a topic ("a
grandmother who keeps bees", "the apprentice at a bakery before dawn", "a kid who goes out when it rains"). The output is
a bust portrait on white paper — 1080×1350 PNG (2160×2700 with `--scale 2`), a live page where the picture is painted
stroke by stroke and then breathes, blinks and glances, an MP4 of that, and a cast sheet. No image files: every mark is
gouache, dry brush, crayon, ink or blush simulated on a Canvas 2D context (`lib/paint.js`).

Made in this repo after an X post by Vamsi Batchu (@vamsibatchuk) —
https://x.com/vamsibatchuk/status/2121788887823778297?a=NmhF1v14IKYs7TtTVf4&s=19 — who gave a reference illustration by
@Artedeingenio to a model and had it draw many different subjects in that style with pure JavaScript / p5.js / Python
and no outside files. This skill takes that **method and style grammar** and builds the tools to do it on any topic; it
does not take the reference picture or its character (references/SOURCE.md). Starter: `templates/` 「Rain Collector」.
Worked examples: `examples/beekeeper` 「The Beekeeper」 (curly grey hair, glasses, a bee her eyes follow) and
`examples/dawn-baker` 「Dawn Baker」 (a bun, flour, an apron — and a yawn). Live:
https://jungrok5.github.io/motion-skills/storybook-portrait/

**Fixed by the style** (every piece):
- one character, bust, front or 3/4 (|yaw| ≤ 0.75), cropped by the bottom of a 4:5 sheet; the white paper shows round it;
- the media: gouache skin and small forms, dry-brush hair (dark mass → dark strands → a few coloured streaks →
  flyaways), crayon clothes with paper tooth, thin wobbling ink contours that break, blush rubbed in with pencil on top;
- the face: an oversized head, features small and low, big round eyes with small pupils that glance aside, a tiny
  nose and mouth, strong blush, warmer ears, a long neck;
- one pattern and one clashing colour pair on the clothes; ≤ 7 hue families in all;
- the film: the strokes go down in a painter's order, then the character is alive (never a frozen second).

**Designed per topic** (never reused): who they are, the story detail that tells the topic at a glance, the hair (style,
colours, streak colour), the face numbers, the clothes and pattern, the palette, the extras (props, things in the air),
the mass, the beats (where they look, when the head follows, the big move), the title.

## What's in this folder
| path | what |
|---|---|
| `lib/paint.js` | the media: `gouache`, `dryBrush`, `crayon`, `ink`, `blush`, `dabs`, `tooth`, `paper`; geometry (`spline`, `bezier`, `ellipse`, `rough`, `bounds`), seeded `rng`, `noise1/2`, colour (`mix`, `shade`, `jitter`) |
| `lib/figure.js` | `build(design, view)`: the character as data → strokes on layers + live drawers (pupils, lids, brows, mouth, flyaways) + geometry for the checks; `DEFAULTS` (neutral), `LAYERS`, `LIMITS`, `onSphere` (turned features) |
| `lib/motion.js` | `makeMotion(motion, design)`: pose at any live time τ — breath, seeded blinks, saccades, head on a mass spring with lead / counter-move / overshoot, hair lag, earring pendulums, expressions (`EXPRESSIONS`, `MASS`) |
| `lib/portrait.js` | the runtime: paints ops into layers, plays the drawing (each op wiped in along its brush direction), composites the live pose; `rig()` and `motionReport()` for the checks; `castSheet()`; `mount()` for the page |
| `templates/` | starter 「Rain Collector」: `BRIEF.md`, `character.js`, `piece.html` — what `new-portrait.mjs` copies |
| `examples/beekeeper/` | worked example: curly hair, glasses and a honey-dipper brooch as extras, a live bee; gaze keys read off the bee's path; heavy mass |
| `examples/dawn-baker/` | worked example: bun hair, apron, kerchief, flour; a yawn as the big move (slow face ease, deep breath, recovery) |
| `scripts/new-portrait.mjs` | start a project (starter or `--from <example>`) with its own `lib/` copy |
| `scripts/render.mjs` | PNG (`--scale 2`), `--still t`, `--stages 6` (the drawing), `--cast`, `--sheet` (a stretch of the live loop), `--film` (MP4) |
| `scripts/check.mjs` | brief · loads · deterministic · drawing grows · style (paper shows, ink, palette, no flat fills) · body (facing both ways, twist, tilt, pupils, planted edge) · motion (alive, blinks, breath, lead / counter-move / overshoot / hair lag per head beat, spacing by mass) |
| `references/` | **BRIEF** (template + stills rubric) · **LOOK** (the media and the face, turned heads) · **FIGURE** (design fields, extras, layers, page contract) · **MOTION** (what moves, mass, beats, references, the big move) · **SOURCE** · **LESSONS** |

## Project layout (what you create)
```
my-portrait/
  BRIEF.md       topic → who → design → motion → review log
  character.js   export design (data + extras), motion (mass, beats), meta (title)
  piece.html     the page (import map "sp/" → ./lib/)
  lib/           copy of the skill's lib/
  out/           PNG, stages, cast sheet, MP4 (not committed)
```
Run scripts from the project's parent or anywhere: `node <skill>/scripts/render.mjs my-portrait/piece.html`. To watch
the page, serve the folder (`python3 -m http.server`) and open `piece.html` (`?cast`, `?done`).

Requirements: Node 18+ and Playwright's Chromium (for render / check); ffmpeg for `--film`, `--stages`, `--sheet`. No
network, no npm install, no GPU. A portrait paints in ~0.3–0.6 s; the full check runs in a few seconds.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` (references/BRIEF.md) before any code: the topic in one line and what it must
   not become; who (age, temperament, **the story detail**, mass, idle); the design (face numbers, hair with its streak
   colour, garment + one pattern in a clashing pair, extras, a 5–7 colour palette with roles, composition); the motion
   (draw / live seconds, where the keys come from, a beats table, the big move if any).
2. **Start the project.** `node <skill>/scripts/new-portrait.mjs my-portrait` (or `--from beekeeper` when the topic is
   close). The starter is an example of the style: replace every value with what the brief designs.
3. **Design the character** in `character.js` (references/FIGURE.md). Hair styles `straight` / `short` / `bun` /
   `curly`, garments `sweater` / `cardigan` / `collar`, patterns `stripes` / `dots` / `checks` / `solid`; anything else
   the topic needs (a hat, braids, glasses, a bee, rain, steam) is an **extra** drawn with `lib/paint.js` in the
   project — never edit the skill's `lib/` for one topic.
4. **Key the motion** (references/MOTION.md): mass, breath period, beats — gaze first, head beats the mass can land,
   one big move built as gather → action → hold → recovery. Keys come from a reference clip of your character if you
   have one (outside the repo; ElevenLabs or any paid generator only after the owner says yes for that request) or are
   set by hand — the brief says which.
5. **Look.** `render.mjs piece.html --cast` (cast sheet: turns both ways, expressions, glance keys both ways) — fix the
   rig before anything else; then `render.mjs piece.html` (the still) and `--stages 6`. Open the images. Score the still
   with the rubric in references/BRIEF.md; fix the worst line; log the round in `## Review`.
6. **Check.** `check.mjs piece.html` must pass (numbers, not just pass / fail).
7. **Deliver.** `render.mjs piece.html --scale 2` (2160×2700 PNG), `--film` (MP4: the drawing, then alive), `piece.html`
   live. Credit @Artedeingenio's style when sharing, as the source post did.

## Rules
- **Design each portrait from its topic.** A new character every time: who, story detail, hair, clothes, palette,
  extras, beats. The starter and examples are examples of the style, not menus — do not reuse their hair, coat, bee or
  yawn unless the brief arrives there itself.
- **Never recreate the reference picture or any artist's existing character.** Take the style grammar, not the girl
  with the black-and-blue bob and the striped cardigan.
- **One style.** New things are drawn in the same media and the same hand: gouache, dry brush, crayon with tooth, ink
  that wobbles, blush with pencil. No flat `fill()`, no smooth gradients standing in for paint, no vector look, no image
  files, no filters.
- **The face is the style.** Features small and low, eyes big and round with small pupils, a glance aside, strong
  blush. Do not hide it (no veils, no masks over the eyes, no back views).
- **Body directions agree.** Nose, chin, near ear and chest front turn the same way; the far eye narrows; the chest turns
  about half the head; |yaw| ≤ 0.75, live turns ≤ 0.25, tilt ≤ 0.35, head-to-chest twist ≤ 0.79 rad. Check the cast
  sheet both ways before the still.
- **Weight sets timing.** Pick a mass in the brief; head beats at least 0.6 / 0.75 / 1.0 s apart (light / medium / heavy).
- **Eyes lead, the head follows; every turn gathers and lands.** Do not key the counter-move or overshoot by hand — the
  runtime adds them; do key the beat late enough for them to show.
- **Parts follow through.** Hair, flyaways and earrings lag the head; the shoulders follow it.
- **Every idle breathes.** Breath and irregular blinks never stop; no half-second of the live loop is frozen.
- **The planted edge does not slide.** The bust leaves the sheet at the bottom; that edge stays put.
- **The sheet shows.** 25–78 % bare paper; extras may fly in front, but no background scene.
- **Deterministic.** Seeds only (`P.rng`, `seed` passed to ops); never `Math.random`; `seek(t)` carries no state.
- **Generated video / images are references, never assets.** Keep them out of the repo and out of `docs/`; name them
  in the brief. ElevenLabs only with the owner's yes for that request.

## Contract
- `character.js` exports `design`, `motion` (`draw`, `live`, `mass`, `beats` …) and `meta.title`.
- `piece.html` → `mount(character)`; `window.__ready`, `window.DURATION = draw + live`, `window.seek(t)`,
  `window.__sp = { portrait, figure, pose(t), rig(), motion(), drawT, DURATION }`.
- Sheet 1080×1350 virtual px; `?scale` multiplies the output. Extras' ops declare a `bb` that contains what they paint.
