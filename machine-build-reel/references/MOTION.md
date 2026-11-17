# MOTION — gait numbers, key-posed moves, motion quality

Read references/MOTION-QUALITY.md at the repo root first. A machine is a body too: weight sets timing, it gathers
before a big move and fights its momentum after, it breathes at rest, its planted feet never slide, loose parts
follow through.

## The walk (stateless: every pose is a function of t)
Each leg has a phase offset. A foot is planted (world-fixed) for `duty` of the cycle and swings for the rest; the
body travels at `v = stride / (duty · cycle)`, the speed that keeps planted feet still.

| key | meaning | heavy, tall (WADER) | squat, six legs (RIDGE HAULER) |
|---|---|---|---|
| `pattern` | `lateral` (four-beat: RL, FL, RR, FR) · `tripod` (alternating triangles) · `wave` · or `offsets` {leg: phase} | lateral | tripod |
| `cycle` s | one full cycle | 5.2 | 2.6 |
| `duty` | fraction planted (≥ 0.6 keeps 2+ feet down for 4 legs, 3+ for 6) | 0.68 | 0.6 |
| `stride` m | foot travel relative to the body while planted | 5.0 | 2.0 |
| `lift` m | foot height at the top of the swing (quick lift, peak at 40 %, slow set-down) | 1.7 | 0.85 |
| `crouch` m | body lower than rest while walking | 0.55 | 0.15 |
| `dip`, `dip_time` | how far and how slowly the body sinks into each landing (heavier = deeper, slower) | 0.32, 0.42 | 0.14, 0.22 |
| `sway`, `roll`, `yaw` | toward the side that carries it | 0.7 m, 2°, 0.8° | 0.12 m, 1.2°, 0.6° |
| `nod` | pitch while a front foot is in the air | 1.6° | 0.8° |
| `swing_gamma` | 3-seg legs: extra tarsus lean in swing (the heron's high heel) | 26° | — |
| `foot_pitch`, `toe_curl` | toe-down at lift / toe-up before landing; toes droop — both only once clear of the ground | 16°, 28° | 8°, 22° |
| `neck_rock`, `neck_sway` | the neck rocks with each step while the head stays level | 2.5°, 3° | 0, 1° |

Choosing numbers: start from the body's height H (m). A tall walker: cycle ≈ 1.1·√H s (4–6 s at 20–30 m);
stride ≈ 0.2 H; lift ≈ 0.07 H. A squat insect: cycle 2–3 s, stride ≈ leg reach / 2. Then look at the motion sheet
from both sides and adjust by eye; `check` keeps you honest (reach, slip, support, clash).

## The idle (a whole-number loop)
`breath` (body up / down, 3 times a loop), `shift` (weight side to side, twice), `scan` (head yaw, 1× and 5×), lights
pulse 6×. Every term repeats a whole number of times in `period`, so the loop closes exactly (`loops`).

## Moves are key poses
The method: (optionally) a video-model clip made from a render of the machine, *read* for timing — frame strips show
when it gathers, how long it travels, how far it overshoots — then written as key poses and interpolated:

```python
'kneel': {'dur': 10.0, 'main': 'body.dz', 'keys': {
    'body.dz':    [(0, -0.05), (0.8, 0.2), (3.6, -1.75), (6.6, -1.75), (8.5, 0.14), (9.3, -0.1), (10.0, -0.05)],
    #               rest       gather up   down (slow)   hold          past rest    settle      rest
    'head.yaw':   [(0, 0), (4.0, 0), (4.9, 28), (5.7, -24), (6.4, 0), (10.0, 0)],
}}
```
Channels: `body.dx dy dz roll pitch yaw` (m / deg, + pitch = nose down) · `neck.pitch neck.yaw` (+ = lower) ·
`head.pitch head.yaw head.roll` (head pitch held in the world) · `light` 0–1 (+ `flicker: (t0, t1)` for a stutter) ·
`curl.<limb>`, `gamma.<limb>`, `hand.<limb>` (x, y, z offset), `world.<limb>` + `worldw.<limb>` (reach a world point) ·
`extra.<name>` (a spin bone's angle). Feet stay planted. Segments ease in and out (smootherstep).

`move:<name>` check: on the `main` channel, the first motion must go the *other* way by ≥ 4 % of the excursion
(gather) and the return must pass the end value by ≥ 3 % (overshoot) before settling. Long, slow lowering, the
front leading; late, held hands; a head that leads the body when it looks.

## Follow-through
`lag` extras point where their parent was `lag` seconds ago (gain), with a soft limit (`max_deg`, tanh) so they bend
and never fold into the head; whiskers 0.2–0.3 s, whip antennas 0.15–0.2 s.

## Where motion references come from
- Code-only (default): key poses written from the brief, judged on the motion sheet.
- With the owner's yes: an image-to-video model given a render of the machine and a prompt for the movement
  ("like a heron wading, filmed in slow motion"); keep clips in `refs/motion/` (git-ignored), read frame strips
  (`ffmpeg -vf fps=4,tile=6x4`), write the timings into the keys, note model / prompt / take in BRIEF.md.
- Never track a clip frame by frame, never commit it.
