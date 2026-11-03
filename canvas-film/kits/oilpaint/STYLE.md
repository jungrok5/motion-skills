# 유화 (oil painting — Rembrandt · Remington · palette knife)

Kit: `kit.js` → vendored as `scenes/kit-oilpaint.js`, global `window.OIL`. Source: one-scroll-bible
`motion/films/messiah/` (「메시아 예언과 성탄」, 2026-11-03). In that film it paints three scenes:
- the stable after Rembrandt's *Adoration of the Shepherds* (`oil-stable.js`, key `rembrandt`, figures with `OIL.relief`);
- the journey to Bethlehem after Remington's sunsets and nocturnes (`oil-journey.js`, key `remington`, two plates cross-faded from sunset to night);
- the dawn after the cross, repainted from grey with the palette knife (`impasto-dawn.js`, key `impasto`, revealed stroke by stroke).

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
- **`remington`:** a red-gold sunset in long horizontal strokes (`dirAt` returning 0 above the horizon). Land and figures are dark warm silhouettes with a thin warm rim. Paint the same land again as a blue-green nocturne with warm windows, and cross-fade the two as the sun goes.
- **`impasto`:** broad, short, thick slabs with ridges on everything lit. Best revealed: grey first, then the colour painting shown through a mask of growing knife strokes, outward from the light.

## Meanings it carries
**Well:**
- One light in the dark: a child, a lamp, a face. Rembrandt is the "light comes from Him" image.
- An intimate holy moment: kneeling, reading, waiting.
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
- `OIL.KEYS` holds the three keys' numbers.

## Checks (what went wrong on the way)
- Figures drawn as flat silhouettes plus shifted copies came out in **visible bands** ("contour steps"). Use `relief`.
- A rectangle zone for a face shows as a box. Use a soft ellipse weight (`w`).
- With the light high (`z` large), whole figures turn pale grey ("ghosts"). Keep it low so only the faces toward the light glow.
- Strokes that compare only luminance cross edges where two colours have the same brightness (a grey mantle on an orange wall). The kit compares RGB distance.
- The focus blurs under the strokes. Draw it again after `paint()`.
- Short strokes read as a Photoshop filter. Keep `len` 3–7 × width and the direction field smooth (`probe` 2.5 in `rembrandt`).
