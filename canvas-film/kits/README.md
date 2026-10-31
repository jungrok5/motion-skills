# Style kits

A kit is one look packaged for reuse: its materials and rendering pipeline as functions (paper and tooth, light,
cut paper, a backlit screen…), separate from any story. A new film draws its own image with the kit instead of
re-deriving the look from an old scene. Kits change *how it is drawn*, never *what is drawn* — every film still
composes its own subject, beats and words.

`templates.jpg` — every 2026-10 kit's template at 15 s (same seed story in each look), for picking at a glance.

| kit | look | carries well | worked example |
|---|---|---|---|
| `charcoal` | gothic charcoal: value image → paper-tooth pass, stick vs finger, eraser lifts, fog, one red pastel | darkness and light, temptation, fear, erasing / restoring | word-log `door-a` |
| `hopper` | Hopper-style quiet realism: a room in metres, flat matte planes, light projected from one source, cast shadows | solitude, waiting, one change in a still world | word-log `door-b` |
| `bass` | Saul Bass titles: ink/paper cut-outs, true rays, on-twos motion, cut-paper caption strips that snap on beats | stark contrast, a fast message, Shorts rhythm | word-log `door-c` |
| `puppet` | shadow puppetry: backlit cloth and lamp, punched-leather pieces on rods, distance blur, jointed hands, stage pull-back | parables and folk tales, an unseen presence, staged drama | word-log `door-d` |
| `flatnight` | flat night vector: deep blue layered forest, one warm candle/neon accent, soft round lights | night, longing, one light in the dark | word-log `cs-flatnight` |
| `flatcamp` | pixel-camp flat art: dithered night, chunky pixels, pixel captions | game-like fables, playful retro, small choices | word-log `cs-flatcamp` |
| `pendoodle` | pen doodle on grey paper: scratchy rain, a crow, one warm watercolour glow | quiet humour, waiting in the rain, small hope | word-log `cs-pendoodle` |
| `brushline` | single brush line on white: a bear, one honey-colour wash | minimal parables, low religious scent, one colour that speaks | word-log `cs-brushline` |
| `fogforest` | misty teal forest: silhouettes in fog, god rays, glowing stems (stag optional) | wandering, mystery, a light that guides | word-log `cs-fogforest` |
| `spiritglow` | spirit-glow forest: dark teal, luminous figures and fireflies | presence, wonder, the unseen made visible | word-log `cs-spiritglow` |
| `blueprint` | blueprint drafting: white linework, dimension lines, callouts proving what is missing | measure and shortfall, plans vs reality | word-log `cross-blueprint` |
| `glass` | stained glass: lead lines, jewel colours, light through the window | liturgy, holy light, story panels | word-log `cross-glass` |
| `risoline` | risograph line: two-ink misregistered print, grain, face inserts | everyday "my story", gentle humour, comparison | word-log `cs-risoline` |
| `monoroom` | mono-tone rain room: one violet/grey hue, hood, rain, one warm light | solitude, rain, an honest face — "that is me" | word-log `cs-monoroom` |
| `cavesil` | cave silhouette: cut-out figures against luminous blue caves, bioluminescence | descent and light, inner darkness, discovery | word-log `cs-cavesil` |
| `storybook` | painterly storybook: textured teal forest, animal pilgrims (fox, wolves) | fables, pilgrimage, polished book look | word-log `cs-storybook` |
| `minicat` | minimal line + cobalt: a cat in pyjamas, shallow water, one honey colour | quiet fables, comparison, late realisation | word-log `cs-minicat` |
| `inkcomic` | minimal ink comic: white paper, boiling marker line, a bear, one yellow highlight | dry humour, burdens, stubborn small choices | word-log `cs-inkcomic` |
| `gamecartoon` | game-ad cartoon: thick ink outlines, cel shade, gloss, storm sky → gold | energy, obstacles and rewards, reads instantly for anyone | word-log `cs-gamecartoon` |
| `pastelbook` | pastel colour-pencil picture book: teddy bears, cream road, a warm cottage door | children, home and belonging, soft hope | word-log `cs-pastelbook` |
| `clover` | pastel watercolour + pencil: hamster, clover meadow, sunbeam through a willow arch | smallness and trust, provision, rest, growth | word-log `cs-clover` |
| `inkwash` | ink + grey watercolour + orange pencil sketchbook: a crow traveller, one amber bloom | road and pilgrimage, plan vs reality, humility | word-log `cs-inkwash` |
| `graphite` | graphite night picture book: white pencil, sheet ghosts, one torch beam | fear at night made gentle, a light that seeks, comfort | word-log `cs-graphite` |
| `ukiyoe` | ukiyo-e woodblock: off-register colour blocks, sumi key line, bokashi sky, light cut as bare paper, one beni red | pilgrimage, patience, landscape bigger than people, folk parables | word-log `cross-ukiyoe` |
| `papercut` | red paper-cut: red sheets on navy, cut lace patterns, one gold piece, backlight | one among many, cutting and loss, light from behind | word-log `cross-papercut` |
| `mograph` | beat-cut motion graphics: a new world every bar (window grid, red stage, drafting sheet, 3-D keyboard with jamo that assemble into a word, bubbles, manga, kaleidoscope), chunky 3-D type; code figure by default, or a keyed video-model sprite (`tools/` keyer + footfall detector) when the owner asks | channel/series intros, one truth through many lenses, lists, joy and invitation | word-log `intro-class` |
| `lamplit` | a scroll under a lamp at night: parchment and wooden rollers, ink written in letter by letter, words that burn to gold, a pen of light, light running along an unrolled scroll, a burning scroll; outside, a long-exposure star sky over a walled town | Scripture as a kept, copied, fulfilled word; promise → answer; waiting years; translation | one-scroll-bible 「침묵의 400년」 |
| `inkmap` | an ink map on stained parchment (coast ripples, hatched peaks, rivers, compass): trails, marches, roads, sea lanes with ink ships, city lamps and gold routes drawn on it, one camera over one map; ships with the ancient Mediterranean/Near East (`InkMap.MED`, 70 places, example routes) | journeys, spread, preparation, "the whole region at once" | one-scroll-bible 「침묵의 400년」 |
| `illuminated` | an illuminated manuscript miniature: vellum page in candlelight, lapis and vermilion border, gothic arch, diapered ground, flat colour in ink contours, burnished gold leaf with a sweeping glint and tooled rays | kingship and glory, visions explained, angels, a still holy moment | one-scroll-bible 「침묵의 400년」 (from the first film's kingdom scene) |
| `pixelsea` | pixel-art dawn/sunset sea (from prompt-motion.com looks by @pluginplay and @hoyoyoda): low-res buffer blown up nearest-neighbour, Bayer-dithered sky bands, striped banded sun and broken reflection, boat, under-water cut-away, pixel figure rig with IK, typed caption boxes with a clock tag, "HIT!" impact letters, ×n counter, close-up pixel portrait | game-like fun, a catch / a score going up, dawn-to-morning time passing, light humour | examples/jjukkumi `sea-pixelsea` |
| `recipecard` | recipe explainer card (from prompt-motion.com looks by @ror_fly and @sarut0bisasuke): cream paper, one hand-inked vessel dead centre with measurement ticks, "STEP n OF N" card with the big amount, progress rail, checklist that ticks, pours/spoons/drops, steam, flames, timer dial, a phone chat card; one accent for the contents | a process start to finish, ingredients and amounts as they go in, how-to, steps of anything | examples/jjukkumi `cook-recipecard` |
| `shadowstage` | paper cut-out shadow theatre, portrait (from a prompt-motion.com look by @x4b47x): velvet curtains that part, painted sky that runs dusk → night, black cut-out town/house/lamp posts, windows that light one by one, a door that swings open throwing a warm wedge, silhouette figures with planted walks, a hanging italic plaque | home and welcome, arrival, evening, small warm lights, a story told like a fable | examples/jjukkumi `door-shadowstage` |
| `diorama` | symmetrical pastel diorama, Grand-Budapest-like (from a prompt-motion.com look by @itsolelehmann): dead-centre one-point set, purple swag curtains and pelmet, pink walls, lace tablecloth, shaded lamps, a swappable window view, frontal pastel figures with 3-D IK arms, hanging cream caption cards | gatherings, a table, a family photo, warmth with a wink, a framed "tableau" ending | examples/jjukkumi `table-diorama` |

Worked examples: github.com/jungrok5/word-log → `sermons/2026-10-18-1cor5/film/scenes/door-{a,b,c,d}.html` — one
30-s portrait short ("the door") in the first four kits; `sermons/2026-10-24-cross-styles/film/scenes/cs-<kit>.html` and
`sermons/2026-10-11-1cor4/film/scenes/cross-<kit>.html` — one short ("the cut cross") in the 2026-10 kits. Each scene keeps only
the story, the kit draws the style. Every 2026-10 template tells the same seed story (walk, kneel, plant, wait, sprout, stand),
so templates compare side by side; their characters come with a body rig (2-bone IK arms, hands at the grip, kneel / turn /
hold-long-object helpers — see `references/BODY-CHECK.md`).
github.com/jungrok5/one-scroll-bible → `motion/films/silence400/film.html` (+ `illum-figures.js`) — a 3-minute narrated
film in both orientations and four languages drawn with `lamplit`, `inkmap` and `illuminated` (vendored as `kit-*.js`;
the refactor onto the kits was diffed pixel-identical on 276 stills).

## Each kit folder
- `kit.js` — one global per kit (`Charcoal`, `Hopper`, `Storybook`, `Ukiyoe`, `Lamplit`, `InkMap`, `Illum` …); every export commented
- `STYLE.md` — look, palette, fonts, the API with a usage example, motion grammar, performance, pitfalls
- `template.html` + `script.example.js` — a minimal new scene with a placeholder story (not the door)
- `_shared/story.js` — captions and end card from `window.SCRIPT` (`{ DUR, beat, lines, endCard }`), used by every kit

## Use
```
python3 <skill>/scripts/from-kit.py my-film --kit charcoal --id seed
```
Pages load `lib.js`, `story.js`, `script.js`, `kit-<slug>.js` from `scenes/`; the kit is copied (vendored) into the film so
improving a kit never changes a finished film. The word-log kits are portrait-first (landscape renders
but is not composed); `lamplit`/`inkmap`/`illuminated` are composed for both orientations (their worked example ships both).

## Adding a kit
Looks found elsewhere (e.g. the prompt-motion.com gallery: `pixelsea`, `recipecard`, `shadowstage`, `diorama`) can also be
built straight as a kit while making a film: study the reference frames, write our own renderer, credit the source page and
creator in STYLE.md, and give it a template with the shared seed story.

When a film's look works, pull it out the same way: write `kit.js` from the scene's style code, re-point the scene at it
and diff stills before/after (identical is the bar), then write STYLE.md, a template with a *different* subject, and a row
above. The other looks in `references/STYLE-INDEX.md` are candidates: the 21 canvas-film looks' code lives in
one-scroll-bible `motion/pilot/<scene>.html`, unpackaged.

How the last three were done (a recipe that kept the bar):
1. Render the film's stills first, both orientations, every ~1.3 s (276 frames for 3 minutes), and keep them.
2. Move the drawing functions into `kit.js` **verbatim**: the same canvas calls in the same order, the same seeds. Turn
   file-level state (textures, motes, the map canvas) into `init()`/`build()` results. Pass words in as arguments;
   a kit never reads a script or translates.
3. In the film, replace the definitions with aliases (`const { scroll, glow } = Lamplit;`). Leave the scene code calling
   them as before. Keep the film's subject (figures, its own labels) in the film, e.g. `illum-figures.js` on top of
   the kit.
4. Re-render and diff every still (max channel difference 0). Then write the template with another subject and look at
   its stills in both orientations.

Where a style comes from: always search STYLE-INDEX first (our looks and kits, then Lemo-Opuscar and OPUSCAR). A borrowed
look that has been made to work in a real film comes back here as a kit. That is how the catalogue grows.
