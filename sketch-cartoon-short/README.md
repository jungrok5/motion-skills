# sketch-cartoon-short

A short cartoon in an expressive, sketchy, unfinished hand-drawn style — rough overshooting pencil lines that boil, muted
sage / olive / dusty-teal colour laid on flat and a little off the line, toned paper everywhere, long-limbed characters
with big hair and acting faces, line-drawn towns that fade to bare pencil, scribble masses for dark things — drawn
entirely in code on an HTML Canvas, with a synthesised score and pencil / paper sound effects. Give it a topic and it
writes a brief, designs the cast and places for it, and animates 5–9 shots on twos. One page plays live with sound and
renders to a 1920×1080 MP4 at 24 fps.

```bash
cd examples/umbrella
node ../../scripts/check.mjs index.html                                    # clean load, every shot draws, deterministic, muted, boils
node ../../scripts/render.mjs cast.html --stills 0 --scale .5              # the cast sheet → out/cast-0.png
node ../../scripts/render.mjs index.html --sheet 24 --scale .5             # 24 moments → out/umbrella-sheet.jpg
node ../../scripts/score.mjs score.js --dur 35.5 --out out/umbrella.wav    # the score → WAV
node ../../scripts/render.mjs index.html --workers 4 --audio out/umbrella.wav   # 35.5 s → out/umbrella.mp4
node ../../scripts/new-film.mjs ../../../my-film                           # start your own (or --from umbrella)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. To watch a page live, serve its
folder's parent (`python3 -m http.server` in the skill folder, then open `examples/umbrella/`); press ♪ for the score.

Topic in, film out: the topic is first written as a brief (`references/BRIEF.md`), the cast is designed as data and
reviewed on its sheet, then the shots are written in the style's grammar (the page draws the world → something is taken →
the chase → the stunt → the dark thing → the turn → back on the blank page).

Example: `examples/umbrella/` 「The Runaway Umbrella」 (35.5 s, 8 shots: the page draws a boy, his dog and a red umbrella →
the wind tears it away → the chase down the street → the leap across the roofs → a scribble storm cloud swallows it on the
bridge → he leaps and catches it, it opens, the cloud bursts into sheets → he floats down over the town → back on the
page). Look after the clip posted by OscarAI on X (https://x.com/Artedeingenio/status/2117622425873736092, quoting
https://x.com/Artedeingenio/status/2117254123653321201); everything here is this repo's own code and design.
Live pages: https://jungrok5.github.io/motion-skills/sketch-cartoon-short/
