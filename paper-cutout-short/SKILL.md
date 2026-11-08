---
name: paper-cutout-short
description: Make a short paper cut-out animation (8–30 s) on a tabletop paper stage — every piece cut or torn from coloured paper and felt with a white fibrous rim, layers standing off each other with soft shadows, a dyed paper sky, the sun hung on a thread and the moon held up on a wooden stick, scalloped-roof paper houses, cobbles and out-of-focus foreground, a profile puppet pinned at its joints doing a small errand while the camera trucks along the set, everything moving at 12 drawings a second with a hair of hand-placed jitter, warm practical light, and a paper title label pinned on at the end. The paper parts come from an image model (GPT image: one parts sheet per puppet, cut into PNG parts and pinned to a rig — the source's cheap, controllable method) or are cut in code (offline, deterministic); either way the motion is code, so the film is repeatable. Outputs a live page with a synthesised music-box score and a 1920×1080 MP4 (24 fps, each drawing held two frames). Give it a topic and it designs the puppet, the set, the light and the beats. Use when asked for cut-out animation, paper / felt / papercraft animation, a stop-motion paper look, "animate GPT-generated paper pieces", "make this style move", or to remake a paper cut-out reference on a new subject ("종이 컷아웃 애니메이션", "종이 오리기 애니메이션", "페이퍼 크래프트 영상", "펠트 인형 애니메이션", "스톱모션 느낌 종이 인형", "GPT 이미지로 만든 부품 움직이기", "이 스타일로 ○○ 이야기 만들어줘", "주제만 바꿔서", "剪纸动画", "cut-out animation", "paper puppet short"). Source — made from https://x.com/lemomo_ai/status/2119327014041842157.
---

# paper-cutout-short

A short film on a tabletop paper stage. A cut-out puppet — a big head in profile, a simple body block, short limbs pinned
at the joints like brass paper fasteners — does a small errand along one deep set: a dyed paper sky, the sun on a thread,
the moon on a stick, torn hills, scalloped-roof houses, a cobbled road, blurred grass or posts in front. Every piece is
cut or torn paper with a white fibrous rim and stands off the piece behind it, so soft shadows separate the layers. The
camera trucks along; everything moves at 12 drawings a second with a hair of jitter, like hands re-placing the pieces
between exposures; warm light comes from windows and lamps; a paper label is pinned on at the end. Give it a topic ("a
fox who lights the harbour lamps", "a mole who delivers bread by boat", "a girl watering every window box on her street")
and it writes a brief, designs the puppet and the set, cuts the parts (from an image model or in code), and animates
1–4 shots. Every frame is `seek(t)`, so the same page plays live (with sound) and renders to MP4.

Made in this repo after the post by Lemomo (@lemomo_ai) on X — https://x.com/lemomo_ai/status/2119327014041842157: a
10.8 s clip of a hedgehog postman cycling a paper street at dusk, captioned "重新利用gpt的生图能力，完成剪纸动画 (cut-out
animation)，内容可控，成本很低" — reuse GPT's image generation to make cut-out animation; the content stays controllable
and the cost is low. This skill keeps that method (an image model draws the paper pieces once, code moves them:
`scripts/gen-parts.mjs` → `scripts/cut-parts.mjs` → `Pup.bipedParts`) and the clip's look and grammar
(`references/LOOK.md`), and adds a way to cut every piece in code so a film can be made offline. The worked example
`examples/lamplighter` 「The Lamplighter」 (20.2 s, 3 shots) is a new story with an original puppet, cut entirely in code;
`examples/parts-route` runs the image route end to end. Never recreate the reference's hedgehog, its street or its gags —
design new ones for each topic.

**Fixed (the style)** — paper pieces (torn white rim, fibres, flat matte colour, felt), layers with soft shadows from one
warm light at the upper left, the backdrop sheet, sky props on threads and sticks, side-on multiplane sets, profile
puppets pinned at joints, 12 steps a second with jitter, the slow truck along the set, shallow focus on the foreground,
the warm grade and vignette, the paper title label as the only type, 1920×1080 at 24 fps, the music-box / paper / flame
sound palette.

**Designed per topic** — the hero (silhouette, papers, accent, prop) and anyone else, the errand and its beats, the gag
or turn, the set (the place, its buildings / sea / trees / interiors, new pieces cut for it), what hangs on strings, the
time of day and how the light changes, the camera path, the label, the tune and the effects; for the image route, the
parts sheets and their prompts. The template (a child flying a kite) and the example (a fox lamplighter) are examples
of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/paper.js` | the paper: `piece` (torn / cut / felt, fibres, light, lift shadow), shapes (`rect rrect ellipse arch capsule blob cloudShape crescent star burst`), `ink`, `dot`, `dab`, `sprite` (paint once, baked shadow), `image` / `parts` (cut-out PNGs as sprites), `put`; timing (`span`, `ease`, `keys`), seeded noise, colour |
| `lib/puppet.js` | cut-out rigs: `biped` (the standard two-legged puppet cut in code), `bipedParts` (the same rig from image parts), `puppet` (any rig), `draw` (facing ±1 or edge-on, replacement parts, held props, jitter, planted feet), `where`, `soles`, poses `stand`, `walk`, `walkSpeed`, `blend`; joint ranges `LIM` audited on every draw; `sheet` (the cast sheet) |
| `lib/stage.js` | `Stage`: layers and props (painted once), shots, the multiplane camera, 12-step time, jitter, glows, transitions (`dissolve`, `black`, `card`), the warm grade, the live player with sound, `check()`, the contract |
| `lib/kit.js` | set pieces cut from paper: `backdrop cloud hills waves house pane cobbles grass sun moon starPiece string stick lamp flame beam boat lighthouse tree label` |
| `lib/score.js` | `renderScore`: music box, plucks, felt piano, bass, reed, harmonium, brushes, air / rain / sea beds, sfx (`tap strike creak rustle bell chime whoosh` …), reverb |
| `lib/fonts/` | Source Serif 4 (SIL OFL) for the label |
| `templates/` | `BRIEF.md`, `cast.js` + `cast.html` (one puppet and a prop, the sheet turning it both ways), `film.html` (8 s, 2 shots: a child and a kite), `score.js` |
| `scripts/new-film.mjs` | start a project from the template, `--from lamplighter` or `--from parts-route` |
| `scripts/gen-parts.mjs` | ask an image model (OpenAI Images: `gpt-image-1` by default) for a parts sheet, with the style preamble and optional reference images |
| `scripts/cut-parts.mjs` | cut a parts sheet (alpha or flat key colour) into named PNG parts + `parts.json` + `parts.js` (inlined) + `preview.jpg` |
| `scripts/render.mjs` | stills, a contact sheet, or the MP4 (workers × ffmpeg chunks, `--audio`) |
| `scripts/score.mjs` | the score → WAV |
| `scripts/check.mjs` | proves the page: loads clean, every shot draws, no blank frames, deterministic, 12-step holds, the film's rules and the body rules, the score renders |
| `references/` | **BRIEF** (topic → brief, cast and still reviews) · **LOOK** (the grammar, observed from the source) · **PARTS** (image-model sheets: rules, the style prompt, cutting, pinning) · **KIT** (API, contract) · **LESSONS** |
| `examples/lamplighter/` | the worked example: `BRIEF.md`, `cast.js` + `cast.html`, `index.html` (3 shots), `score.js` |
| `examples/parts-route/` | the image route: `sheet.png` (a stand-in sheet, `make-sheet.html`), `parts/ember/` (cut), `index.html` (the cut parts rigged, turned both ways, walking) |

## Project layout (what you create)
```
my-film/
  BRIEF.md       the topic written out (references/BRIEF.md) — written first
  cast.js        the puppets and held props, built in cast() — reviewed on cast.html
  cast.html      the cast sheet (each pose facing right and left, pins marked)
  film.html      palette → layers → props → the hero's timeline → shots (F.shot) → checks (F.check) → F.start()
  score.js       export const SCORE = { musicbox, pluck, bass, pad, sea, air, sfx … }
  prompts/       (image route) one prompt per parts sheet
  sheets/        (image route) the generated sheets (gen-parts.mjs)
  parts/<name>/  (image route) cut parts: PNGs, parts.json, parts.js, preview.jpg (cut-parts.mjs)
  lib/           copy of the skill's lib/ (new-film.mjs); pages import it through an import map ("pcs/")
  out/           stills, sheets, film.wav, film.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs film.html --sheet 12 --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU. The image route also needs an image model
(`OPENAI_API_KEY` for `gen-parts.mjs`, or any tool that saves a PNG). Canvas 2D: ~0.17 s a 1080p frame; 20 s renders in
~1.5 min with 4 workers.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the user's topic (references/BRIEF.md says how): the
   errand, the hero as paper (silhouette, 2–3 papers, one accent, the prop), one deep set and its layers, what hangs on
   strings, how the light changes, the gag, 3–6 beats, the camera, which parts are generated and which are cut in code,
   the label, the sound. Save it as `BRIEF.md` before any code. If the user gives a reference clip, extract stills
   (`ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=3x4 sheet.jpg`) and read its layers, strings, palette and camera —
   then design your own puppet and errand.
2. **Start**: `node <skill>/scripts/new-film.mjs my-film` (or `--from lamplighter`, or `--from parts-route` for the image route).
3. **Parts.**
   - *Image route* (references/PARTS.md): write `prompts/<puppet>.txt` (the part list for one right-facing puppet, near
     limbs only, parts apart, no text) → `node <skill>/scripts/gen-parts.mjs --prompt prompts/<puppet>.txt --out sheets/<puppet>.png`
     (pass earlier sheets with `--ref` so every sheet shares the style) → `node <skill>/scripts/cut-parts.mjs sheets/<puppet>.png
     --names head,torso,…  --out parts/<puppet>` → read `preview.jpg` → in `cast.js`: `P.parts(MAN, { px, pivots })` and
     `Pup.bipedParts(…)`. Same for prop and set sheets (or generate a full-frame backdrop).
   - *Code route*: in `cast.js` design the puppet with `Pup.biped` — `paintHead` and `paintTorso` cut from `P.piece`s, lengths
     and colours for the limbs, `extraParts` for tails and ears; props with `P.sprite`.
4. **Cast sheet.** Render `cast.html --stills 0 --scale .5`, then full size, and score it against the cast review in
   references/BRIEF.md — facing both ways: snout / chest / buttons / toes to the side the face looks at, far limbs darker and
   behind; knees fold back, elbows forward; no raised near arm across the face, no raised far arm lost behind the head; the
   paper does not tear open at a pin. Fix and re-render until it passes.
5. **The set.** Paint each layer once with `F.layer` (kit pieces, your own pieces for the topic), wider than the frame by the
   camera's travel × depth; give each a depth z and a `lift` so it casts onto the one behind. Sky props hang on `K.string` or
   stand on `K.stick`. Lit / unlit versions of anything that lights up. The foreground gets `blur`.
6. **The hero's timeline.** One function of global time → `{ x, facing, angles, swap, … }` (the example's `ember(t)`):
   walks at `Pup.walkSpeed` so the planted foot does not slide, stops worked out on the rig (`Pup.where`) so a prop lands on
   its target, reaches with `Pup.blend`, turns over in two edge-on steps (facing `1 → .35 → −.35 → −1`).
