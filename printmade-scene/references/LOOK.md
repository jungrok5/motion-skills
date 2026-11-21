# The look — read from the source plates

What the concept art in 「인디 게임을 만들자」 (brunch @goevel/3, art by 김도윤) does, turned into rules this skill keeps.
Studied, not copied: none of its plates, characters or rooms are in this repo.

## The view: folded, not projected
- **Walls face on.** The back wall is an elevation: its windows, doors, paintings and shelves are rectangles, not
  trapezoids. In the kitchen plate the cabinets run straight across; in the dining room the paintings hang square.
- **Floors laid flat.** The floor is a plan seen from above, rising up the frame: tiles in rows parallel to the frame
  edges (the kitchen's stone floor, the bathroom's grid), a rug a flat rectangle with its pattern undistorted. The post:
  "the living room is in correct perspective, the rug is not" — that mismatch *is* the look.
- **Things show their best face.** A table shows its top as a plan and its legs as an elevation at once; chairs around
  it stand face on or back on. A side wall (the living room's bookcase wall) is a sheared panel, not a vanishing plane.
- **No diminution.** People and objects further back are higher on the floor, not smaller.
- In this skill: `plate.js` gives walls, floors in plan, tables with plan tops, sheared side walls; `KD` makes floor depth
  a vertical offset; figures have one size.

## The media: a print
- **Flat inks with ragged edges**, slightly uneven (mottle) — `print.ink`.
- **Dry speckle**: light specks knocked out of dark ink, dark specks on light — `mottle`, `printPass`.
- **Scratched hatching**: rain on glass as white scratches, shadow on wood as dark strokes — `scratches`, `hatch`, `rain`.
- **Wood grain** on planks and doors; **brick and tile** drawn as rows of small inked shapes — `grain`, `wall`, `floor`.
- **Chalky light cones** from small lamps — `cone`, `glow`.
- **Paper tooth** over everything — `printPass` (tooth, mottle, grain, knock).
- Figures carry the same grain, anchored to the body so it doesn't swim (`grainTile` as a pattern at the pelvis).

## The colour
- Muted mid-tones: slate and steel blue, sage and olive, straw and ochre, dusty rose, umber and walnut, cream and bone,
  a dusk violet for night skies. `PALETTE` in `plate.js`.
- **One accent, crimson**, used for the story's clue (in the source: vines, stains, a ghost's fire). Here it belongs to
  one thing per scene. `styleReport` measures the chroma outside the accent (≤ 0.26), a second loud colour (≤ 3 %) and
  the accent's share on the final hold (0.02–7 %).

## The people
- Tall and thin (about 8 heads with the neck), small long heads, long necks, narrow sloped shoulders.
- Flat clothes: a jacket or coat over a shirt with a pattern (a check), trousers with a speckle; shoes as small dark
  wedges.
- Faces: dot eyes under a heavy lid line, short brows, a nose line, a small mouth, **a flush on each cheek**.
- A dark ragged blot under the feet for a shadow.
- The source's character sheet shows them front, back and side — the cast sheet does the same, both ways.

## The words
- The place name set **vertically in the top-right corner** (거실, 부엌, 식당, 서재 in the source), small and bold.
- A **small title line centred at the foot** ("가족형 공포게임 스릴러 · 마마" in the source).
- Narrow pale **paper slips** with a line of tiny vertical text near a character.
- All in the bundled Pretendard Bold (KS X 1001 subset, OFL).
