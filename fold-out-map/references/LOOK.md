# The look in numbers

These are the values the worked example and the template use. Change them for a reason, not by habit.

## Frame and time
- 1080×1920, 30 fps, 25–45 s. Opening: 0–1.5 s the closed leaflet held (cover readable), cross fold 1.3 s, accordion
  fan 1.7 s per crease with 0.3 s stagger, the first stop ≈ 1.5 s after the sheet lies flat.
- A stop: the camera settles at `arrive`, drifts ±4° yaw and pushes in 7 % while held 2.2–2.8 s, then travels 1.8–2.4 s
  lifted to `lift` × its distance + 0.35 × the hop and 12° higher, so the line can be seen running.
- The route head arrives 0.55 s before the camera settles; the pop-up starts then (grows over 0.28 s, springs up with one
  overshoot, `spring(s, .95)`); the label tilts up at the arrival (spring, 62°).

## Sheet and paper
- Panels 0.85 × 2 units, 4 columns, 2 rows → 3.4 × 4. Paper 0.0035 thick, 0.0022 air between stacked layers.
- Residual creases: 2.2° on the accordion (alternating, so the sheet zigzags around the desk), 1.2° on the cross fold.
- Front texture 1400 px / unit (one canvas, sliced per panel); backs 620 px / unit, the cover and guide 1100.
- Stock `#f1e9d6`, back `#ece4cf`, edges `#e9e1cd`. Crease: a 0.024-wide valley shadow with a white lip.

## Printed map
- Ink `#24302b`, soft ink `#5d655c`, red `#b0302a`, streets `#d5c3a0` (0.0028 wide) and avenues `#c9a979` (0.0058),
  roads: casing `#c29a63` + core `#f7efd9`, water `#a9cfc9` edged `#7fb1ab` with 5–6 coastline bands 0.02 apart, parks
  `#d6e2b8`, hills: contour lines `#8d8a6c` (every 5th heavier) over a relief tint lit from the north-west.
- Text sizes (cap height, map units): title 0.18–0.2 spaced 0.06–0.08 em in deep green `#23463c`; subtitle 0.034;
  district 0.036 + its romanised name 0.019 in spaced capitals; hills 0.024; sea 0.05 spaced 0.6 em.
- Street grid spacing 0.04–0.052, warp 0.012, faded out at each district's edge with noise.

## Pop-ups
- Width 0.35–0.8 units (the bridge 0.8, most 0.38–0.5); card texture 900–1400 px wide.
- Drawing space 0–100 wide; lit faces to the upper left (`shade(c, +.12)`), sides to the right (`shade(c, -.28)`).
- Die-cut border 2.2 units (1 for cards with fine details above the main mass — lamps, masts), `#fbf8f1`; a 0.25-unit
  darker cut edge; grain 0.5; back `#ddd6c6`.
- Night lights: `WARM #ffcf7a`, ~55 % of windows lit (hash), lantern strings, cable lights every 1/8–1/14 of a span.

## Labels
- 0.25 wide, 0.36 aspect, placed 0.24 in front of the pop-up and 0.5 × its width to the side; tilt 62°.
- Number disc in red, name 900 weight, romanised name italic, a 120-unit red rule, the note at 34 px of 1000.

## Camera and light
- Stop camera: distance 2.3 (2.6–2.8 for wide pop-ups), elevation 22–25°, fov 34, aim 45 % of the way from the
  pop-up to its label, 0.14 behind it and 0.14 up.
- Overview: distance 9–10.2 at elevation 62–70° shows the whole open sheet in 9:16.
- Depth of field (from the paper plane): aperture `0.45 × 2.3 / dist` below 38° elevation, none above 70°; grain 0.022;
  vignette 0.32.
- `LIGHTS`: day sun 2.1 from (−.55, 1, .42); golden 1.8 `#ffc684` from (−.9, .68, .3); dusk 0.7; night moon 0.55
  `#8fa8e6` + hemisphere 0.48, lamps 0.55 × w, pools 0.32, labels lit 0.38 × the pools.
