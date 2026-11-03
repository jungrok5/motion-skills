# THEMES — add a template, a picture, a track

Edit the project's copy (`pass/lib/…`) so the skill stays as it is. After any change:
`node <skill>/scripts/check.mjs --all --page pass/invite.html` and `render.mjs <theme> --stills 6.4,10 --page pass/invite.html`.

## A theme (`themes.js`)
```js
'graduation': {
  name: { ko: '졸업', en: 'Graduation', ja: '卒業' },              // shown in the maker
  title: 'CLASS OF\n2027',                                         // default big title (lines = columns)
  subtitle: { ko: '졸업을 축하해요', en: 'Congratulations', ja: '卒業おめでとう' },
  message: { ko: '…', en: '…', ja: '…' },                          // default back message
  art: 'cap',            // a key of HP.ART
  bg: 'confetti',        // night | rays | warm | dusk | confetti (or a new key of HP.BG)
  music: 'party',        // bells | koto | cafe | party
  pal: { paper: '#fbf8f0', ink: '#1f2a3a', sub: '#8790a0', accent: '#2f6fd8', line: '#1f2a3a',
    sky: ['#cfe3ff', '#9cc4ff'],       // picture background (two tones)
    a: ['#…', '#…', '#…', '#…', '#…'], // picture colours, in the order the art function reads them
    bg: ['#1b2440', '#070a14'],        // stage background, centre → edge
    glow: '#ffe6a6' },                 // lights, sparkles, the kicker
},
```
The accent colours the envelope, the number, the postmark and the guest page's buttons — pick one that holds white
text (contrast ≥ 3:1). Add the id to `check.mjs --all` if you keep it.

## A picture (`art.js`)
`ART.cap = (c, t, pal) => { … }` draws into 480 × 380. Rules:
- a pure function of `t` (use `HP.rng(seed)` for scattered things, never `Math.random`);
- start with a full background (`rays`, `sky`, a pattern) — the window must never show through;
- one subject, big and centred, outlined with `ol(c, pal)`, with a `face(c, pal, x, y, size, t, seed)`;
- motion that loops in 2–4 s (`Math.sin(t * k)`, `frac(t / period)`), plus something small and constant (confetti,
  stars, steam) so it never looks frozen;
- test it at `t = 1.3` too — that frame becomes the stamp on the envelope and the card's back.

## A background (`stage.js`, `BG`)
`BG.key = (c, W, H, t, pal) => { … }` fills the whole stage (1600 × 900 or 900 × 1600/1300). End with `vignette`.

## A track (`music.js`, `TRACKS`)
`{ name, bpm, bars: 8, build() { return events } }` where an event is `{ t (beats), dur (beats), inst, m (MIDI), vel }`.
`line(['E5 G5 - A5 …' per bar], 'bell')` writes a melody in eighths ('-' holds, '.' rests). Instruments:
`bell vibes pluck keys pad bass kick taiko snare clap hat shaker jingle`. Keep the peak under 1 (`check.mjs` measures it):
velocities ≤ 0.6 for melodic parts, chords ≤ 0.3 per note.
