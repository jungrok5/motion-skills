# SOURCE — what this skill is made from

**The request.** The owner asked (in this repository) for a walkable world in scanned-realm's quality: a thick forest
grown over the ruins of a fallen civilisation, with giant walking machines roaming it — a long-necked four-legged one
like machine-build-reel's, and others — on ground that rises and falls instead of scanned-realm's level plateau, dark,
with the lights of the machines' eyes coming through the mist; and, when the plan was shown, that the machines' legs be
solved to the uneven ground naturally (IK on slopes and bumps). The mood named was that of a well-known game of
overgrown ruins and animal-shaped machines. A mood is not a design: **no machine, name, marking, place, interface or
asset of that game (or any other) is used or imitated here**, and a realm made with this skill designs its own.

**What came from where**
| part | from | what was taken | what is new here |
|---|---|---|---|
| the engine (renderer, scans, plants, weather, walker, HUD, sound) | `scanned-realm` in this repository (the `living-realm` engine with scans allowed; its look after Rez's Unreal clip — see that skill's SOURCE) | all of `lib/` and `scripts/` as they stood | the skinned path, lamps in the air and light passes, `mist`, slopes for the walker, footfalls and calls, dust |
| machines as mechanisms | `machine-build-reel` (after apek's Stilt video and AnyMachine, MIT) | the method: planar limbs solved in closed form, a drum between fork cheeks on a pin, two-part cylinders whose anchors a search finds, every part on one bone, key-posed moves, checks with numbers | written again in JavaScript for the page; the ankle that leans with the fold; a wider anchor search; levels of detail; lamps |
| the walk | `walking-colossus` (after Walking Block by Leonxlnx, MIT) and `machine-build-reel`'s `motion.py` | a stateless gait: phase offsets, a planted foot fixed in the world, the body sinking into each step | footfalls planned on real land, the body from its feet, the soft reach limit, shorter steps on a grade, halts with arrival and leaving, ways worn into the land |
| scans | <https://polyhaven.com> (CC0) | surfaces, models and leaf atlases, listed per realm and fetched by script | — |
| the shelled kinds of the example (turtle, crayfish, woodlice) | a request made after seeing the shelled machines of AnyMachine, <https://github.com/apekshik/anymachine> (MIT) | the idea that a machine may carry a shell — nothing else: its code was not read for this, no design, name or asset is taken | three kinds designed for this valley: a dome of bolted scutes on four sprawled legs, overlapping oxide-red plates with claws and a jointed tail on eight, seven arch plates on six; built with this skill's kit, judged by its gym |

**What is not here.** Blender (machine-build-reel builds in Blender; this skill builds in the page), offline film
frames (walking-colossus renders a film; this is a place to walk), generated images, video, motion or sound, any
downloaded rig or animation.

**Licences.** three.js and meshoptimizer (MIT, `vendor/`). Poly Haven assets are CC0; a page that reads them from
Poly Haven's server keeps the credit on the glass.
