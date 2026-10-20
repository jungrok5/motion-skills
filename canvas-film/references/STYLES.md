# Style catalogue — 21 looks, all drawn in Canvas 2D

Choose the style for what the scene MEANS, not for variety's sake. Each entry: the look, and how it was drawn.
These are the 21 looks proven in this pipeline; search all 170 (with Lemo-Opuscar's) in `STYLE-INDEX.md` before choosing.
(Scene names are from the Bible film; the techniques are general.)
Many looks follow OPUSCAR 98 by Lemomo (github.com/lemomo-ai/lemo-opuscar, MIT — 98 Best Picture winners, each in its
own style; read its per-film `prompt_en` for technique detail) and the lemo-opuscar style guides; borrow the craft, write
your own renderer.

| scene | style | meaning carried | how it's drawn |
|---|---|---|---|
| opening | **one-line drawing** | one story from promise to fulfilment | a single gold polyline with glow, revealed by arc length; words written along it with a feathered mask wipe |
| creation | **light born like a lens sees it, IMAX grain** | "let there be light" | darkness over water, one point igniting into an exposure bloom with lens ghosts and an anamorphic streak, a layered corona with slowly turning rays, particles swirling into galaxies, a dive into a planet, a dawn garden |
| fall | **ink wash on rice paper** | sin spreading; God seeking | painting "paints itself" (stroke reveal), an ink drop floods it (blurred mask with uneven, tendrilled edge), dry-brush wind streaks with feathered ends, a tiny gold point surviving, a vermilion seal |
| patriarch | **soft pastel, magic hour → night** | promise under the stars | chalky pastel strokes over a toned paper speckle, one continuous camera, stars multiplying |
| exodus | **1960s epic poster gouache (after Terpning, *Lawrence of Arabia*)** | plagues, Passover, the sea | opaque gouache base + form-following strokes + cream edge highlights; painted layers in parallax: a desert at a huge low sun, Moses before colossal statues, a plague sky, one door's blood under a lamp, a corridor between towering water walls lit by the pillar of fire with a whole people walking toward camera |
| wilderness | **watercolour + parchment map** | the journey | a big map canvas with a red dashed route drawing itself, dives into watercolour vignettes (Sinai, camp, Jordan) |
| judges | **1920s silent film** | the repeating cycle | 4:3 scratched print between curtains, intertitle cards, the same shot repeated faster and more damaged each cycle, the film burning through |
| kingdom | **illuminated manuscript** | shepherd → king, an everlasting throne | vellum, lapis/vermilion border, burnished gold leaf with a moving candle glint, a gilded initial, text written in letter by letter |
| exile | **woodcut** | a kingdom split, a city falls | black ink planes cut into by white gouge strokes (pictures "carved" in), a crown cracking, captives on a white road, harps on willows, one gold star on the river |
| return | **blueprint developing into a lit 3D dusk (after *Titanic*)** | rebuilding the walls | white lines on Prussian-blue paper draw the city plan, stand up into wireframe, and colour develops outward into a golden-hour 3D world — scaffolds, builders with spears, the wall rising course by course, a ring of lamps at night, sunrise at the Water Gate |
| silence | **paper-cut lightbox** | 400 years of waiting | layered paper cut-outs with soft shadows lit from behind, a year counter, seasons turning on one tree, a new star burning through |
| advent | **stained glass** | promises lit one by one, then the nativity | lead lines + coloured panes that "wake" with a light band; coloured light on the floor |
| cross | **black-and-white film + one red → Rembrandt oil** | darkness, the cost, "it is finished" | grain, high contrast, one red drop; then a top-lit oil painting of a kneeling figure under the cross's shadow |
| rise | **impasto (palette knife)** | grey world repainted in colour | thousands of knife strokes laid in grey, the stone rolls, a light burst, then every stroke re-laid in colour in a wave from the empty tomb (an accumulating mask rebuilt for any seek) |
| church | **night cinematography: upper room → moonlit ridges → night earth** | Pentecost, to the ends of the earth | a lamp-lit room of seated silhouettes rim-lit by tongues of fire, the camera through the window; layered night ridges with haze, lantern streams lighting villages; a per-pixel night globe with city lights spreading and dawn on the limb |
| renewal | **watercolour handscroll** | desert → garden | a painting front sweeping across, a tear wiped away in close-up, a city of light painted in |
| mirror | **Warhol photo-silkscreen series** | idols, printed again and again | halftone dot plates over off-register colour blocks, every print pulled live (mesh screen, squeegee, ink bead); the idol series repeats across the wall until a wave reprints every panel as a mirror showing me |
| gospel | **the gold line, one tracking shot** | 7 essentials, then the cross | in the dark, one gold line runs left to right and draws each truth in light (bars short of glory, a ladder crumbling into a mirror, a gift, a robe of light, 66 points turning to the One, a dial filling); the line becomes the cross |
| evidence | **explorer's watercolour scrapbook (after *The English Patient*)** | the record holds up | a journal on a desk in slanting window light: taped watercolours, photos and rubbings, handwritten tallies instead of charts, the Isaiah scroll joined word to word to the printed page, real page turns, a dusk painting at the end |
| ship | **18th-century sea-chart copperplate (after *Mutiny on the Bounty*)** | changing ships, not scrubbing decks | one engraved admiralty chart (compass roses, rhumb lines, cartouches, sea monsters); engraved ships sail along drawn courses; a man crosses by boat from the pirate ship to the ship of light; the old course is struck through |
| invite | **the gold line returns** | a prayer written in light | the line writes each sentence of the prayer, pulls back into one line, ends on the title card |

## Anime (examples/anime) — beyond the Bible film
A Japanese TV/film anime look, proven on one scene (`examples/anime/scenes/crossing.html`, a schoolgirl at a railway
crossing: sky tilt-down → wide → lamp insert → train passes → dusk silhouettes).
- **Painted background, flat characters.** Skies, clouds, houses get gradients, haze by distance and detail; figures get
  flat fills, ONE hard shadow tone and a coloured ink line (`#2a2238`, ~0.35 cm at figure scale).
- **The cel trick** (`cel()`): fill the shape in its shadow colour, clip to it, fill the same shape shifted toward the
  light in the base colour. The uncovered crescent is a hard-edged shadow that follows any shape (skirt, sleeve, hair, bag).
- **Characters on twos**: quantise time for figure deformation (`TW = t => floor(t*12)/12`) while camera, train and light
  move at 30 fps. That mismatch is what reads as "anime" rather than "vector animation".
- **Cel cumulonimbus** (`cloudTex`): ~70 large interior puffs + ~230 small puffs on the outline (sides + a dome cap),
  drawn top-first so lower lumps overlap upper ones, each with a soft-toned crescent; then ONE large-scale terminator
  (the whole union shifted toward the light; what it leaves uncovered is the shadow side), a thin lit rim, a shadowed
  flat base fading into haze. Few big puffs with per-puff highlights read as a pile of balls — avoid.
- **Compositing (撮影) pass**: whole-frame blurred copy screened at ~0.2 (diffusion), a warm corner light leak, vignette,
  grain; lens flare with hexagonal ghosts on the sun→centre axis; red lamp glows as additive radial + a flattened streak.
- **A fast train**: one car texture (see-through windows: cut holes, tint, straps, reflection streak), drawn with
  ~10 additive sub-frame copies (`lighter`, alpha 1/N = true average) plus speed lines and a little camera shake; the
  background shows through the windows, so the person on the far side flickers between cars.
- Japan detail sells it: narrow-gauge double track, yellow-black crossbuck and barrier, twin alternating red lamps with
  a lit direction arrow, a vending machine, utility poles with sagging wires, crows at dusk.

## Recurring craft
- Texture: `Pilot.speckle` paper/grain overlays, fbm-driven edges; never perfectly straight lines in hand-made styles.
- Light: radial gradients + `shadowBlur` glow + additive (`lighter`) bloom; a single motivated light source per shot.
- Motion: camera moves are slow eased pans/push-ins; reveals are masks, not fades, where the style allows (paint, ink, carve).
- Colour discipline: one accent colour per style (the red in B&W, the gold line, the vermilion seal).
