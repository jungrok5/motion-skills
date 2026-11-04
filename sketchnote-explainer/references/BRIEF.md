# BRIEF — from a topic to a board of its own

Every film starts here, before any code. Copy the template below into the project as `BRIEF.md` (new-film.mjs does it)
and fill it from the user's topic. The worked example (`examples/honey/`) and the template (`templates/film.html`) are
**examples of the style**, not a menu: a new topic gets its own beats, drawings, labels and sheet. Reuse the recipes in
BEATS.md, never their content. `examples/honey/BRIEF.md` is a filled one.

## What stays the same for every topic (the style)
- cream paper and grain; a dark brown pencil with pressure, tapered ends and a lighter second pass; faint grey guides left
  on the sheet (LOOK.md);
- flat watercolour washes set a few px off the line, a slightly darker pooled edge; colours from `C`;
- handwriting: Caveat for Latin, Gaegu for Korean; a label is a main word plus a smaller second-language line;
- red for arrows, numbers and the title's underline; a yellow highlighter behind title words;
- the white stylus that draws every stroke, with its shadow, lifting between strokes and leaving between beats;
- one drawing per beat; the camera glides and zooms to it, keeping it above the subtitle card;
- the subtitle card: a Noto Sans main line and a handwritten second line, bottom left (or right);
- the finale: the camera pulls back to the whole sheet, the title is written and highlighted, a note card is pinned;
- the felt-piano bed with a chime per beat and pencil sounds on every stroke.

## What is designed per topic
```markdown
# BRIEF — <topic>

**Topic (as the user said it):** "…"
**What the viewer should understand at the end (one sentence):** …
**Facts checked against:** <sources> — and every number used, with the source's own wording ("up to", "about")

## Languages
- subtitle card: <main language> main line, <second language> second line (or none)
- labels: <label language> with a small <second language> line (or none)

## Beats (6–12 + finale; 45–75 s)
| # | main line (≤ 26 chars) | second line | the pencil draws | where on the sheet |
|---|---|---|---|---|

## Drawings
- from the kit: …
- **designed for this topic** (defineSketch): <name> — what it is, how it is built (guides → line → wash → notes), what moves

## Colour
which `C` washes mean what (keep it to 3–5 hues; red is for notes only)

## The whole sheet at the end (the infographic)
a rough map: title top-left · note card top-right · the drawings in reading order · where the arrows lead.
(For 3:4 / 9:16, top to bottom.) Keep the bottom band free where the subtitle card sits.

## Must / must not
- every number is one checked above, said the way the source says it
- no logos, brands, real people or named characters; the note card credits the film
```

## Review rubric (score a sheet, stills mid-beat, and the last frame — fix anything below "yes")
| | question |
|---|---|
| topic | Covering the subtitles, do the drawings and labels alone say the topic? Would they be wrong for the example's topic? |
| true | Is every step how it really happens, and every number checked and worded like its source? |
| one idea | Does each beat add one drawing and say one thing? Is the drawing centred and clear of the subtitle card? |
| look | Faint guides first, pencil line, colour set off the line, handwriting — does a still sit beside a reference frame? |
| read | At phone size (390 px wide), can the labels and subtitles be read? Is the last frame readable as a whole? |
| sheet | Does the last frame work as an infographic on its own: title, reading order, nothing crowded or empty? |
| designed | Is at least one drawing designed for this topic (defineSketch), and does it look like the kit's? |
| clean | Does `check.mjs` print only `ok`? Does the MP4 play with sound, pencil sounds on the strokes? |
