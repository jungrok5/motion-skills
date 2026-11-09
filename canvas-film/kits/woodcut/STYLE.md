# 목판화 (relief woodcut)

Kit: `kit.js` → vendored as `scenes/kit-woodcut.js`, global `window.Woodcut`. Source: one-scroll-bible
`motion/films/messiah/kit-woodcut.js` (「메시아 예언과 성탄」, round 1, 2026-11-02). The drawing code is the film's file unchanged;
only the header gained the kit line. It depends on nothing but `lib.js` (`Pilot`). The craft follows the Lemo-Opuscar
`woodcut` brief and the wordless woodcut novels (Masereel, Ward). We copied no code or plates from them.

In that film it drew part 1 (0:00–0:21): Bethlehem carved on a block under the moon, while the narration read Micah 5:2.
- The moon is cut with the U-gouge.
- Stars are stab cuts, and some appear in the first seconds, as if the block were still being finished.
- The ridge and the terraced village hill are contour cuts.
- Olive trees are black crowns with a knife halo.
- The house windows are cut on screen.
- The gold plate shows only through the cuts: lamplight in the windows, then at "베들레헴" the whole town warms.
- The camera pushes in slowly, and at 15.4 s the brayer rolls fresh ink over the block.

The plan was to come back to the same block in part 5 and print it. No remark was made against the woodcut itself. It went
out with the whole round-1 pilot (commit `4323bb0`) when the maintainer turned the channel to cinema
(`023981b`: "너무 일러스트 느낌은 가벼워 보여 … 이 채널에서 만드는 영상은 전부 지금 방향으로"). The opening became a 3-D night flight down
to Bethlehem (`world3d`). The film no longer loads this file.

Related earlier use: the first film's exile scene (`motion/pilot/exile.html`, STYLE-INDEX row `exile`) is a woodcut novel in
four plates with gold printed on carved white at the end. It has its own knife code (`cutP`) and is not this kit. It is the
reason a woodcut belongs in the channel's palette of materials.

Template: `template.html` is a different subject, a sower at sunrise.
1. The block starts black. The knife cuts the sun first, then the sky ray by ray outward from the sun, then the furrows from the horizon toward us.
2. Gold prints through the cuts at dawn.
3. A small sower walks the field casting seed, shown as white chips.
4. The brayer inks the block over before the end card.

## What it looks like
- **Wood and paper:** black is the wood left standing (it takes ink); white is what the knife cut away (the paper shows). Light is *carved*: bright = many wide cuts, dark = untouched wood.
- **Cuts follow the form:** rays from the sun, furrows to the vanishing point, contours along a hill, horizontal strokes in a disc. The direction of the cuts is the drawing.
- **Each cut is one stroke of a tool:** a blunt entry, a swell, a tapered exit, chipped edges. The tools are `v` (gouge), `u` (round gouge), `k` (knife line) and `stab`. None of them looks like a machine line.
- **The wood is mottled.** The ink is mottled with wood grain and a few specks where it did not take, on warm laid paper.
- **Gold:** at most one colour plate. It is multiplied under the ink, so it shows **only through the cuts**. Use it for the one thing that is promised.
- **Carving on screen:** any cut with a `t0` is carved on screen, growing over `dur` seconds. That is the look's own move: the picture appears because someone cuts it.
- **Camera:** the plate is kept at 1.25× resolution, so the camera can push in about 10 % without the cuts going soft.
- **Brayer:** `brayer()` rolls a wet black across the frame. Use it as a transition, an ending, or "the block is inked for printing".

## Meanings it carries
**Well:**
- Something cut in advance: a promise, a prophecy, a name written long before. The block is carved before it is printed.
- Light breaking out of darkness: dawn, a lamp, a star. The light literally appears where the wood is removed.
- Hard times told plainly: exile, labour, a city under judgement. Masereel's black masses carry weight without showing violence.
- One small figure against a big lit sky.
- A change of material between scenes. The first film's mix of materials (map, manuscript, woodcut, stained glass) is the bar for a film that is not "the same look for three minutes".

