# Story grammar, shot grammar, timing

## The errand-gone-wrong chase (the default shape)
| beat | what | typical length |
|---|---|---|
| **draw on** | the line, the home and the cast draw themselves on the blank sheet (`g.drawOn`) | 1–1.5 s inside shot 1 |
| **the job** | someone sets the errand with the one sign; the hero accepts (salute, nod) | 3–5 s |
| **it gets away** | a quiet moment (humming, a nap, looking away) → wind / a bump / a sneeze → the precious thing rolls off → "!" | 4–5 s |
| **the chase** | 2–3 places along the line, one gag each (a hop over a rock, skipping lily pads, a slide) | 4–6 s each |
| **the obstacle** | a thief or a threat takes it; the hero wins with the prop (the can, the net, the umbrella) | 8–10 s over 2 shots |
| **the loss** | it falls / breaks / sinks; the camera follows it; the music drops out | 3–4 s |
| **the turn** | a sad beat (a tear, one drop) → it becomes something better (grows, hatches, flies) → joy | 5–6 s |
| **home again** | framed like shot 1; the sign changes; a twist that could start it all again; cut on a "!" | 4–6 s |

Short versions (10–20 s): draw on + it gets away → one chase place → the catch (templates/film.html).

## Shots
- **One world, one line.** All shots are views of the same track; continuity is free: the next shot starts where the
  last left the line (x positions carry over).
- **The camera follows along the line**: `cam: lt => ({ x: (hero.x + thing.x) / 2, y: gy(x) − 250, zoom })` keeps the
  ground in the lower third and both in frame. Wide (zoom 1–1.15) for the chase, closer (1.3–1.6) for faces and the
  quiet moment. Tilt the camera down to follow a fall (keys on `y`).
- **Cuts** between places; a **wipe** (`tr: { type: 'wipe' }`) for "later"; the opening fades in from the blank page and
  the end fades back to it.
- **One action per shot moment**; hold a beat after each gag (0.3–0.6 s) before the next.

## Timing
- 24 fps. Positions along the line every frame (smooth against the camera); poses, faces and effects on twos
  (`t2 = g.twos(lt)`).
- A hop: 0.6–0.8 s, height 70–120 px, squash 0.2 on landing for 0.2 s. A run: `walk: t2 * 4.6`, `stride: 1.15`, tilt 0.2–0.25.
- A surprise: rays grow in 0.15 s, the "!" holds 0.7 s. A take (eyes wide) lands 0.1 s before the sound.
- Write positions as pure functions of local time (`x = x0 + v·lt`, `arcAt`, `hops([...])`), never as state.

## A shot table (fill this in the brief, then code it)
| # | name | s | camera | hero | the thing | effects | sound |
|---|---|---|---|---|---|---|---|
| 1 | home | 5.5 | x 650, zoom 1.2 | stands, salutes 3.4 s | on the mound | drawOn 0–1.3, sign 1.3–2.3 | pencil, tune |
