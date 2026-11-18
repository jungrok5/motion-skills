# LOOK — what the source demo showed

Observed from Felix Rieseberg's "Hotel Hypertext" demo (https://claude.ai/artifact/WgPzNowvy1DGy3jeXhzNMD), opened in headless
Chromium with HTML-in-Canvas switched on, plus its thumbnail. Notes on form, interaction and technique only; none of its code,
text, rooms or sounds is used here.

## Form
- A night scene: a deep blue sky with stars, thin cloud bands, a large moon upper left with a halo, a dark far city on the
  horizon. In front, one building on a wooden diorama base with a cobbled street, iron street lamps, small turned trees, a
  post box and a few peg-doll passers-by.
- The building is cut open at the front like a doll's house: a cream frame of floor slabs and walls with a thin brass line in
  each slab edge, brick wings with stone quoins and tall lit windows, a cornice with dentils, a parapet. A neon sign on a steel
  lattice over the roof, chimneys, a water tank, a flag.
- Six rooms in two columns and three floors with a lift shaft between them. Each room is a deep box seen almost straight on,
  floors visible from slightly above, side walls in gentle perspective. Rooms are warm and dim, lit by their own lamps; lamp
  shades glow; furniture casts soft shadows; corners darken (ambient occlusion); bright things bloom.
- People are turned wooden peg dolls: a cone body, a ball head with dot eyes and cheeks, simple arms, hair or hats.
- The lift: a brass cage with a lattice gate and an operator, counterweight and cables, landing gates and floor numbers.

## Interaction
- Every object you can work is an HTML control drawn in the room as a physical object: brass switch plates (checkboxes),
  brass slider plates (ranges), a dropdown on a door hanger (select), a guest book or chalkboard (text), a neon sign that is a
  select, a piano whose keys are buttons, and the lift as one tall vertical range whose thumb is the brass lever on the car.
  Release the lever and the car glides to the nearest floor and chimes.
- Switching a lamp off darkens its room (the light fades); dimmers change the light; some controls recolour things.
- A magnifier lens on a handle can be dragged by its rim; under the glass the scene becomes a pale line drawing and the
  controls appear as plain, unstyled HTML with a blue caption of their tag (`<input type="checkbox">`). Those plain twins work:
  clicking one changes the styled control and the room.
- "Show just HTML elements" turns the whole scene into that sheet of plain controls laid out where the rooms are.
- Wheel zoom, drag to pan, double-click to zoom into a room; an opening where the rooms light up one by one and the sign
  flickers on; occasional glints across the controls; synthesised clicks, bells, chimes and notes.

## Technique (as understood, re-derived here)
- WebGL2 forward renderer: interleaved vertex data with two colours, roughness, emission and a pattern id per vertex; patterns
  (wood, planks, brick, stripes, tiles…) computed in the fragment shader; up to three point lights per room with cube-map
  shadows; a directional moonlight shadow map; screen-space ambient occlusion; bloom; ACES-like tone map keeping lamp hue; FXAA.
- Every control is its own canvas child, uploaded to its own texture on paint, drawn as a quad lit by its room's lights, and
  placed for hit testing by the homography of its projected quad.
- Each control is cloned into an unstyled twin, synced both ways; the twins are drawn into a separate layer that the lens and
  the plain sheet show, and they take the hit testing there.

## What this skill keeps and changes
Kept: the cutaway at night, rooms of live controls as objects, the lit renderer and post, the lens and the plain sheet, the
vertical-range lift, synthesised sound. Changed: everything is a reusable kit (a parametric grid building, a prop kit, a lift
helper), the content is designed per topic, and the code, rooms, wording and sounds are this repo's own.
