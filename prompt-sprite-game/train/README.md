# train — a themed sprite painter of your own

Tessera-small paints anything, but its weights are CC BY-NC 4.0 and it is 115 MB. Its training data is not: **Pixel Art
Atlas 1.4M** (Angais, <https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m>) is **CC0**. These scripts cut one
theme out of that data and train a small painter with the same recipe — masked diffusion over 16×16 palette tokens,
confidence-ordered unmasking, classifier-free guidance — but with a word vocabulary of the theme instead of CLIP. One
theme needs a few thousand sprites, a few million parameters and about an hour on a 4-core CPU.

The first one is **rabbit**: 3,898 sprites of 17 rabbit subjects (moon rabbit, cottontail, hare, angora, lop-eared, dwarf,
rabbit knight, ghost bunny, winged bunny, jackalope, stuffed bunny, dust bunny, rabbit hutch, rabbit foot charm, bunny ear
headband, bunny ear cactus, rabbit), 330 words, 255 colours.

## Run

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install numpy pillow onnx onnxscript onnxruntime
# the atlas: one 259 MB zip (tokens.npy, palette.npy, captions.json, objects.json …)
curl -LO https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m/resolve/main/pixel-art-16x16-1.4m.zip && unzip pixel-art-16x16-1.4m.zip -d atlas

python3 prepare.py --atlas atlas --match "rabbit|rabbits|bunny|bunnies|hare|hares|jackalope" \
  --drop "baby bootie,sleep mask,retro tv set,house slipper,bathrobe" --out rabbit.npz
python3 train.py --data rabbit.npz --out runs/rabbit --steps 8000        # ~70 min on 4 CPU cores; samples-*.png as it goes
python3 export.py --ckpt runs/rabbit/ckpt-best.pt --out dist/rabbit --name rabbit
```

| file | what |
|---|---|
| `prepare.py` | subset by subject regex → tokens re-paletted to K colours (k-means in OKLab, weighted by use), captions, vocabulary |
| `model.py` | `SpritePainter` (hourglass transformer: 16×16 → 8×8 core with caption words + registers → 16×16), `mask_batch`, `paint` |
| `train.py` | AdamW, warm-up + cosine, EMA, mirror augmentation, 10 % caption dropout; sample sheets and `ckpt-best.pt` by validation loss |
| `export.py` | int8 ONNX (dynamic quantization) + `<name>.json` (palette, vocabulary); checks the int8 graph against PyTorch |

The browser side is `lib/painter-link.js` (onnxruntime-web on WebAssembly, the same loop as `model.paint`).

## Where the weights go

Not into git and not into `docs/`. The dataset, the downloaded zip and `runs/` stay outside the repo; the exported
`.onnx` + `.json` are published where a page can fetch them (a Hugging Face model repo, a release asset) and the game's
`game.json` points at that URL.

## Provenance and licence

- Data: Pixel Art Atlas 1.4M, CC0 1.0 (sprites, captions, collection). Its card notes the sprites were generated with
  Krea 2 Turbo and a pixel-art LoRA, and that the CC0 dedication does not override Krea's own terms — read them
  before selling a game built on a painter trained on it.
- Code here: this repo's. No Tessera weights or code are used; the recipe follows the Tessera-small model card
  (<https://huggingface.co/thejagstudio/tessera-small>).
- A painter you train is yours to license; it learned from CC0 data.
