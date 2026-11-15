# heritage-blueprint

Interactive blueprint-style 3D models of heritage buildings and artefacts, each one offline HTML file:
blueprint paper, a white-and-cobalt orthographic model in native WebGL, a 2.85 s exploded view of the
real parts, bilingual callouts (Korean or Chinese over English), rotate / pan / zoom, a corner diagram,
and an embedded evidence ledger that marks every size as documented, reported, photo-estimated or
unknown. Give it a topic and it researches, writes a brief, designs that object's geometry and checks
the page in a browser and against photos.

Source — made from https://github.com/tanglele110-hash/heritage-blueprint-skill by @木渡川 (tanglele), MIT
(live work: https://hangzhou-landmarks.pages.dev/). Adds Korean locale packs, a scaffold, a browser
check and a new example, 경주 첨성대.

## Quick start

```bash
cd heritage-blueprint/examples/cheomseongdae
node make-inset.mjs                                                   # corner diagram from the @params block
python3 ../../scripts/build.py scene.json out/cheomseongdae.html --force
node ../../scripts/verify.cjs out/cheomseongdae.html                  # prints "pass": true
node ../../scripts/check.mjs out/cheomseongdae.html --angles ne:45:3,s:-90:0   # stills in out/stills/
```

A new object:

```bash
python3 heritage-blueprint/scripts/new-scene.py work/paldalmun --title "수원 화성 팔달문" --en "Paldalmun, Suwon"
# fill BRIEF.md and evidence.json, model geometry.js, then build / verify / check as above
```

Requirements: Python 3.9+, Node 18+, Playwright + Chromium (for `check.mjs`). The page itself needs only
a WebGL browser.

Worked example: `examples/cheomseongdae` — samples page https://jungrok5.github.io/motion-skills/heritage-blueprint/

Licences: code and template MIT (`LICENSE`, © 2026 @木渡川（tanglele）, kept in every built page); fonts SIL OFL 1.1
(`assets/fonts/`). The original's demo works and recordings keep their own rights and are not included.
