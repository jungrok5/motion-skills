# BRIEF — topic in, a character designed for it

Write `BRIEF.md` in the project **before any code**. `check.mjs` fails without it, without its five sections
(`## Topic`, `## Who`, `## Design`, `## Motion`, `## Review`) or with a `TODO` left in it. The starter
(`templates/BRIEF.md`) and the examples (`examples/*/BRIEF.md`) are filled-in briefs to read first.

The topic can be anything: a job ("a beekeeper"), a moment ("the first day of rain"), a feeling ("waiting for a letter"),
a person described in a line, a season. The portrait is always **one character, bust, front or 3/4, on white paper**;
what changes is who they are and what one detail tells their story.

## Template

```markdown
# <title> — storybook-portrait brief

## Topic
- Given: "<the user's words, verbatim>"
- In one line: <who this is and what the picture says> (e.g. "a grandmother who keeps bees on her roof, amused by the one
  bee that will not leave")
- Not this: <what the topic could easily become and should not> (a stock icon, the starter, the source picture)

## Who
- Age, role, temperament in three words.
- The story detail: one thing that tells the topic at a glance (a bee, flour on a cheek, rain on a hood). It must read at
  thumbnail size.
- Mass: light | medium | heavy (sets the head spring, anticipation length and breath depth — references/MOTION.md).
- Idle: what breathes, what flicks, how often they blink, where they look when nothing happens.

## Design
- Head: size `a`, jaw, chin, skin + shadow. Face: eye size / spacing / height, pupil size, default gaze, lids, nose type,
  mouth curve, brows (which show — hair may hide one), blush strength, freckles.
- Hair: style (straight / short / bun / curly / your own extra), bangs, length, volume, base colour, **streak colours**
  (the style's signature: a dark mass with one or two coloured streak colours in it).
- Clothes: garment (cardigan / sweater / collar / your own), **one pattern** (stripes, dots, checks or solid) in a
  **two-colour pair** that clashes happily (yellow / violet, olive / honey, cream / navy + red).
- Extras: props drawn in the same media (gouache, crayon, ink, dry brush): what, which layer, static or live.
- Palette (5–7 colours with roles): skin, hair dark + streak, garment pair, accent, ink. Paper colour.
- Composition: head size and height on the 1080×1350 sheet, how much paper shows, where the eye goes first.

## Motion
- Draw: seconds for the strokes to go down. Live: seconds alive after that (film = draw + live).
- Reference: where the keys come from — a video-model clip of this character (model, prompt, take; kept outside the
  repo), a clip you filmed, or "set by hand from observed timing". Never claim a reference you did not use.
- Beats table: t (s after the drawing ends) · gaze [x, y] · head {yaw, tilt} · expression / face · why.
  Eyes lead, the head follows (the runtime adds the counter-move and overshoot); head beats at least 0.6 / 0.75 / 1.0 s
  apart for light / medium / heavy, the last one at least that long before the end.
- The big move (if any): its gather (anticipation), the action, the recovery, in beats.

## Review
One block per round: render, score, fix the worst, render again. Stop at ≥ 8 / 10 on every line.
```

## Stills rubric (score each 0–10, every round, in `## Review`)

| # | Question | Fails when |
|---|---|---|
| 1 | **Topic in two seconds** — does a stranger say the topic from the thumbnail? | the story detail is missing, tiny or generic |
| 2 | **One style** — gouache skin, dry-brush hair with coloured streaks, crayon clothes with paper tooth, thin wobbling ink | a flat fill, a smooth gradient, a vector edge, a new medium |
| 3 | **The face** — big round eyes with small pupils glancing aside, tiny nose and mouth low on the face, strong blush | features centred and realistic, pupils filling the eyes |
| 4 | **The silhouette** — oversized head, long neck, cropped bust, a hair shape you could cut out of paper | head small, neck short, hair a shapeless cap |
| 5 | **Palette** — one dark, one clashing garment pair, warm skin, pink cheeks; white sheet around | more than ~7 hue families, muddy mixes, grey shadows |
| 6 | **The hand** — visible marks, tooth, flyaway hairs, lines that wobble and break | anything you could mistake for a vector illustration |
| 7 | **The body** — face, nose, near ear, chest front all agree on one direction; "neck turned or body turned?" never asked | cast sheet shows a reversed ear, chest front opposite the face |
| 8 | **Motion** — does anything float, skate or stand dead still? Does the glance gather (counter-move) and land (overshoot)? | frozen second, head moving with the eyes, hair moving with the head |
| 9 | **Its own picture** — not the source illustration, not the starter, not the last piece | same hair, same stripes, same pose with a new name |
| 10 | **Cover test** — would you put it on a picture-book cover? | |
