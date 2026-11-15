# pencil-dream-short

A drawing that draws its own world, in one take: a doodled hero in loose graphite — one thing on them in a single spot
colour — wakes on a blank sketchbook page, catches a pencil, draws the first mark, and the world spreads out from it while
the camera pulls back; a few huge strokes become a giant creature, its eyes are coloured in, the spot colour lifts off as
a swirling swarm, crayon colour blooms over the sky, and the camera pulls back to the sketchbook on a desk. Give it a
topic; it designs the hero, the world, the giant and the swarm. Everything is drawn in code on a Canvas (no image model),
with a synthesised score and pencil sounds derived from the strokes. Outputs a live page and a 1920×1080 MP4 at 24 fps.

```bash
node pencil-dream-short/scripts/new-film.mjs my-film --from keeper     # or without --from: the 16 s template
cd my-film
node ../pencil-dream-short/scripts/render.mjs cast.html --stills 0     # the cast sheet → out/cast-0.png
node ../pencil-dream-short/scripts/check.mjs film.html                 # must print ok
node ../pencil-dream-short/scripts/render.mjs film.html --sheet 16 --scale .5
node ../pencil-dream-short/scripts/score.mjs film.html --out out/film.wav
node ../pencil-dream-short/scripts/render.mjs film.html --workers 4 --audio out/film.wav   # → out/film.mp4
```

Requirements: Node, Playwright Chromium, ffmpeg.

Source — made from OscarAI's post on X: https://x.com/Artedeingenio/status/2119895981403894112?a=_9q1hjQOFazzyl1wwv0&s=19
(a 30 s clip of a pencil girl who draws a fantasy world). The worked example 「The Keeper's Whale」 is an original topic;
samples: https://jungrok5.github.io/motion-skills/pencil-dream-short/
