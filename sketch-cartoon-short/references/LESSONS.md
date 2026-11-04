# LESSONS — what broke while building this, and the fix

- **The body faced backwards under the head.** In 3/4 the figure's head looked right but the arm and leg drawn in front
  hung from the shoulder and hip on the facing side, so the torso read as turned the other way ("did the neck turn or the
  body?"), the open coat showed the shirt at the back, and the larger eye was on the wrong side. → A figure facing right
  shows its RIGHT side: the near shoulder and hip sit on the screen side behind the face (−f), the far ones on the facing
  side (+f). The coat's two fronts meet a centre-front line that moves toward the facing side as the figure turns; the
  narrower eye is the one on the facing side. The cast sheet now turns every person both ways so a mirror error shows.
- **Impossible joints went unnoticed.** Nothing stopped a knee bending forward or an elbow backward, and the dog's lower
  front leg folded forward (hind backward) in its walk and run. → `R.LIM` joint ranges, audited on every draw into
  `S.audit`; `runChecks` reports them as `body: …` rules so `check.mjs` fails; critter gaits fold front paws back and hind
  paws forward and are audited too.
- **A leaning figure lifted a foot.** Lean rotated around the point between the feet, so a planted sole rose a few px. →
  lean pivots on the lowest sole.
- **The raised near arm covered the face** when he reached after the umbrella. → reach with the far arm (it is on the
  facing side and is drawn behind the head); the rule is in SKILL.md.

- **Buildings came out as soap bubbles.** Every closed shape went through a Catmull-Rom curve, so a rectangle became an
  oval. → `shape` / `fill` / `shadeSide` / `hatch` take `sharp: true`; the kit uses it for everything built; bodies stay smooth.
- **The hair crown covered the face.** The crown arc was traced through the bottom of the head (angles decreasing from π
  past π/2). → trace from the left side *up over the top* to the right (π − low → 2π + low), then the hairline.
- **Long hair stood up like flames.** Locks started outward and gravity was weak. → start each lock outward-and-down,
  stronger per-style gravity, and a filled hull behind the locks so the mass reads as one shape.
- **Shoes looked like high heels.** The foot was too short and the shoe built off the ankle. → build the shoe in the foot's
  own frame (heel → toe, sole up), longer foot (.1 h), boots taller.
- **The coat read as a surfboard / a bean.** One narrow smooth panel. → wider panel whose inner edge closes over the torso
  as the figure turns to profile, `sharp` corners at the hem.
- **The held umbrella's canopy was cut by the top of the frame.** Arm raised high + a long shaft. → hold at shoulder height
  (`arm.near = [1.0, 1.9]`), shorter shaft, figure a little lower and smaller; the still review has a line for it.
- **The skyline showed through the town.** Facades are washed only partly (the unfinished look), so a skyline behind
  them bled through. → `facade({ base: PAPER })`: an opaque paper under-colour, then the partial wash.
- **The cloud sat on the hero's head.** → put the scribble mass high and to the side; the hero looks up at it.
- **Reveals shuffled the seeds.** If strokes that are not yet drawn still advanced the stroke counter, a stroke's wobble
  would change as the reveal grew. → undrawn strokes return before taking a seed; `countStrokes` counts without drawing;
  the drawn part is stable as k grows.
- **The live page ran at 60 fps.** The camera looked smooth but the boil and twos were uneven. → the live loop draws only on
  new 24 fps frames.
- **Every frame took ~0.5 s when the cast was redrawn into plates.** → backgrounds in plates with 2 boil variants; only the
  cast, props and effects are drawn per frame (~0.1–0.2 s a 1080p frame on a CPU).
