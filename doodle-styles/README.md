# doodle-styles

Pick a hand-drawn style from 32 — pencil & watercolour, ukiyo-e woodblock, risograph, sumi-e, pixel art, embroidery,
toy brick and more — and keep reusing it. You describe a subject once (regions, one light, cast shadows); any hand draws
it in its own medium as a still and as a film of the picture being drawn in that medium's order. Save the hand as your
studio's house style and every next picture arrives in the same hand.

Made from **anidoodle** — https://github.com/alexgreensh/anidoodle (Apache-2.0, by Alex Greenshpun): each hand was
studied from its style recipe and re-implemented here for a shared scene model (no anidoodle code is copied or run).

```bash
# see a subject in every hand, then pick one as the house style
node doodle-styles/scripts/sheet.mjs doodle-styles/examples/persimmons --all
node doodle-styles/scripts/styles.mjs list
# start a studio and a piece, save the hand, render
node doodle-styles/scripts/new-piece.mjs my-studio/pear --format 4x5 --title "배 한 알"
node doodle-styles/scripts/styles.mjs pick woodblock --studio my-studio
node doodle-styles/scripts/render.mjs my-studio/pear --still --at 0.3,0.7   # out/woodblock.png + two drawing moments
node doodle-styles/scripts/render.mjs my-studio/pear --film                 # out/woodblock.mp4: the drawing film
node doodle-styles/scripts/check.mjs my-studio/pear
# the next picture reuses the hand with no extra step
node doodle-styles/scripts/new-piece.mjs my-studio/kettle
```

Open a piece's `index.html` through any static server to watch it draw itself and switch hands live (`?style=risograph`).

Requirements: Node 18+, Playwright with Chromium, ffmpeg (for MP4).
Examples: `examples/persimmons` (감 세 알, a still life) and `examples/kettle` (저녁 주전자, made from its brief, with steam that keeps rising).
Samples page: https://jungrok5.github.io/motion-skills/doodle-styles/
