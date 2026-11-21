# printmade-scene

A 9–18 s living concept-art plate in a printmaking illustration style: one place drawn in the folded East-Asian view
(wall face on, floor laid flat, figures that never shrink), flat ragged inks with speckle, hatching and grain, a muted
palette with one crimson clue, tall thin long-faced people, a vertical place name in the corner — printed twice: an ink
roller re-prints the present as the past, then back, and the present returns changed. Everything is code; give it a
topic and it designs the place, its two printings, the cast and the beats, then renders a 1440×1080 MP4 with sound,
a poster still and a live page.

```bash
# the worked example 「폐교 운동장」 (an exterior with a child, 14 s)
cd printmade-scene/examples/schoolyard
node ../../scripts/check.mjs index.html                          # all checks pass
node ../../scripts/render.mjs index.html --sheet 12 --scale .5   # out/schoolyard-sheet.jpg
node ../../scripts/render.mjs index.html --cast                  # out/schoolyard-cast.png
node ../../scripts/render.mjs index.html --poster 12.5           # out/schoolyard-poster.png + .jpg
node ../../scripts/render.mjs index.html                         # out/schoolyard.mp4
python3 -m http.server   # → http://localhost:8000/index.html plays live (click for sound)

# a new scene from the starter (「문 닫은 이발소」, an interior, 13.4 s)
node printmade-scene/scripts/new-scene.mjs my-scene && cd my-scene   # then write BRIEF.md first
```

Requirements: Node 18+ with Playwright's Chromium, ffmpeg. No network, no npm install, no GPU.

Source: made from 전혜정 (@goevel)'s brunch post 「인디 게임을 만들자」 https://brunch.co.kr/@goevel/3 — the concept art
(by 김도윤) for the indie game 「마마」, in a printmaking style with East Asian painting's perspective, and the game's
present / past mechanic. Its look and form were studied; none of its art is included.
Samples page: https://jungrok5.github.io/motion-skills/printmade-scene/
