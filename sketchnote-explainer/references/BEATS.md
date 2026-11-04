# BEATS — from a topic to beats to a finished sheet

## 1. The story
- Write the one sentence the viewer should leave with. Every beat serves it.
- Good topics are **transformations or journeys with stages** you can draw as objects: "from cherry to cup", "from flower
  to honey", "how a seed becomes a tree", "where rain comes from", "how a letter crosses the world". A topic that is
  only abstract ideas needs objects found for it (a scale, a gauge, a pile of coins, a clock).
- 6–12 beats + a finale, 45–75 s. One drawing and one sentence each. A number or a name per beat makes it stick
  ("~196 °C, first crack"; "≈ 1/12 tsp").
- The subtitle's main line ≤ 26 characters (Korean) so it fits one line on the card; the second line is the same idea,
  not a translation word for word.

## 2. The sheet first
Sketch the finished infographic before cutting it into beats — it is the last frame.
- **16:9 (1920×1080):** title top-left (~80, 40), note card top-right (~1500, 46, 370 × 136). The drawings run left → right
  in two or three rows below y ≈ 230; arrows lead from one stage to the next. Keep y > 1000 for small things only.
- **3:4 (1080×1440) / 9:16 (1080×1920):** title on top, the stages top → bottom, zig-zagging left and right. Keep the
  bottom ~200 px for small things only: the subtitle card sits there in every beat.
- Drawings 150–420 px across; labels 30–40 px (never under 22 — check.mjs), titles 70–90 px. Leave 40+ px between islands.
- A cross-section or close-up is a `callout` circle next to the thing, with a leader line to it.
- Something that changes over time (a colour, a level, a temperature) gets a moving part (`K.anim`, `gauge`, `swatches`).

## 3. Beats on the sheet
- `F.beat(main, second)` then that beat's drawings in drawing order: the object, then its label, then an arrow or number.
- The camera frames the beat's new drawings (`focus` to frame others too: `{ focus: ['fanner', 'gauge'] }`), as close as
  `zoom` (1.9) allows, above the subtitle card; at the sheet's edges it stops at the edge. If check.mjs says the card covers
  a drawing: move the drawing up, `{ card: 'right' }`, or a smaller `zoom`.
- Things that appear in one beat and change in the next (a level falling): a long `delay` with a short `hold` on the
  moving part, and the next beat `focus`es on it.
- `{ wait: .4 }` on a group pauses the pencil before it; `{ together: true }` starts it with the previous one.
- `F.finale(…)`: the pull-back. Then the title (`marks` = the words to highlight, `sub` = the second line) and the note card.

## 4. Timing
- Strokes take time by length (lines ~1000 px/s, words ~0.045 s a character, washes 0.2–0.6 s); `pace` on the Board
  scales them all. A beat lasts until its drawing is done plus `hold` (0.5 s), and at least long enough to read its
  subtitle. The finale holds `tail` (3 s) at the end.
- `check.mjs --beats` prints every beat's start: cut narration or music to those.
