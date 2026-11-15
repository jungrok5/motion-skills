# kinetic-type-collage

A kinetic typography collage short: a film cut on every beat where huge black letters (Hangul and Latin) are the
scenery the camera whips through, 3D objects tumble in front of and behind the words, die-cut signs and striped
swatches pile on top, and red labels, bracketed asides and squeezed letters keep the frame dense — paper white, black
ink, at most three primary accents. Type is cut from distance fields (sharp at any size, real depth against the
objects); props are designed in code for the topic. Plain three.js in a browser page → a live looping page + a
synthesised beat + an MP4. Give it a topic, a lyric, a recipe or a slogan; it writes the brief, the lines, the props
and the shot list.

```bash
cd kinetic-type-collage/examples/ramyeon
node ../../scripts/check.mjs index.html                          # check OK
node ../../scripts/render.mjs index.html --props --scale .4      # out/film-props.jpg: each prop from 4 sides
node ../../scripts/render.mjs index.html --sheet --scale .4      # out/film-sheet.jpg: every shot
node ../../scripts/score.mjs index.html --out out/film.wav       # the beat
node ../../scripts/render.mjs index.html --audio out/film.wav    # out/film.mp4 (1350 × 1080, 30 fps, 14.1 s)

node ../../scripts/new-film.mjs ~/my-film                        # a new film from the template (「커피 먼저」)
```

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys.

Source: made from https://x.com/manwon_man/status/2120126792552075760?a=3V9KnKatoYSIYnqo_y4&s=19 (만원만's post of a
kinetic-typography film by @mosyenboy, shown in its After Effects project; the picture in the viewer is the style, the
After Effects side is not part of this skill). Worked example: `examples/ramyeon` 「라면 4분 30초」; starting film:
`templates/film.html`.
Samples: https://jungrok5.github.io/motion-skills/kinetic-type-collage/
