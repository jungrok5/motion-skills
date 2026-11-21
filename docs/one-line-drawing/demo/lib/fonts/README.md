# Fonts

| file | family | used for | license |
|---|---|---|---|
| `Caveat-500.woff2` | Caveat 500 (latin subset, Google Fonts) | the handwritten signature text after the loops (`signature: '…'`) | SIL OFL 1.1 — `OFL-Caveat.txt` |

`film.js` loads it with `FontFace` from `lib/fonts/`, so pages work offline. The subset is Latin only: `check.mjs`
fails a signature with characters outside printable ASCII.
