# MACHINES — designing a kind, laying its way, reading the checks

A machine here is three things: **numbers** (`LR.mech.define`), **parts** (`build(k)`), and **a way or a post**
(`LR.mech.route`, `LR.mech.spawn`). The numbers are proved in Node by `gym.mjs` before a part is written.

Spaces: the world is x east, y up, z south, metres. A body, a foot and a head: x forward, y up, z right (left limbs
have negative z). A limb's segment, a neck link, a toe, a cylinder: X the hinge pin, Y along the part, Z = X × Y.

## Numbers — `LR.mech.define(kind, { … })`
| key | what |
|---|---|
| `title`, `tonnes` | its name on the cast sheet · its mass: sound, ground shake and how hard the body may be moved follow from it |
| `ride` | height of the body's origin (the hip girder) over the ground at rest. Set it so the legs stand at 80–88 % of their reach: straighter and a slope runs them out, more folded and the joints swing wider than a cylinder follows |
| `belly: [x, y, z]` | half-sizes of the box under the body that must clear the land |
| `limbs: [{ … }]` | one entry a leg; write the left ones (`at[2] < 0`) and add `LR.mech.mirror` of each |
| · `kind` | `'mammal'`: the leg's plane holds the body's fore-aft axis and swings out about it; 2 or 3 segments · `'insect'`: a `coxa` sticks out and yaws, the plane is upright; 2 segments |
| · `at`, `home` | where the hip bolts to the body · where the foot stands at rest `[x, z]` in the body's frame |
| · `segs`, `knee` | segment lengths · `+1` the middle joint goes forward (mammal) / up-and-out (insect), `−1` back |
| · `gamma`, `ankleMin`, `ankleFollow` | 3 segments: the tarsus's lean at rest (°) · the least bend its ankle keeps (20°) · how much of a fold the tarsus goes with (0.6): the ankle's own hinge then works over a range a cylinder can follow |
| · `width`, `drum`, `bar` | the segment's width, the joint drum's diameter, a cylinder's barrel radius (default 0.32 × width; give it for big legs) |
| · `ball`, `toes`, `toeLen` | the foot's ball radius (the ankle's height over the sole), toe count or spread angles, toe length |
| · `act`, `hipDrop`, `coxa`, `style` | which joints are powered · the yoke under a mammal hip · the insect's arm · `'shell'` (pale covers on a dark spar) or `'girder'` |
| `neck: { at, links: [[length, elevation°]…] }`, `head: { len }` | a chain of links and a head that keeps level like a sensor on a gimbal |
| `extras` | bones of your own: `fixed`, `spin` (`rate` °/s about `axis`), `lag` (trails `lag` seconds behind its parent, bends up to `maxDeg`) |
| `gait` | below |
| `idle: { period, breath, shift, scan }` | what moves while it stands: the body's rise (m), its sideways shift (m), the head's sweep (°) |
| `moves: { name: { dur, main, sound: [t, Hz, seconds, gain], keys: { channel: [[t, v]…] } } }` | key poses. Channels: `body.dx dy dz roll pitch yaw` · `neck.pitch neck.yaw` · `head.pitch yaw roll` · `light` · `extra.<name>`. `main` is the channel the checks read: it must first go **against** its direction (≥ 4 %: the gather) and pass rest on the way back (≥ 3 %: the overshoot) |
| `aware`, `lensGain`, `palette`, `build(k)` | how near someone must come for the head to turn (m; 0 never) · how bright the lenses glow · role → `[material, '#tint']` · the parts |

### The gait, from the mass
Heavier means a longer cycle, more of it on the ground, a lower lift, a slower sink into each step.
| tonnes | cycle s | duty | stride ÷ leg length | `dipTime` s | `smooth` (cycles) | example |
|---|---|---|---|---|---|---|
| 10–20 | 4–5 | 0.75–0.8 | 0.4 | 0.6–0.8 | 0.5–0.6 | the starter's warden |
| 30–50 | 3.5–4.5 (six legs: 0.6–0.65 duty) | 0.6–0.8 | 0.35–0.4 | 0.6 | 0.4 | the carrier |
| 80–150 | 6–8 | 0.78–0.82 | 0.35–0.45 | 0.9–1.2 | 0.6–0.8 | the crane |
| thousands | 14–18 | 0.68–0.72 (eight legs) | 0.4 | 1.6–2 | 0.5 | the relic |

