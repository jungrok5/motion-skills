# PAINT — dabs of your own, and the engine underneath

## A dab
`kit.dabs(W, { count, attributes: { aPos: [Float32Array, 3], … }, head, body })` draws `count` dabs; `body` is GLSL
that fills in a `Dab` for this instance:
```glsl
// head:  in vec3 aPos;
void makeDab(inout Dab d) {
  if (unseen(aPos, 1.0)) { d.alive = 0.0; return; }      // first: nothing is worked out for what the eye can't see
  vec4 r = hash4(float(gl_InstanceID));
  float lit = stillSunAt(aPos);                          // 1 in the sun, 0 in the still world's shade
  d.pos = aPos;                                          // where it is pinned
  d.dir = vec3(0.0, 1.0, 0.0);                           // the way the stroke runs, in the world
  d.size = vec2(0.2, 0.5);                               // across and along, metres
  d.c1 = hazed(jitter(paint3(LIGHT, HALF, SHADE, lit, r.x), r.yzw, 0.5), aPos);
  d.c2 = d.c1 * 1.15;                                    // the colour streaked into it
}
```
| field | |
|---|---|
| `pos`, `dir`, `size` | pin, stroke direction, size [across, along] in metres (kept between `minPx` and `maxPx` on the canvas) |
| `c1`, `c2` | its colour and the streak's |
| `alive` | 0 gone … 1 whole: grow things in, never pop them |
| `lie`, `nrm`, `height` | 1: lies flat on a surface facing `nrm`, `height` metres above it (higher is on top — the order never depends on the eye) |
| `base` | 1: pinned by its foot (a blade) |
| `lift`, `spin`, `turnabout`, `cell`, `seed` | off its surface toward the eye · a turn on the canvas · either end first · which mark (0 1 2 6 long, 3 7 curved, 4 5 pressed; −1 chooses from `cells`) |
| `glaze` | 1: the wanderer's shadow passes over it pixel by pixel |

In `makeDab` you have: `paint3(l, m, s, lit, r)` · `jitter(c, r3, amount)` · `hazed(c, world)` · `airColour(dir)` ·
`stillSunAt(world)` / `sunAt(world)` (with the wanderer's shadow) · `lampAt(world, n)` · `gustAt(xz)` ·
`heightAt(xz)` / `normalAt(xz)` / `landAt(xz)` · `hash4(float)` / `hash4(vec2, salt)` · `unseen(world, reach)` ·
uniforms `uTime uSunDir uWind uFocus uHaze …`. Palettes from JS: `P.paletteGLSL('NAME', [pal, …])` in `head` gives
`NAME_L[i] NAME_M[i] NAME_S[i] NAME_A[i]`.

Rules for a `makeDab`: a dab's place, direction and colour come from its attributes, its number and `uTime` — never
from the eye, except mist (`hazed`), `unseen`, and which side faces it. Additive strokes (`additive: true`) are for light
only. Options: `minPx`, `maxPx` (pixels of the full picture), `cells: [first, count]`, `lod: { near, far, keep }`.

For ground of your own (snow with drifts, a tiled square) use `P.groundRings` with `ringCell` / `ringGrow` in the body —
`kit.ground` and `kit.water` are the patterns to copy.

## How a frame is made
`renderAt(t)` → `walkAt(t)` (shot, metres along the way, speed, stride phase) → `Figure.pose` (bones, cloth, pins) →
`camAt(t)` → every thing's `follow(camera, frustum)` (ring tiles and chunks the eye can't see are switched off; far
chunks draw the first part of their shuffled dabs) → the wanderer's shadow picture → the world into a target with depth
→ the canvas pass (sun in the mist walked through the shade picture, weave, roll-off, varnish).

Cost: on a GPU, pixels; on the CPU (how films are rendered), texture looks in both shaders. The painter keeps both
small — one look for height and normal, one for the brush (its relief comes from screen derivatives), `unseen()` first —
and on the CPU takes one look at the wanderer's shadow instead of five (`?soft`).

## The thing protocol (to write a kit function of your own)
`{ name, group, shade, colliders: [{ x, z, r, top }], count, follow(camera, frustum, W), update(t, W), drawn() }` —
`group` goes in the scene, `shade` (black meshes of what never moves) into the picture of the shade, `count` into the
world's total, `drawn()` into the dabs-in-view figure the scripts print.
