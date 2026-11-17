# LESSONS — what broke while building this skill, and the fix

Problem → cause → fix, one or two lines each.

- **A black arch over the sky in every other shot** → the sky dome followed the camera in `onBeforeRender`, which runs
  after the dome's matrix was computed, so it sat at the previous shot's camera. → Move the dome to the camera in
  `frame()` before rendering and update its matrix.
- **Sky shader failed to compile** → `#include <colorspace_fragment>` on the same line as code. → Chunks on their own line.
- **Skin looked lavender in shadow** → one global shadow tint multiplies every colour; on skin it goes purple.
  → `shadeTint`: a material can carry its own shadow colour (lit side rescaled so it stays the colour). Skin and light
  coats use a warm peach.
- **Cameras inside houses and hedges; a wide shot across the street saw only a wall** → tracking cameras at a fixed side
  distance in a 5.6 m lane. → Oriented solid boxes for every piece and `clearLine` (pull the camera toward the subject
  until the line is clear); the wide rig became a long lens down the street.
- **The dog's paws were out of reach in every gait** → stride grew with speed regardless of leg length; standing height
  was above leg reach. → Stand at .86 of the height; cap the stride at what a leg reaches (`2·reach / duty`).
- **Planted paws crept** → each planted point was computed with the stride of *now*, which changes as speed changes.
  → Use the stride at the paw's touch-down time.
- **Paws jumped when the dog stopped to sit; then slid as it turned to face the rider** → rest pose swapped in at once,
  and the sit's facing rotated the body with paws planted. → Each paw steps to a fixed rest point (staggered, an arc);
  `face` turns the head, not the body.
- **The push foot slid sideways** → its ground point used the lane of the current frame, and the lane was changing.
  → Use the lane at the plant time.
- **Front paws overreached when sitting** → a fixed sit pitch lifted the chest beyond short legs (corgi). → Pitch the sit
  only as far as the front legs reach.
- **The sea vanished in the harbour** → one big flat ground plane at the route's lowest point covered water 1.6 m below
  a harbour that was itself 4.5 m down the hill. → A ground sweep that follows the route's height, with holes where water is.
- **Grind sparks were invisible** → they were smeared with the background by the motion blur. → Draw sparks on their own
  layer as a sharp additive overlay after the blur.
- **Air poses looked like a T** → both arms straight out at 78°. → Asymmetric balance arms (front forward and higher, back
  low), elbows bent, noise.
- **The rider looked lanky** → long thin legs and a small head. → Shorter legs, thicker thighs, a bigger head, oversized hoodie.
- **The end shot showed the rider's back** → the hero camera was put on the sea side for the background, but the rider
  steps off and faces the other way. → Put the camera on the side the rider faces; the background is then what is
  behind them (choose `dismount.face` and the town accordingly).
- **Cast-sheet labels said right for left** → the view angle rotates the facing vector counter-clockwise. → −90° = right.
