# Brief — The Daily Loaf

## The page
- **Topic, in one line:** a bread recipe, and how people have read a recipe over five and a half centuries.
- **What the page is:** a recipe card: a heading line, the title, a picture, the ingredients with a loaves field, the
  method in four steps, a short aside and a notes log.
- **Its parts (slots):** `kicker`, `where`, `title` (editable), `ingTitle`, `loavesLabel`, `method` (list), `aside`,
  `logTitle`, `logHint`, `logButton`. The ingredients are rendered by the page from `era.data.ingredients`.
- **What the reader can do:** retitle the recipe (kept per era); change the number of loaves — the ingredients rescale in
  every era, written that era's way (¾ pint, 2.5 cups, 800 g); write a note in the log (stamped with the year).
- **The picture:** a domed bake oven with a fire, a scored loaf on a board, a sheaf of wheat. Roles: `bg`, `oven`, `mouth`,
  `fire`, `board`, `crust`, `score`, `wheat`, `stalk`, `ink`.

## The eras
| | 1450 | 1962 | 1996 | 2040 |
|---|---|---|---|---|
| label | Woodcut | Ditto | Web page | Hologram |
| why | the first printed receipts | the school handout everyone smelled | the first recipe home pages | a kitchen that shows you the steps |
| the page then | a broadside on rag paper, a woodblock picture | a spirit-duplicated worksheet | a personal home page at 640×480 | a light display over the counter |
| voice, units | "Take of fine flour one pound", fractions, roman steps | "You will need", cups and teaspoons | "My Famous No-Knead Bread", grams, exclamation marks | terse steps, grams, °C, a bake log |
| layout · type | double rule, centred small caps, red rubrics · Georgia | typed, underlined, ruled boxes · Courier New | grey page, groove rules, blue links · Times | cards and rings · Inter / system-ui |
| passes | woodcut, paper (rag, aged), desk (candle), vignette | **ditto (new)**, paper, desk (school), vignette | barrel, dither (6 levels), bloom, scanlines, mask, monitor, vignette | holo, bloom, lab, vignette |
| new pass | — | `ditto`: aniline violet, soft, fading across the sheet, a faint second image | — | — |
| surround | dark oak under a candle | a pale school desk | a beige CRT | a dark lab, an emitter ring |
| focus · dive | the picture (0.2, 0.42) · ×18 | the method (0.4, 0.62) · ×18 | the picture (0.8, 0.45) · ×14 | the picture (0.2, 0.42) · ×16 |
| room tone · arrival | the press, slow and heavy · 392 Hz | the duplicator crank · 466 Hz | fan and hum · 587 Hz | a soft pad · 784 Hz |
| accent | candle amber | violet | link blue | cyan |

The web era uploads at one texel per CSS px with nearest filtering, so its pixels are big and square on the tube.

## What travels
- Notes (each stamped with its year); the loaves value; each era's own edited title.

## Still review targets
- `still.mjs examples/daily-loaf/index.html --all` and `--phone --all`.
- Journeys: `--era ditto --travel woodcut,0.3 / 0.5 / 0.8`, `--era holo --travel web,0.5`.
- Magnified: `--era woodcut --zoom 6,0.2,0.42` (cut lines), `--era web --zoom 6,0.5,0.4` (dither + mask).

Reviewed: the first woodcut layout let the title fall to the bottom of the grid (no grid area) and the red rubrics were
being hatched as pictures; fixed with a `head` area and `toneOf` ignoring strong colours. See references/LESSONS.md.
