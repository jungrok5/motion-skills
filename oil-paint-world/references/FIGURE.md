# FIGURE — the wanderer's body, and how it is kept possible

```js
W.figure(new Figure({
  height: 1.7, build: 1,                                  // metres; shoulder and hip breadth
  hair: 'short' | 'long' | 'bun' | null, sleeves: 'long' | 'short',
  hat: { kind: 'brim' | 'cone' | 'cap' | 'beanie', r },   // or none
  coat: { length: 0.44, flare: 0.2, open: true | degrees },   // length: 0…1 of the way from shoulder to ground; open: a cape
  scarf: { length: 0.6 }, pack: true,
  carry: { kind: 'staff' | 'lantern' | 'bag', side: 'right' | 'left', glow },
  palettes: { skin, hair, top, legs, shoes, coat, hat, pack, scarf, prop },   // each pal(...) or mix3(...)
  paint: 300,                                             // strokes per m² of body
}));
```
There is no model and no animation clip. `pose()` works the body out from where the wanderer is on their path:
- **Feet are planted.** Stride phase is distance walked ÷ stride length, so a foot's plant is a point of the path; it
  stays there through its stance and is lifted over to the next plant. Feet cannot slide. Stride and cadence follow
  speed (`strideFor`): a walk below 2.2 m/s, a run above 3.
- **Legs** reach their foot by two-bone IK in the plane of travel; the knee is always on the forward side, so the shin
  can only fold back. The hips ride as high as the standing leg allows.
- **Arms** swing against the legs; the forearm only folds forward. A carrying arm is held bent and the thing hangs from
  (or is held in) that hand.
- **Chest** counter-turns against the hips and leans with speed; the **head** faces the way, or turns to a shot's `look`
  within its range.
- **Cloth** (coat, scarf) hangs from the shoulders and neck by rule: it trails with speed, swings with the stride,
  lifts in the wind. It is a function of place and time, like everything else.
- The body is capsules in flat three-mix paint (the underpaint) with a few hundred pins carrying strokes that run down
  each limb. Parts and cloth are drawn into the shadow picture.

Directions: the figure faces +z of its own space and **+x is its left**. `side: 'right'` is the wanderer's own right
hand in every view — seen from the front it is on the left of the screen.

## Ranges (`LIM`, degrees) — `audit()` fails a pose outside them
| joint | range | |
|---|---|---|
| knee | 0 … 150 | folds back only |
| elbow | 0 … 150 | folds forward only |
| hip | −40 … 120 | thigh behind … in front |
| shoulder | −70 … 175 | arm behind … overhead |
| neck | turn ±80, nod ±40 | |
| chest against hips | ±40 | |
| lean | −10 … 30 | |
Also reported: a foot out of the leg's reach; a standing foot above or under the ground.
`W.runChecks()` (and so `check.mjs`) audits every tenth of a second of the film and every pose of the cast sheet.

## The cast sheet — `render.mjs world.html --cast --scale .5`
22 tiles: standing from the front, both 3/4s, both sides, both back 3/4s, the back; walking at four phases facing
right and two facing left, from behind and from the front 3/4; running at four phases facing right, one facing left,
one from behind. The labels are printed with tile numbers. Score it with Review 1 of BRIEF.md before writing shots.
What to look for, from what has gone wrong:
- A hat or hair that hides the face from the front (hair is a cap tilted back; a new hat must leave the face).
- A coat so closed and pale at the front that it reads as a beard: give the neck room, darken the top, or open the coat.
- A thing carried in the wrong hand in the mirror-image view — check tiles 2 and 6 (their right side, their left side).
- A run whose trailing thigh goes past the hip's range: shorten the stance, raise the heel sooner (`duty`, heel lift).

## A different body
A child (`height: 1.2`), a broad figure (`build: 1.25`), a figure in a long coat (`coat.length: 0.8`) are options. A
dress, a hood, a child on shoulders, an animal are new parts: add them in the project by subclassing `Figure` (`attach`
adds parts with pins, `pose` places them from the joints in `this.J`), keep the joint ranges, and add poses to `cast()`.
A four-legged animal needs its own rig and ranges (front lower legs fold back, hind lower legs forward) — do not bend
this one into it.
