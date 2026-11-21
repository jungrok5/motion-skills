# CAST — paper-cut puppets

A puppet is a handful of die-cut card parts — tail, far boot, near boot, coat, bag, head, eyes, paw (plus an
optional carried item) — drawn from flat polygons with a cream cutting margin, hinged at pivots, and posed by pure
functions of time (`kit/puppet.js`). The back of every part is plain card, so a puppet seen from behind or edge-on
during a turn reads as a paper doll, not as a mirrored drawing.

## A cast member

```js
quill: { name: 'Quill', species: 'bird', mass: 'light', height: 1.08,
         fur: '#9aa8ba', belly: '#ece6da', coat: '#3c6d8e', coat2?, collar?, button?, sleeve?, paw?, boot?, eye?, nose?, inner?,
         hat?: { type: 'cap' | 'beanie' | 'tall', color }, bag?: '#b8763b', tail?: 'bushy' | 'thin' | 'round' | 'feather' | 'none',
         item?: [{ pts, fill }, …] }   // carried in the paw, points around the mitten (0, 0)
```

Species shipped: `fox cat bear mouse rabbit owl bird frog penguin`. A species is only a head outline, ears, muzzle,
nose, eye placement and a tail — write a new one inline (`species: { head, ears, muzzle, nose, eyes, tail, face }`
in card units) when the topic needs a heron or a hedgehog. Design for the topic: pick the animal that belongs to the
place (the owl keeps the address book), then colours and a coat that say its job.

## Card space and the body rules

100 units = the puppet's height, origin at the soles, y up. Art faces **right** in 3/4 view:
- the snout / beak points +x; the **far eye** (on the +x side) is narrower than the near eye;
- the near shoulder, paw, boot and bag sit on the **back side (−x)** and are drawn in front of the coat;
- the coat's far half (+x) is the darker tone — the fold faces the light;
- facing left mirrors the whole rig, so asymmetric details flip with it (check both on the cast sheet).

Joint limits (`LIMITS`, degrees; `check.mjs` fails outside them): lean ±12, head ±22, tail ±40, boot ±28,
**paw −25…95** (the near arm is drawn over the body — raised higher it would cover the face; cheer with a fist
pump, point at chest height), bag ±18. Part lengths never change; only the coat squashes (breath, landing).

## Motion (code-keyed — this skill takes no generated motion)

Weight sets timing (`MASS` in `kit/puppet.js`):

| mass | step | breathe | gather | hop | land | recover | turn |
|---|---|---|---|---|---|---|---|
| light | 0.24 s | 2.6 s | 0.16 s | 0.30 s | 0.10 s | 0.26 s | 0.30 s |
| medium | 0.31 s | 3.3 s | 0.22 s | 0.36 s | 0.13 s | 0.34 s | 0.38 s |
| heavy | 0.42 s | 4.2 s | 0.32 s | 0.42 s | 0.18 s | 0.48 s | 0.52 s |

- **Walk** — a side-shuffle of boots: the boot on the side being walked toward steps, then the other closes. The
  planted boot never moves (`check.mjs` measures it: ≤ 1.5 px). The body rides between the boots with a small bob,
  leans back 0.12 s before the first step (anticipation) and tips forward then settles after the last (recovery).
  Tail and bag swing against the step.
- **Turn** — stepped: the card swings edge-on, flips, swings back, lifting one boot on each half. Boots don't slide.
- **Idle** — every rest breathes: the coat rises on the mass's breath period, the head follows a beat later, the tail
  sways, weight shifts on a slow 7.3 s beat, eyes blink on an irregular 2.2–5.4 s beat. Periods don't line up.
- **Point** — the guide dips the paw (gather), raises it to ~74° toward the prop, holds with a small wobble, lowers
  with a little overshoot.
- **Cheer** (the big move) — gather (squash, head down, paw back) → hop (paw up to 88°, tail flick, boots tuck) →
  land (squash) → recover (settle with overshoot). Heavier = longer gather, lower hop, harder land.

Never tween a limb on its own: the moves above drive coat, head, tail, bag and boots together with offsets.

## The cast sheet

`kit/cast.html?book=<path to book.js, relative to kit/>` draws every cast member facing right, facing left, from
behind, mid-step, mid-turn, the cheer's gather and hop, and pointing. Render it before writing any scene:

```bash
node <skill>/scripts/render.mjs <skill>/kit/cast.html out/cast --stills 0 --size 1600x1300 --query book=../examples/packet-post/book.js
```

Score it with the body lines of the still review (BRIEF.md 6). Any joint outside its limit is logged in the console
(`window.castReport`).
