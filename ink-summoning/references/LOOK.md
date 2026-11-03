# The look — what makes it read as the reference

**The room** (`lib/space.js · ROOM`). A long white studio: walls in 2.6 m panels with 16 cm glowing slots between
them, a soft spill of light around each slot, a long ceiling light with cross-beams, a bright recessed doorway in the
far wall. Tones run from `#9aa1a8` (wall shade) to `#d8dbde` (lit wall), lifted by the bloom — high-key, never grey-mud, never pure white
except the light. The floor (`#c9cdd1`) is glossy: the whole world is drawn a second time mirrored in the floor,
blurred 3 px, faded by a Fresnel gradient (strong at the horizon, weak at your feet), at 55 %. That reflection — of the
slots, the figure, every stroke — does more for "3D render" than anything else.

**The ink** (`lib/ink.js · drawRibbon`). A stroke is a 3D ribbon: centre points and, per point, the brush's width axis
(along the staff), so it twists, foreshortens and goes thin edge-on like a real flung ribbon. Drawn as:
1. a dense core polygon over the loaded middle (≈70 % of the width), edges jittered at two frequencies;
2. 64 bristle *hairs* across the full width — each a tapered filled run (never a round-capped line: those read as
   dashes), its own ink load and thickness, broken where a noise in **arc length** (metres, so it looks the same near and
   far) runs dry; outer bristles and the tail dry first and end at different lengths → the split, flying-white tail;
3. a few lighter streaks inside the core and a faint wet sheen;
4. splatter: fine round drops just outside the outer edge behind the head, a few bigger ones, a rare flick.
Defaults: `w` .5–.65 m for big swings, `dry` .3 (wet) … .55 (dry), `splat` .6–1.

**Smoke** (`billow`): many (40–60) small soft sprites, `a` ≈ .4, rising and spreading as they grow — a billow, not a ball.
Dense black only at the birth of a creature, for half a second.

**The summoner** (`lib/summoner.js`). Black (`#101013`) kimono and wide hakama built from tubes with a grey rim light
on the top edges; wide sleeves that hang from the forearm and trail the wrist; long white hair (34 strands) that follows
where the head *was* a moment ago (no simulation — pure lookups of the rig at t − k·45 ms); a bold mask (oni: gilded
eye rings, slashing brows, open fanged grimace, ribbed horns). The brush is a 2.55 m staff with a 0.5 m black tuft that
bends against its motion.

**The creatures** (`lib/beasts.js`). 3D skeletons (spine, IK legs with a gait cycle; a path-following spine for
serpents and birds) painted with `brush()` — the same ribbon renderer, with its width axis turned to face the camera —
in dense black over an opaque base, so the body edges break into dry fur. Form comes from rim streaks along the back,
white negative-space stripes that wrap the flank facing the camera, white eyes (slanted almonds, a dark slit), white
fangs, white whisker pads. They are composited from their own layer: lightened by distance, and while `form` < 1, eaten
by smoke-shaped holes.

**The grade** (`lib/film.js · POST`): contrast 1.06, saturation .35, a cool steel soft-light tint, bloom on the slots,
a light vignette, grain .05. Motion blur: 7 sub-frames over the shot's shutter (`mb`) in render mode.
