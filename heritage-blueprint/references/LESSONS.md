# Lessons

Problem → cause → fix. The first group is drawn from the warnings in the original
heritage-blueprint references (Hangzhou landmarks project); the second from bringing it into
motion-skills with the Cheomseongdae example.

## From the original project

- **A landmark drawn from its name came out wrong** ("Broken Bridge" with a broken deck, a
  generic tower stack named after a real pagoda) → the shape came from the name, not photos →
  form table from photos before code; a name is never a shape.
- **A reported height was shown as a measurement** → news quoting a specialist was promoted to
  "documented" → four statuses in the ledger; `reported` keeps "about" on the page.
- **Storeys were equal-height** → the total height was divided evenly → dimension register per
  storey; unknown storeys stay unknown instead of being averaged.
- **Holes looked painted** → a dark face covered solid geometry → real apertures with inner walls
  and thickness, and silhouette contours suppressed across the opening (`opening` in contours).
- **A gourd finial lost its waist** → it was flattened to avoid a projected overlap → keep the
  photographed waist; fix the overlap elsewhere.
- **The camera shrank during the animation to make room for labels** → per-frame refit → one
  envelope over the whole timeline and every orbit angle, computed once.
- **Labels collided in the combined six-model page** → layout used width only, then forced one
  row's y → measure full bilingual boxes with real width and height before layout.
- **A stair met an imagined circle, not the platform** → an octagon's circumradius was used as the
  face distance → attach to the real edge; check final vertices, not declared numbers.
- **A system font replaced the title face silently** → only the CSS name existed → embed the
  font and check glyph coverage at build time; ask for a spelling instead of falling back.
- **Users lost the views they had tuned** → the page was reloaded before capturing state → capture
  camera / orbit / phase first, persist in the artifact, apply only at startup.

## From the motion-skills port

- **Korean titles could not build** → the only title face (IBM Plex Sans TC) has no Hangul → locale
  packs; `ko` embeds Noto Sans KR 700 / 400 subset to the 2,350 KS X 1001 syllables (about 150 KB
  each, no Reserved Font Name conflict), `zh` keeps the original complete Plex TC.
- **The callout face check failed on a comment** → a 井 in a geometry comment was scanned as label
  text → `build.py` strips comments before scanning; keep Hanja out of labels unless a face covers it.
- **Callouts ran off a 320 px screen** → the label column used a fixed right margin (108 px) shorter
  than Korean + English labels → measure the widest bilingual label and pull the column in;
  `check.mjs` fails when a box leaves the screen.
- **The mocked canvas in `verify.cjs` had no `measureText`** → the new label-box code crashed in the
  VM → the mock returns a width; real widths come from `check.mjs` in Chromium.
- **Three heights for one tower (8.77, 9.17, 9.4 m)** → different reports, datums and years →
  model the drawing's proportions scaled by its own scale bar (8.73 m), show "약 8.8 m (보도)", keep
  all values in the claim's basis.
- **Cross stones read as big blocks** → a 0.12 m projection looked heavier than in the photos →
  0.06 m, compared with the north-east photo; size and direction stay `unknown` in the ledger.
- **Seokgatap had no open survey data** → a second example would have needed invented sizes →
  ship one well-sourced example instead of two weak ones.
