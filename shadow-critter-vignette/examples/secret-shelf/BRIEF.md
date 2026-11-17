# 책을 당기면 비밀 문이 열리는 줄 알았다

## Topic
- The wrong idea: "I thought pulling that book would open a secret door." (the caption)
- Where it comes from: every old film and cartoon where one book on the shelf is a lever and the wall swings round.
- The thing: a tall bookshelf in an old reading room; one red book stands a little proud of the others, which is
  exactly what a secret lever would look like. It is just a book someone didn't push back.
- Must not become: a crash (the shelf doesn't fall, nothing breaks), a sad ending, words on screen, the source film
  (no vending machine, no shop, no cat in a skirt).

## Critter
- Kuma — `a` 88, light: quick small steps, a short gather, lands with a little squash.
- Bear ears (round), white oval eyes with tall pupils, no whiskers, a puff tail.
- Accent: a red scarf (#c0473a), the one warm colour on the ink against the room's browns and the window's gold;
  it repeats the red book, so the eye goes from one to the other.
- Idle: breath 2.7 s, blinks every 1.6–4.2 s (sometimes a double), the scarf tail trails the moves.

## Room
- An old reading room, late afternoon; the window on the back wall, low gold light across the floor towards the camera.
- Palette: walnut walls and boards (#5a3e2a / #6c4b32), honey floor (#86593a), gold backlight (#ffd98c / #ffc46a),
  the red book.
- The thing: the bookshelf on the right wall, its face looking into the room; eight rows of spines; the red book on
  row six, just within reach on tiptoe. It tilts out when pulled (its foot stays on the shelf) and stays tilted:
  that is all it does.
- Clutter: a small table under the window with a plant and jars, two frames and a note on the back wall, a tall
  clock and coat hooks on the left wall, a rug, a stool, stacks of books on the floor; a low crate in the near corner
  for depth.
- Alive: dust turning in the window light, the clock ticking, breath.

## Beats
| t (s) | beat | stance & gaze | anticipation | action | recovery |
|---|---|---|---|---|---|
| 0.3–3.0 | arrive | walks in from the window side, looking ahead | — | 3/4-front walk to the shelf | stops with both feet planted |
| 3.0–3.6 | turn | turns to face the shelf | — | 2 steps | settles |
| 3.9 | look | head up, eyes up: *that* one | — | nod up | holds |
| 4.4–5.4 | try | up on tiptoe, arm up | arm lifts first | pulls the book: it tilts out | heels down, arm down |
| 5.6–6.9 | wait | head turned to the wall where the door should open | — | holds, blinks | — |
| 7.0–7.95 | again (bigger) | eyes back on the book | crouch + lean, arm back (antic 7.15) | jumps and yanks (big 7.35): the book tilts further | lands with a squash (7.6), settles (7.95) |
| 8.2–9.0 | nothing | looks at the wall again; lids drop | — | — | — |
| 9.3–10.4 | after | glum, slight slump | — | pushes the book back in | arm down |
| 10.45–12.8 | leave | turns away (2 steps), walks back towards the window | — | — | fade |

## Motion
- Walk in: (-170, 2000) → (292, 1400), stride 1.6 a, ~3.3 steps/s. Walk out: → (-130, 1990), stride 1.4 a.
- Turns: 0.66 → 2.05 rad (2 steps), 2.05 → 4.7 rad (2 steps, through the back).
- Hand: the right hand rides the book's top (`bookTop(t)`), so hand and book move together.
- Reference: hand-keyed (no generated motion), timing studied from how a small child reaches and jumps.

## Sound
- Ambience: room tone, the clock.
- Events: slide + creak on the first pull (4.7, 4.95); slide on the yank (7.36), thud on landing (7.6); a sigh (9.15);
  slide + tap pushing it back (9.95, 10.05). Footsteps from the walks and the turns (wood).
- Music: none — the wait is silence over the clock.

## Review
| round | what looked wrong | fix |
|---|---|---|
| 1 | room pale and grey, nothing like a backlit painting | paper under the washes, denser washes, darker walnut palette, light falloff from the window, golden floor patch |
| 2 | the raised arm vanished inside the head | arms 0.74 + 0.70 a; reach targets kept beside the head, not above it |
| 3 | the book out of reach, the gap at the wrong end of the shelf | eight rows, book on row six, gap computed from the book's Z |
| 4 | 7 steps a second, a foot overstretched on the first step | stride 1.6 a, shorter walk; the pelvis sinks as the walk starts |
| 5 | foreground plant read as huge flat leaves | a low crate in the corner instead |
