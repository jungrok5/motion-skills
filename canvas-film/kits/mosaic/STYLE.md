# 로마 모자이크 (Roman floor mosaic)

Kit: `kit.js` → vendored as `scenes/kit-mosaic.js`, global `window.Mosaic`. Source: one-scroll-bible
`motion/films/messiah/kit-mosaic.js` (「메시아 예언과 성탄」, round 1, 2026-11-02). The drawing code is the film's file unchanged;
only the header gained the kit line. It depends on nothing but `lib.js` (`Pilot`). It is our own renderer. The look follows
OPUSCAR no. 73 (*Gladiator*, Roman Floor Mosaic, via the Lemo-Opuscar styleboard) and the floors it names: the Alexander
Mosaic and Zliten.

In that film it drew part 3, "the emperor's decree" (1:01–1:35), as a stone map.
- The Holy Land from Galilee to Judea is laid in stone: the coast with three wave courses out to sea, the Sea of Galilee, the Jordan, the Dead Sea, and terracotta rings for Nazareth, Jerusalem and Bethlehem.
- The camera pulls back to the whole empire, with coastlines from the `inkmap` kit's `MED` data. A purple seal stone appears at Rome, and the decree turns stones red outward from Rome along each road and sea lane.
- Back in, gold glass is laid stone by stone along the road from Nazareth to Bethlehem. Glints run along it and Bethlehem lights.
- Place names were dark "inscription" letters with a cream glow, and there was a soft dark band under the narration.

**Why it was dropped.** The maintainer rejected it within the hour (commit `85f556f`): "숏츠 즉 세로가 메인 … 지금 이거(로마 모자이크) 글씨도 안
보이고 내용 전달도 잘 안 되는 풍". On a phone in portrait:
- the stones (15 px, about 1/72 of the width, and smaller on the empire map) became an even texture;
- the coast, the roads, the labels and the decree's red stones all drowned in it.

This became a channel rule (film README §7 and `rules.json` `portrait-first`): a look whose texture covers the whole frame
(mosaic, pointillism) buries the map, the words and the people on a phone. Part 3 went to a silkscreen poster that same
evening (`silkposter`) and then to cinema (`world3d`). The film no longer loads this file.

Template: `template.html` is a different subject, after the Tabgha floor: an early-church floor of a basket of loaves
between two fish.
1. A lamp is brought in and its warm pool crosses the dark floor.
2. The light settles.
3. Gold glass stones turn over one by one in a ring around the basket.
4. A glint runs round the ring.

The template is the legibility fix:
- three big shapes;
- stones about 1/54 of the frame width (20 px portrait);
- strong value steps (dark outlines, slate fish, ochre basket on pale marble);
- words on a **plain stone threshold** below the floor, never on tesserae.

## What it looks like
- **Two kinds of laying:** square stone tesserae over a flat underdrawing.
  - Courses follow every outline (*opus vermiculatum*): the stone on the line first, then alternately outside and inside.
  - Flat areas are laid in straight, shifted rows (*opus tessellatum*). Small stones fill the holes the rows leave.
- **Each stone is a little irregular** in size, angle and corners. It is lit from the upper left (a bright rim on two edges, a shade on the other two) and set in dark grout.
- **The floor is a little worn:** noise in the polish and old dirt in the grout.
- **Colours are muted stone and glass:** burnt gold, umber, terracotta, warm marble, grey-blue sea, and one imperial purple at most.
- **Motion comes from details, not from the floor.**
  - A stone *turns over* to a new colour (`flip`): it narrows to an edge, then opens on its other face. Use it for a decree spreading or a road being laid.
  - Gold-leaf glass *glints* (`glint`).
  - Light moves over the floor (a lamp, a shaft of sun).
  - The camera pushes in slowly. The floor is built once, larger than the frame, so the stones never crawl.

## Meanings it carries
**Well:**
- Something laid down to last, stone by stone: an old floor, a church, a memory kept in a public place.
- Early-church symbols that are already mosaic subjects: loaves and fish, a fish, a vine, a peacock, a cross in a ring. The subject and the medium agree.
- Spreading, one unit at a time: news, a decree, a road. Stones flipping in order read clearly *if the path is big on screen*.
- A gold accent that has to feel precious: glass and gold leaf among plain stone.
- An archaeological "this was found" beat: a floor found by lamplight, a dust sheet pulled away.

