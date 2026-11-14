# cloth-rig-character

A stylized 3D hero (big head, small body) built in Blender part by part, dressed layer by layer, rigged **with bones
in the clothes** — rows in the skirt, the bow loops and tails, the scarf, the braid — and animated one clip at a time
(idle with a blink → turn → walk, plus twirl / wave / hop) so the skirt flares and the ribbons lag behind. Reviewed like
the source: grey floor, fixed camera, back-view concept in the corner, a HUD. One `character.json` → `.blend`, an
animated `.glb` with a three.js review player, turnaround + cast sheet, automatic checks and a 1280×720 review MP4.
Give it a topic and it designs a new hero. See **SKILL.md** for the workflow and `references/` for the details.

Source: made from the X post https://x.com/ClaudeCode_love/status/2121385622325903666?a=TAb3nXMsi15QbOVger8&s=19,
which writes out the Blender + Claude workflow of https://x.com/rewind02/status/2120846734901367105
("the trick is rigging the cloth, not just the body").

```bash
python3 -m venv ~/.venv-bpy && ~/.venv-bpy/bin/pip install bpy       # Blender as a Python module (bpy 5.x: Python 3.13)
S=path/to/cloth-rig-character
~/.venv-bpy/bin/python $S/scripts/hero.py new my-hero               # starter: the rainy-day kid (--from hanbok-girl)
cd my-hero                                                           # rewrite BRIEF.md, then character.json
~/.venv-bpy/bin/python $S/scripts/hero.py check                     # build + 11 checks -> out/character.blend, .glb
~/.venv-bpy/bin/python $S/scripts/hero.py sheet                     # turnaround + cast sheet (both sides)
~/.venv-bpy/bin/python $S/scripts/hero.py stills --clip walk        # review one clip
~/.venv-bpy/bin/python $S/scripts/hero.py render                    # out/review.mp4 (Cycles, CPU)
~/.venv-bpy/bin/python $S/scripts/hero.py player                    # out/player/ — serve it: python3 -m http.server
```
With Blender installed instead: `blender -b --python $S/scripts/hero.py -- check`. Live in Blender through a Blender
MCP server: references/BLENDER-MCP.md.

Requirements: Blender's Python (tested with `bpy` 5.3 on Python 3.13), ffmpeg. No GPU.
Samples and the live review player: https://jungrok5.github.io/motion-skills/cloth-rig-character/
