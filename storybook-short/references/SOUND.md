# SOUND — every sound is Web Audio code

`makeScore({ key, tempo, progression, seed, gain })` returns `{ schedule(ctx, film, t0), play(ac, film), renderWav(film) }`.
One schedule function runs on a live `AudioContext` (the page) and on an `OfflineAudioContext` (`render.mjs` → WAV → AAC
in the MP4). Seeded: the same film sounds the same every time.

## Music
A small picture-book band: a kalimba melody (sine + a bright partial), glockenspiel answers at phrase ends, a soft
triangle pad on the chord, a plucked triangle bass on beats 1 and 3, a high-passed noise shaker on the off-beats. The tune
is pentatonic in two-bar phrases shaped A A′ B A over the progression; each shot says `soft` (pad, bass, quiet melody),
`full` or `none`. It fades in with the first shot and out with the last.

## Ambience (per shot, `sound.amb`)
`birds` (seeded chirp trills, panned), `wind` (band-passed noise sweeping), `water` (low-passed noise breathing, small
blips), `sea`, `crowd` (murmur + tiny voices), `room`, `rain`, `gulls`, `clock`.

## Events
Footsteps come from every walk's heel strikes (`walk().contacts`), panned by x, by surface (`path`, `grass`, `stone`,
`wood`, `snow`). Others by time in `sound.events`: `woof`, `quack`, `meow`, `plop`, `pop`, `splat`, `whoosh`, `swish`,
`bell`, `chime`, `gulp`, `hmm`, or `{ fn(ctx, t, dest, { tone, noise }) }` for your own.

## Mix
Buses (music, ambience, foley) → a generated room reverb → a compressor → out. `check.mjs`: no NaN, peak ≤ 0.99, rms ≥ 0.01,
every shot has sound, one footstep per heel strike.

ElevenLabs or any other generator is not part of this skill's path; voices or music from one would need the owner's yes
for that request, and would be a reference, not an asset.
