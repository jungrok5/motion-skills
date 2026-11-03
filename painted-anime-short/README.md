# painted-anime-short

A short film in the look of a hand-painted anime feature — dawn skies with pink cloud bands, misty forests painted in
leaf flecks, mossy trunks and hanging vines, an overgrown and weathered hero in cel colours with ink lines, a bluebird,
light shafts and falling leaves, a warm faded film grade — drawn entirely in code on an HTML Canvas, with a synthesised
score. Give it a topic and it writes 6–9 shots in the genre's grammar (establish → approach → detail → witness → the turn
→ the lift → the big sky → the quiet return), paints the plates once and moves a multiplane camera over them. One page
plays live with sound and renders to a 1920×1080 MP4.

```bash
cd examples/last-tram
node ../../scripts/render.mjs index.html --stills 10,22,38 --scale .5   # preview stills → out/last-tram-10.png …
node ../../scripts/render.mjs index.html --sheet 24 --scale .5          # 24 moments → out/last-tram-sheet.jpg
node ../../scripts/check.mjs index.html                                 # clean load, every shot draws, deterministic, score
node ../../scripts/score.mjs score.js --dur 48 --out out/last-tram.wav  # the score → WAV
node ../../scripts/render.mjs index.html --workers 4 --audio out/last-tram.wav   # 48 s → out/last-tram.mp4
node ../../scripts/new-film.mjs ../../../my-film                        # start your own (or --from last-tram)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (~0.2 s a 1080p frame on a CPU).
To watch a page live, serve its folder (`python3 -m http.server`) — it is an ES module; press ♪ for the score.

Example: `examples/last-tram/` 「The Last Tram」 (48 s, 8 shots: dawn over the forest → an overgrown tram in a clearing → a
bluebird lands on its roof → the headlamp wakes → it shudders and lifts → out through the canopy → over the clouds → the
clearing, left to the bird). Look after a code-only film posted by Chetaslua on X
(https://x.com/chetaslua/status/2117169796290916732); everything here is this repo's own code and design.
Live pages: https://jungrok5.github.io/motion-skills/painted-anime-short/
