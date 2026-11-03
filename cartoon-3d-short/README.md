# cartoon-3d-short

One-minute vertical cartoon story shorts made entirely in code: flat 2D bean-head characters in a lit, painted 3D world
with black ink outlines, lens-blurred backgrounds, gliding cameras that creep in on every hold, a fast narrator, a bouncy
synthesised score and cartoon SFX — the format of the viral animated history / science shorts. three.js in a browser page
(no AI video model, no npm install, no GPU), rendered frame by frame to a 1080×1920 MP4. Give it a topic and it writes the
script (absurd fact → escalation → "You see," + analogy → twist), records the voice, times every shot to the words and
renders.

```bash
# from this folder
cd examples/leaning-tower
node ../../scripts/check.mjs index.html                                    # shot table … check OK
node ../../scripts/render.mjs index.html --sheet 20 --scale .35             # out/film-sheet.jpg
node ../../scripts/score.mjs score.js --dur 61.94 --voice voice/voice.mp3 --words voice/words.json   # out/mix.wav
node ../../scripts/render.mjs index.html --audio out/mix.wav --workers 4    # out/film.mp4 (1080×1920)
python3 -m http.server 8000   # then open http://localhost:8000/ (live, ▶ play)

# a new short
node scripts/new-film.mjs ~/my-short      # template: "Butter Side Down" (5 shots, runs before any voice exists)
```

Requirements: Node + Playwright Chromium, ffmpeg; ElevenLabs for the narration (MCP connector or API key).

Absorbed from mromidev/claude-animated-shorts (MIT, https://github.com/mromidev/claude-animated-shorts), shared on X at
https://x.com/DDJCXX/status/2117420560963821868; worked example: `examples/leaning-tower` "The Tower That a War Saved",
samples: https://jungrok5.github.io/motion-skills/cartoon-3d-short/
