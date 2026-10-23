# Anime with Claude Code — every attempt so far (handoff for Codex or anyone continuing)

Read this first, then `WORKFLOW.md` (the method, step by step, with every prompt verbatim).
Everything here is on branch `ccr-a72e669a-axbdd6`. Folder: `canvas-film/examples/anime/`.

## What the owner wants
- A Japanese-anime short (the railway-crossing story, 32.4 s, landscape + vertical) whose **camera, direction, light and
  compositing come from code** — they liked those from the first attempt — but whose **drawing is real anime quality**.
- Characters that move **like Live2D** (layered puppet: head turns, hair physics, blinks, expressions), not like a
  picture being warped.
- If it works, the method becomes a **new skill** in this repo (follow `CONTRIBUTING.md`).
- Every result is checked by the agent before showing it (`tools/review.*`, plus looking at the frames).

## The attempts, in order (renders in `renders/`, 720p copies)

| # | scene | idea | verdict / owner's words | render |
|---|---|---|---|---|
| 0 | `scenes/crossing.html`, `glance.html`, `heroine.js` + `model-sheet.html` | everything drawn in Canvas 2D (cel shading, on-twos, Shinkai sky) | direction and camera liked; drawing "looks like an elementary-school kid drew it / a pre-production sketch". Three rounds, never reached anime quality. | `00-crossing-code-h.mp4`, `stills/glance-h.jpg`, `stills/model-sheet.jpg` |
| 1 | `scenes/crossing-art.html` | image-model key art of the heroine on green (GPT Image 2.5), keyed, warped by a triangle mesh, relit | drawing quality jumped; motion "like a rubber print blown by the wind", not Live2D | `01-crossing-art-warp-h.mp4` |
| 2 | `scenes/crossing-rig.html` + `rig.js` | Live2D-style rig: model-painted **underlays** (loose hair removed), hair **parts cut out** of the drawing, skinned to spines, angular-spring physics; face parallax for a head turn; skirt flare; review tools | motion much better; owner: "real Live2D draws the hidden parts of every layer — we cut one picture and the cuts show when it moves" | `02-crossing-rig-h.mp4`, `review/review-rig/` |
| 3 | `scenes/crossing-paint.html` | backgrounds = image-model **repaints of the code layout** (perspective preserved → code still knows where everything is); front layer cut from code geometry; painted train; head turn as **two key drawings** | biggest visual jump (Shinkai-like backgrounds); character still the cut-part rig | `03-crossing-paint-h.mp4`, `stills/crossing-paint-stills.jpg`, `review/review-paint/` |
| 4 | same scene, shot G + `layers.js`, `l2d-test.html` | **full layers**: each part drawn COMPLETE by one image edit (back hair, body, face skin, features ×3 expressions, bangs, side lock); depth-parallax head turn, springs per hair layer | current best: big head turns with no holes or cut lines | `04-crossing-layers-h.mp4`, `04-crossing-layers-v.mp4`, `04-l2d-test-h.mp4` (stress test), `review/review-l2d/` |

## What worked (keep doing it)
- **Image model draws, code moves.** Never ask the model for transparency: flat `#00FF00`, key it (`tools/key.py`).
- **Edit, don't regenerate**: every pose, expression, underlay and layer is an edit of one picked base, written as
  *Change / Preserve / Constraints* — this is what keeps the character consistent.
- **Align everything back** (`patch.py`, `plate.py`, `l2dlayers.py`): the model shifts/scales slightly; a scale+shift
  search fixes it.
- **Repaint the code layout** for backgrounds (`?plate=1` → `tools/plates.mjs` → edit → `tools/plate.py`): keeps the
  code's camera and all known positions; registration found ≤1 % scale, ≤4 px shift.
- **Full layers** for anything that moves a lot (§4d). Stack them → that stack *is* the model (it is not
  pixel-identical to the base drawing).
- **Key drawings for big turns** (3–5 frames of drawn poses, then the puppet) — no warp can fake a real turn.
- **Review loop** (`node tools/review.mjs …` + `python3 tools/review.py …`, then open the strips): it caught real
  problems, and looking caught what the numbers missed (collar stripes sliding with hair, legs doubled by a skirt
  swing, a ghost jaw line, a half-missing smile, a chin line carried by a lock).

