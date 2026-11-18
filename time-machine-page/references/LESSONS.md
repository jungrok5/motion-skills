# Lessons — problem → cause → fix

From building this skill (template: the Millbrook library; worked example: the Daily Loaf). Shared HTML-in-Canvas lessons
are in references/HIC.md.

- **The source demo would not screenshot at 1280×800 in headless Chromium** (a 30 s timeout). → Its shaders are long and
  software GL (SwiftShader) is slow. → Looked at it at 640×400. For this engine: one shader per era built only from the
  passes that era uses, `antialias: false`, `#q=0.5` for checks, and static eras draw only when something changed
  (a dirty counter), so the checks run in a few minutes.
- **Clicks in a CRT era landed beside the word under the pointer.** → The barrel warp moves pixels by up to ~10 page px
  at the edges. → Every warp pass carries `toPage` in JS with exactly the GLSL maths; the page is placed with
  `S.placeLocal` at the pointer in warped eras and `__hic.screenOf` inverts the warp by iteration. Checked by typing into
  the note field through every era.
- **A drag of one era on the dial landed two eras on.** → The release projected the flick velocity (0.16 s of it) and a
  quick 1.1-step drag carried on to the next. → Project only `v × 0.08`, clamped to ±0.6 of an era: a flick nudges, it
  never skips. The check drags 1.1 eras and must land on the next one.
- **After `S.probe()` the page stayed at its probe offset** until the pointer moved. → The probe moves the element to the
  canvas centre to test hit testing. → Place it where it is drawn as soon as the probe resolves (`placeShown(true)`).
- **The new era could pop in half-way up the rise** on a slow machine. → Its first upload after the restyle arrives a few
  frames late, and until then the old era's texture was drawn in its place. → The journey holds at the bottom of the dive
  (up to 2.5 s, zoom still creeping) until the new era's texture has been uploaded once.
- **Checks waited forever for journeys.** → Under software GL a frame takes 100+ ms and `dt` is capped at 0.05 s, so a
  2 s journey takes ~5 s of wall time. → `__tm.advance(s)` steps the journey's own clock; checks ride on simulated time.
- **The woodcut era hatched its own red rubrics.** → The picture marker `toneOf` was "red above blue", which a red rubric
  also is. A chroma limit did not help: anti-aliased small red type blends toward white and drops below any threshold. →
  Mark pictures by hue instead: sepia has green between red and blue (`(g − b) / (r − b) > 0.2`), red type has green ≈ blue.
  Rule: pictures to be screened are sepia-like, type is neutral or a strong red.
- **The woodcut title fell to the bottom of the sheet.** → The headline had no `grid-area`, so CSS grid auto-placed it into
  the last free cell. → Every element of the page gets an area in every era's grid; look at an era still after writing
  its CSS, before tuning its passes.
- **The 1979 terminal looked dim and grey.** → `mono` maps luma; the page's grey `#b8b8b8` type became dark green. → Set
  terminal type near white in the CSS, lower `gamma` (0.62) and raise `bloom`: phosphor eras want bright type.
- **The dive went into blank paper on phones.** → The focus point (page uv) was chosen for the desktop layout; the
  one-column phone layout puts different things there. → `phoneFocus` per era.
- **Restyling on resize reset the caret.** → The resize handler re-applied the era (re-filling slots). → Resize only
  changes the page size (`sizePage`); slots are filled only when the era changes.
- **The samples page's demo showed a tall, tiny phone page.** → The phone layout switched on below 641 px, and the demo
  iframe on a desktop page is about 640 px wide. → The phone layout is for ≤ 520 px (`narrow()` and every page's
  `@media (max-width: 520px)` must agree); a 640 px frame gets the desktop layout scaled down.
