# LESSONS — what broke while building this skill, and the fix

Problem → cause → fix, one or two lines each.

- **Every canvas colour came out dark and muddy** (a navy road, a brown glove) → `new THREE.Color(hex)` returns
  *linear* values, and they were written into sRGB canvases → `paint.js rgbOf` parses the hex itself; only material
  colours go through `THREE.Color`.
- **Flaked plaster and chips repeated like wallpaper** → they were drawn into the 1.4 m tiling brick texture →
  they are decals placed once per wall (`building({ patches })`), avoiding windows and the shopfront.
- **A chip decal rendered as a grey smudge** → each brick was drawn with `source-in`, which erases everything
  outside the new shape → bricks inside the clipped blob use `source-atop`.
- **Arms did not go where the pose said** (hands-on-hips came out as hands meeting in front) → the shoulder Euler
  applied twist after abduction → shoulders use order `XZY` (twist about the arm first, then out, then forward);
  `twist` > 0 turns the elbow's bend toward the body. Checked in a front + side pose lab.
- **Eyes looked shut** → the lower lid shell was rotated to the front → lower lid at `π + 1.45` (open) … `π + 0.8`.
- **Smiles were frowns** → the mouth arc's curvature sign → `smile` bends up at the corners (positive curv).
- **Mannequin torsos with kinks** → a 12-point lathe profile shows each point on the silhouette → `slathe`
  (Catmull-Rom through the profile, 40 points, 40 segments).
- **Arm caps stuck out above the shoulders like balls** → shoulder joints too high and wide → joints at 84 % of the
  chest width, 0.34 T up the chest, and a broader rounded shoulder line in the torso profile.
- **Hats sat over the eyes, the mouth hid in the collar** → features were placed at a fixed z → `surf(y)` gives the
  skull's surface depth at any height from the lathe profile; eyes, brows, nose and mouth sit on it; hats move up.
- **A raised index finger read as the middle finger** — in profile too, from the back of the hand → never raise a
  lone finger facing the camera: `Glove.scold` points straight at the person and shakes; the `spin` shape keeps the
  other fingers loose to balance a scoop; "wait" is an open `stop` palm. Review every act/button still for this.
- **The glove went under the pavement catching a falling scoop on a fingertip** (the hand is 1.4 m below its own
  fingertip) → catch low things in a palm-up `cup`, toss up, then onto the fingertip. `check.mjs` fails any frame
  where a glove's wrist goes below −0.2 m or a foot goes under the ground.
- **The dangled man slid off the glove while it turned him round** → the glove led and the man was pinned, so
  rotating the glove swung him → while held, the *person* leads (his root path is keyed) and the glove follows with
  `align("grip", collar)`.
- **The glove's rest spot was cut by the frame top** after moving the camera closer → rest 0.78 m above the hose
  socket, and the outro wave below the shoulder line.
- **Characters were too small** (25 % of the frame) → the reference frames characters at ~50 % → camera 7.5–9 m from
  the facades at y ≈ 1.2, fov 33, looking up to y ≈ 1.8.
- **A passing car stopped in the foreground** → its path ended inside the frame → keyed paths for passers-by end
  well outside the frame.
- **The hose came out of the hero's far side, hidden by his body** → the machine's socket is on his right, which is
  the camera side when he walks +x.
- **Motion blur made every frame 5× slower** → 5 sub-frames everywhere → adaptive: measure on-screen motion of
  actors, glove tip and camera across the shutter, render 1 sample when < 2.5 px, up to 5 when fast.
- **Render timing on a CPU** → SwiftShader: ~3 s for a 1080p frame (MSAA ×4 ≈ 0.7 s of it, shadows little);
  previews at `--scale .5 --q mb=1`.
