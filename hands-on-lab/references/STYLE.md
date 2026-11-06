# STYLE — the look, in numbers

What was read from the reference recording (frames every 5 s) and how it is reproduced. Change a course's look only
through these tokens; anything else is the style.

## Page
| | value |
|---|---|
| paper | `--paper #f3ead8` with a soft radial lift at the bench, faint circuit-trace ornaments (`#d9cbb0`, 1.2 px lines, dots, squares) |
| cards | `--card #fbf7ee`, 1 px `--line #d6c8ad`, radius 10 (panel and bench frames 14) |
| ink | `--ink #1c2330` text and outlines; `--ink-2 #4b5260` secondary; `--mute #857c6b` hints |
| accent | `--accent #1f8f72` (teal): selected part, active pill, chart line, progress, try-it ticks; `--accent-soft #d7ece2` |
| warm | `--warm #e2543a`: load forces, the dashed "other" chart line |
| flow | `--flow #e9b021` on the diagram; `#ffd23f` stripes on the bench |
| type | titles / tabs / tags: Barlow Condensed 600–700, caps, tracking .08–.14 em; body: Inter 500; numbers, equations, screens: JetBrains Mono; Korean: Noto Sans KR |
| title | 26 px caps, tracking .14 em; tagline 12 px caps tracking .32 em, muted, "A · B · C" |

## Layout
Desktop (≥ 761 px): grid of rail 54 px · bench · panel (27 %, ≥ 290 px); header 74 px; lesson strip 104 px; the bench
and panel are framed cards. The chart card floats bottom-right in the bench (236 px); the camera's view is shifted
(`setViewOffset`) so the bench sits up and left of it. The bench toolbar (turn, zoom, home) floats bottom-centre, the
camera hint bottom-left. Phone (≤ 760 px): one column — header (title, language, progress), bench (min(64vh, 470 px)),
lesson strip (scrolls sideways), panel; the chart starts folded.

## Bench
- **Toon shading**: `MeshToonMaterial` with a 3-step gradient (120 / 200 / 255), hemisphere light 1.5 (sky #fffaf0,
  ground #d9c8a6) + one sun 2.1 from the upper left-front with soft shadows (PCF, radius 6) caught by a transparent
  floor (opacity .16, warm brown).
- **Ink outline**: an inverted hull per mesh, pushed out in screen space so it is ~2.1 px at any distance
  (3.4 px teal when hovered or selected); normals averaged by position so boxes have no gaps at the corners.
- **Floor grid**: 1-unit grid, two warm greys at 55 % — reads as the paper's ruled lines.
- **Camera**: perspective, 22° fov (nearly isometric), azimuth ~15–35°, elevation ~20–50°; fit to the bench's
  bounding sphere at margin 1.1.
- **Parts**: toy colours, chunky — a cell 2.3 × 0.92, wires 0.075 thick, blocks 0.32 tall with brass screws. Wood
  `#c08a55`, brass `#d9a441`, metal `#c9ced6`, dark `#2f333b`, red `#e0503a`, green `#4caf50`, battery `#8fd14f`, meter
  yellow `#f2c230`. Glass and LEDs change colour and emissive with the value; glows are soft sprites.
- **Flow stripes**: a second tube 5 % wider over the path, a dash every 0.5 units, 42 % on; speed from `values.flows`.
- **Tags**: name = white, 1.4 px ink border, caps 10 px; value = ink pill, mono 9.5 px; a teal dot marks a part you can
  click. Tags are pushed upward until none overlap.

## Panel
Tabs (caps, ink underline) · cards · the experiment tab: head (title, big-diagram and reset buttons, power pill), hint,
builds and general controls, the diagram (≤ 220 px tall, clickable parts in dashed teal boxes), the selected part's
card (title with its value, one sentence, its controls). Chips: white with a line; pressed = ink. Sliders: teal.
Maths: equations in white mono boxes, substitution in grey mono, result in teal mono bold.

## Motion
The bench animates only what the model moves: glow, stripes, needles, screens, tilts, turns, rises. The camera eases
(0.45 s for toolbar turns, ~2 s in the tour). No decorative motion.
