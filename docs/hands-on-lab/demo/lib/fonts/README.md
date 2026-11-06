# Fonts

| file | family | license |
|---|---|---|
| `BarlowCondensed-600.woff2` · `BarlowCondensed-700.woff2` | Barlow Condensed (latin) — titles, tabs, labels | SIL OFL 1.1 — `OFL-Barlow.txt` |
| `Inter-500.woff2` · `Inter-700.woff2` | Inter (latin subset) — body text | SIL OFL 1.1 — `OFL-Inter.txt` |
| `JetBrainsMono.woff2` | JetBrains Mono (variable) — numbers, equations, meter screens | SIL OFL 1.1 — `OFL-JetBrainsMono.txt` |
| `NotoSansKR-500.woff2` | Noto Sans KR 500 (KS X 1001 subset: 2,350 Hangul) — Korean text | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |

`lab.css` declares them with relative `url(fonts/…)`, so pages work offline. Another language with another script needs its
own font here (and a line in this table); `check.mjs` reports characters the bundled fonts cannot draw.
