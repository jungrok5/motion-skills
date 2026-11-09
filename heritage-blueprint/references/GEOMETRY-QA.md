# Contacts and negative space

Read when you add a complex joint, when someone points out a gap or a part passing through
another, or when photos show a different kind of opening than the model. Pick checks that hit
the actual defect; this is not a test suite to run on every small edit.

## Name the intended relationship first

| part | what must be true | targeted check |
|---|---|---|
| outside stair and platform | the last tread meets the real platform edge; the stringer is continuous; the rail opening lines up | sample tread-to-platform contact at the centre line and both sides; check the clear opening, with a rail as positive control |
| column foot, brace | the foot sits on the ground, the head meets the underside of the eave; tilt and inner / outer ring from photos | measure final vertices or face distance; look at foot and head close up, not nominal end points |
| roof and wall | doors and windows sit under the eave, solid wall or bands above the roof each have their own range | side and low views for false window bands, extra storeys or supports showing through the roof |
| through opening | really open, with thickness, an inner face and correct front / back occlusion | cast a ray through the hole from the photo's direction; a nearby solid face must be hit; re-check by orbiting |
| blind window, niche | a back wall and a recess depth, not a glazed through-hole | check opening-to-back-wall depth; the back wall must not vanish with the view |
| open cup, bowl | rim, inner wall, floor and any central part are distinct | check cavity depth and rim; never a solid bump or a painted fake hole |
| stacked parts | touching when assembled; separation is an explanatory offset | check faces and edges at phase 0; folding restores the same transforms |
| beams through a wall (e.g. Cheomseongdae's cross stones) | the beam passes the wall, the projecting end is short and reads as the same stone | view the wall from outside at the beam's course; the end must not float or hide inside |

Sample counts, tolerances and ray lengths depend on this object's unit, mesh and defect; do not
copy another tower's numbers. A polygon's circumradius is not the distance from its face centre
to the middle. Attach stairs and the like to real edges or faces, not an imagined circle.

## Repair and re-check

1. Keep the previous source and output. Locate the exact boundary from photos. A small fix
   keeps the approved fonts, colours, interaction and unrelated form.
2. Fix the cause (a parameter, a profile, a face relation). Do not hide a stair gap with a loose
   filler block, or hide an intersection with the camera, a dark halo or a covering face. Add a
   connector only if evidence shows one.
3. Do not erase real waists, steps, lips or creases while smoothing. Smooth surfaces hide the
   mesh; real part boundaries stay drawn.
4. Run a numeric or ray check that would have caught this defect, then look at the final page
   close up. If outlines show through a roof, check the real line and face positions and the
   depth offset; do not thicken or blacken them.
5. Return to the whole view and compare with photos from several angles: no extra storey, wrong
   taper or changed proportion. Rebuild the inset and fit, then check separation and layout.
