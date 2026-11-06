# BRIEF — 겨울 국물 한 그릇 (a recipe booklet)

**Topic (as given):** "책도 되게" — a small book built by the swarm: a winter-soup recipe booklet, a cover and two spreads.

## 1. The book
- **Who it is for:** someone cooking their first 떡국 on New Year's morning; short, warm, exact.
- **Kind:** `doc: 'book'` · pages 520 × 720, a cover alone, then spreads (pages 2–3, 4–5) · frame 1920 × 1080 · one row.
- **Palette:** paper `#fbf8f1`, ink `#2a2622`, chili red `#c8452f`, scallion `#5f8f4e`, broth `#f3e6c8`, mute `#7a6f66`.
  Titles `serif`, body `sans`, kickers `mono`.
- **Agents:** 26, named for the kitchen in Korean — 국자, 도마, 파, 간장, 소금, 달걀, 떡, 김, 양지, 마늘.
- **Prompt:** 「겨울 국물 레시피 소책자 만들어줘 — 표지 하나, 펼침면 둘」 · **URL:** `soup-zine.pdf`

| # | page | blocks | swarm moment |
|---|---|---|---|
| 1 | cover (red) | title, subtitle, the bowl in pixels, small credit | **the whole swarm paints the bowl (12 px cells)** |
| 2 | spread 1 · left | a full-bleed top-down bowl of 떡국 (image) | the picture flies in and resolves |
| 3 | spread 1 · right | RECIPE 01 · 떡국 · ingredients (chips) · 4 steps · page no. | **six ingredient chips and four steps at once** |
| 4 | spread 2 · left | RECIPE 02 · 만둣국 · a paragraph · the heat bar (강–중–약, 12 cells) · page no. | the swarm fills the heat bar |
| 5 | spread 2 · right | a clay pot with dumplings (image) · caption · page no. | — |

## 2. Pictures (`defineArt`)
- `bowl` — 떡국 from above on a wooden table: celadon bowl, pale broth, oval rice cakes, egg ribbons, laver, scallion rings,
  beef, steam. Used twice: painted in 12 px cells on the cover (it becomes pixel art), and as the full-bleed photo.
- `pot` — a dark clay pot (ttukbaegi) of 만둣국 with dumplings and steam, on a linen ground.

## 3. Timing (≈ 36 s, 30 fps)
prompt → cover 6 s (paint 3.4 s) → spread 1 8 s → spread 2 8 s → publish + zoom-out to the three units.

## 4. Review (references/BRIEF.md rubric, plus)
- the spread reads as a book: spine shade in the gutter, page numbers outside, margins 44 px, text never crosses the gutter.
- recipes are real and consistent (amounts, times).
