# BRIEF — from a topic to a shot list, and how to review the result

The brief is written before any code and saved in the project as `BRIEF.md` (the frame is `templates/BRIEF.md`).
It answers, in this order:

## 1. The one line
What the film says in a sentence, and to whom. "A ramyeon recipe told as if it were a song: exact, a bit bossy, hungry."
If the user gave only a subject, decide the angle here (a how-to, a rant, a countdown, a list, an announcement).

## 2. The words
Write the whole text first — 12 to 30 short lines for 8 to 20 s. Then mark each word:
- **scenery** — huge, may bleed off the frame, read across shots (the hook, the title, numbers);
- **read** — the viewer must catch it: one to three words, whole in the frame, ≥ 0.3 s (`read: true`);
- **caption** — texture in small italic or tracked caps; the film works without it.

Mix languages on purpose (Hangul for the body, Latin for shouts and captions, or the reverse). Give numbers and units
a shot of their own. Words are the user's or written for the topic; never another artist's lyrics unless the user
holds the rights (then credit them on the end card).

## 3. The grid
Tempo (100–140 bpm reads as this style; a real track sets it), the frame (1350 × 1080 by default; 1080 × 1350 or
1080 × 1920 for vertical; 1920 × 1080 for wide), and the beat count of every line. Most shots are 1 beat; hooks 2;
punches ½. Add them up: beats × 60 / bpm = seconds.

## 4. The objects and pictures
List what the lines name. For each: prop (a solid built from the kit's parts — say from which: lathe, slab, tubes…),
picture (a flat sign, sticker or swatch painted in code, or the user's image), or a GLB (references/KIT.md). Aim for
5–10 props and 3–6 pictures for 15 s; an object earns its place by being named or by being the thing a line is about.

## 5. The palette
Paper, ink, and two or three accents for type, bars and grounds (`colors`). Then the `tints` the props need (steel,
wood, a food colour). Say which shots get an ink ground and which one or two get an accent ground.

## 6. The shot list
One row per shot: beats · the words · the device (references/LOOK.md) · what moves · the ground.
Rules for the list:
- every cut flips scale or ground (huge → tiny, flat → deep, paper → ink);
- no device twice in a row; the signature ones (letters as architecture, band squeeze, window) once or twice per film;
- the first shot is the hook at full size; the loudest line follows a half-bar of near-silence (`mix: 'break'` then `accent`);
- the last shot is the end card: a small prop turning, the title, credits (fonts, models, music).

## 7. The beat
The drum and bass patterns (16 steps), where it drops out, where the accents hit — or the user's track and its tempo.

---

## Prop review (score the prop sheet, `render.mjs --props`)
1. Recognisable from all four sides at thumbnail size — would someone name it without the label?
2. Rests on the floor (its shadow touches it); centred, so it turns in place.
3. Solid: no see-through walls, no flickering faces where two surfaces coincide, no stray parts floating.
4. Colours are the film's (tints and accents), and the lightest tone is not blown to white on its top.
5. Any text printed on it is spelled right, uses the film's fonts and can be read at the distance the shot uses.

## Still review (score the shot sheet and ~8 full-size stills)
1. **Is it this style?** Paper and ink dominate; heavy type; hard-edged; an object solid against flat words. A frame that
   could be a slide or a title card with a logo is a fail.
2. **Density.** At least three layers in most shots (scenery word, prop or picture, label or caption). An empty frame
   is allowed only as the "one thing alone" device.
3. **Scale flip.** Look at each pair of neighbours on the sheet: do they differ at a glance?
4. **The read words read.** Whole, not crossed by a prop at the moment of reading, not on a busy ground.
5. **Scenery words still carry.** Cropped is fine; unrecognisable is not — at least half of each glyph in frame at some point.
6. **The move.** On the strip (`--strip <shot>`) the first frame differs clearly from the third, and the last from the one before it.
7. **Nothing accidental.** No word exactly at the frame edge by a few pixels, no label touching another, no prop
   cutting a `read` word, no shadow floating away from its object.
8. **Colour count.** No shot uses all the accents at full size; accent grounds are rare.
