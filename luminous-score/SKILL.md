---
name: luminous-score
description: Make a luminous score film — a printed orchestral or piano score lying in a dark misty room, seen low and raking, where every note head lights up in its voice's colour the instant it sounds, throws a coloured pool of light on the paper and fades into a glowing trail, while the camera glides along the system with the playhead and the sound is synthesised from the same notes. Give it a piece (public-domain repertoire typed from the score, a MIDI file, or music written for the film) and it designs the staves, a light colour per voice, the room (paper, fog, key light, snow or dust), the shots on the musical events, and renders a live page (plays in the browser, sound on demand), a WAV and a 1080p MP4. Use when asked to visualise music, to "see the music", a glowing / lit-up score, notes that light up as they play, a sheet-music animation, a score-following video, or a music visualisation for a classical piece ("악보가 빛나는 영상", "음표에 불이 들어오는", "음악을 눈으로 보는 영상", "악보 시각화", "클래식 음악 시각화", "이 곡으로 만들어줘", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "Vivaldi winter visualized", "animated sheet music", "score visualization"). Source — made from https://x.com/ThoNg676733/status/2119610929654469035?a=CTncbvpeXqVgLMNZlp0&s=19.
---

# luminous-score

A piece of music played as light on its own score. The score is engraved as one endless system lying on a sheet of
paper in a dark, misty room: staff lines, clefs, beams, rests, dynamics and a raised title, with the ink standing slightly
proud of the page. The camera glides low along it with the music. Each note head switches on like a small light when its
note sounds — in the colour of its voice — flares, lays a soft pool of colour on the paper and fades over a few seconds,
so fast passages leave glowing trails and slow harmony stands lit in columns. The sound is synthesised from the same
notes, so picture and sound share one clock. Give it a piece ("Bach's C-major prelude", "the slow movement of my string
quartet", a MIDI file) and it writes a brief, lays out the staves, gives each voice its light, designs the room and the
shots for the music's events, checks it and renders it.

Made in this repo after the post by 🎼🌺Music Love♥️ (@ThoNg676733) on X —
https://x.com/ThoNg676733/status/2119610929654469035?a=CTncbvpeXqVgLMNZlp0&s=19 — a 3 min 38 s film of Vivaldi's
"Winter" in which a printed orchestral score lies in a dark room and its notes light up, staff by staff in colour, as the
camera rides along (references/LOOK.md). This skill keeps that grammar and rebuilds it as an engine. The template
「First Snow」 is an original 14-bar allegro for strings; the worked example `examples/candle-prelude` (Bach, Prelude in C,
BWV 846, bars 1–19, piano, by candlelight) is a new topic designed from a brief. Never recreate the source's notes,
palette or edit.

**Fixed (the style)** — the printed score as the world: one endless system, time = distance (proportional spacing), real
notation (clefs, key and time signatures, beams by beat, rests, accidentals, ties, dynamics, names, bar numbers); ink in
relief and a raised title at the head of the page; a light per voice that switches on with the note (flare, HDR head,
pool on the paper) and fades into a trail; bloom; a dark room beyond the paper with fog, low mist and motes; a camera that
glides with the playhead, frames what sounds and changes only on musical events; sound synthesised from the notes;
1920×1080 at 30 fps.

**Designed per piece** — the music itself (what part, from where), the staves and how voices map to them (one per
staff, or several lines of counterpoint sharing a staff), the colour of each voice and which is the lead light, the trail
length, the room (paper, ink, air, fog, key light, mist, motes, bloom), the title lines, the tempo map, intro and
outro, every shot (which staves, angle, distance, lead, focus, blend) and the musical event it lands on, the synth,
pan and gain of each voice and the reverb. The template (a winter allegro) and the example (a candlelit prelude) are
examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/stage.js` | the engine: `Piece` (staves, voices, look, shots → the three.js room, paper tiles, 3D heads, light per note, pools, flares, coloured lights, mist, motes, bloom + vignette), the camera (shots, blends, fit), `runChecks`, `audioSpec`, the live player, the contract; `LOOKS` (`winter`, `candle`) |
| `lib/score.js` | the notation: text voices → events and notes, ties, chords, repeats, dynamics, ornaments; `add()`; `addMidi()`; keys, meters, tempo maps; instrument `RANGES` |
| `lib/engrave.js` | the engraver: one endless system — names, bracket, clefs, key / time signatures, bar lines and numbers, heads, stems, beams, flags, rests, accidentals, ledger lines, dots, ties, ornaments, dynamics; draws paper tiles with ink relief |
| `lib/synth.js` | the deterministic synth (strings, piano, pluck, flute, organ, horn, celesta, bell; reverb) → PCM / WAV, for the page and for Node |
| `lib/fonts/` | Noto Music (subset), Source Serif 4, Noto Sans KR 700 — SIL OFL |
| `lib/three.module.min.js`, `lib/jsm/` | three.js r170 + EffectComposer / UnrealBloomPass / OutputPass (MIT) |
| `templates/` | `piece.html` (「First Snow」, 38.8 s, 6 staves), `BRIEF.md` |
| `examples/candle-prelude/` | the worked example: `BRIEF.md`, `index.html` (75.3 s, grand staff, 3 voices) |
| `scripts/new-piece.mjs` | start a project from the template or `--from candle-prelude` |
| `scripts/check.mjs` | proves the page: loads clean, fonts, bar checks and parse errors, ranges, colours, shots, camera never under the paper, sounding notes and the focus voice on screen, notes not specks, frames not black / blown, something glows whenever something sounds, deterministic, audio not silent / NaN / late |
| `scripts/render.mjs` | stills, the contact sheet, the preview, the MP4 with sound (workers) |
| `scripts/audio.mjs` | the sound → WAV |
| `scripts/midi2score.mjs` | a MIDI file → JSON for `addMidi`, with a table of tracks |
| `scripts/browser.mjs` | opens a page in headless Chromium (shared by the scripts) |
| `references/` | **BRIEF** (piece → brief, still review) · **LOOK** (the source, observed) · **NOTATION** (writing notes, MIDI) · **ENGINE** (options, light, shots, contract) · **LESSONS** |

## Project layout (what you create)
```
my-piece/
  BRIEF.md       the piece written out (references/BRIEF.md) — written first
  piece.html     new Piece({...}) → P.voice / P.add / P.addMidi → P.check → P.start()
  lib/           copy of the skill's lib/ (new-piece.mjs); the page imports it through an import map ("ls/")
  *.score.json   (optional) a MIDI file converted by midi2score.mjs
  out/           stills, sheets, piece.wav, piece.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/render.mjs piece.html --sheet --scale .5`. Pages are ES
modules: view them through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. On SwiftShader a 960×540 frame
takes ~0.23 s; the 38.8 s template previews in ~4 min with 4 workers.

## Workflow
1. **Piece → brief.** Copy `templates/BRIEF.md` and fill it from the user's request (references/BRIEF.md): which piece and
   which bars, where the notes come from (typed from a public-domain score, a MIDI file, composed) and their rights, the
   one line, the staves and voices and the lead light, a colour per voice and why, the room, the tempo map, a shot per
   musical event, the sound. Save it as `BRIEF.md` before any code. If the user gives a reference clip, take stills
   (`ffmpeg -i ref.mp4 -vf fps=1/6,scale=480:-1,tile=4x6 sheet.jpg`) and read its colours, room and camera — then design
   your own for the piece.
2. **Start**: `node <skill>/scripts/new-piece.mjs my-piece` (or `--from candle-prelude`). Replace the title, voices,
   notes, look and shots with the brief's.
3. **Notes** (references/NOTATION.md). Text voices for melodies and parts (`P.voice('solo', 'e5:8 f5 … |')`, bar checks on
   every bar), a loop with `P.add` for patterns, `midi2score.mjs` + `P.addMidi` for a MIDI file. Add a `range` to every
   voice. Never invent notes and call them the composer's: if you are not sure of a passage, take it from a MIDI file or
   say it is simplified in the brief and on the title (`sub`).
4. **Check the notation**: `node <skill>/scripts/check.mjs piece.html` — fix every bar check, parse error and range
   error first. Then look at it straight down (a shot with `pitch: 89`, `--stills`): clefs, accidentals, beams, ties.
5. **Light and room.** Colours from the brief; `look` from a base with the brief's changes (references/ENGINE.md).
6. **Shots.** One per musical event (`bar:`), each with `z` (the staves it frames), yaw / pitch / dist, `lead`, `focus`
   (the voice that must stay in frame), `blend`. Let fit do the distance: `dist` is the closest it may come.
7. **Sheet and review**: `render.mjs piece.html --sheet --scale .5` (every shot just after it starts and settled), then
   ~10 moments full size (`--stills`), scored against the still review in references/BRIEF.md. Fix and re-render.
8. **Check**: `check.mjs piece.html` must end with `check OK` (warnings read and fixed or accepted on purpose). Add
   `P.check(name, fn)` for the piece's own rules.
9. **Render**: `render.mjs piece.html --preview` (960×540 with sound) to watch the motion against the music, then
   `render.mjs piece.html` → `out/piece.wav` + `out/piece.mp4`. Look at stills from the MP4 before handing it over.
10. **Live page** (if it goes on a site): ship `piece.html` with its `lib/`; it plays silently and loops, **♪ Sound on**
    synthesises the sound in the browser.

## Rules
- **Design for the piece.** Every staff, colour, room and shot comes from this piece and its brief. Do not reuse the
  template's winter palette and shots or the example's candle room unless the piece calls for exactly them; never
  recreate the source's piece, palette or edit.
- **One style.** The printed score is the world; ink in relief; lights are the note heads themselves (no particles
  replacing notes, no bars or waveforms); one room for the whole film; the camera glides, it never jumps or spins. A
  new piece changes the colours, the room's mood and the shots — not the grammar.
- **What sounds is seen.** Every note lights exactly when it sounds (same notes for picture and sound), and the camera
  frames the playhead: check.mjs fails a shot when the starting notes are off screen, and a `focus` voice whenever it plays.
- **Shots follow the music.** A shot changes on a musical event (an entry, a solo, a tutti, a cadence, the return), never
  on a timer; blends of 2–4 s, faster only for a sudden event.
- **The notes are right.** Bar checks pass on every bar; voices stay in their instruments' ranges; a public-domain score
  is typed faithfully or taken from MIDI, and anything simplified is said in the brief.
- **Rights.** Only public-domain compositions, the user's own music, or music they have licensed. The sound is
  synthesised; a real recording may replace the WAV only if the user has the right to it and it follows the tempo map.
- **Readable light.** Light colours (lightness ≥ 0.5), neighbouring staves in different hues, the paper darker than the
  light, no frame blown out — check.mjs measures it.
- **Pure function of t.** No `Math.random`, `Date` or state carried between frames: tiles, motes and drift are functions
  of t; check.mjs seeks away and back and compares pixels.

## Contract every piece page fulfils
`window.seek(t)` renders frame t (seconds); `window.renderAt(t)` the same; `window.DURATION`, `window.FPS` (30),
`window.SIZE = {W, H}` (1920×1080), `window.runChecks()` → `{ errors, warnings, info }`, `window.audioSpec()` (notes,
voices, reverb for `lib/synth.js`), `window.piece`, `window.READY = true` — all set by `P.start()`. `?render=1` = fixed
canvas, no player; `?t=12` = one frozen frame; `?scale=.5` = render size; `?texel=.5` = lighter paper tiles; `?paused`.
The frame is `#frame`.
