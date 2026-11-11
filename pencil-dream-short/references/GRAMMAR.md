# GRAMMAR — the beats of one take, timing, the camera

A film is one take, ~25–35 s (a short one can be 14–18 s). Name the beats with `F.beat(name, t)`; `shotAt(t)` reports
them and check.mjs prints them.

| beat | time (32 s film) | what happens | how |
|---|---|---|---|
| wake | 0 – 3 | the hero is drawn on (1.4 s), blinks, looks left and right, a "!" / "?" | `F.hero(spec, track, { drawOn: [.05, 1.4] })`, `K.glyph` with `out` |
| the pencil | 3 – 6 | a pencil flies in drawing a curl; eyes follow it; the hand opens and catches it | `F.draw(curl, { by: 'pencil', out })` + `F.pencil({ intro, catchAt, meet })` |
| the first mark | 6 – 9.5 | the hero draws a small spot-colour thing within reach, then the line it stands on | `F.draw(parts, { by: 'hero' })` |
| the spread | 9.5 – 15 | the line runs to both edges; the world draws itself outward from the mark | `F.draw` (two halves of the line) + `F.spread(items, { origin })` |
| the giant | 15 – 19.5 | a few huge strokes (the back first) become the giant behind the landscape | `F.draw(giant, { by: 'self', dur: 3.5–4, z: -5 })` |
| its eyes | 19.5 – 21.5 | the eyes are coloured in; it blinks, a limb moves, it smiles | the giant's `make(t)` parameters; `move` for a slow bob |
| the swarm | 21.5 – 25 | the spot colour lifts off as small shapes that circle the giant (front and back) | `F.swarm({ from, centre, radius, shape })` |
| the wash | 24.5 – 28 | crayon colour blooms from the light over the sky, then the ground/sea | `F.wash([{ poly, grad, reach }])` |
| the desk | 27.5 – end | the camera pulls back to ~2× the spread; real pencils and an eraser around the book | `F.desk({ … })`, camera `w` ≈ 2 × page, `r` ≈ −.03 |

## Timing
- Hero marks: ~1.5–2.5 s for something the size of a hand; the hand moves between strokes with a small lift.
- Spread: speed 500–900 world units/s from the origin; each item draws at 1400–1700 units/s.
- The giant's first stroke should be one long sweep (~1 s): put the longest line first in its parts.
- Leave ~0.5 s between beats where nothing new starts (the hero reacts; the giant breathes).
- The film fades in from paper (0.5 s) and out to dark at the desk (0.9 s).

## Camera (`F.camera([{ t, x, y, w, r }])`)
- `w` is the view width in world units; zoom is interpolated in log space, so a pull-back feels even.
- Start: the hero's bust (w ≈ 2 × hero height). First mark: w ≈ 2.3 × height. Spread: pull to w ≈ 0.5–0.9 × page width.
  Giant: the whole page (w ≈ page width) aimed a little toward the giant. Desk: w ≈ 2 × page width, a slight roll.
- Keep the hero in frame while they act (write an `F.check` for it), and the giant's head in frame once it is drawn.

## Layout of the spread (world units, page 3400 × 2200, centre 0, y down)
- Horizon / ground line around y = +300…+400 (the lower third); the hero stands on it, off-centre (x ≈ ±400–600) so the
  gutter never crosses the face in the close-up.
- The giant fills the upper middle, its base hidden behind the horizon's knock-out.
- The light for the wash sits on the horizon or behind the giant (sun, moon).