## What failed or is blocked (don't repeat blindly)
- Pure-code characters: three rounds, never anime quality (see `references/LESSONS.md` in canvas-film).
- One-picture warp (attempt 1): reads as rubber.
- **Skirt underlay** (legs under the skirt, even "with gym shorts"): **refused by the image provider's policy**. Not
  retried, don't word around it. The skirt only flares/leans (covers more, reveals nothing).
- "Side lock on the viewer's right" (full layers): came back as a copy of the left lock → dropped (check overlap).
- Face-skin layer comes back as a whole bald head → `l2dlayers.py` trims to what can show.
- Expression variants edited from a differently framed drawing land shifted → `l2dlayers.py` aligns them (only when it
  clearly fits better; closed eyes barely overlap anything, so the blink stays as drawn).
- Silhouette in the painted sunset stood on the rooftops → removed (empty sky fits the last line anyway).
- **See-through** (SIGGRAPH 2026, open source: one anime image → up to 23 layers with hidden parts filled) would be the
  natural alternative to drawing layers one by one. Its free Hugging Face demo (`24yearsold/see-through-demo`, ZeroGPU)
  refused anonymous use from our sandbox ("exceeded ZeroGPU runs limit"). **If you have a GPU or an `HF_TOKEN`, try it**
  on `scenes/art/bust.webp` and compare with `scenes/art/l2d/`. Known weak spots: ponytail merged into back hair.
  Community precedents: GMO's See-Through × Kaggle × Claude Code pipeline (semi-automatic Live2D), aisola's note
  series (Live2D-like VTuber from 7 part images, no Live2D software), Stretchy Studio (FOSS mesh deformer for
  See-through PSDs). Links in the owner's chat summary; search for them by name.

## Still open (good next steps)
1. Wide shots: the back view still uses the cut-part rig (attempt 2). Draw it as full layers too (body, back hair +
   ponytail, skirt as its own complete layer — legs under it stay undrawable, see above).
2. Eyes as separate layers (whites, irises, lashes) for gaze; mouth shapes for speech.
3. The boy across the crossing is still a tiny code figure — paint him (stand + wave drawings).
4. Package the method as a new skill (folder with `SKILL.md`, references, `docs/<skill>/` samples page,
   `docs/skills.json`, `node tools/build-hub.mjs`), per `CONTRIBUTING.md`.

## Reproduce
- Needs: Node + Playwright Chromium, ffmpeg, Python 3 (numpy, Pillow), an image model that edits with a reference
  (we used `gpt-image-2.5-sunburst` at 2K via the ElevenLabs creative connector, flow "anime heroine · crossing").
- Watch a scene: serve the folder (`python3 -m http.server`) and open `scenes/crossing-paint.html`
  (`?o=v` vertical). Review modes: `?fig=1` (figure on magenta), `&rest=1` (drawn pose), `&orig=1`.
- Render: `node ../../scripts/render.mjs h --page scenes/crossing-paint.html --workers 4` (→ `out/`).
- Review: `node tools/review.mjs scenes/crossing-paint.html --o h --shots "7:13:0.4,14.6:20.6:0.2,20.6:22:0.1,22:26:0.25"
  --sheet 0.5 --out out/review && python3 tools/review.py out/review --swaps 20.85,21.02`.
- Re-run the asset tools on the raw images in `art-src/` (see `art-src/README.md`); commands in `WORKFLOW.md`.

## Where things are
| path | what |
|---|---|
| `scenes/crossing-paint.html` | the current film (painted plates + full-layer close-up) |
| `scenes/crossing-rig.html`, `crossing-art.html`, `crossing.html` | earlier attempts, kept for comparison |
| `scenes/layers.js`, `l2d-test.html` | full-layer puppet runtime + stress test |
| `scenes/rig.js`, `cutout.js` | cut-part rig (springs, skinning) · warp/relight helpers |
| `scenes/art/` | assets the scenes load (keyed drawings, `rig/`, `plates/`, `l2d/`, `ref/` layout frames) + provenance README |
| `art-src/` | raw image-model outputs (green screen, before keying), incl. unused candidates |
| `tools/` | key, patch, layers/rigassets/facelayer (cut-part rig), plates/plate (backgrounds), l2dlayers (full layers), review |
| `renders/` | 720p renders of every attempt, stills, review reports and strips |
| `WORKFLOW.md` | the method with every prompt |

Image-model spend so far ≈20,200 ElevenLabs credits (≈ $3.7) for all art in this folder.