`duty` over 0.75 on four legs (0.5 on six, in two groups) leaves a moment when every foot is down: that is where a
machine can stand still, so a kind that halts needs it. Other keys: `lift`, `pattern` (`lateral` four-beat, `tripod`,
`wave`) or `offsets` by limb name, `crouch`, `dip` and `dipTime` (the sink into a landing), `sway`, `roll`, `nod`,
`yaw`, `swingGamma`, `footPitch`, `toeCurl`, `neckRock`, `neckSway`, `follow: [pitch, roll]` (how much of the land's
tilt the body takes: a long neck or a load wants less), `smooth` (how long a window the body eases the ground
through), `footTilt` (how far a sole turns on its ball), `maxSlope`, `adjust` (how far a footfall may be moved to
better ground), `wade`, `clear`, `steepSlow`, `reachMax`, `settle` / `settleTime` (the run-on when it stops),
`gather` / `gatherDip` / `gatherBack` (before it leaves), `ease` (seconds to stop or start), `print` (footprint depth).

## What the walk does with the land
1. **A way** is a closed curve through your points. The number of cycles in a lap is whatever its length gives at the
   kind's stride — fewer where it is steep (a grade shortens the step to as little as 55 %).
2. **Footfalls**: step k of a leg is where its home is when the body is at the middle of that stance. Each is moved
   (within `adjust`) off a face steeper than the sole turns, off anything solid, out of water deeper than `wade`.
   The sole takes the ground's tilt (up to `footTilt`); each toe droops until its tip meets the ground under it.
3. **A swing** runs between two footfalls: late off, fast across, slow down; lifted `lift`, and higher where the
   ground between asks.
4. **The body**: its height is `ride` over the mean of its feet — but never so high that the lowest foot's leg runs
   out nor so low that the highest folds (a soft limit, each hip counted where the tilted body has it); its pitch and
   roll are the land's under it times `follow`; all three eased through a raised-cosine window `smooth` cycles wide.
   Then the gait's own motion: the sink into each landing, sway toward the side that carries, a nod while a front
   foot is in the air.
5. **Standing**: `halts: [{ at: share of the lap, hold: seconds, move }]`. It eases to a stop at the nearest moment
   with every foot down, runs on a little and comes back (`settle`), breathes (`idle`), plays its move, gathers
   (`gather…`) and leaves. `{ post: [x, z], yaw, moves }` is a unit that only stands.
6. **`LR.mech.plan()`** then presses the ways into the land — across a way the ground is brought most of the way to
   level (far enough out for the feet), no stretch steeper than `grade` (cut and fill), a long skirt, the way's own
   bumps put back (`rough`), every footfall a shallow hollow with a rim — plans the footfalls again on that ground,
   and **fits the cylinders**: for each powered hinge it takes the range seen in everything every unit of the kind
   does and searches the anchor pair with the most leverage that keeps a fifth of the rod in the barrel.
   Route options: `width` (the corridor: its middle 90 % is eased, trees keep off it), `grade` (0.2), `ease` (0.8),
   `rough`, `worn`.

## Parts — `build(k)`
`k.limbs({ style })` builds every leg from the numbers: hip bearing and yoke (or turret and arm), a drum, a spar with
covers or flanges and a hose, a fork with a pin and bolted caps, the cup, the ball, the hub, toes on pins, and across
each powered hinge a lug on either part, a barrel with glands and a chrome rod. Then write what makes this machine:
```js
k.bone('body', (g) => {                      // g is an LR.Geo in the body's frame: x forward, y up, z right
  k.mat('frame'); k.loft('x', [[-3, 0.5, 0.8, 0, 0, 5], [0, 0.8, 1.0, 0, 0, 5], [3, 0.5, 0.8, 0, 0, 4]], { sides: 14 });
  k.mat('rust'); g.box(0, 1.2, 0, 4, 0.2, 2.2, { soft: 0.1 }); if (k.fine) k.bolts('y', [0, 1.3, 0], 0.8, 8, 0.03);
});
k.lamp('head', { at: [1.2, -0.3, 0], dir: [0.97, -0.24, 0], color: [0.72, 0.9, 1], power: 90, cone: 8, range: 170, lens: 0.36 });
```
- `k.loft(axis, [[t, a, b, ca, cb, power]…], { sides, from, to, caps })`: a skin through cross-sections along an
  axis — half-sizes `a`, `b` in the other two axes (`'x'`: y, z · `'y'`: z, x · `'z'`: x, y), centre offsets, how
  square (2 round … 6 a box); `from` / `to` open it into a shell.
