# LOOK — the film, beat by beat

1080×1920, 30 fps, white artboard. Durations are the defaults; set them in the page's `timing`.

| act | default | what you see |
|---|---|---|
| sketch | 2.2 s | The rough grey marker sketch (derived from the mark: corners pushed off, softened, edges wobbling, marker streaks along the lean, dry-brush speckle) and the handwritten signature in light grey. The cursor drifts in. |
| construct | 14–20 s | Guides in authoring order. A line: the cursor travels to the nearer end (crosshair), presses, pulls the line out, releases. A family member: alt-drag a copy (double-arrow cursor) from the previous line. A circle run: the camera zooms in, each circle is dragged from its centre with a W / H tooltip, copies of equal circles are dragged across, the camera zooms back. A distributed family: the Align panel opens, a button is pressed, the lines slide into even spacing. |
| select | 2.6 s | Marquee drag; all guides turn blue with anchor squares; the tool strip slides in; the shape-builder tool is picked (cursor gains a "+"). |
| build | 7–8 s | Camera eases closer. For each shape in order: hover (grey dots + red edge), click, it fills ink. Cut circles stay paper. |
| clean | 1.1 s | Guides flash blue and are deleted; the sketch fades; the tool strip leaves. |
| refine | 4–5 s | Anchor squares on every corner. Groups of shapes, left to right: the camera pans to the group (never during a drag), the direct-select cursor pulls a corner widget inward, the group's corners round. |
| reveal | 2.8 s | The camera pulls back: the mark small and centred, the wordmark (or the signature) under it. |
| mockups | 1.7 s each | Hard cuts between still scenes drawn in code, each with a slow push-in. |

## Constants of the look

- Guides: 2.2 px hairlines at constant **screen** width whatever the zoom, black; selection blue `#3d7bff` with 6 px
  anchor squares; hover red `#e0344a`.
- Guides run across the mark and stop ~60 px inside the frame, so every line is drawn where the cursor is seen.
- Ink defaults to near-black `#111`; a brand ink is fine (`ink`), paper stays white.
- Cursor: travels at ~1,900 px/s with an eased start and stop and a slight arc; a long line is pulled over up to
  0.7 s; check.mjs fails a free move faster than 150 px/frame or a drag faster than 240 px/frame.
- Camera: zooms only on circle runs, the build, the refine groups and the reveal; moves in log-zoom with ease-in-out.
- Sound (synthesised by `scripts/sound.mjs`): a click on every press and release, a soft "thock" per fill, a double
  tick for the Align snap, a swish on delete, a low thump per mockup cut, over a quiet four-chord pad. `--silent` drops
  it; `--audio music.wav` mixes your own track under the clicks.

## Mockups (`lib/mockups.js`)

| kind | scene | keys |
|---|---|---|
| `fabric` | close-up of a fleece chest: fibres, zip, collar, seam; the mark printed by the zip, folds over it, shallow depth of field | `base`, `ink`, `size`, `at` |
| `bottle` | a powder-coated bottle against blurred hills; the mark wrapped round the cylinder; droplets; carry-loop cap | `base`, `ink`, `sky`, `ground`, `cap` |
| `card` | two business cards on stone in window light: the back in brand colour with the mark, the front on paper with the mark and `text` ("Name · line two") | `base`, `ink`, `paper`, `cardInk`, `text`, `surface` |
| `sign` | a round blade sign on a plaster wall under a warm lamp, bevelled rim, iron bracket, cast shadow | `base`, `ink`, `wall`, `rim`, `text` |
| `tote` | a canvas tote, weave texture, handles with stitching, screen-printed mark (worn ink) and `text` | `base`, `ink`, `back`, `text` |

Pick 2–4 that suit the brand (a ferry line: sign + tote; a coffee roaster: fleece + bottle + cards). A new kind is a
function `(g, mark, opts, rng)` added to `MOCKUPS` in your project's copy of `lib/` — draw the surface, place the mark
with `mark.sprite(size, ink)`, then light it so it sits *on* the surface.
