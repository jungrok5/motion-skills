# Fonts

| file | family | used as | license |
|---|---|---|---|
| `Inter-500.woff2` · `Inter-600.woff2` · `Inter-700.woff2` | Inter (latin subset, from `@fontsource/inter` 5.1.0) | `sans` — site body, editor UI | SIL OFL 1.1 — `OFL-Inter.txt` |
| `SourceSerif4-Variable.woff2` · `SourceSerif4-Italic-Variable.woff2` | Source Serif 4 (latin subset, variable 200–900) | `serif` — site headings | SIL OFL 1.1 — `OFL-SourceSerif4.txt` |
| `JetBrainsMono.woff2` | JetBrains Mono (latin, variable 100–800) | `mono` — tags, size labels, rulers, HUD | SIL OFL 1.1 — `OFL-JetBrainsMono.txt` |
| `NotoSansKR-500.woff2` | Noto Sans KR 500 (KS X 1001 subset: 2,350 Hangul syllables + Latin) | `kr`, and the Hangul fallback of every family | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |
| `Caveat-500.woff2` | Caveat 500 (latin subset) | `hand` — a handwritten accent | SIL OFL 1.1 — `OFL-Caveat.txt` |

`build.js` loads them with `FontFace` from `./fonts/` next to it, so pages work offline. Hangul outside the 2,350
common syllables falls back to a system font — `check.mjs` warns when a text uses one.
The `pixel` family is not a file: it is the 5×7 bitmap font in `core.js` (Latin capitals, digits, a little punctuation).
