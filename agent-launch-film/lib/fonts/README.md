# Fonts

The film page loads these with `@font-face` (URLs relative to `lib/`), so pages and renders work offline.

| file | used for | license |
|---|---|---|
| `ALFSans-ksx1001.woff2` | every voice but mono: headlines, bubbles, cards, numbers (Pretendard 1.3.9 Variable, weights 100–900; Latin is Inter-derived, Hangul included) | SIL OFL 1.1 — `Pretendard-LICENSE.txt` |
| `JetBrainsMono.woff2` | mono caps: meta labels, slider ends, source lines, table ids | SIL OFL 1.1 — `OFL-JetBrainsMono.txt` |

`ALFSans-ksx1001.woff2` is a subset of Pretendard made with fontTools (`pyftsubset … --flavor=woff2`): the 2,350 KS X 1001 Hangul
syllables, ASCII, Latin-1, compatibility jamo and common punctuation and arrows (441 KB instead of 2 MB). A syllable outside
that set (rare, e.g. 뷁) falls back to the system font: add the full face in the page's CSS when a line needs one.
Another script (Japanese, Arabic …): add a face for it in the page's `<style>` and put it after `"ALF Sans"` in `--sans`.

Pretendard reserves its font name under the OFL, so the subset (a modified version) is renamed **ALF Sans** inside the
file and in the CSS; the design and the copyright are Pretendard's (Kil Hyung-jin).
