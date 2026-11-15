# Fonts

The HUD (labels, readouts, copy, callouts) and `b.text()` wordmarks are drawn on canvas with these fonts, loaded with
`FontFace` from this folder before `READY`, so pages and renders work offline.

| file | family in code | used for | license |
|---|---|---|---|
| `Inter-500.woff2` · `Inter-600.woff2` · `Inter-700.woff2` | `PCM Sans` (Inter, latin subset, `@fontsource/inter` 5.1.0) | headline, body copy, `b.text()` | SIL OFL 1.1 — `OFL-Inter.txt` |
| `JetBrainsMono.woff2` | `PCM Mono` (JetBrains Mono, latin, variable 100–800) | every label, readout, callout, button | SIL OFL 1.1 — `OFL-JetBrainsMono.txt` |
| `NotoSansKR-500.woff2` | `PCM KR` (Noto Sans KR 500, Latin + 2,350 KS X 1001 Hangul) | Hangul fallback of both families | SIL OFL 1.1 — `OFL-NotoSansKR.txt` |

Full license text: https://openfontlicense.org.
