# The source, observed

Seung Joon Choi, 「튕기는 공의 교향곡 (루브골드버그 머신 + 음악)」 ("Symphony of bouncing balls — Rube Goldberg machine +
music"), shared on Facebook: https://www.facebook.com/share/v/1DwMH4wj7u/ — a 60.97 s film, 1920×1080, 30 fps, with sound.

**How it was made** (from the post): on a phone, Claude composed the music and simulated the machine in MuJoCo, then
turned it into a three.js player; Claude Code took it over to render in Blender, but Cycles would have taken three days
and EEVEE ten hours on an M1 Mac at 1080p, so it wrote its own path tracer in Metal, which rendered the minute in three
hours. It began in a café, on a phone, up to the three.js version.

**What is on screen** (contact sheet every 4 s, stills every 6 s):
- A seamless grey studio: the floor falls off into a dark background; one soft light from above makes a pool; long soft
  shadows of thin poles across the floor.
- Tall thin dark poles everywhere, each carrying something: flat spirals of coin-like discs (copper, silver, gold),
  spirals of orange domino-like bars, rainbow rows of upright dominoes on a long rising beam, flat gold discs on
  single poles, a little red box on an arm (a dispenser), a cage of vertical tubes (chimes) at the edge.
- Small glossy balls (red, pink, yellow, blue) in flight in clean arcs; coloured bars tumbling; struck pieces glow
  warm white for a moment.
- The camera: slow orbits round the whole machine from high up, long-lens follow shots low among the poles with strong
  depth of field (bokeh on everything near and far), a few shots straight along a beam.
- The sound: 100 bpm, a strike every eighth note (0.6 s spacing in the onsets) from 5 s on, mallet-percussion timbres
  (marimba, bells), three big crash accents (~29 s, ~48 s, ~57 s) with long tails, a final crash and ring-out.

**What this skill takes** — the grammar: the score is the machine; each note is a ball landing on a piece of the machine
at its moment; real physics, so the timing is earned; a quiet grey studio, thin poles, glowing strikes, depth of field.
**What it does not take** — the music, the particular layout (domino beams, coin spirals, the chime cage), the edit.
Every piece designs its own music, instruments, plan and shots.

**Differences by design**: the source simulated forward in MuJoCo (and tumbling dominoes), so its machine was tuned by
trial; this engine solves the machine backwards from the score (every pad placed and tilted for the exact flight) and
proves it forwards with an exact event-driven simulation, which makes a new score a new machine in seconds. Where the source machine was one long chain, this engine adds the Goldberg machinery the source only hinted at (a
dispenser, rows of dominoes): every release is caused — a starter hammer, push rods, tipping cups and helix towers,
branching floor domino lines, levers and strings, mousetrap catapults, rails — all solved to the millisecond. It renders
with three.js (rasterised, soft shadows, bloom, bokeh) instead of a path tracer, so any page is also a live web page.
