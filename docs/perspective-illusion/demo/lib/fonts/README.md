# Fonts

Signs, boards and labels are drawn in code on canvas textures with these fonts (never with an image model, which
misspells). `K.fonts()` loads them before any label is painted.

| file | font | license |
|---|---|---|
| `BarlowCondensed-700.woff2` | Barlow Condensed Bold (Latin signs, numbers). © 2017 The Barlow Project Authors | SIL Open Font License 1.1 (`OFL-Barlow.txt`) |
| `NotoSansKR-500.woff2` | Noto Sans KR Medium, subset to Latin + the 2,350 KS X 1001 Hangul syllables. © 2014-2021 Adobe | SIL Open Font License 1.1 (`OFL-NotoSansKR.txt`) |

Full license text: https://openfontlicense.org. Japanese kana fall back to the system font; bundle a font if a scene needs them.
