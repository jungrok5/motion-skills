# Anime with real key art: the workflow (image-model character + code direction)

How `scenes/crossing-art.html` was made, written so another agent (Codex, Claude, a person) can repeat it from
scratch. The idea (after "Rain Station", x.com/zhu185178/status/2103757767727255661):

> **The picture comes from an image model, the life comes from code.**
> Camera, sky, train, lamps, light, compositing, timing and wind stay in code; only the character is drawn by an
> image model, on a green screen, then keyed, kept consistent, warped and relit by code.

Why: three all-code attempts in this folder (`crossing.html`, `glance.html`, `heroine.js` + `model-sheet.html`) got
the direction right but the character read as a child's drawing. A survey of Claude-made anime films (X, the
awesome-opus-5.5-video lists) found no pure-code character at real anime quality; every good one used model art.

## 0. What you need
- Node + Playwright Chromium, ffmpeg, Python 3 with numpy + Pillow (no OpenCV needed).
- An image model that can **edit with a reference image**. We used GPT Image 2.5 (`gpt-image-2.5-sunburst`) through the
  ElevenLabs creative connector. Any equivalent works (OpenAI Images API `images.edit` with `gpt-image-*`, Gemini
  image, FLUX Kontext …); the prompts below are model-agnostic.
- Fonts installed locally (Noto Serif KR / Noto Sans KR) — renders never touch the network.

## 1. Plan the shots first
Write the shot list and decide which **drawings** it needs. For `crossing-art`:

| shot | time | drawing | what code adds |
|---|---|---|---|
| A sky tilt | 0–7 | — | all code |
| B wide, crossing | 7–13 | back view, full body | wind on ponytail/skirt (on twos), breath, cast shadow, rim light |
| L lamp insert | 13–14.6 | — | all code |
| C train passes | 14.6–20.6 | same back view | gust from the train (stronger warp), camera shake |
| G look-back close-up | 20.6–26 | bust: surprised · blink · sad smile | hair warp, drawing swaps, slow push-in, rim, blurred background |
| D dusk | 26–32.4 | same back view | silhouette from the alpha |

Fewest drawings, most reuse. Front views are the hardest drawing — stage around them.

## 2. Generate the character (prompts verbatim)

### 2a. Base — text to image, 4 candidates, pick one
Settings used: 16:9, 1K, quality high (≈190 credits each). Higher resolution is better for a base you will reuse.

```
Background: a perfectly flat, uniform pure green chroma-key background, exact color #00FF00, no gradient, no floor, no cast shadow, no vignette.

Subject: one Japanese high-school girl, about 16, full body from head to shoes, standing relaxed in a three-quarter view turned slightly toward the viewer's left, arms hanging naturally at her sides, holding nothing, calm neutral expression, looking toward the viewer's left.

Character design (must stay exactly like this): chestnut-brown hair in a high ponytail tied with a red scrunchie, side bangs and two long side locks framing the face, a few loose strands; blue eyes with large anime irises; summer sailor uniform: white short-sleeve blouse with a navy sailor collar trimmed with two thin white stripes, a red neckerchief tied in a bow, navy pleated knee-length skirt, navy knee socks, brown loafers.

Medium: modern Japanese TV anime production cel art, like a clean character key frame from a 2020s anime series: crisp thin coloured line art (dark brown lines on skin and hair, not black), flat cel colours with one hard-edged shadow tone and small hard highlights, an angel-ring highlight on the hair, soft pink cheek blush. Even, flat studio lighting from the upper left. No text, no logos, no watermark, no other characters, no props.
```

### 2b. Poses — edits with the picked base as the reference image
Write every edit as **Change / Preserve / Constraints**. Settings: back view 9:16 2K; bust 4:5 2K (≈520 / ≈710 credits each).

