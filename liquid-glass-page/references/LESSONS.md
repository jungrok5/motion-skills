# Lessons (problem → cause → fix)

- **Screenshots of the source hung in headless Chromium.** Its `onpaint` asked for a new paint every paint, so the page
  never went idle. → Drive frames from `S.loop` (requestAnimationFrame) and upload only in `onPaint`.
- **Software GL draws < 1 frame a second at 1280 × 800.** Timing checks in real time failed ("the big drop is still moving"),
  because the simulation clock (dt capped at 50 ms) runs far behind the wall clock. → Count settling in simulated time:
  freeze, step with `L.run(6)`, read `L.state()`. Real GPUs run the same page at full rate.
- **After `S.probe()` the page was left shifted.** The probe places the page so a target sits at the canvas centre and does
  not put it back; in CSS mode a layout click then missed. → Call `S.place(page, identity)` right after the probe resolves.
- **Measuring elements with `getBoundingClientRect` broke under the lens.** In CSS hit-test mode the page carries the lens
  transform. → Measure by offsets (`L.boxOf`), which needs `#page { position: relative }`.
- **Clicks under the big drop landed on the layout position** (the source leaves the DOM where layout put it). → The lens is
  an exact mapping (`toPage`, the same formula as the shader) and the page is placed with `S.placeLocal` while the pointer is
  inside it; `__hic.screenOf` inverts it, and the check clicks a button through the drop.
- **The big water drop had a cyan cast and a grey halo.** Absorption grew with the drop's 60–70 px height and red went first;
  the shadow used a field threshold band, which is wide for a big kernel. → Water density .15, depth saturates
  (`d / (1 + .05 d)`), and the shadow band is measured in px with the field gradient (`(T − f) / |∇f|`).
- **Honey went flat orange-red in the big dollop, and pale white in thin ribbons.** Beer–Lambert alone over-darkens thick
  parts and leaves thin parts colourless. → Saturating depth, plus `body` (a fixed share of the tint at any thickness).
- **The drizzle broke into pearls.** Kernels spaced 11 px with 4.5 px radius just miss the threshold between them. → Space
  ribbon beads under ~1.2 × radius (96 beads across the drizzle).
- **Stills must not depend on screenshot timing.** → `#still=s` simulates s seconds in fixed steps once, then freezes; acts
  in `still.mjs` advance the frozen page with `L.run(n)`. Two loads give a diff of 0.000.
- **No clock on the page.** The source shows the time; a clock makes every still different. Leave dates and times out.
- **The water page drew at 0.7 fps in software GL, the honey page at 3.3.** Ripples spread over the whole page, so nearly
  every pixel took the 5-wavelength refraction loop. → Only beads and the lens take the loop; ripple-only pixels take one
  sample with the ripple offset (dispersion there is invisible anyway).
- **Screenshots timed out when several headless checks ran at once** (each frame costs seconds of CPU in software GL).
  → Run checks one after another; on a loaded machine expect low fps numbers, which are not failures.
- **A mercury big drop magnified the page like a dark glass lens.** A mirror shows no page through it. → The lens pull is
  multiplied by `1 − metal`; the mercury dome reflects the room and the paper around it instead.
- **On a phone the drip ribbons ran through the headline.** → The example sends one drip down the right margin and seeds
  fewer beads under 700 px; check phone stills (`--size 390x844`) for every topic.
