# FIGURE — the walker's body, and how it is kept possible

```js
W.figure(new Figure({
  height: 1.72, build: 1,                                       // metres; shoulder and hip breadth
  hair: 'short' | 'long' | 'bun' | 'curly' | null, sleeves: 'long' | 'short', legs: 'trousers' | 'shorts' | 'skirt',
  hat: { kind: 'beret' | 'cap' | 'brim' | 'straw' | 'beanie', band },   // or none
  coat: { length: 0.62, flare: 0.3, open: true | degrees },     // cloth from the shoulders; length 0…1
  scarf: { length: 0.6 }, bag: 'left' | 'right',                // a satchel at that hip, its strap across the chest
  neckerchief: '#e2443c',
  carry: { kind: 'basket' | 'bag' | 'staff' | 'flowers' | 'book' | 'lantern', side: 'right' | 'left', fill: [...], colour },
  colours: { skin, hair, top, stripes, legs, socks, shoes, hat, coat, scarf, prop, bag },   // pencils; stripes: hoops on the top
}));
```
There is no model, no animation clip and no physics. `pose()` works the body out from where the walker is on the way:
- **Feet are planted.** Stride phase is distance walked ÷ stride length, so a foot's plant is a point of the way; it
  stays there through its stance and is lifted over to the next. Feet cannot slide. The ground under a foot is
  `W.standAt` — so feet climb a bridge's arch.
- **Legs** reach their foot by two-bone IK; the knee is always on the forward side, so the shin only folds back.
- **Arms** swing against the legs; the forearm only folds forward. A carrying arm is held bent (how bent depends on
  what is carried: flowers held up, a basket hanging).
- **Chest** counter-turns against the hips and leans with speed; the **head** faces the way, or turns to a shot's `look`.
- **Cloth** (coat, scarf) hangs and trails by rule: speed, stride, wind — a function of place and time.
- Every part is a soft piece (capsules, a ball head with eyes, nose and ears, a kneaded shoe) drawn with the pencil
  material and its own stroke field, so the strokes ride with the limb.

Directions: the figure faces +z of its own space and **+x is its left**. `side: 'right'` is the walker's own right
hand, seen on screen-left from the front.

## Joint ranges (`LIM`, degrees) — `audit()` reports any pose outside them
| joint | range | |
|---|---|---|
| knee | 0 … 150 | folds back only |
| elbow | 0 … 150 | folds forward only |
| hip | −40 … 120 | thigh behind … in front |
| shoulder | −70 … 175 | |
| neck | turn ±80, nod ±40 | a `look` beyond is clamped to ±70 |
| chest against hips | ±40 | |
| lean | −10 … 30 | |
A standing foot more than 3.5 cm off the ground is reported too. `check.mjs` audits every film pose (10 a second) and
every cast pose.

## The cast sheet
`render.mjs world.html --cast --scale .5` → front, both 3/4s and sides both ways, back; walks facing right and left at
four phases; from behind; runs. Score it with Review 1 in BRIEF.md before writing shots. Things to look for in this
style: a turned piece whose profile runs top-down has its faces inward and is seen through (a skirt showed the hips from
behind); a hat pulled too low hides the face (the beanie sits back off the brow); a pale top against pale paper needs
its stripes or a darker pencil to be found.
