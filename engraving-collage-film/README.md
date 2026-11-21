# engraving-collage-film

A short film in a world made of engravings: every subject is drawn by an engraver in code (lines that swell with the
tone, crossing hatches in the shadows, line-screen skies), cut out and stood in 3-D as a flat card with a paper-lift
shadow; cel-painted characters, the only colour on screen, walk, run, jump and wave through it on key poses with
planted feet while the camera cranes and trucks. The frame is the making-of format — the 2.39:1 comp on top, the same
moment's 3-D breakdown underneath (checkerboard, layer-coloured card outlines, the camera frustum and path) — or the
comp alone. Give it a topic and it designs the world, the subjects, the characters and the shots.
three.js + Canvas, everything drawn in code, synthesised score and foley: one page plays live and renders to MP4.

```bash
cd examples/ice-voyage
node ../../scripts/render.mjs cast.html --cast                  # the cast sheet, both directions → out/cast.png
node ../../scripts/render.mjs index.html --shots --scale .5     # each shot at 15 / 50 / 85 % → out/ice-voyage-shot-*.png
node ../../scripts/check.mjs index.html                         # cast, sets, ink, colour, breakdown, determinism, camera, bodies, score
node ../../scripts/render.mjs index.html                        # the making-of (comp over breakdown) → out/ice-voyage.mp4
node ../../scripts/render.mjs index.html --view film            # the comp alone, 1920×804 → out/ice-voyage-film.mp4
node ../../scripts/new-piece.mjs ../../../my-film               # start your own (write BRIEF.md, engrave world.js, design cast.js)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU.
To watch a page live, serve its folder (`python3 -m http.server`); it is an ES module.

Starter: `templates/` 「시계탑 심부름」 (17.2 s): a clockmaker's apprentice in a teal jacket and a trailing mustard scarf runs
a brass key down a market street of engraved town-houses (two blocks hinge up out of the paving as he passes), stops
under the clock tower while the camera cranes to the clock, and waves a balloon by from the belfry ledge.
Worked example: `examples/ice-voyage/` 「얼음 항해」 (16.8 s): a girl in a cobalt parka walks out from a three-master frozen
into the pack ice, runs and jumps an open lead, and waves at the aurora at night — icebergs, a mountain range, the
lead and the aurora sky are new subjects engraved in the piece.

Technique and format after a making-of post by the motion designer Mysteropodes (@mysteropodes) for *Lucy Lost*
(Xilam Animation): https://x.com/mysteropodes/status/2123462687560757465?a=lPen3XtL3jzmaCrLGAY&s=19
The film's characters, city, shots and archive engravings are not used; the engraver, plates, characters and pieces
here are this repo's own. Live pages: https://jungrok5.github.io/motion-skills/engraving-collage-film/
