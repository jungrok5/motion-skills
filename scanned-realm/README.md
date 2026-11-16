# scanned-realm

A place you can walk through in the browser, in a game-engine look, whose **surfaces and small objects are scans**.
It is the engine of [`living-realm`](../living-realm/) — one HTML file, no assets, everything generated — with that
condition lifted: the paving, wall stone, plaster, roofs, timber, paths, forest floor, rock and bark a place is made of
are photographed PBR materials at their real size, and its barrels, crates, stumps, a fallen trunk and a fire pit are
photogrammetry models, all CC0 from [Poly Haven](https://polyhaven.com). They go through the same deferred WebGL 2
renderer as everything the code still builds (land, buildings, trees, grass, sky, weather, light, sound): the hour runs
from dawn to night, rain darkens the scanned stone and fills puddles on it, winter lays snow on the scanned roofs.
Give the skill a topic and it designs a new place in this style — the plan, the buildings from parts, **the list of
scans that place is made of**, the plants, the walk.

```bash
# the worked example: 은여울 마을 (Silverford), with 15 scanned surfaces and 6 scanned objects
node scanned-realm/scripts/fetch-assets.mjs scanned-realm/examples/village   # assets.json → assets/ (57 MB from Poly Haven; not in the repo)
node scanned-realm/scripts/build.mjs  scanned-realm/examples/village         # → examples/village/index.html
(cd scanned-realm/examples/village && python3 -m http.server 8000)           # open http://localhost:8000 — not file://
node scanned-realm/scripts/check.mjs  scanned-realm/examples/village         # loads clean · every scan arrived · can be walked · every state reads
node scanned-realm/scripts/render.mjs scanned-realm/examples/village --mats            # → out/mats.jpg: every material layer
node scanned-realm/scripts/render.mjs scanned-realm/examples/village --views           # → out/<view>.jpg
node scanned-realm/scripts/render.mjs scanned-realm/examples/village --sheet --scale .5   # every view × day, dusk, night, rain, snow
node scanned-realm/scripts/build.mjs  scanned-realm/examples/village --cdn --out realm.html   # one file that reads the scans from Poly Haven's server

# a realm of your own
node scanned-realm/scripts/new-realm.mjs my-realm           # from the starter (Tarn Cabin); write BRIEF.md and assets.json first
node scanned-realm/scripts/fetch-assets.mjs my-realm && node scanned-realm/scripts/build.mjs my-realm && node scanned-realm/scripts/check.mjs my-realm
```

On the page: **W A S D / arrows** walk · **Q E / ← →** turn · mouse or touch looks · **Shift** runs · **1–4** dawn, day,
dusk, night · **5–7** clear, rain, winter · **T** the automatic round · **C** the tour · **G** quality · **M** sound ·
**P** numbers. Options: `?scan=0` (the generated recipes only, to compare), `?q=low|medium|high|ultra`, `?tod=19.5`,
`?wx=rain`, `?tour=0`.

Requirements: Node 18+ with Playwright Chromium, `curl`, ffmpeg (sheets and films), and the network when fetching.
The page needs WebGL 2 and wants a GPU; without one, stills render on the CPU at 1–4 minutes each. three.js r170 is
vendored (MIT, `vendor/LICENSE`).

What it is and is not: scanned surfaces on generated geometry. Buildings, land, trees and grass are still built by
code; scanned plants and trees are not carried (the world draws opaque objects only); light is screen-space; the page
loads 33–57 MB of scans once. `references/LOOK.md` says where the look stops, `references/ASSETS.md` how scans are
chosen, fitted and shipped, and which were tried and dropped.

Source — the look asked for is the post by Rez (@RezAIT00) on X:
<https://x.com/RezAIT00/status/2120498246426706176?a=CUYTAAEWhBIL6PS4ZPk&s=19> (a clip of an Unreal Engine forest and
meadow; no code or assets were published). The engine was first built for `living-realm` and raised against two more
references the owner gave — 「Larkhollow」 by @lucian__03, <https://claude.ai/artifact/D8t6NHbpDJXtCovZU6KADP>, and
「Saltline」, <https://claude.ai/artifact/BGY1SztrAYcJQHSsnHHGmp> — none of whose code is here. The scans are from
Poly Haven, <https://polyhaven.com>, CC0: fetched per realm, credited in each realm's `assets/CREDITS.md`, never
committed. The workflow is in [SKILL.md](SKILL.md).
