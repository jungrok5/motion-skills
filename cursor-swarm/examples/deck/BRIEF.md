# BRIEF — 밤의 도서관 (a proposal deck)

**Topic (as given):** "이 발표 장표를 커서 군단이 만드는 영상으로" — rebuild `source/night-library.pptx` (6 slides, a
neighbours' proposal to keep the local library open until midnight on Fridays) as a cursor-swarm build.

Made with the import path: `python3 scripts/import-doc.py source/night-library.pptx draft/` read every slide (2 pictures,
57 blocks: boxes, text, the bar chart's bars, the timeline), and its draft `build.html` passed check.mjs as it was. This
page is that draft with the build designed: same boards, same words and positions; new order, overlaps and swarm moments.

## 1. The document (from the file)
- **Kind:** slides · 6 boards 1280 × 720 in a 3 × 2 grid · frame 1920 × 1080.
- **Palette (kept):** navy `#1b2440`, cream `#f7f2e8`, amber `#f2a93b`, ink `#1d1d24`, mute `#6b6f80`, moon `#fbe7b0`.
  Titles `serif` (Noto Serif KR in the file → our serif + Noto Sans KR for Hangul), body `sans`.
- **Agents:** 30, named after the library — shelf, spine, folio, index, margin, lamp, card, quiet, ink, page.
- **Prompt:** 「이 제안서 장표 다시 만들어줘 — night-library.pptx」 · **URL:** `night-library.deck`

| # | board | blocks | swarm moment |
|---|---|---|---|
| 1 | 밤의 도서관 (cover) | library-at-night picture, title, subtitle, amber rule, footer | picture flies in while the title is typed |
| 2 | 도서관이 닫는 시간에… | title, question line, 3 white stat cards with 18:00 / 71% / 0곳 | **three cards dragged at once, six lines typed in parallel** |
| 3 | 금요일 18–24시 | title, amber rule, 4 bullets, lamp picture (from the right) | **four bullets typed by four agents at once** |
| 4 | 시간대별 평균 방문자 | title, a 6-bar chart, values, hours, takeaway | **the whole swarm fills the bars cell by cell (`cells`, 20 px cells)** |
| 5 | 이렇게 시작합니다 | title, timeline line, 3 dots, months, steps, notes | the line is drawn, three columns typed side by side |
| 6 | 금요일 밤, 도서관에서 만나요 | closing line, contact | everyone returns, the deck "publishes", zoom-out to all six slides |

## 2. Pictures
From the file (`assets/s01-00.png`, `assets/s03-03.png`, extracted by import-doc.py) — `image` ops with `src`.
The chart is rebuilt from its numbers (34 · 52 · 61 · 58 · 44 · 27 visitors, 18–23 h) as cells, not copied as a picture.

## 3. Timing (≈ 40 s at 30 fps, 1920 × 1080)
prompt 3.4 s → ~4.5 s per slide (the chart 6 s) → publish + zoom-out 6 s. `sync()` after every board: the camera pans to
the next slide before anyone starts there.

## 4. Review (references/BRIEF.md rubric, plus)
| check | what to look for |
|---|---|
| faithful | every slide has the file's words, numbers and pictures in the file's places — nothing lost, nothing invented |
| swarm | slides 2, 3, 4 show many cursors at once; the chart fill is the set piece |
| the pan | each slide is framed whole while it is built; the pan between slides is smooth |
