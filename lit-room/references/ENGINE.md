# ENGINE — lib/lit-room.js and lib/props.js

## Start
```html
<canvas id="room" layoutsubtree content="drawable"><div id="page" drawable> …the page, 1280 × 720… </div></canvas>
<script src="lib/hic.js"></script><script src="lib/lit-room.js"></script><script src="lib/props.js"></script>
<script>
  LitRoom.prop('myThing', function (b, o, room) { … });          // props for this topic, before start
  var R = LitRoom.start({ canvas: room, page: page, room: ROOM, onReady: function (R) {} });
  LitRoom.wire(page, R);                                         // tabs, glows, presets, lamp switches
</script>
```
`start` builds the room, bakes AO, draws the shadow maps once, then draws only when something changed. Without
HTML-in-Canvas it calls `HIC.fallback` and returns `{ fallback: true }`.

## ROOM (all optional except size and a monitor)
| key | meaning |
|---|---|
| `seed` | the scatter seed (`b.r()`) |
| `size: [w, h, d]` | metres. x right, y up, z out of the back wall (z = 0) toward the camera |
| `shell` | `wall {kind, color, wainscot:{h, color, board}, skirting}`, `floor`, `ceiling`, `skirting {color, h}`, `tess`; per wall `back` / `left` / `right` / `front`: `{kind, color, skip, holes: [{x, y, w, h, frame, frameKind, frameW, bars:[cols, rows], sill, glass, depth}]}` (wall-local x from the left as seen from inside, y up) |
| `outside` | the sky seen through holes: `top`, `horizon`, `glow`, `stars` (0–1), `lights` (far town lights, 0–1), `ground`, `sea` ('#hex' or false), `moon [x,y,z]`, `moonSize`, `power` (keep 0.05–0.15), `window` (how much it lights the room) |
| `ambient` | `{sky, ground, power}` hemisphere fill × AO |
| `screen` | `{grid: [8, 5], aspect: 16/9}` cells of the page used as lights (≤ 16 × 12), the page's aspect |
| `look` | `exposure`, `bloom`, `grain`, `vignette`, `screenLight` (the page lighting the room), `screenGain` (its reflections), `screenGlow` (its brightness on screen and bloom) |
| `camera` | `home`, `start`, `close` as `[yaw, pitch, dist]` about `target` (default: just under the screen centre); limits `yaw`, `pitch`, `dist` as `[min, max]`; `fov` (vertical, deg) |
| `lamps` | extra lights not belonging to a prop: `{at, name, color, power, dir, cone, soft, glow, size, shadow, on, flicker}` |
| `props` | `[{type, at: [x,y,z], rot: deg, …options}]`, built in order |
| `bounce` | `{at, w, d, albedo, k}`: a lit surface that glows back (the `desk` prop sets it) |
| `ao` | `{reach: 0.45, strength: 0.85}` |

## The kit (`b` in a prop)
Transforms: `b.move(x,y,z)`, `b.rotX/rotY/rotZ(deg)`, `b.scale(x,y,z)`, `b.at(fn)` (push / pop), `b.obj(fn)` (a new object:
procedural texture coordinates become local). `b.tess` = the longest edge in metres (lighting is per vertex: keep big
surfaces near the screen ≤ 0.05).

Material: `b.mat(kind, '#hex', {rough, spec, power, twoSided, noCast, noScreenCast, key, lamp})`. Kinds: `paint`,
`plaster`, `wood` (grain along local x), `planks` (floor), `boards` (wall planking), `plastic`, `metal`, `brass`, `fabric`,
`rug`, `ceramic`, `paper`, `leaf`, `rubber`, `glass` (drawn last, adds reflections only), `glow` (emissive, `power`;
`lamp: true` ties it to the next light so it dims with it), `art` (decal at full colour), `keycap`, `soil`, `screen` (the
monitor only), `sky`.

Shapes: `b.box(w,h,d, {r, seg, faces, decal:{face:'Y', rect}})` (centred), `b.boxAt(x,y,z,w,h,d,opts)` (min corner),
`b.cyl(r,h,{r2, open, seg})` (on y = 0), `b.lathe([[r,y],…], {seg, sweep, inside})`, `b.sphere(r)`, `b.tube(points, r)`,
`b.leaf(len, width, bend)`, `b.quad(o, eu, ev, {decal, uv, flip})`, `b.grid(us, vs, f)` (the primitive under all).

Decals: `rect = b.atlas(wPx, hPx, function (g, w, h, rng) { …Canvas 2D… })` → `[u0, v0, u1, v1]`, then `decal: rect` on a
quad or a box face. Registrations: `b.screen(w, h)` (the monitor's picture, facing local +z), `b.light({…})` (at the local
origin, `dir` local), `b.rectLight(w, h, {L})`, `b.keyId(code)` (a key that sinks while that key is held),
`b.occluder(a, b)` (an extra AO box), `b.here(p)` / `b.dir(v)` (local → world), `b.r()` (seeded random).

## Adding a prop for a topic
```js
LitRoom.prop('microphone', function (b, o) {
  b.tess = 0.02;
  b.mat('metal', '#2b2b2e'); b.cyl(0.06, 0.012);                       // base
  b.tube([[0, 0.012, 0], [0, 0.22, 0], [0.05, 0.3, 0.04]], 0.006);     // arm
  b.at(function () { b.move(0.05, 0.3, 0.04); b.rotX(-30);
    b.mat('metal', o.grille || '#9aa0a6', { rough: 0.5 }); b.sphere(0.028); });
});
// ROOM.props: { type: 'microphone', at: [1.2, 0.74, 0.4], rot: 20 }
```
Keep the origin on the surface it stands on and +z toward the room; give it `b.occluder` if it is not made of boxes so it
darkens the desk under it.

## How the light works (for tuning)
1. On every paint the page is uploaded with mips. `relight()` renders a 256-wide linear copy (sqrt-encoded) for
   reflections and the `grid` (8 × 5) of mean colours, reads the grid back for the exposure and the bounce card.
2. Vertex shader: every grid cell is a patch light (irradiance `A·cosθr·cosθs / (r² + A/π)`), summed per vertex →
   `vScr`; constant rect lights (the window's sky, the desk's bounce) → `vRect` × AO.
3. Fragment shader: `vScr` × the screen's soft shadow (tile 0 of a depth atlas, PCSS from a point behind the screen),
   room lamps with their own shadow tiles (up to three), hemisphere ambient × AO, the page reflected by a ray against the
   screen plane at a mip level set by roughness, materials in the shader, sky by direction behind holes.
4. Post: bloom from the HDR mip chain, ACES tone, vignette, grain; screen pixels skip the tone curve (alpha flag) so the
   page looks as authored; exposure eases toward a value set by the page's brightness and the lamps.
