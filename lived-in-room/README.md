# lived-in-room

One room built at real size in Blender from Python, made to read as a room someone lives in, and filmed as a
hand-held phone walk at two hours of the day. Give it a person and a place and it designs that room new: the
building first (every number looked up), then a few hundred things — each one put, hung, stuck, suspended, leant or
fixed where its user would have it, and measured for floating and intersection in millimetres — then the small
motions, the drawn city outside the window, a dark room with a few places lit, and the walk.

## Quick start
```bash
pip install bpy pillow numpy                      # bpy = Blender as a Python module (bpy 5.x needs Python 3.13)
cp -r lived-in-room/starter my-room && cd my-room
python3 ../lived-in-room/scripts/audit.py --break                 # measure the room; prove the audit can see
python3 ../lived-in-room/scripts/render.py --view plan,desk       # the room under the work light → out/views/*.jpg
python3 ../lived-in-room/scripts/render.py --still night:0.8,dawn:0.6   # two finished stills → out/stills/*.jpg
python3 ../lived-in-room/scripts/check.py                         # files, inventory, research, audit, life, camera, picture
python3 ../lived-in-room/scripts/render.py --all --q preview      # the frames of both walks (resumes)
python3 ../lived-in-room/scripts/finish.py && python3 ../lived-in-room/scripts/encode.py    # → out/night.mp4, out/dawn.mp4
```
A new room for your own topic: `python3 lived-in-room/scripts/new_room.py my-room --title "…"`, then fill in
`BRIEF.md` and `RESEARCH.md` first (`check.py` fails until you do).

Requirements: Python 3.13 with `bpy` 5.x (or Blender 5.x itself: `blender -b -P script.py -- args`), numpy, Pillow,
ffmpeg. No GPU needed — on 4 CPU cores the example room (405 things) builds in 4 s, is audited in 6 s, and renders
a 960 × 540 preview still in 30–40 s; a GPU Blender can see is used automatically. Nothing is downloaded at
build or render time.

Worked example: [`examples/rooftop-tapes`](examples/rooftop-tapes) — 「옥탑 녹음실」, a rooftop room in Seoul and the
191 cassettes of the tenant who records her neighbourhood, at 02:14 and at 16:40 — with its `BRIEF.md`, the sources
of its numbers in `RESEARCH.md`, and the review rounds in `REVIEW.md` (the first review turned the building round). Samples page:
https://jungrok5.github.io/motion-skills/lived-in-room/

Source — made from this article: https://note.com/its_kobataka/n/n67bb2f8c9ce4?utm_source=x&utm_medium=social&utm_campaign=202611_vibe_modeling_vol06&utm_content=reply_discovery_01
(KOBATAKA, "Vibe Modeling vol.06｜AI×Blenderで3Dシーンを本物っぽくする65の工夫"). The skill takes its method, not its room;
[`references/SOURCE.md`](references/SOURCE.md) summarises the article in Korean and maps each of its 65 techniques to
where it lives here, including what was left out.

Bundled font: ALF Sans, a subset of Pretendard (SIL Open Font License 1.1, `lib/lr/fonts/Pretendard-LICENSE.txt`).
