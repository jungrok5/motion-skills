# fold-out-map

A fold-out travel map film: a folded paper leaflet on a wooden desk opens over its cross fold and fans out into a
printed city map; a low camera follows a red route that draws itself from stop to stop while painted die-cut pop-ups of
each landmark spring up out of the paper beside tent label cards, and the light turns from day to golden hour to night.
One three.js page per film plays live and renders frame by frame to a 1080×1920 MP4 with a score made from its own cues.
Code only: every landmark is drawn in code.

```bash
cd examples/busan
node ../../scripts/render.mjs index.html --stills 1,10,24.5,29.5 --scale .5   # preview stills → out/busan-1.png …
node ../../scripts/render.mjs index.html --sheet 12 --from 1 --to 7 --scale .4  # the unfold, 12 moments
node ../../scripts/check.mjs index.html                                          # clean load, fonts, deterministic, rules
node ../../scripts/score.mjs index.html                                          # out/score.wav
node ../../scripts/render.mjs index.html --workers 4 --audio out/score.wav       # 38 s → out/busan.mp4
node ../../scripts/new-film.mjs ../../../my-trip                                 # start your own (or --from busan)
```

Requirements: Node + Playwright Chromium (WebGL2), ffmpeg; the network once for `fonts.mjs`. No npm install.
To view a page live, serve its folder (`python3 -m http.server`) — it is an ES module.

Example: `examples/busan/` 「부산」 (38 s: the leaflet unfolds → Gamcheon Culture Village → Taejongdae → Haeundae →
Haedong Yonggungsa at golden hour → Gwangan Bridge at night → the whole map at night on the desk). The template is a
made-up harbour town with three stops.
Source — made from 沐阳 (@yyyole)'s post on X (a Three.js unfolding travel map of Chengdu):
https://x.com/yyyole/status/2125234904992776492?a=NGnIQg0wBl6JEjDN2Fw&s=19 — the form only; all code, art and places are
this repo's own. Samples page: https://jungrok5.github.io/motion-skills/fold-out-map/
