# The brief

Write `BRIEF.md` next to the page **before any code**. `check.mjs` fails without it, without any of the sections below,
or with a `TODO` left in it. The brief is where the topic becomes *this* vignette: a new wrong idea, a new critter, a new
room, new beats. The starter and the example are examples of the style, not menus.

## Template

```markdown
# <the caption, one line>

## Topic
- The wrong idea, as the critter would say it: "I thought <doing X> would make <Y> happen." (one line, the caption)
- Where the idea comes from (what the critter has seen grown-ups do, or a story, a cartoon, a button that looks like it)
- The thing being tried, and why it can't work (it needs a coin / bread / a real door / power)
- What it must not become: a slapstick crash, a sad ending, a lesson, words on screen, a recreation of the source film

## Critter
- Name, size `a` (head radius, world px at the reference depth), mass (light / medium) and what that does to timing
- Ears, eyes (gap, size, pupil), whiskers, tail
- The one accent colour and what it is (skirt / shorts / scarf / bag / hat), chosen against the room's palette
- Idle: breath period, blink rhythm, what flicks (tail, scarf)

## Room
- The place (one room, one wall the camera looks at), time of day, the window and where the light falls
- Palette: walls, floor, the backlight colour, the accent of the thing being tried
- The thing being tried: where it stands, how big against the critter, what part is pressed / pulled / turned, how it
  answers (a light, a lever going down, a book tilting) — and how it does *not* answer
- Clutter that says who lives here (3–6 things), and one thing in the foreground for depth
- What is alive besides the critter (dust in the light, a lamp, a clock, a plant, steam)

## Beats
| t (s) | beat | stance & gaze | anticipation | action | recovery |
|---|---|---|---|---|---|
| … | arrive | | | | |
| … | look | | | | |
| … | try | | | | |
| … | wait | | | | |
| … | again (bigger) | | | | |
| … | nothing | | | | |
| … | after | | | | |

`try`, `wait` and `after` are required; the second try must be a keyed big move (antic → big → settle).

## Motion
- Walk: from → to (floor X, Z), stride, steps per second (2.5–4 for a small critter)
- Turns: from → to yaw, steps
- Hand targets: what the hand rides (a function of time when the thing moves)
- Reference: hand-keyed, or a video-model clip of *your* critter (model, prompt, take) kept out of the repo —
  ElevenLabs or any paid generator only after the owner says yes for that request

## Sound
- Ambience (room tone always; what comes through the window)
- Events with times: footsteps come from the walks; the press / beep / creak / slide; the sigh; the silence of the wait
- Music: none (default) or a music box, and why

## Review
| round | what looked wrong | fix |
|---|---|---|
| 1 | | |
```

## Rubric — score the stills and the contact sheet

Render `--sheet 12` and stills at `try`, `wait`, `again`, `after`. Each line is pass / fail; fix the worst fail first.

1. **The wrong idea reads without words.** From three stills (try, wait, after) someone can say what it expected.
2. **The wait is the joke.** The critter holds still and expects, long enough to feel (≥ 1 s), and stays alive
   (breath, blink, a glance).
3. **The second try is bigger** and gathers before it (crouch, lean back) and lands after (squash, settle).
4. **One light.** The window is the brightest thing; the critter is backlit (rim on the light side, a long shadow
   falling towards the camera); the room falls darker away from the window.
5. **Painted, never flat.** Washes with blooms and wet edges, paper showing through, pen lines; no flat digital block
   anywhere (the critter's ink is the only flat colour, on purpose).
6. **Ink critter.** Pure silhouette, two white eyes, one accent colour; it reads against the room in every frame (no
   black-on-black: keep it in front of something mid-tone or lit).
7. **Bodies are possible.** Knees fold back, feet planted, the near arm on the facing side, nothing reaches through
   the head; turns are stepped. "Does anything float, skate, or stand dead still? Does the big move gather and land?"
8. **Locked camera, one shot.** Nothing moves the frame; the composition leaves room for the walk and the thing.
9. **Quiet sound.** Room tone under every second; the small sounds land on the frames that make them; nothing clips.
10. **New.** Nothing in it is taken from the source film (no vending machine, no shop of jars, no cat in a green
    skirt) or from the example unless the brief says why.
