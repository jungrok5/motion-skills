# KIT — the API

All units are metres and degrees (except glove shapes and `rot` props, in radians). The street runs along +x; building
fronts are the plane z = 0 facing +z (the camera side); the sidewalk is z ∈ [0, 3.4] at y = 0; the road is beyond the
curb at y = −0.16. A figure's yaw 0 faces the camera, 90 faces +x (walking right).

## Film (`lib/film.js`)
```js
const F = await new Film({ title, bpm: 120, fps: 30, W: 1920, H: 1080, look: { sun: { i: 3.4 } }, fonts: [[family, file, weight]] }).load();
const S = F.S;                       // the kit bound to the film: S.building({...}) builds AND adds; { at, ry, s } place it
F.cloudBand({ from, to, n, z, y });  // painted clouds behind the street
F.mirror({ at, w, d, shape: "blob" | "ellipse" | "rect", tint });   // a puddle / pond; show it in a shot with s.mirror(m)
F.prop(obj) → { at(pos, rot = [x, y, z] radians, scale) }           // a moving prop (hidden unless placed this frame)
F.shot({ id, dur, kind: "gag" | "intro" | "outro", marks: { notice, act, button, … }, sfx: [[kind, mark | t, offset, { gain, pitch, pan, dur }]], mb: 0.5, fn(t, s) });
F.title({ at, dur, text, sub, size, color, ink, pos: "low" | "center", x: 0…1, font });
F.start(SCORE, renderScore);
```
In `fn(t, s)`: `s.cam(pos, at, fov, roll)`, `s.shake(amp, t0)`, `s.m` (marks), `s.dur`, `s.u`, `s.T` (absolute),
`s.fx`, `s.mirror(m)`. FX (call every frame with the same t0): `s.fx.puff(t, t0, { at, n, size, dur, rise, spread,
dir })`, `s.fx.steam(t, at | () => at, { rate, size })`, `s.fx.stars(t, t0, at)`, `s.fx.sweat(t, t0, at, { side })`,
`s.fx.drops(t, t0, at)`, `s.fx.lines(t, t0, t1, at, dir)`, `s.fx.shadow(at, size)`.

