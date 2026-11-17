# The look, observed from the source

Observed from the 97 s launch film in the source post (an AI ad-making product, 1920 × 1080, 60 fps): this is the
grammar the skill keeps. Its product, mascot (a racing helmet), names, ads, people and footage are not part of the skill.

## Ground and light
- A bright, warm off-white ground; soft colour glows (two or three: the brand colour and a cool tint) sit behind the
  subject, drift slowly and breathe. No vignette, no dark scenes. A faint grain.
- Glass cards: white, slightly translucent, large radius, a hairline edge and long soft layered shadows.

## Type
- One grotesk, semibold, tight tracking, near-black. Headlines centred near the top, one accent-coloured word or number.
- Mono caps for meta: slider ends, "FROM SITE COPY", sources, ids. Tiny four-dot glyphs mark titles and chips.
- Numbers are big, tabular, and count up in place.

## Depth
- Pieces live at different depths; the focal plane is sharp, everything else is blurred by distance (depth of field),
  and fast movers smear (motion blur). Out-of-focus cards fill the edges of many frames.
- The camera always drifts (slow push-in); a scene never holds still.

## Devices
| device | what it is | in the kit |
|---|---|---|
| greeting | "Enter X, <name>" headline, mascot under it, an input bar being typed, a cursor clicks its button | `K.headline` `K.mascot` `K.input` `K.cursor` |
| status mascot | an object with a dot-matrix screen that says what is happening (name → working → ready → next) | `K.mascot({ say })` |
| stack | a pile of cards (brand kit: palette → tone → stats); the front one lifts off to show the next | `S.stack` |
| carousel | many cards on an arc turning past the camera; front sharp, sides tilted and blurred; a counter above | `S.carousel` + `K.headline({ n })` |
| highlighted quotes | review cards with a highlighter sweep over the key phrase, a coloured tag, "Saved to memory" chip | `K.quote` `K.tag` `K.chip` |
| spotlight row | three-to-seven cards in a row; one steps forward, the others sit back and tilt in; callouts around | `S.row` |
| chat | the agent's glass bubbles (avatar = small mascot) and the user's accent bubbles; older ones climb | `K.chat` |
| pair | before → after with a dotted connector and a label ("Same hook") | `S.add` × 2 + `K.link` |
| swarm | dozens of outputs pour from deep behind past the lens | `S.swarm` |
| ready bar | "All 30 are ready" in a bar with an accent button; the cursor clicks it | `K.input({ type: false, button })` + `K.cursor` |
| table | rows tick in with toggles turning on | `K.rows` |
| phone | outputs shown inside a phone frame | `K.phone` |
| result | paired bars, grey before and accent after, with values | `K.bars` |
| end | the mascot alone, its screen says the next state | `K.mascot` |

## Motion
- Everything arrives by moving: rise + unblur, pop with overshoot, fly in from depth, slide; and leaves by receding
  (back, blurred, faded) or by the camera flying through. No hard cuts between scenes.
- Springs: ~9 % overshoot, settled in half a second. Typing at a human pace with a blinking caret. Bubbles stream.
- Sound: soft UI clicks and ticks on every action, whooshes on hand-overs, a light synth bed.
