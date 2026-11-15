# LOOK — the page, the stages, timing and colour (fixed for every piece)

## The page (1080 × 1220)
| part | value |
|---|---|
| background | `#ebe5dc` → `#e4ddd2` vertical gradient |
| title | Pretendard 800, 37 px, letter-spacing 3 px, `#2a2421`, baseline y 63, left x 21 — 「메이킹 재생」 / "Making replay" |
| note | Pretendard 600, 17 px, `#8d847b`, right-aligned to the card, baseline y 56 — 「선도 색도 코드로 그리고 있습니다」 |
| chips | 40 px high pills from x 21, centre y 102, 9 px apart; dot + label (600, 20 px). Now: fill `#c4552d`, white text. Done: `#f8f5f0` + `#4f4844` text. To come: `#a69d94` text. 1.5 px `#e0d8cc` outline |
| card | x 21, y 138, 1038 × 1038, radius 9, shadow rgba(70,50,30,.16) blur 22 y 5; paper `#fdfcf8` (per piece: `new Sketch({ paper })`) |
| picture | art units 0…1000 square, mapped onto the card (1 unit = 1.038 px) |
| stylus | 250 px white barrel with a grey cone nib and a dark point, pointing down-left at −56°; soft shadow on the paper that moves away when the pen lifts |

Override with `new Replay(art, { labels: 'en' | { title, note, chips }, theme: { accent, bg, … } })` only when the
audience needs it. The layout itself does not change.

## The six stages
| stage | made with | looks like | reveal |
|---|---|---|---|
| rough | `s.rough`, `s.ellipse` | `#6f9be0`, 1.7 units, slightly loose, alpha .45–.8 | drawn along the line; fades to 45 % during the line stage and out during the flats |
| line art | `s.ink`, `s.lock`, `s.eye` | dark ink (`#231c24`-ish), filled tapered outline, thin in / full / thin out with a small wobble; contours 3.4–4.2, inner 1.5–2.6, lids 5–7 | drawn along the line |
| flats | `s.flat(name, …)` | one colour or gradient per material, opaque, under the line art | brushed in: a round brush sweeps back and forth across the region at an angle, a ragged edge leading |
| shadow | `s.shadow` | multiply; crisp (blur 1–2) on skin and cloth, soft (5–10) on hair masses and cast shadows; clipped to the visible part of a region | brushed in |
| highlight | `s.light`, `s.edge`, `s.lens` | screen (or white source-over for catchlights); cool from a window, warm from a lamp | brushed in |
| finish | `s.glow`, `s.bloom`, `s.fx`, `s.inkTint` | big gradients of light, a colour grade, bokeh, rain, rays, a vignette; the line art tinted toward a colour of the picture | fades in (glow, fx); `over: true` lays it above the line art |

## Timing
- Each stage gets its seconds (`stages: { rough, line, flat, shadow, highlight, finish }`); items share them by how
  much drawing they are (stroke length, region sweep length, `weight`, or a fixed `dur`). Items in a stage follow one
  another; the pen glides between them.
- Typical: rough 3–6 s · line 7–16 s · flats 4–6 s · shadow 4–7 s · highlight 3.5–6 s · finish 3–5 s · hold 2.5–3 s.
  Total 25–60 s (source: 47 s).
- The intro is 0.6 s of blank card with 「러프」 lit; the hold shows the finished piece with the stylus gone.

## Colour
- The UI stays neutral beige so any picture sits well in it; the accent is the one orange.
- Each piece has its own palette (BRIEF.md): per material a base, a multiply shadow and a screen highlight, plus a key
  light and a rim or bounce of a different temperature (cool window / warm lamp, warm sun / cool sky).
- Multiply shadow colours are light and slightly cool or pink (`#efc4c4` on `#f8e1d2` skin). A saturated shadow colour
  multiplies into mud or a bruise.
