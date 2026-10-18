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

Worked examples: github.com/jungrok5/word-log → `sermons/2026-10-18-1cor5/film/scenes/door-{a,b,c,d}.html` — one
30-s portrait short ("the door") in all four kits; each scene keeps only the story, the kit draws the style.

## Each kit folder
- `kit.js` — one global (`Charcoal`, `Hopper`, `Bass`, `Puppet`); every export commented
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
