# Pounce — principle pass (the starter)

## Topic
- A grey shorthair cat spots a dry leaf on the floor, wiggles its hips, pounces and pins it.
- Why: a pounce is the textbook big move — it needs a gather (anticipation), a flight on an arc (arcs, stretch), a
  landing that squashes and settles (squash, follow-through), and a tail that trails the whole time (overlap).
- 6 s of action and rest, 3 s of study; 9 s.

## Creature
- quad, house-cat size (mass 1 — quick: gather 0.7 s, flight 0.5 s, settle 0.8 s).
- body 150 × 72, neck 18 × 46, head 46 × 56 (round, short snout), ears 28 × 24 pointed with a warm inside,
  tail 150 × 16 (7 segments, thin, dark tip), fore legs 44 / 42 / 16, hind 50 / 48 / 30.
- palette: coat #8f8a82, shade #5d5954, light #cfc9be, belly #ece6da, dark #7a756e, tip #3d3a36, eye #3a3a1e, nose #b9786e.
- follows through: tail (f 1.5, z 0.4, droops with vertical speed), ears (f 3.2, z 0.3), squash (f 4.5, z 0.3).
- idle: breath every 2.3 s, blinks ~3.2 s apart (some double), ear flicks at 0.6 s and 5.2 s, tail tip sways.

## Beats (story keys)
| beat | t0–t1 | story keys | label | tags |
|---|---|---|---|---|
| rest | 0–1.3 | 0: stand at X0 · 1.3: stand | — | — |
| spot it | 1.3–2.2 | 2.2: crouched, head low and level, ears forward | Spot it | eyes lead · overlap · slow in / out |
| pounce | 2.2–3.5 | 3.2: apex, body flat, fore legs reaching, hind legs trailing · 3.48: landed at XL (impact) | Wiggle, pounce | anticipation · arcs · squash & stretch |
| land | 3.5–4.6 | 4.25: settled, head down over the leaf, tail up | Land, pin it | follow-through · squash · settle |
| rest | 4.8–5.9 | holds | — | — |

## Pass
| beat | timing / spacing | anticipation | arcs | follow-through / overlap | squash & stretch | secondary | exaggeration |
|---|---|---|---|---|---|---|---|
| spot it | inOut | head and ears go 0.15 s before the body (eyes lead) | — | tail lags the crouch | — | ears forward | — |
| pounce | hips: a Hermite path through load → apex → landing, fast through the apex | wiggle (3 hip shifts, the hind feet tread) then a deep load 0.25 s before take-off | the hips' path is one curve; feet leave and land on lifted arcs | tail streams and droops, ears flatten in flight | load .94, stretch with speed (+≤10 %) | — | load deeper than the story crouch |
| land | impact at 3.48: comes in fast, stops dead | — | — | overshoot 7 px forward and down, then settle; tail whips up and settles over 0.5 s | squash .86 on contact, wobble back to 1 | ear flick at 5.2 | — |
- Staging: side view, the cat travels left → right, the leaf ahead of it from the first frame.
- Feet: fore planted until 2.97 / 3.0, land at XL + 145 / 133 at 3.4 / 3.43; hind tread once each in the wiggle
  (2.45–2.53, 2.62–2.7), push off at 3.04 / 3.06, land at 3.56 / 3.6. Front lands before back.
- Study: nose, hips, tail tip from 1.2 s; 6 ghosts.

## Review
- Round 1: cat read as a skinny dog (thin body, long snout, small round ears) → body girth 72, short round head,
  pointed ears drawn as triangles with a warm inside, bigger daubs.
- Round 2: meter — slow in / out 59 % (a foot left its plant at full speed), arcs 73° (feet kinked at take-off) →
  swing lift is sin² (no vertical jump), IK reach eases out instead of clamping, a long swing rides the body.
- Round 3: arcs 92° at the apex: `e: 'out'` on the landing key made every channel leave the apex at full speed →
  default inOut on every key; only the hips keep speed through the apex (Hermite path).
- Round 4: all 10 measured principles pass; before fails 7 (sliding feet 178 px, no squash, no anticipation, frozen rests).
