# light-pass

Art-directed sunlight laid over another piece: shafts through trees, windows or slats, light pooling on the ground, a halo
and a grade. A compositor would mask every beam by hand in After Effects; here each beam, pool and grade is a number in a
plan, drawn by WebGL 2 over a canvas (live, every frame), an MP4 or a still. Use it as an effect inside other work.

Made from [@manwon_man's post on X](https://x.com/manwon_man/status/2124697362719453604?a=qHwbQc4rVBlcbntyv64&s=19) (an After
Effects before/after of masked light beams in a forest). Samples: https://jungrok5.github.io/motion-skills/light-pass/

## Quick start

```bash
cd light-pass
node scripts/check.mjs examples/forest-path examples/walker-clearing examples/snow-cabin --sheet out/sheet.jpg   # check OK
node scripts/apply.mjs examples/forest-path/input.jpg examples/forest-path/plan.json out/forest-lit.jpg
node scripts/apply.mjs examples/forest-path/input.jpg examples/forest-path/plan.json out/forest-mask.jpg --view mask
python3 -m http.server 8000      # http://localhost:8000/examples/live/ — a forest drawn in code, lit live; drag the sun
```

Light a video (sound kept): `node scripts/apply.mjs shot.mp4 plan.json out/shot-lit.mp4 [--from 2 --to 6]`.
In a page: `const lp = LightPass.create(overlayCanvas); /* after each frame of your piece */ lp.draw(pieceCanvas, plan, t);`

`SKILL.md` has the workflow (brief → plan in the mask view → check → into the piece) and `references/PLAN.md` every field.

Requirements: a browser with WebGL 2; offline, Node 18+, Playwright's Chromium and ffmpeg. No GPU needed.
