---
name: logo-construction
description: Make a vertical "logo construction" film of a geometric mark built on a grid, drawn entirely in code. A rough grey marker sketch sits on a white artboard; a cursor draws thin construction lines one by one — slanted parallels sharing one lean, horizontals, free lines — drags copies across, zooms in to drag out circles with a size tooltip, opens an Align panel to distribute a set, marquee-selects everything (blue lines, anchor points), picks the shape builder and fills the mark region by region (grey dotted hover, red edge, click → ink), deletes the guides, rounds the corners by pulling corner widgets, shows the finished mark small with a signature and wordmark, then cuts to mockups drawn in code (fleece, bottle, business cards, blade sign, tote). Every edge of the mark lies on a guide and every corner is a guide crossing — check.mjs proves it, plus small-size legibility, facing, feet on the ground, a hand-like cursor and determinism. HTML Canvas, bundled fonts, synthesised click-track sound, no image files; outputs a live page and a 1080×1920 MP4 (~40–45 s). Give it a topic or a brand and it designs a new mark — subject, lean, grid, shapes, colours, closing shots — and films its construction. Use for logo design process reels, "how this logo was built" shorts, grid / golden-ratio style logo breakdowns, brand reveal videos, or to remake this reference style on a new subject ("로고 제작 과정 영상", "로고 그리드 작도", "가이드선으로 로고 만드는 영상", "도형 구성 로고", "로고 메이킹 쇼츠", "이 영상처럼 로고 만들어줘", "이 스타일로 ○○ 로고", "주제만 바꿔서", "logo construction video", "logo grid breakdown", "shape builder logo reel", "logo design process short", "geometric logo reveal"). Source — made from https://x.com/TheDoctorLogos/status/2122343959577886904?a=I0lPjyIB7nKGbjj92uo&s=19
---

# logo-construction

A 9:16 film of a logo being constructed, the way designers post them: a rough grey marker sketch of the idea on a white
artboard, then a cursor that lays a construction grid over it — long slanted lines that all share one lean, copies
dragged across, horizontals for the levels, a few free lines, then a zoom-in to drag circles out from their centres
while a size tooltip counts. The set of tines is distributed with an Align panel. Everything is marquee-selected and
turns blue, a tool strip slides in, and the shape builder fills the mark cell by cell: a hovered region shows grey dots
and a red edge, a click turns it to ink. The guides are deleted, the camera goes close on the anchor points and the
corners are rounded by pulling their widgets. The finished mark sits small in the middle with a signature or wordmark,
and then the film cuts to the mark on things — a fleece, a bottle, business cards, a blade sign, a tote. Nothing is an
image file: the mark is a grid of guides in `mark.js`, the sketch and mockups are derived from it, the editor
furniture is drawn in code, and every frame is `seek(t)`, so the same page plays live and renders to MP4.

Made in this repo after an X post by The Dr. Logos (@TheDoctorLogos) crediting designer graphicdesignpark —
https://x.com/TheDoctorLogos/status/2122343959577886904?a=I0lPjyIB7nKGbjj92uo&s=19 (41.5 s: a moose mark built from a
lean grid and circles in a vector editor, then shown on a fleece, a bottle and a backpack). This skill takes the
*format* — the order of making, how each step looks and moves, and the rule that every edge sits on a guide — not the
moose, the designer's signature or the mockup photos (references/SOURCE.md). Starter: `templates/` 「Ember Fox」 (45 s,
a fox in stride on a 14° grid for a coffee roaster). Worked example on a topic the starter does not cover:
`examples/lighthouse` 「North Pier」 (44 s, a striped lighthouse with beams and waves for a ferry line: mirrored taper,
distributed tiers, copied circles). Live: https://jungrok5.github.io/motion-skills/logo-construction/

**Fixed by the style** (every piece): the 1080×1920 white artboard; the acts in order — sketch, construct, select,
build, clean, refine, reveal, mockups; the grey marker sketch with a handwritten signature; black hairline guides at
constant screen width, drawn by a cursor from the nearer end; family members alt-dragged as copies; circles dragged
from the centre with a W / H tooltip inside a zoom; the Align panel for evenly spaced families; marquee → blue
selection with anchor squares → tool strip → shape builder (dots + red edge → ink); guides deleted; corner widgets
pulled to round; the small centred mark; hard cuts to mockups with a slow push-in; the click-track sound. And the rule:
**every edge on a guide, every corner a crossing, every curve a circle.**
**Designed per topic** (never reused): what the mark depicts and why; its lean (or none), its slants, levels, free
lines and circles; which lines do double duty; the families and which are distributed; the shapes and their radii;
the ink colour; the signature and wordmark; which mockups, their colours and text; the timings.

