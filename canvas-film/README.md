# canvas-film

Cinematic motion graphics drawn entirely in code — one style per scene, AI-scored, recorded to MP4 in landscape and
portrait, and published as a live multi-language web player. See **SKILL.md** for the workflow and `references/` for the
details. Quick start:

```bash
cd examples/hello
node ../../scripts/render.mjs h --scene dawn --stills 3,8          # look at out/still-dawn-h-*.png
node ../../scripts/i18n-merge.mjs ko && node ../../scripts/render.mjs h --scene dawn --lang ko --stills 8
python3 ../../scripts/publish.py && (cd site && python3 -m http.server 8000)   # open http://localhost:8000/
```
Full production example (21 scenes, 11 languages): github.com/jungrok5/one-scroll-bible → `motion/` · one-scroll-bible.com/film/
