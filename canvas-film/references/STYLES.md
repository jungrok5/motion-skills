# Style catalogue — 21 looks, all drawn in Canvas 2D

Choose the style for what the scene MEANS, not for variety's sake. Each entry: the look, and how it was drawn.
(Scene names are from the Bible film; the techniques are general.)

| scene | style | meaning carried | how it's drawn |
|---|---|---|---|
| opening | **one-line drawing** | one story from promise to fulfilment | a single gold polyline with glow, revealed by arc length; words written along it with a feathered mask wipe |
| creation | **light born like a lens sees it, IMAX grain** | "let there be light" | darkness over water, one point igniting into an exposure bloom with lens ghosts and an anamorphic streak, a layered corona with slowly turning rays, particles swirling into galaxies, a dive into a planet, a dawn garden |
| fall | **ink wash on rice paper** | sin spreading; God seeking | painting "paints itself" (stroke reveal), an ink drop floods it (blurred mask with uneven, tendrilled edge), dry-brush wind streaks with feathered ends, a tiny gold point surviving, a vermilion seal |
| patriarch | **soft pastel, magic hour → night** | promise under the stars | chalky pastel strokes over a toned paper speckle, one continuous camera, stars multiplying |
| exodus | **shadow puppetry** | plagues, Passover, the sea | carved hide puppets on a lamp-lit screen, joints and holes letting light through, audience heads in front; the only red is the doorpost blood; far wall hazed so silhouettes read |
| wilderness | **watercolour + parchment map** | the journey | a big map canvas with a red dashed route drawing itself, dives into watercolour vignettes (Sinai, camp, Jordan) |
| judges | **1920s silent film** | the repeating cycle | 4:3 scratched print between curtains, intertitle cards, the same shot repeated faster and more damaged each cycle, the film burning through |
| kingdom | **illuminated manuscript** | shepherd → king, an everlasting throne | vellum, lapis/vermilion border, burnished gold leaf with a moving candle glint, a gilded initial, text written in letter by letter |
| exile | **woodcut** | a kingdom split, a city falls | black ink planes cut into by white gouge strokes (pictures "carved" in), a crown cracking, captives on a white road, harps on willows |
| return | **HD-2D (pixel sprites + real light)** | rebuilding by lamplight | pixel sprites and textures, sub-pixel camera, lamp light pools, tilt-shift blur, bloom, an RPG dialogue box |
| silence | **paper-cut lightbox** | 400 years of waiting | layered paper cut-outs with soft shadows lit from behind, a year counter, seasons turning on one tree, a new star burning through |
| advent | **stained glass** | promises lit one by one, then the nativity | lead lines + coloured panes that "wake" with a light band; coloured light on the floor |
| cross | **black-and-white film + one red → Rembrandt oil** | darkness, the cost, "it is finished" | grain, high contrast, one red drop; then a top-lit oil painting of a kneeling figure under the cross's shadow |
| rise | **impasto (palette knife)** | grey world repainted in colour | thousands of knife strokes laid in grey, the stone rolls, a light burst, then every stroke re-laid in colour in a wave from the empty tomb (an accumulating mask rebuilt for any seek) |
| church | **night cinematography: upper room → moonlit ridges → night earth** | Pentecost, to the ends of the earth | a lamp-lit room of seated silhouettes rim-lit by tongues of fire, the camera through the window; layered night ridges with haze, lantern streams lighting villages; a per-pixel night globe with city lights spreading and dawn on the limb |
| renewal | **watercolour handscroll** | desert → garden | a painting front sweeping across, a tear wiped away in close-up, a city of light painted in |
| mirror | **luxury product shot, inside out** | idols melt into a mirror | one gold object on a black plinth under a spotlight, melting from shape to shape (calf → money → trophy → thumbs-up → self → mirror) |
| gospel | **the gold line, one tracking shot** | 7 essentials, then the cross | in the dark, one gold line runs left to right and draws each truth in light (bars short of glory, a ladder crumbling into a mirror, a gift, a robe of light, 66 points turning to the One, a dial filling); the line becomes the cross |
| evidence | **archive light table + loupe + data chart** | the record holds up | a cool light table, glass negatives developing, a loupe landing, a chart of books/authors/years, scroll strips matched word by word; drawn objects tagged "reconstruction" |
| ship | **paper pop-up book** | changing ships, not scrubbing decks | cut paper with white borders and cardboard edges, pieces popping up with bounce, signs swinging on strings, captions on a dark band |
| invite | **the gold line returns** | a prayer written in light | the line writes each sentence of the prayer, pulls back into one line, ends on the title card |

## Recurring craft
- Texture: `Pilot.speckle` paper/grain overlays, fbm-driven edges; never perfectly straight lines in hand-made styles.
- Light: radial gradients + `shadowBlur` glow + additive (`lighter`) bloom; a single motivated light source per shot.
- Motion: camera moves are slow eased pans/push-ins; reveals are masks, not fades, where the style allows (paint, ink, carve).
- Colour discipline: one accent colour per style (the red in B&W, the gold line, the vermilion seal).
