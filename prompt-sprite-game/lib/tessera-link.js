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
