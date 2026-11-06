# The look

What makes a map-dive frame read as "a toy map of a real place", with the numbers that worked.

## The map (stage 1)
- **A slab, not a plane.** `island()` extrudes the outline 0.55 deep with a 0.1 rounded bevel: top = the painted map, a
  0.07 grass lip, then terracotta soil (`#e39a68 → #b8683f`) getting darker downward, a brown bottom. The sides are what
  make it a toy — keep them visible (elev 36–44°, never straight down on the map for long).
- **Sea**: a second slab 0.13 lower around the land, its top painted from the same texture (deep `#2f7fd2`, a blurred
  shallow band `#5cc0e4` along the coast, a thin foam line), its sides blue. An inland region has no sea slab: its soil
  sides show all round.
- **Size**: 11–13 units across; the opening camera at dist 13–16, fov 34, elev 38–42, yaw −10…+10 (from the south).
- **Ground colour**: one big gradient that says something true about the place (dry → wet, coast → summit), noise-warped,
  plus 1–2 noise patch layers (darker woods, dry grass). Evaluated per texel at 640 px and smoothly upscaled, so it is soft
  like the source; vector strokes go on at 4096 px.
- **Painted names**: lying on the map, dark grey with a white halo, weight 700, cap height ≈ 0.19 units for towns, 0.26–0.3
  for the two or three biggest (800). At 1080p from dist 14 that is ~20–30 px. They tilt with the map — that is the look.
- **Landmarks**: chunky Lambert primitives, oversized 5–50× (a 180 m crater is 0.6 units = 3.6 km). 4–8 of them; houses
  in small coloured clusters at each town; one or two kinds of life moving (plane, boats, turbines, animals).
- **Sky**: a screen-space gradient `#a9d8f2 → #eef6fb` with a pale-yellow sun glow at the top centre; 4–6 pink clouds
  (`#f7c9de`, emissive .35 so they stay pastel) at y 2–3.5 around the map, never covering the title or a landmark.

## Light
- Hemisphere .62 + sun .5 from the upper left (`sunDir [-.55, 1, .45]`). Tuned so **a sunlit flat surface shows its
  painted colour** (no tone mapping): paint the colour you want to see. Soft PCF shadows (2048 map fitted to the stage).
- Night: hemisphere .3 blue, moon .16, sky `#0a1230 → #1c2a5a`. Glow layers (roads, town lights) are emissive maps that
  fade in with the night value; windows come from a shader on the buildings (`windowMaterial`).

## Close-ups (stages 2…)
- Also a stylised map: painted ground (field patchwork with dark borders, beaches, cliffs coloured by slope, roads with a
  casing) + 3D canopies (instanced icosahedra, 4 greens) + buildings. Not photo-real, not flat.
- Scale 1 unit = 20–60 m; the detailed square 60–100 units; an **apron** ring around it out to 700–900 units painted
  with the continuation (land / sea / the far city) so no edge ever shows; **haze** = fog at [2.4, 7] × camera distance.
- Heights exaggerated ~1.5–2× (a 180 m cone is 4.3 units at 50 m/unit). Keep the square's edges near the apron's height.
- Pin label: white pill, 34–36 px text at 1080p, a stem and a dot on the landmark; pops in with a spring after the camera
  settles (≥ 1 s after the dive ends) and shrinks away 0.35 s before the shot leaves.
- City: grid rotated to the real street angle, blocks 2.2–2.6 × 1.6–1.9 units at 20 m/unit, streets .32–.42, avenues .55–.9;
  houses 1–3 floors with coloured roofs, mid-rise 3–8 along avenues, a few towers; parks, water and the landmark's
  plaza kept clear. At night: road glow .45–.8, lamps every 1.1 units, 55% of windows lit.

## Motion
- Dives: the map shot ends at dist ≈ 0.8–1 above the landmark, elev 55–62°; the close-up starts at the matching ground
  size (dist × its scale ≈ map dist × map scale), same yaw, and keeps zooming in. Crossfade 0.6 s with a zoom blur
  (auto, `blur: 0` to turn off). A rise is the same in reverse. A dissolve (no blur) for a change of time, e.g. to night.
- Distances interpolate in log space, so zooms feel even; keys are a monotone cubic (two equal keys hold still).
- Orbits are slow: 20–40° over a whole close-up.
- Title: 92 px, weight 800, near-black on the sky, fades in at 0.3 s and out before the first dive.
