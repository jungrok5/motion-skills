# bounce-symphony

A Claude Code skill for **bouncing-ball symphonies**: a Rube Goldberg music machine on a dark studio floor, where balls drop
from trap-door droppers and bounce from pad to pad — marimba bars, glockenspiel keys, bowls, gongs, cymbals, drums on thin
poles — every bounce striking one note exactly on its beat, the struck pad glowing and rocking, each ball ending in a cup.
The machine is designed backwards from the score (each pad placed and tilted for a real ballistic flight) and proved by an
independent forward physics simulation; the sound is synthesised from the same strikes. Give it a topic or a piece and it
writes a brief, composes the music in lanes, designs the machine, the room and the shots, and renders a live page, a WAV
and a 1080p MP4. Code-only.

```bash
node bounce-symphony/scripts/new-piece.mjs my-piece --from lighthouse-lullaby   # or no --from: the template
cd my-piece
node ../bounce-symphony/scripts/check.mjs piece.html                    # solve + prove the machine → "check OK"
node ../bounce-symphony/scripts/render.mjs piece.html --sheet --scale .5  # out/piece-sheet.jpg
node ../bounce-symphony/scripts/render.mjs piece.html --preview           # out/piece-preview.mp4 (960×540, sound)
node ../bounce-symphony/scripts/render.mjs piece.html                     # out/piece.mp4 (1920×1080, 30 fps, sound)
```

Requirements: Node, Playwright Chromium, ffmpeg. No npm install, no GPU, no keys.

Source — made from Seung Joon Choi's film 「튕기는 공의 교향곡 (루브골드버그 머신 + 음악)」 on Facebook:
https://www.facebook.com/share/v/1DwMH4wj7u/ · Samples: https://jungrok5.github.io/motion-skills/bounce-symphony/
