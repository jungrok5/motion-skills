# The reference's technique — translucent pre-form references for image-to-video

The source post (https://x.com/taziku_co/status/2121541102700564482?s=19) describes a generative-video experiment:

> 流動性を残す実験。プロンプトによる制御に加え、透け感のあるリファレンスを追加。形が現れる直前の状態を入力することで、
> 全体の流動性を高めながらも、形状の一貫性を保つように調整しています。
> (An experiment in keeping fluidity. On top of prompt control, a translucent reference is added. By inputting the state
> just before the form appears, the whole picture becomes more fluid while the shape stays consistent.)

The 10 s clip (1344×768, 24 fps) runs: faint smoke → an S-shaped plume → a close-up of a guardian lion's face in grey ink
→ a pale, translucent full body with dark mane smoke → a tail flick close-up → the body inked in dense black patches →
paws → face → a roaring face → the full lion roaring. Hard cuts every ~0.5–1 s; a pale grey seamless studio; soft floor
shadow; monochrome with warm grey midtones.

## How this skill maps it
| the reference | here |
|---|---|
| prompt control | the brief, the creature design and the shot table |
| the translucent "just before the form" reference | the pre-form stage of the emergence curve (e ≈ .2–.4), rendered by the same engine |
| fluidity of the whole picture | `fluid` and the flow passes (trail length, body warp, smoke) — never zero |
| shape consistency | one 3D body and one continuous track across every cut; the cast sheet |

## refs.mjs — using an AI model anyway
`node <skill>/scripts/refs.mjs my-film [--pre .3] [--at .5]` writes, for every shot at its midpoint:
- `NN-shot-pre.png` — the creature frozen at `e = pre` with `fluid` 1: the translucent pre-form, from this shot's camera;
- `NN-shot-form.png` — the same frame fully formed with `fluid` .3;
- `PROMPTS.md` — a shared STYLE line plus a per-shot prompt skeleton (framing, angle, aim) to finish from the brief.
Give the pre-form as the first frame or image reference, the formed still as the end frame or second reference, and the
prompt. Because every reference comes from the same body and camera plan, the shots stay consistent with each other and
with the code film. Never pass off a model's output as this skill's render; the MP4 from `render.mjs` is the deliverable.
