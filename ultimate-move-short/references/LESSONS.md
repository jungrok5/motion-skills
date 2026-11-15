# LESSONS — what broke while building this skill, and the fix

## Getting the reference
- **The prompt was in the first reply.** → `api.fxtwitter.com/2/thread/<id>` returned the post, the 30 s clip
  (`video.twimg.com/…/1280x720/…mp4`) and the 6.5 k-character prompt; `ffmpeg -vf fps=1,scale=480:-1,tile=3x2`
  sheets and full-size crops of the ink were enough to measure the look.

## The fighter
- **The eye was drawn ten times too big** and hid the whole face. → The eye is drawn in millimetres in the eye plane;
  the projected basis is px per metre, so the transform divides by 1000, not 100. Check close-ups early.
- **Spiky "starburst" hair.** → Hair is locks, not spikes: a curved tapered leaf from the scalp that falls in world
  down (so a tilted head's hair still hangs), a hair mass behind the face, bangs last with their own cast shadow.
- **A visor across the eyes.** → The brow shadow was a band; replaced by the bangs' own shapes shifted down-and-away
  from the light and clipped to the face — the anime way.
- **Puffy shoulders, small head.** → Shoulder joints inside the torso hull (.155), slimmer arms, `build.head` 1.12.
- **Hands out of reach everywhere after narrowing the shoulders.** → check.mjs `body` caught it; a small solver
  (pull the grip toward the chest, slide `ls`) re-tuned `POSES`. Re-run the pose audit whenever proportions change.
- **A two-handed spear crossing the arms mid-swing.** → The interpolation went the long way round; key the blade the
  other way (`by − 2π`) or put a key between.
- **Long hair and the ponytail were painted over the chest** (they were part of the head, which sorts in front of the
  torso). → Hair behind the head is its own depth-sorted part, placed at the back of the skull; check `long` / `tied`
  hair from the front on the cast sheet.
- **"Moving backwards" on a blink.** → A teleport is not a run: speeds over 25 m/s are exempt; a strike's
  follow-through moves along the facing, not along +x.

## Ink
- **Ink looked like vector art** (hard outlines, uniform round-capped lines, parallel lines along the edges). →
  Strokes are resampled into a dense Catmull-Rom curve; each bristle is a tapered sliver with pointed ends and a
  wobbling width, clustered toward the body and broken by low-frequency noise; laid down through a layer with a 1 px
  wet blur. Test the brush alone on a page (`brush()` on two arcs) before judging it inside a frame.
- **A spiky black bush behind the fighter.** → Fewer, more stretched blots (every third sample, young samples only);
  four tracked parts instead of seven; streaks carry the mass.
- **Fading ink went grey with darker overlaps.** → Fade a whole layer at one opacity (`w.layer`) — or better, keep it
  black and tear it away with `destination-out` blots (the vanish afterimage).
- **A trail filled the frame when the camera overtook the runner.** → `near` skips points closer than 1.4 m, and the
  run shot ends its trail before the overtake.
- **Red read as neon tubes.** → Hairlines at 1.6 % of the stroke width, broken by noise, fading in and out along the
  stroke, glow ≤ 3× the width.

## The world and the domain
- **Cracks from every shot piled into every later shot** (all shots happen near the origin). → Each crack has
  `until`; widths ×0.7.
- **The moon swarm looked like Christmas ornaments.** → Flat discs (no 3D shading), no accent on small moons, a
  sparser swarm pushed back, and every wall moon opens only to its own phase — the wall became crescents.
- **The eclipse was behind the camera.** → The domain surrounds the fighter: a second wall and the eclipse giant on
  the other side, because the climax cameras look at her face.
- **The closed eclipse vanished in the black void.** → The void is `#0c0c0e`, not black, and the corona dies over
  0.2 s instead of 0.1.

## Camera and render
- **Strobing duplicates on the dive and the 360° orbit.** → Five motion-blur sub-frames are not enough for a fast
  camera; `mb` can be a function of t — drop it to 0.1–0.25 on those moves.
- **The shear left white blocks at the frame edges.** → The sheared snapshot is drawn zoomed 1.2× so the slid parts
  still cover the frame.
- **Render cost**: 30 s at 1080p with motion blur took 266 s on 4 workers (0.25–0.3 s a frame). Previews with
  `--q mb=1 --scale .5` are ~10× faster.
