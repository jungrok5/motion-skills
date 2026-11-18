# The form, observed from the source demo

Source: Felix Rieseberg's "Six Apps, One Cube" — https://claude.ai/artifact/287yYEVG3FekMqofmJkUki — on the HTML-in-Canvas
demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk (post: https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19).
Read from its HTML (a reference only; no code, text, art or sound is reused) and its 512×320 thumbnail. In headless Chromium
here the demo loaded but never yielded a screenshot (its paint-driven loop starved the compositor under software GL), so
what follows is from the page source and the thumbnail.

## What it looks like
- A Rubik's-style 3×3 cube, three-quarter view (front-left, right and top faces visible), tilted toward the viewer, filling
  about half the window height, standing on a dark floor that mirrors it softly.
- Cubies: near-black, very glossy, rounded edges, with narrow dark grooves. Every cubie face carries a "sticker" that is a
  rounded square of the app's pixels under a thin layer of glass: the screen sinks a little at its rim, a bright rim line
  catches the light, and softbox reflections slide over the glass at grazing angles.
- Studio: a big warm key softbox above, a cool strip on one side, a warm kicker from behind, a thin vertical strip in front;
  a dark navy backdrop with two faint coloured glows (magenta low left, blue high right); the floor reflection blurs with
  distance and darkens under the cube.
- A serif title and three numbered steps top-left that tick off; a "what is this?" link bottom-right; a small monospace tag
  next to the pointer naming the element under it (`<button>`, `<div contenteditable>`).

## The six apps (all plain DOM, 720 px squares cut into nine 240 px tiles)
A lined-paper text editor in big serif type that types its own two opening lines; a control face (Twist: Scramble / Undo /
Solve keys, sound toggle, a "Solved" badge and a log of the last moves); a drawing pad (SVG strokes, four inks, Clear); an
analogue clock; a step sequencer at 96 BPM (play key, tempo slider, a grid of pads, LEDs); a mine-sweeper grid. Controls are
laid out inside tiles so they survive being scattered; text runs across tiles.

## How it behaves
- Hover a tile: only that tile's app becomes hittable, placed under the pointer; the cursor and :hover work there.
- Click / type: the real element gets it. Text keeps its caret through twists, because presses on buttons and tiles are kept
  from taking focus. While typing, the cube turns to show the caret's tile if it faces away.
- Drag a tile (more than a few px): its layer turns, following the finger along the projected direction of the best axis;
  release snaps to the nearest quarter with a short overshoot, a quick flick counts as a quarter. Drags that start on text,
  sliders or the drawing pad go to the page instead; Shift forces a twist.
- Drag outside the cube: orbit with inertia. An intro swing on load, a slow sway until the first touch.
- The cube rests on the floor, rising onto an edge or corner as it is rolled; the camera follows.
- Solved: a band of light sweeps across the tiles and a chime plays. Scramble plays 18 quick turns; Solve replays the
  history backwards; Undo takes one move back. Sounds are synthesised (a low "thock" per landing, twist swishes, a chime).
- Without the feature, a page explains what browser is needed (with a video poster).

## The technique
- `<canvas layoutsubtree content="drawable">` with six `drawable` sections; each face uploaded as a WebGL texture (1440 px with
  mipmaps) when its pixels change; every sticker samples its ninth of its face's texture.
- Hit testing: for the tile under the pointer, the homography from the tile's 240 px square to its four projected corners
  is the face's `matrix3d` transform (earlier API) or `updateElementGeometry` canvas transform (current API), clipped to
  the tile (a clip rect, or an overlay "shield" with a polygon hole on the earlier API). During a press the clip opens so
  selections and slider drags can run past the tile.
- Rendering: rounded-box cubie mesh, an environment function made of rectangular softboxes for reflections, a tile shader
  (rounded-square mask from a signed distance, rolled-off glass normal, rim, sweep), a mirrored pass rendered at half size
  with mips for the floor, a soft tone curve and dither.

## What this skill keeps, and what it changes
Kept (the style): the cube of live apps, glass tiles, the studio, the tile-under-pointer homography, the gestures, the
reveal-on-type, the control face, synthesised sound. Changed: all code is new (closed-form square-to-quad homography,
`lib/hic.js` placement without a clip — only the hovered face is placed, which is enough because the binding follows the
pointer every frame), the apps and words are designed per topic, the material/studio/sound are config, the fallback is the
same apps as an ordinary page, and checks prove the mapping tile by tile.
