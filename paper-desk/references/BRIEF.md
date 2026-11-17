# BRIEF — from a topic to a paper desk

Write the brief before any code, as `BRIEF.md` in the project (`templates/BRIEF.md` is the blank). The topic is a
document someone would hold: a love letter, a treasure map, an exam paper, a resignation letter, a recipe card, a ticket,
a contract, a child's drawing, a lab report, a ransom note, a set list. The piece is that one sheet, alive, on a desk that
belongs to the person who wrote it.

## 1 · The document
- **What it is, and who wrote it for whom.** The sheet's HTML is designed for this topic, never the template's letter with
  new words. A treasure map is a grid of places with a legend and a compass; an exam paper has numbered questions, answer
  lines and a mark box; a recipe card has a title, servings, ingredients with checkboxes and a method.
- **Size.** Pick the real object's proportions in CSS px: A4 560 × 792, US letter 560 × 725, index card 600 × 360,
  postcard 600 × 400, ticket 600 × 240. The world width is 2.1 units (21 cm) unless you set `sheetWidth`.
- **Live parts.** Everything a person would do with the real thing is a real control: fields to fill, boxes to tick,
  a select for the choice, a button that does something on the page. One `[data-hic-edit]` (the check types into it), one
  `[data-hic-click]` (the check clicks it), and `data-pd-probe` on a central element.
- **One live behaviour.** A small piece of ordinary DOM code that makes the page feel alive on its own: a slider that
  rewrites a paragraph, a tally, a checklist that strikes through, a date that counts down. The texture re-uploads on
  every change; that is the point of the style.
- **Type.** System font stacks only (no font files, no CDN). Pick stacks with the right voice: a serif for letters, a
  typewriter stack for memos, a script stack for signatures, a rounded sans for a child's worksheet.
- **White is paper.** The sheet's background stays `#fff`; the stock's colour is applied by the shader. Ink is a CSS
  variable `--ink` so ink choices are one radio group.

## 2 · Paper, desk, light, props
| field | decide |
|---|---|
| stock | a preset (`wove`, `laid`, `copy`, `kraft`, `airmail`, `parchment`, `card`, `rose`) or a new one: `tint`, `back`, `laid`, `fibre`, `sheen`, `tooth`, `gsm`, `char` (ENGINE.md). Weight matters: 45 g airmail curls tight and fast, 300 g card swings back slowly and crumples late. |
| stocks offered | 0–4 in a `select[data-pd=stock]`, only if choosing paper is part of the topic |
| desk | `felt`, `walnut`, `oak`, `leather`, `laminate`, or the same kinds with the topic's colours (`{ kind: 'wood', a, b }`) |
| lamp | colour (warm 1, .82, .6 for a study; cool .92, .96, 1 for an office), power, position; off at load for a night piece |
| props | 2–5 objects the writer would have: kit kinds (`mug`, `inkwell`, `pen`, `pencil`, `candle`, `coin`, `seal`, `book`, `block`, `clip`) or a new one drawn in the page with `B.box / B.lathe / B.rod / B.surface`. They sit around the sheet (|x| ≥ 1.25 half-sheets) and never cover it. A lit candle is a second light. |

## 3 · The acts — only those the topic earns
- **curl** (corners from the Type tool, anywhere with the Curl tool): almost always on; it is what makes paper read as paper.
- **fold**: letters (thirds), maps (quarters), notes passed in class. `max` 2–5.
- **crumple**: anything someone could regret: drafts, rejections, exam papers, receipts.
- **burn**: secrets, old letters, maps that must not be found, bridges. `size` .3–.45, `speed` 2–3 s.
- **stain**: the liquid that belongs on this desk (coffee #5a3416, tea #8a5a20, red wine #5a0a1e, ink #101a3a, water #8a9aa8).
Name each act in the dock in the topic's words ("Burn it", "Spill coffee", "Fold for the post"). The hint line says what to
do with the pointer.

## 4 · Sound
Synthesised and started by the first gesture, with a visible toggle. The acts already sound like themselves (rustle, crease
snap, crumple crackle, plip, fire). A topic only decides whether the toggle starts on.

## Still review (each still must pass)
Take stills with `scripts/still.mjs page.html --act "idle;curl;fold;crumple;burn;stain;night,burn"` and look at every one.
1. **Is the document readable at 1280 × 800?** The headline and the first lines are sharp; nothing important is cut by the
   dock, the hint or the top bar.
2. **Is it unmistakably paper of this stock?** Fibre, a slight bow, the lifted corner, the back side when it curls.
3. **Does the desk belong to the writer?** Surface, props and light tell the topic without a caption.
4. **Do the props frame the sheet without covering it,** with shadows that fall away from the lamp?
5. **Does each act look physical?** The curl is a cylinder with the back showing; the fold has a crease and springs open a
   little; the ball is faceted and sits on its shadow; the burn has a ragged glowing front, char, a hole and embers; the
   stain has a darker rim.
6. **At night (lamp off) does the fire or the candle light the page,** and is the rest of the room dark but not black?
7. **Is the live page obviously live?** In at least one still the page shows a typed change, a selection or a ticked box.
A "no" fails the still: fix the page or the config, re-render, and note anything you learn in `references/LESSONS.md`.
