# BRIEF — from a topic to a short of its own

Every short starts here, before any code. Copy `templates/BRIEF.md` into the project as `BRIEF.md` (new-film.mjs does)
and fill it from the user's words. The example (`examples/leaning-tower/BRIEF.md`) and the template's toast story are
**examples of the style**, not a menu: every topic gets its own facts, cast, sets, props, lights and sound.

## What stays the same for every topic (the style)
- **Format**: 1080×1920, 30 fps, 55–70 s, the voice from frame 1–4, the picture ends ~0.3 s after the last word.
- **Script shape**: absurd true fact as the hook → setting → 3–6 escalating beats → "But wait…?" → "You see," + an
  everyday analogy → consequence → ironic twist; ~3.7 words/s; one steady male narrator (references/STORY.md).
- **Picture language**: flat bean-head characters (plum ink, deadpan faces, stick limbs) as lit cards in a painted 3D
  world with black ink lines; the light presets, grade, ink widths and lens ladder of `lib/look.js` (references/LOOK.md).
- **Camera grammar**: smootherstep glides, a creeping push on every hold, hard cuts between shots, kicks on impacts,
  3–5° rolls, a 4-frame white flash after the hook, crossfades on place changes.
- **Sound**: the narrator on top, a bouncy synthesised score ducked under every word, a cartoon SFX on every on-screen hit.

## What is designed per topic
| | designed in BRIEF.md, built in the project (never by editing the skill's lib/) |
|---|---|
| facts + sources | the claim, the numbers said out loud, the mechanism, the consequence |
| analogy | one everyday thing that works the same way, shown literally (a sponge, a swing, a doorway) |
| cast | one `person({...})` per role: era-right coat colours, hats, beards, glasses; held props as draw functions |
| props | every noun a sentence uses that the eye must see: kit builders, or new pieces with `S.Batch`, `S.mesh`, `S.paintMat` |
| sets | 1–3 places, laid out so the cameras can see the jokes (portrait: the frame is 0.56× as wide as tall) |
| light per beat | which preset each beat uses, and where the sun goes (`sun: { az, el }`) |
| effect cards | which beats pop which card; new cards drawn with the same `Pen` and ink if the topic needs one |
| sound | the mood per section and the turns where it changes, the SFX list, the dead-air stop |

## Review rubric (score stills before the final render)
Render two stills per shot (`render.mjs film.html --stills … --scale .35`) and a contact sheet, then score each area
1–10 (a fresh reviewer agent works well: give it the sheet, LOOK.md and this rubric). Fix everything under 7.
| area | 10 looks like |
|---|---|
| reads at a glance | every shot shows what its sentence says; the joke's prop and the reacting faces are in frame and big enough on a phone |
| framing | nobody cut at the edge, no camera inside a wall, foreground props recognisable, the subject not lost against the background |
| characters | expressions change on the words, the same person looks the same everywhere, poses read (point, shrug, up), feet on the ground |
| colour + light | day median luma ~.5–.6, saturated but not lemon; golden = violet shade + peach horizon; night = blue key + warm practicals |
| ink + depth | silhouettes and creases inked, no ink on characters, lens blur on close shots only, focus on the front faces |
| motion | no frozen holds, glides not jerks, kicks on hits, reactions 0–3 frames before the word |
| story | hook in sentence one, the "You see," beat in another place / light, the twist on the last word, facts match the sources |
| sound (by numbers) | voice 8–10 LU over the bed, mix −14 LUFS, peak ≤ −1 dB, a sound on every on-screen hit |
The example scored itself this way through three still passes (framing was the weak area: characters cut at the frame
edge, a camera that pushed past its subject; see LESSONS.md).
