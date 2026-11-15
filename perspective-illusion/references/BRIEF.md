# Brief: topic → a place that can fool the eye

Every loop starts here. Write the project's `BRIEF.md` (copy `templates/BRIEF.md`) **before** code: the topic decides the
place, its long axis, the hero, the repeats, the swap objects, the light and the palette. The template's Corner Street and
the example's Country Platform are two answers to two topics, not a menu.

## Fixed (the style) and designed per topic

**Fixed — every loop in this skill:**
- The trick: a level camera on a very long lens (fov ≈ 1.5–2°, hundreds of metres out) flattens a deep scene into what
  reads as one flat drawing; dolly zooms (the lens widens while the camera moves in, W kept) open it into deep space.
- Corner views: the camera swings round (yaw) and looks down by lens shift (el), each one first on a long lens (reads
  flat), then dolly-zoomed open. They come in pairs: telephoto, then wide, at the same yaw.
- The cheat: swap objects change depth (a row ↔ a diagonal) only while the view is flat.
- The camera never tilts or rolls: verticals stay vertical, like an architect's drawing.
- The loop: ~10 s, all parameters on one monotone cubic, holds that breathe (drift shots), the last shot = the first.
- The look: clean ink line art (silhouettes, depth steps, creases, colour boundaries), flat colour with a two-tone shade
  step, hatching only in cast shadows, a sky painted by view direction, 6–10 flat colours + one accent.
- 16:9 1920 × 1080, 30 fps (60 for posting), an MP4 and a live page. Original characters and made-up brands only.

**Designed per topic — in `BRIEF.md`, built in `scene.html`:**
- The **place** and its **long axis** (a street, an aisle, a platform, a corridor, a pier, a library stack, a canal).
- The **hero** that closes the axis square on to the camera (a shop, a footbridge, a gate, a shrine, a counter).
- The **repeats** at different depths that stack into one in the flat view (poles, columns, masts, lamps, shelves, trees).
- The **hero object** (a car, a train, a stall) and so the side the first corner view turns to (the other one).
- The **swap objects**: 3–6 similar things whose arrangement changes (cones, boards, chairs, bins, crates, lanterns).
- The **light** (sun azimuth and height: main subjects lit, long shadows across the ground) and the **palette**.
- The **shots** the place needs beyond the grammar (a low shot down the rails, a high shot over the canopy).
- The **detail**: what a real place of this kind has (list it from photos), its wear and story, what the corner views find.
- New **pieces** for the place, written in the scene file over `K` (references/KIT.md) — the kit is not edited.

## Stills rubric (1–10 each; fix every area under 7)

Render `render.mjs scene.html --sheet --scale .4` (every key and every move's middle) plus the flat frame at full size.
Look like an illustrator: name the three weakest areas of each frame, fix those, repeat. A fresh reviewer agent given only
the sheet, the flat still and this list is a good scorer.

1. **Flat reads flat.** The opening still looks like one elevation drawing. Nothing gives the depth away (no floor strip
   running to a vanishing point, no sky down the sides, no sizes that betray distance).
2. **Every move ends on a reveal.** A hidden diagonal, a side street, things that were far apart, a hero that was far back.
3. **Corner views** start flat and open up; the first turns away from the hero object.
4. **Lines** crisp and even: no double lines, no ink on glowing faces or inside text, no noise on far textures.
5. **Two tones** clear on every main form; hatching only in cast shadows.
6. **No bare primitives.** Every box has trim, seams, a base or a label; the corner views find detail, not blank walls.
7. **Text** legible and spelled right, in the bundled fonts, with made-up names.
8. **Sky** matches the light's direction and colour.
9. **Palette** limited and harmonious, one clear accent.
10. **Seam** invisible (check.mjs `loop seam` 0) and nothing pops; the preview has no stutter.
11. **Topic.** Someone shown the flat still names the place.
