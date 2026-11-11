# BRIEF — topic → plan, and the rubric every still is scored against

Write the brief **before any code**, as `BRIEF.md` in the project (`new-film.mjs` copies a filled example). The topic is
what the user gave ("time", "courage", "the sea", "a eulogy for a teacher", "our company's values"). The brief turns it
into lines, scenes and a loop. Everything topic-shaped is designed here; nothing is borrowed from the example films.

## The template

```markdown
# <Title> — aphorism-film brief

TOPIC        <the user's words, verbatim>
THREAD       <one sentence: what the film says as a whole — the quotes are its paragraphs>
LENGTH       <5–8 quotes × 6–8 s = 35–60 s; 16:9 1920×1080, 30 fps>
LOOP IMAGE   <the picture the film opens AND closes on — an emblem of the topic, big, with the lead small in front of it>

LINES (one per shot; see QUOTES.md — public domain, attribution checked, source cited)
| # | line (as set) | by · source | why this line here |
|---|---|---|---|

SCENES (one per line — designed FOR the line: the place makes the thought visible)
| # | place | lead's action & framing | props that carry the idea | palette accent | transition IN | type (layout · roles · out) |
|---|---|---|---|---|---|---|
  framing: a close-up bust · a small figure in a big space · a walk/run along a wall (truck) · a corridor (dolly)
  transitions: papers · crack · vortex · ink · slide · dissolve — chosen by meaning (crack = something breaks open,
  vortex = a thought spirals, ink = darkness/forgetting, papers = time/pages/news, slide = a sudden turn)

CAST (cast.js — designed for this topic; see CAST.md)
  lead: <hair style & colour, two streak colours, eyes, top/bottom, shoes, prop/bag — and why they fit the topic>

SOUND (score.js)
  key & feel: <e.g. E minor, felt piano over a pad, one chord per ~3.7 s>
  motif: <e.g. a falling four-note figure "like sand">
  on the cuts: <paper / crack / whoosh / swirl / ink / slam> · under a scene: <tick, wind, room tone>

QUALITY STANDARD (keep, add topic-specific lines)
  - every frame is a poster: dense, flat, ink-lined, saturated; at least three patterns or textures visible
  - the type is the hero of the composition: a big Didone word, a small italic, tracked caps; nothing crowds it
  - the corner under the type is dark and quiet (check.mjs measures it)
  - one lead, recognisable in every shot (same hair, streaks, colours)
  - each scene is about its line: someone who has not read the line could guess its subject from the picture
  - the last shot answers the first (same image, changed: time passed, the lead turned, the light moved)

MUST NOT LOOK LIKE (keep)
  - a slideshow: text centred on a gradient, a stock photo, a quote card
  - a reuse of the reference video's or an example film's scenes, characters or lines for a different topic
  - soft 3D, gradients-as-style, glow and lens flare; airbrushed shading (cel shadow only, one step)
  - type over a busy bright patch; type that touches the frame edge; more than one quote on screen at once
  - a misattributed quote, an uncited quote, or a modern copyrighted translation
```

## The review rubric (score stills, not the code)

Render a contact sheet (`render.mjs film.html --sheet 24 --scale .5`) and ~12 full stills at random moments, plus one
still in the middle of every transition. A still passes only if **every** line is yes:

1. **Poster test** — would it hold as a printed poster with the type on it? Dense, flat colour, ink lines, pattern.
2. **Type** — a clear hierarchy (one big word, small italics, tracked caps), left third, nothing overlaps it, readable.
3. **Line ↔ scene** — the picture is about this line (the props and place say it), not a generic background.
4. **Lead** — on model: same hair, streaks, eyes, clothes; facing and moving the same way; feet on the ground.
5. **Body** — "is the neck turned or the torso?" never comes up; knees bend back, elbows forward (CAST.md).
6. **Depth** — near / middle / far layers move at different speeds; the camera is never dead still.
7. **Transitions** — mid-transition stills are interesting frames in themselves (sheets, shards, swirl, ink), not mush.
8. **Loop** — the first and last shots rhyme; the last frame could cut back to the first.

Write what failed next to the time code, fix, re-render that still. `check.mjs` must print only `ok` before the MP4.
