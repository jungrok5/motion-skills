# Style kits

A kit is one look packaged for reuse: its materials and rendering pipeline as functions (paper and tooth, light,
cut paper, a backlit screen…), separate from any story. A new film draws its own image with the kit instead of
re-deriving the look from an old scene. Kits change *how it is drawn*, never *what is drawn* — every film still
composes its own subject, beats and words.

| kit | look | carries well | worked example |
|---|---|---|---|
| `charcoal` | gothic charcoal: value image → paper-tooth pass, stick vs finger, eraser lifts, fog, one red pastel | darkness and light, temptation, fear, erasing / restoring | word-log `door-a` |
| `hopper` | Hopper-style quiet realism: a room in metres, flat matte planes, light projected from one source, cast shadows | solitude, waiting, one change in a still world | word-log `door-b` |
| `bass` | Saul Bass titles: ink/paper cut-outs, true rays, on-twos motion, cut-paper caption strips that snap on beats | stark contrast, a fast message, Shorts rhythm | word-log `door-c` |
| `puppet` | shadow puppetry: backlit cloth and lamp, punched-leather pieces on rods, distance blur, jointed hands, stage pull-back | parables and folk tales, an unseen presence, staged drama | word-log `door-d` |
| `lamplit` | a scroll under a lamp at night: parchment and wooden rollers, ink written in letter by letter, words that burn to gold, a pen of light, light running along an unrolled scroll, a burning scroll; outside, a long-exposure star sky over a walled town | Scripture as a kept, copied, fulfilled word; promise → answer; waiting years; translation | one-scroll-bible 「침묵의 400년」 |
| `inkmap` | an ink map on stained parchment (coast ripples, hatched peaks, rivers, compass): trails, marches, roads, sea lanes with ink ships, city lamps and gold routes drawn on it, one camera over one map; ships with the ancient Mediterranean/Near East (`InkMap.MED`, 70 places, example routes) | journeys, spread, preparation, "the whole region at once" | one-scroll-bible 「침묵의 400년」 |
| `illuminated` | an illuminated manuscript miniature: vellum page in candlelight, lapis and vermilion border, gothic arch, diapered ground, flat colour in ink contours, burnished gold leaf with a sweeping glint and tooled rays | kingship and glory, visions explained, angels, a still holy moment | one-scroll-bible 「침묵의 400년」 (from the first film's kingdom scene) |

Worked examples: github.com/jungrok5/word-log → `sermons/2026-10-18-1cor5/film/scenes/door-{a,b,c,d}.html` — one
30-s portrait short ("the door") in all four kits; each scene keeps only the story, the kit draws the style.
github.com/jungrok5/one-scroll-bible → `motion/films/silence400/film.html` (+ `illum-figures.js`) — a 3-minute narrated
film in both orientations and four languages drawn with `lamplit`, `inkmap` and `illuminated` (vendored as `kit-*.js`;
the refactor onto the kits was diffed pixel-identical on 276 stills).

## Each kit folder
- `kit.js` — one global (`Charcoal`, `Hopper`, `Bass`, `Puppet`, `Lamplit`, `InkMap`, `Illum`); every export commented
- `STYLE.md` — look, palette, fonts, the API with a usage example, motion grammar, performance, pitfalls
- `template.html` + `script.example.js` — a minimal new scene with a placeholder story (not the door)
- `_shared/story.js` — captions and end card from `window.SCRIPT` (`{ DUR, beat, lines, endCard }`), used by every kit

## Use
```
python3 <skill>/scripts/from-kit.py my-film --kit charcoal --id seed
```
Pages load `lib.js`, `story.js`, `script.js`, `kit-<slug>.js` from `scenes/`; the kit is copied (vendored) into the film so
improving a kit never changes a finished film. `charcoal`/`hopper`/`bass`/`puppet` are portrait-first (landscape renders
but is not composed); `lamplit`/`inkmap`/`illuminated` are composed for both orientations (their worked example ships both).

## Adding a kit
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
