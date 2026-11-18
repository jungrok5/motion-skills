---
name: knitted-page
description: Give it a topic and it makes a live web page knitted out of yarn — a winter-fair poster, a grandmother's recipe card, a ski-lodge menu, a football-club scarf page — where every V-shaped stitch takes one colour from the real page under it (with plies, fibres, fuzz and lamp light, a Fair Isle or intarsia motif, on a wood, linen, gingham or felt table). A loose thread hangs off the last stitch; pull it (or press the page's own Unravel control) and the knitting unravels row by row into a crinkled heap of yarn, revealing what lay underneath (a second live layer: a raffle ticket, a secret note) — let go or press "knit it back" and needles knit it up again. The page stays real: type into the headline and the changed stitches re-knit row by row; buttons, radios and sliders work where they are drawn. Real HTML drawn by WebGL through HTML-in-Canvas, code-only, sound synthesised. The page, the yarns and gauge, the motifs, the table, the needles and what unravelling reveals are designed per topic. Different from knit-diorama (a 3D yarn world): here the knitting IS a working web page. Use for "knitted web page", "make the page out of yarn", "unravel the page", "pull the thread and it unravels", "sweater pattern page", "HTML-in-Canvas knitting", or ("뜨개질로 된 웹페이지", "실을 당기면 풀리는 페이지", "니트 스웨터 같은 페이지", "털실로 짠 포스터", "이 스타일로 ○○ 페이지 만들어줘", "주제만 바꿔서"). Source — made from the "Knitted Page" demo https://claude.ai/artifact/Y8uZf2xz48joUiM1nPhxLW on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# knitted-page

