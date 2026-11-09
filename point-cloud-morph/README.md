# point-cloud-morph

A film made of one cloud of 100k–250k glowing points: it forms a 3D shape (a building, a ship, terrain, an animal, a
wordmark), holds it while the camera orbits, comes apart into a nebula and re-forms as the next shape, under a dark
instrument HUD (live YAW / PITCH readout, callouts pinned to 3D points, site chrome with headline copy). Shapes are
described in code — lines, faces, buildings, terrain, surfaces, any three.js mesh or GLB, text — and sampled into points.
Plain three.js in a browser page → a live page (drag to orbit, or scroll-scrubbed) + a synthesised score + a 1080p MP4.
Give it a topic; it designs the forms and the order they become each other.

```bash
cd point-cloud-morph/examples/deep-survey
node ../../scripts/check.mjs index.html                          # check OK
node ../../scripts/render.mjs index.html --forms --scale .5      # out/film-forms.jpg: each form from 4 sides
node ../../scripts/render.mjs index.html --sheet --scale .5      # out/film-sheet.jpg: every shot mid-morph, settled, end
node ../../scripts/score.mjs index.html --out out/film.wav       # the score
node ../../scripts/render.mjs index.html --audio out/film.wav    # out/film.mp4 (1920 × 1080, 30 fps, 27.9 s)

node ../../scripts/new-film.mjs ~/my-film                        # a new film from the template (Ridgeline)
```

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys.

Source: made from https://x.com/askwhykartik/status/2119452450583097368 (kartikey singh's reel of AI-built landing pages;
its first 8 s — a scanned building of points that bursts into a nebula and re-forms — is the style). Worked example:
`examples/deep-survey` 「Haldane Deep」; starting film: `templates/film.html`.
Samples: https://jungrok5.github.io/motion-skills/point-cloud-morph/
