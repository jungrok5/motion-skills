# Lessons

Problem → cause → fix, from building the skill and its two films.

- **A push hand-over jumped (frame-to-frame change 22).** The camera's z ran on an ease-in, so it was fastest at the end
  and a big mascot crossed the near plane in one frame. → Push on ease-in-out (1500 units) and fade pieces over a long
  near band (140–660 units in front of the camera). check.mjs measures adjacent frames across every overlap.
- **The LED screen scrolled its own name.** Pretendard at 800 is wide; "TALLY" needed 34 columns on a 30-column screen.
  → Rasterise at 4× and squeeze letters (0.82 → down to 0.62) before scrolling, the way LED signs do; centre on the
  measured glyph box, not the em box.
- **Stacked cards failed "blurred when it should be read".** The check measured each card at the middle of its whole
  life, when the second card was still behind the first. → Pieces take `readFrom`; `S.stack` sets it to the moment the
  card in front has lifted off. The overlap check skips pieces that are blurred (behind or out of focus).
- **Chips and sliders made cards "too long to read".** Every word counted. → Texture parts (`chips({ read: false })`,
  sliders, meta) do not count; a card's readable text is its title, one line and one number.
- **A row's last card ran off the frame.** The focused card lifts forward and grows. → `S.row` slides the whole row
  toward its focus (`follow`, default 0.35 of a gap).
- **CSS blur grew with the piece's scale.** `filter: blur()` is in the piece's own coordinates. → Divide the screen-space
  blur by the piece's scale before setting it.
- **Pretendard reserves its name under the OFL.** A subset is a modified font. → The 2,350-syllable subset is renamed
  "ALF Sans" (lib/fonts/README.md).
- **Bars of different units shared one scale** (won vs. minutes). → Each group scales to its own larger value.
