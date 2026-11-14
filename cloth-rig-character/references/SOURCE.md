# Source

The skill was made from two X posts:

- **Claude Code Studio (@ClaudeCode_love), 2026-11-14** — https://x.com/ClaudeCode_love/status/2121385622325903666?a=TAb3nXMsi15QbOVger8&s=19
  A Japanese write-up of the workflow: "if you want Opus to make a 3D character walk, 90 % of it is whether you put
  bones in the clothes." With bones only in the body, the skirt and the ribbon stay frozen while she walks; bones in the
  cloth that sway are the answer.
- **rewind (@rewind02)**, the creator's own post with the 4-second clip —
  https://x.com/rewind02/status/2120846734901367105 ("built and animated a stylized hero in Blender + Claude Opus 5.5 …
  the trick is rigging the cloth, not just the body").

## The workflow in the posts, step by step

| Step | In the post | In this skill |
|---|---|---|
| 1 | Connect the model to Blender through MCP; send front, side and back concept art | `scripts/hero.py` runs inside Blender (or `pip install bpy`); through a Blender MCP server you run the same steps one by one (references/BLENDER-MCP.md). Concept art goes in `concept/` and the back view becomes the review inset |
| 2 | "Build this hero part by part: bob haircut, wide sun hat, puff-sleeve floral dress, white sash with a back bow, white boots" | `character.json` lists the parts; `crc/parts.py` builds each one (references/PARTS.md) |
| 3 | Blockout: big head, small body, a bell-shaped skirt | `crc/body.py` proportions (`heads` ≈ 3.6–4.6), `skirt.bell` |
| 4 | Layer the outfit: dress > sash and bow > boots > hat | the order of `parts` in the spec *is* the layering order; each later garment sits a little further out (`ctx.shell()`) |
| 5 | Rig it with extra bone chains in the skirt and the bow ribbons | every cloth part registers chains (`ctx.chain`): skirt rows, bow loops and tails, scarf tails, hair tails, cape |
| 6 | Animate one clip at a time: idle with a blink > turn > walk | `motion.clips`; `hero.py stills --clip walk` reviews one clip; `crc/clips.py` |
| 7 | Follow-through: the skirt flares and the bow lags behind on turns | `crc/spring.py` simulates every chain from how the body moves and bakes it; `check` fails if the cloth does not lag more on the turn than at idle |
| 8 | Review scene: grey floor, fixed camera, the back-view concept in the corner, fix one thing per prompt | `crc/scene.py` + `render.compose` (HUD top left, back view top right); the review log in BRIEF.md has one fix per line |

"The bow and the skirt swing are what sell the walk."

## What is taken, what is not

Taken: the method (parts → layers → cloth bones → clips one at a time → follow-through → review scene), the review
scene's look (grey-violet backdrop, grey grid floor, fixed camera, back-view inset, the white HUD text
"HERO / ANIMATION REVIEW", clip name and frame counter) and the stylized-hero proportions.

Not taken: the girl herself (black floral dress, white sun hat, bob). The skill's own characters are a kid in a yellow
raincoat (starter) and a girl in a New Year hanbok (example) — every new topic designs its own hero.

The posts used Blender + MCP interactively. This skill makes the same steps reproducible: one spec file, deterministic
code for the geometry, the rig, the clips and the cloth, automatic checks, and a glTF that plays in the browser.