**Badly:**
- Maps, diagrams and anything with small labels. This is the film's own failure, and fine geography dissolves into texture on a phone.
- Small figures and faces. A person needs about 8+ stones across to read.
- Fast motion. The floor is static by nature.
- Words on the floor. The grout and the stone edges cut through letters, and a cream glow behind dark letters reads as a smudge. Keep words on plain stone.

**The channel rule (`cinematic`, `portrait-first`).** As a full-frame look for a main scene this is the look the rule names
as rejected ("질감이 화면을 덮는 화풍(모자이크·점묘)은 폰에서 글자·인물이 묻혀 뺀다"). It is also a flat, frontal image, closer to
illustration than to a camera moving through space.

It can work in this channel only as a short insert that behaves like cinema:
- a real floor seen by a moving light, with a slow camera push;
- one big symbol filling the frame (loaves and fish, a fish, a cross);
- stones large relative to the frame;
- no labels.

Use it for a "found in an old church" moment, a reading hook, or a chapter plate. Never use it for a map or for a scene that
carries narration over fine detail. Other channels or series that are not bound by the cinematic rule can use it more freely
(a kids' series, an explainer about early-church art).

## Palette
| role | value |
|---|---|
| grout | `Mosaic.GROUT` `#2e241c` |
| marble ground | `[234,222,196]` → `[242,234,214]` cream (fbm mix) |
| outlines | umber `[104,72,46]`, near-black `[44,34,26]`, terracotta `[150,70,46]` |
| warm fills | ochre `[200,156,96]`, loaf `[196,128,70]` → crust `[232,190,128]` |
| cool fills | sea `[96,122,136]`, slate `[62,82,96]`, belly `[168,178,176]` |
| accents | gold glass `[226,178,76]` (the one that moves). The film also used decree red `[178,58,36]` and one imperial purple `rgb(86,40,92)` |
| threshold under the words | plain `#211913`, lit edge `rgba(232,206,160,.22)` |

## API (`const Mosaic = window.Mosaic`)
- `const m = Mosaic.build({ w, h, tile, seed, color(x, y) → [r,g,b], outlines: [{ pts, color, courses = 2, closed, side, courseColor(x, y, k), kind }] })` lays the floor once. Outlines are laid first, in list order, and each claims its stones. The rows then fill what is left.
  - `m.canvas` is the static floor (w × h).
  - `m.tiles` is `[{ x, y, a, s, c }]`.
  - `m.near(path, r)` returns `{ list: [{ i, d }], len }`: the tiles within `r` of a path, ordered by distance `d` along it. Use it to animate along a route or a ring.
- `Mosaic.flip(ctx, m, i, k, to, from?)` draws tile `i` turning over (`k` from 0 to 1) to colour `to`. Draw it in the floor's transform, over `m.canvas`.
- `Mosaic.glint(ctx, m, i, a)` draws a glint of strength `a` over tile `i`.
- `Mosaic.smooth(pts, n, closed)` (Chaikin), `Mosaic.resample(pts, step)`, `Mosaic.drawTile`, `Mosaic.GROUT`.

Build at about 1.25× and draw with `ctx.setTransform(z / MS, …)`, so a slow push stays crisp.

## Checks (what went wrong on the way)
- **The film's map was illegible on a phone.** Its stones were ~1/72 of the width, the coast was thin, the labels were small, and the red decree stones were lost in the texture. Pick stones ≥ 1/55 of the width, three big shapes at most, strong value steps between figure and ground, and no labels.
- **Straight outlines became blobs** (template, first try): a 4-point rectangle or trapezoid came out as a rounded "vase". `build` smooths every outline (Chaikin ×2), so pass straight edges densely sampled (`Mosaic.resample(pts, tile * .5)`). Then only the corners round.
- **Loaves read as a dark jumble.** A black outline and a black cross on a loaf only 7 stones across left half its stones dark. Use a single umber outline, no cross, a light crust lit from the upper left, and list front loaves first, so they claim the overlap.
- **Fish that are stood up on end** read as leaves in portrait. Lay them horizontally (above and below the central motif in portrait, either side in landscape) and give them an eye ring (black stone in cream).
- **Coordinate units.** `color(x, y)` and `outlines` are in floor px (frame px × your build scale). Mixing frame px and floor px misplaces eyes and stripes.
- **Words:** the film put dark letters with a cream glow on the stone. On a phone they are hard to read. The template's plain threshold below the floor is the fix.
