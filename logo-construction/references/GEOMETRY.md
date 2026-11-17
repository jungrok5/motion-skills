# GEOMETRY — designing a mark on a construction grid

A mark here is **only** straight guides, circle guides, and the cells between them. You author the grid, then name
the cells you want filled. The film draws your guides in the order you add them, so the authoring order is also the
choreography.

## API (`lib/mark.js`)

| call | guide |
|---|---|
| `new Mark({ lean, pivot, seed, sketch })` | `lean`: degrees from vertical for `slant()` (positive = top to the right, "/"). `pivot`: the y at which a slant's x is measured. `sketch`: `{ jitter, wobble, round, tone, streak, grain }` for the rough sketch |
| `slant(name, x, { lean })` · `slants(base, xs)` | a leaning line through (x, pivot); `lean` per line overrides (a mirrored taper: `lean: -6`) |
| `h(name, y)` · `hs(base, ys)` · `v(name, x)` · `vs(base, xs)` | horizontals and verticals |
| `line(name, [x, y], [x, y])` · `angled(name, [x, y], deg)` | a free line through two points / through a point at an angle (0 = horizontal) |
| `parallel(name, ref, [x, y])` | a line parallel to `ref` through a point: reuse a direction |
| `circle(name, x, y, r)` · `circles(base, centres, r)` | circle guides; a family of equal circles is dragged out once and copied |
| `{ family: 'deck' }` on any line | joins a family of parallels: drawn as an alt-drag copy of the family's previous line |
| `{ distribute: true }` on a family | placed slightly unevenly, then the Align panel distributes it (only for evenly spaced families) |
| `{ measure: true }` on a guide | a guide that builds nothing on purpose (silences the unused-guide warning) |
| `shape(name, ['a&b', 'c&d:8', …], { round, foot })` | a cell: corners are crossings of two straight guides; `:r` sets one corner's radius (`:0` sharp); `foot` = stands on `reads().ground` |
| `cut(circle)` · `add(circle)` | punch a circle out of the finished mark / add a disc |
| `reads({ subject, facing, ground })` | what it depicts; `check.mjs` proves feet on the ground and the eye on the facing side |

Coordinates are an artboard of 0…1000 (y down). The mark can sit anywhere in it; the film frames the mark's bounding box.

## Method

1. **Silhouette first.** Draw the subject as 5–12 blocks in your head or on paper: body, head, ears, legs, tail /
   tower, deck, roof, beams. A mark that needs more than ~12 shapes is a drawing, not a mark.
2. **Choose the lean.** One lean for everything that leans gives the source's energy (12–16° for an animal in
   stride). Use 0° and verticals for calm, symmetric things (a building, a monogram), or a mirrored pair of small
   leans for a taper.
3. **Long slants that do double duty.** The best grids reuse a line: the fox's `nape` slant is the back of the neck,
   the back of the ear and the front edge of nothing else; `chest` is the front of the body *and* the front leg. Every
   reuse is a line the viewer sees doing two jobs, which is what makes construction videos satisfying.
4. **Horizontals as levels.** Crown, jaw, back, belly, ground. Ground is where feet end (`':0'` corners).
5. **Free lines last, and few.** Muzzles, ear fronts, roofs. Make pairs parallel (`parallel()`), or mirror them. Aim for
   ≤ 6 directions (mirrored pairs count once); `check.mjs` warns above that.
6. **Circles for every curve and every hole.** The eye, a lamp, wave bites. A cut circle's centre must be inside a
   shape; give it at least ~2 % of the mark's width of ink around it so it stays a hole at small sizes.
7. **Families.** Put parallels in families so the film copies them across (fast, and true to the source): legs,
   levels, uprights, beam edges, equal circles. Distribute only families that are meant to be evenly spaced.
8. **Shapes.** Walk each cell's corners in order. Neighbouring corners must share a guide (that is the edge). Shapes
   may overlap; a corner that sits on or inside another shape is a joint and stays sharp automatically.
9. **Rounding.** A radius per shape (outside corners), smaller on tips (`:5`–`:10`), `:0` on feet and anything that
   meets the ground or a neighbour edge-to-edge.
10. **Look at the mark sheet** (`render.mjs piece.html --mark`): guides by colour, corners (black = rounded, red =
    sharp, magenta = off-grid), the mark at 256 / 128 / 48 / 24 px and mirrored. Fix the grid here, not in the film.

## Bodies in a mark

A mark of an animal is a still symbol, but it is still a body: one facing for eye, nose, ears and stance; legs end on
the ground guide; knees and hocks bend the way that animal's do (a quadruped's hind leg angles back below the hock);
the neck joins the body plausibly. Stylise proportions, never anatomy. `reads({ facing, ground })` + `foot: true`
let `check.mjs` prove the parts it can measure; the rubric (references/BRIEF.md) covers the rest.
