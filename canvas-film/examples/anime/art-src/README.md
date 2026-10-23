# Raw image-model outputs (before keying / alignment)

Everything the image model returned for this example, so the asset tools can be re-run from scratch. Green-screen
files are lossless WebP (keying needs exact colours); painted backgrounds and unused candidates are WebP q94.
Prompts for each are in `../WORKFLOW.md` (section in brackets).

| folder | files | what | used for |
|---|---|---|---|
| `character/` | `base1–4` | text-to-image candidates of the heroine (§2a); `base3` was picked and is the reference for every edit | everything |
| | `back1`, `back2` | back-view edits (§2b); `back1` picked → `../scenes/art/back.webp` | wide shots |
| | `bust1`, `bust2` | look-back bust edits (§2b); `bust1` picked → `../scenes/art/bust.webp` | close-up |
| | `blink`, `sad` | expression edits of the bust (§2c), raw | |
| | `bust-blink-raw`, `bust-sad-raw` | the same after `tools/patch.py` (only the changed face pasted on the base) | rig expressions |
| `rig/` | `back-under`, `bust-under` | underlays: loose hair removed and painted behind (§4b) | `tools/layers.py` |
| | `bust-face` | face base: bangs and features removed (§4b) | `tools/facelayer.py` |
| `layout/` | `B/Bnf/L/D/G-{h,v}` | code layout frames rendered in plate mode (`Bnf` = without the front objects) | `tools/plate.py` |
| `plates/` | `crossing/signal/sunset-{h,v}` | repaints of the layout frames (§4c) | `tools/plate.py` |
| | `skya`, `skyb` | tall sky (text-to-image); `skya` used | opening tilt, close-up bg |
| | `traina`, `trainb` | train car on green; `traina` used (see-through windows) | `tools/key.py --trim` |
| `turn/` | `turn1a/b`, `turn2a/b` | head-turn key drawings (head away / profile); `a` used | `../scenes/art/turn1/2.webp` |
| `l2d/` | `backhair`, `body`, `face`, `features(-blink,-sad)`, `bangs`, `lockL`, `lockR` | full Live2D-style layers (§4d); `lockR` is a duplicate of `lockL`, unused | `tools/key.py` → `tools/l2dlayers.py` |

Re-run the full layers, for example:
```bash
mkdir -p /tmp/l2d && for n in backhair body face features features-blink features-sad bangs lockL; do
  python3 -c "from PIL import Image; Image.open('art-src/l2d/$n.webp').save('/tmp/l2d/$n.png')"
  python3 tools/key.py /tmp/l2d/$n.png /tmp/l2d/k-$n.png; done
python3 tools/l2dlayers.py /tmp/l2d scenes/art/l2d bust
```
