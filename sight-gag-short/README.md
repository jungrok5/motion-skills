# sight-gag-short

A silent 25–40 s cartoon sight-gag short in the "handy hero" style: a deadpan hero strolls down one sunny painted-3D
street while one absurd gadget — by default a giant inflated glove on a stretchy rubber-hose arm out of a backpack
machine — fixes the neighbourhood's little nuisances in 4–7 quick vignettes, over one continuous street-funk groove,
ending on a pun. Everything is code (three.js, Canvas textures, a synthesised score): give it a topic and it designs
the hero, the gadget, the street, the gags and the pun, then renders a 1920×1080 MP4 and a live page.

```bash
# the worked example 「Hands Down」 (a school crossing guard, 27.5 s, 5 gags)
cd sight-gag-short/examples/crossing-guard
node ../../scripts/check.mjs index.html
node ../../scripts/render.mjs index.html --sheet 24 --scale .5 --q mb=1      # out/film-sheet.jpg
node ../../scripts/score.mjs index.html                                     # out/film.wav
node ../../scripts/render.mjs index.html --workers 3 --q mb=3 --audio out/film.wav   # out/film.mp4 (~1 h on a 4-core CPU)
python3 -m http.server   # → http://localhost:8000/index.html plays live (♪ for sound)

# a new film from the template
node sight-gag-short/scripts/new-film.mjs my-short && cd my-short   # then write BRIEF.md first
```

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU.

Source: made from Min Story Lab's X post https://x.com/minstorylab01/status/2117637253015183423 (a Seedance 2.5 clip,
"Don't call me a hero. I was just… handy."). The clip's look and gag grammar were studied; none of it is included.
Samples page: https://jungrok5.github.io/motion-skills/sight-gag-short/
