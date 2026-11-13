# LOOK — palette, layout, type, motion

## Palette (`PALETTE` in lib/glow.js; override keys with `new Film({ palette })`, keep it warm on black)
| key | value | use |
|---|---|---|
| bg | `#090605` | the ground |
| bg2 | `#1a110a` | warm pool behind the subject |
| core | `#fff4dc` | white-hot centre of a lit node / line |
| line | `#f3c27c` | a lit line |
| halo | `#d98a32` | glow around lit things, bloom colour |
| deep | `#8a4d17` | faint far fibres |
| off / offHalo | `#9a958e` / `#5d5a56` | a switched-off node or line: cool grey |
| text | `#f5efe4` | captions, labels |
| mute | `#a49d92` | the axis |
| gold | `#f6c46a` | counter label, *highlighted* words, the climax number, names that matter |

Everything in a world layer is drawn with `'lighter'`: overlapping lines brighten like light. Then bloom (two blurred
down-scales added back), grain, vignette. Never fill a shape with an opaque colour in the world.

## Layout (1080 × 1920)
```
y   0 ┌──────────────────────┐
     │ (platform UI)          │  top 9 % unused
 ~250 │   gold label           │  counter: label 27 px tracked, number 96 px Bold, centre y ≈ 275
 ~330 │  caption line 1        │  caption: 46 px SemiBold, line height 1.42, centred, y ≈ 330 (first line)
 ~395 │  caption line 2        │
 ~470 │ ─ ─ ─ fadeTop ─ ─ ─ ─ │  nothing bright above this line (chain fadeTop, horizon fades)
      │ ┆ axis (x 52, 19 px)  │
      │ ┆      branches       │
 1240 │          ● subject      │  Film.center = [540, 1238]: camera y 0 puts the root here
      │                        │
 1575 │ (platform UI)          │  bottom 18 % kept free of type
     └──────────────────────┘
```
- A caption and the counter never share the screen; a caption may sit under a finished counter (y ≈ 430).
- Labels: 26 px (names), 30–34 px (named exceptions, group counts), gold for what the caption is about.
- Keep the growing tip at about 2/3 of the height when the camera follows it, so the light already travelled fills the
  frame above and the dim road ahead shows below.

## Type
Pretendard (bundled subset: 2,350 common Hangul + Latin). SemiBold 600 for captions and labels, Bold 800 for the counter.
`*word*` in a caption sets it gold with a glow. Use curly quotes “ ” for quoted words. Numbers use thousands separators
(`fmt`). check.mjs's glyph check fails any character outside the subset (rare Hangul, Hanja); run
`pyftsubset` on a full OFL font if a topic needs them.

## Motion vocabulary → API
| move | what it says | how |
|---|---|---|
| ignite | the subject appears | `g.node(0,0,{flare})` rising, `g.flare(…'soft')` pool, label fades in |
| grow / double | each step doubles | `binaryTree(...).draw(g, { grown })`; counter steps on `reach(k)` |
| compress | many generations far back | `stack({ first, ratio, min })` spacing; far rows as sampled fibres + bright rows |
| horizon | the edge of the known past | `g.horizon(y, { a, haze })` above the top row |
| descend | a line read as written | `chain(...).draw(g, { grown, down: true })` + a follow camera; a grey ghost of the road ahead |
| trace | one path out of many | draw one `chain` / curve set bright over a dimmed tree |
| switch off / on | lost and restored | `on: i => 0..1` (grey ↔ gold) per node or generation |
| bracket / group | the source's own grouping | `g.line` brackets + a gold label |
| side node | a named exception | `g.node` beside a row, `sCurve` into the child, gold label |
| converge | many → one | `converge(list, point, u)` |
| burst / fan | one → countless | `fan(...)`, staggered growth per fibre, end nodes twinkle, a lower horizon |
| drift | things that do not define it | `F.words(...)` blur away |
| return | the end | everything converges / fades to the one node, last caption names it |

Pacing: 4.5–6 s per caption; a counter step every 0.3–0.6 s; camera moves 1.5–3 s with inOut easing; hold a reveal
≥ 2 s before the next caption.
