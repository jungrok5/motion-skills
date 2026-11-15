# STYLE — what makes a frame read as this style

## Palette (`K.PALETTES.pop`)
vermilion `#d8322a` / `#a8231f` · cobalt `#2346b8` / `#162a78` · cyan `#3aa6c9` · emerald `#1f7a45` / `#0f4f33` · lime
`#8fc24a` · cream `#f1e6cc` / `#dccdaa` · saffron `#f2b51d` · pink `#ec6f9b` · purple `#5a3a9a` · ink `#17121c` · paper
white `#fbf7ee`. Each scene picks a **dominant** (a wall colour: red, emerald, cobalt, purple, cream stone) and spends the
rest as accents. Saturated, never pastel; never grey except marble veins.

## The picture
- **Flat fills + one cel shadow + ink outline.** `K.outline(ctx, fill, lw)`: fill, then a round-joined ink line. Shadows
  are one flat darker step (`shade(c, -.15 … -.35)`), never gradients on objects. Gradients are allowed only for skies,
  light (lamp glow) and the dark corner under the quote.
- **Pattern everywhere.** Every wall has one: damask, checker, diamond, stripes, rosette, botanical, dots, scales, tiles,
  stone blocks, collage of papers, shelves of books, frames. A plain flat wall is a missing pattern.
- **Foliage and flowers as frames.** A hanging canopy at the top edge, a hedge or garden strip at the bottom, vines
  down walls: flat leaves in 3–4 greens with a blue shadow leaf colour, roses, hydrangeas, daisies.
- **Architecture with one vanishing point.** Corridors, galleries, halls: `K.room()` — tiled floor in perspective,
  panels per bay, light strips on the ceiling, a lit door at the end. A figure tiny at the far end gives the scale.
- **Paper** is the style's material: sheets in the air, pinned on walls, flooding a floor, swirling in a vortex.

## Layers and camera
3–5 layers per shot at different depths (z .15 sky … .35 wall … .7–.9 middle … 1.1–1.3 foreground framing). The camera
always moves: push in 4–20 % over a shot, truck with a walking figure, or dolly down a corridor. Characters move on twos
(`g.twos()`), the camera and type smoothly.

## Type
White (`#fbf7ee`) over a dark corner, left third, one quote per shot. See TYPE.md.

## Transitions (the style's punctuation)
| type | reads as | use for |
|---|---|---|
| `papers` | a storm of printed sheets sweeps across and leaves the new scene | time passing, pages, news, a thought blown away |
| `crack` | the old picture cracks from a point and falls in shards | something breaking open, a revelation, collapse |
| `vortex` | the old picture twists into a spiral with sheets | confusion, a thought spiralling, a dream |
| `ink` | black ink floods up and drains to the new scene | night, forgetting, the unconscious, death |
| `slide` | the old picture whips off sideways | a sudden turn, "but" |
| `dissolve` / `white` / `black` | soft | rarely — only into the loop or for a breath |
Transitions last 0.8–1.6 s; the quote leaves just before one and the next arrives just after.

## The grade (`F.post`)
saturate 1.06, contrast 1.04, lifted blacks `#120e16`, printed-paper fibres (multiply), mild vignette, film grain. Turn
parts off only to debug: `?off=grain,paper,vignette,grade,type,dof`.

## The loop
The first shot's image returns at the end, changed (time passed, the lead turned toward us, the light later). The last
quote may be the first one again, fading instead of smearing out.
