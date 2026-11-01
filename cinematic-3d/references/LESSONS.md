# Lessons (problem → cause → fix)

- **Trees vanished in the final frame, though `?pass=scene` showed them.** → MSAA resolves colour per sample but the depth
  texture keeps one sample: twig pixels often carry the sky's depth, so a post-pass fog painted them over and DOF blurred them
  as infinitely far. → Fog moved into every material (patched `fog_*` chunks + shared `film.fogU`); the colour target's alpha
  carries geometry coverage and `sceneDepth()` takes the nearest neighbour depth where coverage says "something is here".
- **…and still invisible.** → The lamps' in-scatter (isotropic part) laid a warm veil over everything, as bright as the
  trees. → Forward-scattering phase (`anisotropy .8`, `phaseMix .9+`): halos stay round the lamps; the fog behind the trees
  is a lighter navy than the trees. Use `?off=scatter,lights` to see silhouettes alone.
- **…and the crowns were empty.** → The tree generator's crown came out ~1.45× the requested height: most twigs were above the
  frame. → The first branch length is solved from the geometric series so the crown ends near `height`.
- **First frame 7× too bright** (median 81 vs the reference's 11). → Judged by eye on a bright screen. → Measure region
  medians/percentiles against the reference with PIL; set exposure last.
- **Wet ground grey and hazy.** → A broad specular sheen (roughness .42) from every point light and the reflected fog.
  → Roughness .24 (tight streaks), `wet .8`, fewer real lights near the camera.
- **Clouds were a smooth haze.** → Coverage was subtracted *scaled by the height shape*, so every sample counted as cloud.
  → Standard remap `max(0, n·shape − cover)/(1 − cover)`; billowy noise (three Worley octaves + value noise, normalised to the
  full byte range); two light samples up (sky) and two down (city glow); a `?pass=noise` view to check the 3D texture.
- **The tram floated / its interior was a flat beige panel.** → A 0.5 m gap under the body showed bright fog; inner walls
  covered the whole window band. → Skirt down to 0.28 m; inner walls only below the sills; the nose is a capped loft with the
  sign *outside* the cap.
- **Window blinds turned into dot patterns.** → 9 slats per window alias at distance. → A blind pulled down to a random height.
- **Lit office windows formed round blobs.** → Value-noise contours. → Whole floors on/off (`h12(row)`) mixed with a stretched
  cluster noise (`clusterScale` [.09, .55]).
- **Star-shaped dark wedges on the clock face.** → The hands and ticks (raised off the face to beat z-fighting under the
  mirror's oblique projection) cast long shadows from a low sun. → Clock details don't cast shadows.
- **The puddle shot showed asphalt blobs over the subject.** → Random puddle masks put dry patches in the middle of the
  reflection, and the camera drift exposed the near edge. → An explicit `mask` expression (one big puddle widening away from
  the lens) and a drift that keeps the edges in the corners — checked on a contact sheet at t = 0 / 3.5 / 7.
- **The 180° flip mirrors left and right.** → The sun meant to light the right side lit the left. → Put the key on the
  camera-left when `look.flip` is on.
- **A 20-s timeout hid a page error.** → render.mjs waited 180 s for `__ready`. → It now stops at the first page error.
- **ElevenLabs sound effects came back 0.5–2 s long.** → `duration_seconds` unset = auto (short). → Set it on the node
  (`creative_update_node`), ≥ shot + 1.5 s.
- **CPU-only box.** → SwiftShader: rain 10 s, fog 8 s, snow 6.5 s, autumn 6 s per 1080×1920 frame (trees dominate: 1.4 M
  triangles even with ribbon twigs). → Preview at `--scale .5` (≈ 2 s), profile with `scripts/profile.mjs`, render final shots in
  the background with 2 workers; a GPU machine renders the same pages in real time.
