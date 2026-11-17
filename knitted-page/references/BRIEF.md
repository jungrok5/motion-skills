# BRIEF — from a topic to a knitted page

Write the brief (copy `templates/BRIEF.md` into the project as `BRIEF.md`) before any code. Every field below is designed
for the topic; the template's fair poster and the example's recipe are only examples of the style.

## The fields

1. **What the page is.** One line: who would knit this and why (a club scarf page, a recipe card handed down, a lodge's
   menu board, a fair poster). The knitting should belong to the topic — that is what makes the joke land.
2. **What it does.** 2–4 real controls with real behaviour: a stepper that rewrites quantities, a timer whose digits
   re-knit each second, a colourway switch, a vote counter, a toggle. Mark one `data-hic-click` (a counter or toggle), the
   editable headline `data-hic-edit`, the Unravel control `data-knit-unravel`. Name the Unravel control for the topic
   ("Pull a thread", "Frog it", "Unpick"), the knit-back control too ("Knit it back up", "Cast on again").
3. **Words, cut to stitches.** At the chosen gauge, a letter needs ≥ 6–7 rows of cap height. The headline 120–160 design px
   (2 lines), every other line 60 px+ in capitals with letter-spacing .06–.08 em, heavy weight (system stack:
   `"Arial Rounded MT Bold", ui-rounded, Nunito, Inter, system-ui` at 900). Cut words until they fit: three short lines
   beat a paragraph. Inverse text (light on dark) needs even more weight and spacing.
4. **Yarns.** 2–5 colours per colourway as CSS variables on the card (`--bg`, `--ink`, `--accent`, …) and `palette` listing
   them (`['--bg', '--ink', '--accent']`) so a stitch near a yarn takes it exactly. Yarn colours, not screen colours:
   oatmeal, navy, brick, moss, mustard, heather. Optional colourways (radios that swap a class).
5. **Yarn and gauge.** `stitch: [w, h]` design px (10 × 8 is a good default; real stitches are wider than tall), the card
   size (≈ 110–130 stitches across, 80–115 down), and `yarn`: wool (thick .21, fuzz .8, twist .55), cotton (thick .23,
   fuzz .35, sheen .3, twist .7, ply 4), mohair (fuzz 1, sparkle .4, thick .19), acrylic (sheen .35, fuzz .4).
6. **Motifs.** Bands (Fair Isle peeries, apples, footballs, snowflakes, hearts) as digit strings repeated across the card,
   and at most one intarsia picture (a star, an apple, a club crest) — generated in the page if it is round. Design them
   on the stitch grid: a 10 × 8 stitch is 1.25 × wider than tall, so a round picture has 1.25 × more rows than columns.
7. **Table and lamp.** Where the knitting lies: `wood` (a farmhouse table, a lodge bar), `linen` (a sideboard), `gingham`
   (a kitchen), `felt` (a games table, a club noticeboard); its colours and scale; the lamp's place and warmth.
8. **Needles.** Bamboo (`shaft '#cfa46a'`, metal 0), steel (`'#b9bec6'`, metal 1), a coloured knob.
9. **The reveal.** What lies under the knitting (`#under`, same box as the card): a raffle ticket, a handwritten secret, a
   coupon, a team sheet, a map to the lodge — real HTML with its knit-back control. Keep its control clear of the heap
   (`heap: {x, y}` as fractions of the card). Or no reveal: the bare table then knits back by itself.
10. **Hint and sound.** The hint line ("Type in the title · pull the loose thread"); `soundPitch` (lower for chunky).

## The still review (every still must pass)

Render `idle`, `pull --u 0.35`, `bare`, `knit --u 0.5`, `type`, `intro --at 0.8` and a phone `idle` (390 × 844).

- **Reads in stitches?** Every word on the card can be read in the idle still. If a line is mush, make it bigger, shorter
  or capitals — never smaller.
- **Clean yarns?** No stray in-between colours at letter edges (green specks between navy and cream mean the palette is
  too wide or `paletteReach` too large). Swatches that should keep their own colour do.
- **Motifs whole?** Bands repeat evenly and are centred; the intarsia picture is round, not squashed; nothing is cut by the
  card edge.
- **Composed at rest?** The card sits on the table with its shadow; the thread hangs off the top corner, in the margin, not
  over any text; the hint and the sound toggle do not overlap (phone too).
- **Pull and heap?** The strand runs from the unravelling row to the hand and on to the heap; the heap does not cover the
  reveal's text or its control; heap colours are the page's yarns.
- **Knit back?** The needles read as a pair at the working row, with shadows; the strand feeds them from the heap.
- **Alive, with weight?** In the live page: the loose end drifts at rest, a pull starts slow and runs, the last rows of a
  knit-back slow down, typed letters knit in row by row. Nothing jumps or stops dead.
