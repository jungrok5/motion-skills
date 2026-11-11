# Look

What makes the sheet read as ink on paper, with the numbers that worked. Change them knowingly.

## Ink
- **Wet and dry.** Ink enters the *wet* field (`w.ink`, the glyph stamp, the brush) and is carried by the velocity
  field. Each step a fraction dries into the *stain* field, faster where the fluid is still: `dry: 0.5 /s`. Stain does
  not move and fades at `fade: 0.07 /s` (half-life ≈ 10 s). Lower `fade` and a long session turns grey; raise it and
  nothing lasts long enough to feel like paint. `w.mark()` writes straight into the stain (a shadow under a stone).
- **Absorbance.** A pigment is what it looks like on white paper (`pigment('#b8301f')` → −ln per channel). Pigments
  add; the sheet shows `paper × exp(−ink)`, so two thin washes darken like glazes and red over blue goes to dark violet.
- **Amounts** (absorbance at the centre of a splat): brush drag 0.22 every 16 units · glyph stamp 0.7 · a splash 0.2–0.6 ·
  a wake 0.07 · a permanent mark 0.1–0.25. Radius 15–40 units. More than ~1.0 in one place reads as a hole.
- **Motion.** `velKeep: 0.5` (velocity halves each second: ink stops soon after the hand does), `curl: 9` (vorticity
  confinement — the filaments), `pressure: 18` iterations. A written glyph gets two opposite swirls (`spin 1.35`, radius
  about the glyph) and four small pushes; that is what turns it into two spirals rather than a smear.
- **Paper.** The shader multiplies ink by the paper's tooth (`grain 0.35`: granulation), darkens ink at its own edges
  (`edge 0.5`: pooling), and varies the paper tone by ±3%. Fibres are only ever *lighter* than the sheet — dark fibres
  under ink look like cracks.
- **Water** (`w.water`, Shift-drag, rain): moves stain back into the wet field and lets ~12% run off. Rain washes at
  0.1–0.16 per drop over 42 units.

## Things
- Two Canvas 2D layers go into the same shader: **things** (multiplied onto the paper like ink) and **light** (added).
  A pale colour drawn on the things layer covers the *things* under it (an eye on a dark head, a white tower in front
  of a hill) but cannot lighten fluid ink — light belongs on the light layer (`brush.glow`, plain fills).
- Marks: a `stroke` tapers at both ends (`taper: [start, end]`) and takes `dry: 0…1` for bristle gaps (0.3–0.5 for
  outlines, 0.6–0.7 for far or fast things); a `wash` is 5 overlapping pools; a `ridge` is firm on top and gone 150–230
  units below; a `leaf` is every blade, fin, feather and flag; a `dot` over 12 units is a true disc.
- Alpha is thin ink: far ridge 0.2, near ridge 0.66, a creature's body 0.8–0.9, reflections 0.15, a wash 0.2–0.5.
- Things fade in over `grow` seconds (1.2–2.5) as the glyph melts, and out over `fade`.

## Night
`w.setNight(true, x, y)` spreads from the word at 1.15 heights/s with a ragged edge. Night paper ≈ `[.02, .04, .06]`;
ink of any pigment becomes pale (`pale ≈ [.9, .94, .93]`) keeping 62% of its hue — full hue makes blue ink electric.
Things use `w.dark` (0…1) to light lamps: a lantern glow 120 units at 0.75, a moon halo 230, jellyfish 2.4 × their bell.
Day light is screen-blended at 0.85 (a moon is paper-white in a grey halo); night light is added at 1.15.

## Sound
Every summon plays `word` (a brush swish and a plucked note of the current scale, pitched by the word's `note`), every
melt `melt`, every rule `verse` (a soft bell). The composer plays a sparse pentatonic line at `bpm` 54–66 whose density
follows how many things are on the sheet, thins under rain and fog (`w.quiet`), and changes scale at night. World
voices are built from `tone` (glides, vibrato), `pluck`, `noise` (band / low / high, swept) and `loop` (a bed switched
by cues). Keep single voices under `v: 0.2`; the offline render reports the peak.

## Chrome
Seal top-left (brush font, vertical, red `#a51d1d`), pills top-right, chips bottom-centre, key caps above them, verse
vertical at the right edge, brush cursor during self-play. All of it runs on the sheet's clock so a film matches the page.
