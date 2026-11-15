# BODY — a character's body must be possible, and turn one way

Most pieces in this style are one illustration of one character, usually a bust. There is no walk cycle to rig, but
a face and shoulders can still be drawn impossibly: a far eye bigger than the near one, a nose pointing one way while
the jaw turns the other, a neck twisted past what a neck does. This file is how the skill checks that, every time.

## What you declare
```js
s.setPose({ facing: 'left', head: { yaw: -30, roll: -4, pitch: -6 }, torso: { yaw: -12, roll: 2 } });
s.eye({ side: 'L', … }); s.eye({ side: 'R', … });             // eyes record their centre and size
s.mark('nose', x, y).mark('mouth', x, y).mark('chin', x, y).mark('ear', x, y);
s.mark('neck', x, y).mark('shoulderL', x, y).mark('shoulderR', x, y);
```
- `facing`: which side of the picture the face turns to. `yaw`: negative = toward the picture's left. `roll`:
  degrees the head leans (clockwise +). `pitch`: down −.
- Marks go inside the same `push` as the part they belong to, so they follow the transforms.
- `side` of an eye = the side of the picture it is on. For a face turned left, 'L' is the far eye.

## What check.mjs proves (the joint limits and the facing rules)
| rule | limit |
|---|---|
| neck turn: \|head yaw − torso yaw\| | ≤ 90° |
| neck tilt: \|head roll − torso roll\| | ≤ 45° |
| head pitch | ≤ 45° |
| facing matches yaw | left → yaw < −5°, right → > 5°, front → \|yaw\| ≤ 15° |
| far eye narrower | facing left → L/R width < .96; right → > 1.04; front → .85–1.18 |
| eye "L" is on the left | yes |
| eye line leans with the head | within 12° of roll |
| nose toward the facing side | of the eyes' midpoint |
| ear on the back of the head | behind the nose |
| order down the head | eyes → nose → mouth → chin → neck, measured along the head's own axis |
| shoulder line | within 30° of level |

## The body sheet (look at it)
`check.mjs` writes `out/<name>-body.png` with three panels:
1. **line art + marks**: the eye boxes, the eye line, the marks and the shoulder line over the line art. Every mark
   sits where its part is drawn.
2. **finished**.
3. **mirrored, with the marks**: flipping a picture is the classic way painters catch a drifting face. If the mirrored
   face looks lopsided (one eye higher, the jaw turning away from the nose), the drawing is wrong, not the mirror.

Ask of each panel: *Does the face turn one way as a whole? Is the far eye narrower, with the nose and chin toward the
facing side and the ear on the back? Could a neck do this?* A panel that makes you ask "is the neck twisted, or the
face?" fails. Fix the rough (step 3 of the workflow) and redraw from there.

## Front, back, left, right
- Turning the same character the other way: mirror the authored head with `s.push({ sx: -1, ox: 500 })` only for a
  symmetric design. Then re-check what must not flip: the parting, a one-sided hair clip, text, and the light (the key
  light side changes the shadow shapes, so redraw them).
- A back view hides the face: draw no eyes, set `facing: 'back'` (the facing checks then skip) and mark the neck and
  shoulders.
- Hands in the picture: fingers bend toward the palm only, the thumb comes from the side of the palm, and the wrist
  bends at most about 80°. Keep a hand away from the near eye unless the brief asks for it.

## When you change a face
Re-run `check.mjs` and look at the body sheet every time you move an eye, the jaw or the nose. Note in `BRIEF.md` what
the sheet showed, and in `references/LESSONS.md` if it taught something new.