## What's in this folder
| path | what |
|---|---|
| `lib/mark.js` | `Mark`: authoring the grid and the shapes — `slant`/`slants`, `h`/`hs`, `v`/`vs`, `line`, `angled`, `parallel`, `circle`/`circles`, `{ family, distribute, measure }`, `shape(name, ['a&b', 'c&d:r'], { round, foot })`, `cut`, `add`, `reads`; resolves corners, auto-sharpens joints, fills the mark, makes sprites, derives the rough sketch |
| `lib/film.js` | `Film`: plans every act (cursor keys with travel times, camera moves, events), draws each frame, the mark sheet (`?sheet=mark`), the live player, the contract and the measurements check.mjs reads |
| `lib/ui.js` | editor cameos in screen pixels: cursors (arrow, copy, crosshair, builder, direct), tool strip, Align panel, size tooltip — generic, no product's name or icons |
| `lib/mockups.js` | closing shots drawn in code: `fabric`, `bottle`, `card`, `sign`, `tote`; add a kind to `MOCKUPS` in your project |
| `lib/core.js` | seeded random, noise, easing, line crossing / clipping, polygon helpers, rounded paths, software canvases, grain, colour contrast |
| `lib/fonts/` | Caveat (signature), Inter (UI, Latin wordmarks), Pretendard Bold subset (Korean wordmarks); OFL licences + README |
| `templates/` | 「Ember Fox」 starter: `index.html`, `mark.js`, `BRIEF.md` — what `new-piece.mjs` copies |
| `examples/lighthouse/` | 「North Pier」: the same files, a non-animal, upright topic designed from its brief |
| `scripts/new-piece.mjs` | start a piece (starter, or `--from lighthouse`) |
| `scripts/render.mjs` | `--mark` (grid sheet), `--acts` (end of each act + each mockup), `--stills`, `--sheet`, the MP4 (workers × ffmpeg) with the synthesised sound |
| `scripts/sound.mjs` | clicks, fills, snaps, delete swish, cut thumps and a soft pad, synthesised from the film's events |
| `scripts/check.mjs` | grid rule, legibility at 48 / 32 / 24 px, facing, feet, acts, cursor speed and frame, sketch looseness, mockups, glyphs, determinism |
| `references/` | **SOURCE** (the post beat by beat; what is / is not taken) · **BRIEF** (template + still rubric) · **GEOMETRY** (how to design a mark on a grid, the API) · **LOOK** (acts, constants, mockups, sound) · **LESSONS** |

## Project layout (what you create)
```
my-mark/
  BRIEF.md     topic → subject, grid, shapes, film (signature, wordmark, mockups, timings), review log
  mark.js      export function mark() → a Mark: guides in drawing order, then shapes, cuts, reads()
  piece.html   new Film(mark(), { signature, title, subtitle, ink, mockups, timing }).start()
  lib/         copy of the skill's lib/ (new-piece.mjs); the page imports it through an import map ("lc/")
  out/         mark sheet, acts, sheets, piece.mp4 (not committed)
```
Run scripts from the project root: `node <skill>/scripts/render.mjs piece.html --mark`. Pages are ES modules: view them
through a local server (`python3 -m http.server`); the scripts pass Chromium the file:// flag.

Requirements: Node + Playwright Chromium, ffmpeg. No network, no npm install, no GPU. A 45 s film renders in ~30 s on 4 cores.

