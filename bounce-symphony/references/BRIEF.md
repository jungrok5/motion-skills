# Topic → brief

The brief is written before any code, saved as `BRIEF.md` in the project (start from `templates/BRIEF.md`). It turns a
topic ("a lullaby for a lighthouse", "a robot factory march", "the chorus of my song") into music, a machine, a room and
shots. Everything below is designed for this topic; the template and the example are examples, not menus.

## 1. The one line
What the film is, in one sentence a viewer would say afterwards: "A lullaby circles down a lighthouse made of
vibraphone bars while a kalimba sings along the shore."

## 2. The music
- **Where it comes from**: written for the film (say so), the user's own (they give notes or MIDI), or public domain
  (composer, work, bars; typed faithfully, simplifications said). Nothing under copyright without the user's licence.
- **Key, meter, tempo, length.** 20–60 s of music is the sweet spot; one tempo for the whole piece (the solver uses one bpm).
- **Form and events**: bar by bar, what happens — entries, the tune's arrival, a new section, the climax, the cadence.
  These events are where shots change.
- **Writing for balls** (it changes the music, so decide it here):
  - Running notes (eighths, sixteenths) chain on one ball — a spiral of hops. This is the machine's signature.
  - A long note (≳ 1 s at your tempo) needs so much height that a ball rarely survives it: it becomes its own ball
    (dropper → one pad → cup). A lane of long notes is a row of droppers — beautiful for bowls, bells, a bass line.
  - Restitution `e` sets how far a ball can chain: wood ≈ 0.75–0.8, metal bars 0.82–0.9, ≤ 0.95 always.
    Higher `top` buys more notes per ball.
  - Chords are several lanes. Keep each lane in its instrument's range (check.mjs warns).

## 3. The lanes
A table: id · instrument kind · what it plays (bars) · motion (hops on a spiral, a zigzag cascade, single drops) · ball
colour · why. Three to five lanes read best; one carries the tune.

## 4. The machine's plan
Draw it from above in words: where each lane stands (centre, radius, heading), how high it starts (`top`), how the
lanes sit together — rings round a centre, a cone, two facing rows, towers in a square. Rules of thumb:
- Spirals: `grow` larger than the longest pad across the path plus a few cm (bars lie across the path, so a spiral's bars
  point outward); a cone (spiral with `dir` and a little `grow`) reads as a tower.
- Lanes that cross in plan must be far apart in height, or they will hit each other's poles — check.mjs will say which.
- Keep the footprint under ~6 m across so a wide shot still shows balls; tall lanes (top 1.5–2.2 m) make dramatic falls.

## 4b. The chain of causes
Which lanes start with droppers, which with catapults (`start`), where the starter hammer stands, and the two or three
chains worth showing (a cup tipping into a helix that sets off the tune; a bass strike whose domino line runs across the
whole floor to a catapult). The engine solves every chain; the brief chooses what the camera rides. Leave floor room:
lanes packed tight leave domino lines nowhere to run.

## 5. The instruments' bodies and the room
- Each instrument: kind, body colour and finish (rosewood, aluminium, brass, painted), size tweaks (`L0`, `w`, `R0`).
- The room: floor and background (they meet seamlessly), the key light (colour, lux, angle), the fill (sky / ground),
  bloom, depth of field, and the **pitch palette** — 12 glow colours, one per pitch class (C … B), or one glow per instrument.
- Say why: the lullaby's room is night blue with one warm lamp and amber / sea-teal light because it is a lighthouse.

## 6. Shots
A table: at (s) · musical event · kind (`follow` lane / `orbit` / `fixed` / `move`) · distance · angle · elevation ·
what must be in frame. Open on the whole machine before the first drop; follow the tune when it enters; widen at the
climax; end on the machine at rest with the balls in their cups.

## 7. Mix
Instrument gains (glockenspiel and cymbals sit back, bass forward), reverb (a dry studio 0.15–0.2, a hall 0.3), the
latch / catch sounds on or off (`mix.sfx`).

## Still review (score every sheet and ~10 full-size stills)
Each question is pass / fail; a fail is fixed before rendering.
1. Is it obviously one machine in one room — the same floor, light, poles and pads in every frame?
2. In every follow shot, is the ball that is playing in frame, in focus, and big enough to read (≥ 20 px at 1080p)?
3. Does a struck pad visibly flash in the moment after its strike — and fade by the next few notes?
4. Is there anything impossible: a pole through a bar, a ball inside a pad, a ball in the air with no pad in sight on the
   way down, a pad floating without a pole, a domino line running through a foot or a catapult, a dropper opening with
   nothing touching its lever? (check.mjs catches most; the eye catches the rest.)
5. Does the frame have a subject — not empty floor, not a wall of poles, not the lens inside a pad?
6. Do the wide shots show the machine's plan (the rings, the cone, the towers) as the brief describes it?
7. Is the floor seamless into the background (no horizon line, no bright grazing sheen)?
8. Does the colour of the light belong to the topic (the brief's palette, not the template's)?
9. In the preview, does every bounce land on its note — and does every new ball leave because something visibly reached
   its lever or trigger (a domino falling, a cord pulled), never on its own?
10. Is anything on screen text? (It should not be.)
