# ink-summoning

A short cinematic "living ink" film made entirely in code: a masked summoner swings a giant calligraphy brush in a white
studio, every swing hangs a 3D ribbon of sumi-e ink in the air, and the ink becomes creatures — a tiger that charges the
lens, dragons that coil overhead, a final tableau. Canvas 2D with its own 3D projection, glossy-floor reflections,
bristle-level ink, motion blur and a synthesised taiko score; a live page and a 1920×1080 MP4. Give it a topic and it
casts the summoner and the creatures and writes the shots.

```bash
# from this folder
cd examples/dragon-tiger
node ../../scripts/check.mjs index.html                                  # prints ok … ok
node ../../scripts/render.mjs index.html --sheet 20 --scale .5 --q mb=1   # out/dragon-tiger-sheet.jpg
node ../../scripts/score.mjs score.js --dur 21.1 --out out/film.wav
node ../../scripts/render.mjs index.html --workers 4 --audio out/film.wav # out/dragon-tiger.mp4
python3 -m http.server 8000   # then open http://localhost:8000/ (live, ♪ for sound)

# a new film
node scripts/new-film.mjs ~/my-film     # template: fox mask · wolf · cranes (11 s)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU.

Built after the Seedance 2.5 clip and prompt by Ayesha on X (https://x.com/AyeshaEvie/status/2117456171053596757);
worked example: `examples/dragon-tiger` 「龍虎 · Dragon and Tiger」, samples: https://jungrok5.github.io/motion-skills/ink-summoning/
