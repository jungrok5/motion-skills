# painted-cloak-hero

A stylized adult 3D hero built in Blender garment by garment and **hand-painted** — every material a texture of
visible brush strokes glued to the cloth, the cloak's hem and the straw brim frayed — with a cloak on bone chains that
**never moves with the body: it follows it, a few frames late**. Animated as seamless loop cycles (idle, walk, run) and
a step-turn, each clip baked and reviewed on its own: flat grid floor, fixed light, the concept pinned in the corner,
the camera orbiting from the front to the profile, a HUD with the clip name and a frame counter — then an automatic
"what's off" list. One `character.json` → `.blend`, a `.glb` with one animation per clip and a three.js review player,
concept front/back, turnaround + cast sheet, checks and a review MP4 per clip. Give it a topic and it designs a new hero.
See **SKILL.md** for the workflow and `references/` for the details.

Source: made from the X post https://x.com/rewind02/status/2121933776884269192?a=RaDjcVLQVKppvgFvRB4&s=19
("the cloak never moves with the body. it follows it, a few frames late. that delay is what makes it look like fabric").

```bash
python3.13 -m venv ~/.venv-bpy && ~/.venv-bpy/bin/pip install bpy     # Blender as a Python module (bpy 5.x: Python 3.13)
S=path/to/painted-cloak-hero
~/.venv-bpy/bin/python $S/scripts/hero.py new my-hero               # starter: the rain ferryman (--from snow-postman)
cd my-hero                                                           # rewrite BRIEF.md, then character.json
~/.venv-bpy/bin/python $S/scripts/hero.py check                     # build + 14 checks -> out/REVIEW.md (what's off)
~/.venv-bpy/bin/python $S/scripts/hero.py concept                   # front + back view -> concept/
~/.venv-bpy/bin/python $S/scripts/hero.py sheet                     # turnaround + cast sheet (both sides)
~/.venv-bpy/bin/python $S/scripts/hero.py stills --clip walk        # look at one clip
~/.venv-bpy/bin/python $S/scripts/hero.py review                    # every clip's MP4 + review.mp4 + REVIEW.md (Cycles, CPU)
~/.venv-bpy/bin/python $S/scripts/hero.py player                    # out/player/ — serve it: python3 -m http.server
```
With Blender installed instead: `blender -b --python $S/scripts/hero.py -- check`. Live in Blender through a Blender
MCP server: references/BLENDER-MCP.md.

Requirements: Blender's Python (tested with `bpy` 5.3 on Python 3.13), ffmpeg. No GPU.
Samples and the live review player: https://jungrok5.github.io/motion-skills/painted-cloak-hero/
