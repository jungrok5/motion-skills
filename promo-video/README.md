# promo-video

Short promo / ad motion-graphics videos (15–40 s) for a business, in landscape 1920×1080 and portrait 1080×1920, with
ElevenLabs narration, sound effects and music, mixed to −14 LUFS and muxed into MP4. Each video is one HTML page that
draws any moment `t`, so the same file is the live preview and the frame-by-frame recording. The skill also covers the
part before the code: reading the business's site, proposing styles and a storyboard, and writing a one-shot prompt per video.

```bash
# from this folder (needs Node + Playwright Chromium, ffmpeg, Python 3 + numpy)
open examples/minimal/index.html                                        # live preview (click restarts)
node scripts/render.mjs examples/minimal/index.html --stills 2.5,14.5,28 # check stills → out/
node scripts/render.mjs examples/minimal/index.html                     # out/minimal-landscape.mp4 + -portrait.mp4
python3 scripts/mix.py examples/minimal/mix.json --mux                  # narration + sfx + music → into both MP4s
node scripts/render.mjs examples/pop/index.html && python3 scripts/mix.py examples/pop/mix.json --mux
```

Requirements: Node + Playwright (Chromium), ffmpeg, Python 3 with numpy; an ElevenLabs connector for new narration/SFX/music.
Real work: 9 videos for two clients (5 styles for a tax accountant, 4 for fortimoveglobal.com) — samples page:
https://jungrok5.github.io/motion-skills/promo-video/
