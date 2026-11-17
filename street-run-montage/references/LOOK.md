# LOOK — what was observed in the source, and the values

Source: keshi's post on X, https://x.com/keshiAIart/status/2122300022280823089?a=XFn7wiVQgUnXUe0tASY&s=19 —
a 60.1 s clip, 2560×1440 at 60 fps, posted with a single 🛹. Stills were pulled every 2.5 s and the cuts measured with
ffmpeg's scene detection (`select='gt(scene,0.25)'`). What follows is the form; the cast, town and shots are not reused.

## Observed
- **Cast**: one skater (oversized hoodie, shorts, high socks, chunky sneakers, a cap, long hair streaming) and one animal
  (a cat) that keeps pace beside, ahead or on top of walls, from start to finish.
- **Cutting**: ~28 shots in 60 s (a cut every ~2.1 s, 1.1–3.6 s), many on the music's beat; a few soft dissolves and a
  white flash; two moments slowed down.
- **Cameras**: down the street on a long lens; tracking low beside the board; the feet and wheels at deck height; looking
  up from the ground as the board flies over against the sky; a face close-up from slightly above with the cat behind;
  following from behind; a pass-by; a front tracking shot as they come toward the lens; a low hero shot at the end with
  arms raised.
- **Places**: a back lane with block walls, utility poles and wires, a convenience-store front with a striped sign, a
  hedge-lined car park, a riverside path with railings and a bridge, apartment blocks, a station plaza with a canopy.
- **Look**: flat two-tone cel shading; shadows a saturated cool blue (on grey asphalt, on a blue hoodie); skin shadows
  warm peach; hair highlights; thin dark outlines on the characters, almost none on the backgrounds; crisp hard cast
  shadows, dappled under trees; deep blue sky with white cumulus; autumn orange foliage; leaves in the air; strong
  directional motion blur on the background while the subject is sharp; lens flare when facing the sun; a soft bloom.
- **Action**: pushing, cruising, ollies over obstacles, grinds with sparks, a kickflip, a tail drag, a final stop.

## The values (lib/look.js, lib/film.js)
| thing | value |
|---|---|
| cel ramp | one hard step at N·L = .25 (`gradient()`), no tone mapping, sRGB out |
| shadow | ambient = the light's `shadow` tint; the sun's colour = `warm − shadow`, so lit = the material colour, shade = colour × tint |
| skin | `shade: '#e6b2ac'` (warm peach shadow, via `shadeTint`) — also light animal coats (`'#e0b8b4'`) |
| ink | inverted hull, 2.2 px at 1080p (`ink(color, w)`), bodies and board only |
| light presets | noon (el 58°), afternoon (az 215°, el 36°), golden (el 14°) — sky zenith / mid / horizon stops, haze |
| sky | dome with three stops and a sun glow + disc; 16 painted cumulus cards in a ring 420–680 m out |
| shadows | 2048 map, frustum ±26 m round what the shot looks at (±60 m on wide shots) |
| streak | background smeared over 9 taps along the screen motion of a point beside the path (zoom taps for front / rear shots), max 6 % of the width × `blur`; characters masked sharp (feathered) |
| glow | the frame at ¼ size, blurred 3 px, screened at 20 % |
| flare | when the sun's pixel is bright: a radial glow, four ghosts on the axis, a thin streak |
| grain / vignette | overlay noise 7 %, a cool vignette 28 % |
