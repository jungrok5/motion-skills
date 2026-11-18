# sheet-city

A live web page in which a small, real spreadsheet — a DOM table with formulas, selection, in-cell editing, undo and a slider —
is drawn by WebGL through HTML-in-Canvas as a model city on a desk. Every cell is a building as tall as its value with its
number on the roof, losses are pits, window light rakes soft shadows, and props of the topic stand on the desk. Click a
rooftop, type a number and press Enter: the building springs up, light runs along the streets to every cell that depends on
it, and they count to their new figures. Give it a topic and it designs the sheet, palette, desk, light, props and sound.

```bash
node scripts/check.mjs examples/marathon-block/index.html          # the worked example: live-page + style checks (a few minutes)
node scripts/still.mjs examples/marathon-block/index.html --out out --act idle,edit,close --at 0.35
node scripts/new-page.mjs ../my-sheet                              # start your own (or --from marathon-block)
node scripts/check.mjs ../my-sheet/index.html
```

Requirements: Node + Playwright Chromium for the checks and stills. The page needs nothing else: open `index.html` in Chrome or
Edge 157+ or the Claude desktop app (other browsers show the same sheet as a plain, working spreadsheet). No network, no
build step; system fonts, synthesised sound.

Topic in, page out: the topic is first written as a brief (`references/BRIEF.md`): the question the sheet answers, its rows
and formulas, the palette, desk, light and props. Template: a household budget (`templates/`). Example:
`examples/marathon-block/` — a 12-week marathon plan on a wooden table in evening light; drag "Peak long run" and the long
runs, weekly totals, hours and the running total follow.

Source: made from Felix Rieseberg's "Sheet City" demo https://claude.ai/artifact/VZ6Un8f7RzJArq7wqMrE72 on the HTML-in-Canvas
demo page https://claude.ai/artifact/7cCNqKnoFSoib9SuNLB3vk, shared at
https://x.com/felixrieseberg/status/2122036839238492493?a=ARrikCShhoXCfhmuoJ0&s=19. All code here is this repo's own.
Live pages: https://jungrok5.github.io/motion-skills/sheet-city/
