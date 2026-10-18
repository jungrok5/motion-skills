---
name: canvas-film
description: Make a dramatic, multi-scene motion-graphics film drawn entirely in code (HTML Canvas), in landscape and portrait, with AI music/SFX (ElevenLabs), rendered to MP4 frame by frame AND published as a live web player that draws the scenes in the browser — in many languages from one set of scenes. Use when asked to turn a story, site, sermon, explainer or script into a cinematic motion film / motion graphics ("모션그래픽", "영상으로 만들어줘", "film", "animated explainer"), especially when it must exist in several languages or play on a website.
---

# canvas-film

A pipeline for **cinematic** motion graphics — not animated text. Every scene is its own short film in its own visual
style (pastel, woodcut, stained glass, ink wash, shadow puppets, silent film, low-poly…), tied together by one recurring
motif, scored with generated music and sound, and written so that **the same scene files** can be

1. recorded to MP4 (1920×1080 and 1080×1920) deterministically, frame by frame, and
2. played **live** on a web page (no video file, ~10 MB for 13 minutes), in any language you add.

Built for and proven on a 13-minute, 21-scene, 11-language Bible film
(github.com/jungrok5/one-scroll-bible → `motion/`, live at one-scroll-bible.com/film/). That repo is the full worked example.

## What's in this folder
| path | what |
|---|---|
| `harness/lib.js` | the scene harness: `Pilot.run`, seek/DURATION/__ready contract, easing, seeded rng/noise/fbm, text, portrait reframe, **i18n** (`Pilot.tr`, `Pilot.trn`, `Pilot.chars`, font swap, RTL) |
| `scripts/render.mjs` | record a scene (or stills) with Playwright + ffmpeg, parallel workers, muxes the scene's mix |
| `scripts/mix.py` | place music/SFX cues from `<scene>.sound.json` on the timeline (fades, loops, ducks) → `<scene>.wav` |
| `scripts/assemble.py` | join scenes into `film-h.mp4` / `film-v.mp4` (per-scene loudnorm −16 LUFS) |
| `scripts/publish.py` | build the **live web player** site: scenes + subset webfonts + per-scene m4a + language files |
| `scripts/i18n-scan.mjs` | list every on-screen string of a scene (source language) / what a language still misses or leaks |
| `scripts/i18n-merge.mjs` | merge per-scene translation files into the one file each language loads |
| `scripts/sheets.mjs` | contact sheets — every scene × both orientations × N moments, one image per scene (check a language or a restyle by eye) |
| `player/index.html` | the player template (two-iframe preloading, audio as master clock, share sheet, deep links, theatre mode) |
| `scripts/style-index.py` | rebuild `references/STYLE-INDEX.md` from STYLES.md + a Lemo-Opuscar clone |
| `references/` | **STYLE-INDEX (every look to choose from, and how to search it)** · review-prompt (native-speaker review brief for a language) · SCENE-RULES (hard rules for scene authors) · STYLES (21 looks and how each was drawn) · SOUND (ElevenLabs flow) · I18N (method + quality gate) · LESSONS (what went wrong and the fixes) |
| `kits/` | **style kits** — four looks packaged for reuse (`charcoal`, `hopper`, `bass`, `puppet`): `kit.js` + STYLE.md + a template scene; start with `scripts/from-kit.py` (see kits/README.md) |
| `scripts/from-kit.py` | start a project's scenes from one or more kits (vendors harness, story.js, kit, template, script) |
| `examples/hello/` | a minimal project: `film.json`, one scene, a sound spec, a Korean translation — run everything on it first |

## Project layout (what you create)
```
my-film/
  film.json            { title, source:"ko", scenes:[{id,label,dur}], fonts:{base,local}, player:{…} }  (see examples/hello)
  scenes/lib.js        ← copy of harness/lib.js (scenes load it relatively)
  scenes/<id>.html     one self-contained page per scene
  scenes/<id>.sound.json, scenes/audio/*.mp3, scenes/<id>.wav
  scenes/i18n/<lang>/<id>.json, _ui.json, _fonts.json   →  scenes/i18n/<lang>.json (merged)
  out/                 stills and videos;   site/  the published player
```
All scripts run from the project root: `node <skill>/scripts/render.mjs h --scene <id> --stills 2,8`.
Requirements: Node + Playwright Chromium, ffmpeg, Python 3 (numpy; fonttools+brotli for publish), the scene fonts
installed locally (`~/.local/share/fonts`, e.g. Noto Serif/Sans KR) — renders never touch the network.

## Workflow
1. **Storyboard first, styles second.** Split the source into scenes (20–60 s each). For each scene pick a *film style that
   carries its meaning* (e.g. a fall into sin as ink spreading over a painting; a covenant as stars in pastel; the cross as
   black-and-white with one red). **Search the whole catalogue every time**, not just the looks you remember:
   `references/STYLE-INDEX.md` lists all 170 looks (21 proven here + 51 Lemo-Opuscar technique styles + 98 OPUSCAR film
   looks) and says how to shortlist and where each full brief lives. Pick one motif that threads every scene (a gold line).
   Show the list to the person before building; build 2–3 pilots first and get them approved — they set the quality bar.
   **If a kit fits** (`kits/README.md`), start from it — `from-kit.py` — and spend the time on the film's own image, not on
   re-deriving the look; a kit changes how it's drawn, never what. When a new look works, package it as a kit.
2. **Build scenes** (`references/SCENE-RULES.md`): pure `draw(ctx,t)`, both orientations composed on purpose, ≥3.5 s per
   text line, ≤2 lines on screen, quotes verbatim with a source line, fade in/out from black. Parallelise across agents
   (3 scenes each) with SCENE-RULES as the brief; every agent must render stills in h AND v and look at them.
3. **Review stills yourself** (contact sheets of 6–9 times per scene, both orientations) and send back concrete fixes:
   figures that read as blobs, heads floating off bodies, broken strings, text over faces, clipped portrait crops, hard
   unintended edges, rectangles where a soft effect was meant, missing citations. Users DO notice these.
4. **Sound**: each scene writes `<id>.sound.json` (≤3 music cues, ≤8 SFX, ducks for silence). Generate with ElevenLabs
   (`references/SOUND.md` — one flow per batch, 2 variations, never retry), download, `mix.py`.
5. **Render** (optional — the live player needs no video): `render.mjs h|v --scene <id>` per scene, then `assemble.py h|v`.
   Hours of CPU; run in the background, check with stills before.
6. **Publish the live player**: `publish.py` → `site/`; add `poster-h.jpg`/`poster-v.jpg` (a still of the title card) per
   language; deploy `site/` anywhere static. Check CSP (`media-src`, `font-src` self), and that a service worker does not
   intercept the m4a range requests. To put the player inside another page, iframe it with `?embed=1` (stage + controls
   only) and optionally `&o=h|v` (fix the orientation) and `&lang=xx`.
7. **Languages** (`references/I18N.md`): scan source strings → per-language translation files (Scripture/quotes verbatim
   from each language's own official text, site prose reused from the site's own translation, scene-only labels
   translated) → scan for leaks → contact sheets (`sheets.mjs`) → **native-review agent per language** (`references/review-prompt.md`) → fix → publish. Batch 4–6 languages at a
   time; one agent per language; only one agent may touch scene code at a time.

## Contract every scene page fulfils
`window.seek(t)` draws frame t; `window.DURATION`; `window.__ready = true` after fonts/init. `?render=1` = no UI;
`?o=v` = portrait; `?lang=xx` = language. That contract is what lets the same file be recorded, scrubbed, and driven live.
