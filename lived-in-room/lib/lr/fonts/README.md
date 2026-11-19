# Font

`ALFSans-ksx1001.woff2` is what `lr.draw` sets every spine, label, screen and poster in: a subset of Pretendard 1.3.9
Variable (weights 100–900) with the 2,350 KS X 1001 Hangul syllables, ASCII, Latin-1, compatibility jamo and common
punctuation (441 KB). Pillow reads it directly. A syllable outside that set, or another script, needs a face of your
own: `draw.font(size, weight, path='…')`.

Pretendard reserves its name under the SIL Open Font License 1.1, so the subset (a modified version) is named
**ALF Sans** inside the file; the design and the copyright are Pretendard's (Kil Hyung-jin). Licence:
`Pretendard-LICENSE.txt`.
