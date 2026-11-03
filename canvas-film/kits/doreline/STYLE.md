# 동판화 (line engraving after Doré)

Kit: `kit.js` → vendored as `scenes/kit-doreline.js`, global `window.ENG`. Source: one-scroll-bible
`motion/films/messiah/engrave-shepherds.js` (「메시아 예언과 성탄」, 2026-11-03): the shepherds' field at night, where the
glory of the Lord shines and the hatching parts down to bare paper. The film vendors this exact file. Before and after
stills were identical (max difference 0). Template: `template.html` is a different subject, a lighthouse on a night sea
whose beam sweeps across the plate.

## What it looks like
You draw the picture **as values only**: a grey plate where 0 is black and 1 is white, using shapes, gradients, glows and
silhouettes with a rim. `ENG.engrave()` then cuts it into parallel ink lines on cream paper.
- **Lines:** each line swells where the plate is dark and thins and breaks where it is light. Pure light is bare paper.
- **Cross-hatching:** a second set of lines crosses the first in the deepest shadows (`cross`).
- **Direction:** lines follow a field you give, a function `(x, y) → s` whose contour lines are the cuts. Use horizontal swells in the sky and the contour of a hill or sea below, so the plate reads like a burin following the form.
- **Per frame:** it is computed every frame (about 40 ms at 1080×1920), so light can **flood** the plate and the hatching parts where the light comes. That is the look's own move.
- **Tint:** `tint` can warm the paper a little at the moment of light.

## Meanings it carries
**Well:**
- Glory and revelation, light breaking into darkness. Doré's Bible plates are the reference.
- Night watches: shepherds, sentries, a lighthouse, people waiting in the dark.
- A plate that is "old and printed": history, prophecy, a book.
- Strong, simple silhouettes against light.

**Badly:**
- Colour stories.
- Fine detail smaller than the line spacing. Faces disappear, so draw figures as clear silhouettes with a rim.
- Fast camera moves. Lines are in screen space, so keep the push slow, about 5 %.
- Words over mid-tones. Lines show through glyph counters. Put solid ink (value 0) behind captions and labels.

## Palette
| role | value |
|---|---|
| ink | `[34,24,16]` sepia-black |
| paper | `[238,226,200]` cream, `tint` `[255,214,140,.25]` at the light |
| plate values | night sky .10–.30, hills .13–.35, silhouettes .06, lit rims 1.0, glory 1.0 at the centre |

## API (`const ENG = window.ENG`)
- `ENG.engrave(ctx, plate, { field, spacing = 7, ink, paper, tint, cross = .58, crossAngle = 1.05 })` cuts a full-frame value canvas `plate` onto `ctx` (identity, full frame; it draws through a buffer, so it composes in order with the rest).
  - `field(x, y)` gives the line coordinate in px (lines are its contours every `spacing` px).
  - `tint` is `[r, g, b, a]` mixed into the paper.

## Checks (what went wrong on the way)
- **Words over hatching look striped.** Fill the caption band and the label area of the plate with value 0 (solid ink) before engraving.
- **A drawn angel came out like a moth.** In this look a holy presence reads better as a standing column of light inside the glory than as a figure in outline.
- **Bowling-pin figures.** The first silhouettes (an oval head on a bell) were too simple. Give people hoods, shoulders, a crook or staff and one gesture (a hand shielding the eyes).
- **Moiré.** At small sizes the lines alias. Judge the look at full resolution, not on a downscaled contact sheet.
