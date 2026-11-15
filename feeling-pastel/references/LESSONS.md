# LESSONS — problems met while building the skill, and the fix

- **Paper speckle looked like digital noise** → it was per-pixel random (salt). → Speckle and stroke edges now come from
  value noise at the paper's grain size, so paper shows through in clumps, the way dust skips the valleys.
- **Everything looked snowy on the first render** → block-in at pressure .45–.65 left most valleys bare. → Block-in at
  .6–.85; save light pressure for air and highlights.
- **The tear in the cloud read as a sun disc** → a circle of the brightest colour is a sun. → Make the light an irregular
  opening between masses, with wisps crossing it.
- **Cloud lobes read as bubbles** (each lobe shaded as its own sphere, contour marks drawing target rings). → `form` shades
  the mass as one body (`lobe: 0.3`), rim marks follow the form only near the edge (`around`), interiors hatch in one
  direction; `floor` gives flat undersides.
- **Rays pointed sideways** → angles in canvas space: 90° is straight down. Rays from a light above the horizon run 95–135°.
- **A thin line along the cloud edge looked like a wire** → one continuous light stroke reads as an outline. → Light comes
  from the form's own shading, or from short broken strokes.
- **The murmuration was a closed loop (a halo)** → spines that cross themselves read as a ring. → An open ribbon, thick
  and thin, densest where it turns.
- **Birds were invisible** → tiny lit dabs on a mid-value sky disappear. → Put the flock where the value contrast is
  greatest (dark birds inside the light), a few large stragglers elsewhere.
- **Snow drifts were balls** → `form` lobes along the bottom read as boulders. → Drifts as ridges: a band under each crest
  curve, light at the crest, blue shadow below, strokes along the slope.
- **Village houses looked like mushrooms** (bright wide roofs on tiny dark walls). → Muted roofs, steeper pitch, less
  overhang, walls a step lighter, windows in oil pastel.
- **A night piece on cream paper looked like falling snow** → the grain shows the paper. → Dark toned paper for night.
- **`check` failed a night piece for "no real lights"** → absolute thresholds punish low-key pictures. → Check the value
  *range* (98th − 2nd percentile ≥ .4) and report the key.
- **Crops at the top edge wrapped around** → negative row offset. → Clamp crop origins.
- **A comment after an object literal ate its closing `});`** (one-line `// …` before the close). → Put comments after the
  statement.
