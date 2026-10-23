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

## 4b. Rig it like Live2D (use this, not the one-picture warp)
Warping one flat picture moves the face, body and clothes together with the hair — it reads as **a rubber print blown
by the wind** (the owner's words on `crossing-art`). Live2D cuts the drawing into parts, paints what each part hides,
and moves each part on its own pivots with physics. `scenes/crossing-rig.html` does that:

1. **Underlay** — one more edit per drawing: the same picture with the loose parts removed and what was behind them
   painted in (≈520 / ≈710 credits at 2K).
   Back view:
   ```
   Change: remove ONLY the hanging ponytail below the scrunchie — the long tail of hair that hangs down and to the right. Where it was, paint what is behind it: the back of her head and hair up to the red scrunchie (keep the scrunchie, with just a short tuft of hair under it), the back of her neck, the navy sailor collar flap with its two white stripes, and the white blouse, continued naturally.

   Preserve: everything else pixel-for-pixel: the exact same framing, size and position of the figure, the head, hair on the head, arms, skirt, legs, socks and shoes, colours, line art and lighting. Same pure green background #00FF00.

   Constraints: no redesign, no zoom, no crop change, no new strands, no text.
   ```
   Bust:
   ```
   Change: remove ONLY the long loose hair that the wind blows away from her head: the long side locks streaming out to the viewer's left (in the air beside her face and over her shoulder) and the hanging ponytail below the red scrunchie. Keep the hair on her head, the bangs over her forehead, the short hair at her temples and the red scrunchie. Where the removed hair was, paint what is behind it: her cheek, jaw line, ear, neck, the navy sailor collar and the white blouse, continued naturally; plain green where there was only air.

   Preserve: everything else pixel-for-pixel: the exact same framing, size and position of the head and shoulders, the face, eyes, mouth, blush, bangs, uniform, colours, line art and lighting. Same pure green background #00FF00.

   Constraints: no redesign, no zoom, no crop change, no new strands, no text.
   ```
2. **Cut the parts** — base vs registered underlay: where they differ (on the figure, inside a box) is a removed part.
   Gaps where hair lies over hair are bridged by a closing; each connected part gets a spine (root → tip along its main
   axis; root = the end nearest the given root point).
   ```bash
   python3 tools/layers.py back_raw.png back_under_raw.png rig back --reg 380,40,860,700 --box 470,60,920,580 --root 560,120 --min 15000
   python3 tools/layers.py bust_raw.png bust_under_raw.png rig bust --reg 500,300,1200,1000 --box 0,100,1640,1450 --root '1230,200;560,560' --min 15000
   ```
   Check the parts by overlaying `rig/*-alpha.png` and the spines on the drawing before going on.
3. **Assets** — parts cut from the keyed base (alpha × part mask), the keyed underlay, and expression underlays (the
   expression's face regions pasted into the underlay, never inside a part):
   ```bash
   python3 tools/rigassets.py rig back back_key.png scenes/art/rig
   python3 tools/rigassets.py rig bust bust_key.png scenes/art/rig --expr "blink=blinkfix.png:528,535,712,735,6|752,548,992,765,6;sad=sadfix.png:510,470,1010,930,22"
   ```
4. **Rig in the scene** (`scenes/rig.js`):
   ```js
   const R = await Rig.load('art/rig/', 'back', { parts: [{ k: 34, rootStiff: 5, damp: 4.2, gain: 1 }] });
   const th = Rig.sim(R.parts[0], t, tt => [windX(tt) * 2600 + gust(tt) * 450, 0], shotStart - 1.5);   // force in px/s²
   ctx.drawImage(R.under, x, y, R.size[0] * k, R.size[1] * k);   // rigid: breath = a tiny scale, head = a tiny rotation
   Rig.draw(ctx, R.parts[0], th, x, y, k);                         // hair skinned to its bones
   ```
   - Parts are skinned to their spine with linear-blend weights over the bones: hair bends along bones and keeps its width.
   - Each bone is an angular spring (stiff root `k·(1+rootStiff)`, soft tip `k`, `damp`); wind and gravity are torques
     relative to the drawn pose (with no wind the drawing is exactly as painted). Simulated at 240 Hz from the shot start
     (minus 1.5 s pre-roll), so any `seek(t)` gives the same frame.
   - The force is **relative to the drawn pose**: a drawing painted in a breeze gets zero-mean gusts; the train adds a
     big push. Smooth at the full frame rate (Live2D is not on twos); swap drawings only for blinks and expressions.
   - **Head turn (Live2D angle X)** on the bust: one more edit paints a *face base* (bangs and features removed,
     ≈710 credits — prompt below); `tools/facelayer.py` cuts the *face front* (everything that differs: eyes, brows,
     nose, mouth, bangs, the 3/4 contour — the union over all expressions) from each expression underlay. In the scene
     the front slides further than the base (parallax) and the whole bust turns a little with it (rigid, no artefacts).
     Keep the front/base difference small (≤ ~7 image px): larger shows the base's own contour as a ghost line.
     ```
     Change: this is an animation layer for a cut-out rig. Remove ONLY her bangs (the fringe hanging over her forehead and between her eyes) and her facial features: both eyebrows, both eyes with lashes, the nose line and the mouth. Paint what is behind them: a clean forehead with the hairline of the hair on top of her head, and smooth, plain face skin with the same skin colour, the same soft cheek blush and the same face outline and jaw. Keep the ear, the hair on top and at the back of the head, the scrunchie, the neck and the uniform.

     Preserve: everything else pixel-for-pixel: the exact same framing, size and position of the head and shoulders, the face outline, colours, line art and lighting. Same pure green background #00FF00.

     Constraints: no redesign, no zoom, no crop change, no text, no new features.
     ```
     ```bash
     python3 tools/facelayer.py rig/bust-under.png bust_facebase_raw.png scenes/art/rig bust --reg 950,100,1550,1000 --box 300,360,1010,1060 --expr "blink=scenes/art/rig/bust-under-blink.webp,sad=scenes/art/rig/bust-under-sad.webp"
     ```
   - **Skirt**: the image model refused to paint what is under the skirt (blocked by its policy — do not try to word
     around it). So the skirt is a local warp of the underlay driven by one pendulum (`Rig.pendulum`): in the wind the
     hem **flares outward and leans a little downwind** — it covers more and never reveals anything. A sideways swing
     dragged the legs below the hem into a double line.
   - Parts keep **hair-coloured pixels that really differ from the underlay** only (`layers.py` drops navy, white, skin,
     red and contours running under the hair): otherwise collar stripes or the jaw line slide with the hair.

## 4c. Painted backgrounds: repaint the code layout (scenes/crossing-paint.html)
Code-drawn backgrounds were the weakest part (flat shapes next to painted key art). Fix without losing the code's
camera: **render the code layout, have the image model repaint it, align the painting back onto the layout.**
1. `?plate=1` renders a shot's background only (no people, train, text, light); `?plate=nofront` also hides the
   objects in front of the train (near signal, pole, barrier):
   `node tools/plates.mjs scenes/crossing-paint.html --o h --out out/plates B:7 Bnf:7:nofront L:13 D:26` (and `--o v`).
2. Put each frame on the flow (it must be reachable by URL — we pushed JPEGs to the branch and used
   `creative_attach_reference_file` with the raw.githubusercontent URL), then one edit per frame, 2K, same aspect:
   ```
   Change: repaint this rough 3D layout as a finished, highly detailed anime background painting of <the place, the
   time of day>. Give everything real materials and detail: <list the materials>. <light direction, shadows, haze>.

   Medium: hand-painted background art from a 2020s Japanese anime feature film (the look of CoMix Wave Films
   backgrounds): painterly yet precise, rich texture and detail, saturated summer colours, luminous light.

   Preserve: the exact composition and perspective of this layout: <name every object the code must find again> —
   same positions, sizes and silhouettes. <state of things the code animates: lamps unlit>.

   Constraints: no people, no train, no cars, no text or lettering anywhere, no logos, no watermark, no border.
   Do not crop, zoom, rotate or shift the view.
   ```
   (≈520 credits each at 2K.) It keeps the layout remarkably well (registration found ≤1% scale and ≤4 px shift).
3. `python3 tools/plate.py painted.png out/plates/B-h.png art/plates/crossing-h.webp --front out/plates/Bnf-h.png
   art/plates/crossing-front-h.webp --grow 2` aligns the painting to the layout and cuts the FRONT layer with the mask
   the code geometry gives (difference of the two layout renders). Draw order: plate → boy → train → front → lamps.
4. What stays code, on top of the painting: lit lamps (light added at the known lamp centres), the train (a painted car
   on green, keyed, slid with motion blur; see-through windows get a dim tint behind them), the camera push, shake,
   tilt, flares, dust, the grade. A tall sky painting (3:4, text-to-image) covers the opening tilt and, blurred, the
   close-up background.
5. Light the figure like the painting: its sun is upper right, so the rim goes on the right edge, a cool multiplied
   shade on the left (`Cutout.relight` `shade`), and a cast shadow sheared toward the camera-left (her silhouette).
6. **Anime turn = key drawings**: two more bust edits (head away / side profile; ≈710 credits each) held for 3 and 2
   frames before the rig takes over with a small settle — a turn no warp or parallax could make.

## 4d. Review before anyone sees it (do every time)
```bash
node tools/review.mjs scenes/crossing-rig.html --o h --shots "7:13:0.4,14.6:20.6:0.2,20.6:22:0.1,22:26:0.25" --sheet 0.5 --out out/review
python3 tools/review.py out/review        # → out/review/report.txt, strips, film-sheet.jpg, holes-*/fidelity-*.png
```
The scene supports three review modes: `?fig=1` (only the figure, on magenta), `&rest=1` (the drawn pose: no physics,
no breath, no turn), `&orig=1` (the original flat drawings instead of the rig).
- **Automatic** (FAIL = fix first): *fidelity* — rest must reproduce orig (catches broken strands, missing pieces,
  expression masks that are too small); *seams* — cracks inside the figure beyond the drawn pose's own gaps; *jumps* —
  silhouette area pops within a shot; *motion* — a part that never moves or goes wild (from the rig's stats).
- **Look** (an agent or a person must open them): `LOOK exposed background` frames (air between hair locks is fine,
  missing skin/cloth is not); every `strip-*.jpg` (figure crops in time order — this is how motion is judged); a
  full-resolution crop of the most extreme pose of each move (the turn's first frame, the train gust's peak); the
  whole-film `film-sheet.jpg`.
- What the automatic checks did **not** catch and only looking did, in this example: collar stripes sliding with the
  ponytail, legs dragged into a double line by a skirt swing, a ghost jaw line, a half-missing smile.

## 5. Render and check
```bash
cd canvas-film/examples/anime
node ../../scripts/render.mjs h --page scenes/crossing-rig.html --stills 9,15.4,16.6,18,22,25,29   # look at them
# motion can't be judged from one still: crop the figure from a run of stills (e.g. 14.8…19.6 every 0.6 s) into a strip
node ../../scripts/render.mjs v --page scenes/crossing-rig.html --stills 9,16.5,22,25,29
node ../../scripts/render.mjs h --page scenes/crossing-rig.html --workers 4                       # → out/crossing-rig-h.mp4
node ../../scripts/render.mjs v --page scenes/crossing-rig.html --workers 4
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
- **Rubber**: never warp a whole drawing; cut parts, paint underlays, rig bones (4b).
- **Fragmented parts**: hair over hair barely differs from the underlay; blur both and close the mask (`--close`).
- **Rule conflict**: canvas-film's SCENE-RULES say "no AI images". This hybrid belongs in its own skill (planned);
  in this folder it is an experiment, documented here.

## Files
| path | role |
|---|---|
| `scenes/crossing-rig.html` | the hybrid scene, rigged like Live2D (use this) |
| `scenes/rig.js`, `scenes/art/rig/` | part skinning + spring physics; underlays, parts, rig JSON |
| `tools/layers.py`, `tools/rigassets.py` | cut parts + spines from base vs underlay; build the rig assets |
| `tools/facelayer.py` | face base + face front for the head turn |
| `tools/plates.mjs`, `tools/plate.py` | render layout frames; align a repainted background and cut its front layer |
| `tools/review.mjs`, `tools/review.py` | the review: figure/rest/orig passes, automatic checks, strips, sheets, report |
| `scenes/crossing-art.html` | the first hybrid (one picture warped — the rubber look, kept for comparison) |
| `scenes/cutout.js` | mesh warp + relight for keyed art |
| `scenes/art/*.webp`, `scenes/art/README.md` | the keyed drawings and their provenance |
| `tools/key.py`, `tools/patch.py` | green-screen key; drift-free expression patch |
| `scenes/crossing.html` | the all-code version (same direction, code-drawn girl) — for comparison |
| `scenes/glance.html`, `scenes/heroine.js`, `scenes/model-sheet.html` | the all-code character attempts |
