# The pour score — moves, figures, numbers

A film's figure is a list of barista moves in `film.js` (`pour: [...]`). `lib/pour.js` turns it into the pitcher's
track (spout position, height, flow, pour direction, pin) and `lib/latte.js` lets the milk do the drawing. You never
paint the figure: you pour it, and if it comes out wrong you change the pour.

## Coordinates
- The liquid surface is the unit disc: x right, y down, radius 1 = the liquid's edge. `[0, 0]` is the middle.
- `dir` (film option, or a `turn` move) is the way the milk goes on screen, in degrees: `180` = toward the left (pitcher
  on the right, the default), `270` = upward (pitcher below), `0` = toward the right, `90` = downward.
- **Forward** = along `dir`. Foam surfaces just ahead of the spout and is pushed forward; the spout stays at the back
  edge of what it pours. So a figure grows *forward* from the spout and the spout moves *backward* to stack things.
- Keep the spout inside r ≤ .9 while milk runs and r ≤ .85 when low (`check.mjs` → over the cup).

## Moves
| move | fields (defaults) | what the milk does |
|---|---|---|
| `fill` | `at`, `swirl` .16, `hz` .55, `q` .85 | high, circling: the milk dives under the crema. No white. Lightens and marbles the crema; raises the level. Always first. |
| `drop` | `at`, `q` .9 | the spout lifts a touch (anticipation, keyed for you) and comes down to the surface: white starts here |
| `pour` | `to`, `q` .95 | stays low: a blob grows ahead of the spout (drift with `to`) |
| `wiggle` | `to`, `hold`, `amp` .1, `ampTo`, `hz` 3.5, `q` .9 | low, rocking across `dir`: each end of the rock lays a lobe of foam, the fast middle drags brown between them → leaves. `hold` s in place, then drifts to `to` |
| `punch` | `to`, `q` 1 | lifts, moves to `to` on a trickle, then a full high burst punches a brown hole — the gap that keeps stacks apart. Follow with `drop` |
| `lift` | `q` .4 | spout up (thin stream) — before a cut |
| `cut` | `to`, `q` .35 | a thin high stream dragged to `to`, then off: pulls the figure into a point / stem |
| `move` | `to`, `h`, `q` | anything else (h 0 low … 1 high) |
| `turn` | `dir` | the pour direction swings (the pitcher goes round) |
| `stop` | — | flow off, spout up |
| `etch` | `path` [[x,y]…], `ink` 0, `width` 1 | the pitcher leaves; a pin drags through the surface leaving a thin crema line (`ink: 1` foam, `ink: null` drag only) |
| `wait` | — | nothing |
Every move has `dur` (s). `say: '…'` on a move starts a new step label on screen (3–7 steps). The pitcher's entrance
before the first move and its exit after the last pour are added for you.

## Figures that are proven (in the bundled films and the tests) — starting numbers, not menus
Shown for `dir: 180` (pour leftward). For another direction rotate the points (forward = along `dir`).

**Heart** — one blob, then a cut.
```js
{ do: 'fill', dur: 2.4, at: [-.05, 0], swirl: .15 }, { do: 'drop', dur: .6, at: [.1, 0] },
{ do: 'pour', dur: 3.2, to: [.1, 0] },                 // longer = bigger heart
{ do: 'lift', dur: .3, q: .35 }, { do: 'cut', dur: .5, to: [-.85, 0] },
```
**Rosetta** (starter) — rock in place, then rock while pulling back, then cut forward through the leaves.
```js
{ do: 'fill', dur: 2.6, at: [-.1, 0], swirl: .16 }, { do: 'drop', dur: .6, at: [-.1, 0] },
{ do: 'wiggle', dur: 5, hold: 2.8, to: [.52, 0], amp: .11, ampTo: .07, hz: 3.5 },
{ do: 'lift', dur: .3, q: .4 }, { do: 'cut', dur: .5, to: [-.84, 0] },
```
Leaves: more `hz` = more, finer leaves; more `amp` = wider; `hold` longer = a bigger fan at the front.

**Tulip** (example, poured upward) — a blob, then each next stack pushed in *behind* the last after a punch.
```js
{ do: 'fill', dur: 2.4, at: [0, -.15], swirl: .15 }, { do: 'drop', dur: .6, at: [0, -.3] }, { do: 'pour', dur: 1.4, to: [0, -.3] },
{ do: 'punch', dur: .5, to: [0, -.12] }, { do: 'drop', dur: .4, at: [0, -.12] }, { do: 'pour', dur: 1.0 },
{ do: 'punch', dur: .5, to: [0, .04] },  { do: 'drop', dur: .4, at: [0, .04] },  { do: 'pour', dur: .8 },
{ do: 'punch', dur: .5, to: [0, .18] },  { do: 'drop', dur: .4, at: [0, .18] },  { do: 'pour', dur: .6 },
{ do: 'lift', dur: .3, q: .35 }, { do: 'cut', dur: .5, to: [0, -.86] },
```
Stacks: step back .14–.18 each time and pour shorter each time (1.4 → 1.0 → .8 → .6 s) so the stacks shrink.

## Building your own
- A **wave / slow rosetta**: `wiggle` with low `hz` (1.5–2.2) and large `amp` (.14–.18).
- **Two figures**: pour one, `stop`, `move` high to the second spot, `drop`, pour, `turn` to cut it its own way.
- **A swan**: rosetta wings poured with `dir` one way, then `turn` 90°, `drop` and a short `pour` for the head, a `cut`
  curling back as the neck (try in a scratch project; tune by looking at `--shots`).
- **Details** with `etch`: eyes, whiskers, a zig-zag through a heart, a letter. Paths cross foam edges to show up best;
  a crema line inside foam (ink 0) and a foam line in crema (ink 1) both read.
- Iterate on stills: `render.mjs my-cup --shots` shows the end of every step. If the figure is off, change the score
  (positions, durations, amp) — never the physics constants (`references/PHYSICS.md`).
