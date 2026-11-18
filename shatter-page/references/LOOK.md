# LOOK — the form, observed from the source

Observed from the "Shatter" demo (https://claude.ai/artifact/Berg7ureW47JTrMNVoH8TU), opened in headless Chromium with
HTML-in-Canvas on and screenshotted whole, mid-fall, at rest and after a second blow. Notes on what it is and how it
behaves; the code here was written from these notes, not from the demo's code.

## What it looks like
- A pale plaster wall and a light floor in strong window light: the sun comes through a tall window off to one side and
  lays a soft-edged pattern of panes and mullions across the wall. The light is warm, the shadows cool and soft.
- In the middle hangs a sheet of clear, slightly green glass with a page printed on it in one ink colour: a mono status
  bar, a big serif headline, a to-do list of checkboxes, a note field, an ink colour picker, a time slider and a piece count.
- The glass reads as glass before it is touched: a faint tint, a thin bright rim, the print's shadow on the wall behind,
  and now and then a glint of light sliding across the sheet.
- Off the glass: a small hint ("click the glass") bottom left, a link bottom right; after a break the hint becomes "Mend".

## How it behaves
- A click on bare glass throws a small steel ball from the viewer. The pane cracks from the hit: many radial cracks,
  broken ring cracks around a small crushed hole, long daggers outside. The pieces near the hit fly back towards the wall,
  the far daggers tip and drop; tiny bits and dust spray. Slow motion for about half a second after the hit, then real time.
- Pieces are thick enough to show green edges and bright arrises; they refract the room, reflect the window and cast
  coloured shadows. They bounce and clink on the floor, slide, lean on the wall and settle into a pile; the camera follows
  the glass down and ends looking down at the pile. The floor mirrors the glass faintly.
- The page stays live on every piece: the headline can be retyped while it falls, a checkbox ticked on a flying shard,
  the ink picker changes the print colour on all pieces at once. Clicking a resting piece breaks it further.
- The time slider on the glass scrubs the recorded fall back and forth (it is itself on a piece, and it is driven by the
  pointer's horizontal travel so it does not fight the piece moving under it). Letting go resumes from there.
- "Rebuild" / "Mend" rewinds the whole break with a rising reversed sound, the cracks glow shut, and the mended pane keeps
  gold seams (kintsugi) printed where it broke; each mend adds seams and older ones fade.
- The count reads "1 piece" → "196 pieces"; the status word reads Whole / Broken / Held / Rewinding.

## Technique (re-derived here)
- The page is one DOM subtree in a `<canvas layoutsubtree>`; its pixels are uploaded as one texture when they change; every
  shard is a prism with that texture on its faces (page coordinates as UV).
- Fracture in 2D on the pane polygon: rays + ring chords per sector, each piece convex; pieces are rigid bodies (thin
  plates), integrated at a fixed step, colliding with floor and wall only; resting pieces are layered rather than solved.
- A tape of keyframes makes rewind and scrub free; dust follows closed-form arcs from each strike, so it rewinds too.
- Hit testing: the piece under the pointer is found by a ray against every piece; the page element is given that piece's
  projective matrix (`updateElementGeometry` or a CSS `matrix3d`), so the browser's own hit testing lands on the drawn spot.
- Sound: modal synthesis (decaying sines) and noise, rendered into buffers.
