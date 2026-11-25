# The sound (scripts/score.py)

Everything is synthesized from `timeline.json`, so every sound sits on the frame its part lands on.

## Landings

Parts landing in the same grid slot and stage share one hit (the example: 2,029 parts -> 132 hits). A hit is the
stage's voice, louder with the count (`0.5 + 0.22 * log2(1 + n)`), layered 2-3 times 11 ms apart for big slots,
panned by where those parts are on screen (the camera's right vector from the timeline).

| voice | what it is | for |
|---|---|---|
| `stone_heavy` | a pitched-down thump + grit | plinths, footings |
| `stone` | a click band-passed 0.7-3.2 kHz + a short modal body | walls laid stone by stone |
| `stone_light` | the same an octave-ish higher | field walls, paths, small stones |
| `wood` / `wood_light` | four damped modes (hollow) + a tick | posts and beams / boards, floors |
| `paper` | high band-passed noise, slow attack | lattice paper, shoji, hanji, light panels |
| `straw` | rustling band-passed noise | thatch, reeds, leaves |
| `metal` | inharmonic modes, long | sheet roofs, fittings |
| `glass` | two high modes | glazing |
| `soft` | a low muffled thud + a faint tick | cushions, cloth, small furniture |

On the wave: a riser over the bar before it, a crash and a low boom on it, an open chord swelling over 3 s. The
lights click as each comes on. After the wave: low wind and a few birds.

## The score

Composed in code at the film's tempo: one chord per bar (D minor: Dm - Bb - F - C in the example; change `compose()`
for another key or mood), a soft pad whose filter opens through the build, a plucked bass on each downbeat, a soft
kick on every beat growing towards the wave, the swell on it, then a plucked pentatonic line (Karplus-Strong) over the
held chords and a fade over the last 1.4 s.

## A track of your own

`python3 score.py pbf-out/<name> --analyse track.wav` prints its tempo, first downbeat and swell (the biggest 2 s rise
in loudness). Put that tempo in `film.json` (`bpm`, `downbeat`) so the landings hit its beats, re-run `film.py --plan`,
then `score.py pbf-out/<name> --music track.wav [--swell 14.0]`: the track starts so that its swell lands on the wave
(the post measured 92.5 BPM and cut on the downbeats; blueprint's track swelled at 14.0 s against a wave at 13.4 s and
started 0.65 s in). The person licenses their track. Music from a generator (ElevenLabs, Suno …) is used only after
the owner says yes for that request - which service and model, how many takes, rough cost - and stays out of the repo.

## Loudness

Mastered to **-14 LUFS integrated** (ITU-R BS.1770-4: K-weighting, 400 ms blocks with 75 % overlap, the -70 LUFS
absolute and -10 LU relative gates) with a **true peak at or under -1 dBTP** (4x oversampled). The limiter's ceiling is
lowered until both hold, because normalising after limiting pushes inter-sample peaks back over. `check.py` measures
the written file again.
