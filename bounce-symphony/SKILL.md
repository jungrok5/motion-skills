---
name: bounce-symphony
description: Make a bouncing-ball symphony — a Rube Goldberg music machine on a dark studio floor where balls bounce from pad to pad (marimba bars, glockenspiel and vibraphone keys, bowls, gongs, cymbals, drums, kalimba tines on thin poles), every bounce striking exactly one note of the music on its beat, the struck pad glowing and rocking — and where nothing starts by itself: a starter hammer knocks the first domino lines; struck pads swing push rods into floor dominoes; balls landing in cups tip them and roll down helix towers into more dominoes; branching domino lines run across the floor to levers that pull strings to trap-door droppers or spring mousetrap catapults that fling balls up to their first pad; long notes are bridged by funnels and rolling rails. The machine is designed backwards from the score (each pad placed and tilted for a real ballistic flight; every cause chain's dominoes, helix turns and rails solved to end exactly when its ball must leave) and proved by an independent forward physics simulation; the sound is synthesised from the same strikes and clicks. Give it a topic or a piece (music written for the film, the user's own, or public-domain) and it writes a brief, composes or sets the music in lanes, designs the instruments, the machine's layout, the room and the shots, checks it and renders a live page, a WAV and a 1080p MP4. Code-only. Use when asked for a bouncing-ball music video, a Rube Goldberg / marble music machine, a domino chain-reaction music machine, an Animusic-like music machine, balls that play notes, a physics music visualisation ("튕기는 공의 교향곡", "공이 튕기며 연주하는 영상", "루브골드버그 음악 기계", "공이 떨어지며 음악을 연주", "물리 시뮬레이션 음악 영상", "골드버그 머신", "도미노 연쇄 반응", "맞물려 동작하는 기계", "마림바 공 튕기기", "이 스타일로 ○○ 만들어줘", "주제만 바꿔서", "bouncing ball symphony", "music machine", "marble music machine"). Source — made from https://www.facebook.com/share/v/1DwMH4wj7u/.
---

# bounce-symphony

