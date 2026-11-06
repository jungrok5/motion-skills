# hands-on-lab

Give it a topic and it designs a **hands-on lesson app**: a short course of interactive lessons, each a toy-like 3D bench
(cel-shaded parts with ink outlines on warm paper) that the learner switches on and changes part by part, next to a
panel with an overview, the parts, a clickable diagram that always agrees with the bench, a live chart and the worked
maths — in several languages, on desktop and phone. A scripted cursor tour of the app renders to a 1080p MP4.

Source — made from Dilum Sanjaya's post on X: https://x.com/DilumSanjaya/status/2118386789169938562 (a screen recording
of his Electronics 101 app). The look and the app's shape were studied from it and rebuilt from scratch; no code, art,
text or branding of that app is used.

## Quick start
```bash
cp -r hands-on-lab /tmp/try && cd /tmp/try/hands-on-lab
node scripts/check.mjs examples/circuits                                # data, languages, frame, labels, tour, phone
node scripts/render.mjs examples/circuits out/lessons --lessons --on    # one still per lesson
node scripts/render.mjs examples/simple-machines out/machines.mp4       # the tour → 1920×1080 MP4
python3 -m http.server 8000   # open http://localhost:8000/examples/circuits/  (?tour plays the tour live)

# a new course for your topic
node scripts/new-course.mjs ../my-course --from simple-machines         # then fill my-course/BRIEF.md first
```

Requirements: Node 18+, Playwright with Chromium (for `check` / `render`), ffmpeg (MP4). The page itself is static and
works offline.

Examples: `examples/circuits/` — Circuits 101, five lessons (switch, series/parallel, voltage divider with a breadboard
build, LEDs, capacitor charging); `examples/simple-machines/` — Machines 101, made from its `BRIEF.md` (lever, ramp,
pulleys, gears). Samples page: https://jungrok5.github.io/motion-skills/hands-on-lab/
