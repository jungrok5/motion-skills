# Fonts

| file | family | license |
|---|---|---|
| `NotoMusic-subset.woff2` | Noto Music (subset: clefs, rests, ♭ ♮ ♯, double sharp / flat; from `@fontsource/noto-music` 5.3.0) — the engraving glyphs | SIL OFL 1.1 — `OFL-NotoMusic.txt` |
| `SourceSerif4-Variable.woff2` · `SourceSerif4-Italic-Variable.woff2` | Source Serif 4 (latin subset, variable weight, from Google Fonts) — title, staff names, time signatures, dynamics | SIL OFL 1.1 — `OFL-SourceSerif4.txt` |
| `NotoSansKR-700-ksx1001.woff2` | Noto Sans KR 700 (KS X 1001 Hangul + Latin subset) — Korean titles and staff names fall back to it | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |

`stage.js` declares them as `LSMusic`, `LSSerif`, `LSSerifItalic` and `LSKR` with URLs relative to the module, so pages work offline.
