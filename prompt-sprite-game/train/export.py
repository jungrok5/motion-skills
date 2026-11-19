"""export.py — turn a checkpoint into what the browser loads: an int8 ONNX painter + a small JSON of palette and words.

    python3 export.py --ckpt runs/cat/ckpt-best.pt --out dist/cat

Writes <out>.onnx (weights int8, dynamically quantized; inputs x (B,256) int64, words (B,16) int64, ratio (B,) float32 →
logits (B,256,colors)) and <out>.json ({ palette, vocab, text_len, mask_id, colors, ... }) for lib/painter-link.js.
"""
import argparse, json, os
import numpy as np
import torch
from model import SpritePainter

ap = argparse.ArgumentParser()
ap.add_argument('--ckpt', required=True); ap.add_argument('--out', required=True)
ap.add_argument('--name', default=''); ap.add_argument('--credit', default='')
a = ap.parse_args()
ck = torch.load(a.ckpt, weights_only=False)
m = SpritePainter(**ck['cfg']); m.load_state_dict(ck['state']); m.eval()
os.makedirs(os.path.dirname(a.out) or '.', exist_ok=True)
fp32 = a.out + '.fp32.onnx'
B = 2
ex = (torch.full((B, 256), m.mask_id, dtype=torch.long), torch.zeros((B, m.text_len), dtype=torch.long), torch.ones(B))
torch.onnx.export(m, ex, fp32, input_names=['x', 'words', 'ratio'], output_names=['logits'], opset_version=17,
                  dynamic_axes={'x': {0: 'B'}, 'words': {0: 'B'}, 'ratio': {0: 'B'}, 'logits': {0: 'B'}}, dynamo=False)
from onnxruntime.quantization import quantize_dynamic, QuantType
quantize_dynamic(fp32, a.out + '.onnx', weight_type=QuantType.QInt8)
os.remove(fp32)
meta = {'name': a.name or os.path.basename(a.out), 'credit': a.credit, 'step': ck['step'], 'val': ck.get('val'),
        'colors': ck['cfg']['colors'], 'mask_id': m.mask_id, 'text_len': m.text_len,
        'palette': np.asarray(ck['palette']).tolist(), 'vocab': list(map(str, ck['vocab']))}
json.dump(meta, open(a.out + '.json', 'w'), separators=(',', ':'))

# check: the int8 graph against PyTorch on random partly-hidden input
import onnxruntime as ort
s = ort.InferenceSession(a.out + '.onnx', providers=['CPUExecutionProvider'])
g = torch.Generator().manual_seed(0)
x = torch.randint(0, m.colors, (4, 256), generator=g); x[torch.rand(4, 256, generator=g) < 0.6] = m.mask_id
w = torch.randint(0, ck['cfg']['vocab'], (4, m.text_len), generator=g); r = (x == m.mask_id).float().mean(1)
with torch.no_grad(): ref = m(x, w, r).argmax(-1).numpy()
got = s.run(None, {'x': x.numpy(), 'words': w.numpy(), 'ratio': r.numpy()})[0].argmax(-1)
print(f'{a.out}.onnx {os.path.getsize(a.out + ".onnx") / 1e6:.2f} MB · {a.out}.json {os.path.getsize(a.out + ".json") / 1e3:.1f} KB · '
      f'top colour agrees with PyTorch on {100 * (ref == got).mean():.1f} % of pixels')
