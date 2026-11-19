# Brief — topic → game

Write the brief **before** game.json. The topic decides everything below; nothing is copied from an example because it
is there. `scripts/new-game.mjs` puts the template (between the markers) into the project as `BRIEF.md`.

## How to fill it

- **One verb.** A small game is one thing done well: climb to a light, fill a basket, carry something home, outlast a
  storm. Pick the kind from the verb — moving along and up → `platform`; gathering inside a place → `arena`.
- **Cast from the topic, four or five members.** A player, one item, one or two enemies (a ground one and, if the place
  has them, a flyer), a goal for a platform game. Each one gets:
  - a **prompt** for Tessera: 1–4 plain English words for a single object or creature, the way an emoji is named
    ("red crab", "hedgehog", "lighthouse lantern"). See references/TESSERA.md for what reads at 16×16.
  - a **hand-drawn grid** that matches the prompt (16 rows × 16 chars, a 2–5 colour ramp plus outline). It is the
    offline and commercial-safe version of the same member, not a different character.
  - **faces**: which way the drawing looks (`right` / `left` / `front`). Most Tessera sprites face front; side views of
    animals often face right. Decide from the picked sprite (scripts/paint.mjs), and draw the hand grid the same way.
  - **mass** (0.4–4, 1 = the player of an ordinary game): it sets every timing (references/MOTION.md).
  - **gait**: `hop` for anything that stands on the ground, `glide` for things that fly or float, `still` for items
    and goals.
- **Place.** Palette (4–6 colours with a clear light and dark), backdrop layers, tile looks for ground, ledge, hazard.
  The place should be legible in one still: where you are, what time it is, what the weather is.
- **Level.** A route a first-time player can read: teach each thing once in safety (the first gap over water, the
  first enemy on flat ground), then combine. Platform: one screen = 20 columns; 60–80 columns total; the goal on the
  highest or farthest point. Arena: 24–32 × 14–20 tiles; walls that make 3–4 rooms; items spread so the player must
  cross the enemies' ground.
- **Tune.** 8–32 steps per track, a key and tempo that fit the place (a slow minor triangle line for a night sea, a
  bouncy major square line for a sunny wood).
- **Text.** Title, a one- or two-sentence intro in the topic's language (who, what to gather, what to avoid), win and
  lose lines. No instructions the game already shows.

## Review — stills and cast sheet

Run `scripts/sheet.mjs` and look at `sheets/cast.png` and `sheets/still-1..5.png` at 100 %. Each line is a pass / fail.

| # | question | fails when |
|---|---|---|
| 1 | Does every sprite read as its prompt at 1×? | you need the name to know what it is |
| 2 | Do the hand sprite and the Tessera sprite of a member read as the same thing? | the hand grid is a different animal, colour or angle |
| 3 | Does anything float, skate, or stand dead still? | a planted body is off the ground line, moves while planted, or an idle cell row is four identical pictures |
| 4 | Does the big move gather and land? | no squat cell before LIFT, or LAND looks like RECOVER |
| 5 | Is the turn stepped, and both ways right? | the left row faces right, the body travels during TURN, or a front-facing drawing is mirrored |
| 6 | Is heavy heavy? | a mass-2 enemy has the same squat, landing and lean as the mass-0.7 player |
| 7 | Can you tell where you are from one still? | the backdrop and tiles could be any game |
| 8 | Is the next thing to do readable? | an item, gap or enemy is hidden behind the HUD or outside the camera's lead |

Write what failed and what you changed into BRIEF.md under *Review* (one line each), fix, run `sheet.mjs` again.

<!-- template -->
# __TITLE__ — brief

## Topic
<!-- the topic as given, and the one verb of the game -->

## Kind
platform | arena — why this kind fits the verb.

## Cast
| key | role | name (topic language) | Tessera prompt | seed · pick | faces | mass | gait | move / notes |
|---|---|---|---|---|---|---|---|---|
| hero | player | | | 7 · 0 | | 1.0 | hop | idle: breathes, shifts weight |
| | item | | | | front | 0.5 | still | |
| | enemy | | | | | | hop | patrol / wander / chase · speed |
| | goal | | | | front | | still | (platform) |

Stance per beat (MOTION-QUALITY 4): how each enemy reads — loose and wandering, or low and locked on the player.

## Place
- palette: bg · ink · light · dark · accent
- backdrop layers (back to front):
- tiles: ground · ledge (one-way) · hazard · pit
- time / weather:

## Level
Route in beats (what each stretch teaches): 1. … 2. … 3. …
Win: goal / collect N / survive · lives · time.

## Tune
bpm, key, lead / bass / arp in a line, waves.

## Text
title · intro · win · lose

## Tessera
Prompts tried (seed → which of the four, why), from `scripts/paint.mjs`; the PNGs stay in ref/ (git-ignored).

## Review
<!-- one line per finding: still / sheet cell → what failed → what changed -->
<!-- /template -->
