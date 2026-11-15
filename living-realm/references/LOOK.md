# LOOK — what makes the picture, and where it stops

## The ingredients (keep all of them; a realm that drops one stops looking like this)
1. **A computed sky.** Sun and moon positions from the hour, the season and a latitude; Rayleigh + Mie + ozone single
   scattering into a sky-view table; clouds as a lit noise shell that throws the same shadow on the land that you see
   overhead; stars that turn. Never a gradient, never a painted dome.
2. **One light, honestly shadowed.** The sun (or the moon) with cascaded soft shadows; its colour is what the
   atmosphere lets through at that elevation. Shade is lit by the sky's colour and by what the land throws back, through
   ambient occlusion — so shade is blue by day and never black.
3. **Air.** Height fog marched through the shadow cascades: shafts between trunks and roofs, a glow toward the sun,
   distance that fades into the colour of the sky behind it. Mist at dawn and dusk, thick air in rain and snow.
   Woods hold damp air of their own and see less sky (a map of crown cover), so a wood is dim, hazy and shot with light.
4. **Materials with relief.** Every surface is a baked function: height, colour, roughness → normal and cavity. Stone
   has stones, plaster has trowel marks and cracks, timber has grain and checks, roofs have courses. Tints change the
   colour of a wall, never its nature.
5. **Wear.** Moss where it is damp (north faces, tops, creases, the foot of walls), darker at the ground, nothing
   exactly straight (ridge sag, leaning posts, shutters a little askew).
6. **Depth at the openings.** Windows and doors are real recesses with frames; eaves have rafters and a shaded soffit;
   upper floors jetty out on joist ends. Flat fronts are what make a town look like a model.
7. **Ground that breaks up.** Paving → dirt → turf by height-blended masks; grass blades over it in the same colour
   law; flowers in drifts; nothing tiled to the horizon.
8. **Weather as a state of surfaces.** Rain darkens porous things and makes hard things shine, fills the low places
   of paved and earth ground with ringed puddles — but only where the sky is open above (a top-down map of roofs).
   Snow lies on what faces up and is open; walls under eaves stay bare. Trees turn, drop their leaves, keep twigs.
9. **A filmic frame.** Temporal anti-aliasing, bloom from real brightness, an eye that adapts, an ACES curve, a
   grade that follows the hour (warm at dusk, blue at night, quieter in rain), cool shade against warm light.
10. **Life.** Smoke, flags, a turning mill, lit windows that differ from each other, fireflies, birds, falling leaves.

## The views that show it best
Into the light: a meadow toward a low sun, a wood with the sun behind the trunks, a lane with long shadows across it.
Front-lit noon is the flattest hour of any engine; open the page late in the afternoon.

## Where it stops (say so when showing it)
- It is a stylised-realistic game look built from generated geometry — not scanned assets, not Lumen/Nanite. Up close,
  walls are flat planes with good normal maps; there is no displacement and no global illumination beyond sky, one
  bounce colour and screen-space occlusion. Foliage is painted sprays on cards: right at a distance, brushy at arm's length.
- Water mirrors what is on the screen above it (a ray marched through the depth buffer: trees on the far bank, a
  bridge, a pier) and the sky elsewhere; what is off-screen or hidden behind something is not mirrored, and puddles
  on the ground mirror the sky and the lamps' highlights only.
- Lamps do not cast shadows; interiors do not exist (windows are lit glass).
- No characters. A walker's body, villagers or animals would need a rig, clips and the body checks in CONTRIBUTING.md.
