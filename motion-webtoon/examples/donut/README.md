# 「마지막 도넛」 — the worked example

A 74 s portrait motion webtoon in three scenes (`ep1-find` 24 s · `ep2-standoff` 26 s · `ep3-twist` 24 s): office, 3 PM, the
last donut, a polite standoff that escalates into a shōnen battle, and the intern who quietly eats it. Mono-manga finish with the
donut pink as the only colour, five people on the cast rig, a grave documentary narrator. Built in this repo (first under
`canvas-film/examples/donut`); live pages: https://jungrok5.github.io/motion-skills/motion-webtoon/demo/donut/

| file | what |
|---|---|
| `BRIEF.md` | the brief every agent worked from (story, cast, boards per scene) |
| `scenes/donut-cast.js` | the five people + office props — the file `lib/cast-rig.js` was extracted from (kept whole as the example) |
| `scenes/donut-manga.js` | the mono-manga finish as the film used it (`lib/manga.js` is the same with a settable accent) |
| `scenes/kit-webtoon.js`, `lib.js` | vendored kit and harness (as a project has them) |
| `scenes/cast-sheet.html` | the cast sheet: front / 3/4 / SD, faces, hands, props, effects, stone, the joint-check page (`?bones=1`, `?style=riso&grade=0`) |
| `scenes/<id>.html`, `script-<id>.js`, `<id>-art.js` / `-fx.js` | the scenes, their words and beats, scene-local drawings |
| `scenes/<id>.sound.json`, `scenes/audio/` | the sound specs and the ElevenLabs audio actually used; `audio/cuts.json` = how the narration was edited |

From this folder: `node ../../scripts/render.mjs v --scene ep2-standoff --stills 5,14.6,25` (needs the full webtoon fonts in
`$FONTS_DIR`), `python3 ../../scripts/mix.py`, `node ../../scripts/render.mjs v --scene ep1-find`, `python3 ../../scripts/assemble.py v`.
