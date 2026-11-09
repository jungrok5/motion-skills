# LOOK — what makes a frame read as this style

Measured from the reference clip (stills every 0.5 s, crops of the ink) and kept in the engine's defaults.

## Palette
| role | value | where |
|---|---|---|
| sky | `#d6d8da` → top `#c9ccce` | flat, faintly cool, darker toward the top |
| ground | `#f2f1ed` → near `#f7f6f2`, far `#dedcd8` | paper white; haze lies on the horizon |
| far shapes | black sprites at 22–32 % | pillars, blocks, trees, stones — blurred, never detailed |
| ink | `#09090b` body, `#2e2e33` inner tone | everything the fighter's power makes |
| cloth | `#1d1e23`, rim `#5a5c63` | the fighter is a shade lighter than the ink, so the figure separates from its own trail |
| skin | `#e9e0d5`, shadow `rgba(118,88,76,.24)` | only in close shots |
| white accents | `#f1eee8` | sash, cord, scarf — the shapes that read at any size |
| accent | `#e0142d` (one hue) | eyes, hairlines in the ink, the blade edge, threads, the cut, the burst frame |

## The fighter
- A black silhouette first: long ragged coat tails, a high collar, hair in falling locks with a fringe over the eyes,
  one or two white shapes (sash tails, a cord). Seen small it must still read: head, weapon, tails, white.
- Cel close-ups: pale face, a fine jaw contour, the fringe's cast shadow on the face, thin sharp eyes; the accent
  appears in the iris only when the power wakes (`glow`), with a soft halo.
- Rim light: a thin grey line on the lit edges of limbs, coat and hair (key light from the upper left).
- The weapon is dark steel with a pale edge line; `edge` runs an accent hairline from guard to tip — never a beam.

## Ink
- Wet brushwork, not shapes: a dense body (55 % of the width), edges that break into tapered streaks along the
  motion with flying-white gaps, splatter beside it, hair-thin tails past the end. Laid down through a layer with a
  1 px wet blur.
- The ink shadow (墨影) follows the body's own past path: streaky strokes for chest, pelvis, hem and head, a few torn
  blots, the old end breaking into small pieces; fine red hairlines run inside, broken and fading along their length.
- Slashes are crescents along the blade's path (or an arc placed where it went), wide in the middle, sharp at both ends.
- A landing is an ink drop on paper: a splash with spikes and streaks, a broken ring spreading on the ground, cracks.

## Impact grammar
| hit | frame | hold |
|---|---|---|
| light (a slash lands) | 0.05 s `invert` (hard black-and-white negative) | 0.06–0.08 s hit-stop |
| heavy (a landing, the first burst) | 0.1 s `black` (a line drawing on black) | 0.1 s |
| the burst | 0.08 s `burst` (accent field, black spikes) right after the black frame | — |
| the ultimate | `invert` 0.05 → `white` 0.08 → the red hairline across the world (drawn over both) | 0.1 s |
Camera shake comes from a hit (decaying, with a slight roll and an optional FOV punch) — never constant.

## The domain
- Watchers of ONE motif, in every depth: a giant first, then a few, then a wall of hundreds (fish-scale rows, curving
  toward the viewer at the sides) and a swarm from dust-size to celestial. All turn toward the fighter.
- Wall and swarm watchers are muted (sprites, depth fog, accent nearly gone); only giants carry detail and accent.
  Moons open to their own phases, so the wall reads as crescents and gibbous moons, not plates.
- Threads: accent hairlines between neighbours and toward the fighter. Cracks: glass cracks, white and black,
  accent-glowing only on the giants. Then they fall away; the last giant closes (an eclipse for moons).

## Space and camera
- One fighter, one weapon, an empty white world. Far shapes keep their distance; ground marks give speed.
- Cameras always have a reason: a low tracking side shot for a dash, a wide 70° lens for a charge at the lens, a high
  top shot for a spin ring, a fast half-orbit while the fighter hangs, over-the-shoulder up at the sky for the omen,
  a slow orbit into a close-up for the stillness, a long pull-back that makes the fighter tiny for the domain.

## Rhythm
Dense action (cuts every 0.8–2 s, sound on every move) → stillness (one long slow shot) → growth (the domain) →
compression (collapse to a black void with a white outline) → the single biggest moment → white silence.
