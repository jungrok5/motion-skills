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

Worked examples: github.com/jungrok5/word-log → `sermons/2026-10-18-1cor5/film/scenes/door-{a,b,c,d}.html` — one
30-s portrait short ("the door") in the first four kits; `sermons/2026-10-24-cross-styles/film/scenes/cs-<kit>.html` and
`sermons/2026-10-11-1cor4/film/scenes/cross-<kit>.html` — one short ("the cut cross") in the 2026-10 kits. Each scene keeps only
the story, the kit draws the style. Every 2026-10 template tells the same seed story (walk, kneel, plant, wait, sprout, stand),
so templates compare side by side; their characters come with a body rig (2-bone IK arms, hands at the grip, kneel / turn /
hold-long-object helpers — see `references/BODY-CHECK.md`).

## Each kit folder
- `kit.js` — one global per kit (`Charcoal`, `Hopper`, `Storybook`, `Ukiyoe` …); every export commented
- `STYLE.md` — look, palette, fonts, the API with a usage example, motion grammar, performance, pitfalls
- `template.html` + `script.example.js` — a minimal new scene with a placeholder story (not the door)
- `_shared/story.js` — captions and end card from `window.SCRIPT` (`{ DUR, beat, lines, endCard }`), used by every kit

## Use
```
python3 <skill>/scripts/from-kit.py my-film --kit charcoal --id seed
```
Pages load `lib.js`, `story.js`, `script.js`, `kit-<slug>.js` from `scenes/`; the kit is copied (vendored) into the film so
improving a kit never changes a finished film. Portrait-first (1080×1920); landscape renders but is not composed.

## Adding a kit
When a film's look works, pull it out the same way: write `kit.js` from the scene's style code, re-point the scene at it
and diff stills before/after (identical is the bar), then write STYLE.md, a template with a *different* subject, and a row
above. The other looks in `references/STYLE-INDEX.md` are candidates: the 21 canvas-film looks' code lives in
one-scroll-bible `motion/pilot/<scene>.html`, unpackaged.
