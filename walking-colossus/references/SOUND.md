# SOUND — the soundtrack

`scripts/audio.mjs` builds the soundtrack from the same closed-form gait and shot cameras as the picture, so every
footfall lands on its frame. It **synthesises** everything by default (no recordings needed): this keeps the skill
offline and free of licences. The source film used downloaded recordings (freesound CC0 effects, a CC-BY score by
Scott Buckley) placed by a script; that path is still open through `SOUND.samples`.

## What is placed where

| event | voices | shaped by |
|---|---|---|
| touchdown | a falling sine body + sub (weight), a noise burst filtered by the ground type (`mud`, `water`, `gravel`, `snow`, `sand`), steel ringing (inharmonic partials, `metal`), a pneumatic vent 0.5 s later, clods / spray raining back down when it is close | distance (gain, air low-pass, up to 0.3 s sound delay beyond 30 m), pan from the camera's right vector, the shot's `persp` ceiling |
| lift-off | the drive's motor whine for the whole swing, a vent, the foot peeling out of the ground | same |
| the structure | resonant groans under load after half the touchdowns | `groan`, `persp[shot].groan` |
| beds | wind with gusts (`wind`), rain (`rain`) | |
| life | `birds`, `gulls`, `dog`, `chatter`, `bell`, `horn` at given times, every few seconds or in one shot, optionally placed in space (`x, z, y, follow`) | |
| music | a slow pad of detuned partials on `root` through `chords` (semitones), `bars` per film, `swell [[t0, t1, level]]`, a drone; ducks 50 % under every footfall near the lens | `level` |

Mix: −12 dBFS RMS then a soft limiter; the script fails if it clips. `--stems` writes sfx and music separately;
`--table` prints footfalls and ducks per shot.

## SOUND keys

```js
export const SOUND = {
  step: { pitch: 34, metal: 0.6, ground: 'mud' },     // Hz of the body thump; how much steel rings; what it lands in
  wind: 0.5, rain: 0.15, hydraulic: 0.7, groan: 0.6,
  music: { level: 0.22, root: 38.89, bars: 6, chords: [[0, 7, 12, 15], [-4, 3, 8, 15]], swell: [[11, 16.5, 1.0]] },
  life: [{ kind: 'horn', at: [0.9], gain: 0.5, x: 30, y: 25, follow: true }, { kind: 'gulls', every: 4.5, gain: 0.16 }],
  persp: { f_open: { g: 1, lp: 900 }, f_life: { g: 0.45, lp: 1500 } },   // per shot gain and low-pass ceiling
  samples: [],                                       // optional recordings, below
};
```

## Using recordings (optional)

```js
samples: [{ file: 'audio/step1.mp3', on: 'touchdown', gain: 0.4, near: 0.3 },   // only footfalls close to the lens
          { file: 'audio/score.mp3', on: 'bed', gain: 0.5 }]                     // a music bed from t = 0
```

Download them yourself under their own licence into the project's `audio/` (git-ignored), credit them in the
project's README, and **never commit them**. Generated audio (ElevenLabs, Suno …) is a reference only and needs the
owner's yes for each request (repo `CLAUDE.md`); the synthesised track needs nothing.
