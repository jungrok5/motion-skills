# LOOK — the form, observed from the source demo

Source: Felix Rieseberg's "Sheet City" demo, https://claude.ai/artifact/VZ6Un8f7RzJArq7wqMrE72, one of the fifteen demos on
the HTML-in-Canvas demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. It was read as reference only (its HTML
and a few headless screenshots). No code, shader, data, text or sound design was copied. This file records what it looks like
and how it behaves, so the style can be rebuilt for any topic.

## What you see
- **A model on a desk.** A white spreadsheet lies on a dark-green cutting mat, seen from above and in front at about 35°,
  through a long lens (a narrow field of view, so it reads as a miniature). The sheet has thickness, like card.
- **Cells are buildings.** Inside a block of the sheet (the months × the rows of a small business's accounts) every number
  stands up as a building. One storey stands for a fixed amount. Totals are tall towers; small items are low blocks.
- **The number is the roof.** Each building's roof is the cell itself, number and all: the printed sheet is mapped onto the
  roofs at their height, so the live text rides up with the building. The walls take the cell's fill colour (blue for income,
  orange for costs, green for profit) and carry rows of windows, one per storey, some of them lit.
- **A loss digs down.** A negative cell is a red pit in the sheet, with its number on a pane of glass at sheet level.
- **Streets.** Buildings stand slightly inside their cells, so the grid lines become streets. Header row and label column stay
  printed flat, like street names.
- **Light.** A low sun comes through a window: one soft rectangle of light falls across the desk, shadows rake long toward
  the viewer, the far corners fall into shade. Ambient occlusion darkens streets between tall buildings and the foot of
  every wall. Glass reflects a cool sky.
- **Props for scale.** A yellow pencil lies beside the sheet; a cup with scoops of gelato (the business's product) stands at
  the far corner. They cast shadows like the buildings.
- **Small finish.** Rooftop plant rooms on tall towers, a vignette, a light grade, a shallow depth of field (the source
  blurs out of focus areas, keeping live text sharp).

## How it behaves
- **It is a working spreadsheet.** A plain DOM table: click a rooftop to select the cell (a blue frame on the roof, the row
  and column headers light up), type a number, press Enter. Arrows move, a second click edits, Escape cancels, Ctrl+Z undoes.
  Formulas (SUM, AVERAGE, references) recalculate.
- **A change travels.** The edited building springs to its new height with a little overshoot. Light runs from it along the
  grid lines to every cell whose formula depends on it; each dependant keeps its old figure until the light arrives, then
  counts up to the new one and its building moves. A ring of light spreads across the sheet from the edited building.
- **A slider** under the table (a rent per month) is a real range input drawn on the sheet: dragging it moves one input cell
  and the whole column of dependants with it.
- **Camera.** Drag orbits (with inertia), the wheel zooms. The opening shows the sheet flat and close, then swoops low along
  the rows while the city rises in a wave, and settles on the whole desk. The pencil then makes the first edit itself.
- **Sound.** Synthesised: soft key ticks, a tap on selection, pitched mallet notes as buildings arrive (higher for taller),
  a calm run while the slider moves.

## Technique (as understood, rebuilt in this skill's own code)
- HTML-in-Canvas: the table is a child of the canvas; its pixels are uploaded as a texture on paint.
- One instanced unit box for every building, plus the slab and the desk. Roofs and the slab top sample the sheet texture
  by world position; walls take the colour of a corner texel of their cell.
- Hit testing: a ray picks what is under the pointer (roof, wall, sheet); the sheet element is placed for the browser's hit
  testing on the horizontal plane at that height with a projective `matrix3d`, so the real cell is under the pointer.
- Shadow map from the sun, masked by a window pane in light space; occlusion read from a small height texture.

## What this skill changes
- Everything is designed per topic: the book (rows, formulas, slider), the palette, the facade styles, the desk, the light,
  the props, the writer prop and its first edit, the sound. The template is a household budget; the worked example a
  marathon training block.
- The pulses follow the real dependency graph (hop by hop, a chain of running totals lights up month after month).
- The formula field in the edit bar is live: typing there shows the draft in the cell, which recolours the building.
- No depth-of-field pass (too slow in software GL; see LESSONS), render on demand, adaptive resolution.
