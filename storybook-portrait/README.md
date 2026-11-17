# storybook-portrait

A character portrait in the contemporary picture-book style — matte gouache skin, dark dry-brushed hair with coloured
streaks and flyaway hairs, big round side-glancing eyes, tiny features low on an oversized head, red cheeks, a long neck,
crayon-textured patterned clothes and thin wobbling ink lines on white paper — painted entirely in JavaScript on a
canvas, with no image files. Give it a topic and it writes a brief, designs a new character for it (hair, clothes,
palette, a story detail, props in the same media), paints it stroke by stroke, then keeps it alive: breath, irregular
blinks, glances where the eyes lead and the head follows with a counter-move and overshoot, hair and earrings that lag.

```bash
cd examples/beekeeper
node ../../scripts/check.mjs piece.html                     # brief, determinism, style, body both ways, motion rules
node ../../scripts/render.mjs piece.html --cast             # → out/beekeeper-cast.png (turns, expressions, glances)
node ../../scripts/render.mjs piece.html                    # → out/beekeeper.png (1080×1350; --scale 2 for 2160×2700)
node ../../scripts/render.mjs piece.html --stages 6         # → out/beekeeper-stages.jpg (the drawing being made)
node ../../scripts/render.mjs piece.html --film             # → out/beekeeper.mp4 (painted, then alive; 17.5 s)
node ../../scripts/new-portrait.mjs ../../../my-portrait    # start your own (or --from dawn-baker)
```

Requirements: Node 18+ with Playwright's Chromium; ffmpeg for `--film`, `--stages` and `--sheet`. No network, no npm
install, no GPU. To watch a page live, serve the skill folder (`python3 -m http.server`) and open
`examples/beekeeper/piece.html` (`?cast` for the cast sheet, `?done` to skip the drawing; click to replay).

Topic in, character out: the topic is written as a brief first (`references/BRIEF.md`: who, the story detail, mass,
design, palette, beats), the character is data in `character.js` with topic-specific props as extras drawn with
`lib/paint.js`, the cast sheet is checked turned both ways, then the still is scored and `check.mjs` must pass.

Examples: `templates/` 「Rain Collector」 (the starter: a boy in a yellow raincoat counting raindrops),
`examples/beekeeper` 「The Beekeeper」 (grey curls, round glasses, a honey-dipper brooch, a bee her eyes follow; heavy and
slow), `examples/dawn-baker` 「Dawn Baker」 (an auburn bun, a navy apron, a red kerchief, flour on her face — and a yawn).

Made from the X post by Vamsi Batchu (@vamsibatchuk): https://x.com/vamsibatchuk/status/2121788887823778297?a=NmhF1v14IKYs7TtTVf4&s=19
— a reference illustration by @Artedeingenio turned into many subjects with pure code. This skill takes the method and
the style grammar; the reference picture and its character are not used, and every character here is this repo's own.
Live pages: https://jungrok5.github.io/motion-skills/storybook-portrait/
