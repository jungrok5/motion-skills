# speedpaint-replay

A "making replay" of one illustration drawn entirely in code. A beige page shows a title, six stage chips (rough · line
art · flats · shadow · highlight · finish) and a canvas card, and a white stylus draws the piece in front of you. First
come blue construction lines, then tapered pen strokes, then base colours brushed in, multiply shadows on clipping
layers, highlights and rim light, and a finish of light, grade and bokeh. Give it a subject and it designs a new
picture (composition, character or object, palette, light) and draws it stage by stage, or give it your own drawing
and the replay draws toward it (reference mode). HTML Canvas with a bundled
Korean font (Pretendard, OFL) and no image files: one page plays live and renders to a 1080×1220 MP4.

```bash
cd examples/reference-ginkgo
node ../../scripts/render.mjs index.html --stages --scale .5        # end of each stage + finished → out/reference-ginkgo-stage-*.png
node ../../scripts/render.mjs index.html --sheet 24 --scale .5      # 24 moments → out/reference-ginkgo-sheet.jpg
node ../../scripts/check.mjs index.html                             # stages, items, no pops, stylus, determinism, body → out/reference-ginkgo-body.png
node ../../scripts/render.mjs index.html                            # 51 s film → out/reference-ginkgo.mp4 in ~30 s
node ../../scripts/new-piece.mjs ../../../my-piece                  # start your own from the starter (a piece drawn from a brief)
# reference mode: the replay draws toward a picture you give it
node ../../scripts/new-piece.mjs ../../../my-ref --from reference-mode
cd ../../../my-ref && node <skill>/scripts/from-image.mjs picture.png --out ref.js --debug out/ref   # look at out/ref/grid.png, write plan.json
node <skill>/scripts/from-image.mjs picture.png --plan plan.json --out ref.js --debug out/ref
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU (finished items are cached in
layers: about 25 ms a frame).
To watch a page live, serve its folder (`python3 -m http.server`); it is an ES module. Click a stage chip to jump to it.

Starter: `templates/` 「아침 커피」 (28 s): a mug on a saucer in morning light with window-frame shadows and steam.
Reference mode: `examples/reference-mode/` 「벚꽃 노을」 (51 s): the replay draws toward a picture the way a painter
would make it. The agent writes `plan.json` after looking at the picture (construction, a rough lasso per material,
the order of work); `from-image.mjs` measures the ink strokes and their widths, the exact material edges, the shadow
and light shapes (hard or soft), the blending and the detail strokes. Here the picture is an image generated with
ElevenLabs (prompt in its BRIEF.md). `examples/reference-ginkgo/` 「은행잎 저녁」 (51 s) is a second one from a
2048 px picture with clear line art: larger sources ink into longer, cleaner strokes.

Format after an X post by 余白とインク (@yohakutoink): https://x.com/yohakutoink/status/2120824797215310208?a=-D3pDsiFMNVDxo3e18k&s=19
Its portrait and character are not used; the code, drawings and designs here are this repo's own.
Font: Pretendard (SIL Open Font License, `lib/fonts/`).
Live pages: https://jungrok5.github.io/motion-skills/speedpaint-replay/
