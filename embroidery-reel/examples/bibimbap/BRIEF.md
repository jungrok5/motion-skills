# 비빔밥 한 그릇 — brief

## Topic
A recipe as an embroidery reel: the six things that go into a bowl of bibimbap, in the order they go in, ending on the
bowl as a list. For a short vertical post (Korean audience). Not in the source (15 GitHub repos) — this example exists to
prove the skill designs a new topic instead of re-skinning the source.

## Items
| # | title | tag line | small line | patch idea |
|---|---|---|---|---|
| 1 | 밥 | 갓 지은 흰쌀밥 한 공기 | 쌀 2컵 · 30분 | a brass bowl (yugi) of rice, steam above; indigo rounded base |
| 2 | 시금치 나물 | 데쳐서 참기름에 조물조물 | 30초 · 소금 한 꼬집 | three spinach leaves with pale veins and a pink root; cream base, green edge |
| 3 | 당근 | 곱게 채 썰어 살짝 볶기 | 중불 · 2분 | a carrot with ridges and leafy top, diagonal; navy pill base |
| 4 | 달걀 프라이 | 노른자는 반숙으로 | 약불 · 뚜껑 덮고 3분 | fried egg, yolk with a highlight, a running-stitch ring; teal base |
| 5 | 고추장 | 한 숟갈, 매운 건 취향껏 | 찹쌀 고추장 · 매운맛 3 | an onggi jar with a red 고추장 label (stitched lettering) and a chili; cream base, red edge |
| 6 | 참기름 | 마지막에 두 바퀴 둘러서 | 볶은 참깨 · 한 스푼 | an amber oil bottle, red cap, cream label with sesame seeds, a drop; navy base, gold edge |

## Patches
Sewing order is under → over: base satin (angle varies per patch so neighbours catch the light differently), then the
picture, then details (veins, ridges, seeds, highlight), the edge last. Bases alternate dark / light down the grid
(indigo, cream, navy, teal, cream, navy) and change shape (rounded rect, pill) so no two neighbours look alike.
Grain-like stitches follow the subject: rice at 20°, carrot along its length (135°), leaves each at their own angle.

## Palette
Cloth `#d3c4a3` (warm greige linen) · title thread `#26304f` (contrast 7.5) · paper `#f5eedd` · accent `#b83a2c` ·
cord `#e0b743`. Threads: indigo `#26335c`, cream `#f4ecdc`, brass `#c99a3e`, spinach greens `#2f6e3b` `#3f8a4a` `#57a457`,
carrot `#ef7f2c`, teal `#2a8c86`, yolk `#f2a81e`, onggi `#6b3a24`, gochujang red `#d33a2c`, oil amber `#d49a2c`.

## Timing
Defaults: beat 2.2 s, stitch 1.2 s, travel .7 s → 6 items ≈ 14 s, outro (rise, cord, card) ≈ 7 s; 21 s in all.
Outro: 「비빔밥 한 그릇.」 / 「한 땀 한 땀.」 / footer 「여섯 가지를 한 그릇에 — 비비면 끝」.

## Props
Default mix; spools take the patch threads (brass, greens, carrot orange), so the table looks like it sewed this bowl.

## Stills review
Rendered `render.mjs examples/bibimbap --items` and `--stills 1.2,3.6,10.3` at full size.
1. Each patch says its item: bowl of rice, spinach, carrot, egg, jar labelled 고추장, oil bottle — readable without the
   title. The leaves rise from one root (−128°, −90°, −52°) so the bunch reads as a plant, not three loose leaves.
2. Embroidery: satin rows and the brick split of long fills show at close range, raised edges cast a soft drop shadow,
   sheen moves with the leaf light. While sewing, a shape that will be covered later (the bowl over the rice) shows as a
   gap until its turn — reads as the pattern being filled, kept.
3. One style: same thread width, the same 3.2-unit edge on every base, one palette family.
4. Phone: title caps ≥ 75 px, tag caps ≥ 21 px at 1080 wide (check.mjs); the small mono line is the weakest — kept
   at 36 px on the tag texture and darkened.
5. Needle: plants and rises before each plunge (41/41 in check.mjs); thread takes the colour being sewn (white over
   the rice, red on the label).
6. Camera: each item whole when its tag lands; moves grow out of the hold drift (no reversal after the C2 fix).
7. Light: leaf shadows soft and drifting; a spool's shadow falls across 시금치 나물 — kept, it sits on the cloth, not the
   title.
8. Outro: cord runs the gaps between rows into the card; card list 36 px caps.
9. Nothing hides a title or a patch; guide lines fade as each element finishes.
