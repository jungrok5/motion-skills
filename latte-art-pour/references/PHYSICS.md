# The surface — how the milk draws

`lib/latte.js` is a 2D surface model, not a full fluid solver: it is fast enough to step at 60 Hz on a 320² grid in a
browser tab, deterministic (no random numbers), and it reproduces what a barista sees from above. Read this before
changing a constant; change the score first.

## Fields
- `foam` 0 … 1 per cell: microfoam on the surface. Drawn white above ~.5 with a soft edge (`film.js` → `drawLiquid`).
- `tone` 0 … 1: the crema's marbling (dark ↔ light brown); seeded fbm at the start, lightened where a high pour mixes milk in.
Both are carried by the velocity with MacCormack advection (forward + backward trace, error corrected, clamped to the
neighbours) so foam edges stay sharp over hundreds of steps. Substeps keep any cell from moving more than ~1.5 cells.

## Velocity, written in closed form each step (no pressure solve)
| term | formula | why |
|---|---|---|
| source | `S·d/(|d|²+ε²)·(1 + forward·cosθ)` | milk landing spreads out; the stream's momentum sends most of it forward (θ from `dir`) |
| jet | `J·dir·exp(−|d − dir·off|²/r²)` | the surface just ahead is carried along the pour |
| drag | `D·v_spout·exp(−|d|²/r²)` | a moving stream (low) or a fast thin cut (high) pulls the surface with it |
| pin | `etch·v_pin·exp(−|d|²/r²)` | the etching pin |
| wall | outward component removed near r = 1 | foam slides along the rim and piles into thin bands |
`S` is strong when low (foam rides up and pushes) and weak when high (milk dives under).

## What the stream brings up — the one idea that makes leaves
At the spout the surface takes the colour of what the stream brings up: **foam when it lingers low, brown when it moves
fast or is high** (`lingerV` .8 → `rushV` 1.8 units/s). A wiggle lingers at each end and rushes through the middle, so it
lays alternating foam lobes with thin brown lines between them; the source pushes them out into nested arcs — a rosetta.
A full high burst (`punch`, ∝ flow²) makes a wide brown hole: the gap between tulip stacks. A gentle high `cut` stays
thin (∝ flow², q .35) so the stem is a line, not a canal.

## Constants (`PHYS` in latte.js)
`source .07 · highSource .012 · eps .03 · forward .95 · jet 1.0 · jetOff .045 · jetR .06 · drag .95 · dragR .045 ·
cutDrag 1.3 · cutR .05 · etch 1.0 · etchR .016 · wall0 .8 · deposit .03 · depositQ .03 · lingerV .8 · rushV 1.8 ·
cutBrown 1 · punch .14 · emitRate 60 · mix .35`. Tuned against the source clips (see `SOURCE.md`) and the three
proven figures; a film may override a few through `sim: { phys: { … } }`, but `check.mjs` still judges the result.
