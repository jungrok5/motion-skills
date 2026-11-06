# Look: what was measured on the reference and the values used

Source: two 8 s clips (1920×1080, 60 fps, with sound) posted by @lemomo_ai at
https://x.com/lemomo_ai/status/2118516216180740585 — "a short video made with a visual-difference (parallax) trick",
after a design by @garments__. One is a pastel seaside shopping street with a palm and an elevated road; the other a
white-walled water town with a pagoda, a canal and an arched bridge. Neither clip is included or traced: only the
grammar below was taken.

## Measured

| what | reference | here |
|---|---|---|
| length | 8.0 s loop, first frame = last frame | `beats` of 1 s × 8 |
| moves | one per second, ~0.3–0.45 s each, heavy motion blur; holds ~0.55 s | `move: 0.42`, adaptive blur up to 24 sub-frames |
| move kinds | dolly zoom flat ↔ deep, crane to a high 3/4, orbit left/right, back to flat | `VIEWS` |
| flat frame | an elevation: no vanishing lines, the far landmark lined up over the roofline, the gap plugged | `flat` fov 6°, `eye` at the roofline, a plug |
| sky | solid cobalt `#0736e6` (pastel clip), `#2d48c9` (outlined clip) | `soft.sky #1238e6`, `ink.sky #2c45cc` |
| shading | two tones per surface: lit ≈ albedo, shade lavender-blue (pastel `#9fafe0` on white walls) | toon 2 steps, ambient = `shade`, sun = 1 − shade |
| shadows | hard-ish cast shadows of trees and buildings on the facades | PCF soft shadow map, 4096², tight frustum on the near town |
| outlines | none (pastel clip) / dark navy, ~2 px at 1080 on every object incl. windows (outlined clip) | `soft` / `ink` (inverted hull, px-constant) |
| distance | far rows paler (pastel), crisp (outlined) | haze by depth `z`, not by camera distance (the dolly zoom moves the camera 10×) |
| clouds | flat white cartoon puffs with outlines | `cloud()` squashed balls far behind |
| sound | a soft beat, a broadband whoosh at every move (~0.25 s), ~−19 dB mean | `score.mjs`: pad / EP / bass / drums, whoosh + tick per move, RMS −18 dBFS |

## Finishes (`lib/facade.js` `LOOKS`)

| | soft | ink |
|---|---|---|
| sky | `#1238e6` | `#2c45cc` |
| shade (ambient) | `#a6a8e6` | `#b4b4dc` |
| haze | `#e9e6f6`, 30 → 170 m, max 0.55 | `#eceaf4`, 60 → 220 m, max 0.35 |
| ink | — | `#2a2840`, 1.6 px at 1080 (the example uses 2.2) |
| road / ground | `#8d8fb8` / `#d9d6e6` | `#a9aabd` / `#d6d6e0` |

Override per film: `new Film({ finish: "ink", look: { sky: "#…", shade: "#…", ink: { color, px }, haze: { … } } })`.

## Colour rules

- Walls light (L* 88–97): the lavender shade only reads on light surfaces.
- One saturated accent per film (awnings, lanterns, persimmons, a postbox); glass one mid blue.
- Roofs: one colour per film; dark tiles need `ink` or an eave band (`roof.under`) to separate overlapping roofs.
- Night or dusk: lower `sun`, a darker `sky`, windows and lanterns with `glow: true` (unlit) — keep the two-tone shading.