A piece of music played by a machine that seems to have been built for it. Thin poles stand on a dark studio floor in a
pool of soft overhead light, each holding one pad — a marimba bar, a glockenspiel key, a bowl, a gong — tilted a few
degrees. When a phrase begins a ball is set free, and every time it lands it strikes the next note of the music, exactly
on the beat: the pad flashes with light in the colour of its pitch, rocks and rings, and the ball flies on in a clean arc
to the next pad; before a long note it drops into a funnel and rolls down a little rail, leaving the end just in time.
When the phrase ends the ball drops into a cup. **And nothing starts by itself.** A little hammer swings onto a plate
and the first domino lines run off across the floor; a domino line ends on a lever that pulls a string to a trap door, or
on the trigger of a mousetrap catapult that flings the next ball up to its pad. A struck pad swings a push rod into the
next line; a ball landing in a cup tips it and rolls down a helix tower into another; lines branch. Every lane sets off
the others — a canon of causes under the canon of notes. Give it a topic ("a lullaby for a lighthouse", "a march for a
robot factory", "my band's chorus") and it writes a brief, composes or sets the music, designs the instruments, the
machine, the room and the shots, checks it and renders it.

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
trap-door droppers or mousetrap catapults and caught in cups; every release set off by a chain of causes (starter hammer,
push rods, tipping cups and helix towers, branching floor domino lines, levers and strings) solved to the millisecond;
rails for long notes; a struck pad flashes in its pitch's light, rocks and rings; bloom and depth of
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
| `lib/machine.js` | the machine: `parseNotes` (text notes, sticky durations, bar checks, repeats), layouts (`spiral`, `arc`, `zigzag`, `path`), instrument kinds (`KINDS`: shape, size by pitch, restitution), `solveMachine` (score → runs → pads, droppers / catapults, rails for long notes, cups, balls: inverse ballistics), `ballAt` (where a ball is at t), `simulate` (independent event-driven forward simulation), `clearance` (nothing passes through anything) |
| `lib/mechanisms.js` | the causes: `planCauses` (every start gets a chain — the previous run's cup tipping into a helix, a struck pad's push rod, a branch off a line already laid, or the starter hammer — and a floor domino line routed round everything standing on the floor, its count, height and spacing solved to end exactly on time; levers, strings over pulleys, cords), `dominoAngle` |
| `lib/stage.js` | the world: `Piece` (three.js studio, pads by kind, poles and feet, droppers with trap doors, cups, balls, glow and rocking, the camera's shots, blends and cuts, depth of field and bloom), `runChecks`, `audioSpec`, the live player, the contract; `LOOKS.studio` |
| `lib/synth.js` | the deterministic modal synth (marimba, xylophone, vibraphone, glockenspiel, steelpan, bowl, gong, cymbal, drum, woodblock, kalimba; latch and catch sounds; reverb) → PCM / WAV, for the page and for Node |
| `lib/three.module.min.js`, `lib/jsm/` | three.js r170 + EffectComposer, RenderPass, BokehPass, UnrealBloomPass, OutputPass, RoomEnvironment (MIT, `lib/THREE-LICENSE`) |
| `templates/` | `piece.html` (「Marble Canon」, 35.7 s, 4 lanes, 171 pads, 23 balls, 23 domino lines, 10 helix towers, 9 catapults), `BRIEF.md` |
| `examples/lighthouse-lullaby/` | the worked example: `BRIEF.md`, `index.html` (31.7 s, 3/4, 4 lanes, 100 pads, 25 balls, 25 domino lines, 12 helix towers, 13 catapults) |
| `scripts/new-piece.mjs` | start a project from the template or `--from lighthouse-lullaby` |
| `scripts/check.mjs` | proves the piece: bar checks, every note has a pad, every release has a cause that arrives within 2 ms, the forward simulation (each strike within 2 ms on its own pad, nothing else touched), nothing built through anything, pad tilt, the camera (balls in play on screen, never through a pad), frames not black / blown, strikes visibly light, deterministic, audio not silent / NaN / late |
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

Requirements: Node + Playwright Chromium, ffmpeg. No npm install, no GPU, no API keys. Solving the machine and planning
its causes takes 2–5 s when a page loads. On SwiftShader a 1920×1080 frame takes ~1.3 s (960×540 ~0.3 s); a 35 s piece
renders in ~6 min at 1080p with 4 workers. check.mjs takes ~20 s.

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
4. **Starts and causes.** Choose how each lane's balls start (`start: 'drop' | 'catapult' | 'alternate'`) and leave
   `rails` on so long notes roll instead of needing new balls. The engine gives every start a cause (references/ENGINE.md
   §Causes); you design where the starter hammer stands (`starter: { at }`) and leave the lanes room on the floor.
5. **Solve and prove**: `node <skill>/scripts/check.mjs piece.html`. Fix every solver error first ("cannot reach",
   "tilts", "no pad"), then every physics error (a ball that hits another pad, a pole, a post or the floor — move or
   turn that lane's layout, raise its `top`, change `speed`), then clearance ("runs through"). Read the summary: pads and
   balls per lane, the machine line (droppers, catapults, rails, helix towers, push rods, domino lines, causes by kind),
   the steepest pad, the footprint. "No cause" means the floor is walled in: move a lane, the starter, or give the lane a
   different start. Never loosen a check to pass; change the music, the layout or `e`.
6. **Look**: `look` from `LOOKS.studio` with the brief's changes — floor, background, key, fill, bloom, depth of field,
   the pitch palette — and each instrument's body (references/ENGINE.md §Look).
7. **Shots.** One per musical event (an entry, a new section, a climax, the cadence): `follow` the lane that carries the
   music (close, 0.5–1.2 m), `follow` a `cause` (a lane or `'starter'`) to ride a chain — the domino wave's front, the
   ball in its helix — in the seconds before that lane's next ball leaves, `orbit` to show the whole machine, `fixed` /
   `move` for a designed angle. Near subjects glide,
   far ones cut by themselves (`maxGlide`).
8. **Sheet and review**: `render.mjs piece.html --sheet --scale .5` (every shot just after it starts and settled), then
   ~10 moments full size (`--stills`), scored against the still review in references/BRIEF.md. Fix and re-render.
9. **Check** again: `check.mjs piece.html` must end with `check OK` (warnings read and fixed or accepted on purpose).
10. **Render**: `render.mjs piece.html --preview` (960×540 with sound) to watch every bounce against its note, then
   `render.mjs piece.html` → `out/piece.wav` + `out/piece.mp4`. Look at stills from the MP4 before handing it over.
11. **Live page** (if it goes on a site): ship `piece.html` with its `lib/`; ▶ synthesises the sound in the browser and
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
- **Nothing starts by itself.** Every dropper and catapult is set off by a chain that starts at the starter hammer or at
  an earlier event of the machine (a strike, a cup), carried by dominoes, helices, levers and strings whose numbers are
  solved for the delay; no timers, no hidden motors. check.mjs fails a start without a cause or one that arrives late.
  Domino speed stays in the measured range (spacing 0.25–0.85 h).
- **A machine you could build.** Nothing passes through anything (`clearance`, and the domino lines are routed round every
  foot, tower and line already on the floor); pads tilt ≤ 42°; every ball starts on a dropper or catapult and ends in a
  cup (or rolls on as a relay); poles stand on the floor.
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
