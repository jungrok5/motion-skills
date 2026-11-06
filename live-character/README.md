# live-character

A character drawn in code that feels alive on a web page: it breathes unevenly, blinks (sometimes twice), follows the
pointer with its eyes first and its head after, turns with real parallax, lets hair, ears, tails and cords swing on
springs, and moves arms and legs inside joint limits. People (waist-up) and animals (a dog sitting, full body) on one
rig. Give it a topic and it designs a new character in this style; it plays live, renders a cast sheet and an MP4.

Made after https://x.com/yeko_L/status/2118290984924856713 (LivLiv Player, https://github.com/livliv-dev/player,
Apache-2.0): its idle and rig code was studied and the recipe re-implemented here for vector characters. No LivLiv
character art is used or imitated.

```bash
node live-character/scripts/check.mjs live-character/examples/bori        # prove the dog
node live-character/scripts/sheet.mjs live-character/examples/haru        # -> examples/haru/out/sheet.png
node live-character/scripts/render.mjs live-character/examples/bori       # -> examples/bori/out/demo.mp4
node live-character/scripts/new-character.mjs my-cat --from bori          # start a new one, then follow SKILL.md
cd live-character && python3 -m http.server 8000                          # http://localhost:8000/examples/haru/
```

Requirements: Node 18+, Playwright (Chromium) for check / sheet / render, ffmpeg for MP4.
Samples page: https://jungrok5.github.io/motion-skills/live-character/
