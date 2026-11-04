# aesthetics-film

Chaptered 16:9 essay films about the beauty of a culture, a craft or an idea, made entirely in code: slow camera moves
through procedural three.js sets (ink mountains in a mist sea, curved-eave halls, paper lattice windows, bamboo, pines,
turned vessels, zithers, lanterns, bracket sets), numbered chapter badges, bilingual subtitles typed character by
character, callouts on objects, a synthesised score and a seal title card. Zero 3D assets, zero image files, no npm
install. Give it a topic and it writes the brief and the lines, designs the sets, objects and music for that topic, and
renders a 1920×1080 MP4 and a live page that plays with sound.

```bash
# from this folder
cd examples/korean-beauty
node ../../scripts/check.mjs index.html                          # chapters, shots, lines … check OK
node ../../scripts/render.mjs index.html --sheet 16 --scale .5   # out/film-sheet.jpg
node ../../scripts/score.mjs index.html                          # out/score.wav (read from the page)
node ../../scripts/render.mjs index.html --audio out/score.wav   # out/film.mp4 (1920×1080, 30 fps)
python3 -m http.server 8000   # then open http://localhost:8000/ (live, ▶ with sound)

# a new film
node scripts/new-film.mjs ~/my-film      # template: 「一盏灯 · A Lantern」 (2 chapters + card)
node scripts/fonts.mjs ~/my-film/film.html   # subset fonts for the film's text (after every text change)
```

Requirements: Node + Playwright Chromium, ffmpeg; the network once per text change for `fonts.mjs` (Google Fonts, OFL).

Made from LanFeng's X post https://x.com/YFeng2022/status/2117924044439712156 (《中国美学》, pure code, zero 3D assets,
Three.js + TypeScript + Vite, music synthesised in Python) — the grammar is studied, the film is not copied.
Worked example: `examples/korean-beauty` 「비움의 미학 · 한국의 미」;
samples: https://jungrok5.github.io/motion-skills/aesthetics-film/
