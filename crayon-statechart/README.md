# crayon-statechart

A process explained as a hand-drawn statechart that draws itself one step at a time: cobalt ink and crayon hatching on
cream paper, typewriter lettering, torn-ticket state boxes with small red second-language tags, red `[guards]` on the
branches, self-loops and back edges, parallel "at the same time" regions, crayon illustrations of the work beside the
chart, a camera that scrolls down the sheet, and a player bar with a numbered caption. Canvas 2D only; a live page and an
MP4. Give it a topic ("how kimchi is made", "the business of a boba shop") and it designs a new chart for it — brief,
chapters, states, guards, loops, steps and pictures — in the same style.

```bash
# from this folder
cd examples/kimchi
node ../../scripts/check.mjs index.html                     # prints ok … ok
node ../../scripts/render.mjs index.html --sheet 16 --scale .5   # out/kimchi-sheet.jpg
node ../../scripts/render.mjs index.html --workers 4        # out/kimchi.mp4 (1350×1080, 46 s)
python3 -m http.server 8000   # then open http://localhost:8000/ (live, the bar's buttons work)

# a new film: write BRIEF.md from the topic first (references/BRIEF.md), then film.html
node scripts/new-film.mjs ~/my-film               # template (a parcel's trip) + an empty BRIEF.md
node scripts/new-film.mjs ~/my-film --from kimchi # the example and its filled brief
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install.

Built after the statechart clips by Ann Nguyen (https://x.com/ann_nnng/status/2116811409921372642) and Kevin Ngo
(https://x.com/kevin_t_ngo/status/2116270190040416313) on X; worked example: `examples/kimchi` 「김장 · the making of
kimchi」, samples: https://jungrok5.github.io/motion-skills/crayon-statechart/