Back view (wide shots, train, dusk silhouette):
```
Change: show this exact same girl from directly BEHIND, full body from head to shoes, standing still with her back to the viewer, arms relaxed at her sides, head level. We see the back of her head with the high ponytail and red scrunchie, the square navy sailor collar flap on her back with its two white stripes, the back of the white blouse, the navy pleated skirt, navy knee socks and the heels of her brown loafers. A light breeze lifts the ponytail and the skirt hem slightly toward the viewer's right.

Preserve: identical character design, hair colour and length, uniform colours, body proportions and height, and the exact same anime art style: thin dark-brown coloured line art, flat cel colours with one hard-edged shadow tone, angel-ring hair highlight, flat even lighting from the upper left.

Constraints: perfectly flat pure green background #00FF00 everywhere, no floor, no cast shadow, no text, no other people, nothing held in her hands.
```

Look-back bust (close-up):
```
Change: a bust close-up (head and shoulders, cut at mid-chest) of this exact same girl, her body turned away from the viewer toward the right while she turns her head back over her left shoulder to look at the viewer, a classic anime look-back pose. Eyes open wide, lips slightly parted, a quiet surprised expression with a hint of sadness. Wind blows her bangs, side locks and ponytail toward the viewer's left, a few loose strands across her cheek.

Preserve: identical face, eye colour and shape, hair colour, scrunchie, sailor collar and red neckerchief, and the exact same anime art style: thin dark-brown coloured line art, flat cel colours with one hard-edged shadow tone, angel-ring hair highlight, soft cheek blush, flat even lighting from the upper left.

Constraints: perfectly flat pure green background #00FF00 everywhere, no cast shadow, no text, no other people, no props.
```

### 2c. Expressions — edits of the picked bust, same size (4:5 2K)
Blink:
```
Change: ONLY her eyes — both eyes gently closed, a soft downward-curved closed-eyelid line with the lashes, as in a blink. Nothing else changes.

Preserve: everything else pixel-for-pixel: the exact same framing, size and position of the head, the same pose, hair strands, wind, mouth, blush, uniform, colours, line art and lighting. Same pure green background #00FF00.

Constraints: no redesign, no zoom, no crop change, no new strands, no text.
```
Sad smile:
```
Change: ONLY her expression — a small, gentle, sad smile: the corners of her closed lips lift slightly, her eyebrows tilt up at the inner ends, her eyes are slightly narrowed and glistening with held-back tears (a thin bright tear line along the lower eyelids, no tear falling). Nothing else changes.

Preserve: everything else pixel-for-pixel: the exact same framing, size and position of the head, the same pose, hair strands, wind, blush, uniform, colours, line art and lighting. Same pure green background #00FF00.

Constraints: no redesign, no zoom, no crop change, no new strands, no text.
```

Total for this set: ≈4,650 ElevenLabs credits (≈ $0.85).

## 3. Post-process (code, deterministic)
```bash
cd canvas-film/examples/anime
# key: green dominance → alpha, despill, 1-px choke (never ask the model for transparency)
python3 tools/key.py back_raw.png back_key.png --choke 1
python3 tools/key.py bust_raw.png bust_key.png --choke 1
# expressions: the model redraws the whole picture slightly differently even when told "only the eyes".
# Register the edit to the base (scale + shift on luminance) and paste back ONLY a feathered region.
python3 tools/patch.py bust_raw.png blink_raw.png tmp.png       --reg 420,300,1150,950 --region 528,535,712,735,6   # left eye
python3 tools/patch.py tmp.png      blink_raw.png blinkfix.png  --reg 420,300,1150,950 --region 752,548,992,765,6   # right eye
python3 tools/patch.py bust_raw.png sad_raw.png   sadfix.png    --reg 420,300,1150,950 --region 510,470,1010,930,22 # eyes→mouth
python3 tools/key.py blinkfix.png blink_key.png --choke 1; python3 tools/key.py sadfix.png sad_key.png --choke 1
# save as WebP with alpha into scenes/art/ (≈100–300 KB each)
python3 -c "from PIL import Image; Image.open('bust_key.png').save('scenes/art/bust.webp','WEBP',quality=92,method=6)"
```
Coordinates in `--reg` / `--region` are pixels of the 1664×2080 bust; measure your own on a crop. Patch on the **raw green**
images, key afterwards. Check every patched face at full size: a too-small region leaves a ghost of the open eye.

