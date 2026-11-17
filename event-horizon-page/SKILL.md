---
name: event-horizon-page
description: Make a live web page with a compact massive object floating over it — a real HTML page (text you can select and retype, a field you can type in, buttons and checkboxes that work) bent by gravitational lensing around a black hole with a glowing accretion disk, a pulsar with sweeping beams, or a wormhole that shows the page's far side, drawn with WebGL2 through HTML-in-Canvas. Light paths follow the Schwarzschild orbit equation u'' = 3u² − u, integrated into deflection tables; the disk is found where each ray crosses it (its lensed far side arcs over the shadow), Doppler-beamed and bloomed through mips. You drag and fling the object; you feed it a word and the word is torn off the page into a mesh that spirals in and stretches into glowing strands; Hungry lets it eat what it touches and Restore gives everything back; bent words stay clickable through the inverse lens. Give it a topic and it designs the page (a physics lecture handout, a band's tour page, a newsletter, a CV, a launch page), the object and its look (kind, size, disk and beam colours, tilt, spin), what feeding does and the sound. Outputs one self-contained folder (index.html + lib/) that works from file:// and as a Claude artifact, plus stills. Use for "black hole web page", "gravitational lensing over HTML", "page bent by gravity", "pulsar page", "wormhole effect on a website", "HTML-in-Canvas black hole", "feed a word to a black hole", or ("블랙홀이 페이지를 휘게 하는 웹페이지", "중력 렌즈 효과 페이지", "단어를 블랙홀에 먹이기", "펄서가 도는 공연 페이지", "웜홀 웹페이지", "HTML-in-Canvas 블랙홀", "이 스타일로 ○○ 페이지 만들어줘", "주제만 바꿔서"). Code-only. Source — made from the "Event Horizon" demo https://claude.ai/artifact/YLk8PESrskZLHiAiyqUZHN on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19
hic: true
---

# event-horizon-page

An ordinary, clean, one-screen web page with something very heavy floating over it. The page is real DOM inside
`<canvas layoutsubtree content="drawable">`; `lib/event-horizon.js` draws its pixels through the gravitational lens of a
black hole, a pulsar or a wormhole. Near the object the page's words stretch into arcs around it, an Einstein ring of
paper opens, a mirrored second image of the page sits inside it, and the shadow (or the star, or the throat) sits in the
middle with its own light: an accretion disk whose far side is lensed up over the top, a photon ring, beams that sweep.
You drag the object and fling it. You type a word into the page's feed field and send it: the word is torn off the page as
a picture on a fine mesh, every vertex falls in along its own spiral, near side first, so the letters stretch into strands
that heat up and thin out. Hungry lets it eat every word it touches; Restore spirals everything back out. Through all of it
the page is still a page: bent words are selectable, the headline is retypeable, and a click lands on what is drawn under
the pointer, because the page is placed for hit testing with the inverse of the same lens.

Made from Felix Rieseberg's "Event Horizon" demo — https://claude.ai/artifact/YLk8PESrskZLHiAiyqUZHN — one of the fifteen
demos on the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared in "All hail the weird web"
(https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19). `references/LOOK.md` lists what was
observed there. This skill keeps the idea, the interaction grammar and the technique (geodesic tables, disk crossings, mip
bloom, torn-word meshes, inverse-lens hit testing) and writes all of its own code; it copies none of the demo's code, text or
sound. The worked example, `examples/pulsar-tour/`, is a different topic: a band's tour page at night with a pulsar.

**Code-only.** No generated or downloaded images, video, motion, audio or fonts. System font stacks; sound is Web Audio.

**Fixed (the style)**: one ordinary, readable, one-screen page drawn by WebGL through HTML-in-Canvas; one compact massive
object over it whose lens is computed from real light paths (Schwarzschild, page plane a fixed distance behind, the lens
fading to nothing at three Einstein radii so the rest of the page is untouched); the object's own light (disk, photon ring,
star, beams, throat) drawn crisp and bloomed through its mips; the interaction grammar — drag and fling with weight, feed
a word (it is torn off as a mesh and spirals in), Hungry eats what it touches, Restore spirals everything back, Gravity
off/on, Mass slider, Sound toggle — in a dock outside the canvas; an opening where the object drifts in, takes one word
and hands it back; the page stays selectable, typeable and clickable under the lens; the fallback page.

