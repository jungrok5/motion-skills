# KIT — API

```js
import { Film } from 'sc/film.js';
import { C } from 'sc/sketch.js';               // palette
import { defineProp } from 'sc/props.js';       // your own props
const F = new Film({ title, W: 1350, H: 1080, step: 1.5, hold: 2.5, bar: true, number: true });
const { chapter, state, init, final, edge, group, region, divider, note, prop } = F;
F.step('caption', 'activeId' | ['idA', 'idB'] | { at, dur, cam, focus });
…elements…
F.check('name', t => true);                     // optional extra rule, checked at every sampled t
F.start();
```

## Film options
| option | default | |
|---|---|---|
| `W`, `H` | 1350, 1080 | design size (5:4). 1920×1080, 1080×1350 and 1080×1920 work; lay the chart out for that width |
| `step` | 1.5 | seconds per step at 1×; a step grows to fit its reveals (+0.55 s) |
| `hold` | 2.5 | seconds held at the end |
| `bar` | true | the player bar (buttons, counter, caption); `false` = full-height picture, no caption |
| `number` | true | prefix captions with `II.3 — ` |

## Steps
`F.step(caption, at)` — elements written after it belong to it. `{ dur }` sets a minimum length, `{ cam: y }` pins the
camera's top, `{ focus: [ids] }` chooses what the camera keeps in view (default: the step's new elements + `at`).

## Elements (all take an `id`; coordinates are sheet px)
| call | options |
|---|---|
| `chapter({ x, y, title, sub, tag, kicker })` | `kicker` defaults to `"<title> · II"`. Starts a new caption numbering |
| `state(id, { x, y, label, tag, w, h, minW })` | x = centre, y = top; width fits the text |
| `init(id, { x, y })` · `final(id, { x, y })` | centre of the dot |
| `edge(from, to, o)` | `text` (action), `guard` (condition), `exit` / `enter` (`'t' 'b' 'l' 'r'`, auto by default), `ex` / `en` (−1…1 along that side), `via: [[x, y] …]` (corner points), `midY` / `midX`, `out` (swing of a self-loop / same-side edge), `side: 'l'` (label left of the arrow), `lx` / `ly` / `lalign` (place the label), `r` (corner radius), `noDot` |
| `group(id, { x, y, w, h, title, tint })` | a container; `title` is the italic header with a rule under it |
| `region(id, { x, y, w, h, title, tint })` | tinted: `'sky' 'blush' 'cream' 'mint' 'paper'` |
| `divider(id, { x, y, h })` / `{ x, y, x1 }` | dashed line, vertical / horizontal |
| `note(id, { x, y, text, align, style })` | small text (a caption under ingredients); `style: { italic, size, color }` |
| `prop(name, { x, y, s, flip, rot, bg, front, overlap, still, delay, focus, …params })` | x, y = bottom-centre. `bg` draws behind the chart, `front` above it, `overlap: true` exempts it from overlap checks, `still` freezes its animation, `delay` (s after the step starts), `focus` keeps it in the camera's view |

Every element also takes `delay` (seconds after its step starts) to override the automatic order.

Default auto-routing: target below → bottom to top; target above → right side to right side (a back edge); same row →
side to side; `from === to` → self-loop.

## Props (lib/props.js) — params beyond x, y, s, flip
| prop | params |
|---|---|
| `person` | `pose` stand · walk · squat · kneel · bend · sit; `act` none · stir · rub · sprinkle · carry · reach · wave · hold (`hands: [[x,y],[x,y]]`); `hat` cone · scarf · cap · bun · long · none; `hatColor`, `hair`, `shirt`, `pattern` flowers · dots · stripes · plain, `patternColor`, `pants`, `skin`, `apron`, `gloves`, `sleeves: 'long'`, `item: { name, …params, dx, dy }` (a prop in the front hand), `speed`, `phase` |
| `sun` `r` · `cloud` `w h drift color` · `rain` `w h n speed` · `snow` `w h n speed` · `steam` `h n alpha` · `fire` `w h logs` | weather & heat |
| `pot` `w h color fill lid steam` · `tub` `w h color fill items:{name,n,s,…}` · `bowl` `w h color heap band` · `jar` `w h color lid snow` · `cup` `w h color straw steam` · `sack` `w h color label` · `basket` `w h color heap` · `crate` `w h color tape label` · `coins` `n` · `books` `n w` | vessels & goods |
| `table` `w h color` · `stool` `w h color` · `mat` `w h color` · `shelf` `w h rows books` · `panel` `w h color ground outline` · `ground` `w` | furniture & backdrops |
| `tree` `h color` · `plant` `h n color` · `house` `w h color roof chimney sign` · `sign` `w h text post size` · `umbrella` `r h color` · `machine` `w h color spin` · `truck` `w h color cab label spin` · `screen` `type: laptop · phone · monitor`, `w h` | places & machines |
| `veg` `type: cabbage (half) · radish · garlic · chili · scallion · onion · apple · leaf`, `color` · `bundle` `n len color tip` · `fan` `r n color stick` · `pile` `of type n w each` · `blob` `pts | rx ry`, `fill hatch outline` | produce & anything else |

## Your own prop
```js
defineProp('kettle', {
  box: o => [-40, -70, 46, 0],                                  // local bounds (for checks and the reveal wipe)
  draw(P, o, t) {                                               // P: shape, ell, rect, rrect, ink, hatch, text, prop, rnd, C
    P.shape([[-36, -50], [36, -50], [30, -2], [-30, -2]], { fill: P.C.red, base: P.C.red, baseA: .8 });
    P.ink([[36, -40], [46, -56]], { w: 3 });                    // spout
    P.prop('steam', { x: 46, y: -58, h: 40, n: 2 }, t);
  },
});
F.prop('kettle', { x: 1100, y: 500 });
```
`shape(pts, { fill, base, baseA, hatchColor, gap, a, angle, cross, outline, w, amp })` — base wash + hatch + ink outline.
Keep it a pure function of `t` and `o`; random choices come from `P.rnd` (seeded per instance).

## Sketch helpers (lib/sketch.js)
`ink(ctx, pts, { w, color, closed, k, seed, amp })` · `hatch(ctx, pts, { color, base, angle, gap, w, a, cross })` ·
`shape` · `limbPts(spine, w0, w1)` · `ticketPts` · `roundRectPts` · `ellipsePts` · `cloudPts` ·
`text(ctx, str, x, y, { size, bold, italic, color, align, k })` (k = typewriter share) · `measure` · `rng`, `n1`, `hash`.
