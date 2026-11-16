# LESSONS — problem → cause → fix

Things that went wrong while building this skill and its three characters. Add yours.

## The look

- **Hair read as navy, not black with blue streaks.** → The streak colours were on a third of all strands, each broken
  into short dashes, so blue speckled the whole mass. → Streaks on every fourth strand in a few bands only, longer runs
  (bristle breaks follow slow noise, `grain` 0.03–0.045), the dark strands painted first and wider.
- **A dashed grey halo round the hair.** → `shade(c, −k)` mixed towards a fixed purple-grey, which is *lighter* than
  near-black, so "darker" edges came out grey. → Darken multiplicatively towards a deeper, slightly violet version of the
  same colour.
- **Crayon tooth bit through the paint underneath.** → `tooth` knocks out with `destination-out` on whatever canvas it
  runs on. → Paint every op into its own canvas, then composite it onto its layer.
- **The pattern of the cardigan showed through the shirt under it.** → The inner panel was crayon over a 55 % tint. →
  Inner panels paint at 92 % tint, light tooth.
- **Flyaways looked like whiskers.** → Side strays pointed sideways in one arc. → Each flyaway bends twice and gravity
  pulls the long ones down; side ones start pointing down-and-out.
- **Curls drawn as a ring of circles round a flat cap, with a square notch at the temples.** → Curls were placed only on
  the outline; the hairline was a step function. → Sample curls over the whole mass (dark underneath, light on top); a
  smooth hairline that eases from the forehead to the ears.
- **A bun looked like a helmet.** → The pulled-back sides ended in a flat line at the brows. → A high hairline easing
  down behind the ears.
- **A yawn looked like a smile.** → The open mouth was a thin crescent. → An open mouth is a dropped jaw: a tall oval
  with a tongue, the top lip following the curve.

## The body

- **A bald patch behind a turned head.** → The hair mass slid towards the turn as far as the face did. → Slide the hair
  less (0.24 a at the crown → 0.07 a at the ends) and widen it on the back of the skull.
- **At strong turns the nose and mouth left the face.** → Features followed the sphere past the jaw's contour. → Cap the
  style at |yaw| ≤ 0.75 (front and 3/4 are the style; profile is not), mouth on a 0.9 radius, eyes at 0.93.
- **A starter boy read as a girl.** → A full fringe and sides to the jaw is a bob. → Shorter sides (0.3 a) above the ear
  lobes. (Silhouette decides the read before the face does.)

## The motion

- **Heavy grandmother's head overshot by more than 100 % and never wound up.** → Head beats every 0.55 s: each new turn
  began before the last had landed. → One head beat per 1.1 s for a heavy mass; `check.mjs` now fails beats closer than
  0.6 / 0.75 / 1.0 s (light / medium / heavy) and a last beat too close to the end.
- **The counter-move was invisible on medium and heavy bodies.** → 14 % for 0.12 s is gone before a slow spring answers.
  → 22–30 % for 0.10–0.22 s by mass.
- **"The planted edge slides 190 px".** → Rain and flour dust crossing the bottom row were read as the body. → The planted
  check measures the body with the front layer hidden, and takes the longest run of paint, not the outermost pixels.
- **The check took two minutes.** → Whole frames were copied out of the page as JS arrays to diff in Node. → Diff inside
  the page; the full check runs in ~3 s.
- **A blink schedule that ended.** → Blinks were generated up to a fixed time; a live page ran past it and stopped
  blinking (a dead idle). → Blinks repeat every `live` seconds with the beats.
