---
name: bounce-symphony
description: Make a bouncing-ball symphony — a Rube Goldberg music machine on a dark studio floor where balls drop from little trap-door droppers and bounce from pad to pad (marimba bars, glockenspiel and vibraphone keys, bowls, gongs, cymbals, drums, kalimba tines on thin poles), every bounce striking exactly one note of the music on its beat, the struck pad glowing and rocking, each ball landing in a cup when its phrase ends. The machine is designed backwards from the score (each pad is placed and tilted so a real ballistic flight with real restitution reaches the next pad exactly on the next note) and then proved by an independent forward physics simulation; the sound is synthesised from the same strikes. Give it a topic or a piece (music written for the film, the user's own, or public-domain) and it writes a brief, composes or sets the music in lanes, designs the instruments, the machine's layout, the room and the shots, checks it and renders a live page, a WAV and a 1080p MP4. Code-only. Use when asked for a bouncing-ball music video, a Rube Goldberg / marble music machine, an Animusic-like music machine, balls that play notes, a physics music visualisation ("튕기는 공의 교향곡", "공이 튕기며 연주하는 영상", "루브골드버그 음악 기계", "공이 떨어지며 음악을 연주", "물리 시뮬레이션 음악 영상", "마림바 공 튕기기", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "bouncing ball symphony", "music machine", "marble music machine"). Source — made from https://www.facebook.com/share/v/1DwMH4wj7u/.
---

# bounce-symphony

A piece of music played by a machine that seems to have been built for it. Thin poles stand on a dark studio floor in a
pool of soft overhead light, each holding one pad — a marimba bar, a glockenspiel key, a bowl, a gong — tilted a few
degrees. Balls wait on little trap-door droppers. When a phrase begins a door swings open, the ball falls, and every time
it lands it strikes the next note of the music, exactly on the beat: the pad flashes with light in the colour of its
pitch, rocks and rings, and the ball flies on in a clean arc to the next pad. When the phrase ends the ball drops into a
cup and stays there. Fast notes are little hops along a spiral of bars; a long note needs a fresh ball from higher up.
Give it a topic ("a lullaby for a lighthouse", "a march for a robot factory", "my band's chorus") and it writes a
brief, composes or sets the music, designs the instruments, the machine, the room and the shots, checks it and renders it.

Made in this repo after the 60-second film 「튕기는 공의 교향곡 (루브골드버그 머신 + 음악)」 by Seung Joon Choi, shared on
Facebook — https://www.facebook.com/share/v/1DwMH4wj7u/ — in which Claude composed the music, simulated the machine in
MuJoCo, played it in three.js and finally rendered it with a path tracer written for the purpose: coloured balls bounce
over spirals of bars and discs on tall poles in a grey studio, each bounce a note at 100 bpm (references/LOOK.md). This
skill keeps that grammar — the score is the machine, physics is the timing — and rebuilds it as a code-only engine that
designs the machine backwards from the notes and proves it forwards. The template 「Marble Canon」 is an original 12-bar
piece in D major; the worked example `examples/lighthouse-lullaby` (a 3/4 lullaby, a cone of vibraphone bars, a night-blue
room) is a new topic designed from a brief. Never recreate the source's music, layout or edit.

**Fixed (the style)** — a machine on a seamless studio floor under one soft overhead key; one pad per note, struck once,
by a ball, exactly on the note's time; real ballistic flights (g = 9.81 m/s², frictionless bounce, restitution per
instrument) found by inverse design and proved by forward simulation; pads on thin poles with feet, balls released by
trap-door droppers and caught in cups; a struck pad flashes in its pitch's light, rocks and rings; bloom and depth of
field; a camera that follows the ball that is playing, glides between near subjects and cuts between far ones; no
on-screen text; sound synthesised from the strikes (loudness from the impact speed); 1920×1080 at 30 fps.

