# The cast: people as data on one rig

A film's people live in ONE cast file (`scenes/<film>-cast.js`) that every scene loads after `lib.js`, `webtoon.js`,
`manga.js` and `cast-rig.js`. It holds one `Cast.define` per person and the film's props and backgrounds. Scenes never draw a
person any other way, so a person looks the same in every panel and a fix lands everywhere at once.
Worked examples: `examples/starter/scenes/starter-cast.js` (two people, ~3 KB, one custom ponytail) and
`examples/donut/scenes/donut-cast.js` (the five people the rig was extracted from, plus the office props).

## Defining a person
```js
Cast.define('junho', {
  name: '준호', seed: 17, h: 1.03, expr: 'happy', hair: 'spiky',              // h = height ×, expr = default expression
  build: { sh: 64, waist: 46, hip: 48, neck: 13.5 },                          // + belly, arm (arm length ×)
  pal: { skin: '#f6d3b9', hair: '#24212a', shirt: '#f4f1e8', outer: '#2f3a52', pants: '#5b6478', shoes: '#f0f0ec' },  // riso colours
  shirt: { collar: 'round' }, outer: { kind: 'jacket', open: 44 },            // wardrobe
  look: { hair: { ink: 1 }, shirt: { tone: 0, white: 1, sh: .28 }, outer: { ink: 1 }, pants: { tone: .34, sh: .3 } },   // mono values
});
```
- **look** is what the mono print shows: per part `ink: 1` (solid black, with a white rim on the lit edge), or `tone` (dot
  coverage 0…1) + `sh` (extra coverage in the cel shade band), `white: 1` for light paper. Parts: hair, grey, brow, shirt,
  outer, tie, pants, skirt, shoes, sock, band, lanyard, clip, skin.
- **pal** is what `Cast.style = 'riso'` shows (flat colour fills); keep it even for a mono film — the riso sheet is a cheap
  second look and helps the person approve the cast.
- **wardrobe flags**: `shirt { collar: 'shirt'|'round'|'hood', open, roll }` (roll = rolled sleeves: skin forearms),
  `outer { kind: 'vest'|'jacket'|'cardigan', open }`, `tie { loose }`, `hood`, `skirt { len }`, `lanyard`, `band` (wristband on
  the left wrist), `glasses { r }`, `moustache { w }`, `bags`, `wrinkles`, `lashes`, `browW`.
- **hair**: a preset — `messy` (+ a springing ahoge), `sidepart` (grey temples via `look.grey`), `spiky`, `bob` (+ a clip when
  `pal.clip` is set), `bald` (grey tufts and a shine) — or your own `{ back(ctx, H), front(ctx, H) }`.

### Drawing your own hair
Hair is drawn in **head units**: 1 = the face's half-width, origin at the face centre, eyes at y ≈ 0, mouth ≈ .62, chin 1.2,
crown ≈ −1.14, hair up to ≈ −1.5. `back` draws behind the face, `front` over it (fringe, side locks). `H` gives:
`H.O(x, y)` a point on the skull's outline (slides back as the head turns), `H.F(x, y)` a point on the face (turns with it),
`H.sn` = sin(turn) (+ = facing screen-right), `H.spring(i)` a damped sway driven by `o.hairEv` times, `H.shadow` = true on the
fringe-shadow pass (draw the silhouette only), `H.S` / `H.o` the spec and options. Fill with
`Manga.ink(ctx, pts, Object.assign({ lw: 1.05 }, Cast.hairPaint(H)))` so it follows the style (mono, riso, stone). Compose
presets: the starter's 민지 is `Cast.HAIR.bob.back` + a ponytail on the side away from where she faces, `front: Cast.HAIR.bob.front`.

