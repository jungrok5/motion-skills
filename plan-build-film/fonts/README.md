# Fonts

- `ALFSans-ksx1001.woff2` - the sheet's labels and the counter card. A subset of Pretendard 1.3.9 Variable (weights
  100-900) with the 2,350 KS X 1001 Hangul syllables, ASCII, Latin-1 and common punctuation; renamed ALF Sans because
  Pretendard reserves its name under the OFL (the same file `lived-in-room` uses). Licence: `Pretendard-LICENSE.txt`.
- `NanumMyeongjo-800-ksx1001.woff2` - the sheet's title and the film's title. Nanum Myeongjo ExtraBold, KS X 1001
  subset (the same file `kinetic-type-collage` uses). Licence: `OFL-NanumMyeongjo.txt`.

Pillow reads both directly. A syllable outside KS X 1001 or another script needs a face of your own (change `SANS` /
`SERIF` in `scripts/hud.py` and `FONT_*` in `scripts/draw-sheet.py`).
