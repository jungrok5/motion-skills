# shadow-critter-vignette

A wordless 7–16 s vertical vignette: a tiny ink-black silhouette critter — two white eyes, one colour it wears — tries
something in a backlit hand-painted watercolour room because of a child's wrong idea, waits, tries again bigger, gets
nothing, and the piece ends on a one-line "I thought…" caption. Everything is code (Canvas 2D washes and window light,
a rigged silhouette with planted feet, a Web Audio score): give it a topic and it designs the critter, the room, the
thing and the beats, then renders a 1080×1440 MP4 with sound and a live page.

```bash
# the worked example 「책을 당기면 비밀 문이 열리는 줄 알았다」 (a bookshelf, 12.8 s)
cd shadow-critter-vignette/examples/secret-shelf
node ../../scripts/check.mjs index.html                          # all checks pass
node ../../scripts/render.mjs index.html --sheet 12 --scale .5   # out/secret-shelf-sheet.jpg
node ../../scripts/render.mjs index.html --cast                  # out/secret-shelf-cast.png
node ../../scripts/render.mjs index.html                         # out/secret-shelf.mp4 + out/secret-shelf.txt (caption)
python3 -m http.server   # → http://localhost:8000/index.html plays live (click for sound)

# a new vignette from the starter (a toaster, 11.4 s)
node shadow-critter-vignette/scripts/new-vignette.mjs my-vignette && cd my-vignette   # then write BRIEF.md first
```

Requirements: Node 18+ with Playwright's Chromium, ffmpeg. No network, no npm install, no GPU.

Source: made from シャンプー台_Ⅰ (@FromUltraViolet)'s X post
https://x.com/FromUltraViolet/status/2122260736147865803?a=vREhJxrQtm6qiT45-n4&s=19 (a 10 s AI video,
「あのへんを押せば出てくるのだと思ってた」). Its form and look were studied; none of it is included.
Samples page: https://jungrok5.github.io/motion-skills/shadow-critter-vignette/