## Drawing people in a scene
| call | what |
|---|---|
| `Cast.draw(ctx, t, who, o)` → G | the normal body (≈1:5, s = 1 → ~640 px tall), feet at (o.x, o.y) |
| `Cast.sd(ctx, t, who, o)` → G | SD / chibi (1:1.5) for gags: poses stand, run, sit, flail, slump, kneel; mitten hands |
| `Cast.face(ctx, t, who, x, y, s, o)` | head only (+ `bust`), centred — close-ups, eye strips, medallions |
| `Cast.stone` / `Cast.crumble` | the SD in grey stone, then cracking to rubble (`Webtoon.crumble`) |
| `Cast.hand(ctx, who, pose, x, y, ang, sz, o)` | a big close-up hand with that person's sleeve and cuff, (x, y) = wrist |
| `Cast.reachArm(ctx, t, who, shoulder, wrist, o)` | a close-up ARM from an off-panel shoulder on the 3D IK, hand at the solved wrist |
| `Cast.geom` / `Cast.sdGeom` | the same geometry without drawing — place balloons (`G.mouth`), props (`G.hands.R.grip`), targets (`G.shoulders`) |

Options: `turn` (0 front, ±.55 three-quarter, + faces right), `headTurn`, `tilt`, `nod`, `lean`, `pose` ('stand', 'walk' + `ph`,
'sit', 'kneel', 'crouch'), `expr` (neutral, smile, glint, shock, cry, joy, chew, determined, dead, talk, happy, worried, tired,
angry, blank) or `eyes` / `brows` / `mouth` / `talk` / `look` / `blush` individually, `laugh`, `sway`, `hairEv`, `stone`, `alpha`.
Note: `joy` and `cry` stream tears (tears of joy) — for a plain happy face use `happy` or `smile`.

### Arms and hands
`arms: { L, R }` are the SCREEN-left / screen-right arms: `{ to: [x, y], hand, ang, bend, thumb, front, prop, propFront }`.
`to` is where the GRIP lands; the arm is solved by 2-bone IK with fixed lengths. Hands: open, cup, fist, rock, hold, point,
scissors, paper, wave, grab, pinch, thumb, mitt (SD). `ang` = the hand's world angle, clamped to ≤ 80° off the forearm.
`prop(ctx, H)` draws a held thing behind the fingers, `propFront` in front, in hand coordinates — the thing moves with the hand.
- **Keep targets inside reach.** Upper arm + forearm ≈ 190 px × s for the normal body (98 + 90 for the donut film's 박대리 at s = 1), 64 px × s for SD. A target farther
  than that gives a straight stick of an arm. Derive targets from geometry (`Cast.sdGeom(...).shoulders.R` + an offset), as the
  starter's last panel does, instead of guessing screen coordinates.
- **Hand facing**: a grab from above shows the back of the hand (palm down); reusing a palm-to-camera hand for it reads as a
  wrist turned 180°. The thumb is on the body's midline side when the palm faces the camera, on the outer side when the back of
  the hand does; a left hand is the mirror of a right (`flip`, `thumb`). Check every close-up hand for it.
- **Arms entering a panel** (a hand reaching in, a lunge from off-screen) start at the frame edge: put the shoulder OFF the panel
  and draw with `Cast.reachArm` (or `Cast.hand` with a sleeve long enough to leave the panel) — never an arm that begins in
  mid-panel. A solid-black sleeve on a black panel needs its paper halo (`reachArm` adds it).
- **'point'** at close-up size can read as a rude gesture if the extended finger sits mid-hand; keep the pointing finger on the
  thumb side with the thumb showing, or use an open hand.

## The cast sheet
Before any scene, render a sheet like `examples/donut/scenes/cast-sheet.html`: every person front / 3/4 with IK hands / SD,
the faces and expressions, hands and props, effects, stone, and a page with `Cast.debugBones` on. Show it in both finishes
(`?style=riso&grade=0`). It is where the person approves the look, and the reference every scene author works from.

## Where a fix goes
If a problem shows in every scene (a sleeve that ends wrong, a wrist that can over-bend, a hair that clips), fix it in the cast
rig or the cast file once and re-run `bone-check.mjs` on every scene. If it is one pose (a target too far, a hand facing the
wrong way), fix that scene.
