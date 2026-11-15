# ultimate-move-short

A 30-second anime "ultimate move" showcase made entirely in code, in black, white and one accent colour: a lone
fighter in an empty white world, wet sumi ink dragged behind every move, slashes with red hairlines, impact frames and
hit-stop, then a sudden stillness, a domain of a thousand watchers opening across the sky, the watchers shattering into
the weapon, and one stroke that cuts the world in two along a red line — and white silence. Canvas 2D with its own 3D
projection (cameras orbit the fighter), a rigged cel-shaded fighter with trailing cloth and hair, a synthesised
percussion score; a live page and a 1920×1080 MP4. Give it a topic and it designs the fighter, the three powers, the
domain motif and the shots.

```bash
# from this folder
node scripts/check.mjs examples/thousand-moons/index.html                                   # prints ok … ok
node scripts/render.mjs examples/thousand-moons/index.html --sheet 32 --scale .5 --q mb=1   # out/thousand-moons-sheet.jpg
node scripts/score.mjs examples/thousand-moons/score.js --dur 30 --out out/film.wav
node scripts/render.mjs examples/thousand-moons/index.html --workers 4 --audio out/film.wav  # out/thousand-moons.mp4
python3 -m http.server 8000   # then open http://localhost:8000/examples/thousand-moons/ (live, ♪ for sound)

# the cast sheet (every fighter turned all the way round, every motif opening and cracking)
node scripts/render.mjs examples/cast/index.html --stills 1,3,5

# a new film
node scripts/new-film.mjs ~/my-film     # template: a mirror swordsman (11.9 s, 8 shots)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU.

Made from the post by 澜森 (@lansenai) on X — https://x.com/lansenai/status/2119397520833126441?a=IR20TU3t9a9k-Ql4AIg&s=19
(an AI clip and its prompt); worked example: `examples/thousand-moons` 「月蝕 · Thousand-Moon Eclipse」, samples:
https://jungrok5.github.io/motion-skills/ultimate-move-short/
