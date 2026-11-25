# LOOK — two panels, gouache daubs, a study

## The frame
- 1080 × 1350 (4:5), two 1080 × 673 panels stacked: **before** on top, **after** below, a 4 px grey seam.
  `layout: 'side'` puts them side by side at 1920 × 1080 for a landscape cut.
- One locked camera per panel, the same in both (`cam: { x, ground, zoom }`) — the panels must line up so the eye
  compares pose for pose. The ground line sits at `ground` (0.8) of the panel height.
- 30 fps, silent (a study clip; add music in the edit if it is posted).

## Labels (fixed)
- `before` / `after` — white pills, top left, Inter 600 26 px.
- The beat label — one short line in a white pill at the bottom of the **after** panel while the beat plays (+0.25 s).
- The beat's tags — small translucent pills top right of the after panel: the principles that beat shows. Every tag
  must be backed by a passing number (`check.mjs` → "tags are earned") or be a judged principle (staging, appeal,
  solid drawing, exaggeration).
- In the study: `spacing · arcs` at the top of the after panel and a legend at the bottom (`one dot = 1/12 s`).

## The creature (fixed style, designed per topic)
- Built of thick gouache **daubs**: each body part (spine curve, neck, head, jaw, ears, tail chain, limb segments) is a
  round-capped underpaint stroke covered by seeded oval daubs that ride the part (u along, v across), so the paint
  never flickers. The light side of a part takes lighter daubs, the belly side takes the belly colour on its own
  underpaint band.
- Far limbs and the far ear are darkened (×0.76) and drawn behind the body; near limbs over it.
- Pointed ears are painted triangles (darker tip, a warm inside on the near ear); round ears are daub strokes.
- The eye is a dark oval with a highlight and a lid in the coat colour (blinks); the nose a dark oval (or a beak in the
  head's tip colour).
- A soft contact shadow under the body (fades with height) and under each foot.
- No outlines, no gradients on the creature, no image files.

## The ground (designed per topic)
- Paper above (faint wall daubs), a painted floor band below (horizontal strokes, smaller with distance, a few dry ink
  scratches), one soft ground line. `look: { paper, ground, line, seed }`.
- Props (`kind: 'leaf' | 'fish' | 'ball' | 'stone' | 'box'`) in the same daubs; a prop the creature acts on can move
  (`at: t => [x, y]`, `rot: t => a`).

## The study (fixed)
After the action both panels hold (the after keeps breathing). Faint ghosts of the creature at even times, then the
paths of 2–4 points draw on with a dot every 1/12 s: in the before the dots are evenly spaced on straight lines with
corners; in the after they bunch at the eases and run on curves. That frame is the lesson in one picture.
