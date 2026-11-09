---
name: heritage-blueprint
description: Build an interactive blueprint-style 3D model of a heritage building or artefact as one offline HTML file — cool grey paper with a blue grid, an orthographic white-and-cobalt model drawn in native WebGL with view-dependent silhouettes, a 2.85 s exploded-view animation that separates the real parts (top first) and folds back exactly, bilingual callouts (Korean or Chinese over English) pinned to the parts, rotate / pan / zoom / reset, a corner elevation diagram, and an embedded evidence ledger that marks every shape and size as documented, reported, photo-estimated or unknown. Give it a topic (a pagoda, a gate, a bridge, an observatory, a stone lantern) and it researches photos, survey drawings and records, writes a brief and a form table, designs that object's own geometry and separation story, builds, and checks the page in a browser and against the photos. Also combines finished models into one page. Use for "heritage blueprint", "exploded view of a building", "3D model of a pagoda/temple/bridge", "blueprint style 3D", "interactive architecture model", "문화유산 3D 모형", "문화재 분해도", "건축물 블루프린트", "석탑을 3D로 펼쳐 보여줘", "첨성대 같은 문화유산을 이 스타일로 만들어줘", "주제만 바꿔서 다른 건물로", "古建蓝图", "文物三维". Source — made from https://github.com/tanglele110-hash/heritage-blueprint-skill
---

# heritage-blueprint

An offline HTML page that explains how a heritage object is built. A clean orthographic model on
blueprint paper — white and cool pale-blue stone, cobalt hairlines, silhouettes that follow the
view — separates into its real parts on a click (top first, staggered, a slight overshoot, an
exact stop) and folds back along the same timeline. Thin leaders pin bilingual callouts (Korean
or Chinese above, English below) to visible faces of each part; a fixed corner diagram shows one
useful relation (an elevation, a site spacing); a height ruler fades as the parts separate.
Every shape and number comes from an evidence ledger embedded in the page, with each claim
marked `documented`, `reported`, `photo-estimate` or `unknown`. Give it a topic ("경주 첨성대",
"수원 화성 팔달문", "a Song-dynasty stone bridge") and it researches, writes a brief, designs
that object's own geometry, builds one self-contained HTML file and checks it in a browser.

Made from **heritage-blueprint** by @木渡川 (tanglele) — https://github.com/tanglele110-hash/heritage-blueprint-skill
(MIT; live work: Hangzhou landmarks, https://hangzhou-landmarks.pages.dev/). This skill keeps its
method (evidence ledger, form table, dimension register, real apertures, one fit envelope, a single
parameter source for model and diagram), its renderer and its look, and adds: locale packs so the
page can be Korean (`ko`, default, embedded Noto Sans KR subset) or Chinese (`zh`, the original
interface), a scaffold, a browser check with photo-angle stills and callout-overlap tests, and a new
worked example, `examples/cheomseongdae` (경주 첨성대), modelled from a published survey drawing.
The original's Three Pools Mirroring the Moon example and recordings are not copied (their content
rights are reserved); never re-create its Hangzhou models as a "new" piece.

**Fixed (the style)** — blueprint paper and grid, the white / pale-blue / cobalt palette, hairline
outlines and view-dependent silhouettes, no shadows or halos, orthographic isometric default view,
the exploded-view timeline (2.85 s, staggered, reversible, no loop), callout leaders (0.75 px line,
1.7 px dot), local-language-over-English type hierarchy and sizes, the bottom title block and
button, 44 px view tools, the evidence ledger and its four statuses, one offline HTML file.

**Designed per topic** — the object, period and scope; the sources and the form table; every part's
geometry (profile, plan, openings, joints); the hierarchy and which groups separate in what order
and why; the callouts and their anchors; the shared parameters; the corner diagram (or none); the
photo-match angles; the height ruler text. Nothing is copied from the example except helpers.

## What's in this folder

| path | role |
|---|---|
| `assets/blueprint.template.html` | the runtime: WebGL renderer, contours, timeline, input, callouts, locale tokens |
| `assets/locales.json` | locale packs (`ko`, `zh`): control wording, title face, callout face |
| `assets/fonts/` | Noto Sans KR 700 / 400 (KS X 1001 subset), IBM Plex Sans TC Bold (complete), OFL licences, coverage lists — see `assets/fonts/README.md` |
| `scripts/new-scene.py` | writes a work folder for a topic: `BRIEF.md`, `scene.json`, empty `evidence.json`, `geometry.js` stub |
| `scripts/build.py` | packs a scene into one offline HTML; checks the ledger, glyph coverage and that nothing loads from the network (Python stdlib) |
| `scripts/verify.cjs` | runs the page in Node with mocked WebGL: geometry, fit envelope, timeline, exact restoration, input state, label glyphs |
| `scripts/check.mjs` | Chromium pass: stills at 1920×1080 / 390×844 / 320×740 (assembled, separated, orbit), photo-angle stills, console errors, fonts, blank canvas, callouts overlapping each other / the controls / the edge / the model |
| `references/BRIEF.md` | topic → brief outline and the still-review rubric |
| `references/EVIDENCE.md` | research order, ledger statuses, form table, dimension register, photo comparison |
| `references/RUNTIME.md` | `scene.json`, `geometry.js` contract, helpers, fonts per locale, runtime invariants |
| `references/GEOMETRY-QA.md` | contacts, openings and stacked parts: what to check and how to repair |
| `references/VISUAL-QA.md` | the fixed look, interaction rules, the acceptance pass, callout rules |
| `references/GALLERY.md` | combining finished models into one page (iframes, saved views, detail mode) |
| `references/LESSONS.md` | problems met and how they were fixed |
| `examples/cheomseongdae/` | the worked example: `BRIEF.md`, `scene.json`, `geometry.js`, `evidence.json`, `make-inset.mjs`, `inset.html` |
| `LICENSE` | the original MIT licence (kept in every built page) |