## Figures (`lib/figure.js`)
```js
const hero = person(F, { build: "lanky" | {…numbers}, skin, top: { kind, color, inner, pattern, b, open, len },
  bottom: { kind: "pants" | "shorts" | "skirt", color, pattern }, shoes: { kind, color, sole, stripe }, socks: { color, stripe: [a, b] },
  hair: { style, color, streak }, hat: { kind, color, brim, band, pom }, beard: { kind, color },
  face: { shape: "egg" | "round" | "long" | "jaw" | "pear", nose: "button" | "bulb" | "long" | "hook" | "wide", eye, brows, thick, cheeks, iris },
  extras: ["contraption", "beacon", "goggles", "glasses", "shades", "vest-hivis", "apron", "tie", "badge", "scarf", "satchel", "backpack", "watch"],
  brass, vest, apron, tie, seed });
hero.place([x, y | null, z], yaw).pose(P.stand | walk(phase, { strut, stride, arms }) | run(phase) | KP(t, track) | mixPose(a, b, k) | over(a, b))
    .face("deadpan", { t, look: [x, y, z], gaze: [yaw°, pitch°], over: { lid: .6 } });
hero.socket("head" | "top" | "nose" | "chest" | "collar" | "belt" | "back" | "hips" | "handL" | "handR" | "footL" | "footR" | "hose" | "vent");
hero.pin("collar", worldPoint); hero.plant(); hero.squash(k); hero.axis("fwd" | "right" | "left"); hero.hold(obj, "R", pos, rot°);
stroll(t, t0, t1, x0, x1, strideLen) → { x, phase, moving };  steps(t0, t1, x0, x1, strideLen, { gain, pitch }) → sfx cues
```
Pose keys (degrees): `armL/armR: [forward, out, twist, elbow]` (twist > 0 turns the elbow's bend toward the body),
`legL/legR: [forward, out, knee]`, `footL/R`, `handL/R` (curl 0…1), `wristL/R`, `head: [nod, turn, tilt]`, `lean`,
`chest`, `chestYaw`, `twist`, `side`, `sway`, `bob`, `crouch`, `shift`, `hipYaw`. Poses: `stand, hips, crossed, shrug,
point, wave, reach, carry, holdBag, dangle, flail, cower, sit, sitBox, tumble, salute, tipCap, phone, scooter, sneak,
lookUp, hold, hold2, lick, toss, heroStand`. Expressions (`EXPR`): `neutral, deadpan, smug, happy, joy, shock, scared,
annoyed, angry, sheepish, dazed, sleepy, squint, sly, sad, wonder, yell`.

## The gadget (`lib/gadget.js`)
```js
const glove = gadget(F, { style: "leather" | "cartoon" | "rubber" | "oven" | "boxing", color, size: 1.15, side: "R" | "L",
  stitch: true, thread, hose: { color, r, stripes: [a, b], stripeLen }, from: () => hero.socket("hose"), fromDir: () => dir, tip: (G) => Object3D });
glove.set({ at, aim, palm, rot, shape: "point" | SHAPES.x | mixShape(a, b, k) | KS(t, track), squash, size, slack, lag, curl, hoseScale, from: false });
glove.point("wrist" | "cuff" | "palm" | "back" | "grip" | "top" | "center" | "tip" | "middleTip" | "thumbTip", offset);
glove.align("grip", worldPoint);   // slide the glove so a point lands there (it follows what it holds)
Glove.scold(t, t0, at, toward) → { at, aim, palm }   // the safe telling-off (index pointing, shaking)
```
`at` is the wrist; `aim` the way the fingers point; `palm` the way the palm faces. Shapes: `open, relaxed, flat, stop,
cup, fist, point, pointUp, beckon, flickReady, flick, pinch, grab, claw, thumbsUp, ok, peace, gun, horns, hold, shoo,
spin` (`pointUp`/`beckon` only in profile — see STORY.md, safe gestures).

## The set (`lib/kit.js`) — every builder returns an Object3D; use `S.x({ …, at, ry })` to add it
`street({ from, to, walk, road, crosswalk: [x…], far })` · `building({ x, w, floors, ground, upper, depth, wall:
"brick" | "painted" | "plaster", brick, mortar, paint, plaster, trim, windows: { cols, w, h, arch }, cornice, shop: {},
sign: { text, fg, bg }, awning: { a, b, depth, drop }, blade: { text, fg, bg, at }, door: "left" | "right" | "centre",
patches, seed })` · `awning` · `blade` · `sign({ text | icon: "no-smoking" | "school" | "arrow" | "hand", w, h, fg, bg,
border, post })` · `plate` · `lamp({ globes, color, h, baskets, flower })` · `bin` · `hydrant` · `bench` · `ladder({ h,
lean })` · `car({ color, len, w })` · `scooter` · `tree({ h, r, color })` · `planter` · `pipe` · `bollard` · `skyline({
from, to, z })` · `park` · `hedge` · `pond` · props `paddle({ text })`, `scoop({ color })`, `cone`, `snack({ color, text
})`, `balloon({ color, string, r })`, `handbag`, `pie`, `parcel({ w, h, d, label })` · helpers `mat(color, { rough, metal,
map, bump, clear, sheen, emissive })`, `rbox`, `lathe`, `merge`, `box`, `boxUV`, `uvScale`, `mesh`, `STREET`, `groundAt`.

## Textures (`lib/paint.js`)
`brick`, `chip`, `flake`, `plaster`, `concrete`, `asphalt`, `stripes`, `leather`, `cloth({ pattern: plain | plaid |
denim | knit | stripe })`, `wood`, `grass`, `glass`, `label({ text, w, h, fg, bg, vertical })`, `cloud`, `spot`,
`puffTex`; drawing helpers `dab`, `streak`, `blob`, `rgbOf`, `css`, `shade`.

## Core (`lib/core.js`)
`K(t, [[t0, v0], [t1, v1, ease] …])` (numbers or arrays; eases `lin i o io io2 i2 o2 snap back backIn elastic bounce
hold`), `win(t, a, b, ease)`, `wob(t, t0, amp, hz, decay)`, `band`, `arc(p0, p1, h, u)`, `bez`, `rng(seed)`, `hash`,
`noise1`, `noise2`, `fbm`, vectors `add sub mul len norm dist cross dot lerp lerpA clamp`.

## Score (`lib/score.js`)
`SCORE = { bpm, key, swing, sections: [{ at, mood: intro | groove | tiptoe | break | hit | outro | silence, gain }],
stops: [t…], music, sfx, reverb, seed, hook }` — the cues come from `F.cues()`. `SFX_KINDS`: stretch, retract, snap,
flick, whoosh, boing, thwack, clang, splash, squeak, puff, pop, ding, thud, crash, honk, zoom, skid, slide-up,
slide-down, plop, crinkle, sparkle, tick, rattle, stab, cymbal, scratch, step, swish, gulp, tada, wobble, knock, beep.
