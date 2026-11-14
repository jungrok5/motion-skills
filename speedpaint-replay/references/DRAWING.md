# DRAWING — how to draw a piece in items

A piece is `export function art() { const s = new Sketch({ … }); …; return s; }`. Every call adds one or more items.
**Time order** = the order you add items (within a stage; `order` moves one). **Paint order** = `z` (within a stage;
default = the order added). Art units: 0…1000 square, origin top-left.

## API
```js
import { Sketch } from 'sp/sketch.js';
import { arc, P, spline, rng } from 'sp/core.js';
const s = new Sketch({ seed: 7, ink: '#231c24', paper: '#fdfcf8', meta: { title: '제목' } });

// transforms: author a part upright, then place it
s.push({ rot, ox, oy, dx, dy, sx, sy });  …  s.pop();      // nested: inner first, then outer

// rough
s.rough('x,y x,y …', { w: 1.7, alpha: .8, loose: 1.6, raw: false });
s.ellipse(cx, cy, rx, ry, { rot, from, to, alpha });          // a loose ellipse that overshoots its start a little

// line art (control points, smoothed; raw: true = use the points as they are)
s.ink('x,y x,y …', { w: 3, taper: [in, out], floor: .12, wobble: .12, alpha: 1, color });

// regions: outline points (smoothed unless raw), a fill (colour or { linear: [x0,y0,x1,y1] | radial: [x,y,r], stops })
s.flat(name, pts, { fill, z, order, angle, brush, weight });          // a base colour; `name` is what clips refer to
s.shadow(pts, { fill, clip: 'skin' | ['knit','collar'], blur, alpha, mode: 'multiply' });
s.light(pts, { fill, clip, blur, alpha, mode: 'screen' | 'source-over' });
s.glow(pts, { fill, mode: 'screen', over });                          // finish, fades in
s.fx((ctx, u, env) => { … }, { box, over, name });                    // finish: anything, drawn at progress u (0→1)
s.inkTint('#3a2c40', .5);                                             // finish: tint the line art toward a colour

// helpers
s.lock(ctrlPts, { w, tip: 'point' | 'blunt', strands, shade: 'l' | 'r', edges, fill, z, flatOrder, inkW });
s.eye({ side: 'L' | 'R', x, y, w, h, tilt, look: [dx, dy], iris: [top, bottom], lash, irisW, irisH, id });
s.edge(pts, { w, side: 'l' | 'r', stage: 'highlight' | 'shadow', fill, clip, blur, taper });
s.lens(a, b, w, { bow, stage, fill, clip, blur });
s.bloom(x, y, r, { color, over, clip });

// body check (characters)
s.setPose({ facing: 'left' | 'right' | 'front', head: { yaw, roll, pitch }, torso: { yaw, roll } });
s.mark('nose', x, y);   // also eyeL, eyeR, mouth, chin, ear, neck, shoulderL, shoulderR (eyes also come from s.eye)
```
`s.r` is the piece's seeded random: use it for layouts (strands, bokeh), never `Math.random`.

## Order of work (the order the viewer sees)
1. **rough**: big to small. The head circle → jaw → centre line → eye / nose / mouth lines → eye ellipses → ear →
   hair silhouette → neck → shoulders → background lines.
2. **line art**: the face first (contour, brows, eyes, nose, mouth): the viewer recognises the face early. Then the
   neck and clothes, then the hair silhouette and locks (the bulk of the strokes), then the background.
3. **flats**: the character (skin, eyes, hair, clothes) first, then the background (`order: 2000`). Lock flats added
   during the line art get `flatOrder` so they are painted after the face.
4. **shadow**: the face (bangs' cast shadow, the far side, nose, under the lip, blush), the hair masses, the neck,
   the clothes, the cast shadow on the wall.
5. **highlight**: the key light on skin, glints, hair sheen, rim lights, the clothes.
6. **finish**: the background mood (bokeh, rain, rays), a big light gradient, a lamp bloom, the ink tint, a vignette.

## Layering
- Flats: `z` decides what covers what. Typical: background 0, back hair 10, neck 20, clothes 25, face 30, eyes 40,
  bangs base 45, locks 50.
- The line art is one layer above every flat, shadow and highlight. So a line is never hidden by a region. Don't
  draw lines that a nearer part would cover (the back of the jaw under the hair). Brows showing through bangs are
  fine: that is the anime convention.
- **Clips use the visible part of a region**: its shapes minus every flat painted above them. A shadow clipped to
  `'neck'` cannot darken the chin; a shadow clipped to `'hair'` cannot reach the face even though the back hair runs
  behind it. A flat clipped to a region (an iris to its eye white) counts as part of that region.
- Finish items draw under the line art unless `over: true` (rain, vignette, a lamp glow over everything).
- A full-canvas glow: give it the whole square and put the falloff in the gradient. A polygon edge shows as a band.

## A face (anime, 3/4)
Author the head upright inside `s.push({ rot, ox, oy })`. For a face turned to the picture's left:
- the **far contour** (picture-left) goes from the temple, bulges at the cheekbone beside the far eye, then cuts in to
  the chin. The **near jaw** runs from the chin back up to below the ear.
- the **far eye** (`side: 'L'`) is narrower (w ≈ 0.7–0.8 of the near eye) and close to the far contour; the **near
  eye** (`side: 'R'`) is wider. Both irises shift toward where she looks (`look`), and both catchlights sit on the key
  light's side.
- nose: a short line that points the way the face turns, with a small shadow on the away side; mouth: a short tapered
  line plus a soft shadow under the lower lip.
- `irisW` .27–.3, `irisH` .6–.66 of the opening gives big anime irises that touch the upper lid; the lid line is the
  heaviest stroke in the picture.
- Shadows: a jagged cast shadow under the bangs (follow the lock tips), a crisp strip along the near jaw on the side
  away from the key (`s.edge(jaw, { stage: 'shadow', side })`), a soft blush under each eye.

## Hair
- A big flat for the whole mass behind the face (z 10), a **bangs base** flat with a smooth lower edge *above* the
  lock tips (z 45, so gaps between locks are hair, not forehead), then locks (z 50) from the parting outward.
- `s.lock(ctrl, { w })`: root → tip control points; w is the width at the root. Overlap neighbours by a third of their
  width. Mix big locks (w 50–80) with thin ones (w 30–35, `edges: 'l'`, `strands: 0`) between them.
- Shade: `shade: 'l' | 'r'` puts a strip on the side away from the key. Add big soft shadows inside the mass, clipped to
  `'hair'`.
- Sheen: many short `s.lens` strands of light along the head's curve (radial from about the crown), brighter on the
  key side, over a soft `s.edge` band. One continuous zig-zag polygon looks like a crown.
- Rim: `s.edge` along the silhouette on the rim light's side, w 8–14, blur ~1.

## Objects
Ellipses (`arc`) for rims, bowls and bases; straight sides; the front half of an ellipse in ink, the back half lighter
or broken. The cast shadow goes on the surface the object stands on, away from the key.

## Checking a part while you draw it
`render.mjs piece.html --stills <t> --q off=stylus` at full size, then crop with ffmpeg
(`-vf crop=640:640:240:150`). `--stages` shows each stage end. `check.mjs` lists any item that leaves no mark (a clip
to a region that is entirely covered, a degenerate line) and any fill that pops.
