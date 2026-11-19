# Source

**The post** — Caleb (@calebfahlgren, software + product at Hugging Face), X, 2026-11-17:
<https://x.com/calebfahlgren/status/2122745094205763668?a=3EjPTb2Z6tqo35PIW7s&s=19>

> Someone trained a tiny 47M-param diffusion model that paints pixel art emoji in your browser 👾
> I built a tiny Slack emoji maker on top of it. Type anything, get 4 to pick from.
> https://huggingface.co/spaces/cfahlgren1/slack-moji

with a 15 s screen recording of Slack Moji: a prompt box, four 16×16 sprites filling in pixel by pixel, one picked.

**What it points to**
- Slack Moji — <https://huggingface.co/spaces/cfahlgren1/slack-moji> (static Svelte app, CC BY-NC 4.0)
- the ONNX build and browser runtime — <https://huggingface.co/cfahlgren1/tessera-small-onnx>
- the model — Tessera-small by Jagrat Patel (TheJagStudio), <https://huggingface.co/thejagstudio/tessera-small>, CC BY-NC 4.0

## What this skill takes

- **The model as a sprite painter**, called from the player's browser through the ONNX build's own runtime, at a
  pinned revision — nothing of it copied into this repo.
- **The loop**: type words → four paintings fill in over 16 steps → pick one. It becomes the title screen's live
  painting of the cast and the "내 주인공 그리기" box.
- **"In your browser, nothing sent to a server"**: the game is a static page; the sprites stay on the player's device.

## What it does not take

- No code, layout, art or emoji from Slack Moji. The engine, tiles, backdrops, sound, hand-drawn sprites and both
  example games were written for this skill.
- No game: the post has none. The game form (platform and arena kinds, hop-gait motion, checks) is this skill's.
- No generated sprite is committed anywhere in this repo, including the samples page.
