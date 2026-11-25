# Sources: what was taken, what was not

## @hx831126 (虎小象), X post, 2026-11-25

https://x.com/hx831126/status/2125460963541577784?a=vuKgapXTAHdMxNOQYkM&s=19 (read through `api.fxtwitter.com`;
the 24.6 s clip through `video.twimg.com`, looked at as a contact sheet one frame a second).

The clip: a plan sheet for a cafe, 「松间咖啡」 (Songjian Coffee), lies on a wooden desk beside a white cup and a
pencil - a 1:200 / 1:100 site plan with watercolour contour lines, tree washes, room labels, a section at the side
and a title block. The camera starts straight down on it and descends; the cafe assembles on the paper in white,
each system flashing its own colour (amber timber, cyan and green glazing, blue roof), with a card top-left,
「构件清单」 (parts list), rows per system (基础, 毛石, 木构, 楼板, 玻璃, 屋面 …) and a total counting to 2,781.
The paper becomes a ridge above a sea of cloud at sunset, the building turns to timber, stone and glass, the camera
dives in to a counter with cups and pendant lamps, the title 「松间咖啡」 and "2,829 PARTS · FROM ONE SKETCH".

Its stated pipeline: blueprint + design.md + PIL watercolour contours + Blender 5.2 geometry built in code (2,829
parts, no hand modelling) + Cycles with Khronos PBR Neutral instead of AgX + GPT Image 2.5 / Suno V6 for the look and
the music + 92.5 BPM measured to hit the downbeats + 450 landing points from Mixkit placed on frames automatically
+ numpy & ffmpeg locked at -14 LUFS + HyperFrames & GSAP frame-by-frame compositing + adjacent-frame differences to
find stutter.

**Taken (as method, rewritten):** the sheet drawn in code with watercolour and contours; the parts counter by system;
landings on a measured tempo; a sound on every landing placed on its frame; -14 LUFS; frame differences as a check;
the cup on the desk; the title with the part count.
**Not taken:** the cafe, its plan, its look and title; generated images and music (references only, with the owner's
yes); Mixkit samples (every sound here is synthesized); HyperFrames / GSAP (the counter is drawn with Pillow).

## Nyxera0x, X article, 2026-11-24 - "How I Turn Any Sketch Into a 3D House You Can Walk Through"

https://x.com/Nyxera0x/status/2125210356238762233 (quoted by the post). Ten steps and their prompts: install, get
the input, read it into numbers (trust labels; doors by hand), pin the look with 3 references, build like a carpenter
(every part its own object, tagged by stage; four wings from one function), render next to the references until
nothing differs (6 rounds: AgX vs PBR Neutral, posts in the view, rocks through the pool, beams through the roof),
pick the light (`--look`), film it building itself (the sketch as the first frame through a 200 mm lens, a spiral
down, clay with a colour per stage and a counter, a wave from the maple, a dive, never a blank wall), fit an 8 GB
card (decimate scans, bake bevels), score it (sounds by material from timeline.json, music swell offset onto the
wave, -14 LUFS).

## Nyxera0x/blueprint (MIT)

https://github.com/Nyxera0x/blueprint - three houses (courtyard house from a sketch, cliff villa from references,
apartment from a brochure plan), a Blender kit, film scripts, a counter overlay, an SFX kit, a music tool.

**Taken:** the method above; in `kit/film.py` the structure of the wave node group, the clay wrap of every material
(paper / site / part classes, a flash attribute and a tint), the flight with a back-ease and the flash keys, the site
growing as the wave reaches it, the studio-to-sky world (MIT; notice in `LICENSE`).
**Not taken:** the houses, the sketch and the GIFs, the kit's code (rewritten: CPU or any GPU, procedural materials,
bevels cut into meshes, `rock` / `shell` / `lathe` / `tube` / `blob`, an audit), the SFX samples, the ElevenLabs
music tool.

## Added here

`draw-sheet.py` (the sheet from numbers), `calibrate.py`, the beat grid and bottom-up order, `check.py` (support
order, beat grid, clearance rays, frame pops and freezes, loudness), the composed score, `new-project.py`, the worked
example 「제주 돌집 스테이」 - a building type in none of the sources.
