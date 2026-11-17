# BRIEF — from a topic to a jelly page

Write `BRIEF.md` in the project (copy `templates/BRIEF.md`) before touching code. The brief decides what the page *is*;
the jelly is how it is served. A jelly page is a real, small web page (an invitation, a menu, a launch, a sign-up)
set in a jelly that suits it.

## The fields

1. **Topic and job.** One line: what the page is for and what a reader does on it (RSVP, pick a cake, join a list).
   The job decides the controls. A page with no job is a poster; give it one.
2. **The page.** Its real HTML, in reading order:
   - one big editable line (`contenteditable="plaintext-only"`, `data-hic-edit`): a name, a word, a dish — short, so it
     can be 120–220 px tall; cap its length and shrink to fit;
   - one or two lines of plain text (date, place, price);
   - the topic's own controls: a text field, radios, a select, a button with `data-hic-click` that answers visibly;
   - the jelly controls, worded for the topic: flavour radios (as party colours, cake flavours, product finishes), a
     temperature range from firm to melted (a party getting warm, a launch heating up), and a drop button (Drop it,
     Plop!, Serve).
   Keep it to five rows at most: everything must be legible as candy inside the slab.
3. **Ink.** Page background transparent. Text and outlines in one dark ink (it turns into `candy`, the colour of the
   letters inside the jelly). Coloured fills (flavour dots, a highlighted chip) keep their colour. Pick `candy` for the
   topic: cream, white chocolate, marzipan, mint.
4. **Flavours (2–5).** For each: `jelly` (the colour seen through half a unit of it — saturated but not black), `glow`
   (light scattered inside, lighter), `bits` (two colours for fruit pieces), `cloth` (a tablecloth colour that suits or
   cheerfully clashes). Name them in the topic's words.
5. **Mould.** `rect` for a page that is a sign, a menu, a card; `oval` for a celebration piece. `flutes` (6–12 a
   quarter for rect; 5–9 for oval), `fluteDepth` (.05 soft – .1 deep), `tiers` (1 smooth, 2–3 an old stepped mould),
   `height` (.45 low slab – .7 tall party jelly). Margin ≥ shoulder + flutes (the engine enforces it).
6. **Material.** `firmHz` / `softHz` (a big jelly rings slower: 2.4 / 1.1; a small firm one 3.4 / 1.6), `damping`.
7. **Setting.** Cloth (`gingham` kitchen, `stripes` café, `dots` party, `linen` restaurant, `wood` bakery counter) with
   its base colour and scale; plate (`glass` or `china` with a `band` colour); the room (window colour and panes, lamp,
   wall) — warm for evening, cool for morning.
8. **Bits.** `fruit` (lit balls in the flavour's bit colours), `bubbles`, `mixed`, or `none`; `colours` for sprinkles.
   They sit under the page, so they never cover a word.
9. **Sound.** `pitch` (bigger jelly lower: .8–1.3), `wet` (.6 neat – 1.4 sloppy). Off until the visitor turns it on.
10. **Wording outside the canvas.** The hint pill ("Pull the jelly. …") and the sound button.

## Choosing for a topic (examples)

| topic | page | mould | setting | bits |
|---|---|---|---|---|
| kids' party invite (`examples/party-invite`) | name line, date, RSVP field + yes/no + send | oval, 2 tiers, deep flutes | dots cloth, china plate with a purple band | sprinkles + bubbles |
| bakery menu | dish of the day (editable), three priced items as radios, "Order" | rect, 1 tier, 10 flutes | wood counter, china plate | fruit |
| product launch | product name, one line, email field + "Notify me" | rect, tall, few deep flutes | linen, glass plate, cool room | bubbles |

## Still review (score every still; fix and re-render until all pass)

1. **Reads at a glance:** the big line and every control are legible inside the slab; nothing is cut by the shoulder or
   the flutes; no text is pale-on-pale (check the candy colour against each flavour).
2. **Jelly, not plastic:** you can see the cloth through it, coloured and darkened; walls away from the light glow; the
   top shows a window reflection, not a white smear; the foot has a wet line.
3. **Grounded:** the shadow is coloured and offset away from the light, with a bright fringe; it is attached to the foot
   at rest and soft and detached when lifted.
4. **One setting:** cloth, plate and room belong to the topic; the flavour's cloth colour does not fight the jelly.
5. **States:** at rest it is composed (`#still=1`); a pull (`--act pull --at .5`) shows a clear dent and lean with the
   page bending in it; a drop (`--act drop --at .3,.85`) shows the lift and the squash; melted (`--act melt --at 2.5`)
   is the plain page; another flavour (`--act flavour:<name> --at 1.5`) still reads.
6. **Phone** (`--phone`): the page switches to its portrait layout, nothing scrolls sideways, the big line still reads.
7. **No mud:** no dark veins or blotches on the top (they come from reflections of window bars, or bits too near a
   wall), no hard-edged shadow rectangles.
