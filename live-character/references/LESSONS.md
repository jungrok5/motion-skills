# Lessons

- **Bangs stuck out as square corners above the crown** → the outer locks' roots lay outside the crown's curve → root
  every lock inside the crown silhouette.
- **Diagonal extremes tipped the whole bust over** → the torso took 0.3 of the head's tilt plus its own lean, 19° → cap
  the torso (`rig.limits`, 12° turn, 5° lean) and lower its share of the tilt.
- **A hop showed the bottom of the coat** → the cut edge lifted with the body → draw clothes well past the frame bottom.
- **"Surprise" looked sleepy** → the action forced a blink at its start → no forced blink on surprise; blink on a pat.
- **Half-closed round eyes read as empty rings** → a fur-coloured lid over a cream mask → below 35 % open, draw the
  closed (or happy ^) line instead of a lid.
- **A planted paw slid 72 px after "손!"** → (1) the legs were exactly full length, so breathing lifted the shoulders out
  of reach; (2) the IK used unforeshortened bones while the leg was still pitched; (3) the pose ended before the leg came
  down → slack in the leg, IK on the projected lengths, land by pitch. `check` measures this.
- **Limbs drifted off their limits at rest** → a soft-knee clamp centred on the range pushed values sitting on a bound
  inward → hard clamp, zero the velocity at the bound.
- **A raised arm showed a ball joint at the shoulder** → the tube's start cap was outlined over the coat → `openStart`.
- **The page scrolled sideways 1 px on phones** → a grid's implicit `auto` column grew to its children's min-content →
  `grid-template-columns: minmax(0, 1fr)` on every stacked grid.