7. **Shots** (1–4, 8–30 s total): in each `draw(g, lt)` put the layers back to front (`g.put(sprite, x, y, z, { lift })`), the
   puppet (`g.puppet`), glows, the foreground; camera keys in the shot options. The label pinned on near the end (`K.label`).
   A still after each shot: `render.mjs film.html --stills 4 --scale .5`.
8. **Sheet and review**: `render.mjs film.html --sheet 12 --scale .5`, then ~12 random moments full size, scored against the
   still review in references/BRIEF.md.
9. **Check**: `node <skill>/scripts/check.mjs film.html` must print only `ok`. Add `F.check(...)` for the film's own rules —
   the hero faces the way it walks, stays in frame, the prop touches what it lights, beats land inside their shots.
10. **Score**: write `score.js` against the shot starts (check.mjs prints them): a music-box or plucked tune, a bed (street,
    sea, wind), taps on the steps, a strike / chime / creak / bell on the beats. Listen on the live page (♪), then
    `node <skill>/scripts/score.mjs score.js --dur <DURATION> --out out/film.wav`.
11. **Render**: `render.mjs film.html --workers 4 --audio out/film.wav` → `out/film.mp4`. Look at stills from the MP4
    (`ffmpeg -ss 10 -i out/film.mp4 -frames:v 1 x.png`) before handing it over.

