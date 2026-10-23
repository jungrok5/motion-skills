# Character art for `crossing-art.html`

The heroine in the 원화판 (key-art version) is **image-model art**, not code. Everything around her — camera, sky,
train, lamps, light, compositing, timing, wind — is code. This is the "Rain Station" method
(x.com/zhu185178/status/2103757767727255661): the picture comes from an image model, the life comes from code.

| file | what | made from |
|---|---|---|
| `back.webp` | full body from behind (1152×2048) | edit of the base image |
| `bust.webp` | look-back bust, surprised (1664×2080) | edit of the base image |
| `bust-blink.webp` | same bust, eyes closed | edit of `bust`, only the eyes pasted back (`tools/patch.py`) |
| `bust-sad.webp` | same bust, small sad smile with held tears | edit of `bust`, only eyes/brows/mouth pasted back |

Model: GPT Image 2.5 (`gpt-image-2.5-sunburst`) through the ElevenLabs creative connector, 2K, quality high.
Cost for this set: about 4,650 credits (4 base candidates ≈ 760, 2+2 pose candidates ≈ 2,460, 2 expressions ≈ 1,430).

## How it was made
1. **Base**, text to image, 4 candidates, one picked (3/4 view, full body):
   > Background: a perfectly flat, uniform pure green chroma-key background, exact color #00FF00, no gradient, no floor,
   > no cast shadow, no vignette. Subject: one Japanese high-school girl, about 16, full body …, standing relaxed in a
   > three-quarter view … Character design (must stay exactly like this): chestnut-brown hair in a high ponytail tied with
   > a red scrunchie, side bangs and two long side locks …; blue eyes …; summer sailor uniform: white short-sleeve blouse
   > with a navy sailor collar trimmed with two thin white stripes, a red neckerchief …, navy pleated knee-length skirt,
   > navy knee socks, brown loafers. Medium: modern Japanese TV anime production cel art …: crisp thin coloured line art
   > (dark brown lines on skin and hair, not black), flat cel colours with one hard-edged shadow tone and small hard
   > highlights, an angel-ring highlight on the hair, soft pink cheek blush. Even, flat studio lighting from the upper left.
2. **Poses** are edits that take the base as reference, written as *Change / Preserve / Constraints*
   (back view; look-back bust with wind). Always on #00FF00 — never ask for transparency (with a reference image the
   model paints a fake checkerboard).
3. **Expressions** are edits of the picked bust ("Change: ONLY her eyes …"). The model still redraws the whole picture
   a little differently, so `tools/patch.py` registers the edit to the bust (scale + shift on luminance) and pastes back
   only a feathered region (each eye for the blink; eyes to mouth for the sad smile). The face never drifts.
4. **Key**: `tools/key.py` (green dominance → alpha, despill, 1-px choke), saved as WebP with alpha.

In the scene, `cutout.js` draws the art as a triangle mesh that code bends (ponytail, locks, skirt in the wind, on twos;
a breath), swaps drawings for blinks and expressions, and lays the scene's light on it (rim from the alpha shifted
toward the light, a cast shadow, a silhouette at dusk).

## Rig (`art/rig/`, used by `crossing-rig.html`)
Live2D-style layers: `*-under.webp` (the drawing with the loose hair removed and what was behind it painted in by one
more edit), `*-partK.webp` (the hair parts, cut from the original drawing), `bust-under-blink/sad.webp` (expressions on
the underlay), `*-rig.json` (bboxes and spines). Made with `tools/layers.py` + `tools/rigassets.py`; the two underlay
edits cost ≈1,230 credits more. `bust-facebase.webp` + `bust-front[-blink|-sad].webp` are the head-turn layers
(`tools/facelayer.py`; the face-base edit ≈710 credits). Total for all art ≈6,600 credits. An edit for the skirt
underlay was refused by the image provider's policy, so the skirt is animated in code only (flare). Prompts and
steps: `../../WORKFLOW.md` §4b.
