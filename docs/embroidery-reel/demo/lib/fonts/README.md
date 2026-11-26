# Fonts

`reel.js` loads these with `FontFace` from `./fonts/` next to it, so pages and renders work offline. Each voice is a
Latin face with a Hangul fallback, so a Korean title is embroidered in the same weight as an English one.

| file | family | voice | used for | license |
|---|---|---|---|---|
| `ArchivoBlack-400.woff2` | Archivo Black (latin, `@fontsource/archivo-black`) | `title` | embroidered titles and patch lettering | SIL OFL 1.1 — `OFL-ArchivoBlack.txt` |
| `BlackHanSans-ksx1001.woff2` | Black Han Sans (KS X 1001 subset, `@fontsource/black-han-sans` 5.3.0) | Hangul of `title` | Korean embroidered titles | SIL OFL 1.1 — `OFL-BlackHanSans.txt` |
| `Inter-500.woff2` · `Inter-700.woff2` | Inter (latin subset, `@fontsource/inter` 5.1.0) | `sans` · `bold` | the printed line on a paper tag | SIL OFL 1.1 — `OFL-Inter.txt` |
| `NotoSansKR-500.woff2` | Noto Sans KR 500 (KS X 1001 subset) | Hangul of `sans` · `bold` · `mono` | Korean tag lines | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |
| `JetBrainsMono.woff2` | JetBrains Mono (latin, variable 100–800) | `mono` | the small typed line on a tag (a handle, a URL, a date) | SIL OFL 1.1 — `OFL-JetBrainsMono.txt` |
| `SourceSerif4-Variable.woff2` · `SourceSerif4-Italic-Variable.woff2` | Source Serif 4 (latin, variable 200–900) | `serif` · `italic` | the end card's title and its subtitle | SIL OFL 1.1 — `OFL-SourceSerif4.txt` |

The Korean files are subsets: the 2,350 KS X 1001 Hangul syllables, Latin-1 and common punctuation. A syllable outside
that set (rare, e.g. 뷁) falls back to a system font — look for it in the stills, or add a face.
