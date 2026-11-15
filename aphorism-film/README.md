# aphorism-film

A 35–60 s film of famous lines on one topic: each shot sets a quote as white editorial type — a huge Didone word, small
italics, tracked caps, condensed poster caps, a tiny attribution — over a flat, ink-lined, pattern-heavy retro-pop anime
illustration made for that line, and the shots are joined by paper storms, cracking walls, paper vortices and ink
floods, ending on the image it began with so it loops. Give it a topic; it picks public-domain lines with checked
sources and designs the scenes, cast, transitions and score. Drawn entirely in code on an HTML Canvas, with bundled OFL
fonts and a synthesised score: one page plays live with sound and renders to a 1920×1080 MP4.

```bash
cd examples/time
node ../../scripts/render.mjs index.html --stills 5,19,26,33 --scale .5   # preview stills → out/time-5.png …
node ../../scripts/render.mjs index.html --sheet 24 --scale .5            # 24 moments → out/time-sheet.jpg
node ../../scripts/check.mjs index.html                                   # draws, deterministic, joints, quotes readable, score
node ../../scripts/score.mjs score.js --dur 43.5 --out out/time.wav       # the score → WAV
node ../../scripts/render.mjs index.html --workers 4 --audio out/time.wav # 43.5 s → out/time.mp4
node ../../scripts/bundle.mjs index.html                                  # one self-contained HTML → out/time.single.html
node ../../scripts/new-film.mjs ../../../my-film                          # start your own (or --from time)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (~0.11 s a 1080p frame on a CPU).
To watch a page live, serve its folder (`python3 -m http.server`) — it is an ES module; press ♪ for the score.

Example: `examples/time/` 「Time」 (43.5 s, 6 shots: a clock mural on a garden wall — Virgil → a wall of clocks that all
disagree — Franklin → a gallery of endless paintings — Hippocrates → a close-up before torn calendars, an hourglass —
Ovid → running under a setting sun — Horace → the mural again). Starter: `templates/` (12 s, Plato and Bacon).

Style after the video 852話 (hakoniwa) posted on X: https://x.com/8co28/status/2120410557295829430?a=xbg7-g3K3N-CB7eVhPE&s=19
— its quotes, scenes and characters are not used; the code, designs and music here are this repo's own.
Fonts: Playfair Display, Anton, Inter (SIL Open Font License, `lib/fonts/`).
Live pages: https://jungrok5.github.io/motion-skills/aphorism-film/
