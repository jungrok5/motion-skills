# Scene contract and runtime

`scripts/build.py` packs `scene.json`, the geometry, an optional corner diagram, the evidence
ledger and the locale's fonts into one HTML file. The page uses only native WebGL, Canvas 2D,
CSS and JavaScript: no Python, Node, CDN or library at view time. Geometry is authored per
object; nothing generates a building from its name.

## Work folder

```
<work>/
  BRIEF.md        topic → brief (references/BRIEF.md), written before code
  scene.json      title, language, file paths, duration
  geometry.js     the object's parts, hierarchy, separation timeline and callout anchors
  evidence.json   sources, claims and their status (references/EVIDENCE.md)
  inset.html      optional static <figure class="siteplan">…inline SVG…</figure>
  make-inset.mjs  optional: draws inset.html from geometry.js's @params block
```

Paths are relative to `scene.json` and may not leave its folder. `scripts/new-scene.py` writes
this skeleton.

```json
{"schemaVersion": 1, "lang": "ko", "titleLocal": "경주 첨성대", "titleEn": "CHEOMSEONGDAE, GYEONGJU",
 "edition": "01", "geometry": "geometry.js", "evidence": "evidence.json", "inset": "inset.html", "durationMs": 2850}
```

- `lang` picks a locale pack in `assets/locales.json`: `ko` (default) or `zh` (the original
  Chinese interface). A pack sets the controls' wording, `<html lang>`, the title face and the
  callout face. Add a pack to support another language; do not hand-edit strings in the template.
- `titleLocal` is the text shown. The build fails if the title face lacks a glyph; ask for an
  approved spelling or add a face — never rename the object to pass the check. The old
  `titleZh` field still works and implies `lang: "zh"`.
- `inset` is optional and static (no script, no handlers). Leave it out when no diagram helps.
  Never leave another object's distances, title or layout in it.

## Fonts per locale

| lang | title + main button | callouts and diagram text |
|---|---|---|
| `ko` | Noto Sans KR 700, embedded (Latin + 2,350 KS X 1001 Hangul) | Noto Sans KR 400, embedded (same set) |
| `zh` | IBM Plex Sans TC Bold, complete and unmodified, limited by `unicode-range` to the title and button text | system Microsoft YaHei / PingFang SC |

`build.py` checks the title and button text against the title face, and every non-ASCII
character in geometry strings and the inset against the callout face. `verify.cjs` checks each
part label again after running the scene. Rare syllables or Hanja outside the set fail the build
with the missing characters listed: rephrase, or add a face to the pack. English stays in the
template's Latin stacks. Do not enlarge or space text to make a font change look different.
A `ko` page is about 0.47 MB; a `zh` page about 3.5 MB (the complete Plex TC is embedded).

## `geometry.js` contract

The file runs inside a closure and returns the scene. Create nodes parent-first. X/Y are
horizontal, Z is up; one length unit throughout (metres in the examples).

```js
const root = node('fixed base', null);
const upper = node('upper component', root, p => tr(0, 0, p.gap));
// build the real object's geometry here; no unsupported placeholder buildings
function pose(t) { return {gap: .3 * ease(t, .12, .9)}; }
return {
  root, pose,
  parts: [{node: upper, anchor: [0, 0, 1], label: '부재 이름', text: 'COMPONENT'}],
  guides: () => [{from: point(root.world, [0, 0, 1]), to: point(upper.world, [0, 0, 1])}]
};
```

This fragment shows the interface only. `pose(t)` maps 0 (assembled) to 1 (separated).
`ease(t, start, end)` eases in and out with a ~2 % overshoot and settles exactly. Stagger the
groups with some overlap; folding runs the same curve backwards; nothing loops. Group parts by
the evidence: any number of groups, not always six, not always straight up.

Required returns: `root`, `pose`, `parts`. Each part has `node`, `anchor`, a local-language
`label` (the original's `zh` key still works) and English `text`.

Helpers (see the template):

- `node(name, parent, transform)`, `tr / rx / ry / rz`, `mul`, `point`.
- `poly(node, points, color, outline = true)`: a convex fan. Split concave faces yourself; never
  "cut" a hole by painting it.
- `box`, `beam(node, a, b, width, color)`, `cylinder(node, x, y, z, r, h, color, segments, verticalLines)`.
- `lathe(node, profile, color, {segments, rings})`: a closed solid of revolution about local Z;
  `profile` is `[z, r, optional dr/dz]`. Its silhouette follows the view. `rings` marks only
  real boundaries, never every mesh row. For hollow or pierced bands, write your own faces and
  push `{profile, surface, opening}` to `node.contours` (see `examples/cheomseongdae/geometry.js`
  `band()`).
- `smoothProfile(points, steps)`: a C2 spline in real height with radius and slope. Keep the
  waists and steps you see; check for negative radius or overshoot. `curveProfile` for short
  profiles that do not need curvature continuity. `profileRadius(profile, z)` reads it back.
- `line`, `shade`, palette `C` (`wall / roof / stone / ink / soft / interior / wood / woodLight / soil / accent`).

`parts[].anchor` is a local point, or `({cameraRight, cameraUp, cameraDepth, yaw, pitch}) => [x, y, z]`
to keep it on the visible side (a lathe's right silhouette, a beam end facing the camera).
Complex buildings anchor on real part faces, never on an imaginary circle. `guides()` returns
world-space dashed assembly guides.

`dimension: {from, to, offset, label, en}` draws one vertical height ruler that fades while
separating. There is no multi-dimension or horizontal ruler API. Per-storey heights, eave
projection, base and finial sizes go into a static inset generated from the shared parameters,
or into a renderer extension you implement and verify. Unknown sizes show no number.

`pivotXY: [x, y]` sets a clear symmetry centre; by default the full motion range is centred.
`inspect` may expose named parts for object-specific checks; it never appears in the UI.

## One parameter source for model and diagram

Spans, slopes, openings, storey heights, radii, base and top profiles come from one place. Put
them in a JSON object between `// @params-start` and `// @params-end` at the top of
`geometry.js`; a small `make-inset.mjs` in the work folder parses that block and writes
`inset.html`. Rebuild the inset whenever the model changes shape. A whole elevation is drawn at
one scale; an enlarged detail says so.

## Runtime invariants (keep them when you extend the renderer)

- The fit envelope samples the whole timeline and every orbit angle once; only a resize refits.
  Animation and orbit never zoom. Manual pan / zoom stays until reset.
- CPU projection, GPU projection, callouts and hit tests share one orthographic basis. Never
  hide clipping by changing the camera scale.
- Silhouettes are rebuilt from each node's local view direction. Node transforms are rigid
  (rotation + translation); non-uniform scale breaks normals and contours.
- Openings are real holes with thickness and depth-correct back faces.
- Dragging reuses the mesh; positions update only when the phase changes; hit tests run on
  click, not per pointermove.
- `verify.cjs` runs the page in Node with mocked WebGL: geometry numbers, fit, timeline,
  restoration and input state only. Shaders, glyphs, pixels and touch need `check.mjs` and a
  real device.
- `window.heritageBlueprint` (`setOrbit(yawDeg, pitchDeg)`, `toggle`, `resetView`, `state`) is a
  read-only hook for scripted stills; it is not UI.
