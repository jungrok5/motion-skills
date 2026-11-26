# Lessons — what broke while building this skill, and the fix

Each: problem → cause → fix. Most were found by `check.mjs`'s hand-off test (the same moment drawn from either world).

1. **The painting was empty from the room.** → The inner world's fog was scaled into the outer world's units and
   accumulated across the whole room. → Fog of an inner world starts at its parent's aperture / bounds (the engine
   carries exp2 fog as a linear Fog with an offset).
2. **The enclosing shell covered the inner world through the opening.** → The cottage around the room is drawn after the
   painting and its back wall lay inside the painting's space. → A world draws only at its own stencil level; an open
   aperture's world draws a second, plane-clipped pass for what lies in front of the opening; and `bounds` hollows every
   outer world once the camera is inside.
3. **The cottage lamp was dimmer seen from the room than from the painting.** → three clamps point-light falloff at
   0.1 units (`max(d², 0.01)`); at 1/100 a lamp is closer than that. → The engine lowers the clamp to 1e-20.
4. **Speed stalled and rushed between keys.** → Hand-timed keys plus Catmull–Rom in plain space: a push into a 1/100
   world crawls, then rushes. → The engine times the ring by perceived distance (|move| / distance to the look target)
   with Steffen monotone timing; keys carry `pace`, not times.
5. **The lantern's misted panes vanished from inside the bottle.** → Inner worlds are drawn first, so the cabin's night
   backdrop (opaque, drawn later) painted over transparent panes. → Two sweeps: all opaque first, then all glass
   (layer 1) inner → outer.
6. **Clipping the front pass did nothing.** → `renderer.clippingPlanes` did not reach these multi-pass renders. → The
   front plane is set per material (local clipping), like the hollowing box.
7. **A grid pattern over the hatch descent.** → The lantern floor's hatch hole was at the mirror position (rotating a
   shape by −90° about X sends its y to −z), so the floor sat coplanar with the aperture plane and z-fought the clip. →
   Put the hole where the aperture is (write the mapping in a comment) and look at the seam stills.
8. **Reflections jumped at the lantern seam.** → `scene.environment` is fixed in root space; the lantern world is turned
   by its portal. → The engine sets `scene.environmentRotation` from the portal; keep env maps roughly symmetric about
   the turn axis (the residue is small; check.mjs allows a third of one frame's change).
9. **The cabin was black around the lamp.** → The flame and burner cast shadows from inside the light. → Nothing round
   a light casts.
10. **Depth of field drew a grid on big blur.** → The golden-angle gather used the same spiral for every pixel. → A
    per-pixel turn of the spiral and denser rings.
11. **The bottle's sea ended in a slab.** → A rectangular sea inside a bottle with a shoulder. → Build the resin and the
    waves from the bottle's own profile, narrowing to nothing at the shoulder.
12. **Running from a fresh container**: everything renders in headless Chromium with SwiftShader; a 24 s example checks
    in ~1 min at 0.4 scale and renders 1080p at roughly 1–2 s per frame per worker.
13. **A hand-off differed only "after" the seam in the template.** → Seen from inside the jar, the room had no walls, so
    the world *around* the room (two levels out) showed — drawn from one root but not the other. → `film({ outer: 2 })`
    draws two enclosing worlds; use it whenever the camera can see out past the first (a room without walls, a lantern
    looking out through a bottle). The example uses it.
