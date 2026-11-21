# BOOK — the data and the set builder

A book is one ES module, `book.js`, default-exporting an object. `index.html` loads `kit/quest.css`, maps `three`
to `kit/vendor/three/build/three.module.min.js`, and calls `createQuest(book)`.

```js
export default {
  title: 'The Packet Post', subtitle: 'HOW A WEB PAGE REACHES YOU',
  mark: 'map',                       // imprint icon: book | map | feather | stamp
  mapTitle: 'From your click to your window',
  theme: { cover: '#2f5a6e', cloth: '#4a6658', accent: '#e9b44c', paper: '#efe2c2' },
  puppetScale: 1.25,                 // optional; multiplies every cast height (default 1.25)
  tour: { segment: 8.6 },            // optional; seconds per chapter in the film
  hero: 'quill',                     // key into cast
  cast: { quill: { …puppet spec, see CAST.md }, ledger: { … } },
  chapters: [ { …chapter }, … ],     // 3–6
};
```

## Chapter

| field | what |
|---|---|
| `id` | url hash (`#tower`) |
| `title` | two short lines, `['The Address', 'Tower']` — the check fails on a third line |
| `region`, `coords` | printed bottom-left of the left page; region also under the heading |
| `feature` | the idea's short name (eyebrow, "Read this page") |
| `stamp` | the stamp earned (task card, map) |
| `sky` | `morning` · `day` · `dusk` · `night` — light, room colour; blended while turning |
| `line` | journey line under the book (≤ 110 characters) |
| `story`, `lesson` | "Read this page" dialog |
| `hint` | under the heading: what to poke |
| `prop` | `{ label, hint }` — the call-to-action button text, and the nudge in the task card |
| `task` | see below |
| `ground` | the print: `{ land, shape?, water?: [poly], waterColor?, sand?: [poly], sandColor?, fills?: [{pts, color}], path?: [pts] }` — polygons in page units; `land: null` for bare paper; `shape` replaces the island outline (`blob()` in `kit/print.js` makes one) |
| `mapAt` | optional `[x, y]` (0–1) on the fold-out map |
| `set(S)` | builds the pop-up — see below |

### Tasks

```js
{ type: 'choice', prompt, options: ['…', '…', '…'], answer: 1, hint, solved }
{ type: 'order',  prompt, items: ['first', 'second', 'third'], hint, solved }      // listed in the RIGHT order; shown shuffled
{ type: 'count',  prompt, min: 1, max: 8, answer: 4, unit: 'parcels', check: 'Wind the loom', hint, solved }
```

The reader opens the task by clicking the prop in 3D, the call-to-action button, or Enter on the focused book.

## Page coordinates

The spine runs along z at x = 0. Left page x ∈ [−5.9, 0], right page x ∈ [0, 5.9]; z ∈ [−3.44, 3.44] grows toward
the reader. y is height above the page. Puppets are ~1.3 tall. Keep the back row (hills, mountains) near z −2.9,
skies (sun, moon, clouds, stars) on sticks behind z −1.8, the landmark mid-back (z −1.3 … −0.6), the hero and guide
in front (z 0.8 … 1.6), the prop between them and the reader, grass and signs on the front edge (z 2.2 … 2.9).
The top-left corner of the frame is the chapter heading: nothing tall on the far left-back.

## The builder `S`

Every call makes one **standee** — a group of card pieces hinged to the page at its anchor `(x, z)`. Its page is
the sign of x. When its page turns it folds flat (rotates about its hinge and squashes) in a direction that keeps
it inside its page: outward, toward the reader, toward the gutter, or away — chosen automatically, or forced with
`{ fold: 'out' | 'fwd' | 'in' | 'back' }`. Build each standee's geometry around its own origin (y = 0 on the page).

| call | makes |
|---|---|
| `S.add(x, z, (g, P) => { … }, { name, fold, side })` | any standee; build into group `g` with the primitives `P` |
| `S.prop(name, x, z, build, { label })` | the chapter's prop (pickable; a tag bobs over it until solved). Returns `{ item, on(fn) }` |
| `S.on(ctx => { … })` | per-frame motion for anything in the chapter |
| `S.hero(x, z, { from: -0.9, facing })` | the hero; walks in from `x + from` when the page arrives, then turns to face the prop |
| `S.guide(id, x, z, { facing })` | a cast member; points at the prop while the task is open, cheers when solved |
| `S.ridge(x0, x1, z, [[x, h], …], color)` | a folded strip of hills (split at the gutter for you) |
| `S.mountains(x0, x1, z, peaks, color)` | taller strip; snow caps above 1.2 |
| `S.sun / moon (x, z, y, r)`, `S.cloud(x, z, y, w)`, `S.star(x, z, y)` | skies on sticks |
| `S.pine / tree (x, z, h, color)`, `S.bush / rock (x, z, r)`, `S.grass(x, z, h)`, `S.flower(x, z, color)` | scenery |
| `S.house(x, z, { w, h, d, wall, roofC, door, windows, chimney })`, `S.sign(x, z, text, dir)`, `S.fence(x0, x1, z)`, `S.boat(x, z, s, sail, hull)`, `S.ripple(x, z, w, d)` | village things |
| `S.glow(x, y, z, color, power)` | a warm point light (night spreads); set `light.userData.power` in `S.on` to animate it |

`ctx` in motions: `t` (seconds), `local` (since this page arrived), `solved` (0 → 1 over 1.4 s after solving),
`solvedAt` (time or null), `open` (task card open), `poke` (seconds since the prop was clicked, or null),
`stand` (0 folded … 1 standing). Motions must be **pure functions of `ctx`** — no accumulating state — so the film
can seek any frame.

### Primitives `P` (kit/paper.js)

`box, cyl, cone, ball, beam(a, b, r), slab(points2D, depth), roof, hipRoof, pine, tree, bush, rock, grass, flower,
ridge, mountains, sun, moon, star, cloud, flag, bunting, lantern(g, x, y, z, glow), fence, water, boat, bird, house,
sign, label(text, {w, h, color})`, the palette `C`, `mat(color, opts)` (one cached matte card material per colour)
and `shade(hex, k)`. A new kind of piece is a function in `book.js` built from these — never edit the kit for one
book. Keep to flat colours, low segment counts (6–12), card thickness (0.02–0.06 for cut-outs), and sticks for
anything that floats.

## API

`createQuest(book)` returns and sets `window.quest`: `renderAt(t)`, `DURATION`, `ready`, `goTo(i)`, `openTask()`,
`audit()`, `propCheck(i)`, `screenRects(i)`, `state`. URL flags: `?render` (film mode, no clock), `?tour` (play the
film live), `#<chapter id>` (open on a chapter).
