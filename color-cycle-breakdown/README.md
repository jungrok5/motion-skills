# color-cycle-breakdown

A pixel-art scene that lives by **colour cycling** — water, fire, light and stars move while no pixel moves; only the
palette rotates — and then pulls itself apart to show how: the layers fly apart as labelled planes, panels explain each
technique (fixed indices vs rotating colours, flow vectors, wind-rigged plants), and it all comes back together. Give it
a topic and it designs a new indexed scene and its breakdown, all from code. Output: a live HTML page and an MP4.

```bash
# from the folder that holds the skill
node color-cycle-breakdown/scripts/check.mjs color-cycle-breakdown/examples/lighthouse-cove     # all checks passed
node color-cycle-breakdown/scripts/render.mjs color-cycle-breakdown/examples/lighthouse-cove --shots   # out/lighthouse-cove-shots.jpg
node color-cycle-breakdown/scripts/render.mjs color-cycle-breakdown/starter                     # out/starter.mp4

# a new film
node color-cycle-breakdown/scripts/new-film.mjs my-film --title "Harbour at dawn"
#   fill my-film/BRIEF.md, paint my-film/film.js, then check / render as above
```

Requirements: Node + Playwright Chromium, ffmpeg (Python 3 only to serve a page: `cd my-film && python3 -m http.server`).

Made from @JungleSilicon's post — https://x.com/JungleSilicon/status/2126107723460907414?a=yo9l1g21bGwO0nwzfCw&s=19 — and
proven here on 「등대 포구의 밤」 (`examples/lighthouse-cove`) and 「Campfire」 (`starter`).
Samples page: https://jungrok5.github.io/motion-skills/color-cycle-breakdown/
