# LESSONS — what went wrong while building this skill, and the fix

Problem → cause → fix. All of these happened on the worked example (`examples/aperture`).

## Lens and focus
- **Macro shot where nothing was sharp** → f/2.8 on a 100 mm lens is a 36 mm hole; at 9 cm that leaves a fraction of a
  millimetre in focus → at real scale macro wants **f/8-f/16**. `check.py` warns when `focal/N` is more than a fifth of
  the focus distance.
- **A top-down camera that spun between frames** → a look-at that points straight along its own up axis has no stable
  roll; hand-held noise picked a new one every frame → `s.shoot` takes `up=(x, y, z)`; the bake warns when it is needed.
- **The bokeh behind the iris was one shapeless blob** → sixteen small emitters clustered on the view line merged; a
  square panel also gives a square disc → **3-7 emitters, well apart, spheres not planes**, the largest one round.
- **Sparkling specks inside the title's background** → tiny, very bright emitters far out of focus need hundreds of
  samples → remove them or make them larger and dimmer; keep small practicals within ~0.1 m of the focus plane.
- **A title lost in the middle** → the bright hole of the iris sat directly behind the letters → keep what is behind
  the word darker and cooler than the word; push practicals to the sides.

## Light and exposure
- **First render white** → a 1.6 W strip 13 cm from a 4 cm part is a searchlight → watts scale with distance²: a macro
  set runs on 0.03-0.3 W, a tabletop on 3-10 W (table in SHOTS.md).
- **The set dissolved into blue-grey fog** → haze at 0.35 per metre → **0.01-0.02** for a 3 m studio, **~0.001** for
  a kilometre of sea air. Give the top light a `spread` so it lights the subject, not the air.
- **The physical sky burnt everything out** → it is in real units → `light.sky(strength=0.06-0.12)`.
- **Black leather photographed mid-grey** → a broad specular lobe under a long softbox → lower `spec` (0.2) and raise
  roughness; judge blacks next to the practicals, not alone.
- **Lens elements rendered black** → six elements are twelve refracting surfaces → `transmission_bounces = 12`
  (set in `pf.scene.setup`).

## Surfaces
- **Brass looked like crumpled gold foil** → the wear / tarnish mask was sized for metre-scale objects, so a 3 cm part
  showed three big blotches → every recipe takes `scale` (30-60 for a macro); keep `wear` ≤ 0.15 on polished parts.
- **Satin chrome looked like clouds** → same cause, plus roughness swinging too far → `_rough` narrows the swing; the
  engraved rings use `wear=0.08`.
- **Engraved numbers overlapped and were stretched** → the strip image had more pixels per millimetre across than round
  the part → make the strip with one px/mm both ways (`strip(r_mm, band_mm)` in the example) and space marks in degrees.
- **Will the engraving read mirrored?** On a cylinder seen from outside, text runs with increasing angle; on a flat
  face seen from the front it must run the other way → `mat.engraved` handles both wraps and has `flip`.
- **Light leaked between the iris blades when stopped down** → narrow blades leave gaps once they turn past ~30° →
  sample the opening numerically (does every point inside the housing lie under some blade?), widen the blades, and
  clamp the smallest opening (`R_MIN`). A mechanism has to work, not only look right open.

- **Grey faces inside every notch and screw slot** → a boolean gives the cut faces the *cutter's* material slot, and the
  cutter had none; in a dark macro nobody saw it, `check.py` did ("meshes without a material") — after the film was
  rendered → `geo.boolean` now hands cut faces the part's own material. **Run `check.py` on the real project before
  the long render, not only on the starter.**

## Blender 5.x from Python
- `pip install bpy` gives Blender as a module, one wheel per Python version (bpy 5.2 → Python 3.13, ~400 MB). When pip
  crawls, fetch the wheel with ranged `curl` requests and `pip install` the file.
- `Action.fcurves` is gone (layered actions) → the library never touches curves: `Shot.animate` evaluates your function
  on every frame and inserts **linear** keys (`keyframe_new_interpolation_type = 'LINEAR'`), frames 0..n+1 so motion blur
  has a neighbour on both sides.
- `scene.node_tree` (compositor) is gone and the module has no OpenImageIO → the look is made in numpy
  (`pf.finish`) from linear EXRs read by a small pure-Python reader (`pf.exr`: scanline ZIP only).
- Enum lists read through `bl_rna` are empty in the module; trust `dir()` and try/except instead.
- Rendering the same frame twice on the CPU gives the same pixels (max difference 0.0000 in `check.py`), as long as the
  seed is derived from the frame and nothing in a shot uses unseeded randomness.

## Time
- 4 CPU cores, no GPU: 1920×804 at 64 samples took 47 s a frame; previews at half size and 24 samples take 5-10 s.
  The 432-frame example was rendered at 0.75 scale and 26 samples (14-40 s a frame, about 2.5 hours) and enlarged in
  `finish.py`; grain is added after the enlargement so it stays fine. With a GPU render at `--q final`.
- Glass close-ups and volumes are the expensive shots (2-3× the rest). Keep them short.
- The look is not baked into the render: changing grade, grain, bars or fades means `finish.py` (seconds per frame),
  not `render.py`.
- Start the full render in the background and write everything else while it runs; `render.py` resumes, so a killed
  render loses one frame.
- **The render died silently at the sixth shot** → a library function gained an argument while the render was running;
  the long-lived process still held the old library, the next shot's script was read fresh from disk and called the new
  signature → `render.py` now runs **one process per shot** (a failing shot is reported and the others continue), and
  the rule is: watch `out/render.log` reach each new shot, do not assume.

## Story
- The print on the desk carried the grade twice (a finished frame, photographed again) → light it mostly by the desk
  lamp with a little emission (0.35), and put a 3-5 frame white flash on the cut: the eye reads it as the shutter.
- Blank white sheets under the hero print pulled the eye → they became two other frames of the same film.
