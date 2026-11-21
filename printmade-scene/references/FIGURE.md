# The figure — rig, joints, cast sheet

## The spec
```js
new Figure({
  name: '수연', h: 372, mass: .9, headScale: 1,            // children: h 220–260, headScale 1.25–1.35
  skin: '#ecc9ae', blush: '#dc7a72', lips: '#b7524c',
  hair: { style: 'long' | 'short' | 'bob' | 'bun' | 'bald', color, len, wave },
  top: { kind: 'jacket' | 'coat' | 'dress' | 'apron', color, inner, pattern: 'check' | 'stripe' | 'plain', length, sleeves: 'short' },
  bottom: { kind: 'pants' | 'skirt' | 'shorts', color, pattern: 'speckle' }, legs, shoes,
  glasses: true | '#colour', mustache: true,
})
```
Proportions are fixed by the style: legs ≈ 0.51 h, torso 0.3 h, a 0.05 h neck, a head 0.17 h tall and 0.1 h wide (×
headScale), narrow shoulders (0.2 h).

## The rig
- A body frame at the pelvis: **yaw 0 faces the viewer, +π/2 faces screen right, −π/2 screen left, π away**. A figure
  facing right shows its **right** side: right limbs are near (drawn in front), the shirt front is on the facing side.
- Legs: two-bone IK from each hip to its planted ankle, the knee hinted forward → shins always fold back. The pelvis
  drops by itself when a stride needs more reach than the legs have (that is the walk's bob).
- Arms: FK angles (`sh` forward swing, `ab` outward, `el` elbow flex ≥ 0) or an IK `reach: [forward, right, up]` relative
  to the shoulder, the elbow hinted back and down → elbows bend forward only. `keyed()` mixes both as hand targets.
- Head: `head.yaw` (≤ ±90° on the neck), `head.pitch`; the face is a patch on an egg-shaped head, wide to the sides so a
  profile shows cheek, eye, nose and ear; features sit on the sphere and show only when they face us.
- Props: `hold: { R: (ctx, hand, F, pose, J) => … }` — `J.screen.hands` has both hands (a cloth between them).

## Joint limits (`JOINTS`, degrees) — `check` fails any frame outside
knee 0…150 · hip −45…110 · elbow 0…150 · shoulder −70…175 · neck yaw ±90, pitch ±45 · lean −30…35.
Also checked: legs reach their ankles (≤ 1 px short), hands reach their targets (≤ 2 px), planted ankles don't move on
screen (≤ 1.5 px), walkers face their way.

## The cast sheet (`render.mjs index.html --cast`, or `?cast`)
Per figure: front, 3/4 right, side right, back, side left, 3/4 left; walk right ×3, walk left ×3; a stepped turn ×3; a
big move to the right and to the left (antic, big, settle); the face turned to its right, front, turned to its left.
Score it before keying any beat:
- head, chest, pelvis and toes face the same way; the near arm and leg are on the facing side;
- the shirt front / coat opening is on the face side, never on the back;
- knees fold back, elbows forward; nothing reaches through the head;
- the face reads in profile (cheek, eye, nose, ear) and in front (two eyes, flush, mouth);
- "is the neck turned or the body?" — if you have to ask, fix the yaw or the head.
