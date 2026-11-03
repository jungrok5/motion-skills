# THEMES — design a theme for a topic

A theme is everything that changes with the topic: words, a picture, a palette, a stage background, a track.
Write the brief first (references/BRIEF.md), then put the theme in the project's `pass/themes/custom.js` — both pages
load it after the built-ins, so the skill's `lib/` never changes. `node <skill>/scripts/new-theme.mjs <id>` writes the
skeleton; `examples/graduation/themes.js` is a complete one (picture + `spot` background + `march` track).
After any change: `check.mjs invite.json` (and `check.mjs --all` to see every theme), then stills.

## The theme
```js
(() => {
  const { W, H, TAU, ol, fill, rr, circle, frac, face, star, rays, sky, glow, confetti, twinkles, cloud } = HP.KIT;
  HP.addTheme({
    id: 'graduation',
    name: { ko: '졸업', en: 'Graduation', ja: '卒業' },             // shown in the maker
    title: 'CLASS OF\n2027',                                       // default big title (lines = columns)
    subtitle: { ko: '…', en: '…', ja: '…' },                      // or one string for every language
    message: { ko: '…', en: '…', ja: '…' },
    bg: 'spot',            // night | rays | warm | dusk | confetti, or a key you add to HP.BG
    music: 'march',        // bells | koto | cafe | party, or an id you add with HP.addTrack
    pal: { paper: '#fbf7ee', ink: '#1d2547', sub: '#8a8fa6', accent: '#c8374a', line: '#1b2244',
      sky: ['#d4e8ff', '#a8cdfb'],      // picture background (two tones)
      a: ['#…', '#…', '#…', '#…', '#…'], // picture colours, in the order the picture reads them
      bg: ['#1a2350', '#070a1a'],        // stage background, centre → edge
      glow: '#ffd98a' },                 // lights, sparkles, the kicker; add your own keys (floor: …) freely
  }, (c, t, pal) => { /* the picture */ });
})();
```
The accent colours the envelope, the number, the postmark and the guest page's buttons — pick one that holds white
text (contrast ≥ 3:1).

## The picture
`(c, t, pal) => { … }` draws into 480 × 380. Rules (they are what keeps every topic in one style):
- a pure function of `t` — `HP.rng(seed)` for scattered things, never `Math.random` or `Date`;
- a full background first (`rays`, `sky`, a pattern) and a ground — `check.mjs` fails a see-through window;
- one subject, big (≥ 40 % of the height) and centred, filled flat, outlined with `ol(c, pal)` (5 px, `pal.line`),
  with `face(c, pal, x, y, size, t, seed)` on a light surface;
- the brief's moment as a loop of 2–4 s (`frac(t / period)`), plus something small and constant (`confetti`,
  `twinkles`, steam) so it never looks frozen — `check.mjs` fails a picture that barely moves;
- no text inside the picture; keep it readable at 150 px wide — look at the maker's thumbnail;
- `t = 1.3` becomes the stamp on the envelope and the card's back, so that frame must read on its own.
Kit: `ol fill rr circle star rays sky glow confetti twinkles cloud face frac` (see `pass/lib/art.js`; the six built-in
pictures use the same helpers and are worth reading).

## A stage background
`HP.BG.<key> = (c, W, H, t, pal) => { … }` fills the whole stage (1600 × 900, 900 × 1600 or 900 × 1300). Helpers in
`HP.BGKIT`: `radial bokeh stars flakes confetti vignette`. End with `vignette`. Light effects (beams, glows) look
right with `globalCompositeOperation = 'lighter'` and low alpha; plain alpha over navy turns grey.

## A track
`HP.addTrack('<id>', { name, bpm, bars: 8, build({ line, midi, chords }) { return events } })` — an event is
`{ t (beats), dur (beats), inst, m (MIDI), vel }`. `line(['E5 G5 - A5 …' per bar], 'bell', vel)` writes a melody in
eighths ('-' holds, '.' rests); `chords(['D3 F#3 A3', …])` gives MIDI numbers per bar. Instruments:
`bell vibes pluck keys pad bass kick taiko snare clap hat shaker jingle`. Velocities ≤ 0.6 for melodic parts, ≤ 0.3 per
chord note; `check.mjs` fails a peak above 1. Compose it — never an existing song, anthem or school song.
