# Story: topic → facts → script → shots

The reference format (20 shorts measured frame by frame in mromidev/claude-animated-shorts `references/STYLE_BIBLE.md`)
is extremely regular. Follow it; it is why these shorts hold attention.

## 1. Picking the topic
- **One surprising true story with a physical cause and effect** — something you can *show*: a bridge that fell to a
  marching rhythm, a tower saved by a war, a ship sunk by a molasses wave, toast that lands butter-down.
- It needs a **mechanism** an everyday analogy explains (a kid on a swing = resonance; a sponge = soil consolidation;
  a crowded doorway = a traffic jam). No mechanism, no "You see," beat, no short.
- It needs **stakes and people**: someone did something that sounds dumb or impossible, others reacted.
- Check every claim and number against a source (Wikipedia is the minimum; follow its citation for the key number).
  Write them at the top of `BRIEF.md`. Jokes are researched facts, not invented ones.

## 2. The script formula (20 of 20 reference videos follow it)
| beat | what | example (leaning-tower) |
|---|---|---|
| Hook | the paradox stated as fact, sentence one, no setup, 10–16 words; or "If you X, you'd Y" / "X is illegal, yet …" | "A war is the only reason the Leaning Tower of Pisa is still standing." |
| Setting | 1–2 lines, present tense, concrete: year, place, a named everyman, the pride of the town | "It's 1173, and Pisa starts building a grand marble bell tower next to its cathedral." |
| Escalation | 3–6 beats, each a little bigger; others laugh / doubt / mock; 1–2 exaggeration jokes | tipping → shallow foundation → war → a hundred years → neighbours laugh → they cheat → it bends like a banana |
| Mystery | one "But wait, …?" | "But wait, why didn't it fall over?" |
| Pivot | **"You see,"** (14 of 20) → the real mechanism, through an everyday analogy ("Ever …?", "Picture …") | "You see, wet clay is like a sponge full of water. Squeeze it fast…" |
| Consequence | what changed because of it | "In 1990, engineers closed it…" |
| Twist | 1–2 short sentences, ironic, callback; the video ends on the last word | "Because a straight tower in Pisa is just a tower." |

- ~3.7 words/s (3.5–4.1), 55–70 s → **200–240 words**. Sentences ~13 words, plain spoken English, contractions.
- Two modes: story (third person, present tense, a named everyman) or "Imagine you're …" (second person).
- Never describe what the viewer already sees; the picture illustrates every sentence *literally* instead.
- Two deadpan lines in a row are a reference favourite ("Luckily, the river was only two feet deep. / Unluckily, the
  river was only two feet deep.").

## 3. The shot plan
One shot per sentence or beat: **15–20 shots a minute, 1.5–5 s each**, every shot starting on a word. Write the table in
`BRIEF.md` before any code: `# | first word | set · light | framing · camera | who / what | sound`.

Shot grammar that reads as the reference:
- **Hook**: the payoff image *first* (a flash-forward: the tower leaning today), low angle, push in; a 4-frame white
  `flash` into the story on the next shot.
- **Setting**: a high establishing wide that glides down into the place (`cam` 2 keys, `dur` 40–60 frames).
- **People react**: medium shots of 2–3 characters, close together (portrait!), expressions changing on the word;
  effect cards (`exclaim`, `question`, `sweat`) pop 2 frames before the word.
- **Impacts**: `kicks: [t]` + an effect card (`bang`, `puff`, `splash`) + an SFX on the same frame; dutch `roll` 3–5°.
- **Time passing**: golden light, a slow glide, somebody asleep (`zzz`), a `wonder` music section.
- **Explanation**: a *different place* (an interior, a kitchen, a playground) for the analogy, close-ups, the analogy
  object held by a character (`prop` draw function) or built in 3D; night-blue light also marks the explanation beat.
- **What-if**: show the counterfactual literally (the tower falls), then cut back to reality.
- **Payoff**: back to the hook's image, golden light, characters doing the joke (tourists "holding up" the tower),
  the last push-in, end on the last word.
- Hard cuts are fine between shots; *within* a shot the camera glides. Place changes get a 6–10-frame crossfade (`xfade`).

## 4. Framing in portrait
A 1080×1920 frame is **0.56× as wide as it is tall**: at fov 40 a camera 5 m away sees only ~2 m across. Keep the
characters of a medium shot within ~1.3 m of each other, put the camera on the line through the people it frames, and
check every shot with stills before rendering. Characters are ~2.1 m (adults) / ~1.6 m (kids) tall cards; eye height is
~1.75 m. Low cameras (0.5–1.5 m) make the world grand; the reference rarely uses eye-level-of-a-giant views.

## 5. Light per beat
`day` for the story; `golden` (backlit low sun, violet-blue shade, peach horizon) for time passing, nostalgia and the
payoff; `night` (moonlit blue, warm practicals) for the night, a pause or the explanation; `interior` for rooms.
Put the sun where the shot needs it with `sun: { az, el }` (az 0 = straight ahead = backlight, 90 = screen right).
