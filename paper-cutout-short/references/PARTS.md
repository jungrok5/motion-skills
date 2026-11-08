# Parts — from an image model (the source's method) or cut in code

Every puppet part and set piece ends up as the same thing: a **sprite with a pin** (its local origin) and a baked soft shadow.
There are two ways to make them, and a film can mix them (generated heads on code-cut limbs, a generated house row behind
code-cut props). The stage, the rig, the timing and the checks do not care where a sprite came from.

| | image model (gen-parts → cut-parts) | cut in code (paper.js / kit.js) |
|---|---|---|
| what it is good at | rich hand-made detail: fur, faces, knitted hats, a painted shop front | exact shapes, any number of variants, lit / unlit copies, things that must line up (windows, a lamp glass a pole must touch) |
| cost | one sheet per character / set (a few cents, a minute) | free, instant, deterministic |
| needs | an image tool (OpenAI Images via `gen-parts.mjs`, or any tool that saves a PNG) | nothing |
| control | prompt + reference images; re-generate when wrong | full |

The source clip generated its art with an image model and animated it as cut-outs ("内容可控，成本很低" — the content stays
controllable and cheap: the model draws each piece once, code moves it). Use that when an image tool is available and the topic
wants painterly detail. The bundled example (`examples/lamplighter`) is cut entirely in code so it runs offline;
`examples/parts-route` runs the image route end to end on a stand-in sheet.

## 1. Ask for a parts sheet

One sheet per puppet (all its parts) or per family of props. Rules that make a sheet cuttable and riggable:

1. **Flat background, parts apart.** Transparent (`--background transparent`, the default) or one flat key colour that appears
   nowhere in the parts (`#00b140` green). At least a finger's width of background between any two parts; nothing touching
   the image edge.
2. **Every part separate and whole.** The covered end of a limb is drawn complete (the shoulder end of an upper arm is
   rounded, not cut off), because rotation reveals it. Upper arm, forearm + hand, thigh, shin, foot, head, torso, tail /
   ears / hat if they move.
3. **One side.** The character faces **right**, in profile or a light 3/4. Draw only the **near** limbs; the rig makes the far
   ones as darker copies (or ask for the far ones in a second sheet).
4. **No text, no labels, no drop shadows, no ground line** in the image — labels become parts, baked shadows double up with the
   stage's.
5. **Same light on every part** (soft, from the upper left) and the same paper and edge treatment across sheets — keep one
   style preamble (below) and pass earlier sheets as `--ref` for consistency.
6. **Size.** 1536×1024 holds one character's parts comfortably; a head ~250 px tall gives enough detail for a 1080p film.

<!-- STYLE -->
```text
Handmade cut-paper craft pieces for a stop-motion cut-out animation, photographed flat from directly above under soft, even,
warm studio light from the upper left. Each piece is cut or torn from thick coloured art paper and felt: flat matte colour with
visible paper fibres and a fine felt texture, a thin white fibrous rim where the paper was torn, a few layered paper details
glued on top (cheeks, buttons, patches), simple dot eyes, gentle rounded shapes, cosy children's-picture-book charm, warm
pastel palette. Every piece lies separately with clear empty space around it on a plain transparent background — no piece
touches another or the image edge. No text, no labels, no ground, no cast shadows, no scene.
```

Then the part list, specific to the topic. Example (a puppet):

```text
Parts sheet for ONE character facing right in side view: a small hedge-witch mouse with a moss-green felt cloak and a straw hat.
Lay out these separate pieces in two rows, left to right:
row 1: the head with the hat on (side view, facing right, eye and ear visible, neck end rounded) · the torso in the cloak
(shoulders to hips, side view) · the tail (one long curved piece)
row 2: upper arm (sleeve) · forearm with paw · thigh · shin · foot with a little boot (toe pointing right)
Each limb piece is a rounded capsule drawn whole at both ends so it can rotate at a pin.
```

…and a set piece sheet: "row of three paper houses with scalloped tile roofs, each house a separate piece, flat front view",
"a crescent moon, a sun with rays, three clouds, five stars, each separate". Generate the backdrop as its own full-frame image
(no transparency) when you want a painted sky.

```bash
OPENAI_API_KEY=… node <skill>/scripts/gen-parts.mjs --prompt prompts/mouse.txt --out sheets/mouse.png
node <skill>/scripts/gen-parts.mjs --prompt prompts/mouse-props.txt --ref sheets/mouse.png --out sheets/props.png   # same style
node <skill>/scripts/gen-parts.mjs --prompt prompts/mouse.txt --dry      # see the exact request (style preamble included)
```

Without `gen-parts.mjs` (another image tool, a chat UI, a scan of real paper cut-outs on a green card): save the PNG and go on.

## 2. Cut it

```bash
node <skill>/scripts/cut-parts.mjs sheets/mouse.png --names head,torso,tail,armN,foreN,thighN,shinN,footN --out parts/mouse
```

Look at `parts/mouse/preview.jpg` before anything else: every part boxed once, in the order you named them (reading order:
rows top → bottom, then left → right). Two parts in one box → they touched: regenerate, or erase the bridge. A part split in
two → raise `--merge`. Specks → raise `--min`. Green fringe → lower `--tol`, or pass `--key` exactly.

## 3. Pin it

```js
import MAN from './parts/mouse/parts.js';          // PNGs inlined: works from file:// and in the render scripts
const IMG = await P.parts(MAN, { px: .6, pivots: { head: [118, 230], torso: [90, 210], footN: [26, 20], tail: [10, 30],
                                                    armN: 'top', foreN: 'top', thighN: 'top', shinN: 'top' } });
const MOUSE = Pup.bipedParts(IMG, { name: 'Moss', neck: [0, -100], joints: { armN: [0, 46] },
                                    extraParts: [{ id: 'tail', parent: 'hip', at: [-26, 8], z: -40, img: IMG.tail, lim: [-35, 35] }] });
```

- `px` scales sheet px to stage px (pick it so the puppet is the height the brief wants; ~300–380 px for a lead in a wide shot).
- Pivots are in **sheet px of that part's crop** (read them off `preview.jpg`; the crop's top-left is the part's `x, y` in
  `parts.json`): the neck under the head, the hip at the waist, the ankle, the tail root. `'top'` = the upper end of a limb,
  half a limb-width in, where a paper fastener would go; its far pin is then worked out from the length (override with
  `joints` when it is off).
- `neck` (stage px from the hip pin) when the torso's pivot was given as a point.
- Render the cast sheet (`Pup.sheet`, both facings, pins marked) and score it like a code-cut puppet: references/BRIEF.md →
  "Cast review". A joint that tears open when it bends → move the pin toward the overlap, or ask for longer rounded ends.

## Code-cut parts (no image model)

`P.piece(ctx, pts, colour, o)` is the one primitive: a torn (white rim) or cut or felt piece with fibres and a soft light.
Shapes: `rect rrect ellipse arch capsule blob cloudShape crescent star burst` (+ `shift scale flipX`). Details: smaller pieces
with `lift` (a foam-pad shadow), `ink` lines, `dot`, `dab` (blush). `P.sprite(bounds, paint)` rasterises once. `Pup.biped`
builds the standard rig from a head painter, a torso painter, lengths and colours. See `examples/lamplighter/cast.js`.
