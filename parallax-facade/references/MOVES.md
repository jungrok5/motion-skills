# Moves: the flat view, the dolly zoom, and the beat grammar

## Why a 3D street looks flat

A camera far away with a long lens compresses depth: an object at depth `z` behind the facade plane is scaled by
`D / (D + |z|)`, where `D` is the camera's distance to the plane. With `fov = 6°` and a 13 m frame, `D ≈ 124 m`, so a
tower 80 m behind is drawn at 0.61× — big enough to look like it stands right behind the shops. Put the eye at the
roofline and level, and every row behind that is no taller lines up with the front row and disappears.

The reveal is a **dolly zoom**: the field of view widens while the camera moves in, keeping the facade plane exactly the
same size on screen. `D = H / (2 · tan(fov / 2)) · zoom`, with `H` the frame height on the plane. At `fov = 52°`,
`D ≈ 1.0 H`: the same tower is now drawn at `13 / 93 = 0.14×` — 4–6× smaller than it was. The front row hardly changes;
everything behind it rushes away. That contrast is the whole effect.

The engine interpolates fov through `log(tan(fov / 2))` so the zoom feels even, and moves the camera on a sphere around
the pivot (yaw, pitch) at the distance `D`, so every view keeps the facade at the same size.

## Views (`lib/facade.js` `VIEWS`)

| view | fov | pitch | yaw | pivot | what it shows |
|---|---|---|---|---|---|
| `flat` | 6 | from `eye` (≈ 0) | 0 | facade centre | the elevation: one flat picture |
| `deep` | 52 | 3 | 0 | focus (the gap) | the dolly zoom: the gap becomes a long street, the landmark far |
| `rise` | 46 | 16 | 0 | focus, 0.4 H into the gap | crane up: over the gap, the street and its sides |
| `high` | 42 | 25 | 0 | focus, 2.6 H into the gap, 2.4× back | bird's-eye: roofs to the horizon, the alley, the plug |
| `left` / `right` | 44 | 20 | −32 / +32 | focus | an orbit to the side: the row in 3/4, the street diagonal |
| `low` | 58 | −1 | 0 | focus, low | a worm's-eye up the street |

Override any number per beat: `{ view: "right", zoom: 1.3, pitch: 18 }`. Pivot offsets `px`, `py`, `pz` are in units of `H`.
`eye: 5.2` replaces a pitch with a camera height (the flat view uses the film's `eye`).

## Beats

```js
F.beats(["flat", "deep", "right", "deep", "flat", "rise", "high", "left", "flat"], { beat: 1.0, move: 0.42, ease: "snap" });
```

Each entry after the first is reached by *hold* (`beat − move`) then *move* (`move`). The reference holds ~0.55 s and moves
in ~0.3–0.45 s with heavy blur, one move per second, eight per loop. Rules:

- Start and end on `flat` (check.mjs fails otherwise). Show `flat` at least twice per loop (the trick lands every time).
- Go out through `deep` at least once: it is the move that proves the flat picture was a lie.
- Alternate directions: after a `right`, come back through `deep` or `flat` before `left`.
- A side or high view that sees mostly roof tops or one wall is wrong for this town: raise `zoom`, change `pitch`, or move
  the pivot (check.mjs warns when ≥ 4 of 9 rays hit something within a fifth of the distance).
- Eases: `snap` (quintic in-out, default), `glide` (softer), `whip` (exponential). Per beat: `{ view: "high", ease: "whip" }`.

## Motion blur

Every move renders sub-frames across a one-frame shutter and averages them in a float buffer. The count adapts to how far
the picture moves (`travel()`: the shift of the frame corners, the focus and the landmark, in pixels, ÷ 3, up to 24); a
hold renders once. `?blur=1` turns it off for quick previews; the live player uses 3 sub-frames.

## Composition numbers that worked

- Frame height `H` ≈ 1.4–1.8 × the front roofline; the roofline sits ~60–70 % up the flat frame; sky 18–30 % of it.
- `eye` = the lowest front roofline (or mid-roof for pitched roofs). Size the town behind with `F.hide(z, roofline)`.
- Gap width ≈ 0.2–0.3 of the flat frame width, off-centre by a little; focus at the gap's centre.
- Plug 20–35 m back, landmark 80–160 m back; landmark 30–90 % of the frame height when flat, shrinking 4–6×.
- Front road lanes 2–5 m in front of the row; cars at toy scale (`size` 0.55–1) so they never block the alley in `deep`.
