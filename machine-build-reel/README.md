# machine-build-reel

A giant machine that works, **built part by part by a script in Blender** — every joint a real mechanism (fork,
drum, pin, bolted caps), a hydraulic cylinder across every powered hinge with anchors the script picks so the rod
never leaves its barrel, every rigid part on one bone, a stateless walk, a breathing idle and big moves with
anticipation and recovery — then 15 checks with numbers and a studio **build reel**: the machine walking past a
1.75 m figure on a grey cyclorama, its parts arriving in build order, low strides, the big move, the head waking up,
the design sheet, close-up plates and drawing-beside-built pairs. Give it a topic and it designs a new machine.
See **SKILL.md** for the workflow and `references/` for the details.

Source: made from apek's X post https://x.com/apekshik/status/2122464141990588795?a=wPnMYQkwOmHrLCQmpTA&s=19
("i built a 100-foot walking robot in Blender, entirely from code") and the method in the repository it links,
AnyMachine — https://github.com/apekshik/anymachine (MIT; method only, no code or design copied).

```bash
python3.13 -m venv ~/.venv-bpy && ~/.venv-bpy/bin/pip install bpy     # Blender as a Python module (bpy 5.x: Python 3.13)
S=path/to/machine-build-reel
~/.venv-bpy/bin/python $S/scripts/machine.py new my-machine            # starter: WADER (--from ridge-hauler)
cd my-machine                                                          # write BRIEF.md + PARTS.md, then machine.py
~/.venv-bpy/bin/python $S/scripts/machine.py check                     # build + 15 checks -> out/REVIEW.md
~/.venv-bpy/bin/python $S/scripts/machine.py sheet                     # turnaround (both sides), motion sheet, plates
~/.venv-bpy/bin/python $S/scripts/machine.py reel --res 640x360 --samples 14   # out/reel/reel.mp4 (resumable)
~/.venv-bpy/bin/python $S/scripts/machine.py player                    # out/player/ — serve it: python3 -m http.server
```
With Blender installed instead: `blender -b --python $S/scripts/machine.py -- check`.

Requirements: Blender's Python (tested with `bpy` 5.2.4 on Python 3.13), ffmpeg, Mesa EGL (`libegl1`) for the line
drawings when there is no GPU. Cycles on the CPU.
Samples and the live player: https://jungrok5.github.io/motion-skills/machine-build-reel/
