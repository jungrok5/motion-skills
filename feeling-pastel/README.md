# feeling-pastel

One 16:9 picture drawn in JavaScript that looks hand-made in dry media (oil pastel, soft pastel, coloured pencil, Conté,
charcoal, wax crayon) and carries the feelings of a story without drawing anything from it. The brief turns each feeling
into weather, light, place and colour; 3–5 tools lay down every mark on simulated paper with real tooth. Renders to PNG
(up to 4K) and to an MP4 of the drawing being made in plain Node — no headless browser — and plays live on a page.

```bash
node feeling-pastel/scripts/new-piece.mjs my-piece                 # starter 「여름방학 마지막 밤」 (or --from held-breath)
# rewrite my-piece/BRIEF.md for your story, then my-piece/art.js
node feeling-pastel/scripts/render.mjs my-piece/art.js --stages --scale .5   # stage sheet → my-piece/out/
node feeling-pastel/scripts/check.mjs my-piece/art.js
node feeling-pastel/scripts/render.mjs my-piece/art.js --scale 2 --crops     # 3840×2160 + 100 % crops
node feeling-pastel/scripts/render.mjs my-piece/art.js --film --seconds 30   # the drawing being made (ffmpeg)
cd my-piece && python3 -m http.server                                      # piece.html draws it live
```

Requirements: Node 18+; ffmpeg for `--film` and `scripts/palette.mjs`.

Source: made from Kevin Ngo's X post sharing the prompt behind a JavaScript drawing —
https://x.com/kevin_t_ngo/status/2121303379196662115?a=kjK3494e60EqYhancfQ&s=19 — the method (feelings in, nothing
literal, 3–5 dry tools, human-drawn, every pixel, 90s anime colour), not the picture. Samples:
https://jungrok5.github.io/motion-skills/feeling-pastel/
