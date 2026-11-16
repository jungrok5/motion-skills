# BRIEF — topic in, a short film designed for it

Write `BRIEF.md` in the project **before any code**. `check.mjs` fails without it, without its six sections
(`## Topic`, `## Cast`, `## Shots`, `## Motion`, `## Sound`, `## Review`) or with a `TODO` left in it. The starter
(`templates/BRIEF.md`) and the example (`examples/market-day/BRIEF.md`) are filled-in briefs.

A film in this style is 15–60 s, 2–6 shots, no words on screen: a small day told in pictures, the way a picture book
turns pages. The topic can be a place, a job, a season, a feeling, a tiny event ("the ice cream that fell").

## Template

```markdown
# <title> — storybook-short brief

## Topic
- Given: "<the user's words>"
- In one line: <what happens, and the small turn at the end>
- Not this: <the source film (puffin on a hat, a sea cliff, a Roman square, an autumn park walk, a tram bench),
  the starter, a stock idea of the topic>

## Cast
Per character: name, age, temperament; head (hair style + streak colour, face numbers, hat, glasses, extras); body
(coat shape and one pattern, colour pair, legs, shoes, sleeves); the story object they carry; mass (light / medium /
heavy); idle (what breathes, how often they blink, where they look). Sizes needed (close-up a ≈ 200, wide a ≈ 55–75).

## Shots
| # | name | s | framing | place (plates) | who and what | camera | in |
|---|---|---|---|---|---|---|---|
Pattern that works: close-up (who) → wide painted spread (where) → action (a walk, a chase) → the small event with its
big move → close-up again (how it ended). Each shot keeps something alive: birds, bunting, water, leaves, a dog.

## Motion
- Where the keys come from: a video-model clip of the character (outside the repo; model, prompt, take) or set by hand
  from observed timing (say so — never claim a reference you did not use).
- Walks: from → to, seconds, cadence (≈ 2 steps/s for a child, 1.7–1.9 for an elder); the stride snaps so both feet end
  planted.
- Glances: beats per actor (eyes first; head beats ≥ 0.6 / 0.75 / 1.0 s apart for light / medium / heavy).
- The big move: antic key (the gather, the other way) → big key (the action) → settle key (the recovery), with times.

## Sound
- Score: key, tempo, progression, which shots are `soft` / `full` / `none`.
- Ambience per shot (birds, wind, water, sea, crowd, room, rain, gulls, clock) and events (with times): woof, quack,
  meow, plop, splat, swish, bell, chime, pop, whoosh … Footsteps come from the walks; say the surface (path, grass,
  stone, wood, snow).

## Review
One block per round: render the sheet and stills, score, fix the worst, render again. Stop at ≥ 8 / 10 on every line.
```

## Rubric (score each 0–10 per round)

| # | Question | Fails when |
|---|---|---|
| 1 | **Story without words** — can a stranger tell what happened from the contact sheet? | the event is too small to see, or happens off-frame |
| 2 | **One style** — crayon skies and walls with paper tooth, gouache forms, dry-brush hair with coloured streaks, thin ink, warm paper | a flat fill, a gradient, a vector edge, a photo texture |
| 3 | **The characters** — big heads, small low features, side glances, bell coats, thin legs, hats; one design across close-up and wide | different faces between shots; realistic proportions |
| 4 | **The places** — each a picture-book spread with a clear ground line, houses / trees / water in this hand, a few strong colours | empty backgrounds, a plate that ends inside the frame |
| 5 | **Alive** — every shot has something moving besides the cast; idles breathe | a frozen second |
| 6 | **Bodies** — feet planted, knees forward, walkers face their way, the seated sit on the seat | a skating foot, a knee bent backwards, a body hovering over the bench |
| 7 | **The big move** — does it gather, land, and recover? | the action starts from rest and stops dead |
| 8 | **Sound** — does each shot sound like its place, do steps land on heel strikes, does the music follow the shots? | silence, clipping, steps off the feet |
| 9 | **Its own film** — not the source film, not the starter | the same shots with new names |
| 10 | **Would you show it to a child?** | |
