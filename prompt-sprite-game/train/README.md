# train — a themed sprite painter of your own

Tessera-small paints anything, but its weights are CC BY-NC 4.0 and it is 115 MB. Its training data is not: **Pixel Art
Atlas 1.4M** (Angais, <https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m>) is **CC0**. These scripts cut one
theme out of that data and train a small painter with the same recipe — masked diffusion over 16×16 palette tokens,
confidence-ordered unmasking, classifier-free guidance — but with a word vocabulary of the theme instead of CLIP. One
theme needs a few thousand sprites, a few million parameters and about an hour on a 4-core CPU.

The first one is **cat**: 5,775 sprites of 24 cat subjects (17 breeds and kinds — scottish fold, british shorthair, russian
blue, bengal, munchkin, norwegian forest, maine coon, tabby, persian, tuxedo, ragdoll, ginger, siamese, calico, black, plain
cat, kitten — plus lynx, cat warrior, ghost cat, winged cat, stuffed kitten, cat figurine, cat statue), 352 words, 255
colours. Cat-shaped things (cat mask, cat-eye sunglasses, cat tree, cat ear headband) are left out.

## Run

```bash
pip install torch --index-url https://download.pytorch.org/whl/cpu
pip install numpy pillow onnx onnxscript onnxruntime
# the atlas: one 259 MB zip (tokens.npy, palette.npy, captions.json, objects.json …)
curl -LO https://huggingface.co/datasets/Angais/pixel-art-atlas-1.4m/resolve/main/pixel-art-16x16-1.4m.zip && unzip pixel-art-16x16-1.4m.zip -d atlas

python3 prepare.py --atlas atlas --match "cat|cats|kitten|kittens|kitty|kitties|tabby|calico|bobcat|lynx|sphynx|maneki-neko" \
  --drop "cat mask,cat-eye sunglasses,cat tree,cat ear headband,chibi witch,glass marble,bookmark,bag of pet food,coin purse,sleep mask,beanie,headphones,mitten,hoodie" \
  --out cat.npz
python3 train.py --data cat.npz --out runs/cat --steps 8000        # ~70 min on 4 CPU cores; samples-*.png as it goes
python3 export.py --ckpt runs/cat/ckpt-best.pt --out dist/cat --name cat
```

| file | what |
|---|---|
| `prepare.py` | subset by subject regex → tokens re-paletted to K colours (k-means in OKLab, weighted by use), captions, vocabulary |
| `model.py` | `SpritePainter` (hourglass transformer: 16×16 → 8×8 core with caption words + registers → 16×16), `mask_batch`, `paint` |
| `train.py` | AdamW, warm-up + cosine, EMA, mirror augmentation, 10 % caption dropout; sample sheets and `ckpt-best.pt` by validation loss |
| `eval.py` | scores a checkpoint under one sampler setting (acc, fd, lone, speck, nll); `--sheet` for a picture |
| `sweep.sh` | `eval.py` over several settings, one line each |
| `export.py` | int8 ONNX (dynamic quantization) + `<name>.json` (palette, vocabulary); checks the int8 graph against PyTorch |

The browser side is `lib/painter-link.js` (onnxruntime-web on WebAssembly, the same loop as `model.paint`).

## Measuring, not eyeballing — and what helped the cat painter

