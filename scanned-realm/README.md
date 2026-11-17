# scanned-realm

A place you can walk through in the browser, in a game-engine look, whose **surfaces, objects, ground plants,
leaves — and some of its trees and structures — are scans**. It is the engine of [`living-realm`](../living-realm/) — one HTML file, no assets, everything
generated — with that condition lifted: the paving, wall stone, plaster, roofs, timber, paths, forest floor, rock and
bark a place is made of are photographed PBR materials at their real size; its barrels, tables, baskets, pots, tools,
the fruit and bread on its stalls, its boulders and rock faces are photogrammetry models, **instanced, with levels of
detail made at load and chosen by how wide their triangles are on screen**; its ferns, nettles, docks and flowers are
scanned cut-out plants; **whole scanned trees, saplings and shrubs** stand among its generated ones (seven levels of
detail made at load; a phone is not sent them); **kits of scanned structures** — a fort's walls, gate and round tower,
a pier, a wrought-iron gate — are set out piece by piece and can be walked through; and the leaves on its generated
trees are painted from photographed leaves and twigs — all CC0 from [Poly Haven](https://polyhaven.com). They go through the same deferred WebGL 2 renderer as everything the code
still builds (land, buildings, the trees' wood, grass, sky, weather, light, sound): the hour runs from dawn to night,
shadows widen with the distance to what throws them, rain darkens the scanned stone and fills puddles on it, winter
lays snow on the scanned roofs, lays the ferns down and strips the scanned trees; on the tour a lens keeps what the
eye looks at sharp and lets the rest go soft; the ground does not show its tile.
Give the skill a topic and it designs a new place in this style — the plan, the buildings from parts, **the list of
scans that place is made of**, the plants, the walk.

```bash
# the worked example: 은여울 마을 (Silverford), with 18 scanned surfaces, 58 scanned models and 3 leaf atlases
node scanned-realm/scripts/fetch-assets.mjs scanned-realm/examples/village   # assets.json → assets/ (254 MB from Poly Haven; not in the repo)
node scanned-realm/scripts/build.mjs  scanned-realm/examples/village         # → examples/village/index.html
(cd scanned-realm/examples/village && python3 -m http.server 8000)           # open http://localhost:8000 — not file://
node scanned-realm/scripts/check.mjs  scanned-realm/examples/village         # loads clean · every scan arrived and baked · can be walked · every state reads · what the scans cost a view
node scanned-realm/scripts/render.mjs scanned-realm/examples/village --mats            # → out/mats.jpg: every material layer
node scanned-realm/scripts/render.mjs scanned-realm/examples/village --views           # → out/<view>.jpg
node scanned-realm/scripts/render.mjs scanned-realm/examples/village --sheet --scale .5   # every view × day, dusk, night, rain, snow
node scanned-realm/scripts/render.mjs scanned-realm/examples/village --phone           # → out/phone.jpg: what a phone shows (its canvas, tier and scale)
node scanned-realm/scripts/build.mjs  scanned-realm/examples/village --cdn --out realm.html   # one file that reads the scans from Poly Haven's server

# a realm of your own
node scanned-realm/scripts/new-realm.mjs my-realm           # from the starter (Tarn Cabin); write BRIEF.md and assets.json first
node scanned-realm/scripts/fetch-assets.mjs my-realm && node scanned-realm/scripts/build.mjs my-realm && node scanned-realm/scripts/check.mjs my-realm
```

On the page: **W A S D / arrows** walk · **Q E / ← →** turn · the mouse looks (click to capture) · **Shift** runs ·
**Space** hops · on a phone the **left thumb** is a stick and the **right thumb** looks · a **gamepad** walks with its
left stick and looks with its right · **1–4** dawn, day, dusk, night · **5–7** clear, rain, winter · **T** the automatic
round · **C** the tour · **L** the lens while you walk (the tour always has it) · **G** quality · **M** sound · **P**
numbers. The walk is a first-person eye: there is no body
to see. It starts at once on the generated place and the scans arrive while you walk. Options: `?scan=0` (the generated
recipes only, to compare), `?stream=0` (wait for every scan first), `?prof=1` (milliseconds a pass, measured by the
graphics card), `?dof=0` (no lens), `?heavy=0` (without the whole trees), `?q=low|medium|high|ultra`, `?fps=60` (a phone holds
thirty frames a second and spends the rest on pixels; this asks for sixty), `?tod=19.5`,
`?wx=rain`, `?tour=0`.

Requirements: Node 18+ with Playwright Chromium, `curl`, ffmpeg (sheets and films), and the network when fetching.
The page needs WebGL 2 and wants a GPU; without one, stills render on the CPU at 1–4 minutes each. three.js r170 and
meshoptimizer's simplifier are vendored (both MIT, `vendor/LICENSE`, `vendor/LICENSE-meshoptimizer.md`).

What it is and is not: scanned surfaces, objects, plants and leaves on generated land and houses, with a few whole
scanned trees and kits of scanned structures among them. The forest is still the engine's trees (the library's big
firs and pines are 7–17 million triangles and 465–914 MB each: not for a browser) and the houses are still built from
parts (the library has a fort, a pier and gates, no houses); levels of detail are a few simplified copies a model,
not Nanite; light is screen-space, not Lumen; 63–254 MB of scans arrive while you walk (41–149 MB on a phone, which
is not sent the trees). **Megascans is not used and cannot be**: it has
been free on Fab since late 2026, but its licence forbids serving the raw files from a public page and fetching them by
script — stills rendered with it would be fine, a page that serves it is not. `references/LOOK.md` says where the look
stops, `references/ASSETS.md` how scans are chosen, fitted and shipped, which were tried and dropped, and the licence
table; `references/PERF.md` what a frame costs and how to measure it.

Source — the look asked for is the post by Rez (@RezAIT00) on X:
<https://x.com/RezAIT00/status/2120498246426706176?a=CUYTAAEWhBIL6PS4ZPk&s=19> (a clip of an Unreal Engine forest and
meadow; no code or assets were published). The engine was first built for `living-realm`. The scans are from
Poly Haven, <https://polyhaven.com>, CC0: fetched per realm, credited in each realm's `assets/CREDITS.md`, never
committed. The workflow is in [SKILL.md](SKILL.md).
