# ink-word-world

A sheet of paper you write a world onto. Type a word (or tap its chip): it is brushed at the pointer, melts into a
real-time fluid simulation of ink and becomes the thing it names — and the things are alive and act on each other.
Drag to stir the ink, Shift-drag to wash it, 1 · 2 · 3 for the pigments, 밤 to turn the sheet over into night. Pure
code: a WebGL2 fluid, Canvas 2D brushwork and Web Audio, no libraries and no image or sound files. Give the skill a
topic and it designs the lexicon, the things, the rules between them and a self-playing performance in this style,
checks them (bodies, determinism, a flooded sheet, a phone screen) and can film the performance to MP4.

```bash
# from this folder
python3 -m http.server 8000      # http://localhost:8000/examples/tide/?auto  「물때」 · 17 words
                                 # http://localhost:8000/starter/?auto        「연못」 · 7 words
node scripts/check.mjs examples/tide --quick                 # page · words · rules · 30 s of the performance · cast · phone
node scripts/stills.mjs examples/tide --cast --sheet 12      # out/cast.png, out/sheet.jpg
node scripts/render.mjs examples/tide --out out/tide.mp4     # 1080p, 30 fps, with sound

# a new world
node scripts/new-world.mjs ~/my-world     # the starter + its own lib/; write BRIEF.md, then world.js
```

Requirements: a browser with WebGL2 to view; Node 18+ with Playwright Chromium and ffmpeg for the scripts
(`font.py` needs `pip install fonttools brotli`). No network, no npm install.

Built after the piece 歸藏 (@op7418) posted on X, 「墨生 · 字即世界」
(https://x.com/op7418/status/2120085300185833878?a=9LfZwP5J_d739gBaN8Y&s=19) — the form (write a word, it becomes a
living ink thing in a fluid sheet) comes from there; the engine, drawings and worlds are this repo's own. Worked example:
`examples/tide` 「물때」; samples: https://jungrok5.github.io/motion-skills/ink-word-world/

`SKILL.md` has the workflow; `references/` the brief template and review rubric, the API, the look and the lessons.
The brush font is YeonSung (SIL OFL 1.1, `lib/fonts/OFL-YeonSung.txt`).
