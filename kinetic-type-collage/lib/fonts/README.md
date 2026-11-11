# Fonts

Type is drawn on a canvas with these faces and turned into distance fields (`../type.js`). A film loads only the files
its voices use (`FontFace`, URLs relative to the module), so pages and renders work offline.

| file | voice in code | used for | license |
|---|---|---|---|
| `Inter-900.woff2` · `Inter-900i.woff2` | `sans` · `italic` (Inter Black, latin subset, `@fontsource/inter` 5.3.0) | most words; the shouted line | SIL OFL 1.1 — `OFL-Inter.txt` |
| `Inter-500.woff2` · `Inter-400i.woff2` | `text` · `note` | captions, credits, light-italic asides | SIL OFL 1.1 — `OFL-Inter.txt` |
| `Anton-400.woff2` | `cond` (Anton, latin subset, `@fontsource/anton` 5.3.0) | bands, squeezes, numbers | SIL OFL 1.1 — `OFL-Anton.txt` |
| `NotoSansKR-900-ksx1001.woff2` | Hangul of `sans` · `italic` · `text` · `note` (Noto Sans KR Black, `@fontsource/noto-sans-kr` 5.3.1) | Korean in the grotesque voices | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |
| `BlackHanSans-ksx1001.woff2` | `han`, and the Hangul of `cond` (Black Han Sans, `@fontsource/black-han-sans` 5.3.0) | Korean poster black | SIL OFL 1.1 — `OFL-BlackHanSans.txt` |
| `NanumMyeongjo-800-ksx1001.woff2` | `serif` (Nanum Myeongjo ExtraBold, `@fontsource/nanum-myeongjo` 5.3.0) | the aside in brackets | SIL OFL 1.1 — `OFL-NanumMyeongjo.txt` |
| `NanumBrushScript-ksx1001.woff2` | `brush` (Nanum Brush Script, `@fontsource/nanum-brush-script` 5.3.0) | one hand-written word | SIL OFL 1.1 — `OFL-NanumBrushScript.txt` |

The Korean files are subsets made with fontTools: the 2,350 KS X 1001 Hangul syllables, Latin-1, compatibility jamo
and common punctuation. A syllable outside that set (rare, e.g. 뷁) falls back to a system font — add a face with the
film's `fonts` option when a word needs one.
