# Tessera-small — the sprite painter

## What it is

**Tessera-small** (Jagrat Patel / TheJagStudio, <https://huggingface.co/thejagstudio/tessera-small>) is a 47.6M-parameter
masked-diffusion model that paints a **16×16** pixel sprite from a few words. Each pixel is one token from a learned
512-colour palette (token 0 = transparent); a bidirectional transformer starts from a fully masked canvas and unmasks
all 256 pixels in 16 parallel steps, guided by a frozen CLIP ViT-B/32 text encoder (classifier-free guidance 3).
Trained on Pixel Art Atlas 1.4M (Angais).

**cfahlgren1/tessera-small-onnx** (<https://huggingface.co/cfahlgren1/tessera-small-onnx>) is its int8 ONNX build with a
one-file browser runtime, `web/tessera.js`: onnxruntime-web 1.22 from jsDelivr, the weights from the Hub (115 MB,
kept in the browser's Cache API after the first visit), WebGPU when the GPU passes a self-test (about 1 s for four
sprites), otherwise WebAssembly on the CPU (about 40 s for four in a browser, ~25 s each here in headless Chromium).
It was made for Slack Moji (<https://huggingface.co/spaces/cfahlgren1/slack-moji>): type anything, get four to pick from.

## Licence — read before you ship

- Tessera-small is **CC BY-NC 4.0**: education, research and personal **non-commercial** use, with credit. Commercial
  use needs a separate licence from the author. The ONNX build and Slack Moji inherit that.
- A game that paints its cast with Tessera is therefore non-commercial, and shows the credit (`TESSERA_CREDIT` in
  `lib/tessera-link.js`; the engine prints it under the canvas whenever a Tessera sprite is on screen).
- The **hand-drawn grids** in game.json are the project's own: a game played with them uses nothing of the model.
  That is the version to use for anything commercial.
- The CLIP text encoder is OpenAI's (MIT).

## How this skill uses it

- **Nothing of the model is in this repo.** `lib/tessera-link.js` fetches `web/tessera.js` from the Hub at a pinned
  revision (`TESSERA_REV`), imports it through a Blob URL (the Hub serves it as text/plain), and points it at the
  weights at the same revision. Pinning keeps the sampler and the weights matched and the seeds meaningful.
- **The player chooses.** The title screen offers "Tessera로 스프라이트 그리기" (with the 115 MB note) or the hand-drawn
  sprites; a game never starts a 115 MB download on its own. With no WebGPU it says so and asks before the slow CPU run.
- **The title screen paints live.** `onStep` shows each member filling in over the 16 steps — the loading screen is the
  model working.
- **What the model painted stays on the player's device.** Each sprite (RGBA, 1 KB) is kept in localStorage under
  prompt + seed + pick, so the next visit starts at once and never loads the model.
- **"내 주인공 그리기"**: the player types a prompt, gets four, picks one for the hero (Slack Moji's loop inside the game).
  A typed hero is treated as front-facing.
- **Generated sprites are never committed.** `scripts/paint.mjs` writes previews into `ref/tessera/` (git-ignored);
  `sheet.mjs --tessera` writes into `ref/sheets/`. Screenshots for the samples page are taken with the hand sprites.

## Seeds and picks

`generate(prompt, { seed, count: 4 })` is deterministic for a prompt + seed **on one device class**: WebGPU and the CPU
can differ in a pixel or two, and a different GPU may differ more. So game.json stores `seed` and `pick` (which of the
four) as the author's choice, and the engine re-paints that on the player's device; it is the same picture in practice,
not a guaranteed byte-for-byte copy. The hand grid is the canonical, checked version.

## Prompts that read at 16×16

The model was trained on emoji-like sprites. What works:

- **One object or creature, named the way an emoji is**: "red crab", "hedgehog", "silver fish", "lighthouse lantern",
  "frog wearing a crown". 1–4 words; adjectives of colour and material help.
- **Plain English** — the CLIP tokenizer reads 24 tokens of English. check.mjs fails a prompt with non-ASCII text.
- Avoid scenes ("a cat on a cliff at night"), text, numbers, many objects, and camera words. The place is drawn by
  the engine, not the model.
- Expect **front-facing** pictures for most creatures; side views come with words like "walking" or for long animals
  (fish, cats) — check the picked sprite and set `faces`.
- Try two or three seeds per prompt (`paint.mjs --seeds=7,21,42`) and pick the one whose silhouette is clearest at 1×
  and whose bottom row sits on a flat base (it will stand on the ground line).

## Running it here

```bash
node <skill>/scripts/paint.mjs <project> [--roles=hero,crab] [--seeds=7,21] [--prompt="red crab"]
```

Headless Chromium on the CPU: ~25 s per sprite, four per prompt and seed. It needs network access to huggingface.co
and cdn.jsdelivr.net. Do not run the Python sampler from the model repo (`tessera_onnx.py`) in this workflow: the
browser path is what players run, and it is the one to see.

## Same character, new look (repaint)

Tessera paints every sprite from scratch, so changing the prompt ("orange cat sleeping") gives a *different* cat.
To keep a character, repaint only part of it: `repaint(tokens, keepMask(tokens, region), prompt)` in
`lib/tessera-link.js` + `lib/decorate.js` keeps the other pixels exactly. `scripts/repaint-sheet.mjs` tries edits side by
side. What was found on an orange cat (CPU, 4 variations each, `ref/` sheets):

| want | how | result |
|---|---|---|
| hat, crown, glasses, scarf (on the body) | region `hat` / `crown` / `eyes` / `neck`, prompt = the character + "wearing a wizard hat" … | works: same cat, new hat / scarf in 4 of 4 |
| a small prop beside it (apple) | `shrink` to 11 px at the left, region `side`, prompt = the prop only ("a red apple") | works: a small apple next to the cat |
| weather (rain) | `shrink`, region `above`, "blue raindrops" | works; "rain" alone paints a blob |
| a large prop (fish, ball of yarn) | `shrink`, region `background`, prompt = the prop only | the prop comes out big, behind the cat (in `side` it is squeezed into a strip) |
| standing on something (skateboard) | `shrink --lift 3`, region `feet`, prompt = character + "on a skateboard" | works: board with wheels under the cat; the prop alone falls apart |
| a pose (sleeping) | — | not possible: a pose repaints the whole body, so it is no longer the same cat |

Two rules came out of it: (1) without `shrink` a 16×16 character fills the canvas and props only get its corners;
(2) when the background is freed, do **not** name the character in the prompt — the empty space gets a second cat.
The game's 꾸미기 buttons use only the on-body accessories (they work without changing the hero's size).
