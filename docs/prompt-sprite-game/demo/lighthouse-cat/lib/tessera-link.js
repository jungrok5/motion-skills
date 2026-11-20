// tessera-link.js — paint a game's cast with Tessera-small, in the player's browser.
//
// Tessera-small (Jagrat Patel / TheJagStudio, CC BY-NC 4.0) is a 47.6M-parameter masked-diffusion model that paints
// a 16×16 pixel sprite from a few words. cfahlgren1/tessera-small-onnx is its int8 ONNX build with a one-file
// browser runtime (web/tessera.js, onnxruntime-web, WebGPU ~1 s for 4 sprites; CPU ~40 s).
// Nothing of the model is in this repo: tessera.js and the weights (115 MB, cached by the browser after the first
// visit) are read from the Hugging Face Hub at a pinned revision when the player asks for it.
// Sprites the model paints are kept in the player's localStorage (1 KB each), never written to the project.

export const TESSERA_REPO = 'cfahlgren1/tessera-small-onnx';
export const TESSERA_REV = 'aff5ff7803c772dda5cd9886e503f7b98442822f';
export const TESSERA_BASE = `https://huggingface.co/${TESSERA_REPO}/resolve/${TESSERA_REV}/`;
export const TESSERA_CREDIT = 'Sprites painted by Tessera-small (TheJagStudio, CC BY-NC 4.0) via cfahlgren1/tessera-small-onnx';
const STORE = 'psg.sprite.v1:';
const READY = 'psg.tessera.loaded';

let modP = null, modelP = null;

/** The tessera.js module, imported from the Hub (served as text, so it goes through a Blob URL). */
export function tesseraModule() {
  if (!modP) modP = (async () => {
    const r = await fetch(TESSERA_BASE + 'web/tessera.js');
    if (!r.ok) throw new Error(`tessera.js: HTTP ${r.status}`);
    const url = URL.createObjectURL(new Blob([await r.text()], { type: 'text/javascript' }));
    return import(/* @vite-ignore */ url);
  })();
  return modP;
}

/** Load the model once per page. device: 'auto' | 'webgpu' | 'wasm'. */
export function loadTessera({ device = 'auto', onProgress } = {}) {
  if (!modelP) modelP = (async () => {
    const { Tessera } = await tesseraModule();
    const t = await Tessera.load({ device, modelUrl: TESSERA_BASE, onProgress });
    try { localStorage.setItem(READY, t.device); } catch {}
    return t;
  })().catch((e) => { modelP = null; throw e; });
  return modelP;
}

export const webgpuLikely = () => typeof navigator !== 'undefined' && !!navigator.gpu;
export function tesseraWasLoaded() { try { return !!localStorage.getItem(READY); } catch { return false; } }

const key = (prompt, seed, pick) => `${STORE}${prompt.trim().toLowerCase()}|${seed}|${pick}`;
const b64 = (u8) => { let s = ''; for (let i = 0; i < u8.length; i++) s += String.fromCharCode(u8[i]); return btoa(s); };
const unb64 = (s) => Uint8ClampedArray.from(atob(s), (c) => c.charCodeAt(0));

/** A sprite painted earlier on this device, or null. */
export function cachedSprite(prompt, seed, pick = 0) {
  try { const v = localStorage.getItem(key(prompt, seed, pick)); return v ? unb64(v) : null; } catch { return null; }
}
function store(prompt, seed, pick, rgba) { try { localStorage.setItem(key(prompt, seed, pick), b64(rgba)); } catch {} }

/**
 * Paint `count` variations of a prompt. Returns RGBA arrays (16×16×4).
 * onStep(step, rgbaList) is called after each of the 16 unmasking steps (for a live "painting" title screen).
 */
export async function paint(prompt, { seed = 7, count = 4, onStep, device } = {}) {
  const t = await loadTessera({ device });
  const sprites = await t.generate(prompt, {
    count, seed,
    onStep: onStep ? (step, s) => onStep(step, s.map((x) => x.rgba)) : undefined,
  });
  const out = sprites.map((s) => new Uint8ClampedArray(s.rgba));
  out.forEach((rgba, i) => store(prompt, seed, i, rgba));
  return out;
}

/** One sprite for a cast member: cache first, else paint (all four variations are cached together). */
export async function spriteFor({ prompt, seed = 7, pick = 0 }, opts = {}) {
  const hit = cachedSprite(prompt, seed, pick);
  if (hit) return hit;
  const all = await paint(prompt, { ...opts, seed });
  return all[Math.min(pick, all.length - 1)];
}

/** Are all these cast members already painted on this device? */
export function allCached(cast) {
  return cast.every((c) => cachedSprite(c.prompt, c.seed ?? 7, c.pick ?? 0));
}

/**
 * Repaint part of a sprite with Tessera and keep the rest: the pixels where keep[i] = 1 stay exactly as in `base`
 * (palette indices, e.g. sprite.tokens from an earlier paint), the others start hidden and are painted for `prompt`.
 * Same cat, new hat: keep the cat, free the rows above its head and the background, prompt "orange cat wearing a wizard hat".
 * Masked diffusion paints around fixed pixels natively, so this needs only the model's own sessions.
 * Returns { tokens: Int32Array(256), rgba: Uint8ClampedArray(1024) } per variation.
 */
