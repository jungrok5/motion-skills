# BRIEF — from a topic to a Droste page

Write the project's `BRIEF.md` (from `templates/BRIEF.md`) before any code. A Droste page is a believable surface that
would plausibly carry a picture of itself: a wall with a painting, a box printed with the box, a shelf with a photo of
the shelf, a phone showing its screen, a poster of the poster, a book cover with the book, a shop window with its own
reflection-photo. The topic decides the surface; the style decides everything else (one live page, one window at 1/S,
the map, the fall, the wind).

## Fields
1. **Topic and the self-picture.** One line: what the surface is and why it shows itself. ("The back of a cereal box,
   printed with a picture of the back of the box.")
2. **Window.** `--S` (2.0–2.8; bigger = more of the page around the window, smaller copies), `--cx`, `--cy` (centre as
   fractions; keep it near the centre, 0.4–0.6), frame (`gilt`, `gold`, `oak`, `black`, `print`, your own segments,
   or `none` when the DOM draws a bezel), frame width in U (1.2–4), `windowRadius` in U for a screen.
3. **Content.** Every element, where it sits (relative to the window variables), what it says:
   - one editable line (the title, a brand, a headline, a note) — `[data-hic-edit]`; this is the "every copy changes" moment;
   - 2–8 clickable things and what a click changes in the DOM (bite, repaint, toggle, flip, light) — the first gets `[data-hic-click]`;
   - the counter's home (plaque, starburst, page number, shelf label, clock) and its label;
   - the wind control: a real `<input type=range>` and its name in the topic's voice ("Wind the room", "Twist the box");
   - the hint ("Scroll to fall in"), the sound toggle's words.
   Text is short and legible at copy 2 (half size). Nothing in the window; nothing under the frame.
4. **Regions and materials.** Base surface + each `data-surface` region: `tiles` (size U, grout, bevel, wobble, craze,
   chips, gloss, tint — zellige: small, glossy, strong tint and wobble), `plaster`, `wood` (plank U, dir), `card`
   (fiber, halftone U, varnish), `glass`, `metal`, `flat`. Colours stay in CSS; the shader adds the material.
5. **Light.** 3–6 moods (`amb`, `sun`, `lamp`, `side`) that tell the topic's day: a gallery's noon → golden hour → dusk →
   night under the picture lamp; a kitchen's morning → noon → evening; a phone's bright → dim → night mode. Panes or not,
   a lamp or not, key direction, shadow strength.
6. **Glow, seam, ripple.** The colour far copies melt into; the seam style (`crease` for paper / plaster, `bead` for a
   mended ceramic or a metal inlay) and colour; the tap ripple colour.
7. **Sound.** Preset (`ceramic`, `glass`, `wood`, `card`) or your own modes; which note each clickable plays.
8. **Rest pose.** `fall.rest` (−0.4…0, how far out the camera sits) and `wind.rest` (0, 1 or 2), `spin` (rotates the
   spiral; try 0.4–1.2 for a composition where the editable line reads at rest).
9. **Phone.** The portrait layout: what folds away, what moves beside or under the window.

## Choosing
- The copy is the page, so the page must read at a glance when small: a strong silhouette (the logo slab, the frame, a
  band of colour at the foot) makes copies 3–4 recognisable.
- Put the editable line where the rest pose shows it large (above the window works for any spin).
- Keep the colours light enough that a dusk mood does not turn the page to mud (the check fails a murky rest pose).
- Clickables spread around the window so a click at depth 2 is easy to find.

## Still review (score every still; any "no" is a fix)
1. Does the window read as a picture of this page (same layout, same colours), and are at least three copies recognisable?
2. Is the editable line legible in the outer two copies at the rest pose?
3. Does each copy's counter show its own number, in the right ink, centred in its home?
4. Does each copy hang in a different light, and is the darkest still readable?
5. Is anything cut by the frame or hidden in the window? Is anything off the page at phone width?
6. At wind 0, does the page look composed (centred, balanced, nothing cramped)? At wind 1–2, is the spiral clear?
7. At a half wind, is the seam a deliberate line in the topic's material, not a glitch?
8. Do the materials read (tile glaze and grout, plaster tooth, wood grain, printed dots) up close, and melt to light far in?
9. Does the fallback (`#fallback`) read as an ordinary page in the topic?
