# BLENDER-MCP — the same steps, live in Blender

The source connects the model to a running Blender through an MCP server ("blender + mcp: opus blocks out the
body …") and builds the hero prompt by prompt. This skill's engine is plain Blender Python, so it runs there unchanged.

## Connect
1. Install a Blender MCP server (an add-on inside Blender + an MCP server process; it exposes tools such as "get
   scene info", "execute Blender code" and "viewport screenshot").
2. Start Blender, enable the add-on, start its server, register the MCP server with Claude Code as its README says.
3. Put this skill where Blender can read it; send the concept (front + back) into the conversation.

## Build step by step (one step per prompt, a screenshot after each)
Send each block through "execute Blender code". `SKILL` is this folder, `PROJ` the project folder.
```python
import sys; sys.path.insert(0, SKILL)
import pch.build as B, pch.spec as S, pch.body as Bo, pch.parts as Pm, pch.rig as R
sp = S.load(PROJ + '/character.json')         # loads PROJ/parts.py too
B.reset(); body = Bo.Body(sp); ctx = Pm.Ctx(body, sp)
Pm.body_part(ctx, {}); Pm.head_part(ctx, {})   # step 2: blockout, "simple stylized proportions"
```
```python
for p in sp['parts'][:3]: Pm.PARTS[p['type']](ctx, p)   # step 3: trousers, shirt, boots — one at a time, look each time
```
```python
cl = next(p for p in sp['parts'] if p['type'] == 'cloak'); Pm.PARTS['cloak'](ctx, cl)   # step 4: the painted cloak
```
```python
rig, heads = R.build_armature(body, ctx); R.bind(rig, heads, ctx)     # step 5: body rig + cloak chains
```
```python
import pch.clips as C, pch.bake as K
m = C.MotionCtx(body, ctx.surfaces, sp)
K.bake(rig, body, ctx, m, sp['motion']['clips'][:1], 24)              # step 6: idle first; then walk
```
Or everything at once: `B.build(PROJ + '/character.json', PROJ + '/out')` — it also sets up the review scene (floor,
fixed light, camera) in the open file. Every clip is an action (`idle`, `walk`, …) on the `rig`; switch with the
Action editor.

## Review like the source
- Camera view of `review_cam`; the concept back view as a reference image in the corner.
- Steps 7–8 headless: `hero.py review` renders every clip with its name and counter and writes REVIEW.md.
- One fix per prompt, logged in BRIEF.md. Edits made by hand in Blender are lost on the next build: put every
  decision in character.json / parts.py.
