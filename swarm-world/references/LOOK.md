# LOOK — what makes it read as this style

- **The world is visibly under construction, everywhere at once.** At any moment of the build there should be 6–12
  cursors on screen, each on a different thing, plus the track front just ahead of the traveller and the coral terrain
  wireframe on the horizon. A frame with two cursors and finished scenery is a frame that lost the idea.
- **Coral is the build, nothing else.** The accent appears only as the wireframe of what is rising, the marks and the
  record dot. Keep it out of the scenery's palette in large areas (a coral roof is fine; a coral field is not).
- **Wireframe → dither → solid.** Things grow from the base (scaled up from 50 % width) while their wireframe fades and
  their faces dither in, tinted coral at first. Do not add other entry animations (bounces, fades, pops).
- **Low-poly and flat.** Primitives with 6–16 segments, flat shading, vertex colours, soft PCF shadows from one sun,
  hemisphere fill, fog in the horizon colour. Pastel, slightly desaturated; dark ink only in small details.
- **Cursors are UI, not 3D.** Glyphs and tags are drawn on top of the frame at a constant size (`u` = frame height / 720),
  never scaled by distance; they follow 3D points. Tags: name in the crew colour, a quieter second line saying the work.
- **Marks count.** Every job draws an accent box round what it has built so far with four white handles and a label
  "House ×3" — the visual promise that something is being tallied.
- **HUD and log are glass, top-left and bottom-left.** Light glass on a light sky, dark glass on a dark one. Tabular
  numbers. The log fades its older lines.
- **The camera rides, then rises.** A low chase behind the traveller (it stays on screen), zones changing height and
  side by stretch; at the end the crew flies off to the pill and the camera arcs up and turns to the whole world.
- **Golden hour ends it.** The light warms through the second half; lamps and windows glow when the build completes.
  On a dark-sky topic the equivalent is longer shadows, glowing lamps and a sky body.
