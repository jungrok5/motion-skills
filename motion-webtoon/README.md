# motion-webtoon

Vertical-scroll motion webtoons (무빙툰) drawn entirely in code: a strip of panels a camera reads downward, Korean balloons and
SFX lettering, focus lines and SD gags, a cast defined as data on a physically constrained rig, an optional black-and-white
manga print finish, and optional ElevenLabs narration / music / SFX — rendered to a 1080×1920 MP4 and playable live in a
browser. See **SKILL.md** for the workflow and `references/` for the craft. Quick start (offline: the starter ships subset fonts):

```bash
cd examples/starter
node ../../scripts/render.mjs v --scene highfive --stills 1,4.6,8.5    # look at out/still-highfive-v-*.png
node ../../scripts/debug.mjs --scene highfive                            # page errors + ms per frame
node ../../scripts/bone-check.mjs --scene highfive                       # joints: bone lengths, elbows, wrists
python3 ../../scripts/mix.py && node ../../scripts/render.mjs v --scene highfive   # → out/highfive-v.mp4 with sound
python3 ../../scripts/new-film.py ../../../my-webtoon                    # start your own (install the full fonts first)
```
Requirements: Node + Playwright Chromium, ffmpeg, Python 3 (numpy, Pillow; fonttools + brotli for `publish.py`).

Worked example: `examples/donut` 「마지막 도넛」 (3 scenes, 74 s) — live pages at
https://jungrok5.github.io/motion-skills/motion-webtoon/demo/donut/ (the scenes draw in the browser).
