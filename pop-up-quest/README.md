# pop-up-quest

Interactive pop-up storybook quests in three.js. Give it a topic and it designs a journey: a hardback open on a
tablecloth, one chapter per spread, each spread a cardstock pop-up set that stands up as the page opens and folds flat
onto the turning leaf. A paper-cut hero walks in on every page, a guide points at the chapter's prop, and the reader
pokes it to solve a small task that makes the set move and stamps a fold-out map. A scripted tour bakes to a 16:9 MP4.

## Quick start
```bash
cp -r pop-up-quest /tmp/try && cd /tmp/try
python3 -m http.server 8000      # open http://localhost:8000/examples/packet-post/  (add ?tour to watch the film)
node scripts/check.mjs examples/packet-post/index.html
node scripts/render.mjs kit/cast.html out/cast --stills 0 --size 1600x1300 --query book=../examples/packet-post/book.js
node scripts/render.mjs examples/packet-post/index.html out/stills --stills 3.6,9.5,12.2,39.4
node scripts/new-book.mjs my-book --title "The Seed Post" --chapters "Frost Gate,Root Cellar,Sun Ledge" --hero rabbit
```

Requirements: a WebGL browser; Node 18+, Playwright + Chromium and ffmpeg for checks and renders.

Worked example: `examples/packet-post/` — The Packet Post, how a web page reaches you (DNS, the TCP handshake, HTTP,
packets, rendering), with Quill the pigeon courier and five guides.

Source (what this skill was made from): https://x.com/johnlindquist/status/2123569842204897753?a=m59DB6YHNHs76FeIjyQ&s=19
(John Lindquist's "The Folded Atlas", made with Astra and pvncher's "svg + 3d design" skill; live at
https://rosy-wisdom-dw86.here.now/). The engine, puppets, sets and book here are new code.
