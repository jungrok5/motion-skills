# BRIEF — from a topic to a brief, and the reviews

Write `BRIEF.md` in the project before any code (copy `templates/BRIEF.md`). Every line is designed for THIS topic; the
template's boy and owl and the example's keeper and whale are examples only.

## Filling it in
1. **One line** — the whole film in a sentence: "A ___ wakes on a blank page, draws ___, and the world of ___ spreads out
   until a giant ___ rises and the page turns into ___."
2. **The hero** — who they are in three words; silhouette (tall/round/small, hair as a shape); face (eyes `dot` or
   `round`, nose, beard, freckles); clothes (`top`, `legs`); the ONE item in the spot colour (`glasses`, `beanie`, `scarf`,
   `cap`, `bow` — or design a new item in `hero.js`' style). Which hand draws.
3. **The spot colour** — one hue that belongs to the topic (coral for a sea at sunset, cobalt for night, leaf green for a
   forest, gold for bees). It carries: the hero's item, the first mark, the giant's eyes, the swarm. Nothing else.
4. **The pencil** — flies in drawing a curl (default), lies on the page, falls from above, or is already in hand.
5. **The first mark** — small, within arm's reach, in the spot colour, something the hero would draw (a boat, a star, a
   flower, a key, a kite). And the line the world grows from (a waterline, a ground line, a branch, a rail).
6. **The world** — 8–20 items that spread from the first mark: what is near (the hero's rock, a fence), what is far (a
   lighthouse, a village, mountains), what lives (gulls, smoke, a beam that sweeps), the light (sun, moon, lamp).
7. **The giant** — what it is, its silhouette in words, where it rises from (behind the hills / the horizon / the trees),
   which three strokes come first, what its eyes do (open, blink, close content), what moves (a flipper, wings, tail).
8. **The swarm** — what lifts off (fish, stars, petals, sparks, notes), where from (the spout, the flowers, the hero's
   marks), how many (60–100), and where it goes (round the giant, up to the moon).
9. **The wash** — the light and its colours (spot colour + one neighbour hue), the regions (sky, sea, fields).
10. **The desk** — wood tone, book cover, 2–3 real pencils (one in the spot colour), an eraser, maybe one prop.
11. **The beats** — a table of times (references/GRAMMAR.md), total 25–35 s.
12. **Sound** — the hero's tune (music box), the giant's sound (low bell, breath), the swarm (flutter, sparkle), the wash
    (swell), the desk (room).

## Cast review (cast.html, before any beat is written)
- The hero reads as a doodle at 10 % of the frame height; the spot item reads first.
- Turned both ways: the narrower eye, nose, chin and toes are on the facing side; the ear toward the back; the back views
  show no face, no beard, no mouth; the item turns with the head.
- The reach both ways: the pencil arm does not cross the face (the far arm draws); the elbow folds forward.
- Expressions differ at a glance (o, smile, grin, flat). `check.mjs cast.html` prints `ok`.
- If a view makes you ask "did the neck turn or the body?", it fails — fix the spec or the rig and re-render.

## Still review (stills and the contact sheet)
- Only graphite and the spot colour before the wash; the paper shows everywhere.
- The hero's pencil tip sits on the line being drawn; the arm never covers the face.
- Lines look drawn: double, overshooting, tapered; nothing looks like a clean vector.
- The giant is behind the landscape, its base hidden; its eyes are the brightest spot colour on the page.
- The swarm passes in front of and behind the giant; it does not hide the hero.
- Nothing important is cut by the frame (the hero's head while acting, the giant's head once drawn).
- Every second something is being drawn or something drawn is alive (blinks, bobs, flaps, the beam).
- The desk looks real next to the drawn page: wood, shadows, pencils with lit faces.
