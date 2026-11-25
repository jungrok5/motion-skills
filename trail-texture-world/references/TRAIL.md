# TRAIL — the texture, the grounds that read it, the walker, the API

## The idea in one paragraph

A game keeps one extra texture the size of the play area. Each frame the player *writes* into it where they are (feet, body),
and the texture slowly forgets. Every terrain's shader *reads* the same texture and decides what that memory means on that
ground: snow shows a dent, grass bends, water draws a ring, a road ignores it. One write path, many readings — which is why
it is cheap and why it looks rich. This skill does exactly that in a pixel buffer, deterministically.

## The texture

A window of the world around the camera (the 320×180 frame plus a 48 px margin), one texel per world pixel, five channels:

| channel | meaning | written by |
|---|---|---|
| `fT` | time a foot last pressed this texel | a foot stamp: a small oriented rectangle where a foot planted (3 × 2 px, a landing 4 × 3) |
| `fS` | how hard: 1 a step, 2 a landing | the same stamp |
| `bT` | time the body last covered it | a body stamp: an ellipse under the body (`bodyR`), 20 per second while moving, 4 while standing |
| `bX`, `bY` | which way the body pushed it (out from the body's centre, plus the travel direction) | the same stamp |
| `wv` | ripple height now | wake stamps: every foot plant on a ground with `step.wake`, a weaker one every 0.24 s while wading, a big one on a landing. Each is two rings growing at 15–24 px/s and fading over 3.2 s, summed |

**Rebuilt, not accumulated.** Each frame the window is cleared and every stamp still inside its memory is drawn in again.
Because the newest press wins (`max` of times) and the ripple is a pure function of age, the rebuild gives exactly what an
accumulating texture with decay would — but `seek(t)` stays a pure function of `t`, and the film can jump anywhere. The
texture keeps foot presses as long as the longest-remembering ground needs (`life`, max 120 s), body presses as long as the
longest body reader (blades, litter), ripples 3.2 s.

**What the grounds receive** (`S`, one texel at a time): `S.foot` seconds since a foot pressed here (1e9 = never), `S.fs`,
`S.body`, `S.px` / `S.py`, `S.wave`, and neighbours `S.footAt(dx, dy)`, `S.bodyAt(dx, dy)`, `S.waveAt(dx, dy)`; `S.x`, `S.y`
(world pixel), `S.t` (time, for animation), `S.dither(v)` (ordered-dither test at this pixel). A ground may set `S.glow = 1`
(this pixel ignores the dark at night) and `S.emit = k` (this pixel lights the ground round it).

## Writing a ground

A ground is a plain object. The kit's factories (`TK.sand(...)` …) return one; override any field, or write your own:

```js
const ash = {
  kind: 'ash', life: 30, rim: true, reads: ['foot'],                       // reads: for check and the docs
  base(x, y, n, e) { return TT.tone(TONES, n.fbm(x, y, 40, 3), x, y); },   // baked once; e.d = 1–4 px from another ground
  px(c, S) {                                                               // every frame where the texture is set
    if (S.foot < 30) return S.dither(1 - S.foot / 30) ? DARK : undefined;   // a print that fades out with dither
    if (S.footAt(0, -1) < 30) return LIGHT;                                 // the lit lip under it (needs rim: true)
  },
  step: { sound: 'soft', puff: { c: '#bbb', n: 4, v: 10, up: 12, life: .6 }, slow: .9 },
};
```

Fields: `base` (required) · `px` (optional; return a colour or nothing) · `always: true` (run `px` on every texel — water's
shimmer) · `rim: true` (also run `px` one texel above / below a print) · `blades` (tall blades: `density`, `h: [min, max]`,
`colors` dark → light, `spring` seconds to settle, `give` how far they bend, `wind`, `life`) · `litter` (loose bits:
`density`, `colors`, `push` px, `life`) · `stepLight` (`{ c, life, k }`: each step lights the ground at night) · `step`
(`sound`: crunch, swish, hiss, splash, squelch, crackle, soft, tap; `puff` or `splash` particles; `wake: true` rings; `sink`
px of leg hidden; `slow` speed factor; `line` the waterline colour) · `life` (seconds a print lasts here).

**What makes the readings different** (pick one per ground, or invent):
- *dent* — a print darker than the ground, a darker top wall and a bright lip below (light from the top-left); fills back by
  dithering away over `life` (snow, sand, ash, mud — mud adds a wet shine pixel and almost never fills).
- *bend* — blades lean away along the push, overshoot, spring back over `spring` seconds; the ground under them darkens a while.
- *ring* — the wave channel drawn as two pale bands; foam where the body is; the walker sinks to the waterline and slows.
- *push* — loose bits move along the push and stay moved until the memory runs out; bare ground shows through.
- *glow* — the print lights up and fades; at night it lights the ground round it (`stepLight`), so the path glows behind.
- *nothing* — hard ground (road, rock, boards) shows no trace; put one on the route so the others' memory reads.
- others worth trying: *melt* (ice that darkens where stood), *bloom* (flowers that close and reopen), *stain* (dye or paint
  that spreads and dries), *crack* (a crust that breaks in lines from each print), *flatten* (wheat that stays down).

## The walker

`F.walker({...})` — numbers and pixel maps; the engine moves it.

| field | default | meaning |
|---|---|---|
| `mass` | 1 | weight; acceleration and turn rate ÷ mass; gathering, crouch and recovery × √mass; springs slower |
| `speed`, `step`, `accel`, `turnRate` | 34, 8, 150, 170 | px/s; px a step moves the body; px/s²; °/s |
| `footW`, `hipW`, `hipH`, `reach` | 2, 2, 7, 10 | feet apart (px each side), hips apart, hip height, the longest a leg may reach (check) |
| `bodyR` | 6 | the body's ellipse on the ground (what parts the grass) |
| `art.down / up / right / left?` | — | rows of characters; `.` empty; letters → `palette`. `left` mirrors `right` unless given |
| `origin.down / up / right` | — | the art pixel that sits on the hip point |
| `legs` | `{ c, boot, w: 2, bootW: 3 }` | leg colour, boot colour, widths — legs are drawn hip → foot every frame |
| `arms` | `{ len, c, out, hand, down: [[x, y], [x, y]], up, right }` | shoulders (index 0 = the body's left arm), length; arms swing against the legs |
| `follow` | `[]` | followers: `{ art, anchor: {down, up, right} \| at: 'handR' \| 'handL', behind, lag, damp, flare, inertia, max, light }` |
| `blink` | — | `['e', 's']`: on a blink, eye colour `e` becomes `s` |
| `glow` | `''` | palette letters that ignore the dark (a lantern's glass) |

The simulation (120 Hz): **idle** (feet together; a settle step if they are not) → **turn** (two timed steps; the facing
changes as the first foot lifts) → **ant** (gather: crouch 1 px, lean back) → **walk** (velocity steers toward the command,
limited by accel and turn rate; one foot swings toward a target that follows the body, the other is locked; at each plant a
foot stamp, and the facing may change to the travel's dominant axis) → back to idle with a lean that overshoots. **Hops**:
hopAnt (crouch 2 px) → hopAir (a parabola; feet tucked) → hopLand (both feet plant, strength 2, a big wake) → recover.

## The route

`F.route([...])`, first step `{ at: [x, y], face, wait }` (the start, held still; the title shows over it). Then:
`{ to: [x, y], speed? }` (consecutive `to`s flow through, the last one stops), `{ wait: s, face? }` (stand; a face turns on
the spot first), `{ hop: [x, y] }` (stops, faces it, hops). Any step: `view: 'world' | 'split' | 'trail'` (kept until changed),
`caption: '…'` (one line, ≤ 50 characters).

## Night

`F.look({ night: 1, ambient: '#3a4a86', levels: 5 })`: everything is multiplied by the ambient colour plus the lights, banded
to `levels` steps with ordered dither. Lights: a follower's `light: { at, r, c, k, flicker }`, `TK.lamp`, `TK.shroom`,
`D.light(x, y, {...})`, and grounds' `stepLight` / `S.emit` (a quarter-resolution glow map, blurred). Pixels marked glow
(palette letters in `glow`, `S.glow`, the lamp's glass) stay bright.

## Reading a reference

Before designing, write down for each terrain in the reference: what it reads (feet? body? something that spreads?), what it
does with it (dent / bend / ring / …), how long it lasts, whether it slows or hides the character, and its sound. Then design
**other** grounds for your topic with the same variety — the reference's knight crossing snow, grass and a river becomes, say,
a courier over sand, reeds and a well, or a child over leaves, moss and a creek.

## API summary

`TT.create({ seed, title, sub, W, H, scale, fps })` → `F`. `F.look(o)`, `F.world({ w, h, materials, map, deco })`,
`F.walker(o)`, `F.route(list)`, `F.start()`. In `deco(D, n)`: `D.flat(P => …)` paints into the ground; `D.tall(x, y, draw, { solid })`
adds a y-sorted prop (`draw(P, sx, sy, t)`); `D.light(x, y, o)`; `D.matAt(x, y)`. Noise `n`: `n.fbm(x, y, cell, oct, gain, k)`,
`n.value(x, y, cell, k)`, `n.rnd(x, y, k)`, `n.wander(v, base, amp, cell, k)`. Colour: `TT.hex`, `TT.mix`, `TT.shade`,
`TT.tone(tones, v, x, y)` (ordered-dither pick), `TT.tones([...])`. Painter `P`: `px`, `rect`, `blend`, `dither`, `line`, `ell`,
`sprite(rows, pal, x, y, flip)`, `text` (3×5), `big` (5×5).