A live page that is also a piece of knitting. The page is ordinary HTML laid out inside a
`<canvas layoutsubtree content="drawable">`, in stitch units; its pixels are uploaded to WebGL on every paint, and a
downsample pass gives every stitch one yarn colour. A full-screen pass draws each stitch as a V of two twisted yarn legs
(plies, fibres, fuzz, contact shadows, a lamp), with live loops on the top edge, stocking-stitch roll at the sides and
soft folds, lying on a table. A loose thread hangs off the last stitch. Pull it, or press the page's Unravel control,
and the knitting unravels row by row from the top into a heap of crinkled yarn; under it lies a second live layer — what
unravelling reveals — which becomes clickable when the table is bare. Let go early, or press "knit it back", and a pair
of needles knits the page back up. At rest it is a working page: the headline is typeable (the changed stitches re-knit
row by row with the needles), controls work where they are drawn, and the caret is knitted too. Give it a topic ("a
grandmother's apple-cake recipe", "the ski lodge's après menu", "our club's scarf page") and it writes a brief, designs the
page, the yarns, the gauge, the motifs, the table and the reveal, and proves the result with numbers.

Made in this repo from Felix Rieseberg's "Knitted Page" demo — https://claude.ai/artifact/Y8uZf2xz48joUiM1nPhxLW — one of
the fifteen on his HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19 ("This is a web page" knitted in cream,
navy and red on a wooden table). `references/LOOK.md` lists what was observed. This skill keeps the idea (the page's own
pixels are the stitches; pulling the thread unravels it; it knits back) and writes all of its own code: stitches as
tilted "grain" legs, a height pass whose mips cast the cloth's shadow, a majority-yarn downsample with palette snap, a
reveal layer, a hand-pull measured from the cloth edge, a re-knit order that follows how knitting grows. The worked example
`examples/apple-cake` (Oma's recipe on a gingham cloth) is a new topic. Never recreate the source's "This is a web page"
card, its controls or wording.

Different from `knit-diorama` (a three.js land made of yarn that knits itself out of a ball): there is no world here — the
knitting is the live web page, and the interaction is the page's own.

**Code-only.** No generated or downloaded images, video, motion, audio or fonts (system font stacks). The motion of the
thread, the needles and the heap is keyed by hand in code: weight (the cloth gives slowly, then runs), anticipation (the
Unravel pull takes up slack first), settle (the last rows knit slower), a breathing idle (the loose end drifts).

**Fixed (the style)**: one knitted card on a table, drawn exactly where the page is laid out; one yarn colour per stitch,
stitches as twisted V legs with fuzz and lamp light; live loops on the top edge; a loose thread off the last stitch;
unravel top row first into a heap drawn as ribbons coloured by the stitches they were; knit back with a pair of needles,
bottom first; typed changes re-knit row by row; a drawn caret; the reveal layer live only when bare; the safety net;
`#still`, `#calm`, `#pose`, fallback.

**Designed per topic**: the page (what it is, its words, its controls and what they do, laid out in stitch units with big,
heavy type); the yarns (the colourway CSS variables, optional colourway switch, `palette`), the gauge (`stitch`, card
size) and the yarn itself (`yarn`: thickness, plies, twist, fuzz, sheen — wool, cotton, mohair); the motifs (Fair Isle
bands, an intarsia picture: `motifs`); the table (`wood`, `linen`, `gingham`, `felt`) and its colours; the lamp; the
needles (bamboo, steel, coloured knobs); what lies underneath (`#under`: a ticket, a note, a coupon, a map — or nothing);
where the heap lands; the wording of the Unravel and knit-back controls and the hint; the sound pitch. The template and the
example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`; never edit the copy) |
| `lib/knit.js` | the engine: `Knit.start(config)` → stitch downsample (majority yarn + palette), height + shade passes (stitches, fuzz, loops, table, reveal, needles, light), the thread (verlet rope), the heap and strands (ribbons), pull / unravel / bare / knit-back, re-knit sweeps, drawn caret, safety net, sound, poses, `Knit.motif`, `Knit.fallback`, the `__knit` hook |
| `templates/index.html` | the house example: a village winter-fair poster in three colourways, Fair Isle bands and an eight-point star; a raffle ticket underneath |
| `templates/BRIEF.md` | the brief to fill |
| `examples/apple-cake/` | the worked example: `BRIEF.md` + `index.html` (Oma's recipe: servings stepper, oven timer, apple motifs, gingham, steel needles; her secret underneath) |
| `scripts/check.mjs` | the shared checks (`hic-test.mjs`) + the knitting's own, with numbers |
| `scripts/still.mjs` | stills: `--act idle|pull|bare|knit|unravel|knitback|type|intro --at … --u …` |
| `scripts/new-page.mjs` | start a project folder (`lib/` + template, or `--from apple-cake`) |
| `scripts/hic-test.mjs` | the shared checks (copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (the source, observed) · **ENGINE** (API, config, adding a table, motif or behaviour) · **HIC** (HTML-in-Canvas rules) · **LESSONS** (what broke and the fix) |

## Project layout (what you create)
```
my-knitted-page/
  BRIEF.md     the topic as a knitted page + yarns + gauge + motifs + table + reveal (written first)
  index.html   the page: #page > .knit-mount > #card, #under > .knit-mount > .knit-under, Knit.start({...})
  lib/         hic.js + knit.js (copied by new-page.mjs; the page loads lib/…)
  out/         stills (not committed)
```
Run scripts with paths: `node <skill>/scripts/check.mjs my-knitted-page/index.html`.

Requirements: Node + Playwright Chromium (the global `playwright` is found). Checks and stills launch Chromium with
`--enable-blink-features=CanvasDrawElement` and software GL. To view live: Chrome / Edge 157+ or the Claude desktop app;
other browsers show the plain-page fallback.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` to the project as `BRIEF.md` and fill it from the topic
   (references/BRIEF.md): what the page is and what it does (its controls and their behaviour); its words, cut to what
   reads in stitches; the yarns (2–5 per colourway) and the yarn type; the gauge; the motifs; the table and lamp; the
   needles; what lies under the knitting and its knit-back control; the heap's place; the hint. Write it before code.
2. **Start**: `node <skill>/scripts/new-page.mjs my-knitted-page` (or `--from apple-cake`).
3. **The page.** Write the card's HTML in stitch units (`stitch: [w, h]` design px; every edge on the grid). Big, heavy
   type: a letter needs ≥ 6–7 stitch rows of cap height, so the headline is 120–160 px and small lines are 60 px+ capitals
   with letter-spacing. Mark the editable headline `data-hic-edit`, the Unravel control `data-knit-unravel`, a counter or
   toggle `data-hic-click`. Give it a portrait layout (`@media (max-aspect-ratio: 4/5)`) — the engine re-derives the grid.
4. **Yarn, motifs, table.** Set the colourway variables and `palette`; draw motifs as digit strings or generate them in
   the page (`motifs`, `Knit.motif`); choose `table`, `lamp`, `needles`, `yarn`. Anything the engine lacks (a new table, a
   stitch pattern) goes in a project copy of `lib/knit.js` with a note in BRIEF.md (references/ENGINE.md).
5. **The reveal.** Write `#under` (same box as the card): what unravelling uncovers, with a `data-knit-back` control kept
   clear of the heap (`heap.x/y`). Or leave it out: then the bare table knits back by itself.
6. **Stills and review.** `node <skill>/scripts/still.mjs index.html --out out --act idle`, `--act pull --u 0.35`, `--act
   bare`, `--act knit --u 0.5`, `--act type`, `--act intro --at 0.8`, and a phone still (`--width 390 --height 844`). Score
   each against the still review in references/BRIEF.md (every word reads in stitches; no in-between yarns at edges;
   motifs whole; heap and reveal never collide; thread and needles read). Fix and repeat.
7. **Check**: `node <skill>/scripts/check.mjs index.html` must end with `all checks passed` and the still / pose lines
   `ok`. Then open it in Chrome 157+ and play: type, recolour, pull the thread a little and let go, unravel, use the reveal.

## Rules
- **Design for the topic.** The page, its controls, the yarns, gauge, motifs, table, needles and the reveal are new for
  each topic. Do not reuse the template's fair poster or the example's recipe unless the topic is exactly theirs. Never
  recreate the source's "This is a web page" card, colour swatches, size slider or wording.
- **One style.** One knitted card on a table; every stitch one yarn; unravel from the top into a heap, knit back from the
  bottom with needles. No other effects are added (no crossfades, no particles, no flat overlays on the knitting).
- **The page stays real** (references/HIC.md). Text is DOM text, controls are real elements, drawn at their layout place
  (identity mapping) so what you see is what you click; bare, the knitted page is inert and the reveal is live. Never draw
  lettering as a picture to make it read: make the type bigger instead.
- **Readable in stitches.** Every word on the card must read in a still at 1280 × 800. Design the gauge and type together.
- **Weight sets timing.** The cloth gives slowly then runs under a pull (speed eases in); the Unravel pull takes up slack
  before it pulls (anticipation); knitting back eases in as the needles arrive and slows over the last rows (settle).
- **Alive at rest.** The loose end breathes (`#calm` stills it); re-knits pop a stitch up and settle it.
- **Upload on paint only**, size for sharp text (the runtime does it), `#still` composed, `#calm` drops the intro and the
  idle, no network, phone width works, the fallback is the same HTML (references/HIC.md).
- **Deterministic.** Heap, noise and scatter come from `HIC.rng(seed)`; stills step simulated time or freeze a pose.
- **Sound** only synthesised, off until the toggle.

## Contract (what a page exposes)
- `window.__hic.ready` (and `__hic.info`: cols, rows, stitches, stitch, table, under), `window.__hic.screenOf(el)`.
- `Knit.start(config)` → `{ unravel(), knitBack(), sound(on), mode(), info(), config }`. Fields are in references/ENGINE.md;
  defaults in `Knit.DEFAULTS`. `Knit.motif(el, spec, sw, sh)`, `Knit.fallback(canvas, config)`.
- Page markup: `#page[drawable] > .knit-mount > #card`, optional `#under[drawable] > .knit-mount > .knit-under`;
  `[data-knit-motif=name]`, `[data-knit-unravel]`, `[data-knit-back]`, `[data-hic-edit]`, `[data-hic-click]`.
- `window.__knit`: `info()`, `manual()`, `advance(sec)`, `unravel()`, `knitBack()`, `pose(name, u)`, `stitch(i, j)`,
  `stitchAt(x, y)`, `ropePoint(i)`, `layout()` — used by `check.mjs` and `still.mjs`.
- Address flags: `#still=<s>` (frozen, composed), `#pose=idle|pull|bare|knit&u=<0..1>`, `#calm`, `#nointro`, `#q=0.5`
  (scene render scale), `#fallback`. The canvas carries `data-knit-mode` (boot, intro, idle, pull, auto, bare, knit).
