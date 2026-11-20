# prompt-sprite-game

A small pixel game in the browser whose cast is painted from words. Give it a topic: it designs a one-verb game — a
side-view platform climb or a top-down arena gather — and writes every character, item, enemy and goal as a few
English words that **Tessera-small** paints as a 16×16 sprite inside the player's browser (WebGPU, ~1 s for four; the
title screen shows them filling in, and players can type their own hero and pick one of four). Each member also has a
hand-drawn grid, so the same game runs offline and commercial-safe. The one-frame sprites move with weight (hop gait,
squat and landing squash, lagging lean, stepped turns, breathing idles), and a check script proves it.

Source: made from [Caleb's post](https://x.com/calebfahlgren/status/2122745094205763668?a=3EjPTb2Z6tqo35PIW7s&s=19) about
[Slack Moji](https://huggingface.co/spaces/cfahlgren1/slack-moji), built on
[Tessera-small](https://huggingface.co/thejagstudio/tessera-small) (Jagrat Patel / TheJagStudio, **CC BY-NC 4.0** —
games played with its sprites are non-commercial) through [its ONNX browser build](https://huggingface.co/cfahlgren1/tessera-small-onnx).

## Quick start

```bash
# play a worked example
cd prompt-sprite-game/examples/lighthouse-cat && python3 -m http.server 8000   # → http://localhost:8000/

# make your own (from the folder that holds the skill)
node prompt-sprite-game/scripts/new-game.mjs my-game --kind=platform --title="My Game"
# fill my-game/BRIEF.md, design my-game/game.json, then:
node prompt-sprite-game/scripts/paint.mjs my-game          # what Tessera paints for each prompt → my-game/ref/tessera/
node prompt-sprite-game/scripts/check.mjs my-game          # the gates
node prompt-sprite-game/scripts/sheet.mjs my-game          # cast sheet (both ways) + stills → my-game/sheets/
```

A themed painter of your own: `train/` trains one on a CC0 subset in about an hour on a CPU (the bundled `models/cat/`
— 3.56 MB, four cats in ~4–5 s on the CPU — paints the hero of 「등대 고양이」); see [`train/README.md`](train/README.md).

Requirements: Node 18+ and Playwright's Chromium for the scripts; any static server for the game. Tessera needs
huggingface.co and cdn.jsdelivr.net, and WebGPU for the fast path.

Worked examples: 「등대 고양이」 (`examples/lighthouse-cat`, platform) and 「버섯 숲 바구니」 (`examples/mushroom-basket`,
arena) — live on the [samples page](https://jungrok5.github.io/motion-skills/prompt-sprite-game/).
