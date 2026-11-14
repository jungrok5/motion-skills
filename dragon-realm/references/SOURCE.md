# SOURCE — what this skill was made from

- The film: 赤龍 · Crimson Loong by Chetaslua — https://github.com/ChetasLua/crimson-loong (live:
  https://chetaslua.github.io/crimson-loong/), shared at
  https://x.com/chetaslua/status/2121176151234330707?a=fPtJuQnZ47fP-u87Nkc&s=19 ("Fable 5.2 can achieve this with
  @threejs — no external assets at all"). 90 seconds, one HTML file, three.js r180 inlined: a red loong coiled on a karst
  spire above red maples and vermilion halls, a white loong out of a storm cloud, a fight across the sky, a plunge into
  the lake, both rising after a pearl; then it loops.
- **Licence.** The repository has no licence file (only three.js's). Its code is therefore not ours to copy, and none of
  it is in this skill. The source files were read for *method* — what is built, in what order, with which numbers, and
  which mistakes its comments record — and the engine here was written from scratch.

## What was learned from it (methods, kept)
| in the source | here |
|---|---|
| every picture is a pure function of film time; memory lives in tables built at load | the law of the skill (`check.mjs` proves it) |
| one rail through the film; ring `a` sits where the head was `a` metres ago; time → distance by a monotone cubic | `DR.creature` (`DR.path`, `DR.mono`) |
| roll as a field fixed to the rail, so loops roll instead of flipping | the `up` table in `60_creature.js` |
| scales as an analytic lattice in the fragment shader, faded by pixel footprint | `drScale` + the footprint terms |
| the head sculpted from signed-distance shapes and meshed with surface nets | `DR.sd`, `DR.meshSDF`, `DR.dragon` |
| rock from parametric surfaces displaced by a jointed block field (columns cut into beds) | `DR.land.blocks`, `DR.land.peak` |
| built-in materials patched (`onBeforeCompile`) with shared air, sun share and wind; uniforms shared by reference | `DR.mat`, `DR.U` |
| fog as two media: a mist with a scale height + thin air, each with a forward phase | `drAir` |
| a planar mirror for the lake, depth colour from a bed map, ring events as closed forms | `DR.water` |
| waterfalls laid out in fall time | `DR.falls` |
| foliage as spray quads on painted atlases, crown normals, back-light added by hand | `DR.flora` |
| buildings written into a few big buffers; roof height and corner lift as formulas; tiles as geometry | `DR.arch` |
| effects as instanced quads with closed-form flights, premultiplied blending | `DR.fx.sprites` |
| the score rendered off-line in a worker from the beat sheet; a capture hook that renders frame n | `DR.score`, `window.film.renderAt` |

## What is different here (by design)
- **Air.** The source bakes ray-marched cumulus into four whole-sky layers at load (about 300 MB) and composites them.
  Here clouds and valley mist are marched every frame at a third of the size *to the depth of the picture*, so peaks and
  the creature pass through them, a storm can gather continuously, and a tear in the deck lets a pool of light fall on
  the lake. Cheaper to hold, dearer per frame.
- **Body.** The source rewrites vertex buffers on the CPU; here ring centres and frames go into a small float texture
  and the tube, fins, hair and limbs read it in the vertex shader. A transformation front travels down the body.
- **Film.** The source is one continuous take; here shots are cut (17 in the example) and the key light can change on a cut.
- **Skill.** The source is one film. Here the world, the creature, the buildings, the plants and the score are kits with
  parameters, and a second culture (Korea) and a third topic (the starter) were built from them.

## What is not taken
The source's story and designs: the red and the white loong, their duel, fire and frost breath, the karst valley, its gate
and halls, its beat sheet and its music. A film made with this skill tells its own legend.
