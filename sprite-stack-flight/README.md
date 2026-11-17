# sprite-stack-flight

Pixel-art flight pieces drawn with **sprite stacking**, with no 3D engine, no polygons and no image files. Give it a topic and
it designs a craft as a voxel model cut into slices, a terraced world drawn as stacked layers and vertical stripes,
stacked-disc clouds, the craft's own cockpit, and a flight plan cut between overhead, chase and cockpit views. You get a live
page you can fly and a deterministic 1080p MP4 with synthesised engine and wind sound.

```bash
cp -r sprite-stack-flight /tmp/try && cd /tmp/try/sprite-stack-flight/examples/canyon-biplane
node ../../scripts/check.mjs index.html                              # every line ok
node ../../scripts/render.mjs index.html --sheet 8                   # out/canyon-biplane-sheet.png
node ../../scripts/render.mjs index.html --q map=1 --stills 0        # the plan map
node ../../scripts/render.mjs index.html                             # out/canyon-biplane.mp4 (1920×1080, sound)
# a new piece: node <skill>/scripts/new-flight.mjs my-flight  → fill BRIEF.md, then edit my-flight/index.html
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install.

Examples: `examples/canyon-biplane` (*Dust Mail*, a mail biplane over desert mesas at golden hour) and
`examples/fjord-airship` (*The Winter Post*, an airship up a fjord at blue hour). Samples page:
https://jungrok5.github.io/motion-skills/sprite-stack-flight/

Source: made from https://x.com/meta_pavy/status/2122241297482408234?a=yknJyWI6foguElHQBnI&s=19, which shares
https://x.com/creativedash/status/2122000830895386680 (live demo: https://remix.ui8.ai/fly). Only the technique and the
three-camera format are borrowed; all code and designs here are this repo's own.
