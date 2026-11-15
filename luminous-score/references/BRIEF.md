# Brief — from a piece of music to a luminous-score film

Write the brief before any code, as `BRIEF.md` in the project (copy `templates/BRIEF.md`). Every decision below is made
for *this* piece: the template ("First Snow", a winter allegro for strings) and the worked example (Bach's C-major
prelude by candlelight) are examples of the style, not presets to pick from.

## 1 · The piece

| field | what to write |
|---|---|
| title / composer | as it should be engraved (`title.text`, `title.by`); the line under it (`title.sub`) |
| what part | bars a–b, or the whole movement; the length it gives (bars × beats ÷ tempo) — 30–90 s reads best, 3–4 min is fine for a full piece |
| where the notes come from | typed from a score you know (public domain), a MIDI file (`scripts/midi2score.mjs`), or composed for the film. Say which, and whether it is exact or simplified |
| rights | the composition must be public domain, the user's own, or licensed. The sound is synthesised from the notes, so no recording is used |
| meter / key / tempo | `meter`, `key` (the engraved signature), `tempo` — a number or `[[beat, bpm], …]` for a ritardando or a new section |

## 2 · One line

What should the film feel like? "A winter storm told by six lights", "a candle on a practice desk". The look, the colours
and the camera all come from this line.

## 3 · Staves and voices

- **Staves**, top to bottom, in score order (woodwinds, brass, percussion, keyboards, solo, strings — or the
  instrument's own staves: a piano is two). Each: `id`, `name` (engraved at the left), `clef` (treble / treble8 / alto /
  tenor / bass), `gap` below it.
- **Voices** — what lights up. One per staff for an ensemble; for a keyboard or a fugue, several per staff (`staff`,
  `stem: 'up' | 'down'`) so each line of counterpoint gets its own light. Each: `color`, `synth`, `range` (instrument name
  for the range check), `pan`, `gain`, `section` (a section, detuned), `ring` (let it sound on, like a pedal).
- Say which voice is the **lead light** (the melody, the soloist, the subject) — shots focus it.

## 4 · Light

A colour per voice, chosen for this piece, and why: the instrument's character, its register, its role. Rules that make
it read:
- light colours (HSL lightness ≥ 0.5); the check warns on dark ones — a dark colour never glows;
- neighbours on different staves clearly different (hue, not only lightness);
- one voice may be white or near-white; the lead light is usually the most saturated;
- `trail` (seconds a played note keeps glowing) — longer for slow, sustained music (3–4 s), shorter for fast music
  (1.5–2.5 s) so the trail does not smear; `afterglow` (how bright it stays after release).

## 5 · The room

`look` — start from a base (`winter`, `candle`) and change what the piece asks for:
`paper`, `ink`, `room` (the air beyond the page), `fog` + `fogDensity` (how far you see), `key` + `keyIntensity` (the
cold or warm light raking the page), `ambient`, `mist`, `motes` (`snow` / `dust` / `embers` / `none`, count, colour),
`bloom`, `exposure`, `vignette`. Tie each to the one line: a storm wants denser fog and snow, a nocturne a warm low key
and dust, a fanfare a brighter room.

## 6 · Time

`intro` (seconds on the title before the first note, 2.5–4.5), `outro` (after the last note, while the glow fades,
3–5), the tempo map. A fermata or a ritardando is a tempo step.

## 7 · Shots

One row per musical event, never on a timer: an entry, a solo, a tutti, a modulation, the return, the last chord.

| bar | z (which staves) | yaw / pitch / dist | lead | focus | why |
|---|---|---|---|---|---|
| title | `title` | high, close | – | – | the engraved title |
| 1 | the first voice's staves | low, raking | 0.2 | cello | it starts alone |
| … | | | | | |

- `z` is the stretch of staves the camera frames at the playhead: a staff id, a list of ids, or `all`.
- `dist` is the closest it may come; it backs off until the playhead's stretch and the last half second fit (`fit`).
- low pitch (10–16°) = raking, dramatic, the staves converge; high (30–60°) = reading the page; yaw 20–50° looks along
  the system; small yaw looks across it. `lead` > 0 looks ahead, < 0 back over the trail (good on a last chord).
- `blend` 2–4 s for a glide, 1–1.6 s for a sudden event, `cut: true` only when the music cuts.
- 5–9 shots a minute. Never let two consecutive shots look alike.

## 8 · Sound

A synth per voice (`strings`, `piano`, `pluck` = harpsichord / harp / guitar, `flute`, `organ`, `horn`, `celesta`,
`bell`), the pan across the stereo field as the players would sit, gains so the lead voice leads, `audio.reverb` (mix,
size, damp) for the room. It is a sketch of the piece, not a recording — say so if the user expects a performance; they
can replace the WAV with a licensed recording that follows the same tempo map.

## Still review (score the sheet and ~10 full-size stills)

Each still passes or is fixed:
1. **What sounds is lit and on screen** — the flare is on the notes you hear; the lead light is in frame when it plays.
2. **The score reads as a score** — staves, clefs, beams, bar lines legible; no note heads floating off their staff;
   accidentals clear of bar lines.
3. **Light, not paint** — the lit notes glow (bloom, pool on the paper), the paper stays darker than the light; no frame
   blown to white, none black.
4. **Colours tell the voices apart** — you can follow one line by its colour across the frame.
5. **The camera moves with the music** — each shot change lands on a musical event; the playhead is never lost in a blend.
6. **One room** — the paper, ink, fog and motes are the same in every shot; the title is engraved in the same ink.
7. **The ending lands** — the last chord is framed and still glowing when the film ends.
