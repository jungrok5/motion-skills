# Brief · Hollow Oak honey tasting card

**Topic (as given):** "a honey tasting card for a small apiary, with honey on it instead of water"

## The page (real HTML, designed for this topic)
- **What it is:** the tasting card a small apiary hands out at the counter: five honeys from pale to dark, each with
  notes, its colour grade on the Pfund scale and a price per 250 g jar; a jar-label field and a Reserve button.
- **Headline:** "Taste the <honey> slowly." (the big dollop rests on the word *honey*)
- **Live parts:** the jar-label text field (`data-hic-edit`), Drizzle (`data-liquid=splash`, `data-hic-click`), Spoon it off
  (`data-liquid=wipe`), Reserve a jar (counts), the pantry bench (warmth, drip, honey colour, big dollop, dark pantry), a
  focus / selection read-out.
- **Keep dry:** the headline, the tasting notes, the prices (big blobs never seeded there).
- **Layout:** cream card, tasting table left, pantry bench right; one column under 860 px.

## The liquid
- **Base:** `honey` (n 1.49, low dispersion .1, amber tint, density 2.4 so a thick blob goes deep amber and its rim stays
  pale, slow slide .085, ribbon trails, ripples damped hard .955).
- **Per topic:** the honey colour follows the five varieties (acacia pale → buckwheat dark) through tint and density;
  warmth 10–40 °C sets viscosity (`slide = .085 · 1.13^(T − 22)`), so cold honey barely moves and warm honey runs.
- **Bead sizes:** 3.6–8.5 px, lobes .35 (honey rounds itself off), cap .42 with a flat top (capExp .75).

## The weather
- No rain. **Drips** from a dipper above the card: three places along the top edge, one every 2.6 s, that run down very
  slowly and leave a joined ribbon behind. Intro: the blobs land one by one (`fall`).

## The light
- A late-afternoon kitchen window: warm (`[1, .9, .72]`), three panes, light from the upper left; a cream-gold sky;
  the caustic under each blob is gold (caustic 1.0).

## Palette and type
- Paper `#f5eddc`, ink `#2b1d0f`, soft `#76604a`, accent amber `#b5600c`; dark pantry `#17110a` / `#f3e6cf` / `#e39a3b`.
- Serif headline (Iowan / Palatino / Georgia), system sans for the table, mono for the small caps. A faint comb of dots
  on the paper so bends show.

## Verbs
- Splash → **Drizzle** (a wavy ribbon of honey laid across the card from the button), Wipe dry → **Spoon it off**,
  Big drop → **Big dollop**, Dark paper → **Dark pantry**, Rain → **Drip**.

## Still review (scored)
| question | answer |
|---|---|
| Is every word readable where no blob sits? | yes; headline and prices kept dry |
| Does it read as honey, not water? | amber, deep in the middle, pale at the rim, gold caustics, ribbons |
| Does the big dollop magnify what is under it? | yes, the word "honey" reads larger through it |
| Light and dark both composed? | yes |
| Anything overlapping, cut or blank? | no |
