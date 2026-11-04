# Lessons (problem → cause → fix)

From building the engine, `examples/honey`, the kit and the template against the reference clip.

- **The reference was easy to get.** → `api.fxtwitter.com/<user>/status/<id>` gave the post text, the quoted clip and
  its MP4 URLs (x.com itself answers 402 to a fetch); `ffmpeg … fps=1/2,tile=3x3` made study sheets and full-resolution
  stills showed the offset washes, the faint guides and the card. `astats` RMS over time showed a steady music bed and no
  clear voice.
- **Fonts from npm, cut to size.** → `@expo-google-fonts/{caveat,gaegu,noto-sans-kr}` carry the TTFs; `pyftsubset`
  (pip `fonttools brotli`) with the 2,350 KS X 1001 syllables (decode `B0A1…C8FE` as EUC-KR) made woff2s: Gaegu 700
  ~485 KB, Noto Sans KR 500 ~180 KB, Caveat ~50 KB.
- **Two methods with one name.** → `Board` had a `title` property and a `title()` method, and an authoring `draw()` and a
  render `draw(t)`; binding the methods threw and the later `draw` won. → Property `name`, render method `frame(t)`.
- **The title highlight sat in the wrong place.** → Measured while authoring, before the fonts had loaded. → Strokes can
  carry `fit(g, s)`, run at build time after the fonts load (the title's highlights and underline use it).
- **White "blooms" looked like gloss.** → Three big white ellipses inside every wash read as shine on a mountain or a
  card. → Four small patches, lighter and darker, at 5–7 % — uneven pigment, not shine.
- **Flowers were leaves.** → Petals as pointed lenses. → `petal()` with a round tip; the stem starts under the petals, not
  at the centre.
- **The honeycomb overlapped itself.** → Flat-top hexagons placed on a pointy-top grid (√3·r across, 1.5·r down). →
  Pointy-top hexagons (`polygon(x, y, r, 6)`, first vertex up); the topic's `caps` use the same geometry.
- **The saucer's back line ran through the cup.** → A full ellipse. → An arc that skips the part hidden behind the cup.
- **The level fell before the bee fanned.** → The gauge's change started 3.6 s after it was drawn, inside its own beat.
  → `delay` long enough to land in the next beat, `hold` short so its own beat does not wait, and the next beat
  `focus`es on it.
- **The subtitle card covered the tube.** → A drawing near the sheet's bottom can't be lifted above the card: the camera
  stops at the sheet's edge. → check.mjs names it; the tube moved up 70 px. Plan the bottom band for small things only.
- **The first cut ran 81 s.** → Strokes at 760 px/s and generous gaps. → ~1000 px/s, shorter washes and words: 69 s for
  10 beats + finale, close to the reference's pace (~4.5 s a beat).
- **Silent pencil.** → `(music && music.pencil) ?? 1` is `false` when `music: false`, so the pencil volume became 0. →
  Test for the field explicitly. check.mjs now renders the soundtrack and fails on silence, NaN or clipping.
- **Brief first.** → A new topic poured into the honey layout would look like the honey film. → Plan the finished sheet in
  the brief, then the beats; the honey example was made that way and needed three drawings the kit lacked (bee, sugar,
  caps).
