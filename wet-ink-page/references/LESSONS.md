# LESSONS — what broke while building this, and the fix

- **The synchronous read-back returned the previous map.** The check's `stroke()` reported 0 px of movement and
  `screenOf` found nothing had drifted, though the screen clearly showed the stir. Cause: the async read-back waits on a
  `fenceSync`, and a WebGL 2 fence never reports itself signalled inside the task that created it (the spec forbids it,
  even after `gl.finish()`), so `clientWaitSync` timed out and the CPU copy stayed stale. → Two paths: the frame loop
  keeps the non-blocking PBO + fence read; the API (`sync`, `screenOf`, stills) does a plain blocking `readPixels` into
  the CPU array.
- **"Still flowing after 8 s" in the check, though a stroke rests in ~2.5 s.** Headless Chromium draws WebGL in software:
  a full-resolution frame of the show shader took about a second, and the loop runs at most two simulation steps per
  frame, so simulated time crawled. → The check measures rest and rewind in simulation steps (`I.run(n)`), not wall time,
  and runs its live part at `#q=0.5` (half-size canvas, full-size page texture). A full check is still several minutes.
- **`S.probe` leaves the page where it put it.** After probing the hit-test mode, the page stayed shifted by the probe's
  offset until the pointer moved, so the first click could miss. → Right after `S.probe` resolves, `S.place(page,
  identity)`; afterwards placement only follows the pointer (or the map read-back).
- **Combed threads turned into moiré.** A drop with rings, pulled through by a whisk, showed rows of glittering stripes:
  the tone lines (`cos` of the ribbon's ramp) were finer than a pixel once the ramp was folded and stretched. → Fade the
  threads out where `fwidth` of the ramp is large (`resolved`): lines only where the ramp is resolved.
- **A drop had no presence.** Laid at full size, a drop just sat on the print. Real floated colour pushes what is already
  there aside. → Lay it at ~40 % of its size, then bloom it with an area-preserving radial push of the map (r → √(r² − R²),
  softened near the centre so the map never folds), over ~0.5 s with an ease-out. The print opens round it and a drop
  inside a drop makes a bullseye — the whole latte-art vocabulary for free.
- **Milk was invisible.** A white pigment on light paper vanished in the absorbance model (it can only darken). → Ribbons
  are composited as a colour with `cover` (opacity of the floated colour) over what lies beneath, so milk / chalk work.
- **Bowls covered the menu, the band floated off the headline.** Absolutely positioned decorations sized in `vw` collided
  with the content at other window shapes (the hibiscus bowl over the Pour buttons at 1280, the vermilion disc over the
  pigment chips at 390). → Decorations live inside the head block with a reserved `padding-right` on phones, the colour
  band is in the flow under the subtitle, and the review stills include 390 × 844 every time.
- **Where two pigments met, the edge was aliased.** Choosing the colour with the highest ramp switches abruptly where two
  ramps are equal. → A hairline seam of paper where the top two ramps are close: anti-aliased and true to marbling,
  where floated colours never mix.
