# cinecode

Short films, animations, ads, explainers and music videos written entirely in code, made together with the user. Give it
an idea, a product, a song or a reference video; it asks a few questions, writes a production card, shows stills, renders
a half-size draft, takes two rounds of notes and delivers an MP4 with a −14 LUFS master. **Quick mode** builds the whole
film in one HTML file (picture + Web Audio, up to about 3 minutes); **Film mode** runs six gated steps (roadmap, script,
style frame, animatic, draft) with a three.js renderer and layered sound.

Source — made from https://github.com/sarpstar/cinecode (MIT, by Sarp Yıldız, @sarpstar). The kit is included unchanged;
this folder adds this README, `references/BRIEF.md`, `references/LESSONS.md` and `examples/first-sprout/`. The upstream
READMEs, with the films the kit was proven on, are here in four languages: [Türkçe](README.tr.md) · [English](README.en.md) ·
[日本語](README.ja.md) · [简体中文](README.zh-CN.md).

## Quick start

```bash
# install the skill for Claude Code (one place only, so the agent never sees two copies)
cp -r cinecode ~/.claude/skills/cinecode

# play the bundled example: a 12 s wordless cut-paper film (click to play with sound, space to pause)
open cinecode/examples/first-sprout/film.html        # Linux: xdg-open … · Windows: start …

# then, in an empty folder, open Claude Code and say
#   "make a short film about <your idea>"   (or: "단편 영화 만들어줘", "제품 영상 만들어줘", "내 노래로 뮤직비디오")
```

The skill sets up each film in its own folder (`init_film.py`), and renders with one call per step from inside it:
`python3 tools/make.py stills | draft | final`. The kit's tests: `cd cinecode && python3 -m unittest discover -s tests`.

Requirements: Node 22+, Python 3 (standard library), ffmpeg, Chrome or Chromium; nothing else unless the user asks (a
narrator's TTS key, Whisper for a footage edit).

Worked example: [`examples/first-sprout/`](examples/first-sprout/) — `BRIEF.md` → `STATE.md` → `film.html`, a topic none of
the upstream films covers. Samples page: https://jungrok5.github.io/motion-skills/cinecode/
