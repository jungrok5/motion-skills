# Topic → brief

Write `BRIEF.md` in the project before touching code (`templates/BRIEF.md` is the form, `examples/honey-tasting/BRIEF.md`
a filled one). The brief designs four things for the topic: **the page**, **the liquid**, **the weather** and **the light**.
The template's rain card and the example's honey card are examples of the style, never a menu to pick from.

## 1 The page
The page is the subject: a real document that someone would hold, read and use, with liquid lying on it.
- **Choose a document the topic really has.** A camera lens → its spec sheet (MTF figures, focal lengths, a serial-number
  field). A spa → the price list (treatments, minutes, prices, a booking field). A rainy-day poem → the poem on a reading
  card. An aquarium → the ticket (date, zone, a name field, a barcode drawn in CSS). A bakery → the menu.
- **Give it live parts**: one text field (`data-hic-edit`), a splash verb (`data-liquid="splash"`, `data-hic-click`), a wipe
  verb (`data-liquid="wipe"`), and one or two buttons that change the page (a counter, a toggle). The check clicks and types
  through the liquid, so they must exist.
- **A bench of real controls on the page itself** drives the liquid: `<input type=range>`, presets, switches, radio
  swatches. Name them in the topic's words (Warmth, not Viscosity; Drip from the dipper, not Rain rate).
- **Something fine to look through**: small print, a table, a pattern on the paper (ruled lines, a dot comb, graph paper). The
  liquid is only visible where it bends something; a blank page shows nothing.
- **A focus / selection read-out** (two lines of `<dl>`) proves the page is live. Keep it unless the topic has no room.
- **Keep dry**: list the selectors big beads must not be seeded on (headline, prices, notes). Small beads may sit anywhere
  but on controls.
- No clocks or dates in the page: a still must be the same picture every time.

## 2 The liquid
Start from the nearest of `LIQUIDS` (`water`, `honey`, `oil`, `mercury`, `resin`) with `{ extends: 'honey', … }`, or design a new
one from the parameters in `ENGINE.md`. Decide by what the liquid **does**, not only its colour:
| want | set |
|---|---|
| clear, lively, runs in streaks | water: n 1.33, slide 1, stick 9, trail 1, evaporate .06, ripple speed 1.55 / damp .993 |
| thick, golden, barely moves, ribbons | honey: n 1.49, tint amber, density 2.4, body .4, slide .085, ribbon 1, ripple damp .955 |
| flat beads, rainbow rims | oil: cap .3, capExp .8, sheen .55, slide .4 |
| a mirror that rolls and splits | mercury: metal 1, cap .82, slide 1.8, stick 4.5, trail 0 |
| frozen, sharp lenses | resin / glass: slide 0, evaporate 0, lens 1.8, dispersion .45 |
| cloudy (milk, absinthe louche, sea foam) | scatter .3–1 with scatterColor, low lens |
| coloured but clear (wine, tea, ink water) | tint + density; body .1–.3 |
Tie at least one control to a physical cause (temperature → viscosity, salt → index, weather → rain). Write the formula in
the brief.

## 3 The weather
`rain` (0..1), `wind` (leans the rain and the sliding beads), `drip` (`{ at: [x fractions], every: s, size }`, liquid running
down from the top edge, pre-run as ribbons at load), `intro` (`sheet`, `fall`, `none`). A spa might steam (small beads, high
rain, low slide); a honey card drips; a window poem rains; an aquarium ticket gets splashed (splash on click).

## 4 The light
`light.dir` points toward the lamp (screen axes); `window` is the bright shape every bead reflects (panes, glow, colour);
`sky`, `bounce`. Warm window for kitchens and honey, cool skylight for rain, a single hard lamp for a lab sheet.

## Verbs and wording
Rename every verb for the topic: Splash, Wipe dry, Big drop, Dark paper, Rain. Write all copy fresh for the topic.

## Still review
Render at least: idle (`--at 2`), the big drop dragged over fine text (`--act drag --to <selector>`), the splash verb
(`--act splash`), dark (`--hash dark`), and phone width (`--size 390x844`). Score each still:
1. **Readable**: every word is readable wherever no bead sits; the headline is not hidden at load (move the lens anchor if so).
2. **This liquid**: a stranger would name the liquid from the still (colour at depth, rim, caustic, how beads are shaped).
3. **The lens**: the big drop magnifies what is under it, its edge runs into the page without a seam, the highlight is a
   small bright window, no flat disc of colour.
4. **Composed**: beads in clusters and streaks, not an even sprinkle; no bead sits on a control; nothing cut off at the edges.
5. **Both papers**: light and dark both look designed; on dark paper the liquid is drawn by its rims and highlights.
6. **No noise**: no grey halos, no banding, no colour cast over the whole drop, no flicker between stills.
Fix and re-render until every answer is yes. Then run `scripts/check.mjs`.
