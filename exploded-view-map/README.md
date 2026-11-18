# exploded-view-map

A live web page — a planner with a contour map, a route, readouts, a sun slider, a toggle and a list of stops — that comes
apart in 3D through HTML-in-Canvas: the contour bands become stacked paper plates forming a terraced relief, the cards
float up like lecterns, the pins stand on stems, and the page's sun lights it with shadows marched through the plates. It
stays a working page while apart (type, drag the slider, press a stop). Give it a topic (a reef dive, a ski area, a
building's floors) and it designs the ground, palettes, cards, readouts, route and sound. One self-contained folder, no
network.

## Quick start
```bash
cd exploded-view-map
node scripts/check.mjs examples/reef-dive/index.html
node scripts/still.mjs examples/reef-dive/index.html --out out --act flat,apart,night
node scripts/new-page.mjs ../my-exploded-map            # or --from reef-dive
node scripts/check.mjs ../my-exploded-map/index.html
```
Open `index.html` in Chrome/Edge 157+ or the Claude desktop app (other browsers show the same page flat). Write
`BRIEF.md` first (`references/BRIEF.md`), then follow `SKILL.md`.

Requirements: Node + Playwright Chromium (the scripts turn on `--enable-blink-features=CanvasDrawElement`). No npm install,
no network, code-only (system fonts, synthesised sound).

Source — made from the "Exploded View" demo https://claude.ai/artifact/CBxLSFEFnojedyQW5L458v on Felix Rieseberg's
HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19 — all code, terrain, text and sound are
this skill's own.
