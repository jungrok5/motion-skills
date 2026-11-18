# LESSONS — problem → cause → fix

- **The whole flock flew to the top-left corner of the screen.** → The lead-bird texture read as zeros: it was uploaded
  with `UNPACK_PREMULTIPLY_ALPHA_WEBGL` still on (set for the DOM upload), which makes a Float32Array `texSubImage2D`
  fail silently. → Turn premultiply off around float uploads, back on for the page.
- **The sky was upside down** (sun at the top, gradient flipped). → The sky texture was painted with a top-down `y` but
  sampled with the same top-down coordinate, while texture rows run bottom-up. → Flip `y` when sampling the sky.
- **Thin rules and hairlines stayed on the page when it flew** (dotted lines left in the sky). → A grain sampled the ink
  only at its cell centre, so a 1 px rule between centres had no grain. → Take the strongest of five taps across the cell.
- **A turn did not travel.** → With plain averaging over 7 neighbours, one turning bird moves each neighbour by 1/7 of its
  turn, below what reads as following, and separation forces (scaled ×3) drowned alignment. → Weight neighbours that
  are turning (salience = 1 + 5 × turn rate) and cut separation; the probe now measures arrivals against a twin flock
  that was not disturbed.
- **The ripple probe was flaky.** → The turned bird was "the rightmost", often pinned to a wall. → Turn the bird at the
  front of the flock; pass when the turn reaches beyond the first bird's neighbours and spreads over > 0.3 s.
- **The turn-rate check reported 35 rad/s.** → It measured the 2D screen heading, which spins when a bird flies along the
  view axis. → Measure the 3D angle between successive velocities.
- **No bird ever glided.** → The flap amount added "climbing" and "slow" terms that were almost always positive. → Glide
  spells are a per-bird on/off rhythm (`glide` sets the share); only a steep climb forces flapping.
- **Landing looked like a jelly wobble** (8–9 px dip). → The settle spring was too loose. → k 260, ζ 0.74, entered 7 px
  from home: a 2–6 px dip that reads as weight.
- **Checks timed out on software GL.** → 1M grains and full-resolution drawing per screenshot. → ~90k grains by default,
  `#q=0.5` for checks, `#nointro`, and every flight check steps simulated time (`__swarm.manual/advance`), never waits.
- **Stills of flight were never the same twice.** → Real-time stepping depends on frame rate. → `still.mjs` steps
  simulated time at 1/30 s from a fixed seed.
- **`S.probe()` left the page at its probe offset**, so clicks missed. → Place `#page` and `#scene` at identity right
  after the probe resolves.
- **The intro collided with the shared checks.** → The intro flies the headline while `run()` clicks it. → The intro is
  scoped to one element and a click recalls it anyway; checks still pass `#nointro`.
- **Read-back:** `fenceSync` never resolves in the same task in this WebGL2 build; the hook uses a plain `readPixels`
  (RGBA/FLOAT) on a temporary framebuffer.
