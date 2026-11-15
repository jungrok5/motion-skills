# landmark-map-3d

A Claude Code skill that turns a famous place into a short vertical film in the style of a cute 3D map: the real
neighbourhood from OpenStreetMap (every building, street, river, park and tree) as a soft toy city, a landmark built by
hand from its real dimensions, traffic, people and boats, map pins and street names, and a tilted map camera flying
from afternoon into a purple night. Output: a live page and a 1080×1920 MP4 with a synthesised score.

Made from Charly Delaroche's post on X — https://x.com/Nal_uh/status/2119508762298040469?a=AifzriFhkxBwD85fPCI&s=19
(the Anywhere map app: "doing the whole world in nice cute 3D"). Only the look is borrowed. Worked example:
`examples/eiffel` 「에펠탑」. Map data © OpenStreetMap contributors (ODbL).

## Quick start
```bash
# the worked example, offline
node landmark-map-3d/scripts/check.mjs  landmark-map-3d/examples/eiffel/index.html
node landmark-map-3d/scripts/render.mjs landmark-map-3d/examples/eiffel/index.html --stills 2,9,15 --scale .5 --out out

# a new place
node landmark-map-3d/scripts/new-film.mjs my-film --q "Big Ben, London" --size 1800x1800
node landmark-map-3d/scripts/place-map.mjs my-film/place.json          # see the data, read coordinates
#   write my-film/BRIEF.md, build the landmark and the timeline in my-film/film.html (see SKILL.md)
node landmark-map-3d/scripts/fonts.mjs  my-film/film.html
node landmark-map-3d/scripts/check.mjs  my-film/film.html
node landmark-map-3d/scripts/score.mjs  my-film/film.html --out my-film/out/score.wav
node landmark-map-3d/scripts/render.mjs my-film/film.html --audio my-film/out/score.wav --out my-film/out
```

Requirements: Node 18+, Playwright Chromium, ffmpeg; network once for the OSM data and fonts.

Samples: https://jungrok5.github.io/motion-skills/landmark-map-3d/
