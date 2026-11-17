# PAINT — hand-painted materials

Source step 4: "the cloak gets painted strokes, 'hand-painted blue, visible brush marks'". The look is painted
**into the surfaces**, not filtered over a finished frame: every material is a texture of brush strokes drawn with
numpy (`pch/paint.py`) in the piece's own UV space. So a stroke is glued to the cloth — it swings with the cloak, it
never crawls when the camera orbits — and the same texture plays in Cycles, in the .glb and in the browser player.

## How a texture is made
1. The part builder makes the mesh with UVs; `ctx.add` measures **metres per UV unit** along u and v on that mesh.
2. The texture is sized from it (520 px per metre, ≤ 2048 px), so strokes are the same physical size everywhere.
3. Base: the mid tone. Then strokes, **dark first, light on top**: each one a long ragged-edged mark with a round,
   loaded head and a dry-brush tail that breaks into bristles; a slight value jitter per stroke and bristle streaks
   inside it. Strokes wrap round u, so a lathe (sleeve, crown) has no seam.
4. Optional frayed edge (`fringe`): pointed teeth cut out of the alpha along one edge of v → glTF alpha MASK
   (Blender: alpha through a Math Round node, dithered). The cloak's hem and the straw brim use it.
5. Pieces too small to paint (eyes, brows, buttons, clasps) keep a plain colour; small pieces (a cuff, a hand) get a
   smaller brush.

## Spec (any material, or `style.paint` for defaults)
| key | default | meaning |
|---|---|---|
| `tones` | from the colour | `[dark, mid, light, …]`. Auto: shadow cooler and deeper (pale cloth: grey-violet, soft), light warmer and paler (dark cloth: subtle) |
| `weights` | .28 / .42 / .30 (pale .10 / .52 / .38) | share of strokes per tone |
| `len`, `width` | [.07, .2], [.022, .045] m | stroke size (cloak default [.14, .34] × [.026, .05]; hat [.03, .08] × [.008, .016]) |
| `angle`, `jitter` | 90, 14° | direction in UV (90 = along v: down a cloak, radial on a brim; 0 = round a crown) and spread |
| `cover` | 1.6 | strokes per area (cloak 2.2, hat 2.4) |
| `bristle` | .5 | streaks inside a stroke |
| `lightBias` | 0 | light strokes gather toward the top (+) or the hem (−) |
| `fringe` | cloak `{depth: .06, teeth: .033, edge: "v0"}` | the frayed edge; `"fringe": 0` on the cloak (or `brimFringe: 0` on a hat) for a clean edge |
| `seed` | 11 | |

`"paint": false` on a material, or `"style": {"paintAll": false}` for plain Principled colours (then `pattern` prints
work as in cloth-rig-character).

## Getting the look
- Three or four tones of one hue, not three hues. The source's cloak: deep royal blue, mid blue, a light cyan-blue —
  the light strokes are long and few.
- Long strokes down the cloak, short round ones on the straw, small ones on cloth and skin.
- Pale shirts stain easily: if the dark strokes read as dirt, give `tones` with a cool light-grey shadow or lower its
  weight.
- The check fails a painted texture with no contrast (std of luminance < .025) and a cloak whose hem is not frayed.
