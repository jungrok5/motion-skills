# principle-pass

Before / after animation-principles clips, in code. One creature does one short action twice at once — on top the
honest first pass (same story keys, linear, feet sliding, tail rigid), below the same keys after a Disney-principles pass
(slow in / out, anticipation, arcs, follow-through, overlap, squash & stretch, planted feet, breath) — each beat labelled
with the principles it shows, then a study of the paths and spacing. Give it a topic (a creature and an action); it
outputs a 1080×1350 MP4, a live page, stills, a cast sheet and a table of measured principles.

It is also the repo's motion reference: `lib/principles.js` (the principles as code + a meter) and `scripts/audit.mjs`
(run the meter on any skill's page). Shared notes: [`references/ANIMATION-PRINCIPLES.md`](../references/ANIMATION-PRINCIPLES.md).

```bash
node principle-pass/scripts/new-piece.mjs my-piece                 # or --from penguin-slide
node principle-pass/scripts/check.mjs my-piece/index.html          # principles before vs after, body, form
node principle-pass/scripts/render.mjs my-piece/index.html --sheet 12 --scale .5 --out my-piece/out
node principle-pass/scripts/render.mjs my-piece/index.html --out my-piece/out     # → out/my-piece.mp4
node principle-pass/scripts/audit.mjs --page some-other-skill/examples/x/index.html  # any page with window.__principles
```

Requirements: Node 18+, Playwright's Chromium, ffmpeg. No network, no npm install.

Made from Endel's X post "when you ask AI to follow Disney's animation principles" —
https://x.com/endel/status/2125224240488354066?a=X8s7fGWOhQz93WbUoz8&s=19 (the form and the idea; not its fox or frames).
Samples: https://jungrok5.github.io/motion-skills/principle-pass/
