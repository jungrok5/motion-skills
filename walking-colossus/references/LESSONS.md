# LESSONS — what broke and the fix

From the source film (Walking Block, its module contract and round-2 notes) and from making this skill.

## From the source film

- **Swimming textures** — noise in world space crawled over the walking body. → All weathering is triplanar in
  mesh-local space (after `instanceMatrix`), no UVs. Animated instanced legs patch it to a per-instance offset.
- **Clones** — identical legs and parts looked copied. → Per-instance tint (±10 %), `w.offset` per material, every
  repeated element varied, some missing.
- **Accumulated state** — frames rendered out of order disagreed. → Every effect (debris, spray, steam, birds, fog
  banks, prints, the hoses) is a closed-form function of `t` and per-instance seeds; the gait is stateless.
- **Blended sprites vanished against the sky** — post fog replaces every depthless pixel with sky. → Smoke and
  spray are alpha-hashed and depth-writing; only soft mist stays blended.
- **Windows read as white / lemon / salmon** — → a fixed radiance range `(2.4, 1.1, 0.32)` … `(0.9, 0.38, 0.1)` and
  bloom threshold ≈ 0.6–0.75.
- **Rust went orange, hazard stripes looked toy-like** — → rust clamped to dark brown in the shader; no stripes.
- **Blue everything** — the dusk tinted the surfaces. → Neutral-cool light; only the air is blue (fog, mist).
- **Too heavy for the laptop GPU** (5.4 M triangles, 4096 shadow map) — → instancing, merged geometry, per-module
  budgets, detail in shaders and procedural textures instead of triangles; frames rendered offline, resumable.
- **Shots missed the action** — → cameras aimed at footfalls computed from the gait (`check.mjs --events`); hero
  puddles and props placed for the lens.
- **Sound out of sync** — → every sound placed from the same closed-form gait and camera, delayed by distance.

## From making the skill

- **Engine vs topic.** In the source, the ground shader, the atmosphere and the halos had the block's dimensions
  baked in (±44 m, 7.5 m, the chimney list). → Everything that belongs to the topic moved to `colossus.js`
  (`CFG`, `GROUND`, `ANCHORS`, `shots`), with defaults derived from the box; the engine reads only those.
- **Legs at another size.** Scaling lengths alone left the parts' cross-sections wrong. → `LEG_SCALE` scales the
  whole leg group and the IK runs in the unscaled frame; print and debris radii scale with it.
- **Leg count other than 4 a side** crashed the ground (footprint arrays sized for 8 legs). → arrays sized from
  `NLEGS`.
- **A white blob with a black hole** in 「Low Tide」: a lifeboat whose ends closed to a point gave zero normals →
  NaN → the bloom spread it. → `kit.grid` falls back to an up normal; pointed ends get a tiny radius.
- **The same blob again, only through the puddle mirror** (legs rendered into the mirror target produced a NaN /
  Inf texel at some resolutions). → The ground shader discards non-finite mirror samples and clamps them to 6.0.
  Look for it at more than one resolution: it did not show at 320 × 180.
- **"Motion" measured film grain** — every frame differs by its grain, so a frozen shot passed. → `check.mjs`
  renders with `look=grain:0` for the motion measurement.
- **Hexapod support.** "Two feet down per side" rejected a 3-a-side tripod gait that stands fine. → support = ≥ 3
  feet down and the body over the planted polygon.
- **SwiftShader** (no GPU) renders the 4–5 M-triangle scene at 8–35 s per 960 × 540 frame: fine for stills, checks
  and a 10 fps preview; the full 1080p film wants a real GPU.
- **Screenshots of a busy WebGL canvas** timed out in headless Chromium (the element never became "stable"). →
  frames are read with `canvas.toDataURL` inside the page.
