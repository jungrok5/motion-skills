# shred-poster

An 8-second vertical (1080×1920, 60 fps) seamless loop in which a printed typographic poster — designed for your topic —
is ripped into strips, cascades as paper ribbons, goes through a strip-cut shredder and is rebuilt line by line, with a
synthesised sound design mastered to −14 LUFS. Real type on real-looking paper in three.js: one HTML file that loops live
in the browser and renders frame by frame to MP4. Give it a topic and the agent designs the poster (words, grid, fonts,
palette, picture, marks) and the film around it.

```bash
# from the repo root: the starter (Harbour Swim Club) and the worked example (「퇴고」)
node shred-poster/scripts/render.mjs shred-poster/starter --poster        # the print, in seconds → starter/out/poster.png
node shred-poster/scripts/render.mjs shred-poster/starter --sheet         # 12 stills → starter/out/sheet.jpg
node shred-poster/scripts/check.mjs  shred-poster/starter                 # the automatic review
node shred-poster/scripts/render.mjs shred-poster/examples/toego --draft  # half-size 30 fps preview with sound
open shred-poster/examples/toego/index.html                               # the live page (click for sound)

# your own topic
node shred-poster/scripts/new-film.mjs my-poster
node shred-poster/scripts/font.mjs add my-poster "Space Grotesk" 700
#   write my-poster/BRIEF.md, design my-poster/src/10_poster.js, tune src/90_film.js (see SKILL.md)
node shred-poster/scripts/render.mjs my-poster                            # → my-poster/out/film.mp4 + sound.wav + cues.csv
```

Requirements: Node 18+, Playwright (Chromium), ffmpeg; npm once per font family. No GPU needed (slower without one).

Source: made from [amirmushichge/shred-kit](https://github.com/amirmushichge/shred-kit) (Shred kit by Amir Mušić, a
Blender template; GPL-3.0 — its methods were studied, none of its code is used here), shared at
<https://x.com/AmirMushich/status/2121339167800213934?a=knMN6C_A1VHmWGGzS4c&s=19>.
Worked example: `examples/toego` 「퇴고」 — samples page <https://jungrok5.github.io/motion-skills/shred-poster/>.
