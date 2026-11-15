# TYPE — the quote stack

`F.quote(Q)` puts a quote on the type timeline (absolute seconds), independent of shots, drawn above the picture and
below the grade.

```js
F.quote({ t0: 8.4, t1: 14.2, x: 130, y: 230, size: 180,
  lines: ['i:Lost', 'D:time | i:is / never', 'D:found | i:again.'],
  by: 'Benjamin Franklin', src: "Poor Richard's Almanack, 1748", scrim: .35 });
```

| field | meaning |
|---|---|
| `t0`, `t1` | on screen from t0 to t1 (builds in from t0, leaves in the last .5 s) |
| `x`, `y` | top-left of the stack in stage px (1920 × 1080). Keep inside the 5 % title-safe area (check.mjs) |
| `size` | the size of a `D` word (px). 150–220 for a 3–8 word line |
| `lines` | the stack, top to bottom (below) |
| `by`, `src`, `byAt` | attribution: tracked caps name + italic source, under the stack (`'below'`) or beside it (`'side'`) |
| `align` | `'left'` (default) · `'right'` · `'center'` |
| `out` | exit: `'smear'` (default, words whip right) · `'fade'` · `'drop'` · `'none'` (hold) |
| `build` | force one build for every line (default: by role) |
| `col`, `shadow`, `scrim` | type colour (default paper white), shadow strength (.45), a dark radial wash behind the stack (0–.6) |

## Line markup
A line is segments joined by `' | '`; a segment is `role:text`. `role:a / b` stacks a and b small beside the previous
big word, top-aligned to its cap height (the "why / to live / can bear" look).

| role | face | size × `size` | default build |
|---|---|---|---|
| `k` | Inter, tracked caps | .11 | types on letter by letter |
| `s` | Playfair Display | .26 | fades, tracking closes |
| `i` | Playfair italic | .32 | fades, tracking closes |
| `I` | Playfair italic, big | .72 | rises from its baseline (masked) |
| `d` | Playfair Display | .55 | rises |
| `D` | Playfair Display, display | 1 | rises |
| `B` | Playfair Display Black | 1 | rises |
| `g` | Inter Extra Bold, tight | .6 | smears in from the left |
| `P` | Anton condensed caps, slanted | .84 | slams (scale 1.5 → 1, a small ring) |

Lines build top to bottom .2 s apart; the attribution fades in after the last line; on exit, lines smear out bottom-up.

## Composition rules
1. **One big word per line, at most two lines with big words.** The big words carry the thought (nouns, verbs).
2. **Contrast of scale ≥ 3×** between the big words and the italics. A stack of same-size lines is a caption, not this style.
3. **Left third, over a dark, quiet corner.** Paint the plate so that corner is dark (a gradient, a curtain, a dark
   doorway, a shadowed wall) — `check.mjs` fails white type over mean luminance > .42 (.55 with `scrim ≥ .3`).
4. **One quote on screen at a time**, never during a transition's busiest half.
5. **The kicker** is the original-language line, the author's theme, or nothing — not a label like "QUOTE".
6. **Time on screen** ≈ 1.2 s + 0.25 s per word, at least 4.5 s.
