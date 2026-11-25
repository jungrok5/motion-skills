# LESSONS — problem → cause → fix

- **The film could not seek.** → a real trail texture accumulates frame after frame, so frame 900 depends on 899 others. →
  Keep a stamp log from the walk and rebuild the texture's window every frame; the newest press wins (`max` of times) and
  ripples are a function of age, so the rebuild equals the accumulating texture and `seek(t)` stays pure.
- **Leaves snapped back after 12 s though their memory was 45 s.** → the body channel kept presses only 12 s. → The texture
  keeps each channel as long as its longest reader (`life`, blades' and litter's `life`) — computed at `F.start()`.
- **The reeds check found 0 changed pixels right after the walker passed.** → the bent blades were all inside the box that
  masks out the walker. → Measure at +0.5, +2 and +6 s, with a mask the size of the sprite, not a generous box.
- **A foot crossed the line of travel by 2 px.** → a waypoint turned the heading 30° in 0.1 s while a foot was planted. →
  A turn rate (°/s ÷ mass) on the wanted velocity: corners become arcs a step or two long, as people walk.
- **The first idle "stood dead still" in the check.** → the camera spring started off its target and drifted, and the check
  compared screen boxes only when the camera had not moved. → Start the camera on its target; compare a crop that follows the
  walker (the ground under a standing walker is world-locked, so only the walker's pixels can change).
- **The title read "THE LAST HELL".** → the 3×5 font's W is an H with a middle bar at scale 3. → A 5×5 font for titles and
  captions; 3×5 only for small labels.
- **At 480×270 the walker was a speck.** → a 20 px character in a 480 px frame. → 320×180 at ×6: the walker is 1/16 of the
  width, and each half of the split view (160 px) is as close as the reference's.
- **Leaf litter at night looked like TV static and hid the lantern.** → density .2 per pixel of bright chips. → About .06; a
  sparse layer reads as leaves, and the lit circle reads as light.
- **The cast sheet's shadows were black.** → the walker was drawn into an empty buffer and copied, so the shadow blended with
  transparent black. → Draw the walker straight onto the sheet.
- **The sheet did not fit at 320×180.** → twelve cells per row need room. → `?sheet=cast` and `?map=1` draw a 640×360 page of
  their own (render them at ×3).
- **The "WORLD" label in the split read as garbage.** → 3×5 text with a 1 px shadow over busy pixels. → A small dithered band
  behind the label, no shadow.
- **A hard ground looked like a bug ("the road ignores my steps").** → nothing said it was on purpose. → Caption it: the road
  keeping nothing is what makes the others' memory visible; `check` reports it as the contrast, not a failure.
- **The whole frame turned the colour of a mushroom cap for one moment.** → `TypedArray.fill(c, start, end)` with a negative
  `end` counts from the array's end: a prop just off the left edge on row 0 filled the buffer. → `P.rect` returns when the
  clipped span is empty. Look at the stills at every beat, not just a few.