## Project layout

```
<work>/                 one folder per object
  BRIEF.md              written first (references/BRIEF.md)
  scene.json            {"lang": "ko", "titleLocal", "titleEn", "geometry", "evidence", "inset"?}
  geometry.js           @params block + nodes + pose(t) + parts
  evidence.json         scope, sources, claims
  make-inset.mjs        optional: draws inset.html from the @params block
  inset.html            optional static corner diagram
<out>/<object>.html     the delivered page (one file)
<out>/stills/           check.mjs screenshots
```

Run scripts from the project root; `<skill>` is the path to this folder.

## Requirements

Python 3.9+ (build), Node 18+ (verify, check, inset), Playwright with Chromium for `check.mjs`.
The delivered page needs only a browser with WebGL.

## Workflow

1. **Topic → brief.** `python3 <skill>/scripts/new-scene.py <work> --title "<local title>" --en "<English title>" [--lang ko|zh]`.
   Fill `BRIEF.md` (`references/BRIEF.md`): object, period and scope; then research.
2. **Research and ledger.** Follow `references/EVIDENCE.md`: primary records, survey drawings,
   real photos from several directions, dated changes. Fill `evidence.json` — every claim with a
   status and sources; conflicts kept in `basis`; unknowns stay unknown. Fill the brief's form table
   from what the photos and drawings *show*.
3. **Design the separation.** In the brief, choose the groups and their order from real joints,
   construction stages or the inside you want to show; write one sentence on what the separated
   state teaches; pick 4–7 callouts and where they anchor.
4. **Model.** Put every shared number in the `@params` block of `geometry.js`, then build the
   object's own nodes with the helpers (`references/RUNTIME.md`): profiles traced from drawings,
   real openings with wall thickness, joints that meet (`references/GEOMETRY-QA.md`). Outline and
   openings first, ornament last. If a diagram helps, write `make-inset.mjs` to draw `inset.html`
   from the same block.
5. **Build and verify.**
   ```bash
   python3 <skill>/scripts/build.py <work>/scene.json <out>/<object>.html --force
   node <skill>/scripts/verify.cjs <out>/<object>.html
   ```
6. **Browser check and photo match.**
   `node <skill>/scripts/check.mjs <out>/<object>.html --angles <name>:<yaw>:<pitch>,…` with angles
   that match your photos (yaw = the direction the camera stands in, degrees from east toward north).
   It must print `"pass": true`. Then open the stills next to the photos and score them with the
   still review in `references/BRIEF.md`; any 0 is fixed (geometry, anchors, layout) and re-checked.
7. **Deliver.** The HTML path, the key sources, what is estimated or unknown, and what was tested
   (Node VM, Chromium stills, real file-open / offline, devices). Publish only if asked.

Combining several finished models on one page: `references/GALLERY.md`.

## Rules

- **Design every object anew.** A topic gets its own sources, form table, geometry, groups,
  callouts and diagram. Never re-skin the example's tower for another building, and never draw a
  generic stack and give it a real name.
- **Keep one style.** New objects use the same paper, palette, line weights, type sizes, timeline and
  controls. Adapt layout code locally (long titles, wide bridges) without redesigning the look.
- **Evidence before geometry.** No claim without a status; `reported` keeps "about"; photo estimates
  get no millimetres; unknowns are omitted or drawn as labelled simplifications. Never call a model
  an exact restoration, digital twin, CAD or BIM without survey data.
- **Real form.** Openings are real holes with thickness and inner faces; keep photographed waists,
  steps and lips; joints meet on real faces; never hide a defect with the camera, a halo or a cover.
- **One parameter source.** The model and the corner diagram read the same numbers.
- **Separation explains, it does not claim a mechanism.** Rigid transforms only; the fit envelope
  covers the whole timeline and every orbit; the camera never moves during the animation.
- **Callouts point at the right thing.** Dots on visible faces of their own part, every callout shown
  in the default separated view, no overlap with the model, each other, the controls or the edge.
- **Fonts are embedded and checked.** Never fall back silently or enlarge text; missing glyphs mean a
  different spelling (asked) or a new face in the locale pack.
- **Offline, single file.** No CDN, fetch or external asset. Do not commit third-party photos or
  drawings unless their licence allows it; cite them in the ledger instead.
- **Keep the licence.** The template's MIT notice stays in every output.

## Contract

- `scene.json`: `schemaVersion: 1`, `lang`, `titleLocal`, `titleEn`, `geometry`, `evidence`,
  optional `inset`, `edition`, `durationMs` (100–60000, default 2850).
- `geometry.js` returns `{root, pose, parts}` and optionally `guides`, `dimension`, `pivotXY`,
  `inspect`. `pose(t)`: 0 assembled → 1 separated, built from `ease(t, start, end)`. `parts[]`:
  `{node, anchor, label, text}`; `anchor` is a local point or a function of the camera basis.
- The page exposes `canvas#model[data-state]` (`closed` / `unfolding` / `open` / `folding`),
  `data-phase`, `html[data-controls-font]`, `html[data-label-font]`, `#annotations[data-labels]`
  (callout boxes) and `window.heritageBlueprint` (`setOrbit`, `toggle`, `resetView`, `state`) for
  checks.
- `evidence.json`: `scope`, `sources[] {id, title, url|file, …}`, `claims[] {parameter, status, sources, basis}`.
