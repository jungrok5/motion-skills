# Lessons (problem → cause → fix)

- **Fills were see-through** — the fern showed through the hero, the hero's body through the can. → Hatching leaves paper
  between strokes, so whatever was drawn behind shows in the gaps. → `crayon()` lays the sheet colour under its hatch
  (`knock`, on by default); overlays that must tint (cheeks, paw pads, inner ears, tongue, eyelids) pass `knock: false`.
- **The paper looked grey and dirty**, darker than the source (≈ 228 vs 242). → 260 soft brown blotches, a warm multiply
  and the tooth multiply all stacked. → Fewer, fainter blotches, no warm multiply, a lighter base tone; measure the sheet
  against a source frame with a pixel probe rather than by eye.
- **Wings hung like paddles in profile.** → An arm with no pose hung straight down. → `arms.rest` per creature: wings
  sweep back (`{ a: .25, f: −.7 }`), paws hang a little forward. A pose that leaves the arm out uses the rest.
- **A cast sheet hid a tail.** → Creatures were spaced closer than their width, so the next one covered the tail. → Space
  cast-sheet turns by more than the widest pose; a tail you cannot see is a tail you cannot check.
- **The belly patch poked out of the body at 3/4.** → It was placed on the ball but not clipped to it. → Clip front
  patches to the body outline.
- **The running far arm broke its range** (`body: Momo armL swing −1.08 out of range`). → A swing of `−.6 − .5·sin` dips
  below −1. → Keep the swing inside `R.LIM` (`−.45 − .45·sin`); the check found it, not the eye.
- **The hero was out of frame on purpose** (an entrance, the camera leaving him at the cliff) and the frame rule failed. →
  The rule is right in general. → Give the shot `momoInFrame: lt => …` to say when it does not apply, instead of deleting the rule.
- **"No ink" fired at preview scale.** → At `--scale .25` a 2.6 px line is thinner than a pixel and blends into the paper.
  → check.mjs counts pixels clearly darker than the sheet, not absolutely dark ones.
- **Characters on twos against a smooth camera stutter.** → If positions also step on twos, the figure jumps against the
  panning ground. → Positions along the line on ones, poses / faces / effects on twos.
- **Bare imports broke the score renderer.** → `score.js` imported `bds/score.js` (an import-map name), which Node cannot
  resolve. → Modules import the library by relative path; only pages use the import map. `new-film.mjs` rewrites both.
