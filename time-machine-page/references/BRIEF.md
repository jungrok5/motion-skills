# Topic → brief

Every time-machine page starts as `BRIEF.md` (copy `templates/BRIEF.md`). The style is fixed — one live page, a dial,
eras drawn through shader passes, the dive between them — and everything the topic touches is designed new.

## 1. The page
- **Pick the document the topic would really be.** A town's news is a front page; a bakery's is a recipe card or a price
  list; a band's is a gig poster; a school's is a timetable; a product's is a spec sheet. It must exist in every era you
  choose (a recipe exists as a woodcut broadside, a ditto handout, a home page and a kitchen hologram).
- **Slots, not prose.** List its parts as `data-slot`s: masthead, dateline, headline, picture, body, facts, a list, a
  log. Every era fills the same slots with its own wording; the DOM never changes, only CSS and text.
- **Something to do.** Always: an editable headline (`contenteditable`, `data-hic-edit`) and the log (input + button).
  Add one control that belongs to the topic and does something visible in every era: a loaves field that rescales the
  ingredients, a guests field that totals a bill, a date that recomputes a countdown. It is ordinary page script listening to
  `tm.on('era', …)` and its own `input` event.
- **One picture, drawn once.** An inline SVG with shapes classed by role (`sky`, `stone`, `dark`, `lit`, …). Each era
  colours the roles through CSS variables or restyles them (strokes only for a vector terminal or a hologram). For an era
  that screens pictures (halftone, woodcut), colour the picture in warm, muted tones: `toneOf()` screens those and leaves
  neutral black type and strong colours (a red rubric) solid.

## 2. The eras
- **3–5 eras that tell the topic's own history.** Ask "how did people meet this document in year X?" and pick years where
  the answer is a different medium: printed, projected, photocopied, broadcast, on a screen, in the air. Spread them; two
  neighbours must never share a material. Do not reach for the template's 1904 / 1937 / 1979 unless the topic is a town's
  news.
- **Tell the story as that era would.** Wording, units and voice change: "Take of fine flour one pound" → "3 cups
  all-purpose flour" → "400 g bread flour". Facts can change with the date (a library lends its millionth book in 1937).
- **Layout per era.** Each era is a full CSS layout of the same DOM: a broadsheet grid, a title card, a monospace
  screen, a 640×480 home page, a light display. Type from system stacks only (Georgia, Times, Courier New, Arial Narrow,
  Impact, system-ui …). Give every era a page size (`page`) and a phone size (`phone`) with a one-column layout under
  `@media (max-width: 520px)`.
- **Passes.** Build each era's look from the passes in references/ENGINE.md: a warp (barrel, weave), the material
  (paper, letterpress, halftone, woodcut, mono, grain, dust, scanlines, mask, bloom, dither, chroma, holo), one surround
  (desk, cinema, monitor, lab) and post (vignette, flicker, grade). Tune the parameters for the topic (paper tint, ink,
  phosphor colour, curtain colour, plastic). If the medium is not there — a spirit duplicator, a cyanotype, a dot-matrix
  printer, a neon sign — **write a pass in the page** (`TimeMachine.pass(…)` before `start`), as the worked example does.
- **Focus.** The point the camera dives into (`focus`, page uv). Put it on the part where the material shows best: the
  halftone picture, a line of big type, a scanline of bright text. Phone layouts need their own `phoneFocus`.
- **Sound.** Each era has a room tone from the recipe fields (a press thump, a projector's 24 Hz clatter, a CRT hum and
  whine, a hologram's pad) and an arrival tone; the dial clicks and the dive whooshes are shared.

## 3. Still review (score every still; any "no" is a fix)
Render: one still per era (`still.mjs --all`, and `--phone --all`), three moments of each journey
(`--travel <from>,0.3`, `0.5`, `0.8`) and one magnified still per era (`--zoom 6,<u>,<v>`).

1. **Readable at rest.** Every headline, body line, fact and the note field can be read at 1280×800 and at 390 px. No text
   is cut off by the era's layout, no empty half-page, nothing overlaps the surround.
2. **One era, one medium.** Would a person name the medium at a glance (newsprint, newsreel, terminal, woodcut, ditto,
   home page, hologram)? Is all of the page in it — picture, type, form fields?
3. **Neighbours differ.** Two eras side by side must differ in material, colour and layout, not only in tint.
4. **The material holds up close.** Magnified ×6, is there structure — dots, cut lines, grain, scanlines, phosphor
   stripes, dither — rather than blur?
5. **The journey reads.** At 0.3 the camera is deep in the first era's material; at 0.5 the material is changing into the
   next; at 0.8 the new era is rising into place. No black frames, no stretched or missing page.
6. **The surround belongs.** Desk, cinema, monitor or lab fits the era, frames the page and never covers it.
7. **Live everywhere.** The note field, button and topic control look like controls of that era and are where they are drawn.
