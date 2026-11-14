# BLENDER-MCP — the same steps, live in Blender

The source workflow connects the model to a running Blender through an MCP server and builds the hero prompt by prompt
while you watch the viewport. This skill's engine is plain Blender Python, so it runs there unchanged.

## Connect
1. Install a Blender MCP server (an add-on inside Blender + an MCP server process that the agent talks to; it exposes
   tools such as "get scene info", "execute Blender code" and "viewport screenshot").
2. Start Blender, enable the add-on, start its server, and register the MCP server with Claude Code
   (`claude mcp add …` as that server's README says).
3. Put this skill somewhere Blender can read and send the concept art (front, side, back) into the conversation.

## Build step by step (one step per prompt, look after each)
Send each block through the "execute Blender code" tool. `SKILL` is this folder, `PROJ` the project folder.
```python
import sys; sys.path.insert(0, SKILL)
import importlib, crc.build as B, crc.spec as S, crc.body as Bo, crc.parts as Pm, crc.rig as R
sp = S.load(PROJ + '/character.json')         # loads PROJ/parts.py too
B.reset(); body = Bo.Body(sp); ctx = Pm.Ctx(body, sp)
Pm.body_part(ctx, {}); Pm.head_part(ctx, {})   # step 1: blockout (big head, small body)
```
```python
for p in sp['parts'][:1]: Pm.PARTS[p['type']](ctx, p)     # step 2: first garment — screenshot, then the next one
```
```python
rig, heads = R.build_armature(body, ctx); R.bind(rig, heads, ctx)   # step 3: body bones + cloth chains
```
```python
import crc.clips as C, crc.bake as K
m = C.MotionCtx(body, ctx.surfaces, sp)
seq = C.Sequence(m, sp['motion']['clips'][:1], sp['motion']['start'])   # step 4: idle only first, then add turn, walk
K.bake(rig, body, ctx, seq, 24)
```
Or the whole thing at once: `B.build(PROJ + '/character.json', PROJ + '/out')` — it also sets up the review scene
(grey floor, fixed camera, lights) in the open file.

## Review like the source
- Viewport: camera view of `review_cam`, floor grey, the back-view concept as a reference image in a corner
  (Add → Image → Reference, or overlay `out/turn/back.png`).
- One fix per prompt: "the bow tails go through the skirt" → one change in the spec (or parts.py) → rebuild → look.
  Log it in BRIEF.md. Run `hero.py check` (headless) before calling a clip done.
- Edits made by hand in Blender are lost on the next build: put every decision in character.json / parts.py.
