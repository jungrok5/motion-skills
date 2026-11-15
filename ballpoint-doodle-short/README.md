# ballpoint-doodle-short

A wordless doodle cartoon in ballpoint pen and coloured pencil on cream paper — thin wobbly outlines drawn twice,
crayon hatching with the paper showing through, round egg-shaped creatures with big glossy eyes, one red pen line for the
ground that tilts into hills, turns blue for ponds and drops at cliffs, pen effects that act, and one handwritten sign —
drawn entirely in code on an HTML Canvas, with a synthesised bouncy score and cartoon foley. Give it a topic and it writes
a brief, designs the creatures, the precious thing and the places along the line, and animates an errand-gone-wrong chase
that loops back to where it began. One page plays live with sound and renders to a 1080×1080 MP4 at 24 fps.

```bash
cd examples/seed
node ../../scripts/check.mjs index.html                                   # clean load, every shot draws, deterministic, body + film rules
node ../../scripts/render.mjs cast.html --stills 0 --scale .5             # the cast sheet → out/cast-0.png
node ../../scripts/render.mjs index.html --sheet 24 --scale .5            # 24 moments → out/seed-sheet.jpg
node ../../scripts/score.mjs score.js --dur 46.5 --out out/seed.wav       # the score → WAV
node ../../scripts/render.mjs index.html --workers 4 --audio out/seed.wav # 46.5 s → out/seed.mp4
node ../../scripts/new-film.mjs ../../../my-film                          # start your own (or --from seed)
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. To watch a page live, serve the
skill folder (`python3 -m http.server`) and open `examples/seed/`; press ♪ for the score.

Topic in, film out: the topic is first written as a brief (`references/BRIEF.md`), the creatures are designed as data
and reviewed on a cast sheet turned both ways, then the shots are written in the style's grammar (the page draws on →
the job, by a sign → it gets away → the chase along the line → the thief → the loss → it becomes something better →
home again, with a twist that could start it over).

Example: `examples/seed/` 「Water the Seed」 (46.5 s, 9 shots: Gran plants a seed and a sign, *water the seed* → Momo the
mole waters it, hums, looks away; a gust takes it → the chase down the hill → skipping lily pads across the pond → a crow
steals it and gets a can of water for it → the seed rolls off a cliff → a tear and one drop, and it comes up a sunflower →
home again: five seeds, and the sign now says *seeds*).

Made from the clip posted by Kevin Ngo on X: https://x.com/kevin_t_ngo/status/2121261917016903748?a=bVC63lRPjOI0jxwuEOg&s=19
— its look and story grammar; everything here is this repo's own code, cast and story.
Live pages: https://jungrok5.github.io/motion-skills/ballpoint-doodle-short/
