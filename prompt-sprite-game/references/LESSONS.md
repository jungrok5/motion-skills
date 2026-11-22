# Lessons

Problem → cause → fix, one or two lines each. Add to it whenever a game teaches you something.

- **The top of every walker rocked ±3 px on each hop** → the lean was a spring kicked by the hop's acceleration, and
  the hop cycle (12–13 frames) sat right on the spring's period, so it resonated. → The lean now follows the body's
  *mean* velocity through a first-order lag, and only that drives the spring: it trails on setting off and overshoots on
  stopping, and stays still in a steady run.
- **Hops still jerked the lean** → the hop moved at a constant speed and stopped dead. → Ease the hop's speed with a
  half sine (zero at take-off and touch-down, fastest at the top); the distance per hop is unchanged.
- **A small sprite's idle looked frozen** → breathing as a fixed 3.5 % of height is 0.4 px on a 12 px crab: it rounds
  away. → Breath amplitude is at least 0.9 px of the sprite's own height, so every idle crosses a pixel.
- **A flyer stood dead still at rest** → bobbing was set per enemy kind, not in the body. → Flyers bob in `Body.pose`.
- **Landing went to 52 % height** → the landing kick was too strong for a light body. → Kick by impact, and make the
  squash spring mass-dependent (heavy sinks deeper and settles slower).
- **The turn showed an empty frame** → the edge-on frame of the flip drew nothing. → Draw at least a 2 px sliver.
- **The first plank was out of reach** → a one-way plank 3 tiles above the ground is 48 px; the jump apex is 46. →
  check.mjs's reach test caught it; planks go 2 tiles up.
- **Falling into water cost two lives** → the water hurt on touch, then the fall below the map hurt again. → Water is a
  `pit`: one life, back to the last safe footing (remembered every 20 frames while standing still on solid ground).
- **On a phone the game was 320 px wide and the title card overflowed it** → a whole-number scale below 2× wastes the
  screen; an overlay inside a 192 px tall canvas cannot hold the card. → Fractional scale under 2×, the card covers
  the viewport on narrow / portrait screens, and the touch pad sits under the picture.
- **The HF Hub serves tessera.js as text/plain** → a module import refuses it. → Fetch the text and import a Blob URL.
- **Running the model repo's Python sampler is not the path to take here** → it runs a downloaded script outside the
  browser. → Preview prompts with `scripts/paint.mjs`, which runs the same browser runtime the players run.
- **The cat painter got worse after step 3,500 of 8,000** → 5,775 sprites are few; validation loss bottomed at 2.18 and
  rose while training loss kept falling, and the samples turned noisier and drifted off-prompt (persian → orange). →
  Keep `ckpt-best.pt` by validation loss and stop there; more steps only memorise.
- **A themed painter cannot be told which way a side view faces** → `train.py` mirrors half the sprites, so left and
  right are the same to it. → `front-view` prompts (and `faces: "front"`) for members that turn, or choose a seed by eye.
- **"orange tabby cat" painted brown tabbies** → in the atlas "tabby" mostly means brown; the colour word loses to the
  breed word. → Prompt with the word the data uses for the look you want ("ginger cat").
- **"Fewer lone pixels = cleaner" was wrong** → real pixel art has ~46 single-pixel details per sprite (eyes, highlights);
  a low temperature (0.7) looked tidy but scored further from real (FD 65 → 70). → Measure against the real sprites'
  own rates (`eval.py`), and tell detail (lone) from stray off-colour pixels (speck).
- **FD rewards noise** → a higher temperature lowered FD while adding visible specks. → Look at the sheets too; nucleus
  (top-p 0.8) plus a despeckle pass keeps the detail and removes the strays.
- **Tessera's tricks and pre-training did not help a 3 M model on one CPU** → self-conditioning, blob masks, perceptual
  smoothing (v2) and animal pre-training each scored worse or equal on samples, though pre-training improved NLL. →
  Keep v1; these are worth retrying with a larger model on a GPU.
- **The despeckle pass took black cats' eyes** → a side view's single eye is a colour used once and far from all its
  neighbours — exactly a "speck". The metrics improved while the sprites got worse. → No colour-speck removal in the
  top 45 % of the body (floating pixels are still removed everywhere); compare-painters.mjs on black / tuxedo / russian
  blue cats is the check.
