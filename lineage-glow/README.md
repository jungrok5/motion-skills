# lineage-glow

A 9:16 vertical explainer told by light moving along lines. One glowing node at the bottom is the subject. Thin gold
lines branch from it: a family tree that doubles every generation, a single line of descent, or a burst out to everyone.
A big counter steps as the numbers grow, far generations pack into bands under a glowing horizon, lines converge into
one point, and nodes switch off to grey and light again. Two-line Korean captions fade in at the top, and the film ends
on one light. Give it a topic; it designs the beats, shapes, captions, numbers and score. Drawn entirely in code on an
HTML Canvas with a bundled Korean font (Pretendard, OFL) and a synthesised score: one page plays live with sound and
renders to a 1080×1920 MP4.

```bash
cd examples/jesus-genealogy
node ../../scripts/render.mjs index.html --stills 20,57,90 --scale .5    # preview stills → out/jesus-genealogy-20.png …
node ../../scripts/render.mjs index.html --sheet 24 --scale .5           # 24 moments → out/jesus-genealogy-sheet.jpg
node ../../scripts/check.mjs index.html                                  # draws, rules, type readable, glyphs, deterministic, score
node ../../scripts/score.mjs score.js --dur 102 --out out/jesus.wav      # the score → WAV
node ../../scripts/render.mjs index.html --workers 4 --audio out/jesus.wav   # 102 s → out/jesus-genealogy.mp4
node ../../scripts/new-film.mjs ../../../my-film                         # start your own (or --from jesus-genealogy)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (~0.3 s a 1080×1920 frame on a CPU).
To watch a page live, serve its folder (`python3 -m http.server`); it is an ES module. Press ♪ for the score.

Example: `examples/jesus-genealogy/` 「예수님의 족보」 (102 s). It reads Matthew 1 downward as light, Abraham → David →
the exile → Jesus, with the counter showing Matthew's three sets of fourteen. Then it brackets the three sets, names the
five women, climbs Luke 3 to Adam and God, and opens from one person to all nations. Starter: `templates/`
「한 통의 전화」 (16 s: one person tells two, and 33 doublings pass 8.6 billion).

Style after an Instagram reel by kim__seo_han: https://www.instagram.com/reel/DfhYbCMyOKJ/?dlrf=MTJlaTA4NTJuenc4bg==
Its script, claims and numbers are not used; the code, designs and music here are this repo's own.
Font: Pretendard (SIL Open Font License, `lib/fonts/`).
Live pages: https://jungrok5.github.io/motion-skills/lineage-glow/
