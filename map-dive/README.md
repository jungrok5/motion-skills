# map-dive

A 3D map film of any place: the region floats on a pastel sky as a thick toy map slab — painted names, rivers and roads,
oversized landmark miniatures, pink clouds — and the camera dives into it, crossfading with a zoom blur into close-up
stages at other scales (a coast and its volcanic cone, a waterfall valley, a city grid around a landmark with a pin
label), rises back out, and can let the city fall into night before ending on the map at night. One three.js page per
film plays live and renders frame by frame to a 1920×1080 MP4, with a score generated from the film's own cues.

```bash
cd examples/jeju
node ../../scripts/render.mjs index.html --stills 2,9,19.5,28 --scale .5    # preview stills → out/jeju-2.png …
node ../../scripts/render.mjs index.html --sheet 8 --from 5.5 --to 6.8 --scale .5   # a dive, 8 moments
node ../../scripts/check.mjs index.html                                      # clean load, fonts, deterministic, rules
node ../../scripts/score.mjs index.html                                      # out/score.wav
node ../../scripts/render.mjs index.html --workers 4 --audio out/score.wav   # 30 s → out/jeju.mp4
node ../../scripts/new-film.mjs ../../../my-place                            # start your own (or --from jeju)
```

Requirements: Node + Playwright Chromium (WebGL2), ffmpeg; the network once for `fonts.mjs`. No npm install.
To view a page live, serve its folder (`python3 -m http.server`) — it is an ES module.

Example: `examples/jeju/` 「제주」 (30 s: Jeju Island as a floating map → dive to Seongsan Ilchulbong → rise → dive into Jeju
old town around Gwandeokjeong → night falls → the island at night). The template is a made-up region with a waterfall.
Source — made from Bruno César's #30DayMapChallenge post on X (a 3D map of Paraná, Brazil):
https://x.com/brunoclz/status/2118516873969156343?a=w1T37TSovDciCAuqSPU&s=19 — the form only; all code and places are this
repo's own. Samples page: https://jungrok5.github.io/motion-skills/map-dive/
