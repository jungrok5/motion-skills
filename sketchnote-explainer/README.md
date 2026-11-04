# sketchnote-explainer

A knowledge explainer drawn live, as if on an iPad: a white stylus sketches one picture per beat on warm cream paper —
faint construction lines, a dark pencil line, flat watercolour set a little off the line, handwritten labels with a
second-language line, red arrows and numbers — while a two-line subtitle card says the beat and the camera glides from
drawing to drawing; at the end it pulls back to the whole sheet, a finished infographic with a highlighted title. Canvas 2D
only, with a felt-piano bed and pencil sounds synced to every stroke; a live page and an MP4 (16:9, 3:4 or 9:16). Give it a
topic ("how honey is made", "the water cycle") and it designs a new board for it — brief, beats, drawings and the final
sheet — in the same style.

```bash
# from this folder
cd examples/honey
node ../../scripts/check.mjs index.html                       # prints ok … ok
node ../../scripts/render.mjs index.html --sheet 16 --scale .5  # out/honey-sheet.jpg
node ../../scripts/render.mjs index.html --workers 4          # out/honey.mp4 (1920×1080, 69 s, with sound)
python3 -m http.server 8000   # then open http://localhost:8000/ (live; click once for sound)

# a new film: write BRIEF.md from the topic first (references/BRIEF.md), then film.html
node scripts/new-film.mjs ~/my-film                # template (the water cycle, 3:4) + an empty BRIEF.md
node scripts/new-film.mjs ~/my-film --from honey   # the example and its filled brief
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install.

Made from the clip shared by Eian on X (https://x.com/EianLu/status/2117672988678209948), Lemomo's "iPad Sketch Explainer"
(https://x.com/lemomo_ai/status/2117670248275186162); worked example: `examples/honey` 「From Flower to Honey · 꽃에서
꿀까지」, samples: https://jungrok5.github.io/motion-skills/sketchnote-explainer/