Measure the figure once for placement (we stored it as `BACK = { foot: 1941, head: 76, cx: 598 }`):
```bash
python3 -c "from PIL import Image; a=Image.open('back_key.png').getchannel('A').point(lambda v:255 if v>40 else 0); print(a.getbbox())"
```

## 4. Bring the art to life in the scene (`scenes/cutout.js`)
- `Cutout.load(name, 'art/name.webp')` in `init` (await all before the first frame).
- `Cutout.warp(ctx, img, x, y, w, h, field, {nx, ny})` draws the art as a triangle mesh; `field(u, v) → [dx, dy]`
  moves each vertex (u, v = 0..1 over the image). Weight the field by region: ponytail (upper right), loose locks,
  skirt (strongest at the hem); drive it with `TW(t) = floor(t*12)/12` so the drawing moves **on twos** while the camera
  moves on ones. Scale amplitudes by the figure's on-screen height.
- Swap whole drawings for expressions; a blink is one drawing held 1/8 s (on threes).
- `Cutout.relight(ctx, drawFn, o)` renders the figure once and lays scene light on it: `rim` (alpha minus alpha shifted
  toward the light, screened), `tint`, `band` (a sweeping light), or `sil` (silhouette for backlight/dusk).
- Add what the model must not draw: the cast shadow on the ground, depth-of-field background (paint the plate once, blur
  it), lens flare, dust, the compositing pass (`post()`), grain.

Placement of the back view in the 3D street (feet on the ground plane, 158 cm tall):
```js
const [X, Y] = P3(CAM.gx, 0, CAM.gz);          // feet on screen
artBack(ctx, X, Y, CAM.f / CAM.gz / 100, t, wind);   // s = px per cm
```

## 5. Render and check
```bash
cd canvas-film/examples/anime
node ../../scripts/render.mjs h --page scenes/crossing-art.html --stills 9,16.5,21.5,23.5,25,29   # look at them
node ../../scripts/render.mjs v --page scenes/crossing-art.html --stills 9,16.5,22,25,29
node ../../scripts/render.mjs h --page scenes/crossing-art.html --workers 4                       # → out/crossing-art-h.mp4
node ../../scripts/render.mjs v --page scenes/crossing-art.html --workers 4
```
32.4 s renders in ~3 min per orientation on 4 cores. Sound plan: `scenes/crossing.sound.json` (not generated yet).

## 6. Pitfalls we hit
- **Transparency**: asking for a transparent PNG with a reference image gives a painted checkerboard. Always #00FF00, key in code.
- **Drift**: "change only X" still redraws everything a few pixels off and re-invents hair strands. Register + paste regions.
- **Pick before editing**: pin one base and edit only from it (and expressions only from the picked pose), never chain
  edit-of-an-edit across poses — identity drifts per step.
- **Resolution**: 1K full-body art is too small for a medium shot; use 2K for poses you will show large.
- **Warp seams**: grow each triangle's clip by ~0.6 px; draw only the source sub-rect per triangle (much faster).
- **Light mismatch**: ask for flat even light from one fixed direction in every prompt, then add scene light in code.
- **Rule conflict**: canvas-film's SCENE-RULES say "no AI images". This hybrid belongs in its own skill (planned);
  in this folder it is an experiment, documented here.

## Files
| path | role |
|---|---|
| `scenes/crossing-art.html` | the hybrid scene (code direction + key art) |
| `scenes/cutout.js` | mesh warp + relight for keyed art |
| `scenes/art/*.webp`, `scenes/art/README.md` | the keyed drawings and their provenance |
| `tools/key.py`, `tools/patch.py` | green-screen key; drift-free expression patch |
| `scenes/crossing.html` | the all-code version (same direction, code-drawn girl) — for comparison |
| `scenes/glance.html`, `scenes/heroine.js`, `scenes/model-sheet.html` | the all-code character attempts |
