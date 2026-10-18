# 흐름과 관계를 빛으로 — craft notes (first samples: skill-journey-glow, boss-lag-glow)

The look of the first sample was copied from a reference and is not the rule; take the look from the topic (see STYLES.md). The samples named here are in the worked example repo, github.com/jungrok5/motion-graphics.
Techniques below still apply.

What worked (skill-journey-glow, boss-lag-glow):
- Points as a custom shader material with in-shader depth of field: grow the point by its circle of confusion so out-of-focus points become bokeh
  discs. Cheaper than BokehPass and closer to the look.
- Many links between moving points: compute arcs in the vertex shader from a uniform array of positions (one arc = 8 segments);
  39,800 arcs ≈ 320k segments still runs. Normalize link brightness by the number of visible links, or the mesh turns into a white/pink haze.
- Keep bloom modest (strength ≈ 0.6, raised threshold) and the background near black; a first pass with big points and bloom 1.2 turned the frame grey-brown.
- Morph one structure into the next (interpolate positions from t) instead of flying the camera to a new place; empty in-between frames read as broken.
- A small ms or count readout (≥ 90 px numbers) carries the facts; keep other on-screen text sparse.

Known weak spots: dense meshes lose single-thread detail in the middle; flicker-only states ("updated less often") do not read in a still.
