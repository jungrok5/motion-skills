# 분해해 들어가기 — craft notes (first sample: packet-zoom)

The look of the first sample was copied from a reference and is not the rule; take the look from the topic (see STYLES.md). The samples named here are in the worked example repo, github.com/jungrok5/mmo-server-explained.
Techniques below still apply.

What worked (packet-zoom):
- Nest levels: model each level near unit size in its own unit (m, 10 cm, cm, mm, 0.1 mm, µm, 10 nm) and place it inside its parent at 1/10–1/100 scale.
- Re-base every frame around the camera's current level: compute matrices on the CPU in double precision, show only that level ±1–2. No precision jitter,
  no need for logarithmicDepthBuffer; near/far follow the camera distance.
- Camera keys = (level, target, distance, yaw/pitch, fov); interpolate distance in log space and move the target so the zoom point stays put on screen.
- Hide seams: the parent's simplified stand-in shows only while the child level is hidden; textures of a parent line up exactly with the child's geometry.
- Look: InstancedMesh for repeats, fake AO with vertex-color gradients, one shadow-casting directional light + hemisphere light, fog and background color
  that change with scale, bloom only on the accent.
- Truth over the brief: check physical facts per level (e.g. 8 bytes on a DDR4 x8 DIMM are spread over 8 chips, one byte each) and change the story
  rather than draw something false; round scales and mark generic layouts illustrative.

Known weak spots: simple box/cylinder models look flat next to the reference; the camera eases to a stop at every key, which reads as stop-and-go;
light direction jumps slightly between levels. Next time: keep velocity through keys (log-space spline), bevelled edges, a few procedural textures.
