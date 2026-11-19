# BRIEF — 「바람의 들판」 (The Field in Wind)

## The scene (one line)
A late-August afternoon painted in thick oil strokes: one gust comes across a sunflower field from the left — you watch
it travel as a pale wave through the leaves, the heavy heads bow after it, overshoot and settle — while cumulus towers
drift over a farmhouse on the far rise.

## Why this topic, this image
- The moment: about 17:30 at the end of August, a field on a gentle slope; the sun low on the left behind a cloud edge,
  so petals glow from behind and the cloud towers are warm on one side, violet on the other.
- The beat: still air with a breeze → the gust arrives at the left edge (t≈2) → crosses the field (2–8 s) → the last
  heads on the right bow and come back while the left side has settled again.
- What someone who has stood in a field in wind checks first: you see wind as the leaves turning their pale undersides;
  big heads lag behind their stems and swing back past upright; small things (loose petals) go first and fastest; the
  far field moves less (it is smaller), not slower.

## Frame
- 1080×1920 · 30 fps · 10.0 s.
- Camera: standing on a bank 2.4 m above the field, looking west-southwest along the rows, horizon at 51 % of the
  height. One move: a very slow push (+3 %), ease in-out.
- Composition: eye lands on the big backlit heads in the lower third → follows the path into the field → the farmhouse
  roof → up into the cloud towers. Near: heads 80–110 px across, stems leaving the bottom edge. Middle: rows converging.
  Far: a carpet of yellow dots, blue hills, the red roof.

## Tool
`webgl` — a painting: ~70,000 instanced strokes (sky, clouds, hills, field, path, leaves, stems, petals, seeds), every
one with its own size, colour, bend and seed; wind is GLSL; each flower head's sway comes from a spring simulated
once per flower and handed to the vertex shader in a float texture.

## Timeline (seconds)
| t | what happens | what the eye does |
|---|---|---|
| 0.0 | a finished painting with a breeze: leaves flutter, petals tremble, clouds drift | takes in the picture |
| 1.8–2.6 | the gust front enters at the left — leaves flip pale, three loose petals lift | catches the movement |
| 2.6–8.0 | the front crosses the field (faster near, it is closer); each head bows 0.4–0.9 s after the leaves around it, overshoots, settles over ~2 s | rides the wave |
| 8.0–10 | right side still swinging back, left side quiet again; loose petals drift out of frame | |

## The five criteria, for this scene
| criterion | what passing means HERE | the likely failure to watch for |
|---|---|---|
| density | strokes at every scale — big sky strokes, cloud-contour strokes, rows of tiny far heads, near heads with 40+ petals and a seeded disc; no area of one flat underpainting | visible gaps of bare underpainting, all strokes one size, a regular grid |
| light | low sun left behind a cloud: lit cloud edges warm, shadow sides violet; petals glow on their sun side; impasto ridges catch the light from upper left | flat even yellow, no backlight, black shadows |
| scale (no people: flowers, path, house) | heads shrink with distance along consistent rows; the path narrows; the farmhouse reads as a house 200 m away | near and far heads the same size, a toy house |
| weight of motion | heavy heads lag, overshoot and settle; leaves flick fast; petals fastest; the gust is a front with a beginning and an end, not a global sine | everything on one sine, heads moving with their leaves, a wave that never ends |
| colour | complementary light: warm sun yellows/oranges against violet-blue shadow and sky; greens vary (lit yellow-green, shadow blue-green); one red accent (roof) | saturated pure yellow everywhere, one green, rainbow noise |

## Cast
No people or animals — nothing with a body moves. (Motion rules for heavy vs light things still apply.)

## Palette
sky top `#3f6fa8` · sky low `#9cc3d9` · horizon cream `#f2dcae` · cloud lit `#fff1d6` · cloud shade `#8f8fb4` ·
hills `#6a7fa8` · leaf shade `#2f5a2a` · leaf lit `#7f9d3a` · leaf underside (in wind) `#b9c98a` · petal `#f2b21d` ·
petal backlit `#ffe27a` · disc `#4a2b16` · path `#c9a273` · roof `#b5432f`.
Not in it: pure #ffff00, black, neon green.

## Not in this scene
A copy of any known painting (no swirl sky, no cypress, no named artist's composition); evenly spaced flowers; one
sine wave on everything; strokes all the same size; a perfect gradient sky behind the strokes.
