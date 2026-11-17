# pencil-live-action

A drawing walks out into the real world. A graphite pencil hero stands on a sketchbook on a real café table in a real
place; a real pencil, held just out of frame, draws them a way out standing up from the page; they walk off the paper and
down into the photographed world, where a drawing they touch turns into a real object — and a drawn frame turns the world
back to paper. One continuous take, rendered to a 1920×1080 MP4 and a live page with a synthesised score. The real half is
three.js with Poly Haven CC0 scans (HDRI light and backdrop, scanned ground, table and objects, a real lens); the drawing is
Canvas 2-D through the same camera and blur, casting real shadows. Give it a topic and it designs a new film in this style.

```bash
# the worked example, 「The Kite」 (30 s): fetch its scans once, then check, preview and render
node pencil-live-action/scripts/fetch-assets.mjs pencil-live-action/examples/kite
node pencil-live-action/scripts/check.mjs pencil-live-action/examples/kite/index.html
node pencil-live-action/scripts/render.mjs pencil-live-action/examples/kite/index.html --sheet 16 --scale .5
node pencil-live-action/scripts/score.mjs pencil-live-action/examples/kite/index.html
node pencil-live-action/scripts/render.mjs pencil-live-action/examples/kite/index.html --workers 3 --audio out/kite.wav

# a new film from the template (「The Apple」, 16.5 s) — then write BRIEF.md and redesign it for your topic
node pencil-live-action/scripts/new-film.mjs my-film
node pencil-live-action/scripts/fetch-assets.mjs my-film
cd my-film && python3 -m http.server 8000      # http://localhost:8000/film.html  (or ?cdn=1 without fetching)
```

Requirements: Node + Playwright Chromium, ffmpeg, curl (network once for the scans). No GPU needed.

Made after OscarAI's post on X — https://x.com/Artedeingenio/status/2122359802328207699?a=tNv0nx5KaAk-8vSz8XU&s=19
(「The Girl Who Drew a Door」, mixed-media pencil animation over live action). Scans: Poly Haven (CC0). Samples:
https://jungrok5.github.io/motion-skills/pencil-live-action/
