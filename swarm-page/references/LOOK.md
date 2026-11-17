# LOOK — the source demo, observed

Felix Rieseberg's "Swarm" (https://claude.ai/artifact/NfKoLhxvZ9AcX32i9CBvHU), one of the fifteen demos on
https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk. Read as reference only (it has no licence; nothing was copied). Seen in
headless Chromium with the HTML-in-Canvas flag, at reduced grain counts, plus its 512×320 thumbnail.

## Form
- One full-bleed page: a bird-count field-notes page at dusk ("Evening count"): an uppercase kicker, a huge condensed
  headline, an italic note, a "Fly this page" button with a "Click any text and type" hint, and a sortable table of
  roosts (name, bird count, lift-off time). No boxes: black type stands straight on a dusk sky.
- Below: a lake with a still-water reflection, reed beds and a far shore as dark silhouettes (SVG inside the page), a
  moon at night.
- The page's background is transparent; the sky (gradient, sun glow, banded clouds, cirrus, a moon, stars at night) is
  painted by a shader once per size.

## Behaviour
- **The opening:** the page stands for a moment, then only the headline is torn off into a small flock and returns.
- **Fly:** the button starts a wave of lift-off spreading from the button; the page's own pixels (about a million grains,
  one per cell) rise as dark birds, leaving the page empty except a "Keep typing · Land" control that never flies. Each
  flight turns the light: dusk → night (birds turn pale, the moon and stars come out, the ink of the page turns pale too),
  the next flight back to dusk.
- **The flock:** a long, thin, twisting ribbon that wanders the sky — face-on a veil, edge-on a dark band — with a wave
  rippling along it. (The text on the page says each bird watches seven neighbours; the demo itself drives the ribbon with
  a scripted path, it does not simulate neighbours.) The pointer pushes birds away; a click in the sky strikes them apart.
- **Typing in flight:** the typed element's grains come back and are written large across the sky, then scatter.
- **Land / Escape:** the birds come home top to bottom, arcing in from the front, and the page is whole again.
- **At rest:** typed characters' grains are thrown off and fall back; sorting the table makes each row's grains start
  where the row was and fly to its new place.
- Fallback: a full-screen "how to see it" card with a recording, for browsers without the feature.

## Technique
- WebGL2. The page is uploaded (`texElementImage2D` / `texElementSubImage2D`) only on paint. Grain state (offset from home,
  velocity) in float textures, one fragment pass per step; grains drawn as point sprites with a motion streak, accumulated
  additively into a half-float buffer and composited with a coverage curve (`1 - exp(-k·a)`), over the sky, page and a
  rippled water mirror.
- Hit testing: the page never moves, so it is placed once.
- Adaptive quality (render scale and point stride by frame time).

## What this skill keeps and changes
Kept: the page's pixels are the flock; held controls; recall-by-typing; sorted rows fly; light turning per flight; a scene
that never flies; water reflection option. Changed / new: a real topological flock (7 neighbours, delay, salience) under
the grains; creature sprites with a wingbeat and banking instead of streak dots; gathering anticipation and a settle dip;
click-to-recall; idle hops; a config for any topic (creature, formation, sky, scene, trigger, sound).
