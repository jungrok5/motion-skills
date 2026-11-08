# The look: passes, lines, two tones, hatching, sky

## Three scene passes and one post pass
1. **Flat colour** (`MeshBasicMaterial`: colour or texture, no light) → the albedo, also used for colour lines.
2. **Normals + depth + ink level** (view-space normal in rgb, the material's ink level in alpha; a float depth texture).
3. **Sun mask** (white Lambert, the sun only, shadows on). three divides Lambert by π, so the sun's intensity is 2π:
   lit = 2 × (sun · normal) × shadow, and a face turns to shade below `shadeAt` (0.5 ≈ 75° from the sun).
4. **Post**: colour × (lit ? 1 : `shade`) · hatching in cast shadows · ink lines · the sky where depth is empty ·
   a light vignette, written in sRGB and averaged over the sub-frames.

## Ink lines
- **Silhouettes** against the sky.
- **Depth steps**: the second difference of 1/z across ±r pixels in four directions. 1/z is linear across any plane on
  screen, so a road seen almost edge-on from knee height is never inked by mistake, while a 0.8 m step 600 m out still is.
- **Creases**: normals that differ by more than ~45°. Faces seen nearly edge-on (|n.z| < 0.2) do not count: they are often
  thinner than a pixel and their lines would blink.
- **Colour boundaries** (window frames, trim, stripes, markings), only where every sample has ink level 1. On the ground
  (world normal up) they are drawn lighter (`groundLine`). They fade where one pixel covers more than ~2–6 cm, before far
  textures turn to noise.
- Line half-width `line` px at 1080, heavier up close (×1.3 within 4 m).
- Ink levels per material: `ink: 1` everything · `ink: 0.5` outline only — no colour lines inside (text, screens, busy
  textures, painted tiles: they draw their own joints) · `ink: 0` hidden from the line pass (rain, light cones).
- `glow: true` faces (screens, lamps, lit signs) are never shaded.

## Two tones, hatching
- No gradients: lit or shade, with a clear cool step (`shade`, ≈ 75 % luminance, a little blue).
- Hatching only in **cast shadows** — faces turned to the sun but dark — never on the turned-away side, which stays plain
  two-tone. Strokes are anchored to the world in the plane of the surface (`hatchPitch` per metre), so they move with the
  surface and never crawl; they fade out where they would get finer than ~4 px.

## Sky
Painted from the view direction, not the screen position: zenith → horizon (and a `low` band under the horizon, seen
where the ground ends), soft fbm clouds in azimuth / elevation space. Clouds stay put while the camera swings and zooms.
Through the flat lens the sky is a few degrees: one colour, a cloud edge at most. Keep cloud edges soft.

## Palette and light
- 6–10 flat colours + one accent (a yellow sign, safety yellow, a red sky). To match a reference, pull its colours from
  frames (k-means), but never copy its artwork.
- One low, hard sun placed so the main subjects stay lit and throw long shadows across the ground. A sun from the tall side
  buries the scene in one big shadow. Use `shadowReach` / `shadowCenter` to put the 4096² shadow map where the camera looks.

## Night and extras (not in the template; add per topic)
- Night: blue moon, `glow` windows (a texture with only the lit panes), point-light-free (the mask is sun only — fake lamp
  pools as `glow` decals), a lower `shade`, a dark `sky`. Wet ground reflections need an extra pass: keep them out of the
  flat view if you skip it.
- Rain: thin `ink: 0` streaks, a whole number of volume heights per loop, `F.keep()` them out of the merge.
- Crowds: a cast of archetypes, not random variation; shape-built people read as figurines. If people appear, follow the
  repo's body check (CONTRIBUTING.md: a cast sheet turned both ways and a joint-limit check).
- Screens: slide between two pictures a whole number of times per loop; tickers crawl whole texture widths.
