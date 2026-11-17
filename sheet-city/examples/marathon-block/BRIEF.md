# BRIEF — Marathon block (12 weeks to a spring marathon)

## Question
If I push a run harder (a longer tempo, a bigger peak long run), how much do my weekly kilometres, my hours on my feet
and my running total grow, week by week up to race day?

## Book
- Sheet name: "Spring 42" · head row: "Spring marathon", W1–W12, Total
- Columns: 12 weeks (B–M), equal width 90 px; column N sums each row (printed flat)
- Rows, back to front:
  1. Week km · `week` · `=SUM(easy…intervals)` · the tallest, at the back
  2. Hours on feet · `hours` · `=ROUND(week × easy pace / 60, 1)` · own unit: half an hour a storey
  3. Easy · `easy` · typed
  4. Long run · `long` · `=ROUND(peak × share)`, week 12 is the race (42.2)
  5. Tempo · `tempo` · typed
  6. Intervals · `ints` · typed (smallest, in front)
  7. Km so far · `sofar` · running sum `=prev + week` — printed flat in front of the city (as buildings it would hide
     behind the week totals); every edit's light hops along it week after week
- Pits: none (no row goes below zero in a training plan)
- Slider: B10 "Peak long run km", 20–38 step 1; every long run, week total, hours and the running sum read it
- Second input: B9 "Easy pace min/km" 6.1 (typed)
- unit 4 km a storey · storey 14 px · tallest 470 · deepest 50
- Shape: build-up with cutback weeks 4 and 8, peak in week 10, taper in 11–12

## Look
- Paper #fffdf8 · ink #22201d · grid #e2ddd3 · accent (track orange) #e8582a
- Fills: week teal #c9eee6 (curtain glass), hours lilac #ded8f5 (bays), easy green #e5f3d6, long blue #cfe4ff (ribbon),
  tempo amber #ffe7b0, intervals rose #ffd8df (punched); km so far printed on pale teal
- Desk: wood #7b5233 (a kitchen table after the evening run) · backdrop #241c18
- Light: evening, sun low from the right and behind [0.6, 0.36, −0.46], warm #ffc98a ×1.4, sky #4a5676, bounce #9c6a44;
  window with 2 × 1 mullions throwing bars across the table; 15 % lit windows
- Camera: yaw +0.24 (from the front left, against the light), pitch 0.62

## Props
- Writer: an orange felt-tip pen, front left, lying along x (custom writer, tip at 470 px)
- A teal water bottle behind the sheet at the far left (lathe + cap + loop)
- A steel stopwatch lying in front at the right (lathe case, white face, crown, orange button and hand)

## First edit
H6 (tempo, week 7): 10 → 14. Week 7's total and hours rise, and the light hops along "Km so far" from week 7 to week 12.

## Sound
Minor pentatonic [0, 3, 5, 7, 10], base 196 Hz, glass timbre (an evening, quieter than the budget's marimba).

## Wording
Hint: "Click a rooftop, type kilometres, press Enter — or drag Peak long run". Labels are the plan's own words.

## Still review
- idle: rows read back to front (teal week skyline, lilac hours, then the runs); evening bars of light across the table;
  bottle and stopwatch in frame, pen off the sheet. First pass: the running sum stood behind the week totals and was
  hidden → moved to a printed row in front. Props at the right edge were cut → moved and the fit includes props.
- edit: the ring spreads from the edited roof; light runs up the column to the week total and along the running sum.
- orbit / close: roof numbers readable, kit boxes clear of the digits.
