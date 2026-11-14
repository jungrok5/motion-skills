# Look — what makes it read as ink condensing in water

## The two dials (the reference's idea, as numbers)
The reference ("流動性を残す実験 — an experiment in keeping fluidity") fed a generative video model a translucent
reference of the moment just before the form appears, so the picture stays fluid while the shape stays consistent.
Here that becomes two numbers per frame:

- **`e` — emergence** (creature track, film time). `waterState(e, fluid)` in `lib/film.js` maps it:
  | e | what you see | water |
  |---|---|---|
  | 0–.1 | a drop, a few wisps | long trails, strong body warp, smoke only |
  | .2–.4 | **the translucent pre-form**: smoke that traces the outline, a faint body | trails still long, body opacity rising |
  | .5–.7 | a pale body you can read, dark pools, heavy smoke | trails shortening, warp small |
  | .9–1 | dense ink, every detail, edges still shedding smoke | short trails, a residual warp |
  Parts condense in order (`look.sweep`): emission (smoke) rises before density, so the smoke shows the shape first.
- **`fluid`** (shot keys, 0–1, default .5) scales trail length, body warp and smoke at every `e`. 1 for the opening
  wisps and for a dissolve; .45–.7 for most shots; never below ~.3 — the form must never freeze.

## The renderer (lib/water.js) in one paragraph
The painter writes the creature into three channels — R ink density, G coverage, B emission. Pass 1 builds a flow field:
the curl of a slowly evolving 3-octave noise potential in world units (divergence-free, so ink stretches into filaments
instead of blurring) plus a buoyant rise. Pass 2, for every pixel, walks 28 steps upstream along the flow and collects the
ink the form emitted there, broken into strands by noise — tendrils carried away from the body. Pass 3 samples the body
through a small flow warp, multiplies an uneven wash and granulation, darkens the wet edge and the rim, adds the smoke and
stray specks, and lays it over a paper-grey tank with a soft floor and vignette. Ink absorbs blue a little more than red:
thin ink is warm grey, thick ink near-black.

## Rules of thumb
- **Scale to the animal.** `scale` (eddies per metre) ≈ 1.6 and `detail` (texture frequency) ≈ 1 for a 2 m animal; divide
  both by length / 2 m. Velocity grows as 1 / scale, so big eddies move proportionally faster.
- **Rise** .15–.25 in a studio tank, ≤ .1 in open water with a big animal (a big rise makes hairy vertical streaks).
- **Emission**: manes, tails and fins smoke most (`emit` .7–1), flanks a little (.25–.45). The pre-form only shows what emits.
- **Values**: the body's top stays pale (.12–.2), the underside and far legs darker, pools .7–.9, manes .6–.9 with gaps,
  eyes and fangs pure white (density 0 with coverage).
- **Framing**: the painted shapes hold up to about head-and-mane filling half the frame. Tighter, they read as shapes.
- **Cuts**: hard cuts on the stages of the emergence; the creature's track is continuous across them.
