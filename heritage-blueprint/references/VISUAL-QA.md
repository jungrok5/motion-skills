# Look, interaction and acceptance

## Fixed look (the style; do not redesign it per object)

| item | rule |
|---|---|
| paper and lines | cool grey-white paper, pale blue grid, cobalt text and hairlines; the body mostly white and cool pale blue with a few blue parts |
| callout leaders | 0.75 CSS px pale blue solid line ending in a 1.7 px blue dot; distinct from the dashed assembly guides |
| callout layout | one right-hand column that starts right of the model's projected faces, below the view tools when they share its range, and is pulled in so the widest label never leaves the screen; a paper-coloured halo keeps text readable over hairlines; keep the font size |
| height ruler | fades while separating; skipped when it would leave the screen or touch the inset (the inset carries the height then) |
| light | clear, light face shading; no dark halo, radial shadow, heavy AO or ground shadow |
| composition | orthographic isometric by default, object centred with margins; 1920×1080 is the main frame and it adapts to phones |
| text hierarchy | local language first, English on its own smaller line; no extra info panel |
| title and main button | the locale's title face at 700 (`ko`: Noto Sans KR; `zh`: IBM Plex Sans TC); buttons 펼치기 / 접기 (`zh`: 展開 / 收起) |
| other fonts | English keeps its stack; callouts use the locale's label face; monospace stack for English callouts |
| title size | 20 px, 23 px at ≥1600 wide, 18 px on phones; letter spacing .12em (.08em on phones) |
| inset | fixed screen position, scales a little with the window, never follows pan or orbit; only when it adds a useful relation |
| corner clearance | the inset keeps ≥12 px (≈14 px on phones) below the 18 px corner marks |
| view tools | rotate, pan, reset at 44×44 px, 6 px apart; reset keeps its slot while hidden |
| controls and canvas | the bottom controls are outside the model area; the separated model never covers them |

The template supplies these. Its callout layout is a single right-hand column: for long
titles, horizontal bridges or many parts, adapt the layout code locally with the same hierarchy,
sizes and margins, and check the real page — matching CSS values is not a check.

## Interaction

- Drag rotates (full turn in yaw, pitch about −80° to 85°). Pan mode drags to pan; Shift,
  middle or right drag also pans.
- The wheel zooms about the cursor; touch: one finger follows the mode, two fingers pan + zoom,
  two-to-one continues without a jump. Zoom about 0.55–3.2×. Reset restores view, scale and
  position.
- Clicking the model, the main button, Space or Enter separates / assembles; a drag never
  toggles; repeated triggers during the animation are ignored.
- 2.85 s by default: the first group (from the top, or what suits the structure) starts first,
  the rest follow overlapping, ease in and out, a slight overshoot, an exact stop. Folding plays
  the same timeline backwards. No loop.
- The camera, the grid and the inset do not move during the animation. Manual orbit / pan /
  zoom belongs to the user and is never reset by a later animation.

## One focused acceptance pass

`node <skill>/scripts/check.mjs <out>/model.html --angles <name>:<yaw>:<pitch>,…` does the
mechanical half (stills at 1920×1080, 390×844 and 320×740, both states, an orbit; console
errors; fonts loaded; blank canvas; callout overlap with each other, the controls and the screen
edge, and callout boxes lying on model pixels). On phones there is often no free column beside
the model, so covered callouts are reported as `warnings` there and fail only at ≥600 px. You
still look at every still.

1. **Sources**: open the reference photos and the matching `view-*` stills side by side; check
   outline, tiers, openings, top, base and part proportions. Note what is still estimated or
   unseen.
2. **Desktop 1920×1080**: separate and assemble once each; parts stop and return; callouts do
   not cover the model, the fixed UI or each other; nothing clipped.
3. **Phone 390×844 and narrow 320×740**: title, buttons, inset and corner clearance; on first
   delivery or layout changes also 844×390 landscape. Long titles overflow first.
4. **Interaction**: front / side / back, high and low; pan, zoom, reset; wheel anchor; drag does
   not toggle; repeated clicks ignored; keyboard. Two-to-one finger if a touch device exists.
5. **Technical**: no console errors; the static offline check and a real file-open / offline
   test are recorded separately; fonts actually loaded with coverage; no leftovers from another
   object (name, distances, sizes). Object-specific ray / numeric checks for contacts and holes.
6. **State**: grid and inset fixed, automatic fit stable, folding returns the identical
   geometry, no running animation frame at rest, reset restores the first view.

Write down what was and was not tested. A simulated viewport is not a phone, the Node VM is not
WebGL, a declared font is not a loaded glyph.

## Callouts on the final build

- Assembled and separated states, default and after reset, must fit the model without the camera
  shrinking during animation. Avoid each part's projection; a wide base does not claim all the
  space beside a slim shaft. Openings belong to their part: no text inside an arch or window.
- Position text first, then check the leader end; leaders never cross text. The default
  separated view shows every callout. After extreme manual zoom a callout may hide while it does
  not fit and must return with the view; never shrink the font or cover the model.
- The target dot sits on a real visible face or edge of the labelled part, updated from that
  node's `world` matrix and the camera. A left-column label does not point at the right
  silhouette; an arch label points at the voussoirs, not the empty hole; a base label at the
  platform, not the ground.
- Load the last build before accepting; record path, build size or hash, viewport, phase and
  console result. Older screenshots or tabs opened before a geometry change prove nothing.
- Open every saved still: the target is in frame, the crop is right, the image is not a stale
  frame.
