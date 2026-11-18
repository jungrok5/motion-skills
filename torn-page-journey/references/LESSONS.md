# LESSONS — what broke while building this, and the fix

- **The chest was on the back.** The belly patch was offset along the torso's normal the wrong way, so the white chest sat
  behind the body — a fox facing right with its front on the left. The cast sheet (both directions, every medium) showed it
  at once. → The chest is offset toward the facing side; a pack toward the back. The cast sheet is the first thing to render.
- **Hands came off the bars when the rider sat up.** Arm length was fitted to the seated lean, so a gesture that leans back
  (the wave's anticipation, `feetup`) pulled the shoulders past reach (`body: … arm cannot reach (6.9 px short)`). → Arms are
  fitted to an upright rider (the farthest the grips ever get); leaning forward only bends the elbows more.
- **The neck broke its limit when moods and gestures stacked.** A `look` (−.62) on top of `wonder` (−.32) pitched the head
  54°. → Gestures are relative and smaller; moods stay inside ±.3; the check reports the angle.
- **Feet-up read as a second pair of arms.** Legs stretched straight forward at hip height looked like arms reaching for
  the front wheel. → Legs go forward AND down (far leg a little lower than the near one), so they read as legs off the pedals.
- **The crayon sky looked ruled.** Hatching the whole band with full-width parallel lines gave a striped card, not a child's
  scribble. → Each hatch line is broken into short runs, each with its own slant, pressure and small gaps.
- **Watercolour wheels came apart.** The medium's broken pen line, nice on scenery, made the rider's tyres look snapped.
  → Broken lines only for the world; the hero's lines are continuous.
- **The loop popped.** At the seam the wheels, the cranks and every live thing jumped. → The speed table is scaled so a
  whole number of wheel turns fits the loop, the cranks likewise; the follow-through springs run twice so their end state is
  their start state; through the last tear the clock wraps (`t − dur`) for both pages, so the first frame meets the last.
  `check.mjs` compares the seam with an ordinary frame step (one that includes a re-draw of the marks).
- **The owl floated.** The tree it should sit on was scattered with jitter, so the owl's computed branch missed it. →
  Things that must meet are placed on the same grid with jitter 0 (`K.each(…, 0)`), or drawn together in one live layer.
- **A medium-blind traveller looked pasted on.** Drawing the rider once in a neutral style over each page broke the form.
  → The rider is data drawn through the page's medium; `role: 'hero'` keeps its colours readable in every medium.
- **Plates for eight chapters would not fit in memory at 1080p.** Each chapter's layers are painted lazily over just the
  world range it shows, at most three chapters are kept, and the live page paints the next chapter while the current one plays.
