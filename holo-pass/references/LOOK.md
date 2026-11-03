# LOOK — anatomy of the pass

What makes it read as "a holographic ticket that came in the post". Check stills against this list.

## The card (1200 × 560 design px, `card.js`)
- **Shape**: rounded corners (r 18) and two half-circle notches (r 20) at the tear line, x = 880 on the front
  (x = 320 on the back, because flipping mirrors it). A dotted perforation runs between the notches.
- **Paper**: cream (`pal.paper`) with seven soft pastel blobs printed into it (the "iridescent stock"), a fine grain,
  and a thin inner border. This is what the foil tints; on its own it already reads as holographic paper.
- **Front, main part** (x 44 … 860): a date in spaced mono top-left, `No. ######` top-right; the picture in a white
  postage-stamp frame with a perforated edge (x 44, y 76, 480 × 380); a postmark in the accent colour overlapping its
  bottom-right corner; the **vertical title** — each line a column, letters' tops facing right, first line rightmost,
  sized to fill the window height (cap ~150 px); the subtitle as a thin column next to it (CJK stacked upright, Latin
  rotated); `ADMIT ONE · THEME · KEEP THIS PASS` microtext along the bottom.
- **Front, stub** (x 908 … 1172): the title small, `No.######` big in the accent colour, DATE / TIME, PLACE, ENTRY
  (label in 10.5 px spaced mono, value in 17 px semibold), a QR code to the invite on a white tile, TO / FROM, a star.
- **Back, a postcard**: on the stub side a tilted stamp with the same picture, a postmark with wavy cancel lines, a
  barcode and the number; on the letter side `POST CARD · THEME`, a greeting ("유키에게" / "Dear Alex," / "ゆきさんへ")
  in the handwriting face, the message on ruled lines (≤ 5), "— from" right-aligned, and a mono line with
  date · time · place · price.

## The foil (CSS layers over each face, masked to the card shape)
| layer | blend | what it does |
|---|---|---|
| `.hp-foil` | multiply, opacity .35 + tilt | a wide pastel rainbow that slides with the tilt — tints the paper, keeps ink dark |
| `.hp-shine` | screen | a narrower bright rainbow band that sweeps across with the tilt |
| `.hp-glitter` | color-dodge | a tiled sparkle texture that shifts at half speed — sparkles twinkle as it moves |
| `.hp-glare` | soft-light | a white radial highlight where the light hits |
The front's foil and glitter are dimmed over the picture (the mask is 40 % there) so the art stays readable.
`pose({ rx, ry, flip, z, light })` sets `--mx/--my` (light position), `--foil`, `--glit` and the drop shadow offset;
`light` adds a sweep on top (the timeline fires three).

## The envelope (`stage.js`, `holo.css`)
Four stage-level parts so the card can sit between them: the back (with a striped liner), the card, the front pocket
(a V cut out at the top: `clip-path: polygon(0 0, 50% 54%, 100% 0, 100% 100%, 0 100%)`), and the flap (a triangle that
rotates on `rotateX` about its top edge; past 90° it drops behind the card and shows the liner). The accent colour is
the envelope; a white label says "To <name>"; a stamp shows the picture; a round seal with a star sits on the flap tip.

## The reveal (14 s)
| t (s) | what happens |
|---|---|
| 0 – 0.9 | the background fades in; the envelope rises into place with a soft overshoot |
| 0.35 – 2.1 | `YOU'RE INVITED` + "<name>님에게 초대장이 왔어요" above it; the envelope bobs |
| 1.55 – 1.95 | the seal pops (scales up, spins, fades) |
| 1.8 – 2.5 | the flap opens |
| 2.45 – 3.5 | the pass rises out of the pocket, leaning back |
| 3.45 – 4.6 | it flies to the centre and grows (a little roll); a sparkle burst; the envelope drops away |
| 4.6 – 8.2 | it sways (≈ 9° × 16°); light sweeps at 5.3 and 7.2; glints around it |
| 8.2 – 9.1 | flips to the back, lifting toward the camera |
| 9.1 – 11.5 | the back sways |
| 11.5 – 12.4 | flips to the front again |
| 12.4 – 14 | sway, a last light sweep at 13.1 |
9:16: the same, with the card higher, the kicker back above it and the title / date / place below it from 4.4 s.

## Backgrounds
`night` (stars, two strings of blinking bulbs, snow) · `rays` (red sunburst, gold wave lines) · `warm` (dark amber,
drifting bokeh, confetti) · `dusk` (violet, stars, pink bokeh) · `confetti` (navy, lots of confetti). All end in a vignette.

## The pictures
Flat shapes filled from `pal.a`, one dark outline (`pal.line`, 4–5 px), a face (two eyes that blink every ~3 s, pink
cheeks, a smile), a background of rays / dots / sky, and 2–4 s of motion that loops forever (sway, bob to a beat,
blink in turn, steam, confetti, flicker). Keep the subject big and centred — on a phone the window is ~150 px wide.
