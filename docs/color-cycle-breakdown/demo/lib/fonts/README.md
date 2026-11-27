# Fonts

`film.js` loads these with `FontFace` from `./fonts/` next to it, so pages and renders work offline. The panel text uses
`CCBSans` (Inter) and `CCBMono` (JetBrains Mono) with `CCBKR` (Noto Sans KR) as the Hangul fallback, so Korean lines
come out in the same voices.

| file | family | used for | license |
|---|---|---|---|
| `Inter-500.woff2` · `Inter-700.woff2` | Inter (latin subset, `@fontsource/inter` 5.1.0) | titles, labels, captions, layer names | SIL OFL 1.1 — `OFL-Inter.txt` |
| `NotoSansKR-500.woff2` | Noto Sans KR 500 (KS X 1001 subset) | Hangul in every role (bold roles synthesise from 500) | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |
| `JetBrainsMono.woff2` | JetBrains Mono (latin, variable 100–800) | the kicker (`01 / PALETTE CYCLING`) and slot numbers | SIL OFL 1.1 — `OFL-JetBrainsMono.txt` |

The Korean file is a subset: the 2,350 KS X 1001 Hangul syllables, Latin-1 and common punctuation. A syllable outside it
(rare) falls back to a system font — look for it in the stills.
