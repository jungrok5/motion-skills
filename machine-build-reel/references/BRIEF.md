# BRIEF — topic → machine (write this before any code)

Copy the template into the project's `BRIEF.md` (`machine.py new` does) and fill every line for *this* topic. The
starter and the example are styles, not menus: a tree-planting strider is not WADER with a different colour.

## Template

```markdown
# <TITLE> — brief

**One line:** <what it is, what it does, where>.
**Why it walks:** <the ground no wheel can cross / the job that needs legs>.

## Scale and load
- Height <m>, body length <m>, weight class (<t>, light / heavy / colossal) — <real things of that size: a crane, a
  ship's bridge, a 4-storey house>.
- What carries the weight: <guyed mast legs / box-girder legs / truss / ...> and why that reads as believable.
- What proves the size in frame: the 1.75 m figure at <where>; human-scale details (<ladders, cab windows, hatches>).

## Body plan
- Legs: <count> × <mammal 3-seg | insect 2-seg | ...>, knee direction front / rear, segment lengths, width.
- Powered joints: <hip, knee, ankle> (hydraulic), unpowered: <...>.
- Feet: ball socket + <n> toes / pads. Arms? Neck (<links>), head (<what it senses>), extras (<whiskers, radar, ...>).
- Cargo / body: <what sits on it, what it is made of>.

## Finish
- Style: <ceramic | industrial | own>; palette roles → colours (shell, frame, metal, joint, steel, accent, cargo, light).
- Lights: <colour, where; when they come on>.

## Motion (weight sets timing)
- Gait: <pattern>, cycle <s>, duty <0.6–0.7>, stride <m>, lift <m>; character in words (<heron, slow set-down /
  insect, quick and low>).
- Idle: breath <m>, weight shift <m>, head scan <deg>; period <s>.
- Big move "<name>": pose by pose — gather (<what>), act (<what>), hold, recover (<overshoot>), settle. The main
  channel (`main`).
- Wake: head <droop → lift>, lights <flicker window>, look <L / R>.
- Loose parts that follow through: <whiskers, antennas, hoses>.

## Plates (one per mechanism)
<hip, knee, ankle / foot, head, neck base, cargo lock, ...> — and the angle each is seen from.

## Reel notes
Figure at <x, y>; walk camera <yaw>; move <name>, camera <yaw>; anything section-specific.

## Review log
| pass | what was off (number) | fix | after |
|---|---|---|---|

## What differs from the references (or drawings)
| plate | difference | fixed / accepted (why) |
|---|---|---|
```

## Rubric — score the sheets and reel stills (0 / 1 / 2 each; anything at 0 is fixed before the reel)
1. **Reads as one machine at its size.** The figure makes the scale obvious; no part looks toy-sized (bolts, pins,
   cables sized for the scale).
2. **Every joint is a mechanism up close.** Fork, drum, pin, caps, an actuator with lugs — not a ball in a tube.
3. **The load path is visible.** You can point at what holds the body up (beam, mast, girder) and where it bolts on.
4. **Front / back / left / right agree.** Both sides of the turnaround match; nothing is mirrored wrong (actuators
   alternate sides as designed, lights on both sides).
5. **Weight in the walk.** The body sinks into each landing and sways over the planted side; slow set-down; no float.
6. **Feet planted.** No foot slides or sinks; toes clear the ground in swing.
7. **Gather and land.** Each big move gathers first and overshoots on the way back; nothing stops dead.
8. **Alive at rest.** The idle breathes; the head looks around; lights pulse.
9. **Follow-through.** Whiskers / antennas trail the head; they bend, they do not fold.
10. **One style.** Topic-specific parts use the same mechanisms, palette roles and studio as the rest.
11. **The reel reads.** Each section's still shows what that section is for (scale, build order, the joints, the move,
    the face, the drawings beside the build).
12. **Honest comparison.** Pairs are labelled "reference" only when a reference exists; otherwise "drawing".
