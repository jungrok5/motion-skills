# Fonts

| file | family | used for | license |
|---|---|---|---|
| `Caveat-500.woff2` | Caveat 500 (latin subset, Google Fonts) | the handwritten signature under the mark | SIL OFL 1.1 — `OFL-Caveat.txt` |
| `Inter-500.woff2` · `Inter-600.woff2` · `Inter-700.woff2` | Inter (latin subset, `@fontsource/inter` 5.1.0) | panel labels, the size tooltip, Latin wordmarks and mockup print | SIL OFL 1.1 — `OFL-Inter.txt` |
| `Pretendard-Bold.subset.woff2` | Pretendard Bold (KS X 1001 subset: 2,350 Hangul + Latin) | Korean wordmarks and mockup print | SIL OFL 1.1 — `Pretendard-LICENSE.txt` |

`film.js` loads them with `FontFace` from `lib/fonts/`, so pages work offline. A wordmark in another script needs a font
that has its characters (`check.mjs` fails the glyph test otherwise).