## Rules
- **Design for the topic.** The puppet, the errand, the set and the gag are made for this topic. Do not reuse the template's
  child and kite or the example's fox, harbour and lighthouse unless the topic is exactly theirs; never recreate the source
  clip's hedgehog postman, its street or its door gags.
- **One style.** Everything new — generated or code-cut — is paper: flat matte colour, fibres, a white torn rim (or a clean cut,
  or felt), a soft shadow under each layer from the upper left, no gradients or gloss on puppets, no outlines, no pure black.
  Generated sheets all use the same style preamble (references/PARTS.md) and the earlier sheets as references.
- **12 steps a second, with jitter.** Puppets, props and the camera move on the stage's stepped time (`g.lt`); never read
  `performance.now()` or `Date`. The check fails a page whose two frames of one step differ.
- **Pure function of t.** No `Math.random`, no state between frames: `P.rng(seed)` in painters, `hash`, `n1`, `keys`, `span`
  in shots. `check.mjs` proves it.
- **Paint once, move many.** Layers, props and puppet parts are sprites cut once at the preview scale; per frame only
  transforms, glows and threads are drawn.
- **Things in the sky hang or stand.** The sun, clouds, stars and birds on threads that run out of the top of the frame; the
  moon (or anything rising) on a stick from below. It is a stage, and it shows.
