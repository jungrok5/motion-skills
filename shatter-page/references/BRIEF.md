# BRIEF — from a topic to a shatter page

Write `BRIEF.md` (from `templates/BRIEF.md`) before code. A topic becomes four decisions: **the page**, **the material**,
**the impact**, **the room**. The engine's look stays; these change every time.

## 1. The page
- Ask what the printed thing *is* in the topic's world: a museum label ("do not touch"), a shop window notice, a score
  sheet on the ice, a phone screen protector advert, a menu on a sugar-glass sheet, a save-the-date on a plate. Its
  content is that thing, in its own voice; the breaking is the joke or the point (luck, warning, celebration, a dare).
- Controls must make sense for the topic and prove the page is live: at least one checkbox or radio group, one text field,
  the editable headline (`data-hic-edit`), the time tape (`data-shatter="time"`) and Mend. Word Mend for the topic
  ("Glue it in gold", "Refreeze", "Reprint", "Mend the pane").
- Readouts: the count in the topic's words ("23 pieces of luck", "41 shards", "12 bits of ice"), and the state words
  (`text.state`: whole, broken, held, rewinding, mended) — a celebration can say "Opa!", a warning "Told you".
- Size the page (CSS px) to the real object's proportion; type big enough to read at the pane's size on screen (headline
  ≥ 56 px on a 700 px page, body ≥ 20 px). Keep important things off the outer 8 %: they break into crumbs first.
- Clear materials: transparent page background (the glass is the paper). Opaque: give the page the glaze colour.

## 2. The material
Start from the nearest preset and change numbers for what the thing really is.
| | look | crack | physics | sound |
|---|---|---|---|---|
| window glass | clear, green edge, thin | many rays, broken rings, long daggers | heavy, low bounce | bright, long ring |
| ice | milky, thick, frosted | few, irregular rays, chunks | light, almost no friction (slides!) | dull crunch, low |
| porcelain | opaque glaze, biscuit edge | 4–6 big pieces, small crush | heavy, breaks again when it lands hard (`breakSpeed`) | short low ring, knock |
| sugar glass | amber, slightly frosted | very many rays and rings, crumbs | light, high drag, no bounce | crunchy, no ring |
| tempered (phone glass) | clear, thin | very many rays and rings (dice): rays 30+, rings 10+, ringGrow 1.3 | light | fizzing crunch |
Ask: what colour is its broken edge? does it ring? does it slide? would it break again on the floor?

## 3. The impact
- `throw`: a projectile from the viewer (ball, puck, snowball: colour, size, metal). Good for panes and signs.
- `tap`: no prop, the click is the blow (a finger on ice, a spoon on sugar glass); lower strength cracks less.
- `drop`: the click releases it; it falls and breaks where it lands (plates, cups, a phone). Tip backwards (negative `tip`)
  so it lands face up and the pieces show the print.
- Slow motion (`slowmo`, the time scale at its slowest): .12–.2 for a big crash, 1 to switch off.

## 4. The room
- Wall and floor colours from the topic's place (museum: grey plaster and parquet; rink: white boards and ice-blue
  floor; taverna: whitewash and terracotta tiles). Floor style `boards` / `tiles` / `plain` and its unit size.
- Sun colour and direction (warm afternoon, cold north light), window size and bars, ambient; floor gloss .1–.3.
- Mend seams: `gold` (kintsugi, for things that are mended with love), `line` (a pale seam), `none`.

## Still review (score every still; a still that fails a question is fixed before handing over)
Render `idle`, `crack`, `fall` (at .15 and .5), `rest`, `mended` with `scripts/still.mjs`, and look at each one.
1. **idle** — Is the whole page readable at 1280 × 800 and does it read as printed on this material (tint or glaze, rim,
   shadow on the wall)? Nothing cut off? Is the light on the wall soft and not blown white?
2. **crack** — Does the pattern read as *this* material (many fine rays for glass, few big pieces for porcelain, chunks for ice)?
3. **fall** — Do pieces have weight (big ones slow to turn, crumbs flying further)? Do some still show readable print? Is
   anything floating, frozen in mid-air or passing through the wall?
4. **rest** — Is the pile on the floor, lit, with shadows, showing print on some pieces? Is the camera framing it?
5. **mended** — Is the page readable through the seams? Do the seams run where the cracks were?
6. **phone** (390 px) — no sideways scroll, the pane fits, the hint and buttons do not overlap.