`eval.py` paints `--per` sprites for every subject from its name and scores them: **acc** (a small CNN trained on the real
sprites names the asked-for subject), **fd** (Fréchet distance of that CNN's features to the real sprites), **lone** and
**speck** (single-pixel detail vs stray off-colour pixels, both against the real sprites' own rates) and plain **nll**.
FD alone rewards noise (texture counts as "real"), so every choice below was also looked at.

| try | acc | fd | speck (real 2.48) | verdict |
|---|---|---|---|---|
| v1 (cat only, 3.24 M, best val step 3,500), 12 steps, temp 1.0 | 75.5 % | 65.1 | — | first shipped settings |
| temp 0.7, 24 steps | 75.5 % | 69.8 | — | **worse**: looks tidy, loses the detail pixels real sprites have |
| guidance 1.0 / 1.5 / 2.0 | 30–62 % | 156 / 100 / 84 | — | **worse**: the unconditioned guess is weak; guidance 3 is right |
| temp 1.6 | 81.2 % | 49.8 | 9.43 | detail back, but off-colour specks |
| temp 1.6 + top-p 0.8 + NMS | 77.6 % | 44.2 | 8.77 | best FD, specks still |
| v2: self-conditioning + blob masks + perceptual smoothing | 75.0 % | 64.6 | — | **worse** on 5.8k sprites (overfits first, best step again 3,500) |
| pre-train on 128k animal sprites → fine-tune on cats | 75.0 % | 56.0 | 11.46 | nll better (1.744 vs 1.872), samples not better at this size |
| **temp 1.6 + top-p 0.8 + NMS + despeckle** (shipped) | 77.6 % | 57.1 | 0.11 | detail kept, strays removed (floating pixels: real sprites have 0.03) |

So: the data size (5.8k sprites, overfitting from step 3,500) is the limit; sampling was the cheap win. Next steps that
need a GPU: a larger model pre-trained on the whole atlas, then fine-tuned.

## Where the weights go

The exported painter (`<name>.onnx` + `<name>.json` + `NOTICE`, a few MB) is committed under `prompt-sprite-game/models/<name>/`
(the owner's choice for the cat painter). The dataset, the downloaded zip and `runs/` never enter the repo. Game demos on
the samples page load the painter from the repo through jsDelivr, so no model file goes into `docs/`.

## Provenance and licence (read before selling anything)

Checked on 2026-11-19 against the texts themselves; this is a reading, not legal advice.

- **Tessera-small** (not used here): its LICENSE says images generated with it may not be used commercially either —
  "including … using it in paid products, apps, games or services". A game whose sprites Tessera painted is non-commercial.
- **Pixel Art Atlas 1.4M** (the training data): Angais dedicates the sprites, captions and collection to the public
  domain (CC0 1.0), "to the extent of the rights Angais can waive". The sprites were generated with **Krea 2 Turbo** and
  a pixel-art LoRA, and the card says the CC0 dedication does not override Krea's terms.
- **Krea 2 Community License Agreement** (page dated 2026-06-22, <https://www.krea.ai/krea-2-licensing>):
  - §5.3 — you own the Outputs you generate.
  - §2.3 — Commercial Use "of the Krea Model, Derivatives, or Outputs" is permitted only for a company-wide annual
    revenue under US$1,000,000 (trailing twelve months, affiliates included); at or above it, an enterprise licence
    from Krea is needed first.
  - §1 — a "Derivative" includes any "fine-tuned, distilled, or merged version" of the Krea Model. The agreement does
    not say whether a model trained from scratch on Outputs (like this painter) counts as distilled.
  - §3.1 — whoever distributes the Krea Model or a Derivative must put "Krea" at the start of its name and keep the
    notice "Krea 2 is licensed under the Krea 2 Community License Agreement" in a Notice file.
  - The Acceptable Use Policy (<https://www.krea.ai/krea-2-use-policy>) says nothing about training models on Outputs.
- **What that means for a painter trained here** — read cautiously, as if the Krea terms reach it: commercial use is
  fine below US$1M yearly revenue, and an enterprise licence is needed above it. Each exported painter ships a
  `NOTICE` that names the data, its CC0 dedication and the Krea notice. Whether the painter is a "Derivative" (and so
  would need the "Krea" name prefix) is open; ask Krea (opensource@krea.ai) before relying on it at scale.
- The code in this folder is this repo's; no Tessera weights or code are used (the recipe follows the Tessera-small
  model card, <https://huggingface.co/thejagstudio/tessera-small>).