**Designed per topic**: the page itself (its content, layout, type, palette and controls, and what its own buttons do);
the object (kind, size range and starting mass, the five-colour ramp of its light, disk radii / tilt / roll / spin /
beaming, star colours, beam colour / period / length, throat colours); where it rests and which word the opening takes;
what feeding means (questions dropped into a lecture, song requests that spin a pulsar up, rejected headlines, wishes) and
whether the fed word leaves the page or stays listed; the checklist, if the page has one; the sound (root, scale, timbre,
pulse ticks). The template and the example are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/hic.js` | the shared HTML-in-Canvas runtime (copy of `tools/hic/hic.js`; never edit the copy) |
| `lib/event-horizon.js` | the engine: geodesic tables (α(b), u(b, φ)), the lens in JS and GLSL, the object kinds (`blackhole`, `neutron`, `wormhole`), the emission + mip bloom, torn-word meshes, eating / feeding / restoring, drag and fling, the opening, hit testing, the synthesised sound, the test hook |
| `templates/index.html` | the house example: a lecture handout ("Light takes the long way.") with a black hole, a feed field, a problem-set checklist and the dock; `#kind=neutron` / `#kind=wormhole` preview the other kinds |
| `templates/BRIEF.md` | the brief to fill |
| `scripts/new-page.mjs` | start a project: `lib/` + the template (or `--from pulsar-tour`) in one folder |
| `scripts/check.mjs` | the shared checks + physics, lens, drag, fling, bent click, bent selection, feed, hungry, restore, mass, determinism, sound (numbers) |
| `scripts/still.mjs` | stills of a frozen page, with acts (`move`, `mass`, `feed`, `sweep`, `restore`, `run`) |
| `scripts/hic-test.mjs` | the shared checks (copy of `tools/hic/hic-test.mjs`) |
| `references/` | **BRIEF** (topic → brief, the still review) · **LOOK** (observed from the source) · **ENGINE** (config, API, adding a kind) · **HIC** (HTML-in-Canvas notes) · **LESSONS** (what broke and the fix) |
| `examples/pulsar-tour/` | the worked example: `BRIEF.md` + `index.html` — Halcyon Static's "Pulsar Season" tour page with a pulsar |

## Project layout (what you create)
```
my-event-horizon/
  BRIEF.md     the topic as a page + an object (references/BRIEF.md) — written first
  index.html   the page (ordinary HTML in #stage > #page[drawable]), the dock, and EventHorizon.create({...})
  lib/         hic.js + event-horizon.js (copied by new-page.mjs)
  out/         stills (not committed)
```
Run the scripts from the skill folder or give them paths: `node <skill>/scripts/check.mjs my-event-horizon/index.html`.

Requirements: Node + Playwright Chromium (the scripts turn the feature on with `--enable-blink-features=CanvasDrawElement`).
No network, no npm install. The live page needs Chrome / Edge 157+ or the Claude desktop app; other browsers get the same
HTML as an ordinary page.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the topic (references/BRIEF.md says how): what page this
   is and who reads it; its content in real sentences (no lorem); its palette and type; the object (kind and why, size,
   colours, disk / beams / throat); where it rests and the opening word; what feeding means here and what the feed field
   is called; the checklist or the page's own controls; the sound. Save it as `BRIEF.md` before any code.
2. **Start**: `node <skill>/scripts/new-page.mjs ../my-event-horizon` (or `--from pulsar-tour` when the topic is close to a
   dark page with a pulsar).
3. **Write the page.** Replace the template's HTML with the brief's page: keep `#stage > #page[drawable]`, one editable
   headline with `data-hic-edit`, one `data-hic-click` control, the feed form, the dock and the hint. Mark controls that
   should be eaten whole with `data-eh-atom`, things never to eat with `data-eh-keep`. The page must fit one screen at
   1280 × 800 and at 390 × 844 (hide rows on small screens rather than scroll).
4. **Design the object** in the `object` config: kind, `size`, `ramp` (five colours from the coolest to the hottest light),
   `disk` (radii in M, tilt, roll, spin, beaming), `star` / `beams` / `throat`. A new kind or a prop goes in the page or in
   a project copy of the engine (references/ENGINE.md), never in the skill's lib.
5. **Behaviour per topic**: `feed.onFeed` (what a fed word changes: a counter, a spin-up, a record), `feed.leave` (does the
   word stay listed), `on(event)` for the checklist (`drag`, `type`, `select`, `feed`, `eat`, `hungry`, `restore`), the
   sound (`root`, `scale`, `timbre`, `pulse`).
