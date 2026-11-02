# pop-up-textbook

Interactive 3D textbooks in three.js: an open book on a desk under a banker's lamp, one lesson per spread. The left page
is typeset from data (formula, key words, a predict question, a lift-the-flap answer); the right page carries a pop-up
diorama drawn as an ink engraving with hatching, which the reader pokes while it animates the science. Pages turn with a
curling leaf, a loupe magnifies the page, and a scripted cursor tour bakes to a 1920×1080 MP4.

## Quick start
```bash
cp -r pop-up-textbook /tmp/try && cd /tmp/try
python3 -m http.server 8000      # open http://localhost:8000/examples/electricity/  (or /examples/sky/, add ?live to skip the tour)
node scripts/render.mjs examples/electricity/index.html /tmp/try-stills --stills 3,9.5,13,17,26.5
bash scripts/render-chunked.sh examples/electricity/index.html out/electricity.mp4 6 4 22
```

Requirements: Node 18+, Playwright + Chromium, ffmpeg.

Reference: `examples/electricity/` recreates in code the "Mains and the plug" lesson of an interactive 3D physics book
shown in a screen recording on X, plus two new lessons; `examples/sky/` (seasons, phases of the Moon) is a different
subject on the same kit.
