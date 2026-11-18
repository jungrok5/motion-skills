# BRIEF — from a topic to a sheet city

Write `BRIEF.md` in the project (copy `templates/BRIEF.md`) before any code. A sheet city is a **working spreadsheet about the
topic** that stands up as a model city on a desk that belongs to the topic. Decide the fields below in order.

## 1. The question the sheet answers
One sentence: what the reader changes and what they watch move. "If rent rises, which months go into the red and how much
less do I save by December?" "If my tempo runs get harder, how do my weekly kilometres and hours grow?" A sheet without a
question is a table; the question picks the rows, the formulas and the slider.

## 2. The book
- **Columns**: one axis of the topic in 6–14 equal columns (months, weeks, days, branches, classes). Column A holds labels.
  A last column can sum or average (printed flat, outside the city).
- **Rows** (5–11 in the city): the inputs (typed numbers) in front, the totals and running sums **behind** them, so from the
  front the tall towers never hide the small ones. Give each row a class (`cls`) — it is its colour and its facade.
- **Formulas**: at least one total per column (`=SUM(…)`), one difference or ratio, and if the topic has one, a running total
  across the columns (`=B2+C12`): it makes the light hop column by column. Formulas: + − × ÷ ^, comparisons, SUM AVERAGE MIN
  MAX COUNT ROUND ABS IF.
- **Losses**: if a row can go below zero (left over, profit, margin), let it — it becomes a red pit.
- **The slider**: one input cell outside the city (a rate, a price, a peak, a pace) that many cells read. Range and step
  chosen so the whole range looks good (no tower past `tallest`, no forest of pits).
- **Units**: `unit` = the value of one storey, chosen so the typical item is 2–6 storeys and the tallest total 20–32
  storeys (with `storey` 14–16 px). A row in a different unit (hours, a running sum) sets its own `unit`; say so in the
  brief.
- **Data**: invent plausible numbers for the topic, with a shape (a season, a build-up, a taper). Round them. Never copy
  the reference's gelato accounts.

## 3. The look
- **Palette**: paper, ink, grid, accent (selection and slider), loss colour, and one fill per row class. Fills are light
  (they are the walls *and* the background of the roof's number): pick hue for meaning, keep lightness 82–94%.
- **Facades**: per row class one of `punched` (windows in a wall), `ribbon` (glass bands: totals), `bays` (tall narrow glass),
  `curtain` (a glass grid: running sums, the skyline).
- **Desk**: `mat` (cutting mat with a grid), `wood`, or `linen`, and a backdrop colour; the desk belongs to the topic (a
  kitchen table for a budget, a club-house bench for a team, a librarian's desk).
- **Light**: the sun's direction (low: y 0.3–0.5), its colour and strength, sky and bounce colours, the window pane (soft
  edge, mullions), the share of lit windows. Morning, afternoon or evening — say which.
- **Camera**: yaw (−0.4 … 0.4) and pitch (0.5 … 0.7). Light from behind one side, camera from the front other side.

## 4. The props (2–4)
Objects that say what the sheet is about, built from parts (`lathe`, `ball`, `box`, `torus`): a mug and coins for a budget,
a bottle and a stopwatch for training, a cup and saucer for a café, a stack of books for a library. One of them is the
**writer** (a pencil, a pen, a stylus) that makes the first edit. Place them off the sheet, at its corners; they must not
cover the edit bar.

## 5. The first edit
The writer's cell and the number it types: one edit that tells the story — a pit that closes, a chain that lights up, a
week that grows. Pick a cell in the front half whose roof is in plain view and that others depend on.

## 6. Sound
Scale (pentatonic major for calm, minor pentatonic for evening), base pitch, timbre (`marimba`, `glass`, `pluck`).

## 7. Wording
The sheet's name (the bar), row labels, the slider's label, the hint pill. Short, the topic's own words.

## Still review — every still must pass
Render `still.mjs index.html --act idle,edit,orbit,close --at 0.35` and look at each:
1. **The question reads.** From the home view, can you tell which row is which, which months are big, where the losses are?
2. **Numbers.** Roof numbers readable in the close still; none clipped by its cell; no number covered by a rooftop part.
3. **Front to back.** Tall towers are behind short ones; no row is hidden behind a wall of towers; the edit bar is free.
4. **Heights.** Nothing hits `tallest` unless it is the point; the typical item is 2–6 storeys; pits are few and readable.
5. **Light.** The window pane falls across the sheet (not the empty desk); shadows read the direction; streets darken; the
   desk has texture; the far corners fall into shade but the sheet stays legible.
6. **The change.** In the edit still the light runs along the streets to the dependants and a ring spreads from the edit.
7. **Props.** At the right scale (a pencil about one third the sheet's width), resting on the desk (no floating, no sinking),
   not over the sheet, not cut by the frame in the home view.
8. **One style.** Every building is the same card-and-glass model; new rows and props keep the same materials.
Fix the brief or the parameters and render again until all eight pass.
