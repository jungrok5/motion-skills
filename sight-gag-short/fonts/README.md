# Fonts

| file | font | license |
|---|---|---|
| `BarlowCondensed-700.woff2` | Barlow Condensed Bold — shop signs, blade signs and the end title. © 2017 The Barlow Project Authors | SIL Open Font License 1.1 (`OFL-Barlow.txt`) |

For a title in Hangul or kana, put a font file here and pass it to the film:
`new Film({ fonts: [["Pretendard", "Pretendard-Variable.woff2", "700"]] })` and `F.title({ font: "Pretendard", … })`
(Pretendard is OFL; this repo has a copy in `holo-pass/pass/fonts/`). Without one, the browser's system font is used.
