# STORY — topic → fighter → powers → shots

## From a topic to a fighter and three powers
A topic is usually a person, an element or an image ("a spear-bearer of the moon", "a monk whose bells stop time",
"a courier who cuts through rain"). Turn it into:
1. **The fighter** — silhouette first (what reads at 60 px tall), then the one white shape, then the face for the
   close-ups. Pick the weapon the topic suggests (`katana`, `odachi`, `spear`, `twin`) and a hair style (`messy`,
   `cropped`, `tied` with a ponytail, `long`, `bob`).
2. **A movement power** — what the ink shadow behind a dash looks like for this topic (a crescent, a scarf of smoke,
   rain streaks): set by `w.ink` options (`span`, `w`, `parts`, `red`).
3. **A strike power** — what each strike leaves behind, and how it first shows itself (the omen: two crossing cuts, a
   point of accent, the motif appearing tiny for 0.3 s).
4. **The ultimate** — the domain motif (one of `MOTIFS` or a new one) and the single final stroke. Name all three
   (the reference names them; names drive the choreography and the score).

## The grammar (30 s; scale to 15–45 s by shrinking the action, never the stillness)
| beat | share | content | camera | sound |
|---|---|---|---|---|
| burst | 0–5 % | first frame already moving; a stamp → cracks; vanish (black afterimage tears apart) | low side track, push in | step, crack, dash |
| reappear | 5–8 % | a big slash from a new place; invert frame | low ¾ | slash + light impact |
| charge | 8–11 % | straight at the lens | wide 70°, low | whoosh |
| combo ×3 | 11–23 % | rising strike · spin ring (top view) · hang → half-orbit → plunge; black frame | change every hit | slash, slash, land + impact |
| run | 23–30 % | into depth; rings at each step; camera overtakes and turns on a calm face | chase → front | steps |
| first omen | 30–37 % | two crossing cuts in the sky; accent point; the motif tiny for 0.3 s; reversal | over the shoulder, up | slash, slash, ring |
| blinks | 37–43 % | skid; three blinks, three strokes hang crossed | arc around | dash+slash ×3, riser |
| first burst | 43–50 % | strokes tighten; black + burst frames; plume, shards; motifs glimpsed | wide | thud, tick, impact, glass |
| **stillness** | 50–60 % | debris hangs; stands; accent runs up the edge; the eye close-up cracks | slow orbit → extreme close | heartbeat, drone, ring |
| domain | 60–73 % | one giant opens, three, a thousand; threads; dive through one; back in front | pull back until tiny | boom, glass shimmer, rumble |
| collapse | 73–83 % | crack, shards hang, orbit, pour into the weapon; the last giant closes; black void, white outline | 360° orbit | cracks, glass, riser, drums gone |
| the cut | 83–93 % | the stroke; invert, white; hairline across the world; the world slides; ink pours from the cut | from close to extreme wide | 0.3 s near-silence → ultimate hit |
| silence | 93–100 % | white; back to us; weapon lowered; the seam closes; one wisp | low wide, still | a ring, cloth |

## Shot table (write it in BRIEF.md before code)
For each shot: start, length, framing, camera move, the fighter's keys (poses + overrides), what ink it makes, which
impact frame, which sounds on which frames. Keep shots 0.8–2 s in the action, 2–4 s from the stillness on.

## Choreography rules that save time
- Keys are poses: start from `POSES` (or your own pose table like the example's `SP`) and override a few numbers.
  Use `e: 'whip'` into a strike (fast out, settles), `e: 'snap'` for a blink (cut between places), `e: 'io'` for
  slow moves, the default monotone cubic otherwise.
- A strike's follow-through moves the root a little along the facing (`x + d·sin(yaw)`, `z + d·cos(yaw)`), never
  sideways — check.mjs fails a fast move against the facing.
- Two-handed weapons: tune the grip with `ls` (where the left hand holds on the shaft); if a hand leaves reach in a
  transition, rotate the weapon the other way round (`by − 2π`) or add a key between.
- Every effect is tied to a time on the fighter's timeline (a slash `head` grows over the strike's 0.12–0.2 s).
- Cracks live in film time with `until`; flecks and shards are lists made once (`fleckList`, `shardList`) and drawn as
  functions of t.

## Making a new motif
`MOTIFS.name = (ctx, s) => { … }` draws one watcher in a unit box (x −1…1, y down) from `s = { open 0…1, crack, look:
[dx, dy], glow, accent, seed, detail, eclipse }`. Rules: readable as a sprite at 20 px (draw the silhouette first,
details only when `s.detail`), `open` must change the shape (not only the opacity), `look` must move something
(a pupil, a shadow, a reflection), the accent appears only as a hairline or a point. Then `domain({ motif: 'name' })`.
Check it on the cast sheet (`examples/cast`).
