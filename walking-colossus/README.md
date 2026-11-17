# walking-colossus

A photoreal, gritty film of something huge and ordinary walking on giant hydraulic legs through fog — an apartment
block, a ship, a church — made entirely in three.js code: procedural geometry and weathering, no 3D models, no image
textures. Give it a topic and it designs the colossus (its body at true scale, the belly the legs bolt onto, how many
legs and how heavy the walk), the ground and the hour, nine shots cut on real footfalls and a synthesised soundtrack;
frames render offline in headless Chromium into a 1080p MP4. A check script proves the legs can do what they do.

## Quick start
```bash
cp -r walking-colossus /tmp/try && cd /tmp/try
node scripts/serve.mjs examples/low-tide            # open http://127.0.0.1:5177/  (?shot=f_foot  ?free  &scale=0.5)
cd examples/low-tide
node ../../scripts/check.mjs --fast --events        # legs, gait, support, cameras + every footfall per shot
node ../../scripts/shot.mjs --board --n 1           # storyboard: shots/s_sheet.jpg
node ../../scripts/render.mjs --w 480 --h 270 --mb 1 --every 3 --dir out/preview
node ../../scripts/audio.mjs && node ../../scripts/encode.mjs --frames out/preview --every 3 --out out/preview.mp4

# a new topic
node scripts/new-colossus.mjs ~/my-colossus --title "Night Ferry" --legs 4 --len 90 --depth 18 --height 22
```

Requirements: Node 18+, Playwright + Chromium (uses the GPU when there is one, SwiftShader otherwise), ffmpeg.

Examples: `examples/walking-block/` is the source film on the engine (a Soviet panel block on eight legs at blue
dusk); `examples/low-tide/` 「Low Tide」 is a new topic made with the skill's workflow (a stranded container ship on
ten legs crossing the mudflats at an overcast dawn).

Source (what this skill was made from): https://github.com/Leonxlnx/walking-block (MIT — the adapted engine keeps its
licence in `engine/LICENSE`).
