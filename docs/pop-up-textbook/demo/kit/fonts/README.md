# Fonts

| file | family | license |
|---|---|---|
| `SourceSerif4-Variable.woff2` · `SourceSerif4-Italic-Variable.woff2` | Source Serif 4 (latin subset, variable weight, from Google Fonts) — the book | SIL OFL 1.1 — `OFL-SourceSerif4.txt` |
| `Caveat-500.woff2` | Caveat 500 (latin subset, from Google Fonts) — margin handwriting | SIL OFL 1.1 — `OFL-Caveat.txt` |
| `Inter-500.woff2` · `Inter-600.woff2` · `Inter-700.woff2` | Inter (latin subset, from `@fontsource/inter` 5.1.0) — HUD | SIL OFL 1.1 — `OFL-Inter.txt` |

`book.css` declares them as `BookSerif`, `BookHand` and `Inter` with relative `url(fonts/…)`, so pages work offline.
