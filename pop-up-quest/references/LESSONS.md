# LESSONS — problem → cause → fix

Kept from building this skill. Add yours at the bottom when a book teaches you something.

- **The hero teleported at the start of every page** (the check reported a 74 px boot slide). → Before its walk
  began, the puppet stood at its destination, then jumped back to the start. → Until `walk.t0` the puppet waits at
  `walk.from`; chapters not yet reached have a pending arrival (`Infinity`), so a page rising under a turning leaf
  shows its hero at the start of the walk, not finished.
- **Puppets sank into the page by their cutting margin.** → The cream die-cut border runs 2.2 card units below the
  soles. → The rig lifts everything by the margin (`lift` group); the check fails anything whose box dips below
  −0.03.
- **The pointing paw swung backward / covered the face.** → Sign of the paw rotation, then the near arm (drawn over
  the body) raised past ~95° crosses the head. → Positive paw = forward; limit −25…95; point at ~74°, cheer with a
  fist pump at 88°.
- **The owl read as a cat, the frog's hat hid its eyes.** → One eye placement for every species; a rectangle muzzle
  on the owl. → Species carry their own `eyes`; the owl has face discs and a beak, no muzzle; render the cast sheet
  after any species change.
- **A strip of mountains crossed the gutter.** → Snow caps were added at the strip's cut ends. → Caps only for peaks
  well inside the strip; `S.ridge` / `S.mountains` split at x = 0 by themselves; the check fails any standee whose
  box crosses the gutter.
- **Frames differed between two renders of the same t.** → CSS transitions (rail dots) and CSS keyframes (task shake,
  stamp) ran on the wall clock. → `.pq-render` turns transitions and animations off; shake and stamp are computed
  from `t` in `ui.js`.
- **The prop visibility test said "hidden" for a bell on a post.** → One ray to the centre of the box passes through
  the empty space between post and bell. → Cast a ray to every mesh of the prop; visible when half of them are seen.
- **`it.fold` was both a group and a string.** → The fold direction overwrote the fold group. → `it.dir` for the
  direction. Keep names for scene nodes and for data apart.
- **Tall pieces near the top left vanish behind the heading.** → The camera frames the whole spread; the HUD heading
  sits over the left-back sky. → The check projects the top of each piece and fails it if it lies under the heading.
