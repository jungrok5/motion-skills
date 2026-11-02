# The paper look

What makes a frame read as a papercraft stop-motion set rather than flat vector animation, and how to plan a film.

## The set
- **Wall + floor.** A teal paper wall (`wall #3fb0b4`, darker at the top `#2c8c93`, a soft key-light glow upper left) and a
  cream paper floor (`floor #efe6d3`, lighter toward the wall). The floor ends at the wall (`wallZ`, default 1600) with a
  soft sweep shadow. Both carry the paper grain.
- **Cards stand on the floor** at a depth `z` (0 = the road, 300–600 near scenery, 900–1200 far ranges, ~1450 the sun just
  in front of the wall). Depth gives parallax and depth-of-field for free; flat sets look like a slideshow.
- **One warm accent.** The car (orange `#ea6a2c`) and the sun carry the warmth; mountains, clouds and the roll are cream
  and kraft (`#eee4cf`, shade `#cfc2a8`); the ink is a warm near-black (`#211d1a`). A second accent (a yellow sign) is fine
  if it is small.

## What sells "paper"
| element | recipe |
|---|---|
| outline | every card: ink, 2–2.6 units, round joins; fold creases 1.4 at 55 % alpha |
| shade | flat colour + one fold: lit face / shaded face split by a crease (mountains), a lower band (clouds), a vertical gradient (car body) |
| shadow | each card drops a soft shadow down-right (`shadow: 0–1`), as if lifted a few mm off the card behind |
| grain | the seeded paper texture multiplied over every card, the wall and the floor (`texture: 0–1`) |
| boil | each card jitters ≤ 1 unit and ≤ 0.35° once per pose — the animator's hand. 0.4–0.8 for scenery, 0.7 for the car |
| hold | poses on twos: 12 poses/s at 24 fps, camera included |
| flicker | exposure varies ±2 % per pose (`?off=flicker` to judge without it) |
| lens | depth of field from the camera's focus distance (`dof`, default 9 px max); a vignette |

## The road
- **Paper ribbon** (`width` 120): cream top, darker kraft underside (which side shows is decided per segment by the screen
  winding), a printed dark band (`band` 0.5 of the width) with white centre dashes, ink edges. A **roll** sits at the head
  while it unrolls; its radius shrinks with what is left (√ of the remaining fraction) and its spiral turns.
- **Ink road** (`inkWidth` 58): flat black on the floor with white dashes, made by the **pen** (gold nib, black barrel,
  leaning 30° right, a short soft shadow to the right). The pen enters along its own axis (0.7 s) and leaves the same way.
- **Hand-off**: end the paper on flat ground and continue in ink from the same point; bring the pen in while the last of
  the roll is still unrolling, so the maker of the road changes on screen.

## Shot grammar (what the example does)
| beat | camera | why |
|---|---|---|
| arrive at the end of the road | follow, dist ~1000, yaw 14, elev 15 | establish car, road, the torn end, the sign |
| "the road ends" | push in to dist ~650, yaw 24 | the roll drops in, the driver waves |
| the road is made | follow with the target 200–260 ahead | keep the roll in frame |
| set piece (loop) | fixed target at the loop centre, dist ~1500 | the loop reads as one shape; confetti at the exit |
| the pen | follow, dist 550–750, elev 7–12, yaw swings −14…+10 | close on nib + car; the pen is huge next to the toy |
| pull back | dist ~5600, elev ~21, target the middle of the trip | the whole drawn journey at once, the curl at the end |
Ease between keys is `inOut`; give each move ≥ 1.2 s. Two "stops" (arrive, pull-back) frame the film.

## Reading a reference
Make a contact sheet (`ffmpeg -i ref.mp4 -vf fps=1,scale=480:-1,tile=5x6 sheet.jpg`) and write down, per beat: what makes
the road, what pops up, where the camera is, the palette (sample 5–6 colours), the length. Then design your own: a
different vehicle or driver, your own beats and props. The example kept the idea (a road made just ahead of the car; paper,
then ink) and nothing else.

## Motion budget
- The car's speed changes only at marks (track keys), ~350–550 units/s on paper, ~180–250 on ink (the pen draws slower).
- `lead` (head − car): 400–460 while the roll works (it has to be seen ahead), 110–150 behind the pen (the car is right
  on the nib), large at the end when the pen races on to finish a curl.
- Pop-ups: 0.5–0.6 s, `backOut` k = 1.7 (≈ 10 % overshoot). Clouds `drop` from 400 above.
- Confetti: one burst per set piece, 80–120 bits, 3–4 s.
