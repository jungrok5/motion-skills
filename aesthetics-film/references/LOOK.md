# LOOK — what was measured on the source, and the values used

Source: LanFeng, 《中国美学》, shared at https://x.com/YFeng2022/status/2117924044439712156 — 1920×1080, 30 fps,
3:28 (207.85 s), AAC stereo. Stills were pulled every 4 s and read by eye; the numbers below are from those stills
scaled to a 1080 px tall frame. The film itself is not included here.

## Structure of the source
| | chapter (badge) | what is on screen |
|---|---|---|
| 01 | 计白当黑 · Ink & empty space | ink peaks over a white mist sea, a boat, pines on a dark islet, ink-tone swatches, a yin-yang ink drop |
| 02 | 移步换景 · Walking into scenery | a garden: bamboo, plum, a corridor, a moon gate, leak windows with lattice, a plan view, a Taihu rock with flowing blue wind lines |
| 03 | 禅意与造物 · Zen & craft | a pavilion interior: rain on the roof, a celadon bowl, a guqin, a censer with smoke, close-ups with callouts |
| 04 | 气韵生动 · Living resonance | a coffered ceiling, a bracket set exploding (callout 榫卯 · 阴阳咬合), gold flow lines, a night-blue diagram of seasons |
| 05 | 大美无言 · Great beauty is wordless | bamboo and plum against a wall, a moon, the court seen from above, a dry-brush stroke, the title card 中国美学 + seal |
Chapters run ~35–45 s; shots 4–12 s; every shot moves; changes are cross-fades or fades through paper.

## Chrome (sizes at 1080 px height)
- **Badge** top-left at (42, 34): seal-red square 26 px with a two-digit number in white; title 20 px serif 600 at
  +38 px; English name in 8.5 px spaced caps under it; a hairline rule 44 px below the top of the square.
- **Brand mark** top-right, 42 px from the edge: 15 px bold serif title, 7.5 px spaced caps under it.
- **Subtitle** centred: native line 34 px serif 600, baseline 96 px from the bottom, typed one character at a time
  (each fades in over ~0.28 s, the newest still pale); English line 19 px italic serif, 62 px from the bottom.
  Accent words: seal red `#a3302b` on paper, gold `#c9a76a` on darker frames. On darker frames the text is pale
  `#f4f0e6` with a soft shadow.
- **Callout**: gold dot + hairline leader (~110 px) to a dark plate `rgba(26,24,22,.8)` with a gold hairline border,
  15 px native label + 8 px spaced-caps English.
- **Card**: paper `#ebe7dd`; a dry-brush stroke drawn left to right (~1.5 s) that fades; the title 62 px bold with
  10 px tracking; a red seal to its right; a spaced line under it; a tiny italic footer.

## Picture
- **Paper and ink.** Background / fog of the ink chapters `#ebe7dd`; ink `#1d1f21`. Peaks are darkest on ridges and
  tops, pale on lit flanks, with stroke texture following the slope; their feet dissolve into the mist sea; distance
  is told only by fog (atmospheric perspective), never by blue.
- **Day scenes** are soft and slightly desaturated (sat ~0.8), warm-neutral, long soft shadows, a pale grey-green sky.
- **Interiors** are warm and lower key; paper windows glow.
- **Dark frames** (bracket set, the seasons diagram) go deep brown or night blue with gold / pale lines.
- A fine paper tooth and grain over everything; a light vignette.

## Values in this skill (`lib/look.js`)
| preset | bg / fog | fog near–far | sun | sat | chrome |
|---|---|---|---|---|---|
| paper | `#ebe7dd` | 30–520 | white 0.9, no shadow | 0.35 | ink |
| garden | `#d9dcd6` / `#d4d7d0` | 25–260 | `#fff3df` 2.2 | 0.82 | pale |
| interior | `#c8c3b6` | 18–160 | `#ffe8c8` 2.6 | 0.85 | pale |
| golden | `#d8c9a8` | 25–240 | `#ffd29a` 3.0, low | 0.9 | pale |
| hall | `#2c2620` | 12–90 | `#ffcf94` 3.2 | 0.9 | pale |
| night | `#1f2a38` / `#223042` | 20–300 | `#b8c8e8` 1.0 | 0.75 | pale |
| snow | `#e6e8ea` | 25–300 | `#f4f6ff` 1.4 | 0.6 | ink |
A set may override `fogNear`, `fogFar`, `bg`, `fog`, `sun: { az, el }`, `shadowR` (`F.set(name, build, { … })`).
Post: Khronos Neutral tone map (colours under ~0.76 pass unchanged, so paper stays paper), saturation / contrast /
warmth per preset, paper tooth + per-frame grain 0.06, vignette 0.35, MSAA 4.

## Sound of the source and here
The source's music was synthesised in Python: sparse plucked-string notes, a flute, a low bed, bells. This skill
synthesises the same family in JS (`lib/score.js`) so the live page and the MP4 share one score.
