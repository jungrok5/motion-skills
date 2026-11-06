# IMPORT — rebuilding an existing deck, book or poster

When the user hands over a file ("이 발표 장표를 이렇게 만들어줘"), the content is theirs: keep its words, numbers, order,
layout and pictures, and design only the build.

```bash
pip install python-pptx pymupdf                       # once (only the one you need)
python3 <skill>/scripts/import-doc.py talk.pptx my-talk          # PowerPoint (Keynote / Google Slides: export .pptx)
python3 <skill>/scripts/import-doc.py booklet.pdf my-book --doc book --pages 1-9
cd my-talk && node <skill>/scripts/check.mjs build.html
```
Options: `--doc slides|book|poster|web` (default: landscape pages → slides, portrait → book) · `--pages 3-8` ·
`--width 1280` (board width; portrait PDF pages get 56 % of it) · `--agents 28` · `--title "…"`.
Other formats: export to .pptx or .pdf first (Word, InDesign, Figma → PDF). Images of slides (PNG/JPG) carry no
structure — rebuild those by hand from what you see, using the PNGs only as reference.

## What it reads
| in the file | becomes |
|---|---|
| slide / page size | board `w × h` (1280 wide; the height keeps the aspect) |
| slide background (solid) / a full-page filled rectangle (PDF) | board `bg` |
| filled shapes (rectangles, rounded rectangles, ovals) | `rect` with `fill`, `r` |
| pictures | files in `assets/` → `image` with `src` (dropped from off-screen, resolve from blocks) |
| text boxes and placeholders (pptx) / text blocks (pdf) | `text` at the box's inset position, `w` = the box, size from the run (pt → px), bold, colour, alignment; bullets as `• ` |
| font names | `serif` (serif / Myeongjo / Batang …), `mono` (mono / Courier / Consolas …), else `sans` |
| group shapes | flattened with their transform |
| tables | one text block, rows on lines, cells joined with ` · ` |
| charts, SmartArt, video, audio | not read — rebuild charts from their numbers as `cells` (the deck example does this), note the rest in the brief |

It writes `doc.json` (everything it read), `BRIEF.md` (the outline per board, with the swarm-moment column empty) and
`build.html`: per board, boxes (largest first), then pictures, then text top to bottom, `next` .22–.35 s, `sync()` after
every board. The draft passes check.mjs (text boxes that hang off a slide in the file are clamped to the board).

## Turning the draft into the build
1. **Read the brief's outline against the file**: anything missing (a chart, a picture the reader could not extract)?
2. **Design the swarm moments** — the draft has none. Typical: the chart's bars → one `cells` op (`examples/deck`: bars of
   5 × 18 px cells with 3 empty columns between, `rows = round(value × scale / 20)`), a cover title → `paint` of a
   `defineArt` lettering, a row of logos or team photos → many `image` ops with small `next` from both sides.
3. **Overlap within a board**: cards dragged together (`with:` + `delay: .12 × i`), their texts typed in parallel, a
   picture flown in `with:` the title. Keep `sync()` between boards so each slide is framed whole while it is built.
4. **Name things**: board names become labels ("03 · 제안"), ids become readable (`p-card1`), agents get names.
5. Check, look, render — and compare each slide of the MP4 with the file: nothing lost, nothing invented.
