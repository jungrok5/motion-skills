# ESSAY — thesis → chapters → lines → shots

## Shape
- **Opening (chapter 01):** almost always the paper preset — an ink landscape, the widest view, the idea stated
  quietly. The film begins on paper and ends on paper (the card).
- **Middle chapters:** move nearer: a place you walk through, then a room, then an object in the hand. One idea each.
- **Last chapter:** the object or image that says the thesis most plainly; its last line *is* the thesis, said without
  the word "beauty" if possible ("채우지 않아서 넉넉하다 — Ample, because it was never filled").
- **Card:** the title, a seal, one line listing the chapters or restating the thesis in four words.

## Lines
- 2–3 lines a chapter; ≤ 20 CJK characters (≤ 9 words Latin); a comma splits a thought across two lines.
- Say what the picture *means*, never what it shows ("The eave never runs straight", not "Here is a roof").
- One accent word a line at most — the word that carries the idea (`accent: ["비워"]`). Seal red on paper, gold on dark.
- The English line is a translation with the same rhythm, not a gloss. It appears as the native line finishes typing.
- `F.say([...], { from })` places lines back to back (0.55 s apart): typing at ~9 CJK characters / s (22 Latin), then a
  hold long enough to read the English. `pause: 1.2` adds silence before a line; `dur` overrides.
- check.mjs warns when a line is too long, too short on screen, or overlaps the next.

## Timing
- A chapter = 1 s for the badge to settle + its lines + ~1 s of air. Start the next chapter ~1 s after the last line.
- Shots are timed from lines: a new shot ~0.4–0.6 s before the line it illustrates (`from: L[1].from - 0.5`), with
  `xfade: 1.2–2` so the change is under way when the words come.
- Chapter changes: `dip: 1.2–1.5` (through paper). The badge changes at the chapter's `from`.
- Callouts: from ~0.6 s after their line starts to the line's end.
- The card: ~0.6–0.8 s after the last line; 6–7 s long; the film ends with it.

## Shots
- 1–3 shots a chapter, 4–12 s each. Each has somewhere to go: a dolly in, a rise along an eave, a slide along a row
  of doors, an orbit around an object (`cam: (lt) => ({ pos, look, fov })`).
- `cam.path` 2–3 points, `cam.look` 1–2 points, `fov` constant or `[from, to]`; default ease `glide`.
- Wide (fov 38–44) for places, tighter (30–36) for objects; camera height ~1.2–1.7 m in rooms (eye level, seated
  height for low tables), 5–15 m over the mist sea.
- `update(lt, objects)` drives what changes: paper glowing as the sun comes up, a lantern catching, a bracket set coming
  apart (`explode(k)`), ribbons revealing (`reveal(k)`), a moon rising. Always set from `lt`, never accumulate.
