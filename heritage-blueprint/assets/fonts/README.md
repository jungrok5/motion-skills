# Fonts

| file | what | used for | licence |
|---|---|---|---|
| `NotoSansKR-700-ksx1001.woff2` | Noto Sans KR 700, instanced from the Google Fonts variable font and subset to Latin + the 2,350 KS X 1001 Hangul syllables + a few symbols (· × ≈ – — ° ← → …). © 2014-2021 Adobe | `ko` title and main button | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |
| `NotoSansKR-400-ksx1001.woff2` | the same at 400 | `ko` callouts and diagram text | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |
| `coverage-ko.json` | code points in both Noto subsets | build / verify glyph checks | — |
| `IBMPlexSansTC-Bold.woff2` | IBM Plex Sans TC Bold 1.1.1, complete and unmodified (`provenance-IBMPlexSansTC.json`, sha256 inside) | `zh` title and main button | SIL OFL 1.1, Reserved Font Name "Plex" — `OFL-IBMPlexSansTC.txt` |
| `coverage-zh.json` | code points in Plex Sans TC | build glyph check | — |

The Noto subsets keep their name (the licence reserves only "Source"). Plex Sans TC is embedded
whole because its licence reserves "Plex"; `build.py` limits it to the title and button glyphs with
`unicode-range`. To add a language, add a face here and a pack in `../locales.json`.
