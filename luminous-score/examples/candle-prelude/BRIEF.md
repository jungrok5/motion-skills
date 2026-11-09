# Brief — Prelude in C by candlelight (the worked example)

A topic far from the source (an orchestral winter allegro): one keyboard, a slow pattern piece, warm light.

## 1 · The piece
- **Title / composer**: "Prelude in C" — *The Well-Tempered Clavier I · BWV 846 · bars 1–19* — J. S. Bach.
- **What part**: bars 1–19 (the opening, from C through the first wide arch back to C) — 76 beats at ♩ = 70, slowing
  to 64 and 56 over the last three bars → 66.6 s of music, 75.3 s in all.
- **Notes from**: typed from the score (public domain). Each bar is one five-note chord; the left hand holds the two
  lowest notes (bass a half note, tenor a sixteenth later), the right hand plays the upper three twice; the half bar
  repeats. Written as a table of 19 chords and a loop (`P.add`) — exact for these bars.
- **Rights**: public domain composition; synthesised sound.
- **Meter / key / tempo**: 4/4 · C major · `[[0, 70], [64, 64], [70, 56]]`.

## 2 · One line
A practice desk at night: a candle beside the open Bach, and each chord glows as it is played.

## 3 · Staves and voices
| staff | voices | role |
|---|---|---|
| right hand (treble) | `arp` — the broken chord, 16ths | **lead light**: the figure everyone knows |
| left hand (bass) | `tenor` (stem up), `bass` (stem down) | the held harmony; the bass's chromatic descent in bars 12–17 is the drama |

Three voices on two staves (not one per staff): a keyboard piece is read as hands, but heard as lines of harmony.

## 4 · Light
the arpeggio pale candle-gold `#ffe2a0` (bright, almost white, it is most of the light) · the tenor rose `#ff7a9c` ·
the bass deep amber `#ff9d2e` (the warm floor). Trail 3.2 s (slow music: each chord stays lit while the next is
played, so the harmony is visible as a glowing column), afterglow 0.5.

## 5 · The room
`look: { base: 'candle' }` — warm parchment paper, brown-black air, a low amber key like a candle off the page, faint
mist, dust motes in the air. Bloom a little stronger (0.95): candlelight halos.

## 6 · Time
intro 4.2 s looking down at the title · outro 4.5 s on the last chord · the ritardando as two tempo steps.

## 7 · Shots
| when | z | angle | why |
|---|---|---|---|
| 0 s | title | looking down (pitch 52) | the page on the desk |
| 2.4 s | title | settle to pitch 34 | read the title |
| bar 1 | all | reading angle, pitch 34 | the first chords (focus arp) |
| bar 5 | all | low and long, yaw 50 | the pattern settles in; look down the system |
| bar 9 | right hand | closer, pitch 26 | the arpeggio (focus arp) |
| bar 12 | left hand | raking from the side, yaw 62, looking back | the bass begins to fall chromatically (focus bass + tenor) |
| bar 16 | all | rise to pitch 44 | it settles home |
| bar 19 | all | look straight down (pitch 62), back over the trail | the last C chord |

## 8 · Sound
piano for all three; the arpeggio rings on 0.5 s (a pedal), the bass a little louder; pan bass left, arpeggio right;
reverb 0.3, size 0.86 — a wooden room.