- Roles for `k.mat`: `shell frame joint steel rod rubber rust dark` (the palette maps them to materials and tints);
  any material name works too. Moss, grime, rain and snow come from the engine, laid in the machine's own space.
- `k.n(sides)` thins a count on the far builds; wrap small things in `if (k.fine)` (near only) or `if (k.mid)`.
- A lamp with a `cone` throws a beam; without one it is a glowing lens with a halo. The passes carry the 12 lamps
  that matter most each frame — keep beams to one or two a machine.
- Budget: ≤ ~50 k triangles on the near build, ≤ 192 bones (a four-legged kind with cylinders uses about 66).
- `LR.mech.wreck(kind, { x, z, yaw, pose(cmd, q), moss })` builds a kind once into the world in a pose you write (the
  body on the ground, legs folded), its lenses dead and its tints gone to lichen.

## The checks (`gym.mjs`, and again in `check.mjs`) — what each number means
| rule | limit | when it fails |
|---|---|---|
| reach | no leg asked for more than it has (clamp ≤ 2 mm) | the way is too broken or the ride too high: move the way, lower `ride`, shorten `stride` |
| last-resort corrections | ≤ 2 % of the lap | the same — the body had to be snapped down to its feet |
| planted feet | slip ≤ 4 mm, sole within 30 mm of the ground, within 0.5° of the tilt it was planned at | a leg clamped, or the land changed after `plan()` |
| footing | no footfall on ground more than 4° steeper than `footTilt` | widen `adjust`, raise `footTilt`, or move the way |
| bends | no joint on the wrong side; none folded past 165° | a stride too long for the leg, a lift too high; for a tarsus see `ankleMin` |
| knees | every knee and ankle ≥ 5 cm above the land | an insect leg on a side slope: more `ride`, a longer femur |
| swing | the foot clears the ground between footfalls | raise `lift` or `clear` |
| support | ≥ 2 feet down on four legs, ≥ 3 on six or more | `duty` too low for the pattern |
| cylinders | ≥ 15 % of every rod in its barrel, through everything | the hinge swings too wide: more `ankleFollow`, less `lift`, a taller `ride`; or give `bar` |
| belly | ≥ 0.5 m over the land | a mound under the body |
| weight | the body's acceleration over 0.3 s ≤ 1.6 m/s² over 80 t (to 2.8 for light ones) | lengthen `dipTime`, `settleTime`, `smooth`, the cycle; lower `dip`; less `rough` on the way |
| idle | the body moves ≥ 20 mm while it stands; no foot moves | give it `idle`, and a halt or a post to stand at |
| move | gather ≥ 4 %, overshoot ≥ 3 % of the main channel | add the key before and the key after |
| loop, determinism | one lap later the same pose (≤ 20 mm); the same instant twice the same pose | something reads a clock or a random number at run time |
| apart (check.mjs) | no two machines closer than their legs reach | space `offset`s on a shared way, part the ways |
| the way (check.mjs) | nothing solid on it | `LR.mech.wayDist(x, z)` in every `avoid`; move the ruin |

`gym.mjs --course` walks each kind alone over an oval whose straight carries a 14° ramp, a level top, a 1.2 m drop,
a 12° side slope, a ditch, a mound and a ramp down: a kind that passes there copes with land in general; the realm's
own ways are then a matter of where they are laid. `--sheet` draws what the numbers say — left legs solid, right legs
dashed, planted blue, swinging red, cylinders orange, on the land's real profile.
