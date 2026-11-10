# photoreal-film

Short cinematic films that read as photographed, where every frame is Python: objects are modelled procedurally from
numbers (no 3D assets, no texture files), lit like a film set, shot through a physical lens and path-traced with Blender
Cycles, then finished with a film look in numpy. Give it a topic and it designs a new film for it — the mechanism in
macro, the object assembling in a dark studio, the world it belongs to, that world as a picture on the maker's desk,
back into the mechanism, title — and delivers a 2.39:1 1080p MP4 with a synthesised score.

## Quick start
```bash
pip install bpy pillow numpy                      # bpy = Blender as a Python module (bpy 5.x needs Python 3.13)
cp -r photoreal-film/starter my-film && cd my-film
python3 ../photoreal-film/scripts/render.py --still s01:0.5,s02:0.5     # two preview stills → out/stills/*.jpg
python3 ../photoreal-film/scripts/contact.py --q preview                # every shot, first / middle / last
python3 ../photoreal-film/scripts/check.py                              # builds, lit, in focus, moves, deterministic
python3 ../photoreal-film/scripts/render.py --all --q final             # linear EXR frames (resumes)
python3 ../photoreal-film/scripts/finish.py && python3 ../photoreal-film/scripts/score.py \
  && python3 ../photoreal-film/scripts/encode.py                        # → out/film.mp4
```
A new project for your own topic: `python3 photoreal-film/scripts/new_film.py my-film --title "TITLE" --shots macro,parts,hero,world,print,title`,
then fill in `BRIEF.md` first.

Requirements: Python 3.13 with `bpy` 5.x (or Blender 5.x itself: `blender -b -P script.py -- args`), numpy, Pillow,
ffmpeg. No GPU needed (a 4-core CPU renders a preview still in 5-10 s and a film frame in 15-36 s at the example's settings); a GPU Blender can
see is used automatically. Nothing is downloaded at render time.

Worked example: [`examples/aperture`](examples/aperture) — 「APERTURE」, 18 s, nine shots from a topic that is not in
the reference (a 50 mm lens: iris, engraved rings, exploded view, rangefinder body, a lighthouse at last light, the
print on the desk). Samples page: https://jungrok5.github.io/motion-skills/photoreal-film/

Source — made from the film in this post: https://x.com/LexnLin/status/2119558994352304202?a=cxbG0xl325NxMxhz9eQ&s=19
(Leon Lin, "every frame is python, no 3D assets were used"). The skill takes its method and look, not its subject;
`references/LOOK.md` has the analysis.

Bundled fonts: Inter (SIL Open Font License 1.1, `lib/pf/fonts/OFL.txt`).
