# logo-construction

A vertical "how this logo was built" film, drawn entirely in code. A rough grey marker sketch sits on a white
artboard; a cursor lays a construction grid over it — slanted parallels sharing one lean, copies dragged across,
horizontals, a few free lines, circles dragged out in a zoom with a size tooltip, an Align panel distributing a set —
then selects everything, fills the mark cell by cell with a shape builder, deletes the guides, rounds the corners,
shows the finished mark with a signature and wordmark, and cuts to mockups (fleece, bottle, business cards, blade sign,
tote). Every edge of the mark lies on a guide and every corner is a crossing of two. Give it a topic or a brand and it
designs a new mark — subject, lean, grid, shapes, colours, closing shots — and films its construction.
HTML Canvas with bundled fonts (Caveat, Inter, Pretendard — OFL) and synthesised sound: one page plays live and
renders to a 1080×1920 MP4.

```bash
cd examples/lighthouse
node ../../scripts/render.mjs index.html --mark                   # the grid, corners, small sizes → out/lighthouse-mark.png
node ../../scripts/render.mjs index.html --acts --scale .5        # end of each act + each mockup → out/lighthouse-act-*.png
node ../../scripts/render.mjs index.html --sheet 24 --scale .5    # 24 moments → out/lighthouse-sheet.jpg
node ../../scripts/check.mjs index.html                           # grid rule, legibility, facing, cursor, determinism …
node ../../scripts/render.mjs index.html                          # 44 s film with click-track sound → out/lighthouse.mp4 (~30 s)
node ../../scripts/new-piece.mjs ../../../my-mark                 # start your own (write BRIEF.md, design mark.js)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU.
To watch a page live, serve its folder (`python3 -m http.server`); it is an ES module.

Starter: `templates/` 「Ember Fox」 (45 s): a fox in stride on a 14° grid for a coffee roaster — fleece, bottle, cards.
Worked example: `examples/lighthouse/` 「North Pier」 (44 s): a striped lighthouse with beams over scalloped waves for a
ferry line — a mirrored taper instead of a lean, tiers distributed by the Align panel, wave circles copied across —
on a blade sign, a tote and a crew fleece.

Format after an X post by The Dr. Logos (@TheDoctorLogos), crediting designer graphicdesignpark:
https://x.com/TheDoctorLogos/status/2122343959577886904?a=I0lPjyIB7nKGbjj92uo&s=19
Its moose, signature and mockup photos are not used; the code, marks and scenes here are this repo's own.
Live pages: https://jungrok5.github.io/motion-skills/logo-construction/
