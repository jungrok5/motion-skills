# Notation — writing the notes

Three ways in, all ending in the same `Score` (`lib/score.js`). Beats are quarter notes from the start of the music.

## 1 · Text voices — `P.voice(id, text)`

```js
P.voice('solo', `(R |)*4
  !mf d5:16 f5 a5 d6 a5 f5 d5 a4 d5 f5 a5 d6 f6:8 e6 |
  e5:16 a5 c#6 e6 g6 e6 c#6 a5 e6:4^tr d6:8 c#6 |
  <d4 f4 a4>:2 r:4 !p d4~ | d4:4 r r:2 | d6:1^fe |`);
```

| write | means |
|---|---|
| `c4` `f#5` `bb3` `e##4` `bn4` | pitch: letter, accidental (`#` `b` `##` `bb` `x` `n`), octave (C4 = middle C). **Absolute**: `b4` is B natural even in F major; the engraver adds and drops accidentals against the key and the bar |
| `:4` `:8.` `:16` `:2..` `:8t` | duration: 1 2 4 8 16 32 64, dots, `t` = triplet. It **sticks** until the next `:` |
| `r` · `R` · `R*3` | rest (current duration) · a whole-bar rest · three of them |
| `<c4 e4 g4>:2` | chord |
| `~` after a note | tie to the next note of the same pitch (one sound, two heads) |
| `( … )*n` | repeat (nests) — `(d3:8)*8` is a bar of pulsing eighths |
| `\|` | bar check: fails the check if the bar is not full. `\|\|` engraves a double bar |
| `!p` `!mf` `!ff` … | dynamics — engraved under the staff, and the velocity of the notes that follow (sound and nothing else) |
| `!cresc.` `!dolce` `!rit.` | words under the staff (`_` for a space) |
| `^tr` `^st` `^ac` `^fe` | trill (sounded), staccato (shortened), accent (louder), fermata — engraved and sounded |
| `% …` | comment to the end of the line |

A voice can be written in several calls; each continues where the last stopped (`{ at: beat }` to jump).

## 2 · Programmatic — `P.add(voice, beat, dur, pitches, opts)`

For patterns (an Alberti bass, a prelude's arpeggio, an ostinato) write a loop: the worked example plays all 19 bars of
Bach's C-major prelude from a table of five-note chords. `pitches` = `'c4'`, `['c4','e4']`, MIDI numbers, or `null` for a
rest. `opts`: `{ dyn, words, orn: ['tr'], tie, vel }`. Durations need not be notatable — the engraver splits them at bar
lines and beats and ties the parts (1.75 beats from an offbeat → a quarter tied to a dotted eighth).

## 3 · MIDI — `scripts/midi2score.mjs` + `P.addMidi(json, { track, voice })`

```bash
node <skill>/scripts/midi2score.mjs piece.mid --grid 16      # → piece.score.json, and a table of tracks
```
```js
const json = await (await fetch('piece.score.json')).json();
const P = new Piece({ tempo: json.tempo, meter: json.meter, key: 'g minor', voices: [...] });
P.addMidi(json, { track: 1, voice: 'solo' }).addMidi(json, { track: 2, voice: 'vln1' });
```
Starts and lengths snap to the grid (16 = sixteenths; 12 for eighth-note triplets, which then engrave as plain values).
Pitches are spelled from the key (sharps in sharp keys, flats in flat keys). Notes that start together with the same
length become a chord. Check the result with the top-down still (`render.mjs --stills` on a shot with `pitch: 89`) — a
MIDI file performed by hand quantises badly; a notation export (MuseScore, Sibelius, IMSLP's MIDI) is clean.

## Engraving, in short

One endless system: names, bracket, clef, key and time signature at the left, then bar after bar. x = beat × U (`layout.U`,
default 1.15 world units a beat), one staff space = `layout.S` (0.11). Stems follow the middle line (or `stem` on a voice
that shares a staff); eighths and shorter are beamed by beat (by dotted quarter in 6/8, 9/8, 12/8), seconds in a chord
flip to the other side of the stem, ledger lines, dots, ties, flags, rests by value, whole-bar rests centred. It is
proportional, not a publisher's engraving: no cross-staff beams, no tuplet brackets beyond triplets, no slurs, no
grace notes, no tremolo signs. When the piece needs them, simplify the notation (the sound can still carry the detail).