- **Light belongs to the stage.** Shadows fall down-right from one warm light whichever way a puppet faces; warm glows only
  where something gives light.
- **Bodies that can exist.** Head, chest, hips and toes face one way; in profile the near limbs are in front of the body, the far
  ones behind and darker; knees fold back, elbows forward, everything inside `Pup.LIM` (the check fails outside it); feet planted
  on the ground line (`pose.ground`); a puppet faces the way it walks. A raised near arm crosses the face — reach lower, use the
  far arm forward-up, or let the prop do it. Every new puppet and pose goes on the cast sheet facing both ways before it goes
  into a shot.
- **Readable.** The hero is the clearest value in the frame and is never cut by the frame when it matters; one action at a time.
- **No text on screen** except the paper label (and anything printed in the world: a shop sign, a letter).

## Contract every film page fulfils
`window.seek(t)` renders frame t, holding time on 12 steps a second; `window.DURATION`, `window.FPS` (24), `window.STEP` (12),
`window.SIZE = {W, H}` (1920×1080 stage px), `window.runChecks(t)` (names of broken rules + body audits), `window.shotAt(t)`
(`{i, name, lt}`), `window.film`, `window.__ready = true` — all set by `F.start()`. `?render=1` = fixed canvas, no live loop;
`?t=12` = one frozen frame; `?scale=.5` = preview size (sprites are cut at that size); `?off=grade,vignette,grain,jitter`.
The live page fits the window, draws a new frame on each step and loops; click or space pauses, ← → jump a second, the bar
scrubs, ♪ plays the score in sync.
