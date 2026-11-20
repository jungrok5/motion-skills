# pixel-world-compiler

Give it a topic and it compiles a living pixel-art world: real latitude and sun, ramps derived from each surface's
reflectance, a locked ≤ 64-colour palette, every size from 26 px = 1.70 m, terrain from analytic fields, plants and
buildings placed where their conditions hold, people and animals rigged from measured proportions and walking by
gait laws, with feet that never slide. You write tables, and the compiler draws. Output: a walkable live page, a cast
sheet, stills, and a 1080p tour MP4. A check script proves the laws with numbers.

Made from [Frostwind](https://github.com/trinity-works/frostwind) (Trinity Labs, MIT), the nature-grounded world
compiler whose method this follows. The code here is a smaller Canvas 2D rewrite.

```bash
node pixel-world-compiler/scripts/new-world.mjs my-world --from tundra-camp   # or no --from for the blank template
cd my-world
node ../pixel-world-compiler/scripts/check.mjs index.html                      # laws: palette, feet, joints, …
node ../pixel-world-compiler/scripts/render.mjs index.html --cast               # out/my-world-cast.png
node ../pixel-world-compiler/scripts/render.mjs index.html --stills 0,12        # out/my-world-12.png
node ../pixel-world-compiler/scripts/render.mjs index.html                      # out/my-world.mp4 (24 s tour)
open index.html                                                                 # arrows walk, space pauses
```

Requirements: Node + Playwright Chromium; ffmpeg for the MP4. No npm install, no network.

Examples: `examples/tundra-camp` (69° N, March: a herders' camp, five reindeer) and `examples/terrace-village`
(25° N, June: rice terraces, a stilted hamlet, a water buffalo).
Samples: https://jungrok5.github.io/motion-skills/pixel-world-compiler/