6. **Stills and review**: `node <skill>/scripts/still.mjs index.html --out out --at 1,2.5`, plus acts:
   `--act "move:.4,.6"`, `--act "move:.42,.62;feed:hello;wait:1500;run:1.4"`, `--act "sweep:.1,.5,.5,.55;run:.5"`, and
   `--size 390x844`. Look at every still and score it against the still review in references/BRIEF.md (readable at rest,
   the object composed beside the headline, the lens reads as gravity, the disk lit, pieces as strands, no blank or broken
   areas, phone width). Fix and repeat.
7. **Check**: `node <skill>/scripts/check.mjs index.html` must end with `all checks passed` and the `still` line `ok`.

## Rules
- **Design for the topic.** The page, its words, its palette, the object's kind and colours, what feeding means and the
  sound are designed for this topic. Do not ship the template's lecture handout or the example's tour page with the
  words changed unless the topic is exactly theirs. Never recreate the source demo's page, its wording or its checklist.
- **One style.** One compact object, one lens from real light paths, the object's own light bloomed, the same grammar
  (drag / fling, feed, Hungry, Restore, Gravity, Mass, Sound). A new kind follows the same lens and the same pieces.
- **The page stays real.** Text is DOM text, never a picture of text. The headline is `contenteditable`, the feed field
  is an `<input>`, the controls are real `<button>` / `<input>` / `<label>`. Eaten words are hidden with
  `visibility: hidden` (layout stays still) and come back exactly.
- **What you see is what you click.** The page is placed under the pointer with the lens's local affine (`S.placeLocal`
  with the engine's `sourceOf`); the shader and the JS read the same α table. Prove it with `check.mjs` (`bent`, `select`).
- **Physics, not a swirl.** Deflections come from the tables; the lens fades to zero at three Einstein radii, so the rest
  of the page is untouched (the check's far-corner number). Do not "turn up" the lens with a fudge factor; change the
  mass or the size range.
- **Weight.** The object trails the hand on a spring that softens with mass, overshoots when the hand stops, coasts when
  flung and settles (the check reports the settle time). It grows a little with what it eats and relaxes on Restore.
- **Readable at rest.** At `#still=1` with no pointer the object rests beside the headline, clear of body text and
  controls, and every line is readable. The dock never covers content.
- **Upload only on paint; draw only on change**, one frame in flight (a GPU fence). Uploads happen in `onPaint`; a change
  made inside a paint callback asks for a new paint on the next frame.
- **Deterministic.** `#still=<s>` freezes the disk, beams and drift at that time; checks and stills move the frozen page
  with `run(seconds)`. Scatter uses `HIC.rng`. Two loads give the same picture.
- **Sound is synthesised**, off until the Sound toggle, never samples.
- **No network.** System font stacks, no CDN; the page works from file:// and as a Claude artifact.
- **Phone width.** At 390 px nothing scrolls sideways; the object shrinks with the screen (`sizeK`), the page drops rows.
- **The fallback is the same HTML** (`HIC.fallback`), the dock hidden, the feed form still adding words to its list.

## Contract (what a page exposes)
- Markup: `<canvas id="stage" layoutsubtree content="drawable"><div id="page" drawable>…</div></canvas>`, `#page` with
  `position: relative` and a background colour (read as the paper colour), a dock `[data-eh-dock]` outside the canvas.
- `EventHorizon.create(config)` (references/ENGINE.md) returns the API, also at `window.__hic.eh`: `state`, `object`
  (the live object config), `sourceOf(x, y)`, `screenOf([x, y])`, `run(s)`, `feed(text)`, `giveBack()`, `hungry(on)`,
  `gravity(on)`, `moveTo(x, y)`, `setMass(m)`, `einstein()`, `pieces()`, `eatenCount()`, `alpha(b)`, `sound`, `redraw()`.
- `window.__hic.ready` (set after the first upload and the hit-test probe), `window.__hic.screenOf(el)` (where an element's
  centre is drawn, through the inverse lens).
- Address flags: `#still=<s>` (frozen time), `#calm` (no drift, no disk motion; also `prefers-reduced-motion`),
  `#fallback` (force the plain page), `#nointro`, `#intro` (run the opening under automation), `#q=0.5` (lower backing
  resolution), `#kind=neutron|wormhole|blackhole` (preview another kind with its defaults).