export async function repaint(base, keep, prompt, { seed = 7, count = 4, steps = 16, guidance = 3, device, onStep } = {}) {
  const t = await loadTessera({ device });
  const { Tensor } = t.ort, N = 256, K = t.palette.length / 4, MASK = K, L = 24, D = 512, B = count * 2;
  let a = seed >>> 0;
  const rand = () => { a = (a + 0x6d2b79f5) >>> 0; let z = a; z = Math.imul(z ^ (z >>> 15), z | 1); z ^= z + Math.imul(z ^ (z >>> 7), z | 61); return ((z ^ (z >>> 14)) >>> 0) / 4294967296; };
  const { states, pooled } = await t.encodeText(prompt);
  const ts = new Float32Array(B * L * D), tp = new Float32Array(B * D);
  for (let b = 0; b < B; b++) { ts.set(states, b * L * D); tp.set(pooled, b * D); }
  const tsT = new Tensor('float32', ts, [B, L, D]), tpT = new Tensor('float32', tp, [B, D]);
  const drop = new Tensor('bool', Uint8Array.from({ length: B }, (_, b) => (b >= count ? 1 : 0)), [B]);
  const x = new Int32Array(count * N), hidden = new Uint8Array(count * N);
  for (let b = 0; b < count; b++) for (let i = 0; i < N; i++) { const h = keep[i] ? 0 : 1; hidden[b * N + i] = h; x[b * N + i] = h ? MASK : base[i]; }
  const start = hidden.slice(0, N).reduce((s, v) => s + v, 0);
  const sc = new Float32Array(B * N * K), probs = new Float32Array(N * K), pick = new Int32Array(N), conf = new Float64Array(N), p = new Float64Array(K);
  const toRGBA = (tok) => { const o = new Uint8ClampedArray(N * 4); for (let i = 0; i < N; i++) o.set(t.palette.subarray(tok[i] * 4, tok[i] * 4 + 4), i * 4); return o; };
  for (let s = 0; s < steps && start > 0; s++) {
    const xin = new BigInt64Array(B * N), ratio = new Float32Array(B);
    for (let b = 0; b < count; b++) {
      let h = 0;
      for (let i = 0; i < N; i++) { const v = BigInt(x[b * N + i]); xin[b * N + i] = v; xin[(b + count) * N + i] = v; h += hidden[b * N + i]; }
      ratio[b] = ratio[b + count] = h / N;
    }
    const out = await t.den.run({ x: new Tensor('int64', xin, [B, N]), text_states: tsT, text_pooled: tpT, mask_ratio: new Tensor('float32', ratio, [B]), sc_probs: new Tensor('float32', sc, [B, N, K]), drop_text: drop });
    const lg = out.logits.data, frac = (s + 1) / steps;
    for (let b = 0; b < count; b++) {
      for (let i = 0; i < N; i++) {
        const oc = (b * N + i) * K, ou = ((b + count) * N + i) * K;
        let mx = -Infinity;
        for (let c = 0; c < K; c++) { const v = lg[ou + c] + guidance * (lg[oc + c] - lg[ou + c]); p[c] = v; if (v > mx) mx = v; }
        let sum = 0; for (let c = 0; c < K; c++) { p[c] = Math.exp(p[c] - mx); sum += p[c]; }
        let r = rand() * sum, k = 0; while (k < K - 1 && (r -= p[k]) > 0) k++;
        for (let c = 0; c < K; c++) probs[i * K + c] = p[c] / sum;
        pick[i] = k;
        conf[i] = Math.log(Math.max(1e-12, p[k] / sum)) + 2 * (1 - frac) * -Math.log(-Math.log(Math.min(1 - 1e-10, Math.max(1e-10, rand()))));
      }
      let h = 0; for (let i = 0; i < N; i++) h += hidden[b * N + i];
      const left = s === steps - 1 ? 0 : Math.floor(start * Math.cos((Math.PI / 2) * frac));
      const commit = Math.min(h, Math.max(1, h - left));
      const order = [];
      for (let i = 0; i < N; i++) if (hidden[b * N + i]) order.push(i);
      order.sort((u, v) => conf[v] - conf[u]);
      for (let q = 0; q < commit; q++) { const i = order[q]; x[b * N + i] = pick[i]; hidden[b * N + i] = 0; }
      sc.set(probs, b * N * K); sc.set(probs, (b + count) * N * K);            // self-conditioning
    }
    if (onStep) onStep(s, Array.from({ length: count }, (_, b) => toRGBA(x.subarray(b * N, b * N + N).map((v) => (v === MASK ? 0 : v)))));
  }
  return Array.from({ length: count }, (_, b) => { const tok = x.slice(b * N, b * N + N); return { tokens: tok, rgba: toRGBA(tok) }; });
}

/** The palette indices of a sprite Tessera painted (for repaint). */
export async function paintTokens(prompt, { seed = 7, count = 4, device } = {}) {
  const t = await loadTessera({ device });
  const sprites = await t.generate(prompt, { count, seed });
  return sprites.map((s) => ({ tokens: Int32Array.from(s.tokens), rgba: new Uint8ClampedArray(s.rgba) }));
}
