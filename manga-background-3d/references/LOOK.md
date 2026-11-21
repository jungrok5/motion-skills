# LOOK — how a frame is made, and the constants that are the style

## One camera, two looks

`Engine.render(set, view, w, h)` draws, from the same camera:

1. **Lit pass** — Lambert shading of every surface's `tone` under an ambient light and the sun (PCF soft shadows),
   point lights at night, emissive glow things, additive beams. This is the clay model as it is, and the light the
   manga tones are made from.
2. **Info pass** — view depth and a flag per pixel (solid / glass / light / sign / ink; sky where nothing is).
3. **Glow** — the light flags, blurred twice at quarter size.
4. **Post** — left of the wipe: the manga tone; right of it: the clay. The manga tone is the lit luminance plus a
   faint large-scale unevenness, quantised into the `levels` with soft `edge`s (marker bands); glass becomes paper
   with two diagonal glare bands; light flags become white; the sky is one flat tone (beams lift it); glow lifts toward
   white; a whisper of grain.
5. **Ink** — the depth buffer is read back and every candidate edge is tested against it (below), then drawn on a 2D
   canvas over the tone.

## The line work

- **Which edges.** Per primitive, once: vertices are welded by position, faces get normals, and each edge is
  *boundary* (one face), *crease* (dihedral angle over the prim's `crease`), *flat* (skipped: triangulation seams) or
  *smooth* (a silhouette candidate). Per frame a smooth edge is inked when one face looks at the camera and the
  other does not. Wires (`S.line`) are edges too.
- **Visible parts.** Each edge is clipped to the near plane, projected, sampled every 2 px; a sample is visible when
  its depth is not behind the farthest depth in its 3 × 3 neighbourhood (+0.4 % + 1.2 cm). Runs of visible samples
  become pieces; 1-sample gaps are closed; tiny runs dropped; `detail` prims are dropped beyond 10 m or under 4 px.
- **Strokes.** Pieces that meet at a shared vertex and carry on within 38° (70° for wires) are chained into one
  stroke (rings, curves, cables). A stroke end that is a real corner of the geometry overshoots; an end cut by
  occlusion stops dead.
- **The pen** (`LOOK.pen`): width by kind (silhouette 2.9, border 2.6, crease 2.0, wire 1.3 px at 1080p) × distance
  (`(4.5 / depth)^0.42`, clamped 0.48–1.3) × the prim's `weight` (× 0.72 for detail); overshoot 5–20 px (≤ 22 % of
  the stroke); a bow up to 0.5 % of the length; a wobble of 0.45 px whose noise runs along the edge's 3-D length (so
  it stays on the geometry while the camera moves); a quick press at the start and a lift at the end; an ink dot at
  38 % of starts; 20 % of long straight strokes get a lighter second pass; half the strokes over 300 px are drawn in
  two overlapping reaches. Every habit is seeded by the edge's index, never by the frame: check.mjs measures that
  ≥ 85 % of the ink stays put frame to frame.

## Constants (lib/engine.js `LOOK`; override per piece with `new Film({ look })`)

| key | default | what |
|---|---|---|
| `levels` | 0.22 · 0.40 · 0.58 · 0.72 · 0.85 · 0.975 | the greys a frame may use |
| `edge` | 0.012 | softness of a tone boundary |
| `uneven` | 0.016 | marker unevenness |
| `sky` | day 0.975 · dusk 0.72 · night 0.22 | the flat sky |
| `light` | day ambient 0.74 / sun 0.42 · dusk 0.62 / 0.36 · night 0.36 / 0.08 | so a white wall in shade lands on 0.72 and a lit one on paper |
| `clay` | bg 0.40 · tint 0.8 | the model look |
| `pen` | see above | the line habits |
| `glass` | streaks on, tone 0.86 | window glare |
| `glow` | 1 (× 1 night, 0.6 dusk, 0.25 day) | bloom |
| `grain` | 0.022 | paper grain |

Keep a white surface's lit value away from a band threshold (0.65, 0.785, 0.91): a value sitting on one makes the
unevenness show as blotches. Move the sun or the tone instead of the thresholds.

## The film (lib/film.js)

- Camera near plane 0.15 m, far 400 m (depth precision for 5 mm offsets at 50 m).
- 1920 × 1080 at 24 fps; letterbox bars 10 % of the height each; the 3-D view fills the band between them.
- Text in Gaegu Bold (OFL, bundled): location top-left at 40 % of the bar height, mode label top-right ("3D 모델" /
  "만화 배경", flips at mid-wipe), caption bottom-centre at 46 %. Cards: black, 74 px lines, a 26 px sub line, fade in.
- Shots: `mode` `'model'` (clay only), `'wipe'` (clay → manga over `wipe: [from, to]` of the shot, default 0.28–0.72),
  `'manga'`; `card: [...]` for the closing card. Hard cuts between shots.
- Sound (`scripts/sound.mjs`): a felt-piano arpeggio (Am7 · Fmaj7 · G · C/E at 72 bpm), a pen scratch through each
  wipe, a paper tap on each cut, a small bell chord on the card; normalised to −2.5 dBFS peak. `--audio` mixes your
  own track under it, `--silent` leaves it out.

## Plates and pages

- `?plate=<shot>&layer=lines|tone|full&w=2400` (render.mjs `--plates`) — the shot's `plate` moment (default the
  middle) at print size: `lines` is ink on transparent, `tone` the greys alone, `full` both. Put your characters
  between the layers.
- `?sheet=page` (render.mjs `--page`) — `new Film({ page: { size, panels: [{ shot | scene + cam, rect, at, box, boxAt }] } })`
  lays panels out on a page, each rendered at its own size and aspect with the same pen; narration boxes only.
