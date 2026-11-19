// painter-link.js — paint sprites with a small themed painter trained by prompt-sprite-game/train (e.g. "cat").
//
// The painter is the Tessera recipe scaled down to one theme: a masked-diffusion transformer over 16×16 palette tokens,
// with its own small word vocabulary instead of CLIP. It ships as two files: <name>.onnx (int8, a few MB) and
// <name>.json (palette, vocabulary, sizes). onnxruntime-web runs it on the CPU (WebAssembly) — no WebGPU needed.
// Trained on Pixel Art Atlas 1.4M (CC0; sprites made with Krea 2 — Krea's terms may apply: commercial use under US$1M
// yearly revenue). See train/README.md, "Provenance and licence", and the NOTICE beside each painter.

const ORT = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
let ortP = null;
const loadOrt = () => (ortP ||= import(/* @vite-ignore */ `${ORT}ort.webgpu.min.mjs`).then((ort) => { ort.env.wasm.wasmPaths = ORT; ort.env.logLevel = 'error'; return ort; }));

function mulberry32(seed) {
  let a = seed >>> 0;
  return () => { a = (a + 0x6d2b79f5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

const cache = new Map();
/** Load a painter from a base URL without extension: `${base}.onnx` + `${base}.json`. */
export function loadPainter(base) {
  if (!cache.has(base)) cache.set(base, (async () => {
    const ort = await loadOrt();
    const meta = await (await fetch(`${base}.json`)).json();
    const bytes = new Uint8Array(await (await fetch(`${base}.onnx`)).arrayBuffer());
    const session = await ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
    return new Painter(ort, session, meta);
  })().catch((e) => { cache.delete(base); throw e; }));
  return cache.get(base);
}

export class Painter {
  constructor(ort, session, meta) {
    this.ort = ort; this.session = session; this.meta = meta;
    this.words = new Map(meta.vocab.map((w, i) => [w, i]));
    this.rgbaPalette = new Uint8ClampedArray(meta.palette.length * 4);
    meta.palette.forEach((c, i) => this.rgbaPalette.set([c[0], c[1], c[2], i === 0 ? 0 : 255], i * 4));
  }
  /** caption → word ids (unknown words → <unk>, then padded) and the words it did not know */
  encode(prompt) {
    const ws = prompt.toLowerCase().match(/[a-z]+(?:-[a-z]+)*/g) || [];
    const ids = ws.map((w) => this.words.get(w) ?? 1).slice(0, this.meta.text_len);
    const unknown = ws.filter((w) => !this.words.has(w));
    while (ids.length < this.meta.text_len) ids.push(0);
    return { ids, unknown };
  }
  toRGBA(tokens) {
    const out = new Uint8ClampedArray(256 * 4);
    for (let i = 0; i < 256; i++) out.set(this.rgbaPalette.subarray(tokens[i] * 4, tokens[i] * 4 + 4), i * 4);
    return out;
  }
  /**
   * Paint `count` variations. Same MaskGIT-style loop as train/model.py `paint`: start fully hidden, sample every hidden
   * pixel, keep the most confident (cosine schedule, annealed Gumbel noise × `choice`), classifier-free guidance.
   * temp / topP: colour sampling (nucleus keeps detail without stray colours); nms: early commits spread out.
   * Defaults come from the painter's JSON (`sampler`, chosen with train/eval.py).
   * Returns RGBA arrays (16×16×4); onStep(step, rgbaList) after each step.
   */
  async paint(prompt, { seed = 7, count = 4, steps = 16, guidance = 3, temp = this.meta.sampler?.temp ?? 1, topP = this.meta.sampler?.top_p ?? 1, nms = this.meta.sampler?.nms ?? false, choice = this.meta.sampler?.choice ?? 1, onStep } = {}) {
    const { ort, session, meta } = this, M = meta.mask_id, C = meta.colors, L = meta.text_len;
    const rand = mulberry32(seed);
    const { ids } = this.encode(prompt);
    const x = new Int32Array(count * 256).fill(M);
    const B = count * 2;
    const words = new BigInt64Array(B * L);
    for (let b = 0; b < count; b++) for (let j = 0; j < L; j++) words[b * L + j] = BigInt(ids[j]); // second half stays blank (guidance)
    for (let s = 0; s < steps; s++) {
      const xin = new BigInt64Array(B * 256), ratio = new Float32Array(B);
      for (let b = 0; b < count; b++) {
        let hid = 0;
        for (let i = 0; i < 256; i++) { const v = BigInt(x[b * 256 + i]); xin[b * 256 + i] = v; xin[(b + count) * 256 + i] = v; if (x[b * 256 + i] === M) hid++; }
        ratio[b] = ratio[b + count] = hid / 256;
      }
      const res = await session.run({ x: new ort.Tensor('int64', xin, [B, 256]), words: new ort.Tensor('int64', words, [B, L]), ratio: new ort.Tensor('float32', ratio, [B]) });
      const lg = res.logits.data;
      const keepHidden = Math.floor(256 * Math.cos((Math.PI / 2) * (s + 1) / steps));
      const anneal = 1 - (s + 1) / steps;
      const p = new Float64Array(C);
      for (let b = 0; b < count; b++) {
        const conf = new Float64Array(256).fill(Infinity), pick = new Int32Array(256);
        for (let i = 0; i < 256; i++) {
          if (x[b * 256 + i] !== M) continue;
          const oc = (b * 256 + i) * C, ou = ((b + count) * 256 + i) * C;
          let mx = -Infinity;
          for (let c = 0; c < C; c++) { const v = (lg[ou + c] + guidance * (lg[oc + c] - lg[ou + c])) / temp; p[c] = v; if (v > mx) mx = v; }
          let sum = 0; for (let c = 0; c < C; c++) { p[c] = Math.exp(p[c] - mx); sum += p[c]; }
          if (topP < 1) {                                   // nucleus: zero the tail beyond topP of the mass
            const order = Array.from({ length: C }, (_, c) => c).sort((u, v) => p[v] - p[u]);
            let acc = 0, kept = 0;
            for (const c of order) { if (acc > topP * sum) p[c] = 0; else { acc += p[c]; kept += p[c]; } }
            sum = kept;
          }
          let r = rand() * sum, k = 0; while (k < C - 1 && (r -= p[k]) > 0) k++;
          pick[i] = k;
          conf[i] = Math.log(Math.max(1e-9, p[k] / sum)) + choice * anneal * -Math.log(-Math.log(Math.min(1, Math.max(1e-9, rand()))));
        }
        if (nms && s < steps - 1) {                         // a pixel commits early only as the peak of its hidden 3×3
          const peak = new Float64Array(conf);
          for (let i = 0; i < 256; i++) {
            if (x[b * 256 + i] !== M) continue;
            const yy = i >> 4, xx = i & 15;
            for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
              const ny = yy + dy, nx = xx + dx; if (ny < 0 || ny > 15 || nx < 0 || nx > 15 || (!dy && !dx)) continue;
              const j = ny * 16 + nx; if (x[b * 256 + j] === M && conf[j] > conf[i]) { peak[i] = conf[i] - 1e3; dy = 2; break; }
            }
          }
          conf.set(peak);
        }
        let thresh = -Infinity;
        if (keepHidden > 0) thresh = Array.from(conf).sort((u, v) => u - v)[keepHidden - 1];
        for (let i = 0; i < 256; i++) if (x[b * 256 + i] === M && !(keepHidden > 0 && conf[i] <= thresh)) x[b * 256 + i] = pick[i];
      }
      if (onStep) onStep(s, Array.from({ length: count }, (_, b) => this.toRGBA(x.subarray(b * 256, b * 256 + 256))));
    }
    for (let i = 0; i < x.length; i++) if (x[i] === M) x[i] = 0;
    return Array.from({ length: count }, (_, b) => this.toRGBA(x.subarray(b * 256, b * 256 + 256)));
  }
}
