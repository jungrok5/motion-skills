# Fonts

`film.js` loads these with `FontFace` from `./fonts/` next to it, so pages and renders work offline. Titles and step
labels use `LAPSerif` (Source Serif 4) with `LAPSerifKR` (Nanum Myeongjo) for Hangul; kickers, labels and captions use
`LAPSans` (Inter) with `LAPKR` (Noto Sans KR).

| file | family | used for | license |
|---|---|---|---|
| `SourceSerif4-Variable.woff2` | Source Serif 4 (latin subset, variable, from Google Fonts) | title, step labels | SIL OFL 1.1 — `OFL-SourceSerif4.txt` |
| `NanumMyeongjo-800-ksx1001.woff2` | Nanum Myeongjo ExtraBold (KS X 1001 subset, `@fontsource/nanum-myeongjo` 5.3.0) | Hangul titles and steps | SIL OFL 1.1 — `OFL-NanumMyeongjo.txt` |
| `Inter-500.woff2` · `Inter-700.woff2` | Inter (latin subset, `@fontsource/inter` 5.1.0) | kicker, labels, caption | SIL OFL 1.1 — `OFL-Inter.txt` |
| `NotoSansKR-500.woff2` | Noto Sans KR 500 (KS X 1001 subset) | Hangul labels and captions | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |

The Korean files are subsets (the 2,350 KS X 1001 syllables, Latin-1, punctuation). A syllable outside them falls back to
a system font — look for it in the stills.
