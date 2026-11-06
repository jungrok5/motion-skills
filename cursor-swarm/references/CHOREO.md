# CHOREO — topic → boards → sections → ops, timing and layout recipes

## Documents and boards
`new Build({ doc })` sets the frame and the default board: `web` 1080 × 1350 frame, one board 860 wide that grows downward;
`slides` 1920 × 1080, boards 1280 × 720 in a grid of `cols` (3); `book` 1920 × 1080, pages 520 × 720 paired into spreads
(`cover: true` keeps the first page alone), units in a row of `cols`; `poster` 1080 × 1350, one 900 × 1200 board.
`B.board(id, { name, w, h, bg })` starts a board (and a section); ops after it use **its** coordinates (0,0 = its top-left).
The camera fits a slide or a spread whole and pans to the next once the current one is done; a growing web board is
fit to its width and scrolled. `board: { w, h, bg }` in the constructor changes the default for every board.

## The timeline model
`B.t` is a time cursor. Every op starts at `B.t` (or `at:`, `after: id`, `with: id` + `delay:`) and then moves `B.t` on by a
short `next` (default per kind below), so ops **overlap** — that is what makes it a swarm. `B.sync(extra)` moves `B.t` to
the end of everything queued so far: use it between sections. `B.wait(s)` adds a pause.

| op | default length | default `next` | agents |
|---|---|---|---|
| `rect` | 0.12 + drag (0.38–0.95, grows with size) + 0.5 | 0.32 | 1 |
| `text` | 0.3 + chars / cps + 0.35 (cps: 15 for ≥ 30 px, 26 for ≥ 20 px, 46 smaller) | 0.3 | 1 |
| `image` | 1.75 (0.7 carry, then the reveal) | 0.45 | 1 (fetches from the left edge; `from: 'right'`) |
| `paint` | `dur` (3.2) | 0.85 × dur | up to `by` (all) — one per tile |
| `cells` | `dur` (2.6) | 0.85 × dur | up to `by` (all) — one per tile |
| `chips` | (n − 1) × stagger + 0.7 | 0.45 | one per chip |
| `line` | 0.6 | 0.2 | 1 |
| `button` | a `rect` then its label (at 75 % of the box) | 0.3 | 2 |

Image files: `B.image(id, { …, src: 'assets/photo.jpg', fit: 'cover' | 'contain' })` — loaded before the build starts.
`paint` of a `src` image reads its pixels, which needs the page served over http (code-drawn `art` always works).

Each job goes to the nearest agent that can get there in time (travel 0.3–1.05 s by distance). If none can, the op
waits and check.mjs says `waited 0.8 s for a free agent` — add agents or start it later.

## A section, step by step
```js
B.section('menu');
B.text('menu-h', { x: 36, y: 760, text: '오늘의 빵', font: 'serif', size: 32, weight: 700, color: ink });
cards.forEach((c, i) => B.rect('card-' + i, { x: 36 + i * 276, y: 826, w: 236, h: 316, r: 16, fill: card, line, next: .15 }));
cards.forEach((c, i) => B.image('img-' + i, { …, with: 'card-' + i, delay: .75, next: .1 }));   // three files fly at once
B.wait(.5);
cards.forEach((c, i) => { B.text('name-' + i, …, next: .12); B.text('price-' + i, …, next: .1); });
B.sync(.1);                                                                                     // the camera moves on
```
- **Containers first, contents after:** the card box, then (`with:` + `delay:`) its picture, then its text.
- **Small `next` (0.1–0.15) for parallel rows** of similar blocks (three cards, nav links, hour labels).
- **Swarm ops get a section of their own** or start after a `sync()`: they take most agents.
- **One heading per section**, typed first; its `size ≥ 30` makes it slow and readable.

## Layout recipes (page 860 wide)
- Margins 36 px left and right → content 36…824. Two columns: 36…516 and 556…824. Three cards: x = 36, 312, 588, w = 236.
- Vertical rhythm: section heading → 60 px → content; 60–90 px between sections; text `lh` 1.3 for headings, 1.5–1.6 body.
- Heading 32–48 serif, body 15–17 sans, labels 12–13 mono with `track: .08–.12`, prices mono 16 bold.
- Nav bar: `rect` 0,0,860,72 with a hairline `line`; logo at 36,18; links right-aligned around x 450–700; a pill button.
- Pixel banner: a `paint` of a `defineArt` drawn on a grid of `px` page pixels (`px` 8–12); the art width = cols × px.
  Lettering inside it with `pixelText(g, 'TEXT', x, y, cell, colour)` (5 × 7 cells per glyph, 6 cells advance).
- A heat / activity grid: `cells` with `cell` 12–34, `gap` 3–6, `r` 2–6, `empty` slot colour, `color(i, j, R)` or
  `values` + `ramp`. Row labels: one `text` with `lh = (cell + gap) / size` and one line per row.
- Card: `rect` (r 12–16, `fill`, hairline `line`, `shadow`) → `image` inset 12 px (r 10) → name (serif 20–22) → note (sans
  14, `w`) → bottom row (price mono left, a small mono note right-aligned with `align: 'right'` and `w`).

## Timing recipes (30 fps, 1080 × 1350)
- Intro: grows to fit the prompt (~0.03 s per character + 2.1 s); keep prompts under ~60 characters.
- Section: 2–5 s. Swarm op: 2.5–3.6 s (shorter feels like a wipe, longer drags).
- Finale: hold 0.9 s → swarm returns (0.6 s) → zoom-out 2.6 s → end hold 2.4 s.
- Total 20–45 s. The bakery: 7 sections, 58 ops, 35 s · the deck: 6 slides, 55 ops, 32 s · the book: cover + 2 spreads, 33 ops, 22 s.
- Decks: 3.5–5 s a slide (a chart slide 6 s). Long decks: render chapters (`--from / --to`) or fewer, fuller slides.

## Deck recipes (board 1280 × 720)
- Margins 80–90; title serif 48–56 at y 75; body 22–28; a stat card 352 × 280 (three across at x 80 / 464 / 848).
- Per slide: title first, then everything else `with:` the title (`delay` .3–1.3) so 3–6 cursors work at once.
- A chart: one `cells` op, bars = runs of cells, gaps = `null` columns, `by` ≈ ¾ of the agents so labels have hands free;
  value labels `overlap: true` (they sit inside the chart's box), `after:` the bars with a negative `delay`.
- A timeline: `line` (dur .9) → dots (`rect` r = h/2) `with:` the line, staggered → month / step / note `with:` each dot.

## Book recipes (pages 520 × 720)
- Margins 44; kicker mono 13 at y 56, title serif 44 at y 80; body 16 with `lh` 1.55–1.7; page numbers mono 13 at y 676,
  outside edge (left page left, right page right).
- A full-bleed picture: `image` at 0,0 with the page size — the other page's text goes `with:` it.
- The cover: a `paint` of a `defineArt` (it becomes pixel art at `px` 10–14) + the title typed `with:` it.

## Wide or tall frames
`W: 1920, H: 1080` (16:9) keeps the page at ≤ 1.3 × and shows less of it at once — use fewer, wider sections.
`W: 1080, H: 1920` (9:16) shows more page per screen; give the zoom-out a longer page. Set `zoom:` to override.
