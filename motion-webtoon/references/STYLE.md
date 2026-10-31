# The two looks

motion-webtoon draws one kind of thing — a vertical-scroll motion webtoon — in two finishes. Both use the same strip, camera,
balloons and effects (`lib/webtoon.js`); they differ in how people are built and how the frame is printed.

| | **colour webtoon** (the kit's own look) | **premium mono manga** (the donut film, the starter) |
|---|---|---|
| people | `Webtoon.Rig` — cel-shaded, clean dark-brown lineart, one hard cel band, big eyes with two highlights | `Cast` (`lib/cast-rig.js`) — risograph construction, thick boiling line on twos, values instead of colours |
| frame | flat colour, mood colours in the gutters | `Manga.grade`: cream paper, one black ink, 45° round-dot screentone, ONE accent colour kept |
| lines / effects | `Webtoon.focus` / `speed` (thin), `Webtoon.sfx` (halo + ink + colour fill) | `Manga.focus` / `speed` (bold tapered wedges), `Manga.sfx` (chunky white, thick black outline, hard drop shadow), `Manga.tag` (✱ caption) |
| when | bright everyday comedy, romance beats, anything that wants colour | a premium print feel, fake-epic gags, a grave narrator over a trivial fight; one object that matters (the accent) |
| switch | — | `Cast.style = 'riso'` (and no grade) draws the same people in flat riso colours |

The kit's full API, palette, fonts and provenance table are in the header of `lib/webtoon.js` and in canvas-film's
`kits/webtoon/STYLE.md`; the survey behind it is `RESEARCH.md`. This file covers what the mono finish adds.

## The mono-manga print (`lib/manga.js`)
Reference: premium black-and-white manga pages (screentone, solid blacks, white SFX with black outlines). What it looks like:
- **Paper** `#efe9dd` (`Manga.C.paper`), lighter paper `#f7f3ea` (`paperL`) for skin, shirts and balloons, **ink** `#17151a`.
- **Screentone**: round dots on ONE 45° grid (pitch ≈ 5.7 px at 1080 wide) for every tone — drawn (`Manga.tone(ctx, c)`) and graded
  alike, so they line up. Coverage < .5 = ink dots, > .5 = paper holes in ink.
- **The grade** maps the frame's luminance to four levels (paper / light dots / mid dots / dark dots / ink; cut points
  `[.14, .40, .62, .74]`, coverages `[.14, .30, .50]`), keeps line art solid (a pixel ≥ 38 darker than its 8-px neighbourhood
  becomes ink, ≥ 38 lighter becomes paper — white lines on black survive) and passes the accent hue (±15°) through untouched.
  ≈ 40–120 ms per 1080×1920 frame on a CPU box (the 8-px local mean comes from a GPU downscale).
- **Bold lines**: focus lines are black (or paper) wedges round a clear oval at 10 fps; speed lines are thick tapered strokes
  that slide; impact `ticks`; halftone dust `puff`s.
- **Lettering**: SFX in Black Han Sans, white fill, a line 0.16× the size, a hard shadow, each syllable tilted and popped in
  with a 60 ms stagger. Caption **tag**: paper box, thick border, offset black shadow, an accent ✱ (drawn, six petals).
- **The accent**: `Manga.setAccent('#ff6fa3', '#d94a85')` (default: the donut pink). One object carries it — the donut and its
  box logo in the donut film, the top bar of the chart in the starter, and the ✱ marks.

### Drawing for the grade
- Draw **flat**: paper, solid black, deliberate `Manga.tone(ctx, coverage)` fills. A soft colour wash, a radial glow or a
  gradient becomes a busy field of dots (it did, on the donut film's first pass) — if you want a ramp, use `Manga.grade(ctx,
  { smooth: true })` on purpose, or step it in two or three tone fills.
- Thin lines stay lines; mid-grey fills become dots. Give a black garment a white rim (`paint` adds one) and, on a black panel,
  a paper halo (`Cast.reachArm` does it for black sleeves) or it disappears.
- Two people in one panel need different **values** (one dark jacket, one light cardigan), not only different hair.
- `?grade=0` shows the raw frame — use it when a still looks muddy, to see whether the drawing or the grade is at fault.

## The riso construction (the cast)
The owner's favourite figure construction came from a risograph dinner scene (canvas-film `examples/jjukkumi-kits`, the
`risoline` kit): a **round head**, dot or arc eyes with one highlight, a hooked nose tick pointing to the turn, hatched blush,
a big open laughing mouth (teeth band + tongue), simple ears, eyebrows over the fringe, laugh marks round the head, and a thick
line that **boils on twos** (a fresh jitter 12×/s). The cast rig keeps that face and gives it a ~1:5 body (SD 1:1.5) built
from tubes and inked shapes, printed by the grade. Identity: hair silhouette (presets: messy + ahoge, side part with grey
temples, spiky, bob with a clip, bald with tufts), glasses / moustache / lashes / bags, and the value of each garment.

## Fonts (SIL OFL 1.1, Google Fonts)
Jua (dialogue) · Do Hyeon (alt dialogue, name tags) · Nanum Pen Script (thoughts, monologue) · Gaegu (alt hand) · Black Han Sans
(shouts, SFX, titles) · Noto Sans KR 700 (✱ tags, narration boxes) · Noto Serif KR 600 (rare titles). Load with
`Pilot.run({ fonts: Webtoon.FONTS })`; render.mjs serves the TTFs locally and stops if a family in film.json is missing.

## Carries well / badly
Well: office and school comedy, escalation from trivial to epic and the deflating punchline, reaction faces, "the thing
everyone wants", a reveal, explainers told by characters, anything read on a phone. Badly: awe, slow meditation, realistic
violence, landscapes without people, more than two balloons at once, landscape-first films (the strip pillarboxes).
