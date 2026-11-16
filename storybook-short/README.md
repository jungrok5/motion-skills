# storybook-short

A short hand-painted picture-book film made entirely of code — every frame drawn on a canvas, every sound synthesised
with Web Audio, no images, libraries or assets. Give it a topic and it writes a brief, designs the characters
(big-headed picture-book people in bell coats with dry-brushed hair and hats, plus animals), paints the places as
crayon-and-gouache spreads, cuts a few shots (close-up → wide spread → a walk → the small event and its big move →
close-up), keys the motion (walks with planted feet, glances, a big move with a gather and a recovery) and scores it
(music, ambience, footsteps on the heel strikes). The heads and media are shared with `storybook-portrait`.

```bash
cd examples/market-day
node ../../scripts/check.mjs index.html                      # brief, determinism, style, bodies, motion, sound
node ../../scripts/render.mjs index.html --cast              # → out/market-day-cast.png (turns, seated, walk both ways)
node ../../scripts/render.mjs index.html --sheet 16 --scale .5   # → out/market-day-sheet.jpg
node ../../scripts/render.mjs index.html --scale .5          # → out/market-day.mp4 (960×540 preview with sound, ~1 min)
node ../../scripts/render.mjs index.html                     # → out/market-day.mp4 (1920×1080)
node ../../scripts/new-film.mjs ../../../my-film             # start your own (or --from market-day)
```

Requirements: Node 18+ with Playwright's Chromium, ffmpeg. No network, no npm install, no GPU. To watch live, serve the
skill folder (`python3 -m http.server`), open `examples/market-day/` and click ▶ for sound (`?cast` for the cast sheet).

Topic in, film out: the brief comes first (`references/BRIEF.md`: cast, shot table, motion keys, sound), then the cast
sheet turned both ways, then the shots; `check.mjs` must pass before the render.

Examples: `templates/` 「Windy Walk」 (the starter, 16 s: a boy on a windy hilltop, then the walk home along a ridge with
his dog) and `examples/market-day` 「Market Day」 (42 s: Mina at her window → the street market with Grandpa → the walk home
along the canal → ice cream on the bench, her scoop falls and Grandpa offers his → her grin, ice cream on her nose).

Made from the X post by Chetaslua (@chetaslua): https://x.com/chetaslua/status/2122095074968469720?a=WMOtOJajKg-tokfUuC4&s=19
— a "hand painted film with pure code" in the picture-book style of the reference behind storybook-portrait (the look's
original: @Artedeingenio). This skill takes the method and the form; that film's shots and characters are not used, and
every film here is this repo's own. Live pages: https://jungrok5.github.io/motion-skills/storybook-short/
