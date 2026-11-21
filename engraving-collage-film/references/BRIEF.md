# BRIEF — topic → brief, and the rubrics stills and cast sheets are scored on

Write the project's `BRIEF.md` from this template **before any code**. Every field is designed for the topic; the
starter and the example are examples of the style, not answers.

```markdown
# <title> — BRIEF

ONE LINE: <who does what where, in one sentence>

## World
- where / when: <place, era, season, time of day — why engravings suit it>
- sets (2–4): for each — <id>: what makes it THAT place (5–10 subjects), which come from the kit, which are engraved new
  in world.js (name each new subject and its tone plan), the floor, what rises / drifts / sways, haze

## Cast (the only colour)
- <name>: age / build, height m, heads (4.5–5.5 child, 6.5–7.5 adult), mass light | medium | heavy
  - silhouette (one line that reads at 60 px): …
  - colours (2–3 + skin + line; NOT the source film's red dress / orange overalls): …
  - idle: how they breathe and stand; what loose parts trail (hair, scarf, braids, hem)
  - props held: …
- cast sheet reviewed: <date> — notes

## Beats and shots
| # | set | dur | camera (crane / truck / push / orbit; from → to) | acts: pose · gaze · anticipation · move · recovery |
|---|---|---|---|---|

- walks / runs go across the camera (≥ 60 % sideways on screen); the character faces the way they move
- motion reference for any new big move: <video model + prompt + take, or footage> → key poses in ACTIONS (or "none: built-in keys")

## Sound
- key, bpm, mood (busy = 4/4, otherwise a small waltz); special effects: …

## Review log
- <date> stills: <what failed the rubric> → <fix>
```

## Still rubric (score each `--shots` still; any "no" is a fix before rendering)

1. **Engraved, all of it?** Every surface in the world is line work whose width carries the tone — no grey fill, no
   photo, no colour; lit faces sparse, shade dense and crossing; outlines crisp.
2. **Light from one side?** Lit faces on the left, shade on the right, white ledges with a shadow under them, in every
   subject, new ones included.
3. **Cards in space?** The frame reads as cut-outs standing at angles, with paper-lift shadows, near cards soft, far ones
   pale — not a flat painting, not a 3-D render.
4. **Paper breathes?** The sky and the light areas leave paper white (≥ 12 %); ink is line, not masses (≤ 55 %).
5. **Is it that place?** The 5–10 subjects the brief names are there and legible at their real sizes.
6. **The character pops?** The cast is the only colour, clear against the engraving, not lost in a busy area; cel
   paint only (no hatching on them).
7. **Body right?** "Has the neck turned or the torso?" — head, chest, hips and feet face one way; knees bend back,
   elbows forward; the near arm does not cover the face; feet on the floor.
8. **Motion alive?** Nobody floats, slides or stands dead; big moves wind up and settle; loose parts trail.
9. **The breakdown reads?** Cards outlined in layer colours with handles, the camera's frustum and path visible, the
   whole move understandable from it.

## Cast rubric (score `render.mjs cast.html --cast` before any shot)

1. Every view (front, threeq, side, back) facing **right and left**: the same person, the same costume, the light on the
   upper left in both directions.
2. Three-quarter and side: the near shoulder and hip on the side away from the face, drawn in front; the far ones half
   hidden; eyes, nose, mouth, buttons and pockets on the face side; ears toward the back of the head.
3. Walk keys: contact (heel in front, toe up), passing (stance leg under the hip, swing knee bent), push-off (heel up)
   — knees only bend back.
4. Run: lean, pumping bent arms, a flight phase; jump: the wind-up crouch, the take-off reach, the tuck, the landing
   absorb.
5. The wave uses the far arm in 3/4 (the near arm would cover the face); the turn steps through side → threeq → front.
6. Silhouette and colours read at 60 px; nothing borrowed from the source film's characters.
7. `check.mjs` numbers: joint audit empty, planted-foot drift ≤ 2 px (at 400 px tall), idle ≥ 0.3° a second,
   anticipation ≥ 3 frames the opposite way.
