# TOOLS — dry media as numbers

`lib/tools.js` defines each medium by how it meets the paper. The surface simulates a sheet with **tooth**: a height map
of grain. A stroke's pressure decides how deep into the grain pigment reaches:

```
catch  = pressure × coverage × tip-striation − (1 − tooth height levelled by earlier pigment) × tool.tooth
alpha  = clamp(catch × gain) × opacity × (1 − fill × sat) × powder speckle × region edge
colour = mix(colour, stick colour (+ smear of what is there), alpha);  fill += alpha × fillRate
```

| tool | width | how it behaves | use it for |
|---|---|---|---|
| `softPastel` | 14 | dusty, only the peaks at light pressure, saturates (more layers stop sticking) | block-in on its side, haze, mist, glow, dust in light |
| `oilPastel` | 10 | waxy, opaque, streaky, does not saturate — light goes over dark, smears a little | masses, skies, clouds, snow, water, light over shadow |
| `pastelPencil` | 3.2 | soft pastel in a point | edges, small forms, lines in pastel pieces |
| `colouredPencil` | 2.2 | fine, grain shows for a long time, builds colour in layers | the smallest marks at the focus: birds, windows, grass, hatching in shadows |
| `conte` | 6 | dense, dark, square | the darkest accents, tree lines, stems |
| `charcoal` | 8 | very grainy, dusty, dark | dramatic darks, smoky masses (a monochrome piece) |
| `waxCrayon` | 7 | bright, waxy, resists layering | naive / childlike pieces, bright scribbles |
| `blender` | 22 | finger / stump: drags colour along, softens, fills grain | soften a sky gradient, push distance back (not counted as a tool) |
| `eraser` | 10 | kneaded eraser: lifts back toward the paper colour | rays, mist, light taken out of a dark |

## Choosing 3–5

Give every tool a job in the brief. Good combinations:
- **soft pastel + oil pastel + coloured pencil** — air, mass, detail (the default; the source's look)
- **+ Conté** for real darks, **+ eraser** when light must be *taken out* (rays, fog)
- **charcoal + white pastel pencil + one coloured soft pastel** — a near-monochrome night or storm
- **wax crayon + coloured pencil + oil pastel** — a childhood memory drawn the way a child's tools draw

## Making your own

`tool('oilPastel', { width: 16, streak: 0.8, name: 'fat oil stick' })` overrides a preset; `tool({ … })` starts from the
defaults (see the comments in `lib/tools.js`). The brief names it and says why: a "sunset stick" with `smear: 0.3` that
pulls the colour below into itself, an "ice pencil" with `tooth: 1, opacity: 0.4`. Invented colours go in the palette,
not the tool.

## Paper

`new Drawing({ paper: { color, grain, tooth, fibre } })`. Colour matters as much as the tools: the grain shows the paper
wherever pressure is light. Warm cream (`#e7ddcc`) for daylight and snow, mid grey-blue for overcast, dark indigo
(`#2a3152`) for night (white paper under a night sky reads as falling snow). `grain` is the tooth size in virtual px
(1.2–1.6); `tooth` its contrast (0.8 smooth, 1.2 rough).
