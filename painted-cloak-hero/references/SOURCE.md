# Source

The skill was made from one X post by rewind (@rewind02), 2026-11-15 —
https://x.com/rewind02/status/2121933776884269192?a=RaDjcVLQVKppvgFvRB4&s=19 (read through the post's public thread
data; 4 s clip, 1920×1080, 24 fps).

> built an animated cloaked hero with claude opus 5.5 + blender.. straw hat, painted blue cloak, full idle and walk
> cycle … the cloak never moves with the body. it follows it, a few frames late. that delay is what makes it look
> like fabric

The clip: an adult hero (about seven heads tall) in a wide ragged straw hat with a brown band, a white short-sleeved
shirt, brown trousers and boots, and a long royal-blue cloak painted in long light-blue strokes with a frayed hem.
He stands, then walks on the spot while the view swings from the front round to his profile; a grey-violet backdrop,
a grid floor, one warm light with a long shadow back to the right, the back-view concept in a frame top right, and a
white HUD top left ("HERO / ANIMATION REVIEW", "Idle [locomotion] 0.00 s", "1 / 23").

It follows the same creator's earlier post (https://x.com/rewind02/status/2120846734901367105), which became this
repo's `cloth-rig-character`. That skill puts spring bones in skirts and ribbons of a big-head hero and reviews one
sequence. This one is the next step the post describes: an adult hero, **hand-painted** materials, a cloak driven by
a **frame delay**, **loop cycles** reviewed one clip at a time, and an automatic list of what is off.

## The workflow in the post, step by step

| Step | In the post | In this skill |
|---|---|---|
| 1 | concept: one front and one back view of the hero, cloak included | `concept/front.png`, `concept/back.png` — yours, or `hero.py concept` renders them from the build; back.png is pinned in the review |
| 2 | Blender + MCP: Opus blocks out the body, "simple stylized proportions, match the concept" | `body.heads` ~6.5–7.2 (`pch/body.py` blends chibi → adult by `heads`); runs inside Blender's Python, or step by step through a Blender MCP server (references/BLENDER-MCP.md) |
| 3 | the outfit as separate meshes: shirt, trousers, boots, hat | parts `top`, `trousers`, `boots`, `hat`, … each its own mesh, in layering order |
| 4 | the cloak gets painted strokes, "hand-painted blue, visible brush marks" | `pch/paint.py`: every material is a texture of brush strokes sized in metres in the piece's UV space; the cloak's hem and the straw brim are alpha-cut into a frayed edge (references/PAINT.md) |
| 5 | rig the body, then give the cloak its own bone chains | `cloak` part: N columns of bone chains from the shoulder line to the hem; the mantle over the shoulders rides the chest |
| 6 | idle and walk cycles, with the cloak bones lagging behind the body | clips `idle`, `walk` (+ `run`, `turn`) as seamless loops; each cloak joint chases where the body put it `lag × i / n` frames ago (references/RIG.md) |
| 7 | review scene: flat floor, fixed light, concept pinned in the corner | `pch/scene.py`: grey-violet backdrop, grid floor, a fixed sun + fill + rim; the camera orbits, the light does not; the concept top right |
| 8 | render every clip with its name and a counter, then list what's off | `hero.py review`: one MP4 per clip (HUD: title, `<Clip> [kind] t s`, `frame / frames`), `review.mp4`, and `REVIEW.md` — the checks' numbers turned into a numbered "what's off" list with the knob to turn |

"the cloak never moves with the body. it follows it, a few frames late." — the `lag` check measures that delay on
every clip and fails if the hem moves with the body (under one frame) or drifts like silk (over eight).

## What is taken, what is not

Taken: the method (concept front/back → blockout → separate garment meshes → painted strokes → body rig + cloak
chains → idle / walk cycles with a delayed cloak → review scene → per-clip renders → list of what's off), the review
scene's look (backdrop, grid floor, fixed warm light, concept inset, the HUD text and counter), the adult "simple
stylized" proportions and the painted, frayed-edged cloth.

Not taken: the hero himself (straw hat, blue cloak, white shirt). The skill's own heroes are a rain ferryman in a
sedge hat and a moss-green cloak (starter) and a snow-pass postman in a crimson cloak with a satchel (example) — every
new topic designs its own.

The post used Blender + MCP interactively. This skill makes the same steps reproducible: one spec file, deterministic
code for the geometry, the paint, the rig, the cycles and the cloth, automatic checks, and a glTF with one animation
per clip that plays in the browser.
