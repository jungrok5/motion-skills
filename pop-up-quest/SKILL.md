---
name: pop-up-quest
description: Give it a topic and it designs an interactive three.js pop-up storybook quest — a hardback open on a tablecloth, one chapter per spread, each spread a cardstock pop-up set (folded hills, a landmark, trees, a sun or moon on sticks) that stands up as the spread opens and folds flat onto the turning leaf, with paper-cut animal puppets (a hero who walks in on every page, a guide who points) and one prop per chapter the reader pokes to solve a small task (a choice, an order, a count) that makes the set move and earns a stamp on a fold-out map; drag the paper or the rail to turn pages, and a scripted tour bakes to a 16:9 MP4. For explaining a process or teaching a sequence of ideas as a journey (onboarding, how-it-works, lessons, product tours, children's stories). Use for "pop-up book", "interactive storybook", "3D pop-up adventure", "paper pop-up quest", "turn the pages of a 3D book", "explain X as a pop-up journey", "팝업북", "입체 동화책", "3D 팝업 모험", "종이 팝업 퀘스트", "이 스타일로 ○○ 팝업북 만들어줘", "주제만 바꿔서 팝업북으로". Source — made from https://x.com/johnlindquist/status/2123569842204897753?a=m59DB6YHNHs76FeIjyQ&s=19, shared at https://rosy-wisdom-dw86.here.now/.
---

# pop-up-quest

A pipeline for **interactive pop-up storybook quests** in three.js. A hardback lies open on a woven tablecloth; each
spread is one chapter of a journey. The spread's pop-up set — folded strips of hills, a landmark you could cut out of
card, low-poly trees, a sun or moon and clouds on sticks, a signpost — stands up as the spread opens and **folds flat
onto the leaf** as it turns, while the next set rises from the page beneath. A **paper-cut hero** (die-cut card parts
with a cream margin and a plain card back) walks in on every page; a **guide** who belongs to the place points at the
chapter's one **prop**. The reader pokes the prop (or presses its button) and solves a small task — a choice, an
order, a count — which makes the set move (a banner unrolls, a raft crosses, panes light) and stamps the fold-out
map. Pages turn by dragging the paper, scrubbing the rail or the arrows. Sounds are synthesised paper. The same page
plays a scripted tour deterministically through `renderAt(t)`, so it bakes to a 1920×1080 MP4.

Made from a post on X (John Lindquist, Nov 2026: "The Folded Atlas", a pop-up book made with Astra and pvncher's
"svg + 3d design" skill — https://x.com/johnlindquist/status/2123569842204897753?a=m59DB6YHNHs76FeIjyQ&s=19, live at
https://rosy-wisdom-dw86.here.now/). The style was taken from the post and the live page; the engine, puppets, sets
and book here are new code. Worked example: `examples/packet-post/` — how a web page reaches you, a topic the source
never had.

**Fixed (the style):** a hardback open on a tablecloth seen from the reader's seat · cardstock pieces in flat matte
colours with paper fibre, sticks for anything in the sky · every piece hinged to its page and folding flat inside it
when the page turns · a printed page under each set (island ground, dotted route, region name, plate number) ·
paper-cut puppets in 3/4 view with a cream cutting margin and a plain card back · one prop per chapter with a bobbing
tag · a task card, "Read this page", a fold-out map with stamps · serif headings and small-caps labels around the book.

**Designed per topic:** the errand that makes the chapters a journey · each place and its landmark · the prop and
what it does when solved · the hero and every guide (species, colours, coat, mass, what they carry) · ground prints ·
sky per chapter · task, words, hints · cover, cloth and accent colours.

## What's in this folder
| path | what |
|---|---|
| `kit/quest.js` | the engine: `createQuest(book)` — table, cover, page blocks, printed pages, the turning leaf (bent per frame), standees on carriers (base page / leaf front / leaf back) with automatic fold direction, puppets' plans (walk in, turn, point, cheer), quest state, tour timeline, camera, picking and drag-to-turn, `renderAt(t)`, `audit()`, `propCheck()`, `screenRects()` |
| `kit/paper.js` | cardstock primitives and scenery (`box, slab, roof, pine, tree, ridge, mountains, sun, moon, cloud, house, sign, lantern, boat, label …`), palette `C`, cached matte materials with a fibre map |
| `kit/puppet.js` | paper-cut puppets: species (`fox cat bear mouse rabbit owl bird frog penguin`), part design, die-cut atlas + card back, rig, `MASS` timing, `LIMITS`, `pose()` (walk, stepped turn, idle, point, cheer), `walkPlan()` |
| `kit/print.js` | the printed page per spread (ground, water, sand, route, region, plate, gutter) |
| `kit/ui.js` · `kit/quest.css` | heading, journey line, call-to-action, page rail, task card, Read dialog, map, tour cursor; real DOM, keyboard-reachable |
| `kit/sound.js` | synthesised page rustle, card pop, chime, thud (off until turned on) |
| `kit/cast.html` · `kit/cast.js` | the cast sheet: every puppet right, left, back, step, turn, gather, hop, point |
| `kit/fonts/` | Source Serif 4, Inter (SIL OFL, licences beside them) |
| `kit/vendor/three/` | three.js r170 module build (MIT) |
| `examples/packet-post/` | **worked example**: The Packet Post — 5 chapters (DNS, TCP handshake, HTTP, packets, rendering), 6 puppets, `BRIEF.md` |
| `scripts/new-book.mjs` | scaffold a book: kit copy, `index.html`, `BRIEF.md`, `book.js` with placeholder chapters that pass the check |
| `scripts/check.mjs` | pieces fold inside their page, quest data, props visible, joint limits, boot slide, idle, gather, text fit (1280 / 390), frames drawn / distinct / deterministic, heading clear |
| `scripts/render.mjs` · `scripts/render-chunked.sh` | stills or MP4 of the tour (Playwright + ffmpeg); chunked = parallel, resumable |
| `references/BRIEF.md` | the brief to fill first, and the still review |
| `references/BOOK.md` | book data, the set builder `S`, primitives, coordinates, API |
| `references/CAST.md` | puppet specs, body rules, motion timing, the cast sheet |
| `references/LESSONS.md` | problems met building this, with causes and fixes |

## Project layout
```
my-book/
  BRIEF.md        filled first
  book.js         title, theme, cast, chapters (words, task, ground, set(S))
  index.html      loads kit/quest.css, maps three, createQuest(book)
  kit/            copied from the skill by new-book.mjs
  out/            renders (git-ignored)
```

## Requirements
A browser with WebGL (a printed edition shows without it); Node 18+, Playwright + Chromium and ffmpeg for checks and
renders. No network at run time: fonts and three.js are bundled.

## Workflow
1. **Topic → brief.** Fill `references/BRIEF.md` as the project's `BRIEF.md`: the errand, 3–6 chapters (place,
   idea, sky, prop, task, what the prop does when solved), the cast designed for the topic (species, mass, colours,
   idle), words, look. Run `node <skill>/scripts/new-book.mjs my-book --title "…" --chapters "A,B,C" --hero fox`.
2. **Cast.** Write each cast member in `book.js` (CAST.md). Render the cast sheet and score it (BRIEF.md review 6):
   `node <skill>/scripts/render.mjs <skill>/kit/cast.html out/cast --stills 0 --size 1600x1300 --query book=<path from kit/ to book.js>`.
   Fix any body that reads wrong before building sets.
3. **Sets.** Redesign every chapter's `set(S)` for its place (BOOK.md): back strip, sky, the landmark built from
   primitives as a function in `book.js`, the prop with its motion (`prop.on(ctx => …)`), hero, guide, front-edge
   grass and sign. Write the ground print and the task. Placeholders from the scaffold are not kept.
4. **Look live.** `python3 -m http.server 8000` → open the book; turn pages slowly with the rail, poke every prop,
   solve every task, open the map; check the half-turn of every page (leaving pieces fold onto the leaf, arriving
   ones rise).
5. **Check.** `node <skill>/scripts/check.mjs my-book/index.html --shots out/check` must pass. It reports numbers:
   pieces and their fold directions, boot slide in px, idle motion, the cheer's gather, prop visibility, frame
   contrast. Fix in the book (move, shorten, split at the gutter, change the fold) — never by loosening a limit.
6. **Still review.** Score `out/check/chapter-*.png` with the review in BRIEF.md (all ten lines). Fix and repeat.
7. **Film.** Stills: `node <skill>/scripts/render.mjs my-book/index.html out/stills --stills 3.6,9.5,12.2`.
   MP4: `bash <skill>/scripts/render-chunked.sh my-book/index.html out/book.mp4 8 4` (`RENDER_ARGS='--size 1280x720 --jpeg'`
   for a quick one). Watch it through once.
8. **Lessons.** Anything that surprised you goes into the project's notes and, if it's about the kit, `references/LESSONS.md`.

## Rules
- **Design every book from its topic.** A new topic gets its own errand, places, landmarks, props, cast, ground and
  words. Don't reuse the example's tower, ferry or owl because they exist; the example and the scaffold's
  placeholders are illustrations of the style.
- **One style.** New pieces are built from `kit/paper.js` primitives in flat matte card colours, low segment counts,
  card thickness for cut-outs, sticks for skies; new puppets use `design()`'s parts and cutting margin. New pieces
  live in `book.js` — never edit the kit for one book.
- **Every piece folds flat inside its own page.** Pieces stay on one side of the gutter (split spanning things in two
  halves — `S.ridge` does it for you), never hang off the paper, never sink below it, and must fit their fold
  (`check.mjs` fails otherwise). Fold direction is automatic; force one only to fix a clash.
- **One prop per chapter, and solving moves it.** The prop is where the idea lives; the solved state is shown by the
  set (something unrolls, crosses, lights, stacks), not only by words. The prop must be visible from the reader's seat.
- **Bodies are possible** (CAST.md): faces 3/4 to the facing side, far eye narrower, near paw / boot / bag on the back
  side, plain card back, joints inside `LIMITS` — the paw never above 95° (it would cover the face). Check both
  directions and the back on the cast sheet.
- **Motion has weight, and is code-keyed** (this skill is code-only — no generated motion or outside models): mass
  sets timing; the planted boot never slides; turns are stepped; every idle breathes; the cheer gathers, hops, lands,
  recovers; the guide points with a gather and a settle. `check.mjs` measures slide, idle and gather.
- **Deterministic.** Motions are pure functions of `ctx` (no accumulating state, no `Math.random`, no wall clock);
  the film renders any frame alone. `check.mjs` renders each chapter twice and compares.
- **Words are short and true.** Headings two lines, journey line ≤ 110 characters, the task's wrong options tempting
  but clearly wrong once you know the idea; no captions that explain what the picture already shows.
- **The page stays usable.** Everything on top of the book is real DOM (buttons, dialogs, live region); the task can
  be opened without 3D picking (button, Enter); keyboard arrows turn pages.
- **No outside assets.** Everything is code (pieces, puppets, prints, sounds); fonts and three.js are bundled.
  Renders and generated media stay out of the repo and out of `docs/`.

## Contract
- `createQuest(book)` sets `window.quest`, `window.renderAt(t)`, `window.DURATION`, `window.ready` (Promise; fonts
  loaded, prints redrawn).
- `?render` — film mode: no clock, every frame from `renderAt(t)` (state rebuilt from the tour timeline), CSS
  transitions and animations off, the drawn cursor on. `?tour` plays the film live; `#<chapter id>` opens a chapter.
- Tour: 1.4 s rise, then per chapter `tour.segment` seconds (default 8.6): walk in → cursor to the prop → task →
  solved → turn (1.3 s); 3.2 s on the map at the end.
- `quest.audit()` → `{ chapters: [{ id, pieces, props, actors, bad, task, folds }], actors: [{ limits, worst, slidePx, idleMove, anticipation, hop }] }`;
  `quest.propCheck(i)` and `quest.screenRects(i)` after `renderAt` at a settled frame.
