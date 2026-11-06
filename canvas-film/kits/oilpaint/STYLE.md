# 유화 (oil painting — Rembrandt · Vermeer · Remington · palette knife)

Kit: `kit.js` → vendored as `scenes/kit-oilpaint.js`, global `window.OIL`. Source: one-scroll-bible
`motion/films/messiah/` (「메시아 예언과 성탄」, 2026-11-03). In that film it paints three scenes:
- the stable after Rembrandt's *Adoration of the Shepherds* (`oil-stable.js`, key `rembrandt`, figures with `OIL.relief`);
- the journey to Bethlehem after Remington's sunsets and nocturnes (`oil-journey.js`, key `remington`, two plates cross-faded from sunset to night);
- the dawn after the cross, repainted from grey with the palette knife (`impasto-dawn.js`, key `impasto`, revealed stroke by stroke);
- (3rd script, 2026-11-07) Mary in her room at Nazareth by a window, after Vermeer (`oil-nazareth.js`, key `vermeer`) — chosen over a Hopper room, which the owner read as "a little horror-like".

The film vendors this exact file. Before and after stills were identical (max difference 0). Template: `template.html` is
a different subject, an old man reading a scroll by a lamp, in the `rembrandt` key.

## What it looks like
You draw the picture first as a **value-planned plate**: shapes, gradients and light, with no texture. `OIL.paint()`
then lays loaded strokes over it.
- **Colour:** each stroke takes the plate's colour where it lands, within a few % of brightness.
- **Direction:** a stroke runs along the form (the iso-line of the plate's brightness), or along a direction you give.
- **Edges:** a stroke never crosses an edge. It shortens until both ends match the colour it was loaded with, so silhouettes stay crisp.
- **Thickness:** strokes are thick and ridged where the plate is light, and thin or absent in the darks, which stay smooth glazes.
- **Camera:** the painting is made once, larger than the frame, and the camera moves over it, so strokes never crawl.
- **Varnish:** `OIL.varnish()` adds an amber varnish and a canvas weave.

**Keys**
- **`rembrandt`:** readable warm umber darks and one light. Figures are mostly dark, lit on the planes that face the light. Draw them with `OIL.relief()`: a silhouette blurred into a height field and lit per pixel, with soft zones for faces and hands. Draw the focus (a child's face) again, crisp, after painting.
- **`vermeer`:** daylight from one window on the left: a lime-plaster wall bright near the window and falling to warm shadow across the room, a lit patch on the floor, small soft blended strokes with almost no ridges, pearly highlight dots on what the light catches (jars, bread, the veil's edge). Figures are drawn part by part on the plate (profile face, veil framing it, sleeve and hand, a fold or two), lit from the window side with a skimming rim; `relief` alone gives a faceless blob here. Draw the face and hands again, crisp, after painting. Warm and still — waiting, an intimate household moment, a holy quiet.
  **A living figure** (`example.vermeer.js`, the motion recipe of `live-character/references/MOTION.md`): paint each part into its own copy of the room (so the brush meets the right neighbours at its edges) and keep it by its silhouette — the body (cut just below the neck, with throat skin under the chin for when it lifts), the head (veil + face, its lower edge faded between chin and cut, and faded off the back of the shoulder so the turn never pushes the veil past the body), the room without her. Each frame: the body breathes from the feet (in 40 % · out 48 % · rest, ~4.6 s), the head turns on the neck (the eyes move first, the head follows on a spring step with a small overshoot, a blink on each shift, calm-adult blinks every 2.2–7 s), the hand and eye are drawn as vectors. Use closed-form motion (a spring's step response, value noise), never a running spring — renders seek frames out of order.
- **`remington`:** a red-gold sunset in long horizontal strokes (`dirAt` returning 0 above the horizon). Land and figures are dark warm silhouettes with a thin warm rim. Paint the same land again as a blue-green nocturne with warm windows, and cross-fade the two as the sun goes.
- **`impasto`:** broad, short, thick slabs with ridges on everything lit. Best revealed: grey first, then the colour painting shown through a mask of growing knife strokes, outward from the light.

## Meanings it carries
**Well:**
- One light in the dark: a child, a lamp, a face. Rembrandt is the "light comes from Him" image.
- An intimate holy moment: kneeling, reading, waiting (Vermeer: by daylight, at a window).
- A long road at the end of the day, arriving at night (Remington).
- A grey world repainted in colour: resurrection, restoration (impasto).

**Badly:**
- Fast action and crowds.
- Bright cheerful daylight in the Rembrandt key (use Remington or another kit).
- Graphic clarity: maps and diagrams.
- Anything that must read as precise, such as words in the picture.

## Palette
| key | darks | mids | lights | accent |
|---|---|---|---|---|
| rembrandt | umber `#24150B` (70 % of the frame, readable), near-black only in corners | amber `#8F5D2A` | `#E2B673`, the focus `#FFFAF0` | one red `#9C1A1A`, one cool opening (a blue-green night door) |
| vermeer | plaster shadow `#4E4434` | wall `#CDBF9C`, floor `#8A7A5E` | window wall `#F2E8CC`, sky `#D9E4EA` | ultramarine `#18264E` → `#7D9AD6`, one red `#7A2A24`, clay `#A8643C` |
| remington | `#1e0f10` warm silhouettes | sky `#9a2a22` → `#e2682a` → `#ffd27a` | sun `#fff1c8` | night `#17333A`, moonlit edge `#9CC4BC`, windows `#FFCC6A` |
| impasto | deep green `#30502a` | `#6e9640` grass, sky blue `#2e5caa` | `#ffde96` dawn | flowers `#c84030` `#e8c050` |

## API (`const OIL = window.OIL`)
- `OIL.paint(plate, { key, S, seed, dirAt?, ...overrides })` → canvas the size of `plate`.
  - `S` is plate px per frame px (1.5 for a pushable plate).
  - `dirAt(px, py)` gives a stroke angle where the plate is flat.
  - Overrides are any `KEYS` field: `cell` stroke spacing, `wid` width × frame width, `len` length/width, `dark` (strokes thin below this brightness), `darkKeep`, `jit` brightness jitter, `ridge`/`ridgeMin` impasto ridges, `edge` colour distance that stops a stroke, `probe` gradient probe.
- `OIL.view(ctx, art, S, fx, fy, z)` draws the painting with plate point `(fx, fy)` (plate px) at the frame centre, zoom `z`.
- `OIL.relief(g, path, m, box, zones, light, o)` draws a silhouette with volume into the plate.
  - `path` is a Path2D in its own units.
  - `m` is a DOMMatrix from those units to plate px.
  - `box` is the path's bounds in its units `[u0, v0, u1, v1]`.
  - `zones` is `[{ w(u, v) → 0..1, base: [r,g,b], lit: [r,g,b], k }]`, blended over the last zone (the default).
  - `light` is `{ x, y, z, R }` in plate px (a low `z` lights only the edges that face it).
  - `o` is `{ soft, height, amb, wrap }`.
- `OIL.varnish(ctx, k = 1, col)` adds amber multiply and canvas weave over the frame.
- `OIL.KEYS` holds the four keys' numbers.

## Checks (what went wrong on the way)
- `vermeer` (round 1): one `relief` silhouette for a standing woman, big in the frame, read as a faceless blue ghost. Draw her part by part, smaller in the room, and repaint the face crisp. Hard dark fold lines read as stripes — blur them and keep them faint.
- `vermeer`: in landscape the strokes (`wid` × frame width) look blobby on flat walls — lower `wid` or `cell` for 16:9.
- Figures drawn as flat silhouettes plus shifted copies came out in **visible bands** ("contour steps"). Use `relief`.
- A rectangle zone for a face shows as a box. Use a soft ellipse weight (`w`).
- With the light high (`z` large), whole figures turn pale grey ("ghosts"). Keep it low so only the faces toward the light glow.
- Strokes that compare only luminance cross edges where two colours have the same brightness (a grey mantle on an orange wall). The kit compares RGB distance.
- The focus blurs under the strokes. Draw it again after `paint()`.
- Short strokes read as a Photoshop filter. Keep `len` 3–7 × width and the direction field smooth (`probe` 2.5 in `rembrandt`).
