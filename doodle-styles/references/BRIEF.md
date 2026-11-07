# Brief — from a topic to a piece

Write the brief BEFORE any code, into the piece folder as `BRIEF.md` (`new-piece.mjs` copies the form below). Ask the
person only what the request leaves open, one question at a time, your recommendation first; "you pick" means pick and
say why in one line. Everything they said goes in their words; everything you decided is marked *(mine)* so they can
veto it in one line.

## Choosing the hand

1. **A studio already has a house style?** Use it. That is the point of a house style: every hero, spot and card after
   the first arrives in the same hand. Only override one piece when the person asks.
2. **No house style yet** → show the contact sheet of THEIR subject in several hands (`sheet.mjs <piece> --pick …`), not
   a generic gallery, recommend two or three with one reason each, then save the pick: `styles.mjs pick <id>`.
3. Pick for the job before the looks (from anidoodle's picking guide):

| the piece is | reach for |
|---|---|
| warm, human, a brand with a smile; food, plants | `watercolour`, `storybook`, `crayon`, `cut-paper`, `coloured-pencil` |
| serious, a report, an essay, a founder's letter | `ballpoint`, `line-wash`, `engraving`, `charcoal`, `stipple` |
| an explainer, how-it-works, an infographic | `chalkboard`, `blueprint`, `ballpoint`, `isometric`, `flat-vector` |
| loud, social, a launch | `marker-comic`, `risograph`, `halftone`, `rubber-hose`, `pixel-art` |
| a poster, a cover, one image people keep | `woodblock`, `engraving`, `risograph`, `scratchboard`, `oil`, `dream-glaze` |
| for children, a story | `storybook`, `folk-tale`, `toy-theatre`, `toy-brick`, `crayon`, `embroidery` |
| calm, Asian, seasonal | `sumi-e`, `woodblock`, `watercolour` |

A style is a way of making marks. If the person wants "watercolour but in our brand colours", that is `watercolour`
with a `paper` setting and their local colours in the scene, not a new style.

<!-- form -->
# <title> — brief

## The point
- **Idea in one sentence** (what this picture says): TODO
- **Focal subject** (the one thing the eye lands on): TODO
- **The light** (one source, which side; what it lights; where shadows fall): TODO

## The hand
- **Style**: house style `…` / this piece only `…` — why it suits the job: TODO
- **Settings** (paper, inks, palette — only what differs from the style's defaults): TODO

## Format
- **Size**: <W×H> — where it will live (feed, site hero, print, a card): TODO
- **Film**: drawing `draw` s, hold `hold` s, life `live` s (0 = a still that draws itself; a loop if it lives): TODO
- **Life** (what moves after it is drawn, and why — steam, a flame, a leaf in wind; periodic over `live`): TODO

## The subject, built from its real structure
List every object with how it is constructed (never a bare ellipse) and its local colour, back to front:
- background: TODO (role `bg`, colour)
- ground: TODO (role `ground`)
- object: TODO — construction (`K.body` spine + widths / lathe profile / `K.tube` / `K.leaf` …), colour, `form`, `depth`
- its cast shadow (role `shadow`, away from the light): TODO
- small parts that make it read (stalk, knob, handle, rim, seam, veins): TODO
- light sources (role `glow`) and light falling on things (role `highlight`): TODO
- light lines (steam, white bars, glints — drawn as light) and dark lines (cracks, stems): TODO

## Reference
- What real thing did you look at for the shapes (a photo, a product page, the object itself)? TODO

## Words
- Title / caption (on the page, not in the picture, unless the hand carries it — e.g. a scrapbook card): TODO
<!-- /form -->

## Reviewing a still (score before showing anyone)

Render the still and two drawing moments (`render.mjs <piece> --still --at 0.3,0.7`) and score each line yes / no.
Any "no" is fixed before the piece is shown.

1. **It reads at thumbnail size.** Squint at it 200 px wide: the focal subject is the first thing you see.
2. **Real structure.** The subject is built from its parts (a calyx, a spout, a handle), not from ellipses and capsules.
3. **One light.** Shading turns away from one source; every object casts its shadow away from it; glows are the brightest
   things.
4. **The hand is unmistakable.** Printed small beside the other hands, someone would name the medium. The mark, the
   edge and the order of marks are the medium's, not a palette swap.
5. **Nothing important is lost in the medium.** Dark objects on dark grounds still separate; light lines (steam) show;
   small parts survive the coarsest hands (pixel, brick, woodblock).
6. **The drawing film tells the making.** At 0.3 and 0.7 the medium's order is visible (lay-in before paint, keyblock
   before colour, darks before lights where the medium works that way); nothing fades in.
7. **Joins.** Things rest on things: the fruit sits in the dish, the kettle on the grate; contact shadows where they touch.
8. **Design, not only no-collisions.** Would it pass as a poster? Hierarchy, breathing space, nothing cramped at the
   frame edge.
9. **Life is real and loops.** If it lives, something visibly changes every second and frame `live` meets frame 0.

Then run `check.mjs <piece>` — it proves determinism, a growing drawing with no dead air, a finished still that differs
from the bare sheet, life that moves, and a page without errors.