**Designed per topic** — the music itself (written for the film, the user's, or public domain; key, meter, tempo, form),
how it splits into lanes (one line of notes each, monophonic), the instrument of each lane (kind, body colour, size,
restitution), the machine's layout (spirals, arcs, zigzags, drawn paths; where each lane stands and how tall), the colour
of each lane's balls, the room (floor, background, key light, fill, bloom, depth of field, the pitch palette of the glow),
every shot and the musical event it lands on, the mix (gains, reverb). The template (a canon on four rings) and the example
(a lighthouse lullaby) are examples of the style, not menus.

## What's in this folder
| path | what |
|---|---|
| `lib/machine.js` | the machine: `parseNotes` (text notes, sticky durations, bar checks, repeats), layouts (`spiral`, `arc`, `zigzag`, `path`), instrument kinds (`KINDS`: shape, size by pitch, restitution), `solveMachine` (score → runs → pads, droppers, cups, balls: inverse ballistics), `ballAt` (where a ball is at t), `simulate` (independent event-driven forward simulation), `clearance` (nothing passes through anything) |
| `lib/stage.js` | the world: `Piece` (three.js studio, pads by kind, poles and feet, droppers with trap doors, cups, balls, glow and rocking, the camera's shots, blends and cuts, depth of field and bloom), `runChecks`, `audioSpec`, the live player, the contract; `LOOKS.studio` |
| `lib/synth.js` | the deterministic modal synth (marimba, xylophone, vibraphone, glockenspiel, steelpan, bowl, gong, cymbal, drum, woodblock, kalimba; latch and catch sounds; reverb) → PCM / WAV, for the page and for Node |
| `lib/three.module.min.js`, `lib/jsm/` | three.js r170 + EffectComposer, RenderPass, BokehPass, UnrealBloomPass, OutputPass, RoomEnvironment (MIT, `lib/THREE-LICENSE`) |
| `templates/` | `piece.html` (「Marble Canon」, 35.7 s, 4 lanes, 171 pads, 26 balls), `BRIEF.md` |
| `examples/lighthouse-lullaby/` | the worked example: `BRIEF.md`, `index.html` (31.7 s, 3/4, 4 lanes, 100 pads, 28 balls) |
| `scripts/new-piece.mjs` | start a project from the template or `--from lighthouse-lullaby` |
| `scripts/check.mjs` | proves the piece: bar checks, every note has a pad, the forward simulation (each strike within 2 ms on its own pad, nothing else touched), nothing built through anything, pad tilt, the camera (balls in play on screen, never through a pad), frames not black / blown, strikes visibly light, deterministic, audio not silent / NaN / late |
| `scripts/render.mjs` | stills, the contact sheet, the preview, the MP4 with sound (workers) |
| `scripts/audio.mjs` | the sound → WAV |
| `scripts/browser.mjs` | opens a page in headless Chromium (shared by the scripts) |
| `references/` | **BRIEF** (topic → brief, still review) · **LOOK** (the source, observed) · **ENGINE** (the solver's maths, every option, shots, contract) · **LESSONS** |

## Project layout (what you create)
```
my-piece/
  BRIEF.md       the piece written out (references/BRIEF.md) — written first
  piece.html     new Piece({ bpm, meter, instruments, lanes, look, shots, mix }) → piece.mount()
  lib/           copy of the skill's lib/ (new-piece.mjs); the page imports it through an import map ("bs/")
  out/           stills, sheets, piece.wav, piece.mp4 (not committed)
```
Run every script from the project root: `node <skill>/scripts/check.mjs piece.html`. Pages are ES modules: view them
through a local server (`python3 -m http.server`); the scripts pass Chromium the flag for file:// modules.

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. On SwiftShader a 1920×1080 frame
takes ~1 s (960×540 ~0.25 s); a 35 s piece renders in ~5 min at 1080p with 4 workers. check.mjs takes ~10 s.

## Workflow
1. **Topic → brief.** Copy `templates/BRIEF.md` and fill it from the user's request (references/BRIEF.md): the one line,
   the music (written for the film / the user's / public domain — and its rights), key, meter, tempo, form and the
   musical events; the lanes (which line of the music each plays, on which instrument, what kind of motion it makes —
   hops on a spiral, a cascade, a long arc); the machine's plan (where each lane stands, how high it starts, what the whole
   looks like from above — a canon of rings, a lighthouse cone, a city of towers); the room; a shot per musical event; the
   mix. Save it as `BRIEF.md` before any code. If the user gives a reference clip, take a contact sheet
   (`ffmpeg -i ref.mp4 -vf fps=1/4,scale=480:-1,tile=4x4 sheet.jpg`) and read its room, pads and camera — then design your own.
2. **Start**: `node <skill>/scripts/new-piece.mjs my-piece` (or `--from lighthouse-lullaby`). Replace the title, tempo,
   meter, instruments, lanes, look and shots with the brief's.
3. **Music in lanes** (references/ENGINE.md §Notes). One lane = one monophonic line: `notes: 'd4:8 a4 d5 f#5 | …'`,
   bar lines on every bar (they are checked), `[ … ]*n` for repeats, rests `r:2.`. A chord is several lanes. Write music
   that suits balls: running eighths and sixteenths chain on one ball; long notes each need their own ball.
4. **Solve and prove**: `node <skill>/scripts/check.mjs piece.html`. Fix every solver error first ("cannot reach",
   "tilts", "no pad"), then every physics error (a ball that hits another pad, a pole, a post or the floor — move or
   turn that lane's layout, raise its `top`, change `speed`), then clearance ("runs through"). Read the summary: pads and
   balls per lane, the steepest pad, the footprint. Never loosen a check to pass; change the music, the layout or `e`.
5. **Look**: `look` from `LOOKS.studio` with the brief's changes — floor, background, key, fill, bloom, depth of field,
   the pitch palette — and each instrument's body (references/ENGINE.md §Look).
6. **Shots.** One per musical event (an entry, a new section, a climax, the cadence): `follow` the lane that carries the
   music (close, 0.5–1.2 m), `orbit` to show the whole machine, `fixed` / `move` for a designed angle. Near subjects glide,
   far ones cut by themselves (`maxGlide`).
7. **Sheet and review**: `render.mjs piece.html --sheet --scale .5` (every shot just after it starts and settled), then
   ~10 moments full size (`--stills`), scored against the still review in references/BRIEF.md. Fix and re-render.
8. **Check** again: `check.mjs piece.html` must end with `check OK` (warnings read and fixed or accepted on purpose).
9. **Render**: `render.mjs piece.html --preview` (960×540 with sound) to watch every bounce against its note, then
   `render.mjs piece.html` → `out/piece.wav` + `out/piece.mp4`. Look at stills from the MP4 before handing it over.
10. **Live page** (if it goes on a site): ship `piece.html` with its `lib/`; ▶ synthesises the sound in the browser and
    plays it with the picture; the scrubber seeks.

## Rules
- **Design for the topic.** The music, the instruments, the machine's plan, the room and the shots come from this topic
  and its brief. Do not reuse the template's canon and rings or the example's lighthouse unless the topic calls for
  exactly them; never recreate the source film's music, layout or edit.
- **One style.** A machine on a studio floor; pads on poles, droppers, cups; one pad per note, struck once; balls in real
  flight; a struck pad glows and rocks; one room and one key light for the whole film; no text on screen. A new topic
  changes the music, the machine's shape, the colours and the shots — not the grammar.
- **Physics is the clock.** Every note is the instant a ball lands on its pad — no keyframed balls, no balls that
  teleport, slow down or speed up, no pads that move to meet a ball. The solver finds the machine; `simulate` must prove
  it (each strike within 2 ms, on its own pad, nothing else touched). Restitution stays physical (`e` ≤ 0.95): a phrase
  that cannot be chained is split into more balls, not cheated.
- **A machine you could build.** Nothing passes through anything (`clearance`); pads tilt ≤ 42°; every ball starts on a
  dropper and ends in a cup; poles stand on the floor.
- **What plays is seen.** Shots follow the music and frame the ball that is playing; check.mjs fails a shot when the
  balls in play leave the frame or the lens passes through a pad. Shots change on musical events, not on a timer.
- **What you see is what you hear.** The sound is rendered from the same strikes (time, pitch, instrument, loudness from
  the impact speed, pan from position); the latch and catch sounds are the machine's own.
- **The notes are right.** Bar checks pass; lanes stay in their instruments' ranges; music is written for the film, the
  user's own, or public domain — say which in the brief.
- **Pure function of t.** No `Math.random`, `Date` or state carried between frames; check.mjs seeks away and back and
  compares pixels.
- **Code-only.** No generated video, image, voice or music; no downloaded models or motion. ElevenLabs or any other paid
  generator only after the owner says yes for that request (CLAUDE.md) — the default sound is the synth.

## Contract every piece page fulfils
`window.seek(t)` renders frame t (seconds); `window.DURATION` (last cup + outro), `window.FPS` (30),
`window.runChecks()` → `{ errors, warnings, info }`, `window.audioSpec()` (strikes for `lib/synth.js`), `window.piece`,
`window.READY = true` — all set by `piece.mount()`. `?render=1` = fixed 1920×1080 canvas (times `?scale=`), no player;
`?t=12` = one frozen frame. The frame is the canvas `#frame`.