**Badly:**
- Faces and small detail. Anything under ~10 px is lost in the cuts, so draw people as clear silhouettes against carved light.
- Colour stories. There is one plate only.
- Moving the plate. The cuts are built once, so things that move (people, seeds) must be drawn as ink over the print each frame, as in the template's sower. Keep them silhouettes that read against cut areas.
- Words. The cuts show through glyph counters. Put words on uncut wood (the template's ground below `ground`), never over carving.

**The channel rule (`cinematic`, `portrait-first`).** The woodcut fits the rule when it is used for light and depth:
- a real light source the cuts radiate from (rule 5: "재료 질감(먹·유화·목판)도 빛과 깊이로 쓴다");
- a slow camera push;
- a small figure in a wide lit world;
- lots of uncut black, which is restraint.

It stops fitting when it turns into a flat graphic: an evenly hatched poster with no light source, a printed title, a diagram.
In portrait, put the horizon around 45 % and keep the lower third uncut for the words, as the template does. That keeps the
bottom 25 % (app buttons) free of anything that matters.

## Palette
| role | value |
|---|---|
| ink (wood) | `Woodcut.INK` `#16120e`, mottled with grain |
| paper (cut) | `Woodcut.PAPER` `#ebe1c9` warm laid paper, chain lines |
| gold plate | `[233,185,92]` as radial gradients in `pl.gold`, multiplied under the ink |
| words | cream `#efe6d2` on uncut wood, no shadow needed |

## API (`const Woodcut = window.Woodcut`)
- `const pl = Woodcut.plate(seed, build)`: builds the plate once, in frame units (`Pilot.W × Pilot.H`). `build(pl)` adds:
  - `pl.region(id, g => path)`: regions, painted back to front (`id` 1–255). Read them back with `pl.reg(x, y)`.
  - `pl.cut(pts, w, { kind: 'v'|'u'|'k'|'stab', t0, dur, chip })`: one tool stroke. `w` is a width or an array of widths per point.
  - `pl.hatch(lines, { keep(x, y), tone(x, y) → 0 dark … 1 bright, thr, wmin, wmax, gamma, len: [a, b], gap: [a, b], step, kind, t0(x, y, rnd), dur, chip })` walks each polyline and lays cuts whose width follows the tone. A cut breaks at random lengths, one gouge stroke each.
  - `pl.stabs([[x, y, r]], { t0 })`: short stab cuts, used for stars, leaves and clods.
  - `pl.halo(pts, { w, t0, dur })`: a broken white knife line just outside a silhouette, so black reads against black.
  - `pl.gold((g, t) => …)`: draw the colour plate each frame in frame units. It shows only through the cuts.
- `pl.render(ctx, t, { x, y, z })` draws the print with plate point (x, y) at the frame centre and zoom `z`. Untimed cuts are baked in once. Timed cuts are re-cut every frame up to their progress.
- `Woodcut.brayer(ctx, k, x0 = 0)` rolls fresh ink across the frame, left to right, with `k` from 0 to 1.
- `Woodcut.INK`, `Woodcut.PAPER`, `Woodcut.RES` (1.25), `Woodcut.resample(pts, step)`.

## Performance
- The plate is built once (paper, wood texture and regions at 1.25× frame size).
- Every **timed** cut is re-cut on every frame, even after it has finished. The template carves almost everything on screen and costs about 120 ms per portrait frame and 170 ms per landscape frame in headless Chromium.
- For a long scene, carve on screen only what the story needs and leave the rest untimed (baked once).

## Checks (what went wrong on the way)
- **A dark hill behind the walking figure hid it** (template, first try). Figures must stand against carved light: put them on the horizon under the sun, or give them a halo.
- **A hard edge where the cuts stop above the word area.** Fade the tone to zero over ~90 px before `ground`, with a little wobble, so the carving thins out like a real block.
- **A black notch under the sun at the vanishing point.** The furrow lines start a few px below the horizon. Fill it with short horizontal glare cuts.
- **Too many rays read as busy.** Let the tone fall off with distance (`exp(-d / ~500)`) and raise `thr`, so the top of the frame stays mostly wood.
- **The film's plan:** carve the block in one part, print it in another. That is a strong structural idea for a film: the same block, first cut, later inked and printed.
