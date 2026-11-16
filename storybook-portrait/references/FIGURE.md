# FIGURE — the character as data, extras, layers, the page contract

`character.js` exports three things: `design` (what the character looks like), `motion` (how it moves) and `meta`
(`title`). Everything you leave out of `design` comes from `DEFAULTS` in `lib/figure.js` — a neutral example, never the
answer for a topic. Lengths are virtual pixels on the 1080×1350 sheet; face and hair numbers are in units of the head
radius `a`.

## design

```js
export const design = {
  seed: 7,                                   // every stroke's randomness comes from here (deterministic)
  canvas: { W: 1080, H: 1350, paper: '#fbf8f2' },
  ink: '#241c22',
  head: { x: 540, y: 560, a: 220, top: 1.06, chin: .98, jaw: .2, skin: '#f5d6c8', shadow: '#e2ab9c', line: .9 },
  face: {
    eyeX: .43, eyeY: .3, eyeR: .155, pupil: .38, eyeShape: 1, sclera: '#fdfbf6', pupilColor: '#141217',
    gaze: [.6, 0],                           // default look (x right +, y down +), −1..1 inside the eye
    lids: 0, lashes: 0,                      // resting lid (0 open … 1 shut), lashes per eye
    nose: { type: 'button' | 'dot' | 'line', y: .45, size: 1, color: '#e98798' },
    mouth: { y: .66, w: .15, curve: -.5, open: 0, color: '#7c2c38' },
    brows: { show: [true, true], y: .55, tilt: .1, thick: 1, len: 1, color: '#1a1619' },
    blush: { color: '#ee8088', x: .58, y: .5, r: .25, strength: 1.25 },
    freckles: 0,
  },
  ears: { show: true, over: true, y: .34, size: 1, color: '#e98f7e', earring: { type: 'none' | 'drop' | 'hoop' | 'stud', color, size } },
  hair: {
    style: 'straight' | 'short' | 'bun' | 'curly',
    bangs: 'curtain' | 'full' | 'none',      // straight / short only
    part: -.08, length: 1.7, volume: .1, flare: .1, curl: 0,
    base: '#16151a',                         // the gouache mass under the strands
    colors: [[dark, w], [dark2, w], [streak, w], [streak2, w]],   // the first two paint the strands, the rest the streaks
    strands: 32, strays: 16, back: false, backColor, bun: { x, y, r },
  },
  neck: { w: .3, len: .78 },
  body: { shoulders: 1.42, slope: .5,
    garment: { type: 'sweater' | 'cardigan' | 'collar', color, pattern: { type: 'solid' | 'stripes' | 'dots' | 'checks', colors, width, gap },
      inner: { color, pattern }, opening: .42, collarColor, bandColor } },
  extras: [ … ],                             // below
};
```

A hairstyle or garment the topic needs and the list does not have (a cap, braids, a hood up, overalls) is an **extra**,
not a change to `lib/`.

## extras

```js
extras: [
  { layer: 'head',                           // back | behind | body | head | hair | front
    ops: A => [{ name, bb: [x0, y0, x1, y1], dir: [dx, dy], w, draw: (ctx, seed) => { /* paint.js calls */ } }],
    live: (ctx, A, pose, t) => { /* redrawn every frame, t = seconds since the drawing finished */ } },
]
```

- `ops` are static strokes, painted once into their own canvas and revealed during the drawing along `dir`; `bb` must
  contain everything the op paints (paint outside it is cut off). `w` weights how long the hand spends on it.
- `live` draws every frame (rain, a bee, steam, dust). Keep it cheap: plain canvas calls, seeded by `P.rng(n)`.
- Paint with `lib/paint.js` only — `gouache`, `dryBrush`, `crayon`, `ink`, `blush`, `dabs`, `tooth`, plus `spline`,
  `bezier`, `ellipse`, `rough`, `bounds`, `union`, `rng`, `noise1/2`, `mix`, `shade`, `css`. Import it as
  `../../lib/paint.js` in the skill's examples and `./lib/paint.js` in a project (`new-portrait.mjs` rewrites both the
  page's import map and `character.js`'s imports when it copies).
- `A` (anchors): `W, H, hx, hy, a, yaw, bodyYaw, eyes [{cx, cy, rx, ry, side, k, vis}], nose, mouth, ears [{side, vis, x, y, w, lobe}],
  top, crown, neck, shoulders [[x, y], [x, y]], chest, front (the chest's centre line), U(x, y) (head units → px), HU (hair
  units, turned), hair (mass outline points), ink, design`.

| layer | rides | use for |
|---|---|---|
| `back` | nothing (still) | a halo, a window frame behind |
| `behind` | the body (breathes) | a hood or collar behind the neck, a backpack strap's far side |
| `body` | the body | buttons, aprons, brooches, scarves, folds |
| `head` | the face (turns with the features) | glasses, flour, freckles, face paint, a pencil behind the ear |
| `hair` | the hair (lags the head) | hats, clips, ribbons, flowers in the hair |
| `front` | nothing | rain, a bee, steam, dust, petals — things in the air |

## Layers and transforms (back to front)

`x:back` · `hairBack` · `x:behind` · `body` · `x:body` · `neck` · `head` · `face` · `@face` (pupils, lids, brows, mouth —
live) · `x:head` · `hairFront` · `ears` · `earringL` · `earringR` · `@strays` (flyaways — live) · `x:hair` · `x:front`.
The body scales from its bottom edge (breath) and turns a little with the shoulders; the head and neck rotate about the
base of the neck and rise with the breath; the face slides with the live yaw; the hair rotates about the crown by its
lag; earrings swing about the lobe.

## Page contract

- `piece.html` imports `sp/portrait.js` and `./character.js` and calls `mount(character)`.
- `window.__ready`, `window.DURATION` (= `motion.draw + motion.live`), `window.FPS`, `window.seek(t)` — draws that moment;
  no state carried between calls (the drawing re-commits, the motion re-simulates from 0 when you go back).
- `window.__sp = { portrait, figure, pose(t), rig(), motion(), drawT, DURATION }` — what `check.mjs` reads.
- Query: `?render=1` (no clock; for scripts) · `?scale=.5` · `?t=3` · `?done` (skip the drawing) · `?cast` (cast sheet,
  `&cell=.3`). Click the live page to replay.
