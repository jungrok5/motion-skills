# trail-texture-world

Top-down pixel-art walks over ground that remembers — the **texture trail** trick from 2D games, all in code. One trail
texture records where the walker went (feet, body, ripples) and every terrain reads it in its own way: sand and snow keep
prints, reeds and grass bend and spring back, water rings out, leaves stay pushed aside, moss glows and fades, a road keeps
nothing. Give it a topic and it designs the grounds, the map, a weighted pixel walker and a route that cuts between the world,
a split view of the texture beside the world, and the texture alone. You get a walkable live page and a deterministic
1080p MP4 with footsteps synthesised per ground.

```bash
cp -r trail-texture-world /tmp/try && cd /tmp/try/trail-texture-world/examples/oasis-courier
node ../../scripts/check.mjs index.html                              # every line ok
node ../../scripts/render.mjs index.html --q map=1 --stills 0        # out/oasis-courier-map1-0.png (the route map)
node ../../scripts/render.mjs index.html --q sheet=cast --stills 0   # the cast sheet
node ../../scripts/render.mjs index.html --sheet 8                   # out/oasis-courier-sheet.png
node ../../scripts/render.mjs index.html                             # out/oasis-courier.mp4 (1920×1080, sound)
# a new piece: node <skill>/scripts/new-world.mjs my-walk  → fill BRIEF.md, then edit my-walk/index.html
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install.

Examples: `examples/oasis-courier` (*The Last Well*, a salt courier over dunes, a road, reeds and a well pool at noon) and
`examples/lantern-hollow` (*Lantern Hollow*, a child with a lantern over leaves, glowing moss, a creek and mud at night).
Samples page: https://jungrok5.github.io/motion-skills/trail-texture-world/

Source: made from https://x.com/asynkimo/status/2125001098087776442?a=44aj8xink6AcTDapx-c&s=19 (Kimo: "One texture remembers
where the player walked, and each terrain uses it in its own way"). Only the technique and the split-screen way of showing it
are borrowed; all code and designs here are this repo's own.
