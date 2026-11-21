# Fonts

- `Gaegu-700.woff2` — Gaegu Bold (Copyright 2018 The Gaegu Project Authors), SIL Open Font License 1.1 (`OFL-Gaegu.txt`). Hangul + Latin.
  Used for the letterbox text, captions, cards, page boxes and the signs in the sets.

A topic in another script (Japanese, Chinese …) needs a font that has it:
`new Film({ fonts: [{ family: 'My Font', url: './fonts/MyFont.woff2' }], font: 'My Font' })` — check.mjs fails missing glyphs.