## Workflow
1. **Topic → brief.** Write `BRIEF.md` from references/BRIEF.md before any code: the ONE LINE; the subject and why it
   fits the brand; the one feature that must read at 24 px; facing and stance; the lean (and why); the main slants,
   levels, free lines, circles and families; the shapes; the signature (the brand's or the user's own handle — never
   someone else's), wordmark, ink, 2–4 mockups that suit the brand, and timings. If the user brings a reference
   video, pull stills (`ffmpeg -i ref.mp4 -vf fps=1,scale=240:-1,tile=7x6 sheet.png`) and note its beats, then design
   your own mark.
2. **Start**: `node <skill>/scripts/new-piece.mjs my-mark` (or `--from lighthouse`). Replace the fox — it is an
   example of the style, not a template.
3. **Design the grid** in `mark.js` (references/GEOMETRY.md): silhouette as 5–12 blocks → lean → long slants that do
   double duty → horizontal levels → few free lines (`parallel()`, mirrored pairs) → circles for every hole and curve →
   families for parallels → shapes by corner crossings → radii. Authoring order is the film's drawing order: big
   structure first, details after, circles together.
4. **Mark sheet**: `render.mjs piece.html --mark` → `out/piece-mark.png`. Score rubric 1–5 (reads at 256 px; the key
   feature at 24 px; no magenta corners; one facing, plausible legs, mirrored copy reads; rounded outside corners). Fix
   the grid here.
5. **Film settings** in `piece.html`: signature, `title` / `subtitle`, `ink`, `mockups` (kinds and colours from the
   brief; ink must stand off its base, contrast ≥ 3), `timing`.
6. **Review stills**: `render.mjs piece.html --acts` and `--sheet 24 --scale .5`; score rubric 6–12. Log failures in
   BRIEF.md, fix, render again.
7. **Check**: `node <skill>/scripts/check.mjs piece.html` must end with `all checks passed`. Read the warnings too.
8. **Render**: `render.mjs piece.html` → `out/piece.mp4` with the click track (`--silent` without, `--audio music.wav`
   to mix the user's track under it). Look at stills pulled from the MP4.

## Rules
- **Design per topic.** The fox and the lighthouse are examples of the style, not menus. A new topic gets its own
  subject, lean, grid and shapes; never reshape another piece's coordinates into a new animal.
- **One style.** Every piece goes through the same acts with the same marks: grey marker sketch, hairline guides,
  copies, circles in a zoom, blue selection, dotted hover with a red edge, ink fills, corner widgets, the small reveal,
  code-drawn mockups. No photos, traced bitmaps or a second UI look.
- **The grid builds the mark.** Every corner is a crossing of two straight guides; every edge lies on a guide; holes
  and curves are circle guides. No free coordinates in a shape (check.mjs fails them). Few directions: reuse with
  `parallel()`, mirror pairs; warn above six.
- **It reads small.** Holes survive at 48 px (check.mjs fails otherwise); aim for 24 px. One silhouette feature carries
  the subject at icon size.
- **Bodies are possible.** An animal mark faces one way as a whole (`reads({ facing })`: the eye on that side), stands
  on its ground guide (`foot: true`), bends where that animal bends; stylise proportions, never anatomy. Look at the
  mirrored copy on the mark sheet.
- **The cursor is a hand.** It travels from where it is (distance-timed, eased, a slight arc), draws from the nearer
  end, never teleports or leaves the frame (check.mjs: free moves ≤ 150 px/frame, drags ≤ 240). The camera never moves
  during a drag. Nothing in the mark moves except by the cursor's action.
- **The sketch is the idea, not the answer.** Derived from the mark but loose (IoU with the mark 0.45–0.95).
- **Mockups are drawn, and sit on their surface.** Code-drawn scenes in `lib/mockups.js`; the mark takes the surface's
  texture, folds, wrap and light. No mockup photos, no real brands in shot.
- **No one else's identity.** The signature and wordmark are the brief's (the user's or their brand's). The editor UI is
  generic. Don't recreate an existing company's logo as the "new" mark.
- **Code-only.** No generated video, image, voice or downloaded motion: the mark, sketch, cursor, UI, mockups and
  sound are all code. Generated pictures may inform a brief (kept out of the repo), never appear in the film.
- **Pure function of t.** No `Math.random`, `Date` or state between frames; seeded randomness only. check.mjs proves
  determinism (software canvases, every frame cleared first).
- **Text in the bundled fonts.** Latin and Korean wordmarks work; another script needs a font that has it (check.mjs
  fails missing glyphs).

## Contract every film page fulfils
`window.seek(t)`, `window.DURATION`, `window.FPS` (30), `window.SIZE = {W: 1080, H: 1920}`, `window.filmInfo()` (acts,
guides, shapes, fills, rounds, mockups), `window.markCheck()`, `window.legibility(px)`, `window.sketchCheck()`,
`window.mockupCheck()`, `window.glyphCheck()`, `window.cursorAt(t)`, `window.soundEvents()`, `window.film`,
`window.__ready = true` — all set by `Film.start()` after the fonts load. `?render=1` = fixed canvas, no live loop;
`?t=20` = one frozen frame; `?scale=.5` = preview size; `?sheet=mark` = the mark sheet. The live page fits the window
and loops: click / space pauses, ← → jump 3 s, the bar at the bottom scrubs.
