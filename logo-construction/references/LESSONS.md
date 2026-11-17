# LESSONS — problems met building this skill, and their fixes

- **Cursor whipped 900 px between lines** → each line was drawn bottom-to-top, so the hand flew back to the bottom
  every time → draw from the end nearer the cursor, and give every move a travel time from its distance (~1,900 px/s).
  `check.mjs` measures the fastest step.
- **Long lines pulled out in 0.3 s** (a 1,000 px swipe in nine frames) → drag time scales with the line's on-screen
  length (up to 0.7 s).
- **Cursor flew off with the art while the camera zoomed** → cursor keys are placed with the camera at their own
  time (a zoom moves the art, not the hand); only during a drag does the cursor follow the art.
- **Camera panned during a corner drag** → the next group's pan started before the previous drag ended → each pan
  waits for the release; the refine act grows if it must.
- **Guides ran off the frame and so did the cursor** after the mark was framed larger → guides are clipped to the
  visible frame (inset 60 px) as well as to the mark's margin.
- **Construction took 30 s** for 36 guides drawn one by one → put parallels in families (copied in ~0.4 s, as in the
  source) and plan twice so the act fits its target time.
- **Same frame, different pixels** (mockups and fills) → Chrome moves canvases between GPU and CPU rasterisers, which
  anti-alias differently, and a mockup with soft transparent edges let the previous frame show through → every
  canvas is created `willReadFrequently` (software, exact) and every frame starts by clearing to black.
- **The fox's eye was a notch, not a hole** → the circle touched the muzzle line; at 512 px it had one pixel of ink →
  `check.mjs` counts holes at 512 / 48 / 32 / 24 px; keep ~2 % of the mark's width of ink round a cut.
- **The first fox read as a long-necked dog** → neck too long, tail too thin; a shorter neck, a bushy tail with a gap
  for the white tip, ears whose back edge is the nape slant. Judge the 128 px copy on the mark sheet, not the 1000 px one.
- **Too many directions** made the first grid look accidental → `parallel()` and mirrored pairs; `check.mjs` warns
  above six directions.
- **Refine zoom cropped the tail off-frame** → the camera fits the whole group (width and height), zoom 1.1–2.
