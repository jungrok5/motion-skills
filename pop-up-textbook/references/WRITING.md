# Writing a lesson that fits and teaches

## The shape of a spread
Every spread asks the same three things of the reader, in this order:
1. **Look** — the lead and the diorama say what the thing is (one idea, one picture).
2. **Commit** — the predict question asks for a guess *before* the answer is visible. The options include the common
   misconception, worded the way a student would say it ("When electrons from the cell reach it").
3. **Check** — the flap hides the answer; the "why" explains the mechanism in one short paragraph and names the number
   that settles it. The diorama's one action lets the reader see it happen (the bulb lights at once; the electrons only
   shuffle; the June day is 16 h long).

Pick predict questions with a surprising answer; a question everyone gets right teaches nothing.

## Text budgets (the typesetter reports overflow)
| field | budget |
|---|---|
| `title` | ≤ 26 characters (one line at 64 px) |
| `lead` | ≤ 3 lines ≈ 170 characters |
| `formula.text` | ≤ 12 characters; `caption` ≤ 50 |
| `margin` | 3–5 lines, each ≤ 14 characters (it is handwriting in a narrow column) |
| `terms` | 3 items; term ≤ 18 characters, definition ≤ 70 |
| `predict.q` | ≤ 2 lines; options ≤ 3, each ≤ 40 characters |
| `predict.why` | ≤ 60 words (the card shows it in full; the page prints the first 4 lines under the flap) |
| `challenge` | ≤ 40 characters |
| `legend` | 4–8 items, each ≤ 26 characters (two columns) |
| `fig`, `action` | one line each if you can, two at most |

Use real units and values, the level's notation (`E = P t`, not `E = Pt`), and plain words. Write numbers the way the
course does (230 V, 50 Hz, 0.15 kWh). Say what is exaggerated on the page itself, in `fig`.

## Designing the diorama
- **One scene, one action.** A board with 4–8 parts; the action line names the one to poke and what to watch
  ("Close the switch (2), then watch the electrons (5)").
- **Readable from the book view.** Parts ≥ 0.01 units; tall things ≤ 0.35 (a back wall is fine); keep text on the model
  to a few words (`1.5 V`, `June`, `ON`).
- **Pop-up order** (`D.piece(obj, delay)`): base 0 → big pieces 0.1–0.3 → small parts 0.4–0.6. Pieces scale up from their
  origin, so build each piece with its origin on the base.
- **Ink, not colour.** Paper whites and creams for bodies; colour only where it means something (wire colours by
  convention, electrons blue, the Sun yellow, a red LED). Screens are cream with ink drawing, like the page.
- **Light.** The desk lamp is behind the book, so faces towards the reader are in half-shade and get light hatching;
  that is the look. For a scene with its own light (a Sun) pass `sun` to `D.ink` so the terminator is right.
- **Callouts** match the legend numbers; anchor on the part, offset outwards and upwards, away from other labels.
- **The model.** Compute every shown number from one integral or formula of `s.simT`/`s.simSince(id)`; show units.

## Tour beats (20–35 s)
lamp → book (2.8 s) · poke the first diorama · open predict · tick an answer · lift the flap (leave 2.5 s on the why card)
· next page · loupe over the formula and key words · next page · open key words · poke · close-up view · back to the lamp.
