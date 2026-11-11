# LOOK — the grammar, observed from the source

Source: the X post by 만원만 (@manwon_man), https://x.com/manwon_man/status/2120126792552075760?a=3V9KnKatoYSIYnqo_y4&s=19 —
a 14.4 s, 30 fps screen recording of an After Effects project by @mosyenboy (a kinetic-typography reinterpretation of a
song), with the composition viewer above the timeline. Read on 2026-11-11 from a 6 fps contact sheet of the viewer
(`ffmpeg -i v.mp4 -vf "crop=500:410:110:120,fps=6,tile=4x4"`). The composition is about 5 : 4, landscape.

What follows is what the picture does. It is the style; the subject (that song, its lines, its objects) is not, and is
never reused.

## Pace
- About 30 shots in 14 s: most last 5–15 frames (0.2–0.5 s), a few last a second. Nothing dissolves; every change is a cut.
- A shot is one idea and one move. The move is fast at the head (a whip, a drop, a zoom) and never quite stops.
- Neighbours contrast in scale: a letter bigger than the frame → one object the size of a thumb on empty paper → a
  full-bleed diagonal of photographs → a tiny bracketed mark.
- The last 1.5 s is a card: one small object turning, small credits. It is the only hold.

## Colour
- Ground: a cool paper white (about `#e8e8e6`). Ink: near-black. Together they carry four fifths of the film.
- Accents are primaries: a crimson (labels, a brushed word, a bracketed word), a signal blue (road-sign discs, one
  sky), a road-sign yellow. Never more than a few percent of a frame, except one or two shots where an accent is the ground.
- Photographic objects bring their own colour; the type never does.

## Type
- Heavy grotesque for Latin, heavy gothic for Hangul; set tight, often italic for the shouted line.
- Voices are mixed on purpose: grotesque black, a condensed black squeezed in a band, bitmap letters, one brushed word
  in red, one serif word in round brackets, tiny light-italic captions in pairs of lines, tracked small caps in a black tag.
- Letters are flat but live in 3D: planes at angles the camera flies between; they hide objects and are hidden by them.
- Scenery words bleed off the frame and are read across two or three shots; the words that matter are whole, short, and
  sit still enough to read.
- Words rotate 90°, stack vertically, sit white-on-black in blocks; a line is sometimes one word behind a picture and
  one in front of it.

## Devices (each shot uses one or two)
| device | what happens | in the engine |
|---|---|---|
| letters as architecture | huge letters stand at angles in space; a wide lens whips between them; a prop sits among them | world `S.type` × 2–4 with `rot`, `cam` fov 55–70, yaw swing 60–80° |
| macro glyph | one or two letters, cropped by the frame, sliding | `S.under.type` with `h` > 1, drift `lin` |
| hero prop | one object, small, centred, alone on paper; a bracketed word above | `cam` fov ~22 far away, `S.over.type` serif in an accent |
| prop too close | the same object fills and overflows the frame; a giant word behind it | `cam` dist 2–5, fov 40–50, world type at z −5 |
| band squeeze | a black band across the frame; white condensed letters stretch and crush to keep the band full; things fall across | `S.under.rect` + `chars: true` with `each → sx` |
| bitmap type | the word as fat pixels, something turning in front | `pixel: 12` |
| swatch → strips | a small upright swatch of stacked pictures slams up into a full-bleed diagonal of stripes | `S.under.img(K.tex.bands…)`, `scale` and `rot` keyed on a beat |
| sign swarm | flat pictures cut out with a border — discs, diamonds, plates with arrows — fly at the lens around a word | `S.img(painter, { cut })` with `tw` from far to near |
| words on the object | the line is printed on the thing (a dial, a label, a sticker); the camera reads it at a steep angle on an accent ground | a prop face painted with `K.font`, `bg: accent` |
| bob | letters on an ink ground hop one after another; small things rise | `chars` + `each → at / rot / scale` from `lt` |
| labels | a small accent box with a black word, tilted a few degrees; a black tag with tracked white caps; an aside in brackets | `box:`, `track:`, `font: 'serif'` |
| window | a smaller frame with its own sky holds the 3D scene; one word sits behind the window, one in front | `frame`, `frameBg`, `S.under.type` + `S.over.type` |
| far → near → open | three cuts on one object: far, too close, then what it turns into | two half-beat shots and an accent |
| pile with a tag | the finished heap of objects, a tag asking a question | props grouped, `S.over.type` in a black tag |
| straight down | the camera looks down into the object; a word lies across it | `cam.pitch: 89`, `S.over.type` |
| end card | a small object turning above small credits, bottom-left | `hold: true`, `mix: 'out'` |

## Light and objects
- Objects are solid and photographic against flat type: a soft key from the upper left, a gentle fill, one soft shadow
  on an invisible floor. No rim glow, no outline.
- Objects tumble, drop, stack and turn; they do not act. There are no characters.

## Sound
- A beat. Cuts sit on it. The drums drop out before the loudest line and come back on it.

## What the engine leaves out
The source's photographs (real textures on its objects, photo strips, building cut-outs) are replaced here by props
built in code and flat graphic painters, so a film needs no stock imagery; a project may add its own images (`S.img(url)`)
and models (references/KIT.md → GLB). After Effects, its timeline and its layer UI are not part of the style.
