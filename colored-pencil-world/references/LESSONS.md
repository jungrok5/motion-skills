# LESSONS — what went wrong, why, and the fix

**The page**
- The paper came out tan and every colour dull → the paper colour was a `THREE.Color`, converted to linear, then laid
  over a picture already turned to screen colour → it is converted back to sRGB before it goes to the shader
  (`page.js`). Colours that meet the picture after the gamma step are screen colours; colours of things (vertex
  pencils) are linear, as three.js makes them.
- A walker on the paper's unfinished margin fades out with it → the check treats the outer 6 % of the frame as outside
  the picture and warns when head or feet reach it.

**The kit**
- The bridge read as a staircase of loose slabs → its pieces were built along x and turned with `rotateY(ang)`, which
  puts *z* onto the way across: build across in x and along in z, tilt about x, then turn. Plank decks had the same
  quarter-turn mistake. Check a new maker with a still from above and from the side before using it in shots.
- A vine of a few dark stems with round leaves on a cream wall read as sticks with tomatoes → more, flatter, smaller
  leaves spread wider, and a stem pencil close to the wall's.
- Lime crowns at the default size (r = h × 0.32) filled half of every frame on a 15 m quay → give street trees an `r`;
  scale is the first thing to judge on a contact sheet.
- Water mirrored only houses, so the canal walls left a gap in the reflection → anything can declare `fronts`; walls
  and boats do. Reflections are nearest-first, up to 40 fronts.

**The walker**
- A skirt showed the hips through its back → `turned()` profiles must run from the bottom up; top-down turns the faces
  inward and the near half is culled. The cast sheet found it (front views looked fine).
- A beanie covered the eyes, so a shot meant to show the walker's face showed a dark ball → the cap is pushed back off
  the brow with a turned-up band. Score "the face shows from the front" on every cast sheet.

**Shots and checks**
- The eye went through lime trunks and a bench (eye placed 1.7 m to the walker's side, on the tree line) and the walk
  cut across the bridge parapet's end → `check.mjs` reports both by place: move the eye or bend the way so it meets the
  bridge square on.
- The canal walls stopped the walker on the bridge (their colliders are under it) → a collider has a `top`; a walker
  standing higher than it (on a deck) passes over.
- Retiming a way leaves every shot's `walk` numbers stale → after changing the way, print positions along it
  (`W.wayAt(s)` in the console, or a short node script with the same CatmullRom) and rewrite the shots and rules that
  name metres.

**Rendering**
- 1080p frames on the CPU: 1.5–2 s for 2 M vertices, 2.7–4 s for 4 M. The ground grid (321² points) and the paving are
  most of the count; a field of hand-made flowers was 1.3 M on its own — thin crops out and keep them off the way.
- The 20 s example came out 101 MB (40 Mb/s at CRF 22) → the paper's tooth and the flecks are fine noise in every
  pixel, which x264 cannot throw away. `--crf 28`+ for anything shared on the web; MP4s are never committed.
- The full 20 s render took 29 minutes with 3 workers on 4 cores (2.9 s a frame of wall time), not the ~13 the single
  stills suggested: three Chromiums at 4 M vertices each share four cores. Budget from the measured s/frame line.
