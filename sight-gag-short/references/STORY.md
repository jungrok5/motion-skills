# STORY — topic → hero → gadget → gags

## The reference, measured
Min Story Lab's clip (https://x.com/minstorylab01/status/2117637253015183423): 31.2 s, 16:9, cut times 2.2 · 5.8 ·
9.9 · 14.1 · 18.0 · 23.1 s (shots of 3.6–4.2 s, the last 8 s), one continuous groove at ~129 bpm, no dialogue.
Structure: a 2 s intro (the glove peeks round a corner, then the hero walks in), six gags on one street, the hero
always walking left → right through them, each gag a locked wide shot from the sidewalk at waist-to-chest height.

| ref gag | kind | the joke |
|---|---|---|
| smoker under a no-smoking sign | comeuppance | the glove points at the sign, then flicks him head-first into the bin |
| man stuck at the top of a ladder | help | the glove scoops him off and sets him down |
| a parked car / a businessman | comeuppance | (from the stills) the glove pushes the car from behind, then points at the man |
| a girl at a puddle | help | the girl rides across on the glove's palm |
| a tagger at his "HIP HOP KING" | comeuppance | the glove grabs him and wipes the wall clean *with him* |
| a purse snatcher on a scooter | comeuppance + help | the glove catches him mid-escape, hangs him on a lamp post, returns the bag to Granny |

What makes it work: **the hero does nothing** (strolls, deadpan, a little steam), **the glove has all the
personality** (gestures first — points, wags, beckons — then acts), **every solution is one notch more than needed**,
and the solutions use the nuisance's own props against them.

## Topic → hero → gadget
1. **The topic gives the hero a job or a type** (crossing guard, baker, librarian, lifeguard, janitor, park ranger,
   mail carrier, grandma, robot). Pick the silhouette detail people remember (a walrus moustache, a toque, a whistle).
2. **The gadget comes from the job** and carries the pun: crossing guard → a raised hand ("HANDS DOWN."); baker →
   an oven glove ("HANDLE WITH CARE."); librarian → a shushing glove ("SHHH-ERIFF."); plumber → a plunger tip
   ("PLUNGE IN."); gardener → a rake tip. Glove styles: `leather` (the reference's tan), `cartoon` (white, three
   lines), `rubber` (kitchen yellow / pink), `oven` (knit), `boxing`. A non-hand tip: `gadget(F, { tip: (G) => obj })`
   rides the same hose; give it 2–3 states you can key.
3. **The machine on the back** sells the gadget: `extras: ["contraption"]` (colour `brass`), `beacon` for a
   flashing light, steam from `s.fx.steam`.

## The gag grammar (every shot)
| beat | when (4.0 s shot) | what |
|---|---|---|
| **setup** | 0 – 1.0 | the nuisance happens (a toss, a topple, a speeder) while the hero strolls in and stops |
| **notice** | ~1.0 | the hero's eyes go to it (`face(…, { look })`); the gadget stirs |
| **act** | 1.0 – 2.0 | the gadget shoots out (stretch sfx) — anticipation, then a snap ease — and does the thing |
| **result** | 2.0 – 3.0 | the physical consequence: in the bin, back on the cone, dangling by the collar |
| **button** | 3.0 – 3.6 | a small extra: a scold, a thumbs up, a pat, a knock; the hero glances at us |
| (out) | 3.6 – 4.0 | the gadget starts home; cut on the beat |

Alternate **help** and **comeuppance**; escalate (a flick → a catch → a catch of a *person* → a car → three storeys up).
The biggest stretch is last. A gag is 3.5–5 s; the crossing / car gag earns 5.

## Timing rules
- 120 bpm (0.5 s a beat) makes the grid easy: shots of 8, 9 or 10 beats; `check` warns when a cut is off the beat.
- Contacts are hard ease-outs (`"snap"`), settles are springs (`wob`), throws are `arc`s; anything that falls uses
  real gravity (`y = y0 + v·a − 4.9·a²`) so the catch timing feels right.
- Give the eye 0.3 s on every new shape: the glove shapes (`KS`) change *before* the move, not during it.
- The music drops for one beat on the two biggest impacts (`stops`); everything else plays over the groove.

## Camera
- Locked wide from the sidewalk side: camera at y ≈ 1.2, 7.5–9 m from the facades, fov 33, looking slightly up
  (y ≈ 1.7–2.0) so the sky shows over lower buildings; a slow push of 0.3–0.6 m over the shot.
- Characters ≥ 35 % of the frame height; the hero on a third, the nuisance on the other.
- Tilt only when the gadget goes vertical (the balloon); a reverse angle only when the gag needs the road (the car).
- Keep lamp posts, trees and signs out of the line between the camera and the punchline.

## Safe gestures (important)
A lone raised finger seen palm-on or back-on reads as the middle finger at any size. Use `Glove.scold` (index
pointing straight at the person, shaking), the `spin` shape (index up, the other fingers loose) to balance things, an
open `stop` palm for "wait", `thumbsUp`, `ok` and `peace` only in profile. Review every still with this in mind.
