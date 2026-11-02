# cinematic-3d

Short cinematic 3D shots in the look of stylised renders — rain on a night street, a snowed-in avenue at blue hour, a skyline
sinking into fog, golden hour in a puddle — built from simple shapes in three.js and carried by one photographic pipeline:
wet reflections, height fog and lamp halos, raymarched clouds, self-defocusing rain and snow, depth of field, bloom, AgX,
grade and film grain. Each shot is a browser page; the renderer writes 1080×1920 MP4s frame by frame and joins them into a
film with dissolves and an ambient sound mix.

```bash
cd examples/four-weathers
node ../../scripts/render.mjs shots/rain.html --stills 3 --scale .5   # a preview still → out/rain-3.png
python3 ../../scripts/contact.py shots/*.html --times 0,3.5,7          # every shot at start/middle/end → out/contact.jpg
node ../../scripts/film.mjs                                            # render all shots + join → out/film.mp4
node ../../scripts/new-film.mjs ../../../my-film --shots dusk,rain     # start your own
```

Requirements: Node + Playwright Chromium (WebGL2), ffmpeg, Python 3 + Pillow. The pages need no network.
Worked example: 「Four Weathers」 — `examples/four-weathers/` (4 shots, 25.6 s, ambience from ElevenLabs sound effects).
Live pages: https://jungrok5.github.io/motion-skills/cinematic-3d/
